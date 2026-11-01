#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p data/raw
curl --fail --location --retry 3 --continue-at - \
  --output data/raw/reddit_reply_networks.tar.gz \
  https://snap.stanford.edu/data/reddit_reply_networks.tar.gz
