// ─── index.js ─ Điểm khởi chạy Booth Agent ─────────────────
// Kết nối tất cả module: config → logger → watcher → upload → QR.
// Xử lý lỗi toàn cục để ngăn ứng dụng bị crash.

const fs = require('fs');
const config = require('./config');
const logger = require('./logger');
const { startWatcher } = require('./watcher');
const { uploadFile } = require('./uploader');
const { enqueue, startRetryLoop } = require('./queue');
const { generateQR } = require('./qrGenerator');
const { compositeQrOnPhotos } = require('./compositeQr');
const {
    getOrCreateSessionId,
    getFileType,
    isDuplicate,
    markProcessed,
    onSessionClose,
} = require('./sessionManager');

// ── Đảm bảo các thư mục cần thiết tồn tại ─────────────────
[config.QR_OUTPUT_DIR, config.PRINT_DIR, config.QUEUE_DIR, config.LOG_DIR].forEach((dir) => {
    fs.mkdirSync(dir, { recursive: true });
});

// ── Banner khởi động ────────────────────────────────────────
logger.info('╔═══════════════════════════════════════════════╗');
logger.info('║        DSLR Photobooth – Booth Agent          ║');
logger.info('╚═══════════════════════════════════════════════╝');
logger.info(`Booth ID       : ${config.BOOTH_ID}`);
logger.info(`API URL        : ${config.API_URL}`);
logger.info(`Thư mục watch  : ${config.WATCH_DIR}`);
logger.info(`Thư mục QR     : ${config.QR_OUTPUT_DIR}`);
logger.info(`Thư mục in    : ${config.PRINT_DIR}`);
logger.info(`Cửa sổ session : ${config.SESSION_WINDOW_MS / 1000}s`);
logger.info(`Retry          : mỗi ${config.RETRY_INTERVAL_MS / 1000} giây`);
logger.info('');

// ── Theo dõi session nào đã có ít nhất 1 upload thành công ─
const sessionsWithUpload = new Set();

// ── Theo dõi danh sách file ảnh/video theo từng session ──────
const sessionFiles = new Map();  // sessionId → [filePath, ...]

// ── Khi cửa sổ session đóng → tạo QR ───────────────────────
onSessionClose(async (sessionId) => {
    if (sessionsWithUpload.has(sessionId)) {
        try {
            // 1. Tạo QR code
            await generateQR(sessionId);

            // 2. Ghép QR lên ảnh để in
            const files = sessionFiles.get(sessionId) || [];
            if (files.length > 0) {
                await compositeQrOnPhotos(sessionId, files);
            }
        } catch (err) {
            logger.error(`Xử lý session ${sessionId} thất bại: ${err.message}`);
        }
    } else {
        logger.warn(`Session ${sessionId} đóng mà không có upload thành công – bỏ qua QR`);
    }
    // Dọn bộ nhớ
    sessionFiles.delete(sessionId);
    sessionsWithUpload.delete(sessionId);
});

// ── Xử lý từng file mới ────────────────────────────────────
async function handleNewFile(filePath) {
    try {
        // 1. Kiểm tra trùng lặp
        if (isDuplicate(filePath)) {
            logger.warn(`Bỏ qua file trùng: ${filePath}`);
            return;
        }
        markProcessed(filePath);

        // 2. Xác định loại file
        const fileType = getFileType(filePath);
        if (!fileType) {
            logger.warn(`Loại file không hỗ trợ, bỏ qua: ${filePath}`);
            return;
        }

        // 3. Lấy hoặc tạo session (nhóm theo cửa sổ thời gian)
        const sessionId = getOrCreateSessionId();

        // 4. Upload
        const result = await uploadFile(filePath, sessionId, fileType);

        if (result.success) {
            sessionsWithUpload.add(sessionId);
            // Lưu đường dẫn file để ghép QR sau khi session đóng
            if (!sessionFiles.has(sessionId)) sessionFiles.set(sessionId, []);
            sessionFiles.get(sessionId).push(filePath);
        } else {
            // 5. Đưa vào hàng đợi retry nếu thất bại
            enqueue({ filePath, sessionId, fileType });
        }
    } catch (err) {
        logger.error(`Lỗi không xử lý được cho ${filePath}: ${err.message}`);
    }
}

// ── Khởi động các dịch vụ ───────────────────────────────────
startWatcher(handleNewFile);
startRetryLoop();

// ── Bắt lỗi toàn cục (giữ process chạy) ────────────────────
process.on('uncaughtException', (err) => {
    logger.error(`Lỗi không bắt được: ${err.message}\n${err.stack}`);
});

process.on('unhandledRejection', (reason) => {
    logger.error(`Promise bị reject không xử lý: ${reason}`);
});

logger.info('🚀  Booth Agent đang chạy. Nhấn Ctrl+C để dừng.');
