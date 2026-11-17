import ffmpeg from 'fluent-ffmpeg';
import winston from 'winston';

let configured = false;

async function configureFfmpeg(): Promise<void> {
    if (configured) return;

    // ffmpeg-static (FFmpeg 6): @ffmpeg-installer/ffmpeg shipped FFmpeg 4.4, whose MP3 decoder added a
    // whistle at about 6.9 kHz to Kusamakura's 24 kHz narration (found 2026-11-16, plan 19 spike)
    await setInstalledBinary('ffmpeg-static', 'ffmpeg');
    await setInstalledBinary('@ffprobe-installer/ffprobe', 'ffprobe');
    configured = true;
}

async function setInstalledBinary(moduleName: string, binaryName: 'ffmpeg' | 'ffprobe'): Promise<void> {
    try {
        const mod = await import(moduleName);
        // @ffprobe-installer exports { path }; ffmpeg-static exports the path itself
        const binaryPath = mod.path ?? mod.default?.path ?? (typeof mod.default === 'string' ? mod.default : undefined);
        if (!binaryPath) return;

        if (binaryName === 'ffmpeg') {
            ffmpeg.setFfmpegPath(binaryPath);
        }
        else {
            ffmpeg.setFfprobePath(binaryPath);
        }
    }
    catch (err) {
        winston.warn(`${moduleName} is unavailable; using ${binaryName} from PATH if available.`);
    }
}

export { configureFfmpeg };
