import { loadFederalRidingData } from './data.js';

export async function applyFederalRidingColours(map) {
    console.log('[FED COLOUR] Starting application');

    let data;
    try {
        data = await loadFederalRidingData();
        console.log('[FED COLOUR] Data loaded —', Object.keys(data.ridings || {}).length, 'ridings');
    } catch (err) {
        console.error('[FED COLOUR] Data load failed:', err);
        return;
    }

    if (!data || !data.ridings) {
        console.error('[FED COLOUR] No valid data after load');
        return;
    }

    const colorMatch = ['match', ['get', 'name']];

    const source = map.getSource('federal-source');
    if (!source || !source._data || !source._data.features) {
        console.warn('[FED COLOUR] Source not ready');
        return;
    }

    const features = source._data.features;
    console.log('[FED COLOUR] Processing', features.length, 'features');

    const usedNames = new Set();
    features.forEach(f => {
        const name = f.properties?.name?.trim();
        if (name) usedNames.add(name);
    });

    usedNames.forEach(name => {
        const normalized = name.replace(/[\u2013\u2014]/g, '-').trim();
        const entry = data.ridings[normalized] || data.ridings[name];
        let color = '#D3D3D3';

        if (entry && entry.mp && entry.mp.party) {
            color = data.parties?.[entry.mp.party]?.color || '#D3D3D3';
        }

        console.log(`[FED DEBUG] "${name}" (norm: "${normalized}") → ${color}`);
        colorMatch.push(name, color);
    });

    colorMatch.push('#D3D3D3');

    if (map.getLayer('federal-fill')) {
        map.setPaintProperty('federal-fill', 'fill-color', colorMatch);
        map.triggerRepaint();
        console.log('[FED COLOUR] Colours set — should be visible now');
    } else {
        console.warn('[FED COLOUR] federal-fill layer not found');
    }
}