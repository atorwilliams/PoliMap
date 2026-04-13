// search.js — Address search bar + "Your Representatives" results panel, config-driven
import { findProvincialRidingAt } from './ridings.js';
import { findFederalRidingAt } from './federalRidings.js';
import { findMunicipalAt } from './municipalLayer.js';
import { findRCMPAt } from './rcmpLayer.js';
import { loadRidingData, loadFederalRidingData, loadMunicipalData } from './data.js';
import { showMemberDetailSidebar } from './popup.js';

let searchMarker = null;

export function initSearch(map, config) {
  const container = document.createElement('div');
  container.id = 'address-search';
  container.innerHTML = `
    <div class="search-box">
      <input id="search-input" type="text" placeholder="Search your address..." autocomplete="off" spellcheck="false" />
      <button id="search-btn">Find</button>
    </div>
    <div id="search-error" class="search-error"></div>
  `;
  document.body.appendChild(container);

  const input = document.getElementById('search-input');
  const btn   = document.getElementById('search-btn');
  const error = document.getElementById('search-error');

  const run = () => runSearch(map, config, input.value.trim(), btn, error);
  btn.addEventListener('click', run);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
}

async function runSearch(map, config, query, btn, errorEl) {
  if (!query) return;

  errorEl.textContent = '';
  errorEl.classList.remove('visible');
  btn.disabled = true;
  btn.textContent = '...';

  const geo = config.geocode || {};
  const countryCode = geo.countryCode || 'ca';
  const viewbox = geo.viewbox || '';
  const bounded = geo.bounded ? 1 : 0;
  const fallbackMessage = geo.fallbackMessage || 'Address not found.';

  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=${countryCode}&limit=1&bounded=${bounded}`;
    if (viewbox) url += `&viewbox=${viewbox}`;

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const hits = await res.json();

    if (!hits.length) {
      errorEl.textContent = fallbackMessage;
      errorEl.classList.add('visible');
      return;
    }

    const { lat, lon, display_name } = hits[0];
    const lng    = parseFloat(lon);
    const latNum = parseFloat(lat);

    if (searchMarker) searchMarker.remove();
    searchMarker = new maplibregl.Marker({ color: '#FF3B3B' })
      .setLngLat([lng, latNum])
      .addTo(map);
    map.flyTo({ center: [lng, latNum], zoom: 12, duration: 900, essential: true });

    const provincialRiding = findProvincialRidingAt(lng, latNum);
    const federalRiding    = findFederalRidingAt(lng, latNum);
    const municipal        = config.hasMunicipal ? findMunicipalAt(lng, latNum) : null;
    const rcmp             = config.hasRCMP ? findRCMPAt(lng, latNum) : null;

    const [provData, fedData, muniData] = await Promise.all([
      provincialRiding ? loadRidingData().catch(() => null)               : Promise.resolve(null),
      federalRiding    ? loadFederalRidingData().catch(() => null)        : Promise.resolve(null),
      municipal        ? loadMunicipalData(municipal.geoname).catch(() => null) : Promise.resolve(null),
    ]);

    showResults(map, config, {
      display_name, provincialRiding, federalRiding, municipal, rcmp,
      provData, fedData, muniData,
    });

  } catch (err) {
    errorEl.textContent = 'Search failed. Please try again.';
    errorEl.classList.add('visible');
    console.warn('[Search]', err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Find';
  }
}

function showResults(map, config, { display_name, provincialRiding, federalRiding, municipal, rcmp, provData, fedData, muniData }) {
  if (window.currentSidebar) {
    window.currentSidebar.remove();
    window.currentSidebar = null;
  }

  const memberKey = config.memberKey || 'mla';
  const federalMemberKey = config.federalMemberKey || 'mp';

  const member = provData?.ridings?.[provincialRiding]?.[memberKey] || null;
  const mp     = fedData?.ridings?.[federalRiding]?.[federalMemberKey] || null;
  const mayor  = muniData?.mayor || null;

  const memberColor = (member?.party && provData?.parties?.[member.party]?.color) || '#003DA5';
  const mpColor     = '#C0392B';

  const sidebar = document.createElement('div');
  sidebar.className = 'member-detail-sidebar';

  sidebar.innerHTML = `
    <button id="sidebar-close-btn">×</button>
    <div style="height:4px; background:linear-gradient(90deg, ${memberColor}, ${mpColor});"></div>
    <div class="member-info">
      <p class="riding">Your Representatives</p>
      <p class="search-result-address">${display_name}</p>
      <div class="search-rep-list">
        ${repCard({ color: memberColor, label: `Provincial ${config.memberTitle}`, riding: provincialRiding, person: member, reptype: 'provincial' })}
        ${repCard({ color: mpColor, label: `Federal ${config.federalMemberTitle}`, riding: federalRiding, person: mp, reptype: 'federal' })}
        ${municipal ? municipalCard(municipal, mayor) : ''}
        ${rcmp ? rcmpCard(rcmp) : ''}
      </div>
    </div>
  `;

  document.body.appendChild(sidebar);

  sidebar.querySelector('#sidebar-close-btn').addEventListener('click', () => {
    sidebar.remove();
    window.currentSidebar = null;
    document.body.classList.remove('sidebar-open');
  });

  if (member && provincialRiding) {
    sidebar.querySelector('[data-reptype="provincial"]')?.addEventListener('click', () => {
      sidebar.remove();
      window.currentSidebar = null;
      showMemberDetailSidebar(member, provincialRiding, 'provincial', provData?.electionDate, provData?.termEnd, config);
    });
  }
  if (mp && federalRiding) {
    sidebar.querySelector('[data-reptype="federal"]')?.addEventListener('click', () => {
      sidebar.remove();
      window.currentSidebar = null;
      showMemberDetailSidebar(mp, federalRiding, 'federal', fedData?.electionDate, fedData?.termEnd, config);
    });
  }

  setTimeout(() => sidebar.classList.add('open'), 10);
  document.body.classList.add('sidebar-open');
  window.currentSidebar = sidebar;
}

function repCard({ color, label, riding, person, reptype }) {
  if (!riding) {
    return `<div class="search-rep-card" style="border-left-color:#333;">
      <span class="search-rep-label">${label}</span>
      <span class="search-rep-none">Outside region</span>
    </div>`;
  }
  if (!person) {
    return `<div class="search-rep-card" style="border-left-color:${color};">
      <span class="search-rep-label">${label}</span>
      <span class="search-rep-riding">${riding}</span>
      <span class="search-rep-none">No data available</span>
    </div>`;
  }
  const photo = person.photo
    ? `<img class="search-rep-photo" src="${person.photo}" alt="${person.name}">`
    : '';
  const party = person.party
    ? `<span class="search-rep-party" style="background:${color}22;color:${color};">${person.party}</span>`
    : '';
  return `<div class="search-rep-card" style="border-left-color:${color};">
    <span class="search-rep-label">${label}</span>
    <span class="search-rep-riding">${riding}</span>
    <div class="search-rep-person">
      ${photo}
      <div class="search-rep-person-text">
        <strong>${person.name}</strong>
        ${party}
      </div>
    </div>
    <button class="search-detail-btn" data-reptype="${reptype}">Contact & Details →</button>
  </div>`;
}

function municipalCard(municipal, mayor) {
  const mayorRow = mayor ? `
    <div class="search-rep-person">
      <div class="search-rep-person-text">
        <strong>${mayor.name}</strong>
        <span class="search-rep-role">${mayor.title || 'Mayor'}</span>
      </div>
    </div>` : '';
  return `<div class="search-rep-card" style="border-left-color:${municipal.typeColor};">
    <span class="search-rep-label">${municipal.typeLabel}</span>
    <span class="search-rep-riding">${municipal.name}</span>
    ${mayorRow}
  </div>`;
}

function rcmpCard(rcmp) {
  return `<div class="search-rep-card" style="border-left-color:${rcmp.districtColor};">
    <span class="search-rep-label">RCMP Detachment</span>
    <span class="search-rep-riding">${rcmp.district}</span>
    <div class="search-rep-person">
      <div class="search-rep-person-text">
        <strong>${rcmp.detachment}</strong>
        <span class="search-rep-role">${rcmp.contract}</span>
      </div>
    </div>
  </div>`;
}
