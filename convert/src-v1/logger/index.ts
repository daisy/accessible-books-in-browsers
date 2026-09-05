import fs from 'fs-extra';
import { format } from 'logform';
import winston from 'winston';

function initLogger(logFilename?: string, level:string = "info") {
    if (logFilename != "") {
        // delete the logfile every time
        if (fs.existsSync(logFilename)) {
            fs.removeSync(logFilename);
        }
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

    let consoleTransport = new winston.transports.Console(
        {
            format: alignedWithColors
        }
    );
    let transports = [];
    if (logFilename) {
        let fileTransport = new winston.transports.File(
            {
                filename: logFilename,
                format: alignedWithTime
            }
        );
        transports = [consoleTransport, fileTransport];
    }
    else {
        transports = [consoleTransport];
    }
        
    winston.configure({
        transports,
        level
    });
}

export { initLogger };
