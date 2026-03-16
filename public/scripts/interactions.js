import { showRidingPreview } from './popup.js';
import { hideRidingSidebar } from './popup.js';

let currentPopup = null;

export function initInteractions(map) {
    // Hover = pointer finger
    map.on('mouseenter', 'ed-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'ed-fill', () => {
        map.getCanvas().style.cursor = '';
    });

    // Click = preview popup
    map.on('click', 'ed-fill', (e) => {
        const props = e.features[0].properties;
        const ridingName = props.EDName2017 || 'Unknown Riding';

        console.log('[CLICK] Riding clicked:', ridingName);

        if (currentPopup) {
            currentPopup.remove();
            currentPopup = null;
        }

        hideRidingSidebar();

        map.flyTo({
            center: e.lngLat,
            zoom: 9,
            essential: true
        });

        // Highlight riding
        map.setFilter('ed-highlight', ['==', ['get', 'EDName2017'], ridingName]);
        map.setPaintProperty('ed-highlight', 'fill-opacity', 0.6);
        map.setPaintProperty('ed-highlight', 'fill-outline-color', '#000000');
        map.setLayoutProperty('ed-highlight', 'visibility', 'visible');

        currentPopup = showRidingPreview(map, ridingName, e.lngLat);

        currentPopup.on('close', () => {
            map.setLayoutProperty('ed-highlight', 'visibility', 'none');
            map.setFilter('ed-highlight', ['==', ['get', 'EDName2017'], '']);
        });
    });
}