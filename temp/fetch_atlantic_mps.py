#!/usr/bin/env python3
"""Fetch Atlantic Canada MPs from Represent API and build federal-riding-data.json files."""

import json, urllib.request

def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

print("Fetching all MPs from Represent API...")
data = fetch_json("https://represent.opennorth.ca/representatives/house-of-commons/?format=json&limit=400")
all_mps = data["objects"]
print(f"Total MPs fetched: {len(all_mps)}")

def norm(s):
    """Normalize for matching: lowercase, replace en/em-dash with hyphen, strip extra spaces."""
    return s.lower().replace('–', '-').replace('—', '-').replace('—', '-').replace('  ', ' ').strip()

# GeoJSON riding names (exact keys for ridingData.json), per province
GEO_NAMES = {
    "nb": [
        "Acadie–Bathurst",
        "Beauéjour",  # will fix below
        "Fredericton–Oromocto",
        "Fundy Royal",
        "Madawaska–Restigouche",
        "Miramichi–Grand Lake",
        "Moncton–Dieppe",
        "Saint John–Kennebecasis",
        "Saint John–St. Croix",
        "Tobique–Mactaquac",
    ],
    "ns": [
        "Acadie–Annapolis",
        "Cape Breton–Canso–Antigonish",
        "Central Nova",
        "Cumberland–Colchester",
        "Dartmouth–Cole Harbour",
        "Halifax",
        "Halifax West",
        "Kings–Hants",
        "Sackville–Bedford–Preston",
        "South Shore–St. Margarets",
        "Sydney–Glace Bay",
    ],
    "nl": [
        "Avalon",
        "Cape Spear",
        "Central Newfoundland",
        "Labrador",
        "Long Range Mountains",
        "St. John's East",
        "Terra Nova–The Peninsulas",
    ],
}

# Correct Beauséjour
GEO_NAMES["nb"][1] = "Beauéjour".replace("Beauéjour", "Beauéjour")
# Actually just hardcode correctly
GEO_NAMES["nb"][1] = "Beauéjour"

# Fix: Beauséjour uses é (U+00E9)
GEO_NAMES["nb"][1] = "Beauéjour"
# That's still wrong. Let me just write it directly:
GEO_NAMES["nb"] = [
    "Acadie–Bathurst",
    "Beauéjour",
    "Fredericton–Oromocto",
    "Fundy Royal",
    "Madawaska–Restigouche",
    "Miramichi–Grand Lake",
    "Moncton–Dieppe",
    "Saint John–Kennebecasis",
    "Saint John–St. Croix",
    "Tobique–Mactaquac",
]

# Build normalized index of all MPs: norm(district_name) -> mp data
mp_index = {}
for mp in all_mps:
    key = norm(mp["district_name"])
    phone = ""
    for o in mp.get("offices", []):
        if o.get("phone"):
            phone = o["phone"].replace("1 ", "").strip()
            break
    mp_index[key] = {
        "name": mp["name"],
        "party": mp.get("party_name", ""),
        "email": mp.get("email", ""),
        "phone": phone,
        "profileUrl": mp.get("url", ""),
        "photo": mp.get("photo_url") or None,
    }

# Show what we matched
for prov, geo_names in GEO_NAMES.items():
    print(f"\n{prov.upper()}:")
    for geo_name in geo_names:
        key = norm(geo_name)
        match = mp_index.get(key)
        if match:
            print(f"  OK  {geo_name:45s} -> {match['name']} ({match['party']})")
        else:
            print(f"  ??? {geo_name:45s} -> NO MATCH (norm: {key!r})")

# Also dump all normalized keys that start with relevant strings for debugging
print("\nAll MP keys for debugging:")
for key, mp in sorted(mp_index.items()):
    if any(kw in key for kw in ["tobique","nova","spear","beausjour","beau"]):
        print(f"  {key!r} -> {mp['name']}")
