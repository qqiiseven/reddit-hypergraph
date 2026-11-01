"""Extract curated communities; select users ONLY from early observed periods."""
import hashlib
import json
import tarfile
from pathlib import Path
from datetime import date, timedelta
from collections import Counter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]

def main():
    config = json.loads((ROOT / 'config.json').read_text())
    archive = ROOT / 'data/raw/reddit_reply_networks.tar.gz'
    target = ROOT / 'data/raw/selected'
    target.mkdir(parents=True, exist_ok=True)
    wanted = {s.lower() for s in config['community_names']}
    inventory, found = [], []
    with tarfile.open(archive, 'r|gz') as tf:
        for member in tf:
            if not member.isfile():
                continue
            name = Path(member.name).name
            inventory.append({'name': name, 'bytes': member.size})
            if Path(name).stem.lower() in wanted and name.endswith('.json'):
                dest = target / name
                if not dest.exists():
                    with tf.extractfile(member) as src, dest.open('wb') as out:
                        while chunk := src.read(1024 * 1024):
                            out.write(chunk)
                found.append(name)
    files = sorted(set(found), key=str.lower)
    if len(files) < 10:
        raise RuntimeError(f'Only {len(files)} communities found')
    print('Extracted', len(files), 'communities', flush=True)
    counts, periods_seen = Counter(), Counter()
    all_period_sets, rawstats = [], []
    duplicates = 0
    empty_targets = 0
    for name in files:
        nets = json.loads((target / name).read_text())
        if len(nets) != 11:
            raise ValueError(f'{name}: expected 11 periods')
        sets, edges = [], []
        for t, net in enumerate(nets):
            members = set(net)
            nlinks = 0
            for u, vs in net.items():
                members.update(vs)
                nlinks += len(vs)
                duplicates += len(vs) - len(set(vs))
                empty_targets += not vs
            sets.append(members)
            edges.append(nlinks)
            if t <= config['selection_last_period']:
                counts.update(members)
        all_period_sets.append(sets)
        rawstats.append({'community': Path(name).stem, 'users_by_period': list(map(len, sets)), 'adjacency_entries_by_period': edges})
        print('Read', name, max(map(len, sets)), flush=True)
    early_sets = [set().union(*(sets[t] for sets in all_period_sets)) for t in range(config['selection_last_period']+1)]
    for users in early_sets:
        periods_seen.update(users)
    # Selection uses ONLY periods 1..6; ties use username for reproducibility.
    eligible = [u for u in counts if periods_seen[u] >= 2 and u not in {'[deleted]', '[removed]', ''}]
    users = sorted(eligible, key=lambda u: (-counts[u], u))[:config['max_users']]
    uid = {u:i for i,u in enumerate(users)}
    C, N = len(files), len(users)
    membership = np.zeros((11,N,C), dtype=np.uint8)
    degree = np.zeros((11,N), dtype=np.float32)
    for c, sets in enumerate(all_period_sets):
        for t, s in enumerate(sets):
            membership[t, [uid[u] for u in s if u in uid], c] = 1
    for name in files:
        for t, net in enumerate(json.loads((target / name).read_text())):
            for u, vs in net.items():
                if u in uid:
                    degree[t,uid[u]] += len(set(vs) - {u})
    names = [Path(f).stem for f in files]
    np.savez_compressed(ROOT/'data/processed/network.npz', membership=membership, degree=degree)
    labels = ['u_' + hashlib.sha256(u.encode()).hexdigest()[:10] for u in users]
    # Original usernames remain only in ignored local data; viewer uses pseudonyms.
    (ROOT/'data/processed/user_mapping.json').write_text(json.dumps(dict(zip(labels,users)), ensure_ascii=False))
    start = date(2014,1,27)
    periods = [{'index':t, 'label':f'P{t+1:02}', 'start':str(start+timedelta(days=28*t)), 'end':str(start+timedelta(days=28*(t+1)-1))} for t in range(11)]
    novelty = []
    for t in range(1,11):
        history = membership[:t].any(0)
        new = membership[t].astype(bool) & ~history
        known = history.any(1)
        novelty.append({'target_period':t,'eligible_known_users':int(known.sum()), 'users_with_new_community':int((new.any(1)&known).sum()), 'new_memberships':int(new[known].sum())})
    sha = hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest()
    audit = {'source':config['source_page'], 'archive_sha256':sha, 'archive_bytes':archive.stat().st_size, 'archive_files':len(inventory), 'communities':names, 'missing_requested':sorted(wanted-{n.lower() for n in names}), 'selected_users':N, 'eligible_early_users':len(eligible), 'early_selection_last_period':config['selection_last_period'], 'raw_communities':rawstats, 'duplicate_adjacency_entries':duplicates, 'empty_neighbor_lists':empty_targets, 'novelty':novelty, 'selection':'Fixed topic list; users ranked by community-period appearances in periods 1..6 with >=2 distinct periods; maximum 8000. Graph contains this selected cohort only.'}
    (ROOT/'reports/data_audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
    (ROOT/'data/raw/inventory.json').write_text(json.dumps(inventory,indent=2))
    payload = {'source':config['source_page'],'communities':names,'periods':periods,'userIds':labels, 'memberships':[[np.flatnonzero(membership[t,u]).tolist() for u in range(N)] for t in range(11)], 'degree':degree.astype(int).tolist(), 'audit':{k:v for k,v in audit.items() if k not in ['raw_communities']}}
    (ROOT/'dist/data.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')))
    print(json.dumps({'N':N,'C':C,'novelty':novelty},indent=2),flush=True)

if __name__ == '__main__':
    main()
