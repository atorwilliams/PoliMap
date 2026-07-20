// search.js — Address search via nav modal, config-driven
import { findProvincialRidingAt } from './ridings.js';
import { findFederalRidingAt } from './federalRidings.js';
import { findMunicipalAt } from './municipalLayer.js';
import { findRCMPAt } from './rcmpLayer.js';
import { findSchoolAt } from './schoolLayer.js';
import { loadRidingData, loadFederalRidingData, loadMunicipalData } from './data.js';
import { showMemberDetailSidebar } from './popup.js';

let searchMarker = null;

function closeModal() {
  const modal = document.getElementById('search-modal');
  if (modal) modal.classList.remove('open');
}

export function initSearch(map, config) {
  const navBtn  = document.getElementById('search-nav-btn');
  const modal   = document.getElementById('search-modal');
  const closeBtn = document.getElementById('search-modal-close');
  const input   = document.getElementById('search-input');
  const btn     = document.getElementById('search-btn');
  const error   = document.getElementById('search-error');

  if (!navBtn || !modal) return;

  navBtn.addEventListener('click', () => {
    modal.classList.add('open');
    input?.focus();
  });

  closeBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  const run = () => runSearch(map, config, input.value.trim(), btn, error);
  btn?.addEventListener('click', run);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
}

async function runSearch(map, config, query, btn, errorEl) {
  if (!query) return;

  const results = document.getElementById('search-results');
  errorEl.textContent = '';
  errorEl.classList.remove('visible');
  if (results) results.innerHTML = '';
  btn.disabled = true;
  btn.textContent = '...';

  const geo = config.geocode || {};
  const countryCode    = geo.countryCode    || 'ca';
  const viewbox        = geo.viewbox        || '';
  const bounded        = geo.bounded        ? 1 : 0;
  const fallbackMessage = geo.fallbackMessage || 'Address not found.';

  const postalCodeRe = /^([A-Za-z]\d[A-Za-z])\s?(\d[A-Za-z]\d)$/;
  const postalMatch  = countryCode === 'ca' && query.match(postalCodeRe);

  try {
    let lng, latNum, display_name;

    if (postalMatch) {
      const code = (postalMatch[1] + postalMatch[2]).toUpperCase();
      const res  = await fetch(`https://represent.opennorth.ca/postcodes/${code}/`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Represent API ${res.status}`);
      const data = await res.json();
      if (!data.centroid) {
        errorEl.textContent = 'Postal code not found.';
        errorEl.classList.add('visible');
        return;
      }
      [lng, latNum] = data.centroid.coordinates;
      display_name  = `${postalMatch[1].toUpperCase()} ${postalMatch[2].toUpperCase()}${data.city ? ', ' + data.city.charAt(0) + data.city.slice(1).toLowerCase() : ''}`;
    } else {
      let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=${countryCode}&limit=1&bounded=${bounded}`;
      if (viewbox) url += `&viewbox=${viewbox}`;
      const res  = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Nominatim ${res.status}`);
      const hits = await res.json();
      if (!hits.length) {
        errorEl.textContent = fallbackMessage;
        errorEl.classList.add('visible');
        return;
      }
      ({ display_name } = hits[0]);
      lng    = parseFloat(hits[0].lon);
      latNum = parseFloat(hits[0].lat);
    }

    if (searchMarker) searchMarker.remove();
    searchMarker = new maplibregl.Marker({ color: '#FF3B3B' })
      .setLngLat([lng, latNum])
      .addTo(map);
    map.flyTo({ center: [lng, latNum], zoom: 12, duration: 900, essential: true });

    const provincialRiding = findProvincialRidingAt(lng, latNum);
    const federalRiding    = findFederalRidingAt(lng, latNum);
    const municipal        = config.hasMunicipal ? findMunicipalAt(lng, latNum) : null;
    const rcmp             = config.hasRCMP      ? findRCMPAt(lng, latNum)      : null;
    const school           = config.hasSchool    ? findSchoolAt(lng, latNum)    : null;

    const [provData, fedData, muniData] = await Promise.all([
      provincialRiding ? loadRidingData().catch(() => null)                    : Promise.resolve(null),
      federalRiding    ? loadFederalRidingData().catch(() => null)             : Promise.resolve(null),
      municipal        ? loadMunicipalData(municipal.geoname).catch(() => null) : Promise.resolve(null),
    ]);

    showResults(map, config, {
      display_name, provincialRiding, federalRiding, municipal, rcmp, school,
      provData, fedData, muniData,
    });

  } catch (err) {
    errorEl.textContent = 'Search failed. Please try again.';
    errorEl.classList.add('visible');
    console.warn('[Search]', err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Search';
  }
}

function showResults(map, config, { display_name, provincialRiding, federalRiding, municipal, rcmp, school, provData, fedData, muniData }) {
  const results = document.getElementById('search-results');
  if (!results) return;

  const memberKey        = config.memberKey        || 'mla';
  const federalMemberKey = config.federalMemberKey || 'mp';

  const member = provData?.ridings?.[provincialRiding]?.[memberKey] || null;
  const mp     = fedData?.ridings?.[federalRiding]?.[federalMemberKey] || null;
  const mayor  = muniData?.mayor || null;

  const memberColor = (member?.party && provData?.parties?.[member.party]?.color) || '#003DA5';
  const mpColor     = '#C0392B';

  results.innerHTML = `
    <p class="search-result-address">${display_name}</p>
    <div class="search-rep-list">
      ${repCard({ color: memberColor, label: `Provincial ${config.memberTitle}`, riding: provincialRiding, person: member, reptype: 'provincial' })}
      ${repCard({ color: mpColor, label: `Federal ${config.federalMemberTitle}`, riding: federalRiding, person: mp, reptype: 'federal' })}
      ${municipal ? municipalCard(municipal, mayor) : ''}
      ${rcmp ? rcmpCard(rcmp) : ''}
      ${school ? schoolCard(school) : ''}
    </div>
  `;

  if (member && provincialRiding) {
    results.querySelector('[data-reptype="provincial"]')?.addEventListener('click', () => {
      closeModal();
      showMemberDetailSidebar(member, provincialRiding, 'provincial', provData?.electionDate, provData?.termEnd, config);
    });
  }
  if (mp && federalRiding) {
    results.querySelector('[data-reptype="federal"]')?.addEventListener('click', () => {
      closeModal();
      showMemberDetailSidebar(mp, federalRiding, 'federal', fedData?.electionDate, fedData?.termEnd, config);
    });
  }
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

function schoolCard(school) {
  const trusteeRow = school.ward?.trustee ? `
    <div class="search-rep-person">
      <div class="search-rep-person-text">
        <strong>${school.ward.trustee}</strong>
        <span class="search-rep-role">Elected Trustee · ${school.ward.wardLabel}</span>
      </div>
    </div>` : '';
  return `<div class="search-rep-card" style="border-left-color:${school.color};">
    <span class="search-rep-label">${school.type}</span>
    <span class="search-rep-riding">${school.name}</span>
    ${trusteeRow}
  </div>`;
}
