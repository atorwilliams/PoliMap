import { showRidingPreview } from './popup.js';

let currentFederalPopup = null;

export function initFederalInteractions(map) {
    // Hover cursor
    map.on('mouseenter', 'federal-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'federal-fill', () => {
        map.getCanvas().style.cursor = '';
    });

    // Click handler for federal ridings
    map.on('click', 'federal-fill', (e) => {
        const props = e.features[0].properties;
        const ridingName = props.name || 'Unknown Federal Riding';

        console.log('[FED CLICK] Clicked:', ridingName);

        // Remove any existing popup
        if (currentFederalPopup) {
            currentFederalPopup.remove();
            currentFederalPopup = null;
        }

        // Fly to the riding
        map.flyTo({
            center: e.lngLat,
            zoom: 9,
            essential: true
        });

        // Highlight the clicked riding
        map.setFilter('federal-highlight', ['==', ['get', 'name'], ridingName]);
        map.setPaintProperty('federal-highlight', 'fill-opacity', 0.6);
        map.setPaintProperty('federal-highlight', 'fill-outline-color', '#000000');
        map.setLayoutProperty('federal-highlight', 'visibility', 'visible');

        // Show preview popup – pass 'federal' level
        currentFederalPopup = showRidingPreview(map, ridingName, e.lngLat, 'federal');

        currentFederalPopup.on('close', () => {
            map.setLayoutProperty('federal-highlight', 'visibility', 'none');
            map.setFilter('federal-highlight', ['==', ['get', 'name'], '']);
        });
    });
}