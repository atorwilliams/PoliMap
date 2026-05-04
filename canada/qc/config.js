// config.js — Québec region configuration
export default {
  // Display
  name: 'Québec',
  center: [-72.5, 52.0],
  zoom: 5.0,
  memberTitle: 'MNA',
  federalMemberTitle: 'MP',
  memberKey: 'mna',
  federalMemberKey: 'mp',
  legislatureName: 'National Assembly of Québec',

  // Data files
  dataFile: './json/ridingData.json',
  federalDataFile: './json/federal-riding-data.json',

  // Provincial boundaries
  boundaryFile: './json/circonscriptions_electorales_sans_eau_2026.geojson',
  boundaryNameProperty: 'NM_CEP',
  needsReprojection: false,
  layerPrefix: 'qc-ed',

  // Federal boundaries
  federalBoundaryFile: './json/qc_fed_ridings.geojson',
  federalNameProperty: 'ED_NAMEE',

  // Colouring
  partisan: true,

  // Urban label split
  urbanKeywords: ['Montréal', 'Québec', 'Laval', 'Longueuil', 'Gatineau', 'Sherbrooke', 'Saguenay', 'Lévis', 'Trois-Rivières'],
  urbanMinZoom: 9,
  ruralMinZoom: 6,

  hasMunicipal: false,
  hasRCMP: false,

  // Geocoding
  geocode: {
    countryCode: 'ca',
    viewbox: '-79.8,63.0,-57.1,44.9',
    bounded: false,
    fallbackMessage: 'Try adding "Québec, Canada" to your search.',
  },
};
