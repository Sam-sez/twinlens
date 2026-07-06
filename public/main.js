
const WHATSAPP_NUMBER = '+260 977750399';

const waLink = `https://wa.me/${WHATSAPP_NUMBER}`;
document.getElementById('whatsappTop').href = waLink;
document.getElementById('whatsappBottom').href = waLink;

async function loadHero() {
  try {
    const res = await fetch('/api/settings');
    const settings = await res.json();
    const left = document.getElementById('heroLeft');
    const right = document.getElementById('heroRight');
    if (settings.hero_left) {
      left.style.backgroundImage =
        `linear-gradient(180deg, rgba(11,11,10,0.15) 0%, rgba(11,11,10,0.85) 100%), url(${settings.hero_left})`;
      left.style.backgroundSize = 'cover';
      left.style.backgroundPosition = 'center';
    }
    if (settings.hero_right) {
      right.style.backgroundImage =
        `linear-gradient(180deg, rgba(11,11,10,0.15) 0%, rgba(11,11,10,0.85) 100%), url(${settings.hero_right})`;
      right.style.backgroundSize = 'cover';
      right.style.backgroundPosition = 'center';
    }
  } catch (e) {
    console.error('Could not load hero settings', e);
  }
}

async function loadGallery() {
  const grid = document.getElementById('galleryGrid');
  let photos = [];
  try {
    const res = await fetch('/api/gallery');
    photos = await res.json();
  } catch (e) {
    console.error('Could not load gallery', e);
  }

  if (photos.length === 0) {
    grid.innerHTML = `<p style="color:var(--stone);font-size:14px;">Photos coming soon.</p>`;
    return;
  }

  photos.forEach(photo => {
    const card = document.createElement('div');
    card.className = 'gcard';
    card.innerHTML = `
      <div class="photo" style="background-image:url(${photo.image_url})"></div>
      <div class="caption">
        ${photo.title ? `<h4>${escapeHtml(photo.title)}</h4>` : ''}
        ${photo.description ? `<p>${escapeHtml(photo.description)}</p>` : ''}
      </div>
    `;
    grid.appendChild(card);
  });
}

async function loadTestimonials() {
  const track = document.getElementById('testimonialTrack');
  const dotsWrap = document.getElementById('testimonialDots');
  let items = [];
  try {
    const res = await fetch('/api/testimonials');
    items = await res.json();
  } catch (e) {
    console.error('Could not load testimonials', e);
  }
  if (items.length === 0) return;

  items.forEach((t, i) => {
    const slide = document.createElement('div');
    slide.className = 't-slide' + (i === 0 ? ' active' : '');
    slide.innerHTML = `<p>"${escapeHtml(t.quote)}"</p><div class="who">— ${escapeHtml(t.client_name)}${t.event_label ? ', ' + escapeHtml(t.event_label) : ''}</div>`;
    track.appendChild(slide);

    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => showTestimonial(i));
    dotsWrap.appendChild(dot);
  });

  let current = 0;
  function showTestimonial(i) {
    const slides = track.querySelectorAll('.t-slide');
    slides[current].classList.remove('active');
    dotsWrap.children[current].classList.remove('active');
    current = i;
    slides[current].classList.add('active');
    dotsWrap.children[current].classList.add('active');
  }
  if (items.length > 1) {
    setInterval(() => showTestimonial((current + 1) % items.length), 6000);
  }
}

async function loadPackages() {
  const grid = document.getElementById('packagesGrid');
  let items = [];
  try {
    const res = await fetch('/api/packages');
    items = await res.json();
  } catch (e) {
    console.error('Could not load packages', e);
  }
  items.forEach(p => {
    const card = document.createElement('div');
    card.className = 'package-card';
    card.innerHTML = `
      <span class="subtitle">${escapeHtml(p.subtitle || '')}</span>
      <h3>${escapeHtml(p.title)}</h3>
      <div class="price">${escapeHtml(p.price || '')}</div>
      <div class="duration">${escapeHtml(p.duration || '')}</div>
      <div class="inclusions">${escapeHtml(p.inclusions || '')}</div>
    `;
    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadHero();
loadGallery();
loadTestimonials();
loadPackages();
