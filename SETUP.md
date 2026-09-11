# Our Space — Setup Guide

This guide walks you through setting up the Supabase database, storage bucket, and running
the Node.js server so the app works globally from any device.

---

## Step 1 — Create a Supabase Project

1. Go to **https://supabase.com** and sign up / log in (free tier is enough).
2. Click **New project**, give it a name (e.g. `our-space`), pick a region close to you, set a database password, and click **Create new project**.
3. Wait ~2 minutes for provisioning to finish.

---

## Step 2 — Run the SQL Schema

1. In your Supabase dashboard, click **SQL Editor** (left sidebar).
2. Click **New query**, paste the SQL below, and click **Run**.

```sql
-- Users table (stores SHA-256 hashed passwords, never plain text)
create table users (
  id            uuid        default gen_random_uuid() primary key,
  username      text        unique not null,
  password_hash text        not null,
  created_at    timestamptz default now()
);

-- Notes / Letters table
create table notes (
  id         uuid        default gen_random_uuid() primary key,
  author     text        not null,
  text       text        not null,
  created_at timestamptz default now()
);

-- Messages table (with 1-week expiry)
create table messages (
  id         uuid        default gen_random_uuid() primary key,
  author     text        not null,
  text       text        not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

-- Starred / "Cot" items
create table starred (
  id        uuid        default gen_random_uuid() primary key,
  author    text        not null,
  text      text        not null,
  source_id text,         -- optional: original note/message ID
  liked_at  timestamptz default now()
);

-- Photos metadata (actual files stored in Supabase Storage)
create table photos (
  id           uuid        default gen_random_uuid() primary key,
  author       text        not null,
  caption      text,
  storage_path text        not null,
  url          text        not null,
  mime_type    text,
  created_at   timestamptz default now()
);
```

3. ✅ All five tables are created.

---

## Step 3 — Seed Default User Accounts

Still in the SQL Editor, run this query to create the two accounts.
Replace `PASTE_HASH_HERE` with the actual SHA-256 hash of your shared password.

**To get the hash**, open any browser console and run:
```js
const enc = new TextEncoder().encode('YourPasswordHere');
const buf = await crypto.subtle.digest('SHA-256', enc);
console.log(Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join(''));
```

Then run:
```sql
insert into users (username, password_hash) values
  ('Eren',   'PASTE_HASH_HERE'),
  ('Mikasa', 'PASTE_HASH_HERE');
```

> The two accounts share one password. Both users see all data.

---

## Step 4 — Create the Storage Bucket

1. In Supabase dashboard, click **Storage** (left sidebar).
2. Click **New bucket**.
3. Name it exactly: `our-space-photos`
4. Toggle **Public bucket** to **ON** (so photo URLs can be opened in the browser).
5. Click **Save**.

---

## Step 5 — Get Your Supabase Keys

1. In Supabase dashboard, go to **Project Settings → API**.
2. Copy:
   - **Project URL** (looks like `https://xyzxyz.supabase.co`)
   - **service_role** key (under "Project API keys" — click the eye to reveal)

> ⚠️ Keep the service_role key secret — it bypasses all security rules.
> Never expose it in the browser. It only lives in your `.env` file on the server.

---

## Step 6 — Configure the Server

1. Go into the `server/` folder.
2. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
   (on Windows: `copy .env.example .env`)

3. Open `.env` and fill in your values:
   ```env
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key-here
   JWT_SECRET=any-long-random-string-you-make-up
   PORT=3000
   ```

   For `JWT_SECRET`, generate a strong random string — for example:
   ```js
   // In Node.js:
   require('crypto').randomBytes(48).toString('hex')
   ```

---

## Step 7 — Install Dependencies & Start the Server

```bash
cd server
npm install
npm start
```

You should see:
```
  ✦ Our Space server running

  http://localhost:3000/login.html
  http://localhost:3000/main.html
  http://localhost:3000/letters.html
  http://localhost:3000/album.html
```

Open `http://localhost:3000/login.html` and log in with `Eren` or `Mikasa`.

---

## Step 8 — Make It Global (Deploy to the Internet)

To access the app from any device worldwide, deploy the server to a hosting platform.

### Option A — Railway (Recommended, free tier)

1. Push this project to GitHub.
2. Go to **https://railway.app** → New Project → Deploy from GitHub repo.
3. Select the repo. Railway auto-detects Node.js.
4. In **Settings → Variables**, add your four env vars:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `JWT_SECRET`
   - `PORT` = `3000`
5. In **Settings → Build**, set **Root Directory** to `server`.
6. Deploy. Railway gives you a public URL like `https://our-space.up.railway.app`.

### Option B — Render (also free)

1. New Web Service → connect GitHub repo.
2. Root directory: `server`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Add the four environment variables.
6. Deploy. You get a URL like `https://our-space.onrender.com`.

### Option C — Run locally and use ngrok (quick testing)

```bash
# In one terminal:
cd server && npm start

# In another terminal:
ngrok http 3000
```

ngrok gives you a public HTTPS URL instantly.

---

## Project Structure

```
projrctj/
├── public/               ← All frontend HTML files (served by Express)
│   ├── login.html
│   ├── main.html
│   ├── letters.html
│   └── album.html        ← (add your album page here)
│
└── server/               ← Node.js backend
    ├── index.js          ← Entry point
    ├── .env              ← Your secrets (never commit this!)
    ├── .env.example      ← Template
    ├── package.json
    ├── lib/
    │   └── supabase.js   ← Supabase client
    ├── middleware/
    │   └── auth.js       ← JWT verification
    └── routes/
        ├── auth.js       ← Login, change-password, change-username
        ├── notes.js      ← Letters / notes
        ├── messages.js   ← Private messages
        ├── starred.js    ← Starred / "Cot" items
        └── photos.js     ← Album photos (upload → Supabase Storage)
```

---

## Album Page API Reference

When you drop your `album.html` into `public/`, use these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/photos` | List all photos (newest first). Returns array of `{ id, author, caption, url, mime_type, created_at }` |
| `POST` | `/api/photos` | Upload a photo. Send `multipart/form-data` with field `file` (required) and `caption` (optional). Max 50 MB. |
| `DELETE` | `/api/photos/:id` | Delete a photo and remove it from Storage. |

**Authorization header required on all requests:**
```
Authorization: Bearer <token from sessionStorage>
```

**Example upload (JavaScript fetch):**
```js
const token = sessionStorage.getItem('token');
const formData = new FormData();
formData.append('file', fileInputElement.files[0]);
formData.append('caption', 'Our first trip 🌿');

const res = await fetch('/api/photos', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData,   // ← Do NOT set Content-Type manually; browser sets it with the boundary
});
const photo = await res.json();
// photo.url → direct public URL to display in <img> or <video>
```
