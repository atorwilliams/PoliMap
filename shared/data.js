// data.js — Data loading and caching, config-driven
let _config = null;

let ridingDataCache = null;
let federalRidingDataCache = null;
let municipalIndexCache = null;
const municipalDataCache = {};

export function initData(config) {
  _config = config;
  // Reset caches when config changes (e.g. different province)
  ridingDataCache = null;
  federalRidingDataCache = null;
  municipalIndexCache = null;
}

export async function loadRidingData() {
  if (ridingDataCache) return ridingDataCache;
  const response = await fetch(_config.dataFile);
  if (!response.ok) throw new Error(`ridingData fetch failed: ${response.status}`);
  ridingDataCache = await response.json();
  return ridingDataCache;
}

export function getPartyColor(ridingName) {
  if (!ridingDataCache) return '#D3D3D3';
  const entry = ridingDataCache.ridings?.[ridingName];
  if (!entry || !entry[_config.memberKey] || !entry[_config.memberKey].party) return '#D3D3D3';
  const partyKey = entry[_config.memberKey].party;
  return ridingDataCache.parties?.[partyKey]?.color || '#D3D3D3';
}

export function isIndependentRiding(ridingName) {
  if (!ridingDataCache) return false;
  const entry = ridingDataCache.ridings?.[ridingName];
  if (!entry?.[_config.memberKey]) return false;
  const partyKey = entry[_config.memberKey].party;
  return !partyKey || !ridingDataCache.parties?.[partyKey]?.color;
}

export async function loadFederalRidingData() {
  if (federalRidingDataCache) return federalRidingDataCache;
  const response = await fetch(_config.federalDataFile);
  if (!response.ok) throw new Error(`federal data fetch failed: ${response.status}`);
  federalRidingDataCache = await response.json();
  return federalRidingDataCache;
}

// ── Point-in-polygon (ray casting) ───────────────────────────────────────────
function pointInRing(px, py, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (((yi > py) !== (yj > py)) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function pointInFeature(lng, lat, feature) {
  const geom = feature.geometry;
  if (!geom) return false;
  if (geom.type === 'Polygon') return pointInRing(lng, lat, geom.coordinates[0]);
  if (geom.type === 'MultiPolygon') return geom.coordinates.some(poly => pointInRing(lng, lat, poly[0]));
  return false;
}

// ── Municipal data (lazy, per-click) ─────────────────────────────────────────
async function loadMunicipalIndex() {
  if (municipalIndexCache) return municipalIndexCache;
  const res = await fetch(`${_config.municipalDataPath}index.json`);
  if (!res.ok) throw new Error(`municipal index fetch failed: ${res.status}`);
  municipalIndexCache = await res.json();
  return municipalIndexCache;
}

export async function loadMunicipalData(geoname) {
  if (!geoname) return null;
  if (municipalDataCache[geoname]) return municipalDataCache[geoname];

  const index = await loadMunicipalIndex();
  const entry = index[geoname];
  if (!entry?.slug) return null;

  const res = await fetch(`${_config.municipalDataPath}data/${entry.slug}.json`);
  if (!res.ok) return null;

  const data = await res.json();
  municipalDataCache[geoname] = data;
  return data;
}
