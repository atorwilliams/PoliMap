import { initRidings, updateRidingVisibility } from './ridings.js';
import { initInteractions } from './interactions.js';
import { initFederalRidings, updateFederalVisibility } from './federalRidings.js';
import { initFederalInteractions } from './federalInteractions.js';
import { applyRidingColours } from './colouring.js';
import { applyFederalRidingColours } from './federalColouring.js';
import { initLegend, updateLegend } from './legend.js';
import { initMunicipal, updateMunicipalVisibility, MUNICIPAL_COLORS, HAMLET_COLOR, showMunicipalTypeSidebar } from './municipalLayer.js';
import { initRCMP, updateRCMPVisibility, RCMP_DISTRICT_COLORS } from './rcmpLayer.js';

const HAMLET_LAYERS = ['municipal-hamlet', 'municipal-hamlet-label'];
let showHamlets = false;
let showRCMPOverlay = false;

const layers = {
  provincial: {
    name: 'Provincial (MLAs)',
    init: initRidings,
    updateVisibility: updateRidingVisibility,
    visible: true,
    zoomThreshold: 6.2,
    layers: ['ed-fill', 'ed-fill-independent', 'ed-outline', 'ed-highlight', 'ed-label-rural', 'ed-label-urban']
  },
  federal: {
    name: 'Federal (MPs)',
    init: initFederalRidings,
    updateVisibility: updateFederalVisibility,
    visible: false,
    zoomThreshold: 5.0,
    layers: ['federal-fill', 'federal-outline', 'federal-highlight', 'federal-label']
  },
  municipal: {
    name: 'Municipal',
    init: initMunicipal,
    updateVisibility: updateMunicipalVisibility,
    visible: false,
    layers: ['municipal-fill', 'municipal-fill-hatch', 'municipal-outline', 'municipal-label-rural', 'municipal-label-urban']
  },
  rcmp: {
    name: 'RCMP Districts',
    init: initRCMP,
    updateVisibility: updateRCMPVisibility,
    visible: false,
    layers: ['rcmp-fill', 'rcmp-outline', 'rcmp-highlight', 'rcmp-label']
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
    await layers[key].init(map);
  }

  // Set initial visibility
  for (const key in layers) {
    const visible = (key === activeLayer);
    layers[key].visible = visible;
    toggleLayerVisibility(map, key, visible);
  }

  if (layers[activeLayer]?.updateVisibility) {
    layers[activeLayer].updateVisibility(map);
  }

  // Apply initial colours
  if (activeLayer === 'provincial') {
    applyRidingColours(map);
  } else if (activeLayer === 'federal') {
    applyFederalRidingColours(map);
  }

  // Initialize interactions
  initInteractions(map);
  initFederalInteractions(map);

  // Build static legends
  populateMunicipalLegend(map);
  populateRCMPLegend();

  // Initialize legend with delay for stability
  setTimeout(() => {
    const refreshLegend = initLegend(map, () => activeLayer);
    refreshLegend(); // Initial render
    updateLegendDisplay(activeLayer);

    // Debounced refresh on zoom/move
    const debouncedRefresh = debounce(refreshLegend, 300);
    map.on('zoom', debouncedRefresh);
    map.on('moveend', debouncedRefresh);

    // Layer switching
    const layerButtons = document.querySelectorAll('.layer-btn');
    layerButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const layerKey = btn.dataset.layer;
        if (!layers[layerKey]) return;

        layerButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeLayer = layerKey;

        // Close any open party sidebar
        if (window.currentSidebar) {
          window.currentSidebar.remove();
          window.currentSidebar = null;
        }

        // Update visibility and colours
        for (const key in layers) {
          const visible = (key === activeLayer);
          layers[key].visible = visible;
          toggleLayerVisibility(map, key, visible);
        }

        // RCMP overlay: keep outline visible even on other layers
        applyRCMPOverlay(map);

        // Hamlet layers: hide when leaving municipal, respect toggle when entering
        if (activeLayer !== 'municipal') {
          HAMLET_LAYERS.forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
          });
        } else {
          HAMLET_LAYERS.forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showHamlets ? 'visible' : 'none');
          });
        }

        // Show/hide hamlet toggle
        const hamletWrap = document.getElementById('hamlet-toggle-wrap');
        if (hamletWrap) hamletWrap.style.display = activeLayer === 'municipal' ? 'block' : 'none';

        if (layers[activeLayer]?.updateVisibility) {
          layers[activeLayer].updateVisibility(map);
        }

        if (activeLayer === 'provincial') {
          applyRidingColours(map);
        } else if (activeLayer === 'federal') {
          applyFederalRidingColours(map);
        }

        // Switch legend
        updateLegendDisplay(activeLayer);
        if (activeLayer !== 'municipal') refreshLegend();
      });
    });

    // RCMP overlay toggle
    document.getElementById('rcmp-overlay-btn')?.addEventListener('click', () => {
      showRCMPOverlay = !showRCMPOverlay;
      const btn = document.getElementById('rcmp-overlay-btn');
      if (btn) {
        btn.textContent = `RCMP Boundaries: ${showRCMPOverlay ? 'On' : 'Off'}`;
        btn.classList.toggle('active', showRCMPOverlay);
      }
      applyRCMPOverlay(map);
    });

    // Hamlet toggle
    document.getElementById('hamlet-toggle-btn')?.addEventListener('click', () => {
      showHamlets = !showHamlets;
      const btn = document.getElementById('hamlet-toggle-btn');
      if (btn) {
        btn.textContent = `Hamlets: ${showHamlets ? 'On' : 'Off'}`;
        btn.classList.toggle('active', showHamlets);
      }
      HAMLET_LAYERS.forEach(id => {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showHamlets ? 'visible' : 'none');
      });
    });
  }, 500);
});

function debounce(fn, delay = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function applyRCMPOverlay(map) {
  if (!map.getLayer('rcmp-outline')) return;
  // Outline is visible if: RCMP layer is active (full layer on), or overlay toggle is on
  const show = activeLayer === 'rcmp' || showRCMPOverlay;
  map.setLayoutProperty('rcmp-outline', 'visibility', show ? 'visible' : 'none');
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

function updateLegendDisplay(layerKey) {
  const regularLegend = document.getElementById('legend');
  const municipalLegend = document.getElementById('municipal-legend');
  const rcmpLegend = document.getElementById('rcmp-legend');
  if (!regularLegend || !municipalLegend) return;

  regularLegend.style.display = 'none';
  municipalLegend.style.display = 'none';
  if (rcmpLegend) rcmpLegend.style.display = 'none';

  if (layerKey === 'municipal') {
    municipalLegend.style.display = 'block';
  } else if (layerKey === 'rcmp') {
    if (rcmpLegend) rcmpLegend.style.display = 'block';
  } else {
    regularLegend.style.display = 'block';
  }
}

function populateRCMPLegend() {
  const container = document.getElementById('rcmp-legend-items');
  if (!container) return;
  container.innerHTML = Object.entries(RCMP_DISTRICT_COLORS).map(([, { label, color }]) => `
    <div class="legend-item">
      <span class="legend-swatch" style="background:${color};"></span>
      <span>${label}</span>
    </div>`
  ).join('');
}

function populateMunicipalLegend(map) {
  const container = document.getElementById('municipal-legend-items');
  if (!container) return;

  container.innerHTML =
    Object.entries(MUNICIPAL_COLORS).map(([type, { label, color }]) => `
      <div class="legend-item legend-item-clickable" data-type="${type}" data-label="${label}" data-color="${color}">
        <span class="legend-swatch" style="background:${color};"></span>
        <span>${label}</span>
      </div>`
    ).join('') +
    `<div class="legend-item legend-item-clickable" data-type="HAMLET" data-label="Hamlet" data-color="${HAMLET_COLOR}">
      <span class="legend-dot" style="background:${HAMLET_COLOR};"></span>
      <span>Hamlet</span>
    </div>`;

  container.querySelectorAll('.legend-item-clickable').forEach(item => {
    item.addEventListener('click', () => {
      showMunicipalTypeSidebar(item.dataset.type, item.dataset.label, item.dataset.color, map);
    });
  });
}