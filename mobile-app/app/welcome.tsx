import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Link, Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { API, useAuth } from '../src/auth/AuthContext';
import { colors } from '../src/theme/colors';

export default function Welcome() {
  const auth = useAuth();
  const router = useRouter();
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? colors.dark : colors.light;

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(auth.apiUrl);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    setCustomApiUrl(auth.apiUrl);
  }, [auth.apiUrl]);

  if (auth.ready && auth.authenticated) {
    return <Redirect href="/home" />;
  }

  const handleTestConnection = async (urlToTest = customApiUrl) => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const cleanUrl = urlToTest.trim().replace(/\/+$/, '');
      const response = await fetch(`${cleanUrl}/mfa/enroll`, { method: 'GET' });
      if (response.ok) {
        setTestResult({
          ok: true,
          message: `✓ Conexión exitosa (Código ${response.status} OK). El backend responde correctamente.`,
        });
      } else {
        setTestResult({
          ok: false,
          message: `✗ El servidor respondió con código ${response.status}`,
        });
      }
    } catch (e: unknown) {
      setTestResult({
        ok: false,
        message: `✗ No se pudo conectar a ${urlToTest}. Verifica que el backend esté encendido (ACCESS_TTL_SECONDS=15 uvicorn app.main:app).`,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveApiUrl = async () => {
    await auth.setApiUrl(customApiUrl);
    setShowConfig(false);
  };

  const handleLogin = async () => {
    setBusy(true);
    setError('');
    try {
      await auth.login();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      Alert.alert('Error de autenticación', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Institutional Branding Header */}
        <View style={styles.header}>
          <View style={[styles.logoBadge, { backgroundColor: theme.primary }]}>
            <Ionicons name="shield-checkmark" size={40} color="#ffffff" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Seguridad Móvil</Text>
          <Text style={[styles.institution, { color: theme.crimson }]}>UNIVERSIDAD DE LA SABANA</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Arquitectura Criptográfica · OAuth 2.0 PKCE · TOTP RFC 6238 · Step-Up 2FA
          </Text>
        </View>

        {/* Server Endpoint Indicator */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver configuración de servidor"
          onPress={() => setShowConfig(true)}
          style={[styles.serverPill, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <View style={styles.serverStatusDot} />
          <Text style={[styles.serverText, { color: theme.textSecondary }]} numberOfLines={1}>
            API Backend: <Text style={{ fontWeight: '700', color: theme.text }}>{auth.apiUrl}</Text>
          </Text>
          <Ionicons name="settings-outline" size={14} color={theme.muted} />
        </Pressable>

        {/* Architecture Pillars List */}
        <View style={styles.pillarsContainer}>
          <Text style={[styles.pillarsHeading, { color: theme.muted }]}>
            PILares DE SEGURIDAD IMPLEMENTADOS
          </Text>

          <View style={[styles.pillarCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.pillarIconBg, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="key-outline" size={22} color="#2563eb" />
            </View>
            <View style={styles.pillarText}>
              <Text style={[styles.pillarTitle, { color: theme.text }]}>OAuth 2.0 + PKCE (RFC 7636)</Text>
              <Text style={[styles.pillarDesc, { color: theme.textSecondary }]}>
                Navegador nativo del sistema, generador aleatorio de 64 caracteres, hash SHA-256 y anti-CSRF state.
              </Text>
            </View>
          </View>

          <View style={[styles.pillarCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.pillarIconBg, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="hardware-chip-outline" size={22} color="#16a34a" />
            </View>
            <View style={styles.pillarText}>
              <Text style={[styles.pillarTitle, { color: theme.text }]}>Enclave Criptográfico Seguro</Text>
              <Text style={[styles.pillarDesc, { color: theme.textSecondary }]}>
                Separación de memoria: access_token en RAM y refresh_token cifrado en Keystore/Keychain.
              </Text>
            </View>
          </View>

          <View style={[styles.pillarCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.pillarIconBg, { backgroundColor: '#faf5ff' }]}>
              <Ionicons name="timer-outline" size={22} color="#9333ea" />
            </View>
            <View style={styles.pillarText}>
              <Text style={[styles.pillarTitle, { color: theme.text }]}>TOTP Propio (RFC 6238)</Text>
              <Text style={[styles.pillarDesc, { color: theme.textSecondary }]}>
                HMAC-SHA1 + Truncamiento Dinámico matemático sin librerías externas. 100% en Modo Avión.
              </Text>
            </View>
          </View>

          <View style={[styles.pillarCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.pillarIconBg, { backgroundColor: '#fff1f2' }]}>
              <Ionicons name="lock-closed-outline" size={22} color="#e11d48" />
            </View>
            <View style={styles.pillarText}>
              <Text style={[styles.pillarTitle, { color: theme.text }]}>Step-Up & Anti-Replay</Text>
              <Text style={[styles.pillarDesc, { color: theme.textSecondary }]}>
                Elevación dinámica para la Bóveda Crítica con bloqueo de reuso en ventana de 30 segundos.
              </Text>
            </View>
          </View>
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={[styles.errorCard, { backgroundColor: theme.dangerLight, borderColor: theme.danger }]}>
            <Ionicons name="alert-circle" size={18} color={theme.danger} />
            <Text style={[styles.errorText, { color: theme.danger }]} accessibilityRole="alert">
              {error}
            </Text>
          </View>
        ) : null}

        {/* Main Actions */}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión con navegador seguro"
            disabled={!auth.ready || busy}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: theme.primary,
                opacity: !auth.ready || busy ? 0.7 : pressed ? 0.9 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color="#ffffff" />
                <Text style={styles.primaryBtnText}>Iniciar Sesión Institucional</Text>
              </>
            )}
          </Pressable>

          {/* Quick Offline Authenticator Access for Airplane Mode demo */}
          <Link href="/authenticator" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir autenticador offline en modo avión"
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons name="airplane-outline" size={18} color={theme.accent} />
              <Text style={[styles.secondaryBtnText, { color: theme.text }]}>
                Abrir Autenticador Offline (Modo Avión)
              </Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.muted }]}>
            Facultad de Ingeniería · Sesión 14 · Seguridad Móvil
          </Text>
        </View>
      </ScrollView>

      {/* Backend API Configuration Modal */}
      <Modal visible={showConfig} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Servidor Backend (FastAPI)</Text>
              <Pressable onPress={() => setShowConfig(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              URL donde corre el backend (`uvicorn app.main:app`):
            </Text>
            <TextInput
              value={customApiUrl}
              onChangeText={(text) => {
                setCustomApiUrl(text);
                setTestResult(null);
              }}
              style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              placeholder="http://192.168.20.27:8000"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Quick Presets */}
            <Text style={[styles.presetsTitle, { color: theme.muted }]}>PREAJUSTES RÁPIDOS:</Text>
            <View style={styles.presetsRow}>
              <Pressable
                onPress={() => {
                  setCustomApiUrl('http://10.0.2.2:8000');
                  setTestResult(null);
                }}
                style={[styles.presetBtn, { borderColor: theme.cardBorder }]}
              >
                <Text style={[styles.presetBtnText, { color: theme.accent }]}>Emulador Android (10.0.2.2)</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setCustomApiUrl('http://192.168.20.27:8000');
                  setTestResult(null);
                }}
                style={[styles.presetBtn, { borderColor: theme.cardBorder }]}
              >
                <Text style={[styles.presetBtnText, { color: theme.accent }]}>IP LAN Wi-Fi (192.168.20.27)</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setCustomApiUrl('http://localhost:8000');
                  setTestResult(null);
                }}
                style={[styles.presetBtn, { borderColor: theme.cardBorder }]}
              >
                <Text style={[styles.presetBtnText, { color: theme.accent }]}>Localhost (Web / adb reverse)</Text>
              </Pressable>
            </View>

            {/* Test Connection Button */}
            <Pressable
              disabled={testingConnection}
              onPress={() => handleTestConnection()}
              style={[styles.testConnectionBtn, { borderColor: theme.accent, backgroundColor: scheme === 'dark' ? '#1e293b' : '#eff6ff' }]}
            >
              {testingConnection ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <>
                  <Ionicons name="pulse-outline" size={16} color={theme.accent} />
                  <Text style={[styles.testConnectionBtnText, { color: theme.accent }]}>
                    Probar Conexión con el Backend
                  </Text>
                </>
              )}
            </Pressable>

            {/* Open /mfa/enroll in Safari button */}
            <Pressable
              onPress={async () => {
                try {
                  const cleanUrl = (customApiUrl || auth.apiUrl).trim().replace(/\/+$/, '');
                  await WebBrowser.openBrowserAsync(`${cleanUrl}/mfa/enroll`);
                } catch {
                  Alert.alert('Error', 'No se pudo abrir Safari');
                }
              }}
              style={[styles.testConnectionBtn, { borderColor: theme.cardBorder, backgroundColor: theme.card, marginTop: 8 }]}
            >
              <Ionicons name="qr-code-outline" size={16} color={theme.text} />
              <Text style={[styles.testConnectionBtnText, { color: theme.text }]}>
                Abrir /mfa/enroll en Safari (Ver QR)
              </Text>
            </Pressable>

            {/* Connection Test Result */}
            {testResult && (
              <View
                style={[
                  styles.testResultBox,
                  {
                    backgroundColor: testResult.ok ? '#f0fdf4' : '#fef2f2',
                    borderColor: testResult.ok ? '#86efac' : '#fca5a5',
                  },
                ]}
              >
                <Ionicons
                  name={testResult.ok ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={testResult.ok ? '#16a34a' : '#dc2626'}
                />
                <Text
                  style={[
                    styles.testResultText,
                    { color: testResult.ok ? '#166534' : '#991b1b' },
                  ]}
                >
                  {testResult.message}
                </Text>
              </View>
            )}

            <Pressable
              onPress={handleSaveApiUrl}
              style={[styles.modalSaveBtn, { backgroundColor: theme.primary, marginTop: 12 }]}
            >
              <Text style={styles.modalSaveText}>Guardar y Usar Esta URL</Text>
            </Pressable>
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
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  institution: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    maxWidth: 320,
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'center',
    marginBottom: 24,
    gap: 8,
  },
  serverStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  serverText: {
    fontSize: 12,
  },
  pillarsContainer: {
    marginBottom: 24,
  },
  pillarsHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  pillarCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    alignItems: 'flex-start',
    gap: 12,
  },
  pillarIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarText: {
    flex: 1,
  },
  pillarTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  pillarDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  primaryBtn: {
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
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalDesc: {
    fontSize: 13,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  modalNote: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
  },
  presetsTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  presetsRow: {
    gap: 6,
    marginBottom: 12,
  },
  presetBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  testConnectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    marginBottom: 10,
  },
  testConnectionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 4,
  },
  testResultText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  modalSaveBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
