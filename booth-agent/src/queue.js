// ─── queue.js ─ Hàng đợi retry lưu trên ổ đĩa ─────────────
// Hàng đợi lưu bằng file JSON, thử lại upload thất bại mỗi
// RETRY_INTERVAL_MS và tạo QR code khi thành công.

const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./logger');
const { uploadFile } = require('./uploader');
const { generateQR } = require('./qrGenerator');

const QUEUE_FILE = path.join(config.QUEUE_DIR, 'queue.json');

// ── Hàm hỗ trợ ─────────────────────────────────────────────

function readQueue() {
    try {
        if (!fs.existsSync(QUEUE_FILE)) return [];
        const raw = fs.readFileSync(QUEUE_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch {
        logger.warn('Không thể đọc file hàng đợi – reset về rỗng');
        return [];
    }
}

function writeQueue(items) {
    fs.mkdirSync(config.QUEUE_DIR, { recursive: true });
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

// ── API công khai ───────────────────────────────────────────

/**
 * Thêm một upload thất bại vào hàng đợi retry.
 * @param {{ filePath: string, sessionId: string, fileType: string }} item
 */
function enqueue(item) {
    const queue = readQueue();

    // Tránh thêm trùng lặp file đã có trong hàng đợi
    const exists = queue.some((q) => q.filePath === item.filePath);
    if (exists) {
        logger.warn(`Hàng đợi: bỏ qua file trùng – ${path.basename(item.filePath)}`);
        return;
    }

    queue.push({ ...item, enqueuedAt: new Date().toISOString() });
    writeQueue(queue);
    logger.info(`📥  Đã thêm vào hàng đợi: ${path.basename(item.filePath)}  (tổng: ${queue.length})`);
}

/**
 * Bắt đầu vòng lặp retry định kỳ.
 * Chạy mỗi RETRY_INTERVAL_MS. Khi thành công → xóa khỏi hàng đợi
 * và tạo QR code.
 */
function startRetryLoop() {
    setInterval(async () => {
        const queue = readQueue();
        if (queue.length === 0) return;

        logger.info(`🔄  Vòng lặp retry: ${queue.length} mục trong hàng đợi`);

        const remaining = [];

        for (const item of queue) {
            // Kiểm tra file nguồn có còn tồn tại không
            if (!fs.existsSync(item.filePath)) {
                logger.warn(`Retry: file nguồn không còn, bỏ qua – ${item.filePath}`);
                continue;
            }

            const result = await uploadFile(item.filePath, item.sessionId, item.fileType);

            if (result.success) {
                logger.info(`🔄✅  Retry thành công: ${path.basename(item.filePath)}`);
                try {
                    await generateQR(item.sessionId);
                } catch (qrErr) {
                    logger.error(`Tạo QR thất bại sau retry: ${qrErr.message}`);
                }
            } else {
                remaining.push(item);
            }
        }

        writeQueue(remaining);

        if (remaining.length > 0) {
            logger.info(`🔄  Retry xong – còn ${remaining.length} mục trong hàng đợi`);
        } else {
            logger.info('🔄  Retry xong – hàng đợi trống 🎉');
        }
    }, config.RETRY_INTERVAL_MS);

    logger.info(`⏱️   Vòng lặp retry hoạt động – mỗi ${config.RETRY_INTERVAL_MS / 1000} giây`);
}

module.exports = { enqueue, startRetryLoop, readQueue };
