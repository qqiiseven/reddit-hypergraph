"""Read approximate point coordinates from the publicly released Figure 3 PDF.
No inference about token counts: bubble scale is not supplied by the paper.
Run with PyMuPDF available on PYTHONPATH.
"""
import json
from pathlib import Path
import pymupdf as fitz
root=Path(__file__).resolve().parents[1]
pdf=root/'research/hyperrag/source/figure/efficiency_vs_performance.pdf'
page=fitz.open(pdf)[0]
points=[]
for d in page.get_drawings():
    color=d.get('fill');rect=d['rect']
    if color and max(color)-min(color)>.1 and 5<rect.width<45 and abs(rect.width-rect.height)<.02:
        points.append(rect)
assert len(points)==6
names=['RAPTOR','HippoRAG','HyperGraphRAG','ToG','HyperMemory','HyperRetriever']
rows=[]
# Axis ticks: x=0 at 137.325607, x=400 at 663.770508;
# y=0 at 365.880005, y=50 at 30.898865. Units are PDF points.
for name,r in zip(names,points):
    rows.append({'method':name,'retrievalSecondsApprox':round(((r.x0+r.x1)/2-137.325607)/(663.770508-137.325607)*400,1),'hits10Approx':round((365.880005-(r.y0+r.y1)/2)/(365.880005-30.898865)*50,1),'tokens':None})
f=root/'dist/rag-research-data.json';data=json.loads(f.read_text());data['hyperrag2026']['efficiencyFigureApprox']=rows;data['hyperrag2026']['efficiencyNote']='Figure 3 coordinate readings rounded to one decimal; not raw experimental records. Token counts cannot be recovered from uncalibrated log-sized bubbles.';f.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(rows,ensure_ascii=False,indent=2))
