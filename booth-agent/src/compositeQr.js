// ─── compositeQr.js ─ Ghép QR code lên ảnh để in ───────────
// Dùng sharp overlay QR code lên góc phải dưới ảnh gốc,
// lưu kết quả vào thư mục PRINT_DIR để gửi in.

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const logger = require('./logger');

/**
 * Ghép QR code lên tất cả ảnh của session.
 *
 * @param {string} sessionId   UUID phiên chụp
 * @param {string[]} filePaths  Danh sách đường dẫn ảnh gốc trong session
 */
async function compositeQrOnPhotos(sessionId, filePaths) {
    const qrPath = path.join(config.QR_OUTPUT_DIR, `${sessionId}.png`);

    // Kiểm tra file QR tồn tại
    if (!fs.existsSync(qrPath)) {
        logger.warn(`Không tìm thấy QR: ${qrPath} – bỏ qua composite`);
        return;
    }

    // Đảm bảo thư mục print tồn tại
    const printDir = config.PRINT_DIR;
    fs.mkdirSync(printDir, { recursive: true });

    // Đọc ảnh QR và resize
    const qrSize = config.QR_SIZE || 200;     // Kích thước QR trên ảnh (pixel)
    const qrMargin = config.QR_MARGIN || 30;  // Khoảng cách từ mép (pixel)
    const qrBuffer = await sharp(qrPath)
        .resize(qrSize, qrSize)
        .png()
        .toBuffer();

    for (const filePath of filePaths) {
        const ext = path.extname(filePath).toLowerCase();

        // Chỉ ghép QR lên ảnh, không ghép lên video
        if (ext === '.mp4') {
            logger.info(`Bỏ qua video (không ghép QR): ${path.basename(filePath)}`);
            continue;
        }

        try {
            // Đọc metadata ảnh gốc để tính vị trí
            const metadata = await sharp(filePath).metadata();
            const imgWidth = metadata.width;
            const imgHeight = metadata.height;

            // Vị trí góc phải dưới
            const left = imgWidth - qrSize - qrMargin;
            const top = imgHeight - qrSize - qrMargin;

            // Tạo tên file output
            const baseName = path.basename(filePath, ext);
            const outputName = `${baseName}_qr${ext}`;
            const outputPath = path.join(printDir, outputName);

            // Ghép QR lên ảnh
            await sharp(filePath)
                .composite([
                    {
                        input: qrBuffer,
                        left: Math.max(0, left),
                        top: Math.max(0, top),
                    },
                ])
                .toFile(outputPath);

            logger.info(`🖨️  Ảnh có QR đã lưu: ${outputName} → ${printDir}`);
        } catch (err) {
            logger.error(`Ghép QR thất bại cho ${path.basename(filePath)}: ${err.message}`);
        }
    }
}

module.exports = { compositeQrOnPhotos };
