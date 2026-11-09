// src/useWallet.js
// Hook quản lý đăng nhập bằng MetaMask và vai trò của ví (Admin / Owner / Donor).
import { useCallback, useEffect, useState } from "react";
import {
  loginWithWallet, restoreLogin, clearSession,
  fetchAdmin, fetchIsApprovedOwner, same, errMsg,
} from "./contract";

export function useWallet() {
  const [account, setAccount] = useState("");
  const [signer, setSigner] = useState(null);
  const [admin, setAdmin] = useState("");
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const apply = useCallback(async (user) => {
    if (!user) { setAccount(""); setSigner(null); setApproved(false); return; }
    setSigner(user.signer);
    setAccount(user.account);
    setApproved(await fetchIsApprovedOwner(user.account));
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

  // Đổi ví trong MetaMask thì đăng xuất, đổi mạng thì tải lại
  useEffect(() => {
    if (!window.ethereum?.on) return;
    const onAccounts = () => { clearSession(); window.location.reload(); };
    const onChain = () => window.location.reload();
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccounts);
      window.ethereum.removeListener?.("chainChanged", onChain);
    };
  }, []);

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

  const logout = useCallback(() => { clearSession(); apply(null); }, [apply]);

  const isAdmin = same(account, admin);
  const role = !account ? "Khách" : isAdmin ? "Admin" : approved ? "Owner" : "Donor";

  return { account, signer, admin, approved, isAdmin, role, loading, error, login, logout };
}