#!/usr/bin/env python3
"""
Rename NB GeoJSON features to 2024 riding names and populate ridingData.json.
"""
import json

# 27 old GeoJSON names → new 2024 names (approximate mappings)
RENAME = {
    "Albert":                                    "Albert-Riverview",
    "Bathurst East-Nepisiguit-Saint-Isidore":    "Hautes-Terres-Nepisiguit",
    "Bathurst West-Beresford":                   "Bathurst",
    "Campbellton-Dalhousie":                     "Restigouche East",
    "Carleton":                                  "Woodstock-Hartland",
    "Dieppe":                                    "Dieppe-Memramcook",
    "Edmundston-Madawaska Centre":               "Edmundston-Vallée-des-Rivières",
    "Fredericton South":                         "Fredericton South-Silverwood",
    "Fredericton West-Hanwell":                  "Hanwell-New Maryland",
    "Fundy-The Isles-Saint John West":           "Fundy-The Isles-Saint John Lorneville",
    "Gagetown-Petitcodiac":                      "Arcadia-Butternut Valley-Maple Hills",
    "Hampton":                                   "Hampton-Fundy-St. Martins",
    "Kent South":                                "Beausoleil-Grand-Bouctouche-Kent",
    "Memramcook-Tantramar":                      "Tantramar",
    "Miramichi":                                 "Miramichi West",
    "Moncton Southwest":                         "Champdoré-Irishtown",
    "New Maryland-Sunbury":                      "Oromocto-Sunbury",
    "Oromocto-Lincoln-Fredericton":              "Fredericton Lincoln",
    "Portland-Simonds":                          "Saint John Portland-Simonds",
    "Restigouche-Chaleur":                       "Belle-Baie-Belledune",
    "Saint John Lancaster":                      "Saint John West-Lancaster",
    "Shediac-Beaubassin-Cap-Pélé":          "Shediac-Cap-Acadie",
    "Shippagan-Lamèque-Miscou":             "Shippagan-Les-Îles",
    "Southwest Miramichi-Bay du Vin":            "Miramichi East",
    "Sussex-Fundy-St. Martins":                  "Sussex-Three Rivers",
    "Tracadie-Sheila":                           "Tracadie",
    "Victoria-La Vallée":                   "Grand Falls-Vallée-des-Rivières-Saint-Quentin",
}

# --- 1. Rename GeoJSON ---
with open("../canada/nb/json/provincial.geojson", encoding="utf-8") as f:
    geo = json.load(f)

renamed = 0
for feat in geo["features"]:
    old = feat["properties"]["NAME"]
    if old in RENAME:
        feat["properties"]["NAME"] = RENAME[old]
        renamed += 1

with open("../canada/nb/json/provincial.geojson", "w", encoding="utf-8") as f:
    json.dump(geo, f, ensure_ascii=False, separators=(",", ":"))

print(f"GeoJSON: renamed {renamed} features (22 already matched)")

# --- 2. Build ridingData.json ---
with open("nb_scraped.json", encoding="utf-8") as f:
    scraped = json.load(f)

# Index by riding name (strip whitespace/newlines)
by_riding = {}
for m in scraped:
    riding = m.get("riding", "").strip()
    if riding:
        by_riding[riding] = m

# Load existing ridingData skeleton for parties/dates
with open("../canada/nb/json/ridingData.json", encoding="utf-8") as f:
    data = json.load(f)

# Collect all riding names from GeoJSON (now updated)
geo_riding_names = sorted(f["properties"]["NAME"] for f in geo["features"])

# Build ridings dict
ridings = {}
unmatched_scraped = set(by_riding.keys())
unmatched_geo = []

for name in geo_riding_names:
    mla = by_riding.get(name)
    if mla:
        unmatched_scraped.discard(name)
        ridings[name] = {
            "mla": {
                "name":       mla["name"],
                "party":      mla["party"],
                "photo":      mla["photo"],
                "profileUrl": mla["profileUrl"],
                "email":      mla["email"],
                "phone":      mla["phone"],
                "website":    "",
            }
        }
    else:
        unmatched_geo.append(name)
        ridings[name] = {
            "mla": {
                "name": "", "party": "", "photo": None,
                "profileUrl": "#", "email": "", "phone": "", "website": ""
            }
        }

data["ridings"] = ridings

with open("../canada/nb/json/ridingData.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"\nridingData.json: {len(ridings)} ridings, {len(ridings) - len(unmatched_geo)} populated")

if unmatched_geo:
    print(f"\nGeoJSON ridings with NO scraped match ({len(unmatched_geo)}):")
    for n in unmatched_geo:
        print(f"  {n}")

if unmatched_scraped:
    print(f"\nScraped ridings with NO GeoJSON match ({len(unmatched_scraped)}):")
    for n in sorted(unmatched_scraped):
        print(f"  {n}")
