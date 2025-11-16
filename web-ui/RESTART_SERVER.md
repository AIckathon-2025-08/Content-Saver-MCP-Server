# Restart Server to Load API Key

## Important: Restart Required

The `.env.local` file has been created with your OpenAI API key, but **Next.js needs to be restarted** to load environment variables.

## Steps:

1. **Stop the current dev server:**
   - Find the terminal where `npm run dev` is running
   - Press `Ctrl+C` to stop it

2. **Start it again:**
   ```bash
   cd web-ui
   npm run dev
   ```

3. **Verify it's working:**
   - Open the chat panel in your browser
   - Ask: "How many items do I have?"
   - You should get a proper response using OpenAI

## Troubleshooting:

If it still doesn't work:

1. **Check the API key is loaded:**
   - Look at the server console logs
   - You should see: `hasApiKey: true` in the logs

2. **Verify the .env.local file:**
   ```bash
   cd web-ui
   cat .env.local
   ```

3. **Check server logs:**
   - When you send a chat message, check the terminal
   - Look for "Chat API called" logs
   - Check for any error messages

4. **Test the API directly:**
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"test","items":[]}'
   ```

