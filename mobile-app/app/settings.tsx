import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { exportBackup, importBackup } from '../src/lib/backup';
import {
  getBiometricType,
  getPin,
  hasBiometrics,
  isLockEnabled,
  resetLockSettings,
  setLockEnabled,
  setPin,
} from '../src/lib/lock';
import { colors } from '../src/theme/colors';

export default function SettingsScreen() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? colors.dark : colors.light;

  const [hideCodes, setHideCodes] = useState(false);
  const [lockActive, setLockActive] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [bioType, setBioType] = useState<'FACE_ID' | 'TOUCH_ID' | 'BIOMETRIC'>('BIOMETRIC');
  const [busy, setBusy] = useState(false);

  // Backup Modals
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportPassword, setExportPassword] = useState('sabana2026');
  const [showExportPassword, setShowExportPassword] = useState(false);

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importPassword, setImportPassword] = useState('sabana2026');
  const [showImportPassword, setShowImportPassword] = useState(false);

  useEffect(() => {
    void isLockEnabled().then(setLockActive);
    void getPin().then((p) => {
      if (p) setPinValue(p);
    });
    void hasBiometrics().then(async (available) => {
      setBiometricsAvailable(available);
      if (available) {
        const type = await getBiometricType();
        setBioType(type);
      }
    });
  }, []);

  const handleToggleLock = async (value: boolean) => {
    if (value) {
      if (!pinValue || pinValue.length < 4) {
        Alert.alert(
          'PIN Requerido',
          'Por favor escribe un PIN numérico de 4 a 6 dígitos antes de activar el bloqueo.'
        );
        return;
      }
      try {
        await setPin(pinValue);
        setLockActive(true);
        Alert.alert(
          'Bloqueo Activado',
          'El acceso estará protegido con tu PIN y Face ID al reanudar la aplicación.'
        );
      } catch (e: unknown) {
        Alert.alert('Error', e instanceof Error ? e.message : String(e));
      }
    } else {
      await setLockEnabled(false);
      setLockActive(false);
      Alert.alert('Bloqueo Desactivado', 'El bloqueo por PIN ha sido desactivado.');
    }
  };

  const handleSavePin = async () => {
    if (!/^\d{4,6}$/.test(pinValue)) {
      Alert.alert('PIN Inválido', 'El PIN debe ser únicamente numérico de 4 a 6 dígitos.');
      return;
    }
    try {
      await setPin(pinValue);
      setLockActive(true);
      Alert.alert('PIN Guardado', 'El PIN ha sido almacenado de forma segura en el enclave del iPhone.');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    }
  };

  const handleResetLock = async () => {
    Alert.alert(
      'Restablecer Bloqueo',
      '¿Deseas eliminar el PIN y desactivar la protección por bloqueo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: async () => {
            await resetLockSettings();
            setLockActive(false);
            setPinValue('');
            Alert.alert('Restablecido', 'El bloqueo ha sido desactivado por completo.');
          },
        },
      ]
    );
  };

  const handleExecuteExport = async () => {
    if (exportPassword.length < 8) {
      Alert.alert('Contraseña Corta', 'La contraseña para derivar la llave Scrypt debe tener al menos 8 caracteres.');
      return;
    }
    setBusy(true);
    try {
      await exportBackup(exportPassword);
      setExportModalVisible(false);
      Alert.alert(
        'Respaldo Cifrado Exportado',
        'Se generó el archivo totp-backup.totp cifrado con AES-256-GCM. Ya puedes guardarlo o compartirlo.'
      );
    } catch (e: unknown) {
      Alert.alert('Error de Exportación', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleExecuteImport = async () => {
    if (importPassword.length < 8) {
      Alert.alert('Contraseña Corta', 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setBusy(true);
    try {
      const count = await importBackup(importPassword);
      setImportModalVisible(false);
      if (count > 0) {
        Alert.alert('Restauración Exitosa', `Se restauraron ${count} cuentas TOTP al enclave seguro.`);
      }
    } catch (e: unknown) {
      Alert.alert('Error al Importar', e instanceof Error ? e.message : 'No se pudo desencriptar el respaldo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Ajustes de Seguridad</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Enclave seguro, biometría y respaldos cifrados
          </Text>
        </View>

        {/* Section 1: Privacy */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="eye-off-outline" size={20} color={theme.accent} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Privacidad Visual</Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Ocultar códigos por defecto</Text>
              <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>
                Muestra '••• •••' en lugar de los números hasta tocar la tarjeta.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Ocultar códigos por defecto"
              value={hideCodes}
              onValueChange={setHideCodes}
              trackColor={{ false: '#cbd5e1', true: theme.accent }}
            />
          </View>
        </View>

        {/* Section 2: Security Lock */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Bloqueo de Aplicación</Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Activar bloqueo de acceso</Text>
              <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>
                Solicita PIN o Face ID tras 30 segundos en segundo plano.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Activar bloqueo de acceso"
              value={lockActive}
              onValueChange={handleToggleLock}
              trackColor={{ false: '#cbd5e1', true: theme.accent }}
            />
          </View>

          <View style={[styles.pinConfigBox, { borderTopColor: theme.cardBorder }]}>
            <Text style={[styles.pinLabel, { color: theme.textSecondary }]}>
              PIN de Acceso (4 a 6 dígitos numéricos):
            </Text>
            <View style={styles.pinInputRow}>
              <TextInput
                accessibilityLabel="PIN numérico"
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
                value={pinValue}
                onChangeText={(v) => setPinValue(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="Ej. 1234"
                placeholderTextColor={theme.muted}
                style={[
                  styles.pinInput,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.text,
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Guardar PIN"
                onPress={handleSavePin}
                disabled={pinValue.length < 4}
                style={[
                  styles.savePinBtn,
                  {
                    backgroundColor: theme.primary,
                    opacity: pinValue.length < 4 ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={styles.savePinText}>Guardar</Text>
              </Pressable>
            </View>
          </View>

          {biometricsAvailable && (
            <View style={[styles.biometricInfo, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
              <Ionicons
                name={bioType === 'FACE_ID' ? 'scan-outline' : 'finger-print-outline'}
                size={20}
                color="#16a34a"
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.biometricText, { color: '#166534' }]}>
                  {bioType === 'FACE_ID' ? 'Face ID disponible en este iPhone' : 'Biometría disponible'}
                </Text>
                <Text style={{ fontSize: 11, color: '#15803d', marginTop: 1 }}>
                  Puedes desbloquear usando tu rostro o el PIN de arriba.
                </Text>
              </View>
            </View>
          )}

          {lockActive && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Desactivar y restablecer bloqueo"
              onPress={handleResetLock}
              style={styles.resetPinBtn}
            >
              <Ionicons name="trash-outline" size={15} color={theme.danger} />
              <Text style={[styles.resetPinText, { color: theme.danger }]}>
                Eliminar PIN y Desactivar Bloqueo
              </Text>
            </Pressable>
          )}
        </View>

        {/* Section 3: Encrypted Backups */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="cloud-upload-outline" size={20} color={theme.accent} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Copias de Seguridad Cifradas</Text>
          </View>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
            Los respaldos se cifran usando AES-256-GCM con derivación de llave Scrypt (KDF resistente a ataques de GPU).
          </Text>

          <View style={styles.backupActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Exportar respaldo cifrado"
              disabled={busy}
              onPress={() => setExportModalVisible(true)}
              style={[styles.backupBtn, { backgroundColor: theme.primary }]}
            >
              <Ionicons name="share-outline" size={18} color="#ffffff" />
              <Text style={styles.backupBtnText}>Exportar Respaldo (.totp)</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Importar respaldo cifrado"
              disabled={busy}
              onPress={() => setImportModalVisible(true)}
              style={[styles.backupBtnSecondary, { borderColor: theme.cardBorder, backgroundColor: theme.bg }]}
            >
              <Ionicons name="download-outline" size={18} color={theme.text} />
              <Text style={[styles.backupBtnSecondaryText, { color: theme.text }]}>
                Importar Respaldo
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Section 4: Academic Specs */}
        <View style={[styles.academicCard, { backgroundColor: scheme === 'dark' ? '#1e293b' : '#f8fafc', borderColor: theme.cardBorder }]}>
          <Text style={[styles.academicTitle, { color: theme.text }]}>Universidad de La Sabana</Text>
          <Text style={[styles.academicDesc, { color: theme.textSecondary }]}>
            Taller Seguridad Móvil · React Native Expo SDK 58 · iPhone 16
          </Text>
          <View style={styles.specsRow}>
            <Text style={[styles.specTag, { color: theme.muted }]}>RFC 7636 (PKCE)</Text>
            <Text style={[styles.specTag, { color: theme.muted }]}>•</Text>
            <Text style={[styles.specTag, { color: theme.muted }]}>RFC 6238 (TOTP)</Text>
            <Text style={[styles.specTag, { color: theme.muted }]}>•</Text>
            <Text style={[styles.specTag, { color: theme.muted }]}>AES-256-GCM</Text>
          </View>
        </View>
      </ScrollView>

      {/* Export Backup Modal */}
      <Modal visible={exportModalVisible} animationType="slide" transparent onRequestClose={() => setExportModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalIconBg, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Exportar Respaldo</Text>
                <Text style={[styles.modalSub, { color: theme.textSecondary }]}>Cifrado AES-256-GCM + Scrypt</Text>
              </View>
              <Pressable onPress={() => setExportModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.text} />
              </Pressable>
            </View>

            <Text style={[styles.modalInstruction, { color: theme.textSecondary }]}>
              Define una contraseña de al menos 8 caracteres para cifrar el archivo .totp:
            </Text>

            <View style={styles.passwordFieldRow}>
              <TextInput
                value={exportPassword}
                onChangeText={setExportPassword}
                secureTextEntry={!showExportPassword}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={theme.muted}
                style={[
                  styles.passwordInput,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text },
                ]}
              />
              <Pressable
                onPress={() => setShowExportPassword((v) => !v)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showExportPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.muted}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={() => setExportPassword('sabana2026')}
              style={[styles.quickPassBtn, { borderColor: theme.cardBorder }]}
            >
              <Ionicons name="flash-outline" size={14} color={theme.accent} />
              <Text style={[styles.quickPassText, { color: theme.accent }]}>
                Usar clave por defecto de laboratorio: sabana2026
              </Text>
            </Pressable>

            <View style={styles.modalActionButtons}>
              <Pressable
                disabled={busy || exportPassword.length < 8}
                onPress={handleExecuteExport}
                style={[
                  styles.confirmBtn,
                  { backgroundColor: theme.primary, opacity: busy || exportPassword.length < 8 ? 0.6 : 1 },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="share-outline" size={18} color="#fff" />
                    <Text style={styles.confirmBtnText}>Cifrar y Compartir Respaldo</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Import Backup Modal */}
      <Modal visible={importModalVisible} animationType="slide" transparent onRequestClose={() => setImportModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalIconBg, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="download" size={24} color="#16a34a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Importar Respaldo</Text>
                <Text style={[styles.modalSub, { color: theme.textSecondary }]}>Desencriptar archivo .totp</Text>
              </View>
              <Pressable onPress={() => setImportModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.text} />
              </Pressable>
            </View>

            <Text style={[styles.modalInstruction, { color: theme.textSecondary }]}>
              Escribe la contraseña con la que fue cifrado el archivo:
            </Text>

            <View style={styles.passwordFieldRow}>
              <TextInput
                value={importPassword}
                onChangeText={setImportPassword}
                secureTextEntry={!showImportPassword}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={theme.muted}
                style={[
                  styles.passwordInput,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text },
                ]}
              />
              <Pressable
                onPress={() => setShowImportPassword((v) => !v)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showImportPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.muted}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={() => setImportPassword('sabana2026')}
              style={[styles.quickPassBtn, { borderColor: theme.cardBorder }]}
            >
              <Ionicons name="flash-outline" size={14} color={theme.accent} />
              <Text style={[styles.quickPassText, { color: theme.accent }]}>
                Usar clave por defecto: sabana2026
              </Text>
            </Pressable>

            <View style={styles.modalActionButtons}>
              <Pressable
                disabled={busy || importPassword.length < 8}
                onPress={handleExecuteImport}
                style={[
                  styles.confirmBtn,
                  { backgroundColor: theme.primary, opacity: busy || importPassword.length < 8 ? 0.6 : 1 },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="folder-open-outline" size={18} color="#fff" />
                    <Text style={styles.confirmBtnText}>Seleccionar Archivo y Restaurar</Text>
                  </>
                )}
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
    gap: 16,
  },
  header: {
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  pinConfigBox: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  pinLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  pinInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pinInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    letterSpacing: 4,
  },
  savePinBtn: {
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savePinText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  biometricInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  biometricText: {
    fontSize: 13,
    fontWeight: '700',
  },
  resetPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  resetPinText: {
    fontSize: 12,
    fontWeight: '600',
  },
  backupActions: {
    gap: 10,
    marginTop: 4,
  },
  backupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
  },
  backupBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  backupBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  backupBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  academicCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  academicTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  academicDesc: {
    fontSize: 11,
    textAlign: 'center',
  },
  specsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  specTag: {
    fontSize: 10,
    fontWeight: '600',
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
    gap: 14,
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
  modalInstruction: {
    fontSize: 13,
    lineHeight: 18,
  },
  passwordFieldRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 44,
    fontSize: 15,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 6,
  },
  quickPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  quickPassText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalActionButtons: {
    marginTop: 8,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
