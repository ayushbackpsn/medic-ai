import React from 'react';
import { useOffline } from '../context/OfflineContext';
import { useLanguage } from '../context/LanguageContext';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, syncMessage, triggerSync } = useOffline();
  const { t } = useLanguage();

  return (
    <div className="w-full bg-slate-900 text-white px-4 py-2 text-xs md:text-sm flex flex-wrap items-center justify-between shadow-inner">
      <div className="flex items-center gap-2 font-medium">
        {isOnline ? (
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-700/50 px-2.5 py-0.5 rounded-full">
            <Wifi className="w-4 h-4" />
            {t('online_status')}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-amber-400 font-bold bg-amber-950/80 border border-amber-700/50 px-2.5 py-0.5 rounded-full animate-pulse">
            <WifiOff className="w-4 h-4" />
            {t('offline_status')}
          </span>
        )}

        {pendingCount > 0 && (
          <span className="bg-sky-900/80 text-sky-200 border border-sky-600/50 px-2.5 py-0.5 rounded-full font-mono">
            {t('pending_sync_count', { count: pendingCount })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {syncMessage && (
          <span className="text-sky-300 font-medium italic text-xs animate-fade-in flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {syncMessage}
          </span>
        )}

        {pendingCount > 0 && isOnline && (
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded-md text-xs font-bold transition duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {t('sync_now')}
          </button>
        )}
      </div>
    </div>
  );
}
