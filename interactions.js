import { showRidingPreview } from './popup.js';

let currentPopup = null;
let currentlyHighlightedRiding = null;

export function initInteractions(map) {
  // Hover cursor
  map.on('mouseenter', 'ed-fill', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'ed-fill', () => {
    map.getCanvas().style.cursor = '';
  });

  // Click = center on riding + show preview popup
  map.on('click', 'ed-fill', (e) => {
    const props = e.features[0].properties;
    const ridingName = props.EDName2017 || 'Unknown Riding';

    // Ignore repeat click on same riding
    if (currentlyHighlightedRiding === ridingName && currentPopup && currentPopup.isOpen()) {
      return;
    }

    // Clean up existing popup
    if (currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }

    // Center smoothly – no zoom change
    map.flyTo({
      center: e.lngLat,
      essential: true,
      duration: 800
    });

    // Highlight the clicked riding
    map.setFilter('ed-highlight', ['==', ['get', 'EDName2017'], ridingName]);
    map.setPaintProperty('ed-highlight', 'fill-opacity', 0.6);
    map.setPaintProperty('ed-highlight', 'fill-outline-color', '#000000');
    map.setLayoutProperty('ed-highlight', 'visibility', 'visible');

    currentlyHighlightedRiding = ridingName;

    currentPopup = showRidingPreview(map, ridingName, e.lngLat, 'provincial');

    // Cleanup on popup close
    currentPopup.on('close', () => {
      map.setLayoutProperty('ed-highlight', 'visibility', 'none');
      map.setFilter('ed-highlight', ['==', ['get', 'EDName2017'], '']);

      currentlyHighlightedRiding = null;
      currentPopup = null;
    });
  });
}