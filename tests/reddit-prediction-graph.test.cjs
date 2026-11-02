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
