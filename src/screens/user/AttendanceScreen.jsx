import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/ScreenContainer';
import { scanQrCode } from '../../api/services/attendanceService';
import { getReadableError } from '../../utils/apiError';

const { width, height } = Dimensions.get('window');

const AttendanceScreen = ({ navigation }) => {
  const [qrCode, setQrCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    // Request camera permission when component mounts
    if (permission && !permission.granted && !permission.canAskAgain) {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera permissions in your device settings to scan QR codes.',
        [{ text: 'OK' }]
      );
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    
    setScanned(true);
    setShowCamera(false);
    
    try {
      setScanning(true);
      const result = await scanQrCode(data);
      setLastScanResult(result);
      setQrCode(data);
      Alert.alert('Success', 'Attendance marked successfully!', [
        { text: 'OK', onPress: () => {
          setQrCode('');
          setScanned(false);
        }},
      ]);
    } catch (error) {
      console.error('[Attendance] Error scanning QR:', error);
      Alert.alert('Error', getReadableError(error), [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    } finally {
      setScanning(false);
    }
  };

  const handleManualScan = async () => {
    if (!qrCode.trim()) {
      Alert.alert('Error', 'Please enter a QR code');
      return;
    }

    try {
      setScanning(true);
      const result = await scanQrCode(qrCode.trim());
      setLastScanResult(result);
      Alert.alert('Success', 'Attendance marked successfully!', [
        { text: 'OK', onPress: () => setQrCode('') },
      ]);
    } catch (error) {
      console.error('[Attendance] Error scanning QR:', error);
      Alert.alert('Error', getReadableError(error));
    } finally {
      setScanning(false);
    }
  };

  const openCamera = async () => {
    if (!permission) {
      // Permission is still being requested
      return;
    }

    if (!permission.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Permission Denied',
          'Camera permission is required to scan QR codes. Please enable it in settings.'
        );
        return;
      }
    }

    setScanned(false);
    setShowCamera(true);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mark Attendance</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoCard}>
          <Ionicons name="qr-code-outline" size={48} color="#2563eb" />
          <Text style={styles.infoTitle}>Scan QR Code</Text>
          <Text style={styles.infoText}>
            Use your camera to scan the QR code at the gym, or enter it manually
          </Text>
        </View>

        <TouchableOpacity
          style={styles.cameraButton}
          onPress={openCamera}
          disabled={scanning}
        >
          <Ionicons name="camera" size={24} color="#ffffff" />
          <Text style={styles.cameraButtonText}>Scan with Camera</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Enter QR Code Manually</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter QR code"
            value={qrCode}
            onChangeText={setQrCode}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!scanning}
          />
        </View>

        <TouchableOpacity
          style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
          onPress={handleManualScan}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={styles.scanButtonText}>Mark Attendance</Text>
            </>
          )}
        </TouchableOpacity>

        {lastScanResult && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Last Scan Result</Text>
            <Text style={styles.resultText}>
              Attendance marked successfully!
            </Text>
          </View>
        )}

        <View style={styles.helpCard}>
          <Ionicons name="information-circle-outline" size={24} color="#6b7280" />
          <Text style={styles.helpText}>
            Point your camera at the QR code displayed at the gym to automatically mark your attendance
          </Text>
        </View>
      </ScrollView>

      {/* Camera Modal */}
      <Modal
        visible={showCamera}
        animationType="slide"
        onRequestClose={() => setShowCamera(false)}
      >
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraHeader}>
                <TouchableOpacity
                  style={styles.closeCameraButton}
                  onPress={() => {
                    setShowCamera(false);
                    setScanned(false);
                  }}
                >
                  <Ionicons name="close" size={28} color="#ffffff" />
                </TouchableOpacity>
                <Text style={styles.cameraTitle}>Scan QR Code</Text>
                <View style={styles.placeholder} />
              </View>

              <View style={styles.scanArea}>
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <Text style={styles.scanHint}>
                  Position the QR code within the frame
                </Text>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  cameraButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  cameraButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  scanButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#15803d',
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  // Camera Modal Styles
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  closeCameraButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scanFrame: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#2563eb',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanHint: {
    marginTop: 24,
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});

export default AttendanceScreen;










