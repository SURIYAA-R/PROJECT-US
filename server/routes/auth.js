// routes/auth.js — Authentication routes
// POST /api/login           → verify username + SHA-256 hash, return signed JWT
// POST /api/change-password → verify old hash, update to new hash
// POST /api/change-username → verify password, rename user in DB

const express  = require('express');
const jwt      = require('jsonwebtoken');
const supabase = require('../lib/supabase');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// ──────────────────────────────────────────
// POST /api/login
// Body: { username: string, passwordHash: string }
// Returns: { token: string, username: string }
// ──────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, passwordHash } = req.body;
  if (!username || !passwordHash) {
    return res.status(400).json({ error: 'Missing username or password.' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('username, password_hash')
    .eq('username', username.trim())
    .single();

  if (error || !user || user.password_hash !== passwordHash) {
    return res.status(401).json({ error: 'Name or password is incorrect.' });
  }

  // Sign a JWT valid for 30 days
  const token = jwt.sign(
    { username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  return res.json({ token, username: user.username });
});

// ──────────────────────────────────────────
// POST /api/change-password
// Body: { oldPasswordHash: string, newPasswordHash: string }
// Headers: Authorization: Bearer <token>
// ──────────────────────────────────────────
router.post('/change-password', requireAuth, async (req, res) => {
  const { oldPasswordHash, newPasswordHash } = req.body;
  const { username } = req.user;

  if (!oldPasswordHash || !newPasswordHash) {
    return res.status(400).json({ error: 'Missing password fields.' });
  }

  // Verify old password
  const { data: user, error } = await supabase
    .from('users')
    .select('password_hash')
    .eq('username', username)
    .single();

  if (error || !user || user.password_hash !== oldPasswordHash) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  // Update to new hash
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash: newPasswordHash })
    .eq('username', username);

  if (updateError) {
    console.error(updateError);
    return res.status(500).json({ error: 'Could not update password.' });
  }

  return res.json({ ok: true });
});

// ──────────────────────────────────────────
// POST /api/change-username
// Body: { newUsername: string, passwordHash: string }
// Headers: Authorization: Bearer <token>
// Returns: { token: string, username: string }
// ──────────────────────────────────────────
router.post('/change-username', requireAuth, async (req, res) => {
  const { newUsername, passwordHash } = req.body;
  const { username } = req.user;

  if (!newUsername || !passwordHash) {
    return res.status(400).json({ error: 'Missing fields.' });
  }

  // Verify password
  const { data: user, error } = await supabase
    .from('users')
    .select('password_hash')
    .eq('username', username)
    .single();

  if (error || !user || user.password_hash !== passwordHash) {
    return res.status(401).json({ error: 'Password is incorrect.' });
  }

  // Check new username isn't already taken
  const { data: existing } = await supabase
    .from('users')
    .select('username')
    .eq('username', newUsername.trim())
    .single();

  if (existing && existing.username !== username) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  // Update username
  const { error: updateError } = await supabase
    .from('users')
    .update({ username: newUsername.trim() })
    .eq('username', username);

  if (updateError) {
    console.error(updateError);
    return res.status(500).json({ error: 'Could not update username.' });
  }

  // Issue a new token with the updated username
  const token = jwt.sign(
    { username: newUsername.trim() },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  return res.json({ token, username: newUsername.trim() });
});

module.exports = router;
