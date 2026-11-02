import copy
import hashlib
import io
import json
from pathlib import Path
from types import SimpleNamespace
import subprocess
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import reddit_api
from training.reddit.custom_schema import InputError, example, validate_input

NAMES = ['programming', 'Python', 'learnprogramming', 'linux', 'technology', 'gaming']


class CustomSchemaTests(unittest.TestCase):
    def test_valid_example_is_not_changed(self):
        d = example()
        before = copy.deepcopy(d)
        self.assertIs(validate_input(d, NAMES), d)
        self.assertEqual(d, before)

    def test_errors_identify_bad_fields_without_silent_defaults(self):
        mutations = [
            lambda d: d.update(period_days=7),
            lambda d: d.update(schema_version=True),
            lambda d: d['users'][0].update(id='bad/id'),
            lambda d: d['users'][1].update(id=d['users'][0]['id']),
            lambda d: d['users'][1]['history'].pop(),
            lambda d: d['users'][0]['history'][0].update(communities=['python']),
            lambda d: d['users'][0]['history'][0].update(communities=['Python', 'Python']),
            lambda d: d['users'][0]['history'][0].pop('reply_degree'),
            lambda d: d['users'][0]['history'][0].update(reply_degree=True),
            lambda d: d['users'][0]['history'][0].update(reply_degree=-1),
            lambda d: d['users'][0]['history'][0].update(reply_degree=float('nan')),
            lambda d: d['users'][0]['history'][0].update(communities=[]),
            lambda d: d.update(future_truth=[]),
            lambda d: d.update(users=[]),
        ]
        for change in mutations:
            d = example()
            change(d)
            with self.subTest(change=change), self.assertRaises(InputError):
                validate_input(d, NAMES)


class APITests(unittest.TestCase):
    def handler(self, payload=None, headers=None):
        h = object.__new__(reddit_api.RedditAPIHandler)
        raw = json.dumps(payload if payload is not None else example()).encode()
        h.server = SimpleNamespace(server_port=4173)
        h.path = '/api/reddit/predict'
        h.headers = {'Host': '127.0.0.1:4173', 'Content-Type': 'application/json', 'Content-Length': str(len(raw)), **(headers or {})}
        h.rfile = io.BytesIO(raw)
        h.answer = None
        h.json_response = lambda status, value: setattr(h, 'answer', (status, value))
        return h, raw

    def test_request_origin_content_type_and_size(self):
        for headers, status in [({'Origin': 'https://example.com'}, 403), ({'Host': 'evil.example:4173'}, 403),
                                ({'Content-Type': 'text/plain'}, 415), ({'Content-Length': '999999'}, 413),
                                ({'Content-Length': 'bad'}, 400)]:
            h, _ = self.handler(headers=headers)
            h.do_POST()
            self.assertEqual(h.answer[0], status)

    def test_validation_precedes_model_execution(self):
        d = example()
        d['users'][0]['history'][0]['communities'] = ['unknown']
        h, _ = self.handler(d)
        with patch.object(reddit_api, 'metadata', return_value=({'communities': NAMES, 'run_id': 'run'}, Path('/python'))), patch.object(reddit_api.subprocess, 'run') as execute:
            h.do_POST()
        self.assertEqual(h.answer[0], 422)
        self.assertIn('users[0].history[0].communities', h.answer[1]['error'])
        execute.assert_not_called()

    def test_success_passes_exact_input_and_records_hash(self):
        h, raw = self.handler()
        process = SimpleNamespace(returncode=0, stdout=json.dumps({'ok': True, 'result': {'users': []}}).encode())
        with patch.object(reddit_api, 'metadata', return_value=({'communities': NAMES, 'run_id': 'run'}, Path('/python'))), patch.object(reddit_api.subprocess, 'run', return_value=process) as execute:
            h.do_POST()
        self.assertEqual(h.answer[0], 200)
        self.assertEqual(h.answer[1]['input_sha256'], hashlib.sha256(raw).hexdigest())
        self.assertEqual(execute.call_args.kwargs['input'], raw)
        self.assertIsInstance(execute.call_args.args[0], list)

    def test_timeout_releases_inference_slot(self):
        h, _ = self.handler()
        with patch.object(reddit_api, 'metadata', return_value=({'communities': NAMES, 'run_id': 'run'}, Path('/python'))), patch.object(reddit_api.subprocess, 'run', side_effect=subprocess.TimeoutExpired('python', 30)):
            h.do_POST()
        self.assertEqual(h.answer[0], 504)
        self.assertTrue(reddit_api.INFERENCE_SLOT.acquire(blocking=False))
        reddit_api.INFERENCE_SLOT.release()


@unittest.skipUnless((ROOT / 'artifacts/reddit/runs/project2-20261102-001/hgnnp.pt').exists(), 'Local weights are deliberately not committed')
class RealCheckpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, str(ROOT / 'training/reddit'))
        from custom_predict import predict
        cls.predict = staticmethod(predict)

    def test_peers_affect_hgnnp_but_not_individual_mlp(self):
        d = example()
        first = self.predict(d, 'project2-20261102-001')
        for u in d['users'][1:]:
            for r in u['history']:
                r['communities'] = ['movies', 'Music']
        second = self.predict(d, 'project2-20261102-001')
        a, b = first['users'][0], second['users'][0]
        self.assertEqual(a['rankings']['mlp'], b['rankings']['mlp'])
        self.assertNotEqual(a['rankings']['hgnnp'], b['rankings']['hgnnp'])
        for r in [first, second]:
            self.assertEqual(r['target_period'], 4)
            for u in r['users']:
                for rankings in u['rankings'].values():
                    self.assertTrue(all(x['community'] not in u['seen'] for x in rankings))

    def test_cold_start_has_no_fabricated_recommendations(self):
        d = example()
        d['users'][0]['history'] = [{'communities': [], 'reply_degree': 0} for _ in range(3)]
        r = self.predict(d, 'project2-20261102-001')['users'][0]
        self.assertFalse(r['known'])
        self.assertEqual(r['rankings'], {'hgnnp': [], 'mlp': []})


if __name__ == '__main__':
    unittest.main()
