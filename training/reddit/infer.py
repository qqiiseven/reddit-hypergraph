"""Load a saved project2 checkpoint and rank new communities using past data only."""
import argparse
import json
from pathlib import Path

import numpy as np
import torch

from common import DATA, load_dataset, run_paths, sha256
from model import ParticipationModel, build_snapshot


def load_model(run_id, method, meta):
    artifacts, _ = run_paths(run_id)
    checkpoint = torch.load(artifacts / f'{method}.pt', map_location='cpu', weights_only=True)
    if checkpoint['community_names'] != meta['communities']:
        raise ValueError('Checkpoint community order differs from the dataset')
    if checkpoint['data_sha256'] != sha256(DATA / 'network.npz'):
        raise ValueError('Checkpoint was trained on a different processed dataset')
    if checkpoint['viewer_sha256'] != sha256(DATA / 'viewer-data.json'):
        raise ValueError('Checkpoint user metadata differs from the dataset')
    if checkpoint['model_type'] != method:
        raise ValueError('Checkpoint model type mismatch')
    model = ParticipationModel(checkpoint['features'], checkpoint['communities'],
                               checkpoint['config']['hidden_dim'], method == 'hgnnp')
    model.load_state_dict(checkpoint['state_dict'])
    return model.eval()


def rankings(scores, seen):
    order = np.argsort(-np.where(~seen, scores, -np.inf), axis=1, kind='stable')[:, :5]
    return [[[int(c), round(float(scores[u, c]), 5)] for c in row if not seen[u, c]]
            if seen[u].any() else [] for u, row in enumerate(order)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--model', choices=['hgnnp', 'mlp'], default='hgnnp')
    parser.add_argument('--cutoff', type=int, required=True, help='Zero-based: 7 means history through P08')
    parser.add_argument('--user-id', required=True, help='Pseudonymous u_... ID shown in the webpage')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    torch.set_num_threads(4)
    data, meta = load_dataset()
    if not 0 <= args.cutoff < len(meta['periods']):
        parser.error('Cutoff is outside available history')
    if args.user_id not in meta['userIds']:
        parser.error('Unknown pseudonymous user ID')
    model = load_model(args.run_id, args.model, meta)
    snapshot = build_snapshot(data['membership'], data['degree'], args.cutoff)
    with torch.no_grad():
        rows = rankings(model(snapshot).numpy(), snapshot['seen'])
    user = meta['userIds'].index(args.user_id)
    result = {'run_id': args.run_id, 'model': args.model, 'user_id': args.user_id,
              'history_through': meta['periods'][args.cutoff],
              'known_user': bool(snapshot['known'][user]),
              'rankings': [{'community': meta['communities'][c], 'score': score} for c, score in rows[user]],
              'note': 'Scores are rankings, not probabilities. No future labels are used.'}
    text = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open('x') as stream:
            stream.write(text)
    print(text)


if __name__ == '__main__':
    main()
