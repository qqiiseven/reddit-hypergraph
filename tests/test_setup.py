"""Standard-library tests for local data bootstrap safeguards."""
import hashlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('setup_demo',Path(__file__).resolve().parents[1]/'setup_demo.py')
setup=importlib.util.module_from_spec(spec);spec.loader.exec_module(setup)

class Response(io.BytesIO):
    def __init__(self,body,status,headers):
        super().__init__(body);self.status=status;self.headers=headers

class SetupTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        self.body=b'known original archive'
        self.patches=[patch.object(setup,'ARCHIVE_SIZE',len(self.body)),patch.object(setup,'ARCHIVE_SHA',hashlib.sha256(self.body).hexdigest())]
        for p in self.patches:p.start()

    def tearDown(self):
        for p in self.patches:p.stop()
        self.temp.cleanup()

    def test_verified_archive_is_reused_without_network(self):
        path=self.root/'archive.tar.gz';path.write_bytes(self.body)
        with patch.object(setup.urllib.request,'urlopen') as network:
            setup.download_archive(path)
            network.assert_not_called()

    def test_invalid_original_is_preserved(self):
        path=self.root/'archive.tar.gz';bad=b'x'*len(self.body);path.write_bytes(bad)
        with self.assertRaises(ValueError):setup.download_archive(path)
        self.assertEqual(path.read_bytes(),bad)

    def test_resumes_only_matching_range_and_verifies_final_file(self):
        path=self.root/'archive.tar.gz';partial=self.root/'archive.tar.gz.part'
        partial.write_bytes(self.body[:5])
        response=Response(self.body[5:],206,{'Content-Range':f'bytes 5-{len(self.body)-1}/{len(self.body)}'})
        with patch.object(setup.urllib.request,'urlopen',return_value=response) as network:
            setup.download_archive(path)
            self.assertEqual(network.call_args.args[0].get_header('Range'),'bytes=5-')
        self.assertEqual(path.read_bytes(),self.body);self.assertFalse(partial.exists())

    def test_wrong_range_does_not_append_or_replace(self):
        path=self.root/'archive.tar.gz';partial=self.root/'archive.tar.gz.part';partial.write_bytes(b'12345')
        response=Response(self.body,206,{'Content-Range':'bytes 0-99/100'})
        with patch.object(setup.urllib.request,'urlopen',return_value=response):
            with self.assertRaises(ValueError):setup.download_archive(path)
        self.assertEqual(partial.read_bytes(),b'12345');self.assertFalse(path.exists())

if __name__=='__main__':unittest.main(verbosity=2)
