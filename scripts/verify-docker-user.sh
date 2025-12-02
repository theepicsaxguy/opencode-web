#!/bin/bash

set -e

echo "🔍 Building Docker image..."
docker build -t opencode-web-test . > /dev/null 2>&1 || {
    echo "❌ Docker build failed"
    exit 1
}

echo "✅ Docker image built successfully"

echo ""
echo "🔍 Verifying container runs as non-root user..."

USER_CHECK=$(docker run --rm opencode-web-test id -u)
if [ "$USER_CHECK" != "1000" ]; then
    echo "❌ Container is not running as UID 1000 (found: $USER_CHECK)"
    exit 1
fi

echo "✅ Container runs as UID 1000 (node user)"

echo ""
echo "🔍 Verifying user details..."
docker run --rm opencode-web-test id

echo ""
echo "🔍 Verifying directory permissions..."

echo "Checking /workspace..."
docker run --rm opencode-web-test test -w /workspace && echo "✅ /workspace is writable" || {
    echo "❌ /workspace is not writable"
    exit 1
}

echo "Checking /app/data..."
docker run --rm opencode-web-test test -w /app/data && echo "✅ /app/data is writable" || {
    echo "❌ /app/data is not writable"
    exit 1
}

echo "Checking /app..."
docker run --rm opencode-web-test test -w /app && echo "✅ /app is writable" || {
    echo "❌ /app is not writable"
    exit 1
}

echo ""
echo "🔍 Verifying Bun installation..."
docker run --rm opencode-web-test test -d /home/node/.bun && echo "✅ Bun directory exists" || {
    echo "❌ Bun directory not found"
    exit 1
}

echo ""
echo "🔍 Verifying OpenCode installation..."
docker run --rm opencode-web-test test -d /home/node/.opencode && echo "✅ OpenCode directory exists" || {
    echo "❌ OpenCode directory not found"
    exit 1
}

echo ""
echo "✅ All security checks passed!"
echo ""
echo "Summary:"
echo "- Container runs as non-root user (node, UID 1000)"
echo "- Required directories are writable by the node user"
echo "- Bun and OpenCode are installed in user directory"
echo "- Ready for deployment on Kubernetes with PSP/PSA enabled"
