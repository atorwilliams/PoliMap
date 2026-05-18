// config.js — New Brunswick region configuration
export default {
  name: 'New Brunswick',
  center: [-66.6, 46.6],
  zoom: 7.0,
  minRidingZoom: 5.5,
  memberTitle: 'MLA',
  federalMemberTitle: 'MP',
  memberKey: 'mla',
  federalMemberKey: 'mp',
  legislatureName: 'Legislative Assembly of New Brunswick',

  dataFile: './json/ridingData.json',
  federalDataFile: './json/federal-riding-data.json',

  boundaryFile: './json/provincial.geojson',
  boundaryNameProperty: 'NAME',
  needsReprojection: false,
  layerPrefix: 'nb-ed',

  federalBoundaryFile: './json/federal.geojson',
  federalNameProperty: 'ED_NAMEE',

  partisan: true,

  premier: {
    name: 'Susan Holt',
    party: 'Liberal',
    color: '#D71920',
    riding: 'Fredericton-South',
    since: '2024-11-22',
  },

  urbanKeywords: ['Fredericton', 'Moncton', 'Saint John'],
  urbanMinZoom: 9,
  ruralMinZoom: 6,

  hasMunicipal: false,
  hasRCMP: false,

  geocode: {
    countryCode: 'ca',
    viewbox: '-69,48,-63,44',
    bounded: false,
    fallbackMessage: 'Try adding "New Brunswick, Canada" to your search.',
  },
};
