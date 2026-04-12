// rcmpLayer.js – RCMP K Division detachment boundary layer
import { pointInFeature } from './data.js';

export const RCMP_DISTRICT_COLORS = {
  SAD: { label: 'South Alberta District',    color: '#C0392B' },
  CAD: { label: 'Central Alberta District',  color: '#2980B9' },
  WAD: { label: 'West Alberta District',     color: '#27AE60' },
  EAD: { label: 'East Alberta District',     color: '#8E44AD' },
  Other: { label: 'Other Jurisdiction',      color: '#7F8C8D' },
};

const DISTRICT_COLOR_EXPR = [
  'match', ['get', 'GEO_BNDRY1'],
  ...Object.entries(RCMP_DISTRICT_COLORS).flatMap(([key, { color }]) => [key, color]),
  '#7F8C8D'
];

// Signed area of a ring (negative = CCW in screen coords, positive = CW)
function ringSignedArea(ring) {
  let s = 0;
  for (let j = 0, k = ring.length - 1; j < ring.length; k = j++) {
    s += (ring[k][0] - ring[j][0]) * (ring[k][1] + ring[j][1]);
  }
  return s;
}

// Unsigned bbox area — used to compare feature sizes for click disambiguation
function ringBboxArea(ring) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return (maxX - minX) * (maxY - minY);
}

function featureBboxArea(feature) {
  if (!feature?.geometry) return Infinity;
  const geom = feature.geometry;
  const exteriorRings = geom.type === 'Polygon'
    ? [geom.coordinates[0]]
    : geom.coordinates.map(p => p[0]);
  return exteriorRings.reduce((sum, r) => sum + ringBboxArea(r), 0);
}

// Some features in the source GeoJSON store multiple geographically-separate exterior
// rings as a single Polygon (both CCW), which causes earcut to triangulate between
// them and render a large spurious filled triangle.  Fix: split same-winding rings
// into a proper MultiPolygon; opposite-winding rings stay as holes.
function fixMultiRingPolygons(geojson) {
  return {
    ...geojson,
    features: geojson.features.map(feature => {
      const geom = feature.geometry;
      if (geom.type !== 'Polygon' || geom.coordinates.length < 2) return feature;

      const outerSign = Math.sign(ringSignedArea(geom.coordinates[0]));
      const exteriors = geom.coordinates.filter(r => Math.sign(ringSignedArea(r)) === outerSign);
      const holes     = geom.coordinates.filter(r => Math.sign(ringSignedArea(r)) !== outerSign);

      if (exteriors.length <= 1) return feature; // already valid

      // Assign each hole to the exterior ring whose bbox contains the hole's first point
      const polygons = exteriors.map(ext => {
        const lngs = ext.map(c => c[0]), lats = ext.map(c => c[1]);
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats), maxLat = Math.max(...lats);
        const myHoles = holes.filter(h => {
          const [hx, hy] = h[0];
          return hx >= minLng && hx <= maxLng && hy >= minLat && hy <= maxLat;
        });
        return [ext, ...myHoles];
      });

      return {
        ...feature,
        geometry: { type: 'MultiPolygon', coordinates: polygons }
      };
    })
  };
}

let detachmentLookup = {};   // ProperName (lower) → detachment record
let rcmpFeatures = [];        // full processed features for area lookup

async function loadDetachmentLookup() {
  try {
    const res = await fetch('/json/rcmp-detachments.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    (data.detachments || []).forEach(d => {
      detachmentLookup[d.name.toLowerCase()] = d;
    });
  } catch (err) {
    console.warn('[RCMP Layer] Could not load detachments:', err);
  }
}

export async function initRCMP(map) {
  await loadDetachmentLookup();

  let geojson;
  try {
    const res = await fetch('/json/rcmp-boundaries.geojson');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    geojson = await res.json();
  } catch (err) {
    console.warn('[RCMP Layer] Failed to load rcmp-boundaries.geojson:', err);
    return;
  }

  // Fix bad multi-ring Polygons before passing to MapLibre
  geojson = fixMultiRingPolygons(geojson);
  rcmpFeatures = geojson.features;

  map.addSource('rcmp-source', { type: 'geojson', data: geojson, generateId: true });

  map.addLayer({
    id: 'rcmp-fill',
    type: 'fill',
    source: 'rcmp-source',
    layout: { visibility: 'none' },
    paint: {
      'fill-color': DISTRICT_COLOR_EXPR,
      'fill-opacity': 0.22,
    }
  });

  map.addLayer({
    id: 'rcmp-outline',
    type: 'line',
    source: 'rcmp-source',
    layout: {
      visibility: 'none',
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': DISTRICT_COLOR_EXPR,
      'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.5, 10, 2.5],
      'line-opacity': 0.85,
      'line-dasharray': [5, 3],
    }
  });

  map.addLayer({
    id: 'rcmp-highlight',
    type: 'fill',
    source: 'rcmp-source',
    layout: { visibility: 'none' },
    filter: ['==', ['get', 'GlobalID'], ''],
    paint: {
      'fill-color': DISTRICT_COLOR_EXPR,
      'fill-opacity': 0.45,
      'fill-outline-color': '#000000',
    }
  });

  map.addLayer({
    id: 'rcmp-label',
    type: 'symbol',
    source: 'rcmp-source',
    minzoom: 7,
    layout: {
      visibility: 'none',
      'text-field': ['get', 'ProperName'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 7, 9, 11, 12],
      'text-font': ['Noto Sans Regular'],
      'text-max-width': 8,
      'text-anchor': 'center',
      'symbol-placement': 'point',
    },
    paint: {
      'text-color': '#111111',
      'text-halo-color': 'rgba(255,255,255,0.9)',
      'text-halo-width': 1.5,
    }
  });

  // ── Interactions ────────────────────────────────────────────────────────────
  let highlightedId = null;

  map.on('mouseenter', 'rcmp-fill', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'rcmp-fill', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'rcmp-fill', (e) => {
    const all = map.queryRenderedFeatures(e.point, { layers: ['rcmp-fill'] });
    if (!all.length) return;

    // queryRenderedFeatures clips geometry to tiles; look up the full processed
    // feature by GlobalID to get an accurate size for disambiguation.
    const lookupArea = (rendered) => {
      const full = rcmpFeatures.find(f => f.properties.GlobalID === rendered.properties.GlobalID);
      return featureBboxArea(full || rendered);
    };

    // Pick the smallest detachment at the click point (most specific)
    const best = all.reduce((a, b) => lookupArea(a) <= lookupArea(b) ? a : b);
    const props = best.properties;
    const globalId = props.GlobalID;

    if (highlightedId === globalId) return;
    highlightedId = globalId;

    map.setFilter('rcmp-highlight', ['==', ['get', 'GlobalID'], globalId]);
    map.setLayoutProperty('rcmp-highlight', 'visibility', 'visible');

    showRCMPSidebar(props, () => {
      map.setLayoutProperty('rcmp-highlight', 'visibility', 'none');
      map.setFilter('rcmp-highlight', ['==', ['get', 'GlobalID'], '']);
      highlightedId = null;
    });
  });
}

export function findRCMPAt(lng, lat) {
  if (!rcmpFeatures.length) return null;
  const found = rcmpFeatures.find(f => pointInFeature(lng, lat, f));
  if (!found) return null;
  const props = found.properties;
  const district = RCMP_DISTRICT_COLORS[props.GEO_BNDRY1] || RCMP_DISTRICT_COLORS.Other;
  const det = detachmentLookup[props.ProperName?.toLowerCase()] || null;
  return {
    detachment: props.ProperName || 'Unknown Detachment',
    code: props.Two_Letter || '',
    district: district.label,
    districtColor: district.color,
    contract: props.Contract?.trim() ? `${props.Contract} Police` : 'K Division',
    phone: det?.phone || null,
    address: det?.address || null,
  };
}

export function updateRCMPVisibility(map) {
  // No zoom-threshold restriction — always show when active
}

function showRCMPSidebar(props, onClose) {
  if (window.currentSidebar) {
    window.currentSidebar.remove();
    window.currentSidebar = null;
  }

  const name     = props.ProperName || 'Unknown Detachment';
  const district = RCMP_DISTRICT_COLORS[props.GEO_BNDRY1] || RCMP_DISTRICT_COLORS.Other;
  const contract = props.Contract && props.Contract.trim()
    ? `${props.Contract} Police` : 'K Division';
  const code     = props.Two_Letter || '';

  const det = detachmentLookup[name.toLowerCase()] || null;
  const phone   = det?.phone   ? `<a href="tel:${det.phone}">${det.phone}</a>` : '—';
  const address = det?.address || '—';

  const sidebar = document.createElement('div');
  sidebar.className = 'member-detail-sidebar';

  sidebar.innerHTML = `
    <button id="sidebar-close-btn">×</button>
    <div style="height:8px; background:${district.color};"></div>
    <div class="member-info">
      <h3>${name}${code ? ` <span style="font-size:0.75em;color:#888;">(${code})</span>` : ''}</h3>
      <p class="riding">${district.label}</p>
      <div class="contact-details">
        <div class="contact-item">
          <strong>Contract Type</strong>
          <p>${contract}</p>
        </div>
        ${address !== '—' ? `
        <div class="contact-item">
          <strong>Address</strong>
          <p>${address}</p>
        </div>` : ''}
        <div class="contact-item">
          <strong>Phone</strong>
          <p>${phone}</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(sidebar);

  document.getElementById('sidebar-close-btn').addEventListener('click', () => {
    sidebar.remove();
    window.currentSidebar = null;
    onClose();
  });

  setTimeout(() => sidebar.classList.add('open'), 10);
  window.currentSidebar = sidebar;
}
