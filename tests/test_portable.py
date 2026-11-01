"""Verify a clone's full viewer with only the Python standard library.

Run: python3 tests/test_portable.py
Starts and stops its own server on an OS-assigned free port.
"""
import json
import subprocess
import sys
import unittest
import urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

class PortableDemoTest(unittest.TestCase):
    def test_static_viewer_from_checkout(self):
        proc=subprocess.Popen([sys.executable,str(ROOT/'serve.py'),'--port','0'],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        try:
            banner=proc.stdout.readline().strip()
            self.assertTrue(banner.startswith('Local: http://127.0.0.1:'),banner)
            base=banner.removeprefix('Local: ')
            assets={}
            for name in ['index.html','style.css','app.js','hypergraph-view.js','data.json','predictions.json']:
                with urllib.request.urlopen(f'{base}/{name}',timeout=10) as response:
                    self.assertEqual(response.status,200)
                    assets[name]=response.read()
                    self.assertTrue(assets[name])
            self.assertIn(b'hypergraph-view.js',assets['index.html'])
            data=json.loads(assets['data.json']);pred=json.loads(assets['predictions.json'])
            self.assertEqual(len(data['periods']),11)
            self.assertEqual(len(data['memberships']),11)
            self.assertEqual(set(pred['periods']),{'6','7','8','9'})
            for period in pred['periods'].values():
                self.assertEqual(len(period['truth']),len(data['userIds']))
                for rankings in period['rankings'].values():
                    self.assertEqual(len(rankings),len(data['userIds']))
        finally:
            proc.terminate()
            try:proc.wait(timeout=5)
            except subprocess.TimeoutExpired:proc.kill();proc.wait()
            proc.stdout.close();proc.stderr.close()

if __name__=='__main__':unittest.main(verbosity=2)
