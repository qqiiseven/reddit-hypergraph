const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../dist/reddit-custom-model.js');
const names=['Python','programming'];
const example=()=>({schema_version:1,period_days:28,users:[{id:'小林',history:[{communities:['Python'],reply_degree:2},{communities:['Python','programming'],reply_degree:3}]},{id:'user_2',history:[{communities:[],reply_degree:0},{communities:['programming'],reply_degree:1}]}]});
test('custom history validation preserves the input and summarizes actual records',()=>{const d=example(),before=structuredClone(d);assert.equal(M.validate(d,names),d);assert.deepEqual(d,before);assert.deepEqual(M.summary(d),{users:2,periods:2,communities:2,memberships:4});});
test('custom history rejects unknown communities, misaligned windows and missing features',()=>{for(const mutate of [d=>d.users[0].history[0].communities=['python'],d=>d.users[0].history[0].communities=['Python','Python'],d=>d.users[0].history[0].reply_degree=true,d=>delete d.users[0].history[0].reply_degree,d=>d.users[1].history.pop(),d=>d.users[1].id='小林',d=>d.period_days=7,d=>d.future_truth=[]]){const d=example();mutate(d);assert.throws(()=>M.validate(d,names));}});
