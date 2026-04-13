// federalColouring.js — Federal riding colouring, config-driven
import { loadFederalRidingData } from './data.js';

export async function applyFederalRidingColours(map, config) {
  let data;
  try {
    data = await loadFederalRidingData();
  } catch (err) {
    return;
  }

  if (!data || !data.ridings) return;

  const colorMatch = ['match', ['get', 'name']];

  const source = map.getSource('federal-source');
  if (!source || !source._data || !source._data.features) return;

  const features = source._data.features;
  const usedNames = new Set();
  features.forEach(f => {
    const name = f.properties?.name?.trim();
    if (name) usedNames.add(name);
  });

  const memberKey = config.federalMemberKey || 'mp';

  usedNames.forEach(name => {
    const normalized = name.replace(/[\u2013\u2014]/g, '-').trim();
    const entry = data.ridings[normalized] || data.ridings[name];
    let color = '#D3D3D3';

    if (entry && entry[memberKey] && entry[memberKey].party) {
      color = data.parties?.[entry[memberKey].party]?.color || '#D3D3D3';
    }

    colorMatch.push(name, color);
  });

  colorMatch.push('#D3D3D3');

  if (map.getLayer('federal-fill')) {
    map.setPaintProperty('federal-fill', 'fill-color', colorMatch);
    map.triggerRepaint();
  }
}
