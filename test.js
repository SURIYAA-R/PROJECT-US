// test.js — Automated test suite for "Our Space" backend & frontend
const http = require('http');

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:3000${path}`, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let data = body;
        try { data = JSON.parse(body); } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, data });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING AUTOMATED SUITE TEST ---');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ FAIL: ${name}`, e.message);
      failed++;
    }
  }

  // 1. Static Files
  await test('GET / redirects to login.html or serves index.html', async () => {
    const res = await request('/');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  await test('GET /login.html serves HTML', async () => {
    const res = await request('/login.html');
    if (res.status !== 200 || !res.data.includes('<html')) throw new Error('Failed to load login.html');
  });

  await test('GET /main.html serves HTML', async () => {
    const res = await request('/main.html');
    if (res.status !== 200 || !res.data.includes('<html')) throw new Error('Failed to load main.html');
  });

  await test('GET /letters.html serves HTML', async () => {
    const res = await request('/letters.html');
    if (res.status !== 200 || !res.data.includes('<html')) throw new Error('Failed to load letters.html');
  });

  // 2. Auth API
  await test('POST /api/login with invalid password returns 401', async () => {
    const res = await request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { username: 'Eren', password: 'wrongpassword' }
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await test('POST /api/login with valid password returns success', async () => {
    const res = await request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { username: 'Eren', password: 'Surijan2919@' }
    });
    if (res.status !== 200 || !res.data.success) throw new Error(`Login failed: ${JSON.stringify(res.data)}`);
  });

  // 3. Notes API
  let createdNoteId;
  await test('POST /api/notes creates note', async () => {
    const res = await request('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { author: 'Eren', text: 'Automated Test Note' }
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    createdNoteId = res.data.id;
  });

  await test('GET /api/notes retrieves notes including test note', async () => {
    const res = await request('/api/notes');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const found = Array.isArray(res.data) && res.data.some(n => n.text === 'Automated Test Note');
    if (!found) throw new Error('Created note not found in GET /api/notes');
  });

  if (createdNoteId) {
    await test(`DELETE /api/notes/${createdNoteId} deletes note`, async () => {
      const res = await request(`/api/notes/${createdNoteId}`, { method: 'DELETE' });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    });
  }

  // 4. Messages API
  let createdMsgId;
  await test('POST /api/messages creates message', async () => {
    const res = await request('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { author: 'Mikasa', text: 'Automated Test Message' }
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    createdMsgId = res.data.id;
  });

  await test('GET /api/messages retrieves messages', async () => {
    const res = await request('/api/messages');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const found = Array.isArray(res.data) && res.data.some(m => m.text === 'Automated Test Message');
    if (!found) throw new Error('Created message not found in GET /api/messages');
  });

  if (createdMsgId) {
    await test(`PUT /api/messages/${createdMsgId} updates message`, async () => {
      const res = await request(`/api/messages/${createdMsgId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: { text: 'Updated Automated Test Message' }
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    });

    await test(`DELETE /api/messages/${createdMsgId} deletes message`, async () => {
      const res = await request(`/api/messages/${createdMsgId}`, { method: 'DELETE' });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    });
  }

  console.log(`\n--- TEST SUMMARY ---`);
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
}

runTests().catch(console.error);
