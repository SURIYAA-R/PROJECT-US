// routes/messages.js — Messages CRUD (with 1-week expiry)
// GET    /api/messages        → list non-expired messages (newest first)
// POST   /api/messages        → publish a new message (expires in 7 days)
// PUT    /api/messages/:id    → update text + reset expiry to now + 7 days
// DELETE /api/messages/:id    → delete a message

const express     = require('express');
const supabase    = require('../lib/supabase');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function expiresAt() {
  return new Date(Date.now() + WEEK_MS).toISOString();
}

// GET /api/messages
router.get('/', async (req, res) => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .gt('expires_at', now)           // only non-expired
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not fetch messages.' });
  }

  return res.json(data);
});

// POST /api/messages
// Body: { text: string }
router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message text is required.' });
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      author:     req.user.username,
      text:       text.trim(),
      expires_at: expiresAt(),
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not save message.' });
  }

  return res.status(201).json(data);
});

// PUT /api/messages/:id
// Body: { text: string }
router.put('/:id', async (req, res) => {
  const { id }  = req.params;
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message text is required.' });
  }

  const { data, error } = await supabase
    .from('messages')
    .update({ text: text.trim(), expires_at: expiresAt() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not update message.' });
  }

  return res.json(data);
});

// DELETE /api/messages/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not delete message.' });
  }

  return res.json({ ok: true });
});

module.exports = router;
