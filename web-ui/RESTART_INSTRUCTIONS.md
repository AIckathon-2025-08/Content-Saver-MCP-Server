# 🔧 Fix API Key Issue

## Problem
The chat shows: "For advanced AI analysis, configure OPENAI_API_KEY in your environment variables."

## Solution

### Step 1: Verify .env.local exists
```bash
cd web-ui
cat .env.local
```

You should see:
```
OPENAI_API_KEY=sk-proj-...
```

### Step 2: **RESTART THE DEV SERVER** ⚠️

**This is the most important step!** Next.js only loads `.env.local` when the server starts.

1. **Stop the current server:**
   - Find the terminal where `npm run dev` is running
   - Press `Ctrl+C` (or `Cmd+C` on Mac)

2. **Start it again:**
   ```bash
   cd web-ui
   npm run dev
   ```

### Step 3: Verify it's working

After restarting, check the server console logs. When you send a chat message, you should see:
```
Chat API called: { hasApiKey: true, apiKeyPrefix: 'sk-proj-Jz...' }
Using OpenAI API with X items
```

If you see `hasApiKey: false`, the environment variable isn't loading.

### Troubleshooting

If restarting doesn't work:

1. **Check file location:**
   - Make sure `.env.local` is in the `web-ui` directory (not root)
   - Path should be: `web-ui/.env.local`

2. **Check file format:**
   - No spaces around `=`
   - No quotes around the value
   - Should be: `OPENAI_API_KEY=sk-proj-...`

3. **Check for typos:**
   ```bash
   cd web-ui
   grep OPENAI_API_KEY .env.local
   ```

4. **Verify Next.js is reading it:**
   - Check server logs for: `envKeys: 'OPENAI_API_KEY'`
   - If empty, the file isn't being loaded

### Quick Test Script

Run this to verify the file:
```bash
cd web-ui
node check-env.js
```

