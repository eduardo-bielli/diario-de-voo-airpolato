#!/bin/bash
# dev.sh — sobe um server local em http://localhost:8000
cd "$(dirname "$0")"

# Mata server anterior na mesma porta (se houver)
lsof -ti:8000 | xargs kill -9 2>/dev/null

echo ""
echo "🌐 Diário de Voo — servidor local"
echo "   → http://localhost:8000/teste-cache.html"
echo "   (Ctrl+C pra parar)"
echo ""

python3 -m http.server 8000
