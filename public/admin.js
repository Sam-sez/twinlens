const TOKEN_KEY = 'twinlens_admin_token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

function authHeaders() {
  return { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' };
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    clearToken();
    showLogin();
    throw new Error('Session expired');
  }
  return res;
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'block';
  document.getElementById('dashboard').style.display = 'none';
}
function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  loadBookingsAdmin();
  loadHeroAdmin();
  loadFoundersAdmin();
  loadServicesAdmin();
  loadGalleryAdmin();
  loadTestimonialsAdmin();
  loadPackagesAdmin();
}

// ---------- LOGIN ----------
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('passwordInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });

async function login() {
  const password = document.getElementById('passwordInput').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) { errorEl.textContent = data.error || 'Login failed'; return; }
    setToken(data.token);
    showDashboard();
  } catch (e) {
    errorEl.textContent = 'Could not reach server';
  }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearToken();
  showLogin();
});

// ---------- TABS ----------
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ---------- CLIENT ACTIVE INQUIRIES LOGS ----------
async function loadBookingsAdmin() {
  const res = await apiFetch('/api/bookings', { headers: authHeaders() });
  const items = await res.json();
  const list = document.getElementById('bookingList');
  list.innerHTML = '';
  
  if (items.length === 0) {
    list.innerHTML = `<p style="color:var(--stone); font-family:'JetBrains Mono'; padding:24px; font-size:14px;">No incoming inquiries logged in the tracking pipeline yet.</p>`;
    return;
  }

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'admin-list-item';
    row.style.flexDirection = 'column';
    row.style.alignItems = 'stretch';
    row.style.gap = '14px';
    row.style.padding = '24px';
    row.style.marginBottom = '16px';
    row.style.background = 'var(--panel-2)';
    
    const timestamp = new Date(item.created_at).toLocaleString();

    row.innerHTML = `
      <div style="display:flex; justify-content:between; align-items:flex-start; border-bottom:1px solid var(--line); padding-bottom:12px; width:100%;">
        <div style="flex-grow:1;">
          <h4 style="font-size:20px; color:var(--bone); margin:0;">${item.client_name}</h4>
          <p style="color:var(--gold); font-family:'JetBrains Mono'; font-size:12px; margin:4px 0 0 0; text-transform:uppercase; letter-spacing:0.04em;">${item.service_id} — ${item.layout_label}</p>
        </div>
        <strong style="color:var(--bone); font-family:'JetBrains Mono'; font-size:16px; white-space:nowrap; margin-left:16px;">${item.calculated_cost}</strong>
      </div>
      <div style="font-size:14px; color:var(--stone); line-height:1.6; width:100%;">
        <p style="margin:4px 0;">📱 Line: <a href="tel:${item.client_phone}" style="color:var(--gold); text-decoration:none; font-weight:600;">${item.client_phone}</a></p>
        ${item.client_email ? `<p style="margin:4px 0;">✉️ Email: ${item.client_email}</p>` : ''}
        ${item.custom_notes ? `<div style="background:rgba(212,162,76,0.06); border-left:3px solid var(--gold); padding:12px; margin-top:10px; font-size:13px; color:var(--bone); border-radius:0 4px 4px 0;"><b>Custom Requirements:</b><br>${item.custom_notes}</div>` : ''}
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; width:100%;">
        <span style="font-size:11px; color:var(--stone); font-family:'JetBrains Mono';">${timestamp}</span>
        <button class="btn-delete" data-id="${item.id}" style="margin:0; padding:6px 14px; font-size:11px;">Archive Log</button>
      </div>
    `;

    row.querySelector('.btn-delete').addEventListener('click', async () => {
      if(confirm("Archive this client lead from workspace logs?")) {
        await apiFetch('/api/bookings/' + item.id, { method: 'DELETE', headers: authHeaders() });
        loadBookingsAdmin();
      }
    });
    list.appendChild(row);
  });
}

// ---------- CLOUDINARY (shared widget) ----------
let cloudinaryWidget = null;
let uploadTarget = 'gallery';

async function initCloudinary() {
  const res = await fetch('/api/config');
  const config = await res.json();
  if (!config.cloudName || !config.uploadPreset) {
    document.getElementById('uploadStatus').textContent =
      'Cloudinary isn\'t configured yet — set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET in your hosting environment variables.';
    return;
  }
  cloudinaryWidget = cloudinary.createUploadWidget({
    cloudName: config.cloudName,
    uploadPreset: config.uploadPreset,
    sources: ['local', 'camera'],
    multiple: false
  }, async (error, result) => {
    if (!error && result && result.event === 'success') {
      const url = result.info.secure_url;
      if (uploadTarget === 'hero_left' || uploadTarget === 'hero_right') {
        const statusEl = document.getElementById('heroStatus');
        statusEl.textContent = 'Saving...';
        try {
          await apiFetch('/api/settings', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ key: uploadTarget, value: url })
          });
          statusEl.textContent = 'Saved.';
          loadHeroAdmin();
        } catch (e) {
          statusEl.textContent = 'Could not save photo.';
        }
      } else if (uploadTarget === 'founder_1_photo' || uploadTarget === 'founder_2_photo') {
        const statusEl = document.getElementById('foundersStatus');
        statusEl.textContent = 'Saving...';
        try {
          await apiFetch('/api/settings', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ key: uploadTarget, value: url })
          });
          statusEl.textContent = 'Saved.';
          loadFoundersAdmin();
        } catch (e) {
          statusEl.textContent = 'Could not save photo.';
        }
      } else if (uploadTarget.startsWith('service:')) {
        const id = uploadTarget.split(':')[1];
        const statusEl = document.getElementById('servicesStatus') || { textContent: '' };
        statusEl.textContent = 'Saving...';
        try {
          const existing = servicesCache.find(s => String(s.id) === String(id));
          if (existing) {
            await apiFetch('/api/services/' + id, {
              method: 'PUT',
              headers: authHeaders(),
              body: JSON.stringify({ ...existing, image_url: url })
            });
          }
          loadServicesAdmin();
        } catch (e) {
          statusEl.textContent = 'Could not save photo.';
        }
      } else {
        const statusEl = document.getElementById('uploadStatus');
        statusEl.textContent = 'Saving...';
        const title = document.getElementById('galleryTitle').value;
        const description = document.getElementById('galleryDescription').value;
        try {
          await apiFetch('/api/gallery', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ image_url: url, title, description })
          });
          statusEl.textContent = 'Photo added.';
          document.getElementById('galleryTitle').value = '';
          document.getElementById('galleryDescription').value = '';
          loadGalleryAdmin();
        } catch (e) {
          statusEl.textContent = 'Could not save photo.';
        }
      }
    }
  });
}

document.getElementById('uploadBtn').addEventListener('click', () => {
  uploadTarget = 'gallery';
  if (cloudinaryWidget) cloudinaryWidget.open();
  else document.getElementById('uploadStatus').textContent = 'Upload isn\'t set up yet — see the note above.';
});

document.getElementById('uploadHeroLeftBtn').addEventListener('click', () => {
  uploadTarget = 'hero_left';
  if (cloudinaryWidget) cloudinaryWidget.open();
  else document.getElementById('heroStatus').textContent = 'Upload isn\'t set up yet.';
});

document.getElementById('uploadHeroRightBtn').addEventListener('click', () => {
  uploadTarget = 'hero_right';
  if (cloudinaryWidget) cloudinaryWidget.open();
  else document.getElementById('heroStatus').textContent = 'Upload isn\'t set up yet.';
});

document.querySelectorAll('[data-founder]').forEach(btn => {
  btn.addEventListener('click', () => {
    uploadTarget = btn.dataset.founder;
    if (cloudinaryWidget) cloudinaryWidget.open();
    else document.getElementById('foundersStatus').textContent = 'Upload isn\'t set up yet.';
  });
});

// Service photo-upload buttons are attached dynamically inside loadServicesAdmin(),
// since services are now added/removed by the user rather than fixed in the HTML.

// ---------- SERVICES ----------
let servicesCache = [];

document.getElementById('serviceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    title: document.getElementById('sTitle').value,
    subtitle: document.getElementById('sSubtitle').value,
    price_label: document.getElementById('sPrice').value,
    sort_order: servicesCache.length
  };
  await apiFetch('/api/services', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body)
  });
  e.target.reset();
  loadServicesAdmin();
});

async function loadServicesAdmin() {
  const res = await apiFetch('/api/services');
  const items = await res.json();
  servicesCache = items;
  const list = document.getElementById('serviceList');
  if (!list) return;
  list.innerHTML = '';

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'admin-list-item';
    row.innerHTML = `
      <div class="row-left">
        ${item.image_url ? `<img src="${item.image_url}" alt="${item.title}">` : `<div style="width:56px;height:56px;border-radius:4px;background:var(--panel);border:1px solid var(--line);flex-shrink:0;"></div>`}
        <div class="text">
          <p>${item.title}${item.price_label ? ' — ' + item.price_label : ''}</p>
          <span class="meta">${item.subtitle || 'No subtitle set'}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        <button class="upload-btn photo-btn" style="padding:8px 14px;font-size:12px;margin-top:0;" data-id="${item.id}">Photo</button>
        <button class="btn-delete" data-id="${item.id}">Delete</button>
      </div>
    `;
    row.querySelector('.photo-btn').addEventListener('click', () => {
      uploadTarget = 'service:' + item.id;
      if (cloudinaryWidget) cloudinaryWidget.open();
      else {
        const statusEl = document.getElementById('servicesStatus');
        if (statusEl) statusEl.textContent = 'Upload isn\'t set up yet.';
      }
    });
    row.querySelector('.btn-delete').addEventListener('click', async () => {
      if (!confirm(`Remove "${item.title}" from the site?`)) return;
      await apiFetch('/api/services/' + item.id, { method: 'DELETE', headers: authHeaders() });
      loadServicesAdmin();
    });
    list.appendChild(row);
  });
}

// ---------- HERO ----------
async function loadHeroAdmin() {
  const res = await apiFetch('/api/settings');
  const settings = await res.json();
  const left = document.getElementById('heroLeftPreview');
  const right = document.getElementById('heroRightPreview');
  if (settings.hero_left) left.style.backgroundImage = `url(${settings.hero_left})`;
  if (settings.hero_right) right.style.backgroundImage = `url(${settings.hero_right})`;
}

// ---------- FOUNDERS ----------
const FOUNDER_DEFAULTS = {
  founder_1_name: 'Clive Makalicha',
  founder_1_role: 'Photographer & Co-Founder',
  founder_1_bio: "Clive leads with a technical eye — precise framing, clean light, and a steady hand under pressure. He's the one making sure every shot is sharp before it's ever called beautiful.",
  founder_2_name: 'Lucky Mukubonda',
  founder_2_role: 'Photographer & Co-Founder',
  founder_2_bio: "Lucky brings the artistic instinct — reading a room, chasing a fleeting moment, and finding the emotion inside the frame. He's the reason your gallery feels like a story, not just a set of photos."
};

async function loadFoundersAdmin() {
  const res = await apiFetch('/api/settings');
  const settings = await res.json();
  const f1 = document.getElementById('founder1Preview');
  const f2 = document.getElementById('founder2Preview');
  if (settings.founder_1_photo && f1) f1.style.backgroundImage = `url(${settings.founder_1_photo})`;
  if (settings.founder_2_photo && f2) f2.style.backgroundImage = `url(${settings.founder_2_photo})`;

  document.getElementById('f1Name').value = settings.founder_1_name || FOUNDER_DEFAULTS.founder_1_name;
  document.getElementById('f1Role').value = settings.founder_1_role || FOUNDER_DEFAULTS.founder_1_role;
  document.getElementById('f1Bio').value = settings.founder_1_bio || FOUNDER_DEFAULTS.founder_1_bio;
  document.getElementById('f2Name').value = settings.founder_2_name || FOUNDER_DEFAULTS.founder_2_name;
  document.getElementById('f2Role').value = settings.founder_2_role || FOUNDER_DEFAULTS.founder_2_role;
  document.getElementById('f2Bio').value = settings.founder_2_bio || FOUNDER_DEFAULTS.founder_2_bio;
}

async function saveFounderFields(prefix, fields) {
  const statusEl = document.getElementById('foundersStatus');
  statusEl.textContent = 'Saving...';
  try {
    for (const [key, value] of Object.entries(fields)) {
      await apiFetch('/api/settings', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ key: `${prefix}_${key}`, value })
      });
    }
    statusEl.textContent = 'Saved.';
  } catch (e) {
    statusEl.textContent = 'Could not save.';
  }
}

document.getElementById('founder1Form').addEventListener('submit', (e) => {
  e.preventDefault();
  saveFounderFields('founder_1', {
    name: document.getElementById('f1Name').value,
    role: document.getElementById('f1Role').value,
    bio: document.getElementById('f1Bio').value
  });
});

document.getElementById('founder2Form').addEventListener('submit', (e) => {
  e.preventDefault();
  saveFounderFields('founder_2', {
    name: document.getElementById('f2Name').value,
    role: document.getElementById('f2Role').value,
    bio: document.getElementById('f2Bio').value
  });
});

// ---------- GALLERY ----------
async function loadGalleryAdmin() {
  const res = await apiFetch('/api/gallery');
  const items = await res.json();
  const list = document.getElementById('galleryList');
  list.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'admin-list-item';
    row.innerHTML = `
      <div class="row-left">
        <img src="${item.image_url}" alt="">
        <div class="text"><p>${item.title || '(untitled)'}</p><span class="meta">${item.description || ''}</span></div>
      </div>
      <button class="btn-delete" data-id="${item.id}">Delete</button>
    `;
    row.querySelector('.btn-delete').addEventListener('click', async () => {
      await apiFetch('/api/gallery/' + item.id, { method: 'DELETE', headers: authHeaders() });
      loadGalleryAdmin();
    });
    list.appendChild(row);
  });
}

// ---------- TESTIMONIALS ----------
document.getElementById('testimonialForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const quote = document.getElementById('tQuote').value;
  const client_name = document.getElementById('tClient').value;
  const event_label = document.getElementById('tEvent').value;
  await apiFetch('/api/testimonials', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ quote, client_name, event_label })
  });
  e.target.reset();
  loadTestimonialsAdmin();
});

async function loadTestimonialsAdmin() {
  const res = await apiFetch('/api/testimonials');
  const items = await res.json();
  const list = document.getElementById('testimonialList');
  list.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'admin-list-item';
    row.innerHTML = `
      <div class="row-left">
        <div class="text"><p>"${item.quote}"</p><span class="meta">${item.client_name}${item.event_label ? ', ' + item.event_label : ''}</span></div>
      </div>
      <button class="btn-delete" data-id="${item.id}">Delete</button>
    `;
    row.querySelector('.btn-delete').addEventListener('click', async () => {
      await apiFetch('/api/testimonials/' + item.id, { method: 'DELETE', headers: authHeaders() });
      loadTestimonialsAdmin();
    });
    list.appendChild(row);
  });
}

// ---------- PACKAGES ----------
document.getElementById('packageForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    title: document.getElementById('pTitle').value,
    subtitle: document.getElementById('pSubtitle').value,
    price: document.getElementById('pPrice').value,
    duration: document.getElementById('pDuration').value,
    inclusions: document.getElementById('pInclusions').value
  };
  await apiFetch('/api/packages', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body)
  });
  e.target.reset();
  loadPackagesAdmin();
});

async function loadPackagesAdmin() {
  const res = await apiFetch('/api/packages');
  const items = await res.json();
  const list = document.getElementById('packageList');
  list.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'admin-list-item';
    row.innerHTML = `
      <div class="row-left">
        <div class="text"><p>${item.title} — ${item.price || 'no price set'}</p><span class="meta">${item.duration || ''}</span></div>
      </div>
      <button class="btn-delete" data-id="${item.id}">Delete</button>
    `;
    row.querySelector('.btn-delete').addEventListener('click', async () => {
      await apiFetch('/api/packages/' + item.id, { method: 'DELETE', headers: authHeaders() });
      loadPackagesAdmin();
    });
    list.appendChild(row);
  });
}

// ---------- INIT ----------
if (getToken()) {
  showDashboard();
} else {
  showLogin();
}
initCloudinary();

    
