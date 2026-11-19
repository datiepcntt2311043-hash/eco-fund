# Eco-Fund — Nền tảng gây quỹ minh bạch vì môi trường (Web3 DApp)

**Eco-Fund** là ứng dụng web phi tập trung (DApp) hỗ trợ gây quỹ minh bạch cho các dự án bảo vệ môi trường trên mạng **Cronos Testnet (Chain ID: 338)**. Toàn bộ dòng tiền quyên góp được quản lý on-chain thông qua Smart Contract với cơ chế **0% phí nền tảng**, kiểm duyệt chiến dịch đầu vào, giải ngân tuần tự theo từng giai đoạn (**Milestone Escrow**) và tự động cho phép hoàn tiền (**Refund**) nếu chiến dịch hết hạn mà không đạt mục tiêu.

---

## 1. Thông tin triển khai Smart Contract

- **Mạng lưới:** Cronos Testnet
- **Chain ID:** `338` (`0x152`)
- **Đơn vị tiền tệ:** `TCRO`
- **Địa chỉ `CampaignFactory`:** [`0x3599CEAb223d0E89134c6BBCb1faC0817154993e`](https://explorer.cronos.org/testnet/address/0x3599CEAb223d0E89134c6BBCb1faC0817154993e)
- **Trình khám phá khối:** https://explorer.cronos.org/testnet

---

## 2. Kiến trúc hệ thống & Quy trình hoạt động

Hệ thống áp dụng mẫu thiết kế **Factory Pattern** kết hợp thư viện bảo mật `ReentrancyGuard` của OpenZeppelin trong `EcoFund.sol` (nâng cấp từ bản thử nghiệm ban đầu `SimpleCampaign.sol`):

### Vai trò tác nhân
- **Admin / Verifier:** Triển khai `CampaignFactory`, duyệt danh sách chủ chiến dịch (`approveOwner`), kiểm duyệt mở hoặc từ chối từng chiến dịch (`approveCampaign` / `rejectCampaign`), và xác nhận minh chứng trước khi giải ngân (`approveMilestone`).
- **Campaign Owner:** Tạo chiến dịch mới kèm mục tiêu, thời hạn và 2–3 mốc giải ngân có tổng bằng 100% (`createCampaign`); khi đạt mục tiêu, nộp hash/CID bằng chứng (`submitProof`) và rút tiền tuần tự từng mốc (`withdrawMilestone`).
- **Donor:** Kết nối ví MetaMask để quyên góp (`donate`), theo dõi giao dịch minh bạch trên Cronos Explorer, và tự rút lại tiền (`refund`) theo mô hình Pull Payment nếu chiến dịch thất bại.

### Vòng đời trạng thái (State Machine)

| Mã | Trạng thái | Ý nghĩa |
|---|---|---|
| `0` | **Pending** | Chiến dịch vừa được tạo, chờ Admin kiểm duyệt (`deadline = 0`) |
| `1` | **Active** | Admin đã duyệt, mở cổng nhận quyên góp và bắt đầu đếm `deadline` |
| `2` | **Successful** | Đạt hoặc vượt mục tiêu trước hạn, mở khóa quy trình giải ngân theo Milestone |
| `3` | **Failed** | Quá hạn nhưng chưa đạt mục tiêu, mở khóa chức năng `refund()` |
| `4` | **Completed** | Đã giải ngân xong toàn bộ các Milestone, số dư hợp đồng về `0` |
| `5` | **Refunded** | Đã ghi nhận hoàn tiền cho Donor sau khi chiến dịch thất bại |
| `6` | **Rejected** | Admin từ chối chiến dịch ngay từ trạng thái chờ duyệt |

Luồng chuyển trạng thái chính:
- `Pending` → `Active` → `Successful` → `Completed`
- `Pending` → `Active` → `Failed` → `Refunded`
- `Pending` → `Rejected`

---

## 3. Cấu trúc thư mục

```text
eco-fund/
├── EcoFund.sol            # Smart contract chính (CampaignFactory + Campaign)
├── SimpleCampaign.sol     # Bản hợp đồng mẫu giai đoạn đầu
├── artifacts/             # ABI và bytecode sau khi biên dịch
├── frontend/              # Ứng dụng Web DApp (React + Ethers.js + MetaMask)
├── docs/                  # Tài liệu báo cáo và ảnh minh chứng kiểm thử
├── test-plan.md           # Kịch bản và kết quả kiểm thử Remix VM & Cronos Testnet
└── README.md              # Tài liệu tổng quan dự án