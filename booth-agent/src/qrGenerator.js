// ─── qrGenerator.js ─ Tạo mã QR ────────────────────────────
// Mã hóa URL session frontend thành file PNG và lưu trên máy.

const path = require('path');
const QRCode = require('qrcode');
const config = require('./config');
const logger = require('./logger');
const fs = require('fs');

/**
 * Tạo file QR code PNG cho một phiên chụp.
 * Định dạng URL:  SESSION_FRONTEND_BASE/{sessionId}
 * Lưu tại:        QR_OUTPUT_DIR/{sessionId}.png
 *
 * @param {string} sessionId  UUID v4
 * @returns {Promise<string>}  Đường dẫn tuyệt đối tới file PNG
 */
async function generateQR(sessionId) {
    const url = `${config.SESSION_FRONTEND_BASE}/${sessionId}`;
    const outputPath = path.join(config.QR_OUTPUT_DIR, `${sessionId}.png`);

    // Đảm bảo thư mục xuất tồn tại
    fs.mkdirSync(config.QR_OUTPUT_DIR, { recursive: true });

    await QRCode.toFile(outputPath, url, {
        type: 'png',
        width: 400,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
    });

    logger.info(`📱  QR đã lưu: ${path.basename(outputPath)}  →  ${url}`);
    return outputPath;
}

module.exports = { generateQR };
