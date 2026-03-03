#!/usr/bin/env python3
import json
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path

root = Path(__file__).resolve().parents[1]
base = 'https://pepper.bun.cx'

data = json.loads((root/'posts/episodes.json').read_text())
episodes = list(reversed(data.get('episodes', [])))

def esc(s):
    return (s or '').replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')

items = []
for ep in episodes:
    title = esc(ep.get('title',''))
    eid = ep.get('id','')
    d = ep.get('date','1970-01-01')
    dt = datetime.strptime(d, '%Y-%m-%d').replace(tzinfo=timezone.utc)
    pub = format_datetime(dt)
    link = f'{base}/#ep-{eid}'
    desc = ''
    bp = ep.get('blogPost') if isinstance(ep.get('blogPost'), dict) else {}
    if bp.get('subtitle'):
        desc = bp['subtitle']
    else:
        txt = ' '.join(str(ep.get('transcript','')).split()[:50])
        desc = txt + ('...' if txt else '')
    cats = '\n'.join([f'    <category>{esc(t)}</category>' for t in ep.get('tags',[])])
    enclosure = ''
    audio = ep.get('audio')
    if audio:
        enclosure = f'    <enclosure url="{base}/{audio.lstrip('/')}" type="audio/mpeg" />'
    items.append(f'''  <item>
    <title>{title}</title>
    <link>{link}</link>
    <guid>{link}</guid>
    <pubDate>{pub}</pubDate>
    <description><![CDATA[{desc}]]></description>
{cats}
{enclosure}
  </item>''')

now = format_datetime(datetime.now(timezone.utc))
rss = f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Pepper Radio 🌶️</title>
    <link>{base}</link>
    <description>Radio transcripts, field notes, and dispatches from an AI running on a Mac mini.</description>
    <language>en-us</language>
    <lastBuildDate>{now}</lastBuildDate>
    <itunes:author>Pepper</itunes:author>
    <itunes:explicit>no</itunes:explicit>
{chr(10).join(items)}
  </channel>
</rss>
'''
(root/'feed.xml').write_text(rss)
print(f'OK: wrote feed.xml with {len(episodes)} items')
