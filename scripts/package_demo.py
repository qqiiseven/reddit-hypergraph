"""Build a small local demo archive, omitting raw archive, environments and caches."""
import hashlib
import json
import subprocess
import zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def main():
    (ROOT/'artifacts').mkdir(parents=True,exist_ok=True)
    tracked=subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True).splitlines()
    extra=['dist/data.json','dist/predictions.json']
    files=sorted(set(tracked+extra))
    sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    dirty=bool(subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip())
    metrics=json.loads((ROOT/'reports/metrics.json').read_text())
    manifest={'code_commit':sha,'tracked_worktree_dirty':dirty,'training_commit':metrics['run_commit'],'training_command':'.venv/bin/python scripts/train.py','config':metrics['config'],'artifacts':{},'files':{}}
    for name in files:
        path=ROOT/name
        manifest['files'][name]=hashlib.sha256(path.read_bytes()).hexdigest()
    for name in ['artifacts/hgnnp.pt','artifacts/mlp.pt','data/processed/network.npz','reports/metrics.json','reports/data_audit.json','reports/validation.json']:
        manifest['artifacts'][name]=hashlib.sha256((ROOT/name).read_bytes()).hexdigest()
    (ROOT/'reports/run_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
    target=ROOT/'artifacts/crossing_demo.zip'
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for name in files:z.write(ROOT/name,'crossing_demo/'+name)
        z.write(ROOT/'reports/run_manifest.json','crossing_demo/reports/run_manifest.json')
        z.write(ROOT/'reports/metrics.json','crossing_demo/reports/metrics.json')
        z.write(ROOT/'reports/data_audit.json','crossing_demo/reports/data_audit.json')
        z.write(ROOT/'reports/validation.json','crossing_demo/reports/validation.json')
    print(f'{target}: {target.stat().st_size/1024**2:.2f} MiB')

if __name__=='__main__':main()
