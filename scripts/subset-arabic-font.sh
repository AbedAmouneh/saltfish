#!/usr/bin/env bash
# Rebuilds app/fonts/noto-kufi-arabic-subset.woff2 (≈43 KB instead of 124 KB):
# Noto Kufi Arabic limited to weights 400–800 and the standard Arabic block used in Lebanon.
# Needs Python fonttools + brotli: pip install fonttools brotli
set -euo pipefail
SRC=node_modules/@fontsource-variable/noto-kufi-arabic/files/noto-kufi-arabic-arabic-wght-normal.woff2
TMP=$(mktemp -d)
python3 -m fontTools.varLib.instancer "$SRC" wght=400:800 -o "$TMP/kufi.ttf"
pyftsubset "$TMP/kufi.ttf" \
  --unicodes="U+0600-06FF,U+200C-200F,U+2010-2011,U+204F,U+25CC,U+FB50-FB51,U+FE70-FE74,U+FE76-FEFC" \
  --layout-features='*' --flavor=woff2 --output-file=app/fonts/noto-kufi-arabic-subset.woff2
rm -rf "$TMP"
ls -lh app/fonts/noto-kufi-arabic-subset.woff2
