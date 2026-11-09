# ECO-FUND Frontend – VS Code

## Chạy dự án
1. Giải nén ZIP.
2. Mở thư mục `ecofund-frontend` bằng Visual Studio Code.
3. Chọn Terminal → New Terminal.
4. Chạy `npm install`.
5. Chạy `npm run dev`.
6. Mở URL Vite in ra (thường là http://localhost:5173).

## Công nghệ
- React + Vite
- CSS responsive
- lucide-react
- Có nút yêu cầu kết nối MetaMask (nếu đã cài extension).

## Các màn hình
- Trang chủ
- Danh sách chiến dịch, tìm kiếm và lọc
- Chi tiết chiến dịch
- Form tạo chiến dịch demo
- Dashboard Owner
- Admin Dashboard

## Lưu ý
Đây là giao diện demo, chưa kết nối Smart Contract thật. Các chiến dịch dùng dữ liệu mẫu trong `src/App.jsx`.
Muốn chạy giao dịch thật cần ABI và địa chỉ `CampaignFactory`/`Campaign` đã deploy, đúng chain, rồi tích hợp các hàm Solidity:
`approveOwner`, `createCampaign`, `getCampaigns`, `donate`, `refund`, `submitProof`, `approveMilestone`, `withdrawMilestone`.
Không bao giờ đưa private key hoặc seed phrase vào mã nguồn.
