let currentPopup = null;
let currentSidebar = null;

function showRidingPreview(map, ridingName, lngLat, level = 'provincial') {
    console.log(`[PREVIEW] Opening for "${ridingName}" (${level})`);

    if (currentPopup) {
        currentPopup.remove();
        currentPopup = null;
    }

    const dataUrl = level === 'federal' 
        ? '/federal-riding-data.json'
        : '/ridingData.json';

    console.log(`[PREVIEW] Fetching ${dataUrl}`);

    fetch(dataUrl)
        .then(r => {
            console.log(`[PREVIEW] Fetch status: ${r.status}`);
            if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
            return r.json();
        })
        .then(data => {
            const ridingData = data.ridings?.[ridingName];
            if (!ridingData) {
                console.warn(`[PREVIEW] No data for "${ridingName}"`);
                return;
            }

            const official = level === 'federal' ? ridingData.mp : ridingData.mla;
            const role = level === 'federal' ? 'MP' : 'MLA';
            const party = official?.party || 'N/A';
            const photo = official?.photo || '';
            const name = official?.name || 'Unknown';
            const profileUrl = official?.profileUrl || '#';

            const partyColor = data.parties?.[party]?.color || '#E0E0E0';
            const bgColor = `${partyColor}22`;

            const html = `
                <div style="text-align:center; padding:16px; background:${bgColor}; border-radius:8px;">
                    ${photo ? `<img src="${photo}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;margin-bottom:12px;border:2px solid #eee;">` : ''}
                    <h3 style="margin:8px 0 4px;">${name}</h3>
                    <p style="margin:0; color:#555;">${role} · ${party}</p>
                    <button id="show-more-btn" style="margin-top:16px; padding:10px 24px; background:#003DA5; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">
                        Show more →
                    </button>
                </div>
            `;

            currentPopup = new maplibregl.Popup({
                closeButton: true,
                closeOnClick: false,          // ← crucial: allow button clicks
                offset: 15,
                className: 'preview-popup'
            })
                .setLngLat(lngLat)
                .setHTML(html)
                .addTo(map);

            console.log('[PREVIEW] Popup added to map');

            // More reliable listener attachment
            const attachListener = () => {
                const btn = document.getElementById('show-more-btn');
                if (btn) {
                    console.log('[PREVIEW] Button found – attaching listener');
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('[PREVIEW] Show more clicked – opening sidebar');
                        showRidingSidebar(map, ridingName, level);
                        currentPopup.remove();
                    });
                    return true;
                }
                return false;
            };

            // Try immediately + retry twice
            if (!attachListener()) {
                setTimeout(() => {
                    if (!attachListener()) {
                        setTimeout(attachListener, 800);
                    }
                }, 400);
            }
        })
        .catch(err => console.error('[PREVIEW] Error:', err));
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
        ? '/federal-riding-data.json'
        : '/ridingData.json';

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
export {
  showRidingPreview,
  showRidingSidebar,
  hideRidingSidebar
};