// Navigation type definitions

export type ScanField = 'serial_number' | 'mac' | 'model';

// Bottom tab navigator params
export type TabParamList = {
  DashboardTab: undefined;
  DevicesTab: undefined;
  TemplatesTab: undefined;
  ConfigTab: undefined;
};

// Config stack navigator params (nested in ConfigTab)
export type ConfigStackParamList = {
  ConfigMenu: undefined;
  Vendors: undefined;
  DhcpOptions: undefined;
};

// Stack navigator params (screens within tabs and modals)
export type RootStackParamList = {
  Main: undefined;
  DeviceForm: {
    mac?: string;
    ip?: string;
    hostname?: string;
    vendor?: string;
    model?: string;
    scannedValue?: string;
    scannedField?: ScanField;
    editMode?: boolean; // true = edit existing device, false/undefined = add new device
  } | undefined;
  Settings: undefined;
  Scanner: { returnTo: 'DeviceForm'; mac?: string; field: ScanField };
  Templatizer: {
    onComplete?: (templateContent: string) => void;
  } | undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
