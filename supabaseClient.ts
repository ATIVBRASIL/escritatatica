import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dbbzehyummpjyedxmsme.supabase.co';
const supabaseAnonKey = 'SUA_ANON_KEY_AQUI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
