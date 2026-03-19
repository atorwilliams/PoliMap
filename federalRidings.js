export async function initFederalRidings(map) {
  map.addSource('federal-source', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  try {
    const geoResponse = await fetch('/json/federal-ridings-wgs84.geojson');
    if (!geoResponse.ok) throw new Error(`Federal GeoJSON fetch failed: ${geoResponse.status}`);
    const geojson = await geoResponse.json();

    map.getSource('federal-source').setData(geojson);

    map.addLayer({
      id: 'federal-fill',
      type: 'fill',
      source: 'federal-source',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': '#D3D3D3',  // fallback, will be updated by colouring
        'fill-opacity': 0.35,
        'fill-outline-color': '#666666'
      }
    });

    map.addLayer({
      id: 'federal-outline',
      type: 'line',
      source: 'federal-source',
      layout: { visibility: 'none' },
      paint: {
        'line-color': '#C0392B',
        'line-width': 1.5,
        'line-opacity': 0.9
      }
    });

    // Highlight layer for clicked federal riding
    map.addLayer({
      id: 'federal-highlight',
      type: 'fill',
      source: 'federal-source',
      paint: {
        'fill-color': '#ffffff',
        'fill-opacity': 0.6,
        'fill-outline-color': '#000000'
      },
      layout: { visibility: 'none' },
      filter: ['==', ['get', 'name'], '']
    });

  } catch (err) {
    // Silent error handling
  }
}

export function updateFederalVisibility(map) {
  const zoom = map.getZoom();
  const visible = zoom >= 5.3;

  ['federal-fill', 'federal-outline', 'federal-highlight'].forEach(id => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
  });
}