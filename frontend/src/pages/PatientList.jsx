import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchPatients } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { Search, UserPlus, FileText, History, Activity } from 'lucide-react';

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    loadData();
  }, [searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPatients(searchTerm);
      setPatients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('patients')}</h2>
          <p className="text-sm text-slate-600">Registered rural patients directory and history</p>
        </div>
        <Link
          to="/patients/new"
          className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-xl shadow transition"
        >
          <UserPlus className="w-5 h-5" />
          <span>{t('new_patient')}</span>
        </Link>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('search_patient')}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
        />
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Loading patients directory...</div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <p className="text-base font-semibold">No patients found matching your search.</p>
            <Link to="/patients/new" className="inline-block text-sky-600 font-bold hover:underline">
              Click here to register a new patient
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Patient ID / Name</th>
                  <th className="px-6 py-4">Age / Gender</th>
                  <th className="px-6 py-4">Village / District</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <Link to={`/patients/${p.id}`} className="font-bold text-slate-900 hover:text-sky-600">
                        {p.full_name}
                      </Link>
                      <div className="text-xs font-mono text-slate-500">{p.id}</div>
                      {p.is_pregnant && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold bg-pink-100 text-pink-700 rounded-full">
                          Pregnant ({p.gestational_age_weeks || 'N/A'} wks)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {p.age} yrs ({p.gender})
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {p.village || 'N/A'}, {p.district || 'Sehore'}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-mono">
                      {p.phone_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        to={`/assessment/${p.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg shadow-sm"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Assess</span>
                      </Link>
                      <Link
                        to={`/patients/${p.id}/history`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-300"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>History</span>
                      </Link>
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
