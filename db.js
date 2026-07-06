const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false }
});

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gallery (
      id SERIAL PRIMARY KEY,
      image_url TEXT NOT NULL,
      title TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  // In case this is an existing DB from an earlier version, migrate its shape
  await pool.query(`ALTER TABLE gallery ADD COLUMN IF NOT EXISTS title TEXT;`);
  await pool.query(`ALTER TABLE gallery ADD COLUMN IF NOT EXISTS description TEXT;`);
  await pool.query(`ALTER TABLE gallery ALTER COLUMN category DROP NOT NULL;`).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id SERIAL PRIMARY KEY,
      quote TEXT NOT NULL,
      client_name TEXT NOT NULL,
      event_label TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS packages (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      price TEXT,
      duration TEXT,
      inclusions TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Seed default testimonials + packages if empty, so the site isn't blank on first launch
  const { rows: tRows } = await pool.query('SELECT COUNT(*)::int AS count FROM testimonials');
  if (tRows[0].count === 0) {
    await pool.query(`
      INSERT INTO testimonials (quote, client_name, event_label) VALUES
      ('You could tell two people shot our day, but you''d never guess it from the gallery — it just felt like one story, told well.', 'Placeholder Client', 'Wedding'),
      ('They moved around each other like they''d been shooting together for years. We barely noticed the cameras.', 'Placeholder Client', 'Portrait Session'),
      ('Fast turnaround, zero drama, and the kind of photos we''ll still love in twenty years.', 'Placeholder Client', 'Corporate Event');
    `);
  }

  const { rows: pRows } = await pool.query('SELECT COUNT(*)::int AS count FROM packages');
  if (pRows[0].count === 0) {
    await pool.query(`
      INSERT INTO packages (title, subtitle, price, duration, inclusions, sort_order) VALUES
      ('Half Day', 'Intimate coverage', 'Contact for pricing', '6 hours', 'Getting ready photos, ceremony, family photos', 1),
      ('Full Day', 'Complete coverage', 'Contact for pricing', '8 hours', 'Engagement session, getting ready, ceremony, family photos, reception, sunset couple photos', 2);
    `);
  }
}

module.exports = { pool, migrate };
