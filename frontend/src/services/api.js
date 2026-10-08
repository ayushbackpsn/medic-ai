import {
  savePatientLocally, getLocalPatients, getLocalPatientById,
  saveAssessmentLocally,
  saveReferralLocally, getLocalReferrals, addToSyncQueue
} from './db';
import { calculateOfflineRisk } from '../utils/offlinePrediction';

// In production (Render static site), call backend directly.
// In dev, Vite proxy forwards /api → localhost:8000 so API_BASE = ''.
const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthHeaders() {
  const token = localStorage.getItem('asha_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export async function loginUser(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Login failed');
  }
  return res.json();
}

export async function fetchPatients(search = '') {
  if (!navigator.onLine) {
    const local = await getLocalPatients();
    if (search) {
      return local.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase()) || p.id.includes(search));
    }
    return local;
  }

  try {
    const url = search
      ? `${API_BASE}/api/patients?search=${encodeURIComponent(search)}`
      : `${API_BASE}/api/patients`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch patients');
    const data = await res.json();
    for (const p of data) {
      await savePatientLocally(p);
    }
    return data;
  } catch (err) {
    console.warn('API unavailable, fallback to IndexedDB:', err);
    return getLocalPatients();
  }
}

export async function createPatient(patientData) {
  const localId = patientData.id || `PAT-OFF-${Date.now()}`;
  const fullPatientObj = { ...patientData, id: localId, created_at: new Date().toISOString() };

  if (!navigator.onLine) {
    await savePatientLocally(fullPatientObj);
    await addToSyncQueue({ type: 'PATIENT', payload: fullPatientObj, local_id: localId });
    return fullPatientObj;
  }

  try {
    const res = await fetch(`${API_BASE}/api/patients`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(patientData)
    });
    if (!res.ok) throw new Error('Failed to create patient');
    const saved = await res.json();
    await savePatientLocally(saved);
    return saved;
  } catch (err) {
    console.warn('API offline during patient creation, saving locally:', err);
    await savePatientLocally(fullPatientObj);
    await addToSyncQueue({ type: 'PATIENT', payload: fullPatientObj, local_id: localId });
    return fullPatientObj;
  }
}

export async function fetchPatientById(patientId) {
  try {
    const res = await fetch(`${API_BASE}/api/patients/${patientId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch patient');
    return res.json();
  } catch (err) {
    return getLocalPatientById(patientId);
  }
}

export async function runRiskAssessment(assessmentReq) {
  const localAsmId = `ASM-OFF-${Date.now()}`;

  if (!navigator.onLine) {
    const patient = await getLocalPatientById(assessmentReq.patient_id) || { age: 35, gender: 'Unknown' };
    const offlineResult = calculateOfflineRisk(
      patient,
      assessmentReq.vitals,
      assessmentReq.medical_history || {},
      assessmentReq.symptoms
    );
    const fullAsm = {
      id: localAsmId,
      health_record_id: `REC-OFF-${Date.now()}`,
      patient_id: assessmentReq.patient_id,
      patient_name: patient.full_name || 'Local Patient',
      risk_level: offlineResult.risk_level,
      confidence_score: offlineResult.confidence_score,
      risk_factors: offlineResult.risk_factors,
      recommendation_title: offlineResult.recommendation_title,
      recommendations: offlineResult.recommendations,
      prescriptions: offlineResult.prescriptions || [],
      urgency_note: offlineResult.urgency_note,
      created_at: new Date().toISOString(),
      assessment_source: 'OFFLINE_FALLBACK',
      req_payload: assessmentReq
    };
    await saveAssessmentLocally(fullAsm);
    await addToSyncQueue({ type: 'ASSESSMENT', payload: { ...assessmentReq, ...fullAsm }, local_id: localAsmId });
    return fullAsm;
  }

  try {
    const res = await fetch(`${API_BASE}/api/assessment`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(assessmentReq)
    });
    if (!res.ok) throw new Error('Failed to compute assessment');
    const data = await res.json();
    await saveAssessmentLocally(data);
    return data;
  } catch (err) {
    console.warn('API offline, falling back to local JS triage engine:', err);
    const patient = await getLocalPatientById(assessmentReq.patient_id) || { age: 35, gender: 'Unknown' };
    const offlineResult = calculateOfflineRisk(
      patient,
      assessmentReq.vitals,
      assessmentReq.medical_history || {},
      assessmentReq.symptoms
    );
    const fullAsm = {
      id: localAsmId,
      health_record_id: `REC-OFF-${Date.now()}`,
      patient_id: assessmentReq.patient_id,
      patient_name: patient.full_name || 'Local Patient',
      risk_level: offlineResult.risk_level,
      confidence_score: offlineResult.confidence_score,
      risk_factors: offlineResult.risk_factors,
      recommendation_title: offlineResult.recommendation_title,
      recommendations: offlineResult.recommendations,
      prescriptions: offlineResult.prescriptions || [],
      urgency_note: offlineResult.urgency_note,
      created_at: new Date().toISOString(),
      assessment_source: 'OFFLINE_FALLBACK'
    };
    await saveAssessmentLocally(fullAsm);
    await addToSyncQueue({ type: 'ASSESSMENT', payload: { ...assessmentReq, ...fullAsm }, local_id: localAsmId });
    return fullAsm;
  }
}

export async function createReferral(referralReq) {
  const localRefId = `REF-OFF-${Date.now()}`;
  const fullRef = {
    id: localRefId,
    ...referralReq,
    status: 'PENDING',
    created_at: new Date().toISOString()
  };

  if (!navigator.onLine) {
    await saveReferralLocally(fullRef);
    await addToSyncQueue({ type: 'REFERRAL', payload: fullRef, local_id: localRefId });
    return fullRef;
  }

  try {
    const res = await fetch(`${API_BASE}/api/referrals`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(referralReq)
    });
    if (!res.ok) throw new Error('Failed to create referral');
    const saved = await res.json();
    await saveReferralLocally(saved);
    return saved;
  } catch (err) {
    console.warn('API offline during referral, saving locally:', err);
    await saveReferralLocally(fullRef);
    await addToSyncQueue({ type: 'REFERRAL', payload: fullRef, local_id: localRefId });
    return fullRef;
  }
}

export async function fetchReferrals() {
  if (!navigator.onLine) {
    return getLocalReferrals();
  }
  try {
    const res = await fetch(`${API_BASE}/api/referrals`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch referrals');
    const data = await res.json();
    for (const r of data) {
      await saveReferralLocally(r);
    }
    return data;
  } catch (e) {
    return getLocalReferrals();
  }
}

export async function updateReferralStatus(referralId, statusData) {
  const res = await fetch(`${API_BASE}/api/referrals/${referralId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(statusData)
  });
  if (!res.ok) throw new Error('Failed to update referral');
  return res.json();
}

export async function fetchAdminStats() {
  const res = await fetch(`${API_BASE}/api/admin/stats`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function syncOfflineData(queue) {
  const res = await fetch(`${API_BASE}/api/sync`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ records: queue })
  });
  if (!res.ok) throw new Error('Sync failed');
  return res.json();
}
