#!/usr/bin/env python3
import json, re, sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
ep_path = root / 'posts' / 'episodes.json'

errors = []

try:
    data = json.loads(ep_path.read_text())
except Exception as e:
    print(f'FAIL: cannot parse {ep_path}: {e}')
    sys.exit(1)

episodes = data.get('episodes')
if not isinstance(episodes, list):
    errors.append('episodes must be a list')
    episodes = []

ids = set()
for i, ep in enumerate(episodes, 1):
    ctx = f'episode[{i}]'
    for f in ['id','title','show','emoji','date','audio','tags','transcript','featured']:
        if f not in ep:
            errors.append(f'{ctx}: missing field {f}')

    if 'featured' in ep and not isinstance(ep['featured'], bool):
        errors.append(f'{ctx}: featured must be boolean, got {type(ep["featured"]).__name__}')

    eid = ep.get('id','')
    if not re.fullmatch(r'\d{3}', str(eid)):
        errors.append(f'{ctx}: id must be 3 digits, got {eid!r}')
    if eid in ids:
        errors.append(f'{ctx}: duplicate id {eid}')
    ids.add(eid)

    date = str(ep.get('date',''))
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', date):
        errors.append(f'{ctx}: bad date format {date!r}')

    audio = str(ep.get('audio',''))
    if audio.startswith('http://') or audio.startswith('https://'):
        errors.append(f'{ctx}: audio must be relative, got URL {audio}')
    if '..' in audio:
        errors.append(f'{ctx}: audio path contains .. -> {audio}')

    tags = ep.get('tags')
    if not isinstance(tags, list) or any((not isinstance(t,str) or not t.strip()) for t in tags):
        errors.append(f'{ctx}: tags must be non-empty string array')

    if audio:
        ap = root / audio.lstrip('/')
        if not ap.exists():
            errors.append(f'{ctx}: audio file missing: {audio}')

    bp = ep.get('blogPost')
    if isinstance(bp, dict) and bp.get('enabled'):
        if 'subtitle' not in bp or 'body' not in bp:
            errors.append(f'{ctx}: blogPost enabled requires subtitle/body')

if errors:
    print('FAIL: episodes validation')
    for e in errors:
        print('-', e)
    sys.exit(1)

print(f'OK: episodes.json valid ({len(episodes)} episodes)')
