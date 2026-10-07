import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSyncQueue } from '../services/db';
import { processSyncQueue } from '../services/syncService';

const OfflineContext = createContext();

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  const refreshPendingCount = async () => {
    try {
      const queue = await getSyncQueue();
      setPendingCount(queue.length);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    setSyncMessage("Synchronizing offline records...");
    
    const res = await processSyncQueue();
    setSyncMessage(res.message);
    await refreshPendingCount();
    setIsSyncing(false);

    setTimeout(() => setSyncMessage(null), 5000);
  };

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, isSyncing, syncMessage, triggerSync, refreshPendingCount }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
