import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchReferrals, createReferral } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { FileSpreadsheet, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function ReferralsList() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isCreating = searchParams.get('create') === 'true';
  const paramPatientId = searchParams.get('patient_id');
  const paramAssessmentId = searchParams.get('assessment_id');
  const paramRecordId = searchParams.get('record_id');

  const [newReason, setNewReason] = useState('High Risk Assessment Referral to PHC Emergency');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

  const handleCreateReferralSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createReferral({
        patient_id: paramPatientId,
        health_record_id: paramRecordId,
        risk_assessment_id: paramAssessmentId,
        phc_id: 1,
        reason: newReason
      });
      alert("Referral successfully created!");
      navigate('/referrals');
      loadData();
    } catch (err) {
      alert("Failed to create referral: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Hospital & PHC Referrals</h2>
          <p className="text-sm text-slate-600">Track and manage emergency and high-risk patient referrals</p>
        </div>
      </div>

      {/* Referral Creation Form Modal Card if query param present */}
      {isCreating && (
        <div className="bg-red-50 border-2 border-red-300 p-6 rounded-2xl shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 text-red-900 font-extrabold text-lg">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <span>Create New PHC Patient Referral</span>
          </div>

          <form onSubmit={handleCreateReferralSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-red-900 uppercase mb-1">Reason for Referral</label>
              <textarea
                rows="3"
                required
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="w-full p-3 border border-red-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 bg-white"
                placeholder="Specify clinical rationale, vitals severity, or symptoms..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/referrals')}
                className="px-4 py-2 bg-slate-200 text-slate-800 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-lg"
              >
                {submitting ? 'Submitting Referral...' : 'Send Referral to PHC'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Referrals List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Loading referrals...</div>
        ) : referrals.length === 0 ? (
          <div className="p-12 text-center text-slate-500 italic">No referrals found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Referral ID / Patient</th>
                  <th className="px-6 py-4">Risk Level</th>
                  <th className="px-6 py-4">PHC Assigned</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{ref.patient_name}</div>
                      <div className="text-xs font-mono text-slate-500">{ref.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <RiskBadge level={ref.risk_level} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-semibold">
                      {ref.phc_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${
                        ref.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                        ref.status === 'IN_TREATMENT' ? 'bg-sky-100 text-sky-800' :
                        ref.status === 'COMPLETED' ? 'bg-indigo-100 text-indigo-800' :
                        ref.status === 'REJECTED' ? 'bg-gray-200 text-gray-800' :
                        'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {ref.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                      {ref.reason}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(ref.created_at).toLocaleDateString()}
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
