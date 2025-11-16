#!/bin/bash

echo "🔧 Fixing AI Chat - Restarting with API Key"
echo "=========================================="
echo ""

# Navigate to web-ui directory
cd "$(dirname "$0")"

# Check .env.local
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found! Creating it..."
    echo "OPENAI_API_KEY=your-api-key-here" > .env.local
    echo "⚠️  Please replace 'your-api-key-here' with your actual OpenAI API key"
    echo "✅ Created .env.local"
else
    echo "✅ .env.local exists"
fi

echo ""
echo "🛑 Stopping any existing Next.js server..."
# Kill existing Next.js processes
pkill -f "next dev" 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2

echo "✅ Server stopped"
echo ""
echo "🚀 Starting Next.js dev server..."
echo "   Port: 3002 (if 3000 is busy)"
echo ""

# Try port 3002 first, then 3000
PORT=3002 npm run dev 2>&1 | while IFS= read -r line; do
    echo "$line"
    if echo "$line" | grep -q "hasApiKey"; then
        echo ""
        echo "✅✅✅ API KEY STATUS DETECTED ✅✅✅"
    fi
done

echo ""
echo "=========================================="
echo "If you see 'hasApiKey: true' above, the fix worked!"
echo "If you see 'hasApiKey: false', the API key is not loading."

