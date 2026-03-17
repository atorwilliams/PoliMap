// peek-alberta-names.js
const fs = require('fs');

const file = 'federal-ridings-wgs84.geojson';  // your filename

const albertaKeywords = [
  'Calgary', 'Edmonton', 'Lethbridge', 'Red Deer', 'Medicine Hat',
  'Fort McMurray', 'Grande Prairie', 'Banff', 'Yellowhead', 'Peace River',
  'Wetaskiwin', 'Foothills', 'Crowfoot', 'Bow River', 'Airdrie'
];

try {
  const raw = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(raw);

  console.log('Scanning for Alberta-related ridings...');
  let count = 0;
  const found = [];

  data.features.forEach((feature, index) => {
    const props = feature.properties || {};
    const name = (props.ED_NAMEE || props.NAME || props['ED_NAMEE'] || '').trim();

    if (name && albertaKeywords.some(kw => name.toLowerCase().includes(kw.toLowerCase()))) {
      count++;
      found.push({
        index,
        name,
        fullProperties: props
      });
      console.log(`Found possible AB riding #${count}: "${name}"`);
      console.log('Full properties:', JSON.stringify(props, null, 2));
      console.log('---');
    }
  });

  if (count === 0) {
    console.log('No matches found. Try searching the file manually for "Calgary" or "Edmonton" in a text editor.');
    console.log('Look inside a "properties": {} block near lng/lat around -114, 51 (Calgary area).');
  } else {
    console.log(`Found ${count} possible Alberta ridings.`);
  }
} catch (err) {
  console.error('Error:', err.message);
}