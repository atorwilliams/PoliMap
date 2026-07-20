// schoolLayer.js — School authority boundary layer (public, separate, francophone)
import { pointInFeature } from './data.js';

export const SCHOOL_TYPE_COLORS = {
  public:      { label: 'Public School Division',     color: '#2980B9' },
  separate:    { label: 'Catholic Separate Division', color: '#E67E22' },
  francophone: { label: 'Francophone Authority',      color: '#27AE60' },
};

const DIVISION_COLOR_EXPR = [
  'match', ['get', 'authorityType'],
  'public',      SCHOOL_TYPE_COLORS.public.color,
  'separate',    SCHOOL_TYPE_COLORS.separate.color,
  'francophone', SCHOOL_TYPE_COLORS.francophone.color,
  '#7F8C8D',
];

const WARD_COLOR_EXPR = [
  'match', ['get', 'boardType'],
  'public',      SCHOOL_TYPE_COLORS.public.color,
  'separate',    SCHOOL_TYPE_COLORS.separate.color,
  'francophone', SCHOOL_TYPE_COLORS.francophone.color,
  '#7F8C8D',
];

let schoolFeatures = [];
let wardFeatures = [];

async function loadDivisionFile(file, authorityType) {
  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      ...data,
      features: data.features.map(f => ({
        ...f,
        properties: { ...f.properties, authorityType },
      })),
    };
  } catch (err) {
    console.warn(`[School Layer] Failed to load ${file}:`, err);
    return { type: 'FeatureCollection', features: [] };
  }
}

async function loadWardFile({ file, boardName, boardType }) {
  try {
    const res = await fetch(file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.features.map(f => {
      const p = f.properties;
      return {
        ...f,
        properties: {
          wardName:  p.epsb_ward2021_name       || p.name            || '',
          wardLabel: p.epsb_ward2021_name_full   || p.descriptiv      || p.descriptive_name || '',
          trustee:   p.trustee_name              || p.trustee         || '',
          email:     p.trustee_email             || '',
          phone:     p.trustee_phone             || '',
          website:   p.epsb_ward2021_website     || '',
          boardName,
          boardType,
        },
      };
    });
  } catch (err) {
    console.warn(`[School Layer] Failed to load ward file ${file}:`, err);
    return [];
  }
}

function bboxArea(feature) {
  if (!feature?.geometry) return Infinity;
  const coords = feature.geometry.type === 'Polygon'
    ? feature.geometry.coordinates[0]
    : feature.geometry.coordinates.flatMap(p => p[0]);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of coords) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return (maxX - minX) * (maxY - minY);
}

function smallestAt(rendered, featureBank) {
  return rendered.reduce((a, b) => {
    const aFull = featureBank.find(f => f.properties.Name === a.properties.Name || f.properties.wardName === a.properties.wardName);
    const bFull = featureBank.find(f => f.properties.Name === b.properties.Name || f.properties.wardName === b.properties.wardName);
    return bboxArea(aFull ?? a) <= bboxArea(bFull ?? b) ? a : b;
  });
}

function titleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export async function initSchool(map, config) {
  const [pub, sep, fran] = await Promise.all([
    loadDivisionFile(config.schoolPublicFile, 'public'),
    loadDivisionFile(config.schoolSeparateFile, 'separate'),
    loadDivisionFile(config.schoolFrancophoneFile, 'francophone'),
  ]);

  const merged = {
    type: 'FeatureCollection',
    features: [...pub.features, ...sep.features, ...fran.features],
  };
  schoolFeatures = merged.features;

  map.addSource('school-source', { type: 'geojson', data: merged, generateId: true });

  map.addLayer({
    id: 'school-fill',
    type: 'fill',
    source: 'school-source',
    layout: { visibility: 'none' },
    paint: { 'fill-color': DIVISION_COLOR_EXPR, 'fill-opacity': 0.2 },
  });

  map.addLayer({
    id: 'school-outline',
    type: 'line',
    source: 'school-source',
    layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': DIVISION_COLOR_EXPR,
      'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.2, 10, 2.2],
      'line-opacity': 0.85,
    },
  });

  map.addLayer({
    id: 'school-highlight',
    type: 'fill',
    source: 'school-source',
    layout: { visibility: 'none' },
    filter: ['==', ['id'], -1],
    paint: { 'fill-color': DIVISION_COLOR_EXPR, 'fill-opacity': 0.45 },
  });

  map.addLayer({
    id: 'school-label',
    type: 'symbol',
    source: 'school-source',
    minzoom: 7,
    layout: {
      visibility: 'none',
      'text-field': ['get', 'Name'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 7, 9, 11, 12],
      'text-font': ['Noto Sans Regular'],
      'text-max-width': 10,
      'text-anchor': 'center',
      'symbol-placement': 'point',
    },
    paint: {
      'text-color': '#111111',
      'text-halo-color': 'rgba(255,255,255,0.9)',
      'text-halo-width': 1.5,
    },
  });

  if (config.schoolWardFiles?.length) {
    const loaded = await Promise.all(config.schoolWardFiles.map(loadWardFile));
    wardFeatures = loaded.flat();

    map.addSource('school-wards-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: wardFeatures },
      generateId: true,
    });

    map.addLayer({
      id: 'school-wards-fill',
      type: 'fill',
      source: 'school-wards-source',
      minzoom: 8,
      layout: { visibility: 'none' },
      paint: { 'fill-color': WARD_COLOR_EXPR, 'fill-opacity': 0.3 },
    });

    map.addLayer({
      id: 'school-wards-outline',
      type: 'line',
      source: 'school-wards-source',
      minzoom: 8,
      layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': WARD_COLOR_EXPR,
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 13, 1.8],
        'line-opacity': 0.7,
        'line-dasharray': [4, 3],
      },
    });

    map.addLayer({
      id: 'school-wards-highlight',
      type: 'fill',
      source: 'school-wards-source',
      layout: { visibility: 'none' },
      filter: ['==', ['id'], -1],
      paint: { 'fill-color': WARD_COLOR_EXPR, 'fill-opacity': 0.5 },
    });

    map.addLayer({
      id: 'school-wards-label',
      type: 'symbol',
      source: 'school-wards-source',
      minzoom: 9,
      layout: {
        visibility: 'none',
        'text-field': ['get', 'wardLabel'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 9, 9, 13, 12],
        'text-font': ['Noto Sans Regular'],
        'text-max-width': 8,
        'text-anchor': 'center',
        'symbol-placement': 'point',
      },
      paint: {
        'text-color': '#111111',
        'text-halo-color': 'rgba(255,255,255,0.9)',
        'text-halo-width': 1.5,
      },
    });

    let highlightedWardId = null;

    map.on('mouseenter', 'school-wards-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'school-wards-fill', () => { map.getCanvas().style.cursor = ''; });

    map.on('click', 'school-wards-fill', (e) => {
      const rendered = map.queryRenderedFeatures(e.point, { layers: ['school-wards-fill'] });
      if (!rendered.length) return;

      const best = rendered.reduce((a, b) => {
        const aFull = wardFeatures.find(f => f.properties.wardName === a.properties.wardName && f.properties.boardName === a.properties.boardName);
        const bFull = wardFeatures.find(f => f.properties.wardName === b.properties.wardName && f.properties.boardName === b.properties.boardName);
        return bboxArea(aFull ?? a) <= bboxArea(bFull ?? b) ? a : b;
      });

      const id = best.id;
      if (highlightedWardId === id) return;
      highlightedWardId = id;

      map.setFilter('school-wards-highlight', ['==', ['id'], id]);
      map.setLayoutProperty('school-wards-highlight', 'visibility', 'visible');

      showWardSidebar(best.properties, () => {
        map.setLayoutProperty('school-wards-highlight', 'visibility', 'none');
        map.setFilter('school-wards-highlight', ['==', ['id'], -1]);
        highlightedWardId = null;
      });
    });
  }

  let highlightedId = null;

  map.on('mouseenter', 'school-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'school-fill', () => { map.getCanvas().style.cursor = ''; });

  map.on('click', 'school-fill', (e) => {
    // If a ward polygon is rendered at this point, let the ward handler take it
    if (map.getLayer('school-wards-fill')) {
      const wardHits = map.queryRenderedFeatures(e.point, { layers: ['school-wards-fill'] });
      if (wardHits.length) return;
    }

    const rendered = map.queryRenderedFeatures(e.point, { layers: ['school-fill'] });
    if (!rendered.length) return;

    // Prefer public/separate over province-spanning francophone overlays.
    // Among same-priority candidates, pick the smallest geographic footprint.
    const specific = rendered.filter(f => f.properties.authorityType !== 'francophone');
    const candidates = specific.length ? specific : rendered;
    const deprioritized = specific.length
      ? rendered.filter(f => f.properties.authorityType === 'francophone')
      : [];

    const best = smallestAt(candidates, schoolFeatures);
    const id = best.id;
    if (highlightedId === id) return;
    highlightedId = id;

    map.setFilter('school-highlight', ['==', ['id'], id]);
    map.setLayoutProperty('school-highlight', 'visibility', 'visible');

    const { lng, lat } = e.lngLat;
    const hasWards = wardFeatures.some(f => pointInFeature(lng, lat, f));

    // Collect other divisions at this point to surface in the sidebar
    const alsoIn = [
      ...candidates.filter(f => f.properties.Name !== best.properties.Name),
      ...deprioritized,
    ].map(f => ({ name: f.properties.Name, type: f.properties.authorityType }));

    showDivisionSidebar(best.properties, hasWards, alsoIn, () => {
      map.setLayoutProperty('school-highlight', 'visibility', 'none');
      map.setFilter('school-highlight', ['==', ['id'], -1]);
      highlightedId = null;
    });
  });
}

export function updateSchoolVisibility() {
  // minzoom on each layer handles zoom-based visibility automatically
}

export function findSchoolAt(lng, lat) {
  if (!schoolFeatures.length) return null;
  const divMatches = schoolFeatures.filter(f => pointInFeature(lng, lat, f));
  if (!divMatches.length) return null;

  // Same priority logic as the click handler: prefer public/separate over francophone
  const specific = divMatches.filter(f => f.properties.authorityType !== 'francophone');
  const candidates = specific.length ? specific : divMatches;
  const division = candidates.reduce((a, b) => bboxArea(a) <= bboxArea(b) ? a : b);
  const typeInfo = SCHOOL_TYPE_COLORS[division.properties.authorityType] ?? SCHOOL_TYPE_COLORS.public;

  const wardMatches = wardFeatures.filter(f => pointInFeature(lng, lat, f));
  const ward = wardMatches.reduce((a, b) => !a ? b : bboxArea(a) <= bboxArea(b) ? a : b, null);

  return {
    name: division.properties.Name,
    code: division.properties.Code,
    type: typeInfo.label,
    color: typeInfo.color,
    ward: ward ? {
      wardLabel: ward.properties.wardLabel,
      trustee:   titleCase(ward.properties.trustee),
      email:     ward.properties.email,
      phone:     ward.properties.phone,
      boardName: ward.properties.boardName,
    } : null,
  };
}

function showWardSidebar(props, onClose) {
  if (window.currentSidebar) {
    window.currentSidebar.remove();
    window.currentSidebar = null;
  }

  const typeInfo   = SCHOOL_TYPE_COLORS[props.boardType] ?? SCHOOL_TYPE_COLORS.public;
  const trustee    = titleCase(props.trustee);
  const emailHtml  = props.email   ? `<a href="mailto:${props.email}">${props.email}</a>` : '—';
  const phoneHtml  = props.phone   ? `<a href="tel:${props.phone}">${props.phone}</a>`   : null;
  const websiteHtml = props.website ? `<a href="${props.website}" target="_blank" rel="noopener">Ward website</a>` : null;

  const sidebar = document.createElement('div');
  sidebar.className = 'member-detail-sidebar';
  sidebar.innerHTML = `
    <button id="sidebar-close-btn">×</button>
    <div style="height:8px; background:${typeInfo.color};"></div>
    <div class="member-info">
      <h3>${props.wardLabel}</h3>
      <p class="riding">${props.boardName}</p>
      <div class="contact-details">
        <div class="contact-item"><strong>Elected Trustee</strong><p>${trustee}</p></div>
        <div class="contact-item"><strong>Email</strong><p>${emailHtml}</p></div>
        ${phoneHtml  ? `<div class="contact-item"><strong>Phone</strong><p>${phoneHtml}</p></div>`     : ''}
        ${websiteHtml ? `<div class="contact-item"><strong>Links</strong><p>${websiteHtml}</p></div>` : ''}
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

function showDivisionSidebar(props, hasWards, alsoIn, onClose) {
  if (window.currentSidebar) {
    window.currentSidebar.remove();
    window.currentSidebar = null;
  }

  const name     = props.Name || 'Unknown';
  const code     = props.Code || '';
  const typeInfo = SCHOOL_TYPE_COLORS[props.authorityType] ?? SCHOOL_TYPE_COLORS.public;
  const hint     = hasWards
    ? '<p style="color:#888; font-style:italic; margin-top:4px;">Zoom in to see individual trustee wards.</p>'
    : '<p style="color:#888; font-style:italic; margin-top:4px;">Trustee data coming soon.</p>';

  const alsoInHtml = alsoIn.length ? `
    <div class="contact-item" style="margin-top:12px; padding-top:12px; border-top:1px solid #2a2a2a;">
      <strong>Also at this location</strong>
      ${alsoIn.map(d => {
        const t = SCHOOL_TYPE_COLORS[d.type] ?? SCHOOL_TYPE_COLORS.public;
        return `<p style="margin-top:4px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${t.color};margin-right:5px;"></span>${d.name}</p>`;
      }).join('')}
    </div>` : '';

  const sidebar = document.createElement('div');
  sidebar.className = 'member-detail-sidebar';
  sidebar.innerHTML = `
    <button id="sidebar-close-btn">×</button>
    <div style="height:8px; background:${typeInfo.color};"></div>
    <div class="member-info">
      <h3>${name}</h3>
      <p class="riding">${typeInfo.label}${code ? ` · ${code}` : ''}</p>
      <div class="contact-details">
        <div class="contact-item"><strong>Elected Trustees</strong>${hint}</div>
        ${alsoInHtml}
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
