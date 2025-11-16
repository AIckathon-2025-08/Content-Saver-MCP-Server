# Correct OpenAI API Usage Examples

## ❌ Your Code (Incorrect)

```javascript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "sk-proj-...",
});

const response = openai.responses.create({  // ❌ Wrong method
  model: "gpt-5-nano",  // ❌ Model doesn't exist
  input: "write a haiku about ai",  // ❌ Wrong parameter
  store: true,  // ❌ Not a valid parameter
});

response.then((result) => console.log(result.output_text));  // ❌ Wrong response format
```

## ✅ Correct Way #1: Using OpenAI SDK (Recommended)

```javascript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "sk-proj-...",  // Your API key
});

// For chat completions (what we use in the chat)
const response = await openai.chat.completions.create({
  model: "gpt-4o",  // ✅ Valid models: gpt-4o, gpt-4o-mini, gpt-4-turbo
  messages: [
    {
      role: "user",
      content: "write a haiku about ai"
    }
  ],
  temperature: 0.7,
  max_tokens: 2000,
});

console.log(response.choices[0].message.content);
```

## ✅ Correct Way #2: Using Fetch (What We Currently Use)

```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: 'write a haiku about ai'
      }
    ],
    temperature: 0.7,
    max_tokens: 2000,
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

## Available Models

- `gpt-4o` - Latest, most capable (what we use)
- `gpt-4o-mini` - Faster, cheaper, still very good
- `gpt-4-turbo` - Alternative option
- `gpt-3.5-turbo` - Older, cheaper option

**Note:** There is no `gpt-5-nano` model. The latest is GPT-4o.

## Key Differences

1. **Method**: Use `openai.chat.completions.create()` not `openai.responses.create()`
2. **Model**: Use valid model names like `gpt-4o` or `gpt-4o-mini`
3. **Input**: Use `messages` array, not `input` parameter
4. **Response**: Access `response.choices[0].message.content`, not `result.output_text`
5. **Store**: There's no `store` parameter in the Chat Completions API

## Example: Haiku About AI

```javascript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getHaiku() {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: "write a haiku about ai"
      }
    ],
  });

  return response.choices[0].message.content;
}

const haiku = await getHaiku();
console.log(haiku);
```

## Security Note

⚠️ **Never commit your API key to code!** Use environment variables:

```javascript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // ✅ From environment
});
```

