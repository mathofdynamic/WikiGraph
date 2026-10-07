/**
 * Safe local storage utility with quota-error interception and storage accounting.
 */

export const STORAGE_KEY = 'wikigraph_demo_store_v2';
export const QUOTA_ERROR_EVENT = 'wikigraph:quota-error';
export const QUOTA_MESSAGE = 'Browser storage is full. Export a backup and clear space.';

export interface StorageUsage {
  usedBytes: number;
  totalBytes: number;
  percentage: number;
  usedFormatted: string;
  totalFormatted: string;
  isNearQuota: boolean;
}

export function isQuotaExceededError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    // everything except Firefox
    (err.code === 22 ||
      // Firefox
      err.code === 1014 ||
      // test name field too, because code might not exist
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  );
}

/**
 * Dispatches a storage quota notification to the UI window.
 */
export function notifyQuotaExceeded(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(QUOTA_ERROR_EVENT, {
        detail: { message: QUOTA_MESSAGE },
      })
    );
  }
}

/**
 * Safely writes a key-value pair to localStorage with try/catch and quota notification.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(key, value);
    return true;
  } catch (err: unknown) {
    console.warn(`WikiGraph: localStorage write failed for key "${key}"`, err);
    if (isQuotaExceededError(err)) {
      notifyQuotaExceeded();
    }
    return false;
  }
}

/**
 * Safely reads a key from localStorage with try/catch.
 */
export function safeLocalStorageGet(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`WikiGraph: localStorage read failed for key "${key}"`, err);
    return null;
  }
}

/**
 * Formats byte counts into human-readable strings.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Calculates current localStorage usage and percentage out of standard 5 MB limit.
 */
export function getLocalStorageUsage(): StorageUsage {
  const DEFAULT_TOTAL = 5 * 1024 * 1024; // 5 MB typical browser quota
  let totalChars = 0;

  try {
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          // Each UTF-16 character occupies 2 bytes in memory
          totalChars += (key.length + val.length) * 2;
        }
      }
    }
  } catch {
    // Ignore access error
  }

  const usedBytes = totalChars;
  const percentage = Math.min(100, Math.round((usedBytes / DEFAULT_TOTAL) * 100));

  return {
    usedBytes,
    totalBytes: DEFAULT_TOTAL,
    percentage,
    usedFormatted: formatBytes(usedBytes),
    totalFormatted: formatBytes(DEFAULT_TOTAL),
    isNearQuota: percentage >= 85,
  };
}
