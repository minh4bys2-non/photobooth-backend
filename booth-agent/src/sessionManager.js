// ─── sessionManager.js ─ Quản lý phiên chụp ────────────────
// Nhóm file theo cửa sổ thời gian, tạo UUID, chống trùng lặp,
// nhận diện loại file. Các file đến trong SESSION_WINDOW_MS
// sẽ dùng chung sessionId.

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const config = require('./config');
const logger = require('./logger');

// ── Ánh xạ đuôi file → loại upload ─────────────────────────
const TYPE_MAP = {
    '.jpg': 'image',
    '.jpeg': 'image',
    '.png': 'image',
    '.webp': 'image',
    '.mp4': 'video',
};

// ── Theo dõi file đã xử lý (Set chứa đường dẫn tuyệt đối) ─
const processedFiles = new Set();

// ── Trạng thái nhóm session theo cửa sổ thời gian ──────────
let currentSessionId = null;
let lastFileTimestamp = 0;
let sessionCloseTimer = null;

// Callback được gọi khi cửa sổ session đóng (không có file mới trong SESSION_WINDOW_MS)
let _onSessionClose = null;

/**
 * Đăng ký callback khi session đóng (hết cửa sổ thời gian).
 * @param {(sessionId: string) => void} cb
 */
function onSessionClose(cb) {
    _onSessionClose = cb;
}

/**
 * Lấy sessionId hiện tại hoặc tạo mới.
 * Nếu file trước đó đến cách đây ít hơn SESSION_WINDOW_MS,
 * sẽ dùng lại sessionId cũ (cùng phiên chụp).
 * Ngược lại sẽ tạo UUID mới.
 *
 * @returns {string} sessionId
 */
function getOrCreateSessionId() {
    const now = Date.now();
    const elapsed = now - lastFileTimestamp;

    if (currentSessionId && elapsed < config.SESSION_WINDOW_MS) {
        // Cùng session – reset bộ đếm đóng session
        logger.info(`Dùng lại session: ${currentSessionId} (${elapsed}ms kể từ file trước)`);
    } else {
        // Session mới
        currentSessionId = uuidv4();
        logger.info(`🆕  Tạo session mới: ${currentSessionId}`);
    }

    lastFileTimestamp = now;

    // Khởi động lại bộ đếm đóng session
    if (sessionCloseTimer) clearTimeout(sessionCloseTimer);
    sessionCloseTimer = setTimeout(() => {
        logger.info(`⏹️   Session đóng: ${currentSessionId} (không có file mới trong ${config.SESSION_WINDOW_MS / 1000}s)`);
        const closedId = currentSessionId;
        // Reset trạng thái cho session tiếp theo
        currentSessionId = null;
        lastFileTimestamp = 0;
        sessionCloseTimer = null;
        // Gọi callback
        if (_onSessionClose) _onSessionClose(closedId);
    }, config.SESSION_WINDOW_MS);

    return currentSessionId;
}

/**
 * Xác định loại upload dựa trên đuôi file.
 * @param {string} filePath
 * @returns {"image"|"video"|null}
 */
function getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return TYPE_MAP[ext] || null;
}

/**
 * Kiểm tra file đã được xử lý chưa.
 * @param {string} filePath  Đường dẫn tuyệt đối
 * @returns {boolean}
 */
function isDuplicate(filePath) {
    return processedFiles.has(path.resolve(filePath));
}

/**
 * Đánh dấu file đã xử lý để không upload lại.
 * @param {string} filePath  Đường dẫn tuyệt đối
 */
function markProcessed(filePath) {
    processedFiles.add(path.resolve(filePath));
}

module.exports = {
    getOrCreateSessionId,
    getFileType,
    isDuplicate,
    markProcessed,
    onSessionClose,
};
