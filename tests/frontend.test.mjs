// In-memory DOM component tests; these are not browser visual QA.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const root=new URL('../',import.meta.url);
const [html,js,bundle,data,predictions]=await Promise.all(['dist/index.html','dist/app.js','dist/hypergraph-view.js','dist/data.json','dist/predictions.json'].map(p=>readFile(new URL(p,root),'utf8')));
const D=JSON.parse(data),P=JSON.parse(predictions);
async function setup(){
 const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true});
 dom.window.scrollTo=()=>{};
 dom.window.fetch=async path=>({ok:true,json:async()=>JSON.parse(path==='data.json'?data:predictions)});
 dom.window.eval(bundle);
 dom.window.eval(js);
 // Let the actual asynchronous loader finish its two fetch continuations.
 await new Promise(resolve=>setImmediate(resolve));
 return dom;
}
function clickView(w,v){w.document.querySelector(`nav [data-view="${v}"]`).click();}
test('real-data loader renders community graph and matrix',async()=>{
 const dom=await setup(),w=dom.window,d=w.document;
 assert.equal(d.querySelector('#status').textContent,'');
 assert.equal(d.querySelectorAll('[data-community]').length,44);
 assert.equal(d.querySelectorAll('#graph svg [id$="-blobs-layer"] path').length,6);
 assert.ok(d.querySelectorAll('[data-user]').length>0);
 d.querySelector('[data-graph="matrix"]').click();
 assert.equal(d.querySelectorAll('.matrix tbody tr').length,6);
 const cell=d.querySelector('.matrix button');assert.match(cell.getAttribute('aria-label'),/交并比/);
 d.querySelector('[data-graph="hyper"]').click();
 d.querySelector('[data-user]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 assert.ok(d.querySelector('.timeline'));
 dom.window.close();
});
test('graph click opens real user timeline and prediction hides future until reveal',async()=>{
 const dom=await setup(),w=dom.window,d=w.document;
 const u=+d.querySelector('[data-user]').dataset.user;
 d.querySelector('[data-user]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 assert.equal(d.querySelector('#user-search').value,D.userIds[u]);
 assert.ok(d.querySelectorAll('.timeline td.observed').length>0);
 clickView(w,'prediction');
 assert.equal(d.querySelectorAll('.prediction-row.hit').length,0);
 assert.match(d.querySelector('.truth-panel').textContent,/先判断/);
 d.querySelector('#reveal').click();
 const truth=P.periods['7'].truth[u];
 assert.equal(d.querySelectorAll('.truth-tags span').length,truth.length);
 assert.equal(d.querySelectorAll('.prediction-row.hit').length,P.periods['7'].rankings.hgnnp[u].filter(([c])=>truth.includes(c)).length);
 const select=d.querySelector('#model-select');select.value='popular';select.dispatchEvent(new w.Event('change'));
 assert.match(d.querySelector('.truth-panel').textContent,/先判断/);
 assert.equal(d.querySelectorAll('.prediction-row').length,P.periods['7'].rankings.popular[u].length);
 dom.window.close();
});
test('all eleven windows and five views render without stale-data errors',async()=>{
 const dom=await setup(),w=dom.window,d=w.document;
 for(let t=0;t<11;t++){
  const slider=d.querySelector('#period-slider');slider.value=String(t);slider.dispatchEvent(new w.Event('input'));
  assert.match(d.querySelector('#period-label').textContent,new RegExp(D.periods[t].label));
 }
 for(const view of ['trajectory','bridges','prediction','methods','map']){
  clickView(w,view);assert.ok(d.querySelector('#workspace').textContent.length>50);
  assert.ok(!d.querySelector('#workspace').innerHTML.includes('undefined'));
  assert.ok(!d.querySelector('#workspace').innerHTML.includes('NaN'));
 }
 dom.window.close();
});
test('user lookup errors and valid lookups, model-period switch, and failure-case filter',async()=>{
 const dom=await setup(),w=dom.window,d=w.document;
 clickView(w,'prediction');
 d.querySelector('#user-search').value='not-a-user';d.querySelector('#user-go').click();
 assert.match(d.querySelector('#search-error').textContent,/没有找到/);
 d.querySelector('#user-search').value=D.userIds[3000];d.querySelector('#user-go').click();
 assert.equal(d.querySelector('#user-search').value,D.userIds[3000]);
 const slider=d.querySelector('#period-slider');slider.value='9';slider.dispatchEvent(new w.Event('input'));
 assert.match(d.querySelector('.flow').textContent,/P11/);
 const filter=d.querySelector('#case-filter');filter.value='miss';filter.dispatchEvent(new w.Event('change'));
 const u=D.userIds.indexOf(d.querySelector('#user-search').value);
 assert.ok(P.periods['9'].truth[u].length>0);
 assert.ok(!P.periods['9'].rankings.hgnnp[u].some(([c])=>P.periods['9'].truth[u].includes(c)));
 d.querySelector('#reveal').click();assert.equal(d.querySelectorAll('.prediction-row.hit').length,0);
 dom.window.close();
});

test('community hover highlights exact members; visual controls preserve membership',async()=>{
 const dom=await setup(),w=dom.window,d=w.document;
 const vertices=()=>[...d.querySelectorAll('.blob-canvas .vertex')];
 const originalIds=vertices().map(el=>+el.dataset.user);
 const legend=d.querySelector('[data-edge-focus]'),c=+legend.dataset.edgeFocus;
 legend.click();
 for(const el of vertices())assert.equal(el.style.opacity,D.memberships[7][+el.dataset.user].includes(c)?'1':'0.12');
 const layout=d.querySelector('[data-plot-control="layout"]');
 layout.value='grid-layout';layout.dispatchEvent(new w.Event('change'));
 assert.deepEqual(vertices().map(el=>+el.dataset.user),originalIds);
 assert.ok(!d.querySelector('.blob-canvas').innerHTML.includes('NaN'));
 const before=d.querySelector('[id$="-zoom-transform-layer"]').getAttribute('transform');
 d.querySelector('[data-zoom="in"]').click();
 assert.notEqual(d.querySelector('[id$="-zoom-transform-layer"]').getAttribute('transform'),before);
 const boundaries=d.querySelector('[data-plot-control="boundaries"]');
 boundaries.checked=false;boundaries.dispatchEvent(new w.Event('change'));
 assert.equal(d.querySelectorAll('[id$="-blobs-layer"] path').length,0);
 const sampling=d.querySelector('#graph-sampling');sampling.value='bridges';sampling.dispatchEvent(new w.Event('change'));
 const selected=[...d.querySelectorAll('[data-community].selected')].map(b=>+b.dataset.community).slice(0,6);
 const ranked=D.memberships[7].map((cs,u)=>({u,count:cs.filter(c=>selected.includes(c)).length})).filter(r=>r.count>=2).sort((a,b)=>b.count-a.count||a.u-b.u).slice(0,48).map(r=>r.u);
 assert.deepEqual(vertices().map(el=>+el.dataset.user),ranked);
 dom.window.close();
});

test('dragging a vertex does not open a trajectory or change graph membership',async()=>{
 const dom=await setup(),w=dom.window,d=w.document;
 const el=d.querySelector('.blob-canvas .vertex'),id=el.dataset.user;
 const shape=el.querySelector('circle,rect'),xBefore=shape.getAttribute('cx')||shape.getAttribute('x');
 el.dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,clientX:80,clientY:100}));
 w.dispatchEvent(new w.MouseEvent('mousemove',{clientX:120,clientY:140}));
 w.dispatchEvent(new w.MouseEvent('mouseup'));
 const moved=d.querySelector(`.blob-canvas .vertex[data-user="${id}"]`);
 moved.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 assert.ok(d.querySelector('.blob-canvas'));
 const after=moved.querySelector('circle,rect');
 assert.notEqual(after.getAttribute('cx')||after.getAttribute('x'),xBefore);
 const oldSVG=d.querySelector('.blob-canvas svg');
 clickView(w,'trajectory');
 const detachedBefore=oldSVG.innerHTML;
 w.dispatchEvent(new w.MouseEvent('mousemove',{clientX:200,clientY:200}));
 assert.equal(oldSVG.innerHTML,detachedBefore);
 dom.window.close();
});
