import sys
import unittest
from pathlib import Path
import numpy as np
import torch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'training/reddit'))
from common import validate_config, run_paths
from infer import rankings
from model import ParticipationModel, build_snapshot, propagate, rank_metrics, baseline_scores

class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.m=np.array([[[1,0,0],[1,1,0],[0,1,0]],[[1,0,1],[1,1,0],[0,0,1]],[[0,1,1],[0,1,1],[1,0,1]]],dtype=np.uint8)
        self.d=np.arange(9,dtype=np.float32).reshape(3,3)

    def test_future_mutation_does_not_change_inputs(self):
        a=build_snapshot(self.m,self.d,0)
        m=self.m.copy(); d=self.d.copy(); m[1:]=1-m[1:];d[1:]=999
        b=build_snapshot(m,d,0)
        torch.testing.assert_close(a['x'],b['x'])
        torch.testing.assert_close(a['h'].to_dense(),b['h'].to_dense())
        for key in baseline_scores(m,0):
            np.testing.assert_equal(baseline_scores(m,0)[key],baseline_scores(self.m,0)[key])

    def test_sparse_mean_matches_explicit_formula(self):
        s=build_snapshot(self.m,self.d,1);H=s['h'].to_dense();x=torch.arange(6,dtype=torch.float32).reshape(3,2)
        expected=(H @ ((H.T @ x)/s['de']))/s['dv']
        torch.testing.assert_close(propagate(x,s),expected)

    def test_mean_on_hand_calculated_hypergraph(self):
        # Edges {0,1}, {1,2}: vertex values [2,4,8] -> edge means [3,6].
        m=np.array([[[1,0],[1,1],[0,1]]],dtype=np.uint8)
        s=build_snapshot(m,np.zeros((1,3)),0)
        result=propagate(torch.tensor([[2.],[4.],[8.]]),s)
        torch.testing.assert_close(result,torch.tensor([[3.],[4.5],[6.]]))

    def test_seen_candidates_excluded_and_correct_denominator(self):
        seen=np.array([[1,0,0],[1,1,0]],bool)
        target=np.array([[0,1,1],[0,0,0]],bool)
        scores=np.array([[999,3,1],[5,3,2]])
        metrics=rank_metrics(scores,seen,target,k=1)
        self.assertEqual(metrics['users'],1)
        self.assertEqual(metrics['recall5'],0.5)
        self.assertEqual(metrics['ndcg5'],1.)

    def test_snapshot_known_and_no_empty_division(self):
        m=np.zeros((2,4,3),dtype=np.uint8)
        s=build_snapshot(m,np.zeros((2,4)),0)
        self.assertFalse(s['known'].any())
        self.assertTrue(torch.isfinite(propagate(torch.ones(4,2),s)).all())

    def test_train_step_accepts_preprocessed_features(self):
        s=build_snapshot(self.m,self.d,1)
        for hyper in [True,False]:
            model=ParticipationModel(s['x'].shape[1],3,hidden=8,hypergraph=hyper)
            logits=model(s)
            self.assertEqual(tuple(logits.shape),(3,3))
            loss=torch.nn.functional.binary_cross_entropy_with_logits(logits,torch.tensor(self.m[2],dtype=torch.float32))
            loss.backward()
            self.assertTrue(torch.isfinite(loss))
            self.assertTrue(all(torch.isfinite(p.grad).all() for p in model.parameters()))

class ProvenanceTests(unittest.TestCase):
    def test_temporal_splits_cannot_overlap_or_read_beyond_data(self):
        cfg={'train_cutoffs':[0], 'validation_cutoff':1, 'test_cutoffs':[2], 'selection_last_period':0,
             'community_names':['a','b'], 'epochs':1, 'hidden_dim':8, 'learning_rate':0.01}
        validate_config(cfg,4,['a','b'])
        for update in [{'test_cutoffs':[1]}, {'validation_cutoff':0}, {'test_cutoffs':[3]}, {'selection_last_period':1}, {'community_names':['a']}]:
            with self.assertRaises(ValueError):validate_config({**cfg,**update},4,['a','b'])

    def test_export_excludes_seen_and_cold_start_and_breaks_ties_stably(self):
        seen=np.array([[1,0,0],[0,0,0]],bool)
        rows=rankings(np.array([[999,2,2],[1,2,3]],float),seen)
        self.assertEqual(rows,[[[1,2.0],[2,2.0]],[]])

    def test_run_names_cannot_escape_output_directories(self):
        for name in ['../old','/tmp/run','a/b','']:
            with self.assertRaises(ValueError):run_paths(name)

if __name__=='__main__': unittest.main()
