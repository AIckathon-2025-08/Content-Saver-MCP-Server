# Testing OpenAI API Integration

## Quick Test Script

I've created a test script to help you verify the OpenAI API is working correctly.

## Setup

1. **Install OpenAI package** (if not already installed):
```bash
cd web-ui
npm install openai
```

2. **Set your API key**:
```bash
export OPENAI_API_KEY="sk-proj-your-key-here"
```

Or create a `.env.local` file:
```
OPENAI_API_KEY=sk-proj-your-key-here
```

## Run the Test

```bash
cd web-ui
node test-openai.js
```

## What the Test Does

1. **Haiku Test** - Tests basic API call with a simple request
2. **Conversation Test** - Tests multi-turn conversation
3. **Model Comparison** - Tests different models (gpt-4o vs gpt-4o-mini)

## Expected Output

```
🚀 OpenAI API Test Suite
==================================================
🧪 Testing OpenAI API with haiku request...

✅ Success! Response:
──────────────────────────────────────────────────
Silicon minds dream,
Learning patterns in the void,
Future takes its form.
──────────────────────────────────────────────────

📊 Usage stats:
   Tokens used: 45
   Prompt tokens: 12
   Completion tokens: 33
```

## Testing in the Web UI

The chat feature in your Web UI already uses the OpenAI API. To test it:

1. **Start the dev server**:
```bash
cd web-ui
npm run dev
```

2. **Open the UI**: http://localhost:3000

3. **Set API key in UI**:
   - Click the ⚙️ settings button
   - Enter your OpenAI API key
   - Click Save

4. **Test the chat**:
   - Click "🤖 AI Chat"
   - Ask a question like "What is machine learning?"
   - The assistant should respond

## Troubleshooting

### Error: "API key not found"
- Make sure you've set the API key in the UI settings or environment variable
- Check that the key starts with `sk-proj-` or `sk-`

### Error: "Insufficient quota"
- Your OpenAI account needs credits
- Check your usage at https://platform.openai.com/usage

### Error: "Invalid API key"
- Verify your API key is correct
- Make sure there are no extra spaces
- Generate a new key at https://platform.openai.com/api-keys

## Cost Monitoring

Monitor your usage at:
- https://platform.openai.com/usage
- Set usage limits at: https://platform.openai.com/account/billing/limits

## Next Steps

- The chat is already integrated and working!
- Try asking questions about your saved content
- Test the follow-up question suggestions
- Experiment with different question types

