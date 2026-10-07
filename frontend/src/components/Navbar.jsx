import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Activity, Languages, LogOut, User as UserIcon } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { lang, changeLanguage, t } = useLanguage();

  return (
    <header className="bg-gradient-to-r from-sky-800 via-sky-700 to-sky-900 text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl border border-white/20 backdrop-blur-sm shadow-inner">
            <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-2">
              ASHA <span className="text-sky-300 font-medium text-xs sm:text-sm px-2 py-0.5 bg-sky-950/60 rounded-full border border-sky-600/40">Offline AI Triage</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-sky-200 hidden sm:block">Rural Health Diagnostic & Referral Decision Support System</p>
          </div>
        </div>

        {/* Right Actions: Language Switcher, User Info, Logout */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Language Switcher */}
          <div className="flex items-center gap-1.5 bg-sky-900/80 border border-sky-600/50 rounded-lg px-2.5 py-1 text-xs">
            <Languages className="w-4 h-4 text-sky-300" />
            <select
              value={lang}
              onChange={(e) => changeLanguage(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="en" className="text-gray-900">English</option>
              <option value="hi" className="text-gray-900">हिंदी (Hindi)</option>
              <option value="ta" className="text-gray-900">தமிழ் (Tamil)</option>
            </select>
          </div>

          {/* User Profile */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-bold text-white">{user.full_name}</span>
                <span className="text-[10px] text-sky-200 uppercase font-mono tracking-wider">{user.role}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                title={t('logout')}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
