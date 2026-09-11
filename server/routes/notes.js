// routes/notes.js — Notes CRUD
// GET    /api/notes        → list all notes (newest first)
// POST   /api/notes        → create a new note
// DELETE /api/notes/:id    → delete a note

const express     = require('express');
const supabase    = require('../lib/supabase');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth); // all note routes require login

// GET /api/notes
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not fetch notes.' });
  }

  return res.json(data);
});

// POST /api/notes
// Body: { text: string }
router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Note text is required.' });
  }

  const { data, error } = await supabase
    .from('notes')
    .insert({ author: req.user.username, text: text.trim() })
    .select()
    .single();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not save note.' });
  }

  return res.status(201).json(data);
});

// DELETE /api/notes/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not delete note.' });
  }

  return res.json({ ok: true });
});

module.exports = router;
