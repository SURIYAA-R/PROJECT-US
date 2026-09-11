// routes/photos.js — Photos (flat shared album)
// GET    /api/photos        → list all photos (newest first)
// POST   /api/photos        → upload a photo/video to Supabase Storage + save metadata
// DELETE /api/photos/:id    → delete from Storage + DB

const express     = require('express');
const multer      = require('multer');
const supabase    = require('../lib/supabase');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Multer: store file in memory (we stream it to Supabase Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter(req, file, cb) {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'image/heic', 'image/heif', 'video/mp4', 'video/quicktime',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images and MP4/MOV videos are allowed.'));
    }
  },
});

const BUCKET = 'our-space-photos';

// ──────────────────────────────────────────
// GET /api/photos
// ──────────────────────────────────────────
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not fetch photos.' });
  }

  return res.json(data);
});

// ──────────────────────────────────────────
// POST /api/photos
// multipart/form-data: file (required), caption (optional)
// ──────────────────────────────────────────
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'A file is required.' });
  }

  const { originalname, mimetype, buffer } = req.file;
  const caption = (req.body.caption || '').trim();

  // Build a unique storage path: username/timestamp-filename
  const safeFilename = originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath  = `${req.user.username}/${Date.now()}-${safeFilename}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimetype,
      upsert: false,
    });

  if (uploadError) {
    console.error(uploadError);
    return res.status(500).json({ error: 'Could not upload file.' });
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  // Save metadata to DB
  const { data: photo, error: dbError } = await supabase
    .from('photos')
    .insert({
      author:       req.user.username,
      caption:      caption || null,
      storage_path: storagePath,
      url:          publicUrl,
      mime_type:    mimetype,
    })
    .select()
    .single();

  if (dbError) {
    console.error(dbError);
    // Try to clean up the uploaded file
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return res.status(500).json({ error: 'Could not save photo metadata.' });
  }

  return res.status(201).json(photo);
});

// ──────────────────────────────────────────
// DELETE /api/photos/:id
// ──────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  // Fetch the record to get the storage path
  const { data: photo, error: fetchError } = await supabase
    .from('photos')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (fetchError || !photo) {
    return res.status(404).json({ error: 'Photo not found.' });
  }

  // Remove from Storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([photo.storage_path]);

  if (storageError) {
    console.error('Storage delete error:', storageError);
    // Continue anyway — still delete DB record
  }

  // Remove from DB
  const { error: dbError } = await supabase
    .from('photos')
    .delete()
    .eq('id', id);

  if (dbError) {
    console.error(dbError);
    return res.status(500).json({ error: 'Could not delete photo.' });
  }

  return res.json({ ok: true });
});

module.exports = router;
