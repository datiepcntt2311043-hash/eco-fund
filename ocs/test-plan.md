0. Chuẩn bị và quy ước
Vai trò (Remix VM)
Ký hiệu	Tài khoản Remix	Vai trò
A1	Tài khoản 1 (người deploy)	Admin, đồng thời là verifier
A2	Tài khoản 2	Owner (người tạo chiến dịch)
A3	Tài khoản 3	Donor 1
A4	Tài khoản 4	Donor 2, cũng dùng làm "người lạ"
Chuẩn bị
Tab Deploy, Environment chọn Remix VM.
Chọn contract CampaignFactory, bằng A1 bấm Deploy.
Ghi lại địa chỉ A1, A2, A3, A4 vào file ghi chú.
Mỗi lần thao tác, nhìn ô Account trước khi bấm nút.
Cách đọc nút trong Remix
Màu nút	Loại	Kết quả hiện ở đâu
Xanh dương	Hàm đọc (view), miễn phí	Ngay dưới nút
Cam	Hàm ghi, không nhận tiền	Console (tích xanh là thành công, revert là bị từ chối)
Đỏ	Hàm ghi nhận tiền (donate)	Console
Lưu ý quan trọng khi test
Ô Value của từng khối contract. Remix có ô Value riêng cho mỗi khối contract (nằm cuối khối, dưới "Low level interaction") và nó giữ nguyên giá trị giữa các lần bấm. Chỉ donate được phép có Value lớn hơn 0. Sau mỗi lần donate, đặt lại Value về 0 ở đúng khối đó. Nếu quên, các hàm không nhận tiền (submitProof, approveMilestone...) sẽ bị revert không có lý do.
Khi donate, chọn đúng đơn vị Ether (mặc định là wei).
Dòng "Từ chối" trong bảng là kết quả đúng. Console hiện đỏ không có nghĩa là test hỏng.
Làm theo thứ tự ID vì các bước phụ thuộc nhau.
Mỗi lần chạy lại từ đầu, deploy Factory mới để dữ liệu sạch.
Phần 1. Nút của CampaignFactory
admin
ID	Ví	Thao tác	Kết quả mong đợi	Kết quả thực tế	Đạt/Không
B1	bất kỳ	Bấm admin	Trả về địa chỉ A1		
approvedOwners
ID	Ví	Nhập	Kết quả mong đợi	Kết quả thực tế	Đạt/Không
B2	bất kỳ	Địa chỉ A2 (trước khi duyệt)	false		
B3	bất kỳ	Địa chỉ A2 (sau khi duyệt ở B8, bấm Call lại)	true		
approveOwner
ID	Ví	Nhập	Kết quả mong đợi	Kết quả thực tế	Đạt/Không
B4	A3	Địa chỉ A2	Từ chối: Chi admin duoc goi		
B5	A1	Địa chỉ A1	Từ chối: Admin khong duoc la owner (tranh xung dot loi ich)		
B6	A1	0x0000000000000000000000000000000000000000	Từ chối: Dia chi khong hop le		
B7	A1	Để trống	Remix báo lỗi nhập liệu, không gửi giao dịch		
B8	A1	Địa chỉ A2	Thành công, có event OwnerApproved		
B9	A1	Địa chỉ A2 lần nữa	Thành công (duyệt lặp không lỗi)		
createCampaign

Thứ tự ô: _name, _description, _goal, _durationSeconds, _percents. Giá trị chuẩn: "Phuc hoi rung ngap man", "Trong 1000 cay", 5000000000000000000, 3600, [30,30,40].

ID	Ví	Thay đổi so với giá trị chuẩn	Kết quả mong đợi	Kết quả thực tế	Đạt/Không
B10	A3	Giữ chuẩn	Từ chối: Ban chua duoc admin duyet		
B11	A1	Giữ chuẩn	Từ chối: Ban chua duoc admin duyet		
B12	A2	_goal = 0	Từ chối: Muc tieu phai > 0		
B13	A2	_durationSeconds = 0	Từ chối: Han chot phai o tuong lai		
B14	A2	_percents = [100]	Từ chối: Can 2-3 milestone		
B15	A2	_percents = [25,25,25,25]	Từ chối: Can 2-3 milestone		
B16	A2	_percents = [30,30,30]	Từ chối: Tong % milestone phai bang 100		
B17	A2	_percents = [0,100]	Từ chối: Moi milestone phai > 0%		
B18	A2	Giữ chuẩn (chiến dịch A)	Thành công, event CampaignCreated		
B19	A2	Tên "Don rac ven song", _durationSeconds = 300, _percents = [50,50] (chiến dịch B, tạo ngay trước Phần 5)	Thành công		
campaignCount và getCampaigns
ID	Thao tác	Kết quả mong đợi	Kết quả thực tế	Đạt/Không
B20	Bấm campaignCount	Bằng số chiến dịch đã tạo thành công		
B21	Bấm getCampaigns	Danh sách địa chỉ, phần tử 0 là chiến dịch A. Copy địa chỉ để mở bằng At Address (chọn contract Campaign)		
Phần 2. Nút xem thông tin của Campaign (chiến dịch A, ngay sau khi tạo)
ID	Nút	Nhập	Kết quả mong đợi	Kết quả thực tế	Đạt/Không
C1	name		Phuc hoi rung ngap man		
C2	description		Trong 1000 cay		
C3	owner		Địa chỉ A2		
C4	verifier		Địa chỉ A1		
C5	goal		5000000000000000000		
C6	deadline		Timestamp lớn hơn thời điểm hiện tại		
C7	totalRaised		0		
C8	state		0		
C9	currentState		0		
C10	donations	Địa chỉ A3	0		
C11	getCampaignInfo		10 giá trị, giá trị cuối (số milestone) là 3		
C12	getMilestone	0	30, rỗng, false, false, false		
C13	getMilestone	2	40, rỗng, false, false, false		
C14	getMilestone	3	Lỗi: Milestone khong ton tai		
Phần 3. Nút donate (chiến dịch A)

Nhớ chọn đơn vị Ether, và đặt Value về 0 sau mỗi lần donate.

ID	Ví	Value	Kết quả mong đợi	Kết quả thực tế	Đạt/Không
D1	A3	0	Từ chối: So tien phai > 0		
D2	A3	3 Ether	Thành công, event Donated. totalRaised = 3 Ether, donations(A3) = 3 Ether, state vẫn 0		
D3	A4	1 Ether	Thành công, totalRaised = 4 Ether, state vẫn 0		
D4	A4	1 Ether	Thành công, thêm event GoalReached, state = 1		
D5	A3	1 Ether	Từ chối: Chien dich khong con nhan donate		
Phần 4. Nút milestone (chiến dịch A, state = 1)

Trước khi bắt đầu, đặt Value về 0. Ghi lại số dư A2 trước phần rút tiền.

submitProof
ID	Ví	Nhập (index, proofHash)	Kết quả mong đợi	Kết quả thực tế	Đạt/Không
S1	A4	0, "ipfs://abc"	Từ chối: Chi owner duoc goi		
S2	A2	5, "ipfs://abc"	Từ chối: Milestone khong ton tai		
S3	A2	0, ""	Từ chối: Hash rong		
S4	A2	1, "ipfs://b"	Từ chối: Phai hoan thanh milestone truoc		
S5	A2	0, "ipfs://abc"	Thành công, event ProofSubmitted. getMilestone(0) có proofSubmitted = true		
S6	A2	0, "ipfs://xyz" (nộp lại khi chưa duyệt)	Thành công, proofHash đổi (hạn chế đã ghi nhận)		
approveMilestone
ID	Ví	Nhập (index)	Kết quả mong đợi	Kết quả thực tế	Đạt/Không
P1	A1	1 (chưa có bằng chứng)	Từ chối: Chua co bang chung		
P2	A1	7	Từ chối: Milestone khong ton tai		
P3	A2	0	Từ chối: Chi verifier duoc goi		
P4	A4	0	Từ chối: Chi verifier duoc goi		
P5	A1	0	Thành công, event MilestoneApproved, approved = true		
P6	A1	0 lần nữa	Từ chối: Da duyet roi		
P7	A2	submitProof(0, "ipfs://k")	Từ chối: Milestone da duoc duyet		
withdrawMilestone
ID	Ví	Nhập (index)	Kết quả mong đợi	Kết quả thực tế	Đạt/Không
W1	A2	1 (chưa duyệt, mốc 0 chưa rút)	Từ chối: Phai rut milestone truoc		
W2	A4	0	Từ chối: Chi owner duoc goi		
W3	A2	0	Thành công, event Withdrawn. Số dư A2 tăng 1,5 (30% của 5)		
W4	A2	0 lần nữa	Từ chối: Da rut roi		
W5	A2	2 (nhảy cóc)	Từ chối: Phai rut milestone truoc		
Chạy tiếp mốc 1 và mốc 2
Bước	Ví	Thao tác	Kết quả mong đợi
Mốc 1	A2, A1, A2	submitProof(1,"ipfs://b"), approveMilestone(1), withdrawMilestone(1)	Số dư A2 tăng thêm 1,5
Mốc 2	A2, A1, A2	submitProof(2,"ipfs://c"), approveMilestone(2), withdrawMilestone(2)	A2 nhận phần còn lại
ID	Kiểm tra	Kết quả mong đợi	Kết quả thực tế	Đạt/Không
W6	Số dư A2 sau mốc cuối	Tăng 2 (phần còn lại), tổng ba mốc = 5		
W7	state	3 (Completed), có event CampaignCompleted		
W8	getCampaignInfo	_balance = 0		
W9	A2 withdrawMilestone(2) lần nữa	Từ chối: Chien dich khong o trang thai giai ngan		
W10	A3 donate	Từ chối: Chien dich khong con nhan donate		
Phần 5. Nút refund (chiến dịch B, hạn 300 giây)

Tạo chiến dịch B (B19) ngay trước phần này, mở bằng At Address.

Trước khi hết hạn: A3 donate 1 Ether, A4 donate 1 Ether (nhớ đặt Value về 0 sau đó).

ID	Ví	Thao tác	Kết quả mong đợi	Kết quả thực tế	Đạt/Không
R1	A3	refund (còn hạn)	Từ chối: Chua du dieu kien hoan tien		
R2	A2	submitProof(0, "ipfs://a")	Từ chối: Chien dich chua thanh cong		

Chờ quá hạn (hơn 300 giây), rồi tiếp tục:

ID	Ví	Thao tác	Kết quả mong đợi	Kết quả thực tế	Đạt/Không
R3	bất kỳ	currentState	2 (Failed)		
R4	bất kỳ	state	0 (chưa ai ghi trạng thái lên chain, đúng thiết kế)		
R5	A3	donate 1 Ether	Từ chối: Da het han		
R6	A2	refund	Từ chối: Ban khong co tien de hoan		
R7	A3	refund	Thành công, số dư A3 tăng 1, event Refunded, state = 4		
R8	A3	refund lần nữa	Từ chối: Ban khong co tien de hoan		
R9	A4	refund	Thành công, nhận lại 1 (donor thứ hai vẫn hoàn được)		
R10	bất kỳ	getCampaignInfo	_balance = 0		
Phần 6. Trường hợp biên
ID	Kịch bản	Kết quả mong đợi	Kết quả thực tế	Đạt/Không
E1	Tạo chiến dịch mới (goal 5 Ether, [30,30,40]), A3 donate 8 Ether một lần	Thành công (cho phép vượt mục tiêu), state = 1		
E2	Chạy đủ 3 milestone cho chiến dịch E1	Mốc 0 nhận 2,4, mốc 1 nhận 2,4, mốc cuối nhận phần còn lại 3,2. _balance = 0		
E3	Owner tự donate vào chiến dịch của chính mình	Thành công (contract không cấm), ghi vào mục hạn chế		
Phần 7. Giao diện web (Cronos Testnet, 4 ví MetaMask)

Tên nút theo giao diện hiện tại, đổi cho khớp nếu giao diện thay đổi.

ID	Nút	Điều kiện	Kết quả mong đợi	Kết quả thực tế	Đạt/Không
X1	Đăng nhập bằng MetaMask	Chưa đăng nhập	Popup chọn ví rồi popup ký (không tốn phí). Hiện vai trò và địa chỉ		
X2	Đăng nhập, bấm Từ chối ở bước ký		Báo đã từ chối, vẫn là khách		
X3	Tải lại trang (F5)	Đang đăng nhập	Vẫn đăng nhập		
X4	Đăng xuất		Về trạng thái khách		
X5	Đổi ví trong MetaMask	Đang đăng nhập	Web tự đăng xuất		
X6	Đăng nhập bằng A1		Vai trò Admin, thấy mục Quản trị		
X7	Đăng nhập bằng A3		Vai trò Donor, không thấy mục Quản trị		
X8	Bộ lọc Tất cả / Đang gây quỹ / Đã kết thúc	Có chiến dịch ở nhiều trạng thái	Danh sách lọc đúng		
X9	Bấm vào một chiến dịch		Mở đúng trang chi tiết, hiện các mốc		
X10	Duyệt (trang Quản trị, A1)	Nhập địa chỉ A2	Thành công, A2 thấy được form tạo chiến dịch		
X11	Duyệt, nhập chuỗi sai (abc)		Báo địa chỉ không hợp lệ, không gửi giao dịch		
X12	Tạo chiến dịch (A2)	Mục tiêu 1, hạn 1 ngày, 30,30,40	Thành công, thấy chiến dịch mới trong danh sách		
X13	Tạo chiến dịch, % = 30,30,30		Báo tổng phải bằng 100, không gửi giao dịch		
X14	Tạo chiến dịch bằng ví chưa duyệt (A3)		Báo ví chưa được duyệt		
X15	Ủng hộ, ô để trống	Đã đăng nhập	Báo nhập số TCRO, không mở MetaMask		
X16	Ủng hộ 0.5		MetaMask xác nhận, thanh tiến độ tăng		
X17	Ủng hộ khi chưa đăng nhập	Khách	Báo cần đăng nhập		
X18	Ủng hộ đủ mục tiêu		Trạng thái "Đã đủ mục tiêu", ô ủng hộ biến mất		
X19	Nộp bằng chứng (A2)	Chiến dịch Successful	Mốc chuyển sang chờ verifier xác nhận		
X20	Xác nhận milestone (A1)	Mốc đã có bằng chứng	Mốc chuyển sang chờ owner rút tiền		
X21	Rút tiền (A2)	Mốc đã duyệt	Số dư A2 tăng đúng tỷ lệ, mốc hiện "Đã giải ngân"		
X22	Nhận lại tiền (A3)	Chiến dịch hết hạn chưa đủ	Nhận lại tiền, trạng thái "Đã hoàn tiền"		
X23	Nhận lại tiền, ví chưa ủng hộ (A4)		Nút bị khóa		
X24	Từ chối giao dịch ở popup MetaMask	Bất kỳ nút ghi nào	Web báo lỗi, dữ liệu không đổi, nút bấm lại được		
Tổng kết
Phần	Số ca	Đạt	Không đạt	Ghi chú
1. Factory	21			
2. Xem thông tin	14			
3. Donate	5			
4. Milestone	21			
5. Refund	12			
6. Trường hợp biên	3			
7. Giao diện web	24			
Các lỗi và phát hiện trong quá trình test
Ngày	ID	Mô tả	Nguyên nhân	Cách xử lý
		Ví dụ: submitProof bị revert không có lý do	Ô Value của khối Campaign còn 5 wei từ lần donate trước	Đặt Value về 0 ở đúng khối Campaign
