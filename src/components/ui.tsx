import React, { useEffect, useRef, useState } from "react";
import { I } from "./icons";
import { Toast, useStore, EmailMsg } from "../lib/store";

/* ── Кнопки ────────────────────────────────────────────────────────── */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: "primary" | "ghost" | "outline" | "danger" | "amber" | "dark";
  size?: "sm" | "md" | "lg";
};

export function Btn({ kind = "primary", size = "md", className = "", children, ...rest }: BtnProps) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer";
  const sizes = { sm: "text-[12.5px] px-3 h-8", md: "text-[13.5px] px-4 h-10", lg: "text-[15px] px-6 h-12" }[size];
  const kinds = {
    primary: "bg-teal-deep text-white hover:brightness-110 shadow-[0_2px_8px_-2px_rgba(14,147,132,0.5)]",
    ghost: "text-ink-700 hover:bg-ink-900/8",
    outline: "border border-line bg-card text-ink-800 hover:border-teal-deep/50 hover:text-teal-deep",
    danger: "bg-danger text-white hover:bg-[#b91c1c]",
    amber: "bg-amber-brand text-deep hover:bg-amber-deep hover:text-white",
    dark: "bg-deep-2 text-teal-brand hover:bg-deep-line",
  }[kind];
  return <button className={`${base} ${sizes} ${kinds} ${className}`} {...rest}>{children}</button>;
}

/* ── Переключатель ─────────────────────────────────────────────────── */

export function Toggle({ on, onChange, disabled, big }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; big?: boolean }) {
  return (
    <button
      type="button" disabled={disabled} onClick={() => onChange(!on)} aria-pressed={on}
      className={`relative shrink-0 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
        ${big ? "w-14 h-8" : "w-11 h-6.5"} ${on ? "bg-teal-deep" : "bg-[#b9c9cc]"}`}
    >
      <span className={`absolute top-0.5 rounded-full bg-white shadow transition-all duration-200 ${big ? "w-7 h-7" : "w-5.5 h-5.5"} ${on ? (big ? "left-6.5" : "left-5") : "left-0.5"}`} />
    </button>
  );
}

/* ── Поля форм ─────────────────────────────────────────────────────── */

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-semibold text-ink-800 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[12px] text-mut mt-1.5">{hint}</span>}
    </label>
  );
}

export const inputCls = "w-full h-10 px-3.5 rounded-lg border border-line bg-card text-[14px] text-ink-900 outline-none transition-all placeholder:text-mut/70 focus:border-teal-deep focus:ring-[3px] focus:ring-teal-deep/15";
export const selectCls = inputCls + " cursor-pointer appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:14px] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235c7379%22 stroke-width=%222%22%3E%3Cpath d=%22m6 9.5 6 6 6-6%22/%3E%3C/svg%3E')]";

/* ── Тосты ─────────────────────────────────────────────────────────── */

const toastMeta: Record<Toast["kind"], { icon: "check" | "info" | "zap" | "x"; cls: string }> = {
  ok: { icon: "check", cls: "bg-ok/12 text-ok border-ok/25" },
  info: { icon: "info", cls: "bg-ink-600/10 text-ink-700 border-ink-600/20" },
  warn: { icon: "zap", cls: "bg-warn/12 text-warn border-warn/25" },
  danger: { icon: "x", cls: "bg-danger/10 text-danger border-danger/25" },
};

export function ToastHost() {
  const { toasts, dropToast } = useStore();
  return (
    <div className="fixed bottom-5 right-5 z-[90] flex flex-col gap-2.5 w-[min(360px,calc(100vw-40px))]">
      {toasts.map(t => {
        const m = toastMeta[t.kind];
        return (
          <div key={t.id} className="anim-slide-right bg-card border border-line rounded-xl shadow-pop overflow-hidden flex">
            <div className={`w-1.5 ${m.cls.split(" ")[0]}`} style={{}} />
            <div className="flex-1 px-4 py-3 flex gap-3">
              <span className={`mt-0.5 w-7 h-7 rounded-full border grid place-items-center shrink-0 ${m.cls}`}>
                <I n={m.icon} size={15} sw={2.2} />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold text-ink-900 leading-tight">{t.title}</p>
                {t.text && <p className="text-[12.5px] text-mut mt-0.5 leading-snug">{t.text}</p>}
              </div>
            </div>
            <button onClick={() => dropToast(t.id)} className="px-3 text-mut hover:text-ink-900 transition-colors cursor-pointer self-start mt-3"><I n="x" size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}

/* ── Модальное окно ────────────────────────────────────────────────── */

export function Modal({ open, onClose, title, children, width = 520 }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4">
      <div className="absolute inset-0 bg-deep/70 anim-fade" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-pop anim-scale-in w-full max-h-[86vh] overflow-auto" style={{ maxWidth: width }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-line sticky top-0 bg-card z-10">
          <h3 className="font-display font-bold text-[16px] text-ink-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-lg text-mut hover:bg-canvas hover:text-ink-900 transition-colors cursor-pointer"><I n="x" size={16} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ── Прогресс ──────────────────────────────────────────────────────── */

export function Progress({ value, tone = "teal", label }: { value: number; tone?: "teal" | "amber"; label?: string }) {
  return (
    <div>
      {label && (
        <div className="flex justify-between text-[12px] font-semibold text-mut mb-1.5">
          <span>{label}</span><span className="tabular text-ink-800">{Math.round(value)}%</span>
        </div>
      )}
      <div className="h-2.5 rounded-full bg-ink-900/10 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${tone === "teal" ? "bg-teal-deep" : "bg-amber-brand"}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/* ── Бейдж ─────────────────────────────────────────────────────────── */

export function Badge({ children, tone = "mut" }: { children: React.ReactNode; tone?: "ok" | "warn" | "danger" | "mut" | "teal" | "amber" }) {
  const cls = {
    ok: "bg-ok/12 text-ok border-ok/25", warn: "bg-warn/12 text-warn border-warn/25",
    danger: "bg-danger/10 text-danger border-danger/25", mut: "bg-ink-600/8 text-mut border-ink-600/15",
    teal: "bg-teal-deep/10 text-teal-deep border-teal-deep/25", amber: "bg-amber-brand/15 text-amber-deep border-amber-brand/30",
  }[tone];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold tracking-wide ${cls}`}>{children}</span>;
}

/* ── Пустое состояние ──────────────────────────────────────────────── */

export function Empty({ icon, title, text }: { icon: Parameters<typeof I>[0]["n"]; title: string; text?: string }) {
  return (
    <div className="py-16 text-center anim-fade">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-deep-2/8 text-mut grid place-items-center"><I n={icon} size={26} /></div>
      <p className="mt-4 font-display font-bold text-[15px] text-ink-900">{title}</p>
      {text && <p className="mt-1.5 text-[13px] text-mut max-w-sm mx-auto">{text}</p>}
    </div>
  );
}

/* ── Симуляция входящего письма с кодом 2FA ────────────────────────── */

export function EmailNotifier({ msg, onCopy }: { msg: EmailMsg; onCopy?: () => void }) {
  const { dismissEmail } = useStore();
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setVisible(true); setCopied(false); }, [msg.ts]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(msg.code); } catch { /* нет доступа к буферу */ }
    setCopied(true); onCopy?.();
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={ref} className={`fixed top-4 right-4 z-[95] w-[min(380px,calc(100vw-32px))] transition-all duration-500 ${visible ? "translate-x-0 opacity-100" : "translate-x-24 opacity-0"}`}>
      <div className="bg-deep-2 text-paper rounded-2xl shadow-pop overflow-hidden border border-deep-line">
        <div className="flex items-center gap-3 px-4 py-3 bg-deep/70">
          <span className="w-8 h-8 rounded-lg bg-amber-brand text-deep grid place-items-center"><I n="mail" size={16} sw={2} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-amber-brand tracking-wide uppercase">Новое письмо</p>
            <p className="text-[12px] text-paper/60 truncate">Wordtime &lt;no-reply@wordtime.ru&gt; → {msg.to}</p>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-teal-brand font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-teal-brand" style={{ animation: "wt-pulse-dot 1.4s infinite" }} />сейчас</span>
        </div>
        <div className="px-4 py-4">
          <p className="text-[14px] font-bold">{msg.subject}</p>
          <p className="text-[12.5px] text-paper/65 mt-1">Здравствуйте! Чтобы подтвердить вход в консоль, введите этот код. Он действует 5 минут.</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 bg-deep/70 border border-dashed border-teal-brand/40 rounded-xl py-3 text-center">
              <span className="font-display text-[26px] font-bold tracking-[0.35em] text-teal-brand tabular">{msg.code}</span>
            </div>
            <button onClick={copy} className="shrink-0 h-12 px-4 rounded-xl border border-deep-line text-paper/80 hover:text-teal-brand hover:border-teal-brand/50 transition-colors grid place-items-center cursor-pointer" title="Скопировать код">
              <I n={copied ? "check" : "copy"} size={18} sw={2} />
            </button>
          </div>
          <p className="text-[11.5px] text-paper/45 mt-2.5">Это демо-доставка: в реальном Wordtime письмо отправляется через настроенный SMTP.</p>
        </div>
        <button onClick={dismissEmail} className="absolute top-3 right-3 w-6 h-6 grid place-items-center text-paper/50 hover:text-paper cursor-pointer"><I n="x" size={13} /></button>
      </div>
    </div>
  );
}

/* ── Изображение с фолбэком, если файл недоступен ─────────────────── */

export function SmartImg({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`${className} grid place-items-center text-white/70 bg-deep-2`}>
        <I n="image" size={24} />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} loading="lazy" />;
}

/* ── Звёзды рейтинга ───────────────────────────────────────────────── */

export function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5 text-amber-brand">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i <= n ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="m12 4 2.4 5 5.6.7-4.1 3.8 1.1 5.5-5-2.8-5 2.8 1.1-5.5L4 9.7 9.6 9z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}
