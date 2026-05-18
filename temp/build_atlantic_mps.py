#!/usr/bin/env python3
"""Fetch 2025 federal MPs and populate federal-riding-data.json for NB, NS, NL."""

import json, urllib.request

def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

def norm(s):
    """Normalize riding name for comparison: lowercase, all dash variants -> hyphen."""
    return (s.lower()
             .replace("—", "-")   # em dash
             .replace("–", "-")   # en dash
             .replace("  ", " ")
             .strip())

print("Fetching all MPs from Represent API...")
data = fetch_json("https://represent.opennorth.ca/representatives/house-of-commons/?format=json&limit=400")
all_mps = data["objects"]
print(f"Total MPs: {len(all_mps)}")

# Build normalized index: norm(district_name) -> mp record
mp_index = {}
for mp in all_mps:
    key = norm(mp["district_name"])
    phone = ""
    for o in mp.get("offices", []):
        if o.get("phone"):
            phone = o["phone"].replace("1 ", "", 1).strip()
            break
    mp_index[key] = {
        "name":       mp["name"],
        "party":      mp.get("party_name", ""),
        "photo":      mp.get("photo_url") or None,
        "profileUrl": mp.get("url", ""),
        "email":      mp.get("email", ""),
        "phone":      phone,
        "website":    "",
    }

provinces = ["nb", "ns", "nl"]
for prov in provinces:
    geo_path  = f"../canada/{prov}/json/federal.geojson"
    data_path = f"../canada/{prov}/json/federal-riding-data.json"

    # Get GeoJSON riding names
    with open(geo_path, encoding="utf-8") as f:
        geo = json.load(f)
    geo_names = sorted(
        {feat["properties"]["ED_NAMEE"] for feat in geo["features"]}
    )

    # Load existing federal-riding-data.json (has parties/dates, keep those)
    with open(data_path, encoding="utf-8") as f:
        fdata = json.load(f)

    ridings = {}
    unmatched = []
    for geo_name in geo_names:
        key = norm(geo_name)
        mp = mp_index.get(key)
        if mp:
            ridings[geo_name] = {"mp": mp}
        else:
            unmatched.append(geo_name)
            # Try to keep existing data if any
            existing = fdata.get("ridings", {}).get(geo_name, {})
            ridings[geo_name] = existing or {"mp": {
                "name": "", "party": "", "photo": None,
                "profileUrl": "#", "email": "", "phone": "", "website": ""
            }}

    fdata["ridings"] = ridings

    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(fdata, f, ensure_ascii=False, indent=2)

    populated = sum(1 for v in ridings.values() if v.get("mp", {}).get("name"))
    print(f"\n{prov.upper()}: {populated}/{len(ridings)} MPs populated")
    if unmatched:
        print(f"  Unmatched: {unmatched}")
