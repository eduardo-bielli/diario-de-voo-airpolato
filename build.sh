#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "→ Web build..."
cp "$ROOT/teste-cache.html" "$ROOT/deploy/index.html"

echo "→ Mobile build (copiando assets)..."
mkdir -p "$ROOT/capacitor-app/www"
cp -r "$ROOT/deploy/." "$ROOT/capacitor-app/www/"
cp "$ROOT/teste-cache.html" "$ROOT/capacitor-app/www/index.html"

echo "→ Capacitor sync (iOS)..."
if [ -d "$ROOT/capacitor-app/ios" ]; then
cd "$ROOT/capacitor-app" && npx cap sync ios && cd "$ROOT"
fi

echo ""
echo "✅ Build completo."
echo "   Web:    deploy/index.html"
echo "   Mobile: capacitor-app/www/index.html"
