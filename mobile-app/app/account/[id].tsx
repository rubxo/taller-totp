import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { listAccounts, removeAccount, saveAccount } from '../../src/lib/storage';
import type { Account } from '../../src/types';
import { colors } from '../../src/theme/colors';

export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? colors.dark : colors.light;

  const [account, setAccount] = useState<Account | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listAccounts().then((accounts) => {
      const found = accounts.find((x) => x.id === id);
      if (found) setAccount(found);
    });
  }, [id]);

  if (!account) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="small" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Cargando detalles de cuenta…
        </Text>
      </View>
    );
  }

  const handleSave = async () => {
    if (!account.issuer.trim() || !account.label.trim()) {
      Alert.alert('Campos requeridos', 'El emisor y la cuenta no pueden quedar vacíos.');
      return;
    }
    setBusy(true);
    try {
      await saveAccount(account);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Cuenta TOTP',
      `¿Estás seguro de que deseas eliminar la cuenta "${account.label}"? Perderás la clave secreta y no podrás generar más códigos de un solo uso.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await removeAccount(account.id);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
          },
        },
      ]
    );
  };

  const handleCopySecret = async () => {
    await Clipboard.setStringAsync(account.secret);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Ionicons name="key-outline" size={26} color="#ffffff" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Detalles de Cuenta</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Edición de identificadores y parámetros criptográficos
          </Text>
        </View>

        {/* Edit Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardHeading, { color: theme.muted }]}>DATOS IDENTIFICATIVOS</Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Emisor</Text>
            <TextInput
              accessibilityLabel="Emisor"
              value={account.issuer}
              onChangeText={(issuer) => setAccount({ ...account, issuer })}
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              placeholder="Ej. UniSabana"
              placeholderTextColor={theme.muted}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Cuenta / Usuario</Text>
            <TextInput
              accessibilityLabel="Cuenta"
              value={account.label}
              onChangeText={(label) => setAccount({ ...account, label })}
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              placeholder="usuario@ejemplo.com"
              placeholderTextColor={theme.muted}
            />
          </View>
        </View>

        {/* Crypto Parameters Card (Read Only) */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.cardHeading, { color: theme.muted }]}>PARÁMETROS CRIPTOGRÁFICOS (RFC 6238)</Text>

          <View style={styles.paramRow}>
            <Text style={[styles.paramLabel, { color: theme.textSecondary }]}>Algoritmo de Hash:</Text>
            <View style={[styles.paramBadge, { backgroundColor: '#dbeafe' }]}>
              <Text style={[styles.paramBadgeText, { color: '#1e40af' }]}>
                HMAC-{account.algorithm}
              </Text>
            </View>
          </View>

          <View style={styles.paramRow}>
            <Text style={[styles.paramLabel, { color: theme.textSecondary }]}>Dígitos:</Text>
            <Text style={[styles.paramValue, { color: theme.text }]}>{account.digits} cifras</Text>
          </View>

          <View style={styles.paramRow}>
            <Text style={[styles.paramLabel, { color: theme.textSecondary }]}>Período de Rotación (X):</Text>
            <Text style={[styles.paramValue, { color: theme.text }]}>{account.period} segundos</Text>
          </View>

          <View style={styles.secretBox}>
            <View style={styles.secretHeader}>
              <Text style={[styles.paramLabel, { color: theme.textSecondary }]}>Clave Secreta Base32:</Text>
              <Pressable onPress={handleCopySecret} style={styles.copyBtn}>
                <Ionicons
                  name={copiedSecret ? 'checkmark-circle' : 'copy-outline'}
                  size={14}
                  color={copiedSecret ? theme.success : theme.accent}
                />
                <Text
                  style={[
                    styles.copyBtnText,
                    { color: copiedSecret ? theme.success : theme.accent },
                  ]}
                >
                  {copiedSecret ? 'Copiada' : 'Copiar'}
                </Text>
              </Pressable>
            </View>
            <Text style={[styles.secretText, { color: theme.text }]} selectable>
              {account.secret}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Guardar cambios"
            disabled={busy}
            onPress={handleSave}
            style={[styles.saveBtn, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="save-outline" size={18} color="#ffffff" />
            <Text style={styles.saveBtnText}>Guardar Cambios</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Eliminar cuenta"
            onPress={handleDelete}
            style={[styles.deleteBtn, { backgroundColor: theme.dangerLight, borderColor: theme.danger }]}
          >
            <Ionicons name="trash-outline" size={18} color={theme.danger} />
            <Text style={[styles.deleteBtnText, { color: theme.danger }]}>
              Eliminar Cuenta
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 4,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paramLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  paramValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  paramBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paramBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  secretBox: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 12,
    borderRadius: 12,
    gap: 6,
    marginTop: 4,
  },
  secretHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  secretText: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
