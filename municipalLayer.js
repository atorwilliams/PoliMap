// municipalLayer.js – Municipal boundary layer (cities, towns, villages, etc.)
import { findProvincialRidingAt } from './ridings.js';
import { findFederalRidingAt } from './federalRidings.js';

export const MUNICIPAL_COLORS = {
  CITY:     { label: 'City',                   color: '#C0392B' },
  TOWN:     { label: 'Town',                   color: '#8E44AD' },
  VILLAGE:  { label: 'Village',                color: '#2980B9' },
  SVILLAGE: { label: 'Summer Village',         color: '#16A085' },
  RURAL:    { label: 'Municipal District',     color: '#5B8C5A' },
  INDIAN:   { label: 'First Nations Reserve',  color: '#E67E22' },
  URBSERV:  { label: 'Urban Service Area',     color: '#27AE60' },
};

export const HAMLET_COLOR = '#F0A500';

let municipalPolygonFeatures = [];
let hamletFeatures = [];

export function getMunicipalByType(type) {
  if (type === 'HAMLET') {
    return [...hamletFeatures]
      .sort((a, b) => a.properties.geonameTitled.localeCompare(b.properties.geonameTitled));
  }
  return municipalPolygonFeatures
    .filter(f => f.properties.municipalType === type)
    .sort((a, b) => a.properties.geonameTitled.localeCompare(b.properties.geonameTitled));
}

const POLYGON_FILES = [
  { file: 'CITY',     type: 'CITY'     },
  { file: 'TOWN',     type: 'TOWN'     },
  { file: 'VILLAGE',  type: 'VILLAGE'  },
  { file: 'SVILLAGE', type: 'SVILLAGE' },
  { file: 'RURAL',    type: 'RURAL'    },
  { file: 'INDIAN',   type: 'INDIAN'   },
  { file: 'urbserv',  type: 'URBSERV'  },
];

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function getCentroid(feature) {
  const geom = feature.geometry;
  if (geom.type === 'Point') return geom.coordinates;
  const ring = geom.type === 'Polygon'
    ? geom.coordinates[0]
    : geom.coordinates[0][0];
  const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
  const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
  return [lng, lat];
}

function addReserveHatchPattern(map) {
  const size = 14;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(30, 30, 30, 0.8)';
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

  map.addImage('hatch-reserve', ctx.getImageData(0, 0, size, size));
}

export async function initMunicipal(map) {
  addReserveHatchPattern(map);

  // ── Load + merge all polygon sources ──────────────────────────────────────
  const merged = { type: 'FeatureCollection', features: [] };
  let hamletFeatures = [];

  await Promise.all(POLYGON_FILES.map(async ({ file, type }) => {
    try {
      const res = await fetch(`/json/municipal/${file}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      data.features.forEach(f => {
        f.properties.municipalType = type;
        f.properties.geonameTitled = toTitleCase(f.properties.GEONAME || '');
        merged.features.push(f);
      });
    } catch (err) {
      console.warn(`[Municipal] Failed to load ${file}.json:`, err);
    }
  }));

  municipalPolygonFeatures = merged.features;
  map.addSource('municipal-source', { type: 'geojson', data: merged, generateId: true });

  // Color match expression driven by municipalType
  const colorMatch = ['match', ['get', 'municipalType'],
    ...Object.entries(MUNICIPAL_COLORS).flatMap(([key, { color }]) => [key, color]),
    '#999999'
  ];

  map.addLayer({
    id: 'municipal-fill',
    type: 'fill',
    source: 'municipal-source',
    layout: { visibility: 'none' },
    paint: {
      'fill-color': colorMatch,
      'fill-opacity': 0.3,
    }
  });

  map.addLayer({
    id: 'municipal-outline',
    type: 'line',
    source: 'municipal-source',
    layout: { visibility: 'none' },
    paint: {
      'line-color': colorMatch,
      'line-width': 1.2,
      'line-opacity': 0.85,
    }
  });

  // ── Reserve hatch overlay ─────────────────────────────────────────────────
  map.addLayer({
    id: 'municipal-fill-hatch',
    type: 'fill',
    source: 'municipal-source',
    filter: ['==', ['get', 'municipalType'], 'INDIAN'],
    layout: { visibility: 'none' },
    paint: {
      'fill-pattern': 'hatch-reserve',
      'fill-opacity': 0.6,
    }
  });

  // ── Municipality name labels ──────────────────────────────────────────────
  const labelLayout = {
    'text-field': ['get', 'geonameTitled'],
    'text-size': ['interpolate', ['linear'], ['zoom'], 7, 10, 12, 14],
    'text-font': ['Noto Sans Regular'],
    'text-max-width': 8,
    'text-anchor': 'center',
    'symbol-placement': 'point',
  };
  const labelPaint = {
    'text-color': '#111111',
    'text-halo-color': 'rgba(255,255,255,0.9)',
    'text-halo-width': 2,
  };

  // Rural/large districts — visible from zoom 7
  map.addLayer({
    id: 'municipal-label-rural',
    type: 'symbol',
    source: 'municipal-source',
    minzoom: 7,
    filter: ['==', ['get', 'municipalType'], 'RURAL'],
    layout: { visibility: 'none', ...labelLayout },
    paint: labelPaint,
  });

  // Cities, towns, villages etc — only when zoomed in
  map.addLayer({
    id: 'municipal-label-urban',
    type: 'symbol',
    source: 'municipal-source',
    minzoom: 9,
    filter: ['!=', ['get', 'municipalType'], 'RURAL'],
    layout: { visibility: 'none', ...labelLayout },
    paint: labelPaint,
  });

  // ── Hamlet point source ────────────────────────────────────────────────────
  try {
    const hamletRes = await fetch('/json/municipal/HAMLETPT.json');
    if (!hamletRes.ok) throw new Error(`HTTP ${hamletRes.status}`);
    const hamletData = await hamletRes.json();
    hamletFeatures = hamletData.features.map(f => ({
      ...f,
      properties: { ...f.properties, geonameTitled: toTitleCase(f.properties.GEONAME || '') }
    }));

    map.addSource('municipal-hamlet-source', { type: 'geojson', data: hamletData });

    map.addLayer({
      id: 'municipal-hamlet',
      type: 'circle',
      source: 'municipal-hamlet-source',
      layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3, 11, 6],
        'circle-color': HAMLET_COLOR,
        'circle-opacity': 0.85,
        'circle-stroke-color': 'rgba(0,0,0,0.4)',
        'circle-stroke-width': 0.8,
      }
    });

    map.addLayer({
      id: 'municipal-hamlet-label',
      type: 'symbol',
      source: 'municipal-hamlet-source',
      minzoom: 9,
      layout: {
        visibility: 'none',
        'text-field': ['get', 'GEONAME'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 9, 9, 12, 12],
        'text-font': ['Noto Sans Regular'],
        'text-anchor': 'top',
        'text-offset': [0, 0.6],
        'text-max-width': 8,
      },
      paint: {
        'text-color': '#111111',
        'text-halo-color': 'rgba(255,255,255,0.9)',
        'text-halo-width': 1.5,
      }
    });
  } catch (err) {
    console.warn('[Municipal] Failed to load hamlet layer:', err);
  }

  // ── Click → sidebar ───────────────────────────────────────────────────────
  const TYPE_PRIORITY = { CITY: 7, TOWN: 6, VILLAGE: 5, SVILLAGE: 4, URBSERV: 3, INDIAN: 2, RURAL: 1 };

  map.on('click', 'municipal-fill', (e) => {
    const all = map.queryRenderedFeatures(e.point, { layers: ['municipal-fill'] });
    if (!all.length) return;

    const best = all.reduce((a, b) =>
      (TYPE_PRIORITY[a.properties.municipalType] || 0) >= (TYPE_PRIORITY[b.properties.municipalType] || 0) ? a : b
    );

    const props = best.properties;
    const name = toTitleCase(props.GEONAME || 'Unknown');
    const typeLabel = MUNICIPAL_COLORS[props.municipalType]?.label || '';
    const typeColor = MUNICIPAL_COLORS[props.municipalType]?.color || '#999';
    const { lng, lat } = e.lngLat;

    const provincialRiding = findProvincialRidingAt(lng, lat);
    const federalRiding    = findFederalRidingAt(lng, lat);

    const isReserve = props.municipalType === 'INDIAN';
    showMunicipalSidebar({ name, typeLabel, typeColor, provincialRiding, federalRiding, isReserve });
  });

  map.on('mouseenter', 'municipal-fill', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'municipal-fill', () => {
    map.getCanvas().style.cursor = '';
  });
}

export function showMunicipalTypeSidebar(type, label, color, map) {
  if (window.currentSidebar) {
    window.currentSidebar.remove();
    window.currentSidebar = null;
  }

  const features = getMunicipalByType(type);
  const sidebar = document.createElement('div');
  sidebar.className = 'party-sidebar';

  const count = features.length;
  const items = features.map((f, i) => {
    const name = f.properties.geonameTitled;
    return `<div class="municipal-list-item" data-idx="${i}">${name}</div>`;
  }).join('');

  sidebar.innerHTML = `
    <button id="sidebar-close-btn">×</button>
    <div class="sidebar-content">
      <div class="municipal-list-header" style="border-left: 4px solid ${color};">
        <h3>${label}</h3>
        <span class="municipal-list-count">${count}</span>
      </div>
      <div class="municipal-list">
        ${count > 0 ? items : '<p class="municipal-list-empty">None loaded yet.</p>'}
      </div>
    </div>
  `;

  document.body.appendChild(sidebar);

  document.getElementById('sidebar-close-btn').addEventListener('click', () => {
    sidebar.remove();
    window.currentSidebar = null;
  });

  sidebar.querySelectorAll('.municipal-list-item').forEach(el => {
    el.addEventListener('click', () => {
      const feature = features[parseInt(el.dataset.idx)];
      const center = getCentroid(feature);
      if (center && map) {
        map.flyTo({ center, zoom: 10, duration: 800, essential: true });
      }
    });
  });

  setTimeout(() => sidebar.classList.add('open'), 10);
  window.currentSidebar = sidebar;
}

function showMunicipalSidebar({ name, typeLabel, typeColor, provincialRiding, federalRiding, isReserve }) {
  if (window.currentSidebar) {
    window.currentSidebar.remove();
    window.currentSidebar = null;
  }

  const sidebar = document.createElement('div');
  sidebar.className = 'member-detail-sidebar';

  const ridingRow = (label, riding) => riding
    ? `<div class="contact-item">
         <strong>${label} Riding</strong>
         <p>${riding}</p>
       </div>`
    : `<div class="contact-item">
         <strong>${label} Riding</strong>
         <p style="color:#555;">Not found</p>
       </div>`;

  const reserveNote = isReserve ? `
    <div class="contact-item" style="border-color:rgba(230,126,34,0.3); background:rgba(230,126,34,0.07);">
      <strong>Jurisdictional Note</strong>
      <p>First Nations reserves are federal land governed by band councils under the <em>Indian Act</em>. They fall outside Alberta provincial jurisdiction. Band members vote in provincial and federal elections.</p>
    </div>` : '';

  sidebar.innerHTML = `
    <button id="sidebar-close-btn">×</button>
    <div style="height:8px; background:${typeColor};"></div>
    <div class="member-info">
      <h3>${name}</h3>
      <p class="riding">${typeLabel}</p>
      <div class="contact-details">
        ${reserveNote}
        ${ridingRow('Provincial', provincialRiding)}
        ${ridingRow('Federal', federalRiding)}
      </div>
    </div>
  `;

  document.body.appendChild(sidebar);

  document.getElementById('sidebar-close-btn').addEventListener('click', () => {
    sidebar.remove();
    window.currentSidebar = null;
  });

  setTimeout(() => sidebar.classList.add('open'), 10);
  window.currentSidebar = sidebar;
}

export function updateMunicipalVisibility(map) {
  const zoom = map.getZoom();
  const visible = zoom >= 5.3;

  ['municipal-fill', 'municipal-outline'].forEach(id => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
  });
}
