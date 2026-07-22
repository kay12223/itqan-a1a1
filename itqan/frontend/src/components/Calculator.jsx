/**
 * Floating calculator — available to all users
 * Triggered by a fixed button bottom-left
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator as CalcIcon, X, Delete } from "lucide-react";

const BUTTONS = [
  ["C", "±", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["0", ".", "⌫", "="],
];

const OPS = { "÷": "/", "×": "*", "−": "-", "+": "+" };

export default function Calculator() {
  const [open, setOpen]   = useState(false);
  const [display, setD]   = useState("0");
  const [stored, setS]    = useState(null);
  const [op, setOp]       = useState(null);
  const [fresh, setFresh] = useState(false);
  const [history, setHist]= useState([]);

  const compute = useCallback((a, b, operation) => {
    switch(operation) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b !== 0 ? a / b : "خطأ";
      default: return b;
    }
  }, []);

  const press = useCallback((key) => {
    if ("0123456789".includes(key)) {
      setD(prev => {
        if (fresh || prev === "0") { setFresh(false); return key; }
        return prev.length < 14 ? prev + key : prev;
      });
    } else if (key === ".") {
      setD(prev => {
        if (fresh) { setFresh(false); return "0."; }
        return prev.includes(".") ? prev : prev + ".";
      });
    } else if (key === "C") {
      setD("0"); setS(null); setOp(null); setFresh(false);
    } else if (key === "⌫") {
      setD(prev => prev.length > 1 ? prev.slice(0,-1) : "0");
    } else if (key === "±") {
      setD(prev => String(parseFloat(prev) * -1));
    } else if (key === "%") {
      setD(prev => String(parseFloat(prev) / 100));
    } else if (OPS[key]) {
      const cur = parseFloat(display);
      if (op && !fresh) {
        const r = compute(stored, cur, op);
        setD(String(r));
        setS(typeof r === "number" ? r : 0);
      } else {
        setS(cur);
      }
      setOp(OPS[key]);
      setFresh(true);
    } else if (key === "=") {
      if (op !== null && stored !== null) {
        const r = compute(stored, parseFloat(display), op);
        const line = `${stored} ${Object.keys(OPS).find(k=>OPS[k]===op)} ${parseFloat(display)} = ${r}`;
        setHist(h => [line, ...h].slice(0, 8));
        setD(typeof r === "number" ? String(r) : r);
        setS(null); setOp(null); setFresh(true);
      }
    }
  }, [display, stored, op, fresh, compute]);

  const isOp    = (k) => Object.keys(OPS).includes(k);
  const isEqual = (k) => k === "=";
  const isClear = (k) => k === "C";

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 left-6 z-[999] w-12 h-12 rounded-2xl gradient-primary text-white shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
        title="آلة حاسبة"
      >
        {open ? <X className="h-5 w-5" /> : <CalcIcon className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed bottom-20 left-6 z-[998] w-72 select-none"
            dir="ltr"
          >
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10"
                 style={{ background: "rgba(15,15,26,0.96)", backdropFilter: "blur(20px)" }}>
              {/* History */}
              {history.length > 0 && (
                <div className="px-4 pt-3 max-h-20 overflow-y-auto">
                  {history.map((h, i) => (
                    <p key={i} className="text-[10px] text-white/30 text-right font-mono leading-5">{h}</p>
                  ))}
                </div>
              )}

              {/* Display */}
              <div className="px-5 py-4">
                {op && <p className="text-xs text-white/30 text-right h-4">{stored} {Object.keys(OPS).find(k=>OPS[k]===op)}</p>}
                <p className="text-4xl font-light text-white text-right truncate mt-1 font-mono"
                   style={{ direction: "ltr" }}>
                  {display}
                </p>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-4 gap-1.5 p-3">
                {BUTTONS.flat().map((key, i) => (
                  <button
                    key={i}
                    onClick={() => press(key)}
                    className={`rounded-2xl h-14 text-lg font-semibold transition-all active:scale-95 ${
                      isEqual(key)
                        ? "gradient-primary text-white col-span-1"
                        : isOp(key)
                        ? "bg-primary/30 text-primary hover:bg-primary/40"
                        : isClear(key)
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "bg-white/8 text-white hover:bg-white/14"
                    }`}
                  >
                    {key === "⌫" ? <Delete className="h-4 w-4 mx-auto" /> : key}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
