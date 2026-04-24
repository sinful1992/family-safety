import { createMMKV, type MMKV } from 'react-native-mmkv';
import * as Keychain from 'react-native-keychain';
import { v4 as uuidv4 } from 'uuid';

const KEYCHAIN_SERVICE = 'family-safety-mmkv';
let storage: MMKV | undefined;

async function getEncryptionKey(): Promise<string> {
  const existing = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
  if (existing) return existing.password;
  // 32 hex chars = 32 bytes — required for AES-256
  const key = uuidv4().replace(/-/g, '');
  await Keychain.setGenericPassword('mmkv', key, { service: KEYCHAIN_SERVICE });
  return key;
}

async function ensure(): Promise<MMKV> {
  if (storage) return storage;
  const key = await getEncryptionKey();
  storage = createMMKV({ id: 'family-safety', encryptionKey: key, encryptionType: 'AES-256' });
  return storage;
}

export const SecureStorage = {
  async getItem(key: string): Promise<string | null> {
    const s = await ensure();
    return s.getString(key) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    const s = await ensure();
    s.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    const s = await ensure();
    s.remove(key);
  },
};
