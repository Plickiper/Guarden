import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './config/firebase';

// Import components directly instead of lazy loading
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ReportForm from './components/report/ReportForm';
import AdminDashboard from './components/admin/AdminDashboard';
import Layout from './components/layout/Layout';

function App() {
  const [user] = useAuthState(auth);

  return (
    <Router>
      <Routes>
        <Route path="/" element={!user ? <Navigate to="/login" /> : <Navigate to="/report" />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/report" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/report" />} />
        
        {/* Protected Routes */}
        <Route element={<Layout />}>
          <Route path="/report" element={user ? <ReportForm /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user ? <AdminDashboard /> : <Navigate to="/login" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
