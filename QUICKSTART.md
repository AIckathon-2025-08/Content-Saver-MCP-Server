# Quick Start Guide

## 🚀 Getting Started

### 1. Install Dependencies

```bash
# Install MCP Server dependencies
npm install

# Install Web UI dependencies
cd web-ui
npm install
cd ..
```

### 2. Build MCP Server

```bash
npm run build
```

This compiles the TypeScript MCP server to `dist/` directory.

### 3. Run Web UI

```bash
cd web-ui
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Test the Application

1. **Add a Note:**
   - Click "+ Note" button
   - Enter title and content
   - Add tags (comma-separated)
   - Click "Save"

2. **Add a Link:**
   - Click "+ Link" button
   - Enter URL (required)
   - Add title and description (optional)
   - Add tags (optional)
   - Click "Save"

3. **Search:**
   - Use the search bar to find items
   - Filter by type using sidebar (Notes/Links)
   - View recent items

4. **View Details:**
   - Click on any item to see full details
   - Delete items from the detail panel

## 📦 Project Structure

```
Content-Saver-MCP-Server/
├── src/              # MCP Server source
│   ├── index.ts      # MCP server entry point
│   ├── storage.ts    # Storage layer
│   └── types.ts      # TypeScript types
├── dist/             # Compiled MCP server
├── web-ui/           # Next.js Web UI
│   ├── app/          # Next.js app directory
│   │   ├── api/      # API routes
│   │   ├── page.tsx  # Main page
│   │   └── layout.tsx
│   ├── components/   # React components
│   └── lib/          # Utilities
└── .content-saver/   # Data storage (created automatically)
    └── items.json    # Saved items
```

## 🔧 Development

### MCP Server Development

```bash
# Watch mode (auto-rebuild on changes)
npm run dev

# Build once
npm run build

# Run server
npm start
```

### Web UI Development

```bash
cd web-ui

# Development server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🌐 Deployment to Vercel

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure:**
   - Root Directory: `web-ui`
   - Build Command: `npm run build` (or leave default)
   - Output Directory: `.next` (or leave default)

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live!

## 📝 Notes

- **Data Storage**: All items are stored in `.content-saver/items.json`
- **MCP Server**: Runs on stdio (for AI clients like Claude Desktop)
- **Web UI**: Uses Next.js API routes to access storage (server-side only)
- **No Database**: Everything is file-based, no external services needed

## 🐛 Troubleshooting

### MCP Server won't build
- Check Node.js version: `node --version` (should be 18+)
- Delete `node_modules` and `dist`, then `npm install` again

### Web UI won't start
- Make sure MCP server is built first: `npm run build`
- Check that `dist/storage.js` exists
- Try deleting `web-ui/node_modules` and reinstalling

### API routes return errors
- Ensure MCP server is built: `npm run build`
- Check that storage directory exists: `.content-saver/`
- Verify file permissions

## 📚 Next Steps

- Configure MCP server with Claude Desktop or Cursor
- Customize the UI styling
- Add more features (editing, export, etc.)
- Deploy to Vercel for public access

