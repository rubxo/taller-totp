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
import { Ionicons } from '@expo/vector-icons';
import { API, useAuth } from '../../src/auth/AuthContext';
import { listAccounts, saveAccount } from '../../src/lib/storage';
import { generateTotp } from '../../src/lib/totp';
import { colors } from '../../src/theme/colors';

export default function Vault() {
  const { client, elevated, apiUrl } = useAuth();
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? colors.dark : colors.light;

  const [stepUpToken, setStepUpToken] = useState('');
  const [code, setCode] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [vaultData, setVaultData] = useState<Record<string, unknown> | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastPayload, setLastPayload] = useState<{ step_up_token: string; code: string } | null>(null);
  const [replayResult, setReplayResult] = useState<{ status: number; message: string; ok: boolean } | null>(null);

  // Load vault data
  async function loadVault(token?: string) {
    setBusy(true);
    setError('');
    setReplayResult(null);
    try {
      const r = await client.request('/api/boveda-critica', {}, token);
      const data = await r.json();

      if (r.status === 403 && data.error === 'mfa_required') {
        setStepUpToken(data.step_up_token);
        setStatusMessage('403 Forbidden · Elevación 2FA Requerida');
        setModalOpen(true);
      } else if (r.status === 401 && token) {
        // Elevated token expired
        elevated.current = null;
        await loadVault();
      } else if (!r.ok) {
        throw new Error(data.detail || 'No se pudo abrir la bóveda crítica');
      } else {
        setVaultData(data);
        setStatusMessage('200 OK · Acceso Autorizado con Sesión Elevada');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadVault(elevated.current || undefined);
  }, []);

  // Verify TOTP code
  async function handleVerify(codeToVerify = code) {
    if (!/^\d{6}$/.test(codeToVerify)) {
      setError('Introduce exactamente 6 dígitos numéricos');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const payload = { step_up_token: stepUpToken, code: codeToVerify };
      const r = await fetch((apiUrl || API) + '/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await r.json();
      if (!r.ok) {
        throw new Error(`${r.status}: ${data.detail || 'Error al validar segundo factor'}`);
      }

      // Elevation successful!
      elevated.current = data.elevated_token;
      setLastPayload(payload);
      setModalOpen(false);
      setCode('');
      await loadVault(data.elevated_token);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // Auto-fill from local UniSabana TOTP account
  async function handleAutoFill() {
    try {
      let accounts = await listAccounts();
      let account = accounts.find((a) => a.issuer.toLowerCase().includes('unisabana'));
      if (!account) {
        account = {
          id: `unisabana-demo-${Date.now()}`,
          issuer: 'UniSabana',
          label: 'estudiante@unisabana.edu.co',
          secret: 'JBSWY3DPEHPK3PXP',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
        };
        await saveAccount(account);
      }
      const t = await generateTotp(account);
      setCode(t.code);
      await handleVerify(t.code);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // Demonstrate Anti-Replay Attack (Scenario 5)
  async function handleReplayAttack() {
    if (!lastPayload) return;
    setBusy(true);
    setReplayResult(null);
    try {
      const r = await fetch((apiUrl || API) + '/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lastPayload),
      });
      const data = await r.json();

      if (r.status === 409) {
        setReplayResult({
          status: 409,
          message: data.detail || 'Replay Attack Detected',
          ok: true, // Expected outcome for anti-replay defense!
        });
      } else {
        setReplayResult({
          status: r.status,
          message: data.detail || `Respuesta inesperada: ${r.status}`,
          ok: false,
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const handleRelock = () => {
    elevated.current = null;
    setVaultData(null);
    setLastPayload(null);
    setReplayResult(null);
    void loadVault();
  };

  const isUnlocked = !!vaultData && !!elevated.current;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Security Banner */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: isUnlocked ? '#ecfdf5' : '#fff1f2',
              borderColor: isUnlocked ? '#a7f3d0' : '#fecdd3',
            },
          ]}
        >
          <Ionicons
            name={isUnlocked ? 'shield-checkmark' : 'shield-half'}
            size={24}
            color={isUnlocked ? '#059669' : '#e11d48'}
          />
          <View style={styles.statusBannerText}>
            <Text
              style={[
                styles.statusBannerTitle,
                { color: isUnlocked ? '#065f46' : '#9f1239' },
              ]}
            >
              {isUnlocked ? 'Acceso Autorizado · Sesión Elevada' : 'Acceso Restringido · Requiere 2FA'}
            </Text>
            <Text
              style={[
                styles.statusBannerDesc,
                { color: isUnlocked ? '#047857' : '#be123c' },
              ]}
            >
              {isUnlocked
                ? 'El token elevado con claim mfa_verified: true está activo (TTL 10 min).'
                : 'La petición estándar devolvió 403 Forbidden. Se requiere elevación dinámica.'}
            </Text>
          </View>
        </View>

        {/* Unlocked Vault Content */}
        {isUnlocked ? (
          <View style={[styles.vaultCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.vaultHeader}>
              <View style={[styles.vaultIconBadge, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="folder-open" size={24} color="#16a34a" />
              </View>
              <View style={styles.vaultHeaderTitle}>
                <Text style={[styles.vaultTitle, { color: theme.text }]}>Expediente Confidencial</Text>
                <Text style={[styles.vaultSubtitle, { color: theme.textSecondary }]}>
                  Documento clasificado en servidor seguro
                </Text>
              </View>
            </View>

            <View style={[styles.vaultDataBox, { backgroundColor: scheme === 'dark' ? '#1e293b' : '#f8fafc', borderColor: theme.cardBorder }]}>
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: theme.muted }]}>Contenido sensible:</Text>
                <Text style={[styles.dataValue, { color: theme.text }]}>
                  {String(vaultData.documento || 'Datos sensibles protegidos')}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: theme.muted }]}>Claim mfa_verified:</Text>
                <View style={[styles.verifiedPill, { backgroundColor: '#dcfce7' }]}>
                  <Text style={[styles.verifiedPillText, { color: '#166534' }]}>true</Text>
                </View>
              </View>
              <View style={styles.dataRow}>
                <Text style={[styles.dataLabel, { color: theme.muted }]}>Tipo de Token:</Text>
                <Text style={[styles.dataValue, { color: theme.accent, fontFamily: 'monospace' }]}>
                  elevated (HS256)
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bloquear bóveda de nuevo"
              onPress={handleRelock}
              style={[styles.relockBtn, { borderColor: theme.cardBorder }]}
            >
              <Ionicons name="lock-closed-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.relockBtnText, { color: theme.textSecondary }]}>
                Revocar Sesión Elevada (Bloquear)
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.lockedCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={[styles.lockedIconBadge, { backgroundColor: '#fff1f2' }]}>
              <Ionicons name="lock-closed" size={36} color="#e11d48" />
            </View>
            <Text style={[styles.lockedTitle, { color: theme.text }]}>Bóveda Protegida</Text>
            <Text style={[styles.lockedDesc, { color: theme.textSecondary }]}>
              Esta ruta (`/api/boveda-critica`) exige un segundo factor de autenticación TOTP conforme al estándar RFC 6238.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Solicitar elevación de privilegios"
              disabled={busy}
              onPress={() => loadVault()}
              style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="key-outline" size={18} color="#fff" />
                  <Text style={styles.primaryActionBtnText}>Desbloquear con Step-Up 2FA</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Scenario 5: Anti-Replay Demonstration Card */}
        {lastPayload && (
          <View style={[styles.antiReplayCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.antiReplayHeader}>
              <View style={[styles.shieldIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="shield-outline" size={20} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.antiReplayTitle, { color: theme.text }]}>
                  Prueba de Aceptación #5: Anti-Replay
                </Text>
                <Text style={[styles.antiReplaySubtitle, { color: theme.textSecondary }]}>
                  Código usado recientemente: <Text style={{ fontFamily: 'monospace', fontWeight: '700' }}>{lastPayload.code}</Text>
                </Text>
              </View>
            </View>

            <Text style={[styles.antiReplayExplanation, { color: theme.textSecondary }]}>
              Envía nuevamente el mismo código dentro de la misma ventana de 30 segundos. El backend debe rechazarlo con <Text style={{ fontWeight: '700' }}>409 Conflict: Replay Attack Detected</Text>.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Probar ataque de repetición con el mismo código"
              disabled={busy}
              onPress={handleReplayAttack}
              style={[styles.replayBtn, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}
            >
              {busy ? (
                <ActivityIndicator color="#b91c1c" size="small" />
              ) : (
                <>
                  <Ionicons name="repeat-outline" size={18} color="#b91c1c" />
                  <Text style={[styles.replayBtnText, { color: '#b91c1c' }]}>
                    Ejecutar Prueba de Ataque de Repetición
                  </Text>
                </>
              )}
            </Pressable>

            {/* Anti-Replay Result Display */}
            {replayResult && (
              <View
                style={[
                  styles.resultBox,
                  {
                    backgroundColor: replayResult.ok ? '#fef2f2' : '#f0fdf4',
                    borderColor: replayResult.ok ? '#f87171' : '#86efac',
                  },
                ]}
              >
                <View style={styles.resultHeader}>
                  <Ionicons
                    name={replayResult.ok ? 'checkmark-circle' : 'alert-circle'}
                    size={20}
                    color={replayResult.ok ? '#dc2626' : '#16a34a'}
                  />
                  <Text
                    style={[
                      styles.resultStatus,
                      { color: replayResult.ok ? '#dc2626' : '#16a34a' },
                    ]}
                  >
                    Respuesta del Backend: {replayResult.status}
                  </Text>
                </View>
                <Text style={[styles.resultDetail, { color: theme.text }]}>
                  {replayResult.message}
                </Text>
                <Text style={[styles.resultNote, { color: theme.muted }]}>
                  {replayResult.ok
                    ? '✓ ÉXITO: El servidor detectó el ataque de repetición y bloqueó el reuso del código TOTP.'
                    : 'Aviso: La respuesta no fue 409 Conflict.'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Global Error Banner */}
        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: theme.dangerLight, borderColor: theme.danger }]}>
            <Ionicons name="alert-circle" size={18} color={theme.danger} />
            <Text style={[styles.errorBannerText, { color: theme.danger }]} accessibilityRole="alert">
              {error}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* 2FA Step-Up Verification Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            {/* Modal Header */}
            <View style={styles.modalTitleRow}>
              <View style={[styles.modalIconBg, { backgroundColor: '#fff1f2' }]}>
                <Ionicons name="shield-checkmark" size={24} color="#e11d48" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalMainTitle, { color: theme.text }]}>Verificación 2FA</Text>
                <Text style={[styles.modalSubTitle, { color: theme.textSecondary }]}>
                  Step-Up Authentication · RFC 6238
                </Text>
              </View>
              <Pressable onPress={() => setModalOpen(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={22} color={theme.text} />
              </Pressable>
            </View>

            <Text style={[styles.modalPrompt, { color: theme.textSecondary }]}>
              Introduce el código temporal de 6 dígitos generado por tu cuenta UniSabana:
            </Text>

            {/* Visual 6-Box OTP Display with Overlay Input */}
            <View style={styles.codeBoxesContainer}>
              <View style={styles.codeBoxesRow}>
                {[0, 1, 2].map((idx) => {
                  const digit = code[idx] || '';
                  const isCurrent = code.length === idx;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.codeBox,
                        {
                          backgroundColor: theme.inputBg,
                          borderColor: isCurrent ? theme.accent : digit ? theme.primary : theme.inputBorder,
                          borderWidth: isCurrent ? 2 : 1.5,
                        },
                      ]}
                    >
                      <Text style={[styles.codeBoxText, { color: theme.text }]}>
                        {digit}
                      </Text>
                    </View>
                  );
                })}
                <View style={styles.codeBoxDivider}>
                  <Text style={[styles.codeBoxDividerText, { color: theme.muted }]}>-</Text>
                </View>
                {[3, 4, 5].map((idx) => {
                  const digit = code[idx] || '';
                  const isCurrent = code.length === idx;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.codeBox,
                        {
                          backgroundColor: theme.inputBg,
                          borderColor: isCurrent ? theme.accent : digit ? theme.primary : theme.inputBorder,
                          borderWidth: isCurrent ? 2 : 1.5,
                        },
                      ]}
                    >
                      <Text style={[styles.codeBoxText, { color: theme.text }]}>
                        {digit}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Invisible Full-Row TextInput capturing keystrokes */}
              <TextInput
                accessibilityLabel="Código de 6 dígitos 2FA"
                value={code}
                onChangeText={(v) => {
                  const cleaned = v.replace(/\D/g, '').slice(0, 6);
                  setCode(cleaned);
                  if (cleaned.length === 6) {
                    void handleVerify(cleaned);
                  }
                }}
                maxLength={6}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoFocus
                style={styles.hiddenInput}
                caretHidden
              />
            </View>

            {code.length > 0 && (
              <Pressable
                onPress={() => setCode('')}
                style={{ alignSelf: 'center', marginBottom: 10, paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 12, color: theme.accent, fontWeight: '600' }}>
                  Borrar código
                </Text>
              </Pressable>
            )}

            {error ? (
              <Text style={[styles.modalError, { color: theme.danger }]} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}

            {/* Actions */}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Verificar código"
                disabled={busy || code.length !== 6}
                onPress={() => handleVerify()}
                style={[
                  styles.verifyBtn,
                  {
                    backgroundColor: theme.primary,
                    opacity: busy || code.length !== 6 ? 0.6 : 1,
                  },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#fff" />
                    <Text style={styles.verifyBtnText}>Verificar y Elevar Privilegios</Text>
                  </>
                )}
              </Pressable>

              {/* Quick auto-fill button for fast lab grading */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Autocompletar con autenticador local"
                disabled={busy}
                onPress={handleAutoFill}
                style={[styles.autoFillBtn, { borderColor: theme.cardBorder, backgroundColor: theme.bg }]}
              >
                <Ionicons name="flash-outline" size={16} color={theme.accent} />
                <Text style={[styles.autoFillBtnText, { color: theme.text }]}>
                  Autocompletar desde mi autenticador UniSabana
                </Text>
              </Pressable>

              <Pressable onPress={() => setModalOpen(false)} style={styles.cancelBtn}>
                <Text style={[styles.cancelBtnText, { color: theme.muted }]}>Cancelar</Text>
              </Pressable>
            </View>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  statusBannerText: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  statusBannerDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  vaultCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  vaultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  vaultIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultHeaderTitle: {
    flex: 1,
  },
  vaultTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  vaultSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  vaultDataBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  dataValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  verifiedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedPillText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  relockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  relockBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  lockedCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 20,
  },
  lockedIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  lockedDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 280,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 8,
    width: '100%',
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  antiReplayCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  antiReplayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  shieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  antiReplayTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  antiReplaySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  antiReplayExplanation: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  replayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  replayBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  resultBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  resultStatus: {
    fontSize: 13,
    fontWeight: '800',
  },
  resultDetail: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  resultNote: {
    fontSize: 11,
    lineHeight: 15,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMainTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 4,
  },
  modalPrompt: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  codeBoxesContainer: {
    position: 'relative',
    marginVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  codeBox: {
    width: 44,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  codeBoxText: {
    fontSize: 24,
    fontWeight: '800',
  },
  codeBoxDivider: {
    paddingHorizontal: 2,
  },
  codeBoxDividerText: {
    fontSize: 20,
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    color: 'transparent',
  },
  modalError: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalActions: {
    gap: 10,
    marginTop: 6,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  verifyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  autoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  autoFillBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
