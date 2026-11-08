import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { normalizeSecret, validBase32 } from '../../src/lib/otpauth';
import { saveAccount } from '../../src/lib/storage';
import type { Account, Algorithm } from '../../src/types';
import { colors } from '../../src/theme/colors';

export default function ManualAddScreen() {
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? colors.dark : colors.light;

  const [issuer, setIssuer] = useState('');
  const [label, setLabel] = useState('');
  const [secret, setSecret] = useState('');
  const [algorithm, setAlgorithm] = useState<Algorithm>('SHA1');
  const [digits, setDigits] = useState<6 | 8>(6);
  const [period, setPeriod] = useState(30);

  const cleanSecret = normalizeSecret(secret);
  const isValidSecret = validBase32(secret);

  const handlePreloadDemo = () => {
    setIssuer('UniSabana');
    setLabel('estudiante@unisabana.edu.co');
    setSecret('JBSWY3DPEHPK3PXP');
    setAlgorithm('SHA1');
    setDigits(6);
    setPeriod(30);
  };

  const handleSubmit = async () => {
    try {
      if (!issuer.trim() || !label.trim()) {
        throw new Error('El emisor y la cuenta son campos obligatorios');
      }
      if (!isValidSecret) {
        throw new Error('La clave secreta no es una cadena Base32 válida (caracteres A-Z, 2-7)');
      }

      const account: Account = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        issuer: issuer.trim(),
        label: label.trim(),
        secret: cleanSecret,
        algorithm,
        digits,
        period,
      };

      await saveAccount(account);
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Error al guardar', msg);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconBg, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="key" size={24} color="#2563eb" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Agregar Cuenta</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Introduce la semilla criptográfica Base32 para cálculo RFC 6238
          </Text>
        </View>

        {/* Quick Demo Pre-fill Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Rellenar con datos de laboratorio UniSabana"
          onPress={handlePreloadDemo}
          style={[styles.preloadBtn, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}
        >
          <Ionicons name="flash" size={16} color="#2563eb" />
          <Text style={[styles.preloadBtnText, { color: '#1e40af' }]}>
            Prellenar con Semilla UniSabana de Laboratorio
          </Text>
        </Pressable>

        {/* Form Fields Card */}
        <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {/* Issuer Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Emisor (Servicio o Institución)</Text>
            <TextInput
              accessibilityLabel="Emisor"
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              value={issuer}
              onChangeText={setIssuer}
              placeholder="Ej. UniSabana, GitHub, Google"
              placeholderTextColor={theme.muted}
            />
          </View>

          {/* Account Label Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Cuenta / Correo electrónico</Text>
            <TextInput
              accessibilityLabel="Cuenta o correo electrónico"
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              value={label}
              onChangeText={setLabel}
              placeholder="estudiante@unisabana.edu.co"
              placeholderTextColor={theme.muted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Base32 Secret Input */}
          <View style={styles.fieldGroup}>
            <View style={styles.secretLabelRow}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Clave Secreta (Base32)</Text>
              {cleanSecret.length > 0 && (
                <View style={[styles.validationBadge, { backgroundColor: isValidSecret ? '#dcfce7' : '#fee2e2' }]}>
                  <Text style={[styles.validationBadgeText, { color: isValidSecret ? '#166534' : '#991b1b' }]}>
                    {isValidSecret ? '✓ Válida' : '✗ Inválida'}
                  </Text>
                </View>
              )}
            </View>
            <TextInput
              accessibilityLabel="Clave secreta Base32"
              style={[
                styles.input,
                styles.secretInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: cleanSecret.length > 0 ? (isValidSecret ? '#10b981' : '#ef4444') : theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={secret}
              onChangeText={setSecret}
              placeholder="JBSWY3DPEHPK3PXP"
              placeholderTextColor={theme.muted}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Text style={[styles.hintText, { color: theme.muted }]}>
              Solo caracteres A-Z y 2-7. Los espacios y guiones se eliminan automáticamente.
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Guardar cuenta"
          onPress={handleSubmit}
          style={[styles.submitBtn, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
          <Text style={styles.submitBtnText}>Guardar Cuenta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  preloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  preloadBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  secretLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  validationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  validationBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  secretInput: {
    fontFamily: 'monospace',
    letterSpacing: 1.5,
  },
  hintText: {
    fontSize: 11,
    marginTop: 2,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
