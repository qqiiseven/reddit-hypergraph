/* Reddit section: a guided view of pinned, real held-out predictions. */
(() => {
  'use strict';
  const D=window.RedditDemoData;
  const methods={hgnnp:{name:'群体 + 个人',short:'HGNN+',detail:'结合个人历史，通过「用户 → 社区群体 → 用户」汇总信息，再给候选社区排序。'},mlp:{name:'只看个人',short:'MLP',detail:'使用相同的个人历史特征，但没有超图聚合；用它检查群体信息是否带来额外帮助。'},overlap:{name:'社区重叠',short:'重叠基线',detail:'根据历史社区的用户重叠程度排序；不训练神经网络。'},popular:{name:'热门社区',short:'热门基线',detail:'按近期社区的总体参与规模推荐；不利用用户之间的群体关系。'}};
  const topics={gaming:'游戏讨论',pcmasterrace:'PC 玩家',Steam:'游戏平台',hardware:'电脑硬件',techsupport:'技术求助',Minecraft:'我的世界',pcgaming:'PC 游戏',buildapc:'组装电脑',movies:'电影',science:'科学',explainlikeimfive:'通俗问答',LifeProTips:'生活经验',Games:'游戏资讯',personalfinance:'个人理财',technology:'科技',Music:'音乐',television:'电视',books:'阅读'};
  const s={caseId:D.cases[0].id,method:'hgnnp',candidate:D.cases[0].rankings.hgnnp[0].community,phase:0,group:null,person:null};
  let main,dialog;
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const name=c=>D.communities[c];
  const pct=x=>(x*100).toFixed(2)+'%';
  const current=()=>D.cases.find(c=>c.id===s.caseId);
  const button=(a,label,attrs='')=>`<button type="button" data-reddit="${a}" ${attrs}>${label}</button>`;
  const link=(url,label)=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  const layouts=new Map(),G=window.RedditGraphModel;
  function layout(){const c=current();if(!layouts.has(c.id))layouts.set(c.id,G.create(c));return layouts.get(c.id);}
  const pathFrom=points=>points.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')+'Z';
  function labelPosition(data,edge){const ns=data.nodes.filter(n=>edge.members.includes(n.id));return {x:ns.reduce((sum,n)=>sum+n.x,0)/ns.length,y:Math.max(18,Math.min(...ns.map(n=>n.y))-42)};}
  function graph(){
    const c=current(),data=layout();
    const masks=data.edges.map((edge,i)=>`<mask id="reddit-mask-${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="${data.width}" height="${data.height}"><rect width="${data.width}" height="${data.height}" fill="white"/>${data.nodes.filter(n=>!edge.members.includes(n.id)).map(n=>`<circle data-mask-node="${n.id}" cx="${n.x}" cy="${n.y}" r="${n.r+9}" fill="black"/>`).join('')}</mask>`).join('');
    const regions=data.edges.map((edge,i)=>{const g=c.groups[i],focus=s.group===i||s.phase===2;return `<path class="r-region edge-region" data-reddit="group" data-group="${i}" data-edge="${edge.id}" d="${pathFrom(G.outline(data,edge))}" mask="url(#reddit-mask-${i})" fill="${g.color}" fill-opacity="${focus?.17:.07}" stroke="${g.color}" stroke-width="${focus?2.5:1.3}" stroke-opacity="${s.group===null||s.group===i?1:.25}" tabindex="0" role="button" aria-pressed="${s.group===i}" aria-label="${edge.id} · r/${esc(g.name)}，${g.size.toLocaleString()} 位用户 · P08"><title>${edge.id} · r/${esc(g.name)} · ${g.size.toLocaleString()} 位用户 · P08</title></path>`;}).join('');
    const labels=data.edges.map((edge,i)=>{const p=labelPosition(data,edge),g=c.groups[i];return `<g class="r-group-caption" data-label-edge="${i}" transform="translate(${p.x},${p.y})"><rect x="-20" y="-12" width="40" height="24" rx="9" fill="white" fill-opacity=".94" stroke="${g.color}" stroke-opacity=".5"/><text y="4" text-anchor="middle" style="fill:${g.color}" class="r-edge-name">${edge.id}</text></g>`;}).join('');
    const nodes=data.nodes.map(n=>{
      const target=n.id==='target',p=target?null:c.peers.find(p=>p.label===n.id),signal=p?.communities.includes(s.candidate),active=target||s.group===null||data.edges[s.group].members.includes(n.id),selected=s.person===n.id;
      const membership=data.edges.filter(e=>e.members.includes(n.id)).map(e=>e.id).join('、');
      return `<g class="${target?'r-target':'r-person'} r-drag-node" data-node="${n.id}" data-reddit="person" data-person="${n.id}" transform="translate(${n.x},${n.y})" tabindex="0" role="button" opacity="${active?1:.22}" aria-label="${target?'观察用户':p.label+'，'+p.userId}；属于 ${membership}；可拖动或用方向键移动"><title>${target?c.userId:p.userId} · ${membership}\n拖动只改变位置，不改变社区归属</title>${target&&s.phase===3?'<circle r="34" fill="#25b6bd12" stroke="#21a7ae" stroke-dasharray="4 4"/>':''}${signal?'<circle r="20" fill="none" stroke="#d58a4b" stroke-width="2.2"/>':''}<circle class="r-node-disc" r="${n.r}" fill="${target?'#21344f':s.phase===1?'#e0edff':'white'}" stroke="${selected?'#1a537b':'#879cb8'}" stroke-width="${selected?2.7:1.2}"/><text y="4" text-anchor="middle">${target?'User '+String(D.cases.indexOf(c)+1).padStart(2,'0'):p.label}</text></g>`;
    }).join('');
    return `<svg id="reddit-graph" class="r-graph r-hull-graph" viewBox="0 0 ${data.width} ${data.height}" role="group" aria-label="可拖动的 Reddit 无向超图，轮廓随成员移动"><defs>${masks}</defs>${regions}${labels}${nodes}</svg>`;
  }
  function redrawGeometry(svg,data){
    for(const n of data.nodes){
      svg.querySelector(`[data-node="${n.id}"]`).setAttribute('transform',`translate(${n.x},${n.y})`);
      for(const hole of svg.querySelectorAll(`[data-mask-node="${n.id}"]`)){hole.setAttribute('cx',n.x);hole.setAttribute('cy',n.y);}
    }
    data.edges.forEach((edge,i)=>{svg.querySelector(`[data-edge="${edge.id}"]`).setAttribute('d',pathFrom(G.outline(data,edge)));const p=labelPosition(data,edge);svg.querySelector(`[data-label-edge="${i}"]`).setAttribute('transform',`translate(${p.x},${p.y})`);});
  }
  function bindGraph(){
    const svg=main.querySelector('#reddit-graph');if(!svg)return;
    const data=layout();let drag=null,suppressClick=false;
    function point(e){const matrix=svg.getScreenCTM();if(!matrix)return null;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(matrix.inverse());}
    svg.addEventListener('pointerdown',e=>{
      const target=e.target.closest('[data-node]');if(!target||e.button!==0||e.isPrimary===false)return;
      const p=point(e);if(!p)return;const node=data.nodes.find(n=>n.id===target.dataset.node);
      suppressClick=false;drag={node,id:e.pointerId,dx:node.x-p.x,dy:node.y-p.y,startX:e.clientX,startY:e.clientY,moved:false};
      svg.setPointerCapture(e.pointerId);svg.classList.add('is-dragging');e.preventDefault();
    });
    svg.addEventListener('pointermove',e=>{
      if(!drag||drag.id!==e.pointerId)return;
      if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<4)return;
      drag.moved=true;const p=point(e);if(p&&G.move(data,drag.node.id,p.x+drag.dx,p.y+drag.dy))redrawGeometry(svg,data);
      e.preventDefault();
    });
    function finish(e){
      if(!drag||drag.id!==e.pointerId)return;const ended=drag;drag=null;
      svg.classList.remove('is-dragging');if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);
      suppressClick=ended.moved;
      if(ended.moved){svg.querySelector(`[data-node="${ended.node.id}"]`)?.focus({preventScroll:true});main.querySelector('#reddit-selection').textContent='位置已更新，真实社区归属保持不变。';}
      else if(e.type==='pointerup'){s.person=ended.node.id;update('graph');}
    }
    svg.addEventListener('pointerup',finish);svg.addEventListener('pointercancel',finish);svg.addEventListener('lostpointercapture',finish);
    svg.addEventListener('click',e=>{if(suppressClick&&e.detail!==0){suppressClick=false;e.preventDefault();e.stopPropagation();}},true);
    svg.addEventListener('keydown',e=>{
      const target=e.target.closest('[data-node]');if(!target||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
      e.preventDefault();const n=data.nodes.find(n=>n.id===target.dataset.node),step=e.shiftKey?20:8;
      if(G.move(data,n.id,n.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),n.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)))redrawGeometry(svg,data);
    });
  }

  function localDetail(){const c=current();if(s.person==='target')return `当前用户在 P08 共出现在 ${c.current.length} 个社区中；不代表同一时刻参与。`;if(s.person){const p=c.peers.find(p=>p.label===s.person);return `${p.label} · ${p.userId} · ${p.communities.includes(s.candidate)?'也出现在':'未出现于'} r/${name(s.candidate)}（P08）。`;}
    if(s.group!==null){const g=c.groups[s.group];return `E${s.group+1} = P08 的 r/${g.name} 参与用户，共 ${g.size.toLocaleString()} 人；图中只画部分成员。`;}
    return `P08 全部 ${c.current.length} 个社区已展示 · ${c.peers.length+1} 位用户节点为讲解子集 · 人数按 8,000 位样本统计。`;
  }
  function graphPanel(){const c=current();const phaseText=['超边保留“谁在同一窗口参与同一社区”，一个用户可属于多个群体。','① 从用户的历史特征出发。同群成员提供的信息不必完全相同。','② 在每条社区超边内部汇总成员信息，群体规模用于均值归一化。','③ 将群体信息汇总回用户，再结合其个人历史形成推荐排序。'];
    return `<div class="r-panel-heading"><div><span class="r-kicker">01 / 看群体</span><h2>他和哪些人处在同一群体？</h2></div>${button('history','个人历史 ↗','class="r-text-button"')}</div>
    <div class="r-group-key">${c.groups.map((g,i)=>button('group',`<i style="background:${g.color}"></i><span>E${i+1} · r/${esc(g.name)}<small>${g.size.toLocaleString()} 位用户 · P08</small></span>`,`data-group="${i}" aria-pressed="${s.group===i}"`)).join('')}</div>
    <div class="r-layout-tools"><p class="r-view-note">拖动节点，轮廓随成员移动；社区归属保持不变。也可选中节点后使用方向键。</p>${button('reset-layout','恢复布局','class="r-text-button"')}</div><div class="r-graph-scroll">${graph()}</div><div class="r-graph-key"><span><i class="r-key-target"></i>观察用户</span><span><i></i>同群用户</span><span><i class="r-key-signal"></i>也参与当前候选社区</span></div><p id="reddit-selection" class="r-local-detail" aria-live="polite">${localDetail()}</p>
    <div class="r-aggregation"><div class="r-aggregation-title"><strong>HGNN+ 的一次信息汇总</strong><span>点选步骤看示意</span></div><div class="r-steps">${[['个人历史','1'],['群体内汇总','2'],['汇总回用户','3']].map(([text,n])=>button('phase',`<b>${n}</b>${text}`,`data-phase="${n}" aria-pressed="${s.phase===+n}"`)).join('<span aria-hidden="true">→</span>')}</div><p aria-live="polite">${phaseText[s.phase]}</p></div>`;
  }
  function clue(){const c=current(),v=c.clues[s.candidate];return `<div class="r-clue"><div><span class="r-kicker">候选社区的历史线索</span><strong>r/${esc(name(s.candidate))}</strong></div><p>这 ${c.groups.length} 个群体的 <b>${v.total.toLocaleString()}</b> 位其他用户中，<b>${v.joint.toLocaleString()}</b> 位也出现在该社区。</p><div class="r-clue-strips">${v.byGroup.map((g,i)=>`<div><span>E${i+1}</span><div><i style="width:${g.members?g.joint/g.members*100:0}%;background:${c.groups[i].color}"></i></div><span>${g.joint} / ${g.members}</span></div>`).join('')}</div><small>P08 的真实共现；分母排除观察用户，各组可能重叠。这是结构线索，不是模型分数的归因。</small></div>`;}
  function predictionPanel(){const c=current(),ranks=c.rankings[s.method];const hits=ranks.filter(r=>c.truth.includes(r.community)).length;
    return `<div class="r-panel-heading"><div><span class="r-kicker">02 / 看推荐</span><h2>下一期可能出现在哪里？</h2></div><span class="r-period-pill">P09</span></div><div class="r-methods" role="group" aria-label="选择推荐方法">${Object.entries(methods).map(([id,m])=>button('method',`${m.name}<small>${m.short}</small>`,`data-method="${id}" aria-pressed="${s.method===id}"`)).join('')}</div><p class="r-method-explain">${methods[s.method].detail}</p><div class="r-rank-title"><span>此前未出现的社区 · Top 5</span><span>点击查看左侧线索</span></div><ol class="r-rankings">${ranks.map(r=>`<li>${button('candidate',`<b class="r-rank-number">${r.rank}</b><span class="r-community">r/${esc(name(r.community))}<small>${topics[name(r.community)]||'兴趣社区'}</small></span><span class="r-outcome ${c.truth.includes(r.community)?'hit':'miss'}">${c.truth.includes(r.community)?'✓ 命中':'未观察到'}</span>`,`data-candidate="${r.community}" aria-pressed="${s.candidate===r.community}"`)}</li>`).join('')}</ol>${clue()}<div class="r-reveal"><div id="reddit-truth" aria-live="polite"><div class="r-truth-heading"><strong>下一期新出现 ${c.truth.length} 个社区</strong><span>Top 5 命中 ${hits} 个</span></div><div class="r-truth-tags">${c.truth.map(id=>`<span class="${ranks.some(r=>r.community===id)?'hit':''}">r/${esc(name(id))}</span>`).join('')}</div><p>${!c.truth.length?'该用户下一期没有新社区记录，不纳入条件 Recall@5 评估。':hits?'本例中，推荐列表覆盖了部分或全部真实新记录。':'这次没有命中：群体关系能提供线索，但不能决定用户下一期的行为。'}</p><p class="r-case-compare">${c.truth.length?`本例前 5 项命中：HGNN+ ${c.rankings.hgnnp.filter(r=>c.truth.includes(r.community)).length} / ${c.truth.length}；MLP ${c.rankings.mlp.filter(r=>c.truth.includes(r.community)).length} / ${c.truth.length}`:'无新记录，本例不评分。'}</p></div></div><p class="r-ranking-note">读取原项目已训练结果。排序不是概率；“新出现”只相对于此前观察窗口，不代表首次加入。</p>`;
  }
  function results(){const delta=(D.metrics.hgnnp.recall5-D.metrics.mlp.recall5)*100;return `<div class="r-results-title"><div><span class="r-kicker">03 / 看整体</span><h2>放回全部测试样本，还有效吗？</h2><p>平均找回下一期新社区的比例（Recall@5）· 3 个测试窗口 · ${D.metrics.hgnnp.user_periods.toLocaleString()} 个用户–窗口样本</p></div>${button('evaluation','评估口径 ↗','class="r-text-button"')}</div><div class="r-evaluation"><div class="r-metric-bars">${['popular','overlap','mlp','hgnnp'].map(id=>`<div class="r-metric-row ${id==='hgnnp'?'featured':''}"><span>${methods[id].name}<small>${methods[id].short}</small></span><div class="r-metric-track"><i style="width:${D.metrics[id].recall5*100}%"></i></div><b>${pct(D.metrics[id].recall5)}</b></div>`).join('')}<div class="r-axis"><span>0%</span><span>50%</span><span>100%</span></div></div><div class="r-takeaway"><strong>相比只看个人历史<br>提高 <em>${delta.toFixed(2)}</em> 个百分点</strong><p>本次运行的提升很小。群体信息提供了额外线索，但不能据此宣称超图总是更好。</p><small>单次训练 · seed ${D.seed} · 非显著性结论</small></div></div><div class="r-period-results"><table><caption>不同测试窗口，提升并不一致 · Recall@5</caption><thead><tr><th>预测窗口</th><th>只看个人 MLP</th><th>HGNN+</th><th>差值（百分点）</th></tr></thead><tbody>${D.periodMetrics.map(p=>`<tr><th>P${String(p.cutoff+1).padStart(2,'0')} → P${String(p.target+1).padStart(2,'0')}</th><td>${pct(p.mlp.recall5)}</td><td>${pct(p.hgnnp.recall5)}</td><td>${p.hgnnp.recall5>=p.mlp.recall5?'+':''}${((p.hgnnp.recall5-p.mlp.recall5)*100).toFixed(2)}</td></tr>`).join('')}</tbody></table><details><summary>为什么没有明显超过个人模型？</summary><p>代码事实：两种模型都使用个人的社区历史、参与频率、近期活动和回复度数等特征；HGNN+ 额外在社区内做两层均值汇总。用户样本按早期活跃度选取，个人历史已经较丰富。</p><p>可能原因：群体汇总和个人历史信息重叠，大社区平均也可能削弱个体差异。这些是待验证的解释，现有单次运行不能确定各自贡献，更不能把 0.22 个百分点称为稳定优势。</p></details></div>`;}
  function update(area,focus){const node=main.querySelector(`[data-reddit-area="${area}"]`);if(!node)return;node.innerHTML=area==='graph'?graphPanel():predictionPanel();if(area==='graph')bindGraph();if(focus)Array.from(node.querySelectorAll('[data-reddit]')).find(e=>Object.entries(focus).every(([k,v])=>e.dataset[k]===v))?.focus({preventScroll:true});}
  function history(){const c=current();dialog('这个用户的已知历史',`<p><strong>${esc(c.userId)}</strong> · 截止 P08，在 ${c.seen.length} 个选定社区留下过观察记录。</p><div class="r-history-wrap"><table class="r-history"><thead><tr><th>社区</th>${D.periods.slice(0,8).map(p=>`<th>${p.label}</th>`).join('')}</tr></thead><tbody>${c.seen.map(id=>`<tr><th>r/${esc(name(id))}</th>${c.history.map(cs=>`<td>${cs.includes(id)?'<span aria-label="有观察记录">●</span>':'<span class="r-empty" aria-label="无观察记录">·</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p>推荐候选会排除这 ${c.seen.length} 个已观察到的社区。每个窗口为 4 周，“出现”指在该社区回复网络中有参与记录；不等于关注、注册、加入或离开社区。</p>`);}
  function evaluation(){dialog('如何理解这次实验',`<h3>真实数据与原项目</h3><p>${link(D.provenance.repository,'组员的 Reddit 项目')} · ${link(D.provenance.source,'Stanford SNAP 数据说明')}</p><p>当前使用 44 个选定社区、8,000 位样本用户、11 个四周窗口。模型训练来自固定版本 <code>${D.provenance.commit.slice(0,12)}</code>，导出时间 ${D.provenance.exportedAt.slice(0,10)}。</p><h3>时间如何划分？</h3><p>P01–P06 用于确定样本；训练采用 P03→P04 至 P06→P07 的历史快照；P07→P08 用于验证选模型；P08→P09、P09→P10、P10→P11 用于测试。模型权重在测试时冻结，历史快照随窗口前进。</p><h3>这些数字说明什么？</h3><p>Recall@5：对每个确实有新社区记录的已知用户，取推荐前 5 项，计算找回真实新社区的比例，再对测试用户–窗口取平均。6,160 是样本次数，不是去重人数。不包含没有新记录的用户，也不是预测用户是否会迁移。指标已根据原始预测导出重新核算。</p><h3>超图在这里起什么作用？</h3><p>节点是用户，每个“社区 × 时间窗口”是一条超边。HGNN+ 使用截止时点的全部社区–窗口超边，把用户历史特征先在群体内平均，再汇总回用户，保留群体身份和参与归属。MLP 用相同的个人特征，但不进行这一步聚合。</p><p>本模型的均值聚合也可以写成加权图运算。因此这不是“普通图做不到”的证明；可视化帮助我们明确群体如何构建、信息如何汇总，再检查预测是否有用。</p><h3>演示与结果的边界</h3><p>本页特意选取 3 个 HGNN+ 前 5 项命中、MLP 前 5 项未命中的真实案例，并非随机样本，不能代表整体优劣。三位用户在 P08 分别有 3、4、4 个社区，左图均以交叠轮廓显示完整归属及抽样同群用户；原模型使用 P01–P08 的完整历史超图。橙圈仅表示历史共现，不是因果解释或模型归因。现有结果为单个随机种子，没有显著性检验。本次网页没有重新训练模型。</p>`);}
  function render(container,helpers){main=container;dialog=helpers.openDialog;
    const isMap=location.hash==='#reddit',isForecast=location.hash==='#reddit-predict';
    const tabs='<nav class="r-section-tabs" aria-label="Reddit 探索视图"><a href="#reddit" '+(isMap?'aria-current="page"':'')+'>圈层地图</a><a href="#reddit-predict" '+(isForecast?'aria-current="page"':'')+'>下一期预测</a><a href="#reddit-cases" '+(!isMap&&!isForecast?'aria-current="page"':'')+'>预测案例</a></nav>';
    if(isMap){main.innerHTML='<div class="reddit-page"><header class="page-heading r-page-heading"><div><div class="eyebrow">07 / REDDIT · SOCIAL EXPLORATION</div><h1>圈子如何被同一批人连接？</h1><p>从真实社区归属出发，探索重叠群体与跨圈参与。</p></div></header>'+tabs+'<div id="reddit-map-root"></div></div>';window.RedditMap.mount(main.querySelector('#reddit-map-root'));return;}
    if(isForecast){main.innerHTML='<div class="reddit-page"><header class="page-heading r-page-heading"><div><div class="eyebrow">07 / REDDIT · NEXT PERIOD</div><h1>下一期，会出现在哪个社区？</h1><p>选择用户与历史窗口，比较已有模型推荐，再揭晓真实记录。</p></div></header>'+tabs+'<div id="reddit-forecast-root"></div></div>';window.RedditForecast.mount(main.querySelector('#reddit-forecast-root'));return;}
    const c=current();main.innerHTML=`<div class="reddit-page"><header class="page-heading r-page-heading"><div><div class="eyebrow">07 / REDDIT · SOCIAL EXPLORATION</div><h1>下一期，他会出现在哪个社区？</h1><p>从真实社区关系出发，观察群体信息如何参与推荐，再用下一期记录检验。</p></div><div class="heading-actions">${button('reset','重置','class="small"')}${button('evaluation','数据与方法 ↗','class="primary"')}</div></header>${tabs}
    <section class="r-context" aria-label="选择观察对象"><div class="r-user-choice"><label for="reddit-user">观察用户</label><select id="reddit-user">${D.cases.map(c=>`<option value="${c.id}" ${c.id===s.caseId?'selected':''}>${c.label}</option>`).join('')}</select><small>${c.userId} · P08: ${c.current.length} communities</small></div><div class="r-time-context"><span><small>已知历史</small><strong>P01—P08</strong></span><i aria-hidden="true">→</i><span class="future"><small>预测下一期</small><strong>P09</strong></span><div>2014.09.08—10.05<small>只推荐此前未观察到的社区</small></div></div><span class="r-real-badge"><i></i>真实数据 · 已保存预测</span></section>
    <p class="r-view-note">P = Period（时间窗口），每期 4 周（28 天）。P01—P08 是第 1—8 期的已知历史，P09 是要预测的第 9 期。当前展示已保存的真实案例与预测结果，聚合步骤用于解释机制；本页不实时训练模型或模拟用户行为。三个案例经过挑选，整体表现请查看下方全部测试样本。此处保留原版预测批次；“下一期预测”使用另一份本机完整导出，两批结果分别评估。</p><div class="r-workspace"><section class="panel r-graph-panel" data-reddit-area="graph">${graphPanel()}</section><section class="panel r-prediction-panel" data-reddit-area="prediction">${predictionPanel()}</section></div><section class="panel r-results" id="reddit-results">${results()}</section><footer class="r-footer"><span>来源：${link(D.provenance.repository,'qqiiseven / reddit-hypergraph')} · 44 社区 / 8,000 用户</span><span>reddit-v5-20261102 · 3 个对照案例 · 全部指标来自原项目导出</span></footer></div>`;bindGraph();}
  document.addEventListener('change',e=>{if(e.target.id!=='reddit-user')return;s.caseId=e.target.value;s.phase=0;s.group=null;s.person=null;s.candidate=current().rankings[s.method][0].community;render(main,{openDialog:dialog});main.querySelector('#reddit-user').focus({preventScroll:true});});
  function handle(e){const b=e.target.closest('[data-reddit]');if(!b)return;const a=b.dataset.reddit,focus=e.detail===0?{...b.dataset}:null;
    if(a==='history')return history();if(a==='evaluation')return evaluation();
    if(a==='reset-layout'){layouts.delete(current().id);update('graph');return;}
    if(a==='reset'){layouts.clear();Object.assign(s,{caseId:D.cases[0].id,method:'hgnnp',candidate:D.cases[0].rankings.hgnnp[0].community,phase:0,group:null,person:null});render(main,{openDialog:dialog});return;}
    if(a==='method'){s.method=b.dataset.method;s.candidate=current().rankings[s.method][0].community;s.person=null;update('prediction',focus);update('graph');}
    if(a==='candidate'){s.candidate=+b.dataset.candidate;s.person=null;update('prediction',focus);update('graph');}
    if(a==='phase'){s.phase=+b.dataset.phase;s.group=null;s.person=null;update('graph',focus);}
    if(a==='group'){s.group=s.group===+b.dataset.group?null:+b.dataset.group;s.phase=0;s.person=null;update('graph',focus);}
    if(a==='person'){s.person=b.dataset.person;update('graph',focus);}
  }
  document.addEventListener('click',handle);
  document.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('[data-reddit][role=button]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:0}));}});
  window.RedditDemo={render};
})();
