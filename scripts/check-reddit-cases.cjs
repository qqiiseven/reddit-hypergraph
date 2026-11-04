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
  }
}
module.exports = checkCases;
