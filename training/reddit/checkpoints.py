"""Resolve verified weights from a local run or the portable, published model bundle."""
import hashlib
import json
import re
from pathlib import Path


def digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def load_source(root, run_id=None):
    root = Path(root)
    active = root / 'reports/reddit/active-run.json'
    require_local = run_id is None and active.exists()
    if run_id is None:
        selector = active if require_local else root / 'models/reddit/default.json'
        run_id = json.loads(selector.read_text())['run_id']
    if not isinstance(run_id, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,79}', run_id):
        raise ValueError('无效的模型批次名')
    manifest_path = root / 'reports/reddit/runs' / run_id / 'manifest.json'
    if require_local or manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
        viewer = root / 'data/reddit/processed/viewer-data.json'
        viewer_hash = digest(viewer)
        if viewer_hash != manifest['inputs']['viewer_sha256']:
            raise ValueError('当前数据与本地训练记录不匹配')
        names = json.loads(viewer.read_text())['communities']
        directory = root / 'artifacts/reddit/runs' / run_id
        hashes = {m: manifest['outputs'][str((directory / f'{m}.pt').relative_to(root))]
                  for m in ['hgnnp', 'mlp']}
        commit, source = manifest['commit'], 'local'
    else:
        directory = root / 'models/reddit' / run_id
        manifest = json.loads((directory / 'metadata.json').read_text())
        if manifest['schema_version'] != 1 or manifest['run_id'] != run_id:
            raise ValueError('模型包版本或批次名不匹配')
        names, viewer_hash = manifest['communities'], manifest['viewer_sha256']
        hashes, commit, source = manifest['weights'], manifest['training_commit'], 'bundled'
    if (not isinstance(names, list) or not names or
            not all(isinstance(n, str) and n for n in names) or len(set(names)) != len(names)):
        raise ValueError('模型社区字典无效')
    paths = {m: directory / f'{m}.pt' for m in ['hgnnp', 'mlp']}
    for method, path in paths.items():
        if digest(path) != hashes[method]:
            raise ValueError('权重文件哈希与模型记录不一致')
    return {'run_id': run_id, 'training_commit': commit, 'communities': names,
            'viewer_sha256': viewer_hash, 'paths': paths, 'source': source}
