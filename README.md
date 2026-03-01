# DSLR Photobooth – Web QR System

Hệ thống photobooth gồm 2 thành phần chính:

| Thành phần | Mô tả |
|---|---|
| `backend/` | API server (Express + MongoDB + Cloudinary) + Frontend gallery |
| `booth-agent/` | Agent chạy trên máy booth (watch folder → upload → tạo QR → in) |

## Cài đặt sau khi clone

### 1. Clone repo

```bash
git clone https://github.com/minh4bys2-non/photobooth-backend.git
cd photobooth-backend
```

### 2. Cài dependencies

```bash
cd backend
npm install

cd ../booth-agent
npm install
```

### 3. Cấu hình `.env`

Sao chép file `.env.example` thành `.env` rồi điền credentials:

```bash
# Backend
cd backend
cp .env.example .env
# Sửa .env: điền MONGODB_URI, CLOUDINARY_*, BOOTHS

# Booth Agent
cd ../booth-agent
cp .env.example .env
# Sửa .env: điền API_URL, API_KEY, BOOTH_ID, WATCH_DIR
```

### 4. Chạy

**Terminal 1 – Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 – Booth Agent:**
```bash
cd booth-agent
npm run dev
```

## Cấu trúc thư mục

```
├── backend/
│   ├── public/          # Frontend (HTML/CSS/JS)
│   │   ├── css/style.css
│   │   ├── js/app.js
│   │   └── session.html
│   ├── src/
│   │   ├── config.js
│   │   ├── db.js
│   │   ├── index.js         # Entry point
│   │   ├── jobs/cleanup.js  # Dọn session hết hạn
│   │   ├── middleware/auth.js
│   │   ├── models/Session.js
│   │   ├── routes/sessions.js
│   │   └── services/cloudinary.js
│   ├── .env.example
│   └── package.json
│
├── booth-agent/
│   ├── src/
│   │   ├── config.js
│   │   ├── index.js         # Entry point
│   │   ├── watcher.js       # Theo dõi thư mục ảnh
│   │   ├── sessionManager.js
│   │   ├── uploader.js
│   │   ├── qrGenerator.js
│   │   ├── compositeQr.js   # Ghép QR lên ảnh in
│   │   ├── queue.js         # Retry queue
│   │   └── logger.js
│   ├── .env.example
│   └── package.json
│
└── .gitignore
```

## Luồng xử lý

1. DSLR xuất ảnh → thư mục `WATCH_DIR`
2. Booth Agent phát hiện → nhóm ảnh vào session (cửa sổ 10s)
3. Upload lên Backend API → Cloudinary
4. Session đóng → tạo QR code + ghép QR lên ảnh để in
5. Khách scan QR → xem và tải ảnh tại `/s/{sessionId}`
