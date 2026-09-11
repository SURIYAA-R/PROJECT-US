// index.js — Our Space Express server entry point
// Serves static frontend files + all API routes
// Requires: .env file with SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET, PORT

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ──────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────

// CORS — allow same origin and any configured FRONTEND_URL (e.g. on Railway/Render)
app.use(cors({
  origin: process.env.FRONTEND_URL || true, // 'true' mirrors the request origin
  credentials: true,
}));

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────
// Static frontend
// The public/ folder lives one level up from server/
// ──────────────────────────────────────────
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// ──────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/notes',    require('./routes/notes'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/starred',  require('./routes/starred'));
app.use('/api/photos',   require('./routes/photos'));

// Health check — useful for Render / Railway keep-alive pings
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Fallback: serve index (login page) for any unknown route
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'login.html'));
});

// ──────────────────────────────────────────
// Global error handler
// ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  const status  = err.status || 500;
  const message = err.message || 'Internal server error.';
  res.status(status).json({ error: message });
});

// ──────────────────────────────────────────
// Start
// ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('  ✦ Our Space server running');
  console.log('');
  console.log(`  http://localhost:${PORT}/login.html`);
  console.log(`  http://localhost:${PORT}/main.html`);
  console.log(`  http://localhost:${PORT}/letters.html`);
  console.log(`  http://localhost:${PORT}/album.html`);
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
