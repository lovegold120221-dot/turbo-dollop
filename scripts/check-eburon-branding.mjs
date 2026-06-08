#!/usr/bin/env node
/**
 * Eburon Branding Validation Script
 * 
 * Scans the repository for prohibited upstream provider/model brand names.
 * Fails CI if any are found in tracked source/config/docs files.
 * 
 * Usage: node scripts/check-eburon-branding.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Prohibited tokens (case-insensitive search)
const PROHIBITED_TOKENS = [
  'gemini',
  'google-genai',
  'google generative',
  'generative-ai',
];

// Allowlist: files where tokens are permitted (build artifacts, lockfiles, node_modules)
const ALLOWLIST_GLOB = [
  'node_modules/',
  '.git/',
  'dist/',
  '.vite/',
  'package-lock.json',
  'supabase/.temp/',
  'supabase/.branches/',
  '*.mmd',
  '*.svg',
  '*.png',
  '*.mp3',
  '*.gif',
  'scripts/check-eburon-branding.mjs',
  'AGENTS.md',
  'CLAUDE.md',
  '.svg',
];

// Scanned paths (relative to repo root)
const SCAN_PATHS = [
  '.env.example',
  '.env.local.example',
  '.env.whatsapp.example',
  'render.yaml',
  'vercel.json',
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  'MEMORY.md',
  'TASK.md',
  'security_spec.md',
  'server/',
  'src/',
  'public/',
  'docs/',
  'scripts/',
  'supabase/',
  'ecosystem.config.cjs',
  'Dockerfile',
  'Dockerfile.whatsapp',
  'docker-compose.whatsapp.yml',
  'docker-compose.dokploy.yml',
  'firebase.json',
  'twa-manifest.json',
  '.github/',
  'functions/',
];

function isAllowed(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  for (const pattern of ALLOWLIST_GLOB) {
    if (pattern.endsWith('/') && normalized.includes(pattern)) return true;
    if (normalized.endsWith(pattern)) return true;
  }
  return false;
}

function scanFile(filePath) {
  if (isAllowed(filePath)) return [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lowerContent = content.toLowerCase();
    const matches = [];

    for (const token of PROHIBITED_TOKENS) {
      const idx = lowerContent.indexOf(token);
      if (idx !== -1) {
        // Get the actual line for context
        const lines = content.split('\n');
        let lineNum = 1;
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
          charCount += lines[i].length + 1;
          if (charCount > idx) {
            lineNum = i + 1;
            break;
          }
        }
        matches.push({ token, line: lineNum, snippet: lines[lineNum - 1]?.trim().substring(0, 100) });
      }
    }

    return matches;
  } catch (err) {
    // File might not exist, skip
    return [];
  }
}

function getTrackedFiles() {
  try {
    const output = execSync('git ls-files', { cwd: ROOT, encoding: 'utf-8' });
    return output.split('\n').filter(Boolean).map(f => path.join(ROOT, f));
  } catch {
    // If not a git repo, scan common paths
    const files = [];
    for (const scanPath of SCAN_PATHS) {
      const fullPath = path.join(ROOT, scanPath);
      if (existsSync(fullPath)) {
        const stat = existsSync(fullPath) ? null : null;
        try {
          const s = execSync(`find "${fullPath}" -type f 2>/dev/null`, { encoding: 'utf-8' });
          files.push(...s.split('\n').filter(Boolean));
        } catch {
          if (existsSync(fullPath) && !fullPath.endsWith('/')) {
            files.push(fullPath);
          }
        }
      }
    }
    return files;
  }
}

function main() {
  console.log('🔍 Scanning for prohibited provider/model brand names...\n');

  const files = getTrackedFiles();
  let allMatches = [];

  for (const file of files) {
    const matches = scanFile(file);
    if (matches.length > 0) {
      allMatches.push(...matches.map(m => ({ file, ...m })));
    }
  }

  if (allMatches.length === 0) {
    console.log('✅ No prohibited branding found. All clean!');
    process.exit(0);
  }

  console.log(`❌ Found ${allMatches.length} prohibited brand reference(s):\n`);
  for (const match of allMatches) {
    const relPath = path.relative(ROOT, match.file);
    console.log(`  ${relPath}:${match.line}`);
    console.log(`    Token: "${match.token}"`);
    console.log(`    Context: "${match.snippet}"\n`);
  }

  console.log('\nAll references must use Eburon aliases instead.');
  console.log('See AGENTS.md or .env.local.example for Eburon naming conventions.');
  process.exit(1);
}

main();
