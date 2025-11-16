// Quick script to verify .env.local is readable
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  console.log('✅ .env.local file found');
  console.log('📄 File contents:');
  lines.forEach(line => {
    const [key] = line.split('=');
    console.log(`   ${key}=${line.includes('=') ? '***' + line.split('=')[1].slice(-4) : 'not set'}`);
  });
  
  const hasOpenAI = lines.some(line => line.startsWith('OPENAI_API_KEY='));
  if (hasOpenAI) {
    console.log('\n✅ OPENAI_API_KEY is configured');
    console.log('⚠️  Remember: You MUST restart the Next.js dev server for changes to take effect!');
    console.log('   Run: npm run dev');
  } else {
    console.log('\n❌ OPENAI_API_KEY not found in .env.local');
  }
} else {
  console.log('❌ .env.local file not found');
  console.log('   Expected location:', envPath);
}

