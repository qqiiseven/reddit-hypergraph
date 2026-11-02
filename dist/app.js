/* Local, dependency-free visualization. All graph and matrix views share model data. */
(() => {
  'use strict';
  const M=window.HyperModel, $=s=>document.querySelector(s);
  const directedInitial=M.directed();
  const state={page:'composition',mode:'undirected',comp:M.composition(),event:M.events(true),selected:'E1',eventSelected:'E4',node:null,includeEvent:true,annotations:true,elastic:true,eventFocus:false,zoom:1,beta:.15,betaB:.15,gamma:.30,directedSelected:'D1',directed:directedInitial.edges,directedNodes:directedInitial.nodes};
  let motion=null;
  function stopMotion(){if(motion){cancelAnimationFrame(motion.frame);motion.svg.dataset.motion='idle';motion=null;}}
  const icons={
    reset:'<path d="M3 9a9 9 0 1 1 1 9M3 3v6h6"/>',
    export:'<path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6"/>',
    graph:'<circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="m10 8-4 8m8-8 4 8M8 19h8"/>',
    events:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18M7 15h3m4 0h3m-10 3h3"/>',
    uses:'<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5m-9 5v10"/>',
    arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>',
    link:'<path d="M14 3h7v7m0-7L11 13M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
    fit:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>'
  };
  const icon=name=>`<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.graph}</svg>`;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
  function announce(msg){$('#selection-live').textContent=msg;}
  const button=(action,text,classes='',extra='')=>`<button class="${classes}" data-action="${action}" ${extra}>${text}</button>`;
  const switchButton=(action,text,on,id='')=>button(action,`<span class="switch-track" aria-hidden="true"></span>${text}`,'switch-button',`aria-pressed="${on}" ${id?`id="${id}"`:''}`);
  const percent=p=>(p*100).toFixed(1).replace(/\.0$/,'')+'%';
  function heading(title,subtitle,section){return `<header class="page-heading"><div><div class="eyebrow">${section}</div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${button('reset',icon('reset')+'重置','btn-icon')}${button('export',icon('export')+'导出图形','btn-icon primary')}</div></header>`;}
  function footer(){return `<footer class="page-footer"><span>HYPERGRAPH LAB <span aria-hidden="true"> / </span> 认识关系的另一种方式</span><span>本地交互 · 无需登录</span></footer>`;}
  function renderNav(){
    if(state.page==='reddit'){
      document.querySelectorAll('[data-main]').forEach(a=>{const active=a.dataset.main==='reddit';a.classList.toggle('active',active);active?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current');});
      $('#subnav').innerHTML='<span class="frontier-nav-caption">Reddit · '+(location.hash==='#reddit-custom'?'自建数据':'真实数据')+'</span>'+[['reddit','圈层地图'],['reddit-predict','下一期预测'],['reddit-cases','预测案例'],['reddit-custom','自建数据预测']].map(([id,label])=>'<a class="sub-link '+(location.hash==='#'+id?'active':'')+'" href="#'+id+'">'+label+'</a>').join('');
      return;
    }
    if(state.page==='frontiers'){
      document.querySelectorAll('[data-main]').forEach(a=>{const active=a.dataset.main==='frontiers';a.classList.toggle('active',active);active?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current');});
      $('#subnav').innerHTML='<span class="frontier-nav-caption">2026 研究精选</span><a class="sub-link" href="#frontiers-images">可视分析</a><a class="sub-link" href="#frontiers-generation">结构生成</a><a class="sub-link" href="#frontiers-evidence">知识推理</a><a class="sub-link" href="#frontiers-vision">视觉表达</a>';
      return;
    }
    const intro=state.page!=='uses';
    document.querySelectorAll('[data-main]').forEach(a=>{const active=a.dataset.main===(intro?'intro':'uses');a.classList.toggle('active',active);active?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current');});
    $('#subnav').innerHTML=intro?`<a class="sub-link ${state.page==='composition'?'active':''}" href="#composition" ${state.page==='composition'?'aria-current="page"':''}>${icon('graph')}超图的组成</a><a class="sub-link ${state.page==='events'?'active':''}" href="#events" ${state.page==='events'?'aria-current="page"':''}>${icon('events')}共同事件</a>`:`<a class="sub-link active" href="#uses" aria-current="page">${icon('uses')}关系如何使用</a><a class="sub-link" href="#reinforcement">${icon('graph')}群体强化示例</a>`;
  }
  function matrixMarkup(data,selected,editable=false){
    const values=M.incidence(data.nodes,data.edges);
    return `<table class="matrix" aria-label="节点与超边的关联矩阵"><thead><tr><th scope="col"><span class="sr-only">节点</span></th>${data.edges.map(e=>`<th scope="col" class="${e.id===selected?'selected':''}" style="color:${e.color}"><button data-action="select-edge" data-edge="${e.id}" title="选择超边 ${e.id}">${e.id}</button></th>`).join('')}</tr></thead><tbody>${data.nodes.map((n,i)=>`<tr class="${state.node===n.id?'node-selected':''}"><th scope="row"><button data-action="select-node" data-node="${n.id}" aria-label="查看节点 ${n.id}">${n.id}</button></th>${data.edges.map((e,j)=>`<td class="${e.id===selected?'selected':''}"><button data-action="${editable?'toggle-member':'select-edge'}" data-edge="${e.id}" data-node="${n.id}" aria-label="${n.id}${values[i][j]?'属于':'不属于'} ${e.id}${editable?'，点击切换成员关系':''}"><span class="matrix-dot" style="${values[i][j]?`background:${e.color}`:''}"></span></button></td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function selectionMarkup(){
    const e=state.comp.edges.find(e=>e.id===state.selected);
    return `<div class="selection-title"><span>当前选择 <span style="color:${e.color}">${e.id} = {${e.members.join(', ')}}</span></span>${state.comp.edges.length>1?button('delete-edge','删除','quiet small','aria-label="删除当前超边"'):''}</div><div class="selection-members">${state.comp.nodes.map(n=>button('toggle-member',n.id,`member-chip ${e.members.includes(n.id)?'on':''}`,`data-edge="${e.id}" data-node="${n.id}" aria-pressed="${e.members.includes(n.id)}" aria-label="${n.id} ${e.members.includes(n.id)?'移出':'加入'} ${e.id}"`)).join('')}</div><p class="selection-hint">点击字母或矩阵圆点，改变成员关系。<br>拖动节点只改变位置，不改变它属于哪些超边。</p>`;
  }
  function graphFrame(id){return `<div class="graph-wrap"><svg id="${id}" class="graph-svg" viewBox="0 0 740 440" aria-label="可交互超图，可选中超边、拖动节点" role="group"></svg><div class="zoom-control" aria-label="缩放控制">${button('zoom-in','+','','aria-label="放大图形"')}${button('zoom-out','−','','aria-label="缩小图形"')}${button('fit',icon('fit'),'','aria-label="恢复图形比例"')}</div></div>`;}
  function legendMarkup(data,selected){return data.edges.map(e=>button('select-edge',`<i style="background:${e.color}"></i>${e.id}`,e.id===selected?'active':'',`data-edge="${e.id}" aria-pressed="${e.id===selected}"`)).join('');}
  function renderComposition(){
    const directed=state.mode==='directed';
    $('#main').innerHTML=heading('超图由什么组成？','节点表示对象，超边表示一组对象之间的关系。','01 / 认识超图')+`
    <div class="intro-grid"><section class="panel graph-panel"><div class="panel-top"><h2>超图视图</h2><div class="segmented" aria-label="超边类型">${button('undirected','无向超边',!directed?'active':'','aria-pressed="'+!directed+'"')}${button('directed','有向超边',directed?'active':'','aria-pressed="'+directed+'"')}</div></div>
    ${directed?'<div id="directed-controls" class="direction-list"></div>':`<div class="legend" id="graph-legend">${legendMarkup(state.comp,state.selected)}</div>`}
    ${graphFrame('main-graph')}
    <div class="graph-footer"><div class="elastic-control">${switchButton('elastic','弹性布局',state.elastic)}<span>拖动时牵动同组成员</span></div><div class="controls">${directed?button('reverse','⇄ 反转当前超边','small'):button('add-node','+ 节点','small')+button('add-edge','+ 超边','small')+button('annotations',state.annotations?'隐藏标签':'显示标签','small')}</div></div></section>
    <section class="panel matrix-panel"><div class="panel-top"><div><h2>关联矩阵</h2><p>${directed?'−1 为输入，+1 为输出；0 为不参与':'行是节点，列是超边'}</p></div><span class="label">H</span></div><div class="matrix-wrap" id="matrix-wrap"></div><p class="matrix-note">${directed?'此处示例的输入与输出集合不重叠。':'颜色表示成员关系，灰色表示不属于。'}</p><div id="selection-box" class="selection-box"></div></section>
    <section class="panel intro-bottom direction-strip"><div class="direction-summary"><h2>关系也可以有方向</h2><a class="link" href="#events">下一步：共同事件 →</a></div><div class="direction-comparison"><div class="direction-item">${simpleGroupSvg()}<div><h3>无向 · 共同参与</h3><p>不区分输入与输出。</p></div></div><div class="direction-item">${directionMini()}<div><h3>有向 · 一组 → 另一组</h3><p>是否要求全部输入，由应用规则决定。</p></div></div></div></section></div>`+footer();
    updateComposition();bindGraph();
  }
  function updateComposition(){
    if(state.mode==='directed'){renderDirected();return;}
    drawGraph($('#main-graph'),state.comp,state.selected,state.annotations);
    $('#matrix-wrap').innerHTML=matrixMarkup(state.comp,state.selected,true);
    $('#selection-box').innerHTML=selectionMarkup();
    $('#graph-legend').innerHTML=legendMarkup(state.comp,state.selected);
  }
  function simpleGroupSvg(){return `<svg viewBox="0 0 220 130" aria-label="无向超边包含 A B C"><path d="M25 79C20 10 197 10 196 77S28 127 25 79Z" fill="#a78bfa18" stroke="#a78bfa"/>${simpleNode('A',65,78)+simpleNode('B',110,52)+simpleNode('C',155,78)}</svg>`;}
  function directionMini(){return `<svg viewBox="0 0 270 130" aria-label="输入 A B 指向输出 C D"><rect x="5" y="36" width="98" height="60" rx="30" fill="#9a78ed18" stroke="#a88ae6"/><rect x="170" y="36" width="98" height="60" rx="30" fill="#04b9c515" stroke="#04b9c5"/><path d="M112 66h43m-9-8 9 8-9 8" fill="none" stroke="#aaa4dc" stroke-width="3"/>${simpleNode('A',32,66,17)+simpleNode('B',77,66,17)+simpleNode('C',196,66,17)+simpleNode('D',241,66,17)}</svg>`;}
  function simpleNode(id,x,y,r=19,active=false){return `<g><circle cx="${x}" cy="${y}" r="${r}" fill="white" stroke="${active?'#04b9c5':'#6f7e96'}" stroke-width="${active?2.5:1.4}"/><text x="${x}" y="${y+5}" text-anchor="middle" fill="#27344c" font-size="${r>21?18:14}" font-weight="550">${id}</text></g>`;}
  function renderDirected(drawOnly=false){
    const edges=state.directed,e=edges.find(e=>e.id===state.directedSelected),svg=$('#main-graph');
    const positions=Object.fromEntries(state.directedNodes.map(n=>[n.id,n]));
    const mean=ids=>({x:ids.reduce((v,id)=>v+positions[id].x,0)/ids.length,y:ids.reduce((v,id)=>v+positions[id].y,0)/ids.length});
    let defs='<defs>',shapes='',branches='';
    for(const d of edges){
      const active=d.id===e.id,tail=mean(d.tail),head=mean(d.head),hub={x:(tail.x+head.x)/2,y:(tail.y+head.y)/2};
      defs+=`<marker id="dir-arrow-${d.id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${d.color}"/></marker>`;
      if(active){for(const [role,ids] of [['tail',d.tail],['head',d.head]]){
        const color=role==='tail'?d.color:'#22a5b2',poly=M.outline(state.directedNodes,ids,36),mask=`dir-${role}`;
        defs+=`<mask id="${mask}" maskUnits="userSpaceOnUse"><rect width="740" height="440" fill="white"/>${state.directedNodes.filter(n=>!ids.includes(n.id)).map(n=>`<circle cx="${n.x}" cy="${n.y}" r="30" fill="black"/>`).join('')}</mask>`;
        shapes+=`<path d="${pathFrom(poly)}" fill="${color}" fill-opacity=".08" stroke="${color}" stroke-opacity=".7" stroke-width="1.3" mask="url(#${mask})"/><text x="${mean(ids).x}" y="${Math.min(...ids.map(id=>positions[id].y))-43}" text-anchor="middle" fill="${color}" font-size="12">${role==='tail'?'输入集合':'输出集合'}</text>`;
      }}
      const opacity=active?1:.35;
      for(const [role,ids] of [['tail',d.tail],['head',d.head]])for(const id of ids){
        const n=positions[id],len=Math.max(1,Math.hypot(n.x-hub.x,n.y-hub.y)),end={x:n.x+(hub.x-n.x)*27/len,y:n.y+(hub.y-n.y)*27/len};
        const from=role==='tail'?end:hub,to=role==='tail'?hub:end,midX=(from.x+to.x)/2;
        branches+=`<path class="directed-branch" data-edge="${d.id}" d="M${from.x} ${from.y}C${midX} ${from.y},${midX} ${to.y},${to.x} ${to.y}" fill="none" stroke="${d.color}" stroke-opacity="${opacity}" stroke-width="${active?2.5:1.3}" ${role==='head'?`marker-end="url(#dir-arrow-${d.id})"`:''}/>`;
      }
      branches+=`<g class="directed-junction" data-directed="${d.id}" tabindex="0" role="button" aria-label="选择有向超边 ${d.id}" transform="translate(${hub.x},${hub.y})"><rect x="-20" y="-12" width="40" height="24" rx="8" fill="white" stroke="${d.color}" stroke-width="${active?1.7:1}"/><text y="4" text-anchor="middle" font-size="12" fill="${d.color}">${d.id}</text></g>`;
    }
    defs+='</defs>';
    const nodes=state.directedNodes.map(n=>{const input=e.tail.includes(n.id),output=e.head.includes(n.id);return `<g class="node directed-node" data-node="${n.id}" transform="translate(${n.x},${n.y})" tabindex="0" role="button" aria-label="节点 ${n.id}${input?'，当前输入':output?'，当前输出':''}"><circle r="24" fill="white" stroke="${input?e.color:output?'#22a5b2':'#a0adbe'}" stroke-width="${input||output?2.5:1.5}"/><text y="7" text-anchor="middle">${n.id}</text></g>`;}).join('');
    svg.innerHTML=defs+`<g transform="translate(370 220) scale(${state.zoom}) translate(-370 -220)">${shapes}${branches}${nodes}<text x="370" y="424" text-anchor="middle" fill="#8c9bb0" font-size="11">同色支路属于一条超边 · D1 / D2 / D3 是关系标记，不是节点</text></g>`;
    if(drawOnly)return;
    $('#directed-controls').innerHTML=edges.map(d=>button('select-directed',`${d.id} · ${d.tail.length} 输入 → ${d.head.length} 输出`,d.id===e.id?'active':'',`data-edge="${d.id}"`)).join('')+'<span class="directed-count">8 节点 · 3 条超边</span>';
    $('#matrix-wrap').innerHTML=`<table class="matrix" aria-label="有向超边关联矩阵"><thead><tr><th>节点</th>${edges.map(d=>`<th class="${d.id===e.id?'selected':''}"><button data-action="select-directed" data-edge="${d.id}">${d.id}</button></th>`).join('')}</tr></thead><tbody>${state.directedNodes.map(n=>`<tr class="${state.node===n.id?'node-selected':''}"><th scope="row">${n.id}</th>${edges.map(d=>`<td class="${d.id===e.id?'selected':''}"><span class="matrix-symbol" style="color:${d.tail.includes(n.id)?d.color:d.head.includes(n.id)?'#16a0ab':'#bbc4d2'}">${d.tail.includes(n.id)?'−1':d.head.includes(n.id)?'+1':'0'}</span></td>`).join('')}</tr>`).join('')}</tbody></table>`;
    $('#selection-box').innerHTML=`<div class="selection-title">${e.id} = {${e.tail.join(', ')}} → {${e.head.join(', ')}}</div><div class="directed-members"><span>输入</span>${e.tail.map(id=>`<b style="--member-color:${e.color}">${id}</b>`).join('')}</div><div class="directed-members"><span>输出</span>${e.head.map(id=>`<b style="--member-color:#22a5b2">${id}</b>`).join('')}</div><p class="selection-hint">选中不同超边，查看共享节点如何从上一条关系的输出，成为另一条关系的输入。反转会同步更新箭头和矩阵。</p>`;
  }
  function pathFrom(poly){return poly.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')+'Z';}
  function drawGraph(svg,data,selected,annotations=false){
    if(!svg)return;const prefix=svg.id,chosen=data.edges.find(e=>e.id===selected);
    let defs='<defs>',regions='';
    const sorted=data.edges.slice().sort((a,b)=>(a.id===selected?1:0)-(b.id===selected?1:0));
    for(const e of sorted){
      const isEvent=prefix==='event-graph',baseRadius=isEvent&&e.id==='E4'?30:43;
      const padding=motion?.svg===svg?(motion.engine.radii.get(e.id)?.value||0):0;
      const maskId=`${prefix}-${e.id}-mask`,poly=M.outline(data.nodes,e.members,Math.max(31,baseRadius+padding));
      defs+=`<mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="740" height="440"><rect width="740" height="440" fill="white"/>${data.nodes.filter(n=>!e.members.includes(n.id)).map(n=>`<circle cx="${n.x}" cy="${n.y}" r="30" fill="black"/>`).join('')}</mask>`;
      const pts=data.nodes.filter(n=>e.members.includes(n.id));
      const lx=pts.reduce((a,n)=>a+n.x,0)/pts.length,ly=isEvent&&e.id==='E3'?Math.min(420,Math.max(...pts.map(n=>n.y))+48):Math.max(26,Math.min(...pts.map(n=>n.y))-48);
      const focused=isEvent&&state.eventFocus&&e.id!==selected,fill=focused?'.018':e.id===selected?(isEvent&&e.id==='E4'?'.10':'.15'):'.055';
      regions+=`<path class="edge-region" data-edge="${e.id}" d="${pathFrom(poly)}" mask="url(#${maskId})" fill="${e.color}" fill-opacity="${fill}" stroke="${e.color}" stroke-opacity="${focused?'.2':e.id===selected?'1':'.65'}" stroke-width="${isEvent&&e.id==='E4'?'2.5':e.id===selected?'1.8':'1.2'}" ${isEvent&&e.id==='E4'?'stroke-dasharray="6 3"':''} role="button" tabindex="0" aria-label="超边 ${e.id}，成员 ${e.members.join('、')}" aria-pressed="${e.id===selected}"/><g class="graph-tag" transform="translate(${lx},${ly})"><rect x="-21" y="-13" width="42" height="26" rx="10" fill="white" fill-opacity=".92" stroke="${e.color}" stroke-opacity=".4"/><text y="5" text-anchor="middle" fill="${e.color}">${e.id}</text></g>`;
    }
    defs+='</defs>';
    const nodes=data.nodes.map(n=>{const active=chosen?.members.includes(n.id);return `<g class="node" data-node="${n.id}" transform="translate(${n.x},${n.y})" tabindex="0" role="button" aria-label="节点 ${n.id}，属于 ${data.edges.filter(e=>e.members.includes(n.id)).map(e=>e.id).join('、')||'无超边'}；方向键移动"><circle r="${state.node===n.id?27:24}" fill="white" stroke="${active?'#07b7c3':'#71819a'}" stroke-width="${active?'3':'1.5'}"/><text y="7" text-anchor="middle">${n.id}</text></g>`;}).join('');
    const transform=`translate(370 220) scale(${state.zoom}) translate(-370 -220)`;
    const a=data.nodes[0],b=data.nodes.find(n=>n.id==='B'&&data.edges.filter(e=>e.members.includes(n.id)).length>1)||data.nodes.find(n=>data.edges.filter(e=>e.members.includes(n.id)).length>1);
    const edgePoint=chosen?M.outline(data.nodes,chosen.members,43).reduce((a,b)=>a[1]<b[1]?a:b):[350,45];
    const annotation=annotations&&a?`<g class="annotation" pointer-events="none"><rect x="25" y="13" width="120" height="27" rx="7" fill="white"/><text x="36" y="31">节点：一个对象</text><path d="M135 39L${a.x-24} ${a.y-12}"/><circle cx="${a.x-24}" cy="${a.y-12}" r="2.5" fill="#7a9fc4"/><rect x="390" y="8" width="185" height="27" rx="7" fill="white"/><text x="400" y="26">超边：一组对象的关系</text><path d="M414 37L${edgePoint[0]} ${edgePoint[1]}"/>${b?`<rect x="520" y="77" width="200" height="27" rx="7" fill="white"/><text x="530" y="95">共同成员：属于多条超边</text><path d="M546 108L${b.x+25} ${b.y-10}"/>`:''}</g>`:'';
    svg.innerHTML=defs+`<g transform="${transform}">${regions}${nodes}${annotation}</g>`;
  }
  function renderEvents(){
    $('#main').innerHTML=heading('为什么保留群体关系？','从完整事件，到两两连接。看清一条新超边带来了什么。','01 / 认识超图 · 共同事件')+`
    <div class="events-grid"><section class="panel graph-panel events-graph"><div class="panel-top"><h2>超图视图</h2>${switchButton('event-focus','聚焦所选',state.eventFocus,'event-focus')}</div><div id="event-legend" class="legend"></div><div class="events-action">${switchButton('event-toggle','记录共同事件 E4',state.includeEvent,'event-toggle')}<span id="event-status"></span></div>${graphFrame('event-graph')}<div class="graph-footer"><div class="elastic-control">${switchButton('elastic','弹性布局',state.elastic)}</div><span id="event-selected-members"></span></div></section>
    <div class="events-side"><section class="panel projection-panel"><div class="panel-top"><h2>普通图对照</h2><span class="label">选择节点，突出邻接</span></div><div class="projection-wrap"><svg id="projection" class="projection-svg" viewBox="0 0 440 290" role="group" aria-label="由超边生成的普通图投影，可选择节点查看邻接"></svg></div><p class="projection-note"><span id="projection-note"></span><span class="stat-inline" id="pair-count"></span></p></section><section class="panel matrix-panel"><div class="panel-top"><h2>关联矩阵</h2><span class="label">成员 × 事件</span></div><div class="matrix-wrap" id="event-matrix"></div></section></div></div>
    <section class="panel minimal-panel"><div class="minimal-top"><div><h2>最小例子：三次两人活动，和一次三人活动</h2><p>两个独立情境，不是同一事件的时间先后。</p></div><span class="badge">相同投影 ≠ 相同事件</span></div><div class="minimal-grid"><div class="minimal-case"><h3>情况一 · 分别两人参加</h3>${minimalSvg(false)}<p class="minimal-conclusion">三人从未一起参加</p></div><div class="equal-sign">=</div><div class="minimal-case"><h3>情况二 · 三人一起参加</h3>${minimalSvg(true)}<p class="minimal-conclusion">三人共同参加过一次</p></div></div><p class="minimal-caption">只保留两两连接，得到相同的普通图；事件节点或完整事件记录也能保留这些信息。</p></section>`+footer();
    updateEvents();bindGraph();
  }
  function updateEvents(){
    const d=state.event;
    if(!d.edges.some(e=>e.id===state.eventSelected))state.eventSelected='E1';
    drawGraph($('#event-graph'),d,state.eventSelected);
    $('#event-legend').innerHTML=legendMarkup(d,state.eventSelected);
    $('#event-matrix').innerHTML=matrixMarkup(d,state.eventSelected,false);
    $('#event-status').textContent=state.includeEvent?'新增一次 A、B、C 共同参与的活动':'暂不记录 A、B、C 的共同活动';
    $('#event-selected-members').textContent=`${state.eventSelected} = {${d.edges.find(e=>e.id===state.eventSelected).members.join(', ')}}`;
    $('#projection-note').textContent=state.includeEvent?'加入 E4，两两连接没有增加':'E1–E3 已经包含 A–B、B–C、A–C';
    $('#pair-count').textContent=`${d.nodes.length} 节点 · ${M.project(d.edges).length} 连线`;
    const positions=M.projectionLayout();
    const projection=M.project(d.edges),selected=d.edges.find(e=>e.id===state.eventSelected);
    $('#projection').innerHTML=projection.map(([a,b])=>{const emphasized=state.node?[a,b].includes(state.node):selected.members.includes(a)&&selected.members.includes(b);return `<path class="projection-link" data-pair="${a}|${b}" d="M${positions[a]}L${positions[b]}" fill="none" stroke="${emphasized?selected.color:'#a9b5c8'}" stroke-opacity="${emphasized?'.95':state.node?'.25':'.6'}" stroke-width="${emphasized?'2':'1.15'}"/>`;}).join('')+Object.entries(positions).map(([id,[x,y]])=>`<g data-projection-node="${id}" class="projection-node" tabindex="0" role="button" aria-label="查看 ${id} 的邻接">${simpleNode(id,x,y,16,state.node===id||(!state.node&&selected.members.includes(id)))}</g>`).join('');
  }
  function minimalSvg(together){
    const pair=(a,b,x,color)=>`<rect x="${x}" y="4" width="100" height="46" rx="23" fill="${color}15" stroke="${color}" stroke-opacity=".7"/>${simpleNode(a,x+28,27,14)+simpleNode(b,x+72,27,14)}`;
    const top=together?`<path d="M145 13C165-5 219-3 237 19S268 61 211 61S110 45 145 13Z" fill="#04b9c515" stroke="#04b9c5"/>${simpleNode('A',190,16,13)+simpleNode('B',154,43,13)+simpleNode('C',224,43,13)}`:pair('A','B',15,'#4389ff')+pair('B','C',140,'#ff965d')+pair('A','C',265,'#64b85a');
    return `<svg viewBox="0 0 380 170" role="img" aria-label="${together?'一次三人活动':'三次两人活动'}投影为三角形">${top}<path d="M190 70v20m-4-5 4 5 4-5" fill="none" stroke="#a0b2cb"/><text x="210" y="84" font-size="10" fill="#94a3b7">只保留两两连接</text><path d="M190 109L153 151H227Z" stroke="#94a5bd" fill="none"/>${simpleNode('A',190,109,14)+simpleNode('B',153,151,14)+simpleNode('C',227,151,14)}</svg>`;
  }
  function applicationSvg(type){
    if(type==='rag'){
      const nodes=[{id:'人物',x:127,y:48},{id:'地点',x:127,y:113},{id:'时间',x:211,y:48},{id:'行动',x:211,y:113}];
      return `<svg viewBox="0 0 340 165" aria-label="同一事实的四个角色全部包含在紫色超边内"><g fill="none" stroke="#9ab6db"><rect x="8" y="49" width="42" height="61" rx="5"/><path d="M17 64h24m-24 10h24m-24 10h16M60 79h22m-6-5 6 5-6 5"/></g><path class="fact-hull" d="${pathFrom(M.outline(nodes,nodes.map(n=>n.id),33))}" fill="#a78bfa14" stroke="#b7a1eb" stroke-width="1.3"/>${nodes.map(n=>simpleNode(n.id,n.x,n.y,23)).join('')}<path d="M255 79h24m-6-5 6 5-6 5" fill="none" stroke="#9ab6db"/><rect x="294" y="58" width="31" height="43" rx="3" fill="#f3f6fb" stroke="#a7b9d2"/><path d="M301 69h16m-16 7h16m-16 7h10" stroke="#a7b9d2"/></svg>`;
    }
    if(type==='spread')return ruleSvg(true,'app-spread',false);
    const example=M.partitionExample();
    function frame(assignment,x,caption,cost){
      const lists=[0,1].map(part=>Object.keys(assignment).filter(id=>assignment[id]===part).sort());
      const nodes=lists.flatMap((ids,part)=>ids.map((id,i)=>({id,x:45+part*78,y:67+i*37})));
      return `<g transform="translate(${x},0)"><text x="84" y="15" text-anchor="middle" fill="#697d99" font-size="12">${caption}</text><rect x="18" y="40" width="55" height="124" rx="10" fill="#f0f5fa"/><rect x="96" y="40" width="55" height="124" rx="10" fill="#f0f5fa"/><text x="45" y="34" text-anchor="middle" fill="#8a9db5" font-size="10">分区 1</text><text x="123" y="34" text-anchor="middle" fill="#8a9db5" font-size="10">分区 2</text>${example.edges.map(e=>`<path d="${pathFrom(M.outline(nodes,e.members,19))}" fill="${e.color}" fill-opacity=".10" stroke="${e.color}" stroke-opacity=".85"/>`).join('')}${nodes.map(n=>simpleNode(n.id,n.x,n.y,12)).join('')}<text x="84" y="184" text-anchor="middle" fill="${cost?'#b37a53':'#399f92'}" font-size="12">跨区超边 ${cost} 条</text></g>`;
    }
    return `<svg class="partition-comparison" viewBox="0 0 360 195" role="img" aria-label="六个节点划分为两个等容量分区；调整划分后跨区超边从两条降为零">${frame(example.before,0,'初始划分',example.beforeCost)}<path d="M172 99h15m-5-5 5 5-5 5" fill="none" stroke="#9eafc5" stroke-width="1.5"/>${frame(example.after,191,'改进划分',example.afterCost)}</svg>`;
  }
  function ruleSvg(groupChannel,id,labels=true){
    const triggered=groupChannel&&state.gamma>0,a=percent(state.beta),b=percent(state.betaB),gamma=percent(state.gamma);
    const nodes=[{id:'A',x:90,y:60},{id:'B',x:270,y:60},{id:'C',x:180,y:173}];
    const arrow=(d,p)=>`<path d="${d}" stroke="${p>0?'#04b9c5':'#c7d0df'}" stroke-width="1.8" ${p>0?`marker-end="url(#${id}-teal)"`:'stroke-dasharray="4 4"'}/>`;
    return `<svg viewBox="0 0 360 220" role="img" aria-label="A、B 已支持，C 尚未支持；A 对 C 影响 ${a}，B 对 C 影响 ${b}；群体影响 ${groupChannel?gamma:'0%'}"><defs><marker id="${id}-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#04b9c5"/></marker><marker id="${id}-purple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#9873de"/></marker></defs><path d="${pathFrom(M.outline(nodes,['A','B','C'],35))}" fill="#a78bfa13" stroke="#b9a1e9" stroke-width="1.2"/>${arrow('M106 80L160 149',state.beta)}${arrow('M254 80L200 149',state.betaB)}${triggered?`<path d="M115 60Q180 60 180 108M245 60Q180 60 180 108" fill="none" stroke="#a285dd" stroke-width="3.2"/><path d="M180 107v37" stroke="#9873de" stroke-width="3.2" marker-end="url(#${id}-purple)"/>`:''}${simpleNode('A',90,60,24,true)+simpleNode('B',270,60,24,true)+simpleNode('C',180,173,24)}${labels?`<text x="90" y="18" text-anchor="middle" fill="#70929d" font-size="11">已支持</text><text x="270" y="18" text-anchor="middle" fill="#70929d" font-size="11">已支持</text><g class="influence-label"><rect x="32" y="105" width="101" height="24" rx="6" fill="white"/><text x="82" y="121" text-anchor="middle" fill="${state.beta>0?'#279ca8':'#a4afbe'}" font-size="12">A → C　${a}</text><rect x="227" y="105" width="101" height="24" rx="6" fill="white"/><text x="277" y="121" text-anchor="middle" fill="${state.betaB>0?'#279ca8':'#a4afbe'}" font-size="12">B → C　${b}</text></g>${triggered?`<rect x="142" y="108" width="76" height="21" rx="6" fill="#f2edff"/><text x="180" y="122" text-anchor="middle" fill="#8b65c7" font-size="10">共同影响 ${gamma}</text>`:''}<text x="180" y="216" text-anchor="middle" fill="#94a1b4" font-size="10">C 尚未支持</text>`:''}</svg>`;
  }
  function renderUses(){
    $('#main').innerHTML=heading('记录群体关系之后，可以做什么？','超边记录关系；检索方法、传播规则与优化目标决定怎样使用它。','02 / 超图作用')+`
    <section class="panel uses-panel" id="applications"><h2>同一种关系结构，不同的使用方式</h2><p class="uses-intro">保留“哪些对象共同属于一条关系”，是下面三种用途的共同起点。</p><div class="use-columns">
    <article class="use-item"><span class="number">01 / RETRIEVE</span><h3>保留完整事实</h3><p>谁在何时何地做了什么？<br>把相关实体与原文证据一起找回来。</p>${applicationSvg('rag')}<div class="use-link-row"><span class="project-name">HyperGraphRAG</span>${button('project-rag','了解用途 ↗','quiet small')}</div></article>
    <article class="use-item"><span class="number">02 / MODEL</span><h3>计算联合影响</h3><p>成员如何共同影响结果？<br>由模型定义群体作用的触发方式。</p>${applicationSvg('spread')}<div class="use-link-row"><span class="project-name">simplagion</span><a class="link" href="#reinforcement">查看下方示例 ↓</a></div></article>
    <article class="use-item"><span class="number">03 / OPTIMIZE</span><h3>平衡超图划分</h3><p>在分区容量约束下，最小化跨区关系成本。<br>示例：6 个节点，2 个分区，每区 3 个。</p>${applicationSvg('partition')}<div class="partition-key"><span><i style="background:#9a78ed"></i>超边 ABC</span><span><i style="background:#04b9c5"></i>超边 DEF</span></div><div class="use-link-row"><span class="project-name">Mt-KaHyPar</span>${button('project-partition','论文与目标 ↗','quiet small')}</div></article></div><div class="use-common">${icon('info')} 超边本身不自带“强化”或“传播”，这些来自应用采用的规则。</div></section>
    <section class="panel reinforcement-panel" id="reinforcement"><div class="section-line"><div><h2>以群体传播为例：什么是「强化」？</h2><p>固定同一个三人组 {A, B, C}，A、B 已支持，C 尚未支持。</p></div><span class="badge">一种模型规则</span></div>
    <div class="rule-columns"><div class="rule-column"><h3>仅个人影响</h3><div id="baseline-rule"></div><div class="probability" id="baseline-prob"></div><p class="rule-caption" id="baseline-caption"></p></div><div class="rule-column"><h3>个人影响 + 群体通道</h3><div id="group-rule"></div><div class="probability purple" id="group-prob"></div><p class="rule-caption" id="group-caption"></p></div><div class="rule-column rule-detail"><h3>调整影响概率</h3><p class="parameter-intro">固定成员状态，只改变影响强弱。<br>参数为 0 时，对应渠道不提供影响。</p><label class="range-row"><span>A → C 影响</span><input id="beta-input" type="range" min="0" max="50" step="1" value="${state.beta*100}" aria-label="A 对 C 的单步影响概率"><output id="beta-output"></output></label><label class="range-row"><span>B → C 影响</span><input id="beta-b-input" type="range" min="0" max="50" step="1" value="${state.betaB*100}" aria-label="B 对 C 的单步影响概率"><output id="beta-b-output"></output></label><label class="range-row"><span>群体影响 γ</span><input id="gamma-input" type="range" min="0" max="80" step="1" value="${state.gamma*100}" aria-label="群体影响概率"><output id="gamma-output"></output></label><div id="conditions" aria-live="polite"></div></div></div>
    <p class="model-note">独立影响渠道的概率不能直接相加：A、B 各影响 15% 时，合并为 27.8%，不是 30%。本例固定 A、B 已支持；B → C 为 0 只表示没有个人影响，不会取消共同影响。</p><div class="formula"><span>示例参数可调整，不是实测概率，也不是论文实验结果。</span><code id="probability-formula"></code></div><div class="source-line"><span>群体机制参考 Iacopini 等 (2019)，Fig. 1；A、B 独立参数为教学扩展。完整模型还含恢复过程。</span><span><a href="https://arxiv.org/html/1810.07031v5" target="_blank" rel="noopener noreferrer">阅读论文 ↗</a> · <a href="https://github.com/iaciac/simplagion" target="_blank" rel="noopener noreferrer">开源代码 ↗</a></span></div></section>`+footer();
    updateRules();
  }
  function updateRules(){
    const baseline=M.influenceProbability(state.beta,state.betaB,0,true,false);
    const group=M.influenceProbability(state.beta,state.betaB,state.gamma,true,true);
    $('#baseline-rule').innerHTML=ruleSvg(false,'baseline');
    $('#group-rule').innerHTML=ruleSvg(true,'group');
    $('#baseline-prob').innerHTML=`${percent(baseline)}<small>C 单步接受概率</small>`;
    $('#group-prob').innerHTML=`${percent(group)}<small>C 单步接受概率</small>`;
    $('#baseline-caption').textContent=`A 的影响 ${percent(state.beta)}；B 的影响 ${percent(state.betaB)}。按独立渠道合并。`;
    $('#group-caption').textContent=state.gamma===0?'γ = 0：没有额外群体影响，超边仍在。':'同组 A、B 都已支持，通过超边共同作用于 C。';
    $('#conditions').innerHTML=`<div class="condition-result ${state.gamma===0?'off':''}">${state.gamma===0?'γ = 0 · 与仅个人影响的结果一致':`群体通道使接受概率增加 ${((group-baseline)*100).toFixed(1)} 个百分点`}</div>`;
    $('#beta-output').textContent=percent(state.beta);$('#beta-b-output').textContent=percent(state.betaB);$('#gamma-output').textContent=percent(state.gamma);
    $('#probability-formula').textContent='p = 1 − (1 − βA) × (1 − βB) × (1 − γ)';
  }
  function render(){stopMotion();renderNav();if(state.page==='reddit')window.RedditDemo.render($('#main'),{openDialog});else if(state.page==='frontiers')window.HyperFrontiers.render($('#main'),{openDialog});else if(state.page==='composition')renderComposition();else if(state.page==='events')renderEvents();else renderUses();}
  function route(){
    const hash=location.hash.slice(1),next=['reddit','reddit-predict','reddit-custom','reddit-cases','reddit-results'].includes(hash)?'reddit':/^frontiers(?:-(?:images|generation|evidence|vision))?$/.test(hash)?'frontiers':hash==='events'?'events':['uses','reinforcement'].includes(hash)?'uses':'composition';
    if(state.page!==next){state.node=null;state.zoom=1;}state.page=next;render();
    if(hash==='reinforcement'||hash==='reddit-results'||hash.startsWith('frontiers-'))requestAnimationFrame(()=>document.getElementById(hash)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));else window.scrollTo(0,0);
  }
  function activeData(){return state.page==='events'?state.event:state.mode==='directed'?{nodes:state.directedNodes,edges:state.directed.map(e=>({...e,members:[...e.tail,...e.head]}))}:state.comp;}
  function selectEdge(id){if(state.page==='events'){state.eventSelected=id;updateEvents();}else{state.selected=id;updateComposition();}const e=activeData().edges.find(e=>e.id===id);announce(`已选择 ${id}，成员 ${e.members.join('、')}`);}
  function selectNode(id){state.node=id;state.page==='events'?updateEvents():updateComposition();const es=activeData().edges.filter(e=>e.members.includes(id));toast(`${id} 属于 ${es.map(e=>e.id).join('、')||'无超边'}`);}
  function toggleMember(edgeId,nodeId){const e=state.comp.edges.find(e=>e.id===edgeId);if(e.members.includes(nodeId)){if(e.members.length===1){toast('至少保留一个成员。');return;}e.members=e.members.filter(x=>x!==nodeId);}else e.members.push(nodeId);e.members.sort();state.selected=edgeId;updateComposition();announce(`${edgeId} 的成员已更新为 ${e.members.join('、')}`);}
  function drawActive(svg){
    if(state.page==='composition'&&state.mode==='directed')renderDirected(true);
    else drawGraph(svg,activeData(),state.page==='events'?state.eventSelected:state.selected,state.page==='composition'&&state.annotations);
  }
  function animateMotion(svg,engine){
    stopMotion();motion={svg,engine,frame:0,last:performance.now()};svg.dataset.motion='running';
    const current=motion;
    function tick(time){
      if(motion!==current||!svg.isConnected){if(motion===current)stopMotion();return;}
      const alive=engine.step((time-current.last)/16.667);current.last=time;drawActive(svg);
      if(alive){current.frame=requestAnimationFrame(tick);}else{stopMotion();drawActive(svg);}
    }
    current.frame=requestAnimationFrame(tick);
  }
  function bindGraph(){
    const svg=$('#main-graph')||$('#event-graph');if(!svg)return;svg.dataset.motion='idle';
    let drag=null;
    function point(event){const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const local=p.matrixTransform(svg.getScreenCTM().inverse());return {x:(local.x-370)/state.zoom+370,y:(local.y-220)/state.zoom+220};}
    svg.addEventListener('pointerdown',e=>{
      const g=e.target.closest('[data-node]');if(!g||e.button!==0)return;
      stopMotion();const node=activeData().nodes.find(n=>n.id===g.dataset.node),p=point(e);
      const elastic=state.elastic&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
      drag={node,startX:e.clientX,startY:e.clientY,dx:node.x-p.x,dy:node.y-p.y,moved:false,elastic,engine:null};
      svg.setPointerCapture(e.pointerId);e.preventDefault();
    });
    svg.addEventListener('pointermove',e=>{
      if(!drag)return;const p=point(e);
      if(Math.abs(e.clientX-drag.startX)+Math.abs(e.clientY-drag.startY)>4)drag.moved=true;if(!drag.moved)return;
      const x=Math.min(690,Math.max(50,p.x+drag.dx)),y=Math.min(385,Math.max(55,p.y+drag.dy));
      if(drag.elastic){
        if(!drag.engine){drag.engine=new M.SpringLayout(activeData());drag.engine.pin(drag.node.id,x,y);animateMotion(svg,drag.engine);}else drag.engine.move(x,y);
      }else{
        if(activeData().nodes.some(n=>n!==drag.node&&Math.hypot(n.x-x,n.y-y)<57))return;
        drag.node.x=x;drag.node.y=y;drawActive(svg);
      }
    });
    function stop(e){
      if(!drag)return;const {node,moved,engine}=drag;drag=null;
      if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);
      if(!moved)selectNode(node.id);
      else{if(engine){engine.step(1);engine.release();}else drawActive(svg);announce(`节点 ${node.id} 位置已更新，成员关系不变`);}
    }
    svg.addEventListener('pointerup',stop);svg.addEventListener('pointercancel',stop);
    function choose(e){const edge=e.target.closest('.edge-region'),junction=e.target.closest('[data-directed]');if(edge){stopMotion();state.node=null;selectEdge(edge.dataset.edge);}else if(junction){stopMotion();state.directedSelected=junction.dataset.directed;renderDirected();}}
    svg.addEventListener('click',choose);
    svg.addEventListener('keydown',e=>{
      const node=e.target.closest('.node'),edge=e.target.closest('.edge-region'),junction=e.target.closest('[data-directed]');
      if((e.key==='Enter'||e.key===' ')&&(node||edge||junction)){e.preventDefault();stopMotion();if(node)selectNode(node.dataset.node);else choose(e);}
      else if(node&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
        e.preventDefault();stopMotion();const n=activeData().nodes.find(n=>n.id===node.dataset.node);
        const x=Math.max(50,Math.min(690,n.x+(e.key==='ArrowRight'?8:e.key==='ArrowLeft'?-8:0))),y=Math.max(55,Math.min(385,n.y+(e.key==='ArrowDown'?8:e.key==='ArrowUp'?-8:0)));
        if(!activeData().nodes.some(other=>other!==n&&Math.hypot(other.x-x,other.y-y)<57)){n.x=x;n.y=y;}
        drawActive(svg);svg.querySelector(`[data-node="${n.id}"]`)?.focus();
      }
    });
  }
  function openDialog(title,body,actions=''){const dialog=$('#dialog');$('#dialog-content').innerHTML=`<div class="dialog-header"><h2>${title}</h2>${button('close-dialog','×','round','aria-label="关闭窗口"')}</div><div class="dialog-body">${body}</div><div class="dialog-actions">${actions||button('close-dialog','知道了','primary')}</div>`;dialog.showModal();}
  function addEdgeDialog(){openDialog('创建一条超边','<p>选择共同参与这条关系的节点。至少选择一个成员。</p><div class="member-options">'+state.comp.nodes.map(n=>`<label class="member-option"><input name="new-member" type="checkbox" value="${n.id}">${n.id}</label>`).join('')+'</div><p class="form-error" id="edge-error"></p>',button('close-dialog','取消')+button('confirm-edge','创建超边','primary'));}
  function projectDialog(type){
    if(type==='rag')openDialog('知识检索 · 保留完整事实',`${applicationSvg('rag')}<p>例如一条教学事实：“小林于周五在实验室演示了项目”。用带角色与原文证据的关系，关联人物、时间、地点和活动。</p><h3>从输入到结果</h3><p>原始文本 → 提取实体与多元事实 → 按问题检索相关事实和原文 → 形成有依据的回答。</p><p>超边保留参与同一事实的实体组合；实体的角色、事实描述与证据还需要属性记录。丰富的事件节点或知识图谱表示也能保留这些信息。</p><div class="source-list"><a class="link" href="https://github.com/LHRLAB/HyperGraphRAG" target="_blank" rel="noopener noreferrer">项目源码 ↗</a><a class="link" href="https://proceedings.neurips.cc/paper_files/paper/2025/hash/df55ee6e59f8ac4a625219e11fe9ddba-Abstract-Conference.html" target="_blank" rel="noopener noreferrer">论文 ↗</a></div><p class="muted"><small>本页是用途介绍，未接入大模型或检索服务。</small></p>`);
    else openDialog('平衡超图划分 · 论文与优化目标',`<p class="paper-reference"><strong>Scalable High-Quality Hypergraph Partitioning</strong><br>Gottesbüren 等 · ACM Transactions on Algorithms, 2024</p><h3>原论文研究什么？</h3><p>将节点划分到 k 个互不重叠、容量受限的分区中，最小化定义在超边上的成本。应用包括分布式数据放置、并行科学计算和 VLSI 电路设计。</p><h3>按整条超边计算成本</h3><p>Connectivity 目标：Σ ω(e) × (λ(e) − 1)。ω(e) 是超边权重，λ(e) 是它跨越的分区数量；同一区内计 0，跨两个分区计 ω(e)。Cut-net 则只统计跨区超边的总权重。</p>${applicationSvg('partition')}<p>本图使用单位权重、两个等容量分区：ABC、DEF 是两条超边。两种目标在此例都从 2 降为 0；若分区超过两个，两者可能不同。这是预设的教学对照，不是算法运行结果，也不是论文实验图。</p><h3>原论文如何求解与展示？</h3><p>Fig. 1 展示多层次流程：粗化 → 初始划分 → 逐层还原与优化。Fig. 2 比较算法的解质量与运行时间。Mt-KaHyPar 的研究重点是并行算法如何兼顾速度与划分质量。</p><div class="source-list"><a class="link" href="https://arxiv.org/pdf/2303.17679#page=2" target="_blank" rel="noopener noreferrer">原论文 · Fig. 1 / 2 ↗</a><a class="link" href="https://doi.org/10.1145/3626527" target="_blank" rel="noopener noreferrer">2024 期刊版 ↗</a><a class="link" href="https://github.com/kahypar/mt-kahypar" target="_blank" rel="noopener noreferrer">项目与目标定义 ↗</a></div>`);
  }
  function exportSvg(){
    const svg=state.page==='uses'?$('#group-rule svg'):state.page==='events'?$('#event-graph'):$('#main-graph');
    const clone=svg.cloneNode(true);clone.setAttribute('xmlns','http://www.w3.org/2000/svg');const viewBox=svg.viewBox.baseVal;clone.setAttribute('width',String(viewBox.width*2));clone.setAttribute('height',String(viewBox.height*2));clone.style.fontFamily='Arial, Microsoft YaHei, sans-serif';
    const style=document.createElementNS('http://www.w3.org/2000/svg','style');style.textContent='.node text{font-size:20px;font-weight:600;fill:#1f2b40}.graph-tag{font-size:14px;font-weight:600}.annotation text{font-size:12px;fill:#597695}.annotation path{fill:none;stroke:#7a9fc4;stroke-width:1.2}';clone.prepend(style);
    const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`hypergraph-${state.page}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('已导出当前图形为 SVG。');
  }
  document.addEventListener('click',event=>{
    const projectionNode=event.target.closest('[data-projection-node]');if(projectionNode){state.node=state.node===projectionNode.dataset.projectionNode?null:projectionNode.dataset.projectionNode;updateEvents();return;}
    const b=event.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;stopMotion();
    if(action==='reset'){
      if(state.page==='composition'){state.comp=M.composition();state.selected='E1';const directed=M.directed();state.directed=directed.edges;state.directedNodes=directed.nodes;state.directedSelected='D1';state.annotations=true;}
      else if(state.page==='events'){state.event=M.events(true);state.includeEvent=true;state.eventSelected='E4';}
      else{state.beta=.15;state.betaB=.15;state.gamma=.30;}
      state.node=null;state.zoom=1;render();toast('当前页面已恢复默认设置。');
    }else if(action==='export')exportSvg();
    else if(action==='undirected'||action==='directed'){state.mode=action;state.node=null;state.zoom=1;renderComposition();}
    else if(action==='select-edge')selectEdge(b.dataset.edge);
    else if(action==='select-node')selectNode(b.dataset.node);
    else if(action==='toggle-member')toggleMember(b.dataset.edge,b.dataset.node);
    else if(action==='elastic'){state.elastic=!state.elastic;b.setAttribute('aria-pressed',state.elastic);drawActive($('#main-graph')||$('#event-graph'));}
    else if(action==='event-focus'){state.eventFocus=!state.eventFocus;b.setAttribute('aria-pressed',state.eventFocus);updateEvents();}
    else if(action==='annotations'){state.annotations=!state.annotations;renderComposition();}
    else if(action==='select-directed'){state.directedSelected=b.dataset.edge;renderDirected();}
    else if(action==='reverse'){const e=state.directed.find(e=>e.id===state.directedSelected);[e.tail,e.head]=[e.head,e.tail];renderDirected();announce('输入输出已反转');}
    else if(action==='add-node'){if(state.comp.nodes.length>=12)return toast('这个教学画布最多支持 12 个节点。');const id='ABCDEFGHIJKL'.split('').find(id=>!state.comp.nodes.some(n=>n.id===id));const [x,y]=[650,90,370].flatMap(x=>[80,165,250,335].map(y=>[x,y])).find(([x,y])=>state.comp.nodes.every(n=>Math.hypot(n.x-x,n.y-y)>=62))||[650,80];state.comp.nodes.push({id,x,y});state.node=id;updateComposition();toast(`已添加 ${id}，点击右侧成员按钮把它加入超边。`);}
    else if(action==='add-edge'){if(state.comp.edges.length>=6)return toast('这个教学画布最多支持 6 条超边。');addEdgeDialog();}
    else if(action==='confirm-edge'){const members=[...document.querySelectorAll('[name=new-member]:checked')].map(c=>c.value);if(!members.length){$('#edge-error').textContent='请至少选择一个节点。';return;}let i=1;while(state.comp.edges.some(e=>e.id==='E'+i))i++;const e={id:'E'+i,members,color:M.palette[(i-1)%M.palette.length]};state.comp.edges.push(e);state.selected=e.id;$('#dialog').close();updateComposition();toast(`已创建 ${e.id}`);}
    else if(action==='delete-edge'){if(state.comp.edges.length<=1)return;state.comp.edges=state.comp.edges.filter(e=>e.id!==state.selected);state.selected=state.comp.edges[0].id;updateComposition();toast('当前超边已删除；节点保留。');}
    else if(action==='event-toggle'){state.includeEvent=!state.includeEvent;const existing=state.event.nodes;state.event=M.events(state.includeEvent);state.event.nodes=existing;state.eventSelected=state.includeEvent?'E4':'E1';b.setAttribute('aria-pressed',state.includeEvent);updateEvents();announce(`E4 ${state.includeEvent?'已加入':'已移除'}，两两投影仍为 ${M.project(state.event.edges).length} 条连线`);}
    else if(action==='zoom-in'||action==='zoom-out'||action==='fit'){state.zoom=action==='fit'?1:Math.max(.65,Math.min(1.6,state.zoom+(action==='zoom-in'?.1:-.1)));state.page==='events'?updateEvents():updateComposition();}
    else if(action==='project-rag')projectDialog('rag');
    else if(action==='project-partition')projectDialog('partition');
    else if(action==='close-dialog')$('#dialog').close();
  });
  document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-projection-node]')){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
  document.addEventListener('input',event=>{if(event.target.id==='beta-input'){state.beta=Number(event.target.value)/100;updateRules();}else if(event.target.id==='beta-b-input'){state.betaB=Number(event.target.value)/100;updateRules();}else if(event.target.id==='gamma-input'){state.gamma=Number(event.target.value)/100;updateRules();}});
  $('#help-button').addEventListener('click',()=>openDialog('从这里开始探索','<ul><li><strong>组成：</strong>点击超边或矩阵表头联动选择，拖动节点调整位置；点击矩阵圆点修改成员。节点也支持方向键移动。</li><li><strong>有向超边：</strong>切换有向模式，反转输入输出，观察矩阵符号。</li><li><strong>共同事件：</strong>加入或移除 E4，看事件记录改变，而两两投影保持不变。</li><li><strong>超图作用：</strong>查看三类应用，调整 A → C、B → C 与群体影响参数，比较单步接受概率。</li></ul><p>这是本地教学网页。修改只保留在当前打开的页面中，刷新会恢复初始设置。导出按钮保存当前主图的 SVG 文件。</p>'));
  $('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
  window.addEventListener('hashchange',route);
  route();
})();
