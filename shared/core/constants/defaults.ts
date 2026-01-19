// Default configuration values for DHCP options

import type { DhcpOption } from '../types';

/**
 * Default DHCP options for common ZTP scenarios
 */
export const DEFAULT_DHCP_OPTIONS: Omit<DhcpOption, 'created_at' | 'updated_at'>[] = [
  {
    id: 'tftp-server',
    option_number: 66,
    name: 'TFTP Server',
    value: '${tftp_server_ip}',
    type: 'ip',
    description: 'TFTP server for config files',
    enabled: true,
  },
  {
    id: 'bootfile-cisco',
    option_number: 67,
    name: 'Cisco Bootfile',
    value: 'network-confg',
    type: 'string',
    vendor_id: 'cisco',
    description: 'Cisco IOS config filename',
    enabled: true,
  },
  {
    id: 'bootfile-arista',
    option_number: 67,
    name: 'Arista Bootfile',
    value: 'startup-config',
    type: 'string',
    vendor_id: 'arista',
    description: 'Arista EOS config filename',
    enabled: true,
  },
  {
    id: 'bootfile-juniper',
    option_number: 67,
    name: 'Juniper Bootfile',
    value: 'juniper.conf',
    type: 'string',
    vendor_id: 'juniper',
    description: 'Juniper config filename',
    enabled: true,
  },
  {
    id: 'tftp-cisco-150',
    option_number: 150,
    name: 'Cisco TFTP (Option 150)',
    value: '${tftp_server_ip}',
    type: 'ip',
    vendor_id: 'cisco',
    description: 'Cisco-specific TFTP server option',
    enabled: true,
  },
  {
    id: 'opengear-ztp',
    option_number: 43,
    name: 'OpenGear ZTP',
    value: '',
    type: 'hex',
    vendor_id: 'opengear',
    description: 'OpenGear vendor-specific enrollment options',
    enabled: false,
  },
];

/**
 * DHCP option types for form select fields
 */
export const DHCP_OPTION_TYPES = [
  { value: 'string', label: 'String' },
  { value: 'ip', label: 'IP Address' },
  { value: 'hex', label: 'Hex' },
  { value: 'number', label: 'Number' },
] as const;

/**
 * Empty form data objects for various entity types
 */
export const EMPTY_VENDOR_FORM = {
  id: '',
  name: '',
  backup_command: 'show running-config',
  ssh_port: 22,
  mac_prefixes: [] as string[],
  vendor_class: '',
  default_template: '',
};

export const EMPTY_DHCP_OPTION_FORM = {
  id: '',
  option_number: 0,
  name: '',
  value: '',
  type: 'string' as const,
  vendor_id: '',
  description: '',
  enabled: true,
};

export const EMPTY_TEMPLATE_FORM = {
  id: '',
  name: '',
  description: '',
  vendor_id: '',
  content: '',
};

/**
 * Sample device data for template preview
 */
export const SAMPLE_DEVICE_FOR_PREVIEW = {
  device: {
    mac: '00:11:22:33:44:55',
    ip: '192.168.1.100',
    hostname: 'switch-01',
    vendor: 'cisco',
    serial_number: 'ABC123456',
  },
  subnet: '255.255.255.0',
  gateway: '192.168.1.1',
};

/**
 * DHCP Vendor Class options for test container spawn
 */
export const VENDOR_CLASS_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'Cisco', label: 'Cisco' },
  { value: 'Arista', label: 'Arista' },
  { value: 'Juniper', label: 'Juniper' },
  { value: 'OpenGear', label: 'OpenGear' },
] as const;

/**
 * Config fetch method options for test containers
 */
export const CONFIG_METHOD_OPTIONS = [
  { value: 'tftp', label: 'TFTP', description: 'Fetch config via TFTP' },
  { value: 'http', label: 'HTTP', description: 'Fetch config via HTTP' },
  { value: 'both', label: 'Both', description: 'Try TFTP then HTTP' },
] as const;
