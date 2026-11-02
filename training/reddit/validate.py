"""Replay checkpoints and independently verify exported labels and metrics."""
import argparse
import json
from pathlib import Path

import numpy as np
import torch

from common import DATA, ROOT, load_dataset, run_paths, sha256
from infer import load_model, rankings
from model import baseline_scores, build_snapshot, rank_metrics


def validate_run(run_id, raw=False):
    torch.set_num_threads(4)
    data, meta = load_dataset()
    _, reports = run_paths(run_id)
    prediction_path = reports / 'predictions.json'
    pred = json.loads(prediction_path.read_text())
    manifest = json.loads((reports / 'manifest.json').read_text())
    for relative, digest in manifest['outputs'].items():
        if sha256(ROOT / relative) != digest:
            raise ValueError(f'Run output changed: {relative}')
    if sha256(DATA / 'viewer-data.json') != manifest['inputs']['viewer_sha256']:
        raise ValueError('Viewer metadata has changed since training')
    m, degree = data['membership'], data['degree']
    models = {method: load_model(run_id, method, meta) for method in ['hgnnp', 'mlp']}
    checked = 0
    for key, period in pred['periods'].items():
        t = int(key)
        snapshot = build_snapshot(m, degree, t)
        truth = m[t + 1].astype(bool) & ~snapshot['seen']
        assert period['truth'] == [np.flatnonzero(row).tolist() for row in truth]
        scores = baseline_scores(m, t)
        with torch.no_grad():
            scores.update({method: model(snapshot).numpy() for method, model in models.items()})
        for method, values in scores.items():
            assert rankings(values, snapshot['seen']) == period['rankings'][method], (key, method, 'checkpoint replay')
            # Rebuild ranking metrics from exported order, independent of rounded scores.
            reconstructed = np.full(values.shape, -1e30)
            for u, row in enumerate(period['rankings'][method]):
                for position, (c, _) in enumerate(row):
                    assert not snapshot['seen'][u, c]
                    reconstructed[u, c] = 5 - position
            metric = rank_metrics(reconstructed, snapshot['seen'], m[t + 1])
            expected = pred['metrics']['period_results'][key]['methods'][method]
            for name, value in metric.items():
                assert abs(value - expected[name]) < 1e-9, (key, method, name)
            checked += len(meta['userIds'])
    for method, expected in pred['metrics']['summary'].items():
        rows = [pred['metrics']['period_results'][str(t)]['methods'][method] for t in pred['metrics']['config']['test_cutoffs']]
        count = sum(row['users'] for row in rows)
        assert count == expected['user_periods']
        for name in ['recall5', 'hit5', 'ndcg5']:
            assert abs(sum(row[name] * row['users'] for row in rows) / max(count, 1) - expected[name]) < 1e-9
    raw_checks = 0
    if raw:
        mapping = json.loads((DATA / 'user_mapping.json').read_text())
        raw_degree = np.zeros_like(degree)
        for c, name in enumerate(meta['communities']):
            source = ROOT / 'data/reddit/raw/selected' / f'{name}.json'
            for t, net in enumerate(json.loads(source.read_text())):
                present = set(net).union(*(set(v) for v in net.values()))
                expected = np.array([mapping[u] in present for u in meta['userIds']], dtype=np.uint8)
                np.testing.assert_array_equal(expected, m[t, :, c])
                raw_degree[t] += [len(set(net.get(mapping[u], [])) - {mapping[u]}) for u in meta['userIds']]
                raw_checks += len(expected)
        np.testing.assert_array_equal(raw_degree, degree)
    result = {'passed': True, 'run_id': run_id, 'run_commit': manifest['commit'],
              'prediction_sha256': sha256(prediction_path), 'rankings_checked': checked,
              'raw_memberships_checked': raw_checks, 'raw_degree_checked': raw,
              'checks': ['dataset/viewer identity', 'frozen-checkpoint replay', 'next-period truth',
                         'history exclusion', 'per-window metrics', 'test summary']}
    (reports / 'validation.json').write_text(json.dumps(result, indent=2) + '\n')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--raw', action='store_true', help='Also compare every membership and reply-degree feature with raw sources')
    args = parser.parse_args()
    print(json.dumps(validate_run(args.run_id, args.raw), indent=2))


if __name__ == '__main__':
    main()
