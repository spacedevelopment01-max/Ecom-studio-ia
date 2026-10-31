#!/usr/bin/env bash
# Prépare la version story (1080 x 1920) : copies des scènes avec la taille du format, mêmes médias.
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
DST="${1:-$SRC/../syna-3m-story}"
mkdir -p "$DST/compositions"
for f in "$SRC"/compositions/*.html; do
  sed 's/data-width="1920" data-height="1080"/data-width="1080" data-height="1920"/' "$f" > "$DST/compositions/$(basename "$f")"
done
ln -sfn "$SRC/assets" "$DST/assets"
python3 - "$SRC/index.html" "$DST/index.html" <<'PY'
import sys
t = open(sys.argv[1]).read()
s = t.replace('data-width="1920" data-height="1080"', 'data-width="1080" data-height="1920"')
s = s.replace('<meta name="viewport" content="width=1920, height=1080" />', '<meta name="viewport" content="width=1080, height=1920" />\n    <script>window.FMT = "story";</script>')
s = s.replace("html, body { width: 1920px; height: 1080px;", "html, body { width: 1080px; height: 1920px;")
s = s.replace('data-composition-id="main"', 'data-composition-id="main-story"').replace('window.__timelines["main"]', 'window.__timelines["main-story"]')
open(sys.argv[2], "w").write(s)
PY
cp "$SRC/package.json" "$SRC/hyperframes.json" "$DST/" 2>/dev/null || true
echo "story prête : $DST"
