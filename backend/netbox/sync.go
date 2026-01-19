package netbox

import (
	"fmt"
	"log"
	"regexp"
	"strings"

	"github.com/ztp-server/backend/models"
)

// SyncService handles bidirectional sync between ZTP server and NetBox
type SyncService struct {
	client        *Client
	Devices       *DeviceService
	Manufacturers *ManufacturerService
	DeviceTypes   *DeviceTypeService
	DeviceRoles   *DeviceRoleService
	Sites         *SiteService
	Interfaces    *InterfaceService
	IPAddresses   *IPAddressService

	// Default IDs for creating devices
	DefaultSiteID int
	DefaultRoleID int
}

// NewSyncService creates a new sync service
func NewSyncService(baseURL, token string) *SyncService {
	client := NewClient(baseURL, token)
	return &SyncService{
		client:        client,
		Devices:       NewDeviceService(client),
		Manufacturers: NewManufacturerService(client),
		DeviceTypes:   NewDeviceTypeService(client),
		DeviceRoles:   NewDeviceRoleService(client),
		Sites:         NewSiteService(client),
		Interfaces:    NewInterfaceService(client),
		IPAddresses:   NewIPAddressService(client),
	}
}

// CheckConnection tests the connection to NetBox
func (s *SyncService) CheckConnection() error {
	return s.client.CheckConnection()
}

// SyncResult contains the results of a sync operation
type SyncResult struct {
	Created   int      `json:"created"`
	Updated   int      `json:"updated"`
	Skipped   int      `json:"skipped"`
	Errors    []string `json:"errors,omitempty"`
}

// EnsurePrerequisites ensures required NetBox objects exist
func (s *SyncService) EnsurePrerequisites() error {
	// Ensure default site exists
	site, err := s.Sites.GetOrCreate("ZTP Lab", "ztp-lab")
	if err != nil {
		return fmt.Errorf("failed to create default site: %w", err)
	}
	s.DefaultSiteID = site.ID
	log.Printf("[netbox] Using site: %s (ID: %d)", site.Name, site.ID)

	// Ensure default role exists
	role, err := s.DeviceRoles.GetOrCreate("Network Device", "network-device", "2196f3")
	if err != nil {
		return fmt.Errorf("failed to create default role: %w", err)
	}
	s.DefaultRoleID = role.ID
	log.Printf("[netbox] Using device role: %s (ID: %d)", role.Name, role.ID)

	return nil
}

// EnsureManufacturer ensures a manufacturer exists in NetBox
func (s *SyncService) EnsureManufacturer(vendor *models.Vendor) (*Manufacturer, error) {
	slug := slugify(vendor.ID)
	return s.Manufacturers.GetOrCreate(vendor.Name, slug)
}

// EnsureDeviceType ensures a device type exists for a manufacturer
func (s *SyncService) EnsureDeviceType(manufacturerID int, vendorID, vendorName string) (*DeviceType, error) {
	// Create a generic device type for the vendor
	model := fmt.Sprintf("%s Device", vendorName)
	slug := slugify(vendorID) + "-device"
	return s.DeviceTypes.GetOrCreate(manufacturerID, model, slug)
}

// PushDevice pushes a ZTP device to NetBox
func (s *SyncService) PushDevice(device *models.Device, vendors []models.Vendor) (*Device, error) {
	// Find or create manufacturer based on vendor
	var manufacturerID int
	var deviceTypeID int

	if device.Vendor != "" {
		// Find the vendor config
		var vendor *models.Vendor
		for i := range vendors {
			if vendors[i].ID == device.Vendor {
				vendor = &vendors[i]
				break
			}
		}

		if vendor != nil {
			manufacturer, err := s.EnsureManufacturer(vendor)
			if err != nil {
				return nil, fmt.Errorf("failed to ensure manufacturer: %w", err)
			}
			manufacturerID = manufacturer.ID

			deviceType, err := s.EnsureDeviceType(manufacturerID, vendor.ID, vendor.Name)
			if err != nil {
				return nil, fmt.Errorf("failed to ensure device type: %w", err)
			}
			deviceTypeID = deviceType.ID
		}
	}

	// If no vendor, use a generic type
	if deviceTypeID == 0 {
		manufacturer, err := s.Manufacturers.GetOrCreate("Generic", "generic")
		if err != nil {
			return nil, fmt.Errorf("failed to ensure generic manufacturer: %w", err)
		}
		deviceType, err := s.DeviceTypes.GetOrCreate(manufacturer.ID, "Unknown Device", "unknown-device")
		if err != nil {
			return nil, fmt.Errorf("failed to ensure generic device type: %w", err)
		}
		deviceTypeID = deviceType.ID
	}

	// Check if device already exists by name
	existing, err := s.Devices.GetByName(device.Hostname)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing device: %w", err)
	}

	// Map ZTP status to NetBox status
	status := mapStatusToNetBox(device.Status)

	if existing != nil {
		// Update existing device
		update := &DeviceUpdate{
			Status: status,
			Serial: device.SerialNumber,
			CustomFields: map[string]any{
				"mac_address": device.MAC,
				"ztp_managed": true,
			},
		}
		return s.Devices.PartialUpdate(existing.ID, update)
	}

	// Create new device
	create := &DeviceCreate{
		Name:       device.Hostname,
		DeviceType: deviceTypeID,
		Role:       s.DefaultRoleID,
		Site:       s.DefaultSiteID,
		Status:     status,
		Serial:     device.SerialNumber,
		CustomFields: map[string]any{
			"mac_address": device.MAC,
			"ztp_managed": true,
		},
	}

	nbDevice, err := s.Devices.Create(create)
	if err != nil {
		return nil, fmt.Errorf("failed to create device: %w", err)
	}

	// Create management interface with MAC
	if device.MAC != "" {
		_, err := s.Interfaces.Create(&InterfaceCreate{
			Device:     nbDevice.ID,
			Name:       "mgmt0",
			Type:       InterfaceTypeEnum.Ethernet1G,
			Enabled:    true,
			MacAddress: device.MAC,
		})
		if err != nil {
			log.Printf("[netbox] Warning: failed to create interface for device %s: %v", device.Hostname, err)
		}
	}

	return nbDevice, nil
}

// PushDevices pushes multiple ZTP devices to NetBox
func (s *SyncService) PushDevices(devices []models.Device, vendors []models.Vendor) *SyncResult {
	result := &SyncResult{}

	if err := s.EnsurePrerequisites(); err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("prerequisites failed: %v", err))
		return result
	}

	for _, device := range devices {
		existing, _ := s.Devices.GetByName(device.Hostname)

		_, err := s.PushDevice(&device, vendors)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", device.Hostname, err))
			continue
		}

		if existing != nil {
			result.Updated++
		} else {
			result.Created++
		}
	}

	return result
}

// PullDevice converts a NetBox device to a ZTP device
func (s *SyncService) PullDevice(nbDevice *Device) (*models.Device, error) {
	// Get MAC address from interface if available
	mac := ""
	interfaces, err := s.Interfaces.ListByDevice(nbDevice.ID)
	if err == nil && len(interfaces) > 0 {
		for _, iface := range interfaces {
			if iface.MacAddress != "" {
				mac = iface.MacAddress
				break
			}
		}
	}

	// Also check custom fields for MAC
	if mac == "" && nbDevice.CustomFields != nil {
		if macField, ok := nbDevice.CustomFields["mac_address"].(string); ok {
			mac = macField
		}
	}

	// Get IP from primary_ip4
	ip := ""
	if nbDevice.PrimaryIP4 != nil {
		ip = strings.Split(nbDevice.PrimaryIP4.Address, "/")[0]
	}

	// Map vendor from manufacturer
	vendor := ""
	if nbDevice.DeviceType.Manufacturer.Slug != "" && nbDevice.DeviceType.Manufacturer.Slug != "generic" {
		vendor = nbDevice.DeviceType.Manufacturer.Slug
	}

	device := &models.Device{
		MAC:          mac,
		IP:           ip,
		Hostname:     nbDevice.Name,
		Vendor:       vendor,
		SerialNumber: nbDevice.Serial,
		Status:       mapStatusFromNetBox(nbDevice.Status.Value),
	}

	return device, nil
}

// PullDevices pulls devices from NetBox to create ZTP device entries
func (s *SyncService) PullDevices() ([]models.Device, *SyncResult, error) {
	result := &SyncResult{}

	nbDevices, err := s.Devices.ListAll(nil)
	if err != nil {
		return nil, result, fmt.Errorf("failed to list NetBox devices: %w", err)
	}

	var devices []models.Device
	for _, nbDevice := range nbDevices {
		device, err := s.PullDevice(&nbDevice)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", nbDevice.Name, err))
			continue
		}

		// Skip devices without MAC - can't do ZTP without MAC
		if device.MAC == "" {
			result.Skipped++
			continue
		}

		devices = append(devices, *device)
		result.Created++
	}

	return devices, result, nil
}

// SyncVendors syncs ZTP vendors to NetBox manufacturers
func (s *SyncService) SyncVendors(vendors []models.Vendor) *SyncResult {
	result := &SyncResult{}

	for _, vendor := range vendors {
		existing, _ := s.Manufacturers.GetBySlug(slugify(vendor.ID))

		_, err := s.EnsureManufacturer(&vendor)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", vendor.Name, err))
			continue
		}

		if existing != nil {
			result.Skipped++
		} else {
			result.Created++
		}
	}

	return result
}

// Helper functions

func slugify(s string) string {
	s = strings.ToLower(s)
	s = regexp.MustCompile(`[^a-z0-9-]+`).ReplaceAllString(s, "-")
	s = regexp.MustCompile(`-+`).ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "unknown"
	}
	return s
}

func mapStatusToNetBox(ztpStatus string) string {
	switch ztpStatus {
	case "online":
		return StatusEnum.Active
	case "offline":
		return StatusEnum.Offline
	case "provisioning":
		return StatusEnum.Staged
	default:
		return StatusEnum.Planned
	}
}

func mapStatusFromNetBox(nbStatus string) string {
	switch nbStatus {
	case StatusEnum.Active:
		return "online"
	case StatusEnum.Offline:
		return "offline"
	case StatusEnum.Staged:
		return "provisioning"
	default:
		return "offline"
	}
}
