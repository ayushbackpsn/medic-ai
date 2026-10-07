import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { loginUser } from '../services/api';
import { Activity, KeyRound, User, Lock, Sparkles } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginUser(username, password);
      await login(data);
      if (data.role === 'PHC_STAFF') {
        navigate('/phc');
      } else if (data.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (userType) => {
    if (userType === 'ASHA') {
      setUsername('asha_demo');
      setPassword('demo123');
    } else if (userType === 'PHC') {
      setUsername('phc_demo');
      setPassword('demo123');
    } else if (userType === 'ADMIN') {
      setUsername('admin_demo');
      setPassword('demo123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-sky-600 p-3 rounded-2xl text-white shadow-xl">
            <Activity className="w-10 h-10 animate-pulse" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          ASHA Health System
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600 font-medium">
          {t('app_sub_title')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl border border-slate-200 sm:px-10">
          
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700 font-semibold rounded">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Username
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-extrabold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition duration-200 disabled:opacity-50"
              >
                {loading ? 'Logging in...' : t('login')}
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials Box */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800 uppercase tracking-wider mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Development Demo Accounts</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('ASHA')}
                className="px-2.5 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded-lg text-xs font-bold text-sky-800 transition"
              >
                ASHA Worker
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('PHC')}
                className="px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800 transition"
              >
                PHC Doctor
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('ADMIN')}
                className="px-2.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-lg text-xs font-bold text-purple-800 transition"
              >
                Admin
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
