import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { parseOtpAuth } from '../../src/lib/otpauth';
import { saveAccount } from '../../src/lib/storage';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState('');
  const [torch, setTorch] = useState(false);
  const reading = useRef(false);

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Iniciando cámara…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionIconBg}>
          <Ionicons name="camera-outline" size={48} color="#ef4444" />
        </View>
        <Text style={styles.permissionTitle}>Permiso de Cámara Requerido</Text>
        <Text style={styles.permissionDesc}>
          Se necesita acceso a la cámara para escanear el código QR emitido por la pantalla /mfa/enroll.
        </Text>
        {permission.canAskAgain ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Conceder permiso de cámara"
            onPress={requestPermission}
            style={styles.grantBtn}
          >
            <Text style={styles.grantBtnText}>Conceder Permiso</Text>
          </Pressable>
        ) : (
          <Text style={styles.permissionNote}>
            Por favor, activa el permiso de cámara desde los Ajustes del sistema.
          </Text>
        )}
      </SafeAreaView>
    );
  }

  const onBarcodeScanned = async ({ data }: { data: string }) => {
    if (reading.current) return;
    reading.current = true;

    try {
      const parsed = new URL(data);
      if (parsed.protocol !== 'otpauth:') {
        throw new Error('El código QR no es una URI otpauth válida');
      }
      if (parsed.hostname.toLowerCase() !== 'totp') {
        throw new Error('HOTP no soportado; se requiere una cuenta TOTP por tiempo');
      }

      const accountData = parseOtpAuth(data);
      await saveAccount({
        ...accountData,
        id: Crypto.randomUUID(),
      });
      router.back();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Código QR no reconocido');
      setTimeout(() => {
        reading.current = false;
        setMessage('');
      }, 1500);
    }
  };

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onBarcodeScanned}
      />

      {/* Dimmed Overlay with Viewfinder cutout */}
      <SafeAreaView style={styles.overlayContainer}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar escáner"
            onPress={() => router.back()}
            style={styles.topIconBtn}
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </Pressable>

          <Text style={styles.topBarTitle}>Escanear QR de Enrolamiento</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Alternar linterna"
            onPress={() => setTorch((t) => !t)}
            style={styles.topIconBtn}
          >
            <Ionicons
              name={torch ? 'flash' : 'flash-off-outline'}
              size={22}
              color="#ffffff"
            />
          </Pressable>
        </View>

        {/* Viewfinder Frame */}
        <View style={styles.viewfinderContainer}>
          <View style={styles.viewfinderBox}>
            {/* 4 Corner Markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* Bottom instructions & alert */}
        <View style={styles.bottomSection}>
          {message ? (
            <View style={styles.errorPill}>
              <Ionicons name="alert-circle" size={16} color="#ffffff" />
              <Text style={styles.errorText}>{message}</Text>
            </View>
          ) : (
            <View style={styles.hintPill}>
              <Ionicons name="qr-code-outline" size={16} color="#ffffff" />
              <Text style={styles.hintText}>
                Enfoca el código QR de http://&lt;IP&gt;:8000/mfa/enroll
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#f8fafc',
  },
  permissionIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  grantBtn: {
    backgroundColor: '#002b49',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  grantBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  permissionNote: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  topBarTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  topIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderBox: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: '#38bdf8',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 14,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 14,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 14,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  hintText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  errorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
