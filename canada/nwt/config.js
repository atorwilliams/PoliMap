// config.js — Northwest Territories region configuration
export default {
  name: 'Northwest Territories',
  center: [-114.5, 64.5],
  zoom: 3.5,
  minRidingZoom: 3.0,
  memberTitle: 'MLA',
  federalMemberTitle: 'MP',
  memberKey: 'mla',
  federalMemberKey: 'mp',
  legislatureName: 'Legislative Assembly of the Northwest Territories',

  dataFile: './json/ridingData.json',
  federalDataFile: './json/federal-riding-data.json',

  boundaryFile: './json/provincial.geojson',
  boundaryNameProperty: 'NAME',
  needsReprojection: false,
  layerPrefix: 'nwt-ed',

  federalBoundaryFile: './json/federal.geojson',
  federalNameProperty: 'NAME',

  partisan: false,

  premier: {
    name: 'R.J. Simpson',
    party: 'Non-partisan',
    color: '#6B8E6B',
    riding: 'Hay River North',
    since: '2023-11-27',
  },

  urbanKeywords: ['Yellowknife', 'Hay River', 'Inuvik'],
  urbanMinZoom: 9,
  ruralMinZoom: 4,

  hasMunicipal: false,
  hasRCMP: false,

  geocode: {
    countryCode: 'ca',
    viewbox: '-136,78,-102,60',
    bounded: false,
    fallbackMessage: 'Try adding "Northwest Territories, Canada" to your search.',
  },
};
