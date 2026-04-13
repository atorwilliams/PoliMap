// government.js — Alberta Government page

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function buildSeniorCard(member, color) {
  const offsetX = member.heroPhotoOffsetX ?? 50;
  const offsetY = member.heroPhotoOffsetY ?? 20;
  const portrait = member.heroPhoto
    ? `background-image: url('${member.heroPhoto}'); background-size: cover; background-position: ${offsetX}% ${offsetY}%;`
    : '';
  const noPortrait = member.heroPhoto ? '' : ' no-portrait';

  return `
    <div class="profile-card" tabindex="0">
      <div class="profile-card-inner">

        <!-- Front -->
        <div class="profile-card-front${noPortrait}" style="${portrait}">
          <div class="profile-card-stripe" style="background:${color};"></div>
          <div class="profile-card-front-label">
            <p class="profile-card-name">${member.name}</p>
            <p class="profile-card-role">${member.role}</p>
          </div>
        </div>

        <!-- Back -->
        <div class="profile-card-back">
          <div class="profile-card-stripe" style="background:${color};"></div>
          <div class="profile-card-body">
            <p class="profile-card-name">${member.name}</p>
            <p class="profile-card-role">${member.role}</p>
            <div class="profile-card-meta">
              ${member.riding ? `<div class="profile-meta-item"><span class="profile-meta-label">Riding</span><span class="profile-meta-value">${member.riding}</span></div>` : ''}
              ${member.portfolio ? `<div class="profile-meta-item"><span class="profile-meta-label">Portfolio</span><span class="profile-meta-value">${member.portfolio}</span></div>` : ''}
              ${member.appointedDate ? `<div class="profile-meta-item"><span class="profile-meta-label">Appointed</span><span class="profile-meta-value">${formatDate(member.appointedDate)}</span></div>` : ''}
              ${member.ministryUrl ? `<div class="profile-meta-item"><span class="profile-meta-label">Ministry</span><span class="profile-meta-value"><a href="${member.ministryUrl}" target="_blank" rel="noopener" style="color:#6a8fb5;">alberta.ca →</a></span></div>` : ''}
              ${member.profileUrl ? `<div class="profile-meta-item"><span class="profile-meta-label">Profile</span><span class="profile-meta-value"><a href="${member.profileUrl}" target="_blank" rel="noopener" style="color:#6a8fb5;">View →</a></span></div>` : ''}
            </div>
          </div>
        </div>

      </div>
    </div>`;
}

function buildListRow(member, color) {
  return `
    <div class="gov-row">
      <div class="gov-row-stripe" style="background:${color};"></div>
      <span class="gov-row-name">${member.name}</span>
      <span class="gov-row-role">${member.role}</span>
      <span class="gov-row-riding">${member.riding || ''}</span>
      ${member.ministryUrl
        ? `<a href="${member.ministryUrl}" target="_blank" rel="noopener" class="gov-row-link">Ministry →</a>`
        : '<span></span>'}
    </div>`;
}

function buildColumnHeader(party, color) {
  return `
    <div class="gov-party-badge" style="border-left-color:${color};">
      <span class="gov-party-name">${party.name}</span>
      <span class="gov-party-role">${party.role}</span>
      <span class="gov-party-seats" style="color:${color};">${party.seats} seats</span>
    </div>`;
}

function buildSeatBar(ucp, ndp, total) {
  const ucpPct = (ucp.seats / total * 100).toFixed(1);
  const ndpPct = (ndp.seats / total * 100).toFixed(1);
  const otherSeats = total - ucp.seats - ndp.seats;
  const otherPct = (otherSeats / total * 100).toFixed(1);

  const bar = document.getElementById('seat-bar');
  const legend = document.getElementById('seat-legend');
  if (!bar || !legend) return;

  bar.innerHTML = `
    <div class="seat-segment" style="width:${ucpPct}%; background:${ucp.color};" title="${ucp.shortName}: ${ucp.seats}"></div>
    ${otherSeats > 0 ? `<div class="seat-segment" style="width:${otherPct}%; background:#555;" title="Other: ${otherSeats}"></div>` : ''}
    <div class="seat-segment" style="width:${ndpPct}%; background:${ndp.color};" title="${ndp.shortName}: ${ndp.seats}"></div>
  `;

  legend.innerHTML = `
    <span class="seat-legend-item"><span class="seat-dot" style="background:${ucp.color};"></span>${ucp.shortName} ${ucp.seats}</span>
    ${otherSeats > 0 ? `<span class="seat-legend-item"><span class="seat-dot" style="background:#555;"></span>Other ${otherSeats}</span>` : ''}
    <span class="seat-legend-item"><span class="seat-dot" style="background:${ndp.color};"></span>${ndp.shortName} ${ndp.seats}</span>
    <span class="seat-legend-total">of ${total} seats</span>
  `;
}

function buildPlatforms(issues, ucp, ndp) {
  const wrap = document.getElementById('platforms-wrap');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="platforms-header">
      <div class="platforms-party-label" style="color:${ucp.color};">${ucp.name}</div>
      <div class="platforms-topic-spacer"></div>
      <div class="platforms-party-label" style="color:${ndp.color};">${ndp.name}</div>
    </div>
    ${issues.map(issue => `
      <div class="platform-row">
        <div class="platform-cell platform-cell-ucp" style="border-left-color:${ucp.color};">${issue.ucp}</div>
        <div class="platform-topic">${issue.topic}</div>
        <div class="platform-cell platform-cell-ndp" style="border-right-color:${ndp.color};">${issue.ndp}</div>
      </div>
    `).join('')}
  `;
}

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

async function loadGovernment() {
  let data;
  try {
    const res = await fetch('./json/government.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    console.warn('[Government] Failed to load government.json:', err);
    return;
  }

  const { ucp, ndp, legislature, platforms } = data;

  buildSeatBar(ucp, ndp, legislature.totalSeats);

  // UCP column
  document.getElementById('ucp-header').innerHTML = buildColumnHeader(ucp, ucp.color);
  const ucpSenior = ucp.members.filter(m => m.senior);
  const ucpRest   = ucp.members.filter(m => !m.senior);
  document.getElementById('ucp-senior').innerHTML = ucpSenior.map(m => buildSeniorCard(m, ucp.color)).join('');
  document.getElementById('ucp-list').innerHTML   = ucpRest.map(m => buildListRow(m, ucp.color)).join('');

  // NDP column
  document.getElementById('ndp-header').innerHTML = buildColumnHeader(ndp, ndp.color);
  const ndpSenior = ndp.members.filter(m => m.senior);
  const ndpRest   = ndp.members.filter(m => !m.senior);
  document.getElementById('ndp-senior').innerHTML = ndpSenior.map(m => buildSeniorCard(m, ndp.color)).join('');
  document.getElementById('ndp-list').innerHTML   = ndpRest.map(m => buildListRow(m, ndp.color)).join('');

  buildPlatforms(platforms, ucp, ndp);

  // Wire up flip cards
  document.querySelectorAll('.profile-card').forEach(card => {
    card.addEventListener('click', () => card.classList.toggle('flipped'));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') card.classList.toggle('flipped');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSubNav();
  loadGovernment();
});
