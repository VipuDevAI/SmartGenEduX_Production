#!/usr/bin/env node
import { cp, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

async function prepareStatic() {
  const source = resolve(rootDir, 'dist', 'public');
  const dest = resolve(rootDir, 'server', 'public');

  console.log('Preparing static files for deployment...');
  console.log(`Source: ${source}`);
  console.log(`Destination: ${dest}`);

  if (!existsSync(source)) {
    console.error(`Error: Build output not found at ${source}`);
    console.error('Please run "npm run build" first');
    process.exit(1);
  }

  try {
    // Copy dist/public to server/public for Express fallback
    await cp(source, dest, { recursive: true, force: true });
    console.log('✅ Static files copied successfully');
  } catch (error) {
    console.error('Error copying static files:', error);
    process.exit(1);
  }
}

prepareStatic();
