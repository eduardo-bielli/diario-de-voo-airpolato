#!/bin/bash
set -e
cp teste-cache.html deploy/index.html
echo "OK: teste-cache.html -> deploy/index.html"
echo "Tamanho: $(wc -c < deploy/index.html) bytes  ($(date '+%H:%M:%S'))"
echo ""
echo "Agora arrasta a pasta 'deploy' no Netlify:"
echo "  https://app.netlify.com/drop"
