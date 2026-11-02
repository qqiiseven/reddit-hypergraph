"""Local dataset checks, immutable run directories, and provenance."""
import hashlib
import json
import platform
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'data/reddit/processed'


def sha256(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def run_paths(run_id):
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,79}', run_id):
        raise ValueError('Run ID must be a short filename, without directory separators')
    return ROOT / 'artifacts/reddit/runs' / run_id, ROOT / 'reports/reddit/runs' / run_id


def load_dataset():
    with np.load(DATA / 'network.npz', allow_pickle=False) as archive:
        arrays = {key: archive[key] for key in ['membership', 'degree']}
    meta = json.loads((DATA / 'viewer-data.json').read_text())
    m, degree = arrays['membership'], arrays['degree']
    if m.shape != (len(meta['periods']), len(meta['userIds']), len(meta['communities'])):
        raise ValueError('Dataset dimensions and viewer metadata disagree')
    if degree.shape != m.shape[:2] or not np.isfinite(degree).all() or (degree < 0).any():
        raise ValueError('Invalid reply-degree features')
    if not np.isin(m, [0, 1]).all():
        raise ValueError('Membership must be binary')
    for key in ['userIds', 'communities']:
        if len(set(meta[key])) != len(meta[key]):
            raise ValueError(f'Duplicate {key}')
    if not all(uid.startswith('u_') for uid in meta['userIds']):
        raise ValueError('Viewer IDs must be pseudonymous')
    for t, period in enumerate(meta['memberships']):
        expected = np.zeros_like(m[t])
        if len(period) != m.shape[1]:
            raise ValueError('Viewer user count mismatch')
        for u, cs in enumerate(period):
            if len(set(cs)) != len(cs) or any(c < 0 or c >= m.shape[2] for c in cs):
                raise ValueError('Invalid viewer community index')
            expected[u, cs] = 1
        np.testing.assert_array_equal(expected, m[t])
    np.testing.assert_array_equal(np.asarray(meta['degree']), degree)
    return arrays, meta


def validate_config(cfg, periods, communities):
    train, val, test = cfg['train_cutoffs'], cfg['validation_cutoff'], cfg['test_cutoffs']
    all_cutoffs = train + [val] + test
    if not train or not test or len(set(all_cutoffs)) != len(all_cutoffs):
        raise ValueError('Training, validation and test cutoffs must be nonempty and distinct')
    if any(type(t) is not int or t < 0 or t >= periods - 1 for t in all_cutoffs):
        raise ValueError('Each cutoff must have an observed next period')
    if max(train) >= val or val >= min(test):
        raise ValueError('Temporal order must be training, validation, then test')
    if not 0 <= cfg['selection_last_period'] < val:
        raise ValueError('Cohort selection must end before validation target and tests')
    if {c.lower() for c in cfg['community_names']} != {c.lower() for c in communities}:
        raise ValueError('Configured communities do not match processed data; prepare again')
    if cfg['epochs'] < 1 or cfg['hidden_dim'] < 1 or cfg['learning_rate'] <= 0:
        raise ValueError('Invalid training parameters')


def start_run(args, cfg):
    artifacts, reports = run_paths(args.run_id)
    if artifacts.exists() or reports.exists():
        raise FileExistsError('This run already exists; use a new --run-id')
    artifacts.mkdir(parents=True)
    reports.mkdir(parents=True)
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    dirty = subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).splitlines()
    run = {
        'run_id': args.run_id, 'created_utc': datetime.now(timezone.utc).isoformat(),
        'commit': commit, 'git_changes': dirty, 'command': [sys.executable, *sys.argv],
        'config': cfg, 'config_file': str(args.config.resolve()), 'threads': args.threads,
        'python': platform.python_version(), 'platform': platform.platform(),
        'torch': str(torch.__version__), 'numpy': np.__version__, 'device': 'cpu',
        'artifacts': str(artifacts), 'reports': str(reports),
        'inputs': {'network_sha256': sha256(DATA / 'network.npz'),
                   'viewer_sha256': sha256(DATA / 'viewer-data.json'),
                   'config_sha256': sha256(args.config)},
        'code_sha256': {str(p.relative_to(ROOT)): sha256(p) for p in Path(__file__).parent.glob('*.py')},
    }
    (reports / 'manifest.json').write_text(json.dumps(run, indent=2) + '\n')
    (reports / 'config.json').write_text(json.dumps(cfg, indent=2) + '\n')
    freeze = subprocess.check_output([sys.executable, '-m', 'pip', 'freeze'], text=True)
    (reports / 'requirements.lock').write_text(freeze)
    return run


def finish_run(run):
    outputs = [*Path(run['artifacts']).glob('*.pt'), *(Path(run['reports']) / f for f in ['metrics.json', 'predictions.json'])]
    run['outputs'] = {str(p.relative_to(ROOT)): sha256(p) for p in outputs}
    run['completed_utc'] = datetime.now(timezone.utc).isoformat()
    (Path(run['reports']) / 'manifest.json').write_text(json.dumps(run, indent=2) + '\n')


class Tee:
    def __init__(self, *streams):
        self.streams = streams

    def write(self, text):
        for stream in self.streams:
            stream.write(text)
            stream.flush()
        return len(text)

    def flush(self):
        for stream in self.streams:
            stream.flush()
