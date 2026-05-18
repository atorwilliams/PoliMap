#!/usr/bin/env python3
"""
Patch territory ridingData.json with contact info from Represent API.
Only applies contact info when the MLA name in our data matches Represent,
to avoid applying a previous MLA's contact to a newly elected one.
"""

import json, urllib.request

def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

def norm_riding(s):
    """Normalize riding name for matching."""
    return (s.lower()
             .replace("—","-").replace("–","-")
             .replace(" - ", "-").replace("  "," ")
             .replace(" ", "")  # also strip spaces for Deh Cho / dehcho
             .strip())

def norm_name(s):
    """Normalize person name for comparison."""
    return s.lower().replace(".", "").replace("  ", " ").strip()

TERRITORIES = {
    "yukon":   "yukon-legislature",
    "nwt":     "northwest-territories-legislature",
    # Nunavut not in Represent API
}

for folder, slug in TERRITORIES.items():
    url = f"https://represent.opennorth.ca/representatives/{slug}/?format=json&limit=30"
    data = fetch_json(url)
    members = data.get("objects", [])
    print(f"\n{folder.upper()}: {len(members)} members from Represent")

    # Build index: norm_riding(district_name) -> contact info + name
    index = {}
    for m in members:
        key = norm_riding(m["district_name"])
        phone = ""
        for o in m.get("offices", []):
            if o.get("phone"):
                phone = o["phone"].replace("1 ", "", 1).strip()
                break
        index[key] = {
            "name":       m["name"],
            "email":      m.get("email", ""),
            "phone":      phone,
            "photo":      m.get("photo_url") or None,
            "profileUrl": m.get("url", ""),
        }

    # Load ridingData
    path = f"../canada/{folder}/json/ridingData.json"
    with open(path, encoding="utf-8") as f:
        rdata = json.load(f)

    updated = matched_different_name = unmatched_riding = 0
    for riding_name, entry in rdata["ridings"].items():
        key = norm_riding(riding_name)
        contact = index.get(key)
        if not contact:
            unmatched_riding += 1
            continue

        mla = entry.get("mla", {})
        our_name = norm_name(mla.get("name", ""))
        their_name = norm_name(contact["name"])

        if our_name != their_name:
            # Names differ — Represent has a different (old) MLA for this riding
            matched_different_name += 1
            print(f"  SKIP {riding_name}: ours={mla.get('name')!r} vs Represent={contact['name']!r}")
            continue

        if contact["email"]:      mla["email"]      = contact["email"]
        if contact["phone"]:      mla["phone"]      = contact["phone"]
        if contact["photo"]:      mla["photo"]      = contact["photo"]
        if contact["profileUrl"]: mla["profileUrl"] = contact["profileUrl"]
        entry["mla"] = mla
        updated += 1

    with open(path, "w", encoding="utf-8") as f:
        json.dump(rdata, f, ensure_ascii=False, indent=2)

    total = len(rdata["ridings"])
    print(f"  Updated: {updated}/{total}  |  Name mismatch (skipped): {matched_different_name}  |  No riding match: {unmatched_riding}")
