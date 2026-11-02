const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const D=require('../dist/frontiers-data.js');
(async()=>{
  for(let seed=1;seed<=50;seed++){
    const graph=D.sample(seed),st=D.stats(graph);
    assert.deepEqual(graph.edges.map(e=>e.length),[3,4,3]);
    assert.equal(new Set(graph.edges.flat()).size,8);
    graph.edges.forEach(e=>assert.equal(new Set(e).size,e.length));
    assert.equal(Object.values(st.degrees).reduce((a,b)=>a+b,0),8);
    assert.equal(Object.entries(st.degrees).reduce((a,[degree,n])=>a+degree*n,0),10);
  }
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1512,height:1060}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.PREVIEW_URL||'http://127.0.0.1:4173/';
  await page.goto(base+'#frontiers');
  await page.locator('.f-card').last().waitFor();
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.f-card').count(),4);
  assert.equal(await page.locator('[data-main=frontiers]').getAttribute('aria-current'),'page');
  await page.locator('.f-thumb[data-image=P4]').first().click();
  assert.equal(await page.locator('.f-thumb[data-image=P4][aria-pressed=true]').count(),2);
  assert.equal(await page.locator('.f-matrix-row[data-image=P4]').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#frontiers-images .f-selection').innerText(),/P4 · 河畔 \/ 红车/);
  await page.getByRole('button',{name:'广场',exact:true}).click();
  assert.equal(await page.locator('.f-matrix-row[aria-pressed=true]').count(),3);
  await page.locator('.f-matrix-row[data-image=P6]').focus();await page.keyboard.press('Enter');
  assert.match(await page.locator('#frontiers-images .f-selection').innerText(),/不属于当前两组/);
  assert.equal(await page.locator('.f-matrix-row[data-image=P6]').evaluate(el=>el===document.activeElement),true);
  const before=await page.locator('.f-distributions').innerHTML();
  await page.getByRole('button',{name:'换一组结构'}).click();
  assert.match(await page.locator('#frontiers-generation .f-selection').innerText(),/#2/);
  assert.notEqual(await page.locator('.f-distributions').innerHTML(),before);
  await page.locator('[data-evidence=first]').click();assert.match(await page.locator('.f-answer').innerText(),/缺少任职事实/);
  await page.locator('[data-evidence=second]').click();assert.match(await page.locator('.f-answer').innerText(),/缺少项目关联/);
  await page.locator('[data-evidence=both]').click();assert.match(await page.locator('.f-answer').innerText(),/机构 B.*E1 \+ E2/);
  await page.locator('button[data-edge=E2]').click();assert.match(await page.locator('.f-edge-members').innerText(),/C、D、E/);
  assert.equal(await page.locator('[data-incidence]').count(),6);
  for(const e of D.relation.edges)for(const n of e.members)assert.equal(await page.locator(`[data-incidence="${e.id}:${n}"]`).count(),1);
  await page.locator('[data-view=incidence]').click();assert.equal(await page.locator('.f-representations svg').count(),1);
  await page.locator('[data-view=both]').click();assert.equal(await page.locator('.f-representations svg').count(),2);
  await page.getByRole('button',{name:'论文索引'}).click();assert.equal(await page.locator('dialog[open] .f-paper-index article').count(),7);
  assert.equal(await page.locator('dialog[open] .preprint').count(),2);
  const sources=await page.locator('dialog .f-paper-index a').evaluateAll(as=>as.map(a=>({href:a.href,target:a.target,rel:a.rel})));
  assert.ok(sources.every(a=>a.href.startsWith('https://')&&a.target==='_blank'&&a.rel.includes('noopener')));
  await page.keyboard.press('Escape');await page.locator('button[data-paper=generation]').click();
  assert.match(await page.locator('#dialog-content').innerText(),/未训练或调用 SuperHype/);await page.keyboard.press('Escape');
  await page.locator('[data-frontier=reset]').click();assert.match(await page.locator('#frontiers-images .f-selection').innerText(),/P1/);
  assert.match(await page.locator('#frontiers-generation .f-selection').innerText(),/#1/);
  const b1=await page.locator('#frontiers-images').boundingBox(),b2=await page.locator('#frontiers-generation').boundingBox();assert.ok(b2.x>b1.x+b1.width);
  await page.screenshot({path:path.resolve(__dirname,'../screenshots/04-frontiers-desktop.png'),fullPage:true});
  for(const width of [390,768,1024]){
    await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow at ${width}`);
    if(width===390){await page.locator('[data-frontier=sample]').click();await page.locator('h1').click();await page.screenshot({path:path.resolve(__dirname,'../screenshots/04-frontiers-mobile.png'),fullPage:true});}
  }
  await page.locator('[data-main=intro]').click();await page.locator('#main-graph').waitFor();
  await page.locator('[data-main=uses]').click();await page.locator('#reinforcement').waitFor();
  await page.goto(base+'#frontiers-vision');await page.locator('#frontiers-vision').waitFor();
  assert.deepEqual(errors,[]);await browser.close();
  console.log('PASS: data invariants, linked selection, keyboard, sampling stats, evidence, representations, paper index, responsive layout, routing, no browser errors.');
})().catch(e=>{console.error(e);process.exit(1);});
