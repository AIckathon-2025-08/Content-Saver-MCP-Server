#!/usr/bin/env node

/**
 * Utility script to save a link directly
 */

import { Storage } from './dist/storage.js';

const url = process.argv[2];
const title = process.argv[3];
const comment = process.argv[4];
const tags = process.argv[5] ? process.argv[5].split(',') : [];

if (!url) {
  console.error('Usage: node save-link.js <url> [title] [comment] [tags]');
  console.error('Example: node save-link.js https://example.com "Example" "Great site" "web,example"');
  process.exit(1);
}

async function saveLink() {
  const storage = new Storage();
  await storage.initialize();

  try {
    const result = await storage.saveItem({
      type: 'link',
      url: url.trim(),
      title: title?.trim(),
      body: comment?.trim(),
      tags: tags.map(t => t.trim()).filter(t => t.length > 0)
    });

    if (result.isDuplicate) {
      console.log('ℹ️  This link is already saved');
      console.log(`   Title: ${result.item.title || '(Untitled)'}`);
      console.log(`   Tags: ${result.item.tags.length > 0 ? result.item.tags.join(' · ') : 'none'}`);
      console.log(`   ID: ${result.item.id}`);
    } else {
      console.log('✔ Saved to Content Saver');
      console.log(`   Type: link`);
      if (result.item.title) {
        console.log(`   Title: "${result.item.title}"`);
      }
      console.log(`   URL: ${result.item.url}`);
      console.log(`   Tags: ${result.item.tags.length > 0 ? result.item.tags.join(', ') : 'none'}`);
      console.log(`   ID: ${result.item.id}`);
      const date = new Date(result.item.createdAt);
      console.log(`   Saved: ${date.toLocaleString()}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

saveLink();

