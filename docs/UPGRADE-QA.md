# Biến thể đề thi — nâng cấp không gian giáo viên

## Phạm vi
Nâng cấp trên repository BienTheDeThi và dự án Vercel bien-the-de-thi hiện có. Hướng giao diện Indigo Studio: nền sáng, điều hướng riêng, sáu bước, ba đề mẫu, phần giải thích quy trình, hỗ trợ màn hình hẹp.

## Thay đổi và sửa lỗi
- Giữ các luồng phân tích, ba biến thể, lời giải, kiểm định, đối chiếu, sửa câu hỏi, thi thử, trộn mã đề, Word/in, lịch sử và sao lưu JSON.
- Tải tệp có nút chọn lại hoạt động; từ chối DOC cũ, tệp rỗng/quá lớn, DOCX hỏng. Không gửi dữ liệu nhị phân Word hỏng như văn bản.
- Lưu nháp nội dung nhập. Định danh phiên độc lập với tiêu đề; không ghi đè hai bộ đề trùng tên. Không lưu base64 PDF/ảnh lớn vào localStorage.
- Khôi phục phiên bị gián đoạn về bước có dữ liệu; kiểm tra JSON nhập trước khi mở. Giữ khóa lưu trữ cũ để tương thích.
- Phân tích lại thành công xóa các biến thể thuộc đề gốc trước. Tạo lại biến thể xóa các biến thể phụ thuộc; lỗi giữ kết quả trước đó. Chặn yêu cầu lặp.
- Trộn câu hỏi theo nhóm phần, chỉ trộn phương án trắc nghiệm đơn; giữ nguyên mệnh đề đúng/sai và ánh xạ đáp án.
- Thi thử chấm trắc nghiệm theo trọng số điểm; tự luận/đúng-sai/các dạng khác có ô bài làm, chờ giáo viên chấm. Sửa bộ lọc câu sai, mở lại/làm lại bài và nộp khi hết giờ.
- Câu sửa không được tự đánh dấu PASS. Bản sửa hàng loạt được kiểm định lại; thiếu kiểm định là WARNING, còn lỗi là FAIL.
- Đọc JSON đúng chuẩn trước bước sửa escape LaTeX. KaTeX đóng gói cùng ứng dụng, không bật trust HTML. Escape nội dung xuất HTML/Word.
- Bộ đếm hiển thị lượt mở thực trên thiết bị, bỏ số khởi tạo và tăng ngẫu nhiên.

## Kiểm tra tự động
`node --import tsx --test tests/core.test.ts`: 14 ca đạt.
`tsc --noEmit`: đạt.
`vite build`: đạt trước khi đưa lên Preview.

## Giới hạn cần hoàn tất trước production
- Dữ liệu tests/fixtures/synthetic-session.json là dữ liệu tổng hợp để thử giao diện, không phải kết quả gọi AI.
- Phải thử thật với API key người dùng: phân tích văn bản/PDF/ảnh/Word, tạo lần lượt 3 đề, kiểm định và sửa bằng AI. Phiên trình duyệt chưa có API key.
- Không có đăng nhập tài khoản trong ứng dụng hiện tại. API key cấu hình trên thiết bị; không được đưa vào GitHub.
- Xuất Word hiện là HTML tương thích Word với đuôi .doc, giữ hành vi cũ; công thức xuất ở dạng LaTeX. Nâng cấp DOCX/OMML có thể thực hiện riêng sau.
