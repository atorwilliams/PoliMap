import urllib.request, csv, io, json

url = 'https://data.novascotia.ca/resource/kbqf-dmdt.csv?%24limit=5000'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=20) as r:
    content = r.read().decode('utf-8')

reader = csv.DictReader(io.StringIO(content))
rows = list(reader)
current = [r for r in rows if not r.get('end_date', '').strip()]

members = []
for m in current:
    parts = m['name_of_mla'].split(',', 1)
    name = (parts[1].strip() + ' ' + parts[0].strip()) if len(parts) == 2 else m['name_of_mla']
    members.append({
        'name': name,
        'party': m['party'],
        'constituency': m['constituency'],
        'start_date': m['start_date'],
    })

members.sort(key=lambda x: x['constituency'])
for m in members:
    print(m['name'], '|', m['party'], '|', m['constituency'])

print(f'\nTotal: {len(members)}')

with open('ns_scraped.json', 'w', encoding='utf-8') as f:
    json.dump(members, f, ensure_ascii=False, indent=2)
print('Saved to ns_scraped.json')
