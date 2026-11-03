"""API-only demo server for the GitHub Pages frontend; optionally open a Quick Tunnel."""
import argparse
import json
import re
import shutil
import signal
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from reddit_api import RedditAPIHandler, metadata

ROOT = Path(__file__).resolve().parent
PAGES_ORIGIN = 'https://qqiiseven.github.io'
API_PATHS = {'/api/reddit/model', '/api/reddit/predict'}


class ModelHandler(RedditAPIHandler, BaseHTTPRequestHandler):
    """Expose only model API routes; never serve repository files or directories."""
    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def valid_origin(self):
        hosts = {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}
        return (self.headers.get('Host') in hosts and
                self.headers.get('Origin') in {None, PAGES_ORIGIN})

    def end_headers(self):
        if self.headers.get('Origin') == PAGES_ORIGIN:
            self.send_header('Access-Control-Allow-Origin', PAGES_ORIGIN)
            self.send_header('Vary', 'Origin')
        super().end_headers()

    def do_GET(self):
        if urlsplit(self.path).path != '/api/reddit/model':
            return self.json_response(404, {'error': '只提供模型信息与预测接口'})
        super().do_GET()

    def do_OPTIONS(self):
        if not self.valid_origin():
            return self.json_response(403, {'error': '不允许此来源'})
        if urlsplit(self.path).path not in API_PATHS:
            return self.json_response(404, {'error': '不存在的接口'})
        method = self.headers.get('Access-Control-Request-Method', '')
        headers = {v.strip().lower() for v in self.headers.get('Access-Control-Request-Headers', '').split(',') if v.strip()}
        if method not in {'GET', 'POST'} or not headers.issubset({'content-type'}):
            return self.json_response(403, {'error': '不允许此方法或请求头'})
        self.send_response(204)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Max-Age', '600')
        self.send_header('Content-Length', '0')
        self.end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=4189)
    parser.add_argument('--tunnel', action='store_true', help='Start cloudflared and write its new public endpoint into dist/model-service.json')
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error('port must be between 0 and 65535')
    info, _ = metadata()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), ModelHandler)
    port = server.server_port
    stop = threading.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: stop.set())
    threading.Thread(target=server.serve_forever, daemon=True).start()
    print(f'Model {info["run_id"]}: http://127.0.0.1:{port}/api/reddit/model', flush=True)
    tunnel = None
    try:
        if args.tunnel:
            binary = shutil.which('cloudflared')
            if not binary:
                raise SystemExit('Install cloudflared first: brew install cloudflared')
            tunnel = subprocess.Popen([binary, 'tunnel', '--no-autoupdate', '--protocol', 'http2',
                                       '--url', f'http://127.0.0.1:{port}',
                                       '--http-host-header', f'127.0.0.1:{port}'],
                                      stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            def read_tunnel():
                written = False
                for line in tunnel.stdout:
                    print(line.rstrip(), flush=True)
                    match = re.search(r'https://[a-z0-9-]+\.trycloudflare\.com\b', line)
                    if match and not written:
                        endpoint = match.group(0)
                        config = ROOT / 'dist/model-service.json'
                        config.write_text(json.dumps({'endpoint': endpoint}, indent=2) + '\n')
                        written = True
                        print(f'PUBLIC_MODEL_ENDPOINT={endpoint}', flush=True)
                        print('New endpoint saved. Run npm run offline:build, then commit and push the deployment branch to update Pages.', flush=True)
            threading.Thread(target=read_tunnel, daemon=True).start()
        while not stop.wait(1):
            if tunnel is not None and tunnel.poll() is not None:
                raise SystemExit(f'Tunnel stopped with exit code {tunnel.returncode}')
    finally:
        if tunnel is not None and tunnel.poll() is None:
            tunnel.terminate()
            try:
                tunnel.wait(timeout=10)
            except subprocess.TimeoutExpired:
                tunnel.kill()
                tunnel.wait()
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
