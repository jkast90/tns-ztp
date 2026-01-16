// Navigation type definitions

export type ScanField = 'serial_number' | 'mac';

// Bottom tab navigator params
export type TabParamList = {
  DevicesTab: undefined;
  VendorsTab: undefined;
  DhcpTab: undefined;
};

// Stack navigator params (screens within tabs and modals)
export type RootStackParamList = {
  Main: undefined;
  DeviceForm: { mac?: string; scannedValue?: string; scannedField?: ScanField } | undefined;
  Settings: undefined;
  Scanner: { returnTo: 'DeviceForm'; mac?: string; field: ScanField };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
