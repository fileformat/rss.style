#!/usr/bin/env bash
#
# build Astro site
#

set -o errexit
set -o pipefail
set -o nounset

echo "INFO: build starting at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "INFO: Node location = $(which node)"
echo "INFO: npm version = $(npm --version)"

echo "INFO: CI=${CI:-not set}"
echo "INFO: CF_PAGES=${CF_PAGES:-not set}"
echo "INFO: WORKERS_CI=${WORKERS_CI:-not set}"
echo "INFO: WORKERS_CI_COMMIT_SHA=${WORKERS_CI_COMMIT_SHA:-not set}"

echo "INFO: setting build information"
jq -n \
    --arg commit "${WORKERS_CI_COMMIT_SHA:0:7}" \
    --arg lastmod "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{commit: $commit, lastmod: $lastmod}' \
    > src/data/build.json

npm run build

echo "INFO: build complete at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
