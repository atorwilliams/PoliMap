// representatives.js — Senators and Métis Settlement councils

const GROUP_COLORS = {
  'Canadian Senators Group':    '#B8962E',
  'Independent Senators Group': '#4A8FC0',
  'Progressive Senate Group':   '#8B6FC0',
  'Non-affiliated':             '#666666',
};

const SOCIAL_LABELS = {
  twitter:   'Twitter/X',
  bluesky:   'Bluesky',
  facebook:  'Facebook',
  linkedin:  'LinkedIn',
  instagram: 'Instagram',
  mastodon:  'Mastodon',
};

function groupColor(group) {
  return GROUP_COLORS[group] || '#555555';
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function buildSocialChips(social) {
  if (!social) return '';
  const chips = Object.entries(social)
    .filter(([, url]) => url)
    .map(([key, url]) => {
      const label = SOCIAL_LABELS[key] || key;
      return `<a href="${url}" target="_blank" rel="noopener" class="social-chip">${label}</a>`;
    }).join('');
  return chips ? `<div class="senator-social">${chips}</div>` : '';
}

function buildSenatorCard(senator) {
  const color   = groupColor(senator.group);
  const bgColor = color + '22';

  const emailRow = senator.email
    ? `<div class="senator-contact-row">
         <span class="senator-contact-label">Email</span>
         <a href="mailto:${senator.email}">${senator.email}</a>
       </div>` : '';

  const phoneRow = senator.phone
    ? `<div class="senator-contact-row">
         <span class="senator-contact-label">Phone</span>
         <a href="tel:${senator.phone}">${senator.phone}</a>
       </div>` : '';

  const profileRow = senator.website
    ? `<div class="senator-contact-row">
         <span class="senator-contact-label">Profile</span>
         <a href="${senator.website}" target="_blank" rel="noopener">Senate profile →</a>
       </div>` : '';

  return `
    <div class="senator-card">
      <div class="senator-card-accent" style="background:${color};"></div>
      <div class="senator-card-body">
        <p class="senator-name">${senator.name}</p>
        <span class="senator-group-badge" style="background:${bgColor}; color:${color};">${senator.group}</span>
        <p class="senator-meta">Appointed ${formatDate(senator.appointed)}</p>
        <div class="senator-divider"></div>
        <div class="senator-contacts">
          ${emailRow}${phoneRow}${profileRow}
        </div>
        ${buildSocialChips(senator.social)}
      </div>
    </div>`;
}

function buildMetisCard(settlement) {
  const chair   = settlement.council?.chair;
  const members = settlement.council?.members || [];

  const chairHtml = chair?.name ? `
    <div class="metis-member metis-chair">
      <span class="metis-member-role">Chair</span>
      <span class="metis-member-name">${chair.name}</span>
      ${chair.email ? `<a href="mailto:${chair.email}" class="metis-member-email">${chair.email}</a>` : '<span></span>'}
    </div>` : '';

  const membersHtml = members.map(m => `
    <div class="metis-member">
      <span class="metis-member-role">${m.role}</span>
      <span class="metis-member-name">${m.name}</span>
      ${m.email ? `<a href="mailto:${m.email}" class="metis-member-email">${m.email}</a>` : '<span></span>'}
    </div>`).join('');

  const phoneRow = settlement.phone
    ? `<div class="metis-contact-row">
         <span class="metis-contact-label">Phone</span>
         <a href="tel:${settlement.phone}">${settlement.phone}</a>
       </div>` : '';

  const emailRow = settlement.email
    ? `<div class="metis-contact-row">
         <span class="metis-contact-label">Email</span>
         <a href="mailto:${settlement.email}">${settlement.email}</a>
       </div>` : '';

  const websiteRow = settlement.website
    ? `<div class="metis-contact-row">
         <span class="metis-contact-label">Web</span>
         <a href="${settlement.website}" target="_blank" rel="noopener">${settlement.website.replace(/^https?:\/\//, '')}</a>
       </div>` : '';

  const addressRow = settlement.address
    ? `<div class="metis-contact-row">
         <span class="metis-contact-label">Mail</span>
         <span class="metis-address">${settlement.address}</span>
       </div>` : '';

  return `
    <div class="metis-card">
      <div class="metis-card-header">
        <div class="metis-card-title">
          <h3 class="metis-card-name">${settlement.name}</h3>
          <span class="metis-card-region">${settlement.region}</span>
        </div>
      </div>
      <div class="metis-card-body">
        <p class="metis-council-label">Settlement Council</p>
        <div class="metis-council">
          ${chairHtml}${membersHtml}
        </div>
        <div class="metis-contacts">
          ${phoneRow}${emailRow}${websiteRow}${addressRow}
        </div>
      </div>
    </div>`;
}

async function loadSenators() {
  const grid = document.getElementById('senator-grid');
  if (!grid) return;
  try {
    const res  = await fetch('./json/senators-alberta.json');
    const data = await res.json();
    grid.innerHTML = data.senators.map(buildSenatorCard).join('');
  } catch (err) {
    console.warn('[Representatives] Failed to load senators:', err);
    grid.innerHTML = '<p style="color:#555; padding:1rem; text-align:center;">Could not load senator data.</p>';
  }
}

const METIS_SLUGS = [
  'buffalo-lake', 'east-prairie', 'elizabeth', 'fishing-lake',
  'gift-lake', 'kikino', 'paddle-prairie', 'peavine',
];

async function loadMetis() {
  const grid = document.getElementById('metis-grid');
  if (!grid) return;
  try {
    const settlements = await Promise.all(
      METIS_SLUGS.map(slug =>
        fetch(`./json/metis-data/${slug}.json`).then(r => r.json())
      )
    );
    grid.innerHTML = settlements.map(buildMetisCard).join('');
  } catch (err) {
    console.warn('[Representatives] Failed to load Métis data:', err);
    grid.innerHTML = '<p style="color:#555; padding:1rem; text-align:center;">Could not load settlement data.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSenators();
  loadMetis();
});
