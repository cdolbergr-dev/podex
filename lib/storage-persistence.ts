let requested = false;

/**
 * Asks the browser to exempt this site's storage from automatic clean-up (low disk space,
 * eviction of unused sites). Chrome/Edge decide silently; Firefox may ask the visitor once.
 * Doesn't stop people clearing their own data, or Safari's 7-day limit.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    if (requested) return false;
    requested = true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function isStoragePersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}
