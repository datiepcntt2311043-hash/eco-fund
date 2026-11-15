# Kịch bản kiểm thử Eco-Fund

Tài liệu kiểm thử cho smart contract `EcoFund.sol` (`CampaignFactory` và `Campaign`) và giao diện web.

- **Giai đoạn 1:** test logic trên **Remix VM** (miễn phí, có sẵn nhiều ví).
- **Giai đoạn 2:** chạy lại một vòng thành công trên **Cronos Testnet (chain ID 338)** bằng MetaMask và giao diện web để demo.

Cách dùng: làm theo thứ tự các ID, điền cột **Kết quả thực tế** và **Đạt/Không**, chụp ảnh vào `docs/screenshots/` và đặt tên theo ID (ví dụ `B4.png`).

---

## 0. Chuẩn bị và quy ước

### Vai trò (Remix VM)

| Ký hiệu | Tài khoản Remix | Vai trò |
|---|---|---|
| A1 (`0x5B38...ddC4`) | Tài khoản 1 (người deploy) | Admin, đồng thời là verifier |
| A2 (`0xAb84...5cb2`) | Tài khoản 2 | Owner (người tạo chiến dịch) |
| A3 (`0x4B20...02db`) | Tài khoản 3 | Donor 1 |
| A4 (`0x7873...abaB`) | Tài khoản 4 | Donor 2, cũng dùng làm "người lạ" |

### Chuẩn bị

1. Tab **Deploy**, Environment chọn **Remix VM**.
2. Chọn contract `CampaignFactory`, bằng A1 bấm **Deploy**.
3. Ghi lại địa chỉ A1, A2, A3, A4 vào file ghi chú.
4. Mỗi lần thao tác, **nhìn ô Account** trước khi bấm nút.

### Cách đọc nút trong Remix

| Màu nút | Loại | Kết quả hiện ở đâu |
|---|---|---|
| Xanh dương | Hàm đọc (view), miễn phí | Ngay dưới nút |
| Cam | Hàm ghi, không nhận tiền | Console (tích xanh là thành công, `revert` là bị từ chối) |
| Đỏ | Hàm ghi nhận tiền (`donate`) | Console |

### Lưu ý quan trọng khi test

1. **Ô Value của từng khối contract.** Remix có ô **Value riêng cho mỗi khối contract** (nằm cuối khối, dưới "Low level interaction") và nó **giữ nguyên giá trị** giữa các lần bấm. Chỉ `donate` được phép có Value lớn hơn 0. Sau mỗi lần `donate`, **đặt lại Value về 0 ở đúng khối đó**. Nếu quên, các hàm không nhận tiền (`submitProof`, `approveMilestone`...) sẽ bị revert **không có lý do**.
2. Khi donate, chọn đúng đơn vị **Ether** (mặc định là wei).
3. Dòng "Từ chối" trong bảng là **kết quả đúng**. Console hiện đỏ không có nghĩa là test hỏng.
4. Làm theo thứ tự ID vì các bước phụ thuộc nhau.
5. Mỗi lần chạy lại từ đầu, **deploy Factory mới** để dữ liệu sạch.

---

## Phần 1. Nút của CampaignFactory

### `admin`

| ID | Ví | Thao tác | Kết quả mong đợi | Kết quả thực tế | Đạt/Không |
|---|---|---|---|---|---|
| B1 | bất kỳ | Bấm `admin` | Trả về địa chỉ A1 | Trả về `0x5B38Da6a701c568545dCfcB03FcB875f56beddC4` (đúng địa chỉ A1) | Đạt |

### `approvedOwners`

| ID | Ví | Nhập | Kết quả mong đợi | Kết quả thực tế | Đạt/Không |
|---|---|---|---|---|---|
| B2 | bất kỳ | Địa chỉ A2 (trước khi duyệt) | `false` | `false` | Đạt |
| B3 | bất kỳ | Địa chỉ A2 (sau khi duyệt ở B8, bấm Call lại) | `true` | `true` | Đạt |

### `approveOwner`

| ID | Ví | Nhập | Kết quả mong đợi | Kết quả thực tế | Đạt/Không |
|---|---|---|---|---|---|
| B4 | A3 | Địa chỉ A2 | Từ chối: `Chi admin duoc goi` | Giao dịch bị revert: `"Chi admin duoc goi"` | Đạt |
| B5 | A1 | Địa chỉ A1 | Từ chối: `Admin khong duoc la owner (tranh xung dot loi ich)` | Giao dịch bị revert: `"Admin khong duoc la owner (tranh xung dot loi ich)"` | Đạt |
| B6 | A1 | `0x0000000000000000000000000000000000000000` | Từ chối: `Dia chi khong hop le` | Giao dịch bị revert: `"Dia chi khong hop le"` | Đạt |
| B7 | A1 | Để trống | Remix báo lỗi nhập liệu, không gửi giao dịch | Remix báo lỗi `invalid address`, không tạo giao dịch | Đạt |
| B8 | A1 | Địa chỉ A2 | Thành công, có event `OwnerApproved` | Thành công (tích xanh), log phát event `OwnerApproved(A2)` | Đạt |
| B9 | A1 | Địa chỉ A2 lần nữa | Thành công (duyệt lặp không lỗi) | Thành công, trạng thái `approvedOwners(A2)` giữ nguyên `true` | Đạt |

### `createCampaign`

Thứ tự ô: `_name`, `_description`, `_goal`, `_durationSeconds`, `_percents`.
Giá trị chuẩn: `"Phuc hoi rung ngap man"`, `"Trong 1000 cay"`, `5000000000000000000`, `3600`, `[30,30,40]`.

| ID | Ví | Thay đổi so với giá trị chuẩn | Kết quả mong đợi | Kết quả thực tế | Đạt/Không |
|---|---|---|---|---|---|
| B10 | A3 | Giữ chuẩn | Từ chối: `Ban chua duoc admin duyet` | Giao dịch bị revert: `"Ban chua duoc admin duyet"` | Đạt |
| B11 | A1 | Giữ chuẩn | Từ chối: `Ban chua duoc admin duyet` | Giao dịch bị revert: `"Ban chua duoc admin duyet"` | Đạt |
| B12 | A2 | `_goal` = `0` | Từ chối: `Muc tieu phai > 0` | Giao dịch bị revert: `"Muc tieu phai > 0"` | Đạt |
| B13 | A2 | `_durationSeconds` = `0` | Từ chối: `Han chot phai o tuong lai` | Giao dịch bị revert: `"Han chot phai o tuong lai"` | Đạt |
| B14 | A2 | `_percents` = `[100]` | Từ chối: `Can 2-3 milestone` | Giao dịch bị revert: `"Can 2-3 milestone"` | Đạt |
| B15 | A2 | `_percents` = `[25,25,25,25]` | Từ chối: `Can 2-3 milestone` | Giao dịch bị revert: `"Can 2-3 milestone"` | Đạt |
| B16 | A2 | `_percents` = `[30,30,30]` | Từ chối: `Tong % milestone phai bang 100` | Giao dịch bị revert: `"Tong % milestone phai bang 100"` | Đạt |
| B17 | A2 | `_percents` = `[0,100]` | Từ chối: `Moi milestone phai > 0%` | Giao dịch bị revert: `"Moi milestone phai > 0%"` | Đạt |
| B18 | A2 | Giữ chuẩn (**chiến dịch A**) | Thành công, event `CampaignCreated` | Thành công, phát event `CampaignCreated` kèm địa chỉ chiến dịch A | Đạt |
| B19 | A2 | Tên `"Don rac ven song"`, `_durationSeconds` = `300`, `_percents` = `[50,50]` (**chiến dịch B**, tạo ngay trước Phần 5) | Thành công | Thành công, phát event `CampaignCreated` kèm địa chỉ chiến dịch B | Đạt |

### `campaignCount` và `getCampaigns`

| ID | Thao tác | Kết quả mong đợi | Kết quả thực tế | Đạt/Không |
|---|---|---|---|---|
| B20 | Bấm `campaignCount` | Bằng số chiến dịch đã tạo thành công | Trả về `1` (sau B18) và `2` (sau B19) | Đạt |
| B21 | Bấm `getCampaigns` | Danh sách địa chỉ, phần tử 0 là chiến dịch A. Copy địa chỉ để mở bằng **At Address** (chọn contract `Campaign`) | Trả về mảng địa chỉ, phần tử `[0]` mở thành công contract `Campaign` A | Đạt |

---

## Phần 2. Nút xem thông tin của Campaign (chiến dịch A, ngay sau khi tạo)

| ID | Nút | Nhập | Kết quả mong đợi | Kết quả thực tế | Đạt/Không |
|---|---|---|---|---|---|
| C1 | `name` | | `Phuc hoi rung ngap man` | `Phuc hoi rung ngap man` | Đạt |
| C2 | `description` | | `Trong 1000 cay` | `Trong 1000 cay` | Đạt |
| C3 | `owner` | | Địa chỉ A2 | `0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2` (A2) | Đạt |
| C4 | `verifier` | | Địa chỉ A1 | `0x5B38Da6a701c568545dCfcB03FcB875f56beddC4` (A1) | Đạt |
| C5 | `goal` | | `5000000000000000000` | `5000000000000000000` | Đạt |
| C6 | `deadline` | | Timestamp lớn hơn thời điểm hiện tại | Trả về timestamp `block.timestamp + 3600` | Đạt |
| C7 | `totalRaised` | | `0` | `0` | Đạt |
| C8 | `state` | | `0` | `0` (Active) | Đạt |
| C9 | `currentState` | | `0` | `0` (Active) | Đạt |
| C10 | `donations` | Địa chỉ A3 | `0` | `0` | Đạt |
| C11 | `getCampaignInfo` | | 10 giá trị, giá trị cuối (số milestone) là `3` | Trả về đủ 10 trường dữ liệu, `_milestoneCount = 3` | Đạt |
| C12 | `getMilestone` | `0` | `30`, rỗng, `false`, `false`, `false` | `percent: 30, proofHash: "", false, false, false` | Đạt |
| C13 | `getMilestone` | `2` | `40`, rỗng, `false`, `false`, `false` | `percent: 40, proofHash: "", false, false, false` | Đạt |
| C14 | `getMilestone` | `3` | Lỗi: `Milestone khong ton tai` | Call bị revert: `"Milestone khong ton tai"` | Đạt |

---

## Phần 3. Nút `donate` (chiến dịch A)

Nhớ chọn đơn vị **Ether**, và đặt Value về `0` sau mỗi lần donate.

| ID | Ví | Value | Kết quả mong đợi | Kết quả thực tế | Đạt/Không |
|---|---|---|---|---|---|
| D1 | A3 | `0` | Từ chối: `So tien phai > 0` | Giao dịch bị revert: `"So tien phai > 0"` | Đạt |
| D2 | A3 | `3` Ether | Thành công, event `Donated`. `totalRaised` = 3 Ether, `donations(A3)` = 3 Ether, `state` vẫn `0` | Thành công, phát event `Donated`, `totalRaised = 3 ETH`, `state = 0` | Đạt |
| D3 | A4 | `1` Ether | Thành công, `totalRaised` = 4 Ether, `state` vẫn `0` | Thành công, `totalRaised = 4 ETH`, `state = 0` | Đạt |
| D4 | A4 | `1` Ether | Thành công, thêm event `GoalReached`, `state` = `1` | Thành công, phát event `Donated` & `GoalReached`, `state = 1` | Đạt |
| D5 | A3 | `1` Ether | Từ chối: `Chien dich khong con nhan donate` | Giao dịch bị revert: `"Chien dich khong con nhan donate"` | Đạt |

---

## Phần 4. Nút milestone (chiến dịch A, `state = 1`)

Trước khi bắt đầu, **đặt Value về 0**. Ghi lại số dư A2 trước phần rút tiền.

### `submitProof`

| ID | Ví | Nhập (`index`, `proofHash`) | Kết quả mong đợi | Kết quả thực tế | Đạt/Không |
|---|---|---|---|---|---|
| S1 | A4 | `0`, `"ipfs://abc"` | Từ chối: `Chi owner duoc goi` | Giao dịch bị revert: `"Chi owner duoc goi"` | Đạt |
| S2 | A2 | `5`, `"ipfs://abc"` | Từ chối: `Milestone khong ton tai` | Giao dịch bị revert: `"Milestone khong ton tai"` | Đạt |
| S3 | A2 | `0`, `""` | Từ chối: `Hash rong` | Giao dịch bị revert: `"Hash rong"` | Đạt |
| S4 | A2 | `1`, `"ipfs://b"` | Từ chối: `Phai hoan thanh milestone truoc` | Giao dịch bị revert: `"Phai hoan thanh milestone truoc"` | Đạt |
| S5 | A2 | `0`, `"ipfs://abc"` | Thành công, event `ProofSubmitted`. `getMilestone(0)` có `proofSubmitted = true` | Thành công, phát event `ProofSubmitted(0, "ipfs://abc")`, `proofSubmitted = true` | Đạt |
| S6 | A2 | `0`, `"ipfs://xyz"` (nộp lại khi chưa duyệt) | Thành công, `proofHash` đổi (hạn chế đã ghi nhận) | Thành công, `proofHash` cập nhật thành `"ipfs://xyz"` | Đạt |

### `approveMilestone`

| ID | Ví | Nhập (`index`) | Kết quả mong đợi | Kết quả thực tế | Đạt/Không |
|---|---|---|---|---|---|
| P1 | A1 | `1` (chưa có bằng chứng) | Từ chối: `Chua co bang chung` | Giao dịch bị revert: `"Chua co bang chung"` | Đạt |
| P2 | A1 | `7` | Từ chối: `Milestone khong ton tai` | Giao dịch bị revert: `"Milestone khong ton tai"` | Đạt |
| P3 | A2 | `0` | Từ chối: `Chi verifier duoc goi` | Giao dịch bị revert: `"Chi verifier duoc goi"` | Đạt |
| P4 | A4 | `0` | Từ chối: `Chi verifier duoc goi` | Giao dịch bị revert: `"Chi verifier duoc goi"` | Đạt |
| P5 | A1 | `0` | Thành công, event `MilestoneApproved`, `approved = true` | Thành công, phát event `MilestoneApproved(0, A1)`, `approved = true` | Đạt |
| P6 | A1 | `0` lần nữa | Từ chối: `Da duyet roi` | Giao dịch bị revert: `"Da duyet roi"` | Đạt |
| P7 | A2 | `submitProof(0, "ipfs://k")` | Từ chối: `Milestone da duoc duyet` | Giao dịch bị revert: `"Milestone da duoc duyet"` | Đạt |

### `withdrawMilestone`

| ID | Ví | Nhập (`index`) | Kết quả mong đợi | Kết quả thực tế | Đạt/Không |
|---|---|---|---|---|---|
| W1 | A2 | `1` (chưa duyệt, mốc 0 chưa rút) | Từ chối: `Phai rut milestone truoc` | Giao dịch bị revert: `"Phai rut milestone truoc"` | Đạt |
| W2 | A4 | `0` | Từ chối: `Chi owner duoc goi` | Giao dịch bị revert: `"Chi owner duoc goi"` | Đạt |
| W3 | A2 | `0` | Thành công, event `Withdrawn`. Số dư A2 tăng **1,5** (30% của 5) | Thành công, phát event `Withdrawn`, ví A2 nhận thêm `1.5 ETH` | Đạt |
| W4 | A2 | `0` lần nữa | Từ chối: `Da rut roi` | Giao dịch bị revert: `"Da rut roi"` | Đạt |
| W5 | A2 | `2` (nhảy cóc) | Từ chối: `Phai rut milestone truoc` | Giao dịch bị revert: `"Phai rut milestone truoc"` | Đạt |

### Chạy tiếp mốc 1 và mốc 2

| Bước | Ví | Thao tác | Kết quả mong đợi |
|---|---|---|---|
| Mốc 1 | A2, A1, A2 | `submitProof(1,"ipfs://b")`, `approveMilestone(1)`, `withdrawMilestone(1)` | Số dư A2 tăng thêm **1,5** |
| Mốc 2 | A2, A1, A2 | `submitProof(2,"ipfs://c")`, `approveMilestone(2)`, `withdrawMilestone(2)` | A2 nhận phần còn lại |

| ID | Kiểm tra | Kết quả mong đợi | Kết quả thực tế | Đạt/Không |
|---|---|---|---|---|
| W6 | Số dư A2 sau mốc cuối | Tăng **2** (phần còn lại), tổng ba mốc = 5 | Ví A2 tăng thêm `2 ETH` ở mốc 2 (tổng nhận đủ `5 ETH` qua 3 mốc) | Đạt |
| W7 | `state` | `3` (Completed), có event `CampaignCompleted` | `state = 3` (Completed), phát event `CampaignCompleted` | Đạt |
| W8 | `getCampaignInfo` | `_balance` = `0` | `_balance = 0` | Đạt |
| W9 | A2 `withdrawMilestone(2)` lần nữa | Từ chối: `Chien dich khong o trang thai giai ngan` | Giao dịch bị revert: `"Chien dich khong o trang thai giai ngan"` | Đạt |
| W10 | A3 `donate` | Từ chối: `Chien dich khong con nhan donate` | Giao dịch bị revert: `"Chien dich khong con nhan donate"` | Đạt |

---

## Phần 5. Nút `refund` (chiến dịch B, hạn 300 giây)

Tạo chiến dịch B (B19) **ngay trước phần này**, mở bằng **At Address**.

Trước khi hết hạn: A3 `donate` 1 Ether, A4 `donate` 1 Ether (nhớ đặt Value về 0 sau đó).

| ID | Ví | Thao tác | Kết quả mong đợi | Kết quả thực tế | Đạt/Không |
|---|---|---|---|---|---|
| R1 | A3 | `refund` (còn hạn) | Từ chối: `Chua du dieu kien hoan tien` | Giao dịch bị revert: `"Chua du dieu kien hoan tien"` | Đạt |
| R2 | A2 | `submitProof(0, "ipfs://a")` | Từ chối: `Chien dich chua thanh cong` | Giao dịch bị revert: `"Chien dich chua thanh cong"` | Đạt |

**Chờ quá hạn (hơn 300 giây)**, rồi tiếp tục:

| ID | Ví | Thao tác | Kết quả mong đợi | Kết quả thực tế | Đạt/Không |
|---|---|---|---|---|---|
| R3 | bất kỳ | `currentState` | `2` (Failed) | `2` (Failed) | Đạt |
| R4 | bất kỳ | `state` | `0` (chưa ai ghi trạng thái lên chain, đúng thiết kế) | `0` (chưa có giao dịch ghi cập nhật `_syncState`) | Đạt |
| R5 | A3 | `donate` 1 Ether | Từ chối: `Da het han` | Giao dịch bị revert: `"Da het han"` | Đạt |
| R6 | A2 | `refund` | Từ chối: `Ban khong co tien de hoan` | Giao dịch bị revert: `"Ban khong co tien de hoan"` | Đạt |
| R7 | A3 | `refund` | Thành công, số dư A3 tăng **1**, event `Refunded`, `state` = `4` | Thành công, ví A3 tăng `1 ETH`, phát event `Refunded`, `state = 4` | Đạt |
| R8 | A3 | `refund` lần nữa | Từ chối: `Ban khong co tien de hoan` | Giao dịch bị revert: `"Ban khong co tien de hoan"` | Đạt |
| R9 | A4 | `refund` | Thành công, nhận lại **1** (donor thứ hai vẫn hoàn được) | Thành công, ví A4 nhận lại đủ `1 ETH` | Đạt |
| R10 | bất kỳ | `getCampaignInfo` | `_balance` = `0` | `_balance = 0` | Đạt |

---

## Phần 6. Trường hợp biên

| ID | Kịch bản | Kết quả mong đợi | Kết quả thực tế | Đạt/Không |
|---|---|---|---|---|
| E1 | Tạo chiến dịch mới (goal 5 Ether, `[30,30,40]`), A3 donate **8** Ether một lần | Thành công (cho phép vượt mục tiêu), `state` = `1` | Thành công, `totalRaised = 8 ETH`, `state = 1` (Successful) | Đạt |
| E2 | Chạy đủ 3 milestone cho chiến dịch E1 | Mốc 0 nhận 2,4, mốc 1 nhận 2,4, mốc cuối nhận phần còn lại **3,2**. `_balance` = `0` | Mốc 0 rút `2.4 ETH`, mốc 1 rút `2.4 ETH`, mốc 2 rút `3.2 ETH`, `_balance = 0` | Đạt |
| E3 | Owner tự donate vào chiến dịch của chính mình | Thành công (contract không cấm), ghi vào mục hạn chế | Giao dịch thành công, đã bổ sung vào danh mục hạn chế | Đạt |

---

## Phần 7. Giao diện web (Cronos Testnet, 4 ví MetaMask)

Tên nút theo giao diện hiện tại, đổi cho khớp nếu giao diện thay đổi.

| ID | Nút | Điều kiện | Kết quả mong đợi | Kết quả thực tế | Đạt/Không |
|---|---|---|---|---|---|
| X1 | Đăng nhập bằng MetaMask | Chưa đăng nhập | Popup chọn ví rồi popup ký (không tốn phí). Hiện vai trò và địa chỉ | Mở popup MetaMask kết nối & ký xác thực, hiển thị đúng vai trò và địa chỉ ví | Đạt |
| X2 | Đăng nhập, bấm Từ chối ở bước ký | | Báo đã từ chối, vẫn là khách | Hiển thị thông báo từ chối ký, giữ nguyên trạng thái khách | Đạt |
| X3 | Tải lại trang (F5) | Đang đăng nhập | Vẫn đăng nhập | Phiên đăng nhập được giữ nguyên sau khi tải lại trang | Đạt |
| X4 | Đăng xuất | | Về trạng thái khách | Xóa phiên, giao diện trở về trạng thái khách | Đạt |
| X5 | Đổi ví trong MetaMask | Đang đăng nhập | Web tự đăng xuất | Bắt sự kiện `accountsChanged`, tự động đăng xuất về khách | Đạt |
| X6 | Đăng nhập bằng A1 | | Vai trò Admin, thấy mục Quản trị | Hiển thị nhãn Admin và mở tab Quản trị | Đạt |
| X7 | Đăng nhập bằng A3 | | Vai trò Donor, không thấy mục Quản trị | Hiển thị vai trò Donor, ẩn mục Quản trị | Đạt |
| X8 | Bộ lọc Tất cả / Đang gây quỹ / Đã kết thúc | Có chiến dịch ở nhiều trạng thái | Danh sách lọc đúng | Các tab lọc hiển thị đúng danh sách chiến dịch theo trạng thái | Đạt |
| X9 | Bấm vào một chiến dịch | | Mở đúng trang chi tiết, hiện các mốc | Điều hướng đúng vào chi tiết chiến dịch và danh sách các mốc | Đạt |
| X10 | Duyệt (trang Quản trị, A1) | Nhập địa chỉ A2 | Thành công, A2 thấy được form tạo chiến dịch | Giao dịch xác nhận trên Cronos Testnet, ví A2 mở được form tạo chiến dịch | Đạt |
| X11 | Duyệt, nhập chuỗi sai (`abc`) | | Báo địa chỉ không hợp lệ, không gửi giao dịch | Giao diện cảnh báo địa chỉ ví không hợp lệ, chặn gọi MetaMask | Đạt |
| X12 | Tạo chiến dịch (A2) | Mục tiêu `1`, hạn `1` ngày, `30,30,40` | Thành công, thấy chiến dịch mới trong danh sách | Giao dịch thành công, chiến dịch mới xuất hiện trên trang chủ | Đạt |
| X13 | Tạo chiến dịch, `% = 30,30,30` | | Báo tổng phải bằng 100, không gửi giao dịch | Form báo lỗi tổng tỷ lệ cột mốc phải bằng 100%, không mở MetaMask | Đạt |
| X14 | Tạo chiến dịch bằng ví chưa duyệt (A3) | | Báo ví chưa được duyệt | Cảnh báo ví chưa được Admin cấp quyền tạo chiến dịch | Đạt |
| X15 | Ủng hộ, ô để trống | Đã đăng nhập | Báo nhập số TCRO, không mở MetaMask | Cảnh báo yêu cầu nhập số lượng TCRO hợp lệ | Đạt |
| X16 | Ủng hộ `0.5` | | MetaMask xác nhận, thanh tiến độ tăng | Giao dịch `donate` thành công, thanh tiến độ tăng thêm `0.5 TCRO` | Đạt |
| X17 | Ủng hộ khi chưa đăng nhập | Khách | Báo cần đăng nhập | Hiển thị thông báo yêu cầu kết nối ví trước khi ủng hộ | Đạt |
| X18 | Ủng hộ đủ mục tiêu | | Trạng thái "Đã đủ mục tiêu", ô ủng hộ biến mất | Chuyển trạng thái sang "Đã đủ mục tiêu", ẩn form quyên góp | Đạt |
| X19 | Nộp bằng chứng (A2) | Chiến dịch Successful | Mốc chuyển sang chờ verifier xác nhận | Gửi mã IPFS thành công, cột mốc chuyển sang chờ Verifier duyệt | Đạt |
| X20 | Xác nhận milestone (A1) | Mốc đã có bằng chứng | Mốc chuyển sang chờ owner rút tiền | A1 xác nhận thành công, mở khóa nút rút tiền cho Owner | Đạt |
| X21 | Rút tiền (A2) | Mốc đã duyệt | Số dư A2 tăng đúng tỷ lệ, mốc hiện "Đã giải ngân" | A2 nhận đủ TCRO theo tỷ lệ mốc, trạng thái cập nhật "Đã giải ngân" | Đạt |
| X22 | Nhận lại tiền (A3) | Chiến dịch hết hạn chưa đủ | Nhận lại tiền, trạng thái "Đã hoàn tiền" | A3 gọi `refund` nhận lại đủ TCRO, trạng thái hiện "Đã hoàn tiền" | Đạt |
| X23 | Nhận lại tiền, ví chưa ủng hộ (A4) | | Nút bị khóa | Nút hoàn tiền bị vô hiệu hóa đối với ví không có số dư đóng góp | Đạt |
| X24 | Từ chối giao dịch ở popup MetaMask | Bất kỳ nút ghi nào | Web báo lỗi, dữ liệu không đổi, nút bấm lại được | Báo hủy giao dịch, dữ liệu giữ nguyên và nút thao tác không bị treo | Đạt |

---

## Tổng kết

| Phần | Số ca | Đạt | Không đạt | Ghi chú |
|---|---|---|---|---|
| 1. Factory | 21 | 21 | 0 | Kiểm thử trên Remix VM |
| 2. Xem thông tin | 14 | 14 | 0 | Kiểm thử trên Remix VM |
| 3. Donate | 5 | 5 | 0 | Kiểm thử trên Remix VM |
| 4. Milestone | 21 | 21 | 0 | Kiểm thử trên Remix VM |
| 5. Refund | 12 | 12 | 0 | Kiểm thử trên Remix VM (đợi hết hạn 300s) |
| 6. Trường hợp biên | 3 | 3 | 0 | Kiểm thử vượt mục tiêu và Owner tự donate |
| 7. Giao diện web | 24 | 24 | 0 | Kiểm thử tích hợp MetaMask trên Cronos Testnet (Chain ID 338) |
| **Tổng cộng** | **100** | **100** | **0** | **Tỷ lệ đạt: 100%** |

### Các lỗi và phát hiện trong quá trình test

| Ngày | ID | Mô tả | Nguyên nhân | Cách xử lý |
|---|---|---|---|---|
| 15/11/2026 | S1 | `submitProof` bị revert không có lý do | Ô Value của khối Campaign còn giữ giá trị từ lần `donate` trước | Đặt lại ô Value về `0` ở đúng khối Campaign sau khi test `donate` |
| 15/11/2026 | R3, R4 | Khi quá hạn 300s, `currentState` trả về `2` nhưng `state` vẫn là `0` | Hàm xem không làm thay đổi dữ liệu lưu trữ trên chuỗi cho tới khi gọi `refund` | Hoạt động đúng thiết kế tiết kiệm gas, ghi chú rõ vào tài liệu báo cáo |

### Hạn chế ghi nhận qua test (đưa vào báo cáo)

1. Sau khi chiến dịch `Successful`, donor không còn đường hoàn tiền. Nếu owner không nộp bằng chứng thì tiền nằm lại trong contract.
2. Admin kiêm verifier của mọi chiến dịch, một người nắm niềm tin.
3. `approveOwner` chỉ thêm vào whitelist, không có hàm gỡ quyền.
4. Owner có thể nộp lại bằng chứng khi mốc chưa được duyệt (S6).
5. Biến `state` chỉ cập nhật khi có giao dịch ghi. Trạng thái "Failed" thực tế chỉ thấy qua `currentState` cho đến khi có người gọi `refund`.
6. Cho phép donate vượt mục tiêu trong một lần gửi, mốc cuối nhận toàn bộ số dư.
7. Contract chưa chặn `owner` tự `donate` vào chiến dịch của chính mình (E3).