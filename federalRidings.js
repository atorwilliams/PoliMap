import { pointInFeature } from './data.js';

let federalGeoJSON = null;

export function findFederalRidingAt(lng, lat) {
  if (!federalGeoJSON) return null;
  const found = federalGeoJSON.features.find(f => pointInFeature(lng, lat, f));
  return found?.properties?.name || null;
}

export async function initFederalRidings(map) {
  map.addSource('federal-source', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  try {
    const geoResponse = await fetch('/json/federal-ridings-wgs84.geojson');
    if (!geoResponse.ok) throw new Error(`Federal GeoJSON fetch failed: ${geoResponse.status}`);
    const geojson = await geoResponse.json();

    federalGeoJSON = geojson;
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

    map.addLayer({
      id: 'federal-label',
      type: 'symbol',
      source: 'federal-source',
      minzoom: 7,
      layout: {
        visibility: 'none',
        'text-field': ['get', 'name'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 7, 10, 11, 14],
        'text-font': ['Noto Sans Regular'],
        'text-max-width': 8,
        'text-anchor': 'center',
        'symbol-placement': 'point'
      },
      paint: {
        'text-color': '#111111',
        'text-halo-color': 'rgba(255,255,255,0.9)',
        'text-halo-width': 2
      }
    });

  } catch (err) {
    // Silent error handling
  }
}

export function updateFederalVisibility(map) {
  const zoom = map.getZoom();
  const visible = zoom >= 5.3;

  ['federal-fill', 'federal-outline', 'federal-highlight', 'federal-label'].forEach(id => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
  });
}