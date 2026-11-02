"""Publish a validated local run to page 07, backing up the previous full export."""
import argparse
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone

from common import DATA, ROOT, run_paths
from validate import validate_run


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-id', required=True)
    args = parser.parse_args()
    validate_run(args.run_id)
    _, reports = run_paths(args.run_id)
    backup = ROOT / 'reports/reddit/page-backups' / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup.mkdir(parents=True)
    for name in ['reddit-network.json', 'reddit-predictions.json']:
        if (ROOT / 'dist' / name).exists():
            shutil.copy2(ROOT / 'dist' / name, backup / name)
    for script, arguments in [
        ('prepare-reddit-map.py', ['--source', str(DATA / 'viewer-data.json')]),
        ('prepare-reddit-predictions.py', ['--network-source', str(DATA / 'viewer-data.json'),
                                           '--predictions', str(reports / 'predictions.json')]),
    ]:
        subprocess.run([sys.executable, str(ROOT / 'scripts' / script), *arguments], check=True)
    (ROOT / 'reports/reddit/active-run.json').write_text(json.dumps({
        'run_id': args.run_id, 'reports': str(reports), 'previous_page_export': str(backup),
        'note': 'The original three cases in dist/reddit-data.js remain unchanged.',
    }, indent=2) + '\n')
    print('Activated', args.run_id, '; previous full predictions saved in', backup)


if __name__ == '__main__':
    main()
