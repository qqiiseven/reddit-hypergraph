/* Editable custom histories -> checkpoint inference via local or published API. No saved-case substitution. */
(()=>{
  'use strict';
  const M=window.RedditCustomModel;
  const local=['127.0.0.1','localhost','[::1]'].includes(location.hostname);
  let apiBase='';
  const apiURL=path=>apiBase?apiBase+'/api/reddit/'+path:'api/reddit/'+path;
  let host,info=null,text='',revision=0,busy=false,result=null,submitted=null,selected='',requestId=0;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const q=s=>host?.querySelector(s),period=t=>'P'+String(t).padStart(2,'0');
  const button=(action,label,attrs='')=>'<button type="button" data-custom="'+action+'" '+attrs+'>'+label+'</button>';
  const fallback={schema_version:1,period_days:28,users:[{id:'小林',history:[{communities:['programming','Python'],reply_degree:5},{communities:['programming','learnprogramming'],reply_degree:8},{communities:['Python','learnprogramming'],reply_degree:6}]},{id:'小周',history:[{communities:['programming','linux'],reply_degree:7},{communities:['programming','technology'],reply_degree:9},{communities:['Python','technology'],reply_degree:6}]},{id:'小陈',history:[{communities:['gaming','technology'],reply_degree:4},{communities:['linux','technology'],reply_degree:6},{communities:['programming','linux'],reply_degree:8}]}]};
  const names=()=>info?.communities||window.RedditDemoData.communities;
  function status(message,error=false){const el=q('#rc-status');if(el){el.textContent=message;el.classList.toggle('error',error);}}
  function parse(){if(new TextEncoder().encode(text).length>262144)throw Error('文件不能超过 256 KiB。');let d;try{d=JSON.parse(text);}catch(e){throw Error('JSON 格式错误：'+e.message);}return M.validate(d,names());}
  function updateInput(value){text=value;revision++;result=null;submitted=null;if(q('#rc-json'))q('#rc-json').value=value;q('#rc-preview')?.replaceChildren();drawResults();status('输入已更新，请检查格式并重新调用模型。');}
  function download(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function preview(d){const s=M.summary(d);q('#rc-preview').innerHTML='<div class="rc-preview-summary">'+s.users+' 位用户 · '+s.periods+' 期历史 · '+s.communities+' 个社区 · '+s.memberships+' 次社区参与</div><div class="rc-history-scroll"><table><caption>你提交的历史 · P01 是第 1 期，每期 28 天</caption><thead><tr><th>用户</th>'+Array.from({length:s.periods},(_,i)=>'<th>'+period(i+1)+'</th>').join('')+'</tr></thead><tbody>'+d.users.map(u=>'<tr><th>'+esc(u.id)+'</th>'+u.history.map(r=>'<td>'+r.communities.map(c=>'<span>'+esc(c)+'</span>').join('')+(!r.communities.length?'<span class="muted">无活动记录</span>':'')+'<small>回复度数 '+r.reply_degree+'</small></td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
  function drawResults(){
    const el=q('#rc-results');if(!el)return;
    if(!result){el.innerHTML='<section class="panel rf-card rc-empty"><span class="r-kicker">03 / 看模型结果</span><h2>准备好数据后，调用模型</h2><p>这里将展示 HGNN+ 与 MLP 的实时 Top 5 推荐。你还没有提供真实下一期记录，因此不会显示命中率或准确率。</p></section>';return;}
    const u=result.users.find(u=>u.id===selected)||result.users[0];selected=u.id;
    const common=u.rankings.hgnnp.filter(r=>u.rankings.mlp.some(m=>m.community===r.community)).length;
    el.innerHTML='<section class="panel rf-card"><div class="rf-card-heading"><div><span class="r-kicker">03 / 本次实时推理</span><h2>预测 '+period(result.target_period)+' 的新增社区</h2></div><label>查看用户 <select id="rc-result-user">'+result.users.map(u=>'<option value="'+esc(u.id)+'" '+(u.id===selected?'selected':'')+'>'+esc(u.id)+'</option>').join('')+'</select></label></div><p class="rm-note">已使用 '+period(1)+'—'+period(result.history_periods)+' 的历史 · '+result.cohort_size+' 位自建用户 · 已排除该用户出现过的 '+u.seen.length+' 个社区</p><div class="rf-tags">'+u.seen.map(c=>'<span>'+esc(c)+'</span>').join('')+'</div><p class="rc-context">HGNN+ 在本次提交的全部用户之间聚合；MLP 只使用个人历史。两种方法的 Top 5 有 '+common+' 个相同社区。</p></section><div class="rf-columns">'+[['hgnnp','HGNN+ · 个人 + 群体'],['mlp','MLP · 个人历史']].map(([method,label])=>'<section class="panel rf-card"><div class="rf-card-heading"><h2>'+label+'</h2><span class="rf-split">Top 5</span></div><div data-custom-prediction="'+method+'"></div><p class="rm-note">分数用于本模型内排序，不是概率，也不能直接跨模型比较。</p></section>').join('')+'</div><section class="panel rf-card"><p class="rm-note">'+esc(result.note)+'</p>'+result.warnings.map(message=>'<p class="rc-context">'+esc(message)+'</p>').join('')+'<p class="rm-note">小规模自建数据与训练时的 Reddit 样本不同；这些推荐用于探索模型反应，不代表已验证的预测效果。</p><div class="rc-result-footer"><span>权重批次 '+esc(result.run_id)+' · 模型计算 '+result.seconds.toFixed(2)+' 秒</span>'+button('download-result','下载输入与结果')+'</div><details class="rf-provenance"><summary>本次调用来源</summary><p>训练提交：<code>'+esc(result.training_commit)+'</code></p><p>输入 SHA-256：<code>'+esc(result.input_sha256)+'</code></p></details></section>';
    const users=submitted.users.map(person=>({id:person.id,communities:person.history.at(-1).communities}));
    for(const method of ['hgnnp','mlp'])window.RedditPredictionGraph.mount(el.querySelector('[data-custom-prediction="'+method+'"]'),{
      users,focalId:u.id,rankings:u.rankings[method],truth:null,periodLabel:period(result.history_periods),targetLabel:period(result.target_period),
      emptyMessage:!u.known?'该用户没有历史记录，模型不输出冷启动推荐。':'所有支持的社区都已在历史中出现，没有新增候选。'
    });
    q('#rc-result-user').onchange=e=>{selected=e.target.value;drawResults();};
  }
  async function service(){
    const container=host;info=null;q('#rc-run').disabled=true;
    q('#rc-service').textContent='正在连接模型服务…';
    try{if(!local){const config=await fetch('model-service.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!config.ok)throw Error('模型连接地址尚未发布。');const endpoint=(await config.json()).endpoint;if(!endpoint)throw Error('在线模型尚未连接，请联系演示者启动服务。');const url=new URL(endpoint);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('模型服务地址无效。');apiBase=url.origin;}const response=await fetch(apiURL('model'),{cache:'no-store',signal:AbortSignal.timeout(10000)});if(response.status===404)throw Error(local?'请用 python3 launch.py 启动当前项目。':'模型接口不可用，请联系演示者检查服务地址。');let data;try{data=await response.json();}catch{throw Error(local?'模型接口不可用，请用 python3 launch.py 启动当前项目。':'模型服务暂时离线，请联系演示者启动服务。');}if(!response.ok)throw Error(data.error||'模型未就绪');if(host!==container||!host.isConnected)return;info=data;q('#rc-service').textContent=(local?'本机模型已就绪 · ':'演示模型已连接 · ')+info.run_id;q('#rc-run').disabled=busy;q('#rc-communities').innerHTML=names().map(c=>'<code>'+esc(c)+'</code>').join('');}
    catch(e){if(host===container&&host.isConnected)q('#rc-service').textContent=(!local&&(e instanceof TypeError||['TimeoutError','AbortError'].includes(e.name)))?'模型服务暂时无法连接，请联系演示者确认电脑与隧道在线，再点“重新检查”。':e.message;}
  }
  async function predict(){
    if(busy)return;let payload;try{payload=parse();preview(payload);}catch(e){status(e.message,true);return;}
    if(!info){status('模型未就绪，请先检查上方服务状态。',true);return;}
    const rev=revision,id=++requestId,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),40000);
    busy=true;result=null;submitted=null;drawResults();q('#rc-run').disabled=true;status('正在调用模型服务计算 HGNN+ / MLP，请稍候…');
    try{const response=await fetch(apiURL('predict'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal,cache:'no-store'});let answer;try{answer=await response.json();}catch{throw Error('模型服务未返回有效结果，请检查上方连接状态后重试。');}if(!response.ok)throw Error(answer.error||'推理失败');if(id!==requestId)return;if(revision!==rev){status('计算期间输入已修改，本次结果已丢弃，请重新预测。');return;}result=answer;submitted=payload;drawResults();status('推理完成。以下结果来自本次输入和保存的模型权重。');}
    catch(e){if(id===requestId)status(e.name==='AbortError'?'请求超时，请稍后重试。':e instanceof TypeError?'连接中断，请检查模型服务是否在线。':e.message,true);}
    finally{clearTimeout(timer);if(id===requestId){busy=false;if(q('#rc-run'))q('#rc-run').disabled=!info;}}
  }
  function mount(container){
    host=container;if(!text)text=JSON.stringify(fallback,null,2);
    host.innerHTML='<section class="panel rf-card"><div class="rc-service-row"><span id="rc-service" role="status">检查模型服务</span>'+button('service','重新检查')+'</div><p class="rm-note">'+(local?'输入仅发送到本机模型服务，不自动保存。':'点击“调用模型”后，输入将经 Cloudflare 隧道发送到演示者电脑计算；本项目不自动保存输入。演示者电脑和隧道需保持在线。')+' 支持固定的 44 个社区；更换社区字典需要重新训练权重。</p></section><div class="rc-editor-grid"><section class="panel rf-card"><div class="rf-card-heading"><div><span class="r-kicker">01 / 创建数据</span><h2>编辑你的用户历史</h2></div><span class="rf-split">JSON · ≤256 KiB · 100 人 / 11 期</span></div><div class="rc-editor-actions">'+button('example','恢复示例')+button('template','下载模板')+'<label class="rc-file">导入 JSON<input id="rc-file" type="file" accept=".json,application/json"></label></div><label class="rc-editor-label" for="rc-json">把示例中的用户、社区和回复度数改成你的数据</label><textarea id="rc-json" spellcheck="false" aria-describedby="rc-format" aria-label="自建用户历史 JSON"></textarea><div class="rc-editor-actions">'+button('validate','检查格式与预览')+button('run','调用模型 →','id="rc-run" class="primary" disabled')+'</div><p id="rc-status" class="rc-status" role="status" aria-live="polite"></p></section><section class="panel rf-card rc-guide"><span class="r-kicker">02 / 按格式填写</span><h2>每位用户，一段连续历史</h2><p id="rc-format">P01 从你自建历史的第 1 期起算。从早到晚填写同一批四周窗口。所有用户的第 1 条记录对应同一个 P01，第 2 条对应 P02，以此类推。只填已知历史，模型预测最后一期之后的新社区。</p><dl><dt>schema_version</dt><dd>固定填写数字 <code>1</code>。</dd><dt>period_days</dt><dd>固定填写 <code>28</code>，与模型训练的四周窗口一致。</dd><dt>users[].id</dt><dd>自定义、唯一的用户名称，例如“小林”或“user_01”。最多 40 个字，支持汉字、字母、数字、下划线和短横线。</dd><dt>users[].history</dt><dd>1–11 条记录；所有用户期数相同。建议至少 3 期，并提供多位有交叠社区的用户。</dd><dt>communities</dt><dd>该期参与过的社区名称数组，大小写须与下方列表一致；同一期不能重复。无活动填 <code>[]</code>。</dd><dt>reply_degree</dt><dd>该期每个所选社区内的不同回复对象数，再跨社区相加；不含自己，不是评论条数。必须填非负整数。填 <code>0</code> 就表示没有发出回复，模型不会推测缺失值。</dd></dl><div class="rc-context">无活动窗口也要保留：<code>{"communities": [], "reply_degree": 0}</code>。只有 1 位用户时，HGNN+ 无法利用其他用户的信息。</div><details open><summary>支持的 44 个社区 · 可复制名称</summary><div id="rc-communities" class="rc-communities">'+names().map(c=>'<code>'+esc(c)+'</code>').join('')+'</div></details></section></div><section id="rc-preview" aria-label="输入历史预览"></section><div id="rc-results"></div>';
    q('#rc-json').value=text;q('#rc-json').oninput=e=>updateInput(e.target.value);
    q('#rc-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>262144)throw Error('文件不能超过 256 KiB。');updateInput(await file.text());const d=parse();preview(d);status('文件已导入，格式通过。点击“调用模型”计算。');}catch(error){status(error.message,true);}finally{if(q('#rc-file'))q('#rc-file').value='';}};
    host.onclick=e=>{const action=e.target.closest('[data-custom]')?.dataset.custom;if(!action)return;
      if(action==='service')service();if(action==='example'){updateInput(JSON.stringify(info?.example||fallback,null,2));preview(parse());}
      if(action==='template')download('reddit-custom-template.json',info?.example||fallback);
      if(action==='validate'){try{preview(parse());status('格式正确。预览确认后，点击“调用模型”。');}catch(error){status(error.message,true);}}
      if(action==='run')predict();if(action==='download-result'&&result)download('reddit-custom-result.json',{input:submitted,result});
    };
    drawResults();if(submitted)preview(submitted);service();
  }
  window.RedditCustom={mount};
})();
