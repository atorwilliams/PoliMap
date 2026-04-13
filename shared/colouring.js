// colouring.js — Provincial riding colouring, config-driven
import { loadRidingData, getPartyColor, isIndependentRiding } from './data.js';

export async function applyRidingColours(map, config) {
  await loadRidingData();

  const prefix = config.layerPrefix;
  const nameProp = config.boundaryNameProperty;

  const source = map.getSource(`${prefix}-source`);
  if (!source || !source._data || !source._data.features) return;

  const features = source._data.features;
  const usedRidingNames = new Set();
  features.forEach(feature => {
    const name = feature.properties?.[nameProp];
    if (name) usedRidingNames.add(name);
  });

  if (!config.partisan) {
    // Non-partisan: colour all ridings uniformly
    if (map.getLayer(`${prefix}-fill`)) {
      map.setPaintProperty(`${prefix}-fill`, 'fill-color', '#4A90D9');
      map.triggerRepaint();
    }
    return;
  }

  // Partisan: build colour match expression from party data
  const colorMatch = ['match', ['get', nameProp]];
  const independentRidings = [];

  usedRidingNames.forEach(ridingName => {
    const color = getPartyColor(ridingName);
    colorMatch.push(ridingName, color);
    if (isIndependentRiding(ridingName)) {
      independentRidings.push(ridingName);
    }
  });

  colorMatch.push('#D3D3D3'); // fallback

  if (map.getLayer(`${prefix}-fill`)) {
    map.setPaintProperty(`${prefix}-fill`, 'fill-color', colorMatch);
    map.triggerRepaint();
  }

  if (map.getLayer(`${prefix}-fill-independent`)) {
    const filter = independentRidings.length > 0
      ? ['in', ['get', nameProp], ['literal', independentRidings]]
      : ['==', ['get', nameProp], ''];
    map.setFilter(`${prefix}-fill-independent`, filter);
  }
}
