import { loadRidingData } from './data.js';
import { loadFederalRidingData } from './data.js';
import { showPartySidebar } from './popup.js';

export function initLegend(map, getActiveLayer) {
  console.log('[LEGEND] Initializing');

  const legend = document.getElementById('legend');
  if (!legend) return;

  const refresh = () => updateLegend(map, getActiveLayer());
  refresh();  // initial call

  legend.addEventListener('click', () => {
    console.log('[LEGEND] Legend clicked');
  });

  return refresh;
}

export async function updateLegend(map, activeLayer) {
  const legendParties = document.getElementById('legend-parties');
  if (!legendParties) return;

  legendParties.innerHTML = '';

  let data;
  let level = activeLayer;

  if (level === 'provincial') {
    data = await loadRidingData();
  } else if (level === 'federal') {
    data = await loadFederalRidingData();
  } else {
    console.warn('[LEGEND] Unknown active layer:', activeLayer);
    return;
  }

  const parties = data.parties || {};
  const ridings = data.ridings || {};

  const partyMembers = {};
  Object.entries(parties).forEach(([partyKey, info]) => {
    partyMembers[partyKey] = {
      color: info.color,
      members: []
    };
  });

  Object.entries(ridings).forEach(([ridingName, riding]) => {
    const official = level === 'federal' ? riding.mp : riding.mla;
    if (official && official.party) {
      const partyKey = official.party;
      if (partyMembers[partyKey]) {
        partyMembers[partyKey].members.push({
          name: official.name,
          riding: ridingName,
          photo: official.photo || '',
          profileUrl: official.profileUrl || '#'
        });
      }
    }
  });

  Object.entries(partyMembers).forEach(([partyKey, info]) => {
    if (info.members.length === 0) return;

    const swatch = document.createElement('div');
    swatch.style.cssText = `
      display: flex; align-items: center; margin: 6px 0; cursor: pointer; padding: 6px;
      border-radius: 6px; transition: background 0.2s;
    `;
    swatch.innerHTML = `
      <div style="width:20px; height:20px; background:${info.color}; border-radius:4px; margin-right:10px;"></div>
      <span style="font-weight:bold;">${partyKey} (${info.members.length})</span>
    `;

    swatch.addEventListener('click', () => {
      showPartySidebar(map, partyKey, info.members, level);
    });

    swatch.addEventListener('mouseenter', () => swatch.style.background = '#f0f0f0');
    swatch.addEventListener('mouseleave', () => swatch.style.background = 'transparent');

    legendParties.appendChild(swatch);
  });
}