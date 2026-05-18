// config.js — Prince Edward Island region configuration
export default {
  name: 'Prince Edward Island',
  center: [-63.2, 46.3],
  zoom: 9.0,
  minRidingZoom: 7.5,
  memberTitle: 'MLA',
  federalMemberTitle: 'MP',
  memberKey: 'mla',
  federalMemberKey: 'mp',
  legislatureName: 'Legislative Assembly of Prince Edward Island',

  dataFile: './json/ridingData.json',
  federalDataFile: './json/federal-riding-data.json',

  boundaryFile: './json/provincial.geojson',
  boundaryNameProperty: 'NAME',
  needsReprojection: false,
  layerPrefix: 'pei-ed',

  federalBoundaryFile: './json/federal.geojson',
  federalNameProperty: 'ED_NAMEE',

  partisan: true,

  premier: {
    name: 'Rob Lantz',
    party: 'Progressive Conservative',
    color: '#003DA5',
    riding: 'Charlottetown-Parkdale',
    since: '2025-02-12',
  },

  urbanKeywords: ['Charlottetown', 'Summerside'],
  urbanMinZoom: 10,
  ruralMinZoom: 8,

  hasMunicipal: true,
  municipalDataPath: './json/municipal/',
  municipalPolygonFiles: [
    { file: 'CITY',  type: 'CITY'  },
    { file: 'TOWN',  type: 'TOWN'  },
    { file: 'RURAL', type: 'RURAL' },
  ],
  municipalGeonameProperty: 'GEONAME',
  municipalTypes: ['CITY', 'TOWN', 'RURAL'],

  hasRCMP: false,

  geocode: {
    countryCode: 'ca',
    viewbox: '-64.5,47.1,-61.7,45.9',
    bounded: false,
    fallbackMessage: 'Try adding "Prince Edward Island, Canada" to your search.',
  },
};
