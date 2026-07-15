import { useState, useEffect, useMemo } from "react";
import {
  Plus, X, Trash2, ChevronLeft, ChevronRight, Wallet,
  ArrowUpRight, ArrowDownRight, BookOpen, PiggyBank, LineChart as LineChartIcon, CreditCard,
  User, Lock, LogIn, UserPlus, LogOut, Mail
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import { supabase } from "./supabaseClient.js";

const MONTHS_TR = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
const MONTHS_TR_FULL = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

const DEFAULT_EXPENSE = [
  { id: "kira", name: "Kira", budget: 8000 },
  { id: "elektrik", name: "Elektrik Faturası", budget: 600 },
  { id: "su", name: "Su Faturası", budget: 150 },
  { id: "dogalgaz", name: "Doğalgaz", budget: 500 },
  { id: "internet", name: "İnternet / Telefon", budget: 400 },
  { id: "market", name: "Market", budget: 2500 },
  { id: "restoran", name: "Restoran / Yemek", budget: 800 },
  { id: "akaryakit", name: "Araç Yakıtı", budget: 1200 },
  { id: "toplutasima", name: "Toplu Taşıma", budget: 300 },
  { id: "giyim", name: "Giyim", budget: 600 },
  { id: "eglence", name: "Eğlence", budget: 800 },
  { id: "harclik", name: "Cep Harçlığı (Nakit)", budget: 1000 },
  { id: "diger", name: "Diğer", budget: 500 },
];

const DEFAULT_INCOME = [
  { id: "maas", name: "Maaş" },
  { id: "ekgelir", name: "Ek Gelir" },
  { id: "digergelir", name: "Diğer Gelir" },
];

const DEFAULT_CARDS = [
  { id: "garanti-sf", name: "Garanti Shop and Fly", debt: 73928, dueDate: "2026-07-10", paid: false },
  { id: "vakif-world", name: "Vakıf World", debt: 8404, dueDate: "2026-06-16", paid: false },
  { id: "teb", name: "TEB", debt: 24661, dueDate: "2026-07-07", paid: true },
  { id: "yapikredi-world", name: "Yapı Kredi World", debt: 10530, dueDate: "2026-07-13", paid: false },
  { id: "ziraat-bank", name: "Ziraatbank", debt: 47183, dueDate: "2026-07-13", paid: false },
];

const PALETTE = ["#3E6B6E", "#8E7CC3", "#F4B183", "#5B8A99", "#B4A7D6", "#D99A6C", "#6FA3A0", "#A78BC9"];

function fmt(n) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n || 0);
}
function monthKey(dateStr) { return dateStr.slice(0, 7); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function rotationFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 7) - 3;
}
function colorFor(id, list) {
  const idx = list.findIndex((c) => c.id === id);
  return PALETTE[idx % PALETTE.length];
}
function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9ığüşöç]/g, "").slice(0, 12) || "kategori";
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / (1000 * 60 * 60 * 24));
}

export default function HaneDefteri() {
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [expenseCats, setExpenseCats] = useState(DEFAULT_EXPENSE);
  const [incomeCats, setIncomeCats] = useState(DEFAULT_INCOME);
  const [cards, setCards] = useState(DEFAULT_CARDS);
  const [tab, setTab] = useState("ozet");
  const [showAdd, setShowAdd] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (session) {
      setAuthed(true);
      await loadUserData(session.user.id);
    }
    setLoading(false);
  }

  async function loadUserData(userId) {
    try {
      const { data } = await supabase.from("user_data").select("data").eq("user_id", userId).single();
      const d = data?.data;
      if (d) {
        setTransactions(d.transactions || []);
        setExpenseCats(d.expenseCats && d.expenseCats.length ? d.expenseCats : DEFAULT_EXPENSE);
        setIncomeCats(d.incomeCats && d.incomeCats.length ? d.incomeCats : DEFAULT_INCOME);
        setCards(d.cards && d.cards.length ? d.cards : DEFAULT_CARDS);
      }
    } catch (e) {
      // ilk giriş, henüz satır yok — varsayılanlar kalır
    }
  }

  function mapAuthError(error) {
    const msg = error?.message || "";
    if (msg.includes("already registered")) return "Bu e-posta zaten kayıtlı.";
    if (msg.includes("Password should be at least")) return "Şifre en az 6 karakter olmalı.";
    if (msg.includes("Invalid login")) return "E-posta veya şifre hatalı.";
    if (msg.includes("Email not confirmed")) return "E-postanı henüz onaylamadın. Gelen kutunu kontrol et.";
    return "Bir sorun oluştu, tekrar dene.";
  }

  async function handleSetup(username, email, password) {
    setAuthError("");
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: username.trim() } },
      });
      if (error) { setAuthError(mapAuthError(error)); return { ok: false }; }
      if (data.session) {
        setAuthed(true);
        await loadUserData(data.user.id);
        return { ok: true, confirmed: true };
      }
      return { ok: true, confirmed: false };
    } catch (e) {
      setAuthError("Hesap oluşturulamadı, tekrar dene.");
      return { ok: false };
    }
  }

  async function handleLogin(email, password) {
    setAuthError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setAuthError(mapAuthError(error)); return { ok: false }; }
      setAuthed(true);
      await loadUserData(data.user.id);
      return { ok: true };
    } catch (e) {
      setAuthError("Giriş yapılamadı, tekrar dene.");
      return { ok: false };
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setAuthed(false);
    setTransactions([]);
    setExpenseCats(DEFAULT_EXPENSE);
    setIncomeCats(DEFAULT_INCOME);
    setCards(DEFAULT_CARDS);
    setTab("ozet");
  }

  async function persist(ec, ic, tx, crds) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;
      const { error } = await supabase.from("user_data").upsert({
        user_id: userId,
        data: { expenseCats: ec, incomeCats: ic, transactions: tx, cards: crds },
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSaveError(false);
    } catch (e) {
      setSaveError(true);
    }
  }

  function addTransaction(tx) {
    const newTx = [...transactions, { ...tx, id: Date.now().toString() }];
    setTransactions(newTx);
    persist(expenseCats, incomeCats, newTx, cards);
    setShowAdd(false);
  }

  function deleteTransaction(id) {
    const newTx = transactions.filter((t) => t.id !== id);
    setTransactions(newTx);
    persist(expenseCats, incomeCats, newTx, cards);
  }

  function updateBudget(catId, budget) {
    const newCats = expenseCats.map((c) => (c.id === catId ? { ...c, budget } : c));
    setExpenseCats(newCats);
    persist(newCats, incomeCats, transactions, cards);
  }

  function renameCategory(catId, newName) {
    if (!newName.trim()) return;
    const newCats = expenseCats.map((c) => (c.id === catId ? { ...c, name: newName.trim() } : c));
    setExpenseCats(newCats);
    persist(newCats, incomeCats, transactions, cards);
  }

  function deleteCategory(catId) {
    const newCats = expenseCats.filter((c) => c.id !== catId);
    setExpenseCats(newCats);
    persist(newCats, incomeCats, transactions, cards);
  }

  function addCategory(name, type) {
    if (!name.trim()) return;
    if (type === "expense") {
      const newCats = [...expenseCats, { id: slug(name) + Date.now(), name: name.trim(), budget: 0 }];
      setExpenseCats(newCats);
      persist(newCats, incomeCats, transactions, cards);
    } else {
      const newCats = [...incomeCats, { id: slug(name) + Date.now(), name: name.trim() }];
      setIncomeCats(newCats);
      persist(expenseCats, newCats, transactions, cards);
    }
  }

  function addCard(card) {
    const newCards = [...cards, { ...card, id: Date.now().toString() }];
    setCards(newCards);
    persist(expenseCats, incomeCats, transactions, newCards);
    setAddingCard(false);
  }

  function updateCard(id, patch) {
    const newCards = cards.map((c) => (c.id === id ? { ...c, ...patch } : c));
    setCards(newCards);
    persist(expenseCats, incomeCats, transactions, newCards);
  }

  function deleteCard(id) {
    const newCards = cards.filter((c) => c.id !== id);
    setCards(newCards);
    persist(expenseCats, incomeCats, transactions, newCards);
  }

  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const viewKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;
  const viewLabel = `${MONTHS_TR_FULL[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  const allTimeBalance = useMemo(() => {
    return transactions.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0);
  }, [transactions]);

  const monthTx = useMemo(() => transactions.filter((t) => monthKey(t.date) === viewKey), [transactions, viewKey]);
  const monthIncome = useMemo(() => monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [monthTx]);
  const monthExpense = useMemo(() => monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), [monthTx]);

  const categoryTotals = useMemo(() => {
    const map = {};
    monthTx.filter((t) => t.type === "expense").forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return expenseCats
      .map((c) => ({ id: c.id, name: c.name, value: map[c.id] || 0, budget: c.budget || 0 }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [monthTx, expenseCats]);

  const trendData = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const inc = transactions.filter((t) => t.type === "income" && monthKey(t.date) === key).reduce((s, t) => s + t.amount, 0);
      const exp = transactions.filter((t) => t.type === "expense" && monthKey(t.date) === key).reduce((s, t) => s + t.amount, 0);
      arr.push({ ay: MONTHS_TR[d.getMonth()], Gelir: inc, Gider: exp });
    }
    return arr;
  }, [transactions, now]);

  const recentTx = useMemo(() => [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 5), [transactions]);
  const sortedMonthTx = useMemo(() => [...monthTx].sort((a, b) => b.date.localeCompare(a.date)), [monthTx]);

  const catName = (id, type) => {
    const list = type === "income" ? incomeCats : expenseCats;
    const found = list.find((c) => c.id === id);
    return found ? found.name : "Diğer";
  };

  if (loading) {
    return (
      <div style={S.loadingWrap}>
        <style>{CSS}</style>
        <BookOpen size={32} color="#3E6B6E" />
        <div style={{ fontFamily: "'Fraunces', serif", color: "#2C3E50", marginTop: 10 }}>Defter açılıyor…</div>
      </div>
    );
  }

  if (!authed) {
    return (
      <AuthGate
        onLogin={handleLogin}
        onSetup={handleSetup}
        error={authError}
      />
    );
  }

  return (
    <div className="hd-root">
      <style>{CSS}</style>

      <header className="hd-cover">
        <div className="hd-cover-top">
          <BookOpen size={20} />
          <span className="hd-cover-title">HANE DEFTERİ</span>
          <button className="hd-logout-btn" onClick={handleLogout} aria-label="Çıkış yap">
            <LogOut size={16} />
          </button>
        </div>
        <div className="hd-cover-balance-label">Toplam Bakiye</div>
        <div className="hd-cover-balance">{fmt(allTimeBalance)}</div>
        <div className="hd-cover-sub">
          <span><ArrowUpRight size={13} /> {fmt(monthIncome)} bu ay</span>
          <span><ArrowDownRight size={13} /> {fmt(monthExpense)} bu ay</span>
        </div>
      </header>

      {saveError && <div className="hd-error">Kayıt sırasında bir sorun oldu, tekrar denenecek.</div>}

      <main className="hd-main">
        {tab === "ozet" && (
          <Ozet
            monthIncome={monthIncome}
            monthExpense={monthExpense}
            categoryTotals={categoryTotals}
            recentTx={recentTx}
            catName={catName}
            expenseCats={expenseCats}
            incomeCats={incomeCats}
            viewLabel={viewLabel}
          />
        )}

        {tab === "hareketler" && (
          <Hareketler
            viewLabel={viewLabel}
            monthOffset={monthOffset}
            setMonthOffset={setMonthOffset}
            sortedMonthTx={sortedMonthTx}
            catName={catName}
            expenseCats={expenseCats}
            incomeCats={incomeCats}
            deleteTransaction={deleteTransaction}
          />
        )}

        {tab === "butce" && (
          <Butce
            expenseCats={expenseCats}
            categoryTotals={categoryTotals}
            updateBudget={updateBudget}
            viewLabel={viewLabel}
            addingCategory={addingCategory}
            setAddingCategory={setAddingCategory}
            addCategory={addCategory}
            renameCategory={renameCategory}
            deleteCategory={deleteCategory}
          />
        )}

        {tab === "raporlar" && (
          <Raporlar trendData={trendData} categoryTotals={categoryTotals} monthExpense={monthExpense} viewLabel={viewLabel} />
        )}

        {tab === "krediler" && (
          <KrediKartlari
            cards={cards}
            addCard={addCard}
            updateCard={updateCard}
            deleteCard={deleteCard}
            addingCard={addingCard}
            setAddingCard={setAddingCard}
          />
        )}
      </main>

      <button className="hd-fab" onClick={() => setShowAdd(true)} aria-label="Hareket ekle">
        <Plus size={24} />
      </button>

      <nav className="hd-tabs">
        <TabBtn active={tab === "ozet"} onClick={() => setTab("ozet")} icon={<Wallet size={19} />} label="Özet" />
        <TabBtn active={tab === "hareketler"} onClick={() => setTab("hareketler")} icon={<BookOpen size={19} />} label="Hareketler" />
        <TabBtn active={tab === "butce"} onClick={() => setTab("butce")} icon={<PiggyBank size={19} />} label="Bütçe" />
        <TabBtn active={tab === "raporlar"} onClick={() => setTab("raporlar")} icon={<LineChartIcon size={19} />} label="Raporlar" />
        <TabBtn active={tab === "krediler"} onClick={() => setTab("krediler")} icon={<CreditCard size={19} />} label="Kartlar" />
      </nav>

      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onAdd={addTransaction}
          expenseCats={expenseCats}
          incomeCats={incomeCats}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button className={"hd-tabbtn" + (active ? " active" : "")} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function HaneLogo({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hane-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3E6B6E" />
          <stop offset="100%" stopColor="#8E7CC3" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill="url(#hane-logo-grad)" />
      <path d="M32 14 L50 29 V49 H14 V29 Z" fill="#FFFFFF" opacity="0.95" />
      <rect x="27" y="35" width="10" height="14" rx="1.5" fill="#F4B183" />
      <circle cx="34.5" cy="42" r="1.3" fill="#3E6B6E" />
    </svg>
  );
}

function AuthGate({ onLogin, onSetup, error }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);
  const isSetup = mode === "setup";

  async function submit() {
    if (!email.trim() || !password || submitting) return;
    if (isSetup && !username.trim()) return;
    setSubmitting(true);
    if (isSetup) {
      const res = await onSetup(username, email.trim(), password);
      if (res?.ok && !res.confirmed) setPendingEmail(email.trim());
    } else {
      await onLogin(email.trim(), password);
    }
    setSubmitting(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") submit();
  }

  function switchMode(next) {
    setMode(next);
    setPendingEmail(null);
  }

  if (pendingEmail) {
    return (
      <div className="hd-auth-root">
        <style>{CSS}</style>
        <div className="hd-auth-card">
          <div className="hd-auth-logo"><HaneLogo size={64} /></div>
          <h1 className="hd-auth-title">Hane App</h1>
          <div className="hd-auth-pending-icon">✉️</div>
          <div className="hd-auth-pending-text">
            <strong>{pendingEmail}</strong> adresine bir onay maili gönderdik.
            Gelen kutunu (ve spam klasörünü) kontrol edip linke tıkla, sonra giriş yap.
          </div>
          <button type="button" className="hd-btn-primary hd-auth-submit" onClick={() => switchMode("login")}>
            Giriş ekranına dön
          </button>
        </div>
        <div className="hd-auth-footer">
          <div className="hd-auth-slogan">"Hanemize hayırlı olsun"</div>
          <div className="hd-auth-copyright">© {new Date().getFullYear()} Hane App. Tüm hakları saklıdır.</div>
          <div className="hd-auth-credit">Mila Soft Yazılım</div>
        </div>
      </div>
    );
  }

  return (
    <div className="hd-auth-root">
      <style>{CSS}</style>
      <div className="hd-auth-card">
        <div className="hd-auth-logo">
          <HaneLogo size={64} />
        </div>
        <h1 className="hd-auth-title">Hane App</h1>
        <div className="hd-auth-subtitle">{isSetup ? "Hesabını oluştur" : "Hesabına giriş yap"}</div>

        <div className="hd-auth-form">
          {isSetup && (
            <>
              <label className="hd-field-label">Kullanıcı Adı</label>
              <div className="hd-auth-input-wrap">
                <User size={16} />
                <input
                  className="hd-auth-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="görünen adın"
                  autoComplete="name"
                />
              </div>
            </>
          )}

          <label className="hd-field-label">E-posta</label>
          <div className="hd-auth-input-wrap">
            <Mail size={16} />
            <input
              className="hd-auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ornek@eposta.com"
              autoComplete="email"
            />
          </div>

          <label className="hd-field-label">Şifre</label>
          <div className="hd-auth-input-wrap">
            <Lock size={16} />
            <input
              className="hd-auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="şifre"
              autoComplete={isSetup ? "new-password" : "current-password"}
            />
          </div>

          {error && <div className="hd-form-error">{error}</div>}

          <button type="button" className="hd-btn-primary hd-auth-submit" onClick={submit} disabled={submitting}>
            {submitting ? "Bir saniye…" : isSetup ? <><UserPlus size={16} /> Hesap Oluştur</> : <><LogIn size={16} /> Giriş Yap</>}
          </button>

          <button type="button" className="hd-auth-switch" onClick={() => switchMode(isSetup ? "login" : "setup")}>
            {isSetup ? "Zaten hesabın var mı? Giriş yap" : "Hesabın yok mu? Hesap oluştur"}
          </button>
        </div>
      </div>

      <div className="hd-auth-footer">
        <div className="hd-auth-slogan">"Hanemize hayırlı olsun"</div>
        <div className="hd-auth-copyright">© {new Date().getFullYear()} Hane App. Tüm hakları saklıdır.</div>
        <div className="hd-auth-credit">Mila Soft Yazılım</div>
      </div>
    </div>
  );
}

function Stamp({ id, name, list, size = "md" }) {
  const rot = rotationFor(id);
  const color = colorFor(id, list);
  return (
    <span className={"hd-stamp hd-stamp-" + size} style={{ "--stamp-color": color, transform: `rotate(${rot}deg)` }}>
      {name}
    </span>
  );
}

function Ozet({ monthIncome, monthExpense, categoryTotals, recentTx, catName, expenseCats, incomeCats, viewLabel }) {
  const total = categoryTotals.reduce((s, c) => s + c.value, 0);
  return (
    <div className="hd-page">
      <div className="hd-card">
        <div className="hd-card-title">{viewLabel} özeti</div>
        <div className="hd-summary-row">
          <div className="hd-summary-item income">
            <ArrowUpRight size={16} />
            <div>
              <div className="hd-summary-num">{fmt(monthIncome)}</div>
              <div className="hd-summary-label">Gelir</div>
            </div>
          </div>
          <div className="hd-summary-item expense">
            <ArrowDownRight size={16} />
            <div>
              <div className="hd-summary-num">{fmt(monthExpense)}</div>
              <div className="hd-summary-label">Gider</div>
            </div>
          </div>
        </div>
      </div>

      {categoryTotals.length > 0 && (
        <div className="hd-card">
          <div className="hd-card-title">Bu ay kategori dağılımı</div>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryTotals} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {categoryTotals.map((c, i) => (
                    <Cell key={c.id} fill={colorFor(c.id, expenseCats)} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={S.tooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="hd-legend">
            {categoryTotals.slice(0, 6).map((c) => (
              <div key={c.id} className="hd-legend-item">
                <span className="hd-legend-dot" style={{ background: colorFor(c.id, expenseCats) }} />
                {c.name} · {total ? Math.round((c.value / total) * 100) : 0}%
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="hd-card">
        <div className="hd-card-title">Son hareketler</div>
        {recentTx.length === 0 ? (
          <EmptyState text="Henüz hareket yok. Defterin ilk sayfasını sen aç." />
        ) : (
          <div className="hd-ledger">
            {recentTx.map((t) => (
              <LedgerRow key={t.id} t={t} catName={catName} list={t.type === "income" ? incomeCats : expenseCats} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LedgerRow({ t, catName, list, onDelete }) {
  return (
    <div className="hd-ledger-row">
      <Stamp id={t.category} name={catName(t.category, t.type)} list={list} size="sm" />
      <span className="hd-ledger-note">{t.note || "—"}</span>
      <span className="hd-ledger-leader" />
      <span className={"hd-ledger-amount " + (t.type === "income" ? "income" : "expense")}>
        {t.type === "income" ? "+" : "−"}{fmt(t.amount)}
      </span>
      {onDelete && (
        <button className="hd-ledger-del" onClick={() => onDelete(t.id)} aria-label="Sil">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function Hareketler({ viewLabel, monthOffset, setMonthOffset, sortedMonthTx, catName, expenseCats, incomeCats, deleteTransaction }) {
  return (
    <div className="hd-page">
      <div className="hd-month-nav">
        <button onClick={() => setMonthOffset(monthOffset - 1)} aria-label="Önceki ay"><ChevronLeft size={18} /></button>
        <span>{viewLabel}</span>
        <button onClick={() => setMonthOffset(monthOffset + 1)} disabled={monthOffset >= 0} aria-label="Sonraki ay"><ChevronRight size={18} /></button>
      </div>
      <div className="hd-card">
        {sortedMonthTx.length === 0 ? (
          <EmptyState text="Bu ay için henüz kayıt yok." />
        ) : (
          <div className="hd-ledger">
            {sortedMonthTx.map((t) => (
              <div key={t.id}>
                <div className="hd-ledger-date">{t.date.split("-").reverse().join(".")}</div>
                <LedgerRow t={t} catName={catName} list={t.type === "income" ? incomeCats : expenseCats} onDelete={deleteTransaction} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Butce({ expenseCats, categoryTotals, updateBudget, viewLabel, addingCategory, setAddingCategory, addCategory, renameCategory, deleteCategory }) {
  const spentMap = {};
  categoryTotals.forEach((c) => { spentMap[c.id] = c.value; });

  return (
    <div className="hd-page">
      <div className="hd-card">
        <div className="hd-card-title">{viewLabel} bütçesi</div>
        <div className="hd-budget-list">
          {expenseCats.map((c) => {
            const spent = spentMap[c.id] || 0;
            const budget = c.budget || 0;
            const pct = budget > 0 ? Math.min(150, (spent / budget) * 100) : 0;
            const over = budget > 0 && spent > budget;
            const barColor = over ? "#C9706A" : pct > 80 ? "#F4B183" : "#3E6B6E";
            return (
              <div className="hd-budget-item" key={c.id}>
                <div className="hd-budget-head">
                  <input
                    type="text"
                    defaultValue={c.name}
                    className="hd-budget-name-input"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== c.name) renameCategory(c.id, v);
                      else e.target.value = c.name;
                    }}
                  />
                  {over && <span className="hd-over-stamp">AŞILDI</span>}
                  <button
                    className="hd-ledger-del"
                    onClick={() => { if (window.confirm(`"${c.name}" kategorisini silmek istediğine emin misin?`)) deleteCategory(c.id); }}
                    aria-label="Kategoriyi sil"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="hd-budget-bar-track">
                  <div className="hd-budget-bar-fill" style={{ width: Math.min(100, pct) + "%", background: barColor }} />
                </div>
                <div className="hd-budget-nums">
                  <span>{fmt(spent)} harcandı</span>
                  <span className="hd-budget-limit">
                    limit&nbsp;
                    <input
                      type="number"
                      min="0"
                      defaultValue={budget}
                      className="hd-budget-input"
                      onBlur={(e) => updateBudget(c.id, parseFloat(e.target.value) || 0)}
                    />
                    ₺
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {addingCategory ? (
          <NewCategoryForm
            onCancel={() => setAddingCategory(false)}
            onSave={(name) => { addCategory(name, "expense"); setAddingCategory(false); }}
          />
        ) : (
          <button className="hd-add-cat-btn" onClick={() => setAddingCategory(true)}>
            <Plus size={15} /> Yeni gider kategorisi
          </button>
        )}
      </div>
    </div>
  );
}

function NewCategoryForm({ onSave, onCancel }) {
  const [name, setName] = useState("");
  return (
    <div className="hd-new-cat">
      <input
        autoFocus
        className="hd-input"
        placeholder="Kategori adı"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button className="hd-btn-primary" onClick={() => name.trim() && onSave(name)}>Ekle</button>
      <button className="hd-btn-ghost" onClick={onCancel}>Vazgeç</button>
    </div>
  );
}

function Raporlar({ trendData, categoryTotals, monthExpense, viewLabel }) {
  return (
    <div className="hd-page">
      <div className="hd-card">
        <div className="hd-card-title">Son 6 ay: gelir / gider</div>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7ECEF" />
              <XAxis dataKey="ay" tick={{ fontSize: 12, fill: "#2C3E50" }} axisLine={{ stroke: "#D9DEE3" }} />
              <YAxis tick={{ fontSize: 11, fill: "#2C3E50" }} axisLine={{ stroke: "#D9DEE3" }} width={40} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={S.tooltip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Gelir" fill="#3E6B6E" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Gider" fill="#F4B183" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="hd-card">
        <div className="hd-card-title">{viewLabel} · en çok harcanan kategoriler</div>
        {categoryTotals.length === 0 ? (
          <EmptyState text="Bu ay için harcama kaydı yok." />
        ) : (
          <div className="hd-report-list">
            {categoryTotals.map((c) => (
              <div key={c.id} className="hd-report-row">
                <span>{c.name}</span>
                <span className="hd-report-amount">{fmt(c.value)}</span>
                <span className="hd-report-pct">{monthExpense ? Math.round((c.value / monthExpense) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="hd-empty">{text}</div>;
}

function KrediKartlari({ cards, addCard, updateCard, deleteCard, addingCard, setAddingCard }) {
  const totalDebt = cards.reduce((s, c) => s + (c.debt || 0), 0);
  const sorted = [...cards].sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));

  return (
    <div className="hd-page">
      <div className="hd-card">
        <div className="hd-card-title">Toplam kart borcu</div>
        <div className="hd-cc-total">{fmt(totalDebt)}</div>
      </div>

      <div className="hd-card">
        <div className="hd-card-title">Kartların</div>
        {sorted.length === 0 ? (
          <EmptyState text="Henüz kart eklenmedi. Aşağıdan ilk kartını ekle." />
        ) : (
          <div className="hd-cc-list">
            {sorted.map((c) => (
              <CardRow key={c.id} card={c} updateCard={updateCard} deleteCard={deleteCard} />
            ))}
          </div>
        )}

        {addingCard ? (
          <AddCardForm onCancel={() => setAddingCard(false)} onSave={addCard} />
        ) : (
          <button className="hd-add-cat-btn" onClick={() => setAddingCard(true)}>
            <Plus size={15} /> Yeni kart ekle
          </button>
        )}
      </div>
    </div>
  );
}

function CardRow({ card, updateCard, deleteCard }) {
  const dl = daysUntil(card.dueDate);
  let badgeClass = "hd-cc-badge normal";
  let badgeText = card.dueDate ? `${dl} gün kaldı` : "Tarih yok";
  if (card.paid) {
    badgeClass = "hd-cc-badge paid";
    badgeText = "Ödendi";
  } else if (dl !== null) {
    if (dl < 0) { badgeClass = "hd-cc-badge over"; badgeText = `${Math.abs(dl)} gün gecikti`; }
    else if (dl <= 5) { badgeClass = "hd-cc-badge warn"; badgeText = `${dl} gün kaldı`; }
  }

  return (
    <div className={"hd-cc-row" + (card.paid ? " is-paid" : "")}>
      <div className="hd-cc-row-top">
        <span className="hd-cc-name">{card.name}</span>
        <button className="hd-ledger-del" onClick={() => deleteCard(card.id)} aria-label="Kartı sil">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="hd-cc-fields">
        <label className="hd-cc-field">
          <span>Güncel Borç</span>
          <input
            type="number"
            min="0"
            defaultValue={card.debt || 0}
            className="hd-budget-input hd-cc-input"
            onBlur={(e) => updateCard(card.id, { debt: parseFloat(e.target.value) || 0 })}
          />
        </label>
        <label className="hd-cc-field">
          <span>Son Ödeme Tarihi</span>
          <input
            type="date"
            defaultValue={card.dueDate || ""}
            className="hd-budget-input hd-cc-input hd-cc-date"
            onBlur={(e) => updateCard(card.id, { dueDate: e.target.value })}
          />
        </label>
      </div>
      <div className="hd-cc-bottom">
        {(card.dueDate || card.paid) && <span className={badgeClass}>{badgeText}</span>}
        <label className="hd-cc-paid-toggle">
          <input type="checkbox" checked={!!card.paid} onChange={(e) => updateCard(card.id, { paid: e.target.checked })} />
          Ödendi
        </label>
      </div>
    </div>
  );
}

function AddCardForm({ onSave, onCancel }) {
  const [name, setName] = useState("");
  const [debt, setDebt] = useState("");
  const [dueDate, setDueDate] = useState("");

  function submit() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), debt: parseFloat(debt) || 0, dueDate: dueDate || "" });
  }

  return (
    <div className="hd-new-cat-form">
      <input className="hd-input" placeholder="Kart adı (ör. Garanti BBVA)" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="hd-input" type="number" min="0" placeholder="Güncel borç" value={debt} onChange={(e) => setDebt(e.target.value)} />
      <input className="hd-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      <div className="hd-new-cat-actions">
        <button className="hd-btn-primary" onClick={submit}>Ekle</button>
        <button className="hd-btn-ghost" onClick={onCancel}>Vazgeç</button>
      </div>
    </div>
  );
}

function AddModal({ onClose, onAdd, expenseCats, incomeCats }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(expenseCats[0]?.id || "");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const list = type === "expense" ? expenseCats : incomeCats;

  function handleTypeChange(t) {
    setType(t);
    const l = t === "expense" ? expenseCats : incomeCats;
    setCategory(l[0]?.id || "");
  }

  function submit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Geçerli bir tutar gir."); return; }
    if (!category) { setError("Bir kategori seç."); return; }
    onAdd({ type, amount: amt, category, date, note: note.trim() });
  }

  return (
    <div className="hd-modal-backdrop" onClick={onClose}>
      <div className="hd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hd-modal-head">
          <span>Yeni Hareket</span>
          <button onClick={onClose} aria-label="Kapat"><X size={20} /></button>
        </div>

        <div className="hd-type-toggle">
          <button className={type === "expense" ? "active exp" : "exp"} onClick={() => handleTypeChange("expense")}>Gider</button>
          <button className={type === "income" ? "active inc" : "inc"} onClick={() => handleTypeChange("income")}>Gelir</button>
        </div>

        <label className="hd-field-label">Tutar</label>
        <input className="hd-input" type="number" min="0" step="0.01" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />

        <label className="hd-field-label">Kategori</label>
        <select className="hd-input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label className="hd-field-label">Tarih</label>
        <input className="hd-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <label className="hd-field-label">Not (opsiyonel)</label>
        <input className="hd-input" type="text" placeholder="ör. market alışverişi" value={note} onChange={(e) => setNote(e.target.value)} />

        {error && <div className="hd-form-error">{error}</div>}

        <button className="hd-btn-primary hd-modal-save" onClick={submit}>Kaydet</button>
      </div>
    </div>
  );
}

const S = {
  loadingWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 400, background: "#FFFFFF" },
  tooltip: { background: "#FFFFFF", border: "1px solid #D9DEE3", borderRadius: 8, fontSize: 12, fontFamily: "'Inter', sans-serif" },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');

.hd-root {
  --paper: #FFFFFF;
  --ink: #2C3E50;
  --emerald: #3E6B6E;
  --brass: #8E7CC3;
  --peach: #F4B183;
  --rose: #C9706A;
  --line: #D9DEE3;
  font-family: 'Inter', sans-serif;
  background: var(--paper);
  color: var(--ink);
  min-height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  padding-bottom: 78px;
  box-sizing: border-box;
}
.hd-root * { box-sizing: border-box; }

.hd-cover {
  background: linear-gradient(160deg, #3E6B6E 0%, #2C4E51 100%);
  color: #FFFFFF;
  padding: 22px 20px 26px;
  border-radius: 0 0 18px 18px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.15);
}
.hd-cover-top { display: flex; align-items: center; gap: 8px; opacity: 0.9; }
.hd-logout-btn { margin-left: auto; background: rgba(255,255,255,0.15); border: none; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.hd-cover-title { font-family: 'Fraunces', serif; font-weight: 600; letter-spacing: 2px; font-size: 13px; }
.hd-cover-balance-label { font-size: 12px; opacity: 0.8; margin-top: 14px; }
.hd-cover-balance { font-family: 'JetBrains Mono', monospace; font-size: 32px; font-weight: 600; margin-top: 2px; }
.hd-cover-sub { display: flex; gap: 16px; margin-top: 12px; font-size: 12px; opacity: 0.95; }
.hd-cover-sub span { display: inline-flex; align-items: center; gap: 4px; }

.hd-error { background: #F6E4E2; color: var(--rose); font-size: 12px; padding: 8px 16px; text-align: center; }

.hd-main { flex: 1; padding: 16px; }
.hd-page { display: flex; flex-direction: column; gap: 14px; }

.hd-card {
  background: #FFFFFF;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(44,62,80,0.06);
}
.hd-card-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: 15px; margin-bottom: 12px; color: var(--ink); }

.hd-summary-row { display: flex; gap: 12px; }
.hd-summary-item { flex: 1; display: flex; align-items: center; gap: 8px; padding: 10px; border-radius: 8px; background: #F4F6F8; }
.hd-summary-item.income { color: var(--emerald); }
.hd-summary-item.expense { color: var(--peach); }
.hd-summary-num { font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 15px; color: var(--ink); }
.hd-summary-label { font-size: 11px; color: #7A8894; }

.hd-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; font-size: 12px; }
.hd-legend-item { display: flex; align-items: center; gap: 5px; }
.hd-legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

.hd-stamp {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px dashed var(--stamp-color);
  color: var(--stamp-color);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  background: rgba(255,255,255,0.5);
}
.hd-stamp-sm { font-size: 10px; padding: 2px 8px; }

.hd-ledger-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px dotted var(--line); }
.hd-ledger-row:last-child { border-bottom: none; }
.hd-ledger-note { font-size: 12px; color: #7A8894; flex-shrink: 0; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hd-ledger-leader { flex: 1; border-bottom: 1px dotted var(--line); margin-bottom: 4px; }
.hd-ledger-amount { font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 13px; }
.hd-ledger-amount.income { color: var(--emerald); }
.hd-ledger-amount.expense { color: var(--rose); }
.hd-ledger-del { background: none; border: none; color: #A9B4BD; cursor: pointer; padding: 2px; display: flex; }
.hd-ledger-date { font-size: 10px; color: #A9B4BD; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px; }

.hd-empty { text-align: center; color: #8B97A2; font-size: 13px; padding: 20px 10px; font-style: italic; }

.hd-month-nav { display: flex; align-items: center; justify-content: center; gap: 16px; font-family: 'Fraunces', serif; font-weight: 600; font-size: 15px; }
.hd-month-nav button { background: #FFFFFF; border: 1px solid var(--line); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--ink); }
.hd-month-nav button:disabled { opacity: 0.35; cursor: default; }

.hd-budget-list { display: flex; flex-direction: column; gap: 16px; }
.hd-budget-item {}
.hd-budget-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.hd-budget-name-input {
  flex: 1; min-width: 0; border: none; background: none; font-weight: 600; font-size: 13px;
  color: var(--ink); padding: 3px 4px; border-radius: 6px; font-family: 'Inter', sans-serif;
}
.hd-budget-name-input:hover, .hd-budget-name-input:focus { background: #F4F6F8; outline: none; }
.hd-over-stamp { font-size: 10px; font-weight: 700; color: var(--rose); border: 1.5px solid var(--rose); border-radius: 4px; padding: 1px 6px; transform: rotate(-4deg); flex-shrink: 0; }
.hd-budget-bar-track { height: 8px; background: #E7ECEF; border-radius: 4px; overflow: hidden; }
.hd-budget-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
.hd-budget-nums { display: flex; justify-content: space-between; font-size: 11px; color: #7A8894; margin-top: 5px; }
.hd-budget-limit { display: flex; align-items: center; gap: 3px; }
.hd-budget-input { width: 60px; border: 1px solid var(--line); border-radius: 4px; padding: 1px 4px; font-size: 11px; font-family: 'JetBrains Mono', monospace; background: #fff; }

.hd-add-cat-btn { margin-top: 16px; display: flex; align-items: center; gap: 5px; background: none; border: 1px dashed var(--line); color: var(--emerald); font-size: 12px; font-weight: 600; padding: 8px 12px; border-radius: 8px; cursor: pointer; width: 100%; justify-content: center; }
.hd-new-cat { margin-top: 14px; display: flex; gap: 6px; }

.hd-report-list { display: flex; flex-direction: column; gap: 8px; }
.hd-report-row { display: flex; align-items: center; font-size: 13px; gap: 8px; padding: 4px 0; }
.hd-report-row span:first-child { flex: 1; }
.hd-report-amount { font-family: 'JetBrains Mono', monospace; font-weight: 600; }
.hd-report-pct { color: #8B97A2; font-size: 11px; width: 32px; text-align: right; }

.hd-cc-total { font-family: 'JetBrains Mono', monospace; font-size: 26px; font-weight: 600; color: var(--rose); }

.hd-cc-list { display: flex; flex-direction: column; gap: 14px; }
.hd-cc-row { border: 1px solid var(--line); border-radius: 10px; padding: 12px; background: #F9FAFB; }
.hd-cc-row-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.hd-cc-name { font-family: 'Fraunces', serif; font-weight: 600; font-size: 14px; color: var(--ink); }
.hd-cc-fields { display: flex; gap: 10px; flex-wrap: wrap; }
.hd-cc-field { display: flex; flex-direction: column; gap: 3px; font-size: 10px; color: #7A8894; font-weight: 600; flex: 1; min-width: 110px; }
.hd-cc-input { width: 100%; font-size: 12px; padding: 5px 7px; }
.hd-cc-date { color: var(--ink); }
.hd-cc-badge { display: inline-block; margin-top: 8px; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
.hd-cc-badge.normal { background: #E7ECEF; color: var(--emerald); }
.hd-cc-badge.warn { background: #FCEAD9; color: #B5762E; }
.hd-cc-badge.over { background: #F6E4E2; color: var(--rose); }
.hd-cc-badge.paid { background: #E1EEE9; color: var(--emerald); }
.hd-cc-bottom { display: flex; align-items: center; justify-content: space-between; }
.hd-cc-paid-toggle { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #7A8894; font-weight: 600; margin-top: 8px; cursor: pointer; }
.hd-cc-paid-toggle input { accent-color: var(--emerald); width: 14px; height: 14px; }
.hd-cc-row.is-paid { opacity: 0.7; background: #F3F7F5; }

.hd-fab {
  position: fixed; bottom: 84px; right: 20px;
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--brass); color: #fff; border: none;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(142,124,195,0.4); cursor: pointer; z-index: 10;
}

.hd-tabs {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; background: #FFFFFF; border-top: 1px solid var(--line);
  padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
  z-index: 9;
}
.hd-tabbtn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: none; border: none; color: #A9B4BD; font-size: 10px; padding: 6px 0; cursor: pointer;
}
.hd-tabbtn.active { color: var(--emerald); font-weight: 600; }

.hd-modal-backdrop { position: fixed; inset: 0; background: rgba(44,62,80,0.45); display: flex; align-items: flex-end; z-index: 20; }
.hd-modal { background: var(--paper); width: 100%; border-radius: 16px 16px 0 0; padding: 20px; max-height: 85vh; overflow-y: auto; }
.hd-modal-head { display: flex; justify-content: space-between; align-items: center; font-family: 'Fraunces', serif; font-weight: 600; font-size: 17px; margin-bottom: 14px; }
.hd-modal-head button { background: none; border: none; cursor: pointer; color: var(--ink); }

.hd-type-toggle { display: flex; gap: 8px; margin-bottom: 14px; }
.hd-type-toggle button { flex: 1; padding: 9px; border-radius: 8px; border: 1.5px solid var(--line); background: #fff; font-weight: 600; font-size: 13px; cursor: pointer; color: #8B97A2; }
.hd-type-toggle button.active.exp { background: var(--peach); border-color: var(--peach); color: #fff; }
.hd-type-toggle button.active.inc { background: var(--emerald); border-color: var(--emerald); color: #fff; }

.hd-field-label { display: block; font-size: 11px; color: #7A8894; margin: 10px 0 4px; font-weight: 600; }
.hd-input { width: 100%; border: 1.5px solid var(--line); border-radius: 8px; padding: 9px 11px; font-size: 14px; background: #fff; color: var(--ink); font-family: 'Inter', sans-serif; }

.hd-form-error { color: var(--rose); font-size: 12px; margin-top: 10px; }
.hd-btn-primary { background: var(--emerald); color: #fff; border: none; border-radius: 8px; padding: 11px; font-weight: 600; font-size: 14px; cursor: pointer; }
.hd-btn-ghost { background: none; border: 1px solid var(--line); border-radius: 8px; padding: 11px; font-weight: 600; font-size: 13px; cursor: pointer; color: #7A8894; }
.hd-modal-save { width: 100%; margin-top: 16px; }

@media (prefers-reduced-motion: reduce) {
  .hd-budget-bar-fill { transition: none; }
}

.hd-auth-root {
  --paper: #FFFFFF;
  --ink: #2C3E50;
  --emerald: #3E6B6E;
  --brass: #8E7CC3;
  --peach: #F4B183;
  --rose: #C9706A;
  --line: #D9DEE3;
  min-height: 100%;
  background: linear-gradient(160deg, #F4F6F8 0%, #ECEEF3 100%);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 32px 20px; font-family: 'Inter', sans-serif; box-sizing: border-box;
}
.hd-auth-root * { box-sizing: border-box; }
.hd-auth-card {
  width: 100%; max-width: 340px; background: #FFFFFF; border-radius: 16px;
  border: 1px solid #D9DEE3; box-shadow: 0 8px 24px rgba(44,62,80,0.08);
  padding: 28px 24px; display: flex; flex-direction: column; align-items: center;
}
.hd-auth-logo { margin-bottom: 12px; }
.hd-auth-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: 24px; color: #2C3E50; margin: 0; }
.hd-auth-subtitle { font-size: 13px; color: #7A8894; margin-top: 4px; margin-bottom: 18px; }
.hd-auth-form { width: 100%; display: flex; flex-direction: column; }
.hd-auth-input-wrap {
  display: flex; align-items: center; gap: 8px; border: 1.5px solid #D9DEE3; border-radius: 8px;
  padding: 9px 11px; margin-bottom: 4px; color: #7A8894;
}
.hd-auth-input-wrap:focus-within { border-color: #3E6B6E; color: #3E6B6E; }
.hd-auth-input { border: none; outline: none; flex: 1; font-size: 14px; color: #2C3E50; font-family: 'Inter', sans-serif; }
.hd-auth-submit { width: 100%; margin-top: 16px; display: flex; align-items: center; justify-content: center; gap: 6px; }
.hd-auth-submit:disabled { opacity: 0.7; cursor: default; }
.hd-auth-switch { background: none; border: none; color: #7A8894; font-size: 12px; margin-top: 14px; cursor: pointer; text-decoration: underline; }
.hd-auth-pending-icon { font-size: 34px; margin: 8px 0 6px; }
.hd-auth-pending-text { text-align: center; font-size: 13px; color: #4A5A67; line-height: 1.5; margin-bottom: 18px; }
.hd-auth-footer { margin-top: 28px; text-align: center; }
.hd-auth-slogan { font-family: 'Fraunces', serif; font-style: italic; font-size: 14px; color: #3E6B6E; margin-bottom: 6px; }
.hd-auth-copyright { font-size: 11px; color: #A9B4BD; }
.hd-auth-credit { font-size: 10px; color: #B8C1C9; margin-top: 3px; letter-spacing: 0.3px; }
`;
