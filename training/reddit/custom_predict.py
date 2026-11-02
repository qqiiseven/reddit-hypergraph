"""One local inference request over a custom cohort; JSON stdin/stdout only."""
import argparse
import json
import sys
import time

import numpy as np
import torch

from common import DATA, ROOT, run_paths, sha256
from custom_schema import InputError, validate_input
from infer import rankings
from model import ParticipationModel, build_snapshot


def predict(payload, run_id):
    started = time.monotonic()
    torch.set_num_threads(4)
    artifacts, reports = run_paths(run_id)
    manifest = json.loads((reports / 'manifest.json').read_text())
    meta_path = DATA / 'viewer-data.json'
    meta = json.loads(meta_path.read_text())
    names = meta['communities']
    validate_input(payload, names)
    users = payload['users']
    periods = len(users[0]['history'])
    membership = np.zeros((periods, len(users), len(names)), dtype=np.uint8)
    degree = np.zeros((periods, len(users)), dtype=np.float32)
    for u, user in enumerate(users):
        for t, record in enumerate(user['history']):
            membership[t, u, [names.index(c) for c in record['communities']]] = 1
            degree[t, u] = record['reply_degree']
    snapshot = build_snapshot(membership, degree, periods - 1)
    outputs = {}
    for method in ['hgnnp', 'mlp']:
        path = artifacts / f'{method}.pt'
        if sha256(path) != manifest['outputs'][str(path.relative_to(ROOT))]:
            raise ValueError('权重文件哈希与训练记录不一致')
        checkpoint = torch.load(path, map_location='cpu', weights_only=True)
        if checkpoint['community_names'] != names or checkpoint['viewer_sha256'] != sha256(meta_path):
            raise ValueError('模型社区字典与当前数据不匹配')
        if checkpoint['model_type'] != method or checkpoint['features'] != snapshot['x'].shape[1]:
            raise ValueError('模型类型或输入特征维数不匹配')
        model = ParticipationModel(checkpoint['features'], len(names), checkpoint['config']['hidden_dim'], method == 'hgnnp')
        model.load_state_dict(checkpoint['state_dict'])
        model.eval()
        with torch.no_grad():
            scores = model(snapshot).numpy()
        if not np.isfinite(scores).all():
            raise ValueError('模型输出了无效分数')
        outputs[method] = rankings(scores, snapshot['seen'])
    warnings = []
    if len(users) == 1:
        warnings.append('只提交了 1 位用户，HGNN+ 无法利用其他用户的群体信息；可以添加同一时期的其他用户。')
    if periods < 3:
        warnings.append('当前历史少于 3 期，短于训练时的历史范围，结果只适合作探索。')
    if not degree.any():
        warnings.append('所有回复度数均为 0；模型会按没有发出回复处理，不会自动补出该特征。')
    return {
        'run_id': run_id, 'training_commit': manifest['commit'], 'history_periods': periods,
        'target_period': periods + 1, 'period_days': 28, 'cohort_size': len(users),
        'seconds': round(time.monotonic() - started, 3), 'warnings': warnings,
        'users': [{'id': user['id'], 'known': bool(snapshot['known'][u]),
                   'seen': [names[c] for c in np.flatnonzero(snapshot['seen'][u])],
                   'rankings': {method: [{'community': names[c], 'score': score} for c, score in rows[u]]
                                for method, rows in outputs.items()}}
                  for u, user in enumerate(users)],
        'scope': 'custom_cohort_only',
        'note': 'HGNN+ 仅在本次提交的用户之间聚合。结果为未观察社区的排序分数，不是概率；未提供真实下一期，因此不计算准确率。',
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-id', required=True)
    args = parser.parse_args()
    try:
        result = predict(json.load(sys.stdin), args.run_id)
        print(json.dumps({'ok': True, 'result': result}, ensure_ascii=False, allow_nan=False))
    except InputError as error:
        print(json.dumps({'ok': False, 'error': str(error), 'kind': 'input'}, ensure_ascii=False))
    except Exception as error:
        print(json.dumps({'ok': False, 'error': str(error), 'kind': 'model'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
