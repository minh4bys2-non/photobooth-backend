// ─── index.js ─ Điểm khởi chạy Backend API ─────────────────
// Khởi tạo Express, kết nối MongoDB, đăng ký routes, chạy server.

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const { connectDB } = require('./db');
const sessionsRouter = require('./routes/sessions');
const { startCleanupJob } = require('./jobs/cleanup');

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
    origin: config.FRONTEND_URL === '*' ? true : config.FRONTEND_URL,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Đảm bảo thư mục tmp tồn tại (multer dùng) ─────────────
const tmpDir = path.resolve(__dirname, '..', 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });

// ── Serve file tĩnh (frontend) ───────────────────────────
const publicDir = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDir));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/v1/sessions', sessionsRouter);

// ── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Route frontend: /s/:sessionId → serve session.html ────
app.get('/s/:sessionId', (req, res) => {
    res.sendFile(path.join(publicDir, 'session.html'));
});

// ── Xử lý route không tồn tại ──────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route không tồn tại' });
});

// ── Xử lý lỗi toàn cục ─────────────────────────────────────
app.use((err, req, res, next) => {
    // Lỗi từ Multer (file quá lớn, sai loại, ...)
    if (err.message && err.message.includes('Loại file không hợp lệ')) {
        return res.status(400).json({ success: false, error: err.message });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: 'File quá lớn (tối đa 100MB)' });
    }

    console.error(`❌  Lỗi không xử lý: ${err.message}`);
    res.status(500).json({ success: false, error: 'Lỗi server' });
});

// ── Khởi chạy server ────────────────────────────────────────
async function start() {
    // Kết nối MongoDB
    await connectDB();

    // Khởi động job dọn dẹp
    startCleanupJob();

    // Lắng nghe
    app.listen(config.PORT, () => {
        console.log('');
        console.log('╔═══════════════════════════════════════════════╗');
        console.log('║      DSLR Photobooth – Backend API            ║');
        console.log('╚═══════════════════════════════════════════════╝');
        console.log(`🚀  Server chạy tại: http://localhost:${config.PORT}`);
        console.log(`📡  API endpoint:    http://localhost:${config.PORT}/api/v1`);
        console.log(`📸  Frontend:       http://localhost:${config.PORT}/s/{sessionId}`);
        console.log(`🏥  Health check:    http://localhost:${config.PORT}/health`);
        console.log('');
    });
}

start().catch((err) => {
    console.error(`❌  Không thể khởi chạy server: ${err.message}`);
    process.exit(1);
});
