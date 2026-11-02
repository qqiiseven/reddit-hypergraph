"""Bind existing predictions to their exact user/community order; no training."""
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--network-source', type=Path, required=True, help='Old project dist/data.json')
parser.add_argument('--predictions', type=Path, required=True, help='Old project dist/predictions.json')
args = parser.parse_args()
network_bytes = args.network_source.read_bytes()
prediction_bytes = args.predictions.read_bytes()
network = json.loads(network_bytes)
predictions = json.loads(prediction_bytes)
result = {
    'version': 1,
    'communities': network['communities'],
    'userIds': network['userIds'],
    'metrics': predictions['metrics'],
    'periods': predictions['periods'],
    'provenance': {
        'network_source_sha256': hashlib.sha256(network_bytes).hexdigest(),
        'predictions_source_sha256': hashlib.sha256(prediction_bytes).hexdigest(),
        'training_commit': predictions['metrics']['run_commit'],
    },
}
out = Path(__file__).resolve().parents[1] / 'dist/reddit-predictions.json'
out.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print(f'Exported {len(result["userIds"])} users / {len(result["periods"])} prediction windows to {out}; excluded from Git.')
