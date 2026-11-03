"""One-click lifecycle and narrowly scoped Pages publishing for the local model."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import urllib.request
import uuid
import webbrowser

ROOT = Path(__file__).resolve().parent
BRANCH = 'task/github-pages-demo'
REPO = 'qqiiseven/reddit-hypergraph'
PAGE = 'https://qqiiseven.github.io/reddit-hypergraph/'
CONFIG = 'dist/model-service.json'
LOGS = ROOT / 'logs'
STATE = LOGS / 'model-demo-state.json'


def say(message):
    print(message, flush=True)


def run(args, cwd=None, timeout=90):
    result = subprocess.run(args, cwd=cwd or ROOT, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError(f'{args[0]} 执行失败：{result.stderr.strip() or result.stdout.strip()}')
    return result.stdout.strip()


def signature(pid):
    result = subprocess.run(['ps', '-p', str(pid), '-o', 'lstart=', '-o', 'command='], capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else ''


def owned_process(state):
    pid = state.get('pid')
    saved = state.get('signature', '')
    return (isinstance(pid, int) and pid > 1 and bool(saved) and
            str(ROOT / 'serve_model.py') in saved and signature(pid) == saved)


def read_json(url, timeout=12):
    request = urllib.request.Request(url, headers={'Origin': 'https://qqiiseven.github.io', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


def save_state(state):
    temporary = STATE.with_suffix('.tmp')
    temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(STATE)


def start_service(state):
    if owned_process(state):
        say('检测到已运行的模型服务，复用现有进程。')
        return state
    # A listening port without an owned process must never be taken over or killed.
    import socket
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', 4189)) == 0:
            raise RuntimeError('4189 端口已被其他服务占用。请先关闭旧模型服务，再双击启动；不会自动结束未知进程。')
    endpoint_file = LOGS / f'model-service-{uuid.uuid4().hex}.local.json'
    logfile = LOGS / f'model-demo-{time.strftime("%Y%m%d-%H%M%S")}.log'
    with logfile.open('a') as output:
        process = subprocess.Popen([sys.executable, str(ROOT / 'serve_model.py'), '--tunnel',
                                    '--endpoint-file', str(endpoint_file)], cwd=ROOT,
                                   stdin=subprocess.DEVNULL, stdout=output, stderr=subprocess.STDOUT,
                                   start_new_session=True)
    state = {'pid': process.pid, 'signature': signature(process.pid),
             'endpoint_file': str(endpoint_file), 'log': str(logfile),
             'command': [sys.executable, str(ROOT / 'serve_model.py'), '--tunnel', '--endpoint-file', str(endpoint_file)]}
    if not state['signature']:
        raise RuntimeError(f'模型进程未能启动，请查看 {logfile}')
    save_state(state)
    say('模型已在后台启动，正在建立公网隧道…')
    return state


def wait_endpoint(state):
    deadline = time.monotonic() + 120
    last_error = ''
    while time.monotonic() < deadline:
        if not owned_process(state):
            raise RuntimeError(f'模型服务已退出，请查看 {state["log"]}')
        try:
            endpoint = json.loads(Path(state['endpoint_file']).read_text())['endpoint']
            if not re.fullmatch(r'https://[a-z0-9-]+\.trycloudflare\.com', endpoint):
                raise ValueError('隧道地址无效')
            info = read_json(endpoint + '/api/reddit/model')
            if not info.get('run_id') or info.get('methods') != ['hgnnp', 'mlp']:
                raise ValueError('模型元数据无效')
            state.update(endpoint=endpoint, model_run=info['run_id'])
            save_state(state)
            return endpoint
        except (OSError, ValueError, KeyError) as error:
            last_error = str(error)
        time.sleep(2)
    raise RuntimeError(f'隧道未能连通：{last_error}。请检查网络，日志：{state["log"]}')


def publish_endpoint(endpoint):
    """Publish exactly one file from a clean detached checkout; preserve all user work."""
    run(['git', 'fetch', 'origin', BRANCH])
    base = run(['git', 'rev-parse', 'FETCH_HEAD'])
    current = json.loads(run(['git', 'show', f'{base}:{CONFIG}']))
    if current == {'endpoint': endpoint}:
        say('线上配置已指向当前隧道，无需重复提交。')
        return base
    parent = ROOT / 'tmp'
    parent.mkdir(exist_ok=True)
    directory = Path(tempfile.mkdtemp(prefix='model-publish-', dir=parent))
    checkout = directory / 'checkout'
    run(['git', 'worktree', 'add', '--detach', str(checkout), base])
    try:
        (checkout / CONFIG).write_text(json.dumps({'endpoint': endpoint}, indent=2) + '\n')
        run(['git', 'add', '--', CONFIG], cwd=checkout)
        changed = run(['git', 'diff', '--cached', '--name-only'], cwd=checkout).splitlines()
        if changed != [CONFIG]:
            raise RuntimeError('待提交文件超出连接地址范围，已停止发布。')
        run(['git', 'commit', '-m', 'Update live model tunnel endpoint'], cwd=checkout)
        commit = run(['git', 'rev-parse', 'HEAD'], cwd=checkout)
        # No force: a concurrent remote change causes a safe failure and can be retried.
        run(['git', 'push', 'origin', f'HEAD:refs/heads/{BRANCH}'], cwd=checkout)
    except Exception:
        say(f'发布未完成，临时提交已保留在 {checkout}。其他本地工作未修改；可重新启动重试。')
        raise
    run(['git', 'worktree', 'remove', str(checkout)])
    directory.rmdir()
    # Only advance the main checkout if it is clean and still at our starting revision.
    if (not run(['git', 'status', '--porcelain']) and
            run(['git', 'branch', '--show-current']) == BRANCH and
            run(['git', 'rev-parse', 'HEAD']) == base):
        run(['git', 'merge', '--ff-only', commit])
    say(f'已提交新地址：{commit[:12]}，等待 GitHub Pages 部署…')
    return commit


def wait_deployment(commit, endpoint):
    deadline = time.monotonic() + 480
    last_message = None
    while time.monotonic() < deadline:
        runs = json.loads(run(['gh', 'api', f'repos/{REPO}/actions/runs?head_sha={commit}&per_page=10']))['workflow_runs']
        matching = [r for r in runs if r['name'] == 'Deploy Hypergraph Lab' and r['head_sha'] == commit and r['head_branch'] == BRANCH]
        if matching:
            workflow = max(matching, key=lambda r: r['id'])
            message = f'部署状态：{workflow["status"]} {workflow.get("conclusion") or ""}'.strip()
            if message != last_message:
                say(message)
                last_message = message
            if workflow['status'] == 'completed':
                if workflow['conclusion'] != 'success':
                    raise RuntimeError(f'网页部署未成功：{workflow["html_url"]}')
                try:
                    published = read_json(PAGE + 'model-service.json?v=' + commit)
                    if published == {'endpoint': endpoint}:
                        read_json(endpoint + '/api/reddit/model')
                        return workflow['html_url']
                except OSError:
                    # Allow the Pages CDN and newly established tunnel to settle.
                    pass
        time.sleep(8)
    raise RuntimeError('等待网页发布超时。模型继续运行；稍后重新双击启动即可继续检查。')


def stop_service(state):
    if not owned_process(state):
        say('当前没有本工具启动的模型进程，无需停止。')
        return
    os.kill(state['pid'], signal.SIGTERM)
    for _ in range(30):
        if not owned_process(state):
            say('模型服务与公网隧道已停止；静态网页仍可访问。')
            state['stopped'] = True
            save_state(state)
            return
        time.sleep(0.5)
    raise RuntimeError(f'服务尚未退出，请查看 {state["log"]}；未强制结束任何进程。')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['start', 'stop'])
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    LOGS.mkdir(exist_ok=True)
    with (LOGS / 'model-demo.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError('另一个启动或停止操作正在执行，请等待那个窗口完成。')
        state = json.loads(STATE.read_text()) if STATE.exists() else {}
        if args.action == 'stop':
            stop_service(state)
            return
        for tool in ('git', 'gh', 'cloudflared'):
            if not shutil.which(tool):
                raise RuntimeError(f'缺少 {tool}，请先安装；本工具不会自动修改系统依赖。')
        origin = run(['git', 'remote', 'get-url', 'origin'])
        if origin not in {f'https://github.com/{REPO}.git', f'git@github.com:{REPO}.git'}:
            raise RuntimeError('当前仓库地址与演示仓库不符，已停止自动发布。')
        run(['gh', 'api', f'repos/{REPO}', '--jq', '.full_name'])
        run([sys.executable, '-c', 'import torch; from reddit_api import metadata; metadata()'])
        state = start_service(state)
        endpoint = wait_endpoint(state)
        say('公网模型已就绪，开始自动更新网页连接地址。')
        commit = publish_endpoint(endpoint)
        state.update(commit=commit, branch=BRANCH)
        save_state(state)
        state['deployment_url'] = wait_deployment(commit, endpoint)
        state['verified_at'] = time.strftime('%Y-%m-%d %H:%M:%S %z')
        save_state(state)
        say('启动成功！网页已连接模型，可以关闭此窗口。请保持电脑联网、不休眠。')
        say(PAGE + 'index.html#reddit-custom')
        if not args.no_browser:
            webbrowser.open(PAGE + 'index.html#reddit-custom')


if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        say(f'\n未完成：{error or "操作已取消"}')
        say('模型若已启动会保留在后台；可重新双击启动重试，或双击“停止在线模型.command”。')
        sys.exit(1)
