#!/bin/bash
#
# script to run on localhost
#

set -o errexit
set -o pipefail
set -o nounset

# from https://stackoverflow.com/a/52033580
(trap 'kill 0' SIGINT; \
    jekyll serve --livereload --verbose --watch --source=docs --destination=dist --port 4001 \
    & \
    npx wrangler pages dev dist --live-reload --compatibility-date=2023-10-30 --compatibility-flags="nodejs_compat" --port=4000 \
)

