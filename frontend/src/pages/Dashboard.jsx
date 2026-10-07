import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { fetchPatients } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import { Users, UserPlus, AlertTriangle, AlertOctagon, FileSpreadsheet, Activity, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    total_patients: 0,
    assessments_today: 0,
    high_risk_patients: 0,
    critical_patients: 0,
    total_referrals: 0,
    pending_referrals: 0
  });
  const [recentPatients, setRecentPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        if (navigator.onLine) {
          const token = localStorage.getItem('asha_token');
          const res = await fetch('/api/dashboard/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setStats(data);
          }
        }

        const patients = await fetchPatients();
        setRecentPatients(patients.slice(0, 5));
        if (!navigator.onLine) {
          setStats(prev => ({ ...prev, total_patients: patients.length }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-800 to-sky-600 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Namaste, {user?.full_name}!
          </h2>
          <p className="text-sky-100 text-sm mt-1">
            ASHA Health Diagnostic & Offline AI Triage Dashboard
          </p>
        </div>
        <Link
          to="/patients/new"
          className="inline-flex items-center justify-center gap-2 bg-white text-sky-800 hover:bg-sky-50 px-5 py-3 rounded-xl font-bold shadow-md transition transform hover:scale-105"
        >
          <UserPlus className="w-5 h-5 text-sky-600" />
          <span>{t('new_patient')}</span>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-sky-100 text-sky-600 rounded-xl">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patients Registered</p>
            <h3 className="text-2xl font-black text-slate-900">{stats.total_patients}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assessments Today</p>
            <h3 className="text-2xl font-black text-slate-900">{stats.assessments_today}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-orange-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">High Risk Patients</p>
            <h3 className="text-2xl font-black text-orange-600">{stats.high_risk_patients}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-xl">
            <AlertOctagon className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Critical Cases</p>
            <h3 className="text-2xl font-black text-red-600">{stats.critical_patients}</h3>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts & Recent Patients */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Registered Patients */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Recently Registered Patients</h3>
            <Link to="/patients" className="text-sky-600 hover:text-sky-700 text-xs font-bold uppercase tracking-wider">
              View All →
            </Link>
          </div>

          {recentPatients.length === 0 ? (
            <p className="text-slate-500 text-sm italic py-4 text-center">No patient records found.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPatients.map(p => (
                <div key={p.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition">
                  <div>
                    <Link to={`/patients/${p.id}`} className="font-bold text-slate-900 hover:text-sky-600">
                      {p.full_name}
                    </Link>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>ID: {p.id}</span>
                      <span>•</span>
                      <span>{p.age} yrs ({p.gender})</span>
                      <span>•</span>
                      <span>Village: {p.village || 'N/A'}</span>
                    </div>
                  </div>
                  <Link
                    to={`/assessment/${p.id}`}
                    className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs rounded-lg border border-sky-200"
                  >
                    Assess Vitals
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Referrals & Quick Actions Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h3 className="text-lg font-bold text-slate-900">Referral Overview</h3>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-slate-600">Pending PHC Referrals:</span>
              <span className="font-black text-amber-600">{stats.pending_referrals}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-slate-600">Total Referrals Created:</span>
              <span className="font-bold text-slate-900">{stats.total_referrals}</span>
            </div>
            <Link
              to="/referrals"
              className="block w-full text-center py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow transition"
            >
              View Referrals List
            </Link>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Quick Actions</h4>
            <Link
              to="/patients/new"
              className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-sky-50 rounded-xl border border-slate-200 text-slate-800 text-sm font-bold transition"
            >
              <UserPlus className="w-5 h-5 text-sky-600" />
              <span>Register Patient & Start Triage</span>
            </Link>
            <Link
              to="/offline"
              className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-amber-50 rounded-xl border border-slate-200 text-slate-800 text-sm font-bold transition"
            >
              <RefreshCw className="w-5 h-5 text-amber-600" />
              <span>Manage Offline Sync Queue</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
