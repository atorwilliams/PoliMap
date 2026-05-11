// municipalLayer.js — Municipal boundary layer, config-driven
import { findProvincialRidingAt } from './ridings.js';
import { findFederalRidingAt } from './federalRidings.js';
import { pointInFeature, loadMunicipalData, loadRidingData, loadFederalRidingData } from './data.js';

export const MUNICIPAL_COLORS = {
  CITY:                { label: 'City',                   color: '#C0392B' },
  TOWN:                { label: 'Town',                   color: '#8E44AD' },
  VILLAGE:             { label: 'Village',                color: '#2980B9' },
  HAMLET:              { label: 'Hamlet',                 color: '#F0A500' },
  SVILLAGE:            { label: 'Summer Village',         color: '#16A085' },
  RURAL:               { label: 'Rural Municipality',     color: '#5B8C5A' },
  INDIAN:              { label: 'First Nations Reserve',  color: '#E67E22' },
  URBSERV:             { label: 'Urban Service Area',     color: '#27AE60' },
  DISTRICT:            { label: 'District',               color: '#5B8C5A' },
  RESORT:              { label: 'Resort Village',         color: '#16A085' },
  REGIONAL:            { label: 'Regional District',      color: '#8B7355' },
  NORTHERN_TOWN:       { label: 'Northern Town',          color: '#1ABC9C' },
  NORTHERN_VILLAGE:    { label: 'Northern Village',       color: '#48C9B0' },
  NORTHERN_SETTLEMENT: { label: 'Northern Settlement',    color: '#76D7C4' },
  NORTHERN_COMMUNITY:  { label: 'Northern Community',     color: '#A3E4D7' },
  LGD:                 { label: 'Local Government District', color: '#8B7355' },
  MUNICIPALITY:        { label: 'Municipality',           color: '#9B59B6' },
};

export const HAMLET_COLOR = '#F0A500';

let municipalPolygonFeatures = [];
let hamletFeatures = [];
let _config = null;

export function getMunicipalByType(type) {
  if (type === 'HAMLET') {
    return [...hamletFeatures]
      .sort((a, b) => a.properties.geonameTitled.localeCompare(b.properties.geonameTitled));
  }
  return municipalPolygonFeatures
    .filter(f => f.properties.municipalType === type)
    .sort((a, b) => a.properties.geonameTitled.localeCompare(b.properties.geonameTitled));
}

const POLYGON_FILES_DEFAULT = [
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

function getBounds(feature) {
  const geom = feature.geometry;
  const coords = geom.type === 'Polygon' ? geom.coordinates.flat() : geom.coordinates.flat(2);
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  return [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]];
}

function getCentroid(feature) {
  const geom = feature.geometry;
  if (geom.type === 'Point') return geom.coordinates;
  const ring = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0];
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

export async function initMunicipal(map, config) {
  _config = config;

  // Single-file mode (e.g. BC) — one GeoJSON with all municipalities
  if (config.municipalFile) {
    return initMunicipalSingleFile(map, config);
  }

  addReserveHatchPattern(map);

  const dataPath = config.municipalDataPath;
  const polygonFiles = config.municipalPolygonFiles || POLYGON_FILES_DEFAULT;
  const geonameProp = config.municipalGeonameProperty || 'GEONAME';
  const merged = { type: 'FeatureCollection', features: [] };

  await Promise.all(polygonFiles.map(async ({ file, type }) => {
    try {
      const res = await fetch(`${dataPath}${file}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      data.features.forEach(f => {
        f.properties.municipalType = type;
        f.properties.geonameTitled = f.properties.geonameTitled || toTitleCase(f.properties[geonameProp] || '');
        merged.features.push(f);
      });
    } catch (err) {
      console.warn(`[Municipal] Failed to load ${file}.json:`, err);
    }
  }));

  municipalPolygonFeatures = merged.features;
  map.addSource('municipal-source', { type: 'geojson', data: merged, generateId: true });

  const colorMatch = ['match', ['get', 'municipalType'],
    ...Object.entries(MUNICIPAL_COLORS).flatMap(([key, { color }]) => [key, color]),
    '#999999'
  ];

  map.addLayer({
    id: 'municipal-fill',
    type: 'fill',
    source: 'municipal-source',
    layout: { visibility: 'none' },
    paint: { 'fill-color': colorMatch, 'fill-opacity': 0.3 }
  });

  map.addLayer({
    id: 'municipal-highlight',
    type: 'fill',
    source: 'municipal-source',
    filter: ['==', ['get', geonameProp], ''],
    layout: { visibility: 'none' },
    paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.5 }
  });

  map.addLayer({
    id: 'municipal-outline',
    type: 'line',
    source: 'municipal-source',
    layout: { visibility: 'none' },
    paint: { 'line-color': colorMatch, 'line-width': 1.2, 'line-opacity': 0.85 }
  });

  map.addLayer({
    id: 'municipal-fill-hatch',
    type: 'fill',
    source: 'municipal-source',
    filter: ['==', ['get', 'municipalType'], 'INDIAN'],
    layout: { visibility: 'none' },
    paint: { 'fill-pattern': 'hatch-reserve', 'fill-opacity': 0.6 }
  });

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

  map.addLayer({
    id: 'municipal-label-rural',
    type: 'symbol',
    source: 'municipal-source',
    minzoom: 7,
    filter: ['==', ['get', 'municipalType'], 'RURAL'],
    layout: { visibility: 'none', ...labelLayout },
    paint: labelPaint,
  });

  map.addLayer({
    id: 'municipal-label-urban',
    type: 'symbol',
    source: 'municipal-source',
    minzoom: 9,
    filter: ['!=', ['get', 'municipalType'], 'RURAL'],
    layout: { visibility: 'none', ...labelLayout },
    paint: labelPaint,
  });

  // ── Hamlet points ─────────────────────────────────────────────────────────
  try {
    const hamletRes = await fetch(`${dataPath}HAMLETPT.json`);
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

  // ── Click interactions ────────────────────────────────────────────────────
  const TYPE_PRIORITY = { CITY: 7, TOWN: 6, VILLAGE: 5, SVILLAGE: 4, URBSERV: 3, INDIAN: 2, RURAL: 1, DISTRICT: 3, RESORT: 4 };

  map.on('click', 'municipal-fill', (e) => {
    const all = map.queryRenderedFeatures(e.point, { layers: ['municipal-fill'] });
    if (!all.length) return;

    const best = all.reduce((a, b) =>
      (TYPE_PRIORITY[a.properties.municipalType] || 0) >= (TYPE_PRIORITY[b.properties.municipalType] || 0) ? a : b
    );

    const props = best.properties;
    const geoname = props[geonameProp] || '';
    const name = props.geonameTitled || toTitleCase(geoname) || 'Unknown';
    const typeLabel = MUNICIPAL_COLORS[props.municipalType]?.label || '';
    const typeColor = MUNICIPAL_COLORS[props.municipalType]?.color || '#999';
    const { lng, lat } = e.lngLat;

    map.setFilter('municipal-highlight', ['==', ['get', geonameProp], geoname]);
    map.setLayoutProperty('municipal-highlight', 'visibility', 'visible');

    const fullFeature = municipalPolygonFeatures.find(f => f.properties[geonameProp] === geoname);
    if (fullFeature) {
      const bounds = getBounds(fullFeature);
      map.fitBounds(bounds, { padding: 80, maxZoom: Math.min(13, map.getZoom()), duration: 800, essential: true });
    }

    const provincialRiding = findProvincialRidingAt(lng, lat);
    const federalRiding    = findFederalRidingAt(lng, lat);
    const isReserve = props.municipalType === 'INDIAN';

    showMunicipalSidebar({
      geoname, name, typeLabel, typeColor,
      provincialRiding, federalRiding, isReserve,
      config,
      onClose: () => {
        map.setFilter('municipal-highlight', ['==', ['get', geonameProp], '']);
        map.setLayoutProperty('municipal-highlight', 'visibility', 'none');
      }
    });
  });

  map.on('mouseenter', 'municipal-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'municipal-fill', () => { map.getCanvas().style.cursor = ''; });
}

async function initMunicipalSingleFile(map, config) {
  const nameProp = config.municipalNameProperty || 'ADMIN_AREA_ABBREVIATION';
  const idProp   = config.municipalIdProperty   || 'LGL_ADMIN_AREA_ID';
  const typeProp = config.municipalTypeProperty || null;
  const baseColor = config.municipalColor || '#2980B9';

  // Build MapLibre color expression — type-based if typeProp is set
  function colorExpr(opacity) {
    if (!typeProp) return baseColor;
    return ['match', ['get', typeProp],
      ...Object.entries(MUNICIPAL_COLORS).flatMap(([k, { color }]) => [k, color]),
      baseColor
    ];
  }

  try {
    const res = await fetch(config.municipalFile);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const geojson = await res.json();

    municipalPolygonFeatures = geojson.features;
    map.addSource('municipal-source', { type: 'geojson', data: geojson, generateId: true });

    map.addLayer({
      id: 'municipal-fill',
      type: 'fill',
      source: 'municipal-source',
      layout: { visibility: 'none' },
      paint: { 'fill-color': colorExpr(), 'fill-opacity': 0.25 }
    });

    // Placeholder hatch layer (required by layer registry in main.js)
    map.addLayer({
      id: 'municipal-fill-hatch',
      type: 'fill',
      source: 'municipal-source',
      filter: ['==', ['get', idProp], ''],
      layout: { visibility: 'none' },
      paint: { 'fill-opacity': 0 }
    });

    map.addLayer({
      id: 'municipal-highlight',
      type: 'fill',
      source: 'municipal-source',
      filter: ['==', ['get', idProp], ''],
      layout: { visibility: 'none' },
      paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.5 }
    });

    map.addLayer({
      id: 'municipal-outline',
      type: 'line',
      source: 'municipal-source',
      layout: { visibility: 'none' },
      paint: { 'line-color': colorExpr(), 'line-width': 1.2, 'line-opacity': 0.85 }
    });

    const labelLayout = {
      'text-field': ['get', nameProp],
      'text-size': ['interpolate', ['linear'], ['zoom'], 7, 10, 12, 13],
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

    map.addLayer({
      id: 'municipal-label-rural',
      type: 'symbol',
      source: 'municipal-source',
      minzoom: 7,
      layout: { visibility: 'none', ...labelLayout },
      paint: labelPaint,
    });

    // Placeholder urban label (required by layer registry)
    map.addLayer({
      id: 'municipal-label-urban',
      type: 'symbol',
      source: 'municipal-source',
      filter: ['==', ['get', idProp], ''],
      minzoom: 9,
      layout: { visibility: 'none', ...labelLayout },
      paint: labelPaint,
    });

    const SF_TYPE_PRIORITY = { CITY: 7, TOWN: 6, VILLAGE: 5, NORTHERN_TOWN: 5, NORTHERN_VILLAGE: 4, NORTHERN_SETTLEMENT: 3, RESORT: 4, SVILLAGE: 4, URBSERV: 3, INDIAN: 2, RURAL: 1 };

    // Click interaction
    map.on('click', 'municipal-fill', (e) => {
      const all = map.queryRenderedFeatures(e.point, { layers: ['municipal-fill'] });
      if (!all.length) return;
      const best = all.reduce((a, b) =>
        (SF_TYPE_PRIORITY[a.properties[typeProp]] || 0) >= (SF_TYPE_PRIORITY[b.properties[typeProp]] || 0) ? a : b
      );
      const props = best.properties;
      const name     = props[nameProp] || 'Unknown';
      const id       = props[idProp];
      const district = props.ADMIN_AREA_GROUP_NAME || '';
      const { lng, lat } = e.lngLat;

      const mtype      = typeProp ? props[typeProp] : null;
      const typeLabel  = MUNICIPAL_COLORS[mtype]?.label || '';
      const typeColor  = MUNICIPAL_COLORS[mtype]?.color || baseColor;

      map.setFilter('municipal-highlight', ['==', ['get', idProp], id]);
      map.setLayoutProperty('municipal-highlight', 'visibility', 'visible');

      const fullFeature = municipalPolygonFeatures.find(f => f.properties[idProp] === id);
      if (fullFeature) {
        const bounds = getBounds(fullFeature);
        map.fitBounds(bounds, { padding: 80, maxZoom: Math.min(13, map.getZoom()), duration: 800, essential: true });
      }

      const provincialRiding = findProvincialRidingAt(lng, lat);
      const federalRiding    = findFederalRidingAt(lng, lat);

      showMunicipalSidebarSimple({
        name, district, typeLabel, typeColor, provincialRiding, federalRiding, config,
        onClose: () => {
          map.setFilter('municipal-highlight', ['==', ['get', idProp], '']);
          map.setLayoutProperty('municipal-highlight', 'visibility', 'none');
        }
      });
    });

    map.on('mouseenter', 'municipal-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'municipal-fill', () => { map.getCanvas().style.cursor = ''; });

  } catch (err) {
    console.warn('[Municipal] Failed to load single-file municipal:', err);
  }
}

function showMunicipalSidebarSimple({ name, district, typeLabel, typeColor, provincialRiding, federalRiding, config, onClose }) {
  const color = typeColor || '#2980B9';
  if (window.currentSidebar) {
    window.currentSidebar.remove();
    window.currentSidebar = null;
  }

  const sidebar = document.createElement('div');
  sidebar.className = 'member-detail-sidebar';

  const ridingRow = (label, riding, elId) => `
    <div class="contact-item">
      <strong>${label} Riding</strong>
      <p>${riding || '<span style="color:#555;">Not found</span>'}</p>
      ${riding ? `<p id="${elId}" style="color:#888; font-size:0.85em; margin:2px 0 0;"></p>` : ''}
    </div>`;

  sidebar.innerHTML = `
    <button id="sidebar-close-btn">×</button>
    <div style="height:8px; background:${color};"></div>
    <div class="member-info" style="padding-top:56px;">
      <h3>${name}</h3>
      ${typeLabel ? `<p class="riding">${typeLabel}</p>` : ''}
      ${district && district !== name ? `<p class="riding" style="opacity:0.6;">${district}</p>` : ''}
      <div class="contact-details">
        ${ridingRow('Provincial', provincialRiding, 'muni-provincial-member')}
        ${ridingRow('Federal', federalRiding, 'muni-federal-member')}
      </div>
    </div>
  `;

  document.body.appendChild(sidebar);

  document.getElementById('sidebar-close-btn').addEventListener('click', () => {
    sidebar.remove();
    window.currentSidebar = null;
    document.body.classList.remove('sidebar-open');
    if (onClose) onClose();
  });

  setTimeout(() => sidebar.classList.add('open'), 10);
  document.body.classList.add('sidebar-open');
  window.currentSidebar = sidebar;

  // Load member names for the ridings
  Promise.all([
    provincialRiding ? loadRidingData().catch(() => null) : Promise.resolve(null),
    federalRiding    ? loadFederalRidingData().catch(() => null) : Promise.resolve(null),
  ]).then(([provData, fedData]) => {
    const memberKey        = config?.memberKey        || 'mla';
    const federalMemberKey = config?.federalMemberKey || 'mp';

    if (provData && provincialRiding) {
      const member = provData.ridings?.[provincialRiding]?.[memberKey];
      const el = document.getElementById('muni-provincial-member');
      if (el && member?.name) el.textContent = `${member.name}${member.party ? ` · ${member.party}` : ''}`;
    }
    if (fedData && federalRiding) {
      const mp = fedData.ridings?.[federalRiding]?.[federalMemberKey];
      const el = document.getElementById('muni-federal-member');
      if (el && mp?.name) el.textContent = `${mp.name}${mp.party ? ` · ${mp.party}` : ''}`;
    }
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
    document.body.classList.remove('sidebar-open');
  });

  sidebar.querySelectorAll('.municipal-list-item').forEach(el => {
    el.addEventListener('click', () => {
      const feature = features[parseInt(el.dataset.idx)];
      const center = getCentroid(feature);
      if (center && map) map.flyTo({ center, zoom: 10, duration: 800, essential: true });
    });
  });

  setTimeout(() => sidebar.classList.add('open'), 10);
  document.body.classList.add('sidebar-open');
  window.currentSidebar = sidebar;
}

function showMunicipalSidebar({ geoname, name, typeLabel, typeColor, provincialRiding, federalRiding, isReserve, config, onClose }) {
  if (window.currentSidebar) {
    window.currentSidebar.remove();
    window.currentSidebar = null;
  }

  const sidebar = document.createElement('div');
  sidebar.className = 'member-detail-sidebar';

  const ridingRow = (label, riding, memberId) => `
    <div class="contact-item">
      <strong>${label} Riding</strong>
      <p>${riding || '<span style="color:#555;">Not found</span>'}</p>
      ${riding ? `<p id="${memberId}" style="color:#888; font-size:0.85em; margin:2px 0 0;"></p>` : ''}
    </div>`;

  const reserveNote = isReserve ? `
    <div class="contact-item" style="border-color:rgba(230,126,34,0.3); background:rgba(230,126,34,0.07);">
      <strong>Jurisdictional Note</strong>
      <p>First Nations reserves are federal land governed by band councils under the <em>Indian Act</em>. They fall outside Alberta provincial jurisdiction. Band members vote in provincial and federal elections.</p>
    </div>` : '';

  sidebar.innerHTML = `
    <button id="sidebar-close-btn">×</button>
    <div style="height:8px; background:${typeColor};"></div>
    <div class="member-info" style="padding-top:56px;">
      <h3>${name}</h3>
      <p class="riding">${typeLabel}</p>
      <div class="contact-details">
        ${reserveNote}
        ${ridingRow('Provincial', provincialRiding, 'muni-provincial-member')}
        ${ridingRow('Federal', federalRiding, 'muni-federal-member')}
      </div>
      <div id="municipal-council-section">
        <p style="color:#555; font-size:0.9em; margin-top:16px;">Loading council…</p>
      </div>
    </div>
  `;

  document.body.appendChild(sidebar);

  document.getElementById('sidebar-close-btn').addEventListener('click', () => {
    sidebar.remove();
    window.currentSidebar = null;
    document.body.classList.remove('sidebar-open');
    if (onClose) onClose();
  });

  setTimeout(() => sidebar.classList.add('open'), 10);
  document.body.classList.add('sidebar-open');
  window.currentSidebar = sidebar;

  Promise.all([
    loadMunicipalData(geoname).catch(() => null),
    provincialRiding ? loadRidingData().catch(() => null) : Promise.resolve(null),
    federalRiding    ? loadFederalRidingData().catch(() => null) : Promise.resolve(null),
  ]).then(([municipalData, provData, fedData]) => {
    const memberKey = config?.memberKey || 'mla';
    const federalMemberKey = config?.federalMemberKey || 'mp';

    if (provData && provincialRiding) {
      const member = provData.ridings?.[provincialRiding]?.[memberKey];
      const el = document.getElementById('muni-provincial-member');
      if (el && member?.name) el.textContent = `${member.name}${member.party ? ` · ${member.party}` : ''}`;
    }

    if (fedData && federalRiding) {
      const mp = fedData.ridings?.[federalRiding]?.[federalMemberKey];
      const el = document.getElementById('muni-federal-member');
      if (el && mp?.name) el.textContent = `${mp.name}${mp.party ? ` · ${mp.party}` : ''}`;
    }

    const section = document.getElementById('municipal-council-section');
    if (!section || !municipalData) {
      if (section) section.remove();
      return;
    }
    section.innerHTML = renderMunicipalCouncil(municipalData);
  });
}

function renderMunicipalCouncil(data) {
  const mayor = data.mayor;
  const council = data.council || [];

  const contactLine = (icon, val, href) => {
    if (!val || !val.trim()) return '';
    const content = href ? `<a href="${href}">${val.trim()}</a>` : `<p>${val.trim()}</p>`;
    return `<div class="contact-item"><strong>${icon}</strong>${content}</div>`;
  };

  const mayorTitle = mayor?.title || 'Mayor';
  const mayorHtml = mayor ? `
    <div class="contact-item" style="margin-bottom:4px;">
      <strong>${mayorTitle}</strong>
      <p style="font-size:1.05em; font-weight:700; color:#fff; margin:2px 0 0;">${mayor.name || '—'}</p>
      ${mayor.party && mayor.party !== 'Independent' && mayor.party !== 'Acclaimed' ? `<p style="font-size:0.8em; color:#aaa; margin:1px 0 0;">${mayor.party}</p>` : ''}
    </div>
    ${mayor.since ? `<div class="contact-item"><strong>Since</strong><p>${mayor.since}</p></div>` : ''}
    ${contactLine('Email', mayor.email, mayor.email ? `mailto:${mayor.email.trim()}` : null)}
    ${contactLine('Phone', mayor.phone, mayor.phone ? `tel:${mayor.phone.trim()}` : null)}
    ${mayor.url ? contactLine('Profile', 'View profile', mayor.url) : ''}
  ` : '';

  const councilHtml = council.length ? `
    <div style="margin-top:20px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.08);">
      <p class="riding" style="margin-bottom:8px;">Council</p>
      ${council.map(m => `
        <div class="contact-item">
          <strong>${m.name}${m.role ? ` <span style="font-weight:400; color:#888;">· ${m.role}</span>` : ''}${m.ward ? ` <span style="font-weight:400; color:#666;">· ${m.ward}</span>` : ''}</strong>
          ${m.email ? `<a href="mailto:${m.email.trim()}" style="font-size:0.82em; color:#6af;">${m.email.trim()}</a>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  return `
    <div style="margin-top:20px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.08);">
      <p class="riding" style="margin-bottom:8px;">Leadership</p>
      <div class="contact-details">${mayorHtml}</div>
    </div>
    ${councilHtml}
    <div style="margin-top:20px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.08);">
      ${data.electionDate ? `<div class="contact-item"><strong>Last Election</strong><p>${data.electionDate}</p></div>` : ''}
      ${data.nextElection ? `<div class="contact-item"><strong>Next Election</strong><p>${data.nextElection}</p></div>` : ''}
      ${data.website ? `<div class="contact-item"><strong>Website</strong><a href="${data.website}" target="_blank" rel="noopener">${data.website}</a></div>` : ''}
    </div>
  `;
}

export function findMunicipalAt(lng, lat) {
  if (!municipalPolygonFeatures.length) return null;
  const found = municipalPolygonFeatures.find(f => pointInFeature(lng, lat, f));
  if (!found) return null;
  const props = found.properties;
  return {
    geoname: props.GEONAME,
    name: props.geonameTitled || toTitleCase(props.GEONAME || ''),
    typeLabel: MUNICIPAL_COLORS[props.municipalType]?.label || props.municipalType,
    typeColor: MUNICIPAL_COLORS[props.municipalType]?.color || '#999',
  };
}

export function updateMunicipalVisibility(map) {
  const zoom = map.getZoom();
  const visible = zoom >= 5.3;
  ['municipal-fill', 'municipal-outline'].forEach(id => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  });
}
