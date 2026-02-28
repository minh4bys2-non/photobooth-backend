// ─── logger.js ─ Ghi log ra file và console ────────────────
// Dùng Winston: hiển thị màu trên console + ghi file xoay vòng theo ngày.

const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');
const config = require('./config');

// Đảm bảo thư mục log tồn tại (index.js cũng tạo khi khởi động,
// nhưng kiểm tra ở đây cho an toàn).
const fs = require('fs');
fs.mkdirSync(config.LOG_DIR, { recursive: true });

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        return stack
            ? `${timestamp} [${level.toUpperCase()}] ${message}\n${stack}`
            : `${timestamp} [${level.toUpperCase()}] ${message}`;
    }),
);

const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        // ── Console (có màu) ────────────────────────────────────
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat,
            ),
        }),

        // ── File xoay vòng theo ngày ────────────────────────────
        new winston.transports.DailyRotateFile({
            dirname: config.LOG_DIR,
            filename: 'booth-agent-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d',
        }),
    ],
});

module.exports = logger;
