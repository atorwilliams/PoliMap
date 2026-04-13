// config.js — Alberta region configuration
export default {
  // Display
  name: 'Alberta',
  center: [-113.4909, 53.5444],
  zoom: 6,
  memberTitle: 'MLA',
  federalMemberTitle: 'MP',
  memberKey: 'mla',
  federalMemberKey: 'mp',
  legislatureName: 'Legislative Assembly of Alberta',

  // Data files (resolved relative to page URL by fetch())
  dataFile: './json/ridingData.json',
  federalDataFile: './json/federal-riding-data.json',

  // Provincial boundaries
  boundaryFile: './json/alberta-ed-ridings-wgs84.geojson',
  boundaryNameProperty: 'EDName2017',
  needsReprojection: true,
  projectionDef: {
    name: 'EPSG:3401',
    def: '+proj=tmerc +lat_0=0 +lon_0=-115 +k=0.9992 +x_0=0 +y_0=0 +ellps=GRS80 +datum=NAD83 +units=m +no_defs'
  },
  layerPrefix: 'ed',

  // Federal boundaries
  federalBoundaryFile: './json/federal-ridings-wgs84.geojson',

  // Colouring — set partisan: false for non-partisan legislatures (e.g. Nunavut)
  partisan: true,

  // Urban label split — set to null to disable split (single label layer for all ridings)
  urbanKeywords: ['Calgary', 'Edmonton'],
  urbanMinZoom: 9,
  ruralMinZoom: 6,

  // Optional layers
  hasMunicipal: true,
  municipalDataPath: './json/municipal/',

  hasRCMP: true,
  rcmpBoundaryFile: './json/rcmp-boundaries.geojson',
  rcmpDetachmentsFile: './json/rcmp-detachments.json',

  // Geocoding (Nominatim)
  geocode: {
    countryCode: 'ca',
    viewbox: '-120,60,-110,49',  // west, north, east, south
    bounded: false,
    fallbackMessage: 'Try adding "Alberta, Canada" to your search.',
  },
};
