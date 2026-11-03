declare module 'fluent-ffmpeg' {
    namespace ffmpeg {
        type Progress = Record<string, unknown>;

        type FfprobeData = {
            format: {
                duration?: number;
            };
        };

        type FfprobeCallback = (err: Error | null, metadata: FfprobeData) => void;

        interface FfmpegCommand {
            audioChannels(channels: number): FfmpegCommand;
            audioFilters(filters: string): FfmpegCommand;
            input(filename: string): FfmpegCommand;
            inputOptions(options: string[]): FfmpegCommand;
            on(event: 'end', listener: () => void): FfmpegCommand;
            on(event: 'error', listener: (err: Error) => void): FfmpegCommand;
            on(event: 'progress', listener: (progress: Progress) => void): FfmpegCommand;
            output(filename: string): FfmpegCommand;
            run(): void;
        }
    }

    interface FfmpegFactory {
        (): ffmpeg.FfmpegCommand;
        ffprobe(filename: string, callback: ffmpeg.FfprobeCallback): void;
        setFfmpegPath(filename: string): void;
        setFfprobePath(filename: string): void;
    }

    const ffmpeg: FfmpegFactory;
    export default ffmpeg;
}

declare module 'tmp' {
    type TmpEntry = {
        name: string;
        removeCallback?: () => void;
    };

    type TmpOptions = {
        prefix?: string;
        unsafeCleanup?: boolean;
    };

    function dirSync(options?: TmpOptions): TmpEntry;
    function fileSync(options?: TmpOptions): TmpEntry;
    function setGracefulCleanup(): void;

    const tmp: {
        dirSync: typeof dirSync;
        fileSync: typeof fileSync;
        setGracefulCleanup: typeof setGracefulCleanup;
    };

    export default tmp;
}

declare module 'vtt-creator' {
    export default class Vtt {
        add(start: number, end: number, text: string): void;
        toString(): string;
    }
}
