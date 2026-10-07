import React, { useState, useEffect } from 'react';
import { useOffline } from '../context/OfflineContext';
import { getSyncQueue, clearAllSyncQueue } from '../services/db';
import { Wifi, WifiOff, RefreshCw, Database, Trash2, CheckCircle2 } from 'lucide-react';

export default function OfflineManager() {
  const { isOnline, pendingCount, isSyncing, syncMessage, triggerSync, refreshPendingCount } = useOffline();
  const [queueItems, setQueueItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueue();
  }, [pendingCount]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const q = await getSyncQueue();
      setQueueItems(q);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to clear all unsynced local records?")) {
      await clearAllSyncQueue();
      await refreshPendingCount();
      loadQueue();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <Database className="w-6 h-6 text-sky-600" />
              IndexedDB Offline Queue & Sync Status
            </h2>
            <p className="text-sm text-slate-600">Local browser storage queue for offline patient registrations, AI triage, and referrals</p>
          </div>

          <div className="flex items-center gap-3">
            {isOnline ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-300">
                <Wifi className="w-4 h-4 text-emerald-600" />
                ONLINE CONNECTED
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-full border border-amber-300 animate-pulse">
                <WifiOff className="w-4 h-4 text-amber-600" />
                OFFLINE MODE
              </span>
            )}

            <button
              onClick={triggerSync}
              disabled={!isOnline || isSyncing || queueItems.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow transition disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Pending Records'}</span>
            </button>
          </div>
        </div>

        {syncMessage && (
          <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl text-xs font-bold text-sky-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
            <span>{syncMessage}</span>
          </div>
        )}
      </div>

      {/* Queue Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-lg">Unsynced Local Queue ({queueItems.length})</h3>
          {queueItems.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Queue</span>
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 italic">Reading IndexedDB queue...</p>
        ) : queueItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500 italic bg-slate-50 rounded-xl border border-slate-200">
            No pending records in offline queue. All data is synchronized!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {queueItems.map((item) => (
              <div key={item.local_id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-mono">
                      {item.type}
                    </span>
                    <span className="font-bold text-slate-900">{item.local_id}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Created at: {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full w-fit">
                  PENDING SYNC
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
