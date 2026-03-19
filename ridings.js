function addCrosshatchPattern(map) {
  const size = 14;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(30, 30, 30, 1)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'square';

  ctx.beginPath();
  // \ diagonals (main + two wrapped edge segments)
  ctx.moveTo(0, 0);    ctx.lineTo(size, size);
  ctx.moveTo(half, 0); ctx.lineTo(size, half);
  ctx.moveTo(0, half); ctx.lineTo(half, size);
  // / diagonals (main + two wrapped edge segments)
  ctx.moveTo(size, 0); ctx.lineTo(0, size);
  ctx.moveTo(half, 0); ctx.lineTo(0, half);
  ctx.moveTo(size, half); ctx.lineTo(half, size);
  ctx.stroke();

  map.addImage('hatch-independent', ctx.getImageData(0, 0, size, size));
}

export async function initRidings(map) {
  proj4.defs('EPSG:3401', '+proj=tmerc +lat_0=0 +lon_0=-115 +k=0.9992 +x_0=0 +y_0=0 +ellps=GRS80 +datum=NAD83 +units=m +no_defs');

  addCrosshatchPattern(map);

  map.addSource('ed-source', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] }
  });

  try {
    const geoResponse = await fetch('/json/alberta-ed-ridings-wgs84.geojson');
    if (!geoResponse.ok) throw new Error(`GeoJSON fetch failed: ${geoResponse.status}`);
    let geojson = await geoResponse.json();

    function reprojectGeoJSON(geojson) {
      const newFeatures = geojson.features.map(feature => {
        if (!feature.geometry || !feature.geometry.coordinates) return feature;

        const newCoords = feature.geometry.coordinates.map(ring => {
          return ring.map(coord => {
            if (!Array.isArray(coord) || coord.length < 2) return coord;
            const [x, y] = coord;
            if (typeof x !== 'number' || typeof y !== 'number') return coord;
            return proj4('EPSG:3401', 'EPSG:4326', [x, y]);
          });
        });

        return {
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: newCoords
          }
        };
      });

      return { ...geojson, features: newFeatures };
    }

    geojson = reprojectGeoJSON(geojson);

    map.getSource('ed-source').setData(geojson);

    map.addLayer({
      id: 'ed-fill',
      type: 'fill',
      source: 'ed-source',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': '#D3D3D3',
        'fill-opacity': 0.35,
        'fill-outline-color': '#666666'
      }
    });

    map.addLayer({
      id: 'ed-fill-independent',
      type: 'fill',
      source: 'ed-source',
      layout: { visibility: 'none' },
      paint: {
        'fill-pattern': 'hatch-independent',
        'fill-opacity': 0.5
      },
      filter: ['==', ['get', 'EDName2017'], '']
    });

    map.addLayer({
      id: 'ed-outline',
      type: 'line',
      source: 'ed-source',
      layout: { visibility: 'none' },
      paint: {
        'line-color': '#666666',
        'line-width': 1.2
      }
    });

    map.addLayer({
      id: 'ed-highlight',
      type: 'fill',
      source: 'ed-source',
      paint: {
        'fill-color': '#ffffff',
        'fill-opacity': 0.6,
        'fill-outline-color': '#000000'
      },
      layout: { visibility: 'none' },
      filter: ['==', ['get', 'EDName2017'], '']
    });

  } catch (err) {
    // Silent error handling – no console output in production
  }
}

export function updateRidingVisibility(map) {
  const zoom = map.getZoom();
  const visible = zoom >= 5.3;

  ['ed-fill', 'ed-fill-independent', 'ed-outline'].forEach(id => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
  });
}