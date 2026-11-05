#!/bin/sh
set -e
cd "$(dirname "$0")/convert"
npm run build
if [ "$#" -eq 0 ]; then
    set -- moby-dick action-for-heroes AmarBanglaEPUB BangladeshBishwoporichoyEPUB CurrentSituationEPUB EnglishForTodayEPUB notes-test
fi
for book do
    npm run convert -- "../source-epubs/$book/" "../demos/$book" template
done
