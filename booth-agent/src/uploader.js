// ─── uploader.js ─ Upload multipart có xác thực ─────────────
// POST /sessions/{sessionId}/files với Bearer auth.
// Khi thất bại → đưa vào hàng đợi retry. Không bao giờ throw lỗi.

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const config = require('./config');
const logger = require('./logger');

/**
 * Upload file lên backend API.
 *
 * @param {string} filePath   Đường dẫn tuyệt đối tới file
 * @param {string} sessionId  UUID v4 của phiên chụp
 * @param {string} fileType   "image" | "video"
 * @returns {Promise<{success: boolean, publicUrl?: string}>}
 */
async function uploadFile(filePath, sessionId, fileType) {
    const fileName = path.basename(filePath);
    const url = `${config.API_URL}/sessions/${sessionId}/files`;

    logger.info(`⬆️  Đang upload ${fileName} → ${url}  [loại=${fileType}]`);

    try {
        // Tạo form multipart
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath), fileName);
        form.append('boothId', config.BOOTH_ID);
        form.append('type', fileType);

        const response = await axios.post(url, form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${config.API_KEY}`,
            },
            timeout: 60000,            // timeout 60 giây mỗi lần upload
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        const data = response.data;

        if (data && data.success) {
            logger.info(`✅  Upload thành công: ${fileName} → ${data.publicUrl}`);
            return { success: true, publicUrl: data.publicUrl };
        }

        // Server phản hồi nhưng báo lỗi
        const errMsg = (data && data.error) || 'Lỗi server không xác định';
        logger.error(`❌  Upload bị từ chối: ${fileName} – ${errMsg}`);
        return { success: false };
    } catch (err) {
        // Lỗi mạng / timeout / 5xx
        const reason = err.response
            ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
            : err.message;
        logger.error(`❌  Upload thất bại: ${fileName} – ${reason}`);
        return { success: false };
    }
}

module.exports = { uploadFile };
