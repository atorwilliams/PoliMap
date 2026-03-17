import { loadRidingData } from './data.js';
import { loadFederalRidingData } from './data.js';
import { showPartySidebar } from './popup.js';

export function initLegend(map, getActiveLayer) {
  const legend = document.getElementById('legend');
  if (!legend) return null;

  const refresh = () => updateLegend(map, getActiveLayer());
  refresh();

  return refresh;
}

export async function updateLegend(map, activeLayer) {
  const legendParties = document.getElementById('legend-parties');
  if (!legendParties) return;

  legendParties.innerHTML = '';

  let data;
  if (activeLayer === 'provincial') {
    data = await loadRidingData();
  } else if (activeLayer === 'federal') {
    data = await loadFederalRidingData();
  } else {
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
    const official = activeLayer === 'federal' ? riding.mp : riding.mla;
    if (official && official.party) {
      const partyKey = official.party;
      if (partyMembers[partyKey]) {
        partyMembers[partyKey].members.push({
          name: official.name,
          party: official.party,
          riding: ridingName,
          photo: official.photo || '',
          heroPhoto: official.heroPhoto || official.photo || '',
          profileUrl: official.profileUrl || '#',
          contact: official.contact || {}  // include full contact
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
      showPartySidebar(map, partyKey, info.members, activeLayer);
    });

    swatch.addEventListener('mouseenter', () => swatch.style.background = 'rgba(255,255,255,0.12)');
    swatch.addEventListener('mouseleave', () => swatch.style.background = 'transparent');

    legendParties.appendChild(swatch);
  });
}