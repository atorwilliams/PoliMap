// filter-alberta-robust-v2.js
const fs = require('fs');

const inputFile = 'federal-ridings-wgs84.geojson';
const outputFile = 'alberta-federal-ridings-clean.geojson';

const albertaKeywordsLower = [
  'calgary', 'edmonton', 'lethbridge', 'red deer', 'medicine hat',
  'fort mcmurray', 'grande prairie', 'banff', 'airdrie', 'yellowhead',
  'peace river', 'wetaskiwin', 'foothills', 'crowfoot', 'bow river',
  'sherwood park', 'sturgeon river', 'lakeland', 'cardston', 'warner',
  'parkland', 'ponoka', 'didsbury', 'bow'  // added for missing ones
].map(k => k.toLowerCase());

const excludeKeywordsLower = ['prince george']; // to remove BC

try {
  const raw = fs.readFileSync(inputFile, 'utf8');
  const data = JSON.parse(raw);

  console.log(`Original features: ${data.features.length}`);

  const filteredFeatures = data.features.filter((feature, idx) => {
    if (!feature.properties) return false;

    let name = feature.properties.name || feature.properties.ED_NAMEE || '';

    name = (name || '').toString().trim().toLowerCase();

    if (!name || name.length < 5) {
      const searchInProps = (obj) => {
        for (const key in obj) {
          const val = obj[key];
          if (typeof val === 'string' && val.length > 5) {
            const lowerVal = val.toLowerCase();
            if (albertaKeywordsLower.some(kw => lowerVal.includes(kw))) {
              return lowerVal;
            }
          } else if (typeof val === 'object' && val !== null) {
            const found = searchInProps(val);
            if (found) return found;
          }
        }
        return '';
      };
      name = searchInProps(feature.properties);
    }

    const matched = albertaKeywordsLower.some(kw => name.includes(kw)) && !excludeKeywordsLower.some(ex => name.includes(ex));

    if (matched && idx < 10) {
      console.log(`Match #${idx + 1}: "${name.slice(0, 60)}..."`);
    }

    return matched;
  });

  const filtered = {
    type: "FeatureCollection",
    features: filteredFeatures
  };

  fs.writeFileSync(outputFile, JSON.stringify(filtered, null, 2));

  console.log(`\nFiltered to ${filteredFeatures.length} features`);
  if (filteredFeatures.length > 0) {
    console.log('Sample names:');
    filteredFeatures.slice(0, 5).forEach(f => {
      console.log(' - ' + (f.properties.name || 'Unknown'));
    });
  } else {
    console.log('No matches — add more keywords or check the name field.');
  }

} catch (err) {
  console.error('Error:', err.message);
}