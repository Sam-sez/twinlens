const WHATSAPP_NUMBER = '+260 977750399';

const waLink = `https://wa.me/${WHATSAPP_NUMBER}`;
document.getElementById('whatsappTop').href = waLink;
document.getElementById('whatsappBottom').href = waLink;

const CATEGORIES = ['Weddings', 'Portraits', 'Editorial', 'Events'];
const TILE_PLAN = [
  { category: 'Weddings', big: true },
  { category: 'Portraits' },
  { category: 'Editorial' },
  { category: 'Events' },
  { category: 'Portraits' },
  { category: 'Weddings' },
  { category: 'Editorial', big: true }
];

async function loadGallery() {
  const grid = document.getElementById('galleryGrid');
  let photos = [];
  try {
    const res = await fetch('/api/gallery');
    photos = await res.json();
  } catch (e) {
    console.error('Could not load gallery', e);
  }

  const byCategory = {};
  CATEGORIES.forEach(c => byCategory[c] = photos.filter(p => p.category === c));

  TILE_PLAN.forEach((plan) => {
    const tile = document.createElement('div');
    tile.className = 'gtile' + (plan.big ? ' big' : '');
    const images = byCategory[plan.category] || [];

    if (images.length === 0) {
      const slide = document.createElement('div');
      slide.className = 'slide active';
      slide.style.background = 'linear-gradient(160deg,#221c14,#0a0908)';
      const label = document.createElement('span');
      label.className = 'slide-label';
      label.textContent = plan.category + ' — photos coming soon';
      slide.appendChild(label);
      tile.appendChild(slide);
    } else {
      images.forEach((img, idx) => {
        const slide = document.createElement('div');
        slide.className = 'slide' + (idx === 0 ? ' active' : '');
        slide.style.backgroundImage = `url(${img.image_url})`;
        const label = document.createElement('span');
        label.className = 'slide-label';
        label.textContent = plan.category;
        slide.appendChild(label);
        tile.appendChild(slide);
      });
      if (images.length > 1) {
        let current = 0;
        setInterval(() => {
          const slides = tile.querySelectorAll('.slide');
          slides[current].classList.remove('active');
          current = (current + 1) % slides.length;
          slides[current].classList.add('active');
        }, 3500 + Math.random() * 1500);
      }
    }
    grid.appendChild(tile);
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

loadGallery();
loadTestimonials();
loadPackages();
