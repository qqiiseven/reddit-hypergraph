const assert=require('node:assert/strict');
const path=require('node:path');
const vm=require('node:vm');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../dist/reddit-data.js'),'utf8'),sandbox);
 const D=sandbox.window.RedditDemoData;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1512,height:1060}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.PREVIEW_URL||'http://127.0.0.1:4173/';
 await page.goto(base+'#reddit');await page.locator('#reddit-graph').waitFor();await page.evaluate(()=>document.fonts.ready);
 assert.equal(D.cases.length,3);
 assert.equal(await page.locator('[data-reddit=reveal], .r-sample-note').count(),0);
 assert.deepEqual([...new Set(D.cases.map(c=>c.current.length))].sort((a,b)=>a-b),[3,4]);
 assert.equal(await page.locator('[data-main=reddit]').getAttribute('aria-current'),'page');
 for(const c of D.cases){
  assert.ok(c.rankings.hgnnp.some(r=>c.truth.includes(r.community)));
  assert.ok(c.rankings.mlp.every(r=>!c.truth.includes(r.community)));
  await page.selectOption('#reddit-user',c.id);
  assert.equal(await page.locator('#reddit-truth').isVisible(),true);
  assert.equal(await page.locator('.r-outcome').count(),5);
  assert.equal(await page.locator('.r-person').count(),c.peers.length);
  assert.equal(await page.locator('.r-region').count(),c.current.length);
  assert.deepEqual(Array.from(c.groups,g=>g.community),Array.from(c.current));
  assert.match(await page.locator('#reddit-user option:checked').innerText(),/^User /);
  for(const g of c.groups) assert.ok((await page.locator('#reddit-graph').textContent()).includes(g.size.toLocaleString('en-US')+' 位用户'));
  // Drawing membership is exact, with every displayed node disk fully in its own hyperedges.
  const nodes=await page.locator('.r-person').evaluateAll(es=>es.map(e=>{const q=e.querySelector('circle:last-of-type');return {label:e.dataset.person,x:+q.getAttribute('cx'),y:+q.getAttribute('cy'),r:+q.getAttribute('r')};}));
  for(const p of c.peers){
   const n=nodes.find(n=>n.label===p.label);
   if(c.groups.length===3) [[220,150],[420,150],[320,260]].forEach(([x,y],i)=>{const distance=Math.hypot(n.x-x,n.y-y);assert.equal(distance<132,Boolean(p.mask&(1<<i)));if(p.mask&(1<<i))assert.ok(distance+n.r<=132.1);});
  }
  if(c.groups.length===4){
   const regions=await page.locator('.r-region ellipse').evaluateAll(es=>es.map(e=>({cx:+e.getAttribute('cx'),cy:+e.getAttribute('cy'),rx:+e.getAttribute('rx'),ry:+e.getAttribute('ry'),angle:+e.getAttribute('transform').match(/rotate\(([-\d.]+)/)[1]*Math.PI/180})));
   assert.equal(regions.length,4);
   const target=await page.locator('.r-target circle:last-of-type').evaluate(e=>({x:+e.getAttribute('cx'),y:+e.getAttribute('cy'),r:+e.getAttribute('r')}));
   const disks=[...nodes.map(n=>({...n,mask:c.peers.find(p=>p.label===n.label).mask})),{...target,mask:15}];
   for(const n of disks) for(let k=0;k<360;k++){
    const x=n.x+n.r*Math.cos(k*Math.PI/180),y=n.y+n.r*Math.sin(k*Math.PI/180);
    regions.forEach((e,i)=>{const dx=x-e.cx,dy=y-e.cy,co=Math.cos(e.angle),si=Math.sin(e.angle),inside=((dx*co+dy*si)/e.rx)**2+((-dx*si+dy*co)/e.ry)**2<1;assert.equal(inside,Boolean(n.mask&(1<<i)),`wrong intersection ${c.id}/${n.label}/${i}`)});
   }
   for(let i=0;i<disks.length;i++)for(let j=i+1;j<disks.length;j++)assert.ok(Math.hypot(disks[i].x-disks[j].x,disks[i].y-disks[j].y)>disks[i].r+disks[j].r);
  }
  for(const method of ['hgnnp','mlp','overlap','popular']){
   await page.locator(`[data-method=${method}]`).click();
   const actual=await page.locator('.r-rankings button').evaluateAll(es=>es.map(e=>Number(e.dataset.candidate)));
   assert.deepEqual(actual,Array.from(c.rankings[method],r=>r.community));
   assert.ok(actual.every(id=>!c.seen.includes(id)));
   for(const rank of c.rankings[method]){
    await page.locator(`[data-candidate="${rank.community}"]`).click();
    const markers=await page.locator('.r-person circle[stroke="#d58a4b"]').count();
    assert.equal(markers,c.peers.filter(p=>p.communities.includes(rank.community)).length);
   }
  }
  await page.locator('[data-method=hgnnp]').click();

  assert.equal(await page.locator('.r-outcome.hit').count(),c.rankings.hgnnp.filter(r=>c.truth.includes(r.community)).length);
  assert.equal(await page.locator('.r-truth-tags span').count(),c.truth.length);

  assert.equal(await page.locator('#reddit-truth').isVisible(),true);
 }
 await page.locator('[data-reddit=reset]').click();
 await page.locator('[data-phase="2"]').click();
 assert.equal(await page.locator('.r-region circle[fill-opacity="0.17"]').count(),D.cases[0].current.length);
 await page.locator('[data-phase="3"]').click();
 assert.equal(await page.locator('.r-target circle').count(),2);
 await page.locator('.r-person').first().focus();await page.keyboard.press('Enter');
 assert.match(await page.locator('#reddit-selection').innerText(),/U01/);
 await page.locator('[data-reddit=history]').click();assert.equal(await page.locator('dialog[open] .r-history tbody tr').count(),D.cases[0].seen.length);
 await page.keyboard.press('Escape');
 await page.locator('[data-reddit=evaluation]').first().click();assert.match(await page.locator('#dialog-content').innerText(),/不是“普通图做不到”/);await page.keyboard.press('Escape');
 const metricLabels=await page.locator('.r-metric-row b').allTextContents();
 assert.deepEqual(metricLabels,['popular','overlap','mlp','hgnnp'].map(m=>(D.metrics[m].recall5*100).toFixed(2)+'%'));
 await page.locator('[data-reddit=reset]').click();await page.locator('h1').click();
 await page.screenshot({path:path.resolve(__dirname,'../screenshots/03-reddit-desktop.png'),fullPage:true});

 await page.screenshot({path:path.resolve(__dirname,'../screenshots/03-reddit-revealed.png'),fullPage:true});
 await page.selectOption('#reddit-user',D.cases[1].id);await page.locator('h1').click();
 await page.screenshot({path:path.resolve(__dirname,'../screenshots/03-reddit-four-communities.png'),fullPage:true});
 for(const width of [390,768,1024]){
  await page.setViewportSize({width,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${width}`);
  await page.selectOption('#reddit-user',D.cases[2].id);assert.equal(await page.locator('.r-outcome.hit').count(),D.cases[2].rankings.hgnnp.filter(r=>D.cases[2].truth.includes(r.community)).length);
  if(width===390){await page.locator('h1').click();await page.screenshot({path:path.resolve(__dirname,'../screenshots/03-reddit-mobile.png'),fullPage:true});}
 }
 await page.goto(base+'#reddit-results');await page.locator('#reddit-results').waitFor();
 for(const route of ['composition','uses','frontiers','reddit']){await page.goto(base+'#'+route);await page.locator('h1').waitFor();}
 await page.goto('file://'+path.resolve(__dirname,'../dist/index.html')+'#reddit');await page.locator('#reddit-graph').waitFor();
 assert.deepEqual(errors,[]);await browser.close();
 console.log('PASS: all real rankings and outcomes, exact local hyperedge membership, outcomes visible by default, baseline switching, observed co-membership, aggregation steps, metric values, dialogs, 3 screen widths, deep links, offline load.');
})().catch(e=>{console.error(e);process.exit(1);});
