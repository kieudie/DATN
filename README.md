# DATN - Hệ thống tuyển dụng nội bộ

Hệ thống hỗ trợ HR và Manager quản lý quy trình tuyển dụng nội bộ, đồng bộ hồ sơ ứng viên qua API, xử lý pipeline tuyển dụng, đánh giá CV, tạo yêu cầu tuyển dụng và thống kê báo cáo.

## Công nghệ sử dụng

* NestJS
* TypeORM
* MySQL
* Redis
* ReactJS
* Vite

## Yêu cầu môi trường

Trước khi chạy hệ thống, cần cài đặt:

* Node.js
* MySQL Server
* Redis Server
* npm hoặc yarn

## Cấu hình database

Hệ thống sử dụng MySQL local.

Thông tin cấu hình mặc định:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=datn_123456
DB_DATABASE=datn_recruitment
```

Nếu chưa có database, import file backup database:

```powershell
mysql -uroot -p datn_recruitment < datn_recruitment_backup.sql
```

Hoặc dùng MySQL Workbench để import file `.sql`.

## Cấu hình Redis

Hệ thống sử dụng Redis local.

Thông tin cấu hình mặc định:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
REDIS_DB=0
REDIS_URL=redis://localhost:6379
```

Kiểm tra Redis đang chạy:

```powershell
redis-cli -h 127.0.0.1 -p 6379 ping
```

Nếu trả về `PONG` là Redis hoạt động bình thường.

## Chạy backend

Di chuyển vào thư mục backend:

```powershell
cd backend
```

Cài đặt thư viện:

```powershell
npm install
```

Chạy backend:

```powershell
npm run start:dev
```

Backend chạy tại:

```text
http://localhost:3000
```

Swagger API Docs:

```text
http://localhost:3000/api-docs
```

## Chạy frontend

Di chuyển vào thư mục frontend:

```powershell
cd fe
```

Cài đặt thư viện:

```powershell
npm install
```

Chạy frontend:

```powershell
npm run dev
```

Frontend chạy tại:

```text
http://localhost:5173
```

## Kiểm tra hệ thống

Sau khi chạy backend và frontend, kiểm tra các chức năng chính:

* Đăng nhập hệ thống
* Xem danh sách ứng viên
* Quản lý pipeline tuyển dụng
* Quản lý yêu cầu tuyển dụng
* Xem thông báo
* Xem báo cáo thống kê

