// ═══════════════════════════════════════════════════════════════════════════
// 🔐 SECURE CONFIGURATION - SERVER-SIDE ONLY
// ═══════════════════════════════════════════════════════════════════════════
// 
// Security measures:
// 1. API keys are ONLY accessible server-side via environment variables
// 2. Keys are validated for proper format before use
// 3. Placeholder values are rejected
// 4. No client-side exposure possible
//
// ═══════════════════════════════════════════════════════════════════════════

// Valid OpenAI API key patterns
const OPENAI_KEY_PATTERNS = [
  /^sk-[a-zA-Z0-9]{48,}$/,           // Legacy format: sk-xxxxx...
  /^sk-proj-[a-zA-Z0-9_-]{48,}$/,    // Project format: sk-proj-xxxxx...
  /^sk-[a-zA-Z]+-proj-[a-zA-Z0-9_-]{48,}$/, // Org format: sk-org-proj-xxxxx...
];

// Placeholder patterns to reject (security: prevent accidental use of templates)
const PLACEHOLDER_PATTERNS = [
  /REPLACE/i,
  /YOUR.*KEY/i,
  /your-api-key/i,
  /your-key/i,
  /placeholder/i,
  /example/i,
  /^sk-proj-$/,
  /^sk-$/,
];

/**
 * Validates if a string looks like a real OpenAI API key
 * @param key The key to validate
 * @returns true if the key appears to be a valid OpenAI API key format
 */
export function isValidOpenAIKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }

  const trimmedKey = key.trim();

  // Check if it's a placeholder
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(trimmedKey)) {
      return false;
    }
  }

  // Check if it matches valid OpenAI key formats
  for (const pattern of OPENAI_KEY_PATTERNS) {
    if (pattern.test(trimmedKey)) {
      return true;
    }
  }

  // Fallback: at minimum, must start with 'sk-' and be long enough
  return trimmedKey.startsWith('sk-') && trimmedKey.length >= 40;
}

/**
 * Securely retrieves and validates the OpenAI API key
 * @returns The validated API key or empty string if invalid/missing
 */
export function getOpenAIKey(): string {
  // Security: Only use server-side environment variable
  // Client-provided keys are no longer accepted
  const key = process.env.OPENAI_API_KEY || '';
  
  if (!key) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ OPENAI_API_KEY not found!');
      console.error('   Set it in web-ui/.env.local for local development');
      console.error('   Or in Vercel environment variables for production');
      console.error('   Get your key at: https://platform.openai.com/api-keys');
    }
    return '';
  }

  // Validate the key format
  if (!isValidOpenAIKeyFormat(key)) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ OPENAI_API_KEY appears to be invalid or is a placeholder!');
      console.error('   Please replace with your actual API key from OpenAI.');
      console.error('   Keys should start with "sk-" or "sk-proj-"');
    }
    return '';
  }

  // Log success only in development (without exposing the key)
  if (process.env.NODE_ENV === 'development') {
    const masked = `${key.substring(0, 7)}...${key.substring(key.length - 4)}`;
    console.log(`✅ OPENAI_API_KEY configured: ${masked}`);
  }

  return key;
}

/**
 * Check if OpenAI is properly configured
 * @returns true if a valid API key is configured
 */
export function isOpenAIConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY || '';
  return isValidOpenAIKeyFormat(key);
}

// Runtime configuration - computed once at module load
export const config = {
  runtime: {
    openaiApiKey: getOpenAIKey(),
    isOpenAIConfigured: isOpenAIConfigured(),
  },
};

