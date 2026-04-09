// police.js — renders officer cards for Calgary, Edmonton, Lethbridge, Medicine Hat, First Nations

const FORCE_COLORS = {
  calgary:    { primary: '#BF0000', secondary: '#7a0000' },
  edmonton:   { primary: '#003DA5', secondary: '#002870' },
  lethbridge: { primary: '#1A5276', secondary: '#0e2f44' },
  medicinhat: { primary: '#196F3D', secondary: '#0e3d22' },
  tribal:     { primary: '#8B4513', secondary: '#5a2d0c' },
};

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTenure(start, end) {
  if (!start) return 'Unknown';
  return `${formatDate(start)} — ${end ? formatDate(end) : 'Present'}`;
}

function buildList(label, items, titleKey) {
  if (!items || items.length === 0) return '';
  const entries = items.map(c => `
    <div class="case-entry">
      <p class="case-entry-name">${c[titleKey] || ''}${c.year ? ` <span class="case-year">(${c.year})</span>` : ''}</p>
      ${c.description ? `<p class="case-entry-desc">${c.description}</p>` : ''}
    </div>`).join('');
  return `<div class="cases-section"><p class="cases-label">${label}</p>${entries}</div>`;
}

function buildCard(officer, colors) {
  const accentColor = officer.level === 1 ? colors.primary : colors.secondary;
  const name = officer.name || 'Position Vacant';
  const portrait = officer.portrait
    ? `background-image: url('${officer.portrait}'); background-size: cover; background-position: center top;`
    : '';
  const appointed = officer.appointedBy
    ? `${officer.appointedBy}${officer.appointingParty ? ` (${officer.appointingParty})` : ''}`
    : '—';

  return `
    <div class="profile-card rcmp-card-level-${officer.level}" tabindex="0">
      <div class="profile-card-inner">

        <!-- Front -->
        <div class="profile-card-front${officer.portrait ? '' : ' no-portrait'}" style="${portrait}">
          <div class="profile-card-stripe" style="background:${accentColor};"></div>
          <div class="profile-card-front-label">
            <p class="profile-card-name">${name}</p>
            <p class="profile-card-role">${officer.rank ? officer.rank + ' · ' : ''}${officer.unit || ''}</p>
          </div>
        </div>

        <!-- Back -->
        <div class="profile-card-back">
          <div class="profile-card-stripe" style="background:${accentColor};"></div>
          <div class="profile-card-body">
            <p class="profile-card-name">${name}</p>
            <p class="profile-card-role">${officer.role}</p>
            <div class="profile-card-meta">
              ${officer.rank ? `<div class="profile-meta-item"><span class="profile-meta-label">Rank</span><span class="profile-meta-value">${officer.rank}</span></div>` : ''}
              ${officer.unit ? `<div class="profile-meta-item"><span class="profile-meta-label">Unit</span><span class="profile-meta-value">${officer.unit}</span></div>` : ''}
              ${officer.location ? `<div class="profile-meta-item"><span class="profile-meta-label">Location</span><span class="profile-meta-value">${officer.location}</span></div>` : ''}
              <div class="profile-meta-item"><span class="profile-meta-label">Tenure</span><span class="profile-meta-value">${formatTenure(officer.tenureStart, officer.tenureEnd)}</span></div>
              <div class="profile-meta-item"><span class="profile-meta-label">Appointed By</span><span class="profile-meta-value">${appointed}</span></div>
              ${officer.notes ? `<div class="profile-meta-item"><span class="profile-meta-label">Notes</span><span class="profile-meta-value">${officer.notes}</span></div>` : ''}
            </div>
            ${buildList('Awards & Commendations', officer.awards, 'title')}
            ${buildList('Controversies', officer.controversies, 'title')}
          </div>
        </div>

      </div>
    </div>`;
}

function renderForce(forceKey, officers) {
  const colors = FORCE_COLORS[forceKey] || FORCE_COLORS.calgary;
  const grid = document.getElementById(`police-grid-${forceKey}`);
  const stub = document.getElementById(`police-stub-${forceKey}`);
  if (!grid) return;

  const named = officers.filter(o => o.name);
  if (named.length === 0) {
    if (stub) stub.style.display = '';
    return;
  }
  if (stub) stub.style.display = 'none';

  if (forceKey === 'tribal') {
    grid.innerHTML = `<div class="rcmp-command" style="justify-content:center;flex-wrap:wrap;">${named.map(o => buildCard(o, colors)).join('')}</div>`;
  } else {
    const level1 = named.filter(o => o.level === 1);
    const level2 = named.filter(o => o.level >= 2);
    grid.innerHTML = `
      ${level1.length ? `<div class="rcmp-command">${level1.map(o => buildCard(o, colors)).join('')}</div>` : ''}
      ${level2.length ? `
        <h2 class="rcmp-section-heading">Executive Team</h2>
        <div class="rcmp-districts">${level2.map(o => buildCard(o, colors)).join('')}</div>
      ` : ''}
    `;
  }

  grid.querySelectorAll('.profile-card').forEach(card => {
    card.addEventListener('click', () => card.classList.toggle('flipped'));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') card.classList.toggle('flipped');
    });
  });
}

async function loadPolice() {
  let data;
  try {
    const res = await fetch('/json/police.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.warn('[Police] Failed to load police.json:', err);
    return;
  }

  const forces = data.forces || {};
  const FORCE_KEYS = ['calgary', 'edmonton', 'lethbridge', 'medicinhat', 'tribal'];

  FORCE_KEYS.forEach(key => {
    const officers = forces[key]?.officers || [];
    renderForce(key, officers);
  });
}

document.addEventListener('DOMContentLoaded', loadPolice);
