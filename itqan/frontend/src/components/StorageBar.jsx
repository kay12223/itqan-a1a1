import { HardDrive } from "lucide-react";

export default function StorageBar({ used = 0, limit = 100, compact = false }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "gradient-primary";
  const gb = limit >= 1024;
  const fmt = (v) => (gb ? `${(v / 1024).toFixed(1)} ج.ب` : `${v} م.ب`);
  return (
    <div data-testid="storage-bar" className="w-full">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <HardDrive className="h-3.5 w-3.5" /> المساحة التخزينية
        </span>
        <span className={`font-mono-x ${pct >= 90 ? "text-red-400" : "text-foreground"}`}>
          {fmt(used)} / {fmt(limit)}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      {pct >= 90 && !compact && (
        <p className="mt-2 text-xs text-red-400" data-testid="storage-full-warning">
          المساحة شارفت على الامتلاء — للترقية تواصل مع الإدارة: 01012930571
        </p>
      )}
    </div>
  );
}
