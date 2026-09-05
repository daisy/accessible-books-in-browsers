import ffmpeg from 'fluent-ffmpeg';
import winston from 'winston';

let configured = false;

async function configureFfmpeg(): Promise<void> {
    if (configured) return;

    await setInstalledBinary('@ffmpeg-installer/ffmpeg', 'ffmpeg');
    await setInstalledBinary('@ffprobe-installer/ffprobe', 'ffprobe');
    configured = true;
}

async function setInstalledBinary(moduleName: string, binaryName: 'ffmpeg' | 'ffprobe'): Promise<void> {
    try {
        const mod = await import(moduleName);
        const binaryPath = mod.path ?? mod.default?.path;
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
