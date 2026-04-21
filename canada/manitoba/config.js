// config.js — Manitoba region configuration
export default {
  // Display
  name: 'Manitoba',
  center: [-98.0, 54.5],
  zoom: 5.5,
  memberTitle: 'MLA',
  federalMemberTitle: 'MP',
  memberKey: 'mla',
  federalMemberKey: 'mp',
  legislatureName: 'Legislative Assembly of Manitoba',

  // Data files
  dataFile: './json/ridingData.json',
  federalDataFile: './json/federal-riding-data.json',

  // Provincial boundaries
  boundaryFile: './json/provincial.geojson',
  boundaryNameProperty: 'ED',
  needsReprojection: false,
  layerPrefix: 'mb-ed',

  // Federal boundaries
  federalBoundaryFile: './json/federal.geojson',
  federalNameProperty: 'FEDENAME',

  // Colouring
  partisan: true,

  // Urban label split
  urbanKeywords: ['Winnipeg', 'Brandon', 'Steinbach', 'Thompson'],
  urbanMinZoom: 9,
  ruralMinZoom: 6,

  hasMunicipal: true,
  municipalFile: './json/municipal.geojson',
  municipalNameProperty: 'NAME',
  municipalIdProperty: 'ID',
  municipalTypeProperty: 'municipalType',
  municipalColor: '#5B8C5A',
  municipalTypes: ['CITY', 'TOWN', 'VILLAGE', 'MUNICIPALITY', 'NORTHERN_COMMUNITY', 'NORTHERN_SETTLEMENT', 'LGD', 'RURAL'],
  hasRCMP: false,

  // Geocoding
  geocode: {
    countryCode: 'ca',
    viewbox: '-102,60,-95,49',
    bounded: false,
    fallbackMessage: 'Try adding "Manitoba, Canada" to your search.',
  },
};
