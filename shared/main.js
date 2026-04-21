// main.js — Generic map initialiser, driven entirely by region config
import { initData } from './data.js';
import { initRidings, updateRidingVisibility } from './ridings.js';
import { initFederalRidings, updateFederalVisibility } from './federalRidings.js';
import { initInteractions } from './interactions.js';
import { initFederalInteractions } from './federalInteractions.js';
import { applyRidingColours } from './colouring.js';
import { applyFederalRidingColours } from './federalColouring.js';
import { initLegend, updateLegend } from './legend.js';
import { initSearch } from './search.js';
import { initMunicipal, updateMunicipalVisibility, MUNICIPAL_COLORS, HAMLET_COLOR, showMunicipalTypeSidebar } from './municipalLayer.js';
import { initRCMP, updateRCMPVisibility, RCMP_DISTRICT_COLORS } from './rcmpLayer.js';

const HAMLET_LAYERS = ['municipal-hamlet', 'municipal-hamlet-label'];
let showHamlets = false;
let showRCMPOverlay = false;

export async function initMap(config) {
  // Initialise data module with config (sets fetch paths, member key, etc.)
  initData(config);

  // Build layer registry based on config
  const layers = buildLayers(config);

  document.addEventListener('DOMContentLoaded', async () => {
    const activeBtn = document.querySelector('.layer-btn.active');
    let activeLayer = activeBtn?.dataset.layer || 'provincial';
    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: config.center,
      zoom: config.zoom,
      attributionControl: true
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    await new Promise(resolve => map.on('load', resolve));

    // Initialise all layers
    for (const key in layers) {
      await layers[key].init(map, config);
    }

    // Set initial visibility
    for (const key in layers) {
      const visible = (key === activeLayer);
      layers[key].visible = visible;
      toggleLayerVisibility(map, layers, key, visible);
    }

    if (layers[activeLayer]?.updateVisibility) {
      layers[activeLayer].updateVisibility(map, config);
    }

    // Apply initial colours
    if (activeLayer === 'provincial') applyRidingColours(map, config);
    else if (activeLayer === 'federal') applyFederalRidingColours(map, config);

    initInteractions(map, config);
    initFederalInteractions(map, config);
    initSearch(map, config);

    if (config.hasMunicipal) populateMunicipalLegend(map, config);
    if (config.hasRCMP) populateRCMPLegend();

    setTimeout(() => {
      const refreshLegend = initLegend(map, () => activeLayer, config);
      refreshLegend();
      updateLegendDisplay(config, activeLayer);

      const debouncedRefresh = debounce(refreshLegend, 300);
      map.on('zoom', debouncedRefresh);
      map.on('moveend', debouncedRefresh);

      map.on('zoomend', () => {
        if (layers[activeLayer]?.updateVisibility) {
          layers[activeLayer].updateVisibility(map, config);
        }
      });

      // Layer switching
      document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const layerKey = btn.dataset.layer;
          if (!layers[layerKey]) return;

          document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeLayer = layerKey;

          if (window.currentSidebar) {
            window.currentSidebar.remove();
            window.currentSidebar = null;
          }

          for (const key in layers) {
            const visible = (key === activeLayer);
            layers[key].visible = visible;
            toggleLayerVisibility(map, layers, key, visible);
          }

          applyRCMPOverlay(map, config, activeLayer);

          if (activeLayer !== 'municipal') {
            HAMLET_LAYERS.forEach(id => {
              if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
            });
          } else {
            HAMLET_LAYERS.forEach(id => {
              if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showHamlets ? 'visible' : 'none');
            });
          }

          const hamletWrap = document.getElementById('hamlet-toggle-wrap');
          if (hamletWrap) hamletWrap.style.display = activeLayer === 'municipal' ? 'block' : 'none';

          if (layers[activeLayer]?.updateVisibility) {
            layers[activeLayer].updateVisibility(map, config);
          }

          if (activeLayer === 'provincial') applyRidingColours(map, config);
          else if (activeLayer === 'federal') applyFederalRidingColours(map, config);

          updateLegendDisplay(config, activeLayer);
          if (activeLayer !== 'municipal') refreshLegend();
        });
      });

      document.getElementById('rcmp-overlay-btn')?.addEventListener('click', () => {
        showRCMPOverlay = !showRCMPOverlay;
        const btn = document.getElementById('rcmp-overlay-btn');
        if (btn) {
          btn.textContent = `RCMP Boundaries: ${showRCMPOverlay ? 'On' : 'Off'}`;
          btn.classList.toggle('active', showRCMPOverlay);
        }
        applyRCMPOverlay(map, config, activeLayer);
      });

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
}

function buildLayers(config) {
  const layers = {
    provincial: {
      name: `Provincial (${config.memberTitle}s)`,
      init: initRidings,
      updateVisibility: updateRidingVisibility,
      visible: true,
      layers: buildProvincialLayerIds(config),
    },
    federal: {
      name: `Federal (${config.federalMemberTitle}s)`,
      init: initFederalRidings,
      updateVisibility: updateFederalVisibility,
      visible: false,
      layers: ['federal-fill', 'federal-outline', 'federal-highlight', 'federal-label'],
    },
  };

  if (config.hasMunicipal) {
    layers.municipal = {
      name: 'Municipal',
      init: initMunicipal,
      updateVisibility: updateMunicipalVisibility,
      visible: false,
      layers: ['municipal-fill', 'municipal-fill-hatch', 'municipal-highlight', 'municipal-outline', 'municipal-label-rural', 'municipal-label-urban'],
    };
  }

  if (config.hasRCMP) {
    layers.rcmp = {
      name: 'RCMP Districts',
      init: initRCMP,
      updateVisibility: updateRCMPVisibility,
      visible: false,
      layers: ['rcmp-fill', 'rcmp-outline', 'rcmp-highlight', 'rcmp-label'],
    };
  }

  return layers;
}

function buildProvincialLayerIds(config) {
  const prefix = config.layerPrefix;
  const ids = [`${prefix}-fill`, `${prefix}-outline`, `${prefix}-highlight`, `${prefix}-label-rural`];
  if (config.partisan) ids.push(`${prefix}-fill-independent`);
  if (config.urbanKeywords?.length) ids.push(`${prefix}-label-urban`);
  return ids;
}

function debounce(fn, delay = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function applyRCMPOverlay(map, config, activeLayer) {
  if (!config.hasRCMP || !map.getLayer('rcmp-outline')) return;
  const show = activeLayer === 'rcmp' || showRCMPOverlay;
  map.setLayoutProperty('rcmp-outline', 'visibility', show ? 'visible' : 'none');
}

function toggleLayerVisibility(map, layers, layerKey, visible) {
  const layer = layers[layerKey];
  if (!layer) return;
  layer.layers.forEach(id => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  });
}

function updateLegendDisplay(config, layerKey) {
  const regularLegend  = document.getElementById('legend');
  const municipalLegend = document.getElementById('municipal-legend');
  const rcmpLegend     = document.getElementById('rcmp-legend');

  if (regularLegend)  regularLegend.style.display  = 'none';
  if (municipalLegend) municipalLegend.style.display = 'none';
  if (rcmpLegend)     rcmpLegend.style.display     = 'none';

  if (layerKey === 'municipal' && municipalLegend) {
    municipalLegend.style.display = 'block';
  } else if (layerKey === 'rcmp' && rcmpLegend) {
    rcmpLegend.style.display = 'block';
  } else if (regularLegend) {
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

function populateMunicipalLegend(map, config) {
  const container = document.getElementById('municipal-legend-items');
  if (!container) return;

  // Type-based legend, filtered to the province's active types
  const allowedTypes = config.municipalTypes || null;
  const colorEntries = Object.entries(MUNICIPAL_COLORS)
    .filter(([type]) => !allowedTypes || allowedTypes.includes(type));

  const hamletInEntries = colorEntries.some(([type]) => type === 'HAMLET');
  container.innerHTML =
    colorEntries.map(([type, { label, color }]) => `
      <div class="legend-item legend-item-clickable" data-type="${type}" data-label="${label}" data-color="${color}">
        <span class="legend-swatch" style="background:${color};"></span>
        <span>${label}</span>
      </div>`
    ).join('') +
    (hamletInEntries ? '' : `<div class="legend-item legend-item-clickable" data-type="HAMLET" data-label="Hamlet" data-color="${HAMLET_COLOR}">
      <span class="legend-dot" style="background:${HAMLET_COLOR};"></span>
      <span>Hamlet</span>
    </div>`);

  container.querySelectorAll('.legend-item-clickable').forEach(item => {
    item.addEventListener('click', () => {
      showMunicipalTypeSidebar(item.dataset.type, item.dataset.label, item.dataset.color, map);
    });
  });
}
