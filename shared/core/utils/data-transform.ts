// Data transformation utilities for filtering, grouping, and transforming data

import type { Vendor } from '../types';
import { getVendorCache } from './vendor';

/**
 * Dropdown option interface for vendor filter dropdowns
 */
export interface VendorFilterOption {
  id: string;
  label: string;
  icon?: string;
}

/**
 * Select option interface for form select fields
 */
export interface VendorSelectOption {
  value: string;
  label: string;
}

/**
 * Get vendor filter options for dropdown components
 * Uses vendors from cache (loaded from API) or accepts vendors directly
 * @param allLabel - Label for the "All" option (default: "All Vendors")
 * @param icon - Icon name for vendor options (default: "business")
 * @param vendors - Optional vendors array (uses cache if not provided)
 * @returns Array of filter options with id/label/icon
 */
export function getVendorFilterOptions(
  allLabel = 'All Vendors',
  icon = 'business',
  vendors?: Vendor[]
): VendorFilterOption[] {
  const vendorList = vendors || getVendorCache() || [];
  return [
    { id: '', label: allLabel, icon: 'filter_list' },
    ...vendorList.map((v) => ({
      id: v.id,
      label: v.name,
      icon,
    })),
  ];
}

/**
 * Get vendor select options for form select fields
 * Uses vendors from cache (loaded from API) or accepts vendors directly
 * @param globalLabel - Label for the global option (default: "All Vendors (Global)")
 * @param vendors - Optional vendors array (uses cache if not provided)
 * @returns Array of select options with value/label
 */
export function getVendorSelectOptions(
  globalLabel = 'All Vendors (Global)',
  vendors?: Vendor[]
): VendorSelectOption[] {
  const vendorList = vendors || getVendorCache() || [];
  return [
    { value: '', label: globalLabel },
    ...vendorList.map((v) => ({
      value: v.id,
      label: v.name,
    })),
  ];
}

/**
 * Get vendor name from vendor ID
 * Uses vendors from cache (loaded from API) or accepts vendors directly
 * @param vendorId - Vendor ID (e.g., "cisco")
 * @param vendors - Optional vendors array (uses cache if not provided)
 * @returns Vendor name (e.g., "Cisco") or the ID if not found
 */
export function getVendorName(vendorId: string, vendors?: Vendor[]): string {
  const vendorList = vendors || getVendorCache() || [];
  return vendorList.find((v) => v.id === vendorId)?.name || vendorId;
}

/**
 * Result of grouping items by vendor
 */
export interface GroupedByVendor<T> {
  global: T[];
  byVendor: Record<string, T[]>;
}

/**
 * Group items by vendor ID, separating global items (no vendor) from vendor-specific ones
 * @param items - Array of items with optional vendor_id property
 * @param getVendorId - Function to extract vendor_id from an item
 * @returns Object with global items and items grouped by vendor
 */
export function groupByVendor<T>(
  items: T[],
  getVendorId: (item: T) => string | undefined
): GroupedByVendor<T> {
  const global: T[] = [];
  const byVendor: Record<string, T[]> = {};

  items.forEach((item) => {
    const vendorId = getVendorId(item);
    if (!vendorId) {
      global.push(item);
    } else {
      if (!byVendor[vendorId]) byVendor[vendorId] = [];
      byVendor[vendorId].push(item);
    }
  });

  return { global, byVendor };
}

/**
 * Filter items by vendor, keeping global items (no vendor) and matching vendor items
 * @param items - Array of items with optional vendor_id property
 * @param vendorFilter - Vendor ID to filter by (empty string returns all)
 * @param getVendorId - Function to extract vendor_id from an item
 * @returns Filtered array of items
 */
export function filterByVendor<T>(
  items: T[],
  vendorFilter: string,
  getVendorId: (item: T) => string | undefined
): T[] {
  if (!vendorFilter) return items;
  return items.filter((item) => {
    const vendorId = getVendorId(item);
    return !vendorId || vendorId === vendorFilter;
  });
}

/**
 * Generate a unique ID based on timestamp
 * @param prefix - Optional prefix for the ID
 * @returns Unique ID string (e.g., "opt-1705432100000")
 */
export function generateId(prefix = ''): string {
  const id = Date.now().toString();
  return prefix ? `${prefix}-${id}` : id;
}

/**
 * Generate a slug from a name (for auto-generating IDs)
 * @param name - Name to convert to slug
 * @returns Lowercase slug with only alphanumeric chars and hyphens
 */
export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
}
