interface VendorBadgeProps {
  /** Vendor name or ID to display */
  vendor: string | null | undefined;
  /** Size variant */
  size?: 'sm' | 'md';
}

const SIZES = {
  sm: '0.75rem',
  md: '0.8rem',
};

/**
 * Displays a vendor name as a styled badge.
 * Local vendors get muted styling, others get primary accent.
 *
 * @example
 * <VendorBadge vendor="Cisco" />
 * <VendorBadge vendor="Local" size="sm" />
 */
export function VendorBadge({ vendor, size = 'md' }: VendorBadgeProps) {
  if (!vendor) {
    return <span className="text-muted">—</span>;
  }

  const isLocal = vendor === 'Local' || vendor === 'local';
  const fontSize = SIZES[size];

  return (
    <span
      className={`vendor-badge ${isLocal ? 'vendor-badge-local' : 'vendor-badge-primary'}`}
      style={{ fontSize }}
    >
      {vendor}
    </span>
  );
}
