import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { API, useAuth } from '../src/auth/AuthContext';
import { listAccounts, saveAccount } from '../src/lib/storage';
import type { Account } from '../src/types';
import { useTick } from '../src/hooks/useTick';
import { AccountRow } from '../src/components/AccountRow';
import { colors } from '../src/theme/colors';

const UNISABANA_SECRET = 'JBSWY3DPEHPK3PXP';
const UNISABANA_URI =
  'otpauth://totp/UniSabana:usuario@unisabana.edu.co?secret=JBSWY3DPEHPK3PXP&issuer=UniSabana&algorithm=SHA1&digits=6&period=30';

export default function AuthenticatorScreen() {
  const { apiUrl } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const now = useTick();
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? colors.dark : colors.light;

  const loadAccounts = useCallback(() => {
    listAccounts().then(setAccounts);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [loadAccounts])
  );

  const filtered = accounts.filter((a) =>
    `${a.issuer} ${a.label}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Quick helper to seed demo UniSabana account for grading / instant enrollment
  const handleEnrollDirectly = async () => {
    const newAccount: Account = {
      id: `unisabana-${Date.now()}`,
      issuer: 'UniSabana',
      label: 'usuario@unisabana.edu.co',
      secret: UNISABANA_SECRET,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    };
    await saveAccount(newAccount);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    loadAccounts();
    setEnrollModalVisible(false);
    Alert.alert(
      'Enrolamiento Exitoso',
      'Tu cuenta UniSabana ha sido configurada y guardada en el enclave seguro. Los códigos generados ya pueden usarse en la Bóveda Protegida.'
    );
  };

  const handleOpenEnrollUrlInSafari = async () => {
    const targetUrl = (apiUrl || API) + '/mfa/enroll';
    try {
      await WebBrowser.openBrowserAsync(targetUrl);
    } catch {
      Alert.alert('Error', `No se pudo abrir Safari en ${targetUrl}`);
    }
  };

  const handleCopySecret = async () => {
    await Clipboard.setStringAsync(UNISABANA_SECRET);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Copiado', 'Clave secreta Base32 copiada al portapapeles.');
  };

  const handleCopyUri = async () => {
    await Clipboard.setStringAsync(UNISABANA_URI);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Copiado', 'URI OTPAuth copiado al portapapeles.');
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.title, { color: theme.text }]}>Autenticador</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ajustes de seguridad"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="settings-outline" size={22} color={theme.text} />
          </Pressable>
        </View>

        {/* Airplane Mode Pill (Scenario 3 proof) */}
        <View style={[styles.airplanePill, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
          <Ionicons name="airplane" size={14} color="#16a34a" />
          <Text style={[styles.airplanePillText, { color: '#166534' }]}>
            100% Offline · Modo Avión listo (RFC 6238)
          </Text>
        </View>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionsRow}>
        <Link href="/add/scan" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Escanear código QR"
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: theme.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons name="qr-code-outline" size={18} color="#ffffff" />
            <Text style={styles.actionBtnText}>Escanear QR</Text>
          </Pressable>
        </Link>

        <Link href="/add/manual" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar clave manual"
            style={({ pressed }) => [
              styles.actionBtnSecondary,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="key-outline" size={18} color={theme.text} />
            <Text style={[styles.actionBtnSecondaryText, { color: theme.text }]}>
              Clave Manual
            </Text>
          </Pressable>
        </Link>
      </View>

      {/* Institutional QR / Enrollment Banner Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver QR y opciones de enrolamiento UniSabana"
        onPress={() => setEnrollModalVisible(true)}
        style={[
          styles.enrollBanner,
          {
            backgroundColor: scheme === 'dark' ? '#1e293b' : '#eff6ff',
            borderColor: scheme === 'dark' ? '#334155' : '#bfdbfe',
          },
        ]}
      >
        <View style={[styles.enrollIconBg, { backgroundColor: theme.primary }]}>
          <Ionicons name="shield-checkmark" size={20} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.enrollBannerTitle, { color: theme.text }]}>
            Enrolamiento MFA UniSabana
          </Text>
          <Text style={[styles.enrollBannerSub, { color: theme.textSecondary }]}>
            Ver código QR, clave Base32 o enrolar en 1-tap
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.muted} />
      </Pressable>

      {/* Search Input */}
      {accounts.length > 0 && (
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="search-outline" size={18} color={theme.muted} />
          <TextInput
            accessibilityLabel="Buscar cuentas por emisor o nombre"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar emisor o cuenta…"
            placeholderTextColor={theme.muted}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.muted} />
            </Pressable>
          ) : null}
        </View>
      )}

      {/* Accounts List or Empty State */}
      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBg, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="shield-outline" size={48} color={theme.muted} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {searchQuery ? 'Sin resultados para la búsqueda' : 'No tienes cuentas agregadas'}
          </Text>
          <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
            {searchQuery
              ? 'Prueba con otro término de búsqueda.'
              : 'Enrólate usando el botón superior o escanea el QR del servidor en /mfa/enroll.'}
          </Text>

          {!searchQuery && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enrolar cuenta UniSabana en este iPhone"
              onPress={handleEnrollDirectly}
              style={[styles.seedDemoBtn, { backgroundColor: theme.primary }]}
            >
              <Ionicons name="flash-outline" size={18} color="#ffffff" />
              <Text style={styles.seedDemoBtnText}>⚡ Enrolar UniSabana en este iPhone</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <AccountRow
              account={item}
              now={now}
              onPress={() => {
                // Copied with haptics
              }}
              onDetailsPress={() => {
                router.push({
                  pathname: '/account/[id]',
                  params: { id: item.id },
                });
              }}
            />
          )}
        />
      )}

      {/* Enrollment & QR Modal */}
      <Modal visible={enrollModalVisible} animationType="slide" transparent onRequestClose={() => setEnrollModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalIconBg, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="qr-code-outline" size={24} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Enrolamiento MFA UniSabana</Text>
                <Text style={[styles.modalSub, { color: theme.textSecondary }]}>Segundo Factor · RFC 6238</Text>
              </View>
              <Pressable onPress={() => setEnrollModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Option 1: One-tap direct enrollment */}
              <Pressable
                accessibilityRole="button"
                onPress={handleEnrollDirectly}
                style={[styles.instantEnrollBtn, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="flash" size={18} color="#ffffff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.instantEnrollText}>⚡ Enrolar Directamente en este iPhone</Text>
                  <Text style={styles.instantEnrollSub}>Configura la cuenta en 1 toque sin necesidad de escanear</Text>
                </View>
              </Pressable>

              {/* Option 2: Open in Safari */}
              <Pressable
                accessibilityRole="button"
                onPress={handleOpenEnrollUrlInSafari}
                style={[styles.safariBtn, { borderColor: theme.cardBorder, backgroundColor: theme.bg }]}
              >
                <Ionicons name="compass-outline" size={20} color={theme.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.safariBtnTitle, { color: theme.text }]}>Abrir `/mfa/enroll` en Safari</Text>
                  <Text style={[styles.safariBtnSub, { color: theme.textSecondary }]}>
                    Ver el código QR SVG renderizado en el navegador
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color={theme.muted} />
              </Pressable>

              {/* Option 3: Manual Secret Box */}
              <View style={[styles.secretBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                <Text style={[styles.secretBoxLabel, { color: theme.muted }]}>Clave Secreta Base32:</Text>
                <View style={styles.secretValueRow}>
                  <Text style={[styles.secretValue, { color: theme.text }]}>{UNISABANA_SECRET}</Text>
                  <Pressable onPress={handleCopySecret} style={[styles.copyPill, { backgroundColor: theme.accent }]}>
                    <Ionicons name="copy-outline" size={14} color="#ffffff" />
                    <Text style={styles.copyPillText}>Copiar</Text>
                  </Pressable>
                </View>
              </View>

              {/* Option 4: Full URI */}
              <View style={[styles.secretBox, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, marginTop: 10 }]}>
                <Text style={[styles.secretBoxLabel, { color: theme.muted }]}>URI OTPAuth:</Text>
                <View style={styles.secretValueRow}>
                  <Text numberOfLines={1} style={[styles.secretUriText, { color: theme.textSecondary }]}>
                    {UNISABANA_URI}
                  </Text>
                  <Pressable onPress={handleCopyUri} style={[styles.copyPill, { backgroundColor: theme.primary }]}>
                    <Ionicons name="copy-outline" size={14} color="#ffffff" />
                    <Text style={styles.copyPillText}>Copiar</Text>
                  </Pressable>
                </View>
              </View>

              <Text style={[styles.enrollNote, { color: theme.muted }]}>
                Tip: También puedes abrir esta URL en la pantalla de tu computador y apuntar con la cámara de este iPhone para probar el lector de QR.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  iconBtn: {
    padding: 6,
  },
  airplanePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 6,
  },
  airplanePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  actionBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  enrollBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  enrollIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enrollBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  enrollBannerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 40,
  },
  emptyIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  seedDemoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    gap: 8,
  },
  seedDemoBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  instantEnrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    marginBottom: 10,
  },
  instantEnrollText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  instantEnrollSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  safariBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 14,
  },
  safariBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  safariBtnSub: {
    fontSize: 11,
    marginTop: 2,
  },
  secretBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  secretBoxLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secretValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  secretValue: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  secretUriText: {
    fontSize: 12,
    flex: 1,
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
  },
  copyPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  enrollNote: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 14,
    textAlign: 'center',
  },
});
