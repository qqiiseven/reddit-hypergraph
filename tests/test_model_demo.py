import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import model_demo as demo


class ProcessTests(unittest.TestCase):
    def test_reused_pid_is_never_stopped(self):
        state = {'pid': 321, 'signature': 'old start ' + str(demo.ROOT / 'serve_model.py')}
        with patch.object(demo, 'signature', return_value='new unrelated process'), patch.object(demo.os, 'kill') as kill:
            self.assertFalse(demo.owned_process(state))
            demo.stop_service(state)
            kill.assert_not_called()

    def test_duplicate_start_reuses_the_owned_process(self):
        state = {'pid': 321, 'signature': 'same process'}
        with patch.object(demo, 'owned_process', return_value=True), patch.object(demo.subprocess, 'Popen') as spawn:
            self.assertIs(demo.start_service(state), state)
            spawn.assert_not_called()


class PublishingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'working'
        self.remote = Path(self.temp.name) / 'remote.git'
        self.root.mkdir()
        self.git('init', '--bare', str(self.remote))
        self.git('init', '-b', demo.BRANCH)
        self.git('config', 'user.name', 'Launcher test')
        self.git('config', 'user.email', 'test@example.invalid')
        (self.root / 'dist').mkdir()
        (self.root / demo.CONFIG).write_text(json.dumps({'endpoint': 'https://old.trycloudflare.com'}))
        (self.root / '.gitignore').write_text('tmp/\nlogs/\n')
        (self.root / 'notes.txt').write_text('original')
        self.git('add', '.')
        self.git('commit', '-m', 'initial')
        self.git('remote', 'add', 'origin', str(self.remote))
        self.git('push', '-u', 'origin', demo.BRANCH)
        self.patch = patch.object(demo, 'ROOT', self.root)
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def git(self, *args):
        return subprocess.check_output(['git', *args], cwd=self.root, text=True, stderr=subprocess.DEVNULL).strip()

    def test_publishes_only_endpoint_without_touching_staged_or_unstaged_work(self):
        old = self.git('rev-parse', 'HEAD')
        (self.root / 'notes.txt').write_text('unfinished user work')
        self.git('add', 'notes.txt')
        (self.root / demo.CONFIG).write_text('local uncommitted configuration')
        status = self.git('status', '--porcelain')
        commit = demo.publish_endpoint('https://new.trycloudflare.com')
        self.assertEqual(self.git('rev-parse', 'HEAD'), old)
        self.assertEqual(self.git('status', '--porcelain'), status)
        self.assertEqual((self.root / demo.CONFIG).read_text(), 'local uncommitted configuration')
        self.assertEqual(self.git('diff', '--name-only', old, commit), demo.CONFIG)
        self.assertEqual(json.loads(self.git('show', f'{commit}:{demo.CONFIG}')), {'endpoint': 'https://new.trycloudflare.com'})
        self.assertEqual(self.git('ls-remote', 'origin', f'refs/heads/{demo.BRANCH}').split()[0], commit)

    def test_clean_checkout_advances_and_same_endpoint_does_not_create_another_commit(self):
        commit = demo.publish_endpoint('https://new.trycloudflare.com')
        self.assertEqual(self.git('rev-parse', 'HEAD'), commit)
        self.assertEqual(self.git('status', '--porcelain'), '')
        self.assertEqual(demo.publish_endpoint('https://new.trycloudflare.com'), commit)
        self.assertEqual(self.git('worktree', 'list', '--porcelain').count('worktree '), 1)


if __name__ == '__main__':
    unittest.main()
