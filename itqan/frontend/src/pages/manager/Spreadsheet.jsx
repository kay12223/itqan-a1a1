import { useState, useCallback, useRef } from "react";
import { PageHeader } from "@/components/Kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table2, Plus, Trash2, Download, Upload, Bold, Italic,
  AlignRight, AlignCenter, AlignLeft, PlusCircle, X, Check,
} from "lucide-react";
import { toast } from "sonner";

const COLS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DEFAULT_ROWS = 30;
const DEFAULT_COLS = 10;

function mkId(r, c) { return `${r}:${c}`; }

function evalFormula(expr, cells, rows, cols) {
  try {
    const withRefs = expr.replace(/([A-Z])(\d+)/g, (_, col, row) => {
      const c = COLS.indexOf(col);
      const r = parseInt(row) - 1;
      const val = parseFloat(cells[mkId(r, c)]?.value || 0);
      return isNaN(val) ? 0 : val;
    });
    const withFns = withRefs.replace(/(SUM|AVG|AVERAGE|COUNT|MAX|MIN)\(([^)]+)\)/gi, (_, fn, range) => {
      const [start, end] = range.split(":");
      const sc = COLS.indexOf(start[0]), sr = parseInt(start.slice(1)) - 1;
      const ec = COLS.indexOf(end[0]),   er = parseInt(end.slice(1)) - 1;
      const vals = [];
      for (let r = sr; r <= er && r < rows; r++)
        for (let c = sc; c <= ec && c < cols; c++) {
          const v = parseFloat(cells[mkId(r, c)]?.value || 0);
          if (!isNaN(v)) vals.push(v);
        }
      switch (fn.toUpperCase()) {
        case "SUM":     return vals.reduce((a, b) => a + b, 0);
        case "AVERAGE": case "AVG": return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        case "COUNT":   return vals.length;
        case "MAX":     return vals.length ? Math.max(...vals) : 0;
        case "MIN":     return vals.length ? Math.min(...vals) : 0;
        default: return 0;
      }
    });
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${withFns})`)();
    return isNaN(result) ? "!خطأ" : String(typeof result === "number" ? parseFloat(result.toFixed(4)) : result);
  } catch { return "!خطأ"; }
}

const EMPTY_SHEET = (name) => ({ name, cells: {}, rows: DEFAULT_ROWS, cols: DEFAULT_COLS, colHeaders: {} });

export default function Spreadsheet() {
  const [sheets, setSheets]         = useState([EMPTY_SHEET("ورقة 1")]);
  const [activeSheet, setAS]        = useState(0);
  const [selected, setSelected]     = useState(null);
  const [formula, setFormula]       = useState("");
  const [editing, setEditing]       = useState(false);
  const [editVal, setEV]            = useState("");
  const [fmt, setFmt]               = useState({});
  const [renamingSheet, setRenaming]= useState(null); // index of sheet being renamed
  const [renameVal, setRenameVal]   = useState("");
  const [editingColHeader, setECH]  = useState(null); // col index being renamed
  const [colHeaderVal, setCHV]      = useState("");
  const cellRef  = useRef(null);
  const fileRef  = useRef(null);
  const renameRef= useRef(null);
  const colRef   = useRef(null);

  const sheet    = sheets[activeSheet];
  const cells    = sheet.cells;
  const numRows  = sheet.rows;
  const numCols  = sheet.cols;
  const colHeaders = sheet.colHeaders || {};

  const updateSheet = useCallback((updater) => {
    setSheets(prev => prev.map((s, i) => i === activeSheet ? updater(s) : s));
  }, [activeSheet]);

  const select = (r, c) => {
    const id = mkId(r, c);
    setSelected(id);
    setFormula(cells[id]?.value || "");
    setEditing(false);
  };

  const commit = (r, c, value) => {
    const id = mkId(r, c);
    updateSheet(s => ({ ...s, cells: { ...s.cells, [id]: { ...s.cells[id], value } } }));
    setEditing(false);
    setFormula(value);
  };

  const getCellDisplay = (r, c) => {
    const id = mkId(r, c);
    const val = cells[id]?.value || "";
    if (val.startsWith("=")) return evalFormula(val.slice(1), cells, numRows, numCols);
    return val;
  };

  const getCellStyle = (id) => {
    const f = fmt[id] || {};
    return {
      fontWeight: f.bold   ? "bold"   : "normal",
      fontStyle:  f.italic ? "italic" : "normal",
      textAlign:  f.align  || "right",
      color:      f.color  || undefined,
      background: f.bg     || undefined,
    };
  };

  const applyFmt = (key, value) => {
    if (!selected) return;
    setFmt(prev => ({ ...prev, [selected]: { ...prev[selected], [key]: value } }));
  };

  const addRow = () => updateSheet(s => ({ ...s, rows: s.rows + 10 }));
  const addCol = () => updateSheet(s => ({ ...s, cols: Math.min(s.cols + 1, 26) }));

  const exportCSV = () => {
    const lines = [];
    for (let r = 0; r < numRows; r++) {
      const row = [];
      for (let c = 0; c < numCols; c++) {
        const val = getCellDisplay(r, c);
        row.push(`"${val.replace(/"/g, '""')}"`);
      }
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${sheet.name}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير الملف");
  };

  const importCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split("\n");
      const newCells = {};
      lines.forEach((line, r) => {
        const parts = line.split(",").map(p => p.replace(/^"|"$/g, "").replace(/""/g, '"'));
        parts.forEach((val, c) => { if (val) newCells[mkId(r, c)] = { value: val }; });
      });
      updateSheet(s => ({
        ...s,
        cells: { ...s.cells, ...newCells },
        rows: Math.max(s.rows, lines.length + 5),
        cols: Math.max(s.cols, Math.max(...lines.map(l => l.split(",").length)) + 2),
      }));
      toast.success("تم استيراد الملف");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const addSheet = () => {
    const name = `ورقة ${sheets.length + 1}`;
    setSheets(prev => [...prev, EMPTY_SHEET(name)]);
    setAS(sheets.length);
    setSelected(null);
    setFormula("");
    setFmt({});
  };

  const deleteSheet = (i, e) => {
    e.stopPropagation();
    if (sheets.length === 1) { toast.error("يجب أن تبقى ورقة واحدة على الأقل"); return; }
    if (!window.confirm(`حذف "${sheets[i].name}"؟`)) return;
    setSheets(prev => prev.filter((_, idx) => idx !== i));
    setAS(prev => (prev >= i && prev > 0 ? prev - 1 : prev));
    setSelected(null); setFormula("");
  };

  const startRename = (i, e) => {
    e.stopPropagation();
    setRenaming(i);
    setRenameVal(sheets[i].name);
    setTimeout(() => renameRef.current?.focus(), 30);
  };

  const commitRename = (i) => {
    const name = renameVal.trim() || sheets[i].name;
    setSheets(prev => prev.map((s, idx) => idx === i ? { ...s, name } : s));
    setRenaming(null);
  };

  const startColRename = (c, e) => {
    e.stopPropagation();
    setECH(c);
    setCHV(colHeaders[c] || "");
    setTimeout(() => colRef.current?.focus(), 30);
  };

  const commitColRename = (c) => {
    updateSheet(s => ({ ...s, colHeaders: { ...s.colHeaders, [c]: colHeaderVal.trim() || "" } }));
    setECH(null);
  };

  const [sr, sc] = selected ? selected.split(":").map(Number) : [null, null];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 gap-3" dir="rtl">
      <PageHeader title="جدول البيانات" subtitle="ورقة بيانات متكاملة وذكية" icon={Table2} compact />

      {/* Toolbar */}
      <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap">
        {/* Cell address */}
        <span className="text-xs font-mono text-muted-foreground shrink-0 min-w-[32px]">
          {selected ? `${COLS[sc]}${sr + 1}` : "—"}
        </span>
        {/* Formula bar */}
        <div className="flex-1 min-w-32">
          <Input
            value={formula}
            onChange={(e) => {
              setFormula(e.target.value);
              if (sr !== null && sc !== null) commit(sr, sc, e.target.value);
            }}
            className="h-7 text-sm font-mono bg-transparent border-white/10"
            placeholder="اكتب قيمة أو =SUM(A1:A5)"
          />
        </div>
        <div className="h-5 w-px bg-white/10" />
        {/* Format buttons */}
        <button onClick={() => applyFmt("bold", !fmt[selected]?.bold)}
          className={`p-1.5 rounded-lg transition-colors ${fmt[selected]?.bold ? "bg-primary/20 text-primary" : "hover:bg-white/10 text-muted-foreground"}`}>
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => applyFmt("italic", !fmt[selected]?.italic)}
          className={`p-1.5 rounded-lg transition-colors ${fmt[selected]?.italic ? "bg-primary/20 text-primary" : "hover:bg-white/10 text-muted-foreground"}`}>
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => applyFmt("align", "right")}  className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground"><AlignRight  className="h-3.5 w-3.5" /></button>
        <button onClick={() => applyFmt("align", "center")} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground"><AlignCenter className="h-3.5 w-3.5" /></button>
        <button onClick={() => applyFmt("align", "left")}   className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground"><AlignLeft   className="h-3.5 w-3.5" /></button>
        {/* Text colors */}
        <div className="flex gap-1">
          {["#f87171","#4ade80","#60a5fa","#fbbf24","#e879f9","#ffffff"].map(c => (
            <button key={c} onClick={() => applyFmt("color", c)}
              className="w-4 h-4 rounded-sm border border-white/20 hover:scale-125 transition-transform"
              style={{ background: c }} title="لون النص" />
          ))}
        </div>
        {/* BG colors */}
        <div className="flex gap-1">
          {["#1e1b4b","#14532d","#7f1d1d","#713f12","transparent"].map(c => (
            <button key={c} onClick={() => applyFmt("bg", c === "transparent" ? undefined : c)}
              className="w-4 h-4 rounded-sm border border-white/20 hover:scale-125 transition-transform flex items-center justify-center"
              style={{ background: c === "transparent" ? undefined : c }}
              title="لون الخلية">
              {c === "transparent" && <X className="h-2.5 w-2.5 text-muted-foreground" />}
            </button>
          ))}
        </div>
        <div className="h-5 w-px bg-white/10" />
        <button onClick={addRow} className="p-1.5 rounded-lg hover:bg-white/10 text-xs flex items-center gap-1 text-muted-foreground whitespace-nowrap">
          <Plus className="h-3.5 w-3.5" /> صف
        </button>
        <button onClick={addCol} className="p-1.5 rounded-lg hover:bg-white/10 text-xs flex items-center gap-1 text-muted-foreground whitespace-nowrap">
          <Plus className="h-3.5 w-3.5" /> عمود
        </button>
        <div className="h-5 w-px bg-white/10" />
        <button onClick={exportCSV} className="p-1.5 rounded-lg hover:bg-white/10 flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
          <Download className="h-3.5 w-3.5" /> CSV
        </button>
        <button onClick={() => fileRef.current?.click()} className="p-1.5 rounded-lg hover:bg-white/10 flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
          <Upload className="h-3.5 w-3.5" /> استيراد
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto rounded-xl border border-white/8 glass">
        <table className="border-collapse text-sm" style={{ minWidth: `${numCols * 100 + 48}px` }}>
          <thead className="sticky top-0 z-10">
            <tr>
              {/* Corner cell */}
              <th className="w-12 h-8 shrink-0 border-b border-r border-white/10 bg-white/5 text-center text-xs text-muted-foreground select-none">#</th>
              {Array.from({ length: numCols }, (_, c) => (
                <th key={c}
                  className="min-w-[100px] h-8 border-b border-r border-white/10 bg-white/5 text-center text-xs font-semibold cursor-pointer hover:bg-white/8 group relative"
                  onDoubleClick={(e) => startColRename(c, e)}
                  title="اضغط مرتين لتغيير الاسم"
                >
                  {editingColHeader === c ? (
                    <input
                      ref={colRef}
                      value={colHeaderVal}
                      onChange={e => setCHV(e.target.value)}
                      onBlur={() => commitColRename(c)}
                      onKeyDown={e => {
                        if (e.key === "Enter") commitColRename(c);
                        if (e.key === "Escape") setECH(null);
                      }}
                      className="w-full h-full bg-primary/10 text-primary text-center text-xs outline-none border-none px-1"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                      {colHeaders[c] || COLS[c]}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: numRows }, (_, r) => (
              <tr key={r} className="group">
                <td className="w-12 h-7 border-b border-r border-white/8 bg-white/3 text-center text-xs text-muted-foreground select-none group-hover:bg-white/5">
                  {r + 1}
                </td>
                {Array.from({ length: numCols }, (_, c) => {
                  const id = mkId(r, c);
                  const isSelected = selected === id;
                  const display = getCellDisplay(r, c);
                  const style = getCellStyle(id);
                  return (
                    <td key={c}
                      onClick={() => select(r, c)}
                      onDoubleClick={() => {
                        select(r, c);
                        setEditing(true);
                        setEV(cells[id]?.value || "");
                        setTimeout(() => cellRef.current?.focus(), 50);
                      }}
                      className={`border-b border-r border-white/8 h-7 px-1.5 cursor-default transition-colors relative
                        ${isSelected ? "outline outline-2 outline-primary outline-offset-[-1px] bg-primary/10" : "hover:bg-white/5"}`}
                      style={{ minWidth: 100 }}>
                      {isSelected && editing ? (
                        <input
                          ref={cellRef}
                          className="w-full h-full bg-transparent outline-none text-foreground font-mono text-xs"
                          value={editVal}
                          onChange={(e) => setEV(e.target.value)}
                          onBlur={() => commit(r, c, editVal)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { commit(r, c, editVal); select(r + 1, c); }
                            if (e.key === "Tab")   { e.preventDefault(); commit(r, c, editVal); select(r, c + 1); }
                            if (e.key === "Escape") { setEditing(false); }
                          }}
                          style={style}
                        />
                      ) : (
                        <span className="block truncate text-xs" style={style}>{display}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sheet tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {sheets.map((s, i) => (
          <div key={i}
            onClick={() => { setAS(i); setSelected(null); setFormula(""); setFmt({}); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer group shrink-0
              ${i === activeSheet
                ? "gradient-primary text-white border-transparent"
                : "glass border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20"
              }`}>
            {renamingSheet === i ? (
              <>
                <input
                  ref={renameRef}
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onBlur={() => commitRename(i)}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitRename(i);
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  onClick={e => e.stopPropagation()}
                  className="w-24 bg-transparent outline-none border-b border-white/50 text-xs"
                />
                <button onClick={e => { e.stopPropagation(); commitRename(i); }}
                  className="text-emerald-400 hover:text-emerald-300">
                  <Check className="h-3 w-3" />
                </button>
              </>
            ) : (
              <>
                <span onDoubleClick={(e) => startRename(i, e)} title="اضغط مرتين لإعادة التسمية">{s.name}</span>
                {sheets.length > 1 && (
                  <button
                    onClick={(e) => deleteSheet(i, e)}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 ${i === activeSheet ? "opacity-100" : ""}`}>
                    <X className="h-3 w-3" />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
        <button onClick={addSheet}
          className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground shrink-0"
          title="إضافة ورقة جديدة">
          <PlusCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Hint */}
      <p className="text-[10px] text-muted-foreground/50 text-center">
        اضغط مرتين على اسم الورقة أو العمود لتغيير اسمه • اضغط مرتين على الخلية للتعديل
      </p>
    </div>
  );
}
