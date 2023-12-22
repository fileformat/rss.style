#!/bin/bash
#
# script to run on localhost
#
jekyll build --source docs --destination dist
npx wrangler pages dev dist --live-reload --compatibility-date=2023-10-30 --port=4000 --env dev

#jekyll serve --livereload --verbose --watch --source=docs --destination=dist

