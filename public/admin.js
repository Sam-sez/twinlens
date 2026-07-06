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

// ---------- GALLERY ----------
let cloudinaryWidget = null;

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
      const category = document.getElementById('galleryCategory').value;
      const statusEl = document.getElementById('uploadStatus');
      statusEl.textContent = 'Saving...';
      try {
        await apiFetch('/api/gallery', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ image_url: result.info.secure_url, category })
        });
        statusEl.textContent = 'Photo added.';
        loadGalleryAdmin();
      } catch (e) {
        statusEl.textContent = 'Could not save photo.';
      }
    }
  });
}

document.getElementById('uploadBtn').addEventListener('click', () => {
  if (cloudinaryWidget) cloudinaryWidget.open();
  else document.getElementById('uploadStatus').textContent = 'Upload isn\'t set up yet — see the note above.';
});

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
        <div class="text"><p>${item.category}</p></div>
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
                             
