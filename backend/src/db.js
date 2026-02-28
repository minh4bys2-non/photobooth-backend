// ─── db.js ─ Kết nối MongoDB Atlas ──────────────────────────
// Dùng Mongoose kết nối tới cluster MongoDB Atlas.
// Hỗ trợ fallback DNS khi SRV lookup bị chặn bởi mạng local.

const dns = require('dns');
const mongoose = require('mongoose');
const config = require('./config');

// Đặt DNS server thành Google DNS để giải quyết SRV lookup
// bị chặn bởi một số mạng nội bộ / ISP.
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function connectDB() {
    try {
        await mongoose.connect(config.MONGODB_URI);
        console.log('✅  Đã kết nối MongoDB Atlas');
    } catch (err) {
        console.error(`❌  Kết nối MongoDB thất bại: ${err.message}`);
        process.exit(1);
    }

    // Xử lý mất kết nối giữa chừng
    mongoose.connection.on('error', (err) => {
        console.error(`❌  Lỗi MongoDB: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  Mất kết nối MongoDB');
    });
}

module.exports = { connectDB };
