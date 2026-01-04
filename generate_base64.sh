#!/usr/bin/env bash
#
# generate the base64 encoded versions of the xslt files
#

set -o errexit
set -o pipefail
set -o nounset

echo "INFO: starting minification at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

GOBIN="$(go env GOBIN)"
# if not set use GOPATH/bin
if [ -z "${GOBIN}" ]; then
    GOBIN="$(go env GOPATH)/bin"
fi

# check if minify is installed
MINIFY="${GOBIN}/minify"
if [ ! -f "${MINIFY}" ];
then
    echo "INFO: minify could not be found, installing"
    go install github.com/tdewolff/minify/cmd/minify@latest
fi

if [ ! -f "${MINIFY}" ];
then
    echo "ERROR: minify could not be found at '${MINIFY}'"
    echo "INFO: output from 'ls -lR $(go env GOPATH)'"
    ls -lR "$(go env GOPATH)"
    echo "INFO: output from 'go env'"
    go env
    echo "INFO: output from 'go env GOBIN'"
    go env GOBIN
    echo "INFO: exiting"
    exit 1
fi

FILES=(simple-rss simple-atom)
TYPES=(css xslt)

for TYPE in "${TYPES[@]}"
do
    for FILE in "${FILES[@]}"
    do
        if [ "${TYPE}" == "xslt" ]; then
            MINIFY_TYPE="xml"
        else
            MINIFY_TYPE="${TYPE}"
        fi
        echo "INFO: generating base64 for ${FILE} ${TYPE}"
        cat "docs/${TYPE}/${FILE}.${TYPE}" | "${MINIFY}" --type=${MINIFY_TYPE} | base64 --wrap=0 > "docs/${TYPE}/${FILE}.base64"
        cp "docs/${TYPE}/${FILE}.base64" "docs/${TYPE}/_${FILE}.base64.html"
    done
done

JSFILES=(rss-style atom-style)

for JSFILE in "${JSFILES[@]}"
do
    echo "INFO: generating minified version of ${JSFILE}.js"
    "${MINIFY}" --type=js "docs/js/${JSFILE}.js" > "docs/js/${JSFILE}.min.js"
    cp "docs/js/${JSFILE}.min.js" "docs/js/_${JSFILE}.min.html"
done

echo "INFO: completed minification at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
