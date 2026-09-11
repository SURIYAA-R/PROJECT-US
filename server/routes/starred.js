// routes/starred.js — Starred / "Cot" items
// GET    /api/starred        → list all starred items (newest first)
// POST   /api/starred        → star an item
// DELETE /api/starred/:id    → remove a starred item

const express     = require('express');
const supabase    = require('../lib/supabase');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/starred
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('starred')
    .select('*')
    .order('liked_at', { ascending: false });

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not fetch starred items.' });
  }

  return res.json(data);
});

// POST /api/starred
// Body: { text: string, author: string }
// (author is the original message author — not necessarily the person starring it)
router.post('/', async (req, res) => {
  const { text, author } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required.' });
  }

  const { data, error } = await supabase
    .from('starred')
    .insert({
      author:   author || req.user.username,
      text:     text.trim(),
      liked_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not star item.' });
  }

  return res.status(201).json(data);
});

// DELETE /api/starred/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('starred')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not remove starred item.' });
  }

  return res.json({ ok: true });
});

module.exports = router;
