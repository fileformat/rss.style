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

for FILE in "${FILES[@]}"
do
    echo "INFO: generating base64 for ${FILE}"
    cat "docs/xslt/${FILE}.xslt" | "${MINIFY}" --type=xml | base64 --wrap=0 > "docs/xslt/${FILE}.base64"
    cp "docs/xslt/${FILE}.base64" "docs/xslt/_${FILE}.base64.html"
done