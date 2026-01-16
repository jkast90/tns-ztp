import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import type { RootStackParamList, ScanField } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Scanner'>;
type ScannerRouteProp = RouteProp<RootStackParamList, 'Scanner'>;

const FIELD_LABELS: Record<ScanField, { title: string; prompt: string; button: string }> = {
  serial_number: {
    title: 'Serial Number Scanned',
    prompt: 'Use "%s" as the serial number?',
    button: 'Use Serial',
  },
  mac: {
    title: 'MAC Address Scanned',
    prompt: 'Use "%s" as the MAC address?',
    button: 'Use MAC',
  },
};

export function ScannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ScannerRouteProp>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const lastScannedRef = useRef<string | null>(null);

  const { mac, field } = route.params;
  const labels = FIELD_LABELS[field];

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;

    const data = result.data;

    // Prevent duplicate scans
    if (lastScannedRef.current === data) return;
    lastScannedRef.current = data;

    setScanned(true);

    // Clean up the scanned data - remove any whitespace
    const cleanedData = data.trim();

    Alert.alert(
      labels.title,
      labels.prompt.replace('%s', cleanedData),
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            setScanned(false);
            lastScannedRef.current = null;
          },
        },
        {
          text: labels.button,
          onPress: () => {
            // Navigate back with the scanned value
            navigation.goBack();

            // Use setTimeout to ensure goBack completes before navigate
            setTimeout(() => {
              navigation.navigate('DeviceForm', {
                mac,
                scannedValue: cleanedData,
                scannedField: field,
              });
            }, 50);
          },
        },
      ]
    );
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission required</Text>
        <Text style={styles.submessage}>
          Please enable camera access to scan barcodes.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const instructionText = field === 'mac'
    ? 'Point camera at MAC address barcode or QR code'
    : 'Point camera at serial number barcode or QR code';

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'datamatrix'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Scanning overlay */}
      <View style={styles.overlay}>
        <View style={styles.unfocusedContainer} />
        <View style={styles.middleContainer}>
          <View style={styles.unfocusedContainer} />
          <View style={styles.focusedContainer}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.unfocusedContainer} />
        </View>
        <View style={styles.unfocusedContainer} />
      </View>

      <View style={styles.instructionContainer}>
        <Text style={styles.instruction}>{instructionText}</Text>
      </View>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  submessage: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#4a9eff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#2a2a4e',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  middleContainer: {
    flexDirection: 'row',
    height: 250,
  },
  focusedContainer: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#4a9eff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
  },
  instruction: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  cancelButton: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
