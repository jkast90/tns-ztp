// Domain types - platform agnostic

// Vendor options for network devices
export const DEVICE_VENDORS = [
  { value: '', label: 'Select Vendor...' },
  { value: 'opengear', label: 'OpenGear' },
  { value: 'cisco', label: 'Cisco' },
  { value: 'juniper', label: 'Juniper' },
  { value: 'arista', label: 'Arista' },
  { value: 'aruba', label: 'Aruba' },
  { value: 'dell', label: 'Dell' },
  { value: 'hp', label: 'HP/HPE' },
  { value: 'fortinet', label: 'Fortinet' },
  { value: 'paloalto', label: 'Palo Alto' },
  { value: 'ubiquiti', label: 'Ubiquiti' },
  { value: 'mikrotik', label: 'MikroTik' },
  { value: 'other', label: 'Other' },
] as const;

export type DeviceVendor = typeof DEVICE_VENDORS[number]['value'];

export interface Device {
  mac: string;
  ip: string;
  hostname: string;
  vendor?: string;
  serial_number?: string;
  config_template: string;
  ssh_user?: string;
  ssh_pass?: string;
  status: DeviceStatus;
  last_seen?: string;
  last_backup?: string;
  created_at: string;
  updated_at: string;
}

export type DeviceStatus = 'online' | 'offline' | 'provisioning' | 'unknown';

export interface DeviceFormData {
  mac: string;
  ip: string;
  hostname: string;
  vendor: string;
  serial_number: string;
  config_template: string;
  ssh_user: string;
  ssh_pass: string;
}

export interface Settings {
  default_ssh_user: string;
  default_ssh_pass: string;
  backup_command: string;
  backup_delay: number;
  dhcp_range_start: string;
  dhcp_range_end: string;
  dhcp_subnet: string;
  dhcp_gateway: string;
  tftp_server_ip: string;
  // OpenGear ZTP enrollment options
  opengear_enroll_url: string;
  opengear_enroll_bundle: string;
  opengear_enroll_password: string;
}

export interface Backup {
  id: number;
  device_mac: string;
  filename: string;
  size: number;
  created_at: string;
}

// UI State types
export type Theme = 'dark' | 'light' | 'plain';

export interface Message {
  type: 'success' | 'error';
  text: string;
}

// Vendor configuration
export interface Vendor {
  id: string;
  name: string;
  backup_command: string;
  ssh_port: number;
  device_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VendorFormData {
  id: string;
  name: string;
  backup_command: string;
  ssh_port: number;
}

// DHCP Option types
export type DhcpOptionType = 'string' | 'ip' | 'hex' | 'number';

export interface DhcpOption {
  id: string;
  option_number: number;
  name: string;
  value: string;
  type: DhcpOptionType;
  vendor_id?: string; // If set, only applies to this vendor
  description?: string;
  enabled: boolean;
}

export interface DhcpOptionFormData {
  id: string;
  option_number: number;
  name: string;
  value: string;
  type: DhcpOptionType;
  vendor_id: string;
  description: string;
  enabled: boolean;
}

// Common DHCP options reference
export const COMMON_DHCP_OPTIONS = [
  { number: 66, name: 'TFTP Server', description: 'Boot server hostname or IP' },
  { number: 67, name: 'Bootfile Name', description: 'Boot file path' },
  { number: 43, name: 'Vendor Specific', description: 'Vendor-specific information (hex encoded)' },
  { number: 60, name: 'Vendor Class ID', description: 'Vendor class identifier' },
  { number: 150, name: 'TFTP Server Address', description: 'TFTP server IP (Cisco)' },
  { number: 125, name: 'Vendor-Identifying', description: 'Vendor-identifying vendor-specific info' },
] as const;

// Template types
export interface Template {
  id: string;
  name: string;
  description?: string;
  vendor_id?: string;
  content: string;
  device_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TemplateFormData {
  id: string;
  name: string;
  description: string;
  vendor_id: string;
  content: string;
}

export interface TemplateVariable {
  name: string;
  description: string;
  example: string;
}

// API Response types
export interface ApiError {
  error: string;
  code?: string;
}
