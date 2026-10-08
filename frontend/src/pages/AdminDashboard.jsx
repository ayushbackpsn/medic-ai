import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Hospital, Activity, UserPlus, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // New User Form State
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '', password: 'demo123', full_name: '', role: 'ASHA', phc_id: 1
  });

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('asha_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [resStats, resUsers] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stats`, { headers }),
        fetch(`${API_BASE}/api/admin/users`, { headers })
      ]);

      if (resStats.ok) setStats(await resStats.json());
      if (resUsers.ok) setUsers(await resUsers.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('asha_token');
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create user');
      }
      alert('User created successfully!');
      setShowAddUser(false);
      setNewUser({ username: '', password: 'demo123', full_name: '', role: 'ASHA', phc_id: 1 });
      loadAdminData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Loading Administrator Dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-900 to-indigo-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-purple-300" />
            System Administrator Dashboard
          </h2>
          <p className="text-purple-100 text-sm mt-1">Overall system monitoring, user management, and triage analytics</p>
        </div>

        <button
          onClick={() => setShowAddUser(!showAddUser)}
          className="inline-flex items-center gap-2 bg-white text-purple-900 hover:bg-purple-50 px-5 py-2.5 rounded-xl font-bold shadow-md transition"
        >
          <UserPlus className="w-5 h-5 text-purple-600" />
          <span>Add New User</span>
        </button>
      </div>

      {/* Add User Form Modal Card */}
      {showAddUser && (
        <div className="bg-white border-2 border-purple-300 rounded-2xl p-6 shadow-xl space-y-4 animate-slide-up">
          <h3 className="font-bold text-slate-900 text-lg border-b pb-2">Register New Healthcare Worker / User</h3>
          <form onSubmit={handleCreateUserSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Username *</label>
              <input
                type="text"
                required
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
                placeholder="e.g. asha_anita"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
                placeholder="e.g. Anita Sharma"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password *</label>
              <input
                type="password"
                required
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="w-full p-2.5 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role *</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full p-2.5 border rounded-xl bg-white"
              >
                <option value="ASHA">ASHA Worker</option>
                <option value="PHC_STAFF">PHC Hospital Staff</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddUser(false)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold">Create User</button>
            </div>
          </form>
        </div>
      )}

      {/* Metrics Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Patients</span>
            <h3 className="text-2xl font-black text-slate-900">{stats.total_patients}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">ASHA Workers</span>
            <h3 className="text-2xl font-black text-sky-600">{stats.total_asha_workers}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">PHC Centres</span>
            <h3 className="text-2xl font-black text-emerald-600">{stats.total_phcs}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">AI Assessments</span>
            <h3 className="text-2xl font-black text-purple-600">{stats.total_assessments}</h3>
          </div>
        </div>
      )}

      {/* Risk Distribution Breakdown */}
      {stats?.risk_distribution && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Population Triage Risk Distribution</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <span className="text-xs font-extrabold text-emerald-800 uppercase">LOW RISK</span>
              <p className="text-2xl font-black text-emerald-900">{stats.risk_distribution.LOW || 0}</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <span className="text-xs font-extrabold text-amber-800 uppercase">MEDIUM RISK</span>
              <p className="text-2xl font-black text-amber-900">{stats.risk_distribution.MEDIUM || 0}</p>
            </div>
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-center">
              <span className="text-xs font-extrabold text-orange-800 uppercase">HIGH RISK</span>
              <p className="text-2xl font-black text-orange-900">{stats.risk_distribution.HIGH || 0}</p>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
              <span className="text-xs font-extrabold text-red-800 uppercase">CRITICAL RISK</span>
              <p className="text-2xl font-black text-red-900">{stats.risk_distribution.CRITICAL || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Users Management Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <h3 className="text-lg font-bold text-slate-900">System Users Directory</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{u.id}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{u.username}</td>
                  <td className="px-4 py-3 text-slate-700">{u.full_name}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-purple-700 uppercase">{u.role}</td>
                  <td className="px-4 py-3 font-bold text-xs text-emerald-600">Active</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
