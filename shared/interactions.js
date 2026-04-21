// interactions.js — Provincial click/hover interactions, config-driven
import { showRidingPreview } from './popup.js';

let currentPopup = null;
let currentlyHighlightedRiding = null;

export function initInteractions(map, config) {
  const prefix = config.layerPrefix;
  const nameProp = config.boundaryNameProperty;

  map.on('mouseenter', `${prefix}-fill`, () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', `${prefix}-fill`, () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', `${prefix}-fill`, (e) => {
    const props = e.features[0].properties;
    const ridingName = props[nameProp] || 'Unknown Riding';

    if (currentlyHighlightedRiding === ridingName && currentPopup && currentPopup.isOpen()) return;

    if (currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }

    map.flyTo({ center: e.lngLat, essential: true, duration: 800 });

    map.setFilter(`${prefix}-highlight`, ['==', ['get', nameProp], ridingName]);
    map.setPaintProperty(`${prefix}-highlight`, 'fill-opacity', 0.6);
    map.setPaintProperty(`${prefix}-highlight`, 'fill-outline-color', '#000000');
    map.setLayoutProperty(`${prefix}-highlight`, 'visibility', 'visible');

    currentlyHighlightedRiding = ridingName;

    showRidingPreview(map, ridingName, e.lngLat, 'provincial', config, () => {
      if (currentlyHighlightedRiding !== ridingName) return;
      map.setLayoutProperty(`${prefix}-highlight`, 'visibility', 'none');
      map.setFilter(`${prefix}-highlight`, ['==', ['get', nameProp], '']);
      currentlyHighlightedRiding = null;
      currentPopup = null;
    });
  });
}
