#!/usr/bin/env python3
"""Build NL ridingData.json and fix GeoJSON en-dashes."""

import json, re

# All 40 MHAs from 2025 NL general election
MEMBERS = [
    {"name": "Sarah Stoodley",          "party": "Liberal",                  "riding": "Mount Scio"},
    {"name": "Jim Dinn",                "party": "NDP",                      "riding": "St. John's Centre"},
    {"name": "Sheilagh O'Leary",        "party": "NDP",                      "riding": "St. John's East-Quidi Vidi"},
    {"name": "Keith White",             "party": "Liberal",                  "riding": "St. John's West"},
    {"name": "Bernard Davis",           "party": "Liberal",                  "riding": "Virginia Waters-Pleasantville"},
    {"name": "John Hogan",              "party": "Liberal",                  "riding": "Windsor Lake"},
    {"name": "Joedy Wall",              "party": "Progressive Conservative", "riding": "Cape St. Francis"},
    {"name": "Fred Hutton",             "party": "Liberal",                  "riding": "Conception Bay East-Bell Island"},
    {"name": "Barry Petten",            "party": "Progressive Conservative", "riding": "Conception Bay South"},
    {"name": "Lucy Stoyles",            "party": "Liberal",                  "riding": "Mount Pearl North"},
    {"name": "Paul Lane",               "party": "Independent",              "riding": "Mount Pearl-Southlands"},
    {"name": "Paul Dinn",               "party": "Progressive Conservative", "riding": "Topsail-Paradise"},
    {"name": "Jamie Korab",             "party": "Liberal",                  "riding": "Waterford Valley"},
    {"name": "Riley Balsom",            "party": "Progressive Conservative", "riding": "Carbonear-Trinity-Bay de Verde"},
    {"name": "Loyola O'Driscoll",       "party": "Progressive Conservative", "riding": "Ferryland"},
    {"name": "Pam Parsons",             "party": "Liberal",                  "riding": "Harbour Grace-Port de Grave"},
    {"name": "Helen Conway-Ottenheimer","party": "Progressive Conservative", "riding": "Harbour Main"},
    {"name": "Sherry Gambin-Walsh",     "party": "Liberal",                  "riding": "Placentia-St. Mary's"},
    {"name": "Craig Pardy",             "party": "Progressive Conservative", "riding": "Bonavista"},
    {"name": "Paul Pike",               "party": "Liberal",                  "riding": "Burin-Grand Bank"},
    {"name": "Jeff Dwyer",              "party": "Progressive Conservative", "riding": "Placentia West-Bellevue"},
    {"name": "Lloyd Parrott",           "party": "Progressive Conservative", "riding": "Terra Nova"},
    {"name": "Lin Paddock",             "party": "Progressive Conservative", "riding": "Baie Verte-Green Bay"},
    {"name": "Pleaman Forsey",          "party": "Progressive Conservative", "riding": "Exploits"},
    {"name": "Jim McKenna",             "party": "Progressive Conservative", "riding": "Fogo Island-Cape Freels"},
    {"name": "Elvis Loveless",          "party": "Liberal",                  "riding": "Fortune Bay-Cape La Hune"},
    {"name": "Bettina Ford",            "party": "Liberal",                  "riding": "Gander"},
    {"name": "Chris Tibbs",             "party": "Progressive Conservative", "riding": "Grand Falls-Windsor-Buchans"},
    {"name": "Mark Butt",               "party": "Progressive Conservative", "riding": "Lewisporte-Twillingate"},
    {"name": "Michael King",            "party": "Liberal",                  "riding": "Burgeo-La Poile"},
    {"name": "Jim Parsons",             "party": "Liberal",                  "riding": "Corner Brook"},
    {"name": "Eddie Joyce",             "party": "Independent",              "riding": "Humber-Bay of Islands"},
    {"name": "Mike Goosney",            "party": "Progressive Conservative", "riding": "Humber-Gros Morne"},
    {"name": "Andrea Barbour",          "party": "Progressive Conservative", "riding": "St. Barbe-L'Anse aux Meadows"},
    {"name": "Hal Cormier",             "party": "Progressive Conservative", "riding": "St. George's-Humber"},
    {"name": "Tony Wakeham",            "party": "Progressive Conservative", "riding": "Stephenville-Port au Port"},
    {"name": "Lisa Dempster",           "party": "Liberal",                  "riding": "Cartwright-L'Anse au Clair"},
    {"name": "Joseph Power",            "party": "Progressive Conservative", "riding": "Labrador West"},
    {"name": "Keith Russell",           "party": "Progressive Conservative", "riding": "Lake Melville"},
    {"name": "Lela Evans",              "party": "Progressive Conservative", "riding": "Torngat Mountains"},
]

def norm(s):
    """Lowercase + replace dash variants + strip punctuation differences."""
    s = s.replace('–', '-').replace('—', '-').replace('�', '-')
    return s.lower().strip()

# Index by normalized riding
by_riding = {norm(m["riding"]): m for m in MEMBERS}

# --- 1. Fix GeoJSON en-dashes ---
with open("../canada/nl/json/provincial.geojson", encoding="utf-8") as f:
    geo = json.load(f)

fixed = 0
for feat in geo["features"]:
    old = feat["properties"]["NAME"]
    new = old.replace('–', '-').replace('—', '-').replace('�', '-')
    if new != old:
        feat["properties"]["NAME"] = new
        fixed += 1

with open("../canada/nl/json/provincial.geojson", "w", encoding="utf-8") as f:
    json.dump(geo, f, ensure_ascii=False, separators=(",", ":"))
print(f"GeoJSON: fixed {fixed} feature names")

# --- 2. Build ridingData.json ---
with open("../canada/nl/json/ridingData.json", encoding="utf-8") as f:
    data = json.load(f)

geo_names = sorted(feat["properties"]["NAME"] for feat in geo["features"])

ridings = {}
unmatched_geo = []
for geo_name in geo_names:
    mla = by_riding.get(norm(geo_name))
    if mla:
        ridings[geo_name] = {
            "mha": {
                "name":       mla["name"],
                "party":      mla["party"],
                "photo":      None,
                "profileUrl": "",
                "email":      "",
                "phone":      "",
                "website":    "",
            }
        }
    else:
        unmatched_geo.append(geo_name)
        ridings[geo_name] = {
            "mha": {"name": "", "party": "", "photo": None,
                    "profileUrl": "#", "email": "", "phone": "", "website": ""}
        }

data["ridings"] = ridings

with open("../canada/nl/json/ridingData.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

populated = sum(1 for v in ridings.values() if v["mha"]["name"])
print(f"ridingData.json: {len(ridings)} ridings, {populated} populated")

if unmatched_geo:
    print(f"Unmatched GeoJSON: {unmatched_geo}")

unmatched_mha = set(norm(m["riding"]) for m in MEMBERS) - set(norm(n) for n in geo_names)
if unmatched_mha:
    print(f"MHAs with no GeoJSON match: {sorted(unmatched_mha)}")
