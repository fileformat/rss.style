#!/usr/bin/env bash
#
# generate the base64 encoded versions of the xslt files
#

set -o errexit
set -o pipefail
set -o nounset

# check if minify is installed
MINIFY="$(go env GOPATH)/bin/minify"
if [ ! -f "${MINIFY}" ];
then
    echo "INFO: minify could not be found, installing"
    go install github.com/tdewolff/minify/cmd/minify@latest
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