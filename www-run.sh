#!/bin/bash
#
# script to run on localhost
#

set -o errexit
set -o pipefail
set -o nounset

jekyll serve --livereload --verbose --watch --source=docs --destination=dist --port 4000

