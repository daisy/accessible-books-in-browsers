import chardet from 'chardet';
import ffmpeg from 'fluent-ffmpeg';
import { configureFfmpeg } from './ffmpeg.js';

export type ClockValue = {
    seconds: number;
    format: string;
};

function sniffEncoding(filepath: string): string {
    return chardet.detectFileSync(filepath)?.toString() ?? 'utf-8';
}

// Supports EPUB Media Overlays clock values:
// http://idpf.org/epub/30/spec/epub30-mediaoverlays.html#app-clock-examples
function toSeconds(value: string): ClockValue {
    let hours = 0;
    let mins = 0;
    let secs = 0;
    let format = 's';

    if (value.includes('min')) {
        mins = parseFloat(value.substring(0, value.indexOf('min')));
        format = 'min';
    }
    else if (value.includes('ms')) {
        const ms = parseFloat(value.substring(0, value.indexOf('ms')));
        secs = ms / 1000;
        format = 'ms';
    }
    else if (value.includes('s')) {
        secs = parseFloat(value.substring(0, value.indexOf('s')));
        format = 's';
    }
    else if (value.includes('h')) {
        hours = parseFloat(value.substring(0, value.indexOf('h')));
        format = 'h';
    }
    else {
        const parts = value.split(':');
        secs = parseFloat(parts.pop() ?? '0');
        if (parts.length > 0) mins = parseFloat(parts.pop() ?? '0');
        if (parts.length > 0) hours = parseFloat(parts.pop() ?? '0');
        format = 'hms';
    }

    return {
        seconds: hours * 3600 + mins * 60 + secs,
        format
    };
}

function addItem(key: string, value: string, obj: Record<string, string | string[]>): void {
    const existing = obj[key];
    if (existing) {
        if (Array.isArray(existing)) {
            existing.push(value);
        }
        else {
            obj[key] = [existing, value];
        }
    }
    else {
        obj[key] = value;
    }
}

function getFrag(str: string): string {
    const hashIndex = str.indexOf('#');
    return hashIndex === -1 ? '' : str.slice(hashIndex + 1);
}

function getWithoutFrag(str: string): string {
    const hashIndex = str.indexOf('#');
    return hashIndex === -1 ? str : str.slice(0, hashIndex);
}

async function getDuration(filename: string): Promise<number> {
    await configureFfmpeg();

    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filename, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(metadata.format.duration ?? 0);
        });
    });
}

export type AudioProperties = {
    bitrate: number;
    channels: number;
    codec: string;
    sampleRate: number;
};

async function getAudioProperties(filename: string): Promise<AudioProperties> {
    await configureFfmpeg();
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filename, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }
            const stream = metadata.streams?.find(candidate => candidate.codec_type === 'audio') ?? metadata.streams?.[0];
            resolve({
                bitrate: Number(stream?.bit_rate ?? metadata.format.bit_rate) || 0,
                channels: Number(stream?.channels) || 1,
                codec: stream?.codec_name ?? '',
                sampleRate: Number(stream?.sample_rate) || 44100
            });
        });
    });
}

function toPosixPath(value: string): string {
    return value.split(/[\\/]/).join('/');
}

export {
    addItem,
    getAudioProperties,
    getDuration,
    getFrag,
    getWithoutFrag,
    sniffEncoding,
    toPosixPath,
    toSeconds
};
