#!/usr/bin/env node
// Bugfix: Provide a local run CLI so `npx run build` resolves and proxies to npm scripts.

const { spawn } = require('node:child_process');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: npx run <script> [...args]');
  process.exit(1);
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(npmCommand, ['run', ...args], { stdio: 'inherit' });

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

