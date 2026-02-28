// ─── Session.js ─ Schema phiên chụp ─────────────────────────
// Lưu metadata session: sessionId, boothId, danh sách file, thời gian hết hạn.
// TTL index tự động xóa document khi hết hạn.

const mongoose = require('mongoose');
const config = require('../config');

const fileSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['image', 'video'],
        required: true,
    },
    url: {
        type: String,
        required: true,
    },
    cloudinaryId: {
        type: String,
        required: true,
    },
    fileName: {
        type: String,
        required: true,
    },
}, { _id: false });

const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    boothId: {
        type: String,
        required: true,
    },
    files: {
        type: [fileSchema],
        default: [],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    expiresAt: {
        type: Date,
        default: () => {
            const d = new Date();
            d.setDate(d.getDate() + config.SESSION_EXPIRY_DAYS);
            return d;
        },
        // TTL index – MongoDB tự động xóa document khi expiresAt qua
        index: { expires: 0 },
    },
});

module.exports = mongoose.model('Session', sessionSchema);
