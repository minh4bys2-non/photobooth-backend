// ─── app.js ─ Client-side logic cho gallery ─────────────────
// Đọc sessionId từ URL → gọi API → render ảnh/video.

(function () {
    'use strict';

    // ── DOM ──────────────────────────────────────────────────
    const $loading = document.getElementById('loading');
    const $error = document.getElementById('error');
    const $errorMsg = document.getElementById('error-message');
    const $gallery = document.getElementById('gallery');
    const $grid = document.getElementById('gallery-grid');
    const $sessionInfo = document.getElementById('session-info');
    const $expiryDate = document.getElementById('expiry-date');
    const $downloadAll = document.getElementById('btn-download-all');
    const $lightbox = document.getElementById('lightbox');
    const $lightboxImg = document.getElementById('lightbox-img');
    const $lightboxDl = document.getElementById('lightbox-download');

    // ── Lấy sessionId từ URL (/s/{sessionId}) ───────────────
    const pathParts = window.location.pathname.split('/');
    const sessionId = pathParts[pathParts.length - 1];

    if (!sessionId) {
        showError('URL không hợp lệ');
        return;
    }

    // ── Gọi API lấy dữ liệu session ────────────────────────
    fetchSession();

    async function fetchSession() {
        try {
            const res = await fetch(`/api/v1/sessions/${sessionId}`);
            const data = await res.json();

            if (!res.ok || !data.sessionId) {
                showError(data.error || 'Session không tồn tại');
                return;
            }

            renderGallery(data);
        } catch (err) {
            showError('Không thể kết nối server');
        }
    }

    // ── Render gallery ──────────────────────────────────────
    function renderGallery(data) {
        $loading.classList.add('hidden');
        $gallery.classList.remove('hidden');

        // Thông tin session
        const created = new Date(data.createdAt);
        $sessionInfo.textContent = `Chụp lúc ${formatDate(created)} • ${data.files.length} ảnh/video`;

        // Ngày hết hạn
        const expiry = new Date(data.expiresAt);
        $expiryDate.textContent = formatDate(expiry);

        // Render từng file
        data.files.forEach((file, idx) => {
            const card = document.createElement('div');
            card.className = 'gallery-card' + (file.type === 'video' ? ' is-video' : '');

            if (file.type === 'video') {
                card.innerHTML = `
                    <video src="${file.url}" muted playsinline preload="metadata"></video>
                    <div class="card-download">
                        <a class="btn-card-dl" href="${file.url}" download title="Tải video">⬇</a>
                    </div>
                `;
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-card-dl')) return;
                    // Mở video trong tab mới
                    window.open(file.url, '_blank');
                });
            } else {
                card.innerHTML = `
                    <img src="${file.url}" alt="Ảnh ${idx + 1}" loading="lazy">
                    <div class="card-download">
                        <a class="btn-card-dl" href="${file.url}" download title="Tải ảnh">⬇</a>
                    </div>
                `;
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-card-dl')) return;
                    openLightbox(file.url);
                });
            }

            $grid.appendChild(card);
        });

        // Nút "Tải tất cả"
        $downloadAll.addEventListener('click', () => {
            downloadAll(data.files);
        });
    }

    // ── Lightbox ────────────────────────────────────────────
    window.openLightbox = function (url) {
        $lightboxImg.src = url;
        $lightboxDl.href = url;
        $lightbox.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    window.closeLightbox = function () {
        $lightbox.classList.add('hidden');
        $lightboxImg.src = '';
        document.body.style.overflow = '';
    };

    // ESC đóng lightbox
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
    });

    // ── Download all ────────────────────────────────────────
    async function downloadAll(files) {
        $downloadAll.textContent = '⏳ Đang tải...';
        $downloadAll.disabled = true;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const res = await fetch(file.url);
                const blob = await res.blob();
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);

                // Tạo tên file
                const ext = file.type === 'video' ? '.mp4' : '.jpg';
                a.download = `photobooth_${i + 1}${ext}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);

                // Delay nhỏ để tránh browser block
                await new Promise(r => setTimeout(r, 300));
            } catch (err) {
                console.error(`Không tải được file ${i + 1}:`, err);
            }
        }

        $downloadAll.textContent = '✅ Đã tải xong!';
        setTimeout(() => {
            $downloadAll.textContent = '⬇️ Tải tất cả';
            $downloadAll.disabled = false;
        }, 2000);
    }

    // ── Error screen ────────────────────────────────────────
    function showError(msg) {
        $loading.classList.add('hidden');
        $error.classList.remove('hidden');
        $errorMsg.textContent = msg;
    }

    // ── Format date ─────────────────────────────────────────
    function formatDate(date) {
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
})();
