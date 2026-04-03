// Request persistent storage permission
export async function requestPersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) {
    return { supported: false, granted: false };
  }

  try {
    // Check current state
    const isPersistent = await navigator.storage.persisted();

    if (isPersistent) {
      return { supported: true, granted: true, alreadyGranted: true };
    }

    // Request permission
    const granted = await navigator.storage.persist();

    return {
      supported: true,
      granted,
      alreadyGranted: false,
      message: granted
        ? "Storage is now persistent"
        : "Permission denied — data may not survive browser close"
    };

  } catch (error) {
    return { supported: true, granted: false, error: error.message };
  }
}

// Check storage quota
export async function checkStorageQuota() {
  if (!navigator.storage || !navigator.storage.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      used: Math.round(estimate.usage / 1024 / 1024 * 100) / 100, // MB
      total: estimate.quota ? Math.round(estimate.quota / 1024 / 1024 * 100) / 100 : null,
      percent: estimate.quota ? Math.round((estimate.usage / estimate.quota) * 100) : null,
    };
  } catch (error) {
    return null;
  }
}
