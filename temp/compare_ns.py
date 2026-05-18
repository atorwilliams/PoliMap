import json

with open('../canada/ns/json/provincial.geojson', encoding='utf-8') as f:
    geo = json.load(f)
with open('ns_scraped.json', encoding='utf-8') as f:
    scraped = json.load(f)

# GeoJSON names as-is
geo_names = set(feat['properties']['NAME'] for feat in geo['features'])

# Normalize: replace en-dashes and em-dashes with hyphen, strip (year) suffix
def normalize(s):
    s = s.replace('–', '-').replace('—', '-')  # en/em dash to hyphen
    s = s.replace('�', '-')  # replacement char to hyphen
    # strip "(YYYY)" suffix
    import re
    s = re.sub(r'\s*\(\d{4}\)$', '', s).strip()
    return s

geo_norm = {normalize(n): n for n in geo_names}
api_norm = {normalize(m['constituency']): m for m in scraped}

print('=== MATCHES (normalized) ===')
matches = 0
for key in sorted(geo_norm.keys() & api_norm.keys()):
    g = geo_norm[key]
    a = api_norm[key]['constituency']
    marker = '' if g == a else ' [RENAME NEEDED]'
    print(f'  {key}{marker}')
    if g != a:
        print(f'    geo: {repr(g)}')
        print(f'    api: {repr(a)}')
    matches += 1

print(f'\n=== IN GEO ONLY (no API match) ===')
for key in sorted(geo_norm.keys() - api_norm.keys()):
    print(f'  {repr(geo_norm[key])}')

print(f'\n=== IN API ONLY (no geo match) ===')
for key in sorted(api_norm.keys() - geo_norm.keys()):
    print(f'  {repr(api_norm[key]["constituency"])}')

print(f'\nMatches: {matches}/55')
