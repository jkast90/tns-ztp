package netbox

import "time"

// PaginatedResponse wraps paginated API responses
type PaginatedResponse[T any] struct {
	Count    int    `json:"count"`
	Next     string `json:"next"`
	Previous string `json:"previous"`
	Results  []T    `json:"results"`
}

// NestedRef represents a nested reference to another object
type NestedRef struct {
	ID      int    `json:"id"`
	URL     string `json:"url,omitempty"`
	Display string `json:"display,omitempty"`
	Name    string `json:"name,omitempty"`
	Slug    string `json:"slug,omitempty"`
}

// NestedManufacturer is a nested manufacturer reference
type NestedManufacturer struct {
	ID      int    `json:"id"`
	URL     string `json:"url,omitempty"`
	Display string `json:"display,omitempty"`
	Name    string `json:"name"`
	Slug    string `json:"slug"`
}

// NestedDeviceType is a nested device type reference
type NestedDeviceType struct {
	ID           int                `json:"id"`
	URL          string             `json:"url,omitempty"`
	Display      string             `json:"display,omitempty"`
	Manufacturer NestedManufacturer `json:"manufacturer"`
	Model        string             `json:"model"`
	Slug         string             `json:"slug"`
}

// NestedSite is a nested site reference
type NestedSite struct {
	ID      int    `json:"id"`
	URL     string `json:"url,omitempty"`
	Display string `json:"display,omitempty"`
	Name    string `json:"name"`
	Slug    string `json:"slug"`
}

// NestedDeviceRole is a nested device role reference
type NestedDeviceRole struct {
	ID      int    `json:"id"`
	URL     string `json:"url,omitempty"`
	Display string `json:"display,omitempty"`
	Name    string `json:"name"`
	Slug    string `json:"slug"`
}

// NestedIPAddress is a nested IP address reference
type NestedIPAddress struct {
	ID      int    `json:"id"`
	URL     string `json:"url,omitempty"`
	Display string `json:"display,omitempty"`
	Family  int    `json:"family"`
	Address string `json:"address"`
}

// StatusChoice represents a status field
type StatusChoice struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// Manufacturer represents a NetBox manufacturer
type Manufacturer struct {
	ID           int            `json:"id,omitempty"`
	URL          string         `json:"url,omitempty"`
	Display      string         `json:"display,omitempty"`
	Name         string         `json:"name"`
	Slug         string         `json:"slug"`
	Description  string         `json:"description,omitempty"`
	CustomFields map[string]any `json:"custom_fields,omitempty"`
	Created      time.Time      `json:"created,omitempty"`
	LastUpdated  time.Time      `json:"last_updated,omitempty"`
}

// ManufacturerCreate is used to create a manufacturer
type ManufacturerCreate struct {
	Name         string         `json:"name"`
	Slug         string         `json:"slug"`
	Description  string         `json:"description,omitempty"`
	CustomFields map[string]any `json:"custom_fields,omitempty"`
}

// ManufacturerUpdate is used to update a manufacturer
type ManufacturerUpdate struct {
	Name         string         `json:"name,omitempty"`
	Slug         string         `json:"slug,omitempty"`
	Description  string         `json:"description,omitempty"`
	CustomFields map[string]any `json:"custom_fields,omitempty"`
}

// DeviceType represents a NetBox device type (hardware model)
type DeviceType struct {
	ID           int                `json:"id,omitempty"`
	URL          string             `json:"url,omitempty"`
	Display      string             `json:"display,omitempty"`
	Manufacturer NestedManufacturer `json:"manufacturer"`
	Model        string             `json:"model"`
	Slug         string             `json:"slug"`
	Description  string             `json:"description,omitempty"`
	UHeight      float64            `json:"u_height,omitempty"`
	IsFullDepth  bool               `json:"is_full_depth,omitempty"`
	Created      time.Time          `json:"created,omitempty"`
	LastUpdated  time.Time          `json:"last_updated,omitempty"`
}

// DeviceTypeCreate is used to create a device type
type DeviceTypeCreate struct {
	Manufacturer int     `json:"manufacturer"`
	Model        string  `json:"model"`
	Slug         string  `json:"slug"`
	Description  string  `json:"description,omitempty"`
	UHeight      float64 `json:"u_height,omitempty"`
	IsFullDepth  bool    `json:"is_full_depth,omitempty"`
}

// Site represents a NetBox site
type Site struct {
	ID          int         `json:"id,omitempty"`
	URL         string      `json:"url,omitempty"`
	Display     string      `json:"display,omitempty"`
	Name        string      `json:"name"`
	Slug        string      `json:"slug"`
	Status      interface{} `json:"status,omitempty"`
	Description string      `json:"description,omitempty"`
	Created     time.Time   `json:"created,omitempty"`
	LastUpdated time.Time   `json:"last_updated,omitempty"`
}

// SiteCreate is used to create a site
type SiteCreate struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Status      string `json:"status,omitempty"`
	Description string `json:"description,omitempty"`
}

// DeviceRole represents a NetBox device role
type DeviceRole struct {
	ID          int       `json:"id,omitempty"`
	URL         string    `json:"url,omitempty"`
	Display     string    `json:"display,omitempty"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Color       string    `json:"color,omitempty"`
	VMRole      bool      `json:"vm_role,omitempty"`
	Description string    `json:"description,omitempty"`
	Created     time.Time `json:"created,omitempty"`
	LastUpdated time.Time `json:"last_updated,omitempty"`
}

// DeviceRoleCreate is used to create a device role
type DeviceRoleCreate struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Color       string `json:"color,omitempty"`
	VMRole      bool   `json:"vm_role,omitempty"`
	Description string `json:"description,omitempty"`
}

// Device represents a NetBox device
type Device struct {
	ID           int              `json:"id,omitempty"`
	URL          string           `json:"url,omitempty"`
	Display      string           `json:"display,omitempty"`
	Name         string           `json:"name"`
	DeviceType   NestedDeviceType `json:"device_type"`
	Role         NestedDeviceRole `json:"role"`
	Site         NestedSite       `json:"site"`
	Status       StatusChoice     `json:"status"`
	Serial       string           `json:"serial,omitempty"`
	AssetTag     string           `json:"asset_tag,omitempty"`
	PrimaryIP4   *NestedIPAddress `json:"primary_ip4,omitempty"`
	PrimaryIP6   *NestedIPAddress `json:"primary_ip6,omitempty"`
	Comments     string           `json:"comments,omitempty"`
	CustomFields map[string]any   `json:"custom_fields,omitempty"`
	Created      time.Time        `json:"created,omitempty"`
	LastUpdated  time.Time        `json:"last_updated,omitempty"`
}

// DeviceCreate is used to create a device
type DeviceCreate struct {
	Name         string         `json:"name"`
	DeviceType   int            `json:"device_type"`
	Role         int            `json:"role"`
	Site         int            `json:"site"`
	Status       string         `json:"status,omitempty"`
	Serial       string         `json:"serial,omitempty"`
	AssetTag     string         `json:"asset_tag,omitempty"`
	Comments     string         `json:"comments,omitempty"`
	CustomFields map[string]any `json:"custom_fields,omitempty"`
}

// DeviceUpdate is used to update a device
type DeviceUpdate struct {
	Name         string         `json:"name,omitempty"`
	DeviceType   int            `json:"device_type,omitempty"`
	Role         int            `json:"role,omitempty"`
	Site         int            `json:"site,omitempty"`
	Status       string         `json:"status,omitempty"`
	Serial       string         `json:"serial,omitempty"`
	AssetTag     string         `json:"asset_tag,omitempty"`
	Comments     string         `json:"comments,omitempty"`
	CustomFields map[string]any `json:"custom_fields,omitempty"`
}

// Interface represents a NetBox device interface
type Interface struct {
	ID          int          `json:"id,omitempty"`
	URL         string       `json:"url,omitempty"`
	Display     string       `json:"display,omitempty"`
	Device      NestedRef    `json:"device"`
	Name        string       `json:"name"`
	Type        StatusChoice `json:"type"`
	Enabled     bool         `json:"enabled"`
	MacAddress  string       `json:"mac_address,omitempty"`
	Description string       `json:"description,omitempty"`
}

// InterfaceCreate is used to create an interface
type InterfaceCreate struct {
	Device      int    `json:"device"`
	Name        string `json:"name"`
	Type        string `json:"type"`
	Enabled     bool   `json:"enabled"`
	MacAddress  string `json:"mac_address,omitempty"`
	Description string `json:"description,omitempty"`
}

// IPAddress represents a NetBox IP address
type IPAddress struct {
	ID          int          `json:"id,omitempty"`
	URL         string       `json:"url,omitempty"`
	Display     string       `json:"display,omitempty"`
	Address     string       `json:"address"`
	Status      StatusChoice `json:"status"`
	AssignedObj interface{}  `json:"assigned_object,omitempty"`
	Description string       `json:"description,omitempty"`
}

// IPAddressCreate is used to create an IP address
type IPAddressCreate struct {
	Address              string `json:"address"`
	Status               string `json:"status,omitempty"`
	AssignedObjectType   string `json:"assigned_object_type,omitempty"`
	AssignedObjectID     int    `json:"assigned_object_id,omitempty"`
	Description          string `json:"description,omitempty"`
}

// APIError represents a NetBox API error response
type APIError struct {
	Detail string            `json:"detail,omitempty"`
	Errors map[string][]string `json:"errors,omitempty"`
}

// StatusEnum provides device status values
var StatusEnum = struct {
	Active        string
	Offline       string
	Planned       string
	Staged        string
	Failed        string
	Decommissioning string
}{
	Active:        "active",
	Offline:       "offline",
	Planned:       "planned",
	Staged:        "staged",
	Failed:        "failed",
	Decommissioning: "decommissioning",
}

// InterfaceTypeEnum provides interface type values
var InterfaceTypeEnum = struct {
	Virtual   string
	Ethernet1G string
	Ethernet10G string
	Ethernet25G string
	Ethernet40G string
	Ethernet100G string
	Other     string
}{
	Virtual:   "virtual",
	Ethernet1G: "1000base-t",
	Ethernet10G: "10gbase-t",
	Ethernet25G: "25gbase-x-sfp28",
	Ethernet40G: "40gbase-x-qsfpp",
	Ethernet100G: "100gbase-x-qsfp28",
	Other:     "other",
}
