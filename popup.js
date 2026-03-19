// Global sidebar reference (accessible from main.js)
let currentSidebar = null;
window.currentSidebar = currentSidebar; // expose globally

let currentPopup = null;

function showRidingPreview(map, ridingName, lngLat, level = 'provincial') {
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
        return;
      }

      const official = level === 'federal' ? ridingData.mp : ridingData.mla;
      const role = level === 'federal' ? 'MP' : 'MLA';
      const party = official?.party || '';
      const photo = official?.photo || '';
      const name = official?.name || '';

      const partyColor = data.parties?.[party]?.color || '#E0E0E0';
      const bgColor = `${partyColor}22`;

      const html = `
        <div style="text-align:center; padding:12px 16px; background:${bgColor}; border-radius:8px;">
          ${photo ? `<img src="${photo}" style="width:110px; height:110px; border-radius:50%; object-fit:cover; margin-bottom:10px;">` : ''}
          <h3 style="margin:8px 0 4px;">${name}</h3>
          <p style="margin:0; color:#555; font-size:0.95em;">${role} · ${party}</p>

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
              showMemberDetailSidebar(member, ridingName, level);
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
      showMemberDetailSidebar(member, member.riding || 'Unknown Riding', level);
      // No need to remove here — showMemberDetailSidebar will close this one
    });
  });

  setTimeout(() => sidebar.classList.add('open'), 10);

  window.currentSidebar = sidebar;
}

function showMemberDetailSidebar(member, ridingName, level) {
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