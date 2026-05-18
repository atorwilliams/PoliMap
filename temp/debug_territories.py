#!/usr/bin/env python3
import json, urllib.request

def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

def norm(s):
    return s.lower().replace("—","-").replace("–","-").replace("  "," ").strip()

# Yukon — show all Represent district names
print("=== YUKON Represent districts ===")
data = fetch_json("https://represent.opennorth.ca/representatives/yukon-legislature/?format=json&limit=30")
for m in sorted(data["objects"], key=lambda x: x["district_name"]):
    print(f"  {norm(m['district_name'])!r:50s} {m['name']}")

print("\n=== NWT Represent districts ===")
data = fetch_json("https://represent.opennorth.ca/representatives/northwest-territories-legislature/?format=json&limit=30")
for m in sorted(data["objects"], key=lambda x: x["district_name"]):
    print(f"  {norm(m['district_name'])!r:50s} {m['name']}")
