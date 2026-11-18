// Browser converter (plan 19): the Node globals bundled code expects
import { Buffer } from 'buffer';
export { Buffer };
export const process = { env: {}, platform: 'browser', cwd: () => '/', version: 'v20.0.0', versions: {}, nextTick: (fn, ...args) => queueMicrotask(() => fn(...args)), emitWarning() {} };
