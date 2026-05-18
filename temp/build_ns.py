#!/usr/bin/env python3
"""
Build NS ridingData.json from open data API and fix GeoJSON en-dashes.
"""
import json, re, urllib.request, csv, io

def normalize_name(s):
    """Strip year suffix, replace any dash-variant with hyphen."""
    s = s.replace('–', '-').replace('—', '-')  # en/em dash
    s = s.replace('�', '-')  # replacement char
    s = re.sub(r'\s*\(\d{4}\)$', '', s).strip()
    return s

PARTY_MAP = {
    "New Democratic Party": "NDP",
    "Progressive Conservative": "Progressive Conservative",
    "Liberal": "Liberal",
    "Independent": "Independent",
    "": "Independent",  # Twila Grosse has blank party
}

# --- 1. Fetch current MLAs ---
url = 'https://data.novascotia.ca/resource/kbqf-dmdt.csv?%24limit=5000'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=20) as r:
    content = r.read().decode('utf-8')

reader = csv.DictReader(io.StringIO(content))
rows = list(reader)
current = [r for r in rows if not r.get('end_date', '').strip()]

# Index by normalized constituency
by_riding = {}
for m in current:
    key = normalize_name(m['constituency'])
    parts = m['name_of_mla'].split(',', 1)
    name = (parts[1].strip() + ' ' + parts[0].strip()) if len(parts) == 2 else m['name_of_mla']
    # Strip middle names/initials for cleaner display — keep first + last
    name_parts = name.split()
    if len(name_parts) > 2:
        # Keep first and last only
        clean_name = name_parts[0] + ' ' + name_parts[-1]
    else:
        clean_name = name
    party_raw = m['party'].strip()
    party = PARTY_MAP.get(party_raw, party_raw)
    by_riding[key] = {
        'name': clean_name,
        'party': party,
        'email': '',
        'phone': '',
        'photo': None,
        'profileUrl': '',
        'website': '',
    }

print(f'Fetched {len(current)} current MLAs')

# --- 2. Fix GeoJSON (replace en-dashes with hyphens) ---
with open('../canada/ns/json/provincial.geojson', encoding='utf-8') as f:
    geo = json.load(f)

fixed = 0
for feat in geo['features']:
    old = feat['properties']['NAME']
    new = normalize_name(old)
    if new != old:
        feat['properties']['NAME'] = new
        fixed += 1

with open('../canada/ns/json/provincial.geojson', 'w', encoding='utf-8') as f:
    json.dump(geo, f, ensure_ascii=False, separators=(',', ':'))

print(f'GeoJSON: fixed {fixed} feature names')

# --- 3. Build ridingData.json ---
with open('../canada/ns/json/ridingData.json', encoding='utf-8') as f:
    data = json.load(f)

geo_names = sorted(normalize_name(feat['properties']['NAME']) for feat in geo['features'])

ridings = {}
unmatched_geo = []
for name in geo_names:
    mla = by_riding.get(name)
    if mla:
        ridings[name] = {'mla': mla}
    else:
        unmatched_geo.append(name)
        ridings[name] = {
            'mla': {'name': '', 'party': '', 'photo': None,
                    'profileUrl': '#', 'email': '', 'phone': '', 'website': ''}
        }

data['ridings'] = ridings

with open('../canada/ns/json/ridingData.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

populated = sum(1 for v in ridings.values() if v['mla']['name'])
print(f'ridingData.json: {len(ridings)} ridings, {populated} populated')

if unmatched_geo:
    print(f'Unmatched GeoJSON ridings: {unmatched_geo}')

unmatched_api = set(by_riding.keys()) - set(ridings.keys())
if unmatched_api:
    print(f'Unmatched API ridings: {sorted(unmatched_api)}')
