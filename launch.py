"""Start the current hypergraph site; no third-party Python dependencies."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
import argparse
import threading
import webbrowser

ROOT=Path(__file__).resolve().parent

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port',type=int,default=4173,help='Default 4173; 0 selects an available local port')
    parser.add_argument('--no-browser',action='store_true')
    args=parser.parse_args()
    handler=partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist'))
    # Keep the origin stable so browser caches and experiment data survive restarts.
    if not 0 <= args.port <= 65535:
        parser.error('port must be between 0 and 65535')
    ports=range(4173,4184) if args.port==4173 else [args.port]
    for port in ports:
        try:
            server=ThreadingHTTPServer(('127.0.0.1',port),handler)
            break
        except OSError:
            if port==ports[-1]:
                parser.error('No available local port. Try --port 0 or another port.')
    url='http://127.0.0.1:'+str(server.server_port)+'/index.html#composition'
    print('Hypergraph Lab: '+url,flush=True)
    print('Keep this window open. Press Ctrl+C to stop.',flush=True)
    if not args.no_browser:threading.Timer(.4,lambda:webbrowser.open(url)).start()
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()

if __name__=='__main__':main()
