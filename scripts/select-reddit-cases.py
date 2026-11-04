"""Select auditable positive contrasts from the existing held-out batch; no training.

This is outcome-based presentation selection, not a representative evaluation.
Ranks, truth and aggregate metrics are copied unchanged by sync-reddit-cases.py.
"""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COLORS = ['#5289dc', '#df9b70', '#55b5ac', '#9276c5']
POLICY = dict(cutoff=7, current_groups=[3, 4], truth_count=1,
              min_shared=200, min_jaccard=.10, min_lift=1.30,
              hgnnp_hits=1, other_method_hits=0,
              bridge_first_target_period=7, max_cases=3)


def select(network, predictions):
    t = POLICY['cutoff']
    rows = network['memberships'][t]
    period = predictions['periods'][str(t)]
    groups = [{u for u, cs in enumerate(rows) if c in cs}
              for c in range(len(network['communities']))]
    candidates = []
    for u, current in enumerate(rows):
        truth = period['truth'][u]
        if len(current) not in POLICY['current_groups'] or len(truth) != 1:
            continue
        hits = {m: sum(c in truth for c, _ in r[u]) for m, r in period['rankings'].items()}
        if hits['hgnnp'] != 1 or any(v for m, v in hits.items() if m != 'hgnnp'):
            continue
        target = truth[0]
        if any(target in r[u] for r in network['memberships'][:t+1]):
            continue
        for source in current:
            shared = groups[source] & groups[target]
            jaccard = len(shared) / len(groups[source] | groups[target])
            lift = len(shared) / len(groups[source]) / (len(groups[target]) / len(rows))
            if (len(shared) < POLICY['min_shared'] or jaccard < POLICY['min_jaccard']
                    or lift < POLICY['min_lift']):
                continue
            bridges = []
            for b in shared - {u}:
                common = [k for k in range(t) if source in network['memberships'][k][u]
                          and source in network['memberships'][k][b]]
                if not common or any(target in r[b] for r in network['memberships'][:t]):
                    continue
                mask = sum(1 << i for i, c in enumerate(current) if c in rows[b])
                # The existing four-group illustration reserves the full intersection for A.
                if len(current) == 4 and mask == 15:
                    continue
                bridges.append((-max(common), len(rows[b]), b))
            if bridges:
                _, _, b = min(bridges)
                candidates.append(dict(user=u, source=source, target=target, bridge=b,
                                       strength=jaccard*lift, shared=len(shared)))
    candidates.sort(key=lambda c: (-c['strength'], -c['shared'], c['user'], c['source']))
    selected, users, targets = [], set(), set()
    for c in candidates:
        if c['user'] in users or c['target'] in targets:
            continue
        selected.append(c)
        users.add(c['user'])
        targets.add(c['target'])
        if len(selected) == POLICY['max_cases']:
            break
    if len(selected) != POLICY['max_cases']:
        raise ValueError('Fewer than three cases satisfy the documented selection policy')
    return selected


def make_case(selection, network, number):
    t = POLICY['cutoff']
    rows, names = network['memberships'][t], network['communities']
    u, source, target, b = (selection[k] for k in ['user', 'source', 'target', 'bridge'])
    current = rows[u]
    mask = lambda v: sum(1 << i for i, c in enumerate(current) if c in rows[v])
    by_mask = {}
    for v, cs in enumerate(rows):
        m = mask(v)
        if v != u and m and not (len(current) == 4 and m == 15):
            by_mask.setdefault(m, []).append(v)
    chosen = {mask(b): b}
    # Cover each source circle first; fill other distinct overlap patterns up to eight peers.
    order = list(dict.fromkeys([1 << i for i in range(len(current))] + sorted(by_mask)))
    for m in order:
        if len(chosen) == 8:
            break
        if m in chosen or m not in by_mask:
            continue
        chosen[m] = min(by_mask[m], key=lambda v: (target not in rows[v], len(rows[v]), v))
    peers = [dict(label=f'U{i+1:02d}', userId=network['userIds'][v], sourceRow=v,
                  mask=m, communities=rows[v]) for i, (m, v) in enumerate(sorted(chosen.items()))]
    return dict(id=str(u), label=f'案例 {number} · {names[source]} → {names[target]}',
                userId=network['userIds'][u], sourceRow=u,
                groups=[dict(community=c, name=names[c], color=COLORS[i])
                        for i, c in enumerate(current)], peers=peers,
                story=dict(source=source, target=target, bridgeUserId=network['userIds'][b]))


def main():
    network = json.loads((ROOT/'dist/reddit-network.json').read_text())
    predictions = json.loads((ROOT/'dist/reddit-predictions.json').read_text())
    path = ROOT/'dist/reddit-data.js'
    d = json.loads(path.read_text().split('window.RedditDemoData = ', 1)[1].strip().removesuffix(';'))
    chosen = select(network, predictions)
    d['cases'] = [make_case(c, network, i+1) for i, c in enumerate(chosen)]
    d['cutoff'], d['target'] = POLICY['cutoff'], POLICY['cutoff']+1
    d['provenance']['selectionPolicy'] = POLICY
    d['provenance']['selection'] = ('Outcome-selected positive contrasts, not a random sample: '
        'HGNN+ hits the sole true new community; MLP, overlap and popular all miss. '
        'A and B shared a source community before P08; B first appears in the target in P08; '
        'A first appears there in P09. At least 200 source-target co-participants in P08, '
        'Jaccard >= .10 and conditional-participation lift >= 1.30. '
        'Select by descending Jaccard times lift with distinct target communities.')
    d['provenance']['graphScope'] = ('All P08 communities of A are shown in the original map; '
        'peers are sampled by membership pattern, capped at eight, and include B. '
        'The A/B story shows only two communities. Counts use the full 8000-user cohort.')
    spec = importlib.util.spec_from_file_location('sync_cases', Path(__file__).with_name('sync-reddit-cases.py'))
    sync = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(sync)
    d = sync.build_cases(d, network, predictions)
    path.write_text('// Generated from the published batch by scripts/select-reddit-cases.py.\nwindow.RedditDemoData = '
                    + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n')
    for c in d['cases']:
        print(json.dumps(dict(label=c['label'], user=c['userId'], story=c['story']), ensure_ascii=False))


if __name__ == '__main__':
    main()
