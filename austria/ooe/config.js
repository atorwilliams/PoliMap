// config.js — Oberösterreich region configuration
export default {
  // Display
  name: 'Oberösterreich',
  center: [13.98, 48.0],
  zoom: 8,
  memberTitle: 'Bezirk',
  memberKey: 'bezirk',
  legislatureName: 'State of Upper Austria',

  // Data
  dataFile: './json/ridingData.json',

  // Boundaries — 18 Bezirke
  boundaryFile: './json/BEZIRKSGRENZEN_OOE.geojson',
  boundaryNameProperty: 'BEZ_NAME',
  needsReprojection: false,
  layerPrefix: 'ooe-bez',

  // Colouring
  partisan: true,

  // Labels
  urbanKeywords: ['Stadt Linz', 'Stadt Steyr', 'Stadt Wels'],
  urbanMinZoom: 10,
  ruralMinZoom: 8,

  hasMunicipal: false,
  hasRCMP: false,

  // Geocoding
  geocode: {
    countryCode: 'at',
    viewbox: '12.73,48.78,15.02,47.44',
    bounded: true,
    fallbackMessage: 'Try adding "Oberösterreich, Austria" to your search.',
  },
};
