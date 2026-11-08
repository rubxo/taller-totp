import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface PinPadProps {
  onSubmit: (pin: string) => void;
  onBiometricPress?: () => void;
  hasBiometrics?: boolean;
  bioType?: 'FACE_ID' | 'TOUCH_ID' | 'BIOMETRIC';
  maxLength?: number;
  resetSignal?: number;
}

export function PinPad({
  onSubmit,
  onBiometricPress,
  hasBiometrics = false,
  bioType = 'BIOMETRIC',
  maxLength = 6,
  resetSignal = 0,
}: PinPadProps) {
  const [pin, setPin] = useState('');
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? colors.dark : colors.light;

  useEffect(() => {
    setPin('');
  }, [resetSignal]);

  const handlePress = async (digit: string) => {
    if (pin.length >= maxLength) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === maxLength) {
      onSubmit(newPin);
    }
  };

  const handleDelete = async () => {
    if (pin.length === 0) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(pin.slice(0, -1));
  };

  const handleClear = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPin('');
  };

  const digits = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['bio', '0', 'del'],
  ];

  const bioIconName =
    bioType === 'FACE_ID'
      ? 'scan-outline'
      : bioType === 'TOUCH_ID'
      ? 'finger-print-outline'
      : 'finger-print-outline';

  return (
    <View style={styles.container} accessible accessibilityLabel="Teclado numérico de seguridad">
      {/* PIN Dots Indicator */}
      <View style={styles.dotsRow}>
        {Array.from({ length: maxLength }).map((_, i) => {
          const filled = i < pin.length;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  borderColor: theme.accent,
                  backgroundColor: filled ? theme.accent : 'transparent',
                },
              ]}
            />
          );
        })}
      </View>

      {/* Grid Keypad */}
      <View style={styles.keypad}>
        {digits.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((item) => {
              if (item === 'bio') {
                if (hasBiometrics && onBiometricPress) {
                  return (
                    <Pressable
                      key={item}
                      accessibilityRole="button"
                      accessibilityLabel="Desbloqueo biométrico"
                      onPress={onBiometricPress}
                      style={({ pressed }) => [
                        styles.key,
                        styles.specialKey,
                        { opacity: pressed ? 0.6 : 1 },
                      ]}
                    >
                      <Ionicons name={bioIconName} size={28} color={theme.accent} />
                    </Pressable>
                  );
                }
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityLabel="Borrar todo"
                    onPress={handleClear}
                    style={({ pressed }) => [
                      styles.key,
                      styles.specialKey,
                      { opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <Text style={[styles.clearText, { color: theme.muted }]}>C</Text>
                  </Pressable>
                );
              }

              if (item === 'del') {
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityLabel="Borrar dígito"
                    onPress={handleDelete}
                    style={({ pressed }) => [
                      styles.key,
                      styles.specialKey,
                      { opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <Ionicons name="backspace-outline" size={26} color={theme.text} />
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={`Dígito ${item}`}
                  onPress={() => handlePress(item)}
                  style={({ pressed }) => [
                    styles.key,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.cardBorder,
                      transform: [{ scale: pressed ? 0.94 : 1 }],
                    },
                  ]}
                >
                  <Text style={[styles.digitText, { color: theme.text }]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Manual submit button if pin is at least 4 digits and user hasn't hit maxLength */}
      {pin.length >= 4 && pin.length < maxLength && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Confirmar PIN"
          onPress={() => onSubmit(pin)}
          style={[styles.submitButton, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.submitButtonText}>Desbloquear con este PIN</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
    marginTop: 8,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  keypad: {
    gap: 16,
    width: '100%',
    maxWidth: 300,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  specialKey: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  digitText: {
    fontSize: 28,
    fontWeight: '700',
  },
  clearText: {
    fontSize: 20,
    fontWeight: '700',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
