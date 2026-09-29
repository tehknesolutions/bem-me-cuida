import * as SecureStore from 'expo-secure-store';
import type { SupportedStorage } from '@supabase/supabase-js';

const CHUNK_SIZE = 1800;

function manifestKey(key: string): string {
  return `${key}.__chunks`;
}

function chunkKey(key: string, index: number): string {
  return `${key}.__chunk.${index}`;
}

async function removeChunks(key: string): Promise<void> {
  const rawCount = await SecureStore.getItemAsync(manifestKey(key));
  const count = Number(rawCount ?? 0);
  await Promise.all([
    SecureStore.deleteItemAsync(key),
    SecureStore.deleteItemAsync(manifestKey(key)),
    ...Array.from({ length: Number.isFinite(count) ? count : 0 }, (_, index) =>
      SecureStore.deleteItemAsync(chunkKey(key, index)),
    ),
  ]);
}

export const secureSessionStorage: SupportedStorage = {
  async getItem(key) {
    const rawCount = await SecureStore.getItemAsync(manifestKey(key));
    if (!rawCount) return SecureStore.getItemAsync(key);

    const count = Number(rawCount);
    if (!Number.isInteger(count) || count < 1) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))),
    );
    if (chunks.some((chunk) => chunk === null)) return null;
    return chunks.join('');
  },

  async setItem(key, value) {
    await removeChunks(key);
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunks = Array.from(
      { length: Math.ceil(value.length / CHUNK_SIZE) },
      (_, index) => value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
    );
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk)));
    await SecureStore.setItemAsync(manifestKey(key), String(chunks.length));
  },

  removeItem: removeChunks,
};
