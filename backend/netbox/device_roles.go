package netbox

import (
	"fmt"
	"strconv"
)

// DeviceRoleService handles device role-related API operations
type DeviceRoleService struct {
	client *Client
}

// NewDeviceRoleService creates a new device role service
func NewDeviceRoleService(client *Client) *DeviceRoleService {
	return &DeviceRoleService{client: client}
}

// List returns a paginated list of device roles
func (s *DeviceRoleService) List(params map[string]string) (*PaginatedResponse[DeviceRole], error) {
	var result PaginatedResponse[DeviceRole]
	path := "/api/dcim/device-roles/" + BuildQuery(params)
	err := s.client.Get(path, &result)
	return &result, err
}

// ListAll returns all device roles
func (s *DeviceRoleService) ListAll() ([]DeviceRole, error) {
	var all []DeviceRole
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

// Get returns a single device role by ID
func (s *DeviceRoleService) Get(id int) (*DeviceRole, error) {
	var result DeviceRole
	path := fmt.Sprintf("/api/dcim/device-roles/%d/", id)
	err := s.client.Get(path, &result)
	return &result, err
}

// GetBySlug returns a device role by slug
func (s *DeviceRoleService) GetBySlug(slug string) (*DeviceRole, error) {
	result, err := s.List(map[string]string{"slug": slug})
	if err != nil {
		return nil, err
	}
	if len(result.Results) == 0 {
		return nil, nil
	}
	return &result.Results[0], nil
}

// GetByName returns a device role by name
func (s *DeviceRoleService) GetByName(name string) (*DeviceRole, error) {
	result, err := s.List(map[string]string{"name": name})
	if err != nil {
		return nil, err
	}
	if len(result.Results) == 0 {
		return nil, nil
	}
	return &result.Results[0], nil
}

// Create creates a new device role
func (s *DeviceRoleService) Create(role *DeviceRoleCreate) (*DeviceRole, error) {
	var result DeviceRole
	err := s.client.Post("/api/dcim/device-roles/", role, &result)
	return &result, err
}

// Update updates an existing device role
func (s *DeviceRoleService) Update(id int, role *DeviceRoleCreate) (*DeviceRole, error) {
	var result DeviceRole
	path := fmt.Sprintf("/api/dcim/device-roles/%d/", id)
	err := s.client.Put(path, role, &result)
	return &result, err
}

// Delete removes a device role
func (s *DeviceRoleService) Delete(id int) error {
	path := fmt.Sprintf("/api/dcim/device-roles/%d/", id)
	return s.client.Delete(path)
}

// GetOrCreate returns an existing device role by slug, or creates it if not found
func (s *DeviceRoleService) GetOrCreate(name, slug, color string) (*DeviceRole, error) {
	existing, err := s.GetBySlug(slug)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}
	if color == "" {
		color = "9e9e9e" // Default gray color
	}
	return s.Create(&DeviceRoleCreate{
		Name:  name,
		Slug:  slug,
		Color: color,
	})
}
