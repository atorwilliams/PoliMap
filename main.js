import { initRidings, updateRidingVisibility } from './ridings.js';
import { initInteractions } from './interactions.js';
import { initFederalRidings, updateFederalVisibility } from './federalRidings.js';
import { initFederalInteractions } from './federalInteractions.js';
import { applyRidingColours } from './colouring.js';
import { applyFederalRidingColours } from './federalColouring.js';
import { initLegend, updateLegend } from './legend.js';

// Layer definitions
const layers = {
  provincial: {
    name: 'Provincial (MLAs)',
    init: initRidings,
    updateVisibility: updateRidingVisibility,
    visible: true,
    zoomThreshold: 6.2,
    layers: ['ed-fill', 'ed-outline', 'ed-highlight']
  },
  federal: {
    name: 'Federal (MPs)',
    init: initFederalRidings,
    updateVisibility: updateFederalVisibility,
    visible: false,
    zoomThreshold: 5.0,
    layers: ['federal-fill', 'federal-outline', 'federal-highlight']
  }
};

let activeLayer = 'provincial';

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

  // Initialize all layers
  for (const key in layers) {
    const layer = layers[key];
    await layer.init(map);
  }

  // Set initial visibility — only active layer visible
  for (const key in layers) {
    const visible = (key === activeLayer);
    layers[key].visible = visible;
    toggleLayerVisibility(map, key, visible);
  }

  // Apply zoom-based visibility to starting active layer
  if (layers[activeLayer]?.updateVisibility) {
    layers[activeLayer].updateVisibility(map);
  }

  // Apply colours for starting layer
  if (activeLayer === 'provincial') {
    applyRidingColours(map).catch(err => console.error('[INIT] Provincial colouring failed:', err));
  } else if (activeLayer === 'federal') {
    applyFederalRidingColours(map).catch(err => console.error('[INIT] Federal colouring failed:', err));
  }

  // Initialize interactions
  initInteractions(map);
  initFederalInteractions(map);

  // Initialize legend (pass function to get current activeLayer)
  const refreshLegend = initLegend(map, () => activeLayer);

  // Uncomment when ready for markers
  // initOfficials(map);

  // Update visibility + legend on zoom/move — only for active layer
  map.on('zoom', () => {
    if (layers[activeLayer]?.updateVisibility) {
      layers[activeLayer].updateVisibility(map);
    }
    refreshLegend();
  });

  map.on('moveend', () => {
    if (layers[activeLayer]?.updateVisibility) {
      layers[activeLayer].updateVisibility(map);
    }
    refreshLegend();
  });

  // Layer toggle buttons
  const layerButtons = document.querySelectorAll('.layer-btn');
  layerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const layerKey = btn.dataset.layer;
      if (!layers[layerKey]) return;

      // Update UI
      layerButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeLayer = layerKey;

      // Enforce exclusivity
      for (const key in layers) {
        const visible = (key === activeLayer);
        layers[key].visible = visible;
        toggleLayerVisibility(map, key, visible);
      }

      // Apply zoom visibility to new active layer
      if (layers[activeLayer]?.updateVisibility) {
        layers[activeLayer].updateVisibility(map);
      }

      // Refresh colours
      if (activeLayer === 'provincial') {
        applyRidingColours(map)
          .then(() => console.log('[SWITCH] Provincial colours refreshed'))
          .catch(err => console.error('[SWITCH] Provincial colouring failed:', err));
      } else if (activeLayer === 'federal') {
        applyFederalRidingColours(map)
          .then(() => console.log('[SWITCH] Federal colours refreshed'))
          .catch(err => console.error('[SWITCH] Federal colouring failed:', err));
      }

      // Refresh legend
      refreshLegend();
    });
  });
});

function toggleLayerVisibility(map, layerKey, visible) {
  const layer = layers[layerKey];
  if (!layer) return;

  layer.layers.forEach(id => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
  });
}