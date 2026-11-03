import http.client
import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

import reddit_api
from serve_model import ModelHandler, PAGES_ORIGIN


class GatewayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), ModelHandler)
        cls.worker = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.worker.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.worker.join()

    def request(self, method, path, body=None, headers=None):
        conn = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        conn.request(method, path, body, {'Origin': PAGES_ORIGIN, **(headers or {})})
        response = conn.getresponse()
        result = response.status, dict(response.getheaders()), response.read()
        conn.close()
        return result

    def test_only_model_api_is_exposed_and_foreign_origins_are_rejected(self):
        with patch.object(reddit_api, 'metadata', return_value=({'run_id': 'test'}, Path('/python'))):
            status, headers, body = self.request('GET', '/api/reddit/model')
            self.assertEqual(status, 200)
            self.assertEqual(headers['Access-Control-Allow-Origin'], PAGES_ORIGIN)
            self.assertEqual(json.loads(body)['run_id'], 'test')
            for path in ['/', '/index.html', '/.env', '/models/reddit/default.json', '/../README.md']:
                self.assertEqual(self.request('GET', path)[0], 404)
            for headers in [{'Origin': 'https://other.example'}, {'Host': 'other.example'}]:
                self.assertEqual(self.request('GET', '/api/reddit/model', headers=headers)[0], 403)

    def test_preflight_allows_json_prediction_only_for_the_pages_origin(self):
        headers = {'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type'}
        status, response_headers, _ = self.request('OPTIONS', '/api/reddit/predict', headers=headers)
        self.assertEqual(status, 204)
        self.assertEqual(response_headers['Access-Control-Allow-Origin'], PAGES_ORIGIN)
        for change in [{'Origin': 'https://other.example'}, {'Access-Control-Request-Method': 'DELETE'}, {'Access-Control-Request-Headers': 'authorization'}]:
            self.assertEqual(self.request('OPTIONS', '/api/reddit/predict', headers={**headers, **change})[0], 403)
        self.assertEqual(self.request('OPTIONS', '/unrelated', headers=headers)[0], 404)

    def test_existing_input_limits_and_json_errors_work_over_http(self):
        self.assertEqual(self.request('POST', '/api/reddit/predict', '{}', {'Content-Type': 'text/plain'})[0], 415)
        status, headers, _ = self.request('POST', '/api/reddit/predict', 'not json', {'Content-Type': 'application/json'})
        self.assertEqual(status, 400)
        self.assertEqual(headers['Access-Control-Allow-Origin'], PAGES_ORIGIN)
        self.assertEqual(self.request('POST', '/api/reddit/predict', '{}', {'Content-Type': 'application/json', 'Content-Length': '262145'})[0], 413)


if __name__ == '__main__':
    unittest.main()
