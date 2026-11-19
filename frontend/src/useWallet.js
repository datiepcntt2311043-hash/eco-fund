// src/useWallet.js
// Hook quản lý đăng nhập bằng MetaMask và vai trò của ví (Admin / Owner / Donor).
import { useCallback, useEffect, useRef, useState } from "react";
import {
  loginWithWallet, restoreLogin, clearSession, logoutWallet, fetchBalance, currentUser,
  fetchAdmin, fetchIsApprovedOwner, same, errMsg,
} from "./contract";

export function useWallet() {
  const [account, setAccount] = useState("");
  const [signer, setSigner] = useState(null);
  const [admin, setAdmin] = useState("");
  const [approved, setApproved] = useState(false);
  const [balance, setBalance] = useState(0n);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const loggedIn = useRef(false);

  const apply = useCallback(async (user) => {
    if (!user) { setAccount(""); setSigner(null); setApproved(false); setBalance(0n); return; }
    setSigner(user.signer);
    setAccount(user.account);
    try { setApproved(await fetchIsApprovedOwner(user.account)); } catch { setApproved(false); }
    try { setBalance(await fetchBalance(user.account)); } catch { setBalance(0n); }
  }, []);

  // Khi mở trang: đọc admin và khôi phục đăng nhập cũ (nếu có)
  useEffect(() => {
    (async () => {
      try {
        setAdmin(await fetchAdmin());
        await apply(await restoreLogin());
      } catch (e) { setError(errMsg(e)); }
      setLoading(false);
    })();
  }, [apply]);

  useEffect(() => { loggedIn.current = !!account; }, [account]);

  // Đổi ví trong MetaMask thì chuyển sang ví đó (không cần đăng nhập lại), đổi mạng thì tải lại
  useEffect(() => {
    if (!window.ethereum?.on) return;
    const onAccounts = async (accs) => {
      if (!loggedIn.current) return;                       // chưa đăng nhập thì bỏ qua
      if (!accs || accs.length === 0) { clearSession(); await apply(null); return; } // MetaMask ngắt kết nối
      try { await apply(await currentUser()); }
      catch (e) { console.error("Không chuyển được tài khoản:", e); clearSession(); await apply(null); }
    };
    const onChain = () => window.location.reload();
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccounts);
      window.ethereum.removeListener?.("chainChanged", onChain);
    };
  }, [apply]);

  const login = useCallback(async () => {
    setError("");
    try { await apply(await loginWithWallet()); return true; }
    catch (e) {
      const rejected = e.code === 4001 || e.code === "ACTION_REJECTED";
      setError(rejected ? "Bạn đã từ chối trong MetaMask." : errMsg(e));
      await apply(null);
      return false;
    }
  }, [apply]);

  const logout = useCallback(async () => { await logoutWallet(); await apply(null); }, [apply]);

  const isAdmin = same(account, admin);
  const role = !account ? "Khách" : isAdmin ? "Admin" : approved ? "Owner" : "Donor";

  return { account, signer, admin, approved, balance, isAdmin, role, loading, error, login, logout };
}