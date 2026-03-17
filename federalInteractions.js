import { showRidingPreview } from './popup.js';

let currentFederalPopup = null;
let currentlyHighlightedFederalRiding = null;

export function initFederalInteractions(map) {
    // Hover cursor
    map.on('mouseenter', 'federal-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'federal-fill', () => {
        map.getCanvas().style.cursor = '';
    });

    // Click = center on riding + show popup + prevent repeat
    map.on('click', 'federal-fill', (e) => {
        const props = e.features[0].properties;
        const ridingName = props.name || 'Unknown Federal Riding';

        console.log('[FED CLICK] Clicked:', ridingName);

        // Ignore repeat on same riding
        if (currentlyHighlightedFederalRiding === ridingName && currentFederalPopup && currentFederalPopup.isOpen()) {
            console.log('[FED CLICK] Same riding already open — ignoring');
            return;
        }

        if (currentFederalPopup) {
            currentFederalPopup.remove();
            currentFederalPopup = null;
        }

        // Center only – no zoom
        map.flyTo({
            center: e.lngLat,
            essential: true,
            duration: 800
        });

        // Highlight
        map.setFilter('federal-highlight', ['==', ['get', 'name'], ridingName]);
        map.setPaintProperty('federal-highlight', 'fill-opacity', 0.6);
        map.setPaintProperty('federal-highlight', 'fill-outline-color', '#000000');
        map.setLayoutProperty('federal-highlight', 'visibility', 'visible');

        currentlyHighlightedFederalRiding = ridingName;

        currentFederalPopup = showRidingPreview(map, ridingName, e.lngLat, 'federal');

        currentFederalPopup.on('close', () => {
            map.setLayoutProperty('federal-highlight', 'visibility', 'none');
            map.setFilter('federal-highlight', ['==', ['get', 'name'], '']);

            currentlyHighlightedFederalRiding = null;
            currentFederalPopup = null;
        });
    });
}