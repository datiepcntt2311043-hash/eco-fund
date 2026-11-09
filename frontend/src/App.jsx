import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Leaf, Wallet, ArrowUpRight, Search, TreePine, Users, Clock3,
  ShieldCheck, Heart, Menu, X, CheckCircle2, ClipboardCheck,
  RefreshCw, ExternalLink, Send, Check, RotateCcw
} from "lucide-react";
import { useWallet } from "./useWallet";
import {
  FACTORY_ADDRESS, actions, fetchCampaigns, fetchMilestones,
  fetchMyDonation, fmt, isAddress, same, shortAddr, timeLeft, errMsg,
  sendTx, STATE_VI
} from "./contract";

const DEFAULT_FORM = { title: "", category: "Trồng rừng", goal: "5", days: "30", desc: "", percents: "30,30,40" };
const EXPLORER = "https://cronos.org/explorer/testnet3";

export default function App() {
  const wallet = useWallet();
  const { account, signer, admin, approved, isAdmin, role, loading: walletLoading, error: walletError, login, logout } = wallet;

  const [page, S] = useState("home");
  const [items, I] = useState([]);
  const [active, A] = useState(null);
  const [notice, N] = useState("");
  const [q, Q] = useState("");
  const [filter, F] = useState("Tất cả");
  const [amount, M] = useState("0.1");
  const [form, T] = useState(DEFAULT_FORM);
  const [newOwner, NO] = useState("");
  const [proofs, SP] = useState({});
  const [donations, SD] = useState({});
  const [busy, B] = useState(false);
  const [refreshing, R] = useState(false);

  const say = (message) => N(message);
  const go = (p) => { S(p); A(null); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const load = useCallback(async (quiet = false) => {
    if (!quiet) R(true);
    try {
      const rows = await fetchCampaigns();
      const enriched = await Promise.all(rows.map(async (c) => {
        let milestones = [];
        let myDonation = 0n;
        try { milestones = await fetchMilestones(c.addr, c.milestoneCount); } catch {}
        if (account) {
          try { myDonation = await fetchMyDonation(c.addr, account); } catch {}
        }
        return { ...c, milestones, myDonation };
      }));
      I(enriched);
    } catch (e) {
      say("Không tải được dữ liệu Blockchain: " + errMsg(e));
    } finally { R(false); }
  }, [account]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (walletError) say(walletError);
  }, [walletError]);

  const runTx = async (label, fn) => {
    if (!signer) return say("Vui lòng kết nối MetaMask trước.");
    B(true);
    try {
      await sendTx(fn, say);
      say(label + " thành công. Dữ liệu đã được xác nhận trên Cronos Testnet.");
      await load(true);
      return true;
    } catch (e) {
      say("Giao dịch thất bại: " + errMsg(e));
      return false;
    } finally { B(false); }
  };

  const connect = async () => {
    const ok = await login();
    if (ok) say("Đã kết nối và xác thực ví MetaMask.");
  };

  const create = async (e) => {
    e.preventDefault();
    const percents = form.percents.split(",").map(x => Number(x.trim()));
    if (!form.title.trim() || !form.desc.trim()) return say("Vui lòng nhập tên và mô tả chiến dịch.");
    if (!(Number(form.goal) > 0) || !(Number(form.days) > 0)) return say("Mục tiêu và thời hạn phải lớn hơn 0.");
    if (percents.length < 2 || percents.length > 3 || percents.some(x => !Number.isInteger(x) || x <= 0) || percents.reduce((a,b)=>a+b,0) !== 100)
      return say("Milestone phải có 2–3 tỷ lệ nguyên dương và tổng bằng 100. Ví dụ: 30,30,40.");
    const ok = await runTx("Tạo chiến dịch", () => actions.createCampaign(signer, {
      name: form.title.trim(), description: form.desc.trim(),
      goalTcro: form.goal, durationDays: form.days, percents
    }));
    if (ok) { T(DEFAULT_FORM); go("campaigns"); }
  };

  const donate = async (addr) => {
    if (!(Number(amount) > 0)) return say("Số TCRO đóng góp phải lớn hơn 0.");
    await runTx("Quyên góp", () => actions.donate(signer, addr, amount));
    M("0.1");
  };

  const approveOwner = async (e) => {
    e.preventDefault();
    if (!isAddress(newOwner.trim())) return say("Địa chỉ ví không hợp lệ.");
    const ok = await runTx("Phê duyệt Owner", () => actions.approveOwner(signer, newOwner.trim()));
    if (ok) NO("");
  };

  const submitProof = async (c, index) => {
    const proof = (proofs[`${c.addr}-${index}`] || "").trim();
    if (!proof) return say("Hãy nhập mã/hash hoặc đường dẫn bằng chứng cho milestone.");
    await runTx("Gửi bằng chứng", () => actions.submitProof(signer, c.addr, index, proof));
  };

  const approveMilestone = async (c, index) => {
    await runTx("Phê duyệt milestone", () => actions.approveMilestone(signer, c.addr, index));
  };

  const withdrawMilestone = async (c, index) => {
    await runTx("Giải ngân milestone", () => actions.withdrawMilestone(signer, c.addr, index));
  };

  const refund = async (c) => {
    await runTx("Hoàn tiền", () => actions.refund(signer, c.addr));
  };

  const shown = useMemo(() => items.filter(c =>
    (filter === "Tất cả" || (filter === "Đang gây quỹ" ? c.state === 0 : c.state !== 0)) &&
    `${c.name} ${c.description}`.toLowerCase().includes(q.toLowerCase())
  ), [items, filter, q]);

  const totalRaised = items.reduce((sum, c) => sum + c.raised, 0n);
  const nav = [["home","Trang chủ"],["campaigns","Chiến dịch"],["create","Tạo chiến dịch"],["dashboard","Owner"], ...(isAdmin ? [["admin","Admin"]] : [])];

  const CampaignCard = ({ c }) => {
    const percent = c.goal > 0n ? Math.min(100, Number(c.raised * 10000n / c.goal) / 100) : 0;
    return <article className="card">
      <button className="cover" onClick={() => A(c)}>
        <img src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1000&q=85" alt="Dự án môi trường"/>
        <span>{STATE_VI[c.state] || "Không xác định"}</span>
      </button>
      <div className="cardbody">
        <button className="cardtitle" onClick={() => A(c)}>{c.name}</button>
        <p>{c.description}</p>
        <div className="progress"><div><span style={{ width: percent + "%" }}/></div>
          <small><b>{percent.toFixed(1)}% mục tiêu</b><span>{fmt(c.raised)} / {fmt(c.goal)} TCRO</span></small>
        </div>
        <div className="meta">
          <span><Clock3/> {timeLeft(c.deadline)}</span>
          <span><Wallet/> {shortAddr(c.owner)}</span>
        </div>
        <button className="link" onClick={() => A(c)}>Xem chi tiết ↗</button>
      </div>
    </article>;
  };

  return <div className="shell">
    <header>
      <button className="brand" onClick={() => go("home")}><span className="logo"><Leaf/></span>ECO<span>-</span>FUND</button>
      <nav>{nav.map(([p,t]) => <button key={p} className={page===p?"active":""} onClick={() => go(p)}>{t}</button>)}</nav>
      {account
        ? <button className="wallet" onClick={logout}><Wallet size={17}/>{shortAddr(account)} · {role} · Đăng xuất</button>
        : <button className="wallet" onClick={connect} disabled={walletLoading}><Wallet size={17}/>{walletLoading?"Đang tải...":"Kết nối ví"}</button>}
      <button className="hamb" onClick={() => go(page==="menu"?"home":"menu")}><Menu/></button>
    </header>

    {notice && <div className="notice"><span>{notice}</span><button onClick={() => N("")}><X size={16}/></button></div>}
    <div className="chainbar">
      <span><span className="dot"/> Cronos Testnet · Chain ID 338</span>
      <a href={`${EXPLORER}/address/${FACTORY_ADDRESS}`} target="_blank" rel="noreferrer">Factory Contract <ExternalLink size={13}/></a>
      {account && <span>{shortAddr(account)} · {role}</span>}
    </div>

    {page==="home" && <>
      <section className="hero">
        <div>
          <small className="eyebrow"><Leaf size={15}/> CÔNG NGHỆ VÌ MỘT HÀNH TINH XANH</small>
          <h1>Mỗi đóng góp nhỏ,<br/><em>một tương lai xanh.</em></h1>
          <p>ECO-FUND kết nối cộng đồng với những dự án môi trường ý nghĩa. Theo dõi dòng tiền và tiến độ minh bạch trực tiếp trên Blockchain Cronos.</p>
          <div className="actions">
            <button className="primary" onClick={() => go("campaigns")}>Khám phá chiến dịch <ArrowUpRight size={17}/></button>
            <button className="outline" onClick={() => go("create")}>Bắt đầu gây quỹ</button>
          </div>
          <div className="trust"><ShieldCheck size={17}/> Minh bạch · Có thể kiểm chứng · Vì cộng đồng</div>
        </div>
        <div className="heroimg"><img src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=90" alt="Rừng xanh"/>
          <div className="float"><TreePine/><b>Hành động xanh</b><small>Dữ liệu được ghi nhận on-chain</small></div>
        </div>
      </section>
      <section className="stats">
        <Stat n={fmt(totalRaised)+" TCRO"} t="Tổng tiền đã quyên góp on-chain"/>
        <Stat n={items.length} t="Chiến dịch đã tạo"/>
        <Stat n={items.filter(c=>c.state===1||c.state===3).length} t="Chiến dịch đạt mục tiêu/hoàn thành"/>
        <Stat n="Cronos" t="Mạng Blockchain"/>
      </section>
      <SectionTitle eyebrow="DỮ LIỆU TRỰC TIẾP TỪ SMART CONTRACT" title="Những chiến dịch nổi bật" action={() => go("campaigns")}/>
      {items.length ? <div className="grid">{items.slice(0,3).map(c=><CampaignCard key={c.addr} c={c}/>)}</div> : <Empty text="Chưa có chiến dịch nào trên Blockchain."/>}
    </>}

    {page==="campaigns" && <>
      <SectionTitle eyebrow="CÙNG HÀNH ĐỘNG VÌ HÀNH TINH" title="Khám phá chiến dịch"/>
      <div className="filters">
        <div className="search"><Search/><input placeholder="Tìm kiếm chiến dịch..." value={q} onChange={e=>Q(e.target.value)}/></div>
        {["Tất cả","Đang gây quỹ","Đã kết thúc"].map(x=><button key={x} className={filter===x?"chosen":""} onClick={()=>F(x)}>{x}</button>)}
        <button className="outline" onClick={()=>load()} disabled={refreshing}><RefreshCw size={15}/> {refreshing?"Đang tải":"Làm mới"}</button>
      </div>
      <div className="grid">{shown.map(c=><CampaignCard key={c.addr} c={c}/>)}</div>
      {!shown.length&&<Empty text="Không tìm thấy chiến dịch phù hợp trên Blockchain."/>}
    </>}

    {page==="create" && <section className="formpage">
      <SectionTitle eyebrow="LAN TỎA SÁNG KIẾN" title="Tạo chiến dịch mới"/>
      {!account ? <button className="primary" onClick={connect}>Kết nối MetaMask để tiếp tục</button>
      : !approved ? <div className="hint"><ShieldCheck/><span><b>Ví chưa được Admin phê duyệt</b><small>Gửi địa chỉ {account} cho Admin để được cấp quyền Owner. Chỉ ví được duyệt mới tạo chiến dịch.</small></span></div>
      : <form onSubmit={create}>
        <label>Tên chiến dịch<input required maxLength="100" value={form.title} onChange={e=>T({...form,title:e.target.value})} placeholder="Ví dụ: Trồng 1.000 cây xanh"/></label>
        <div className="two">
          <label>Mục tiêu (TCRO)<input required type="number" min="0.001" step="0.001" value={form.goal} onChange={e=>T({...form,goal:e.target.value})}/></label>
          <label>Thời hạn (ngày)<input required type="number" min="1" max="365" value={form.days} onChange={e=>T({...form,days:e.target.value})}/></label>
        </div>
        <label>Mô tả dự án<textarea required rows="5" maxLength="1000" value={form.desc} onChange={e=>T({...form,desc:e.target.value})} placeholder="Mục tiêu, hoạt động và kết quả mong đợi..."/></label>
        <label>Tỷ lệ giải ngân từng milestone (%)<input required value={form.percents} onChange={e=>T({...form,percents:e.target.value})} placeholder="30,30,40"/></label>
        <div className="hint"><ShieldCheck/><span><b>Giải ngân theo milestone</b><small>Nhập 2–3 tỷ lệ, tổng đúng 100%. Ví dụ 30,30,40. Verifier là Admin của Factory.</small></span></div>
        <button className="primary wide" disabled={busy}>{busy?"Đang xử lý...":"Tạo chiến dịch trên Blockchain"} <ArrowUpRight size={17}/></button>
      </form>}
    </section>}

    {page==="dashboard" && <section className="page">
      <SectionTitle eyebrow="KHÔNG GIAN CỦA BẠN" title="Dashboard Owner"/>
      {!account ? <button className="primary" onClick={connect}>Kết nối ví</button> : <>
        <div className="hint"><Wallet/><span><b>Ví đang sử dụng · {role}</b><small>{account}</small></span></div>
        {!approved && !isAdmin && <p>Ví hiện tại chưa được cấp quyền Owner.</p>}
        <div className="ownerlist">{items.filter(c=>same(c.owner,account)).map(c=><div className="table" key={c.addr}>
          <h3>{c.name}</h3><p>{fmt(c.raised)} / {fmt(c.goal)} TCRO · {STATE_VI[c.state]}</p>
          <MilestoneManager c={c} account={account} isAdmin={isAdmin} busy={busy} proofs={proofs} setProofs={SP} submitProof={submitProof} approveMilestone={approveMilestone} withdrawMilestone={withdrawMilestone}/>
        </div>)}
        {!items.some(c=>same(c.owner,account))&&<Empty text="Ví này chưa tạo chiến dịch nào."/>}</div>
      </>}
    </section>}

    {page==="admin" && <section className="page">
      <SectionTitle eyebrow="KHU VỰC QUẢN TRỊ" title="Admin Dashboard"/>
      {!isAdmin ? <div className="hint"><ShieldCheck/><span><b>Không có quyền truy cập</b><small>Chỉ địa chỉ Admin được khai báo trong Factory mới quản trị được.</small></span></div> : <>
        <div className="adminboxes">
          <div><Users/><h3>Phê duyệt người tạo</h3><p>Cấp quyền Owner cho địa chỉ ví được phép tạo chiến dịch.</p>
            <form onSubmit={approveOwner}><label>Địa chỉ ví Owner<input value={newOwner} onChange={e=>NO(e.target.value)} placeholder="0x..."/></label><button className="primary" disabled={busy}>Duyệt Owner</button></form>
          </div>
          <div><ClipboardCheck/><h3>Xác minh milestone</h3><p>Đọc bằng chứng do Owner gửi và phê duyệt trước khi giải ngân.</p>
            <p><a href={`${EXPLORER}/address/${FACTORY_ADDRESS}`} target="_blank" rel="noreferrer">Mở Factory trên Explorer <ExternalLink size={13}/></a></p>
          </div>
        </div>
        {items.map(c=><div className="table" key={c.addr}><h3>{c.name}</h3><p>Owner: {shortAddr(c.owner)} · {STATE_VI[c.state]}</p>
          <MilestoneManager c={c} account={account} isAdmin={isAdmin} busy={busy} proofs={proofs} setProofs={SP} submitProof={submitProof} approveMilestone={approveMilestone} withdrawMilestone={withdrawMilestone}/>
        </div>)}
      </>}
    </section>}

    {page==="menu" && <div className="mobilemenu">{nav.map(([p,t])=><button key={p} onClick={()=>go(p)}>{t}</button>)}</div>}

    <footer><b><Leaf/> ECO-FUND</b><span>Minh bạch từng đóng góp. Bền vững từng hành động.</span><small>© ECO-FUND · Cronos Testnet</small></footer>

    {active && <div className="backdrop" onClick={()=>A(null)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="close" onClick={()=>A(null)}><X/></button>
        <img src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1000&q=85" alt="Chiến dịch"/>
        <div className="modalbody">
          <small className="eyebrow">{STATE_VI[active.state]}</small><h2>{active.name}</h2><p>{active.description}</p>
          <div className="modalstats"><b>{fmt(active.raised)} TCRO<small>Đã quyên góp</small></b><b>{fmt(active.goal)} TCRO<small>Mục tiêu</small></b><b>{timeLeft(active.deadline)}<small>Thời hạn</small></b></div>
          <ProgressChain c={active}/>
          <h3>Các giai đoạn thực hiện</h3>
          {(active.milestones||[]).map((m,i)=><div className="milestone" key={i}><CheckCircle2/><span>{m.percent}% · {m.proof||"Chưa có bằng chứng"}</span><small>{m.withdrawn?"Đã giải ngân":m.approved?"Đã duyệt":m.submitted?"Chờ duyệt":"Chưa gửi"}</small></div>)}
          {active.state===0 && <><label className="donate">Số TCRO muốn đóng góp<input type="number" min="0.001" step="0.001" value={amount} onChange={e=>M(e.target.value)}/></label><button className="primary wide" disabled={busy} onClick={()=>donate(active.addr)}><Heart size={17}/> Quyên góp bằng MetaMask</button></>}
          {(active.state===2 || active.state===4) && Number(active.myDonation)>0 && <button className="outline wide" disabled={busy} onClick={()=>refund(active)}> <RotateCcw size={16}/> Yêu cầu hoàn tiền ({fmt(active.myDonation)} TCRO)</button>}
          <small className="muted">Campaign: <a href={`${EXPLORER}/address/${active.addr}`} target="_blank" rel="noreferrer">{shortAddr(active.addr)} <ExternalLink size={12}/></a></small>
        </div>
      </div>
    </div>}
    {busy && <div className="busyveil">Đang chờ giao dịch Blockchain...</div>}
  </div>;
}

function Stat({n,t}) { return <div className="stat"><b>{n}</b><small>{t}</small></div>; }
function SectionTitle({eyebrow,title,action}) { return <div className="sectiontitle"><div><small className="eyebrow">{eyebrow}</small><h2>{title}</h2></div>{action&&<button className="link" onClick={action}>Xem tất cả →</button>}</div>; }
function Empty({text}) { return <div className="empty">{text}</div>; }
function ProgressChain({c}) { const p=c.goal>0n?Math.min(100,Number(c.raised*10000n/c.goal)/100):0; return <div className="progress"><div><span style={{width:p+"%"}}/></div><small><b>{p.toFixed(1)}% mục tiêu</b><span>Còn {fmt(c.goal>c.raised?c.goal-c.raised:0n)} TCRO</span></small></div>; }
function MilestoneManager({c,isAdmin,busy,proofs,setProofs,submitProof,approveMilestone,withdrawMilestone}) {
  return <div className="milestonemanager">{(c.milestones||[]).map((m,i)=><div className="milestoneadmin" key={i}>
    <b>Milestone {i+1} · {m.percent}%</b><p>{m.proof||"Chưa có bằng chứng"}</p>
    <small>{m.withdrawn?"Đã giải ngân":m.approved?"Đã phê duyệt":m.submitted?"Đã gửi bằng chứng":"Chưa gửi bằng chứng"}</small>
    {!isAdmin && c.state===1 && !m.approved && <div><input value={proofs[`${c.addr}-${i}`]||""} onChange={e=>setProofs(old=>({...old,[`${c.addr}-${i}`]:e.target.value}))} placeholder="Nhập mã hash / URL bằng chứng"/><button className="outline tiny" disabled={busy} onClick={()=>submitProof(c,i)}><Send size={13}/> Gửi bằng chứng</button></div>}
    {isAdmin && c.state===1 && m.submitted && !m.approved && <button className="outline tiny" disabled={busy} onClick={()=>approveMilestone(c,i)}><Check size={13}/> Phê duyệt</button>}
    {!isAdmin && c.state===1 && m.approved && !m.withdrawn && <button className="primary tiny" disabled={busy} onClick={()=>withdrawMilestone(c,i)}>Giải ngân milestone</button>}
  </div>)}</div>;
}
