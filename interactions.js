import { showRidingPreview } from './popup.js';
import { hideRidingSidebar } from './popup.js';

let currentPopup = null;
let currentlyHighlightedRiding = null;

export function initInteractions(map) {
    // Hover = pointer finger
    map.on('mouseenter', 'ed-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'ed-fill', () => {
        map.getCanvas().style.cursor = '';
    });

    // Click = center on riding + show popup + prevent repeat spam
    map.on('click', 'ed-fill', (e) => {
        const props = e.features[0].properties;
        const ridingName = props.EDName2017 || 'Unknown Riding';

        console.log('[CLICK] Riding clicked:', ridingName);

        // Ignore if same riding is already highlighted and popup open
        if (currentlyHighlightedRiding === ridingName && currentPopup && currentPopup.isOpen()) {
            console.log('[CLICK] Same riding already open — ignoring');
            return;
        }

        // Clean up existing popup
        if (currentPopup) {
            currentPopup.remove();
            currentPopup = null;
        }

        hideRidingSidebar();

        // Just center smoothly – no zoom change
        map.flyTo({
            center: e.lngLat,
            essential: true,
            duration: 800  // quick but smooth centering
        });

        // Highlight
        map.setFilter('ed-highlight', ['==', ['get', 'EDName2017'], ridingName]);
        map.setPaintProperty('ed-highlight', 'fill-opacity', 0.6);
        map.setPaintProperty('ed-highlight', 'fill-outline-color', '#000000');
        map.setLayoutProperty('ed-highlight', 'visibility', 'visible');

        currentlyHighlightedRiding = ridingName;

        currentPopup = showRidingPreview(map, ridingName, e.lngLat, 'provincial');

        // On close: clean up highlight only (no zoom revert needed)
        currentPopup.on('close', () => {
            map.setLayoutProperty('ed-highlight', 'visibility', 'none');
            map.setFilter('ed-highlight', ['==', ['get', 'EDName2017'], '']);

            currentlyHighlightedRiding = null;
            currentPopup = null;
        });
    });
}