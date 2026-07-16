import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

// Biometric quick login: after a successful manual login the identifier +
// phone code are kept in the device's secure enclave (Keychain/Keystore), so
// the 15-minute auto-logout can be re-entered with Face ID / fingerprint
// instead of retyping. Native only - web has neither SecureStore nor
// biometrics, so everything here no-ops there.
const KEY = 'agit_saved_login';

export interface SavedLogin {
  identifier: string;
  code: string;
}

export async function saveLogin(identifier: string, code: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify({ identifier, code }));
  } catch {
    // Saving quick-login credentials is best-effort; never block a login on it.
  }
}

export async function clearSavedLogin(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // ignore
  }
}

export async function getSavedLogin(): Promise<SavedLogin | null> {
  if (Platform.OS === 'web') return null;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as SavedLogin) : null;
  } catch {
    return null;
  }
}

export async function biometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const [hasHardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && enrolled;
}

export async function authenticateBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: '생체인증으로 로그인',
    cancelLabel: '취소',
  });
  return result.success;
}
