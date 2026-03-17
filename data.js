let ridingDataCache = null;

export async function loadRidingData() {
    if (ridingDataCache) return ridingDataCache;

    const response = await fetch('/json/ridingData.json');
    if (!response.ok) throw new Error(`ridingData.json fetch failed: ${response.status}`);
    ridingDataCache = await response.json();
    console.log('[DATA] Loaded ridingData with', Object.keys(ridingDataCache.ridings || {}).length, 'ridings');
    return ridingDataCache;
}

export function getPartyColor(ridingName) {
    if (!ridingDataCache) {
        console.warn('[DATA] ridingData not loaded yet');
        return '#D3D3D3';
    }

    const entry = ridingDataCache.ridings?.[ridingName];
    if (!entry || !entry.mla || !entry.mla.party) {
        console.warn('[DATA] No MLA/party for riding:', ridingName);
        return '#D3D3D3';
    }

    const partyKey = entry.mla.party;
    return ridingDataCache.parties?.[partyKey]?.color || '#D3D3D3';
}

let federalRidingDataCache = null;

export async function loadFederalRidingData() {
    if (federalRidingDataCache) return federalRidingDataCache;

    try {
        const response = await fetch('/json/federal-riding-data.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} – ${response.statusText}`);
        }
        const json = await response.json();
        federalRidingDataCache = json;
        console.log('[DATA] Federal data loaded —', Object.keys(json.ridings || {}).length, 'ridings');
        return json;
    } catch (err) {
        console.error('[DATA] Federal load error:', err);
        throw err;
    }
}