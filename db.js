// ============================================================
// db.js — Supabase client, password hashing, and account seeding
// ============================================================
// This module does three things:
//   1. Creates a Supabase client using the URL and secret key
//      from environment variables.
//   2. Exports a hashPassword() helper that turns a plain-text
//      password into a SHA-256 hex string.
//   3. Exports a seedAccounts() function that ensures our two
//      user accounts always exist in the database.
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const { createHash } = require('node:crypto');

// ---- 1. Create the Supabase client ----
// We read the URL and secret key from environment variables.
// The secret key has full access to the database, so it must
// NEVER be sent to the browser — it stays on the server only.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

// Quick sanity check — crash early with a helpful message if
// the env vars are missing (common mistake when setting up).
if (!supabaseUrl || !supabaseKey) {
  console.error(
    '❌  Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables.\n' +
    '    Ensure SUPABASE_URL and SUPABASE_SECRET_KEY are set in your .env file or Vercel Environment Variables.'
  );
}

const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ---- 2. Password hashing helper ----
// SHA-256 is a one-way hash — we store the hash, never the raw
// password. When a user logs in we hash what they typed and
// compare it to what's stored.
function hashPassword(plainText) {
  return createHash('sha256').update(plainText).digest('hex');
}

// ---- 3. Seed the two accounts on startup ----
// upsert = "insert if missing, update if already exists".
// onConflict: 'username' tells Supabase which column is the
// unique key to match on, so it won't create duplicates.
async function seedAccounts() {
  if (!supabase) {
    console.error('⚠️  Cannot seed accounts: Supabase client is not initialized.');
    return;
  }
  const accounts = [
    { username: 'Eren',   password_hash: hashPassword('Janani Suriyaa') },
    { username: 'Mikasa', password_hash: hashPassword('Janani Suriyaa') },
  ];

  const { error } = await supabase
    .from('users')
    .upsert(accounts, { onConflict: 'username' });

  if (error) {
    console.error('⚠️  Failed to seed accounts:', error.message);
  } else {
    console.log('✅  Seed accounts ready (Eren & Mikasa).');
  }
}

// ---- Export everything other files need ----
module.exports = { supabase, hashPassword, seedAccounts };
