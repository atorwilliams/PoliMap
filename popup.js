import { loadArticles, RSS_FEEDS } from './news.js';

// ── News matching ─────────────────────────────────────────────────────────────
async function getMemberNews(member, ridingName) {
  if (!RSS_FEEDS.length) return [];
  let articles;
  try { articles = await loadArticles(); } catch (_) { return []; }

  // Build keywords: full name, last name (if distinctive), riding name
  const nameParts = (member.name || '').split(' ');
  const lastName  = nameParts[nameParts.length - 1];
  const keywords  = [
    member.name.toLowerCase(),
    ...(lastName.length > 4 ? [lastName.toLowerCase()] : []),
    ridingName.toLowerCase(),
    ridingName.toLowerCase().replace(/-/g, ' '),
  ];

  return articles
    .filter(a => {
      const text = `${a.title} ${a.description}`.toLowerCase();
      return keywords.some(kw => kw.length > 3 && text.includes(kw));
    })
    .slice(0, 3);
}

function renderMemberNews(articles) {
  if (!articles.length) {
    return `<p class="member-news-empty">No recent news found.</p>`;
  }
  return articles.map(a => `
    <a href="${a.link}" target="_blank" rel="noopener noreferrer" class="member-news-item">
      <span class="member-news-title">${a.title}</span>
      <span class="member-news-meta">${a.source} · ${a.pubDate ? new Date(a.pubDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : ''}</span>
    </a>`).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Global sidebar reference (accessible from main.js)
let currentSidebar = null;
window.currentSidebar = currentSidebar; // expose globally

let currentPopup = null;

function showRidingPreview(map, ridingName, lngLat, level = 'provincial', onClose = null) {
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }

  const dataUrl = level === 'federal' 
    ? '/json/federal-riding-data.json'
    : '/json/ridingData.json';

  fetch(dataUrl)
    .then(response => {
      if (!response.ok) throw new Error(`${level} data fetch failed: ${response.status}`);
      return response.json();
    })
    .then(data => {
      const ridingData = data.ridings?.[ridingName];
      if (!ridingData) {
        currentPopup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false,
          offset: 10,
          className: 'preview-popup'
        })
          .setLngLat(lngLat)
          .setHTML(`<h4>${ridingName}</h4><p>No ${level} data available</p>`)
          .addTo(map);
        if (onClose) currentPopup.on('close', onClose);
        return;
      }

      const official = level === 'federal' ? ridingData.mp : ridingData.mla;
      const role = level === 'federal' ? 'MP' : 'MLA';
      const party = official?.party || '';
      const photo = official?.photo || '';
      const name = official?.name || '';
      const electionDate = official?.electedDate || data.electionDate;
      const termEnd = data.termEnd;

      const partyColor = data.parties?.[party]?.color || '#E0E0E0';
      const bgColor = `${partyColor}22`;

      const html = `
        <div style="text-align:center; padding:12px 16px; background:${bgColor}; border-radius:8px;">
          ${photo ? `<img src="${photo}" style="width:110px; height:110px; border-radius:50%; object-fit:cover; margin-bottom:10px;">` : ''}
          <h3 style="margin:8px 0 4px;">${name}</h3>
          <p style="margin:0; color:#555; font-size:0.95em;">${role} · ${party}</p>
          ${electionDate ? `<p style="margin:4px 0 0; color:#888; font-size:0.82em;">Elected ${formatDate(electionDate)}${termEnd ? ` · Term ends ${formatDate(termEnd)}` : ''}</p>` : ''}

          <button id="more-info-btn" style="margin-top:16px; padding:8px 18px; background:#003DA5; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">
            Contact & Office Details →
          </button>
        </div>
      `;

      currentPopup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        offset: 10,
        className: 'preview-popup'
      })
        .setLngLat(lngLat)
        .setHTML(html)
        .addTo(map);

      if (onClose) currentPopup.on('close', onClose);

      // Retry attaching button listener (popup DOM can be slow)
      const attachButton = () => {
        const btn = document.getElementById('more-info-btn');
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            currentPopup.remove();
            currentPopup = null;

            const member = level === 'federal' ? ridingData.mp : ridingData.mla;
            if (member) {
              showMemberDetailSidebar(member, ridingName, level, data.electionDate, data.termEnd);
            }
          });
          return true;
        }
        return false;
      };

      let attempts = 0;
      const tryAttach = () => {
        if (attachButton()) return;
        attempts++;
        if (attempts < 4) setTimeout(tryAttach, 200 * attempts);
      };
      tryAttach();
    })
    .catch(err => console.error('[Preview] Error:', err));
}

function showPartySidebar(map, partyKey, members, level) {
  // Close ANY existing sidebar first
  if (window.currentSidebar) {
    window.currentSidebar.remove();
    window.currentSidebar = null;
  }

  const sidebar = document.createElement('div');
  sidebar.id = 'party-sidebar';
  sidebar.className = 'party-sidebar';

  const html = `
    <button id="sidebar-close-btn">×</button>
    <div class="sidebar-content members-list">
      ${members.map(member => {
        const hero = member.heroPhoto || member.photo || 'https://via.placeholder.com/500x300?text=Photo';
        const offsetX = member.heroPhotoOffsetX ?? 50;
        const offsetY = member.heroPhotoOffsetY ?? 50;

        const styleString = `
          background-image: url('${hero}');
          background-position: ${offsetX}% ${offsetY}%;
        `;

        return `
          <div class="member-card" data-member='${JSON.stringify(member)}'>
            <div class="card-image" style="${styleString}">
              <div class="party-stripe" style="background: ${getPartyColor(partyKey, level)};"></div>
              <div class="card-overlay"></div>
            </div>
            <div class="card-text">
              <h4>${member.name}</h4>
              <p>${member.riding}</p>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  sidebar.innerHTML = html;
  document.body.appendChild(sidebar);

  // Close button
  const closeBtn = document.getElementById('sidebar-close-btn');
  closeBtn.addEventListener('click', () => {
    sidebar.remove();
    window.currentSidebar = null;
  });

  // Card clicks (open member detail)
  sidebar.querySelectorAll('.member-card').forEach(card => {
    card.addEventListener('click', () => {
      const member = JSON.parse(card.dataset.member);
      showMemberDetailSidebar(member, member.riding || 'Unknown Riding', level, member.electionDate, member.termEnd);
      // No need to remove here — showMemberDetailSidebar will close this one
    });
  });

  setTimeout(() => sidebar.classList.add('open'), 10);

  window.currentSidebar = sidebar;
}

function showMemberDetailSidebar(member, ridingName, level, electionDate, termEnd) {
  // Close ANY existing sidebar first
  if (window.currentSidebar) {
    window.currentSidebar.remove();
    window.currentSidebar = null;
  }

  const sidebar = document.createElement('div');
  sidebar.id = 'member-detail-sidebar';
  sidebar.className = 'member-detail-sidebar';

  const partyColor = getPartyColor(member.party, level);
  const contact = member.contact || {};
  const heroImage = member.heroPhoto || member.photo || 'https://via.placeholder.com/800x600?text=Photo';

  const html = `
    <button id="sidebar-close-btn">×</button>
    
    <div class="hero-image" style="background-image: url('${heroImage}');">
      <div class="party-stripe" style="background: ${partyColor};"></div>
      <div class="image-overlay"></div>
    </div>

    <div class="member-info">
      <h3>${member.name}</h3>
      <p class="riding">Riding: ${ridingName}</p>
      ${(member.electedDate || electionDate) ? `<p class="member-term">Elected ${formatDate(member.electedDate || electionDate)}${termEnd ? ` &nbsp;·&nbsp; Term ends ${formatDate(termEnd)}` : ''}</p>` : ''}

      <div class="contact-details">
        ${contact.constituencyOffice ? `<div class="contact-item"><strong>Office</strong><p>${contact.constituencyOffice}</p></div>` : ''}
        ${contact.phone ? `<div class="contact-item"><strong>Phone</strong><p>${contact.phone}</p></div>` : ''}
        ${contact.tollFree ? `<div class="contact-item"><strong>Toll-free</strong><p>${contact.tollFree}</p></div>` : ''}
        ${contact.email ? `<div class="contact-item"><strong>Email</strong><a href="mailto:${contact.email}">${contact.email}</a></div>` : ''}
        ${contact.website ? `<div class="contact-item"><strong>Website</strong><a href="${contact.website}" target="_blank">${contact.website}</a></div>` : ''}
        ${contact.officeHours ? `<div class="contact-item"><strong>Hours</strong><p>${contact.officeHours}</p></div>` : ''}
        
        ${member.profileUrl && member.profileUrl !== '#' ? `
        <div class="contact-item">
          <a href="${member.profileUrl}" target="_blank" class="external-profile">View full legislative profile →</a>
        </div>` : ''}
      </div>

      ${buildSocialLinks(contact.social)}

      <div class="member-news-section">
        <h4 class="member-news-heading">Recent News</h4>
        <div id="member-news-results"><p class="member-news-loading">Loading…</p></div>
      </div>
    </div>
  `;

  sidebar.innerHTML = html;
  document.body.appendChild(sidebar);

  document.getElementById('sidebar-close-btn').addEventListener('click', () => {
    sidebar.remove();
    window.currentSidebar = null;
  });

  setTimeout(() => sidebar.classList.add('open'), 10);

  window.currentSidebar = sidebar;

  // Async: fetch and inject relevant news
  getMemberNews(member, ridingName).then(articles => {
    const el = document.getElementById('member-news-results');
    if (el) el.innerHTML = renderMemberNews(articles);
  });
}

function buildSocialLinks(social) {
  if (!social) return '';

  const platforms = [
    { key: 'facebook',  icon: 'facebook'  },
    { key: 'twitter',   icon: 'x'         },
    { key: 'instagram', icon: 'instagram' },
    { key: 'linkedin',  icon: null        },
    { key: 'youtube',   icon: 'youtube'   },
    { key: 'tiktok',    icon: 'tiktok'    },
    { key: 'BlueSky',   icon: 'bluesky'   },
  ];

  const links = platforms
    .filter(({ key }) => social[key])
    .map(({ key, icon }) => icon === null
      ? `<a href="${social[key]}" target="_blank" rel="noopener noreferrer" class="social-text-link">LinkedIn&#174;</a>`
      : `<a href="${social[key]}" target="_blank" rel="noopener noreferrer" aria-label="${icon}" class="social-icon-link">
          <img src="https://cdn.simpleicons.org/${icon}/ffffff" alt="${icon}" width="20" height="20">
        </a>`)
    .join('');

  return links ? `<div class="social-links">${links}</div>` : '';
}

function getPartyColor(partyKey, level) {
  const colors = {
    'NDP': '#F37021',
    'United Conservative Party': '#003DA5',
    'Conservative': '#003DA5',
  };
  return colors[partyKey] || '#666666';
}

export {
  showRidingPreview,
  showPartySidebar,
  showMemberDetailSidebar
};