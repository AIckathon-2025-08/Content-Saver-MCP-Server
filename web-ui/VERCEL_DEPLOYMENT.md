# Vercel Deployment Guide

## ✅ Pre-Deployment Checklist

### 1. Build Test
- ✅ Production build succeeds
- ✅ No TypeScript errors
- ✅ All components compile

### 2. Environment Variables
Set these in Vercel dashboard:
- `OPENAI_API_KEY` (optional - users can set in UI)

### 3. Storage Behavior
- **Local Development**: Uses MCP protocol when available
- **Vercel**: Automatically falls back to direct storage
- Storage file: `.content-saver/items.json` (created automatically)

### 4. Important Notes

#### MCP Server on Vercel
- The MCP server **will not be available** on Vercel
- The app automatically falls back to direct storage
- All functionality works without MCP server
- This is expected and handled gracefully

#### Storage Persistence
- ⚠️ **Important**: Vercel serverless functions are stateless
- Data stored in `.content-saver/items.json` will be **ephemeral**
- Each deployment/restart may reset data
- For persistent storage, consider:
  - Vercel KV (Redis)
  - Vercel Postgres
  - External database

## 🚀 Deployment Steps

### Option 1: Deploy from GitHub (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push
   ```

2. **Connect to Vercel**:
   - Go to https://vercel.com
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Build Settings**:
   - **Root Directory**: `web-ui`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

4. **Set Environment Variables**:
   - `OPENAI_API_KEY` (optional)

5. **Deploy**

### Option 2: Deploy via Vercel CLI

```bash
cd web-ui
npm install -g vercel
vercel
```

## 📋 Vercel Configuration

The `vercel.json` file is already configured:
- Framework: Next.js
- Build command: `npm run build`
- Output directory: `.next`

## 🔧 Build Configuration

### Root Directory
If deploying from monorepo root:
- Set **Root Directory** in Vercel to: `web-ui`

### Build Command
```bash
cd web-ui && npm install && npm run build
```

### Install Command
```bash
npm install
```

## ⚠️ Known Limitations on Vercel

1. **MCP Server**: Not available (automatic fallback to direct storage)
2. **File Storage**: Ephemeral (resets on deployment)
3. **Process Spawning**: Not available (handled gracefully)

## ✅ What Works on Vercel

- ✅ All UI components
- ✅ Save notes/links (via direct storage)
- ✅ Delete items (via direct storage)
- ✅ Search functionality
- ✅ AI Chat (if OpenAI API key is set)
- ✅ All CRUD operations

## 🧪 Testing After Deployment

1. **Test Basic Functionality**:
   - Add a note
   - Add a link
   - Search items
   - Delete an item

2. **Test AI Chat**:
   - Set API key in UI settings
   - Ask a question
   - Verify responses

3. **Test Error Handling**:
   - Try invalid operations
   - Verify error messages appear

## 📝 Post-Deployment

### Monitor Logs
- Check Vercel function logs for errors
- Monitor API route performance

### Environment Variables
- Ensure `OPENAI_API_KEY` is set if needed
- Users can also set it in UI settings

### Storage Considerations
For production use with persistent storage, consider:
- Adding a database integration
- Using Vercel KV for storage
- Implementing a proper backend service

