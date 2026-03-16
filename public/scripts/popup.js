let currentPopup = null;
let currentRidingName = null;

export function showRidingPreview(map, ridingName, lngLat) {
    console.log('[PREVIEW] Showing preview for riding:', ridingName);

    if (currentPopup) {
        currentPopup.remove();
        currentPopup = null;
    }

    currentRidingName = ridingName;

    fetch('/ridingData.json')
        .then(response => {
            if (!response.ok) throw new Error(`ridingData fetch failed: ${response.status}`);
            return response.json();
        })
        .then(data => {
            console.log('[PREVIEW] ridingData loaded');

            // New lookup: data.ridings[ridingName]
            const ridingData = data.ridings?.[ridingName];

            if (!ridingData || !ridingData.mla) {
                console.warn('[PREVIEW] No MLA data for:', ridingName);
                currentPopup = new maplibregl.Popup({
                    closeButton: true,
                    closeOnClick: true,
                    offset: 10,
                    className: 'preview-popup'
                })
                    .setLngLat(lngLat)
                    .setHTML(`<h4>${ridingName}</h4><p>No data available</p>`)
                    .addTo(map);
                return;
            }

            const mla = ridingData.mla;
            const photo = mla.photo || '';
            const name = mla.name || 'Unknown';
            const party = mla.party || '';
            const role = mla.role || 'MLA';

            const partyColor = data.parties?.[party]?.color || '#E0E0E0';
            const bgColor = `${partyColor}22`;

            let html = `
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
                closeOnClick: false,
                offset: 15,
                className: 'preview-popup'
            })
                .setLngLat(lngLat)
                .setHTML(html)
                .addTo(map);

            setTimeout(() => {
                const btn = document.getElementById('show-more-btn');
                if (btn) {
                    btn.addEventListener('click', () => {
                        currentPopup.remove();
                        currentPopup = null;
                        showRidingSidebar(ridingName, data);
                    });
                }
            }, 100);

            currentPopup.on('close', () => {
                hideRidingSidebar();
            });
        })
        .catch(err => {
            console.error('[PREVIEW] Error:', err);
        });
}

function showRidingSidebar(ridingName, data) {
    const ridingData = data.ridings?.[ridingName];
    if (!ridingData || !ridingData.mla) return;

    const mla = ridingData.mla;
    const partyColor = data.parties?.[mla.party]?.color || '#E0E0E0';
    const bgColor = `${partyColor}22`;

    let html = `
        <div id="sidebar-content" style="position:relative; padding:24px 20px; height:100%; box-sizing:border-box;">
            <button id="sidebar-close-btn" style="position:absolute; top:12px; right:16px; background:none; border:none; font-size:28px; cursor:pointer; color:#555;">×</button>

            <h2 style="margin:0 0 20px; font-size:1.6em;">${ridingName}</h2>

            <div class="official-card" style="text-align:center; margin-bottom:30px; padding:16px; border-radius:8px; background:${bgColor}; cursor:pointer; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                ${mla.photo ? `<img src="${mla.photo}" style="width:140px; height:140px; border-radius:50%; object-fit:cover; margin-bottom:12px; border:2px solid #eee;">` : ''}
                <h3 style="margin:8px 0 4px;">${mla.name || 'Unknown MLA'}</h3>
                <p style="margin:0; color:#444; font-size:1.05em;">MLA – ${mla.party || 'N/A'}</p>
            </div>
        </div>
    `;

    let sidebar = document.getElementById('riding-sidebar');
    if (!sidebar) {
        sidebar = document.createElement('div');
        sidebar.id = 'riding-sidebar';
        sidebar.style.position = 'fixed';
        sidebar.style.top = '0';
        sidebar.style.right = '0';
        sidebar.style.width = '380px';
        sidebar.style.height = '100%';
        sidebar.style.background = 'white';
        sidebar.style.boxShadow = '-6px 0 20px rgba(0,0,0,0.25)';
        sidebar.style.overflowY = 'auto';
        sidebar.style.zIndex = '1001';
        sidebar.style.transform = 'translateX(100%)';
        sidebar.style.transition = 'transform 0.3s ease';
        document.body.appendChild(sidebar);
    }

    sidebar.innerHTML = html;
    sidebar.style.transform = 'translateX(0)';

    setTimeout(() => {
        const closeBtn = document.getElementById('sidebar-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideRidingSidebar);
        }
    }, 100);
}

export function hideRidingSidebar() {
    const sidebar = document.getElementById('riding-sidebar');
    if (sidebar) {
        sidebar.style.transform = 'translateX(100%)';
    }
}