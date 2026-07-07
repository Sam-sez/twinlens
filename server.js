require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const { pool, migrate } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- AUTH ----------
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

// Public config for Cloudinary widget
app.get('/api/config', (req, res) => {
  res.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || ''
  });
});

// ---------- CLIENT BOOKING ENGINE ENDPOINTS ----------
app.post('/api/bookings', async (req, res) => {
  const { client_name, client_phone, client_email, service_id, layout_label, calculated_cost, custom_notes } = req.body;
  if (!client_name || !client_phone || !service_id) {
    return res.status(400).json({ error: 'Name, contact phone, and service selection parameters are required.' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO bookings (client_name, client_phone, client_email, service_id, layout_label, calculated_cost, custom_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [client_name, client_phone, client_email || '', service_id, layout_label || 'Standard Layout', calculated_cost || 'Quote Pending', custom_notes || '']
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server database failure saving inquiry record.' });
  }
});

app.get('/api/bookings', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM bookings ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server database failure retrieving pipeline logs.' });
  }
});

app.delete('/api/bookings/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM bookings WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server failed to remove client ledger slot.' });
  }
});

// ---------- SETTINGS (hero images) ----------
app.get('/api/settings', async (req, res) => {
  const { rows } = await pool.query('SELECT key, value FROM settings');
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.json(settings);
});

app.post('/api/settings', requireAuth, async (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'key is required' });
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2`,
    [key, value]
  );
  res.json({ ok: true });
});

// ---------- GALLERY ----------
app.get('/api/gallery', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM gallery ORDER BY created_at DESC');
  res.json(rows);
});

app.post('/api/gallery', requireAuth, async (req, res) => {
  const { image_url, title, description } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url is required' });
  const { rows } = await pool.query(
    'INSERT INTO gallery (image_url, title, description) VALUES ($1, $2, $3) RETURNING *',
    [image_url, title || '', description || '']
  );
  res.json(rows[0]);
});

app.delete('/api/gallery/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM gallery WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ---------- TESTIMONIALS ----------
app.get('/api/testimonials', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM testimonials ORDER BY created_at DESC');
  res.json(rows);
});

app.post('/api/testimonials', requireAuth, async (req, res) => {
  const { quote, client_name, event_label } = req.body;
  if (!quote || !client_name) return res.status(400).json({ error: 'quote and client_name are required' });
  const { rows } = await pool.query(
    'INSERT INTO testimonials (quote, client_name, event_label) VALUES ($1, $2, $3) RETURNING *',
    [quote, client_name, event_label || '']
  );
  res.json(rows[0]);
});

app.delete('/api/testimonials/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM testimonials WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ---------- PACKAGES ----------
app.get('/api/packages', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM packages ORDER BY sort_order ASC, created_at ASC');
  res.json(rows);
});

app.post('/api/packages', requireAuth, async (req, res) => {
  const { title, subtitle, price, duration, inclusions, sort_order } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const { rows } = await pool.query(
    'INSERT INTO packages (title, subtitle, price, duration, inclusions, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [title, subtitle || '', price || '', duration || '', inclusions || '', sort_order || 0]
  );
  res.json(rows[0]);
});

app.put('/api/packages/:id', requireAuth, async (req, res) => {
  const { title, subtitle, price, duration, inclusions, sort_order } = req.body;
  const { rows } = await pool.query(
    `UPDATE packages SET title=$1, subtitle=$2, price=$3, duration=$4, inclusions=$5, sort_order=$6 WHERE id=$7 RETURNING *`,
    [title, subtitle || '', price || '', duration || '', inclusions || '', sort_order || 0, req.params.id]
  );
  res.json(rows[0]);
});

app.delete('/api/packages/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM packages WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ---------- START ----------
migrate()
  .then(() => {
    app.listen(PORT, () => console.log(`TwinLens Studio running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to run migrations', err);
    process.exit(1);
  });
    
