// 🛠️ EDIT LOG [2025-11-12-D]
// 🔍 WHAT WAS WRONG:
// Even cached snapshots hit disk/S3 on every download, so the “instant” path still waited on I/O before responding.
// 🤔 WHY IT HAD TO BE CHANGED:
// To keep downloads under 3 seconds we need the freshest buffer in memory so the GET route can respond immediately.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Keep a small in-memory cache of the most recent snapshot buffers keyed by session so repeated downloads skip storage entirely.
// 🛠️ EDIT LOG [2025-11-12-C]
// 🔍 WHAT WAS WRONG:
// S3 fetches defaulted to calling `arrayBuffer()` on the body, but streaming payloads from AWS SDK v3's Node client don't always expose that helper, breaking TypeScript builds.
// 🤔 WHY IT HAD TO BE CHANGED:
// The build failure blocked deployments and at runtime those requests would crash when the SDK returned a raw stream.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added explicit guards for each supported body shape and fall back to buffering generic `Readable` streams so every AWS response path stays type-safe.
// 🛠️ EDIT LOG [2025-11-12-B]
// 🔍 WHAT WAS WRONG:
// GIF downloads still triggered full renders at click time, forcing users to wait seconds while the backend recomputed frames on demand.
// 🤔 WHY IT HAD TO BE CHANGED:
// Pre-rendering on every canvas edit requires somewhere to stash the finished GIF so the download button can serve it instantly without re-encoding.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Added a snapshot store with an S3-backed path (with local disk fallback) plus cached metadata so the backend can persist and reuse the latest render per session.

import { createHash } from 'node:crypto';
import { mkdirSync, ReadStream, promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type DeleteObjectCommandInput,
  type GetObjectCommandInput,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';

import type { RenderTimingMetrics } from '@/lib/render/renderMetrics';

type SnapshotStorage =
  | {
      kind: 'disk';
      filePath: string;
    }
  | {
      kind: 's3';
      bucket: string;
      key: string;
      eTag?: string;
    };

type SnapshotMeta = {
  sessionId: string;
  revision: number;
  payloadHash: string;
  contentLength: number;
  updatedAt: number;
  metrics: RenderTimingMetrics;
  processingMs: number;
  storage: SnapshotStorage;
};

type SaveSnapshotOptions = {
  sessionId: string;
  revision: number;
  payloadHash: string;
  buffer: Buffer;
  metrics: RenderTimingMetrics;
  processingMs: number;
};

type SnapshotRetrieval = {
  buffer: Buffer;
  meta: SnapshotMeta;
};

const DISK_ROOT = resolve(process.cwd(), 'tmp', 'render-snapshots');

type S3Config =
  | {
      enabled: true;
      client: S3Client;
      bucket: string;
      prefix: string;
    }
  | { enabled: false };

let cachedS3Config: S3Config | null = null;

const SNAPSHOT_MEMORY_CACHE_LIMIT = 8;

const snapshotIndex = new Map<string, SnapshotMeta>();
const snapshotBufferCache = new Map<string, { buffer: Buffer; lastUsed: number }>();

export function hydrateSnapshotMeta(meta: SnapshotMeta) {
  snapshotIndex.set(meta.sessionId, meta);
}

export function getSnapshotMeta(sessionId: string) {
  return snapshotIndex.get(sessionId) ?? null;
}

export async function saveSnapshot({
  sessionId,
  revision,
  payloadHash,
  buffer,
  metrics,
  processingMs,
}: SaveSnapshotOptions): Promise<SnapshotMeta> {
  const storage = await writeSnapshot(sessionId, buffer);
  const meta: SnapshotMeta = {
    sessionId,
    revision,
    payloadHash,
    contentLength: buffer.byteLength,
    updatedAt: Date.now(),
    metrics,
    processingMs,
    storage,
  };
  snapshotIndex.set(sessionId, meta);
  rememberSnapshotBuffer(sessionId, buffer);
  return meta;
}

export async function fetchSnapshot(sessionId: string): Promise<SnapshotRetrieval | null> {
  const meta = snapshotIndex.get(sessionId);
  if (!meta) {
    return null;
  }

  const cachedBuffer = snapshotBufferCache.get(sessionId);
  if (cachedBuffer) {
    cachedBuffer.lastUsed = Date.now();
    return { buffer: cachedBuffer.buffer, meta };
  }

  let buffer: Buffer | null = null;
  if (meta.storage.kind === 'disk') {
    buffer = await fs.readFile(meta.storage.filePath);
  } else {
    const s3 = getS3Config();
    if (!s3.enabled) {
      return null;
    }
    const { bucket, key } = meta.storage;
    const commandInput: GetObjectCommandInput = { Bucket: bucket, Key: key };
    const result = await s3.client.send(new GetObjectCommand(commandInput));
    const body = result.Body;
    if (!body) {
      return null;
    }
    if (typeof body === 'string') {
      buffer = Buffer.from(body);
    } else if (body instanceof ReadStream) {
      buffer = await streamToBuffer(body);
    } else if ('transformToByteArray' in body && typeof body.transformToByteArray === 'function') {
      const bytes = await body.transformToByteArray();
      buffer = Buffer.from(bytes);
    } else if (body instanceof Uint8Array) {
      buffer = Buffer.from(body);
    } else if (
      typeof body === 'object' &&
      body !== null &&
      'arrayBuffer' in body &&
      typeof (body as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer === 'function'
    ) {
      const arrayBuffer = await (body as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (
      typeof body === 'object' &&
      body !== null &&
      typeof (body as { pipe?: unknown })?.pipe === 'function'
    ) {
      buffer = await streamToBuffer(body as AsyncIterable<Uint8Array | string>);
    } else {
      return null;
    }
  }

  if (!buffer) {
    return null;
  }

  rememberSnapshotBuffer(sessionId, buffer);
  return { buffer, meta };
}

export async function removeSnapshot(sessionId: string) {
  const meta = snapshotIndex.get(sessionId);
  if (!meta) {
    return;
  }

  snapshotIndex.delete(sessionId);
  snapshotBufferCache.delete(sessionId);
  if (meta.storage.kind === 'disk') {
    try {
      await fs.unlink(meta.storage.filePath);
    } catch {
      // ignore
    }
    return;
  }

  const s3 = getS3Config();
  if (!s3.enabled) {
    return;
  }

  const deleteParams: DeleteObjectCommandInput = {
    Bucket: meta.storage.bucket,
    Key: meta.storage.key,
  };

  try {
    await s3.client.send(new DeleteObjectCommand(deleteParams));
  } catch {
    // ignore cleanup failures
  }
}

export function computePayloadHash(payload: unknown): string {
  const serialized = stableStringify(payload);
  return createHash('sha1').update(serialized).digest('hex');
}

async function writeSnapshot(sessionId: string, buffer: Buffer): Promise<SnapshotStorage> {
  const s3 = getS3Config();
  if (s3.enabled) {
    const key = `${s3.prefix}${sessionId}.gif`;
    const putParams: PutObjectCommandInput = {
      Bucket: s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: 'image/gif',
    };
    const result = await s3.client.send(new PutObjectCommand(putParams));
    return {
      kind: 's3',
      bucket: s3.bucket,
      key,
      eTag: result.ETag,
    };
  }

  mkdirSync(DISK_ROOT, { recursive: true });
  const filePath = join(DISK_ROOT, `${sessionId}.gif`);
  await fs.writeFile(filePath, buffer);
  return {
    kind: 'disk',
    filePath,
  };
}

function getS3Config(): S3Config {
  if (cachedS3Config) {
    return cachedS3Config;
  }

  const bucket = process.env.RENDER_SNAPSHOT_S3_BUCKET;
  const region = process.env.RENDER_SNAPSHOT_S3_REGION ?? process.env.AWS_REGION;
  const accessKeyId = process.env.RENDER_SNAPSHOT_S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.RENDER_SNAPSHOT_S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;
  const prefix = process.env.RENDER_SNAPSHOT_S3_PREFIX ?? 'gif-snapshots/';

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    cachedS3Config = { enabled: false };
    return cachedS3Config;
  }

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  cachedS3Config = {
    enabled: true,
    client,
    bucket,
    prefix: prefix.endsWith('/') ? prefix : `${prefix}/`,
  };
  return cachedS3Config;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(',')}}`;
}

async function streamToBuffer(stream: AsyncIterable<Uint8Array | string>) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function rememberSnapshotBuffer(sessionId: string, buffer: Buffer) {
  snapshotBufferCache.set(sessionId, { buffer, lastUsed: Date.now() });
  pruneSnapshotBufferCache();
}

function pruneSnapshotBufferCache() {
  if (snapshotBufferCache.size <= SNAPSHOT_MEMORY_CACHE_LIMIT) {
    return;
  }

  const entries = [...snapshotBufferCache.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed);
  while (snapshotBufferCache.size > SNAPSHOT_MEMORY_CACHE_LIMIT && entries.length > 0) {
    const [key] = entries.shift()!;
    snapshotBufferCache.delete(key);
  }
}


