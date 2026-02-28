// ─── config.js ─ Cấu hình tập trung ────────────────────────
// Đọc file .env và xuất object config bất biến.

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

// Đọc danh sách booth từ JSON string trong .env
function parseBooths() {
    try {
        return JSON.parse(process.env.BOOTHS || '[]');
    } catch {
        console.error('❌  Không thể parse BOOTHS trong .env – phải là JSON hợp lệ');
        process.exit(1);
    }
}

const config = Object.freeze({
    // ── Server ───────────────────────────────────────────────
    PORT: parseInt(process.env.PORT, 10) || 3000,

    // ── MongoDB ──────────────────────────────────────────────
    MONGODB_URI: required('MONGODB_URI'),

    // ── Cloudinary ───────────────────────────────────────────
    CLOUDINARY_CLOUD_NAME: required('CLOUDINARY_CLOUD_NAME'),
    CLOUDINARY_API_KEY: required('CLOUDINARY_API_KEY'),
    CLOUDINARY_API_SECRET: required('CLOUDINARY_API_SECRET'),

    // ── Booth ────────────────────────────────────────────────
    BOOTHS: parseBooths(),  // [{ id: "booth-01", apiKey: "..." }, ...]

    // ── Session ──────────────────────────────────────────────
    SESSION_EXPIRY_DAYS: parseInt(process.env.SESSION_EXPIRY_DAYS, 10) || 7,

    // ── CORS ─────────────────────────────────────────────────
    FRONTEND_URL: process.env.FRONTEND_URL || '*',
});

module.exports = config;
