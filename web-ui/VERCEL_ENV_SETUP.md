# Vercel Environment Variables Setup

## 🔑 **Required Environment Variables**

### **OPENAI_API_KEY** (Optional but Recommended)

**Purpose**: Enables AI chat functionality with OpenAI GPT-4o

**Required**: No (app works without it, but chat will use basic fallback responses)

**How to get it**:
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-` or `sk-`)

## 📋 **Step-by-Step Setup in Vercel**

### **1. Navigate to Environment Variables**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **Content-Saver-MCP-Server**
3. Go to **Settings** → **Environment Variables**

### **2. Add OPENAI_API_KEY**

1. Click **"Add New"** button
2. **Name**: `OPENAI_API_KEY`
3. **Value**: Paste your OpenAI API key (e.g., `sk-proj-...`)
4. **Environment**: 
   - ✅ **Production** (for production deployments)
   - ✅ **Preview** (for preview deployments - optional)
   - ✅ **Development** (for local development - optional)

5. Click **"Save"**

### **3. Redeploy**

After adding the environment variable:

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Select **"Redeploy"**
4. Or push a new commit to trigger automatic redeploy

## ✅ **Verification**

### **Check if it's set:**

1. Go to **Settings** → **Environment Variables**
2. You should see `OPENAI_API_KEY` listed
3. The value will be hidden (shows as `••••••••`)

### **Test in the app:**

1. Open your deployed app
2. Click the **AI Chat** button
3. Ask a question
4. If API key is set: You'll get intelligent AI responses
5. If not set: You'll get basic fallback responses

## 🔒 **Security Notes**

- ✅ **Environment variables are secure**: Never exposed to client-side code
- ✅ **Server-side only**: Only accessible in API routes
- ✅ **Encrypted at rest**: Vercel encrypts all environment variables
- ✅ **Not in git**: Environment variables are never committed to git

## 📝 **What Happens Without OPENAI_API_KEY?**

The app will still work, but:
- ❌ AI chat will use basic pattern matching
- ❌ No intelligent analysis of saved content
- ❌ No smart tagging suggestions
- ✅ All other features work normally (save, search, delete, etc.)

## 🎯 **Recommended Setup**

For best experience, set `OPENAI_API_KEY` in:
- ✅ **Production** environment (required for production)
- ✅ **Preview** environment (optional, for testing preview deployments)

## 💡 **Tips**

1. **Use different keys for different environments** (optional):
   - Production key for production
   - Test key for preview
   - Easier to track usage and revoke if needed

2. **Monitor usage**:
   - Check OpenAI dashboard for API usage
   - Set usage limits if needed

3. **Rotate keys regularly**:
   - Good security practice
   - Update in Vercel when rotating

## 🚨 **Troubleshooting**

### **"No API key found" in logs:**

1. Check environment variable is set in Vercel
2. Verify it's set for the correct environment (Production/Preview)
3. Redeploy after adding/changing the variable
4. Check the variable name is exactly `OPENAI_API_KEY` (case-sensitive)

### **Chat not working:**

1. Verify API key is valid (test at https://platform.openai.com)
2. Check API key has proper permissions
3. Verify rate limits haven't been exceeded
4. Check Vercel function logs for errors

## 📚 **Additional Resources**

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [OpenAI Usage Dashboard](https://platform.openai.com/usage)

