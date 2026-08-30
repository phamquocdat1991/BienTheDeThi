export interface SampleExam {
  id: string;
  title: string;
  subject: string;
  grade: string;
  duration: string;
  description: string;
  content: string;
}

export const SAMPLE_EXAMS: SampleExam[] = [
  {
    id: 'toan-10',
    title: 'Đề Kiểm Tra Giữa Kỳ I - Môn Toán 10 (Hàm số & Phương trình bậc hai)',
    subject: 'Toán học',
    grade: 'Lớp 10',
    duration: '45 phút',
    description: 'Bao gồm 6 câu trắc nghiệm và 2 câu tự luận về tập xác định, tính đơn điệu, đỉnh parabol và nghiệm tam thức bậc 2.',
    content: `TRƯỜNG THPT CHUYÊN HÀ NỘI - AMSTERDAM
ĐỀ KIỂM TRA GIỮA HỌC KỲ I - NĂM HỌC 2025 - 2026
MÔN: TOÁN 10 - THỜI GIAN: 45 PHÚT

PHẦN I. TRẮC NGHIỆM KHÁCH QUAN (6.0 điểm)

Câu 1: Tập xác định của hàm số y = \\sqrt{2x - 6} là:
A. D = [3; +\\infty)
B. D = (3; +\\infty)
C. D = (-\\infty; 3]
D. D = \\mathbb{R} \\setminus {3}

Câu 2: Tọa độ đỉnh I của parabol (P): y = x^2 - 4x + 3 là:
A. I(2; -1)
B. I(-2; 15)
C. I(4; 3)
D. I(-4; 35)

Câu 3: Trục đối xứng của parabol y = -2x^2 + 8x - 1 là đường thẳng:
A. x = 2
B. x = -2
C. x = 4
D. y = 2

Câu 4: Bất phương trình bậc hai x^2 - 5x + 6 > 0 có tập nghiệm là:
A. S = (-\\infty; 2) \\cup (3; +\\infty)
B. S = (2; 3)
C. S = [2; 3]
D. S = \\mathbb{R}

Câu 5: Cho hàm số y = f(x) = (m - 2)x + 3. Giá trị của m để hàm số đồng biến trên \\mathbb{R} là:
A. m > 2
B. m < 2
C. m \\ge 2
D. m = 2

Câu 6: Cho tam thức bậc hai f(x) = ax^2 + bx + c (a \\neq 0) có \\Delta = b^2 - 4ac < 0 và a > 0. Mệnh đề nào sau đây đúng?
A. f(x) > 0 với mọi x \\in \\mathbb{R}
B. f(x) < 0 với mọi x \\in \\mathbb{R}
C. f(x) \\ge 0 với mọi x \\in \\mathbb{R}
D. f(x) đổi dấu khi x qua các nghiệm

PHẦN II. TỰ LUẬN (4.0 điểm)

Câu 7 (2.0 điểm): Một quả bóng được đá lên từ mặt đất với độ cao h (mét) theo thời gian t (giây) được mô hình hóa bởi hàm số h(t) = -5t^2 + 20t.
a) Tính độ cao cực đại mà quả bóng có thể đạt được.
b) Sau bao nhiêu giây kể từ lúc đá thì quả bóng chạm đất?

Câu 8 (2.0 điểm): Tìm tất cả các giá trị thực của tham số m để phương trình x^2 - 2(m + 1)x + m^2 + 3 = 0 có hai nghiệm phân biệt x_1, x_2 thỏa mãn điều kiện x_1^2 + x_2^2 = 10.`,
  },
  {
    id: 'vat-ly-11',
    title: 'Đề Kiểm Tra 1 Tiết - Môn Vật Lý 11 (Dao Động Điều Hòa & Sóng Cơ)',
    subject: 'Vật lý',
    grade: 'Lớp 11',
    duration: '45 phút',
    description: 'Đề gồm 6 câu trắc nghiệm và bài toán con lắc lò xo, truyền sóng cơ học.',
    content: `SỞ GD&ĐT TP. HỒ CHÍ MINH
ĐỀ KIỂM TRA ĐỊNH KỲ - MÔN VẬT LÝ 11
Thời gian: 45 phút

PHẦN I: TRẮC NGHIỆM (6,0 điểm)

Câu 1: Phương trình dao động điều hòa của một chất điểm có dạng x = 6\\cos(4\\pi t + \\pi/3) (cm). Biên độ dao động của chất điểm là:
A. A = 6 cm
B. A = 4\\pi cm
C. A = 12 cm
D. A = 3 cm

Câu 2: Một con lắc lò xo có độ cứng k = 100 N/m, gắn vật nặng khối lượng m = 0,25 kg. Tần số góc dao động riêng của con lắc là:
A. \\omega = 20 rad/s
B. \\omega = 10 rad/s
C. \\omega = 40 rad/s
D. \\omega = 5 rad/s

Câu 3: Trong dao động điều hòa, gia tốc của vật biến thiên:
A. Ngược pha với li độ
B. Cùng pha với li độ
C. Sớm pha \\pi/2 so với vận tốc
D. Trễ pha \\pi/2 so với li độ

Câu 4: Một sóng cơ hình sin truyền theo trục Ox với chu kỳ T = 0,2 s và bước sóng \\lambda = 40 cm. Tốc độ truyền sóng là:
A. v = 2 m/s
B. v = 200 m/s
C. v = 8 m/s
D. v = 0,8 m/s

Câu 5: Thế năng của một vật dao động điều hòa với biên độ A biến thiên tuần hoàn với chu kỳ bằng:
A. T/2
B. T
C. 2T
D. Không đổi theo thời gian

Câu 6: Khoảng cách giữa hai điểm gần nhau nhất trên cùng một phương truyền sóng dao động ngược pha nhau là:
A. \\lambda / 2
B. \\lambda
C. 2\\lambda
D. \\lambda / 4

PHẦN II: TỰ LUẬN (4,0 điểm)

Câu 7 (2,5 điểm): Một con lắc lò xo nằm ngang gồm lò xo có độ cứng k = 80 N/m và vật nhỏ m = 200 g. Kéo vật ra khỏi vị trí cân bằng một đoạn 5 cm rồi thả nhẹ cho vật dao động điều hòa không ma sát. Chọn gốc thời gian t = 0 là lúc thả vật, chiều dương cùng chiều kéo vật.
a) Viết phương trình dao động của vật.
b) Tính cơ năng toàn phần của con lắc và vận tốc cực đại của vật trong quá trình dao động.

Câu 8 (1,5 điểm): Một sóng cơ truyền từ điểm M đến điểm N cách nhau 15 cm trên cùng một phương truyền sóng với vận tốc v = 1,2 m/s và tần số f = 10 Hz. Xác định độ lệch pha giữa hai dao động tại M và N.`,
  },
  {
    id: 'hoa-hoc-12',
    title: 'Đề Kiểm Tra - Môn Hóa Học 12 (Este - Lipit & Cacbohidrat)',
    subject: 'Hóa học',
    grade: 'Lớp 12',
    duration: '45 phút',
    description: 'Đề gồm các câu trắc nghiệm phản ứng thủy phân este, nhận biết cacbohidrat và bài toán tính khối lượng muối xà phòng.',
    content: `TRƯỜNG THPT NGUYỄN HUỆ
ĐỀ KIỂM TRA ĐỊNH KỲ MÔN HÓA HỌC 12
Thời gian: 45 phút

PHẦN I. TRẮC NGHIỆM (7.0 điểm)

Câu 1: Hợp chất nào sau đây là este no, đơn chức, mạch hở?
A. C_2H_4O_2
B. C_2H_6O
C. C_3H_4O_2
D. C_4H_6O_2

Câu 2: Thủy phân hoàn toàn etyl axetat trong dung dịch NaOH đun nóng thu được muối nào?
A. Natri axetat
B. Natri fomiat
C. Natri propionat
D. Natri etylat

Câu 3: Chất nào sau đây có phản ứng tráng bạc (tác dụng với AgNO_3 trong dung dịch NH_3 đun nóng)?
A. Glucozơ
B. Saccarozơ
C. Xenlulozơ
D. Tinh bột

Câu 4: Thủy phân hoàn toàn 1 mol saccarozơ trong môi trường axit sinh ra:
A. 1 mol glucozơ và 1 mol fructozơ
B. 2 mol glucozơ
C. 2 mol fructozơ
D. 1 mol glucozơ và 1 mol galactozơ

Câu 5: Chất béo tristearin có công thức phân tử là:
A. (C_17H_35COO)_3C_3H_5
B. (C_17H_33COO)_3C_3H_5
C. (C_15H_31COO)_3C_3H_5
D. (C_17H_31COO)_3C_3H_5

Câu 6: Để phân biệt hai dung dịch glucozơ và saccarozơ, thuốc thử thông dụng nhất ở nhiệt độ thường là:
A. Cu(OH)_2 đun nóng nhẹ
B. Nước brom
C. Quỳ tím
D. Dung dịch NaOH

Câu 7: Đun nóng 8,8 gam etyl axetat với 150 ml dung dịch NaOH 1M. Sau khi phản ứng xảy ra hoàn toàn, cô cạn dung dịch thu được khối lượng chất rắn khan là:
A. 8,2 gam
B. 10,2 gam
C. 12,2 gam
D. 9,6 gam

PHẦN II. TỰ LUẬN (3.0 điểm)

Câu 8: Xà phòng hóa hoàn toàn 17,76 gam chất béo X cần vừa đủ 0,06 mol KOH. Sau phản ứng thu được glixerol và hỗn hợp muối kali của hai axit béo là axit panmitic và axit oleic.
a) Tính khối lượng glixerol thu được.
b) Tính tổng khối lượng muối thu được sau phản ứng xà phòng hóa.`,
  },
];
