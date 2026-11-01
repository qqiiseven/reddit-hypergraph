"""HGNN+ mean-aggregation encoder + personalized multilabel head.

Layer formula follows DeepHypergraph HGNNPConv (HGNN+, TPAMI 2022):
Dv^-1 H De^-1 H.T Linear(X). Implemented independently with PyTorch sparse
ops, avoiding dense N x N projections and an old DHG dependency constraint.
"""
import numpy as np
import torch
from torch import nn

def build_snapshot(membership, degree, cutoff):
    """Absolutely no read of periods after cutoff, including degree features."""
    hist = membership[:cutoff+1].astype(np.float32)
    seen = hist.any(0)
    frequency = hist.mean(0)
    recent = hist[-min(2,len(hist)):].mean(0)
    active = hist.any(2).mean(0)[:,None]
    outgoing = np.log1p(degree[:cutoff+1].mean(0))[:,None] / 10
    X = np.concatenate([seen.astype(np.float32),frequency,recent,active,outgoing],axis=1)
    # Each community-period is a distinct hyperedge. Empty columns are harmless.
    H = hist.transpose(1,0,2).reshape(hist.shape[1],-1)
    rows, cols = np.nonzero(H)
    indices = torch.tensor(np.stack([rows,cols]),dtype=torch.long)
    sp = torch.sparse_coo_tensor(indices, torch.ones(len(rows)), H.shape, check_invariants=True).coalesce()
    dv = torch.tensor(H.sum(1).clip(1))[:,None]
    de = torch.tensor(H.sum(0).clip(1))[:,None]
    return {'x':torch.from_numpy(X), 'h':sp, 'ht':sp.transpose(0,1).coalesce(), 'dv':dv, 'de':de, 'seen':seen, 'known':seen.any(1)}

def propagate(x,s):
    edge = torch.sparse.mm(s['ht'], x) / s['de']
    return torch.sparse.mm(s['h'], edge) / s['dv']

class ParticipationModel(nn.Module):
    def __init__(self, features, communities, hidden=48, hypergraph=True):
        super().__init__()
        self.hypergraph = hypergraph
        self.layer1 = nn.Linear(features,hidden)
        self.layer2 = nn.Linear(hidden,hidden)
        self.dropout = nn.Dropout(0.2)
        # Raw history bypass preserves individual preferences under large hyperedges.
        self.head = nn.Sequential(nn.Linear(hidden+features,hidden),nn.ReLU(),nn.Linear(hidden,communities))

    def forward(self,s):
        z = self.layer1(s['x'])
        if self.hypergraph: z=propagate(z,s)
        z=self.dropout(torch.relu(z))
        z=self.layer2(z)
        if self.hypergraph: z=propagate(z,s)
        return self.head(torch.cat([z,s['x']],dim=1))

def baseline_scores(membership, cutoff):
    history = membership[:cutoff+1].any(0).astype(np.float32)
    recent = membership[max(0,cutoff-1):cutoff+1].sum(0).astype(np.float32)
    sizes = recent.sum(0)
    popularity = np.broadcast_to(sizes[None,:], history.shape).copy()
    co = history.T @ history
    union = history.sum(0)[:,None] + history.sum(0)[None,:] - co
    similarity = np.divide(co,union,out=np.zeros_like(co),where=union>0)
    np.fill_diagonal(similarity,0)
    overlap = history @ similarity / np.maximum(history.sum(1,keepdims=True),1)
    return {'popular':popularity, 'overlap':overlap}

def rank_metrics(scores, seen, target, k=5):
    valid = ~seen
    labels = target.astype(bool) & valid
    eligible = seen.any(1) & labels.any(1)
    ids=np.flatnonzero(eligible)
    if not len(ids): return {'users':0,'recall5':0.,'ndcg5':0.,'hit5':0.}
    masked=np.where(valid,scores,-np.inf)
    top=np.argsort(-masked,axis=1,kind='stable')[:,:min(k,scores.shape[1])]
    hits=np.take_along_axis(labels,top,axis=1)[ids]
    total=labels.sum(1)[ids]
    discount=1/np.log2(np.arange(hits.shape[1])+2)
    dcg=(hits*discount).sum(1)
    ideal=np.array([discount[:min(int(n),len(discount))].sum() for n in total])
    return {'users':len(ids),'recall5':float((hits.sum(1)/total).mean()),'ndcg5':float((dcg/ideal).mean()),'hit5':float(hits.any(1).mean())}
