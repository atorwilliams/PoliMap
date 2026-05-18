import requests
import json
import os
import time

BASE = 'https://represent.opennorth.ca'


def fetch_all_boundaries(slug):
    boundaries = []
    url = f'{BASE}/boundaries/{slug}/?limit=100'
    while url:
        r = requests.get(url, timeout=30)
        data = r.json()
        boundaries.extend(data.get('objects', []))
        next_url = data.get('meta', {}).get('next')
        url = (BASE + next_url) if next_url else None
    return boundaries


provinces = [
    ('nb', 'new-brunswick-electoral-districts-2018', r'C:\Users\justt\Documents\PoliMap\canada\nb\json'),
    ('ns', 'nova-scotia-electoral-districts-2019', r'C:\Users\justt\Documents\PoliMap\canada\ns\json'),
    ('pei', 'prince-edward-island-electoral-districts-2017', r'C:\Users\justt\Documents\PoliMap\canada\pei\json'),
    ('nl', 'newfoundland-and-labrador-electoral-districts', r'C:\Users\justt\Documents\PoliMap\canada\nl\json'),
]

for abbr, slug, out_dir in provinces:
    print(f'--- {abbr.upper()} ({slug}) ---')
    os.makedirs(out_dir, exist_ok=True)

    boundaries = fetch_all_boundaries(slug)
    print(f'  Found {len(boundaries)} boundaries')

    features = []
    for i, b in enumerate(boundaries):
        name = b.get('name', '')
        # shape_url is not in the list response; construct from the boundary URL
        boundary_url = b.get('url', '')
        shape_url = boundary_url.rstrip('/') + '/shape'
        print(f'  [{i+1}/{len(boundaries)}] {name}')
        r = requests.get(BASE + shape_url, timeout=30)
        if r.status_code == 200:
            geom = r.json()
            feature = {
                'type': 'Feature',
                'properties': {'NAME': name},
                'geometry': geom
            }
            features.append(feature)
        else:
            print(f'    WARNING: HTTP {r.status_code} for {name}')
        time.sleep(0.05)

    fc = {'type': 'FeatureCollection', 'features': features}
    out_path = os.path.join(out_dir, 'provincial.geojson')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(fc, f, ensure_ascii=False)

    print(f'  Saved {len(features)} features to {out_path}')
    first5 = [ft['properties']['NAME'] for ft in features[:5]]
    print(f'  First 5: {first5}')
    print()

print('Done.')
