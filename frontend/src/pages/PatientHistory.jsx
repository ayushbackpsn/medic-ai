import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import RiskBadge from '../components/RiskBadge';
import { History, Activity, Calendar } from 'lucide-react';

export default function PatientHistory() {
  const { id } = useParams();
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem('asha_token');
        const res = await fetch(`/api/patients/${id}/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setHistoryData(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading clinical history timeline...</div>;
  if (!historyData) return <div className="p-8 text-center text-red-500 font-bold">Patient history unavailable.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Clinical History Timeline</h2>
          <p className="text-sm text-slate-600">Patient: <span className="font-bold text-sky-700">{historyData.patient.name}</span> ({historyData.patient.id})</p>
        </div>
        <Link
          to={`/assessment/${historyData.patient.id}`}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow"
        >
          New Assessment
        </Link>
      </div>

      <div className="space-y-4">
        {historyData.history.length === 0 ? (
          <div className="bg-white p-8 text-center text-slate-500 italic rounded-2xl border">
            No past health assessment records found.
          </div>
        ) : (
          historyData.history.map((record) => (
            <div key={record.record_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  <span>{new Date(record.recorded_at).toLocaleString()}</span>
                </div>
                <RiskBadge level={record.risk_level} size="md" />
              </div>

              {record.vitals && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl text-xs font-semibold text-slate-800">
                  <div><span className="text-slate-500">BP:</span> {record.vitals.bp}</div>
                  <div><span className="text-slate-500">SpO2:</span> {record.vitals.spo2}%</div>
                  <div><span className="text-slate-500">Pulse:</span> {record.vitals.heart_rate} bpm</div>
                  <div><span className="text-slate-500">Temp:</span> {record.vitals.temperature}°C</div>
                </div>
              )}

              {record.symptoms && record.symptoms.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase mr-1">Symptoms:</span>
                  {record.symptoms.map((s, idx) => (
                    <span key={idx} className="px-2.5 py-0.5 bg-sky-50 text-sky-800 font-bold text-xs rounded-md border border-sky-200">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {record.risk_factors && record.risk_factors.length > 0 && (
                <div className="text-xs text-slate-700 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                  <strong className="text-amber-900 font-bold">Identified Risk Factors: </strong>
                  {record.risk_factors.join(', ')}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
