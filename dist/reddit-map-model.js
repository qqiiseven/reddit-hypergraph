/* Full-cohort statistics and display-only sampling/layout. No prediction changes. */
(function(root){
  'use strict';
  const palette=['#5688cf','#28a6a3','#9276c5','#d89d55','#d58091','#61a9c2','#7da46c','#b18bba','#a99869','#778da9'];
  function validate(d){
    const label=s=>typeof s==='string'&&s.length>0&&s.length<=100;
    if(!d||!Array.isArray(d.communities)||d.communities.length<2||d.communities.length>128||!d.communities.every(label)||new Set(d.communities).size!==d.communities.length)throw Error('社区列表无效。');
    if(!Array.isArray(d.userIds)||!d.userIds.length||d.userIds.length>20000||!d.userIds.every(label)||new Set(d.userIds).size!==d.userIds.length)throw Error('用户列表无效。');
    if(!Array.isArray(d.periods)||!d.periods.length||d.periods.length>48||!d.periods.every(p=>p&&label(p.label)&&label(p.start)&&label(p.end)))throw Error('观察窗口无效。');
    if(!Array.isArray(d.memberships)||d.memberships.length!==d.periods.length||d.memberships.some(p=>!Array.isArray(p)||p.length!==d.userIds.length||p.some(cs=>!Array.isArray(cs)||cs.length>d.communities.length||new Set(cs).size!==cs.length||cs.some(c=>!Number.isInteger(c)||c<0||c>=d.communities.length))))throw Error('用户、社区与窗口的归属记录不匹配。');
    return d;
  }
  function summary(d,t){
    const n=d.communities.length,sizes=Array(n).fill(0),co=Array.from({length:n},()=>Array(n).fill(0));
    for(const cs of d.memberships[t]){for(const c of cs)sizes[c]++;for(const a of cs)for(const b of cs)co[a][b]++;}
    return {sizes,co,jacc:co.map((row,a)=>row.map((v,b)=>v/Math.max(1,sizes[a]+sizes[b]-v)))};
  }
  function sample(d,t,selected,mode='diverse',limit=48){
    const users=d.memberships[t].map((cs,u)=>({u,id:String(u),label:d.userIds[u],cs:cs.filter(c=>selected.includes(c))})).filter(u=>u.cs.length>=2).sort((a,b)=>b.cs.length-a.cs.length||a.u-b.u);
    if(mode==='bridges')return {users:users.slice(0,limit),total:users.length};
    const buckets=new Map();for(const u of users){const key=u.cs.join(',');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(u);}
    const groups=[...buckets.entries()].sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true})),chosen=[];
    for(let round=0;chosen.length<limit;round++){let added=false;for(const [,g] of groups)if(g[round]){chosen.push(g[round]);added=true;if(chosen.length===limit)break;}if(!added)break;}
    return {users:chosen,total:users.length};
  }
  function layout(users,selected,kind='force'){
    const width=980,height=660,n=users.length;
    const nodes=users.map((u,i)=>{let x,y;
      if(kind==='grid'){const cols=Math.max(1,Math.ceil(Math.sqrt(n*1.5))),rows=Math.ceil(n/cols);x=85+(i%cols)*(width-170)/Math.max(1,cols-1);y=90+Math.floor(i/cols)*(height-180)/Math.max(1,rows-1);}
      else {const angle=-Math.PI/2+(kind==='circle'?i*2*Math.PI/Math.max(1,n):i*2.3999632297),r=kind==='circle'?1:Math.sqrt((i+.5)/Math.max(1,n));x=width/2+405*r*Math.cos(angle);y=height/2+245*r*Math.sin(angle);}
      return {...u,number:String(i+1).padStart(2,'0'),x,y,r:13};});
    const edges=selected.map((c,i)=>({c,id:'C'+c,color:palette[i],members:nodes.filter(n=>n.cs.includes(c)).map(n=>n.id)}));
    if(kind==='force')for(let k=0;k<180;k++){
      const forces=nodes.map(n=>({x:(width/2-n.x)*.003,y:(height/2-n.y)*.003}));
      for(const e of edges){const ns=nodes.filter(n=>e.members.includes(n.id));if(!ns.length)continue;const cx=ns.reduce((s,n)=>s+n.x,0)/ns.length,cy=ns.reduce((s,n)=>s+n.y,0)/ns.length;nodes.forEach((n,i)=>{if(e.members.includes(n.id)){forces[i].x+=(cx-n.x)*.008;forces[i].y+=(cy-n.y)*.008;}});}
      for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const dx=nodes[i].x-nodes[j].x,dy=nodes[i].y-nodes[j].y,dist=Math.max(1,Math.hypot(dx,dy)),f=Math.min(8,3400/(dist*dist));forces[i].x+=dx/dist*f;forces[i].y+=dy/dist*f;forces[j].x-=dx/dist*f;forces[j].y-=dy/dist*f;}
      nodes.forEach((n,i)=>{n.x=Math.max(48,Math.min(width-48,n.x+forces[i].x*.7));n.y=Math.max(65,Math.min(height-48,n.y+forces[i].y*.7));});
    }
    // Separate node disks so non-member masks cannot erase another user's disk.
    for(let k=0;k<100;k++)for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;if(d<38){const move=(38-d)/2+.01,ux=dx/d,uy=dy/d;a.x=Math.max(48,Math.min(width-48,a.x-ux*move));a.y=Math.max(65,Math.min(height-48,a.y-uy*move));b.x=Math.max(48,Math.min(width-48,b.x+ux*move));b.y=Math.max(65,Math.min(height-48,b.y+uy*move));}}
    return {nodes,edges,width,height};
  }
  function move(data,id,x,y){
    const n=data.nodes.find(n=>n.id===id);if(!n||!Number.isFinite(x)||!Number.isFinite(y))return false;
    x=Math.max(48,Math.min(data.width-48,x));y=Math.max(65,Math.min(data.height-48,y));
    if(data.nodes.some(p=>p!==n&&Math.hypot(p.x-x,p.y-y)<36))return false;n.x=x;n.y=y;return true;
  }
  const api={palette,validate,summary,sample,layout,move};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RedditMapModel=api;
})(typeof window!=='undefined'?window:globalThis);
