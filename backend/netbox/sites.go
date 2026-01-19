package netbox

import (
	"fmt"
	"strconv"
)

// SiteService handles site-related API operations
type SiteService struct {
	client *Client
}

// NewSiteService creates a new site service
func NewSiteService(client *Client) *SiteService {
	return &SiteService{client: client}
}

// List returns a paginated list of sites
func (s *SiteService) List(params map[string]string) (*PaginatedResponse[Site], error) {
	var result PaginatedResponse[Site]
	path := "/api/dcim/sites/" + BuildQuery(params)
	err := s.client.Get(path, &result)
	return &result, err
}

// ListAll returns all sites
func (s *SiteService) ListAll() ([]Site, error) {
	var all []Site
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

// Get returns a single site by ID
func (s *SiteService) Get(id int) (*Site, error) {
	var result Site
	path := fmt.Sprintf("/api/dcim/sites/%d/", id)
	err := s.client.Get(path, &result)
	return &result, err
}

// GetBySlug returns a site by slug
func (s *SiteService) GetBySlug(slug string) (*Site, error) {
	result, err := s.List(map[string]string{"slug": slug})
	if err != nil {
		return nil, err
	}
	if len(result.Results) == 0 {
		return nil, nil
	}
	return &result.Results[0], nil
}

// GetByName returns a site by name
func (s *SiteService) GetByName(name string) (*Site, error) {
	result, err := s.List(map[string]string{"name": name})
	if err != nil {
		return nil, err
	}
	if len(result.Results) == 0 {
		return nil, nil
	}
	return &result.Results[0], nil
}

// Create creates a new site
func (s *SiteService) Create(site *SiteCreate) (*Site, error) {
	var result Site
	err := s.client.Post("/api/dcim/sites/", site, &result)
	return &result, err
}

// Update updates an existing site
func (s *SiteService) Update(id int, site *SiteCreate) (*Site, error) {
	var result Site
	path := fmt.Sprintf("/api/dcim/sites/%d/", id)
	err := s.client.Put(path, site, &result)
	return &result, err
}

// Delete removes a site
func (s *SiteService) Delete(id int) error {
	path := fmt.Sprintf("/api/dcim/sites/%d/", id)
	return s.client.Delete(path)
}

// GetOrCreate returns an existing site by slug, or creates it if not found
func (s *SiteService) GetOrCreate(name, slug string) (*Site, error) {
	existing, err := s.GetBySlug(slug)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}
	return s.Create(&SiteCreate{
		Name:   name,
		Slug:   slug,
		Status: "active",
	})
}
