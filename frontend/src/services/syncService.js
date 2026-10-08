import { getSyncQueue, clearSyncQueueItem } from './db';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function processSyncQueue() {
  if (!navigator.onLine) {
    return { success: false, message: "Cannot sync while offline." };
  }

  const queue = await getSyncQueue();
  if (queue.length === 0) {
    return { success: true, message: "No pending records to sync.", syncedCount: 0 };
  }

  const token = localStorage.getItem('asha_token');
  if (!token) {
    return { success: false, message: "Authentication required to sync." };
  }

  try {
    const response = await fetch(`${API_BASE}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ items: queue })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Sync failed (${response.status}): ${errText}`);
    }

    const data = await response.json();

    // Clear synced items from local queue
    for (const item of queue) {
      await clearSyncQueueItem(item.local_id);
    }

    return {
      success: true,
      syncedCount: data.synced_records_count || queue.length,
      message: `Successfully synchronized ${data.synced_records_count || queue.length} records!`
    };
  } catch (err) {
    console.error("Sync error:", err);
    return { success: false, message: `Sync failed: ${err.message}` };
  }
}
