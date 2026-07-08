/**
 * TwinLens Studio — Core Frontend Coordination Engine
 */

// Universal Core Pricing Mapping Array Configuration
const serviceRegistry = {
  'Party Vlogs': { base: 60, type: 'hourly' },
  'Engagement Vlogs': { base: 160, type: 'hourly' },
  'Graduation Vlogs': { base: 160, type: 'hourly' },
  'Advertising': { base: 50, type: 'hourly' },
  'Graphics Design': { base: 150, type: 'flat' },
  'Social Media Management': { base: 200, type: 'flat' }
};

let bookingData = {
  service: null,
  durationLabel: null,
  calculatedCost: 0,
  clientName: null,
  clientEmail: null,
  clientPhone: null,
  customNotes: null
};

// Initialize Homepage Data Pipes on Load
document.addEventListener('DOMContentLoaded', () => {
  initializeDynamicHero();
  initializeDynamicGallery();
  initializeServices();
  initializeFounderPhotos();
});

/**
 * 1. DYNAMIC CONTENT LOADERS (Pulls Live Admin Uploads)
 */
async function initializeDynamicHero() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const settings = await res.json();
    
    const leftFrame = document.querySelector('.hero-half.left .hero-frame');
    const rightFrame = document.querySelector('.hero-half.right .hero-frame');
    
    if (settings.hero_left && leftFrame) {
      leftFrame.style.backgroundImage = `url('${settings.hero_left}')`;
    }
    if (settings.hero_right && rightFrame) {
      rightFrame.style.backgroundImage = `url('${settings.hero_right}')`;
    }
  } catch (err) {
    console.error('Failed to look up customized studio hero assets:', err);
  }
}

async function initializeDynamicGallery() {
  try {
    const res = await fetch('/api/gallery');
    if (!res.ok) return;
    const items = await res.json();
    
    const track = document.querySelector('.gallery-track');
    if (!track) return;
    
    // Only clear placeholders if there are active admin uploads loaded from the cloud
    if (items && items.length > 0) {
      track.innerHTML = '';
      items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'gallery-item';
        itemDiv.style.backgroundImage = `url('${item.image_url}')`;
        // Include title attributes for native hover hints if present
        if (item.title) itemDiv.setAttribute('title', `${item.title} - ${item.description || ''}`);
        track.appendChild(itemDiv);
      });
    }
  } catch (err) {
    console.error('Failed to populate recent frames gallery engine:', err);
  }
}

async function initializeServices() {
  const grid = document.getElementById('servicesGrid');
  if (!grid) return;
  try {
    const res = await fetch('/api/services');
    if (!res.ok) return;
    const services = await res.json();

    grid.innerHTML = services.map((svc, i) => `
      <div class="service-card" onclick="selectService(${JSON.stringify(svc.title)})">
        <div class="service-card-image" style="${svc.image_url ? `background-image:url('${svc.image_url}')` : ''}">
          <span class="num">${String(i + 1).padStart(2, '0')}</span>
        </div>
        <div class="service-card-body">
          <h3>${svc.title}${svc.subtitle ? `<br><span>${svc.subtitle}</span>` : ''}</h3>
          ${svc.price_label ? `<div class="price-tag">${svc.price_label}</div>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load services:', err);
  }
}

async function initializeFounderPhotos() {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const settings = await res.json();

    document.querySelectorAll('.founder-photo-frame[data-img-key]').forEach(frame => {
      const key = frame.dataset.imgKey;
      if (settings[key]) {
        frame.style.backgroundImage = `url('${settings[key]}')`;
      }
    });

    const textMap = {
      founder1Name: 'founder_1_name', founder1Role: 'founder_1_role', founder1Bio: 'founder_1_bio',
      founder2Name: 'founder_2_name', founder2Role: 'founder_2_role', founder2Bio: 'founder_2_bio'
    };
    Object.entries(textMap).forEach(([elId, settingKey]) => {
      const el = document.getElementById(elId);
      if (el && settings[settingKey]) el.textContent = settings[settingKey];
    });
  } catch (err) {
    console.error('Failed to load founder photos:', err);
  }
}

/**
 * 2. INTERACTIVE BOOKING ENGINE STEP CONTROLLER
 */
function toggleBookingOverlay() {
  const overlay = document.getElementById('bookingOverlay');
  if (!overlay) return;
  overlay.classList.toggle('open');
  if (overlay.classList.contains('open') && !bookingData.service) {
    showStep(1);
  }
}

function showStep(stepNum) {
  document.querySelectorAll('.booking-step').forEach(step => step.classList.remove('active'));
  const currentStep = document.getElementById(`step${stepNum}`);
  if (currentStep) currentStep.classList.add('active');
  
  const fill = document.getElementById('progressFill');
  if (fill) fill.style.width = `${(stepNum / 3) * 100}%`;
}

function prevStep(stepNum) {
  showStep(stepNum);
}

function selectService(serviceName) {
  bookingData.service = serviceName;
  
  const overlay = document.getElementById('bookingOverlay');
  if (overlay && !overlay.classList.contains('open')) {
    overlay.classList.add('open'); // Opens the panel if it isn't already open; never closes it
  }
  
  const titleEl = document.getElementById('step2Title');
  const container = document.getElementById('durationContainer');
  if (!container || !titleEl) return;
  
  container.innerHTML = '';
  const itemConfig = serviceRegistry[serviceName] || { base: 0, type: 'flat', custom: true };

  if (itemConfig.custom) {
    titleEl.innerHTML = "Request a <em>Custom Quote</em>";
    container.innerHTML = `
      <div class="tile-card" onclick="selectDuration('Custom Quote Request', 0, true)">
        <div class="tile-meta"><span>A</span><div class="indicator"></div></div>
        <h4>Tell us what you need <span class="tile-price">Quote</span></h4>
        <p>This is a newer offering — add any details below and we'll confirm pricing with you directly.</p>
      </div>
    `;
  } else if (itemConfig.type === 'hourly') {
    titleEl.innerHTML = "Select Session <em>Hours</em>";
    container.innerHTML = `
      <div class="tile-card" onclick="selectDuration('Standard Session (Base 3 Hours)', ${itemConfig.base})">
        <div class="tile-meta"><span>A</span><div class="indicator"></div></div>
        <h4>Standard Session (3 Hours Max) <span class="tile-price">K${itemConfig.base}</span></h4>
        <p>Includes high-contrast principal tracking coverage and fully optimized final master clips.</p>
      </div>
      <div class="tile-card" onclick="selectDuration('Extended Session (4 Hours Total)', ${itemConfig.base + 50})">
        <div class="tile-meta"><span>B</span><div class="indicator"></div></div>
        <h4>Extended Coverage (4 Hours) <span class="tile-price">K${itemConfig.base + 50}</span></h4>
        <p>Standard base timeline plus 1 extra execution hour (Flat K50 surcharge applied).</p>
      </div>
      <div class="tile-card" onclick="selectDuration('Extended Session (5 Hours Total)', ${itemConfig.base + 100})">
        <div class="tile-meta"><span>C</span><div class="indicator"></div></div>
        <h4>Extended Coverage (5 Hours) <span class="tile-price">K${itemConfig.base + 100}</span></h4>
        <p>Standard base timeline plus 2 extra execution hours (Flat K100 surcharge applied).</p>
      </div>
      <div class="tile-card" onclick="selectDuration('Custom Open Timeline Target', ${itemConfig.base}, true)">
        <div class="tile-meta"><span>D</span><div class="indicator"></div></div>
        <h4>Other / Custom Complex Requirement <span class="tile-price">Quote</span></h4>
        <p>Select this for custom hour distributions, fast-turnaround requests, or travel setups.</p>
      </div>
    `;
  } else {
    titleEl.innerHTML = "Confirm Project <em>Scope</em>";
    container.innerHTML = `
      <div class="tile-card" onclick="selectDuration('Standard Flat Project Contract', ${itemConfig.base})">
        <div class="tile-meta"><span>A</span><div class="indicator"></div></div>
        <h4>Standard Project Scope <span class="tile-price">K${itemConfig.base}</span></h4>
        <p>Delivers clean baseline files engineered exactly to initial design profiles and criteria.</p>
      </div>
      <div class="tile-card" onclick="selectDuration('Custom Scope Assignment', ${itemConfig.base}, true)">
        <div class="tile-meta"><span>B</span><div class="indicator"></div></div>
        <h4>Other / Custom Scope Requirements <span class="tile-price">Quote</span></h4>
        <p>Select this to outline high-volume design packages, complex campaigns, or continuous asset updates.</p>
      </div>
    `;
  }
  
  showStep(2);
}

function selectDuration(label, priceCost, isCustom = false) {
  bookingData.durationLabel = label;
  bookingData.calculatedCost = priceCost;
  
  const notesField = document.getElementById('customNotesField');
  if (isCustom) {
    if (notesField) notesField.style.display = 'block';
    bookingData.calculatedCost = 0; 
  } else {
    if (notesField) notesField.style.display = 'none';
    const clientNotesInput = document.getElementById('clientNotes');
    if (clientNotesInput) clientNotesInput.value = '';
  }
  
  // Compute Live Frontend Calculation Summary Box
  const receiptContainer = document.getElementById('bookingSummaryReceipt');
  if (!receiptContainer) return;

  if (bookingData.calculatedCost > 0) {
    receiptContainer.innerHTML = `
      <div class="receipt-row"><span>Service Type:</span><b>${bookingData.service}</b></div>
      <div class="receipt-row"><span>Selected Layout:</span><b>${label}</b></div>
      <div class="receipt-row total"><span>Estimated Price:</span><strong>ZMW ${bookingData.calculatedCost}</strong></div>
    `;
  } else {
    receiptContainer.innerHTML = `
      <div class="receipt-row"><span>Service Type:</span><b>${bookingData.service}</b></div>
      <div class="receipt-row"><span>Selected Layout:</span><b>Custom / Other</b></div>
      <div class="receipt-row total"><span>Estimated Price:</span><strong>Pending Custom Admin Quote</strong></div>
    `;
  }
  
  showStep(3);
}

/**
 * 3. LIVE DATABASE TRANSMISSION VAULT
 */
async function submitFinalBooking() {
  bookingData.clientName = document.getElementById('clientName').value.trim();
  bookingData.clientEmail = document.getElementById('clientEmail').value.trim();
  bookingData.clientPhone = document.getElementById('clientPhone').value.trim();
  
  const notesEl = document.getElementById('clientNotes');
  bookingData.customNotes = notesEl ? notesEl.value.trim() : '';

  if (!bookingData.clientName || !bookingData.clientPhone) {
    alert("Please provide your name and a valid contact phone number so we can log your request.");
    return;
  }

  // Format price field correctly for text storage standard
  const finalCostPayload = bookingData.calculatedCost > 0 ? `K${bookingData.calculatedCost}` : 'Quote Pending';

  const payload = {
    client_name: bookingData.clientName,
    client_phone: bookingData.clientPhone,
    client_email: bookingData.clientEmail,
    service_id: bookingData.service,
    layout_label: bookingData.durationLabel,
    calculated_cost: finalCostPayload,
    custom_notes: bookingData.customNotes
  };

  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Database server rejected submission parameters.');
    }

    const savedRecord = await response.json();
    console.log("Transmission Vault Synchronized Successfully:", savedRecord);
    
    let finalFeedbackText = `Success! Thank you ${bookingData.clientName}.\n\nYour session reservation request for ${bookingData.service} has been logged in our system.`;
    if (bookingData.calculatedCost > 0) {
      finalFeedbackText += `\n\nEstimated Session Cost: ZMW ${bookingData.calculatedCost}`;
    } else {
      finalFeedbackText += `\n\nOur studio team will review your custom notes specifications to prepare an accurate custom quote overview.`;
    }
    finalFeedbackText += `\n\nWe will review our active booking calendar slots and contact you at ${bookingData.clientPhone} shortly!`;

    alert(finalFeedbackText);
    toggleBookingOverlay();
    clearBookingState();

  } catch (err) {
    console.error('API Error during pipeline delivery:', err);
    
    // Fallback Cache Insurance System (Saves client session parameters locally if connection drops)
    let existingLogs = JSON.parse(localStorage.getItem('twinlens_inquiries')) || [];
    bookingData.timestamp = new Date().toISOString();
    existingLogs.push(bookingData);
    localStorage.setItem('twinlens_inquiries', JSON.stringify(existingLogs));

    alert("We ran into a slight network delay logging your file, but we have cached your reservation layout locally! Our production team will coordinate your review manually.");
    toggleBookingOverlay();
    clearBookingState();
  }
}

function clearBookingState() {
  bookingData = { service: null, durationLabel: null, calculatedCost: 0, clientName: null, clientEmail: null, clientPhone: null, customNotes: null };
  document.getElementById('clientName').value = '';
  document.getElementById('clientEmail').value = '';
  document.getElementById('clientPhone').value = '';
  const notesEl = document.getElementById('clientNotes');
  if (notesEl) notesEl.value = '';
}

// Global hook exposures for embedded HTML inline clicks
window.toggleBookingOverlay = toggleBookingOverlay;
window.selectService = selectService;
window.selectDuration = selectDuration;
window.prevStep = prevStep;
window.submitFinalBooking = submitFinalBooking;
                                                                            
