// Navigation type definitions

export type RootStackParamList = {
  Devices: undefined;
  AddDevice: { scannedSerial?: string } | undefined;
  EditDevice: { mac: string; scannedSerial?: string };
  Settings: undefined;
  Scanner: { returnTo: 'AddDevice' | 'EditDevice'; mac?: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
