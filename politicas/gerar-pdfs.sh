#!/usr/bin/env bash
# Gera os PDFs das políticas a partir dos arquivos .md nesta pasta.
# Dependências:
#   - Python 3 com o pacote `markdown` (pip3 install --user markdown)
#   - Google Chrome instalado em /Applications/Google Chrome.app
set -euo pipefail

cd "$(dirname "$0")"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

for md in termos-de-uso-v1.md politica-de-privacidade-v1.md; do
  base="${md%.md}"
  html="${base}.html"
  pdf="${base}.pdf"

  python3 md-to-html.py "$md" > "$html"
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="$pdf" "file://$(pwd)/$html" 2>/dev/null
  rm -f "$html"
  echo "Gerado: $pdf"
done
