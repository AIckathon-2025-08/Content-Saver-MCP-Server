/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Force Next.js to load this environment variable
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
}

// Verify API key is loaded at build/start time
if (process.env.NODE_ENV !== 'production') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('\n❌ ERROR: OPENAI_API_KEY not found in environment variables!');
    console.error('📝 Make sure .env.local exists with your API key\n');
  } else {
    console.log('✅ OPENAI_API_KEY loaded:', apiKey.substring(0, 15) + '...');
  }
}

module.exports = nextConfig

