#!/bin/bash

set -o errexit
set -o pipefail
set -o nounset

echo "INFO: build starting at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "INFO: Node version = $(node --version)"
echo "INFO: npm version = $(npm --version)"

./generate_base64.sh

npm run build

echo "INFO: build complete at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
