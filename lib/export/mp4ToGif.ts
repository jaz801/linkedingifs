// 🛠️ EDIT LOG [2025-12-XX-A]
// 🔍 WHAT WAS WRONG:
// GIF exports sometimes resulted in empty files being downloaded due to incorrect blob creation from FFmpeg output.
// 🤔 WHY IT HAD TO BE CHANGED:
// Empty downloads broke user workflows and provided no error feedback about what went wrong.
// ✅ WHY THIS SOLUTION WAS PICKED:
// Fixed blob creation to use Uint8Array directly instead of ArrayBuffer slicing, and added validation to ensure the converted GIF data is not empty before creating the blob.

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * Load and initialize FFmpeg.wasm
 * This is cached so subsequent calls return the same instance
 */
async function loadFFmpeg(): Promise<FFmpeg> {
    if (ffmpegInstance) {
        return ffmpegInstance;
    }

    if (isLoading && loadPromise) {
        return loadPromise;
    }

    isLoading = true;
    loadPromise = (async () => {
        const ffmpeg = new FFmpeg();

        // Load FFmpeg core from CDN
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        ffmpegInstance = ffmpeg;
        isLoading = false;
        return ffmpeg;
    })();

    return loadPromise;
}

export interface Mp4ToGifOptions {
    /**
     * Frame rate for the output GIF (default: 30)
     */
    fps?: number;

    /**
     * Scale/resize the output (e.g., '1080:-1' maintains aspect ratio)
     * Default: no scaling
     */
    scale?: string;

    /**
     * Callback for progress updates (0-1)
     */
    onProgress?: (progress: number) => void;
}

/**
 * Convert an MP4 blob to a GIF blob using FFmpeg.wasm
 * 
 * @param mp4Blob - The MP4 video blob to convert
 * @param options - Conversion options
 * @returns A promise that resolves to the GIF blob
 */
export async function convertMp4ToGif(
    mp4Blob: Blob,
    options: Mp4ToGifOptions = {}
): Promise<Blob> {
    const { fps = 30, scale, onProgress } = options;

    // Load FFmpeg
    const ffmpeg = await loadFFmpeg();

    // Set up progress monitoring
    if (onProgress) {
        ffmpeg.on('progress', ({ progress }) => {
            // FFmpeg reports progress as 0-1
            onProgress(progress);
        });
    }

    const logs: string[] = [];
    ffmpeg.on('log', ({ message }) => {
        logs.push(message);
        console.log('[FFmpeg Log]:', message);
    });

    try {
        // Write input MP4 to virtual filesystem
        const inputName = 'input.mp4';
        const outputName = 'output.gif';

        console.log('[Mp4ToGif] Input Blob Size:', mp4Blob.size);
        await ffmpeg.writeFile(inputName, await fetchFile(mp4Blob));

        // Attempt 1: High Quality with Palette Generation
        try {
            console.log('[Mp4ToGif] Attempting high-quality conversion...');

            const filters: string[] = [`fps=${fps}`];
            if (scale) {
                filters.push(`scale=${scale}:flags=lanczos`);
            }
            // Use palette generation for better quality GIFs
            filters.push('split[s0][s1]');
            filters.push('[s0]palettegen[p]');
            filters.push('[s1][p]paletteuse');

            const args = [
                '-i', inputName,
                '-vf', filters.join(';'),
                '-loop', '0',
                outputName
            ];

            const retCode = await ffmpeg.exec(args);
            console.log('[Mp4ToGif] HQ FFmpeg exit code:', retCode);

            if (retCode !== 0) {
                throw new Error(`FFmpeg HQ exited with code ${retCode}`);
            }

            const data = await ffmpeg.readFile(outputName);
            if (data instanceof Uint8Array && data.length > 0) {
                // Success! Clean up input only (output is in memory)
                await ffmpeg.deleteFile(inputName);
                await ffmpeg.deleteFile(outputName);
                return new Blob([data as any], { type: 'image/gif' });
            }
            console.warn('[Mp4ToGif] HQ conversion produced empty data, falling back to SQ...');
        } catch (e) {
            console.warn('[Mp4ToGif] HQ conversion failed:', e, 'Falling back to SQ...');
        }

        // Attempt 2: Standard Quality (Simple filter chain)
        // Cleanup previous output failure if any
        try { await ffmpeg.deleteFile(outputName); } catch { }

        console.log('[Mp4ToGif] Attempting standard-quality conversion...');
        const simpleFilters: string[] = [`fps=${fps}`];
        if (scale) {
            simpleFilters.push(`scale=${scale}:flags=lanczos`);
        }

        const simpleArgs = [
            '-i', inputName,
            '-vf', simpleFilters.join(','), // Simple chain uses comma
            '-loop', '0',
            outputName
        ];

        const retCodeSimple = await ffmpeg.exec(simpleArgs);
        console.log('[Mp4ToGif] SQ FFmpeg exit code:', retCodeSimple);

        if (retCodeSimple !== 0) {
            throw new Error(`FFmpeg SQ exited with code ${retCodeSimple}. Last logs: ${logs.slice(-5).join('\n')}`);
        }

        const data = await ffmpeg.readFile(outputName);

        // Clean up virtual filesystem
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);

        if (!(data instanceof Uint8Array)) {
            throw new Error('Expected binary data from ffmpeg');
        }

        if (data.length === 0) {
            throw new Error(`FFmpeg SQ conversion resulted in empty GIF data. RAM usage: ${logs.filter(l => l.includes('kB')).slice(-1)}`);
        }

        return new Blob([data as any], { type: 'image/gif' });
    } catch (error) {
        // Clean up on error
        try {
            await ffmpeg.deleteFile('input.mp4');
            await ffmpeg.deleteFile('output.gif');
        } catch {
            // Ignore cleanup errors
        }

        // Enhance error with logs if available
        if (error instanceof Error) {
            console.error('[Mp4ToGif] Full FFmpeg logs:', logs.join('\n'));
        }
        throw error;
    }
}

/**
 * Check if FFmpeg.wasm is supported in the current browser
 */
export function isFFmpegSupported(): boolean {
    // FFmpeg.wasm requires SharedArrayBuffer which needs specific headers
    // or cross-origin isolation
    return typeof SharedArrayBuffer !== 'undefined';
}
