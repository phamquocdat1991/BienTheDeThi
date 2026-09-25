# 🎯 AI Biến Thể Đề Thi 3 Cấp Độ - Chuẩn Sư Phạm Bộ GD&ĐT (GDPT 2018)

Ứng dụng AI chuyên dụng hỗ trợ giáo viên phân tích ma trận đề kiểm tra gốc và tự động tạo 03 cấp độ đề thi biến thể tuần tự (**Đổi số liệu**, **Dạng bài tương đương**, **Phân hóa sâu**), đi kèm động cơ giải lại từng bước, kiểm định độc lập 8 tiêu chí và xuất bản tài liệu chuẩn sư phạm.

---

## ✨ Tính Năng Nổi Bật Đã Được Nâng Cấp Toàn Diện

1. **Phân Tích Ma Trận Đề Gốc Đa Phương Thức**:
   - Hỗ trợ tải lên file Word (`.docx`), PDF, ảnh đề thi (`.png, .jpg, .webp`) hoặc dán văn bản.
   - Nhận diện đầy đủ 4 dạng thức câu hỏi theo chuẩn **GDPT 2018** (Áp dụng từ kỳ thi Tốt nghiệp THPT 2025):
     - **Dạng 1**: Trắc nghiệm 4 lựa chọn (A, B, C, D).
     - **Dạng 2**: Trắc nghiệm Đúng / Sai (Gồm 4 lệnh hỏi a, b, c, d độc lập).
     - **Dạng 3**: Trắc nghiệm Trả lời ngắn (Điền số thực, phân số hoặc đáp số ngắn).
     - **Dạng 4**: Tự luận (Lời giải chi tiết và barem điểm từng bước).

2. **03 Cấp Độ Biến Thể Tuần Tự**:
   - **Đề 1 (Cấp 1)**: Đổi dữ kiện, số liệu & ngữ cảnh thực tế, giữ nguyên dạng bài.
   - **Đề 2 (Cấp 2)**: Dạng bài tương đương (Isomorphic), bảo toàn chuẩn kiến thức kỹ năng.
   - **Đề 3 (Cấp 3)**: Phân hóa & Vận dụng sâu, tăng chiều sâu tư duy trong khung chương trình GDPT 2018.

3. **Động Cơ Kiểm Định Độc Lập 8 Tiêu Chí & Tự Động Sửa Câu Lỗi**:
   - Chuyên gia phản biện AI độc lập rà soát: Tính khoa học, công thức, định luật, điều kiện nghiệm, tính duy nhất của đáp án, độ khó, chuẩn lớp học.
   - Tự động sửa lại hoàn hảo các câu bị đánh giá FAIL.

4. **Hiển Thị Công Thức Toán Học KaTeX Nội Bộ (Offline Ready)**:
   - Đóng gói trực tiếp thư viện `katex` vào bundle ứng dụng, không phụ thuộc CDN mạng ngoài.
   - Tắt cờ `trust` để bảo vệ an toàn XSS theo chuẩn giáo dục.

5. **Thi Thử Trực Tuyến & Chấm Điểm Theo Trọng Số**:
   - Chấm điểm trắc nghiệm theo điểm số (`points`) thực tế của từng câu.
   - Hỗ trợ chấm điểm Đúng/Sai, so sánh Trả lời ngắn và ô làm bài cho câu Tự luận.
   - Đồng hồ đếm ngược, tự động nộp bài và hiệu ứng chúc mừng khi đạt điểm giỏi.

6. **Trộn Đề Thi Phân Nhóm & Bảng Đáp Án Đối Chiếu**:
   - Xáo trộn câu hỏi trong từng Phần (Trắc nghiệm chỉ đảo trong trắc nghiệm, không lẫn với Đúng/Sai hay Tự luận).
   - Bảo toàn mệnh đề con (a, b, c, d) của câu Đúng/Sai.
   - Tạo mã đề phụ (101, 102, 103, 104) và bảng tổng hợp ma trận đáp án.

7. **Xuất File Word (.docx) Chuẩn Nghị Định 30/2020/NĐ-CP**:
   - Tạo file Word `.docx` chuẩn A4 (căn lề Trên 2cm, Dưới 2cm, Trái 3cm, Phải 2cm, font Times New Roman).
   - Bảng thông tin trường, môn học, khung điểm, bảng đáp án nhanh và hướng dẫn giải chi tiết.
   - Xuất trọn bộ 3 đề biến thể chỉ với 1 click.

8. **Bảo Mật API Key & Chống Tràn Bộ Nhớ**:
   - Hỗ trợ nút **Kiểm tra kết nối (Test Connection)** đo độ trễ mạng thực tế và liệt kê mô hình khả dụng.
   - Tùy chọn **Lưu trong phiên (Session-only)** an toàn khi sử dụng máy tính phòng tin học trường học.
   - Tự động lọc bỏ tệp nhị phân lớn trước khi lưu vào `localStorage`, triệt tiêu lỗi `QuotaExceededError`.

---

## 🛠️ Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Local)

### Yêu cầu:
- Node.js (phiên bản 18 trở lên)
- Trình quản lý gói: `pnpm` (khuyên dùng) hoặc `npm`

### Các bước:
1. Cài đặt các gói phụ thuộc:
   ```bash
   pnpm install
   ```
2. Chạy kiểm thử tự động 15 test cases:
   ```bash
   pnpm test
   ```
3. Kiểm tra kiểu TypeScript:
   ```bash
   pnpm typecheck
   ```
4. Khởi chạy môi trường phát triển:
   ```bash
   pnpm dev
   ```
   Ứng dụng sẽ mở tại `http://localhost:5173`.

---

## 🚀 Triển Khai Lên Vercel (1-Click Deployment)

Ứng dụng được thiết kế chạy **100% Client-Side**, sẵn sàng triển khai trực tiếp từ GitHub lên Vercel:

1. Đẩy mã nguồn lên kho lưu trữ GitHub của bạn:
   ```bash
   git add .
   git commit -m "feat: comprehensive upgrade with GDPT 2018, offline KaTeX, docx export, resilience gateway"
   git push origin main
   ```
2. Đăng nhập [Vercel](https://vercel.com) và chọn **"Add New Project"**.
3. Import repository GitHub.
4. Giữ nguyên các thiết lập mặc định (Framework: **Vite**; Build Command: `pnpm build`; Output Directory: `dist`).
5. Bấm **Deploy**.
