/**
 * Test script for OpenAI API
 * Run with: npm run test:openai
 * Or: node test-openai.js
 */

import OpenAI from "openai";
import { readFileSync } from 'fs';
import { join } from 'path';

// Get API key from environment, .env.local, or prompt user
function getApiKey() {
  // Try environment variable first
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }
  
  // Try .env.local file
  try {
    const envPath = join(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    const match = envContent.match(/OPENAI_API_KEY=(.+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch (e) {
    // .env.local doesn't exist or can't be read
  }
  
  return null;
}

const apiKey = getApiKey();

if (!apiKey) {
  console.error('❌ OpenAI API key not found!');
  console.log('\nPlease set it in one of these ways:');
  console.log('  1. Environment variable: OPENAI_API_KEY=sk-proj-... npm run test:openai');
  console.log('  2. .env.local file: OPENAI_API_KEY=sk-proj-...');
  console.log('  3. UI Settings: Click ⚙️ in the web UI and enter your key');
  console.log('\nGet your API key at: https://platform.openai.com/api-keys');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: apiKey,
});

async function testHaiku() {
  console.log('🧪 Testing OpenAI API with haiku request...\n');
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: "write a haiku about ai"
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    console.log('✅ Success! Response:');
    console.log('─'.repeat(50));
    console.log(response.choices[0].message.content);
    console.log('─'.repeat(50));
    console.log('\n📊 Usage stats:');
    console.log(`   Tokens used: ${response.usage.total_tokens}`);
    console.log(`   Prompt tokens: ${response.usage.prompt_tokens}`);
    console.log(`   Completion tokens: ${response.usage.completion_tokens}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.status) {
      console.error(`   Status: ${error.status}`);
    }
  }
}

async function testChatConversation() {
  console.log('\n🧪 Testing multi-turn conversation...\n');
  
  try {
    const messages = [
      {
        role: "system",
        content: "You are a helpful assistant."
      },
      {
        role: "user",
        content: "What is 2+2?"
      }
    ];

    const response1 = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
    });

    console.log('User: What is 2+2?');
    console.log(`Assistant: ${response1.choices[0].message.content}`);

    // Add assistant response to conversation
    messages.push(response1.choices[0].message);
    messages.push({
      role: "user",
      content: "What about 3+3?"
    });

    const response2 = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
    });

    console.log('\nUser: What about 3+3?');
    console.log(`Assistant: ${response2.choices[0].message.content}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testDifferentModels() {
  console.log('\n🧪 Testing different models...\n');
  
  const models = ['gpt-4o', 'gpt-4o-mini'];
  
  for (const model of models) {
    try {
      console.log(`Testing ${model}...`);
      const startTime = Date.now();
      
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "user",
            content: "Say 'Hello' in one word"
          }
        ],
        max_tokens: 10,
      });

      const duration = Date.now() - startTime;
      const content = response.choices[0].message.content;
      const tokens = response.usage.total_tokens;
      
      console.log(`  ✅ ${model}: "${content}" (${duration}ms, ${tokens} tokens)`);
      
    } catch (error) {
      console.error(`  ❌ ${model}: ${error.message}`);
    }
  }
}

// Run tests
async function runTests() {
  console.log('🚀 OpenAI API Test Suite\n');
  console.log('='.repeat(50));
  
  await testHaiku();
  await testChatConversation();
  await testDifferentModels();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Tests completed!');
}

runTests().catch(console.error);

