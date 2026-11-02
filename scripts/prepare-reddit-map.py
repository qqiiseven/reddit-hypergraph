"""Export local Reddit memberships for section 07; no training or raw usernames."""
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, required=True, help='Old project dist/data.json')
args = parser.parse_args()
raw = args.source.read_bytes()
data = json.loads(raw)
result = {key: data[key] for key in ('communities', 'periods', 'userIds', 'memberships')}
if not all(isinstance(u, str) and u.startswith('u_') for u in result['userIds']):
    raise ValueError('Expected pseudonymous user IDs from the original preprocessing pipeline')
result['source'] = data.get('source', '')
result['provenance'] = {'source_sha256': hashlib.sha256(raw).hexdigest(), 'fields': list(result)}
out = Path(__file__).resolve().parents[1] / 'dist/reddit-network.json'
out.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print(f'Exported {len(result["userIds"])} users, {len(result["communities"])} communities, '
      f'{len(result["periods"])} periods to {out}; excluded from Git.')
