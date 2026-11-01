"""Generate all ignored demo data locally; requires Python 3.11+.

No data is fetched from GitHub. The archive comes directly from Stanford SNAP.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request
import venv

ROOT=Path(__file__).resolve().parent
ARCHIVE_URL='https://snap.stanford.edu/data/reddit_reply_networks.tar.gz'
ARCHIVE_SIZE=1044984413
ARCHIVE_SHA='eefdc00432e48e801cb238e8e24de7a795fd8b472681503a78c70c5896716fc1'
OUTPUTS=['dist/data.json','dist/predictions.json']

def verify_archive(path):
    if path.stat().st_size != ARCHIVE_SIZE:
        raise ValueError(f'Archive size mismatch: {path}. Expected {ARCHIVE_SIZE} bytes; keep/move the incomplete file and retry.')
    digest=hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda:stream.read(8*1024*1024),b''):digest.update(chunk)
    if digest.hexdigest()!=ARCHIVE_SHA:
        raise ValueError(f'Archive SHA-256 mismatch: {path}. File was preserved; move it aside before downloading again.')

def download_archive(path, allow_network=True):
    path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists():
        print('Verifying existing Stanford archive…',flush=True)
        verify_archive(path)
        return
    partial=path.with_name(path.name+'.part')
    if partial.exists() and partial.stat().st_size==ARCHIVE_SIZE:
        verify_archive(partial);partial.replace(path);return
    if not allow_network:raise FileNotFoundError(f'Missing archive: {path}')
    for attempt in range(3):
        offset=partial.stat().st_size if partial.exists() else 0
        headers={'User-Agent':'CROSSING-course-project/1.0'}
        if offset:headers['Range']=f'bytes={offset}-'
        print(f'Downloading ~996 MiB from Stanford SNAP (resume at {offset/1024**2:.1f} MiB)…',flush=True)
        try:
            with urllib.request.urlopen(urllib.request.Request(ARCHIVE_URL,headers=headers),timeout=60) as response:
                append=response.status==206 and offset>0
                if response.status==206:
                    content_range=response.headers.get('Content-Range','')
                    if not content_range.startswith(f'bytes {offset}-'):
                        raise ValueError('Server returned an inconsistent download range; refusing to append.')
                received=offset if append else 0
                milestone=received//(32*1024**2)
                with partial.open('ab' if append else 'wb') as out:
                    while chunk:=response.read(1024*1024):
                        out.write(chunk);received+=len(chunk)
                        if received//(32*1024**2)>milestone:
                            milestone=received//(32*1024**2)
                            print(f'  {received/ARCHIVE_SIZE:.0%} · {received/1024**2:.0f} MiB',flush=True)
            verify_archive(partial)
            partial.replace(path)
            return
        except (OSError,TimeoutError) as exc:
            if attempt==2:raise
            print(f'Download interrupted ({type(exc).__name__}); retrying the saved partial file…',flush=True)
            time.sleep(2)

def run(command):
    print('>', ' '.join(map(str,command)),flush=True)
    subprocess.run(list(map(str,command)),cwd=ROOT,check=True)

def check_outputs():
    missing=[name for name in OUTPUTS if not (ROOT/name).is_file()]
    if missing:raise FileNotFoundError('Missing locally generated files: '+', '.join(missing))
    data=json.loads((ROOT/OUTPUTS[0]).read_text())
    predictions=json.loads((ROOT/OUTPUTS[1]).read_text())
    if len(data.get('memberships',[]))!=11 or set(predictions.get('periods',{}))!={'6','7','8','9'}:
        raise ValueError('Demo JSON structure is incomplete; rerun with --rebuild.')
    config=json.loads((ROOT/'config.json').read_text())
    if predictions['metrics']['config']!=config:
        raise ValueError('config.json differs from generated results; rerun with --rebuild.')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rebuild',action='store_true',help='Regenerate local processed data and model results.')
    parser.add_argument('--skip-install',action='store_true',help='Use an already prepared project .venv.')
    parser.add_argument('--skip-download',action='store_true',help='Require an existing verified original archive.')
    parser.add_argument('--check',action='store_true',help='Check generated JSON without downloading or training.')
    args=parser.parse_args()
    if args.check:
        check_outputs();print('Local demo data is ready. Run: python3 serve.py');return
    if all((ROOT/f).is_file() for f in OUTPUTS) and not args.rebuild:
        check_outputs()
        print('Existing demo data is ready. Run: python3 serve.py\nUse --rebuild after changing processing/training code.');return
    if sys.version_info<(3,11):raise RuntimeError('Local data generation requires Python 3.11 or newer; Python 3.11 is the tested version.')
    for name in ['reports','data/raw','data/processed','artifacts','tmp']:(ROOT/name).mkdir(parents=True,exist_ok=True)
    print('This generates data locally: ~996 MiB download plus Python dependencies; reserve at least 4 GB of free disk space.',flush=True)
    interpreter=ROOT/'.venv'/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
    if not interpreter.exists():
        if args.skip_install:raise FileNotFoundError('--skip-install requires an existing .venv')
        print('Creating project-local .venv…',flush=True);venv.EnvBuilder(with_pip=True).create(ROOT/'.venv')
    if not args.skip_install:
        pip=[interpreter,'-m','pip','install','--disable-pip-version-check','--cache-dir',ROOT/'tmp/pip-cache']
        # CPU training needs no CUDA packages on Linux/Windows.
        if sys.platform!='darwin':run(pip+['torch>=2.2','--index-url','https://download.pytorch.org/whl/cpu'])
        run(pip+['-r',ROOT/'requirements.txt'])
    run([interpreter,'-c','import numpy, torch; print("Training dependencies ready:", torch.__version__)'])
    download_archive(ROOT/'data/raw/reddit_reply_networks.tar.gz',allow_network=not args.skip_download)
    for script in ['prepare.py','train.py','validate.py']:run([interpreter,ROOT/'scripts'/script])
    check_outputs()
    print('\nDone. All generated data and models are local and ignored by Git.\nRun: python3 serve.py\nOpen: http://127.0.0.1:8765/',flush=True)

if __name__=='__main__':
    try:main()
    except (OSError,ValueError,RuntimeError,subprocess.CalledProcessError) as exc:
        print(f'\nSetup failed: {exc}\nOriginal files and any download partial were preserved. Correct the issue and rerun.',file=sys.stderr)
        raise SystemExit(1)
