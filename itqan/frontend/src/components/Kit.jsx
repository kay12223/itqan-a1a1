import { motion } from "framer-motion";

export function PageHeader({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary void-glow text-white">
            <Icon className="h-6 w-6" />
          </span>
        )}
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function GlassCard({ children, className = "", hover = false, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`rounded-2xl glass p-5 ${hover ? "card-hover" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function StatCard({ label, value, icon: Icon, accent = "from-blue-500 to-violet-500", sub, testId }) {
  return (
    <GlassCard hover className="overflow-hidden" >
      <div data-testid={testId} className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-black">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        {Icon && (
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white`}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </GlassCard>
  );
}

export function Modal({ open, onClose, title, children, testId }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" data-testid={testId}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl glass p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" data-testid="modal-close">✕</button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted-foreground">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}

export function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 void-glow ${className}`}
    >
      {children}
    </button>
  );
}
