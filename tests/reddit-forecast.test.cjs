const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../dist/reddit-forecast-model.js');

function fixture(){
  const d={communities:['a','b','c','d','e'],userIds:['known','no-new','cold','miss'],periods:[{}, {}, {}],provenance:{source_sha256:'source'},memberships:[[[0,1,2],[0],[],[0]],[[1],[0],[],[0]],[[3],[0],[4],[4]]]};
  const rankings=Object.fromEntries(Object.keys(M.methods).map(m=>[m,[[[3,.8],[4,.2]],[[1,.8]],[],[[2,.8]]]]));
  const p={communities:[...d.communities],userIds:[...d.userIds],provenance:{network_source_sha256:'source'},periods:{1:{truth:[[3],[],[4],[4]],rankings}},metrics:{config:{validation_cutoff:0,test_cutoffs:[1]},summary:Object.fromEntries(Object.keys(M.methods).map(m=>[m,{user_periods:2,recall5:.5,hit5:.5,ndcg5:.5}]))}};
  return {d,p};
}
test('forecast imports require the same ordered users, communities and source',()=>{
  const {d,p}=fixture();assert.equal(M.validate(d,p),p);
  for(const change of [p=>p.userIds.reverse(),p=>p.communities.reverse(),p=>p.provenance.network_source_sha256='different']){
    const bad=structuredClone(p);change(bad);assert.throws(()=>M.validate(d,bad));
  }
});
test('forecast validation catches wrong next-period truth and invalid recommendations',()=>{
  const {d,p}=fixture();
  for(const change of [p=>p.periods[1].truth[0]=[4],p=>p.periods[1].rankings.hgnnp[0]=[[0,.9]],p=>p.periods[1].rankings.mlp[0]=[[3,NaN]],p=>p.periods[1].rankings.overlap[0]=[[3,.8],[3,.7]],p=>p.periods[1].rankings.popular[2]=[[3,.5]]]){
    const bad=structuredClone(p);change(bad);assert.throws(()=>M.validate(d,bad));
  }
});
test('history stops at the cutoff; hits and conditional eligibility distinguish cold start and no-new users',()=>{
  const {d,p}=fixture();assert.deepEqual(M.history(d,0,1),[0,1,2]);
  const r=M.record(d,p,0,1,'hgnnp');assert.equal(r.hits,1);assert.equal(r.eligible,true);assert.deepEqual(r.actual,[3]);
  assert.equal(M.record(d,p,1,1,'hgnnp').eligible,false);
  assert.equal(M.record(d,p,2,1,'hgnnp').known,false);
  const miss=M.record(d,p,3,1,'hgnnp');assert.equal(miss.eligible,true);assert.equal(miss.hits,0);
  assert.throws(()=>M.record(d,p,9,1,'mlp'));assert.throws(()=>M.record(d,p,0,2,'mlp'));
});
test('outcome filters retain failures and keep no-new users separate from missed recommendations',()=>{
  const {d,p}=fixture();
  assert.deepEqual(M.candidates(d,p,1,'hgnnp','all'),[0,1,2,3]);
  assert.deepEqual(M.candidates(d,p,1,'hgnnp','new'),[0,2,3]);
  assert.deepEqual(M.candidates(d,p,1,'hgnnp','hit'),[0]);
  assert.deepEqual(M.candidates(d,p,1,'hgnnp','miss'),[3]);
  assert.throws(()=>M.candidates(d,p,1,'hgnnp','unknown'));
});
test('initial user selection depends only on history, never future outcomes',()=>{
  const {d}=fixture();assert.equal(M.initialUser(d,1),0);d.memberships[2]=d.userIds.map(()=>[]);assert.equal(M.initialUser(d,1),0);
});

test('curated cases match the full prediction batch and reject mixed results',()=>{
  const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
  const root=path.resolve(__dirname,'..'),context={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'dist/reddit-data.js'),'utf8'),context);
  const d=JSON.parse(JSON.stringify(context.window.RedditDemoData));
  const network=JSON.parse(fs.readFileSync(path.join(root,'dist/reddit-network.json')));
  const p=JSON.parse(fs.readFileSync(path.join(root,'dist/reddit-predictions.json')));
  const check=require('../scripts/check-reddit-cases.cjs');
  check(d,network,p);
  const wrongMetrics=structuredClone(d);wrongMetrics.metrics.mlp.recall5+=.01;
  assert.throws(()=>check(wrongMetrics,network,p),/metrics differ/);
  const wrongScores=structuredClone(d);wrongScores.cases[0].rankings.mlp[0].score+=.01;
  assert.throws(()=>check(wrongScores,network,p),/ranking or score differs/);
  const wrongTruth=structuredClone(d);wrongTruth.cases[0].truth=[];
  assert.throws(()=>check(wrongTruth,network,p),/truth differs/);
});
