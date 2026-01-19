// MAC Address Generation Utilities

import type { Vendor } from '../types';
import { getVendorCache } from './vendor';

/**
 * Get random values in a cross-platform way
 * Works in browsers, Node.js, and React Native
 */
function getRandomValues(arr: Uint8Array): Uint8Array {
  // Try Web Crypto API (browsers)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(arr);
  }
  // Fallback to Math.random (less secure but works everywhere)
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
}

/**
 * Generate random hex bytes in colon-separated format
 * @param bytes - Number of bytes to generate
 * @returns Hex string with colons (e.g., "aa:bb:cc")
 */
export function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':');
}

/**
 * Generate a random MAC address with optional vendor prefix
 * @param vendorPrefix - Optional OUI prefix (e.g., "00:1A:2B")
 * @returns Full MAC address in lowercase with colons
 */
export function generateMac(vendorPrefix?: string): string {
  if (vendorPrefix) {
    // Use vendor prefix + random suffix
    const suffix = randomHex(3);
    return `${vendorPrefix}:${suffix}`.toLowerCase();
  }
  // Generate fully random locally-administered MAC
  const bytes = new Uint8Array(6);
  getRandomValues(bytes);
  // Set locally administered bit (bit 1 of first byte) and clear multicast bit (bit 0)
  bytes[0] = (bytes[0] | 0x02) & 0xfe;
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':');
}

/**
 * Vendor prefix option for dropdown/select components
 */
export interface VendorPrefixOption {
  value: string;
  label: string;
  vendor: string;
}

/**
 * Get flattened vendor prefix options for dropdown components
 * Uses vendors from cache (loaded from API) or accepts vendors directly
 * Includes a "Random" option and up to 2 prefixes per vendor
 * @param vendors - Optional vendors array (uses cache if not provided)
 * @returns Array of vendor prefix options
 */
export function getVendorPrefixOptions(vendors?: Vendor[]): VendorPrefixOption[] {
  const vendorList = vendors || getVendorCache() || [];
  return [
    { value: '', label: 'Random (locally administered)', vendor: '' },
    ...vendorList.flatMap((v) =>
      (v.mac_prefixes || []).slice(0, 2).map((p, i) => ({
        value: p,
        label: i === 0 ? v.name : `${v.name} (alt)`,
        vendor: v.id,
      }))
    ),
  ];
}

/**
 * Get DHCP vendor class identifier for a vendor ID
 * Uses vendor data from cache instead of hardcoded values
 * @param vendorId - Vendor ID (e.g., "cisco")
 * @returns Vendor class identifier or empty string if not found
 */
export function getVendorClassForVendor(vendorId: string): string {
  const vendors = getVendorCache();
  if (vendors) {
    const vendor = vendors.find((v) => v.id.toLowerCase() === vendorId.toLowerCase());
    if (vendor?.vendor_class) {
      return vendor.vendor_class;
    }
  }
  return '';
}
