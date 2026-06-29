# HR Recruitment System - Backend

Dự án backend cho hệ thống quản lý tuyển dụng HR Recruitment System, được xây dựng dựa trên framework NestJS.

## Công nghệ sử dụng

* NestJS
* TypeORM
* MySQL
* Redis

## Yêu cầu môi trường

Trước khi chạy backend, cần đảm bảo đã cài đặt:

* Node.js (phiên bản 18+)
* MySQL Server (phiên bản 8.0+)
* Redis Server
* npm hoặc yarn

## Cấu hình môi trường

Hệ thống sử dụng các dịch vụ (MySQL, Redis) chạy trực tiếp trên máy tính local.

### 1. Cấu hình Database (MySQL)

Hãy đảm bảo bạn đã tạo database `datn_recruitment` và import dữ liệu từ file backup (nếu có).
Kiểm tra cấu hình trong file `.env` tại thư mục `backend`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=datn_123456
DB_DATABASE=datn_recruitment
```

### 2. Cấu hình Cache (Redis)

Đảm bảo Redis server đang chạy ở port `6379`.
Cấu hình Redis trong file `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
REDIS_DB=0
REDIS_URL=redis://localhost:6379
```

## Cài đặt thư viện

Tại thư mục `backend`, chạy lệnh sau để cài đặt các dependencies cần thiết:

```powershell
npm install
```

## Chạy ứng dụng

Bạn có thể chạy ứng dụng ở các chế độ khác nhau:

```powershell
# Chế độ development
npm run start

# Chế độ watch (tự động reload khi có thay đổi code)
npm run start:dev

# Chế độ production
npm run start:prod
```

## API Documentation (Swagger)

Hệ thống cung cấp tài liệu API tự động qua Swagger.
Sau khi khởi động backend thành công, bạn có thể xem danh sách các API và test trực tiếp tại địa chỉ:

```text
http://localhost:3000/api-docs
```
