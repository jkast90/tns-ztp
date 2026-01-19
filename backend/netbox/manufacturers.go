package netbox

import (
	"fmt"
	"strconv"
)

// ManufacturerService handles manufacturer-related API operations
type ManufacturerService struct {
	client *Client
}

// NewManufacturerService creates a new manufacturer service
func NewManufacturerService(client *Client) *ManufacturerService {
	return &ManufacturerService{client: client}
}

// List returns a paginated list of manufacturers
func (s *ManufacturerService) List(params map[string]string) (*PaginatedResponse[Manufacturer], error) {
	var result PaginatedResponse[Manufacturer]
	path := "/api/dcim/manufacturers/" + BuildQuery(params)
	err := s.client.Get(path, &result)
	return &result, err
}

// ListAll returns all manufacturers
func (s *ManufacturerService) ListAll() ([]Manufacturer, error) {
	var all []Manufacturer
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

// Get returns a single manufacturer by ID
func (s *ManufacturerService) Get(id int) (*Manufacturer, error) {
	var result Manufacturer
	path := fmt.Sprintf("/api/dcim/manufacturers/%d/", id)
	err := s.client.Get(path, &result)
	return &result, err
}

// GetBySlug returns a manufacturer by slug
func (s *ManufacturerService) GetBySlug(slug string) (*Manufacturer, error) {
	result, err := s.List(map[string]string{"slug": slug})
	if err != nil {
		return nil, err
	}
	if len(result.Results) == 0 {
		return nil, nil
	}
	return &result.Results[0], nil
}

// GetByName returns a manufacturer by name
func (s *ManufacturerService) GetByName(name string) (*Manufacturer, error) {
	result, err := s.List(map[string]string{"name": name})
	if err != nil {
		return nil, err
	}
	if len(result.Results) == 0 {
		return nil, nil
	}
	return &result.Results[0], nil
}

// Create creates a new manufacturer
func (s *ManufacturerService) Create(manufacturer *ManufacturerCreate) (*Manufacturer, error) {
	var result Manufacturer
	err := s.client.Post("/api/dcim/manufacturers/", manufacturer, &result)
	return &result, err
}

// Update updates an existing manufacturer
func (s *ManufacturerService) Update(id int, manufacturer *ManufacturerCreate) (*Manufacturer, error) {
	var result Manufacturer
	path := fmt.Sprintf("/api/dcim/manufacturers/%d/", id)
	err := s.client.Put(path, manufacturer, &result)
	return &result, err
}

// Delete removes a manufacturer
func (s *ManufacturerService) Delete(id int) error {
	path := fmt.Sprintf("/api/dcim/manufacturers/%d/", id)
	return s.client.Delete(path)
}

// GetOrCreate returns an existing manufacturer by slug, or creates it if not found
func (s *ManufacturerService) GetOrCreate(name, slug string) (*Manufacturer, error) {
	existing, err := s.GetBySlug(slug)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}
	return s.Create(&ManufacturerCreate{
		Name: name,
		Slug: slug,
	})
}
