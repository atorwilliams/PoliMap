// rcmp.js — loads RCMP officer JSON and renders hierarchy cards

const RCMP_NAVY  = '#003087';
const RCMP_GOLD  = '#B8962E';

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

function buildControversies(list) {
  return buildList('Controversies', list, 'title');
}

function buildAwards(list) {
  return buildList('Awards & Commendations', list, 'title');
}

function buildCard(officer) {
  const accentColor = officer.level === 1 ? RCMP_GOLD : RCMP_NAVY;
  const name = officer.name || 'Position Vacant';
  const portrait = officer.portrait
    ? `background-image: url('${officer.portrait}'); background-size: cover; background-position: center top;`
    : '';
  const portraitErrorScript = officer.portrait
    ? `<img src="${officer.portrait}" style="display:none" onerror="this.closest('.profile-card-front').style.backgroundImage=''; this.closest('.profile-card-front').classList.add('no-portrait');">`
    : '';
  const appointed = officer.appointedBy
    ? `${officer.appointedBy}${officer.appointingParty ? ` (${officer.appointingParty})` : ''}`
    : '—';

  return `
    <div class="profile-card rcmp-card-level-${officer.level}" tabindex="0">
      <div class="profile-card-inner">

        <!-- Front -->
        <div class="profile-card-front${officer.portrait ? '' : ' no-portrait'}" style="${portrait}">
          ${portraitErrorScript}
          <div class="profile-card-stripe" style="background:${accentColor};"></div>
          <div class="profile-card-front-label">
            <p class="profile-card-name">${name}</p>
            <p class="profile-card-role">${officer.rank ? officer.rank + ' · ' : ''}${officer.district}</p>
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
              ${officer.location ? `<div class="profile-meta-item"><span class="profile-meta-label">Location</span><span class="profile-meta-value">${officer.location}</span></div>` : ''}
              <div class="profile-meta-item"><span class="profile-meta-label">Tenure</span><span class="profile-meta-value">${formatTenure(officer.tenureStart, officer.tenureEnd)}</span></div>
              <div class="profile-meta-item"><span class="profile-meta-label">Appointed By</span><span class="profile-meta-value">${appointed}</span></div>
              ${officer.notes ? `<div class="profile-meta-item"><span class="profile-meta-label">Notes</span><span class="profile-meta-value">${officer.notes}</span></div>` : ''}
            </div>
            ${buildAwards(officer.awards)}
            ${buildControversies(officer.controversies)}
          </div>
        </div>

      </div>
    </div>`;
}

async function loadRCMP() {
  let data;
  try {
    const res = await fetch('./json/rcmp.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.warn('[RCMP] Failed to load rcmp.json:', err);
    return;
  }

  const officers = data.officers || [];
  if (officers.length === 0) return;

  const level1 = officers.filter(o => o.level === 1);
  const level2 = officers.filter(o => o.level === 2);

  const container = document.getElementById('officer-grid');
  if (!container) return;

  container.innerHTML = `
    <div class="rcmp-org-chart">
      <div class="rcmp-command">${level1.map(buildCard).join('')}</div>
      ${level2.length ? `
        <div class="rcmp-org-line-h"></div>
        <div class="rcmp-districts">${level2.map(buildCard).join('')}</div>
      ` : ''}
    </div>
  `;

  container.querySelectorAll('.profile-card').forEach(card => {
    card.addEventListener('click', () => card.classList.toggle('flipped'));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') card.classList.toggle('flipped');
    });
  });

  const stub = document.querySelector('.coming-soon');
  if (stub) stub.style.display = 'none';
}

// ── Sub-nav tab switching ──
function initSubNav() {
  const btns   = document.querySelectorAll('.sub-nav-btn');
  const panels = document.querySelectorAll('.tab-panel');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      panels.forEach(p => p.style.display = 'none');
      document.getElementById(`tab-${btn.dataset.tab}`).style.display = '';
    });
  });
}

// ── Expenses ──
let allExpenses = [];

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

function formatExpenseDate(start, end) {
  if (!start) return '—';
  const s = new Date(start).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  if (!end || end === start) return s;
  const e = new Date(end).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
  return `${s} – ${e}`;
}

function sortExpenses(expenses, mode) {
  return [...expenses].sort((a, b) => {
    if (mode === 'date-desc') return new Date(b.eventDateStart) - new Date(a.eventDateStart);
    if (mode === 'date-asc')  return new Date(a.eventDateStart) - new Date(b.eventDateStart);
    if (mode === 'amount-desc') return b.totalExpense - a.totalExpense;
    if (mode === 'amount-asc')  return a.totalExpense - b.totalExpense;
    return 0;
  });
}

function renderExpensesTable(expenses) {
  const tbody = document.getElementById('expenses-body');
  const empty = document.getElementById('expenses-empty');
  const count = document.getElementById('expenses-count');
  if (!tbody) return;

  if (expenses.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  if (count) count.textContent = `${expenses.length} record${expenses.length !== 1 ? 's' : ''}`;

  tbody.innerHTML = expenses.map((e, i) => `
    <tr class="expense-row" data-idx="${i}">
      <td class="col-ref">${e.referenceNumber || '—'}</td>
      <td>${e.officerName || '—'}</td>
      <td>${e.eventDescription || '—'}</td>
      <td class="col-date">${formatExpenseDate(e.eventDateStart, e.eventDateEnd)}</td>
      <td>${e.destination || e.location || '—'}</td>
      <td><span class="expense-cat-badge expense-cat-${e.category || 'hospitality'}">${e.category === 'travel' ? 'Travel' : 'Hospitality'}</span></td>
      <td class="col-amount">${formatCurrency(e.totalExpense)}</td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.expense-row').forEach(row => {
    row.addEventListener('click', () => {
      const sorted = sortExpenses(allExpenses, document.getElementById('expenses-sort')?.value || 'date-desc');
      showExpenseDetail(sorted[parseInt(row.dataset.idx)]);
      tbody.querySelectorAll('.expense-row').forEach(r => r.classList.remove('active'));
      row.classList.add('active');
    });
  });
}

function showExpenseDetail(e) {
  const panel = document.getElementById('expense-detail');
  if (!panel) return;

  const isTravel = e.category === 'travel';
  const locationLine = e.destination || e.location || '—';

  const travelBreakdown = isTravel ? `
    <div class="expense-detail-item expense-detail-full">
      <span class="edl">Cost Breakdown</span>
      <div class="expense-breakdown">
        ${e.airfare     ? `<div class="breakdown-row"><span>Airfare</span><span>${formatCurrency(e.airfare)}</span></div>` : ''}
        ${e.lodging     ? `<div class="breakdown-row"><span>Lodging</span><span>${formatCurrency(e.lodging)}</span></div>` : ''}
        ${e.mealsAndIncidentals ? `<div class="breakdown-row"><span>Meals & Incidentals</span><span>${formatCurrency(e.mealsAndIncidentals)}</span></div>` : ''}
        ${e.otherTransportation ? `<div class="breakdown-row"><span>Other Transportation</span><span>${formatCurrency(e.otherTransportation)}</span></div>` : ''}
        ${e.otherExpenses ? `<div class="breakdown-row"><span>Other</span><span>${formatCurrency(e.otherExpenses)}</span></div>` : ''}
        <div class="breakdown-row breakdown-total"><span>Total</span><span>${formatCurrency(e.totalExpense)}</span></div>
      </div>
    </div>` : '';

  const vendors = [
    ...(e.primaryVendors || []),
    ...(e.additionalVendors || [])
  ].join(', ') || '—';

  const hospitalityDetails = !isTravel ? `
    <div class="expense-detail-item"><span class="edl">Government Attendees</span><span>${e.governmentAttendees ?? '—'}</span></div>
    <div class="expense-detail-item"><span class="edl">Guest Attendees</span><span>${e.guestAttendees ?? '—'}</span></div>
    <div class="expense-detail-item expense-detail-full"><span class="edl">Vendors</span><span>${vendors}</span></div>` : '';

  const overlay = document.getElementById('expense-modal-overlay');
  if (overlay) overlay.style.display = 'flex';
  panel.innerHTML = `
    <div class="expense-detail-inner">
      <div class="expense-detail-header">
        <div>
          <p class="expense-detail-ref">${e.referenceNumber} · <span class="expense-cat-badge expense-cat-${e.category || 'hospitality'}">${isTravel ? 'Travel' : 'Hospitality'}</span></p>
          <p class="expense-detail-event">${e.eventDescription}</p>
        </div>
        <p class="expense-detail-amount">${formatCurrency(e.totalExpense)}</p>
      </div>
      <div class="expense-detail-grid">
        <div class="expense-detail-item"><span class="edl">Officer</span><span>${e.officerName || '—'}</span></div>
        <div class="expense-detail-item"><span class="edl">Position</span><span>${e.positionTitle || '—'}</span></div>
        <div class="expense-detail-item"><span class="edl">Date</span><span>${formatExpenseDate(e.eventDateStart, e.eventDateEnd)}</span></div>
        <div class="expense-detail-item"><span class="edl">${isTravel ? 'Destination' : 'Location'}</span><span>${locationLine}</span></div>
        ${hospitalityDetails}
        ${travelBreakdown}
        ${e.notes ? `<div class="expense-detail-item expense-detail-full"><span class="edl">Notes</span><span>${e.notes}</span></div>` : ''}
        ${e.sourceUrl ? `<div class="expense-detail-item expense-detail-full"><span class="edl">Source</span><span><a href="${e.sourceUrl}" target="_blank" rel="noopener">${e.sourceUrl}</a></span></div>` : ''}
      </div>
    </div>
  `;
}

async function loadExpenses() {
  let data;
  try {
    const res = await fetch('./json/rcmp-expenses.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.warn('[RCMP] Failed to load rcmp-expenses.json:', err);
    return;
  }
  allExpenses = data.expenses || [];
  const sortEl = document.getElementById('expenses-sort');
  const render = () => renderExpensesTable(sortExpenses(allExpenses, sortEl?.value || 'date-desc'));
  if (sortEl) sortEl.addEventListener('change', render);
  render();
}

// ── Detachments ──
let allDetachments = [];

function renderDetachments(list) {
  const tbody = document.getElementById('detachments-body');
  const count = document.getElementById('detachments-count');
  if (!tbody) return;
  if (count) count.textContent = `${list.length} detachment${list.length !== 1 ? 's' : ''}`;
  tbody.innerHTML = list.map(d => `
    <tr>
      <td class="det-name">${d.name}</td>
      <td class="det-address">${d.address}</td>
      <td class="det-phone"><a href="tel:${d.phone}">${d.phone}</a></td>
      <td class="det-fax">${d.fax || '—'}</td>
    </tr>
  `).join('');
}

async function loadDetachments() {
  let data;
  try {
    const res = await fetch('./json/rcmp-detachments.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.warn('[RCMP] Failed to load rcmp-detachments.json:', err);
    return;
  }
  allDetachments = data.detachments || [];
  renderDetachments(allDetachments);

  document.getElementById('detachments-search')?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    renderDetachments(q
      ? allDetachments.filter(d =>
          d.name.toLowerCase().includes(q) ||
          d.address.toLowerCase().includes(q)
        )
      : allDetachments
    );
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSubNav();
  loadRCMP();
  loadExpenses();
  loadDetachments();

  function closeExpenseModal() {
    const overlay = document.getElementById('expense-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    document.querySelectorAll('.expense-row').forEach(r => r.classList.remove('active'));
  }

  document.getElementById('expense-modal-close')?.addEventListener('click', closeExpenseModal);
  document.getElementById('expense-modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeExpenseModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeExpenseModal();
  });
});
