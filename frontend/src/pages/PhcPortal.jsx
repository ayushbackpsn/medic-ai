import React, { useState, useEffect } from 'react';
import { fetchReferrals, updateReferralStatus } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { Hospital, CheckCircle2, Clock, MessageSquare, ShieldAlert } from 'lucide-react';

export default function PhcPortal() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRef, setSelectedRef] = useState(null);
  const [newStatus, setNewStatus] = useState('ACCEPTED');
  const [remarks, setRemarks] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    setLoading(true);
    try {
      const data = await fetchReferrals();
      setReferrals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRef) return;
    setUpdating(true);
    try {
      await updateReferralStatus(selectedRef.id, { status: newStatus, remarks });
      alert(`Referral status updated to ${newStatus}`);
      setSelectedRef(null);
      setRemarks('');
      loadReferrals();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 rounded-2xl p-6 text-white shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold flex items-center gap-2">
            <Hospital className="w-7 h-7 text-emerald-300" />
            PHC Hospital Staff Portal
          </h2>
          <p className="text-emerald-100 text-sm mt-1">Review incoming rural ASHA triage referrals and manage patient treatment statuses</p>
        </div>
      </div>

      {/* Update Modal Card */}
      {selectedRef && (
        <div className="bg-white border-2 border-emerald-500 rounded-2xl p-6 shadow-2xl space-y-4 animate-slide-up">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Update Patient Referral Status</h3>
              <p className="text-xs text-slate-500">Patient: <strong className="text-slate-800">{selectedRef.patient_name}</strong> (ID: {selectedRef.id})</p>
            </div>
            <RiskBadge level={selectedRef.risk_level} size="md" />
          </div>

          <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold bg-white"
              >
                <option value="ACCEPTED">ACCEPTED (Doctor Reviewing)</option>
                <option value="IN_TREATMENT">IN_TREATMENT (Admitted / Receiving Care)</option>
                <option value="COMPLETED">COMPLETED (Discharged / Treatment Done)</option>
                <option value="REJECTED">REJECTED (Decline / Out of Scope)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Medical Remarks & Notes</label>
              <textarea
                rows="3"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter doctor clinical remarks, prescribed medications, or discharge summary..."
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedRef(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg"
              >
                {updating ? 'Saving Status...' : 'Save & Update Referral'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Referrals Directory for PHC Staff */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Loading PHC referrals...</div>
        ) : referrals.length === 0 ? (
          <div className="p-12 text-center text-slate-500 italic">No incoming referrals.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Patient Info</th>
                  <th className="px-6 py-4">Risk Level</th>
                  <th className="px-6 py-4">Reason / Notes</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">ASHA Worker</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{r.patient_name}</div>
                      <div className="text-xs text-slate-500">{r.patient_age} yrs ({r.patient_gender}) • ID: {r.patient_id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <RiskBadge level={r.risk_level} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs">
                      <div>{r.reason}</div>
                      {r.remarks && <div className="text-emerald-700 font-semibold mt-1">Doctor Remarks: {r.remarks}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                        r.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                        r.status === 'IN_TREATMENT' ? 'bg-sky-100 text-sky-800' :
                        r.status === 'COMPLETED' ? 'bg-indigo-100 text-indigo-800' :
                        r.status === 'REJECTED' ? 'bg-gray-200 text-gray-800' :
                        'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700">
                      {r.asha_worker_name}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedRef(r);
                          setNewStatus(r.status === 'PENDING' ? 'ACCEPTED' : r.status);
                          setRemarks(r.remarks || '');
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm"
                      >
                        Manage Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
