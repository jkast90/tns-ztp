package netbox

import (
	"fmt"
	"strconv"
)

// DeviceTypeService handles device type-related API operations
type DeviceTypeService struct {
	client *Client
}

// NewDeviceTypeService creates a new device type service
func NewDeviceTypeService(client *Client) *DeviceTypeService {
	return &DeviceTypeService{client: client}
}

// List returns a paginated list of device types
func (s *DeviceTypeService) List(params map[string]string) (*PaginatedResponse[DeviceType], error) {
	var result PaginatedResponse[DeviceType]
	path := "/api/dcim/device-types/" + BuildQuery(params)
	err := s.client.Get(path, &result)
	return &result, err
}

// ListAll returns all device types
func (s *DeviceTypeService) ListAll() ([]DeviceType, error) {
	var all []DeviceType
	params := map[string]string{"limit": "100"}
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

// Get returns a single device type by ID
func (s *DeviceTypeService) Get(id int) (*DeviceType, error) {
	var result DeviceType
	path := fmt.Sprintf("/api/dcim/device-types/%d/", id)
	err := s.client.Get(path, &result)
	return &result, err
}

// GetBySlug returns a device type by slug
func (s *DeviceTypeService) GetBySlug(slug string) (*DeviceType, error) {
	result, err := s.List(map[string]string{"slug": slug})
	if err != nil {
		return nil, err
	}
	if len(result.Results) == 0 {
		return nil, nil
	}
	return &result.Results[0], nil
}

// GetByModel returns a device type by model name
func (s *DeviceTypeService) GetByModel(model string) (*DeviceType, error) {
	result, err := s.List(map[string]string{"model": model})
	if err != nil {
		return nil, err
	}
	if len(result.Results) == 0 {
		return nil, nil
	}
	return &result.Results[0], nil
}

// GetByManufacturer returns device types for a manufacturer
func (s *DeviceTypeService) GetByManufacturer(manufacturerID int) ([]DeviceType, error) {
	result, err := s.List(map[string]string{
		"manufacturer_id": strconv.Itoa(manufacturerID),
	})
	if err != nil {
		return nil, err
	}
	return result.Results, nil
}

// Create creates a new device type
func (s *DeviceTypeService) Create(deviceType *DeviceTypeCreate) (*DeviceType, error) {
	var result DeviceType
	err := s.client.Post("/api/dcim/device-types/", deviceType, &result)
	return &result, err
}

// Update updates an existing device type
func (s *DeviceTypeService) Update(id int, deviceType *DeviceTypeCreate) (*DeviceType, error) {
	var result DeviceType
	path := fmt.Sprintf("/api/dcim/device-types/%d/", id)
	err := s.client.Put(path, deviceType, &result)
	return &result, err
}

// Delete removes a device type
func (s *DeviceTypeService) Delete(id int) error {
	path := fmt.Sprintf("/api/dcim/device-types/%d/", id)
	return s.client.Delete(path)
}

// GetOrCreate returns an existing device type by slug, or creates it if not found
func (s *DeviceTypeService) GetOrCreate(manufacturerID int, model, slug string) (*DeviceType, error) {
	existing, err := s.GetBySlug(slug)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}
	return s.Create(&DeviceTypeCreate{
		Manufacturer: manufacturerID,
		Model:        model,
		Slug:         slug,
	})
}
