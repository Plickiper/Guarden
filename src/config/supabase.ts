import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fhsmkuavweubcbdwxjid.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoc21rdWF2d2V1YmNiZHd4amlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4ODIxODEsImV4cCI6MjA2NTQ1ODE4MX0.4QUXEmYAkJzMsla6PJwt3HPShUPxW3ycejk9L_P5Kbc';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export default supabase; 