const officials = [
    {
        name: "Danielle Smith",
        position: "Premier of Alberta",
        party: "UCP",
        level: "provincial",
        lat: 53.5461,
        lng: -113.4938,
        bio: "Leader of the United Conservative Party."
    },
    {
        name: "Amarjeet Sohi",
        position: "Mayor of Edmonton",
        party: "Non-partisan",
        level: "municipal-edmonton",
        lat: 53.5444,
        lng: -113.4909,
        bio: "Mayor of Edmonton."
    },
    {
        name: "Rachel Notley",
        position: "MLA for Edmonton-Strathcona, Opposition Leader",
        party: "NDP",
        level: "municipal-edmonton",
        lat: 53.5204,
        lng: -113.4975,
        bio: "Former Premier, current NDP leader."
    }
];

let currentMarkers = [];

function clearMarkers() {
    currentMarkers.forEach(m => m.remove());
    currentMarkers = [];
}

export function initOfficials(map) {
    console.log('[OFFICIALS] Initialized');
}

export function updateOfficials(map) {
    clearMarkers();

    const zoom = map.getZoom();
    const bounds = map.getBounds();

    const edmontonArea = new maplibregl.LngLatBounds([-113.8, 53.3], [-113.2, 53.7]);

    officials.forEach(official => {
        let shouldShow = false;

        if (official.level === "provincial" && zoom < 8) shouldShow = true;
        else if (official.level === "municipal-edmonton" && zoom >= 10 && bounds.intersects(edmontonArea)) shouldShow = true;

        if (shouldShow) {
            const marker = new maplibregl.Marker()
                .setLngLat([official.lng, official.lat])
                .addTo(map);

            const popup = new maplibregl.Popup({ offset: 25 })
                .setHTML(`
                    <h3>${official.name}</h3>
                    <p><strong>Position:</strong> ${official.position}</p>
                    <p><strong>Party:</strong> ${official.party}</p>
                    <p>${official.bio}</p>
                `);

            marker.setPopup(popup);
            currentMarkers.push(marker);
        }
    });
}