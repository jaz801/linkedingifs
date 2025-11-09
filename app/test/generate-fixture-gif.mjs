// 🛠️ EDIT LOG [Cursor Rule #1]
// 🔍 WHAT WAS WRONG:
// There was no automated way to invoke the `/api/render-gif` endpoint with the deterministic frontend fixture, so validating GIF exports required manual browser steps.
// 🤔 WHY IT HAD TO BE CHANGED:
// Without a repeatable script the team could not regression-test GIF generation or capture fixtures directly to disk, slowing down debugging of rendering issues.
// ✅ WHY THIS SOLUTION WAS PICKED:
// This Node script reuses the existing backend API contract, posts the canonical test payload, and writes the resulting GIF straight to the desktop, keeping the flow close to production while making it easy to automate.

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as PureImage from 'pureimage';

const DEFAULT_API_URL = 'http://localhost:3000/api/render-gif';
const API_URL = process.env.RENDER_GIF_URL ?? DEFAULT_API_URL;

const WIDTH = 640;
const HEIGHT = 400;

const DEFAULT_BACKGROUND_PATH = '/Users/Novicell/Desktop/RAG.png';
const BACKGROUND_PATH = process.env.RENDER_GIF_BACKGROUND ?? DEFAULT_BACKGROUND_PATH;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const DEV_SERVER_START_TIMEOUT_MS = 60_000;
const DEV_SERVER_POLL_INTERVAL_MS = 500;

async function createFallbackBackgroundDataUrl() {
  const canvas = PureImage.make(WIDTH, HEIGHT);
  const context = canvas.getContext('2d');
  context.fillStyle = '#0C0A09';
  context.fillRect(0, 0, WIDTH, HEIGHT);
  const buffer = await PureImage.encodePNGToBuffer(canvas);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

async function loadBackgroundDataUrl() {
  try {
    const buffer = await fs.readFile(BACKGROUND_PATH);
    const base64 = buffer.toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.warn(
      `⚠️  Failed to load "${BACKGROUND_PATH}". Falling back to solid background.\n${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return createFallbackBackgroundDataUrl();
}

async function buildPayload() {
  return {
    width: WIDTH,
    height: HEIGHT,
    background: await loadBackgroundDataUrl(),
    duration: 2.8,
    fps: 24,
    lines: [
      { x1: 60, y1: 80, x2: 580, y2: 80, strokeColor: '#22C55E', strokeWidth: 6 },
      { x1: 60, y1: 200, x2: 580, y2: 200, strokeColor: '#3B82F6', strokeWidth: 6 },
      { x1: 60, y1: 320, x2: 580, y2: 320, strokeColor: '#FACC15', strokeWidth: 6 },
    ],
    objects: [
      { lineIndex: 0, type: 'dot', color: '#A3A3A3', size: 18, speed: 1, direction: 'forward', offset: 0 },
      { lineIndex: 1, type: 'dot', color: '#FFFFFF', size: 18, speed: 1, direction: 'forward', offset: 0.15 },
      { lineIndex: 2, type: 'dot', color: '#EC4899', size: 18, speed: 1, direction: 'forward', offset: 0.3 },
    ],
  };
}

async function isServerReachable() {
  try {
    const response = await fetch(API_URL, { method: 'HEAD' });
    return response.ok || response.status === 405;
  } catch {
    return false;
  }
}

async function waitForServerReady(devProcess) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < DEV_SERVER_START_TIMEOUT_MS) {
    if (devProcess && devProcess.exitCode !== null) {
      throw new Error(`Dev server exited before becoming ready (code ${devProcess.exitCode}).`);
    }

    if (await isServerReachable()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, DEV_SERVER_POLL_INTERVAL_MS));
  }

  throw new Error(`Timed out after ${DEV_SERVER_START_TIMEOUT_MS / 1000}s waiting for dev server to start.`);
}

async function ensureDevServerRunning() {
  if (await isServerReachable()) {
    console.log('ℹ️  Detected existing dev server.');
    return null;
  }

  console.log('🚀 Starting Next.js dev server (npm run dev)…');
  const devProcess = spawn('npm', ['run', 'dev'], {
    cwd: PROJECT_ROOT,
    env: process.env,
    stdio: 'pipe',
  });

  devProcess.stdout?.on('data', (data) => {
    process.stdout.write(`[dev] ${data}`);
  });
  devProcess.stderr?.on('data', (data) => {
    process.stderr.write(`[dev] ${data}`);
  });

  await waitForServerReady(devProcess);
  console.log('✅ Dev server is ready.');

  return devProcess;
}

async function requestGifBuffer(payload) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Render request failed with status ${response.status}. Response body:\n${text || '<empty>'}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function writeGifToDesktop(buffer) {
  const desktopDir = path.join(os.homedir(), 'Desktop');
  const outputPath = path.join(desktopDir, 'test-fixture.gif');

  await fs.mkdir(desktopDir, { recursive: true });
  await fs.writeFile(outputPath, buffer);

  return outputPath;
}

async function main() {
  console.log(`➡️  Sending render payload to ${API_URL}`);
  let devProcess = null;

  try {
    devProcess = await ensureDevServerRunning();
    const payload = await buildPayload();
    const buffer = await requestGifBuffer(payload);
    const outputPath = await writeGifToDesktop(buffer);
    console.log(`✅ GIF saved to ${outputPath}`);
  } finally {
    if (devProcess) {
      console.log('🛑 Stopping dev server…');
      devProcess.kill('SIGTERM');
      await new Promise((resolve) => {
        const timeout = setTimeout(resolve, 5_000);
        devProcess.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  }
}

main().catch((error) => {
  console.error('❌ Failed to generate GIF');
  console.error(error);
  process.exit(1);
});


