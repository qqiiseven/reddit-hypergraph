const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../dist/model.js');

test('new ABC event changes incidence without changing the pairwise projection',()=>{
  const before=M.events(false),after=M.events(true);
  assert.equal(before.edges.length,3);assert.equal(after.edges.length,4);
  assert.equal(M.project(after.edges).length,18);
  assert.deepEqual(M.project(before.edges),M.project(after.edges));
  assert.deepEqual(M.incidence(after.nodes,after.edges).map(r=>r[3]),[1,1,1,0,0,0,0,0,0]);
});
test('three distinct pair events and one triple have equal projections but different identities',()=>{
  const pairs=[{members:['A','B']},{members:['B','C']},{members:['A','C']}],triple=[{members:['A','B','C']}];
  assert.deepEqual(M.project(pairs),M.project(triple));
  assert.equal(pairs.some(e=>e.members.length===3),false);assert.equal(triple[0].members.length,3);
});
test('editable composition and incidence remain consistent',()=>{
  const d=M.composition();assert.deepEqual(M.incidence(d.nodes,d.edges),[[1,0,0],[1,1,0],[1,0,1],[0,1,0],[0,1,1],[0,0,1],[1,0,0],[0,1,0]]);
  d.edges[0].members.push('F');assert.equal(M.incidence(d.nodes,d.edges)[5][0],1);
  for(const edge of d.edges){const polygon=M.outline(d.nodes,edge.members);for(const n of d.nodes.filter(n=>edge.members.includes(n.id)))assert.equal(M.contains(polygon,n.x,n.y),true);}
});
test('group contribution requires two supporters and an enabled channel',()=>{
  assert.ok(Math.abs(M.supportProbability(.15,.3,2,false)-.2775)<1e-10);
  assert.ok(Math.abs(M.supportProbability(.15,.3,2,true)-.49425)<1e-10);
  assert.ok(Math.abs(M.supportProbability(.15,.3,1,true)-.15)<1e-10);
  assert.equal(M.supportProbability(.15,0,2,true),M.supportProbability(.15,.3,2,false));
  assert.equal(M.supportProbability(0,1,2,true),1);
  assert.equal(M.supportProbability(0,.5,1,true),0);
  assert.throws(()=>M.supportProbability(2,0,2,true));
});
test('A and B have independent influence strengths, separate from adoption state',()=>{
  assert.ok(Math.abs(M.influenceProbability(.1,.4,.3,true,false)-.46)<1e-10);
  assert.ok(Math.abs(M.influenceProbability(.1,.4,.3,true,true)-.622)<1e-10);
  assert.ok(Math.abs(M.influenceProbability(.1,.4,.3,false,true)-.1)<1e-10);
  assert.ok(Math.abs(M.influenceProbability(0,0,.3,true,true)-.3)<1e-10);
});
test('partition example preserves the three-per-machine constraint while reducing cut nets',()=>{
  const e=M.partitionExample();
  for(const assignment of [e.before,e.after])for(const group of [0,1])assert.equal(Object.values(assignment).filter(v=>v===group).length,3);
  assert.equal(e.beforeCost,2);assert.equal(e.afterCost,0);
});
test('projection layout has no crossings between non-adjacent edges',()=>{
  const p=M.projectionLayout(),edges=M.project(M.events().edges);
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){
    const[a,b]=edges[i],[u,v]=edges[j];if([a,b].some(n=>n===u||n===v))continue;
    const intersects=cross(p[a],p[b],p[u])*cross(p[a],p[b],p[v])<0&&cross(p[u],p[v],p[a])*cross(p[u],p[v],p[b])<0;
    assert.equal(intersects,false,`${a}${b} crossed ${u}${v}`);
  }
});
test('spring drag moves connected members, preserves topology, and settles',()=>{
  const data=M.composition(),matrix=M.incidence(data.nodes,data.edges),before=data.nodes.map(n=>({...n}));
  const spring=new M.SpringLayout(data);spring.pin('A',420,105);
  for(let i=0;i<15;i++)spring.step();
  assert.ok(Math.hypot(data.nodes[1].x-before[1].x,data.nodes[1].y-before[1].y)>1);
  spring.release();const atRelease=data.nodes.map(n=>({...n}));spring.step();
  assert.ok(data.nodes.some((n,i)=>Math.hypot(n.x-atRelease[i].x,n.y-atRelease[i].y)>.01));
  let frames=0;while(spring.step()&&frames<400)frames++;
  assert.ok(frames<400);assert.deepEqual(M.incidence(data.nodes,data.edges),matrix);
  assert.ok(data.nodes.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)&&n.x>=50&&n.x<=690&&n.y>=55&&n.y<=385));
});
