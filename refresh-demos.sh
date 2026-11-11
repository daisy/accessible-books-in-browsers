#!/bin/sh
set -e
cd "$(dirname "$0")/convert"
npm run build
if [ "$#" -eq 0 ]; then
    set -- moby-dick action-for-heroes AmarBanglaEPUB BangladeshBishwoporichoyEPUB CurrentSituationEPUB EnglishForTodayEPUB math-optimization-ml notes-test
fi
for book do
    npm run convert -- "../source-epubs/$book/" "../demos/$book" template --audio-cache \
        --audio-enhance warm-eq,compression,noise,deess,declick --small-audio
done
