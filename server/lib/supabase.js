// lib/supabase.js — Supabase admin client
// Uses the service_role key (bypasses Row Level Security — server-side only, never expose to browser)

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      // We manage our own auth; disable Supabase's built-in auth helpers
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = supabase;
