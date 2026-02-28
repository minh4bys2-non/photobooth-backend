// ─── config.js ─ Cấu hình tập trung ────────────────────────
// Đọc file .env và xuất một object config bất biến (frozen).

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

function required(key) {
    const val = process.env[key];
    if (!val) {
        console.error(`❌  Thiếu biến môi trường bắt buộc: ${key}`);
        process.exit(1);
    }
    return val;
}

const config = Object.freeze({
    // ── Backend ───────────────────────────────────────────────
    API_URL: required('API_URL'),            // VD: https://api.yourdomain.com/api/v1
    API_KEY: required('API_KEY'),            // Khóa bí mật riêng từng booth
    BOOTH_ID: required('BOOTH_ID'),          // VD: booth-01

    // ── Đường dẫn QR session ─────────────────────────────────
    SESSION_FRONTEND_BASE: process.env.SESSION_FRONTEND_BASE || 'https://yourdomain.com/s',

    // ── Đường dẫn thư mục ────────────────────────────────────
    WATCH_DIR: process.env.WATCH_DIR || 'C:/dslrBooth/Output',
    QR_OUTPUT_DIR: path.resolve(process.env.QR_OUTPUT_DIR || './qrcodes'),
    PRINT_DIR: path.resolve(process.env.PRINT_DIR || './print'),
    QUEUE_DIR: path.resolve(process.env.QUEUE_DIR || './queue'),
    LOG_DIR: path.resolve(process.env.LOG_DIR || './logs'),

    // ── QR trên ảnh in ───────────────────────────────────────
    QR_SIZE: parseInt(process.env.QR_SIZE, 10) || 200,       // Kích thước QR (pixel)
    QR_MARGIN: parseInt(process.env.QR_MARGIN, 10) || 30,    // Khoảng cách từ mép (pixel)

    // ── Thời gian ────────────────────────────────────────────
    RETRY_INTERVAL_MS: parseInt(process.env.RETRY_INTERVAL_MS, 10) || 30000,
    FILE_STABLE_MS: parseInt(process.env.FILE_STABLE_MS, 10) || 2000,
    SESSION_WINDOW_MS: parseInt(process.env.SESSION_WINDOW_MS, 10) || 10000,
});

module.exports = config;
