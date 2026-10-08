import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LayoutDashboard, Users, UserPlus, FileSpreadsheet, Hospital, ShieldCheck, WifiOff } from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  const role = user.role;

  let links = [];

  if (role === 'PHC_STAFF') {
    links = [
      { to: "/phc", label: t('phc_portal') || "PHC Doctor Portal", icon: Hospital },
      { to: "/referrals", label: t('referrals') || "Referred Patients", icon: FileSpreadsheet },
      { to: "/patients", label: t('patients') || "Patients Directory", icon: Users },
      { to: "/offline", label: t('offline_sync') || "Offline Sync", icon: WifiOff },
    ];
  } else if (role === 'ADMIN') {
    links = [
      { to: "/admin", label: t('admin') || "System Administration", icon: ShieldCheck },
      { to: "/phc", label: t('phc_portal') || "PHC Overview", icon: Hospital },
      { to: "/patients", label: t('patients') || "All Patients", icon: Users },
      { to: "/referrals", label: t('referrals') || "Referrals Oversight", icon: FileSpreadsheet },
      { to: "/offline", label: t('offline_sync') || "Sync Logs", icon: WifiOff },
    ];
  } else {
    // Default ASHA Worker
    links = [
      { to: "/dashboard", label: t('dashboard'), icon: LayoutDashboard },
      { to: "/patients", label: t('patients'), icon: Users },
      { to: "/patients/new", label: t('new_patient'), icon: UserPlus },
      { to: "/referrals", label: t('referrals'), icon: FileSpreadsheet },
      { to: "/offline", label: t('offline_sync'), icon: WifiOff },
    ];
  }

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 shadow-sm shrink-0">
      <nav className="p-4 space-y-1.5 flex md:flex-col overflow-x-auto md:overflow-x-visible">
        {filteredLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap md:whitespace-normal ${
                  isActive
                    ? 'bg-sky-600 text-white font-bold shadow-md'
                    : 'text-slate-700 hover:bg-sky-50 hover:text-sky-700'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
