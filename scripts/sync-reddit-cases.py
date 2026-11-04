"""Derive curated examples and metrics from the published full prediction batch.

Keep the chosen users only if the current batch still supports the stated contrast.
Fail explicitly when cases need reselection rather than silently mixing results.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def build_cases(d, network, predictions):
    assert d['communities'] == network['communities'] == predictions['communities']
    assert network['userIds'] == predictions['userIds']
    t = d['cutoff']
    period = predictions['periods'][str(t)]
    ids = {uid: i for i, uid in enumerate(network['userIds'])}
    memberships = network['memberships'][t]
    for c in d['cases']:
        u = ids[c['userId']]
        c['sourceRow'] = u
        c['history'] = [p[u] for p in network['memberships'][:t+1]]
        c['seen'] = sorted(set(x for cs in c['history'] for x in cs))
        c['current'] = memberships[u]
        assert [g['community'] for g in c['groups']] == c['current'], 'Reselect case groups'
        for g in c['groups']:
            g['size'] = sum(g['community'] in cs for cs in memberships)
        for p in c['peers']:
            p['sourceRow'] = ids[p['userId']]
            p['communities'] = memberships[p['sourceRow']]
            p['mask'] = sum(1 << i for i, g in enumerate(c['current']) if g in p['communities'])
        masks = [sum(1 << i for i, g in enumerate(c['current']) if g in cs) for cs in memberships]
        c['patternCounts'] = {str(m): masks.count(m) for m in sorted(set(masks))}
        others = [i for i, m in enumerate(masks) if m and i != u]
        c['clues'] = {str(k): {'total': len(others), 'joint': sum(k in memberships[i] for i in others),
            'byGroup': [{'members': sum(g in cs for i, cs in enumerate(memberships) if i != u),
                         'joint': sum(g in cs and k in cs for i, cs in enumerate(memberships) if i != u)}
                        for g in c['current']]} for k in range(len(d['communities']))}
        c['rankings'] = {m: [{'community': k, 'score': score} for k, score in rows[u]] for m, rows in period['rankings'].items()}
        c['truth'] = period['truth'][u]
        expected = sorted(set(network['memberships'][t+1][u]) - set(c['seen']))
        assert sorted(c['truth']) == expected
        assert any(r['community'] in c['truth'] for r in c['rankings']['hgnnp']), 'Reselect HGNN+ example'
        assert not any(r['community'] in c['truth'] for r in c['rankings']['mlp']), 'Reselect MLP contrast'
    metrics = predictions['metrics']
    d['metrics'] = metrics['summary']
    d['periodMetrics'] = [{'cutoff': k, 'target': k+1, **metrics['period_results'][str(k)]['methods']} for k in metrics['config']['test_cutoffs']]
    d['seed'] = metrics['seed']
    d['testCutoffs'] = metrics['config']['test_cutoffs']
    d['version'] = 5
    d['build'] = 'reddit-unified-results-v1'
    d['provenance'].update(commit=predictions['provenance']['training_commit'],
        sourceHashes={name: {'bytes': len((ROOT/'dist'/name).read_bytes()),
                            'sha256': hashlib.sha256((ROOT/'dist'/name).read_bytes()).hexdigest()}
                      for name in ['reddit-network.json', 'reddit-predictions.json']})
    d['provenance'].pop('exportedAt', None)
    return d

def main():
    path = ROOT / 'dist/reddit-data.js'
    d = json.loads(path.read_text().split('window.RedditDemoData = ', 1)[1].strip().removesuffix(';'))
    network = json.loads((ROOT/'dist/reddit-network.json').read_text())
    predictions = json.loads((ROOT/'dist/reddit-predictions.json').read_text())
    result = build_cases(d, network, predictions)
    path.write_text('// Generated from the published full prediction batch by scripts/sync-reddit-cases.py.\nwindow.RedditDemoData = '+json.dumps(result, ensure_ascii=False, separators=(',', ':'))+';\n')
    print('Synced three verified cases, rankings, truth, context and aggregate metrics.')

if __name__ == '__main__':
    main()
