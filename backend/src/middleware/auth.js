// ─── auth.js ─ Middleware xác thực ───────────────────────────
// Kiểm tra API key trong header Authorization: Bearer <key>
// và xác nhận boothId khớp với key đó.

const config = require('../config');

function authMiddleware(req, res, next) {
    // 1. Lấy token từ header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Thiếu hoặc sai định dạng Authorization header',
        });
    }

    const token = authHeader.slice(7); // Bỏ "Bearer "

    // 2. Tìm booth có API key khớp
    const booth = config.BOOTHS.find((b) => b.apiKey === token);
    if (!booth) {
        return res.status(401).json({
            success: false,
            error: 'API key không hợp lệ',
        });
    }

    // 3. Kiểm tra boothId (từ body/form) khớp với key
    const boothId = req.body.boothId;
    if (boothId && boothId !== booth.id) {
        return res.status(403).json({
            success: false,
            error: 'boothId không khớp với API key',
        });
    }

    // Gắn thông tin booth vào request để dùng ở route handler
    req.booth = booth;
    next();
}

module.exports = authMiddleware;
