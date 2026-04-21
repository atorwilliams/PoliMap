// config.js — British Columbia region configuration
export default {
  // Display
  name: 'British Columbia',
  center: [-122.8, 53.7],
  zoom: 5.5,
  memberTitle: 'MLA',
  federalMemberTitle: 'MP',
  memberKey: 'mla',
  federalMemberKey: 'mp',
  legislatureName: 'Legislative Assembly of British Columbia',

  // Data files
  dataFile: './json/ridingData.json',
  federalDataFile: './json/federal-riding-data.json',

  // Provincial boundaries
  boundaryFile: './json/provincial.geojson',
  boundaryNameProperty: 'ED_NAME',
  needsReprojection: false,
  layerPrefix: 'bc-ed',

  // Federal boundaries
  federalBoundaryFile: './json/federal.geojson',

  // Colouring
  partisan: true,

  // Urban label split
  urbanKeywords: ['Vancouver', 'Surrey', 'Burnaby', 'Richmond', 'Kelowna', 'Abbotsford', 'Victoria', 'Langley', 'Delta', 'Coquitlam'],
  urbanMinZoom: 9,
  ruralMinZoom: 6,

  hasMunicipal: true,
  municipalDataPath: './json/municipal/',
  municipalPolygonFiles: [
    { file: 'REGIONAL', type: 'REGIONAL' },
    { file: 'CITY',     type: 'CITY'     },
    { file: 'TOWN',     type: 'TOWN'     },
    { file: 'VILLAGE',  type: 'VILLAGE'  },
    { file: 'DISTRICT', type: 'DISTRICT' },
    { file: 'RESORT',   type: 'RESORT'   },
  ],
  municipalGeonameProperty: 'GEONAME',
  municipalTypes: ['CITY', 'TOWN', 'VILLAGE', 'DISTRICT', 'RESORT', 'REGIONAL'],

  hasRCMP: false,

  // Geocoding
  geocode: {
    countryCode: 'ca',
    viewbox: '-140,60,-114,48',
    bounded: false,
    fallbackMessage: 'Try adding "British Columbia, Canada" to your search.',
  },
};
