// Browser converter (plan 19): Node modules the text side never reaches (audio, optional checks). Calling one is a
// finding: it means the text side isn't separable from it yet.
const missing = name => () => { throw new Error(`${name} is not available in the browser converter`); };
export const spawn = missing('child_process.spawn');
export const createRequire = () => missing('require');
export const fileURLToPath = url => new URL(url).pathname;
export const pathToFileURL = p => new URL('file://' + p);
export const tmpdir = () => '/tmp';
export const cpus = () => [{}];
export const EOL = '\n';
const ffmpeg = missing('ffmpeg');
ffmpeg.setFfmpegPath = () => {}; ffmpeg.setFfprobePath = () => {}; ffmpeg.ffprobe = missing('ffprobe');
export { ffmpeg };
export const path = '/ffmpeg';
export default { spawn, createRequire, fileURLToPath, pathToFileURL, tmpdir, cpus, EOL, path, setFfmpegPath() {}, setFfprobePath() {}, ffprobe: missing('ffprobe') };
