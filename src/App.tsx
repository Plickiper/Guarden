import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './config/supabase';
import { Session } from '@supabase/supabase-js';
import { BackupService } from './services/backupService';

// Import components directly instead of lazy loading
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ReportForm from './components/report/ReportForm';
import ReportHistory from './components/report/ReportHistory';
import AdminDashboard from './components/admin/AdminDashboard';
import Layout from './components/layout/Layout';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupService, setBackupService] = useState<BackupService | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize backup service only for admin users
  useEffect(() => {
    if (session?.user?.email === 'admin@guarden.com') {
      const service = BackupService.getInstance();
      service.startBackupService();
      setBackupService(service);
    } else if (backupService) {
      backupService.stopBackupService();
      setBackupService(null);
    }

    return () => {
      if (backupService) {
        backupService.stopBackupService();
      }
    };
  }, [session]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={!session ? <Navigate to="/login" /> : <Navigate to="/report" />} />
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/report" />} />
        <Route path="/register" element={!session ? <Register /> : <Navigate to="/report" />} />
        
        {/* Protected Routes */}
        <Route element={<Layout />}>
          <Route path="/report" element={session ? <ReportForm /> : <Navigate to="/login" />} />
          <Route path="/history" element={session ? <ReportHistory /> : <Navigate to="/login" />} />
          <Route path="/admin" element={session ? <AdminDashboard /> : <Navigate to="/login" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
