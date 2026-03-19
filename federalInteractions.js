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

  // Click = center on riding + show popup
  map.on('click', 'federal-fill', (e) => {
    const props = e.features[0].properties;
    const ridingName = props.name || 'Unknown Federal Riding';

    // Ignore repeat click on same riding
    if (currentlyHighlightedFederalRiding === ridingName && currentFederalPopup && currentFederalPopup.isOpen()) {
      return;
    }

    // Clean up existing popup
    if (currentFederalPopup) {
      currentFederalPopup.remove();
      currentFederalPopup = null;
    }

    // Center smoothly – no zoom change
    map.flyTo({
      center: e.lngLat,
      essential: true,
      duration: 800
    });

    // Highlight the clicked riding
    map.setFilter('federal-highlight', ['==', ['get', 'name'], ridingName]);
    map.setPaintProperty('federal-highlight', 'fill-opacity', 0.6);
    map.setPaintProperty('federal-highlight', 'fill-outline-color', '#000000');
    map.setLayoutProperty('federal-highlight', 'visibility', 'visible');

    currentlyHighlightedFederalRiding = ridingName;

    currentFederalPopup = showRidingPreview(map, ridingName, e.lngLat, 'federal');

    // Cleanup on popup close
    currentFederalPopup.on('close', () => {
      map.setLayoutProperty('federal-highlight', 'visibility', 'none');
      map.setFilter('federal-highlight', ['==', ['get', 'name'], '']);

      currentlyHighlightedFederalRiding = null;
      currentFederalPopup = null;
    });
  });
}