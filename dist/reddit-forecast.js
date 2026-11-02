/* Explore complete, previously trained predictions. Never infer new results in UI. */
(()=>{
  'use strict';
  const M=window.RedditForecastModel,methods=M.methods;
  const state={user:0,cutoff:7,method:'hgnnp',filter:'all',revealed:false};
  let host,network,predictions,loading,pending,graphCandidate=null,notice='';
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>n.toLocaleString('zh-CN'),pct=n=>(n*100).toFixed(2)+'%';
  const q=s=>host.querySelector(s);
  const button=(a,text,attrs='')=>'<button type="button" data-forecast="'+a+'" '+attrs+'>'+text+'</button>';
  function applyPending(){
    const windows=Object.keys(predictions.periods).map(Number).sort((a,b)=>a-b);
    if(pending){const user=network.userIds.indexOf(pending.userId);state.cutoff=windows.reduce((a,b)=>Math.abs(b-pending.cutoff)<Math.abs(a-pending.cutoff)?b:a,windows[0]);notice=state.cutoff!==pending.cutoff?'已有预测仅覆盖 P07–P10 截止窗口，已切换到 '+network.periods[state.cutoff].label+'。':'';if(user>=0)state.user=user;else notice='这位用户不在当前预测批次中，暂时显示原来的用户。'+notice;pending=null;}
    else if(!predictions.periods[state.cutoff])state.cutoff=windows[0];
    state.revealed=false;
  }
  function accept(p){predictions=M.validate(network,p);state.user=M.initialUser(network,predictions.periods[7]?7:+Object.keys(predictions.periods)[0]);applyPending();}
  function missing(message){
    host.innerHTML='<section class="panel rf-card"><h2>下一期预测</h2><p class="rm-note">'+esc(message)+'</p><label class="rm-import">载入预测结果 <input id="rf-import" type="file" accept=".json,application/json"></label><p class="rm-note">选择本机导出的 reddit-predictions.json；需要配套的社区数据。已有三个预测案例仍可从上方标签查看。</p></section>';
    q('#rf-import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(!network)throw Error('请先准备本机的 reddit-network.json 社区数据。');if(file.size>30*1024*1024)throw Error('请选择小于 30 MB 的预测文件。');accept(JSON.parse(await file.text()));notice='已载入本地预测结果。';render();}catch(error){missing(error.message);}};
  }
  async function mount(container){
    host=container;
    if(predictions){if(pending)applyPending();render();return;}
    missing('正在读取完整预测结果…');
    if(!loading)loading=(async()=>{
      const r=await fetch('reddit-network.json',{cache:'no-cache'});if(!r.ok)throw Error('未找到本地社区数据。');network=window.RedditMapModel.validate(await r.json());
      const p=await fetch('reddit-predictions.json',{cache:'no-cache'});if(!p.ok)throw Error('尚未准备完整预测文件。');accept(await p.json());
    })().catch(e=>{notice=e.message;});
    await loading;if(!host?.isConnected)return;if(predictions)render();else missing(notice);
  }
  function tags(ids){return ids.map(c=>'<span>'+esc(network.communities[c])+'</span>').join('')||'<span class="rf-empty-tag">没有观察记录</span>';}
  function render(){
    if(!host?.isConnected)return;
    const t=state.cutoff,u=state.user,r=M.record(network,predictions,u,t,state.method),from=network.periods[t],to=network.periods[t+1],validation=t===predictions.metrics.config.validation_cutoff;
    host.innerHTML='<section class="panel rf-card"><div class="rf-toolbar"><label for="rf-user">匿名用户</label><input id="rf-user" type="search" list="rf-users" value="'+esc(network.userIds[u])+'" aria-label="输入匿名用户 ID"><datalist id="rf-users"></datalist>'+button('find','查看')+button('random','随机换一位 ↗')+
      '<label>随机取样 <select id="rf-filter">'+[['all','所有用户'],['new','事后筛选：有新增'],['hit','事后筛选：Top 5 命中'],['miss','事后筛选：Top 5 未命中']].map(([v,label])=>'<option value="'+v+'" '+(state.filter===v?'selected':'')+'>'+label+'</option>').join('')+'</select></label></div>'+
      '<p id="rf-notice" class="rm-notice" role="status">'+esc(notice)+'</p><div class="rf-flow"><div><small>只使用截至 '+esc(from.end)+' 的历史</small><strong>'+esc(from.label)+'</strong></div><span aria-hidden="true">→</span><div><small>预测下一期新增社区</small><strong>'+esc(to.label)+'</strong></div><label>预测窗口 <select id="rf-cutoff" aria-describedby="rf-period-help">'+Object.keys(predictions.periods).map(Number).sort((a,b)=>a-b).map(k=>'<option value="'+k+'" '+(k===t?'selected':'')+'>'+esc(network.periods[k].label)+' → '+esc(network.periods[k+1].label)+(k===predictions.metrics.config.validation_cutoff?' · 验证':' · 测试')+'</option>').join('')+'</select></label><span class="rf-split">'+(validation?'验证期 · 用于选模型':'测试期 · 未用于选模型')+'</span></div>'+
      '<p id="rf-period-help" class="rm-note">P = Period（时间窗口），每期 4 周（28 天）。P01 表示第 1 期；'+esc(from.label)+' → '+esc(to.label)+' 表示用截至第 '+(t+1)+' 期的历史，预测第 '+(t+2)+' 期新增的社区。</p>'+
      '<div class="rf-history-heading"><strong>已观察到 '+r.seen.length+' 个社区</strong><span>'+esc(network.userIds[u])+'</span></div><div class="rf-tags">'+tags(r.seen)+'</div><p class="rm-note">这些历史社区已排除在推荐候选之外。“新增”指此前窗口内没有观察到，并非真实首次加入。</p></section>'+
      '<div class="rf-columns"><section class="panel rf-card"><div class="rf-card-heading"><div><span class="r-kicker">01 / 看预测</span><h2>模型给出的下一站</h2></div><select id="rf-model" aria-label="预测模型">'+Object.entries(methods).map(([v,label])=>'<option value="'+v+'" '+(v===state.method?'selected':'')+'>'+label+'</option>').join('')+'</select></div>'+
      '<p class="rf-method-note">'+(state.method==='hgnnp'?'结合个人历史和社区群体聚合。':state.method==='mlp'?'使用个人历史特征，不做群体聚合。':state.method==='overlap'?'根据历史社区的用户重叠程度排序。':'根据近期社区参与规模排序。')+'</p>'+
      '<div id="rf-prediction-graph"></div>'+
      '<p class="rm-note">读取已训练结果；分数用于当前模型内排序，不是概率，也不能跨模型比较。</p></section>'+
      '<section class="panel rf-card"><div class="rf-card-heading"><div><span class="r-kicker">02 / 对照真实记录</span><h2>打开真实的下一期</h2></div><span class="rf-split">'+esc(to.label)+'</span></div><p class="rf-method-note">'+esc(to.start)+' — '+esc(to.end)+'</p>'+
      '<div id="rf-truth" class="rf-truth">'+(state.revealed?'<strong>'+(r.truth.length?'真实新增 '+r.truth.length+' 个社区，Top 5 命中 '+r.hits+' 个':'下一期没有观察到新增社区')+'</strong><div class="rf-tags">'+tags(r.truth)+'</div><p class="rm-note">下一期全部出现记录：</p><div class="rf-tags">'+tags(r.actual)+'</div><p class="rm-note">'+(r.eligible?'此用户–窗口纳入条件排序指标。':'此用户–窗口不纳入条件排序指标：'+(!r.known?'缺少已知历史。':'没有真实新增。'))+'</p>':'<span class="rf-question" aria-hidden="true">?</span><strong>先看推荐，再用真实记录核验。</strong><p>没有命中、没有新增的情况也会保留。</p>')+'</div>'+
      button('reveal',state.revealed?'隐藏真实结果':'揭晓真实新增社区 →','class="primary rf-reveal" aria-expanded="'+state.revealed+'" aria-controls="rf-truth"')+'</section></div>'+
      '<section class="panel rf-card rf-evaluation"><div class="rf-card-heading"><div><span class="r-kicker">03 / 看整体</span><h2>完整测试集结果</h2><p class="rm-note">三个测试窗口汇总 · '+fmt(predictions.metrics.summary.hgnnp.user_periods)+' 个用户–窗口样本；页面筛选不会改变这些指标。</p></div><a href="#reddit-results">查看案例解读 ↗</a></div>'+
      '<div class="rf-table-wrap"><table><thead><tr><th>方法</th><th>用户–窗口数</th><th>Recall@5</th><th>Hit@5</th><th>NDCG@5</th></tr></thead><tbody>'+Object.entries(methods).map(([method,label])=>{const m=predictions.metrics.summary[method];return '<tr class="'+(method===state.method?'selected':'')+'"><th>'+label+'</th><td>'+fmt(m.user_periods)+'</td><td>'+pct(m.recall5)+'</td><td>'+pct(m.hit5)+'</td><td>'+m.ndcg5.toFixed(3)+'</td></tr>';}).join('')+'</tbody></table></div>'+
      '<p class="rm-note">仅评估有已知历史且下一期确有新增记录的用户。测试期间模型权重冻结，历史快照随窗口前进；这是单个随机种子的已有实验，不是现场重新训练或因果传播模拟。</p><p class="rm-note">本页使用本机完整预测批次；“预测案例”保留原版导出及其评估。两批模型结果略有不同，请在各自批次内比较。</p>'+
      '<details class="rf-provenance"><summary>结果来源与可追溯性</summary><p>训练代码提交：<code>'+esc(predictions.provenance.training_commit||'未记录')+'</code></p><p>社区数据 SHA-256：<code>'+esc(predictions.provenance.network_source_sha256)+'</code></p><p>预测文件 SHA-256：<code>'+esc(predictions.provenance.predictions_source_sha256||'未记录')+'</code></p></details></section>';
    window.RedditPredictionGraph.mount(q('#rf-prediction-graph'),{
      users:network.userIds.map((id,i)=>({id,communities:network.memberships[t][i].map(c=>network.communities[c])})),
      focalId:network.userIds[u],rankings:r.rankings.map(([c,score])=>({community:network.communities[c],score})),
      selected:graphCandidate,onSelect:c=>{graphCandidate=c;},truth:state.revealed?r.truth.map(c=>network.communities[c]):null,
      canReveal:true,periodLabel:from.label,targetLabel:to.label,
      emptyMessage:!r.known?'截止当前窗口没有已知历史，本模型不输出冷启动推荐。':'没有可推荐的未观察社区。'
    });
    bind();
  }
  function chooseUser(u){graphCandidate=null;state.user=u;state.revealed=false;notice='';render();}
  function bind(){
    const input=q('#rf-user');
    input.oninput=()=>{const text=input.value.trim();q('#rf-users').innerHTML=network.userIds.filter(id=>id.includes(text)).slice(0,12).map(id=>'<option value="'+esc(id)+'"></option>').join('');};
    const find=()=>{const u=network.userIds.indexOf(input.value.trim());if(u<0){q('#rf-notice').textContent='没有找到这个匿名 ID，请选择候选项。';return;}chooseUser(u);};
    input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();find();}};
    host.onclick=e=>{const b=e.target.closest('[data-forecast]');if(!b)return;
      if(b.dataset.forecast==='find')find();
      if(b.dataset.forecast==='reveal'){state.revealed=!state.revealed;render();q('[data-forecast=reveal]').focus({preventScroll:true});}
      if(b.dataset.forecast==='random'){const ids=M.candidates(network,predictions,state.cutoff,state.method,state.filter);if(!ids.length){q('#rf-notice').textContent='当前筛选没有符合条件的用户。';return;}chooseUser(ids[Math.floor(Math.random()*ids.length)]);}
    };
    q('#rf-cutoff').onchange=e=>{state.cutoff=+e.target.value;graphCandidate=null;state.revealed=false;notice='';render();};
    q('#rf-model').onchange=e=>{state.method=e.target.value;graphCandidate=null;state.revealed=false;notice='';render();};
    q('#rf-filter').onchange=e=>{state.filter=e.target.value;q('[data-forecast=random]').click();};
  }
  function openUser(userId,cutoff){pending={userId,cutoff};if(location.hash==='#reddit-predict'&&predictions){applyPending();render();}else location.hash='reddit-predict';}
  window.RedditForecast={mount,openUser};
})();
