# 🤖 Automation Setup Guide

This guide explains how to set up the automated workflow between Jira, GitHub, Confluence, and Vercel.

## 📋 Automation Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AUTOMATION PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐                                                       │
│  │ JIRA: Move   │                                                       │
│  │ to "In       │──── Webhook ────┐                                     │
│  │ Progress"    │                 │                                     │
│  └──────────────┘                 ▼                                     │
│                          ┌────────────────┐                              │
│                          │ Web App:       │                              │
│                          │ /api/webhooks/ │                              │
│                          │ jira           │                              │
│                          └───────┬────────┘                              │
│                                  │                                       │
│                                  ▼                                       │
│                    ┌─────────────────────────┐                          │
│                    │ • Log work started       │                          │
│                    │ • Suggest branch name    │                          │
│                    │ • Notify team (optional) │                          │
│                    └─────────────────────────┘                          │
│                                                                          │
│  ══════════════════════════════════════════════════════════════════════ │
│                                                                          │
│  ┌──────────────┐                                                       │
│  │ Developer:   │                                                       │
│  │ Push to main │──── GitHub Actions ────┐                              │
│  │ with KAN-X   │                        │                              │
│  └──────────────┘                        ▼                              │
│                          ┌────────────────────────┐                     │
│                          │ 1. Deploy to Vercel    │                     │
│                          │ 2. Move Jira → Done    │                     │
│                          │ 3. Create Confluence   │                     │
│                          │    Release Notes       │                     │
│                          │ 4. Add deployment      │                     │
│                          │    comment to Jira     │                     │
│                          └────────────────────────┘                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Setup Steps

### Step 1: Add GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `VERCEL_TOKEN` | `vcp_xxx...` | Your Vercel API token |
| `VERCEL_ORG_ID` | From `.vercel/project.json` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | From `.vercel/project.json` | Vercel project ID |
| `JIRA_BASE_URL` | `https://agorozia1.atlassian.net` | Your Jira instance URL |
| `JIRA_EMAIL` | `agorozia1@gmail.com` | Your Atlassian email |
| `JIRA_API_TOKEN` | `ATATT3xFfGF0...` | Your Jira API token |
| `CONFLUENCE_SPACE_ID` | `262148` | Your Confluence space ID |

### Step 2: Get Vercel IDs

Run this command in your project:

```bash
cd web-ui
cat .vercel/project.json
```

Copy the `orgId` and `projectId` values.

### Step 3: Set Up Jira Automation Rule

1. Go to **Jira** → **Project Settings** → **Automation**
2. Click **Create rule**
3. Configure:

**Trigger:**
- Select: **Issue transitioned**
- Status: **To "In Progress"**

**Action:**
- Select: **Send web request**
- URL: `https://web-ui-sable-pi.vercel.app/api/webhooks/jira`
- Method: **POST**
- Headers: `Content-Type: application/json`
- Body: **Issue data (Full issue)**

4. **Save and enable** the rule

### Step 4: Commit Message Convention

When committing code, include the Jira ticket ID:

```bash
# Good examples:
git commit -m "feat: add edit modal for items [KAN-2]"
git commit -m "fix: resolve URL validation bug KAN-3"
git commit -m "KAN-4: implement collections feature"

# The automation will extract: KAN-2, KAN-3, KAN-4
```

---

## 🚀 How It Works

### When You Move a Ticket to "In Progress":

1. Jira Automation sends webhook to your app
2. App logs the event and suggests a branch name
3. You create the branch: `git checkout -b feature/kan-2-edit-items`

### When You Push to Main:

1. GitHub Actions triggers
2. Extracts ticket IDs from commit messages
3. Deploys to Vercel
4. Moves Jira tickets to "Done"
5. Creates Confluence release notes
6. Adds deployment URL comment to tickets

---

## 📝 Example Workflow

```bash
# 1. Move KAN-5 to "In Progress" in Jira
#    → Webhook fires, logs work started

# 2. Create feature branch
git checkout -b feature/kan-5-export-import

# 3. Develop feature
# ... make changes ...

# 4. Commit with ticket reference
git add .
git commit -m "feat: add JSON export functionality [KAN-5]"

# 5. Push to main
git push origin main

# 6. Automation runs:
#    ✅ Deployed to Vercel
#    ✅ KAN-5 moved to Done
#    ✅ Confluence release notes created
#    ✅ Comment added to KAN-5 with deployment URL
```

---

## 🔍 Testing the Automation

### Test Webhook Endpoint:

```bash
curl -X POST https://web-ui-sable-pi.vercel.app/api/webhooks/jira \
  -H "Content-Type: application/json" \
  -d '{
    "issue": {
      "key": "KAN-99",
      "fields": {
        "summary": "Test ticket",
        "status": {"name": "In Progress"},
        "issuetype": {"name": "Task"}
      }
    },
    "changelog": {
      "items": [
        {"field": "status", "fromString": "To Do", "toString": "In Progress"}
      ]
    },
    "user": {"displayName": "Test User"}
  }'
```

### Test GitHub Actions:

Push a commit with a ticket reference:

```bash
git commit --allow-empty -m "test: verify automation [KAN-99]"
git push origin main
```

---

## ⚠️ Troubleshooting

### Webhook Not Firing

1. Check Jira Automation rule is enabled
2. Verify webhook URL is correct
3. Check Vercel function logs

### GitHub Actions Failing

1. Check all secrets are set correctly
2. Verify Vercel token has proper permissions
3. Check Jira API token is valid

### Confluence Page Not Created

1. Verify `CONFLUENCE_SPACE_ID` is correct
2. Check API token has Confluence permissions
3. Review GitHub Actions logs

---

## 📚 Files Created

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-and-update.yml` | GitHub Actions workflow |
| `web-ui/app/api/webhooks/jira/route.ts` | Jira webhook handler |
| `AUTOMATION_SETUP.md` | This documentation |

---

## 🔐 Security Notes

- All secrets are stored in GitHub Secrets (encrypted)
- API tokens should have minimal required permissions
- Webhook endpoint validates payload structure
- No sensitive data is logged

---

## 📞 Support

If you encounter issues:
1. Check GitHub Actions logs
2. Check Vercel function logs
3. Verify Jira Automation execution history

