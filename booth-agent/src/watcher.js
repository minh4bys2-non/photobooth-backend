// ─── watcher.js ─ Theo dõi thư mục + kiểm tra file ổn định ─
// Dùng chokidar theo dõi WATCH_DIR, lọc file .jpg/.jpeg/.png/.webp/.mp4.
// Kiểm tra fs.stat cho đến khi kích thước file ổn định → gọi callback.

const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./logger');

const WATCH_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.mp4']);

/**
 * Chờ cho đến khi kích thước file không thay đổi trong FILE_STABLE_MS.
 * Ngăn xử lý file khi vẫn đang copy.
 * @param {string} filePath
 * @returns {Promise<void>}
 */
function waitUntilStable(filePath) {
    return new Promise((resolve, reject) => {
        let lastSize = -1;
        const interval = setInterval(() => {
            try {
                const stat = fs.statSync(filePath);
                if (stat.size === lastSize && stat.size > 0) {
                    clearInterval(interval);
                    resolve();
                }
                lastSize = stat.size;
            } catch (err) {
                clearInterval(interval);
                reject(new Error(`File biến mất khi đang kiểm tra ổn định: ${filePath}`));
            }
        }, config.FILE_STABLE_MS);
    });
}

/**
 * Bắt đầu theo dõi thư mục đã cấu hình.
 * @param {(filePath: string) => void} onNewFile  Gọi khi phát hiện file ổn định.
 */
function startWatcher(onNewFile) {
    const watchDir = config.WATCH_DIR;

    // Đảm bảo thư mục theo dõi tồn tại
    if (!fs.existsSync(watchDir)) {
        fs.mkdirSync(watchDir, { recursive: true });
        logger.warn(`Đã tạo thư mục theo dõi: ${watchDir}`);
    }

    const watcher = chokidar.watch(watchDir, {
        persistent: true,
        ignoreInitial: false,          // xử lý cả file đã có sẵn
        awaitWriteFinish: false,       // tự kiểm tra ổn định
        usePolling: false,
        depth: 0,                      // chỉ file ở cấp thư mục gốc
    });

    watcher.on('add', async (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (!WATCH_EXTENSIONS.has(ext)) return;

        logger.info(`Phát hiện file mới: ${path.basename(filePath)}`);

        try {
            await waitUntilStable(filePath);
            logger.info(`File ổn định, sẵn sàng xử lý: ${path.basename(filePath)}`);
            onNewFile(filePath);
        } catch (err) {
            logger.error(`Kiểm tra ổn định thất bại cho ${path.basename(filePath)}: ${err.message}`);
        }
    });

    watcher.on('error', (err) => {
        logger.error(`Lỗi watcher: ${err.message}`);
    });

    logger.info(`👁️  Đang theo dõi thư mục: ${watchDir}`);
    return watcher;
}

module.exports = { startWatcher };
