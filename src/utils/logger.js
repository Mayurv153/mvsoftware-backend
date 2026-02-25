// ─── Winston Logger ─────────────────────────────────────────────
// Structured JSON logging for production, colorized for dev

const winston = require('winston');

const { combine, timestamp, printf, colorize, json } = winston.format;

const devFormat = combine(
    colorize(),
    timestamp({ format: 'HH:mm:ss' }),
    printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${metaStr}`;
    })
);

const prodFormat = combine(timestamp(), json());

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
    defaultMeta: { service: 'mvsoftware-backend' },
    transports: [
        new winston.transports.Console(),
        // In production, you could add file or external transports here
    ],
});

module.exports = logger;
