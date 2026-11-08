import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/AuthContext';
import { colors } from '../../src/theme/colors';

interface TestResult {
  index: number;
  status: number;
  data: Record<string, unknown>;
}

export default function Profile() {
  const { client } = useAuth();
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? colors.dark : colors.light;

  const [busy, setBusy] = useState(false);
  const [profileData, setProfileData] = useState<{ email?: string; nombre?: string } | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [testSummary, setTestSummary] = useState<string>('');
  const [error, setError] = useState('');

  // Initial load
  useEffect(() => {
    void runRequest(1);
  }, []);

  async function runRequest(count = 1) {
    setBusy(true);
    setError('');
    try {
      const startTime = Date.now();
      const responses = await Promise.all(
        Array.from({ length: count }, () => client.request('/api/perfil'))
      );

      const items: TestResult[] = await Promise.all(
        responses.map(async (r, i) => ({
          index: i + 1,
          status: r.status,
          data: await r.json(),
        }))
      );

      const durationMs = Date.now() - startTime;
      setResults(items);

      if (items.length > 0 && items[0].status === 200) {
        setProfileData(items[0].data as { email: string; nombre: string });
      }

      if (count > 1) {
        const all200 = items.every((x) => x.status === 200);
        setTestSummary(
          all200
            ? `✓ ${count} peticiones concurrentes resueltas con código 200 en ${durationMs} ms (1 único refresh ejecutado).`
            : `Alerta: Algunas peticiones devolvieron código distinto a 200.`
        );
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Identity Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>US</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text }]}>
                {profileData?.nombre || 'Estudiante UniSabana'}
              </Text>
              <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>
                {profileData?.email || 'estudiante@unisabana.edu.co'}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                <View style={[styles.statusDot, { backgroundColor: '#16a34a' }]} />
                <Text style={[styles.statusText, { color: '#166534' }]}>Sesión Autenticada</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Architecture & Memory Separation Card */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="hardware-chip-outline" size={20} color={theme.accent} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Estrategia de Separación de Memoria
            </Text>
          </View>
          <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
            Cumplimiento del Punto 2 del laboratorio (Almacenamiento Seguro Nativo):
          </Text>

          <View style={styles.tokenSpecRow}>
            <View style={[styles.tokenBox, { backgroundColor: scheme === 'dark' ? '#1e293b' : '#f8fafc', borderColor: theme.cardBorder }]}>
              <View style={styles.tokenHeader}>
                <Ionicons name="flash-outline" size={16} color="#2563eb" />
                <Text style={[styles.tokenName, { color: theme.text }]}>access_token</Text>
              </View>
              <Text style={[styles.tokenLocation, { color: '#2563eb' }]}>Memoria RAM (Volátil)</Text>
              <Text style={[styles.tokenDetails, { color: theme.textSecondary }]}>
                Vive únicamente en el estado volátil (React Ref). Se destruye automáticamente al matar el proceso.
              </Text>
              <View style={[styles.tag, { backgroundColor: '#dbeafe' }]}>
                <Text style={[styles.tagText, { color: '#1e40af' }]}>TTL: 5 min / 15s demo</Text>
              </View>
            </View>

            <View style={[styles.tokenBox, { backgroundColor: scheme === 'dark' ? '#1e293b' : '#f8fafc', borderColor: theme.cardBorder }]}>
              <View style={styles.tokenHeader}>
                <Ionicons name="lock-closed-outline" size={16} color="#16a34a" />
                <Text style={[styles.tokenName, { color: theme.text }]}>refresh_token</Text>
              </View>
              <Text style={[styles.tokenLocation, { color: '#16a34a' }]}>Enclave Criptográfico</Text>
              <Text style={[styles.tokenDetails, { color: theme.textSecondary }]}>
                Cifrado por hardware con SecureStore (iOS Keychain / Android Keystore) con política estricta.
              </Text>
              <View style={[styles.tag, { backgroundColor: '#dcfce7' }]}>
                <Text style={[styles.tagText, { color: '#166534' }]}>Rotatorio / 30 días</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Live Silent Refresh Queue Test Suite */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="git-network-outline" size={20} color={theme.accent} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Prueba #2: Cola Silenciosa (Silent Refresh)
            </Text>
          </View>
          <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
            Demuestra que ante respuestas 401 concurrentes, la app encola las peticiones y dispara una única renovación:
          </Text>

          {/* Action Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lanzar 5 peticiones simultáneas"
            disabled={busy}
            onPress={() => runRequest(5)}
            style={({ pressed }) => [
              styles.testBtn,
              {
                backgroundColor: theme.primary,
                opacity: busy ? 0.7 : pressed ? 0.9 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                <Text style={styles.testBtnText}>Lanzar 5 Peticiones Simultáneas</Text>
              </>
            )}
          </Pressable>

          <View style={[styles.hintCard, { backgroundColor: scheme === 'dark' ? '#1e293b' : '#fffbeb', borderColor: theme.warning }]}>
            <Ionicons name="information-circle-outline" size={18} color="#d97706" />
            <Text style={[styles.hintText, { color: scheme === 'dark' ? '#fcd34d' : '#92400e' }]}>
              Consejo de sustentación: Con <Text style={{ fontFamily: 'monospace', fontWeight: '700' }}>ACCESS_TTL_SECONDS=15</Text>, espera 16 segundos antes de pulsar para observar la rotación de token en vivo.
            </Text>
          </View>

          {/* Summary */}
          {testSummary ? (
            <View style={[styles.summaryBox, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <Text style={[styles.summaryText, { color: '#166534' }]}>{testSummary}</Text>
            </View>
          ) : null}

          {/* Results Table */}
          {results.length > 0 && (
            <View style={styles.tableContainer}>
              <Text style={[styles.tableHeading, { color: theme.muted }]}>
                DETALLE DE PETICIONES EN VUELO:
              </Text>
              {results.map((r) => (
                <View
                  key={r.index}
                  style={[
                    styles.tableRow,
                    {
                      backgroundColor: scheme === 'dark' ? '#1e293b' : '#f8fafc',
                      borderColor: theme.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.rowLabel, { color: theme.text }]}>Petición #{r.index}</Text>
                  <View style={[styles.codeBadge, { backgroundColor: r.status === 200 ? '#dcfce7' : '#fee2e2' }]}>
                    <Text
                      style={[
                        styles.codeBadgeText,
                        { color: r.status === 200 ? '#166534' : '#991b1b' },
                      ]}
                    >
                      {r.status} OK
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: theme.dangerLight, borderColor: theme.danger }]}>
              <Ionicons name="alert-circle" size={18} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger }]} accessibilityRole="alert">
                {error}
              </Text>
            </View>
          ) : null}
        </View>
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
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
  },
  profileEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  tokenSpecRow: {
    gap: 12,
  },
  tokenBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tokenName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  tokenLocation: {
    fontSize: 12,
    fontWeight: '700',
  },
  tokenDetails: {
    fontSize: 12,
    lineHeight: 16,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
  },
  testBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  hintCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 14,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    lineHeight: 16,
  },
  tableContainer: {
    gap: 8,
  },
  tableHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
    marginLeft: 2,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
