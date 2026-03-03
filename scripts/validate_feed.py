#!/usr/bin/env python3
import json, sys, xml.etree.ElementTree as ET
from pathlib import Path

root = Path(__file__).resolve().parents[1]
feed = root / 'feed.xml'
eps = root / 'posts' / 'episodes.json'

errors = []

try:
    ep_data = json.loads(eps.read_text()).get('episodes', [])
except Exception as e:
    print(f'FAIL: cannot parse episodes.json: {e}')
    sys.exit(1)

try:
    tree = ET.parse(feed)
    ch = tree.getroot().find('channel')
except Exception as e:
    print(f'FAIL: feed.xml parse error: {e}')
    sys.exit(1)

if ch is None:
    print('FAIL: missing channel node')
    sys.exit(1)

items = ch.findall('item')
if len(items) != len(ep_data):
    errors.append(f'item count mismatch: feed={len(items)} episodes={len(ep_data)}')

for idx, it in enumerate(items, 1):
    for tag in ['title','guid','pubDate','description']:
        if it.find(tag) is None:
            errors.append(f'item[{idx}] missing {tag}')

# minimal channel metadata checks
for tag in ['title','link','description']:
    if ch.find(tag) is None:
        errors.append(f'channel missing {tag}')

if errors:
    print('FAIL: feed validation')
    for e in errors:
        print('-', e)
    sys.exit(1)

print(f'OK: feed.xml valid ({len(items)} items)')
