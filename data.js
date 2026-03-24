let ridingDataCache = null;

export async function loadRidingData() {
  if (ridingDataCache) return ridingDataCache;

  const response = await fetch('/json/ridingData.json');
  if (!response.ok) throw new Error(`ridingData.json fetch failed: ${response.status}`);
  ridingDataCache = await response.json();
  return ridingDataCache;
}

export function getPartyColor(ridingName) {
  if (!ridingDataCache) {
    return '#D3D3D3';
  }

  const entry = ridingDataCache.ridings?.[ridingName];
  if (!entry || !entry.mla || !entry.mla.party) {
    return '#D3D3D3';
  }

  const partyKey = entry.mla.party;
  return ridingDataCache.parties?.[partyKey]?.color || '#D3D3D3';
}

export function isIndependentRiding(ridingName) {
  if (!ridingDataCache) return false;
  const entry = ridingDataCache.ridings?.[ridingName];
  if (!entry?.mla) return false;
  const partyKey = entry.mla.party;
  return !partyKey || !ridingDataCache.parties?.[partyKey]?.color;
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
  if (geom.type === 'Polygon') {
    return pointInRing(lng, lat, geom.coordinates[0]);
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.some(poly => pointInRing(lng, lat, poly[0]));
  }
  return false;
}

let federalRidingDataCache = null;

export async function loadFederalRidingData() {
  if (federalRidingDataCache) return federalRidingDataCache;

  const response = await fetch('/json/federal-riding-data.json');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} – ${response.statusText}`);
  }
  const json = await response.json();
  federalRidingDataCache = json;
  return json;
}