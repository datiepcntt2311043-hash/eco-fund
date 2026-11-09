// src/contract.js
// Toàn bộ phần làm việc với blockchain nằm ở đây. Giao diện chỉ gọi các hàm bên dưới.
import {
  BrowserProvider, JsonRpcProvider, Contract,
  formatEther, parseEther, verifyMessage, isAddress,
} from "ethers";

export { formatEther, parseEther, isAddress };

/* ---------- Cấu hình (đổi ở đây nếu deploy lại) ---------- */
export const FACTORY_ADDRESS = "0xE20154338f422dC191fcf038C18F78499135F4b2";
export const RPC = "https://evm-t3.cronos.org";
export const CHAIN_HEX = "0x152"; // 338 = Cronos Testnet
export const CHAIN_PARAMS = {
  chainId: CHAIN_HEX,
  chainName: "Cronos Testnet",
  nativeCurrency: { name: "TCRO", symbol: "TCRO", decimals: 18 },
  rpcUrls: [RPC],
  blockExplorerUrls: ["https://cronos.org/explorer/testnet3"],
};

export const FACTORY_ABI = [
  "function admin() view returns (address)",
  "function approvedOwners(address) view returns (bool)",
  "function approveOwner(address)",
  "function createCampaign(string,string,uint256,uint256,uint8[]) returns (address)",
  "function getCampaigns() view returns (address[])",
];

export const CAMPAIGN_ABI = [
  "function getCampaignInfo() view returns (string,string,address,address,uint256,uint256,uint256,uint256,uint8,uint256)",
  "function getMilestone(uint256) view returns (uint8,string,bool,bool,bool)",
  "function donations(address) view returns (uint256)",
  "function donate() payable",
  "function refund()",
  "function submitProof(uint256,string)",
  "function approveMilestone(uint256)",
  "function withdrawMilestone(uint256)",
];

// Thứ tự khớp enum State trong Solidity: Active, Successful, Failed, Completed, Refunded
export const STATE_VI = ["Đang gây quỹ", "Đã đủ mục tiêu", "Thất bại", "Đã giải ngân hết", "Đã hoàn tiền"];

/* ---------- Đọc dữ liệu (không cần đăng nhập) ---------- */
const rpc = new JsonRpcProvider(RPC);
const factoryRead = new Contract(FACTORY_ADDRESS, FACTORY_ABI, rpc);

export const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
export const shortAddr = (a) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "");
export const fmt = (wei) =>
  Number(formatEther(wei)).toLocaleString("vi-VN", { maximumFractionDigits: 4 });
export const errMsg = (e) => e?.reason || e?.shortMessage || e?.message || "Lỗi không xác định";

export async function fetchAdmin() {
  return factoryRead.admin();
}

// Trả về danh sách chiến dịch, mới nhất lên đầu
export async function fetchCampaigns() {
  const addrs = await factoryRead.getCampaigns();
  const items = await Promise.all(
    addrs.map(async (addr) => {
      const i = await new Contract(addr, CAMPAIGN_ABI, rpc).getCampaignInfo();
      return {
        addr,
        name: i[0],
        description: i[1],
        owner: i[2],
        verifier: i[3],
        goal: i[4],            // bigint (wei)
        deadline: Number(i[5]), // giây
        raised: i[6],          // bigint (wei)
        balance: i[7],
        state: Number(i[8]),   // 0..4, xem STATE_VI
        milestoneCount: Number(i[9]),
      };
    })
  );
  return items.reverse();
}

// Các mốc giải ngân + số tiền ví này đã ủng hộ
export async function fetchMilestones(addr, count) {
  const c = new Contract(addr, CAMPAIGN_ABI, rpc);
  return Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const m = await c.getMilestone(i);
      return { percent: Number(m[0]), proof: m[1], submitted: m[2], approved: m[3], withdrawn: m[4] };
    })
  );
}

export async function fetchMyDonation(addr, account) {
  if (!account) return 0n;
  return new Contract(addr, CAMPAIGN_ABI, rpc).donations(account);
}

export async function fetchIsApprovedOwner(account) {
  return factoryRead.approvedOwners(account);
}

/* ---------- Đăng nhập bằng MetaMask ---------- */
const SESSION_KEY = "ecofund_session";
const saveSession = (a) => { try { localStorage.setItem(SESSION_KEY, JSON.stringify({ account: a })); } catch { /* bỏ qua */ } };
const readSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } };
export const clearSession = () => { try { localStorage.removeItem(SESSION_KEY); } catch { /* bỏ qua */ } };

export async function ensureChain() {
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
  } catch {
    await window.ethereum.request({ method: "wallet_addEthereumChain", params: [CHAIN_PARAMS] });
  }
}

async function buildUser() {
  const signer = await new BrowserProvider(window.ethereum).getSigner();
  const account = await signer.getAddress();
  return { signer, account };
}

// Đăng nhập = chọn ví + ký một thông điệp (miễn phí, không chuyển tiền)
export async function loginWithWallet() {
  if (!window.ethereum) throw new Error("Chưa cài MetaMask. Hãy cài tiện ích MetaMask rồi tải lại trang.");
  await window.ethereum.request({ method: "eth_requestAccounts" });
  await ensureChain();
  const { signer, account } = await buildUser();
  const nonce = crypto.getRandomValues(new Uint32Array(2)).join("");
  const msg =
    `Đăng nhập Eco-Fund\n\nVí: ${account}\nMã xác thực: ${nonce}\n` +
    `Thời gian: ${new Date().toLocaleString("vi-VN")}\n\n` +
    `Chữ ký này không tốn phí và không cho phép chuyển tiền.`;
  const sig = await signer.signMessage(msg);
  if (!same(verifyMessage(msg, sig), account)) throw new Error("Chữ ký không khớp với ví");
  saveSession(account);
  return { signer, account };
}

// Mở lại trang vẫn đăng nhập nếu MetaMask còn kết nối đúng ví đó
export async function restoreLogin() {
  const s = readSession();
  if (!s || !window.ethereum) return null;
  try {
    const accs = await window.ethereum.request({ method: "eth_accounts" });
    if (accs[0] && same(accs[0], s.account)) return await buildUser();
  } catch { /* bỏ qua */ }
  clearSession();
  return null;
}

/* ---------- Giao dịch (cần đăng nhập) ---------- */
// Gửi giao dịch, chờ xác nhận. onStatus nhận chuỗi để hiện thông báo.
export async function sendTx(fn, onStatus = () => {}) {
  await ensureChain();
  onStatus("Mở MetaMask để xác nhận giao dịch.");
  const tx = await fn();
  onStatus("Giao dịch đã gửi, đang chờ mạng xác nhận.");
  await tx.wait();
}

const campaign = (addr, signer) => new Contract(addr, CAMPAIGN_ABI, signer);
const factory = (signer) => new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

export const actions = {
  donate: (signer, addr, amountTcro) => campaign(addr, signer).donate({ value: parseEther(String(amountTcro)) }),
  refund: (signer, addr) => campaign(addr, signer).refund(),
  submitProof: (signer, addr, index, proof) => campaign(addr, signer).submitProof(index, proof),
  approveMilestone: (signer, addr, index) => campaign(addr, signer).approveMilestone(index),
  withdrawMilestone: (signer, addr, index) => campaign(addr, signer).withdrawMilestone(index),
  approveOwner: (signer, who) => factory(signer).approveOwner(who),
  // percents ví dụ [30, 30, 40], durationDays có thể là số lẻ
  createCampaign: (signer, { name, description, goalTcro, durationDays, percents }) =>
    factory(signer).createCampaign(
      name, description, parseEther(String(goalTcro)),
      BigInt(Math.round(Number(durationDays) * 86400)), percents
    ),
};

// Thời gian còn lại, dùng chung cho các thẻ chiến dịch
export function timeLeft(deadlineSec) {
  const d = deadlineSec * 1000 - Date.now();
  if (d <= 0) return "Đã hết hạn";
  const days = Math.floor(d / 864e5), h = Math.floor((d % 864e5) / 36e5), m = Math.floor((d % 36e5) / 6e4);
  if (days > 0) return `Còn ${days} ngày ${h} giờ`;
  return h > 0 ? `Còn ${h} giờ ${m} phút` : `Còn ${m} phút`;
}