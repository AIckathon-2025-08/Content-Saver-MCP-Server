#!/bin/bash

# Script to restart Next.js dev server with environment variables loaded

echo "🔄 Restarting Next.js dev server..."
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found!"
    echo "Creating .env.local..."
    echo "OPENAI_API_KEY=your-api-key-here" > .env.local
    echo "⚠️  Please replace 'your-api-key-here' with your actual OpenAI API key"
fi

echo "✅ .env.local exists"
echo ""

# Kill existing process on port 3000
echo "🛑 Stopping existing server on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2

echo "🚀 Starting new dev server..."
echo ""
npm run dev

echo ""
echo "Server should now be running with API key loaded!"
echo "Check the console for: 'hasApiKey: true'"

