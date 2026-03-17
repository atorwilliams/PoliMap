let currentPopup = null;
let currentSidebar = null;

function showRidingPreview(map, ridingName, lngLat, level = 'provincial') {
    console.log(`[PREVIEW] Showing ${level} preview for "${ridingName}" at`, lngLat);

    if (currentPopup) {
        currentPopup.remove();
        currentPopup = null;
    }

    const dataUrl = level === 'federal' 
        ? '/json/federal-riding-data.json'
        : '/json/ridingData.json';

    console.log(`[PREVIEW] Fetching: ${dataUrl}`);

    fetch(dataUrl)
        .then(response => {
            console.log(`[PREVIEW] Fetch status: ${response.status}`);
            if (!response.ok) throw new Error(`${level} data fetch failed: ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log(`[PREVIEW] Data loaded successfully`);

            const ridingData = data.ridings?.[ridingName];

            if (!ridingData) {
                console.warn(`[PREVIEW] No data for "${ridingName}"`);
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
            const name = official?.name || 'Unknown';

            const partyColor = data.parties?.[party]?.color || '#E0E0E0';
            const bgColor = `${partyColor}22`;

            const html = `
                <div style="text-align:center; padding:12px 16px; background:${bgColor}; border-radius:8px;">
                    ${photo ? `<img src="${photo}" style="width:110px; height:110px; border-radius:50%; object-fit:cover; margin-bottom:10px;">` : ''}
                    <h3 style="margin:8px 0 4px;">${name}</h3>
                    <p style="margin:0; color:#555; font-size:0.95em;">${role} · ${party}</p>

                    <button id="show-more-btn" style="margin-top:16px; padding:8px 18px; background:#003DA5; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">
                        Show more →
                    </button>
                </div>
            `;

            currentPopup = new maplibregl.Popup({
                closeButton: true,
                closeOnClick: false,  // ← critical: allow clicks inside popup
                offset: 10,
                className: 'preview-popup'
            })
                .setLngLat(lngLat)
                .setHTML(html)
                .addTo(map);

            console.log('[PREVIEW] Popup added to map');

            // Robust way to attach listener — retry until button exists
            const attachButtonListener = () => {
                const btn = document.getElementById('show-more-btn');
                if (btn) {
                    console.log('[PREVIEW] Show more button FOUND — attaching click listener');
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();  // stop popup from closing
                        console.log('[PREVIEW] Show more CLICKED → opening sidebar');
                        showRidingSidebar(map, ridingName, level);
                        currentPopup.remove();
                    });
                    return true;
                }
                return false;
            };

            // Try immediately + retry 3 times with increasing delay
            let attempts = 0;
            const tryAttach = () => {
                if (attachButtonListener()) return;
                attempts++;
                if (attempts < 4) {
                    setTimeout(tryAttach, 200 * attempts);  // 200ms, 400ms, 600ms
                } else {
                    console.warn('[PREVIEW] Gave up finding show-more-btn after 3 attempts');
                }
            };

            tryAttach();
        })
        .catch(err => {
            console.error('[PREVIEW] Fetch or popup error:', err);
        });
}
function showRidingSidebar(map, ridingName, level = 'provincial') {
    console.log(`[SIDEBAR] Opening for "${ridingName}" (${level})`);

    let sidebar = document.getElementById('riding-sidebar');
    if (!sidebar) {
        console.log('[SIDEBAR] Creating sidebar');
        sidebar = document.createElement('div');
        sidebar.id = 'riding-sidebar';
        sidebar.style.cssText = `
            position:fixed; top:0; right:0; width:400px; height:100%;
            background:white; box-shadow:-12px 0 40px rgba(0,0,0,0.35);
            overflow-y:auto; z-index:1003; transform:translateX(100%);
            transition:transform 0.4s ease;
        `;
        document.body.appendChild(sidebar);
    }

    const dataUrl = level === 'federal' 
        ? '/json/federal-riding-data.json'
        : '/json/ridingData.json';

    fetch(dataUrl)
        .then(r => r.json())
        .then(data => {
            const ridingData = data.ridings?.[ridingName];
            if (!ridingData) {
                sidebar.innerHTML = '<p style="padding:20px;">No data available</p>';
                sidebar.style.transform = 'translateX(0)';
                return;
            }

            const official = level === 'federal' ? ridingData.mp : ridingData.mla;
            const role = level === 'federal' ? 'MP' : 'MLA';
            const party = official?.party || 'N/A';
            const photo = official?.photo || '';
            const name = official?.name || 'Unknown';
            const profileUrl = official?.profileUrl || '#';

            const partyColor = data.parties?.[party]?.color || '#ccc';
            const bgColor = `${partyColor}22`;

            sidebar.innerHTML = `
                <div style="padding:24px; font-family:Arial,sans-serif;">
                    <button id="sidebar-close-btn" style="position:absolute;top:16px;right:20px;font-size:36px;background:none;border:none;cursor:pointer;color:#777;">×</button>
                    <h2 style="margin:0 0 20px;">${ridingName}</h2>
                    <div style="text-align:center;padding:20px;background:${bgColor};border-radius:10px;">
                        ${photo ? `<img src="${photo}" style="width:160px;height:160px;border-radius:50%;object-fit:cover;margin-bottom:16px;border:3px solid #eee;">` : ''}
                        <h3 style="margin:0 0 8px;font-size:1.6em;">${name}</h3>
                        <p style="margin:0 0 16px;font-size:1.1em;">${role} – ${party}</p>
                        ${profileUrl !== '#' ? `<a href="${profileUrl}" target="_blank" style="display:inline-block;padding:10px 20px;background:#003DA5;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">View full profile →</a>` : ''}
                    </div>
                </div>
            `;

            console.log('[SIDEBAR] Content set – sliding in');
            sidebar.style.transform = 'translateX(0)';

            setTimeout(() => {
                const closeBtn = document.getElementById('sidebar-close-btn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        console.log('[SIDEBAR] Close clicked');
                        sidebar.style.transform = 'translateX(100%)';
                    });
                }
            }, 200);
        })
        .catch(err => {
            console.error('[SIDEBAR] Fetch error:', err);
            sidebar.innerHTML = '<p style="padding:20px;color:red;">Error loading data</p>';
            sidebar.style.transform = 'translateX(0)';
        });
}

function hideRidingSidebar() {
    const sidebar = document.getElementById('riding-sidebar');
    if (sidebar) {
        sidebar.style.transform = 'translateX(100%)';
    }
}
function showPartySidebar(map, partyKey, members, level = 'provincial') {
  console.log(`[PARTY SIDEBAR] Showing ${partyKey} (${members.length} members) for ${level}`);

  let sidebar = document.getElementById('riding-sidebar');
  if (!sidebar) {
    sidebar = document.createElement('div');
    sidebar.id = 'riding-sidebar';
    sidebar.style.cssText = `
      position:fixed; top:0; right:0; width:420px; height:100%;
      background:white; box-shadow:-10px 0 30px rgba(0,0,0,0.3);
      overflow-y:auto; z-index:1003; transform:translateX(100%);
      transition:transform 0.4s ease;
    `;
    document.body.appendChild(sidebar);
  }

  let html = `
    <div style="padding:24px; font-family:Arial,sans-serif;">
      <button id="sidebar-close-btn" style="position:absolute;top:16px;right:20px;font-size:36px;background:none;border:none;cursor:pointer;color:#777;">×</button>
      <h2 style="margin:0 0 24px;">${partyKey} – ${level === 'federal' ? 'MPs' : 'MLAs'} (${members.length})</h2>
      <div style="display:grid; grid-template-columns:1fr; gap:16px;">
  `;

  members.forEach(member => {
    const photo = member.photo ? `<img src="${member.photo}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;">` : '';
    html += `
      <div style="display:flex; align-items:center; padding:12px; background:#f8f9fa; border-radius:8px; box-shadow:0 1px 6px rgba(0,0,0,0.08);">
        ${photo}
        <div style="margin-left:16px; flex:1;">
          <h4 style="margin:0 0 4px;">${member.name}</h4>
          <p style="margin:0 0 8px; color:#555;">Riding: ${member.riding}</p>
          ${member.profileUrl !== '#' ? `<a href="${member.profileUrl}" target="_blank" style="color:#003DA5; text-decoration:none; font-weight:bold;">View profile →</a>` : ''}
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  sidebar.innerHTML = html;
  sidebar.style.transform = 'translateX(0)';

  setTimeout(() => {
    const closeBtn = document.getElementById('sidebar-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        sidebar.style.transform = 'translateX(100%)';
      });
    }
  }, 100);
}
export {
  showRidingPreview,
  showRidingSidebar,
  hideRidingSidebar,
  showPartySidebar
};