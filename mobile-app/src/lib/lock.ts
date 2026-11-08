import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const PIN = 'lock.pin';
const ENABLED = 'lock.enabled';
const FAILS = 'lock.fails';
const UNTIL = 'lock.until';

export async function isLockEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync(ENABLED);
    const pin = await SecureStore.getItemAsync(PIN);
    return enabled === '1' && !!pin;
  } catch {
    return false;
  }
}

export async function setLockEnabled(v: boolean): Promise<void> {
  await SecureStore.setItemAsync(ENABLED, v ? '1' : '0');
}

export async function setPin(pin: string): Promise<void> {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error('El PIN debe tener entre 4 y 6 dígitos numéricos');
  }
  await SecureStore.setItemAsync(PIN, pin);
  await setLockEnabled(true);
}

export async function getPin(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PIN);
  } catch {
    return null;
  }
}

export async function getExpectedPinLength(): Promise<number> {
  const pin = await getPin();
  return pin ? pin.length : 6;
}

export async function getLockoutRemaining(): Promise<number> {
  try {
    const until = Number((await SecureStore.getItemAsync(UNTIL)) || 0);
    const diff = Math.ceil((until - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  } catch {
    return 0;
  }
}

export async function resetLockSettings(): Promise<void> {
  await SecureStore.deleteItemAsync(ENABLED);
  await SecureStore.deleteItemAsync(PIN);
  await SecureStore.deleteItemAsync(FAILS);
  await SecureStore.deleteItemAsync(UNTIL);
}

export async function unlockWithPin(pin: string): Promise<boolean> {
  try {
    const until = Number((await SecureStore.getItemAsync(UNTIL)) || 0);
    if (until > Date.now()) {
      return false;
    }
    const storedPin = await SecureStore.getItemAsync(PIN);
    const ok = pin === storedPin;
    if (ok) {
      await SecureStore.setItemAsync(FAILS, '0');
      return true;
    }
    const n = Number((await SecureStore.getItemAsync(FAILS)) || 0) + 1;
    await SecureStore.setItemAsync(FAILS, String(n));
    if (n >= 5) {
      await SecureStore.setItemAsync(UNTIL, String(Date.now() + 30000));
      await SecureStore.setItemAsync(FAILS, '0');
    }
    return false;
  } catch {
    return false;
  }
}

export async function authenticate(): Promise<boolean> {
  try {
    const hasHw = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHw || !isEnrolled) return false;

    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquear UniSabana Authenticator',
      fallbackLabel: 'Usar PIN de Seguridad',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: true,
    });
    return r.success;
  } catch {
    return false;
  }
}

export async function hasBiometrics(): Promise<boolean> {
  try {
    const hasHw = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHw && isEnrolled;
  } catch {
    return false;
  }
}

export async function getBiometricType(): Promise<'FACE_ID' | 'TOUCH_ID' | 'BIOMETRIC'> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'FACE_ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'TOUCH_ID';
    }
    return 'BIOMETRIC';
  } catch {
    return 'BIOMETRIC';
  }
}
