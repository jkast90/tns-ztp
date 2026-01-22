// Domain types - platform agnostic

import { getVendorCache } from './utils/vendor';

export interface Device {
  mac: string;
  ip: string;
  hostname: string;
  vendor?: string;
  model?: string;
  serial_number?: string;
  config_template: string;
  ssh_user?: string;
  ssh_pass?: string;
  status: DeviceStatus;
  last_seen?: string;
  last_backup?: string;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export type DeviceStatus = 'online' | 'offline' | 'provisioning' | 'unknown';

export interface DeviceFormData {
  mac: string;
  ip: string;
  hostname: string;
  vendor: string;
  model: string;
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
  mac_prefixes: string[];
  vendor_class?: string; // DHCP Option 60 vendor class identifier
  default_template?: string; // Default template ID for this vendor
  device_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VendorFormData {
  id: string;
  name: string;
  backup_command: string;
  ssh_port: number;
  mac_prefixes: string[];
  vendor_class: string;
  default_template: string;
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

// Discovery types
export interface DiscoveredDevice {
  mac: string;
  ip: string;
  hostname: string;
  expiry_time: number;
  expires_at: string;
  first_seen?: string;
}

export type DiscoveryEventType = 'discovered' | 'added' | 'lease_renewed' | 'lease_expired';

export interface DiscoveryLog {
  id: number;
  event_type: DiscoveryEventType;
  mac: string;
  ip: string;
  hostname?: string;
  vendor?: string;
  message?: string;
  created_at: string;
}

// Test container types
export interface TestContainer {
  id: string;
  name: string;
  hostname: string;
  mac: string;
  ip: string;
  status: string;
  created_at: string;
}

export interface SpawnContainerRequest {
  hostname?: string;
  mac?: string;
  vendor_class?: string; // DHCP Option 60 vendor class identifier
  config_method?: 'tftp' | 'http' | 'both'; // Config fetch method
}

// Config fetch method options
export const CONFIG_METHOD_OPTIONS = [
  { value: 'tftp', label: 'TFTP', description: 'Traditional TFTP-based config fetch (Cisco IOS, Juniper, etc.)' },
  { value: 'http', label: 'HTTP', description: 'HTTP-based config fetch (OpenGear, newer devices)' },
  { value: 'both', label: 'Both (TFTP first)', description: 'Try TFTP first, fall back to HTTP' },
] as const;

// Get the default template for a vendor using vendor cache
export function getDefaultTemplateForVendor(vendorId: string): string {
  const vendors = getVendorCache();
  if (vendors) {
    const vendor = vendors.find((v) => v.id.toLowerCase() === vendorId.toLowerCase());
    if (vendor?.default_template) {
      return vendor.default_template;
    }
  }
  // Fallback to generic-switch if vendor not found or no default_template set
  return 'generic-switch';
}

// Network interface types
export interface NetworkInterface {
  name: string;
  addresses: string[];
  is_up: boolean;
  is_loopback: boolean;
}

// API Response types
export interface ApiError {
  error: string;
  code?: string;
}
