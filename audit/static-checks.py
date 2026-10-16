from pathlib import Path
from lxml import html
import re,json
root=Path(__file__).resolve().parent.parent
doc=html.fromstring((root/'index.html').read_bytes())
ids=doc.xpath('//@id');dups=sorted({v for v in ids if ids.count(v)>1});assert not dups,dups
missing=[]
for value in doc.xpath('//script/@src | //img/@src | //link/@href'):
 if value and not re.match(r'^(https?:|data:|#)',value) and not (root/value).is_file():missing.append(value)
assert not missing,missing
css=doc.xpath('//style[@id="presentation-polish"]/text()')[0]
assert css.count('{')==css.count('}'),'unbalanced polish braces'
for f in root.glob('*.js'):
 for asset in re.findall(r"[\"'](assets/[^\"']+)[\"']",f.read_text()):
  assert (root/asset).is_file(),asset
print(json.dumps({'status':'PASS','uniqueIds':len(ids),'localScripts':len(doc.xpath('//script/@src')),'missingAssets':missing,'polishBraceBalance':True}))
