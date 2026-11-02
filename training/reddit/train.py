"""Train temporal next-new-community ranking, export honest held-out results."""
import argparse
import contextlib
import sys
import copy
import json
import random
import subprocess
import time
from pathlib import Path
import numpy as np
import torch
from model import ParticipationModel, build_snapshot, rank_metrics, baseline_scores
from common import ROOT, load_dataset, validate_config, start_run, finish_run, Tee


def train(args, run, cfg, data, metadata):
    seed=cfg['seed']; random.seed(seed); np.random.seed(seed); torch.manual_seed(seed)
    torch.set_num_threads(args.threads)
    torch.use_deterministic_algorithms(True)
    m,d=data['membership'],data['degree']; N,C=m.shape[1:]
    snapshots={t:build_snapshot(m,d,t) for t in sorted(set(cfg['train_cutoffs']+[cfg['validation_cutoff']]+cfg['test_cutoffs']))}
    samples={}
    for t,s in snapshots.items():
        mask=(~s['seen']) & s['known'][:,None]
        target=m[t+1].astype(np.float32)
        samples[t]=(torch.from_numpy(target),torch.from_numpy(mask))
    train_ts=cfg['train_cutoffs']; val_t=cfg['validation_cutoff']
    positives=sum(float((samples[t][0]*samples[t][1]).sum()) for t in train_ts)
    total=sum(int(samples[t][1].sum()) for t in train_ts)
    if positives<100: raise ValueError(f'Insufficient new participation labels: {positives}')
    weight=min((total-positives)/positives,80)
    models={}; histories={}; best_epochs={}
    started=time.time()
    for name,is_hyper in [('hgnnp',True),('mlp',False)]:
        torch.manual_seed(seed)
        model=ParticipationModel(snapshots[val_t]['x'].shape[1],C,cfg['hidden_dim'],is_hyper)
        optimizer=torch.optim.AdamW(model.parameters(),lr=cfg['learning_rate'],weight_decay=1e-4)
        criterion=torch.nn.BCEWithLogitsLoss(pos_weight=torch.tensor(weight),reduction='none')
        best=-1; best_state=None; history=[]
        for epoch in range(1,cfg['epochs']+1):
            model.train(); losses=[]
            for t in train_ts:
                y,mask=samples[t]
                optimizer.zero_grad()
                logits=model(snapshots[t])
                loss=criterion(logits,y)[mask].mean()
                loss.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(),5)
                optimizer.step(); losses.append(float(loss.detach()))
            if epoch==1 or epoch%5==0:
                model.eval()
                with torch.no_grad(): scores=model(snapshots[val_t]).numpy()
                metrics=rank_metrics(scores,snapshots[val_t]['seen'],m[val_t+1])
                history.append({'epoch':epoch,'loss':float(np.mean(losses)),**metrics})
                if metrics['ndcg5']>best:
                    best=metrics['ndcg5']; best_state=copy.deepcopy(model.state_dict()); best_epochs[name]=epoch
                print(name,epoch,'loss',round(float(np.mean(losses)),4),'validation NDCG@5',round(metrics['ndcg5'],4),flush=True)
        model.load_state_dict(best_state); model.eval(); models[name]=model; histories[name]=history
        torch.save({'state_dict':best_state,'config':cfg,'features':snapshots[val_t]['x'].shape[1],'communities':C,'model_type':name,'selected_epoch':best_epochs[name],'community_names':metadata['communities'],'data_sha256':run['inputs']['network_sha256'],'run_id':args.run_id,'viewer_sha256':run['inputs']['viewer_sha256'],'training_commit':run['commit']},Path(run['artifacts'])/f'{name}.pt')
    results={}; exported={}
    for t in [val_t]+cfg['test_cutoffs']:
        s=snapshots[t]
        scores=baseline_scores(m,t)
        with torch.no_grad():
            for name,model in models.items(): scores[name]=model(s).numpy()
        target=m[t+1].astype(bool); new=target & ~s['seen']
        results[str(t)]={'split':'validation' if t==val_t else 'test','target_period':t+1, 'known_users':int(s['known'].sum()), 'users_with_new':int((new.any(1)&s['known']).sum()), 'new_memberships':int(new[s['known']].sum()),'methods':{},'groups':{}}
        exported[str(t)]={'rankings':{},'truth':[np.flatnonzero(new[u]).tolist() for u in range(N)]}
        for name,values in scores.items():
            results[str(t)]['methods'][name]=rank_metrics(values,s['seen'],target)
            masked=np.where(~s['seen'],values,-np.inf)
            order=np.argsort(-masked,axis=1,kind='stable')[:,:5]
            exported[str(t)]['rankings'][name]=[[[int(c),round(float(values[u,c]),5)] for c in order[u] if not s['seen'][u,c]] if s['known'][u] else [] for u in range(N)]
            for g,which in [('1–3 historical communities',s['seen'].sum(1)<=3),('4+ historical communities',s['seen'].sum(1)>3)]:
                results[str(t)]['groups'].setdefault(g,{})[name]=rank_metrics(values[which],s['seen'][which],target[which])
    summary={}
    for name in ['popular','overlap','mlp','hgnnp']:
        rows=[results[str(t)]['methods'][name] for t in cfg['test_cutoffs']]
        n=sum(r['users'] for r in rows)
        summary[name]={'user_periods':n,**{key:sum(r[key]*r['users'] for r in rows)/max(n,1) for key in ['recall5','ndcg5','hit5']}}
    try: sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    except subprocess.CalledProcessError: sha='uncommitted'
    metrics={'run_commit':sha,'config':cfg,'seconds':round(time.time()-started,2),'torch_version':torch.__version__,'device':'cpu','seed':seed,'positive_weight':weight,'training_positive_pairs':positives,'training_candidate_pairs':total,'best_epochs':best_epochs,'summary':summary,'period_results':results,'history':histories,'evaluation':'Ranking over ALL previously unobserved selected communities, conditional on known users with >=1 new observed community in the next period. This is not a model of whether a user migrates. Test windows are rolling; model weights remain frozen. No cold-start users. Cohort selected using periods 1..6 only. One seed, no significance claim.'}
    (Path(run['reports'])/'metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2))
    (Path(run['reports'])/'predictions.json').write_text(json.dumps({'metrics':metrics,'periods':exported},ensure_ascii=False,separators=(',',':')))
    finish_run(run)
    print(json.dumps(summary,indent=2),flush=True)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config',type=Path,default=Path(__file__).with_name('config.local.json'))
    parser.add_argument('--run-id',required=True,help='Unique name; existing runs are never overwritten')
    parser.add_argument('--threads',type=int,default=4)
    args=parser.parse_args()
    cfg=json.loads(args.config.read_text())
    data,metadata=load_dataset()
    validate_config(cfg,data['membership'].shape[0],metadata['communities'])
    audit=metadata.get('audit',{})
    if audit.get('early_selection_last_period')!=cfg['selection_last_period'] or len(metadata['userIds'])!=cfg['max_users']:
        raise ValueError('Sample-selection config differs from prepared data; prepare again')
    if args.threads<1: parser.error('--threads must be positive')
    run=start_run(args,cfg)
    with (Path(run['reports'])/'training.log').open('w') as log:
        with contextlib.redirect_stdout(Tee(sys.stdout,log)),contextlib.redirect_stderr(Tee(sys.stderr,log)):
            train(args,run,cfg,data,metadata)
    print('Run saved:',run['reports'])

if __name__=='__main__': main()
