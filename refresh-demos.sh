#!/bin/sh
set -e
cd "$(dirname "$0")/convert"
npm run build
for book in moby-dick action-for-heroes AmarBanglaEPUB BangladeshBishwoporichoyEPUB CurrentSituationEPUB EnglishForTodayEPUB; do
    npm run convert -- "../source-epubs/$book/" "../demos/$book" template --heading-titles
done
