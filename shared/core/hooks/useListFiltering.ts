// List filtering and grouping hook - platform agnostic
// Encapsulates common patterns for filtering and grouping lists

import { useState, useMemo, useCallback } from 'react';

export interface UseListFilteringOptions<T> {
  /** The source items to filter/group */
  items: T[];
  /** Get the vendor ID from an item (for vendor-based filtering) */
  getVendorId?: (item: T) => string | undefined;
  /** Get a search string from an item (for text search) */
  getSearchText?: (item: T) => string;
  /** Initial filter value */
  initialFilter?: string;
}

export interface GroupedItems<T> {
  /** Items with no vendor (global) */
  global: T[];
  /** Items grouped by vendor ID */
  byVendor: Record<string, T[]>;
}

export interface UseListFilteringReturn<T> {
  /** Current filter value */
  filter: string;
  /** Set the filter value */
  setFilter: (value: string) => void;
  /** Clear the filter */
  clearFilter: () => void;
  /** Filtered items */
  filteredItems: T[];
  /** Items grouped by vendor (if getVendorId provided) */
  groupedItems: GroupedItems<T>;
  /** Whether any filter is active */
  isFiltered: boolean;
  /** Count of filtered items */
  filteredCount: number;
  /** Count of total items */
  totalCount: number;
}

/**
 * Hook for filtering and grouping lists.
 *
 * @example
 * ```tsx
 * const { filter, setFilter, filteredItems, groupedItems } = useListFiltering({
 *   items: templates,
 *   getVendorId: (t) => t.vendor_id,
 *   getSearchText: (t) => `${t.name} ${t.description}`,
 * });
 * ```
 */
export function useListFiltering<T>({
  items,
  getVendorId,
  getSearchText,
  initialFilter = '',
}: UseListFilteringOptions<T>): UseListFilteringReturn<T> {
  const [filter, setFilterState] = useState(initialFilter);

  const setFilter = useCallback((value: string) => {
    setFilterState(value);
  }, []);

  const clearFilter = useCallback(() => {
    setFilterState('');
  }, []);

  // Filter items by vendor and/or search text
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by vendor if filter is set and getVendorId is provided
    if (filter && getVendorId) {
      if (filter === 'global') {
        result = result.filter((item) => !getVendorId(item));
      } else {
        result = result.filter((item) => {
          const vendorId = getVendorId(item);
          return vendorId === filter || !vendorId; // Include global items when filtering by vendor
        });
      }
    }

    // Filter by search text if getSearchText is provided
    if (filter && getSearchText && !getVendorId) {
      const searchLower = filter.toLowerCase();
      result = result.filter((item) =>
        getSearchText(item).toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [items, filter, getVendorId, getSearchText]);

  // Group items by vendor
  const groupedItems = useMemo((): GroupedItems<T> => {
    const global: T[] = [];
    const byVendor: Record<string, T[]> = {};

    const itemsToGroup = getVendorId ? filteredItems : items;

    for (const item of itemsToGroup) {
      const vendorId = getVendorId?.(item);
      if (!vendorId) {
        global.push(item);
      } else {
        if (!byVendor[vendorId]) {
          byVendor[vendorId] = [];
        }
        byVendor[vendorId].push(item);
      }
    }

    return { global, byVendor };
  }, [filteredItems, items, getVendorId]);

  return {
    filter,
    setFilter,
    clearFilter,
    filteredItems,
    groupedItems,
    isFiltered: filter !== '',
    filteredCount: filteredItems.length,
    totalCount: items.length,
  };
}

/**
 * Filter items by vendor ID.
 * Returns all items if filter is empty or 'all'.
 * Returns global items if filter is 'global'.
 */
export function filterByVendor<T>(
  items: T[],
  filter: string,
  getVendorId: (item: T) => string | undefined
): T[] {
  if (!filter || filter === 'all') {
    return items;
  }
  if (filter === 'global') {
    return items.filter((item) => !getVendorId(item));
  }
  return items.filter((item) => {
    const vendorId = getVendorId(item);
    return vendorId === filter;
  });
}

/**
 * Group items by vendor ID.
 * Items without a vendor ID go in the 'global' group.
 */
export function groupByVendor<T>(
  items: T[],
  getVendorId: (item: T) => string | undefined
): GroupedItems<T> {
  const global: T[] = [];
  const byVendor: Record<string, T[]> = {};

  for (const item of items) {
    const vendorId = getVendorId(item);
    if (!vendorId) {
      global.push(item);
    } else {
      if (!byVendor[vendorId]) {
        byVendor[vendorId] = [];
      }
      byVendor[vendorId].push(item);
    }
  }

  return { global, byVendor };
}
