import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { MaintenanceService } from '../../services/maintenanceService';
import MaintenancePage from '../maintenance/MaintenancePage';
import AdminService from '../../services/adminService';
import { supabase } from '../../config/supabase';

interface MaintenanceGuardProps {
  children: React.ReactNode;
}

const MaintenanceGuard: React.FC<MaintenanceGuardProps> = ({ children }) => {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkMaintenanceAndAdmin = async () => {
      try {
        const maintenanceService = MaintenanceService.getInstance();
        const { data: { session } } = await supabase.auth.getSession();
        const adminService = AdminService.getInstance();
        const adminStatus = session?.user?.id ? await adminService.isAdmin(session.user.id) : false;
        
        setIsMaintenance(maintenanceService.isMaintenanceMode());
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('Error checking maintenance status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenanceAndAdmin();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // If in maintenance mode and not an admin, show maintenance page
  if (isMaintenance && !isAdmin) {
    return <MaintenancePage />;
  }

  // If trying to access maintenance page but not in maintenance mode, redirect to home
  if (location.pathname === '/maintenance' && !isMaintenance) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default MaintenanceGuard; 