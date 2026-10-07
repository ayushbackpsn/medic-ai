import { openDB } from 'idb';

const DB_NAME = 'asha_health_offline_db';
const DB_VERSION = 1;

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('patients')) {
        db.createObjectStore('patients', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('health_records')) {
        db.createObjectStore('health_records', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('assessments')) {
        db.createObjectStore('assessments', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('referrals')) {
        db.createObjectStore('referrals', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'local_id' });
      }
      if (!db.objectStoreNames.contains('user_session')) {
        db.createObjectStore('user_session', { keyPath: 'key' });
      }
    },
  });
}

// Patients
export async function savePatientLocally(patient) {
  const db = await getDB();
  await db.put('patients', patient);
}

export async function getLocalPatients() {
  const db = await getDB();
  return db.getAll('patients');
}

export async function getLocalPatientById(id) {
  const db = await getDB();
  return db.get('patients', id);
}

// Assessments
export async function saveAssessmentLocally(assessment) {
  const db = await getDB();
  await db.put('assessments', assessment);
}

export async function getLocalAssessmentById(id) {
  const db = await getDB();
  return db.get('assessments', id);
}

// Referrals
export async function saveReferralLocally(referral) {
  const db = await getDB();
  await db.put('referrals', referral);
}

export async function getLocalReferrals() {
  const db = await getDB();
  return db.getAll('referrals');
}

// Sync Queue
export async function addToSyncQueue(item) {
  const db = await getDB();
  const queueItem = {
    local_id: item.local_id || `SYNC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    type: item.type, // PATIENT, ASSESSMENT, REFERRAL
    payload: item.payload,
    created_at: new Date().toISOString(),
    status: 'PENDING'
  };
  await db.put('sync_queue', queueItem);
  return queueItem;
}

export async function getSyncQueue() {
  const db = await getDB();
  return db.getAll('sync_queue');
}

export async function clearSyncQueueItem(local_id) {
  const db = await getDB();
  await db.delete('sync_queue', local_id);
}

export async function clearAllSyncQueue() {
  const db = await getDB();
  await db.clear('sync_queue');
}

// User Session Caching
export async function cacheUserSession(sessionData) {
  const db = await getDB();
  await db.put('user_session', { key: 'current_user', data: sessionData });
}

export async function getCachedUserSession() {
  const db = await getDB();
  const res = await db.get('user_session', 'current_user');
  return res ? res.data : null;
}
