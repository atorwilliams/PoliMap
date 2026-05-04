// config.js — Ontario region configuration
export default {
  // Display
  name: 'Ontario',
  center: [-85.0, 46.5],
  zoom: 5.5,
  memberTitle: 'MPP',
  federalMemberTitle: 'MP',
  memberKey: 'mpp',
  federalMemberKey: 'mp',
  legislatureName: 'Legislative Assembly of Ontario',

  // Data files
  dataFile: './json/ridingData.json',
  federalDataFile: './json/federal-riding-data.json',

  // Provincial boundaries
  boundaryFile: './json/provincial.geojson',
  boundaryNameProperty: 'ENGLISH_NA',
  needsReprojection: false,
  layerPrefix: 'on-ed',

  // Federal boundaries
  federalBoundaryFile: './json/federal.geojson',
  federalBoundaryNameProperty: 'ED_NAMEE',

  // Colouring
  partisan: true,

  // Urban label split
  urbanKeywords: ['Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton', 'London', 'Markham', 'Vaughan', 'Kitchener', 'Windsor', 'Richmond Hill', 'Oakville', 'Barrie', 'Oshawa', 'Scarborough', 'Etobicoke', 'North York'],
  urbanMinZoom: 9,
  ruralMinZoom: 6,

  hasMunicipal: true,
  municipalFile: './json/municipal.geojson',
  municipalNameProperty: 'name',
  municipalIdProperty: 'MUNID',
  municipalTypeProperty: 'municipalType',
  municipalTypes: ['MUNICIPALITY', 'REGIONAL', 'DISTRICT'],

  hasRCMP: false,

  // Geocoding
  geocode: {
    countryCode: 'ca',
    viewbox: '-95.2,57.0,-74.3,41.7',
    bounded: false,
    fallbackMessage: 'Try adding "Ontario, Canada" to your search.',
  },
};
