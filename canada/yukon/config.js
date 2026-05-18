// config.js — Yukon region configuration
export default {
  name: 'Yukon',
  center: [-135.2, 63.2],
  zoom: 5.5,
  minRidingZoom: 4.5,
  memberTitle: 'MLA',
  federalMemberTitle: 'MP',
  memberKey: 'mla',
  federalMemberKey: 'mp',
  legislatureName: 'Yukon Legislative Assembly',

  dataFile: './json/ridingData.json',
  federalDataFile: './json/federal-riding-data.json',

  boundaryFile: './json/provincial.geojson',
  boundaryNameProperty: 'NAME',
  needsReprojection: false,
  layerPrefix: 'yk-ed',

  federalBoundaryFile: './json/federal.geojson',
  federalNameProperty: 'NAME',

  partisan: true,

  premier: {
    name: 'Currie Dixon',
    party: 'Yukon Party',
    color: '#003DA5',
    riding: 'Copperbelt North',
    since: '2025-11-12',
  },

  urbanKeywords: ['Whitehorse', 'Porter Creek', 'Riverdale', 'Mountainview', 'Copperbelt', 'Whistle Bend', 'Takhini'],
  urbanMinZoom: 8,
  ruralMinZoom: 5,

  hasMunicipal: false,
  hasRCMP: false,

  geocode: {
    countryCode: 'ca',
    viewbox: '-141,69,-123,60',
    bounded: false,
    fallbackMessage: 'Try adding "Yukon, Canada" to your search.',
  },
};
