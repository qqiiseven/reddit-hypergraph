const test=require('node:test'),assert=require('node:assert/strict'),M=require('../dist/reddit-map-model.js');
function fixture(){
  const communities=['a','b','c','d'],userIds=Array.from({length:8},(_,i)=>'u_'+i);
  return {communities,userIds,periods:[{label:'P01',start:'a',end:'b'},{label:'P02',start:'c',end:'d'}],memberships:[
    [[0,1,2],[0,1],[1,2],[0,2],[0],[3],[0,3],[]],
    [[0,1],[1],[2],[0,2,3],[3],[3],[0,3],[0,1]]
  ]};
}
test('community sizes and Jaccard use the full cohort, independent of screen sampling',()=>{
  const d=M.validate(fixture()),s=M.summary(d,0);
  assert.deepEqual(s.sizes,[5,3,3,2]);assert.equal(s.co[0][1],2);assert.equal(s.jacc[0][1],2/6);
  assert.equal(s.co[0][3],1);assert.equal(s.jacc[0][3],1/6);
  assert.deepEqual(s.co,s.co[0].map((_,i)=>s.co.map(row=>row[i])));
  M.sample(d,0,[0,1,2],'bridges',2);assert.deepEqual(M.summary(d,0),s);
  assert.notDeepEqual(M.summary(d,1),s);
});
test('display sampling respects every selected community and preserves actual membership',()=>{
  const d=fixture(),before=JSON.stringify(d);
  for(const mode of ['diverse','bridges']){
    const result=M.sample(d,0,[0,1,2,3],mode,3);assert.equal(result.total,5);assert.equal(result.users.length,3);
    assert.equal(new Set(result.users.map(u=>u.id)).size,3);
    for(const u of result.users)assert.deepEqual(u.cs,d.memberships[0][u.u]);
  }
  assert.deepEqual(M.sample(d,0,[0,1,2],'diverse',2).users.map(u=>u.cs),[[0,1],[0,1,2]]);
  const ten={...d,communities:Array.from({length:10},(_,i)=>'c'+i),memberships:[d.userIds.map(()=>[8,9]),d.userIds.map(()=>[8,9])]};
  assert.equal(M.sample(ten,0,[0,1,2,3,4,5,6,7,8,9]).total,8);
  assert.equal(JSON.stringify(d),before);
  assert.equal(M.sample(d,0,[2,3]).users.length,0);
});
test('all layouts and node dragging leave community memberships unchanged',()=>{
  const d=fixture(),users=M.sample(d,0,[0,1,2,3]).users,before=JSON.stringify(users),layouts=[];
  for(const kind of ['force','circle','grid']){
    const g=M.layout(users,[0,1,2,3],kind),edges=JSON.stringify(g.edges);layouts.push(g.nodes.map(n=>[n.x,n.y]));
    assert.deepEqual(g,M.layout(users,[0,1,2,3],kind));
    for(const n of g.nodes){assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y));assert.ok(n.x>=48&&n.x<=932&&n.y>=65&&n.y<=612);}
    assert.ok(M.move(g,g.nodes[0].id,48,612));assert.equal(JSON.stringify(g.edges),edges);
    assert.equal(M.move(g,g.nodes[0].id,g.nodes[1].x,g.nodes[1].y),false);
    assert.equal(M.move(g,g.nodes[0].id,Infinity,0),false);
  }
  assert.notDeepEqual(layouts[0],layouts[1]);assert.notDeepEqual(layouts[1],layouts[2]);assert.equal(JSON.stringify(users),before);
});
test('invalid imported references and mismatched windows are rejected',()=>{
  const d=fixture();d.memberships[0][0]=[99];assert.throws(()=>M.validate(d),/归属/);
  const duplicate=fixture();duplicate.memberships[0][0]=[1,1];assert.throws(()=>M.validate(duplicate),/归属/);
  const missing=fixture();missing.memberships.pop();assert.throws(()=>M.validate(missing),/归属/);
});
