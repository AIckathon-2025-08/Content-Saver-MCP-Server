# ⚠️ Storage Persistence Warning

## **Important: Data Persistence on Vercel**

### **Current Behavior:**
- ✅ **Local Development**: Data persists in `.content-saver/items.json`
- ⚠️ **Vercel Deployment**: Data is **EPHEMERAL** (temporary)

### **Why Data Disappears on Vercel:**

1. **Serverless Functions are Stateless**
   - Each API request may hit a different serverless function instance
   - Function instances are created and destroyed dynamically
   - No shared state between function invocations

2. **`/tmp` Directory is Per-Instance**
   - Data stored in `/tmp` only exists for that specific function instance
   - When the instance is recycled, all data in `/tmp` is lost
   - Different requests may hit different instances

3. **No Persistent Storage**
   - Vercel serverless functions don't have persistent file storage
   - Each deployment creates a fresh environment
   - Data cannot persist across deployments

### **What This Means:**

- ✅ Items can be saved and retrieved **during the same session**
- ⚠️ Items **may disappear** when:
  - Browser is refreshed (new function instance)
  - Function instance is recycled (after ~10 minutes of inactivity)
  - New deployment is made
  - Different user makes a request (different instance)

### **Solutions for Persistent Storage:**

#### **Option 1: Vercel KV (Recommended)**
```typescript
// Fast, persistent key-value store
import { kv } from '@vercel/kv';
await kv.set('items', items);
const items = await kv.get('items');
```

#### **Option 2: Vercel Postgres**
```typescript
// Full database solution
import { sql } from '@vercel/postgres';
await sql`INSERT INTO items ...`;
```

#### **Option 3: External Database**
- MongoDB Atlas
- Supabase
- PlanetScale
- Railway

#### **Option 4: Vercel Blob Storage**
```typescript
// File-based storage
import { put, get } from '@vercel/blob';
await put('items.json', JSON.stringify(items));
```

### **Current Workaround:**

For now, the app works but data is temporary. To get persistent storage:

1. **Add Vercel KV** (easiest):
   ```bash
   npm install @vercel/kv
   ```
   Then update storage to use KV instead of filesystem

2. **Or use a database** for production use

### **Local Development:**

- ✅ Data persists correctly locally
- ✅ Stored in `web-ui/.content-saver/items.json`
- ✅ Survives browser restarts
- ✅ Survives server restarts

### **Recommendation:**

For production use on Vercel, **add Vercel KV** for persistent storage. It's:
- Fast (Redis-based)
- Persistent (data survives deployments)
- Easy to integrate
- Free tier available

---

## **Quick Fix Guide:**

1. Install Vercel KV:
   ```bash
   npm install @vercel/kv
   ```

2. Add KV to Vercel project (Dashboard → Storage → KV)

3. Update `web-ui/lib/storage.ts` to use KV instead of filesystem

4. Data will now persist across deployments and function restarts

