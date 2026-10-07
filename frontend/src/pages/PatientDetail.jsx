import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPatients } from '../services/api';
import { Activity, History, User, MapPin, Phone, AlertCircle } from 'lucide-react';

export default function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await fetchPatients(id);
        const p = list.find(item => item.id === id);
        setPatient(p || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading patient record...</div>;
  if (!patient) return <div className="p-8 text-center text-red-500 font-bold">Patient record not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">{patient.id}</span>
            <h2 className="text-2xl font-extrabold text-slate-900">{patient.full_name}</h2>
            <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
              <span>{patient.age} years ({patient.gender})</span>
              <span>•</span>
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-slate-400" />{patient.village || 'Rampur'}, {patient.district || 'Sehore'}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              to={`/assessment/${patient.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl shadow"
            >
              <Activity className="w-4 h-4" />
              <span>New Assessment</span>
            </Link>
            <Link
              to={`/patients/${patient.id}/history`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm rounded-xl border border-slate-300"
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </Link>
          </div>
        </div>

        {/* Profile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-sky-800 uppercase text-xs">Demographics & Info</h3>
            <p><span className="font-semibold text-slate-600">Phone:</span> {patient.phone_number || 'N/A'}</p>
            <p><span className="font-semibold text-slate-600">Address:</span> {patient.address || 'N/A'}</p>
            <p><span className="font-semibold text-slate-600">State:</span> {patient.state || 'Madhya Pradesh'}</p>
            {patient.is_pregnant && (
              <div className="bg-pink-100 border border-pink-300 p-2.5 rounded-xl text-pink-900 font-bold">
                Pregnant ({patient.gestational_age_weeks || 'N/A'} weeks)
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-sky-800 uppercase text-xs">Medical History Flags</h3>
            {patient.medical_history ? (
              <ul className="space-y-1.5 font-semibold text-slate-800">
                <li className="flex justify-between"><span>Diabetes:</span> <span>{patient.medical_history.diabetes ? 'Yes' : 'No'}</span></li>
                <li className="flex justify-between"><span>Hypertension:</span> <span>{patient.medical_history.hypertension ? 'Yes' : 'No'}</span></li>
                <li className="flex justify-between"><span>Heart Disease:</span> <span>{patient.medical_history.heart_disease ? 'Yes' : 'No'}</span></li>
                <li className="flex justify-between"><span>Asthma:</span> <span>{patient.medical_history.asthma ? 'Yes' : 'No'}</span></li>
                <li className="flex justify-between"><span>Kidney Disease:</span> <span>{patient.medical_history.kidney_disease ? 'Yes' : 'No'}</span></li>
              </ul>
            ) : (
              <p className="text-slate-500 italic">No medical history recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
