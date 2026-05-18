#!/usr/bin/env python3
"""Build PEI ridingData.json from WebFetch-collected MLA data."""

import json, re

# All 26 scraped members
MEMBERS = [
    {"name": "Rob Lantz",         "party": "Progressive Conservative", "riding": "Charlottetown-Brighton",          "email": "rblantzmla@assembly.pe.ca",    "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/Lantz%2C%20Rob-forweb.jpg",                          "profileUrl": "https://www.assembly.pe.ca/members/rob-lantz"},
    {"name": "Brad Trivers",      "party": "Progressive Conservative", "riding": "Rustico-Emerald",                 "email": "bgtriversmla@assembly.pe.ca",   "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/Trivers%2C%20Brad-for%20web_0.jpg",                    "profileUrl": "https://www.assembly.pe.ca/members/brad-trivers"},
    {"name": "Peter Bevan-Baker", "party": "Green",                    "riding": "New Haven-Rocky Point",           "email": "psbevanbakermla@assembly.pe.ca","phone": "902-620-3977", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/Bevan-Baker%2C%20Peter-for%20web.jpg",                   "profileUrl": "https://www.assembly.pe.ca/members/peter-bevan-baker"},
    {"name": "Gilles Arsenault",  "party": "Progressive Conservative", "riding": "Evangeline-Miscouche",            "email": "gmarsenaultmla@assembly.pe.ca", "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/Arsenault%2C%20Gilles-for%20web.jpg",                   "profileUrl": "https://www.assembly.pe.ca/members/gilles-arsenault"},
    {"name": "Zack Bell",         "party": "Progressive Conservative", "riding": "Charlottetown-Winsloe",           "email": "zhbellmla@assembly.pe.ca",      "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/Bell%2C%20Zack%20-%20for%20web.jpg",                    "profileUrl": "https://www.assembly.pe.ca/members/zack-bell"},
    {"name": "Karla Bernard",     "party": "Green",                    "riding": "Charlottetown-Victoria Park",     "email": "kmbernardMLA@assembly.pe.ca",   "phone": "902-620-3977", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/Bernard%2C%20Karla-for%20web_4.jpg",                    "profileUrl": "https://www.assembly.pe.ca/members/karla-bernard"},
    {"name": "Jill Burridge",     "party": "Progressive Conservative", "riding": "Stratford-Keppoch",               "email": "jsburridgemla@assembly.pe.ca",  "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/Burridge%2C%20Jill-for%20web.jpg",                      "profileUrl": "https://www.assembly.pe.ca/members/jill-burridge"},
    {"name": "Darlene Compton",   "party": "Progressive Conservative", "riding": "Belfast-Murray River",            "email": "dcomptonmla@assembly.pe.ca",    "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/MLA%20Photos/Darlene%20Compton-with%20background.jpg",           "profileUrl": "https://www.assembly.pe.ca/members/darlene-compton"},
    {"name": "Robin Croucher",    "party": "Progressive Conservative", "riding": "Souris-Elmira",                   "email": "rdcrouchermla@assembly.pe.ca",  "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/Croucher%2C%20Robin-for%20web.jpg",                     "profileUrl": "https://www.assembly.pe.ca/members/robin-croucher"},
    {"name": "Brendan Curran",    "party": "Progressive Conservative", "riding": "Georgetown-Pownal",               "email": "brendancurranmla@assembly.pe.ca","phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/MLA%20Photos/Curran%20Brendan-scaled.jpg",                     "profileUrl": "https://www.assembly.pe.ca/members/brendan-curran"},
    {"name": "Cory Deagle",       "party": "Progressive Conservative", "riding": "Montague-Kilmuir",                "email": "cfdeaglemla@assembly.pe.ca",    "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2022-12/Cory%20Deagle%202022-resized.jpg",                      "profileUrl": "https://www.assembly.pe.ca/members/cory-deagle"},
    {"name": "Tyler DesRoches",   "party": "Progressive Conservative", "riding": "Summerside-Wilmot",               "email": "tjdesrochesmla@assembly.pe.ca", "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/DesRoches%2C%20Tyler-for%20web.jpg",                    "profileUrl": "https://www.assembly.pe.ca/members/tyler-desroches"},
    {"name": "Susie Dillon",      "party": "Progressive Conservative", "riding": "Charlottetown-Belvedere",         "email": "sjdillonmla@assembly.pe.ca",    "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/Dillon%2C%20Susie-for%20web_0.jpg",                     "profileUrl": "https://www.assembly.pe.ca/members/susie-dillon"},
    {"name": "Kent Dollar",       "party": "Progressive Conservative", "riding": "Brackley-Hunter River",           "email": "kadollarmla@assembly.pe.ca",    "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/MLA%20Photos/Dollar%20Kent-scaled.jpg",                      "profileUrl": "https://www.assembly.pe.ca/members/kent-dollar"},
    {"name": "Robert Henderson",  "party": "Liberal",                  "riding": "O'Leary-Inverness",               "email": "rlhendersonMLA@assembly.pe.ca", "phone": "902-368-4330", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/Henderson%2C%20Robert.jpg",                            "profileUrl": "https://www.assembly.pe.ca/members/robert-henderson"},
    {"name": "Ernie Hudson",      "party": "Progressive Conservative", "riding": "Alberton-Bloomfield",             "email": "ehhudsonMLA@assembly.pe.ca",    "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2019-06/ErnieHudsonGPEIBLS_9157_PREM_4x5.jpg",                 "profileUrl": "https://www.assembly.pe.ca/members/ernie-hudson"},
    {"name": "Sidney MacEwen",    "party": "Progressive Conservative", "riding": "Morell-Donagh",                   "email": "smacewenmla@assembly.pe.ca",    "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/MLA%20Photos/Sidney_MacEwen-%20scaled.jpg",                  "profileUrl": "https://www.assembly.pe.ca/members/sidney-macewen"},
    {"name": "Matthew MacFarlane","party": "Green",                    "riding": "Borden-Kinkora",                  "email": "mbmacfarlanemla@assembly.pe.ca","phone": "902-620-3977", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/MacFarlane%2C%20Matt-for%20web_1.jpg",                  "profileUrl": "https://www.assembly.pe.ca/members/matthew-macfarlane"},
    {"name": "Matthew MacKay",    "party": "Progressive Conservative", "riding": "Kensington-Malpeque",             "email": "mmackaymla@assembly.pe.ca",     "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/MLA%20Photos/Matthew%20MacKay-with%20background.jpg",           "profileUrl": "https://www.assembly.pe.ca/members/matthew-mackay"},
    {"name": "Hilton MacLennan",  "party": "Progressive Conservative", "riding": "Tyne Valley-Sherbrooke",          "email": "hamaclennanmla@assembly.pe.ca", "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/MacLennan%2C%20Hilton-for%20web.jpg",                   "profileUrl": "https://www.assembly.pe.ca/members/hilton-maclennan"},
    {"name": "Gordon McNeilly",   "party": "Liberal",                  "riding": "Charlottetown-West Royalty",      "email": "gamcneillyMLA@assembly.pe.ca",  "phone": "902-368-4330", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/McNeilly%2C%20Gord.jpg",                               "profileUrl": "https://www.assembly.pe.ca/members/gordon-mcneilly"},
    {"name": "Hal Perry",         "party": "Liberal",                  "riding": "Tignish-Palmer Road",             "email": "jhperrymla@assembly.pe.ca",     "phone": "902-368-4330", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/Perry%2C%20Hal.jpg",                                    "profileUrl": "https://www.assembly.pe.ca/members/hal-perry"},
    {"name": "Barb Ramsay",       "party": "Progressive Conservative", "riding": "Summerside-South Drive",          "email": "beramsaymla@assembly.pe.ca",    "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/Ramsay%2C%20Barb-for%20web_2.jpg",                     "profileUrl": "https://www.assembly.pe.ca/members/barb-ramsay"},
    {"name": "Jenn Redmond",      "party": "Progressive Conservative", "riding": "Mermaid-Stratford",               "email": "jlredmondmla@assembly.pe.ca",   "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/Redmond%2C%20Jenn-for%20web.jpg",                      "profileUrl": "https://www.assembly.pe.ca/members/jenn-redmond"},
    {"name": "Carolyn Simpson",   "party": "Liberal",                  "riding": "Charlottetown-Hillsborough Park", "email": "cesimpsonmla@assembly.pe.ca",   "phone": "902-368-4330", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/MLA%20Photos/Simpson%20Carolyn-scaled.jpg",                   "profileUrl": "https://www.assembly.pe.ca/members/carolyn-simpson"},
    {"name": "Bloyce Thompson",   "party": "Progressive Conservative", "riding": "Stanhope-Marshfield",             "email": "bgthompsonmla@assembly.pe.ca",  "phone": "902-368-4360", "photo": "https://www.assembly.pe.ca/sites/www.assembly.pe.ca/files/2024-11/Thompson%2C%20Bloyce-for%20web_2.jpg",                  "profileUrl": "https://www.assembly.pe.ca/members/bloyce-thompson"},
]

def normalize_riding(s):
    """Normalize riding name to GeoJSON format: use ' - ' as separator."""
    # Replace any dash variant with ' - ', normalize spaces
    s = re.sub(r"\s*[-–—]\s*", " - ", s).strip()
    return s

# Build lookup by normalized riding name
by_riding = {normalize_riding(m["riding"]): m for m in MEMBERS}

# Load GeoJSON riding names
with open("../canada/pei/json/provincial.geojson", encoding="utf-8") as f:
    geo = json.load(f)
geo_names = sorted(feat["properties"]["NAME"] for feat in geo["features"])

# Load existing ridingData for parties/dates
with open("../canada/pei/json/ridingData.json", encoding="utf-8") as f:
    data = json.load(f)

ridings = {}
unmatched_geo = []
for name in geo_names:
    norm = normalize_riding(name)
    mla = by_riding.get(norm)
    if mla:
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
            "mla": {"name": "", "party": "", "photo": None,
                    "profileUrl": "#", "email": "", "phone": "", "website": ""}
        }

data["ridings"] = ridings

with open("../canada/pei/json/ridingData.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

populated = sum(1 for v in ridings.values() if v["mla"]["name"])
print(f"ridingData.json: {len(ridings)} ridings, {populated} populated")

if unmatched_geo:
    print(f"Unmatched GeoJSON ridings (vacant): {unmatched_geo}")

unmatched_members = set(normalize_riding(m["riding"]) for m in MEMBERS) - set(normalize_riding(n) for n in geo_names)
if unmatched_members:
    print(f"Members with no GeoJSON match: {sorted(unmatched_members)}")
