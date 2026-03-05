/* =====================================================
   supabase-client.js — Supabase integration
   Loads credentials from localStorage, provides
   save / load / delete for financial scenarios.
   ===================================================== */

let supabaseClient = null;

function initSupabase(url, key) {
  if (!url || !key) return false;
  try {
    const { createClient } = supabase;
    supabaseClient = createClient(url, key);
    localStorage.setItem('finsim_sb_url', url);
    localStorage.setItem('finsim_sb_key', key);
    return true;
  } catch (e) {
    console.error('Supabase init error:', e);
    return false;
  }
}

function loadStoredSupabaseConfig() {
  const url = localStorage.getItem('finsim_sb_url');
  const key = localStorage.getItem('finsim_sb_key');
  if (url && key) {
    initSupabase(url, key);
    return { url, key };
  }
  return null;
}

async function saveScenario(name, params, userEmail = 'default') {
  if (!supabaseClient) return { error: 'Supabase not configured' };
  try {
    const { data, error } = await supabaseClient
      .from('financial_simulations')
      .insert([{
        name,
        params,
        user_email: userEmail,
        updated_at: new Date().toISOString()
      }])
      .select();
    return { data, error };
  } catch (e) {
    return { error: e.message };
  }
}

async function loadScenarios(userEmail) {
  if (!supabaseClient) return { error: 'Supabase not configured', data: [] };
  try {
    const { data, error } = await supabaseClient
      .from('financial_simulations')
      .select('*')
      .eq('user_email', userEmail)
      .order('updated_at', { ascending: false });
    return { data: data || [], error };
  } catch (e) {
    return { error: e.message, data: [] };
  }
}

async function deleteScenario(id) {
  if (!supabaseClient) return { error: 'Supabase not configured' };
  try {
    const { error } = await supabaseClient
      .from('financial_simulations')
      .delete()
      .eq('id', id);
    return { error };
  } catch (e) {
    return { error: e.message };
  }
}

function isSupabaseConfigured() {
  return supabaseClient !== null;
}
