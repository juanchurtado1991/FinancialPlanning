// =====================================================
// lib/supabase.js — Supabase client
// Reads from Next.js env variables (NEXT_PUBLIC_*)
// =====================================================
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Will be null if env vars are not set
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export function isConfigured() {
  return supabase !== null;
}

export async function saveScenario(name, params, userEmail = 'default') {
  if (!supabase) return { error: 'Supabase no configurado. Revisa .env.local' };
  const { data, error } = await supabase
    .from('financial_simulations')
    .insert([{ name, params, user_email: userEmail, updated_at: new Date().toISOString() }])
    .select();
  return { data, error: error?.message };
}

export async function loadScenarios(userEmail) {
  if (!supabase) return { data: [], error: 'Supabase no configurado' };
  const { data, error } = await supabase
    .from('financial_simulations')
    .select('*')
    .eq('user_email', userEmail)
    .order('updated_at', { ascending: false });
  return { data: data || [], error: error?.message };
}

export async function deleteScenario(id) {
  if (!supabase) return { error: 'Supabase no configurado' };
  const { error } = await supabase
    .from('financial_simulations')
    .delete()
    .eq('id', id);
  return { error: error?.message };
}
