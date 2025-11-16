# Vercel Storage Behavior

## ⚠️ **Important: Storage on Vercel**

### **Current Implementation:**
- Uses `/tmp` directory on Vercel (writable)
- Falls back to in-memory storage if file operations fail
- Prevents 500 errors

### **Limitations:**
- **Data is ephemeral**: Vercel serverless functions are stateless
- Data in `/tmp` is **not shared** between function invocations
- Data **resets** on each deployment or function restart
- Each user request may hit a different serverless function instance

### **What This Means:**
- ✅ App works without errors
- ✅ You can save/load items during a session
- ⚠️ Data may not persist between page refreshes
- ⚠️ Data is not shared across different users/devices

## 🔄 **For Persistent Storage (Future Enhancement):**

Consider using:
1. **Vercel KV** (Redis) - Fast, persistent key-value store
2. **Vercel Postgres** - Full database solution
3. **External Database** - MongoDB, Supabase, etc.
4. **Vercel Blob Storage** - For file-based storage

## 📝 **Current Behavior:**

- **Local Development**: Data persists in `.content-saver/items.json`
- **Vercel**: Data stored in `/tmp/.content-saver/items.json` (ephemeral)
- **Error Handling**: Falls back to in-memory if file operations fail

## ✅ **What Works:**

- Save items ✅
- Load items ✅
- Search items ✅
- Delete items ✅
- No 500 errors ✅

## ⚠️ **What to Expect:**

- Data may reset between deployments
- Data may not persist across long periods
- For production use, consider adding a database

