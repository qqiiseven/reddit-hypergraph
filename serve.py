"""Local-only static viewer. Generated JSON must exist before launch."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse
from functools import partial

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('--port',type=int,default=8765); args=p.parse_args()
    directory=Path(__file__).resolve().parent/'dist'
    if not (directory/'data.json').exists(): raise SystemExit('Run scripts/prepare.py first')
    print(f'Local: http://127.0.0.1:{args.port}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),partial(SimpleHTTPRequestHandler,directory=str(directory))).serve_forever()
