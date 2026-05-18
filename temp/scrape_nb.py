#!/usr/bin/env python3
"""Scrape NB MLA profiles from legnb.ca and output ridingData.json."""

import html as html_mod
import json
import re
import time
import urllib.request

BASE_URL = "https://www.legnb.ca"

MEMBER_PATHS = [
    "/en/members/current/165/ames-richard",
    "/en/members/current/4/arseneault-guy",
    "/en/members/current/16/austin-kris",
    "/en/members/current/162/bockus-kathy",
    "/en/members/current/208/boudreau-lyne-chantal",
    "/en/members/current/23/bourque-benoit",
    "/en/members/current/11/chiasson-chuck",
    "/en/members/current/49/chiasson-keith",
    "/en/members/current/29/conroy-michelle",
    "/en/members/current/14/coon-david",
    "/en/members/current/164/cullins-ryan",
    "/en/members/current/9/damours-jean-claude",
    "/en/members/current/202/dornan-john",
    "/en/members/current/196/doucet-alexandre-cedric",
    "/en/members/current/192/finnigan-pat",
    "/en/members/current/46/gauvin-robert",
    "/en/members/current/199/herron-john",
    "/en/members/current/203/hickey-david",
    "/en/members/current/166/hogan-bill",
    "/en/members/current/182/holt-susan",
    "/en/members/current/194/johnson-claire",
    "/en/members/current/167/johnson-margaret",
    "/en/members/current/191/johnston-sam",
    "/en/members/current/200/kennedy-aaron",
    "/en/members/current/26/landry-francine",
    "/en/members/current/45/leblanc-jacques",
    "/en/members/current/180/leblanc-marco",
    "/en/members/current/205/lee-ian",
    "/en/members/current/157/legacy-rene",
    "/en/members/current/37/lepage-gilles",
    "/en/members/current/158/mallet-eric",
    "/en/members/current/30/mckee-robert",
    "/en/members/current/207/miles-cindy",
    "/en/members/current/27/mitton-megan",
    "/en/members/current/198/monahan-don",
    "/en/members/current/24/oliver-bill",
    "/en/members/current/206/randall-luke",
    "/en/members/current/190/robichaud-luc",
    "/en/members/current/209/russell-kevin",
    "/en/members/current/21/savoie-glen",
    "/en/members/current/161/scott-wallace-tammy",
    "/en/members/current/195/sodhi-tania",
    "/en/members/current/5/theriault-isabelle",
    "/en/members/current/201/townsend-alyson",
    "/en/members/current/193/vautour-natacha",
    "/en/members/current/197/weir-rob",
    "/en/members/current/204/wilcott-kate",
    "/en/members/current/35/wilson-mary",
    "/en/members/current/33/wilson-sherry",
]

PARTY_MAP = {
    "liberal": "Liberal",
    "progressive conservative": "Progressive Conservative",
    "green": "Green",
    "people's alliance": "People's Alliance",
    "peoples alliance": "People's Alliance",
    "independent": "Independent",
}

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.read().decode("utf-8", errors="replace")

def clean_tag(s):
    return re.sub(r"<[^>]+>", "", s).strip()

def normalize_party(raw):
    low = raw.lower().strip()
    for key, val in PARTY_MAP.items():
        if key in low:
            return val
    return raw.strip()

def decode_cf_email(encoded):
    key = int(encoded[:2], 16)
    return "".join(chr(int(encoded[i:i+2], 16) ^ key) for i in range(2, len(encoded), 2))

def clean_name(raw):
    # Unescape HTML entities
    name = html_mod.unescape(raw.strip())
    # Strip honorifics prefix
    name = re.sub(r'^Hon\.\s+', '', name)
    name = re.sub(r',\s*K\.C\.$', '', name)
    return name.strip()

def scrape_member(path):
    url = BASE_URL + path
    html = fetch(url)

    # Name from h1
    h1_m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL)
    name = clean_name(clean_tag(h1_m.group(1))) if h1_m else ""

    # Party from fa-circle icon span
    party_m = re.search(r'fa-circle[^<]*</i>\s*(.*?)</span>', html, re.DOTALL)
    party_raw = clean_tag(party_m.group(1)) if party_m else ""
    party = normalize_party(html_mod.unescape(party_raw))

    # Riding from fa-map-marker span
    riding_m = re.search(r'fa-map-marker[^<]*</i>\s*(.*?)</span>', html, re.DOTALL)
    riding = html_mod.unescape(clean_tag(riding_m.group(1))) if riding_m else ""

    # Email — decode Cloudflare obfuscation
    cf_m = re.search(r'data-cfemail="([^"]+)"', html)
    email = decode_cf_email(cf_m.group(1)) if cf_m else ""

    # Phone — take first (506) number (constituency office)
    phones = re.findall(r'\(506\)\s*\d{3}[\-\s]\d{4}', html)
    phone = phones[0].strip() if phones else ""

    # Photo — fix backslash path
    photo_m = re.search(r'src="(/content[^"]+\.(?:jpg|png|jpeg))"', html, re.IGNORECASE)
    if photo_m:
        photo_path = photo_m.group(1).replace("\\", "/")
        photo = BASE_URL + photo_path
    else:
        photo = None

    return {
        "name": name,
        "party": party,
        "riding": riding,
        "email": email,
        "phone": phone,
        "photo": photo,
        "profileUrl": url,
    }

def main():
    members = []
    for i, path in enumerate(MEMBER_PATHS):
        print(f"[{i+1}/{len(MEMBER_PATHS)}] {path}", flush=True)
        try:
            m = scrape_member(path)
            members.append(m)
            print(f"  -> {m['name']} | {m['party']} | {m['riding']} | {m['email']} | {m['phone']}", flush=True)
        except Exception as e:
            print(f"  ERROR: {e}", flush=True)
            members.append({"path": path, "error": str(e)})
        time.sleep(0.3)

    with open("nb_scraped.json", "w", encoding="utf-8") as f:
        json.dump(members, f, ensure_ascii=False, indent=2)

    print(f"\nDone. {len(members)} members written to nb_scraped.json")

if __name__ == "__main__":
    main()
