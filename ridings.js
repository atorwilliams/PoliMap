export async function initRidings(map) {
    console.log('[RIDINGS] Initializing...');

    proj4.defs('EPSG:3401', '+proj=tmerc +lat_0=0 +lon_0=-115 +k=0.9992 +x_0=0 +y_0=0 +ellps=GRS80 +datum=NAD83 +units=m +no_defs');
    console.log('[RIDINGS] EPSG:3401 defined');

    map.addSource('ed-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
    });

    try {
        const geoResponse = await fetch('/json/alberta-ed-ridings-wgs84.geojson');
        if (!geoResponse.ok) throw new Error(`GeoJSON fetch failed: ${geoResponse.status}`);
        let geojson = await geoResponse.json();

        function reprojectGeoJSON(geojson) {
            console.log('[REPROJ] Starting reprojection...');
            const newFeatures = geojson.features.map(feature => {
                if (!feature.geometry || !feature.geometry.coordinates) return feature;

                const newCoords = feature.geometry.coordinates.map(ring => {
                    return ring.map(coord => {
                        if (!Array.isArray(coord) || coord.length < 2) return coord;
                        const [x, y] = coord;
                        if (typeof x !== 'number' || typeof y !== 'number') return coord;
                        return proj4('EPSG:3401', 'EPSG:4326', [x, y]);
                    });
                });

                return {
                    ...feature,
                    geometry: {
                        ...feature.geometry,
                        coordinates: newCoords
                    }
                };
            });

            console.log('[REPROJ] Reprojected', newFeatures.length, 'features');
            return { ...geojson, features: newFeatures };
        }

        geojson = reprojectGeoJSON(geojson);

        map.getSource('ed-source').setData(geojson);

        map.addLayer({
            'id': 'ed-fill',
            'type': 'fill',
            'source': 'ed-source',
            'layout': { 'visibility': 'none' },
            'paint': {
                'fill-color': '#D3D3D3',
                'fill-opacity': 0.35,
                'fill-outline-color': '#666666'
            }
        });

        map.addLayer({
            'id': 'ed-outline',
            'type': 'line',
            'source': 'ed-source',
            'layout': { 'visibility': 'none' },
            'paint': {
                'line-color': '#666666',
                'line-width': 1.2
            }
        });

        map.addLayer({
            'id': 'ed-highlight',
            'type': 'fill',
            'source': 'ed-source',
            'paint': {
                'fill-color': '#ffffff',
                'fill-opacity': 0.6,
                'fill-outline-color': '#000000'
            },
            'layout': { 'visibility': 'none' },
            'filter': ['==', ['get', 'EDName2017'], '']
        });

        console.log('[RIDINGS] Provincial layers added (initially hidden)');

    } catch (err) {
        console.error('[RIDINGS] Error:', err);
    }
}

export function updateRidingVisibility(map) {
    const zoom = map.getZoom();
    const visible = zoom >= 5.3;

    ['ed-fill', 'ed-outline'].forEach(id => {
        if (map.getLayer(id)) {
            map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
        }
    });

    console.log('[ZOOM] Provincial visibility set to:', visible ? 'visible' : 'hidden', `(zoom: ${zoom.toFixed(1)})`);
}