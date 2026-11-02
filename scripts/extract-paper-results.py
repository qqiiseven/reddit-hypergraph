"""Extract published vector Figure 3, not simulated data. Requires PyMuPDF.
Run: PYTHONPATH=/tmp/discussion-pdf-tools python3 scripts/extract-paper-results.py
The source PDF is retained in research/simplagion. All object IDs/calibration
and limitations are exported with the data for audit and reproduction.
"""
from pathlib import Path
import json, csv, hashlib
import pymupdf as fitz

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'research/simplagion/paper-published.pdf'
OUT=ROOT/'dist/paper-assets';OUT.mkdir(exist_ok=True)
doc=fitz.open(SOURCE);page=doc[5];draw=page.get_drawings()
# Fig 3a: exact axis/tick vector positions in PDF points.
X0=91.52999877929688;X1=224.4429931640625
Y0=146.708984375;Y8=76.1409912109375
def xy(p):return [round(.2+(p[0]-X0)/(X1-X0)*2,6),round(max(0,(Y0-p[1])/(Y0-Y8)*.8),6)]
def point(i):
 r=draw[i]['rect'];v=xy(((r.x0+r.x1)/2,(r.y0+r.y1)/2));return {'lambda':v[0],'rho':v[1],'pdfObject':i}
baseline=[point(i) for i in range(88,135) if draw[i]['fill']]
weak=[point(i) for i in range(146,205,2)] # full stroked squares, not clipped fill
strong=[];seen=set()
for i in range(205,305):
 g=draw[i];c=g['fill']
 if not c or not (.14<c[0]<.22 and .44<c[1]<.60):continue
 v=point(i);key=(round(v['lambda'],3),round(v['rho'],4))
 if key not in seen:strong.append(v);seen.add(key)
for series in [baseline,weak,strong]:series.sort(key=lambda p:(p['lambda'],p['rho']))
assert len(baseline)==30 and len(weak)==30
assert .50<baseline[-1]['rho']<.54

# Sample the already-published MF vector paths, including cubic Beziers.
# This is geometry extraction, not reevaluation of the model or a new run.
mf=[]
for name,i in [('strong',84),('weak',85),('baseline',86)]:
 points=[]
 for item in draw[i]['items']:
  if item[0]=='l':points.extend([xy(item[1]),xy(item[2])])
  elif item[0]=='c':
   a,b,c,d=item[1:]
   for n in range(61):
    t=n/60;u=1-t;points.append(xy((u**3*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t**3*d.x,u**3*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t**3*d.y)))
 mf.append({'id':name,'points':points,'pdfObject':i})

# Fig 3b: x ticks at 0 and 500; y calibration uses the dashed theoretical
# threshold rho=0.2 and the lower plotting boundary rho=-0.05.
# Values are digitized coordinates, not the author's saved trajectories.
TX0=276.0469970703125;TX1=534.530029296875
BOTTOM=157.79800415039062;THRESHOLD=135.177001953125
YSCALE=(BOTTOM-THRESHOLD)/.25;TY0=BOTTOM-.05*YSCALE
def time_xy(p):return [round((p[0]-TX0)/(TX1-TX0)*500,4),round(max(0,(TY0-p[1])/YSCALE),6)]
trajectories=[]
for j,i in enumerate(range(11,30)):
 g=draw[i];points=[];vertices=[]
 for item in g['items']:
  if item[0]=='l':vertices.extend(item[1:])
  elif item[0]=='c':
   a,b,c,d=item[1:]
   for z in range(17):
    t=z/16;u=1-t;vertices.append((u**3*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t**3*d.x,u**3*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t**3*d.y))
  else:raise ValueError(item)
 converted=[time_xy(p)for p in vertices]
 for v in converted:
  if -0.01<=v[0]<=500.001 and (not points or v!=points[-1]):points.append(v)
 r=draw[30+j*2]['rect'];initial=time_xy(((r.x0+r.x1)/2,(r.y0+r.y1)/2))[1]
 # The rightmost visible segment can extend past the axis: clip geometrically.
 for a,b in zip(converted,converted[1:]):
  if a[0]<500<b[0]:
   points.append([500,round(a[1]+(b[1]-a[1])*(500-a[0])/(b[0]-a[0]),6)]);break
 trajectories.append({'id':j,'initialApprox':initial,'color':'#'+''.join(f'{round(c*255):02x}' for c in g['color']),'points':points,'pdfObject':i,'initialMarkerObject':30+j*2})
assert len(trajectories)==19
assert all(p[0]<=500.001 for s in trajectories for p in s['points'])

data={'source':{'title':'Simplicial models of social contagion','authors':'Iacopini, Petri, Barrat & Latora','year':2019,'doi':'10.1038/s41467-019-10431-6','url':'https://www.nature.com/articles/s41467-019-10431-6','pdfUrl':'https://www.nature.com/articles/s41467-019-10431-6.pdf','license':'CC BY 4.0','page':6,'figure':'3a / 3b','pdfSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'kind':'digitized-published-vector-figure','notes':['Not author raw result files; not newly simulated data.','Coordinates reconstructed from published PDF vector geometry; round values for display.','Strong Fig3a markers include both initial conditions; overlapping points may be hidden in the published rendering. Individual marker seed attribution is not recovered.','Fig3b is a set of individual realizations, not ensemble mean curves.','Fig3b initial values estimated from initial marker positions; vector paths can be simplified/clipped, and no absent tail is extrapolated.','Theoretical MF lines are extracted separately from the published figure and must not be labeled simulation observations.'],'calibration':{'a':{'x0':X0,'x1':X1,'domain':[.2,2.2],'yZero':Y0,'yPoint8':Y8},'b':{'x0':TX0,'x500':TX1,'yBottomMinusPoint05':BOTTOM,'yThresholdPoint2':THRESHOLD}}},'settings':{'N':2000,'meanDegree':20,'meanTriangleDegree':6,'lambdaForTime':.75,'lambdaDeltaForTime':2.5},'series':[{'id':'baseline','name':'仅两两作用','lambdaDelta':0,'points':baseline},{'id':'weak','name':'弱群体作用','lambdaDelta':.8,'points':weak},{'id':'strong','name':'强群体作用','lambdaDelta':2.5,'points':strong}],'mf':mf,'trajectories':trajectories}
(OUT/'figure3-data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
(OUT/'figure3-data.js').write_text('window.PAPER_RESULTS='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';')
with (OUT/'figure3a-points.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['series','lambda_delta','lambda_approx','rho_approx','pdf_object'])
 for s in data['series']:
  for p in s['points']:w.writerow([s['id'],s['lambdaDelta'],p['lambda'],p['rho'],p['pdfObject']])
with (OUT/'figure3b-paths.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['curve','initial_approx','time_approx','rho_approx','pdf_object'])
 for s in trajectories:
  for t,r in s['points']:w.writerow([s['id'],s['initialApprox'],t,r,s['pdfObject']])
# Original published figure panel, preserving its lettering and axes.
page.get_pixmap(matrix=fitz.Matrix(3,3),clip=fitz.Rect(43,49,550,184),alpha=False).save(OUT/'figure3-original.png')
print('Extracted:',[(s['id'],len(s['points']))for s in data['series']],'; trajectories',len(trajectories))
print('Time curve initial estimates:',[round(s['initialApprox'],3)for s in trajectories])
