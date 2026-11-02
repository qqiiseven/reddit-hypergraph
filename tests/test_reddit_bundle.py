import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'training/reddit'))
import reddit_api
from checkpoints import load_source
from custom_predict import predict
from custom_schema import example

RUN = 'project2-20261102-001'


class PublishedModelTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        shutil.copytree(ROOT / 'models', self.root / 'models')

    def test_clean_checkout_metadata_needs_no_original_dataset_or_reports(self):
        source = load_source(self.root)
        self.assertEqual(source['source'], 'bundled')
        self.assertEqual(len(source['communities']), 44)
        self.assertFalse((self.root / 'data').exists())
        self.assertFalse((self.root / 'reports').exists())
        python = self.root / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
        python.parent.mkdir(parents=True)
        python.touch()
        with patch.object(reddit_api, 'ROOT', self.root):
            info, executable = reddit_api.metadata()
        self.assertEqual(info['run_id'], RUN)
        self.assertEqual(info['model_source'], 'bundled')
        self.assertEqual(executable, python)

    def test_published_weights_reproduce_current_predictions_without_training_data(self):
        original = predict(example(), RUN)
        published = predict(example(), RUN, root=self.root)
        self.assertEqual(original['users'], published['users'])
        self.assertEqual(original['training_commit'], published['training_commit'])
        self.assertEqual(published['target_period'], 4)

    def test_damaged_weight_is_rejected_before_loading(self):
        weight = self.root / 'models/reddit' / RUN / 'hgnnp.pt'
        weight.write_bytes(weight.read_bytes() + b'corrupt')
        with self.assertRaisesRegex(ValueError, '哈希'):
            load_source(self.root)

    def test_dictionary_mismatch_is_rejected(self):
        metadata = self.root / 'models/reddit' / RUN / 'metadata.json'
        data = json.loads(metadata.read_text())
        data['communities'].reverse()
        metadata.write_text(json.dumps(data))
        with self.assertRaisesRegex(ValueError, '社区字典'):
            predict(example(), RUN, root=self.root)

    def test_explicit_broken_local_selection_is_not_silently_replaced(self):
        active = self.root / 'reports/reddit/active-run.json'
        active.parent.mkdir(parents=True)
        active.write_text(json.dumps({'run_id': RUN}))
        with self.assertRaises(FileNotFoundError):
            load_source(self.root)
        with self.assertRaises(ValueError):
            load_source(self.root, '../escape')


if __name__ == '__main__':
    unittest.main()
