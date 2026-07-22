import { useEffect, useState } from "react";
import { ListTodo, Plus, Trash2, Check } from "lucide-react";
import api from "@/lib/apiClient";
import { PageHeader, GlassCard } from "@/components/Kit";

export default function Todo() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");

  const load = () => api.get("/todos").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await api.post("/todos", { text });
    setText(""); load();
  };
  const toggle = async (id) => { await api.put(`/todos/${id}/toggle`); load(); };
  const remove = async (id) => { await api.delete(`/todos/${id}`); load(); };

  const done = items.filter((i) => i.done).length;

  return (
    <div>
      <PageHeader title="مهامي" subtitle="قائمة مهامك الشخصية اليومية" icon={ListTodo} />
      <GlassCard className="mx-auto max-w-2xl">
        <form onSubmit={add} className="mb-4 flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="أضف مهمة جديدة..." data-testid="todo-input"
            className="flex-1 rounded-xl border border-input bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary" />
          <button type="submit" className="flex items-center rounded-xl gradient-primary px-4 text-white void-glow" data-testid="todo-add"><Plus className="h-5 w-5" /></button>
        </form>
        <p className="mb-3 text-xs text-muted-foreground">{done} / {items.length} منجزة</p>
        <div className="space-y-2">
          {items.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border border-border p-3" data-testid={`todo-${t.id}`}>
              <button onClick={() => toggle(t.id)} className="flex items-center gap-3 text-right">
                <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${t.done ? "gradient-primary border-transparent text-white" : "border-border"}`}>
                  {t.done && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className={`text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.text}</span>
              </button>
              <button onClick={() => remove(t.id)} className="text-red-400"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {items.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">لا توجد مهام بعد ✨</p>}
        </div>
      </GlassCard>
    </div>
  );
}
