const assert = require('node:assert/strict');
function checkCases(d, network, p) {
  assert.deepEqual(d.communities, p.communities, 'Case community order differs');
  assert.deepEqual(d.metrics, p.metrics.summary, 'Case aggregate metrics differ');
  assert.equal(d.provenance.commit, p.provenance.training_commit, 'Training version differs');
  assert.equal(d.seed, p.metrics.seed);
  assert.deepEqual(d.testCutoffs, p.metrics.config.test_cutoffs);
  for (const row of d.periodMetrics) {
    for (const method of Object.keys(d.metrics)) assert.deepEqual(row[method], p.metrics.period_results[row.cutoff].methods[method], 'Per-window metrics differ');
  }
  for (const c of d.cases) {
    const u = network.userIds.indexOf(c.userId), t = d.cutoff;
    assert.ok(u >= 0);
    assert.deepEqual(c.history, network.memberships.slice(0, t+1).map(rows=>rows[u]), 'Case history differs');
    assert.deepEqual(c.current, network.memberships[t][u]);
    assert.deepEqual(c.truth, p.periods[t].truth[u], 'Case truth differs');
    for (const method of Object.keys(d.metrics)) assert.deepEqual(c.rankings[method], p.periods[t].rankings[method][u].map(([community,score])=>({community,score})), 'Case ranking or score differs');
    for (const peer of c.peers) assert.deepEqual(peer.communities, network.memberships[t][network.userIds.indexOf(peer.userId)]);
    assert.ok(c.rankings.hgnnp.some(r=>c.truth.includes(r.community)));
    assert.ok(c.rankings.mlp.every(r=>!c.truth.includes(r.community)));
    if (c.story) {
      const s=c.story,b=network.userIds.indexOf(s.bridgeUserId),rows=network.memberships[t];
      assert.ok(b>=0 && b!==u, 'Invalid bridge user');
      assert.ok(c.peers.some(peer=>peer.userId===s.bridgeUserId && peer.label===s.bridgeLabel), 'Bridge missing from graph');
      assert.ok(c.current.includes(s.source) && !c.seen.includes(s.target), 'Invalid source or prior target membership');
      assert.ok(rows[b].includes(s.source) && rows[b].includes(s.target), 'Bridge does not connect the two groups');
      const common=network.memberships.slice(0,t).flatMap((r,i)=>r[u].includes(s.source)&&r[b].includes(s.source)?[i]:[]);
      assert.equal(s.sharedPeriod,common.at(-1),'Shared history differs');
      assert.equal(s.bridgeEntryPeriod,t);
      assert.ok(network.memberships.slice(0,t).every(r=>!r[b].includes(s.target)), 'Bridge target entry is not new');
      assert.deepEqual(c.truth,[s.target]);
      for (const m of ['mlp','overlap','popular']) assert.ok(c.rankings[m].every(r=>!c.truth.includes(r.community)), 'Baseline contrast differs');
      assert.equal(s.hgnnpRank,c.rankings.hgnnp.findIndex(r=>r.community===s.target)+1);
      const a=rows.filter(cs=>cs.includes(s.source)).length,z=rows.filter(cs=>cs.includes(s.target)).length;
      const shared=rows.filter(cs=>cs.includes(s.source)&&cs.includes(s.target)).length;
      assert.equal(s.shared,shared,'Shared count differs');
      assert.equal(s.sourceSize,a);assert.equal(s.targetSize,z);
      assert.ok(Math.abs(s.jaccard-shared/(a+z-shared))<1e-12);
      assert.ok(Math.abs(s.lift-(shared/a)/(z/rows.length))<1e-12);
      const policy=d.provenance.selectionPolicy;
      assert.ok(shared>=policy.min_shared && s.jaccard>=policy.min_jaccard && s.lift>=policy.min_lift);
    }
  }
}
module.exports = checkCases;
