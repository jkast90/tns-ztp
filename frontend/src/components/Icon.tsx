import { CSSProperties } from 'react';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 20, className = '', style }: IconProps) {
  return (
    <span
      className={`material-icons-outlined ${className}`}
      style={{ fontSize: size, ...style }}
    >
      {name}
    </span>
  );
}

// Convenience exports for commonly used icons
export const MoonIcon = ({ size }: { size?: number }) => <Icon name="dark_mode" size={size} />;
export const SunIcon = ({ size }: { size?: number }) => <Icon name="light_mode" size={size} />;
export const SquareIcon = ({ size }: { size?: number }) => <Icon name="check_box_outline_blank" size={size} />;
export const PlusIcon = ({ size }: { size?: number }) => <Icon name="add" size={size} />;
export const RefreshIcon = ({ size }: { size?: number }) => <Icon name="refresh" size={size} />;
export const EditIcon = ({ size }: { size?: number }) => <Icon name="edit" size={size} />;
export const TrashIcon = ({ size }: { size?: number }) => <Icon name="delete" size={size} />;
export const DownloadIcon = ({ size }: { size?: number }) => <Icon name="backup" size={size} />;
export const ClockIcon = ({ size }: { size?: number }) => <Icon name="history" size={size} />;
export const XIcon = ({ size }: { size?: number }) => <Icon name="close" size={size} />;
export const SettingsIcon = ({ size }: { size?: number }) => <Icon name="settings" size={size} />;
export const SpinnerIcon = ({ size }: { size?: number }) => <Icon name="sync" size={size} className="icon-spin" />;
