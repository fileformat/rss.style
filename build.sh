#!/bin/bash

set -o errexit
set -o pipefail
set -o nounset

echo "INFO: build starting at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "INFO: Jekyll location = $(which jekyll)"
echo "INFO: Jekyll version = $(jekyll --version)"

# check if minify is installed
MINIFY="$(go env GOPATH)/bin/minify"
if [ ! -f "${MINIFY}" ];
then
    echo "INFO: minify could not be found, installing"
    go install github.com/tdewolff/minify/cmd/minify@latest
fi

cat docs/xslt/simple-rss.xslt | "${MINIFY}" --type=xml | base64 --wrap=0 > docs/xslt/simple-rss.base64
cat docs/xslt/simple-atom.xslt | "${MINIFY}" --type=xml | base64 --wrap=0 > docs/xslt/simple-atom.base64

jekyll build --source docs

echo "INFO: build complete at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
