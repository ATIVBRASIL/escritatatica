import { createClient } from '@supabase/supabase-js';

// Conexão oficial do Escrita Tática ATIV
const supabaseUrl = 'https://dbbzehyummpjyedxmsme.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiYnplaHl1bW1wanllZHhtc21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1Njc4MTMsImV4cCI6MjA4NDE0MzgxM30.sFH5-IG1ZmUh5OpXZrsg0aogm-Qt2CyF6eyrCaGAOlQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
