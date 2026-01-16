// Validation utilities - platform agnostic

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateMacAddress(mac: string): boolean {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
}

export function validateIpAddress(ip: string): boolean {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}

export function validateHostname(hostname: string): boolean {
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  return hostname.length <= 63 && hostnameRegex.test(hostname);
}

export function validateDeviceForm(data: {
  mac: string;
  ip: string;
  hostname: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.mac) {
    errors.mac = 'MAC address is required';
  } else if (!validateMacAddress(data.mac)) {
    errors.mac = 'Invalid MAC address format (use aa:bb:cc:dd:ee:ff)';
  }

  if (!data.ip) {
    errors.ip = 'IP address is required';
  } else if (!validateIpAddress(data.ip)) {
    errors.ip = 'Invalid IP address format';
  }

  if (!data.hostname) {
    errors.hostname = 'Hostname is required';
  } else if (!validateHostname(data.hostname)) {
    errors.hostname = 'Invalid hostname (alphanumeric and hyphens only, max 63 chars)';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateSettingsForm(data: {
  dhcp_range_start: string;
  dhcp_range_end: string;
  dhcp_subnet: string;
  dhcp_gateway: string;
  tftp_server_ip: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!validateIpAddress(data.dhcp_range_start)) {
    errors.dhcp_range_start = 'Invalid IP address';
  }
  if (!validateIpAddress(data.dhcp_range_end)) {
    errors.dhcp_range_end = 'Invalid IP address';
  }
  if (!validateIpAddress(data.dhcp_subnet)) {
    errors.dhcp_subnet = 'Invalid subnet mask';
  }
  if (!validateIpAddress(data.dhcp_gateway)) {
    errors.dhcp_gateway = 'Invalid IP address';
  }
  if (!validateIpAddress(data.tftp_server_ip)) {
    errors.tftp_server_ip = 'Invalid IP address';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
