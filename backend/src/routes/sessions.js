// ─── sessions.js ─ Route phiên chụp ─────────────────────────
// POST /sessions/:sessionId/files – upload file
// GET  /sessions/:sessionId      – lấy thông tin session

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const Session = require('../models/Session');
const { uploadToCloudinary } = require('../services/cloudinary');

// ── Cấu hình Multer (lưu file tạm trước khi upload Cloudinary) ─
const tmpDir = path.resolve(__dirname, '../../tmp');
const storage = multer.diskStorage({
    destination: tmpDir,
    filename: (req, file, cb) => {
        // Tên tạm duy nhất, sẽ bị xóa sau khi upload Cloudinary
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        cb(null, `tmp_${uniqueSuffix}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024,  // Giới hạn 100 MB
    },
    fileFilter: (req, file, cb) => {
        // Cho phép các định dạng ảnh phổ biến và video
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Loại file không hợp lệ: ${file.mimetype}. Chỉ chấp nhận JPEG, PNG, WebP, MP4.`));
        }
    },
});

// ─────────────────────────────────────────────────────────────
// POST /sessions/:sessionId/files
// Upload file (ảnh/video) cho một phiên chụp.
// Tự động tạo session nếu chưa tồn tại.
// ─────────────────────────────────────────────────────────────
router.post('/:sessionId/files', authMiddleware, upload.single('file'), async (req, res) => {
    const { sessionId } = req.params;
    const { type } = req.body;
    const boothId = req.booth.id;

    try {
        // 1. Kiểm tra có file không
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Không có file trong request' });
        }

        // 2. Kiểm tra loại file hợp lệ
        if (!type || !['image', 'video'].includes(type)) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ success: false, error: 'Trường "type" phải là "image" hoặc "video"' });
        }

        // 3. Tìm hoặc tạo session trong MongoDB (cần trước để biết index)
        let session = await Session.findOne({ sessionId });

        if (!session) {
            session = new Session({
                sessionId,
                boothId,
                files: [],
            });
        }

        // 4. Tạo tên file theo quy tắc: {sessionId}_{boothId}_{timestamp}_{index}
        const ext = path.extname(req.file.originalname).toLowerCase();
        const now = new Date();
        const ts = now.toISOString().slice(0, 19).replace(/[T:]/g, '-'); // 2026-02-28-22-30-00
        const idx = String(session.files.length + 1).padStart(3, '0');
        const newFileName = `${sessionId}_${boothId}_${ts}_${idx}`;

        // 5. Upload lên Cloudinary với tên mới
        const { publicUrl, cloudinaryId } = await uploadToCloudinary(
            req.file.path,
            sessionId,
            type,
            newFileName,
        );

        // 6. Xóa file tạm sau khi upload xong
        fs.unlinkSync(req.file.path);

        // 7. Thêm file vào session
        session.files.push({
            type,
            url: publicUrl,
            cloudinaryId,
            fileName: `${newFileName}${ext}`,
        });

        await session.save();

        console.log(`✅  Upload thành công: ${req.file.originalname} → ${newFileName}${ext} → ${publicUrl}`);

        // 8. Trả kết quả
        return res.status(200).json({
            success: true,
            sessionId,
            fileName: `${newFileName}${ext}`,
            publicUrl,
        });
    } catch (err) {
        // Xóa file tạm nếu có lỗi
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        console.error(`❌  Lỗi upload: ${err.message}`);
        return res.status(500).json({
            success: false,
            error: 'Lỗi server khi xử lý upload',
        });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /sessions/:sessionId
// Lấy thông tin session (dùng cho frontend khi khách scan QR).
// KHÔNG cần xác thực (public endpoint).
// ─────────────────────────────────────────────────────────────
router.get('/:sessionId', async (req, res) => {
    const { sessionId } = req.params;

    try {
        const session = await Session.findOne({ sessionId });

        // Session không tồn tại hoặc đã hết hạn (bị TTL xóa)
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session không tồn tại hoặc đã hết hạn',
            });
        }

        // Kiểm tra hết hạn thủ công (phòng trường hợp TTL chưa chạy)
        if (new Date() > session.expiresAt) {
            return res.status(410).json({
                success: false,
                error: 'Session đã hết hạn',
            });
        }

        return res.status(200).json({
            sessionId: session.sessionId,
            boothId: session.boothId,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            files: session.files.map((f) => ({
                type: f.type,
                url: f.url,
            })),
        });
    } catch (err) {
        console.error(`❌  Lỗi lấy session: ${err.message}`);
        return res.status(500).json({
            success: false,
            error: 'Lỗi server',
        });
    }
});

module.exports = router;
