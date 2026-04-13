// judiciary.js — loads judge JSON and renders profile cards

const COURTS = [
  { key: 'cj',  grid: 'grid-cj',  list: true  },
  { key: 'kb',  grid: 'grid-kb',  list: true  },
  { key: 'ca',  grid: 'grid-ca',  list: false },
  { key: 'scc', grid: 'grid-scc', list: false },
];

const COURT_COLORS = {
  cj:  '#1B4F8C',
  kb:  '#8B1A1A',
  ca:  '#9A8240',
  scc: '#3A5070',
};

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function leaningLabel(leaning) {
  return {
    'left':         'Left',
    'centre-left':  'Centre-Left',
    'centre':       'Centre',
    'centre-right': 'Centre-Right',
    'right':        'Right',
    'unknown':      'Unknown',
  }[leaning] || 'Unknown';
}

function metaRow(label, value) {
  return `
    <div class="profile-meta-item">
      <span class="profile-meta-label">${label}</span>
      <span class="profile-meta-value">${value}</span>
    </div>`;
}

function buildCases(cases, courtKey) {
  if (!cases || cases.length === 0) return '';
  const label = courtKey === 'scc' ? 'Landmark Cases' : 'Notable Cases';
  const items = cases.map(c => `
    <div class="case-entry">
      <p class="case-entry-name">${c.name}${c.year ? ` <span class="case-year">(${c.year})</span>` : ''}</p>
      ${c.description ? `<p class="case-entry-desc">${c.description}</p>` : ''}
    </div>`).join('');
  return `<div class="cases-section"><p class="cases-label">${label}</p>${items}</div>`;
}

function buildCard(judge, courtKey) {
  const color = COURT_COLORS[courtKey] || '#444';
  const portrait = judge.portrait
    ? `background-image: url('${judge.portrait}'); background-size: cover; background-position: center top;`
    : '';
  const leaning = judge.leaning || 'unknown';
  const leaningPill = `<span class="leaning-pill leaning-${leaning}">${leaningLabel(leaning)}</span>`;
  const appointed = `${judge.appointedBy}${judge.appointingParty ? ` (${judge.appointingParty})` : ''}`;

  return `
    <div class="profile-card" tabindex="0">
      <div class="profile-card-inner">

        <!-- Front -->
        <div class="profile-card-front${judge.portrait ? '' : ' no-portrait'}" style="${portrait}">
          <div class="profile-card-stripe" style="background:${color};"></div>
          <div class="profile-card-front-label">
            <p class="profile-card-name">${judge.name}</p>
            <p class="profile-card-role">${judge.title}${judge.location ? ' · ' + judge.location : ''}</p>
          </div>
        </div>

        <!-- Back -->
        <div class="profile-card-back">
          <div class="profile-card-stripe" style="background:${color};"></div>
          <div class="profile-card-body">
            <p class="profile-card-name">${judge.name}</p>
            <p class="profile-card-role">${judge.title}${judge.location ? ' · ' + judge.location : ''}</p>
            <div class="profile-card-meta">
              ${metaRow('Appointed', formatDate(judge.appointmentDate))}
              ${metaRow('Appointed By', appointed)}
              ${metaRow('Leaning', leaningPill)}
              ${judge.knownBias ? metaRow('Known Bias', judge.knownBias) : ''}
              ${judge.notes ? metaRow('Notes', judge.notes) : ''}
            </div>
            ${buildCases(judge.notableCases, courtKey)}
          </div>
        </div>

      </div>
    </div>`;
}

function buildList(judges, courtKey) {
  const color = COURT_COLORS[courtKey] || '#444';
  const rows = judges.map(j => {
    const supernumerary = j.notes && j.notes.toLowerCase().includes('supernumerary');
    return `
      <div class="judge-row">
        <div class="judge-row-stripe" style="background:${color};"></div>
        <div class="judge-row-name">${j.name}</div>
        <div class="judge-row-title">${j.title}</div>
        <div class="judge-row-location">${j.location || '—'}</div>
        ${supernumerary ? '<div class="judge-row-badge">Supernumerary</div>' : '<div class="judge-row-badge"></div>'}
      </div>`;
  }).join('');
  return `<div class="judge-list">${rows}</div>`;
}

async function loadCourt({ key, grid, list }) {
  const gridEl = document.getElementById(grid);
  if (!gridEl) return;

  let data;
  try {
    const res = await fetch(`/json/judiciary/${key}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.warn(`[Judiciary] Failed to load ${key}.json:`, err);
    return;
  }

  const judges = data.judges || [];
  if (judges.length === 0) return;

  if (list) {
    gridEl.classList.add('judge-list-view');
    gridEl.innerHTML = buildList(judges, key);
  } else {
    gridEl.innerHTML = judges.map(j => buildCard(j, key)).join('');
    gridEl.querySelectorAll('.profile-card').forEach(card => {
      card.addEventListener('click', () => card.classList.toggle('flipped'));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') card.classList.toggle('flipped');
      });
    });
  }

  // Hide the "coming soon" placeholder for this tab
  const tabPanel = gridEl.closest('.tab-panel');
  if (tabPanel) {
    const stub = tabPanel.querySelector('.coming-soon');
    if (stub) stub.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  COURTS.forEach(loadCourt);
});
