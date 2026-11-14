#!/bin/sh
# Regenerates the demos from source-epubs/, all books at once (each is a separate conversion;
# with the audio cache, the whole set takes under a minute). Name books to regenerate only those.
# A book whose source isn't here (the math sample is kept out of git for now) is skipped.
set -e
cd "$(dirname "$0")/convert"
npm run build
if [ "$#" -eq 0 ]; then
    set -- moby-dick action-for-heroes AmarBanglaEPUB BangladeshBishwoporichoyEPUB CurrentSituationEPUB EnglishForTodayEPUB math-optimization-ml notes-test kusamakura
fi
logs=$(mktemp -d)
for book do
    if [ ! -d "../source-epubs/$book" ]; then
        echo "$book: skipped, no source-epubs/$book"
        continue
    fi
    (
        if node build/index.js convert "../source-epubs/$book/" "../demos/$book" template --audio-cache \
            > "$logs/$book.log" 2>&1
        then echo "$book: done"
        else echo "$book: FAILED" > "$logs/$book.failed"; echo "$book: FAILED, last lines of its log:"; tail -20 "$logs/$book.log"
        fi
    ) &
done
wait
if ls "$logs"/*.failed > /dev/null 2>&1; then
    echo "Some books failed; logs are in $logs"
    exit 1
fi
rm -rf "$logs"
