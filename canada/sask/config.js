// config.js — Saskatchewan region configuration
export default {
  // Display
  name: 'Saskatchewan',
  center: [-106.0, 54.5],
  zoom: 5.5,
  memberTitle: 'MLA',
  federalMemberTitle: 'MP',
  memberKey: 'mla',
  federalMemberKey: 'mp',
  legislatureName: 'Legislative Assembly of Saskatchewan',

  // Data files
  dataFile: './json/ridingData.json',
  federalDataFile: './json/federal-riding-data.json',

  // Provincial boundaries
  boundaryFile: './json/provincial.geojson',
  boundaryNameProperty: 'CON_NAME',
  needsReprojection: false,
  layerPrefix: 'sk-ed',

  // Federal boundaries
  federalBoundaryFile: './json/federal.geojson',
  federalNameProperty: 'ED_NAMEE',

  // Colouring
  partisan: true,

  // Urban label split
  urbanKeywords: ['Regina', 'Saskatoon', 'Prince Albert', 'Moose Jaw'],
  urbanMinZoom: 9,
  ruralMinZoom: 6,

  hasMunicipal: true,
  municipalFile: './json/municipal/all.geojson',
  municipalNameProperty: 'NAME',
  municipalIdProperty: 'ID',
  municipalTypeProperty: 'municipalType',
  municipalColor: '#5B8C5A',
  municipalTypes: ['CITY', 'TOWN', 'VILLAGE', 'HAMLET', 'NORTHERN_TOWN', 'NORTHERN_VILLAGE', 'NORTHERN_SETTLEMENT', 'RESORT', 'RURAL'],
  hasRCMP: false,

  // Geocoding
  geocode: {
    countryCode: 'ca',
    viewbox: '-110,60,-101,49',
    bounded: false,
    fallbackMessage: 'Try adding "Saskatchewan, Canada" to your search.',
  },
};
