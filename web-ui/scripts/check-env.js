// Pre-startup check for environment variables
const fs = require('fs');
const path = require('path');

console.log('\n🔍 Checking environment configuration...\n');

const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ ERROR: .env.local file not found!');
  console.error('📍 Expected location:', envPath);
  console.error('\n📝 Creating .env.local with your API key...\n');
  
  console.log('⚠️  Please add your OpenAI API key to .env.local manually');
  console.log('   Format: OPENAI_API_KEY=your-api-key-here\n');
  fs.writeFileSync(envPath, `OPENAI_API_KEY=your-api-key-here\n`);
  console.log('✅ Created .env.local template (please update with your actual key)\n');
}

// Read and verify .env.local
const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

console.log('📄 .env.local contents:');
lines.forEach(line => {
  const [key] = line.split('=');
  if (key) {
    const hasValue = line.includes('=') && line.split('=')[1];
    console.log(`   ${key} = ${hasValue ? '***[SET]' : '[MISSING]'}`);
  }
});

const hasOpenAI = lines.some(line => line.startsWith('OPENAI_API_KEY=') && line.split('=')[1]);

if (hasOpenAI) {
  console.log('\n✅ OPENAI_API_KEY is configured');
  console.log('🚀 Starting Next.js...\n');
} else {
  console.error('\n❌ ERROR: OPENAI_API_KEY not set in .env.local!');
  console.error('Fix: Add this line to .env.local:');
  console.error('OPENAI_API_KEY=your-key-here\n');
  process.exit(1);
}

