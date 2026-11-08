import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PinPad } from '../src/components/PinPad';
import {
  authenticate,
  getBiometricType,
  getExpectedPinLength,
  getLockoutRemaining,
  hasBiometrics,
  resetLockSettings,
  unlockWithPin,
} from '../src/lib/lock';
import { colors } from '../src/theme/colors';

interface LockScreenProps {
  onUnlock?: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? colors.dark : colors.light;

  const [error, setError] = useState('');
  const [canUseBio, setCanUseBio] = useState(false);
  const [bioType, setBioType] = useState<'FACE_ID' | 'TOUCH_ID' | 'BIOMETRIC'>('BIOMETRIC');
  const [pinLength, setPinLength] = useState(6);
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const len = await getExpectedPinLength();
      if (!mounted) return;
      setPinLength(len);

      const bioAvailable = await hasBiometrics();
      if (!mounted) return;
      setCanUseBio(bioAvailable);

      if (bioAvailable) {
        const type = await getBiometricType();
        if (!mounted) return;
        setBioType(type);

        // Small delay so native view is ready on iOS/iPhone 16
        setTimeout(async () => {
          if (!mounted) return;
          try {
            const success = await authenticate();
            if (success && mounted) {
              handleSuccess();
            }
          } catch {
            // User cancelled or fallback to PIN
          }
        }, 400);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSuccess = () => {
    if (onUnlock) {
      onUnlock();
    } else {
      router.replace('/welcome');
    }
  };

  const handlePinSubmit = async (pin: string) => {
    setError('');
    const remaining = await getLockoutRemaining();
    if (remaining > 0) {
      setError(`Bloqueo de seguridad activo. Espera ${remaining}s.`);
      setResetSignal((s) => s + 1);
      return;
    }

    const ok = await unlockWithPin(pin);
    if (ok) {
      handleSuccess();
    } else {
      const lockRem = await getLockoutRemaining();
      setResetSignal((s) => s + 1);
      if (lockRem > 0) {
        setError(`Demasiados intentos. Bloqueado temporalmente por ${lockRem}s.`);
        Alert.alert(
          'Bloqueo Temporal Activo',
          `Se han excedido los intentos permitidos. Por seguridad, el acceso está suspendido por ${lockRem} segundos.`
        );
      } else {
        setError('PIN incorrecto. Inténtalo nuevamente.');
      }
    }
  };

  const handleBiometricPress = async () => {
    setError('');
    try {
      const ok = await authenticate();
      if (ok) {
        handleSuccess();
      }
    } catch {
      // Ignored
    }
  };

  const handleResetLock = () => {
    Alert.alert(
      'Restablecer Bloqueo (Modo Laboratorio)',
      '¿Deseas desactivar el bloqueo por PIN y permitir el acceso de emergencia para pruebas del taller?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: async () => {
            await resetLockSettings();
            Alert.alert('Bloqueo Eliminado', 'Se ha restablecido el PIN de seguridad.');
            handleSuccess();
          },
        },
      ]
    );
  };

  const bioLabel =
    bioType === 'FACE_ID'
      ? 'Desbloquear con Face ID'
      : bioType === 'TOUCH_ID'
      ? 'Desbloquear con Touch ID'
      : 'Desbloquear con Biometría';

  const bioIconName =
    bioType === 'FACE_ID'
      ? 'scan-outline'
      : 'finger-print-outline';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={styles.container}>
        {/* Emblem */}
        <View style={[styles.iconBadge, { backgroundColor: theme.primary }]}>
          <Ionicons name="shield-checkmark" size={36} color="#ffffff" />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>UniSabana · Enclave Seguro</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Introduce tu PIN de {pinLength} dígitos o usa {bioType === 'FACE_ID' ? 'Face ID' : 'biometría'}
        </Text>

        {/* Biometric Quick Button */}
        {canUseBio && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={bioLabel}
            onPress={handleBiometricPress}
            style={[styles.bioQuickBtn, { borderColor: theme.accent, backgroundColor: scheme === 'dark' ? '#1e293b' : '#eff6ff' }]}
          >
            <Ionicons name={bioIconName} size={22} color={theme.accent} />
            <Text style={[styles.bioQuickBtnText, { color: theme.accent }]}>{bioLabel}</Text>
          </Pressable>
        )}

        {error ? (
          <View style={[styles.errorCard, { backgroundColor: theme.dangerLight, borderColor: theme.danger }]}>
            <Ionicons name="alert-circle" size={16} color={theme.danger} />
            <Text style={[styles.errorText, { color: theme.danger }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Numeric PinPad */}
        <PinPad
          onSubmit={handlePinSubmit}
          onBiometricPress={handleBiometricPress}
          hasBiometrics={canUseBio}
          bioType={bioType}
          maxLength={pinLength}
          resetSignal={resetSignal}
        />

        {/* Emergency Lab Reset Option */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Restablecer PIN en caso de emergencia"
          onPress={handleResetLock}
          style={styles.emergencyBtn}
        >
          <Ionicons name="help-buoy-outline" size={15} color={theme.muted} />
          <Text style={[styles.emergencyBtnText, { color: theme.muted }]}>
            Restablecer PIN (Modo Pruebas)
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  bioQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
    marginBottom: 16,
  },
  bioQuickBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  emergencyBtnText: {
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
