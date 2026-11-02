"""Loopback-only JSON API; model dependencies run in project2's own venv."""
import hashlib
import json
import re
import subprocess
import threading
from pathlib import Path
from urllib.parse import urlsplit

from training.reddit.custom_schema import LIMITS, InputError, example, validate_input

ROOT = Path(__file__).resolve().parent
INFERENCE_SLOT = threading.BoundedSemaphore(1)


def metadata():
    active = json.loads((ROOT / 'reports/reddit/active-run.json').read_text())
    run_id = active['run_id']
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,79}', run_id):
        raise ValueError('无效的模型批次名')
    manifest = json.loads((ROOT / 'reports/reddit/runs' / run_id / 'manifest.json').read_text())
    viewer = json.loads((ROOT / 'data/reddit/processed/viewer-data.json').read_text())
    python = ROOT / '.venv' / ('Scripts/python.exe' if __import__('os').name == 'nt' else 'bin/python')
    if not python.is_file():
        raise ValueError('未找到 project2 的 Python 环境，请按 training/reddit/README.md 配置 .venv')
    if not all((ROOT / 'artifacts/reddit/runs' / run_id / f'{m}.pt').is_file() for m in ['hgnnp', 'mlp']):
        raise ValueError('未找到 HGNN+ / MLP 权重，请先训练并激活一个批次')
    return {'run_id': run_id, 'training_commit': manifest['commit'], 'communities': viewer['communities'],
            'limits': LIMITS, 'example': example(), 'methods': ['hgnnp', 'mlp']}, python


class RedditAPIHandler:
    """Mixin for SimpleHTTPRequestHandler; static pages need no ML imports."""

    def json_response(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False, allow_nan=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def valid_origin(self):
        port = self.server.server_port
        hosts = {f'127.0.0.1:{port}', f'localhost:{port}'}
        origin = self.headers.get('Origin')
        return self.headers.get('Host') in hosts and (origin is None or origin in {f'http://{h}' for h in hosts})

    def do_GET(self):
        path = urlsplit(self.path).path
        if not path.startswith('/api/'):
            return super().do_GET()
        if not self.valid_origin():
            return self.json_response(403, {'error': '只接受本机页面的请求'})
        if path != '/api/reddit/model':
            return self.json_response(404, {'error': '不存在的接口'})
        try:
            info, _ = metadata()
            self.json_response(200, info)
        except (OSError, ValueError, KeyError) as error:
            self.json_response(503, {'error': f'模型尚未就绪：{error}'})

    def do_POST(self):
        if urlsplit(self.path).path != '/api/reddit/predict':
            return self.json_response(404, {'error': '不存在的接口'})
        if not self.valid_origin():
            return self.json_response(403, {'error': '只接受本机页面的请求'})
        if self.headers.get('Content-Type', '').split(';')[0].strip() != 'application/json':
            return self.json_response(415, {'error': '请使用 application/json'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            return self.json_response(400, {'error': '无效的 Content-Length'})
        if not 0 < length <= LIMITS['max_bytes']:
            return self.json_response(413, {'error': 'JSON 大小须在 1–256 KiB 以内'})
        try:
            raw = self.rfile.read(length)
            def reject_constant(value):
                raise ValueError(f'JSON 不能包含 {value}')
            payload = json.loads(raw, parse_constant=reject_constant)
        except (ValueError, UnicodeError):
            return self.json_response(400, {'error': 'JSON 格式错误，请检查引号、逗号及数字'})
        try:
            info, python = metadata()
        except (OSError, ValueError, KeyError) as error:
            return self.json_response(503, {'error': f'模型尚未就绪：{error}'})
        try:
            validate_input(payload, info['communities'])
        except InputError as error:
            return self.json_response(422, {'error': str(error)})
        if not INFERENCE_SLOT.acquire(blocking=False):
            return self.json_response(429, {'error': '本机模型正在处理另一条请求，请稍后重试'})
        try:
            process = subprocess.run([str(python), str(ROOT / 'training/reddit/custom_predict.py'),
                                      '--run-id', info['run_id']], input=raw, capture_output=True,
                                     timeout=30, cwd=ROOT)
            if process.returncode:
                return self.json_response(503, {'error': '模型进程无法启动，请检查 project2/.venv 的 PyTorch 依赖'})
            answer = json.loads(process.stdout)
            if not answer['ok']:
                return self.json_response(422 if answer['kind'] == 'input' else 503, {'error': answer['error']})
            result = answer['result']
            result['input_sha256'] = hashlib.sha256(raw).hexdigest()
            self.json_response(200, result)
        except subprocess.TimeoutExpired:
            self.json_response(504, {'error': '本次推理超过 30 秒，请减少用户数量后重试'})
        except (OSError, ValueError, KeyError):
            self.json_response(503, {'error': '模型返回异常，请检查本地训练环境和权重'})
        finally:
            INFERENCE_SLOT.release()
