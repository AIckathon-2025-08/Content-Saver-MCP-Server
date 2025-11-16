# Vercel Root Directory Configuration

## ⚠️ **Important: Root Directory Setting**

The `rootDirectory` property **cannot** be set in `vercel.json`. It must be configured in the **Vercel Dashboard**.

## 📋 **How to Set Root Directory in Vercel Dashboard**

### **Step 1: Go to Project Settings**
1. Open [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **Content-Saver-MCP-Server**
3. Go to **Settings** → **General**

### **Step 2: Set Root Directory**
1. Scroll down to **Root Directory**
2. Click **Edit**
3. Enter: `web-ui`
4. Click **Save**

### **Step 3: Redeploy**
1. Go to **Deployments** tab
2. Click **"..."** on the latest deployment
3. Select **"Redeploy"**

## ✅ **What This Does**

Setting the root directory to `web-ui` tells Vercel:
- The `package.json` with Next.js is in the `web-ui` folder
- Run `npm install` in the `web-ui` directory
- Run `npm run build` in the `web-ui` directory
- The `.next` output directory is in `web-ui/.next`

## 🔍 **Why Not in vercel.json?**

Vercel's `vercel.json` schema doesn't support `rootDirectory` as a property. It's a project-level setting that must be configured in the dashboard.

## 📝 **Current vercel.json**

The `vercel.json` file should only contain:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

These commands will run **relative to the root directory** you set in the dashboard.

## ✅ **Verification**

After setting the root directory:
1. Check the build logs
2. Should see: "Detected Next.js version: 14.0.0"
3. Build should complete successfully

