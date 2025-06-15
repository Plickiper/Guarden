import { supabase } from '../config/supabase';

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

class AdminService {
  private static instance: AdminService;

  private constructor() {}

  public static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  async isAdmin(userId: string): Promise<boolean> {
    try {
      console.log('Checking admin status for user ID:', userId);
      
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found'
        console.error('Error checking admin status:', error);
        return false;
      }

      console.log('Admin check result:', !!data);
      return !!data;
    } catch (error) {
      console.error('Error in isAdmin:', error);
      return false;
    }
  }

  async addAdmin(email: string): Promise<boolean> {
    // Note: Direct client-side insertion into admin_users after getting user_id
    // from 'auth.users' might still be problematic if RLS on 'auth.users' is restrictive.
    // For production, consider using a Supabase Edge Function for admin creation
    // if this consistently fails due to permissions.
    try {
      // This query to 'auth.users' might require specific RLS policies on auth.users
      // or may fail if the client cannot read from auth.users directly.
      // If adding admins via UI fails, consider handling admin creation in the Supabase Dashboard
      // or by creating a Supabase Edge Function.
      const { data: userData, error: userError } = await supabase
        .from('users') 
        .select('id')
        .eq('email', email)
        .single();

      if (userError) {
        console.error('Error getting user ID from auth.users:', userError);
        throw userError;
      }

      const { error } = await supabase
        .from('admin_users')
        .insert([
          {
            user_id: userData.id,
            email: email
          }
        ]);

      if (error) {
        console.error('Error adding admin:', error);
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error in addAdmin:', error);
      return false;
    }
  }

  async removeAdmin(email: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('email', email);

      if (error) {
        console.error('Error removing admin:', error);
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error in removeAdmin:', error);
      return false;
    }
  }

  async listAdmins(): Promise<AdminUser[]> {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error listing admins:', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error in listAdmins:', error);
      return [];
    }
  }
}

export default AdminService; 