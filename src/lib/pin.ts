import * as Crypto from 'expo-crypto';
import { deleteSecureItem, getSecureItem, setSecureItem } from './secureStorage';

const PIN_HASH_KEY = 'agit_pin_hash';
const PIN_SALT_KEY = 'agit_pin_salt';

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function isPinSet(): Promise<boolean> {
  const hash = await getSecureItem(PIN_HASH_KEY);
  return Boolean(hash);
}

export async function setPin(pin: string): Promise<void> {
  const salt = Crypto.randomUUID();
  const hash = await hashPin(pin, salt);
  await setSecureItem(PIN_SALT_KEY, salt);
  await setSecureItem(PIN_HASH_KEY, hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const salt = await getSecureItem(PIN_SALT_KEY);
  const storedHash = await getSecureItem(PIN_HASH_KEY);
  if (!salt || !storedHash) return false;
  const hash = await hashPin(pin, salt);
  return hash === storedHash;
}

export async function clearPin(): Promise<void> {
  await deleteSecureItem(PIN_HASH_KEY);
  await deleteSecureItem(PIN_SALT_KEY);
}
