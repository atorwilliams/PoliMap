// legend.js — Legend rendering, config-driven
import { loadRidingData, loadFederalRidingData } from './data.js';
import { showPartySidebar } from './popup.js';

function formatLegendDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short' });
}

export function initLegend(map, getActiveLayer, config) {
  const legend = document.getElementById('legend');
  if (!legend) return null;
  return () => updateLegend(map, getActiveLayer(), config);
}

export async function updateLegend(map, activeLayer, config) {
  const legendParties = document.getElementById('legend-parties');
  if (!legendParties) return;

  legendParties.innerHTML = '';

  if (!config.partisan) {
    const data = await loadRidingData();
    const memberKey = config.memberKey;
    const ridings = data.ridings || {};
    const p = config.premier;

    const members = Object.entries(ridings).map(([ridingName, riding]) => {
      const official = riding[memberKey] || {};
      return {
        name: official.name || '',
        party: 'Non-partisan',
        riding: ridingName,
        photo: official.photo || '',
        heroPhoto: official.heroPhoto || official.photo || '',
        profileUrl: official.profileUrl || '#',
        email: official.email || '',
        phone: official.phone || '',
        website: official.website || '',
        contact: official.contact || {},
        heroPhotoOffsetX: official.heroPhotoOffsetX ?? 50,
        heroPhotoOffsetY: official.heroPhotoOffsetY ?? 50,
        isPremier: p?.name === official.name,
      };
    }).filter(m => m.name);

    const swatch = document.createElement('div');
    swatch.style.cssText = 'display:flex; align-items:center; margin:6px 0; cursor:pointer; padding:6px; border-radius:6px; transition:background 0.2s;';
    swatch.innerHTML = `
      <div style="width:20px; height:20px; background:#6B8E6B; border-radius:4px; margin-right:10px; flex-shrink:0;"></div>
      <div>
        <div style="font-weight:bold;">${p ? p.name : 'Non-partisan'} &amp; ${members.length} leaders</div>
        ${p ? `<div style="color:rgba(255,255,255,0.45); font-size:0.78em;">Premier · ${p.riding}</div>` : ''}
      </div>
    `;
    swatch.addEventListener('click', () => showPartySidebar(map, 'Non-partisan', members, activeLayer));
    swatch.addEventListener('mouseenter', () => swatch.style.background = 'rgba(255,255,255,0.12)');
    swatch.addEventListener('mouseleave', () => swatch.style.background = 'transparent');
    legendParties.appendChild(swatch);
    return;
  }

  let data;
  if (activeLayer === 'provincial') {
    data = await loadRidingData();
  } else if (activeLayer === 'federal') {
    data = await loadFederalRidingData();
  } else {
    return;
  }

  const memberKey = activeLayer === 'federal' ? (config.federalMemberKey || 'mp') : config.memberKey;
  const parties = data.parties || {};
  const ridings = data.ridings || {};

  const partyMembers = {};
  Object.entries(parties).forEach(([partyKey, info]) => {
    partyMembers[partyKey] = { color: info.color, members: [] };
  });

  Object.entries(ridings).forEach(([ridingName, riding]) => {
    const official = riding[memberKey];
    if (official && official.party && partyMembers[official.party]) {
      partyMembers[official.party].members.push({
        name: official.name,
        party: official.party,
        riding: ridingName,
        photo: official.photo || '',
        heroPhoto: official.heroPhoto || official.photo || '',
        profileUrl: official.profileUrl || '#',
        contact: official.contact || {},
        heroPhotoOffsetX: official.heroPhotoOffsetX ?? 50,
        heroPhotoOffsetY: official.heroPhotoOffsetY ?? 50,
        isPremier: config.premier?.name === official.name,
      });
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

    swatch.addEventListener('click', () => showPartySidebar(map, partyKey, info.members, activeLayer));
    swatch.addEventListener('mouseenter', () => swatch.style.background = 'rgba(255,255,255,0.12)');
    swatch.addEventListener('mouseleave', () => swatch.style.background = 'transparent');

    legendParties.appendChild(swatch);
  });
}
