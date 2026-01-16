import { createClient } from '@supabase/supabase-js';

// Conexão oficial do Escrita Tática ATIV
const supabaseUrl = 'https://dbbzehyummpjyedxmsme.supabase.co';
const supabaseAnonKey = 'sb_publishable_TGgaKlvlQpSHX42Tnjt4eg_tRuNngDM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);