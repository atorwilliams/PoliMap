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