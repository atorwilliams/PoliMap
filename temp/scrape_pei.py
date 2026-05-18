#!/usr/bin/env python3
"""Scrape PEI MLA profiles from assembly.pe.ca"""

import html as html_mod
import json
import re
import ssl
import time
import urllib.request

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

BASE_URL = "https://www.assembly.pe.ca"

MEMBER_PATHS = [
    "/members/gilles-arsenault",
    "/members/zack-bell",
    "/members/karla-bernard",
    "/members/peter-bevan-baker",
    "/members/jill-burridge",
    "/members/darlene-compton",
    "/members/robin-croucher",
    "/members/brendan-curran",
    "/members/cory-deagle",
    "/members/tyler-desroches",
    "/members/susie-dillon",
    "/members/kent-dollar",
    "/members/robert-henderson",
    "/members/ernie-hudson",
    "/members/rob-lantz",
    "/members/sidney-macewen",
    "/members/matthew-macfarlane",
    "/members/matthew-mackay",
    "/members/hilton-maclennan",
    "/members/gordon-mcneilly",
    "/members/hal-perry",
    "/members/barb-ramsay",
    "/members/jenn-redmond",
    "/members/carolyn-simpson",
    "/members/bloyce-thompson",
    "/members/brad-trivers",
]

PARTY_MAP = {
    "progressive conservative": "Progressive Conservative",
    "liberal": "Liberal",
    "green": "Green",
    "ndp": "NDP",
    "independent": "Independent",
}

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15, context=SSL_CTX) as r:
        return r.read().decode("utf-8", errors="replace")

def clean_tag(s):
    return re.sub(r"<[^>]+>", "", s).strip()

def normalize_party(raw):
    low = raw.lower().strip()
    for key, val in PARTY_MAP.items():
        if key in low:
            return val
    return raw.strip()

def scrape_member(path):
    url = BASE_URL + path
    page = fetch(url)

    # Name from h1 or page title area
    h1_m = re.search(r'<h1[^>]*>(.*?)</h1>', page, re.DOTALL)
    name = html_mod.unescape(clean_tag(h1_m.group(1))) if h1_m else ""
    name = re.sub(r'^Hon\.\s+', '', name).strip()

    # Party — look for party label
    party_m = re.search(r'(?:party|parti)[^<]*?:\s*(?:<[^>]+>)?\s*([^<\n]+)', page, re.IGNORECASE)
    if not party_m:
        party_m = re.search(r'(Progressive Conservative|Liberal|Green Party|NDP|Independent)', page, re.IGNORECASE)
    party_raw = party_m.group(1).strip() if party_m else ""
    party = normalize_party(html_mod.unescape(party_raw))

    # Constituency — look for district/constituency label
    riding_m = re.search(r'(?:constituency|district)[^<]*?:\s*(?:<[^>]+>)?\s*([^<\n]+)', page, re.IGNORECASE)
    riding = html_mod.unescape(clean_tag(riding_m.group(1))).strip() if riding_m else ""
    # Strip district number prefix like "District 13 - " or "(District 13)"
    riding = re.sub(r'District\s+\d+\s*[-–]\s*', '', riding, flags=re.IGNORECASE).strip()
    riding = re.sub(r'\s*\(District\s+\d+\)', '', riding, flags=re.IGNORECASE).strip()

    # Email
    email_m = re.search(r'href="mailto:([^"]+)"', page, re.IGNORECASE)
    email = email_m.group(1).strip() if email_m else ""

    # Phone — look for 902 numbers
    phone_m = re.search(r'(?:tel:|phone[^<]*?:)\s*[\s"]*(\(902\)[^<"\n]+)', page, re.IGNORECASE)
    if not phone_m:
        phone_m = re.search(r'\(902\)\s*\d{3}[-\s]\d{4}', page)
    phone = phone_m.group(1).strip() if phone_m and phone_m.lastindex else (phone_m.group(0).strip() if phone_m else "")

    # Photo
    photo_m = re.search(r'src="(/sites/[^"]+/files/[^"]+\.(?:jpg|png|jpeg))"', page, re.IGNORECASE)
    photo = (BASE_URL + photo_m.group(1)) if photo_m else None

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
            print(f"  -> {m['name']} | {m['party']} | {m['riding']} | {m['email']}", flush=True)
        except Exception as e:
            print(f"  ERROR: {e}", flush=True)
            members.append({"path": path, "error": str(e)})
        time.sleep(0.3)

    with open("pei_scraped.json", "w", encoding="utf-8") as f:
        json.dump(members, f, ensure_ascii=False, indent=2)
    print(f"\nDone. {len(members)} members written to pei_scraped.json")

if __name__ == "__main__":
    main()
