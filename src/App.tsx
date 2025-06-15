import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './config/supabase';
import { Session } from '@supabase/supabase-js';
import { BackupService } from './services/backupService';
import AdminService from './services/adminService';

// Import components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ReportForm from './components/report/ReportForm';
import ReportHistory from './components/report/ReportHistory';
import AdminDashboard from './components/admin/AdminDashboard';
import Layout from './components/layout/Layout';
import LandingPage from './components/landing/LandingPage';

// Import styles
import './styles/landing.css';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupService, setBackupService] = useState<BackupService | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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

  // Check admin status when session changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (session?.user?.id) {
        const adminService = AdminService.getInstance();
        const adminStatus = await adminService.isAdmin(session.user.id);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [session]);

  // Initialize backup service only for admin users
  useEffect(() => {
    if (isAdmin) {
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
  }, [isAdmin]);

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
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/report" />}
        />
        <Route
          path="/register"
          element={!session ? <Register /> : <Navigate to="/report" />}
        />
        <Route
          path="/report"
          element={
            session ? (
              <Layout>
                <ReportForm />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/history"
          element={
            session ? (
              <Layout>
                <ReportHistory />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/admin"
          element={
            isAdmin ? (
              <Layout>
                <AdminDashboard />
              </Layout>
            ) : (
              <Navigate to="/report" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
