// config.js — Nova Scotia region configuration
export default {
  name: 'Nova Scotia',
  center: [-63.2, 45.2],
  zoom: 7.0,
  minRidingZoom: 5.5,
  memberTitle: 'MLA',
  federalMemberTitle: 'MP',
  memberKey: 'mla',
  federalMemberKey: 'mp',
  legislatureName: 'Nova Scotia House of Assembly',

  dataFile: './json/ridingData.json',
  federalDataFile: './json/federal-riding-data.json',

  boundaryFile: './json/provincial.geojson',
  boundaryNameProperty: 'NAME',
  needsReprojection: false,
  layerPrefix: 'ns-ed',

  federalBoundaryFile: './json/federal.geojson',
  federalNameProperty: 'ED_NAMEE',

  partisan: true,

  premier: {
    name: 'Timothy Houston',
    party: 'Progressive Conservative',
    color: '#003DA5',
    riding: 'Pictou East',
    since: '2021-08-31',
  },

  urbanKeywords: ['Halifax', 'Dartmouth', 'Sydney', 'Truro', 'Sackville'],
  urbanMinZoom: 9,
  ruralMinZoom: 6,

  hasMunicipal: false,
  hasRCMP: false,

  geocode: {
    countryCode: 'ca',
    viewbox: '-67,47.1,-59,43.4',
    bounded: false,
    fallbackMessage: 'Try adding "Nova Scotia, Canada" to your search.',
  },
};
