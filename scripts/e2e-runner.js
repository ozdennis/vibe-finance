/**
 * E2E Warning Gate Runner
 * 
 * Runs Playwright tests and captures stdout/stderr.
 * Fails with non-zero exit code if Tailwind/module-resolution warnings are detected.
 * 
 * Warning signatures that trigger failure:
 * - Can't resolve 'tailwindcss'
 * - Cannot find module 'tailwindcss'
 * - Failed to resolve.*tailwindcss
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const LOG_DIR = join(PROJECT_ROOT, 'test-results');
const LOG_FILE = join(LOG_DIR, 'e2e-run.log');

// Warning signatures that indicate a fatal error
const FATAL_PATTERNS = [
  /Can't resolve 'tailwindcss'/i,
  /Cannot find module 'tailwindcss'/i,
  /Failed to resolve.*tailwindcss/i,
  /Module not found.*tailwindcss/i,
  /ERROR.*tailwindcss/i,
];

// Ensure log directory exists
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

const logLines = [];
let hasFatalError = false;
const matchedLines = [];

function processLine(line, isStderr = false) {
  logLines.push(line);
  
  // Check for fatal patterns
  for (const pattern of FATAL_PATTERNS) {
    if (pattern.test(line)) {
      hasFatalError = true;
      matchedLines.push(`[${isStderr ? 'STDERR' : 'STDOUT'}] ${line}`);
      break;
    }
  }
}

function writeLog() {
  try {
    writeFileSync(LOG_FILE, logLines.join('\n'), 'utf8');
  } catch (err) {
    console.error('Failed to write log file:', err.message);
  }
}

console.log('='.repeat(60));
console.log('E2E Warning Gate Runner');
console.log('='.repeat(60));
console.log(`Log file: ${LOG_FILE}`);
console.log('');

// Run Playwright
const playwrightArgs = [
  'npx',
  'playwright',
  'test',
  'tests/stage3-features.spec.ts',
  '--reporter=list'
];

console.log(`Running: ${playwrightArgs.join(' ')}`);
console.log('');

const child = process.platform === 'win32'
  ? spawn('cmd.exe', ['/d', '/s', '/c', playwrightArgs.join(' ')], {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true,
    })
  : spawn('npx', playwrightArgs.slice(1), {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true,
    });

child.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      processLine(line, false);
      process.stdout.write(`[STDOUT] ${line}\n`);
    }
  });
});

child.stderr.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      processLine(line, true);
      process.stderr.write(`[STDERR] ${line}\n`);
    }
  });
});

child.on('close', (code, signal) => {
  // Write full log to file
  writeLog();
  
  console.log('');
  console.log('='.repeat(60));
  console.log('E2E Run Complete');
  console.log('='.repeat(60));
  console.log(`Exit code: ${code}`);
  console.log(`Log saved to: ${LOG_FILE}`);
  console.log('');
  
  if (hasFatalError) {
    console.log('[FAIL] Fatal Tailwind/module-resolution warnings detected.');
    console.log('');
    console.log('Matched lines:');
    matchedLines.forEach(line => console.log(`  ${line}`));
    console.log('');
    console.log('Action required: Check your Tailwind CSS installation and module resolution.');
    process.exit(1);
  }

  if (signal) {
    console.log(`[FAIL] Playwright process terminated by signal: ${signal}`);
    process.exit(1);
  }

  if (typeof code === 'number' && code !== 0) {
    console.log(`[FAIL] Playwright exited with code ${code}.`);
    process.exit(code);
  }

  console.log('[PASS] No Tailwind/module-resolution warnings detected.');
  process.exit(0);
});

child.on('error', (err) => {
  console.error('Failed to start Playwright:', err.message);
  writeLog();
  process.exit(1);
});

