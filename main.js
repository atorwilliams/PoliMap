import { initRidings, updateRidingVisibility } from './ridings.js';
import { initInteractions } from './interactions.js';
import { initFederalRidings, updateFederalVisibility } from './federalRidings.js';
import { initFederalInteractions } from './federalInteractions.js';
import { applyRidingColours } from './colouring.js';
import { applyFederalRidingColours } from './federalColouring.js';
import { initLegend, updateLegend } from './legend.js';

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

  for (const key in layers) {
    await layers[key].init(map);
  }

  for (const key in layers) {
    const visible = (key === activeLayer);
    layers[key].visible = visible;
    toggleLayerVisibility(map, key, visible);
  }

  if (layers[activeLayer]?.updateVisibility) {
    layers[activeLayer].updateVisibility(map);
  }

  if (activeLayer === 'provincial') {
    applyRidingColours(map);
  } else if (activeLayer === 'federal') {
    applyFederalRidingColours(map);
  }

  initInteractions(map);
  initFederalInteractions(map);

  // Delay legend init until map is fully stable (prevents double initial refresh)
  setTimeout(() => {
    const refreshLegend = initLegend(map, () => activeLayer);
    refreshLegend(); // one clean initial call

    // Debounced for zoom/move
    const debouncedRefresh = debounce(refreshLegend, 300);
    map.on('zoom', debouncedRefresh);
    map.on('moveend', debouncedRefresh);

    // Layer switch (immediate refresh)
    const layerButtons = document.querySelectorAll('.layer-btn');
    layerButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const layerKey = btn.dataset.layer;
        if (!layers[layerKey]) return;

        layerButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeLayer = layerKey;

        for (const key in layers) {
          const visible = (key === activeLayer);
          layers[key].visible = visible;
          toggleLayerVisibility(map, key, visible);
        }

        if (layers[activeLayer]?.updateVisibility) {
          layers[activeLayer].updateVisibility(map);
        }

        if (activeLayer === 'provincial') {
          applyRidingColours(map);
        } else if (activeLayer === 'federal') {
          applyFederalRidingColours(map);
        }

        refreshLegend();
      });
    });
  }, 500); // 500ms delay — enough to skip early zoom/move events
});

function debounce(fn, delay = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function toggleLayerVisibility(map, layerKey, visible) {
  const layer = layers[layerKey];
  if (!layer) return;

  layer.layers.forEach(id => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
  });
}