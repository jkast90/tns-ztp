package netbox

import (
	"fmt"
	"strconv"
)

// InterfaceService handles interface-related API operations
type InterfaceService struct {
	client *Client
}

// NewInterfaceService creates a new interface service
func NewInterfaceService(client *Client) *InterfaceService {
	return &InterfaceService{client: client}
}

// List returns a paginated list of interfaces
func (s *InterfaceService) List(params map[string]string) (*PaginatedResponse[Interface], error) {
	var result PaginatedResponse[Interface]
	path := "/api/dcim/interfaces/" + BuildQuery(params)
	err := s.client.Get(path, &result)
	return &result, err
}

// ListByDevice returns all interfaces for a device
func (s *InterfaceService) ListByDevice(deviceID int) ([]Interface, error) {
	result, err := s.List(map[string]string{
		"device_id": strconv.Itoa(deviceID),
		"limit":     "100",
	})
	if err != nil {
		return nil, err
	}
	return result.Results, nil
}

// Get returns a single interface by ID
func (s *InterfaceService) Get(id int) (*Interface, error) {
	var result Interface
	path := fmt.Sprintf("/api/dcim/interfaces/%d/", id)
	err := s.client.Get(path, &result)
	return &result, err
}

// GetByMac returns an interface by MAC address
func (s *InterfaceService) GetByMac(mac string) (*Interface, error) {
	result, err := s.List(map[string]string{"mac_address": mac})
	if err != nil {
		return nil, err
	}
	if len(result.Results) == 0 {
		return nil, nil
	}
	return &result.Results[0], nil
}

// Create creates a new interface
func (s *InterfaceService) Create(iface *InterfaceCreate) (*Interface, error) {
	var result Interface
	err := s.client.Post("/api/dcim/interfaces/", iface, &result)
	return &result, err
}

// Delete removes an interface
func (s *InterfaceService) Delete(id int) error {
	path := fmt.Sprintf("/api/dcim/interfaces/%d/", id)
	return s.client.Delete(path)
}

// IPAddressService handles IP address-related API operations
type IPAddressService struct {
	client *Client
}

// NewIPAddressService creates a new IP address service
func NewIPAddressService(client *Client) *IPAddressService {
	return &IPAddressService{client: client}
}

// List returns a paginated list of IP addresses
func (s *IPAddressService) List(params map[string]string) (*PaginatedResponse[IPAddress], error) {
	var result PaginatedResponse[IPAddress]
	path := "/api/ipam/ip-addresses/" + BuildQuery(params)
	err := s.client.Get(path, &result)
	return &result, err
}

// Get returns a single IP address by ID
func (s *IPAddressService) Get(id int) (*IPAddress, error) {
	var result IPAddress
	path := fmt.Sprintf("/api/ipam/ip-addresses/%d/", id)
	err := s.client.Get(path, &result)
	return &result, err
}

// GetByAddress returns an IP address by address string (e.g., "192.168.1.1/24")
func (s *IPAddressService) GetByAddress(address string) (*IPAddress, error) {
	result, err := s.List(map[string]string{"address": address})
	if err != nil {
		return nil, err
	}
	if len(result.Results) == 0 {
		return nil, nil
	}
	return &result.Results[0], nil
}

// Create creates a new IP address
func (s *IPAddressService) Create(ip *IPAddressCreate) (*IPAddress, error) {
	var result IPAddress
	err := s.client.Post("/api/ipam/ip-addresses/", ip, &result)
	return &result, err
}

// Delete removes an IP address
func (s *IPAddressService) Delete(id int) error {
	path := fmt.Sprintf("/api/ipam/ip-addresses/%d/", id)
	return s.client.Delete(path)
}

// GetOrCreate returns an existing IP address, or creates it if not found
func (s *IPAddressService) GetOrCreate(address string) (*IPAddress, error) {
	existing, err := s.GetByAddress(address)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}
	return s.Create(&IPAddressCreate{
		Address: address,
		Status:  "active",
	})
}

// AssignToInterface assigns an IP address to an interface
func (s *IPAddressService) AssignToInterface(address string, interfaceID int) (*IPAddress, error) {
	return s.Create(&IPAddressCreate{
		Address:            address,
		Status:             "active",
		AssignedObjectType: "dcim.interface",
		AssignedObjectID:   interfaceID,
	})
}
