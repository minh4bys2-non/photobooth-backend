// ─── cleanup.js ─ Dọn dẹp session và file hết hạn ──────────
// Chạy định kỳ: tìm session hết hạn, xóa file trên Cloudinary,
// rồi xóa document trong MongoDB.
// (Bổ sung cho TTL index – TTL chỉ xóa document, không xóa file trên cloud)

const Session = require('../models/Session');
const { deleteFromCloudinary } = require('../services/cloudinary');

/**
 * Dọn dẹp session hết hạn:
 * 1. Tìm session có expiresAt < hiện tại
 * 2. Xóa từng file trên Cloudinary
 * 3. Xóa document trong MongoDB
 */
async function cleanupExpiredSessions() {
    try {
        const now = new Date();
        const expiredSessions = await Session.find({ expiresAt: { $lte: now } });

        if (expiredSessions.length === 0) return;

        console.log(`🧹  Tìm thấy ${expiredSessions.length} session hết hạn, đang dọn...`);

        for (const session of expiredSessions) {
            // Xóa file trên Cloudinary
            for (const file of session.files) {
                try {
                    await deleteFromCloudinary(file.cloudinaryId, file.type);
                    console.log(`   🗑️  Đã xóa file Cloudinary: ${file.cloudinaryId}`);
                } catch (err) {
                    console.error(`   ❌  Không xóa được file Cloudinary ${file.cloudinaryId}: ${err.message}`);
                }
            }

            // Xóa document MongoDB
            await Session.deleteOne({ _id: session._id });
            console.log(`   🗑️  Đã xóa session: ${session.sessionId}`);
        }

        console.log(`🧹  Dọn xong ${expiredSessions.length} session`);
    } catch (err) {
        console.error(`❌  Lỗi cleanup: ${err.message}`);
    }
}

/**
 * Bắt đầu job dọn dẹp định kỳ.
 * Chạy mỗi 1 giờ.
 */
function startCleanupJob() {
    // Chạy lần đầu sau 1 phút
    setTimeout(cleanupExpiredSessions, 60 * 1000);

    // Sau đó chạy mỗi 1 giờ
    setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

    console.log('🧹  Job dọn dẹp session hết hạn đã kích hoạt (mỗi 1 giờ)');
}

module.exports = { startCleanupJob, cleanupExpiredSessions };
