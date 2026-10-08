import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { OfflineProvider } from './context/OfflineContext';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import OfflineIndicator from './components/OfflineIndicator';
import VoiceBot from './components/VoiceBot';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientList from './pages/PatientList';
import PatientRegistrationWizard from './pages/PatientRegistrationWizard';
import PatientDetail from './pages/PatientDetail';
import PatientHistory from './pages/PatientHistory';
import AssessmentResult from './pages/AssessmentResult';
import ReferralsList from './pages/ReferralsList';
import PhcPortal from './pages/PhcPortal';
import AdminDashboard from './pages/AdminDashboard';
import OfflineManager from './pages/OfflineManager';

function ProtectedLayout() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-sky-700">Loading ASHA System...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.role;
  const defaultHome = role === 'PHC_STAFF' ? '/phc' : role === 'ADMIN' ? '/admin' : '/dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Navbar />
      <OfflineIndicator />
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Routes>
            <Route path="/dashboard" element={
              role === 'PHC_STAFF' ? <Navigate to="/phc" replace /> :
              role === 'ADMIN' ? <Navigate to="/admin" replace /> :
              <Dashboard />
            } />
            <Route path="/patients" element={<PatientList />} />
            <Route path="/patients/new" element={<PatientRegistrationWizard />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            <Route path="/patients/:id/history" element={<PatientHistory />} />
            <Route path="/assessment/:patientId" element={<AssessmentResult />} />
            <Route path="/results/:assessmentId" element={<AssessmentResult />} />
            <Route path="/referrals" element={<ReferralsList />} />
            <Route path="/referrals/:id" element={<ReferralsList />} />
            <Route path="/phc" element={<PhcPortal />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/offline" element={<OfflineManager />} />
            <Route path="*" element={<Navigate to={defaultHome} replace />} />
          </Routes>
        </main>
      </div>
      <VoiceBot />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <OfflineProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </BrowserRouter>
        </OfflineProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
