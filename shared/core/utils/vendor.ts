// Vendor lookup utilities

import type { Vendor } from '../types';

// Cached vendors from API
let cachedVendors: Vendor[] | null = null;

/**
 * Set the vendors to use for MAC lookups
 * @param vendors - Array of vendors with mac_prefixes
 */
export function setVendorCache(vendors: Vendor[]): void {
  cachedVendors = vendors;
}

/**
 * Get the cached vendors
 */
export function getVendorCache(): Vendor[] | null {
  return cachedVendors;
}

/**
 * Look up vendor from MAC address OUI (Organizationally Unique Identifier) prefix
 * @param mac - MAC address in any common format (colons, dashes, or no separators)
 * @param vendors - Optional array of vendors to search (uses cache if not provided)
 * @returns Vendor ID if found, 'local' for locally administered MACs, or null
 */
export function lookupVendorByMac(mac: string, vendors?: Vendor[]): string | null {
  const vendorList = vendors || cachedVendors;

  // Normalize MAC to uppercase with colons
  const normalized = mac.toUpperCase().replace(/[^A-F0-9]/g, '');
  if (normalized.length < 6) return null;

  // Extract OUI (first 3 bytes = 6 hex chars)
  const oui = `${normalized.slice(0, 2)}:${normalized.slice(2, 4)}:${normalized.slice(4, 6)}`;

  // Search through vendor prefixes if available
  if (vendorList) {
    for (const vendor of vendorList) {
      if (vendor.mac_prefixes) {
        for (const prefix of vendor.mac_prefixes) {
          if (prefix.toUpperCase() === oui) {
            return vendor.id;
          }
        }
      }
    }
  }

  // Check for locally administered MAC (bit 1 of first byte set)
  const firstByte = parseInt(normalized.slice(0, 2), 16);
  if ((firstByte & 0x02) !== 0) {
    return 'local';
  }

  return null;
}
