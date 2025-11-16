// Runtime configuration - server-side only
// Security: API keys are only accessible server-side via environment variables

export const config = {
  runtime: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
  },
};

export function getOpenAIKey(): string {
  // Security: Only use server-side environment variable
  // Client-provided keys are no longer accepted
  const key = process.env.OPENAI_API_KEY || '';
  
  if (!key && process.env.NODE_ENV === 'development') {
    console.error('❌ OPENAI_API_KEY not found! Set it in .env.local for local development or Vercel environment variables for production.');
  }
  
  return key;
}

