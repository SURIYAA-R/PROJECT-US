// ============================================================
// server.js — Express app with all API routes for "Our Space"
// ============================================================
// This is the entry point.  It:
//   • Seeds the two user accounts
//   • Serves the frontend from public/
//   • Exposes REST endpoints for login, notes, and messages
// ============================================================

const express = require('express');
const path    = require('node:path');
const { supabase, hashPassword, seedAccounts } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware ----
// express.json() lets us read JSON request bodies (e.g. { "username": "Eren" })
app.use(express.json());

// Serve everything inside public/ as static files (HTML, CSS, JS, images).
app.use(express.static(path.join(__dirname, 'public')));

// Guard for missing database config in serverless runtime
app.use('/api', (req, res, next) => {
  if (!supabase) {
    return res.status(500).json({
      error: 'Missing SUPABASE_URL or SUPABASE_SECRET_KEY in Vercel Project Environment Variables.'
    });
  }
  next();
});

// ============================================================
//  AUTH — POST /api/login
// ============================================================
// Body: { username, password }
// We hash the incoming password, look up the user in Supabase,
// and compare hashes.  No sessions or tokens — the frontend
// just remembers the username in sessionStorage.
// ============================================================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Hash what the user typed
    const hash = hashPassword(password);

    // Fetch the row from the users table where the username matches
    const { data, error } = await supabase
      .from('users')
      .select('username, password_hash')
      .eq('username', username)
      .single();                             // .single() = expect exactly 1 row

    // If Supabase returned an error or no row was found, fail
    if (error || !data) {
      return res.status(401).json({ error: 'Name or password is incorrect' });
    }

    // Compare the stored hash with the hash of the typed password
    if (data.password_hash !== hash) {
      return res.status(401).json({ error: 'Name or password is incorrect' });
    }

    // Success!
    return res.json({ success: true, username: data.username });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// ============================================================
//  NOTES — GET, POST, DELETE
// ============================================================

// GET /api/notes — return all notes, newest first
app.get('/api/notes', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch notes error:', error.message);
      return res.status(500).json({ error: 'Could not fetch notes.' });
    }

    return res.json(data);
  } catch (err) {
    console.error('GET /api/notes error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/notes — create a new note
// Body: { author, text }
app.post('/api/notes', async (req, res) => {
  try {
    const { author, text } = req.body;

    if (!author || !text) {
      return res.status(400).json({ error: 'Author and text are required.' });
    }

    // .insert() adds a new row.  .select() after it tells Supabase to
    // return the newly created row so we can send it back to the client.
    const { data, error } = await supabase
      .from('notes')
      .insert({ author, text })
      .select()
      .single();

    if (error) {
      console.error('Insert note error:', error.message);
      return res.status(500).json({ error: 'Could not create note.' });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/notes error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/notes/:id — delete a note by its id
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete note error:', error.message);
      return res.status(500).json({ error: 'Could not delete note.' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/notes/:id error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ============================================================
//  MESSAGES — GET, POST, PUT, DELETE
// ============================================================

// GET /api/messages — only non-expired messages, newest first
// A message is "alive" if expires_at is still in the future.
app.get('/api/messages', async (_req, res) => {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .gt('expires_at', now)                  // gt = "greater than" = still in the future
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch messages error:', error.message);
      return res.status(500).json({ error: 'Could not fetch messages.' });
    }

    return res.json(data);
  } catch (err) {
    console.error('GET /api/messages error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/messages — create a new message (expires in 7 days)
// Body: { author, text }
app.post('/api/messages', async (req, res) => {
  try {
    const { author, text } = req.body;

    if (!author || !text) {
      return res.status(400).json({ error: 'Author and text are required.' });
    }

    // Calculate 7 days from right now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('messages')
      .insert({ author, text, expires_at: expiresAt })
      .select()
      .single();

    if (error) {
      console.error('Insert message error:', error.message);
      return res.status(500).json({ error: 'Could not create message.' });
    }

    return res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/messages error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/messages/:id — update a message's text and reset its expiry
// Body: { text }
app.put('/api/messages/:id', async (req, res) => {
  try {
    const { id }   = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required.' });
    }

    // Reset the timer — another 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('messages')
      .update({ text, expires_at: expiresAt })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update message error:', error.message);
      return res.status(500).json({ error: 'Could not update message.' });
    }

    return res.json(data);
  } catch (err) {
    console.error('PUT /api/messages/:id error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/messages/:id — delete a message by its id
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete message error:', error.message);
      return res.status(500).json({ error: 'Could not delete message.' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/messages/:id error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ============================================================
//  EXPORTS & LOCAL SERVER START
// ============================================================
// Export app for Vercel serverless deployment
module.exports = app;

// If executed directly (e.g. `node server.js`), seed accounts & start local HTTP server
if (require.main === module) {
  (async () => {
    await seedAccounts();
    app.listen(PORT, () => {
      console.log(`\n🌿  Our Space server is running → http://localhost:${PORT}\n`);
    });
  })();
}
