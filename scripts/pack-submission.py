"""Package a reviewed report, source code, and real team slides in the required layout."""
import argparse
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re
import tempfile
import shutil

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--group', required=True, help='Your actual group number')
    parser.add_argument('--report', required=True, type=Path, help='Reviewed final PDF')
    parser.add_argument('--slides', required=True, type=Path, help='Folder with all members slides')
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9_-]+', args.group):
        parser.error('Group number must contain letters, digits, underscore or hyphen.')
    if not args.report.is_file() or args.report.suffix.lower() != '.pdf':
        parser.error('Provide a real report PDF using --report.')
    if args.report.read_bytes()[:5] != b'%PDF-':
        parser.error('Report is not a PDF file.')
    slides = sorted(p for p in args.slides.rglob('*') if p.is_file()) if args.slides.is_dir() else []
    if not any(p.suffix.lower() in {'.pptx', '.ppt', '.pdf', '.odp'} for p in slides):
        parser.error('Slides directory must contain actual slides. Include every member.')
    destination = ROOT / 'output' / 'submission' / ('Group-' + args.group + '.zip')
    if destination.exists():
        parser.error('Output already exists. Rename the previous package before rerunning.')
    # Snapshot source paths before creating output; never include generated bundles recursively.
    sources = [p for p in ROOT.rglob('*') if p.is_file() and not set(p.relative_to(ROOT).parts).intersection({'output', 'tmp', '.git', 'node_modules', '__pycache__'})]
    with tempfile.TemporaryDirectory(prefix='hypergraph-submission-') as temp:
        archive = Path(temp) / destination.name
        with ZipFile(archive, 'w', ZIP_DEFLATED) as z:
            z.write(args.report, 'report.pdf')
            for p in sources:
                z.write(p, 'Visualization Appendix/hypergraph-lab/' + p.relative_to(ROOT).as_posix())
            for p in slides:
                z.write(p, 'Visualization Appendix/slides/' + p.relative_to(args.slides).as_posix())
        if archive.stat().st_size > 50_000_000:
            parser.error('Package exceeds the 50 MB assignment limit. Reduce embedded media.')
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(archive, destination)
    print(str(destination))
    print('Size: %.2f MB. Verify real member contributions and final report content before submitting.' % (destination.stat().st_size / 1_000_000))

if __name__ == '__main__':
    main()
