// config.js — Nunavut region configuration
export default {
  name: 'Nunavut',
  center: [-90.0, 68.0],
  zoom: 3.0,
  minRidingZoom: 2.5,
  memberTitle: 'MLA',
  federalMemberTitle: 'MP',
  memberKey: 'mla',
  federalMemberKey: 'mp',
  legislatureName: 'Nunavut Legislative Assembly',

  dataFile: './json/ridingData.json',
  federalDataFile: './json/federal-riding-data.json',

  boundaryFile: './json/provincial.geojson',
  boundaryNameProperty: 'NAME',
  needsReprojection: false,
  layerPrefix: 'nu-ed',

  federalBoundaryFile: './json/federal.geojson',
  federalNameProperty: 'NAME',

  partisan: false,

  premier: {
    name: 'John Main',
    party: 'Non-partisan',
    color: '#6B8E6B',
    riding: 'Arviat North-Whale Cove',
    since: '2025-11-20',
  },

  urbanKeywords: ['Iqaluit'],
  urbanMinZoom: 9,
  ruralMinZoom: 4,

  hasMunicipal: false,
  hasRCMP: false,

  geocode: {
    countryCode: 'ca',
    viewbox: '-120,83,-61,56',
    bounded: false,
    fallbackMessage: 'Try adding "Nunavut, Canada" to your search.',
  },
};
