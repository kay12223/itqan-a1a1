import { useEffect, useRef, useState, useCallback } from "react";
import { Users, Send, MessagesSquare, Hash } from "lucide-react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/Kit";
import FeatureLock from "@/components/FeatureLock";

export default function TeamChat() {
  const { user, company, refreshCompany } = useAuth();

  // All hooks unconditionally at top — React rules require this
  const [contacts, setContacts] = useState([]);
  const [active, setActive] = useState({ type: "group", id: null, name: "المجموعة العامة" });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  const timer = useRef(null);

  const hasChat = !!company?.addons?.chat?.unlocked;

  useEffect(() => { refreshCompany(); }, [refreshCompany]);

  useEffect(() => {
    if (!hasChat) return;
    api.get("/chat/contacts").then((r) => setContacts(r.data.contacts)).catch(() => {});
  }, [hasChat]);

  const loadMessages = useCallback(() => {
    if (!hasChat) return;
    const params = active.type === "group" ? "channel_type=group" : `channel_type=direct&to_user_id=${active.id}`;
    api.get(`/chat/history?${params}`).then((r) => setMessages(r.data)).catch(() => {});
  }, [active, hasChat]);

  useEffect(() => {
    if (!hasChat) return;
    loadMessages();
    timer.current = setInterval(loadMessages, 4000);
    return () => clearInterval(timer.current);
  }, [loadMessages, hasChat]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    const payload = active.type === "group" ? { channel_type: "group", text } : { channel_type: "direct", to_user_id: active.id, text };
    await api.post("/chat/send", payload);
    loadMessages();
  };

  // ── Subscription / add-on gate ───────────────────────────────────────────
  if (!hasChat) {
    return (
      <FeatureLock
        pageTitle="شات الموظفين"
        pageSubtitle="تواصل فوري بين الإدارة والموظفين"
        icon={MessagesSquare}
        title="شات الموظفين للمشتركين فقط"
        description="ميزة التواصل الفوري بين الإدارة والموظفين متاحة للمشتركين أو لمن اشترى هذه الإضافة. قم بالترقية للوصول إليها."
        perks={["محادثات خاصة بين الموظفين والإدارة", "مجموعة عامة للشركة", "تاريخ المحادثات محفوظ"]}
      />
    );
  }
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader title="شات الموظفين" subtitle="تواصل فوري بين الإدارة والموظفين — مجموعة عامة ومحادثات خاصة" icon={MessagesSquare} />
      <div className="grid h-[calc(100vh-220px)] gap-4 lg:grid-cols-4">
        {/* Contacts */}
        <div className="rounded-2xl glass p-3 lg:col-span-1">
          <button onClick={() => setActive({ type: "group", id: null, name: "المجموعة العامة" })}
            data-testid="chat-group"
            className={`flex w-full items-center gap-3 rounded-xl p-3 text-right ${active.type === "group" ? "gradient-primary text-white" : "hover:bg-muted"}`}>
            <Hash className="h-5 w-5" /> <span className="font-bold">المجموعة العامة</span>
          </button>
          <p className="mb-1 mt-3 px-2 text-xs text-muted-foreground">{user?.role === "manager" ? "الموظفون" : "الإدارة"}</p>
          <div className="space-y-1 overflow-y-auto">
            {contacts.map((c) => (
              <button key={c.id} onClick={() => setActive({ type: "direct", id: c.id, name: c.name })}
                data-testid={`chat-contact-${c.id}`}
                className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-right ${active.id === c.id ? "gradient-primary text-white" : "hover:bg-muted"}`}>
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted text-xs">
                  {c.avatar_url ? <img src={c.avatar_url} className="h-full w-full object-cover" alt="" /> : c.name?.[0]}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{c.name}</p>
                  <p className="truncate text-xs opacity-70">{c.job_title}</p>
                </div>
              </button>
            ))}
            {contacts.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">لا توجد جهات اتصال بعد.</p>}
          </div>
        </div>

        {/* Messages */}
        <div className="flex flex-col rounded-2xl glass lg:col-span-3">
          <div className="flex items-center gap-2 border-b border-border p-4">
            {active.type === "group" ? <Hash className="h-5 w-5 text-cyan-400" /> : <Users className="h-5 w-5 text-cyan-400" />}
            <span className="font-display font-bold">{active.name}</span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" data-testid="chat-messages">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.mine ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.mine ? "gradient-primary text-white" : "bg-muted"}`}>
                  {!m.mine && <p className="mb-0.5 text-xs font-bold text-cyan-400">{m.sender_name}{m.sender_role === "manager" ? " (المدير)" : ""}</p>}
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            ))}
            {messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">ابدأ المحادثة ✨</p>}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="اكتب رسالة..." data-testid="chat-input"
              className="flex-1 rounded-xl border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary" />
            <button type="submit" className="flex items-center rounded-xl gradient-primary px-4 text-white void-glow" data-testid="chat-send"><Send className="h-5 w-5" /></button>
          </form>
        </div>
      </div>
    </div>
  );
}
