/**
 * /x7k-void  — Secret owner-only subscription management panel.
 * Two-step auth: confirm key first, then master key.
 * No public links to this page anywhere in the app.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

const API = "/api";

const PLAN_LABELS = {
  none:      "— بدون اشتراك",
  trial:     "تجريبي (3 أيام)",
  weekly:    "أسبوعي (7 أيام)",
  monthly:   "شهري (30 يوم)",
  quarterly: "ربع سنوي (90 يوم)",
  biannual:  "نصف سنوي (180 يوم)",
  yearly:    "سنوي (365 يوم)",
  eternal:   "مدى الحياة ∞",
};

const ADDON_LABELS = {
  chat:           "الشات والمساعد الذكي",
  vault:          "الخزنة والعهدة",
  company_stats:  "إحصائيات الشركة",
  device_tracking:"تتبع الأجهزة والـIP",
  design:         "استوديو التصميم",
};

/* ─── Inline styles ─────────────────────────────────────────────────── */
const S = {
  root: {
    minHeight: "100dvh",
    background: "linear-gradient(160deg,#07070f 0%,#0f0f1e 55%,#07070f 100%)",
    fontFamily: "'Cairo','Segoe UI',sans-serif",
    color: "#f1f5f9",
    direction: "rtl",
  },
  header: {
    borderBottom: "1px solid rgba(99,102,241,0.18)",
    padding: "14px 24px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(99,102,241,0.06)",
    backdropFilter: "blur(12px)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18,
  },
  page: { maxWidth: 960, margin: "0 auto", padding: "40px 20px 80px" },
  authCard: {
    maxWidth: 400, margin: "0 auto",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 22, padding: "36px 30px",
  },
  input: {
    width: "100%", padding: "13px 16px", borderRadius: 13,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#f1f5f9", fontSize: 14, outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
    direction: "ltr", letterSpacing: "0.05em",
  },
  btn: {
    width: "100%", padding: "13px 20px", borderRadius: 13,
    border: "none",
    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    color: "#fff", fontSize: 15, fontWeight: 800,
    cursor: "pointer", fontFamily: "inherit",
    transition: "opacity .2s",
  },
  btnGhost: {
    width: "100%", padding: "13px 20px", borderRadius: 13,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "#94a3b8", fontSize: 14, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
  },
  compCard: {
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18, padding: 22,
  },
  label: {
    display: "block", fontSize: 11, fontWeight: 700,
    color: "#64748b", textTransform: "uppercase",
    letterSpacing: "0.06em", marginBottom: 6,
  },
  select: {
    width: "100%", padding: "11px 14px", borderRadius: 11,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#f1f5f9", fontSize: 13, outline: "none",
    fontFamily: "inherit",
    appearance: "none",
  },
  dateInput: {
    width: "100%", padding: "11px 14px", borderRadius: 11,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#f1f5f9", fontSize: 13, outline: "none",
    boxSizing: "border-box", fontFamily: "inherit",
  },
  errBox: {
    background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.4)",
    borderRadius: 12, padding: "10px 16px",
    color: "#f87171", fontSize: 13, marginBottom: 14,
  },
};

/* ════════════════════════════════════════════════════════ */
export default function OwnerPanel() {
  const [step, setStep]               = useState("confirm"); // confirm | master | panel
  const [confirmInput, setConfirmInput] = useState("");
  const [masterInput, setMasterInput]   = useState("");
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [companies, setCompanies]     = useState([]);
  const [edits, setEdits]             = useState({});
  const [saving, setSaving]           = useState(null);
  const [savedId, setSavedId]         = useState(null);
  const [searchQ, setSearchQ]         = useState("");

  /* ── helpers ── */
  const creds = () => ({ confirm_key: confirmInput.trim(), master_key: masterInput.trim() });

  const loadCompanies = async () => {
    const { data } = await axios.post(`${API}/owner/companies`, creds());
    const initEdits = {};
    data.forEach((c) => {
      initEdits[c.id] = {
        plan_type: c.plan_type || "none",
        end_date:  c.end_date ? c.end_date.slice(0, 10) : "",
        addons:    { ...c.addons },
      };
    });
    setEdits(initEdits);
    setCompanies(data);
  };

  /* ── Step 1: confirm ── */
  const handleConfirm = (e) => {
    e.preventDefault();
    setError("");
    if (!confirmInput.trim()) { setError("أدخل كلمة التأكيد"); return; }
    setStep("master");
  };

  /* ── Step 2: master → open panel ── */
  const handleMaster = async (e) => {
    e.preventDefault();
    setError("");
    if (!masterInput.trim()) { setError("أدخل مفتاح الدخول"); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/owner/auth`, creds());
      await loadCompanies();
      setStep("panel");
    } catch (err) {
      setError(err.response?.data?.detail || "❌ بيانات غير صحيحة");
    } finally { setLoading(false); }
  };

  /* ── Edits ── */
  const setField = (id, field, val) =>
    setEdits((p) => ({ ...p, [id]: { ...p[id], [field]: val } }));

  const toggleAddon = (id, addon) =>
    setEdits((p) => ({
      ...p,
      [id]: { ...p[id], addons: { ...p[id].addons, [addon]: !p[id].addons?.[addon] } },
    }));

  /* ── Save ── */
  const saveCompany = async (companyId) => {
    setSaving(companyId);
    setError("");
    const edit = edits[companyId];
    try {
      await axios.post(`${API}/owner/set-subscription`, {
        ...creds(),
        company_id: companyId,
        plan_type:  edit.plan_type,
        end_date:   edit.end_date || null,
        addons:     edit.addons,
      });
      setSavedId(companyId);
      setTimeout(() => setSavedId(null), 3000);
      await loadCompanies();
    } catch (err) {
      setError(err.response?.data?.detail || "❌ فشل الحفظ");
    } finally { setSaving(null); }
  };

  /* ── Filter ── */
  const filtered = companies.filter((c) =>
    !searchQ || c.name?.toLowerCase().includes(searchQ.toLowerCase()) || c.email?.toLowerCase().includes(searchQ.toLowerCase())
  );

  /* ════════════════════════════ RENDER ══════════════════════════════ */
  return (
    <div style={S.root}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.iconBox}>🔐</div>
        <div>
          <p style={{ margin: 0, fontWeight: 900, fontSize: 15 }}>لوحة التحكم الخاصة</p>
          <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>إدارة الاشتراكات — صاحب الموقع فقط</p>
        </div>
        {step === "panel" && (
          <span style={{ marginRight: "auto", fontSize: 12, color: "#6366f1", fontWeight: 700 }}>
            {companies.length} شركة
          </span>
        )}
      </div>

      <div style={S.page}>
        <AnimatePresence mode="wait">

          {/* ══ Step 1: Confirm key ══ */}
          {step === "confirm" && (
            <motion.div key="confirm"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={S.authCard}>
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <div style={{ fontSize: 60, marginBottom: 10 }}>🗝️</div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>تأكيد الهوية</h2>
                  <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13 }}>
                    أدخل كلمة التأكيد الأولى للمتابعة
                  </p>
                </div>
                <form onSubmit={handleConfirm} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {error && <div style={S.errBox}>{error}</div>}
                  <input
                    type="password" placeholder="••••••••" value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    autoFocus autoComplete="off" style={S.input}
                  />
                  <button type="submit" style={S.btn}>متابعة ←</button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ══ Step 2: Master key ══ */}
          {step === "master" && (
            <motion.div key="master"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={S.authCard}>
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                  <div style={{ fontSize: 60, marginBottom: 10 }}>🛡️</div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>فتح اللوحة</h2>
                  <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 13 }}>
                    أدخل مفتاح الدخول الرئيسي
                  </p>
                </div>
                <form onSubmit={handleMaster} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {error && <div style={S.errBox}>{error}</div>}
                  <input
                    type="password" placeholder="••••••••••••••••••••••••" value={masterInput}
                    onChange={(e) => setMasterInput(e.target.value)}
                    autoFocus autoComplete="off" style={S.input}
                  />
                  <button type="submit" style={{ ...S.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                    {loading ? "جارٍ التحقق..." : "فتح اللوحة 🔓"}
                  </button>
                  <button type="button" onClick={() => { setStep("confirm"); setError(""); }} style={S.btnGhost}>
                    رجوع
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ══ Step 3: Panel ══ */}
          {step === "panel" && (
            <motion.div key="panel"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {error && <div style={S.errBox}>{error}</div>}

              {/* Search */}
              <div style={{ marginBottom: 20 }}>
                <input
                  type="text" placeholder="🔍 ابحث باسم الشركة أو الإيميل..."
                  value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
                  style={{ ...S.input, direction: "rtl", fontSize: 14 }}
                />
              </div>

              {/* Company cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {filtered.map((c) => {
                  const edit     = edits[c.id] || {};
                  const isSaving = saving === c.id;
                  const isSaved  = savedId === c.id;
                  const isPrem   = c.is_premium;

                  return (
                    <div key={c.id} style={S.compCard}>
                      {/* Company header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 900, fontSize: 17 }}>{c.name || "شركة بدون اسم"}</p>
                          <p style={{ margin: "3px 0 0", fontSize: 12, color: "#475569" }}>{c.email || "—"}</p>
                        </div>
                        <span style={{
                          padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                          background: isPrem ? "rgba(34,197,94,.12)" : "rgba(100,116,139,.12)",
                          border: `1px solid ${isPrem ? "#22c55e55" : "#47556955"}`,
                          color: isPrem ? "#22c55e" : "#64748b",
                        }}>
                          {isPrem ? "✅ مشترك" : "⭕ غير مشترك"}
                        </span>
                      </div>

                      {/* Plan + end date */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                        <div>
                          <label style={S.label}>الباقة</label>
                          <select
                            value={edit.plan_type || "none"}
                            onChange={(e) => setField(c.id, "plan_type", e.target.value)}
                            style={S.select}
                          >
                            {Object.entries(PLAN_LABELS).map(([v, l]) => (
                              <option key={v} value={v} style={{ background: "#1a1a2e" }}>{l}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={S.label}>تاريخ الانتهاء</label>
                          <input
                            type="date"
                            value={edit.end_date || ""}
                            onChange={(e) => setField(c.id, "end_date", e.target.value)}
                            style={S.dateInput}
                            disabled={edit.plan_type === "eternal" || edit.plan_type === "none"}
                          />
                        </div>
                      </div>

                      {/* Addons */}
                      <div style={{ marginBottom: 16 }}>
                        <label style={S.label}>الإضافات الدائمة</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                          {Object.entries(ADDON_LABELS).map(([key, lbl]) => {
                            const on = edit.addons?.[key] ?? false;
                            return (
                              <button key={key} type="button" onClick={() => toggleAddon(c.id, key)}
                                style={{
                                  padding: "5px 13px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                                  cursor: "pointer", border: "1px solid",
                                  background: on ? "rgba(99,102,241,.18)" : "rgba(255,255,255,.04)",
                                  borderColor: on ? "#6366f1aa" : "rgba(255,255,255,.1)",
                                  color: on ? "#a5b4fc" : "#64748b",
                                  transition: "all .2s",
                                }}>
                                {on ? "✅" : "⭕"} {lbl}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Limits display */}
                      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                        {[
                          { l: "الحسابات", v: c.account_limit },
                          {
                            l: "المساحة",
                            v: c.storage_limit_mb >= 1024
                              ? `${(c.storage_limit_mb / 1024).toFixed(0)} GB`
                              : `${c.storage_limit_mb} MB`,
                          },
                          { l: "المديرون", v: c.manager_limit },
                        ].map((s) => (
                          <div key={s.l} style={{
                            padding: "5px 13px", borderRadius: 10,
                            background: "rgba(255,255,255,.04)",
                            border: "1px solid rgba(255,255,255,.07)",
                            fontSize: 12,
                          }}>
                            <span style={{ color: "#64748b" }}>{s.l}: </span>
                            <span style={{ fontWeight: 800 }}>{s.v}</span>
                          </div>
                        ))}
                      </div>

                      {/* Save */}
                      <button
                        onClick={() => saveCompany(c.id)}
                        disabled={isSaving}
                        style={{
                          ...S.btn,
                          background: isSaved
                            ? "linear-gradient(135deg,#22c55e,#16a34a)"
                            : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                          opacity: isSaving ? 0.7 : 1,
                        }}
                      >
                        {isSaving ? "⏳ جارٍ الحفظ..." : isSaved ? "✅ تم الحفظ بنجاح" : "💾 حفظ التغييرات"}
                      </button>
                    </div>
                  );
                })}

                {filtered.length === 0 && (
                  <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                    <p>لا توجد نتائج</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
