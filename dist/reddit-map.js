/* Section 07 community explorer; independent of the saved prediction cases. */
(()=>{
  'use strict';
  const M=window.RedditMapModel,H=window.HyperModel,NS='http://www.w3.org/2000/svg';
  const state={period:7,selected:[],view:'hull',layout:'force',sampling:'diverse',boundaries:true,curves:false,zoom:1,focus:null,user:null};
  let host,data,loading,geometry,chosen,cache=new Map(),notice='';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>n.toLocaleString('zh-CN'),pct=n=>(n*100).toFixed(1)+'%';
  const q=s=>host.querySelector(s);
  const button=(action,text,extra='')=>'<button type="button" data-map="'+action+'" '+extra+'>'+text+'</button>';
  const option=(value,label,current)=>'<option value="'+value+'" '+(value===current?'selected':'')+'>'+label+'</option>';
  function stats(){if(!cache.has(state.period))cache.set(state.period,M.summary(data,state.period));return cache.get(state.period);}
  function rebuild(){chosen=M.sample(data,state.period,state.selected,state.sampling);geometry=M.layout(chosen.users,state.selected,state.layout);state.focus=null;state.user=null;state.zoom=1;}
  function accept(d){data=M.validate(d);cache=new Map();state.period=Math.min(7,data.periods.length-1);state.selected=['technology','programming','gaming','science','movies','Music'].map(name=>data.communities.findIndex(c=>c.toLowerCase()===name.toLowerCase())).filter(c=>c>=0);if(state.selected.length<2)state.selected=[0,1];rebuild();}
  function loadingMarkup(message){host.innerHTML='<section class="panel rm-panel"><h2>圈层地图</h2><p class="rm-note">'+esc(message)+'</p><label class="rm-import">载入 Reddit 数据 <input id="rm-file" type="file" accept=".json,application/json"></label><p class="rm-note">选择原项目导出的 data.json 或本机的 reddit-network.json，文件仅在浏览器中读取。</p></section>';bindImport();}
  function bindImport(){const input=q('#rm-file');if(input)input.onchange=async()=>{const file=input.files[0];if(!file)return;try{if(file.size>25*1024*1024)throw Error('请选择小于 25 MB 的数据文件。');accept(JSON.parse(await file.text()));notice='已载入本地文件。';render();}catch(e){loadingMarkup('无法载入：'+e.message);}};}
  async function mount(container){
    host=container;
    if(data){render();return;}
    loadingMarkup('正在读取真实社区数据…');
    if(!loading)loading=fetch('reddit-network.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('本机尚未准备完整社区数据。');return r.json();}).then(d=>{if(!data)accept(d);}).catch(e=>{if(!data)notice=e.message;});
    await loading;
    if(!host?.isConnected)return;
    if(data)render();else loadingMarkup(notice);
  }
  function render(){
    if(!host?.isConnected)return;
    const p=data.periods[state.period],s=stats();
    host.innerHTML='<section class="panel rm-panel" aria-label="Reddit 圈层地图">'+
      '<div class="rm-heading"><div><span class="r-kicker">COMMUNITY MAP / 真实群体结构</span><h2>一组人，多个圈子</h2><p>选择 2–10 个社区，查看同一期的共同参与结构。</p></div><div class="rm-view-switch" role="group" aria-label="地图表示">'+
      [['hull','包络超图'],['lines','关联线'],['matrix','重叠矩阵']].map(([v,label])=>button('view',label,'data-value="'+v+'" aria-pressed="'+(state.view===v)+'"')).join('')+'</div></div>'+
      '<div class="rm-period"><div><strong>'+esc(p.label)+' · 第 '+(state.period+1)+' 期</strong><span>'+esc(p.start)+' — '+esc(p.end)+'</span></div><input id="rm-period" aria-label="观察窗口" aria-describedby="rm-period-help" type="range" min="0" max="'+(data.periods.length-1)+'" value="'+state.period+'"><div class="rm-period-ticks">'+data.periods.map((p,i)=>button('period',esc(p.label),'data-value="'+i+'" aria-pressed="'+(i===state.period)+'" title="第 '+(i+1)+' 期：'+esc(p.start)+' — '+esc(p.end)+'"')).join('')+'</div><p id="rm-period-help" class="rm-note">P = Period（时间窗口）：P01、P02、P03 分别表示第 1、2、3 期，每期 4 周（28 天）。点击或拖动时间轴，上方显示该期日期，图中展示该期的社区参与记录。</p></div>'+
      '<div class="rm-selection-heading"><span>社区 <b>'+state.selected.length+' / 10</b></span><label>搜索 <input id="rm-search" type="search" placeholder="查找社区" aria-label="搜索社区"></label></div>'+
      '<div class="rm-community-list">'+data.communities.map((name,i)=>{const selected=state.selected.includes(i),color=M.palette[state.selected.indexOf(i)]||'#8293aa';return button('community','<i style="background:'+color+'"></i>'+esc(name),'data-community="'+i+'" aria-pressed="'+selected+'" style="--community-color:'+color+'"');}).join('')+'</div>'+
      '<p id="rm-notice" class="rm-notice" role="status">'+esc(notice)+'</p>'+
      '<div class="rm-toolbar" '+(state.view==='matrix'?'hidden':'')+'><label>布局 <select id="rm-layout" aria-label="超图布局">'+option('force','力导向',state.layout)+option('circle','环形',state.layout)+option('grid','网格',state.layout)+'</select></label>'+
      '<label>画面取样 <select id="rm-sampling">'+option('diverse','归属组合均衡',state.sampling)+option('bridges','跨圈最多',state.sampling)+'</select></label>'+
      '<label class="rm-check"><input id="rm-boundaries" type="checkbox" '+(state.boundaries?'checked':'')+'>包络</label><label class="rm-check"><input id="rm-curves" type="checkbox" '+(state.curves?'checked':'')+'>辅助曲线</label>'+
      button('reset-layout','恢复布局','class="rm-reset"')+button('export','导出 SVG ↗','class="rm-export"')+'</div>'+
      '<div id="rm-chart"></div><div id="rm-legend" class="rm-legend"></div><div id="rm-detail" class="rm-detail" role="status" aria-live="polite"></div>'+
      '<p class="rm-note">圆点为用户，色块为社区超边；辅助曲线表示社区归属，不是真实回复关系。拖动节点只调整位置，缩放请使用图内按钮。</p>'+
      '<p class="rm-note">当前窗口共有 '+fmt(chosen.total)+' 位用户出现在至少两个选中社区；画面最多抽取 48 位，重叠矩阵使用全部 '+fmt(data.userIds.length)+' 位样本。颜色和包络面积不表示社区规模。</p></section>';
    drawChart();bind();
  }
  function svgEl(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
  function centroid(edge){const ns=geometry.nodes.filter(n=>edge.members.includes(n.id));return ns.length?{x:ns.reduce((s,n)=>s+n.x,0)/ns.length,y:ns.reduce((s,n)=>s+n.y,0)/ns.length}:null;}
  function drawChart(){
    const chart=q('#rm-chart');chart.replaceChildren();q('#rm-legend').replaceChildren();
    if(state.view==='matrix'){drawMatrix();showDetail();return;}
    chart.className='rm-canvas';
    const caption=document.createElement('div');caption.className='rm-canvas-caption';caption.textContent=data.periods[state.period].label+' / '+chosen.users.length+' 位展示用户 / '+state.selected.length+' 条社区超边';chart.append(caption);
    const svg=svgEl('svg',{id:'reddit-map-svg',viewBox:'0 0 980 660',role:'group','aria-label':'可拖动的社区超图，使用按钮缩放'});
    svg.append(svgEl('g',{'data-map-viewport':''}));chart.append(svg);
    if(!chosen.users.length){const empty=document.createElement('p');empty.className='rm-empty';empty.textContent='本期所选社区没有共同参与至少两个社区的用户。请切换窗口或社区。';chart.append(empty);}
    const controls=document.createElement('div');controls.className='rm-zoom';controls.innerHTML=button('zoom-out','−','aria-label="缩小超图"')+button('zoom-in','＋','aria-label="放大超图"')+button('fit','适应画面');chart.append(controls);
    q('#rm-legend').innerHTML=geometry.edges.map(e=>button('focus','<i style="background:'+e.color+'"></i>'+esc(data.communities[e.c])+' <small>'+e.members.length+' 人</small>','data-value="'+e.c+'" aria-pressed="'+(state.focus===e.c)+'"')).join('');
    drawArt();bindDrag(svg);showDetail();
  }
  function drawArt(){
    const svg=q('#reddit-map-svg');if(!svg)return;const layer=svg.querySelector('[data-map-viewport]');layer.replaceChildren();
    layer.setAttribute('transform','translate(490 330) scale('+state.zoom+') translate(-490 -330)');
    const defs=svgEl('defs');layer.append(defs);
    for(const edge of geometry.edges){
      const center=centroid(edge);if(!center)continue;
      const active=state.focus===null||state.focus===edge.c,maskId='rm-mask-'+edge.c;
      const mask=svgEl('mask',{id:maskId,maskUnits:'userSpaceOnUse',x:0,y:0,width:980,height:660});mask.append(svgEl('rect',{width:980,height:660,fill:'white'}));
      geometry.nodes.filter(n=>!edge.members.includes(n.id)).forEach(n=>mask.append(svgEl('circle',{cx:n.x,cy:n.y,r:20,fill:'black','data-mask-user':n.id})));defs.append(mask);
      if(state.boundaries){
        const points=H.outline(geometry.nodes,edge.members,29),d=points.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join('')+'Z';
        const path=svgEl('path',{d,fill:edge.color,'fill-opacity':active?(state.focus===edge.c?.13:.045):.012,stroke:edge.color,'stroke-opacity':active?.8:.15,'stroke-width':state.focus===edge.c?2.5:1.5,mask:'url(#'+maskId+')','data-map':'focus','data-value':edge.c,tabindex:0,role:'button','aria-label':data.communities[edge.c]+'，显示 '+edge.members.length+' 位成员'});path.append(svgEl('title',{},data.communities[edge.c]+' · '+fmt(stats().sizes[edge.c])+' 位样本用户'));layer.append(path);
      }
      if(state.curves)for(const n of geometry.nodes.filter(n=>edge.members.includes(n.id))){const mid=(n.x+center.x)/2;layer.append(svgEl('path',{d:'M'+n.x+' '+n.y+' C'+mid+' '+n.y+','+mid+' '+center.y+','+center.x+' '+center.y,fill:'none',stroke:edge.color,'stroke-width':1.2,'stroke-opacity':active?.5:.08,'pointer-events':'none','data-membership':edge.c+':'+n.id}));}
      if(!state.boundaries)layer.append(svgEl('rect',{x:center.x-6,y:center.y-6,width:12,height:12,rx:3,fill:edge.color,'pointer-events':'none'}));
    }
    for(const n of geometry.nodes){
      const active=state.focus===null||n.cs.includes(state.focus),g=svgEl('g',{'data-map-node':n.id,transform:'translate('+n.x+' '+n.y+')',tabindex:0,role:'button','aria-label':n.label+'；'+n.cs.map(c=>data.communities[c]).join('、')+'；可拖动或用方向键移动',opacity:active?1:.18,class:'rm-user'});
      g.append(svgEl('title',{},n.label+' · '+n.cs.map(c=>data.communities[c]).join('、')));
      g.append(svgEl('circle',{r:13,fill:state.user===n.id?'#e4f5f7':'#fff',stroke:state.user===n.id?'#1597a3':'#7e97b4','stroke-width':state.user===n.id?2.5:1.4}));
      g.append(svgEl('text',{y:4,'text-anchor':'middle','font-size':11,'font-family':'Arial, sans-serif',fill:'#36516f','pointer-events':'none'},n.number));layer.append(g);
    }
    // Place community labels near the top of each hull; masks and node highlights
    // encode membership, while labels remain independent of the size of a group.
    const labelBoxes=[];
    geometry.edges.forEach((edge,i)=>{const center=centroid(edge);if(!center)return;const ns=geometry.nodes.filter(n=>edge.members.includes(n.id));
      const name=data.communities[edge.c],width=Math.max(65,name.length*7+18),top=Math.min(...ns.map(n=>n.y))-35,bottom=Math.max(...ns.map(n=>n.y))+35,candidates=[];
      for(const cy of [top,bottom,center.y-45,center.y+45,45,615])for(const dx of [0,-90,90,-180,180,-270,270])candidates.push({x:Math.max(width/2+10,Math.min(970-width/2,center.x+dx)),y:Math.max(40,Math.min(620,cy))});
      const free=p=>!labelBoxes.some(b=>Math.abs(b.x-p.x)<(b.width+width)/2+8&&Math.abs(b.y-p.y)<30)&&!geometry.nodes.some(n=>Math.abs(n.x-p.x)<width/2+n.r+5&&Math.abs(n.y-p.y)<n.r+17);
      const place=candidates.find(free)||{x:70+(i%5)*190,y:40+Math.floor(i/5)*30},x=place.x,y=place.y;labelBoxes.push({x,y,width});
      const g=svgEl('g',{'data-map':'focus','data-value':edge.c,transform:'translate('+x+' '+y+')',tabindex:0,role:'button','aria-label':'高亮 '+name,class:'rm-edge-label'});
      g.append(svgEl('rect',{x:-width/2,y:-11,width,height:22,rx:10,fill:'#fff','fill-opacity':.96,stroke:edge.color,'stroke-width':1}));
      g.append(svgEl('text',{y:4,'text-anchor':'middle','font-size':11,'font-family':'Arial, sans-serif',fill:edge.color},name));layer.append(g);
    });
  }
  function showDetail(){
    const el=q('#rm-detail');if(!el)return;
    if(state.user!==null){const n=geometry.nodes.find(n=>n.id===state.user);if(n){el.textContent=n.number+' · '+n.label+' — 本图归属：'+n.cs.map(c=>data.communities[c]).join('、');el.insertAdjacentHTML('beforeend',button('predict','查看下一期预测 →','class="rm-predict-link"'));return;}}
    if(state.focus!==null){const edge=geometry.edges.find(e=>e.c===state.focus);el.textContent=data.communities[edge.c]+'：当前画面 '+edge.members.length+' 人，本期样本内 '+fmt(stats().sizes[edge.c])+' 人。';return;}
    el.textContent='点击节点或社区标签查看真实归属；拖动节点整理画面。';
  }
  function drawMatrix(){
    const chart=q('#rm-chart'),s=stats();chart.className='rm-matrix-wrap';
    chart.innerHTML='<table class="rm-matrix"><caption>'+esc(data.periods[state.period].label)+' · 全部 '+fmt(data.userIds.length)+' 位样本的社区交并比（Jaccard）</caption><thead><tr><th>社区</th>'+state.selected.map(c=>'<th>'+esc(data.communities[c])+'</th>').join('')+'</tr></thead><tbody>'+state.selected.map(a=>'<tr><th>'+esc(data.communities[a])+'</th>'+state.selected.map(b=>'<td><button data-map="matrix-cell" data-a="'+a+'" data-b="'+b+'" style="background:rgba(40,166,163,'+(.04+s.jacc[a][b]*.32)+')" aria-label="'+esc(data.communities[a]+' 与 '+data.communities[b]+'，共享 '+s.co[a][b]+' 人，交并比 '+pct(s.jacc[a][b]))+'">'+pct(s.jacc[a][b])+'</button></td>').join('')+'</tr>').join('')+'</tbody></table>';
  }
  function bindDrag(svg){
    let drag=null,suppress=false;
    function point(e){const matrix=svg.querySelector('[data-map-viewport]').getScreenCTM();if(!matrix)return null;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(matrix.inverse());}
    svg.addEventListener('pointerdown',e=>{const target=e.target.closest('[data-map-node]');if(!target||e.button!==0||e.isPrimary===false)return;const p=point(e);if(!p)return;const n=geometry.nodes.find(n=>n.id===target.dataset.mapNode);suppress=false;drag={n,id:e.pointerId,dx:n.x-p.x,dy:n.y-p.y,x:e.clientX,y:e.clientY,moved:false};svg.setPointerCapture(e.pointerId);svg.classList.add('is-dragging');e.preventDefault();});
    svg.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<4)return;drag.moved=true;const p=point(e);if(p&&M.move(geometry,drag.n.id,p.x+drag.dx,p.y+drag.dy))drawArt();e.preventDefault();});
    function finish(e){if(!drag||drag.id!==e.pointerId)return;const done=drag;drag=null;suppress=true;svg.classList.remove('is-dragging');if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);state.user=done.n.id;state.focus=null;drawArt();showDetail();svg.querySelector('[data-map-node="'+done.n.id+'"]')?.focus({preventScroll:true});}
    svg.addEventListener('pointerup',finish);svg.addEventListener('pointercancel',finish);svg.addEventListener('lostpointercapture',finish);
    svg.addEventListener('click',e=>{if(suppress&&e.detail!==0){suppress=false;e.preventDefault();e.stopPropagation();}},true);
    svg.addEventListener('keydown',e=>{const target=e.target.closest('[data-map-node]');if(!target)return;const n=geometry.nodes.find(n=>n.id===target.dataset.mapNode);
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const step=e.shiftKey?20:8;M.move(geometry,n.id,n.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),n.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0));drawArt();svg.querySelector('[data-map-node="'+n.id+'"]').focus({preventScroll:true});}
      else if(e.key==='Enter'||e.key===' '){e.preventDefault();state.user=n.id;state.focus=null;drawArt();showDetail();svg.querySelector('[data-map-node="'+n.id+'"]').focus({preventScroll:true});}
    });
    // No wheel, gesture, pinch or multi-touch zoom handlers. Zoom is button-only.
  }
  function exportSvg(){const svg=q('#reddit-map-svg');if(!svg)return;const copy=svg.cloneNode(true);copy.setAttribute('xmlns',NS);copy.setAttribute('width','980');copy.setAttribute('height','660');copy.querySelectorAll('[tabindex]').forEach(n=>n.removeAttribute('tabindex'));const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='reddit-'+data.periods[state.period].label+'-'+state.view+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function bind(){
    host.onclick=e=>{
      const node=e.target.closest('[data-map-node]');if(node){state.user=node.dataset.mapNode;state.focus=null;drawArt();showDetail();return;}
      const b=e.target.closest('[data-map]');if(!b)return;const action=b.dataset.map;
      if(action==='community'){const c=+b.dataset.community;if(state.selected.includes(c)){if(state.selected.length<=2){q('#rm-notice').textContent='请至少保留 2 个社区。';return;}state.selected=state.selected.filter(v=>v!==c);}else{if(state.selected.length>=10){q('#rm-notice').textContent='最多选择 10 个社区，请先取消一个。';return;}state.selected.push(c);}notice='';rebuild();render();}
      if(action==='period'){state.period=+b.dataset.value;rebuild();render();}
      if(action==='view'){state.view=b.dataset.value;if(state.view==='lines'){state.boundaries=false;state.curves=true;}else if(state.view==='hull'){state.boundaries=true;}render();}
      if(action==='focus'){state.focus=state.focus===+b.dataset.value?null:+b.dataset.value;state.user=null;drawArt();q('#rm-legend').querySelectorAll('[data-map=focus]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.value===state.focus)));showDetail();}
      if(action==='matrix-cell'){const s=stats(),a=+b.dataset.a,c=+b.dataset.b;q('#rm-detail').textContent=data.communities[a]+' ↔ '+data.communities[c]+'：共享 '+fmt(s.co[a][c])+' 人 / 并集 '+fmt(s.sizes[a]+s.sizes[c]-s.co[a][c])+' 人 · '+pct(s.jacc[a][c]);}
      if(action==='reset-layout'){geometry=M.layout(chosen.users,state.selected,state.layout);state.zoom=1;drawChart();}
      if(action==='zoom-in'||action==='zoom-out'||action==='fit'){state.zoom=action==='fit'?1:Math.max(.7,Math.min(2.5,state.zoom*(action==='zoom-in'?1.2:1/1.2)));drawArt();}
      if(action==='predict'&&state.user!==null)window.RedditForecast.openUser(data.userIds[+state.user],state.period);
      if(action==='export')exportSvg();
    };
    host.onkeydown=e=>{const b=e.target.closest('[data-map][role=button]');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();b.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:0}));}};
    q('#rm-period').oninput=e=>{state.period=+e.target.value;rebuild();render();q('#rm-period').focus({preventScroll:true});};
    q('#rm-search').oninput=e=>{const value=e.target.value.toLowerCase();host.querySelectorAll('[data-community]').forEach(b=>b.hidden=!data.communities[+b.dataset.community].toLowerCase().includes(value));};
    q('#rm-layout').onchange=e=>{state.layout=e.target.value;geometry=M.layout(chosen.users,state.selected,state.layout);state.zoom=1;drawChart();};
    q('#rm-sampling').onchange=e=>{state.sampling=e.target.value;rebuild();render();};
    for(const [id,key] of [['rm-boundaries','boundaries'],['rm-curves','curves']])q('#'+id).onchange=e=>{state[key]=e.target.checked;if(!state.boundaries&&!state.curves){state[key]=true;e.target.checked=true;q('#rm-notice').textContent='至少保留包络或辅助曲线中的一种。';return;}drawArt();};
  }
  window.RedditMap={mount};
})();
