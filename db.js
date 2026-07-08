const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false }
});

async function migrate() {
  // Existing structural components
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gallery (
      id SERIAL PRIMARY KEY,
      image_url TEXT NOT NULL,
      title TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      price_label TEXT,
      image_url TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // NEW PIPELINE: Client Inquiries Lead Ledger
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      client_name TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      client_email TEXT,
      service_id TEXT NOT NULL,
      layout_label TEXT NOT NULL,
      calculated_cost TEXT NOT NULL,
      custom_notes TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Seed default testimonials + packages if empty
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

  const { rows: sRows } = await pool.query('SELECT COUNT(*)::int AS count FROM services');
  if (sRows[0].count === 0) {
    // Carry over any photos already uploaded under the old settings keys, so nothing gets lost.
    const { rows: settingsRows } = await pool.query('SELECT key, value FROM settings');
    const settingsMap = {};
    settingsRows.forEach(r => { settingsMap[r.key] = r.value; });

    const defaults = [
      ['Party Vlogs', 'Event Tracking', 'From K60', settingsMap['service_party_vlogs'] || null, 1],
      ['Engagement Vlogs', 'Milestone Cinematic', 'From K160', settingsMap['service_engagement_vlogs'] || null, 2],
      ['Advertising', 'Commercial Production', 'From K50', settingsMap['service_advertising'] || null, 3],
      ['Graduation Vlogs', 'Memory Capture', 'From K160', settingsMap['service_graduation_vlogs'] || null, 4],
      ['Graphics Design', 'Visual Identity', 'From K150', settingsMap['service_graphics_design'] || null, 5],
      ['Social Media Management', 'Page Curation', 'From K200', settingsMap['service_social_media'] || null, 6]
    ];
    for (const [title, subtitle, price_label, image_url, sort_order] of defaults) {
      await pool.query(
        'INSERT INTO services (title, subtitle, price_label, image_url, sort_order) VALUES ($1,$2,$3,$4,$5)',
        [title, subtitle, price_label, image_url, sort_order]
      );
    }
  }
}

module.exports = { pool, migrate };
