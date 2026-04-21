// federalInteractions.js — Federal click/hover interactions, config-driven
import { showRidingPreview } from './popup.js';

let currentFederalPopup = null;
let currentlyHighlightedFederalRiding = null;

export function initFederalInteractions(map, config) {
  map.on('mouseenter', 'federal-fill', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'federal-fill', () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'federal-fill', (e) => {
    const props = e.features[0].properties;
    const ridingName = props.name || 'Unknown Federal Riding';

    if (currentlyHighlightedFederalRiding === ridingName && currentFederalPopup && currentFederalPopup.isOpen()) return;

    if (currentFederalPopup) {
      currentFederalPopup.remove();
      currentFederalPopup = null;
    }

    map.flyTo({ center: e.lngLat, essential: true, duration: 800 });

    map.setFilter('federal-highlight', ['==', ['get', 'name'], ridingName]);
    map.setPaintProperty('federal-highlight', 'fill-opacity', 0.6);
    map.setPaintProperty('federal-highlight', 'fill-outline-color', '#000000');
    map.setLayoutProperty('federal-highlight', 'visibility', 'visible');

    currentlyHighlightedFederalRiding = ridingName;

    showRidingPreview(map, ridingName, e.lngLat, 'federal', config, () => {
      if (currentlyHighlightedFederalRiding !== ridingName) return;
      map.setLayoutProperty('federal-highlight', 'visibility', 'none');
      map.setFilter('federal-highlight', ['==', ['get', 'name'], '']);
      currentlyHighlightedFederalRiding = null;
      currentFederalPopup = null;
    });
  });
}
