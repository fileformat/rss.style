#!/bin/bash
#
# script to run the app on localhost
#

set -o errexit
set -o pipefail
set -o nounset

npx wrangler pages dev dist --live-reload --compatibility-date=2023-10-30 --compatibility-flags="nodejs_compat" --port=4000
