export type JsonStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function browserLocalStorage(): JsonStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readJsonStorage<T>(options: {
  storage: JsonStorage | null;
  key: string;
  fallback: () => T;
  parse: (value: unknown) => T;
}) {
  const { storage, key, fallback, parse } = options;
  if (!storage) return fallback();
  try {
    const saved = storage.getItem(key);
    if (!saved) return fallback();
    return parse(JSON.parse(saved) as unknown);
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Storage may be unavailable in privacy-restricted browsing modes.
    }
    return fallback();
  }
}

export function writeJsonStorage(
  storage: JsonStorage | null,
  key: string,
  value: unknown,
) {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
