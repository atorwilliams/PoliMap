const fs = require('fs');
const file = 'alberta-federal-ridings-ready.geojson';  // your converted file

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const names = new Set();

data.features.forEach(f => {
  const name = f.properties?.ED_NAMEE || f.properties?.name || f.properties?.EDNAME || '';
  if (name) names.add(name.trim());
});

console.log('Unique names in GeoJSON:');
[...names].sort().forEach(n => console.log(' - ' + n));
console.log('\nTotal unique:', names.size);