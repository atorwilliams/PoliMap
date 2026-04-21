// config.js — Vienna (Wien) region configuration
export default {
  // Display
  name: 'Wien',
  center: [16.37, 48.21],
  zoom: 11,
  memberTitle: 'Bezirk',
  memberKey: 'bezirk',
  legislatureName: 'City of Vienna',

  // Data
  dataFile: './json/ridingData.json',

  // Boundaries — 23 Bezirke
  boundaryFile: './json/wien_bezirke.json',
  boundaryNameProperty: 'NAMEK',
  needsReprojection: false,
  layerPrefix: 'wien-bez',

  // No federal layer
  // No municipal layer
  // No RCMP

  // Colouring — partisan by party
  partisan: true,

  // Labels — everything is urban density
  urbanKeywords: [],
  urbanMinZoom: 12,
  ruralMinZoom: 11,

  hasMunicipal: false,
  hasRCMP: false,

  // Geocoding
  geocode: {
    countryCode: 'at',
    viewbox: '16.18,48.33,16.58,48.12',
    bounded: true,
    fallbackMessage: 'Try adding "Wien, Austria" to your search.',
  },
};
