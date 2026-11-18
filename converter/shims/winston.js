// Browser converter (plan 19): winston and logform for the browser. Messages go to the page's log, not a file.
export const log = [];
const emit = level => message => { log.push({ level, message: String(message) }); globalThis.spikeLog?.(level, String(message)); };
const passthrough = () => ({});
export const format = { combine: passthrough, colorize: passthrough, timestamp: passthrough, align: passthrough, printf: passthrough };
class Transport { constructor(options) { this.options = options; } }
const winston = {
    info: emit('info'), warn: emit('warn'), error: emit('error'), verbose: emit('verbose'), debug: emit('debug'),
    configure() {}, transports: { Console: Transport, File: Transport }, format
};
export default winston;
