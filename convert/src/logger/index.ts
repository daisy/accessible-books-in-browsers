import fs from 'fs-extra';
import { format } from 'logform';
import winston from 'winston';

function initLogger(logFilename?: string, level = 'info'): void {
    if (logFilename && fs.existsSync(logFilename)) {
        fs.removeSync(logFilename);
    }

    const alignedWithColors = format.combine(
        format.colorize(),
        format.timestamp(),
        format.align(),
        format.printf(info => `${info.level}: ${info.message}\n`)
    );

    const alignedWithTime = format.combine(
        format.timestamp(),
        format.align(),
        format.printf(info => `${info.timestamp}\n${info.level}:\n${info.message}\n`)
    );

    const consoleTransport = new winston.transports.Console({
        format: alignedWithColors
    });

    const transports: winston.transport[] = logFilename
        ? [
            consoleTransport,
            new winston.transports.File({
                filename: logFilename,
                format: alignedWithTime
            })
        ]
        : [consoleTransport];

    winston.configure({
        transports,
        level
    });
}

export { initLogger };
