/* Known memberships and a separately marked hypothetical membership, never invented peers. */
(function(root){
  'use strict';
  function selectContext(users,focalId,candidate){
    const focal=users.find(u=>u.id===focalId);
    if(!focal)throw Error('找不到观察用户');
    const groups=focal.communities.slice(0,3),others=users.filter(u=>u.id!==focalId),peers=[];
    const add=u=>{if(u&&peers.length<9&&!peers.some(p=>p.id===u.id))peers.push(u);};
    const candidateMembers=others.filter(u=>u.communities.includes(candidate));
    candidateMembers.slice(0,3).forEach(add);
    for(const c of groups)others.filter(u=>u.communities.includes(c)).slice(0,2).forEach(add);
    return {focal,groups,peers,candidateCount:candidateMembers.length,shownCandidate:peers.filter(u=>u.communities.includes(candidate)).length};
  }
  function moveNode(nodes,id,x,y){
    const node=nodes.find(n=>n.id===id);
    if(!node||!Number.isFinite(x)||!Number.isFinite(y))return false;
    node.x=Math.max(55,Math.min(705,x));node.y=Math.max(115,Math.min(345,y));return true;
  }
  const api={selectContext,moveNode};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label=s=>String(s).replace(/^r\//,'');
  let instance=0;
  function mount(host,options){
    if(!host)return;
    const ranks=options.rankings||[];
    if(!ranks.length){host.innerHTML='<p class="pg-empty">'+esc(options.emptyMessage||'没有可推荐的新社区。')+'</p>';return;}
    const id='pg-'+(++instance),layouts=new Map();let selected=Math.max(0,ranks.findIndex(r=>r.community===options.selected));
    function draw(){
      const r=ranks[selected],c=selectContext(options.users,options.focalId,r.community);
      let left=0,right=0;
      const peers=c.peers.map((u,i)=>{const candidate=u.communities.includes(r.community),j=candidate?right++:left++;return {...u,number:i+1,x:(candidate?535:95)+(j%2)*95,y:(candidate?130:175)+Math.floor(j/2)*55};});
      const focal={...c.focal,x:315,y:250},nodes=[focal,...peers],H=root.HyperModel;
      const saved=layouts.get(r.community);if(saved)nodes.forEach(n=>{if(saved.has(n.id))Object.assign(n,saved.get(n.id));});
      const path=(members,anchor,pad=34)=>{const all=anchor?[...nodes,anchor]:nodes,ids=anchor?[...members,anchor.id]:members;return H.outline(all,ids,pad).map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'Z';};
      const color=['#5688cf','#9276c5','#28a6a3'];
      const historical=c.groups.map((name,i)=>({name,color:color[i],members:nodes.filter(n=>n.communities.includes(name)).map(n=>n.id),anchor:{id:Symbol('history'),x:125,y:155+i*80}}));
      const candidateIds=peers.filter(u=>u.communities.includes(r.community)).map(u=>u.id),candidateAnchor={id:Symbol('candidate'),x:590,y:220};
      const masks=historical.map((g,i)=>'<mask id="'+id+'-mask-'+i+'" maskUnits="userSpaceOnUse" x="0" y="0" width="760" height="430"><rect width="760" height="430" fill="white"/>'+nodes.filter(n=>!g.members.includes(n.id)).map(n=>'<circle data-pg-hole="'+nodes.indexOf(n)+'" cx="'+n.x+'" cy="'+n.y+'" r="24" fill="black"/>').join('')+'</mask>').join('');
      const predictionMembers=[focal.id,...candidateIds];
      const maskKnown='<mask id="'+id+'-mask-known" maskUnits="userSpaceOnUse" x="0" y="0" width="760" height="430"><rect width="760" height="430" fill="white"/>'+nodes.filter(n=>!candidateIds.includes(n.id)).map(n=>'<circle data-pg-hole="'+nodes.indexOf(n)+'" cx="'+n.x+'" cy="'+n.y+'" r="24" fill="black"/>').join('')+'</mask>';
      const maskPrediction='<mask id="'+id+'-mask-p" maskUnits="userSpaceOnUse" x="0" y="0" width="760" height="430"><rect width="760" height="430" fill="white"/>'+nodes.filter(n=>!predictionMembers.includes(n.id)).map(n=>'<circle data-pg-hole="'+nodes.indexOf(n)+'" cx="'+n.x+'" cy="'+n.y+'" r="24" fill="black"/>').join('')+'</mask>';
      const known=options.truth!==null&&options.truth!==undefined,hit=known&&options.truth.includes(r.community);
      const outcome=known?(hit?'✓ 下一期确实新增':'下一期未观察到新增'):(options.canReveal?'等待揭晓真实结果':'预测结果 · 尚无真实下一期');
      host.innerHTML='<div class="pg"><div class="pg-candidates" role="group" aria-label="选择要查看的推荐社区">'+ranks.map((row,i)=>'<button type="button" data-pg-candidate="'+i+'" aria-pressed="'+(i===selected)+'"><b>'+String(i+1).padStart(2,'0')+'</b><span>'+esc(label(row.community))+'</span></button>').join('')+'</div><div class="pg-status" aria-live="polite"><span>当前推荐 <strong>'+esc(label(r.community))+'</strong></span><span class="'+(hit?'pg-hit':'')+'">'+outcome+'</span></div>'+
      '<svg class="pg-svg" viewBox="0 0 760 430" role="group" aria-label="'+esc('观察用户 '+c.focal.id+' 的已知社区及推荐社区 '+label(r.community)+'。实线为最近一期的已知归属，虚线为预测归属。')+'"><defs>'+masks+maskKnown+maskPrediction+'</defs>'+
      '<text class="pg-zone" x="30" y="28">'+esc(options.periodLabel||'最近一期')+' · 已知社区</text><text class="pg-zone" x="485" y="28">'+esc(options.targetLabel||'下一期')+' · 推荐归属（虚线）</text>'+
      historical.map((g,i)=>'<path data-pg-edge="'+i+'" d="'+path(g.members,g.anchor)+'" fill="'+g.color+'" fill-opacity=".075" stroke="'+g.color+'" stroke-width="1.4" mask="url(#'+id+'-mask-'+i+')"/>').join('')+
      '<path class="pg-known-candidate" d="'+path(candidateIds,candidateAnchor,40)+'" fill="#e7b778" fill-opacity=".10" stroke="#d49b57" stroke-width="1.4" mask="url(#'+id+'-mask-known)"/>'+
      '<path class="pg-predicted-membership" d="'+path(predictionMembers,candidateAnchor,46)+'" fill="#e7b778" fill-opacity=".055" stroke="#d49b57" stroke-width="2.5" stroke-dasharray="8 6" mask="url(#'+id+'-mask-p)"/>'+
      peers.map(n=>'<g class="pg-peer" data-pg-node="'+nodes.indexOf(n)+'" tabindex="0" role="button" aria-label="'+esc(n.id+'，可拖动或用方向键移动')+'"><title>'+esc(n.id+'：'+n.communities.map(label).join('、'))+'</title><circle cx="'+n.x+'" cy="'+n.y+'" r="17" fill="white" stroke="#94a9bf" stroke-width="1.4"/><text x="'+n.x+'" y="'+(n.y+4)+'" text-anchor="middle">'+String(n.number).padStart(2,'0')+'</text></g>').join('')+
      '<g class="pg-focal" data-pg-node="0" tabindex="0" role="button" aria-label="'+esc(c.focal.id+'，观察用户，可拖动或用方向键移动')+'"><title>'+esc(c.focal.id)+'</title><circle cx="'+focal.x+'" cy="'+focal.y+'" r="24" fill="#21354f" stroke="white" stroke-width="4"/><text x="'+focal.x+'" y="'+(focal.y+5)+'" text-anchor="middle" fill="white">目标</text><text class="pg-user-label" x="'+focal.x+'" y="'+(focal.y+45)+'" text-anchor="middle">'+esc(c.focal.id.length>18?c.focal.id.slice(0,16)+'…':c.focal.id)+'</text></g>'+
      historical.map((g,i)=>'<g><rect x="25" y="'+(50+i*30)+'" width="210" height="27" rx="9" fill="white" stroke="'+g.color+'" stroke-opacity=".35"/><text x="37" y="'+(68+i*30)+'" fill="'+g.color+'">'+esc(label(g.name))+'</text></g>').join('')+
      '<rect x="465" y="55" width="265" height="32" rx="10" fill="#fff7eb" stroke="#e4c598"/><text x="480" y="76" fill="#a9783d">'+esc(label(r.community))+'</text>'+
      (!candidateIds.length?'<text x="590" y="220" text-anchor="middle" class="pg-zone">输入中暂无已知成员</text>':'')+
      '<text x="30" y="402" class="pg-zone">色块包围同一社区的用户</text><text x="430" y="402" class="pg-zone">虚线：该用户可能新增的归属</text></svg>'+
      '<div class="pg-layout-tools"><span class="pg-layout-status" role="status">拖动节点调整位置；选中后也可用方向键移动。</span><button type="button" data-pg-reset>恢复布局</button></div><div class="pg-legend"><span><i class="pg-solid"></i>已知归属</span><span><i class="pg-dashed"></i>预测归属</span><span><i class="pg-dot"></i>观察用户</span></div><p class="pg-description">'+esc(label(r.community))+' 在'+esc(options.periodLabel||'最近一期')+'的输入中有 '+c.candidateCount+' 位已知参与者，图中展示 '+c.shownCandidate+' 位。展示观察用户最近一期最多 3 个已参与社区和部分其他用户；模型仍使用完整历史。</p><p class="pg-description">虚线只表达对观察用户的推荐，不代表群体将共同迁移，也不是模型归因。区域大小不表示概率。</p><details class="pg-scores"><summary>查看 Top 5 排序分数</summary><table><thead><tr><th>排名</th><th>社区</th><th>分数</th></tr></thead><tbody>'+ranks.map((row,i)=>'<tr><td>'+String(i+1).padStart(2,'0')+'</td><td>'+esc(label(row.community))+'</td><td>'+row.score.toFixed(4)+'</td></tr>').join('')+'</tbody></table><p>分数只用于当前模型内排序，不是概率。</p></details></div>';
      const svg=host.querySelector('.pg-svg');let drag=null;
      function redraw(){
        nodes.forEach((n,i)=>{
          const group=svg.querySelector('[data-pg-node="'+i+'"]'),circle=group.querySelector('circle');
          circle.setAttribute('cx',n.x);circle.setAttribute('cy',n.y);
          group.querySelectorAll('text').forEach(t=>{t.setAttribute('x',n.x);t.setAttribute('y',n.y+(t.classList.contains('pg-user-label')?45:i===0?5:4));});
        });
        svg.querySelectorAll('[data-pg-hole]').forEach(h=>{const n=nodes[+h.dataset.pgHole];h.setAttribute('cx',n.x);h.setAttribute('cy',n.y);});
        historical.forEach((g,i)=>svg.querySelector('[data-pg-edge="'+i+'"]').setAttribute('d',path(g.members,g.anchor)));
        svg.querySelector('.pg-known-candidate').setAttribute('d',path(candidateIds,candidateAnchor,40));
        svg.querySelector('.pg-predicted-membership').setAttribute('d',path(predictionMembers,candidateAnchor,46));
        layouts.set(r.community,new Map(nodes.map(n=>[n.id,{x:n.x,y:n.y}])));
      }
      function point(e){const matrix=svg.getScreenCTM();if(!matrix)return null;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(matrix.inverse());}
      svg.addEventListener('pointerdown',e=>{
        const target=e.target.closest('[data-pg-node]');if(!target||e.button!==0||e.isPrimary===false||drag)return;
        const p=point(e);if(!p)return;const n=nodes[+target.dataset.pgNode];
        drag={node:n,id:e.pointerId,dx:n.x-p.x,dy:n.y-p.y};
        svg.setPointerCapture(e.pointerId);svg.classList.add('is-dragging');target.focus({preventScroll:true});e.preventDefault();
      });
      svg.addEventListener('pointermove',e=>{
        if(!drag||drag.id!==e.pointerId)return;const p=point(e);
        if(p&&moveNode(nodes,drag.node.id,p.x+drag.dx,p.y+drag.dy))redraw();e.preventDefault();
      });
      function finish(e){
        if(!drag||drag.id!==e.pointerId)return;drag=null;svg.classList.remove('is-dragging');
        if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);
        host.querySelector('.pg-layout-status').textContent='位置已更新，社区归属与预测结果保持不变。';
      }
      svg.addEventListener('pointerup',finish);svg.addEventListener('pointercancel',finish);svg.addEventListener('lostpointercapture',finish);
      svg.addEventListener('keydown',e=>{
        const target=e.target.closest('[data-pg-node]');if(!target||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
        e.preventDefault();const n=nodes[+target.dataset.pgNode],step=e.shiftKey?20:8;
        if(moveNode(nodes,n.id,n.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),n.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)))redraw();
        host.querySelector('.pg-layout-status').textContent='位置已更新，社区归属与预测结果保持不变。';
      });
      host.querySelector('[data-pg-reset]').onclick=()=>{layouts.delete(r.community);draw();host.querySelector('[data-pg-reset]').focus({preventScroll:true});};
      host.querySelectorAll('[data-pg-candidate]').forEach(b=>b.onclick=()=>{selected=+b.dataset.pgCandidate;draw();host.querySelector('[data-pg-candidate="'+selected+'"]').focus({preventScroll:true});options.onSelect?.(ranks[selected].community);});
    }
    draw();
  }
  root.RedditPredictionGraph={...api,mount};
})(typeof window!=='undefined'?window:globalThis);
