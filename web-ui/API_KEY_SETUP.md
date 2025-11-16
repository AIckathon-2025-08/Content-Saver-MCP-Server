# OpenAI API Key Setup

## 🔒 **Security: Server-Side Only**

For security, API keys are **only** configured server-side using environment variables. Client-side storage has been removed.

## 📋 **Setup Instructions**

### **Local Development**

1. **Create `.env.local` file** in the `web-ui` directory:
   ```bash
   cd web-ui
   touch .env.local
   ```

2. **Add your API key** to `.env.local`:
   ```
   OPENAI_API_KEY=sk-proj-your-actual-api-key-here
   ```

3. **Restart the development server**:
   ```bash
   npm run dev
   ```

4. **Verify it's loaded**:
   - Check the console for: `✅ OPENAI_API_KEY is configured`
   - The chat should now use OpenAI API

### **Production (Vercel)**

1. **Go to Vercel Dashboard**:
   - Navigate to your project
   - Go to **Settings** → **Environment Variables**

2. **Add Environment Variable**:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: `sk-proj-your-actual-api-key-here`
   - **Environment**: Production (and Preview if needed)

3. **Redeploy**:
   - Vercel will automatically redeploy
   - Or manually trigger a redeploy

4. **Verify**:
   - Test the chat feature
   - Should work without any client-side configuration

## ✅ **Verification**

### **Local Development:**
```bash
# Check if .env.local exists
ls -la web-ui/.env.local

# Verify API key is set (without showing the key)
grep -q "OPENAI_API_KEY=" web-ui/.env.local && echo "✅ API key is set" || echo "❌ API key not found"
```

### **Production:**
- Check Vercel logs for API key status
- Test chat functionality
- Should work without any client-side setup

## 🔒 **Security Features**

- ✅ **Server-side only**: API keys never exposed to client
- ✅ **Environment variables**: Secure storage
- ✅ **No localStorage**: Removed for security
- ✅ **Rate limiting**: 20 requests per minute per IP
- ✅ **HTTPS required**: All requests encrypted in transit

## ⚠️ **Important Notes**

1. **Never commit `.env.local`**:
   - Already in `.gitignore`
   - Contains sensitive credentials

2. **Rotate keys if exposed**:
   - If key is compromised, rotate immediately
   - Update in both local and production environments

3. **Use different keys for dev/prod**:
   - Different keys for different environments
   - Easier to track usage and revoke if needed

## 🚨 **Troubleshooting**

### **"No API key found" error:**

1. **Check `.env.local` exists**:
   ```bash
   ls web-ui/.env.local
   ```

2. **Check key is set**:
   ```bash
   grep OPENAI_API_KEY web-ui/.env.local
   ```

3. **Restart server**:
   - Environment variables load on server start
   - Must restart after adding/changing

4. **Check format**:
   ```
   OPENAI_API_KEY=sk-proj-... (no quotes, no spaces around =)
   ```

### **Chat not using OpenAI:**

1. **Verify API key is loaded**:
   - Check server console logs
   - Should see: `✅ OPENAI_API_KEY is configured`

2. **Check API key is valid**:
   - Test with OpenAI API directly
   - Ensure key has proper permissions

3. **Check rate limits**:
   - OpenAI has usage limits
   - Check your OpenAI dashboard

## 📚 **Additional Resources**

- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
