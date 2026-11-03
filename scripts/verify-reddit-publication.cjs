// Validate the exact public exports with the same rules used by the browser.
// No training, data regeneration, or changes to the source files.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const map = require('../dist/reddit-map-model.js');
const forecast = require('../dist/reddit-forecast-model.js');

const root = path.resolve(__dirname, '..');
const files = ['reddit-network.json', 'reddit-predictions.json'];
const buffers = files.map(file => fs.readFileSync(path.join(root, 'dist', file)));
const network = map.validate(JSON.parse(buffers[0]));
const predictions = forecast.validate(network, JSON.parse(buffers[1]));
if (!network.userIds.every(id => /^u_[0-9a-f]{10}$/.test(id))) {
  throw new Error('Public demo exports must use anonymized user IDs.');
}
const summary = {
  users: network.userIds.length,
  communities: network.communities.length,
  historyPeriods: network.periods.length,
  predictionCutoffs: Object.keys(predictions.periods).map(Number),
  methods: Object.keys(forecast.methods),
  trainingCommit: predictions.provenance.training_commit,
  files: files.map((file, i) => ({
    file,
    bytes: buffers[i].length,
    sha256: crypto.createHash('sha256').update(buffers[i]).digest('hex'),
  })),
};
console.log(JSON.stringify(summary, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '\nValidated public Reddit exports:\n```json\n' + JSON.stringify(summary, null, 2) + '\n```\n');
}
