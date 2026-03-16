import { loadRidingData, getPartyColor } from './data.js';

export async function applyRidingColours(map) {
    await loadRidingData();  // ensure data is loaded

    const colorMatch = ['match', ['get', 'EDName2017']];

    // We don't need to loop over JSON keys anymore — we can generate colours on demand
    // But to build the match expression, we still need all possible riding names
    // So we use the GeoJSON source to get all EDName2017 values (perfect match source)

    const source = map.getSource('ed-source');
    if (!source || !source._data || !source._data.features) {
        console.warn('[COLOUR] ed-source not ready yet');
        return;
    }

    const features = source._data.features;
    console.log('[COLOUR] Building match from', features.length, 'GeoJSON features');

    const usedRidingNames = new Set();
    features.forEach(feature => {
        const name = feature.properties?.EDName2017;
        if (name) usedRidingNames.add(name);
    });

    usedRidingNames.forEach(ridingName => {
        const color = getPartyColor(ridingName);
        colorMatch.push(ridingName, color);
    });

    colorMatch.push('#D3D3D3'); // fallback

    if (map.getLayer('ed-fill')) {
        map.setPaintProperty('ed-fill', 'fill-color', colorMatch);
        map.triggerRepaint(); // force visual update
        console.log('[COLOUR] Colours applied using exact GeoJSON names');
    } else {
        console.warn('[COLOUR] ed-fill layer not found');
    }
}