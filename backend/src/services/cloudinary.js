// ─── cloudinary.js ─ Service upload Cloudinary ──────────────
// Cấu hình và upload file lên Cloudinary, trả về URL public.

const cloudinary = require('cloudinary').v2;
const config = require('../config');

// Cấu hình Cloudinary
cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
});

/**
 * Upload file lên Cloudinary.
 *
 * @param {string} filePath    Đường dẫn tạm của file (từ multer)
 * @param {string} sessionId   UUID phiên chụp
 * @param {"image"|"video"} fileType   Loại file
 * @param {string} publicId    Tên file chuẩn (không có đuôi mở rộng)
 * @returns {Promise<{ publicUrl: string, cloudinaryId: string }>}
 */
async function uploadToCloudinary(filePath, sessionId, fileType, publicId) {
    // Chọn resource_type phù hợp
    const resourceType = fileType === 'video' ? 'video' : 'image';

    const result = await cloudinary.uploader.upload(filePath, {
        resource_type: resourceType,
        folder: `photobooth/${sessionId}`,   // Tổ chức theo session
        public_id: publicId,                 // Tên file theo quy tắc
        unique_filename: false,              // Không thêm hậu tố random
    });

    return {
        publicUrl: result.secure_url,
        cloudinaryId: result.public_id,
    };
}

/**
 * Xóa file trên Cloudinary theo public_id.
 *
 * @param {string} cloudinaryId   Public ID trên Cloudinary
 * @param {"image"|"video"} fileType   Loại file
 */
async function deleteFromCloudinary(cloudinaryId, fileType) {
    const resourceType = fileType === 'video' ? 'video' : 'image';
    await cloudinary.uploader.destroy(cloudinaryId, {
        resource_type: resourceType,
    });
}

module.exports = { uploadToCloudinary, deleteFromCloudinary };
