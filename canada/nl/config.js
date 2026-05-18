// config.js — Newfoundland and Labrador region configuration
export default {
  name: 'Newfoundland and Labrador',
  center: [-57.5, 53.0],
  zoom: 5.0,
  minRidingZoom: 4.0,
  memberTitle: 'MHA',
  federalMemberTitle: 'MP',
  memberKey: 'mha',
  federalMemberKey: 'mp',
  legislatureName: 'Newfoundland and Labrador House of Assembly',

  dataFile: './json/ridingData.json',
  federalDataFile: './json/federal-riding-data.json',

  boundaryFile: './json/provincial.geojson',
  boundaryNameProperty: 'NAME',
  needsReprojection: false,
  layerPrefix: 'nl-ed',

  federalBoundaryFile: './json/federal.geojson',
  federalNameProperty: 'ED_NAMEE',

  partisan: true,

  premier: {
    name: 'Tony Wakeham',
    party: 'Progressive Conservative',
    color: '#003DA5',
    riding: 'Stephenville-Port Au Port',
    since: '2025-10-29',
  },

  urbanKeywords: ["St. John's", 'Corner Brook', 'Mount Pearl', 'Paradise', 'Conception Bay'],
  urbanMinZoom: 9,
  ruralMinZoom: 5,

  hasMunicipal: false,
  hasRCMP: false,

  geocode: {
    countryCode: 'ca',
    viewbox: '-68,61,-52,46',
    bounded: false,
    fallbackMessage: 'Try adding "Newfoundland and Labrador, Canada" to your search.',
  },
};
