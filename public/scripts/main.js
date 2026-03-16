import { initOfficials, updateOfficials } from './officials.js';
import { initRidings, updateRidingVisibility } from './ridings.js';
import { initInteractions } from './interactions.js';
import { applyRidingColours } from './colouring.js';

document.addEventListener('DOMContentLoaded', async () => {
    const map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [-113.4909, 53.5444],
        zoom: 6,
        attributionControl: true
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    await new Promise(resolve => map.on('load', resolve));

    // Init officials
    initOfficials(map);

    // Init ridings (lines)
    await initRidings(map);
    // Give the map a moment to process layers
await new Promise(resolve => setTimeout(resolve, 100));

// Then apply colours
await applyRidingColours(map);


    // Init interactions
    initInteractions(map);

    // Zoom/move listeners
    map.on('zoom', () => {
        updateRidingVisibility(map);
    });
    map.on('moveend', () => {
        updateRidingVisibility(map);
    });

    updateRidingVisibility(map);
});