import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { gcm } from '@noble/ciphers/aes';
import { scryptAsync } from '@noble/hashes/scrypt';
import { listAccounts, saveAccount } from './storage';
import { buildOtpAuth, parseOtpAuth } from './otpauth';

const VERSION = 1, SALT_BYTES = 16, NONCE_BYTES = 12;
const KDF = { N: 2 ** 15, r: 8, p: 1, dkLen: 32 } as const;
const encoder = new TextEncoder(), decoder = new TextDecoder();
export type BackupEnvelope = { version: 1; salt: string; nonce: string; ciphertext: string };
const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string) => { const binary = atob(value); return Uint8Array.from(binary, c => c.charCodeAt(0)); };
const deriveKey = (password: string, salt: Uint8Array) => scryptAsync(password, salt, KDF);

export async function encryptBackupPayload(plaintext: string, password: string): Promise<BackupEnvelope> {
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
  const salt = Crypto.getRandomBytes(SALT_BYTES), nonce = Crypto.getRandomBytes(NONCE_BYTES);
  const ciphertext = gcm(await deriveKey(password, salt), nonce).encrypt(encoder.encode(plaintext));
  return { version: VERSION, salt: base64(salt), nonce: base64(nonce), ciphertext: base64(ciphertext) };
}

export async function decryptBackupPayload(raw: unknown, password: string): Promise<string> {
  try {
    if (!raw || typeof raw !== 'object' || (raw as BackupEnvelope).version !== VERSION) throw new Error();
    const envelope = raw as BackupEnvelope, salt = fromBase64(envelope.salt), nonce = fromBase64(envelope.nonce), ciphertext = fromBase64(envelope.ciphertext);
    if (salt.length !== SALT_BYTES || nonce.length !== NONCE_BYTES || ciphertext.length < 16) throw new Error();
    return decoder.decode(gcm(await deriveKey(password, salt), nonce).decrypt(ciphertext));
  } catch { throw new Error('La contraseña es incorrecta o el respaldo fue manipulado'); }
}

export async function exportBackup(password: string) {
  const accounts = await listAccounts();
  const uris = accounts.map(buildOtpAuth);
  const envelope = await encryptBackupPayload(JSON.stringify(uris), password);
  const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
  const fileUri = `${dir}totp-backup.totp`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(envelope, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar Respaldo Cifrado UniSabana',
      UTI: 'public.json',
    });
  }
  return fileUri;
}

export async function importBackup(password: string) {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'application/octet-stream', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]?.uri) return 0;
  
  const rawContent = await FileSystem.readAsStringAsync(picked.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  
  let envelope: unknown;
  try {
    envelope = JSON.parse(rawContent);
  } catch {
    throw new Error('El archivo seleccionado no es un formato JSON o .totp válido');
  }
  
  const decrypted = await decryptBackupPayload(envelope, password);
  let uris: unknown;
  try {
    uris = JSON.parse(decrypted);
  } catch {
    throw new Error('El contenido desencriptado no tiene un formato JSON válido');
  }
  if (!Array.isArray(uris) || !uris.every(uri => typeof uri === 'string')) {
    throw new Error('El archivo de respaldo no tiene el formato de cuentas esperado');
  }
  for (const uri of uris) {
    await saveAccount({ ...parseOtpAuth(uri), id: Crypto.randomUUID() });
  }
  return uris.length;
}
