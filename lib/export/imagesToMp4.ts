import { fetchFile } from '@ffmpeg/util';
import { loadFFmpeg } from './ffmpegUtils';

export interface ImagesToMp4Options {
    fps: number;
    width: number;
    height: number;
    onProgress?: (progress: number) => void;
}

/**
 * Convert a sequence of image Blobs to an MP4 Blob using FFmpeg.wasm
 * @param images - Array of image blobs (frames)
 * @param options - Encoding options
 */
export async function convertImagesToMp4(
    images: Blob[],
    options: ImagesToMp4Options
): Promise<Blob> {
    const { fps, width, height, onProgress } = options;
    const ffmpeg = await loadFFmpeg();

    // Progress handler
    if (onProgress) {
        ffmpeg.on('progress', ({ progress }) => {
            onProgress(progress);
        });
    }

    const inputPattern = 'frame%03d.png';
    const outputName = 'output.mp4';
    const loadedFiles: string[] = [];

    try {
        // 1. Write frames to virtual FS
        // We write them in batches to avoid locking up too much
        for (let i = 0; i < images.length; i++) {
            const fileName = `frame${String(i).padStart(3, '0')}.png`;
            await ffmpeg.writeFile(fileName, await fetchFile(images[i]));
            loadedFiles.push(fileName);
        }

        // 2. Encode to MP4
        // -r sets input framerate
        // -pix_fmt yuv420p is needed for wide player compatibility
        // -vcodec libx264 is standard
        // -preset ultrafast because WASM is slow
        await ffmpeg.exec([
            '-framerate', String(fps),
            '-i', inputPattern,
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-preset', 'ultrafast',
            '-vf', `scale=${width}:${height}:flags=lanczos`,
            outputName
        ]);

        // 3. Read result
        const data = await ffmpeg.readFile(outputName);

        // Cleanup inputs
        for (const f of loadedFiles) {
            await ffmpeg.deleteFile(f);
        }
        await ffmpeg.deleteFile(outputName);

        return new Blob([data as any], { type: 'video/mp4' });

    } catch (error) {
        // Cleanup on error
        for (const f of loadedFiles) {
            try { await ffmpeg.deleteFile(f); } catch { }
        }
        try { await ffmpeg.deleteFile(outputName); } catch { }
        throw error;
    }
}
