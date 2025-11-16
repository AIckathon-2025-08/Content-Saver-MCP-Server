# Content Saver MCP Server + Next.js Web UI

## 🚨 Problem Statement

Modern AI tools (ChatGPT, Claude, Cursor, etc.) make it easy to generate insights, discover useful links, brainstorm ideas, and gather knowledge — but there’s no simple, private, consistent way to save or retrieve this information later.

Today:

- Important content gets buried in long chat histories  
- Notes and useful links end up scattered across Notion, bookmarks, docs, chats, screenshots, and dozens of different apps  
- There is no unified personal “memory layer” that works across AI tools  
- Existing solutions are often heavy, require manual organization, or send data to the cloud  
- Many users prefer local-first, private, offline storage  
- And there is still no universal “save this” command that works the same way in ChatGPT, Claude, Cursor, and other AI assistants

As a result, valuable knowledge becomes fragmented, lost, or difficult to reuse.

---

## 🎯 Goal

Provide a lightweight, local-first, AI-integrated way to:

- Save notes and links instantly (via AI or web UI)  
- Auto-tag content (client-side AI tagging)  
- Prevent duplicate URLs  
- Search, filter, and retrieve saved content  
- Keep everything local, private, and under the user’s control  
- Access everything through a clean Next.js Web UI or via any MCP-enabled AI assistant

---

## 💡 Why This Project Exists

**Content Saver MCP** is a minimal “personal knowledge vault” that:

- Works with any MCP-enabled AI assistant  
- Lets you use natural language to save and search content  
- Stores everything locally in a simple JSON format  
- Provides a lightweight web dashboard for browsing, filtering, and managing your content  
- Avoids cloud dependency, databases, and complex configuration  
- Delivers the missing “memory layer” modern AI workflows need

It's simple, local-first, private — and built to integrate naturally into everyday AI usage.

## Features

### MCP Server
- ✅ **Save Notes** - Store text notes with optional titles and tags
- ✅ **Save Links** - Store URLs with optional metadata
- ✅ **URL Deduplication** - Automatically prevents duplicate link entries
- ✅ **Smart Tagging** - Accepts AI-generated tags (tags provided by AI client)
- ✅ **Search** - Search items by query, tags, and date range
- ✅ **List Recent** - Get recently saved items
- ✅ **Delete Items** - Remove saved items by ID
- ✅ **Local Storage** - All data stored locally in JSON format

### Web UI
- ✅ **View Items** - Browse all saved notes and links
- ✅ **Search & Filter** - Search by keyword, filter by type (notes/links), filter by tags
- ✅ **Add Items** - Create new notes or save links through the UI
- ✅ **Item Details** - View full item details in a side panel
- ✅ **Delete Items** - Remove items with confirmation
- ✅ **Recent Items** - Quick access to recently saved content
- ✅ **AI Chat Assistant** - Chat with an AI assistant that analyzes your saved content

## Project Structure

```
Content-Saver-MCP-Server/
├── src/                    # MCP Server source code
│   ├── index.ts           # MCP server implementation
│   ├── storage.ts         # Storage layer
│   └── types.ts           # TypeScript types
├── web-ui/                 # Next.js Web UI
│   ├── app/               # Next.js app directory
│   │   ├── api/           # API routes (server-side only)
│   │   ├── page.tsx       # Main page
│   │   └── layout.tsx     # Root layout
│   ├── components/        # React components
│   └── lib/               # Utilities
└── dist/                  # Compiled MCP server
```

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

1. **Clone the repository:**
```bash
git clone <repository-url>
cd Content-Saver-MCP-Server
```

2. **Install MCP Server dependencies:**
```bash
npm install
```

3. **Build MCP Server:**
```bash
npm run build
```

4. **Install Web UI dependencies:**
```bash
cd web-ui
npm install
```

## Usage

### MCP Server

The MCP server runs on stdio and communicates via the MCP protocol:

```bash
npm start
```

**Configure with AI clients:**
- **Claude Desktop**: Add to `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Cursor**: Add to `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "content-saver": {
      "command": "node",
      "args": ["/path/to/Content-Saver-MCP-Server/dist/index.js"]
    }
  }
}
```

### Web UI

**Development:**
```bash
cd web-ui
npm run dev
```

Visit `http://localhost:3000` to use the web interface.

**Production Build:**
```bash
cd web-ui
npm run build
npm start
```

## Deployment to Vercel

1. **Push to GitHub** (or your Git provider)

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Vercel will auto-detect Next.js

3. **Configure Build Settings:**
   - Root Directory: `web-ui`
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Environment Variables** (if needed):
   - `MCP_SERVER_PATH`: Path to MCP server (for server-side API routes)

5. **Deploy**

## Data Storage

All items are stored locally in `.content-saver/items.json` in the project root directory.

**Item Schema:**
```typescript
{
  id: string;
  type: "note" | "link";
  title?: string;
  body?: string;
  url?: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}
```

## API Endpoints (Web UI)

All API routes are server-side only and communicate with the MCP storage layer:

- `GET /api/items` - Get all items
- `POST /api/items` - Save a new note or link
- `GET /api/items/search` - Search items with filters
- `GET /api/items/recent` - Get recent items
- `DELETE /api/items/delete?id={id}` - Delete an item
- `POST /api/chat` - Chat with AI assistant (analyzes saved content)

## AI Chat Feature

The Web UI includes an AI chat assistant that can analyze your saved content:

### Features:
- Ask questions about your saved items
- Get summaries and insights
- Identify topics and patterns
- Find relevant content

### Setup (Optional):
For advanced AI analysis, configure OpenAI API:

1. Get API key from https://platform.openai.com/api-keys
2. Create `.env.local` in `web-ui/` directory:
   ```
   OPENAI_API_KEY=your-api-key-here
   ```
3. Restart the dev server

**Note:** The chat works without an API key using basic pattern matching, but OpenAI integration provides much better analysis.

## Development

### MCP Server
```bash
# Build
npm run build

# Watch mode
npm run dev

# Run
npm start
```

### Web UI
```bash
cd web-ui

# Development server
npm run dev

# Build
npm run build

# Production server
npm start
```

## Requirements

- Node.js 18+
- TypeScript 5.3+
- Next.js 14+
- MCP-compatible AI client (for MCP server usage)

## License

MIT
