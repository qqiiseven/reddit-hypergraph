"""Local-only static viewer. Generated JSON must exist before launch."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse
from functools import partial

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('--port',type=int,default=8765); args=p.parse_args()
    directory=Path(__file__).resolve().parent/'dist'
    missing=[name for name in ['index.html','app.js','style.css','hypergraph-view.js','data.json','predictions.json'] if not (directory/name).is_file()]
    if missing:
        raise SystemExit('Missing demo assets: '+', '.join(missing)+'. First run: python3 setup_demo.py (Windows: py -3.11 setup_demo.py). See README.md.')
    try:
        server=ThreadingHTTPServer(('127.0.0.1',args.port),partial(SimpleHTTPRequestHandler,directory=str(directory)))
    except OSError as exc:
        raise SystemExit(f'Cannot start local preview: {exc}. Try --port {args.port+1}.') from exc
    print(f'Local: http://127.0.0.1:{server.server_port}',flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
