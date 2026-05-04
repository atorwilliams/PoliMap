// ridings.js — Provincial riding layer, config-driven
import { pointInFeature } from './data.js';

let provincialGeoJSON = null;
let _config = null;

export function findProvincialRidingAt(lng, lat) {
  if (!provincialGeoJSON) return null;
  const found = provincialGeoJSON.features.find(f => pointInFeature(lng, lat, f));
  return found?.properties?.[_config.boundaryNameProperty] || null;
}

function addCrosshatchPattern(map) {
  const size = 14;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(30, 30, 30, 1)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'square';

  ctx.beginPath();
  ctx.moveTo(0, 0);    ctx.lineTo(size, size);
  ctx.moveTo(half, 0); ctx.lineTo(size, half);
  ctx.moveTo(0, half); ctx.lineTo(half, size);
  ctx.moveTo(size, 0); ctx.lineTo(0, size);
  ctx.moveTo(half, 0); ctx.lineTo(0, half);
  ctx.moveTo(size, half); ctx.lineTo(half, size);
  ctx.stroke();

  map.addImage('hatch-independent', ctx.getImageData(0, 0, size, size));
}

export async function initRidings(map, config) {
  _config = config;
  const prefix = config.layerPrefix;
  const nameProp = config.boundaryNameProperty;

  if (config.needsReprojection && config.projectionDef) {
    proj4.defs(config.projectionDef.name, config.projectionDef.def);
  }

  if (config.partisan) {
    addCrosshatchPattern(map);
  }

  map.addSource(`${prefix}-source`, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  try {
    const geoResponse = await fetch(config.boundaryFile);
    if (!geoResponse.ok) throw new Error(`GeoJSON fetch failed: ${geoResponse.status}`);
    let geojson = await geoResponse.json();

    if (config.needsReprojection && config.projectionDef) {
      geojson = reprojectGeoJSON(geojson, config.projectionDef.name);
    }

    geojson.features.forEach(f => {
      const v = f.properties[nameProp];
      if (v) f.properties[nameProp] = v.replace(/'/g, "'");
    });

    provincialGeoJSON = geojson;
    map.getSource(`${prefix}-source`).setData(geojson);

    map.addLayer({
      id: `${prefix}-fill`,
      type: 'fill',
      source: `${prefix}-source`,
      layout: { visibility: 'none' },
      paint: {
        'fill-color': '#D3D3D3',
        'fill-opacity': 0.35,
        'fill-outline-color': '#666666'
      }
    });

    // Independent riding hatch — only for partisan regions
    if (config.partisan) {
      map.addLayer({
        id: `${prefix}-fill-independent`,
        type: 'fill',
        source: `${prefix}-source`,
        layout: { visibility: 'none' },
        paint: {
          'fill-pattern': 'hatch-independent',
          'fill-opacity': 0.5
        },
        filter: ['==', ['get', nameProp], '']
      });
    }

    map.addLayer({
      id: `${prefix}-outline`,
      type: 'line',
      source: `${prefix}-source`,
      layout: { visibility: 'none' },
      paint: {
        'line-color': '#666666',
        'line-width': 1.2
      }
    });

    map.addLayer({
      id: `${prefix}-highlight`,
      type: 'fill',
      source: `${prefix}-source`,
      paint: {
        'fill-color': '#ffffff',
        'fill-opacity': 0.6,
        'fill-outline-color': '#000000'
      },
      layout: { visibility: 'none' },
      filter: ['==', ['get', nameProp], '']
    });

    const labelLayout = {
      'text-field': ['get', nameProp],
      'text-size': ['interpolate', ['linear'], ['zoom'], 6, 10, 11, 15],
      'text-font': ['Noto Sans Regular'],
      'text-max-width': 8,
      'text-anchor': 'center',
      'symbol-placement': 'point'
    };
    const labelPaint = {
      'text-color': '#111111',
      'text-halo-color': 'rgba(255,255,255,0.9)',
      'text-halo-width': 2
    };

    if (config.urbanKeywords && config.urbanKeywords.length) {
      // Split into urban (dense) and rural label layers
      const urbanFilter = ['any',
        ...config.urbanKeywords.map(kw => ['>=', ['index-of', kw, ['get', nameProp]], 0])
      ];
      const ruralFilter = ['!', urbanFilter];

      map.addLayer({
        id: `${prefix}-label-rural`,
        type: 'symbol',
        source: `${prefix}-source`,
        minzoom: config.ruralMinZoom ?? 6,
        filter: ruralFilter,
        layout: { visibility: 'none', ...labelLayout },
        paint: labelPaint
      });

      map.addLayer({
        id: `${prefix}-label-urban`,
        type: 'symbol',
        source: `${prefix}-source`,
        minzoom: config.urbanMinZoom ?? 9,
        filter: urbanFilter,
        layout: { visibility: 'none', ...labelLayout },
        paint: labelPaint
      });
    } else {
      // Single label layer for all ridings
      map.addLayer({
        id: `${prefix}-label-rural`,
        type: 'symbol',
        source: `${prefix}-source`,
        minzoom: config.ruralMinZoom ?? 6,
        layout: { visibility: 'none', ...labelLayout },
        paint: labelPaint
      });
    }

  } catch (err) {
    // Silent — no console output in production
  }
}

function reprojectGeoJSON(geojson, fromProj) {
  const newFeatures = geojson.features.map(feature => {
    if (!feature.geometry || !feature.geometry.coordinates) return feature;

    const newCoords = feature.geometry.coordinates.map(ring => {
      return ring.map(coord => {
        if (!Array.isArray(coord) || coord.length < 2) return coord;
        const [x, y] = coord;
        if (typeof x !== 'number' || typeof y !== 'number') return coord;
        return proj4(fromProj, 'EPSG:4326', [x, y]);
      });
    });

    return { ...feature, geometry: { ...feature.geometry, coordinates: newCoords } };
  });

  return { ...geojson, features: newFeatures };
}

export function updateRidingVisibility(map, config) {
  const prefix = config.layerPrefix;
  const zoom = map.getZoom();
  const visible = zoom >= 5.3;
  const layers = [`${prefix}-fill`, `${prefix}-outline`, `${prefix}-label-rural`];
  if (config.partisan) layers.push(`${prefix}-fill-independent`);
  if (config.urbanKeywords?.length) layers.push(`${prefix}-label-urban`);

  layers.forEach(id => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  });
}
