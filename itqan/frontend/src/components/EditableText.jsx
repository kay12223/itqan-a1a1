import { useState } from "react";
import { Edit3, Save, X, Trash2 } from "lucide-react";
import { useEditMode } from "@/context/EditModeContext";

export default function EditableText({
  eid,
  defaultText,
  className = "",
  as: Tag = "span",
  style: extraStyle = {},
  multiline = false,
}) {
  const { isEditMode, texts, saveText, edits, saveEdit, removeEdit } = useEditMode();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");

  const savedEdit = edits[eid] || {};
  const text = texts[eid] ?? defaultText;
  const combinedStyle = { ...extraStyle, ...savedEdit?.style };
  const isHidden = savedEdit?.hidden;

  if (isHidden && !isEditMode) return null;

  if (!isEditMode) {
    return <Tag className={className} style={combinedStyle}>{text}</Tag>;
  }

  if (editing) {
    return (
      <span className="inline-flex flex-col gap-1">
        {multiline ? (
          <textarea
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="min-h-[80px] w-full min-w-[200px] rounded-xl border-2 border-primary bg-card/90 px-3 py-2 text-sm outline-none"
            autoFocus
          />
        ) : (
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="rounded-xl border-2 border-primary bg-card/90 px-3 py-2 text-sm outline-none min-w-[180px]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") { saveText(eid, val); setEditing(false); }
              if (e.key === "Escape") setEditing(false);
            }}
          />
        )}
        <span className="flex gap-1">
          <button
            onClick={() => { saveText(eid, val); setEditing(false); }}
            className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30"
          >
            <Save className="h-3 w-3" /> حفظ
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      </span>
    );
  }

  return (
    <Tag
      className={`${className} group relative cursor-pointer rounded-lg outline-dashed outline-2 outline-primary/40 hover:outline-primary/80 transition-all ${isHidden ? "opacity-30" : ""}`}
      style={combinedStyle}
      title="انقر للتعديل"
      onClick={() => {
        setVal(text);
        setEditing(true);
      }}
    >
      {text}
      <span className="absolute -top-5 start-0 hidden items-center gap-1 group-hover:flex z-50">
        <span className="flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">
          <Edit3 className="h-2.5 w-2.5" /> انقر للتعديل
        </span>
        {isHidden && (
          <button
            onClick={(e) => { e.stopPropagation(); removeEdit(eid); }}
            className="rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white"
          >إظهار</button>
        )}
        {!isHidden && (
          <button
            onClick={(e) => { e.stopPropagation(); saveEdit(eid, { hidden: true }); }}
            className="rounded-md bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white"
          >
            <Trash2 className="h-2.5 w-2.5 inline" /> إخفاء
          </button>
        )}
      </span>
    </Tag>
  );
}
