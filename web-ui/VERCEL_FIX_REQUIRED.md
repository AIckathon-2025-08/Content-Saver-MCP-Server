# ⚠️ CRITICAL: Vercel Root Directory Must Be Set in Dashboard

## 🚨 **The Error You're Seeing**

```
Error: No Next.js version detected. Make sure your package.json has "next" in either "dependencies" or "devDependencies". Also check your Root Directory setting matches the directory of your package.json file.
```

## ✅ **The Fix (REQUIRED)**

You **MUST** set the Root Directory in the Vercel Dashboard. This cannot be done in code.

### **Step-by-Step Instructions:**

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Select your project: **Content-Saver-MCP-Server**

2. **Navigate to Settings**
   - Click **Settings** in the top menu
   - Click **General** in the left sidebar

3. **Set Root Directory**
   - Scroll down to find **"Root Directory"** section
   - Click **"Edit"** button
   - Enter: `web-ui`
   - Click **"Save"**

4. **Redeploy**
   - Go to **Deployments** tab
   - Click **"..."** (three dots) on the latest deployment
   - Click **"Redeploy"**
   - Or push a new commit to trigger auto-deploy

## 🔍 **Why This Is Required**

- Vercel's framework detection runs **BEFORE** build commands
- It checks the root directory for `package.json` with Next.js
- Even though install/build commands run in `web-ui`, detection happens first
- Root Directory setting tells Vercel where to look **from the start**

## 📸 **Visual Guide**

```
Vercel Dashboard
├── Your Project
│   ├── Settings
│   │   ├── General
│   │   │   ├── Root Directory: [web-ui] ← SET THIS
│   │   │   ├── Framework Preset: Next.js
│   │   │   └── ...
```

## ✅ **After Setting Root Directory**

You should see in build logs:
- ✅ "Detected Next.js version: 14.0.0"
- ✅ Build completes successfully
- ✅ No "No Next.js version detected" error

## 🎯 **Current Status**

- ✅ `vercel.json` is configured correctly
- ✅ Commands run in `web-ui` directory
- ⚠️ **Root Directory must be set in dashboard** ← YOU NEED TO DO THIS

## 📝 **Alternative: If Root Directory Option Is Missing**

If you don't see the Root Directory option:
1. Make sure you're in **Project Settings** (not Account Settings)
2. Try creating a new project and importing the repo
3. During import, you can set the root directory

## 🚀 **Quick Checklist**

- [ ] Go to Vercel Dashboard
- [ ] Project → Settings → General
- [ ] Set Root Directory to `web-ui`
- [ ] Save
- [ ] Redeploy
- [ ] Verify build succeeds

