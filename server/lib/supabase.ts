import { createClient } from '@supabase/supabase-js';
import { ENV } from '../_core/env.ts';

if (!ENV.databaseUrl) {
  // Apenas um check básico, o ENV já resolve o resto
}

/**
 * Cliente Supabase com permissões de 'service_role'.
 * Bypass RLS (Row Level Security) para operações de catálogo e IA no backend.
 */
export const supabase = createClient(
  // @ts-ignore
  globalThis.Deno?.env?.get("VITE_SUPABASE_URL") || process.env.VITE_SUPABASE_URL,
  // @ts-ignore
  globalThis.Deno?.env?.get("SUPABASE_SERVICE_ROLE_KEY") || process.env.SUPABASE_SERVICE_ROLE_KEY
);
