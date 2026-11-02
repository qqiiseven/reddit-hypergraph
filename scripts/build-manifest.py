"""Refresh package checksums after editing. MANIFEST.json never hashes itself."""
from pathlib import Path
import hashlib
import json

ROOT=Path(__file__).resolve().parents[1]
files=[]
for p in sorted(ROOT.rglob('*')):
    if not p.is_file() or p.name=='MANIFEST.json':
        continue
    relative=p.relative_to(ROOT)
    if set(relative.parts).intersection({'tmp','.git','node_modules','__pycache__','submission'}):
        continue
    data=p.read_bytes()
    files.append({'path':relative.as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
(ROOT/'MANIFEST.json').write_text(json.dumps({'version':'offline-enhanced-2026-11-02','date':'2026-11-02','files':files},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Manifest:',len(files),'files')
