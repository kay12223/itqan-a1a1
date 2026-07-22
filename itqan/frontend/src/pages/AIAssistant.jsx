import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, Sparkles, Trash2, Crown, Copy, ChevronDown,
  BrainCircuit, Wallet, Clock, Users, BarChart3, CheckCircle2,
} from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/Kit";

const SUGGESTIONS = [
  { icon: BarChart3, text: "حلّل أداء فريقي واقترح تحسينات" },
  { icon: Clock, text: "اكتب لي تنبيهاً للموظفين عن مواعيد الحضور" },
  { icon: Wallet, text: "كيف أنظّم مصاريف الشركة هذا الشهر؟" },
  { icon: Users, text: "اقترح خطة لزيادة إنتاجية الفريق" },
  { icon: BrainCircuit, text: "ما هي أفضل طريقة لتقييم الموظفين؟" },
  { icon: CheckCircle2, text: "كيف أتعامل مع الموظف كثير الغياب؟" },
];

function formatText(text) {
  // Convert markdown-like bold **text** to <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    // Handle bullet points
    if (part.includes("\n•")) {
      return part.split("\n").map((line, j) => (
        <span key={j} className={line.startsWith("•") ? "block mt-1 ps-2" : "block"}>
          {line}
        </span>
      ));
    }
    return part;
  });
}

function Message({ m }) {
  const isUser = m.role === "user";
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(m.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${isUser ? "gradient-primary text-white" : "bg-cyan-400/20 text-cyan-400"}`}>
        {isUser ? "أنت" : <Bot className="h-4 w-4" />}
      </div>

      {/* Bubble */}
      <div className={`group relative max-w-[80%] ${isUser ? "items-end" : ""}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? "gradient-primary text-white" : "glass"}`}>
          {isUser ? m.text : <div className="space-y-0.5">{formatText(m.text)}</div>}
        </div>
        {!isUser && (
          <button
            onClick={copy}
            className="absolute -bottom-5 start-2 hidden items-center gap-1 rounded-lg border border-border bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground group-hover:flex backdrop-blur-sm"
          >
            {copied ? <><CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" /> نُسخ</> : <><Copy className="h-2.5 w-2.5" /> نسخ</>}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function AIAssistant() {
  const { company } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const premium = company?.is_premium;

  useEffect(() => {
    api.get("/ai-chat/history").then((r) => {
      setMessages(r.data);
      if (r.data.length > 0) setShowSuggestions(false);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setShowSuggestions(false);
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const { data } = await api.post("/ai-chat", { message: msg });
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } catch (e) {
      toast.error(apiErr(e.response?.data?.detail) || "تعذّر الاتصال بالمساعد");
      setMessages((m) => [...m, { role: "assistant", text: "⚠️ تعذّر الرد الآن، حاول مرة أخرى." }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const clear = async () => {
    await api.delete("/ai-chat/history");
    setMessages([]);
    setShowSuggestions(true);
    toast.success("تم مسح المحادثة");
  };

  return (
    <div className="flex h-[calc(100vh-130px)] flex-col gap-3">
      <PageHeader
        title="المساعد الذكي"
        subtitle="يحادثك، يحلّل أداء شركتك، ويقترح حلولاً عملية بالعربية"
        icon={Bot}
      >
        <div className="flex items-center gap-2">
          {premium ? (
            <span className="flex items-center gap-1 rounded-full gradient-primary px-3 py-1.5 text-xs font-bold text-white">
              <Crown className="h-3.5 w-3.5" /> متقدم
            </span>
          ) : (
            <span className="rounded-full glass px-3 py-1.5 text-xs">مجاني</span>
          )}
          {messages.length > 0 && (
            <button onClick={clear} className="rounded-xl glass p-2 card-hover" title="مسح المحادثة">
              <Trash2 className="h-4 w-4 text-red-400" />
            </button>
          )}
        </div>
      </PageHeader>

      {/* Messages */}
      <div className="flex-1 space-y-5 overflow-y-auto rounded-2xl glass p-4">
        {/* Empty state + suggestions */}
        {messages.length === 0 && showSuggestions && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary void-glow text-white">
              <Sparkles className="h-8 w-8" />
            </div>
            <p className="mt-4 font-display text-xl font-bold">مرحباً! أنا مساعد إتقان الذكي</p>
            <p className="mt-1 text-sm text-muted-foreground">اسألني أي شيء عن إدارة شركتك، فريقك، والمالية</p>
            <div className="mt-6 grid max-w-lg gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => send(s.text)}
                  className="flex items-center gap-2 rounded-xl border border-border p-3 text-right text-sm card-hover hover:border-primary/40 transition"
                >
                  <s.icon className="h-4 w-4 shrink-0 text-primary" />
                  {s.text}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Message list */}
        <div className="space-y-5">
          {messages.map((m, i) => <Message key={i} m={m} />)}
        </div>

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-400">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl glass px-4 py-3">
              <span className="flex gap-1.5">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-cyan-400" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestions toggle when there are messages */}
      {messages.length > 0 && (
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="flex items-center gap-1.5 self-start rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 transition"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSuggestions ? "rotate-180" : ""}`} />
          اقتراحات
        </button>
      )}

      <AnimatePresence>
        {showSuggestions && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.slice(0, 4).map((s) => (
                <button
                  key={s.text}
                  onClick={() => { send(s.text); setShowSuggestions(false); }}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs hover:border-primary/40 hover:bg-primary/5 transition"
                >
                  <s.icon className="h-3.5 w-3.5 text-primary" />
                  {s.text}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب سؤالك للمساعد الذكي..."
          data-testid="ai-input"
          className="flex-1 rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          data-testid="ai-send"
          className="flex items-center gap-2 rounded-xl gradient-primary px-5 text-white void-glow disabled:opacity-40 transition"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
