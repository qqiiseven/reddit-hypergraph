"""End-to-end consistency checks against selected raw source files and predictions."""
import json
from pathlib import Path
import numpy as np
from model import rank_metrics
ROOT=Path(__file__).resolve().parents[1]

def main():
    data=json.loads((ROOT/'dist/data.json').read_text());pred=json.loads((ROOT/'dist/predictions.json').read_text())
    m=np.load(ROOT/'data/processed/network.npz')['membership']
    assert m.shape==(11,len(data['userIds']),len(data['communities']))
    mapping=json.loads((ROOT/'data/processed/user_mapping.json').read_text())
    checked=0
    for c,name in enumerate(data['communities']):
        raw=json.loads((ROOT/f'data/raw/selected/{name}.json').read_text())
        for t,net in enumerate(raw):
            present=set(net).union(*(set(v) for v in net.values()))
            expected=np.array([mapping[u] in present for u in data['userIds']],dtype=np.uint8)
            np.testing.assert_array_equal(expected,m[t,:,c]);checked+=len(expected)
    for t in range(11):
        for u in range(m.shape[1]):
            assert np.flatnonzero(m[t,u]).tolist()==data['memberships'][t][u]
    ranking_count=0
    for ts,period in pred['periods'].items():
        t=int(ts);seen=m[:t+1].any(0);truth=m[t+1].astype(bool)&~seen
        for u in range(m.shape[1]):
            assert np.flatnonzero(truth[u]).tolist()==period['truth'][u]
        for method,rows in period['rankings'].items():
            reconstructed=np.full(seen.shape,-1e30)
            for u,rank in enumerate(rows):
                ids=[r[0] for r in rank]
                assert len(ids)==len(set(ids)) and len(ids)<=5
                assert all(not seen[u,c] for c in ids)
                assert all(np.isfinite(score) for c,score in rank)
                for position,(c,_) in enumerate(rank): reconstructed[u,c]=5-position
                ranking_count+=1
            metrics=rank_metrics(reconstructed,seen,m[t+1])
            original=pred['metrics']['period_results'][ts]['methods'][method]
            for k in ['users','recall5','ndcg5','hit5']:
                assert abs(metrics[k]-original[k])<1e-9,(ts,method,k)
    result={'passed':True,'raw_memberships_checked':checked,'prediction_rankings_checked':ranking_count,'checks':['all selected raw membership entries equal processed matrix','all frontend memberships equal processed matrix','all next-period truth equals raw-derived labels','all rankings exclude previously observed communities','all published metrics reproduce from exported rankings']}
    (ROOT/'reports/validation.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result,indent=2))

if __name__=='__main__':main()
