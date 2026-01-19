package netbox

import (
	"fmt"
	"strconv"
)

// DeviceService handles device-related API operations
type DeviceService struct {
	client *Client
}

// NewDeviceService creates a new device service
func NewDeviceService(client *Client) *DeviceService {
	return &DeviceService{client: client}
}

// List returns a paginated list of devices
func (s *DeviceService) List(params map[string]string) (*PaginatedResponse[Device], error) {
	var result PaginatedResponse[Device]
	path := "/api/dcim/devices/" + BuildQuery(params)
	err := s.client.Get(path, &result)
	return &result, err
}

// ListAll returns all devices, handling pagination
func (s *DeviceService) ListAll(params map[string]string) ([]Device, error) {
	var all []Device
	if params == nil {
		params = make(map[string]string)
	}
	params["limit"] = "100"
	offset := 0

	for {
		params["offset"] = strconv.Itoa(offset)
		result, err := s.List(params)
		if err != nil {
			return nil, err
		}
		all = append(all, result.Results...)
		if result.Next == "" || len(result.Results) == 0 {
			break
		}
		offset += len(result.Results)
	}
	return all, nil
}

// Get returns a single device by ID
func (s *DeviceService) Get(id int) (*Device, error) {
	var result Device
	path := fmt.Sprintf("/api/dcim/devices/%d/", id)
	err := s.client.Get(path, &result)
	return &result, err
}

// GetByName returns a device by name (first match)
func (s *DeviceService) GetByName(name string) (*Device, error) {
	result, err := s.List(map[string]string{"name": name})
	if err != nil {
		return nil, err
	}
	if len(result.Results) == 0 {
		return nil, nil
	}
	return &result.Results[0], nil
}

// GetBySerial returns a device by serial number
func (s *DeviceService) GetBySerial(serial string) (*Device, error) {
	result, err := s.List(map[string]string{"serial": serial})
	if err != nil {
		return nil, err
	}
	if len(result.Results) == 0 {
		return nil, nil
	}
	return &result.Results[0], nil
}

// Create creates a new device
func (s *DeviceService) Create(device *DeviceCreate) (*Device, error) {
	var result Device
	err := s.client.Post("/api/dcim/devices/", device, &result)
	return &result, err
}

// Update updates an existing device (full update)
func (s *DeviceService) Update(id int, device *DeviceUpdate) (*Device, error) {
	var result Device
	path := fmt.Sprintf("/api/dcim/devices/%d/", id)
	err := s.client.Put(path, device, &result)
	return &result, err
}

// PartialUpdate updates specific fields of a device
func (s *DeviceService) PartialUpdate(id int, device *DeviceUpdate) (*Device, error) {
	var result Device
	path := fmt.Sprintf("/api/dcim/devices/%d/", id)
	err := s.client.Patch(path, device, &result)
	return &result, err
}

// Delete removes a device
func (s *DeviceService) Delete(id int) error {
	path := fmt.Sprintf("/api/dcim/devices/%d/", id)
	return s.client.Delete(path)
}

// UpdateStatus updates the status of a device
func (s *DeviceService) UpdateStatus(id int, status string) (*Device, error) {
	update := &DeviceUpdate{Status: status}
	return s.PartialUpdate(id, update)
}
