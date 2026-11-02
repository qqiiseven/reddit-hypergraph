const test=require('node:test'),assert=require('node:assert/strict');
const {selectContext}=require('../dist/reddit-prediction-graph.js');

test('prediction context keeps real memberships and never adds the predicted membership',()=>{
  const users=[{id:'target',communities:['A','B']},{id:'overlap',communities:['A','C']},{id:'peer',communities:['B']},{id:'candidate',communities:['C']}];
  const before=structuredClone(users),c=selectContext(users,'target','C');
  assert.deepEqual(users,before);assert.deepEqual(c.focal.communities,['A','B']);
  assert.equal(c.candidateCount,2);assert.equal(c.shownCandidate,2);
  assert.equal(new Set(c.peers.map(p=>p.id)).size,c.peers.length);
  assert(c.peers.every(p=>users.includes(p)&&p.id!=='target'));
});
test('prediction context caps displayed peers while counting all known candidate members',()=>{
  const users=[{id:'target',communities:['A','B','D','E']},...Array.from({length:100},(_,i)=>({id:'u'+i,communities:['C',i%2?'A':'B']}))];
  const c=selectContext(users,'target','C');assert.equal(c.candidateCount,100);assert.equal(c.groups.length,3);assert(c.peers.length<=9);assert(c.shownCandidate<c.candidateCount);
});
test('single-user and absent candidate contexts do not invent members',()=>{
  const c=selectContext([{id:'target',communities:[]}],'target','C');
  assert.deepEqual(c.peers,[]);assert.deepEqual(c.groups,[]);assert.equal(c.candidateCount,0);
  assert.throws(()=>selectContext([],'target','C'),/找不到/);
});
test('prediction dragging updates only bounded display coordinates, never memberships',()=>{
  const {moveNode}=require('../dist/reddit-prediction-graph.js');
  const nodes=[{id:'target',x:315,y:250,communities:['A']},{id:'peer',x:535,y:130,communities:['B']}],before=structuredClone(nodes);
  assert(moveNode(nodes,'target',400,290));assert.deepEqual(nodes[0],{...before[0],x:400,y:290});assert.deepEqual(nodes[1],before[1]);
  assert(moveNode(nodes,'target',-1000,1000));assert.equal(nodes[0].x,55);assert.equal(nodes[0].y,345);
  assert(moveNode(nodes,'target',1000,-1000));assert.equal(nodes[0].x,705);assert.equal(nodes[0].y,115);
  const bounded=structuredClone(nodes);assert.equal(moveNode(nodes,'target',NaN,2),false);assert.equal(moveNode(nodes,'target',2,Infinity),false);assert.equal(moveNode(nodes,'missing',1,2),false);assert.deepEqual(nodes,bounded);
});
