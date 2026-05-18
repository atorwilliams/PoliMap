#!/usr/bin/env python3
"""Patch NL ridingData.json with email/phone from Represent API + constructed emails."""

import json

# Confirmed from Represent API (old 50th GA, re-elected members retain same email/phone)
# Format: "Riding name as in ridingData.json": ("email", "phone")
CONFIRMED = {
    "Baie Verte-Green Bay":               ("LinPaddock@gov.nl.ca",               "709-673-2836"),
    "Bonavista":                           ("CraigPardy@gov.nl.ca",               "709-468-2132"),
    "Burin-Grand Bank":                    ("PaulPike@gov.nl.ca",                 "709-832-2530"),
    "Cape St. Francis":                    ("JoedyWall@gov.nl.ca",                "709-729-6979"),
    "Cartwright-L'Anse Au Clair":          ("LisaDempster@gov.nl.ca",             "709-931-2118"),
    "Conception Bay East-Bell Island":     ("FredHutton@gov.nl.ca",              "709-729-0334"),
    "Conception Bay South":                ("BarryPetten@gov.nl.ca",              "709-834-6180"),
    "Exploits":                            ("PleamanForsey@gov.nl.ca",            "709-258-2519"),
    "Ferryland":                           ("LoyolaODriscoll@gov.nl.ca",          "709-729-1390"),
    "Fogo Island-Cape Freels":             ("JamesMcKenna@gov.nl.ca",             "709-536-2678"),
    "Fortune Bay-Cape La Hune":            ("ElvisLoveless@gov.nl.ca",            "709-885-3067"),
    "Grand Falls-Windsor-Buchans":         ("ChrisTibbs@gov.nl.ca",              "709-489-3409"),
    "Harbour Grace-Port de Grave":         ("PamParsons@gov.nl.ca",              "709-786-1372"),
    "Harbour Main":                        ("HelenConwayOttenheimer@gov.nl.ca",   "709-229-0160"),
    "Humber-Bay of Islands":               ("EJoyce@gov.nl.ca",                   "709-634-7883"),
    "Mount Pearl North":                   ("LucyStoyles@gov.nl.ca",              "709-729-1526"),
    "Mount Pearl-Southlands":              ("PaulLane@gov.nl.ca",                 "709-729-2231"),
    "Mount Scio":                          ("SarahStoodley@gov.nl.ca",            "709-729-3083"),
    "Placentia West-Bellevue":             ("JeffDwyer@gov.nl.ca",               "709-279-2912"),
    "Placentia-St. Mary's":                ("SherryGambinwalsh@gov.nl.ca",        "709-227-1304"),
    "St. John's Centre":                   ("JamesDinn@gov.nl.ca",               "709-729-2638"),
    "Stephenville-Port Au Port":           ("TonyWakeham@gov.nl.ca",              "709-643-0813"),
    "Terra Nova":                          ("LloydParrott@gov.nl.ca",             "709-466-4165"),
    "Topsail-Paradise":                    ("PaulDinn@gov.nl.ca",                 "709-729-6670"),
    "Torngat Mountains":                   ("LelaEvans@gov.nl.ca",                "877-923-2471"),
    "Virginia Waters-Pleasantville":       ("BernardDavis@gov.nl.ca",             "709-729-5980"),
    "Waterford Valley":                    ("JamieKorab@gov.nl.ca",               "709-729-4882"),
    "Windsor Lake":                        ("JohnHogan@gov.nl.ca",               "709-729-3529"),
}

# Constructed emails for new MHAs (pattern: FirstnameLastname@gov.nl.ca)
# These follow the observed gov.nl.ca convention but are not confirmed
CONSTRUCTED = {
    "Burgeo-La Poile":                    ("MichaelKing@gov.nl.ca",              ""),
    "Carbonear-Trinity-Bay de Verde":     ("RileyBalsom@gov.nl.ca",              ""),
    "Corner Brook":                       ("JimParsons@gov.nl.ca",               ""),
    "Gander":                             ("BettinaFord@gov.nl.ca",              ""),
    "Humber-Gros Morne":                  ("MikeGoosney@gov.nl.ca",              ""),
    "Labrador West":                      ("JosephPower@gov.nl.ca",              ""),
    "Lake Melville":                      ("KeithRussell@gov.nl.ca",             ""),
    "Lewisporte-Twillingate":             ("MarkButt@gov.nl.ca",                 ""),
    "St. Barbe-L'anse aux Meadows":       ("AndreaBarbour@gov.nl.ca",            ""),
    "St. George's-Humber":                ("HalCormier@gov.nl.ca",               ""),
    "St. John's East-Quidi Vidi":         ("SheilaghOLeary@gov.nl.ca",           ""),
    "St. John's West":                    ("KeithWhite@gov.nl.ca",               ""),
}

with open("../canada/nl/json/ridingData.json", encoding="utf-8") as f:
    data = json.load(f)

updated = 0
for riding, entry in data["ridings"].items():
    email, phone = "", ""
    if riding in CONFIRMED:
        email, phone = CONFIRMED[riding]
    elif riding in CONSTRUCTED:
        email, phone = CONSTRUCTED[riding]

    if email or phone:
        entry["mha"]["email"] = email
        entry["mha"]["phone"] = phone
        updated += 1

with open("../canada/nl/json/ridingData.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Updated {updated} ridings with contact info")

# Report coverage
total = len(data["ridings"])
with_email = sum(1 for v in data["ridings"].values() if v["mha"].get("email"))
with_phone = sum(1 for v in data["ridings"].values() if v["mha"].get("phone"))
print(f"Email: {with_email}/{total}  Phone: {with_phone}/{total}")

missing = [r for r, v in data["ridings"].items() if not v["mha"].get("email")]
if missing:
    print(f"No email: {sorted(missing)}")
