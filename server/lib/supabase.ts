import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables! Check .env");
}

/**
 * Cliente Supabase com permissões de 'service_role'.
 * Bypass RLS (Row Level Security) para operações de catálogo e IA no backend.
 */
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
