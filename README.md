# 📚 AI Biến Thể Đề Thi 3 Cấp Độ — Chuẩn Sư Phạm Bộ GD&ĐT

Ứng dụng AI chuyên dụng hỗ trợ giáo viên phân tích ma trận đề kiểm tra gốc và tự động tạo 03 cấp độ đề thi biến thể tuần tự (Đổi số liệu, Dạng bài tương đương, Phân hóa sâu), đi kèm động cơ giải lại từng bước và kiểm định độc lập 8 tiêu chí.

---

## 🌟 Tính Năng Nổi Bật

1. **Phân Tích Ma Trận Đề Gốc Đa Phương Thức**: Hỗ trợ tải lên file Word (`.docx`), PDF, Ảnh đề thi (`.png, .jpg, .webp`) hoặc dán văn bản.
2. **03 Cấp Độ Biến Thể Tuần Tự**:
   - **Đề 1 (Mức 1)**: Đổi dữ kiện, số liệu & ngữ cảnh thực tế, giữ nguyên dạng bài.
   - **Đề 2 (Mức 2)**: Dạng bài tương đương (Isomorphic), bảo toàn chuẩn kiến thức kỹ năng.
   - **Đề 3 (Mức 3)**: Phân hóa & Vận dụng sâu, tăng chiều sâu tư duy và giải quyết tình huống thực tiễn.
3. **Động Cơ Kiểm Định Độc Lập 8 Tiêu Chí**: Chuyên gia phản biện AI độc lập rà soát tính khoa học, công thức, điều kiện nghiệm, tính duy nhất của đáp án và tự động sửa các câu chưa đạt.
4. **Hiển Thị Công Thức Toán Học KaTeX**: Hỗ trợ công thức LaTeX, phân số, căn, tích phân, ma trận, công thức hóa học sắc nét.
5. **Chỉnh Sửa & AI Hiệu Chỉnh Từng Câu**: Giáo viên có thể sửa trực tiếp hoặc nhờ AI giải lại một câu cụ thể theo yêu cầu.
6. **Xuất File Word (.doc) & In Ấn**: Tải trọn bộ 3 đề thi và bảng đáp án / hướng dẫn chấm chi tiết chuẩn mẫu trường học.
7. **Bộ Đếm Lượt Truy Cập Server-Side**: Đếm tổng lượt truy cập thực tế qua `counterapi.dev`.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Local)

### Yêu cầu:
- Node.js (phiên bản 18 trở lên)
- Trình duyệt hiện đại (Chrome, Edge, Safari, Firefox)

### Các bước:
1. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
2. Khởi chạy môi trường phát triển:
   ```bash
   npm run dev
   ```
   Ứng dụng sẽ mở tại `http://localhost:5173` (hoặc cổng hiển thị trên terminal).

3. Nhập API Key:
   - Bấm nút **Cài đặt API Key** trên Header.
   - Nhập khóa API Google của bạn (lấy tại [Google AI Studio](https://aistudio.google.com/apikey)).
   - Hỗ trợ cả 2 định dạng: `AIzaSy...` và `AQ...`.

---

## 🌐 Hướng Dẫn Triển Khai Lên Vercel (1-Click Deployment)

Ứng dụng được thiết kế chạy **100% Client-Side**, sẵn sàng triển khai trực tiếp từ GitHub lên Vercel mà không cần cấu hình server phức tạp:

1. Đẩy mã nguồn lên kho lưu trữ GitHub của bạn:
   ```bash
   git add .
   git commit -m "Deploy AI Bien The De Thi 3 Cap Do"
   git push origin main
   ```
2. Đăng nhập [Vercel](https://vercel.com) và chọn **"Add New Project"**.
3. Import repository GitHub vừa tạo.
4. Giữ nguyên các thiết lập mặc định (Framework Preset: **Vite**; Build Command: `npm run build`; Output Directory: `dist`).
5. Bấm **Deploy**. Ứng dụng sẽ hoạt động mượt mà với tệp cấu hình `vercel.json` định tuyến SPA có sẵn.
