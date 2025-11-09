#!/usr/bin/env node
// Bugfix: Avoid npm global access so `npx run build` works in sandboxed environments by running scripts directly.

const { spawn } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: npx run <script> [-- <args>]');
  process.exit(1);
}

const separatorIndex = args.indexOf('--');
const scriptName = args[0];
const extraArgs =
  separatorIndex === -1 ? args.slice(1) : args.slice(separatorIndex + 1);

let pkg;
try {
  pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
} catch (error) {
  console.error('Unable to read package.json:', error.message);
  process.exit(1);
}

const scripts = pkg.scripts || {};
const command = scripts[scriptName];

if (!command) {
  console.error(`Script "${scriptName}" not found in package.json.`);
  process.exit(1);
}

const env = {
  ...process.env,
  npm_lifecycle_event: scriptName,
  npm_execpath: join(process.cwd(), 'bin', 'run.js'),
};
const projectBin = join(process.cwd(), 'node_modules', '.bin');
env.PATH = env.PATH ? `${projectBin}${require('node:path').delimiter}${env.PATH}` : projectBin;

const child = spawn(command, extraArgs, {
  stdio: 'inherit',
  shell: true,
  env,
});

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

