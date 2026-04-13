import { loadRidingData, getPartyColor, isIndependentRiding } from './data.js';

export async function applyRidingColours(map) {
    await loadRidingData();  // ensure data is loaded

    const colorMatch = ['match', ['get', 'EDName2017']];

    // We don't need to loop over JSON keys anymore — we can generate colours on demand
    // But to build the match expression, we still need all possible riding names
    // So we use the GeoJSON source to get all EDName2017 values (perfect match source)

    const source = map.getSource('ed-source');
    if (!source || !source._data || !source._data.features) {
        return;
    }

    const features = source._data.features;

    const usedRidingNames = new Set();
    features.forEach(feature => {
        const name = feature.properties?.EDName2017;
        if (name) usedRidingNames.add(name);
    });

    const independentRidings = [];

    usedRidingNames.forEach(ridingName => {
        const color = getPartyColor(ridingName);
        colorMatch.push(ridingName, color);
        if (isIndependentRiding(ridingName)) {
            independentRidings.push(ridingName);
        }
    });

    colorMatch.push('#D3D3D3'); // fallback

    if (map.getLayer('ed-fill')) {
        map.setPaintProperty('ed-fill', 'fill-color', colorMatch);
        map.triggerRepaint();
    }

    if (map.getLayer('ed-fill-independent')) {
        const filter = independentRidings.length > 0
            ? ['in', ['get', 'EDName2017'], ['literal', independentRidings]]
            : ['==', ['get', 'EDName2017'], ''];
        map.setFilter('ed-fill-independent', filter);
    }
}