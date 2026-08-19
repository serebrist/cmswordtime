import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ═══════════════ Иконки ═══════════════ */
const P: Record<string, string> = {
  dash: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
  pin: '<path d="M12 21s-6.5-5.4-6.5-10A6.5 6.5 0 0 1 12 4.5 6.5 6.5 0 0 1 18.5 11c0 4.6-6.5 10-6.5 10z"/><circle cx="12" cy="11" r="2.3"/>',
  pages: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  comment: '<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/>',
  image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10.5" r="1.6"/><path d="m5 17.5 4.5-4 3 2.6 3.5-3.6 3.5 3.5"/>',
  users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M15.8 14.7c2.3.2 4 1.8 4.6 4.3"/>',
  plug: '<path d="M9 7V3.5M15 7V3.5"/><path d="M7 7h10v3.5a5 5 0 0 1-10 0z"/><path d="M12 15.5V18a2.5 2.5 0 0 1-2.5 2.5H8"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.8 2-1.8 0-1.4-1.3-1.7-1.3-3 0-1 .8-1.7 2.1-1.7h2.4c2 0 3.3-1.4 3.3-3.2C20.5 6.6 16.6 3.5 12 3.5z"/><circle cx="8" cy="10" r="1.1"/><circle cx="12" cy="7.5" r="1.1"/><circle cx="16" cy="10" r="1.1"/><circle cx="8.5" cy="14.5" r="1.1"/>',
  gear: '<circle cx="12" cy="12" r="3.1"/><path d="M12 2.8l1.2 2.5 2.7-.6 1 2.6 2.7.7-.6 2.7 2 1.9-2 1.9.6 2.7-2.7.7-1 2.6-2.7-.6L12 21.2l-1.2-2.5-2.7.6-1-2.6-2.7-.7.6-2.7-2-1.9 2-1.9-.6-2.7 2.7-.7 1-2.6 2.7.6z"/>',
  cloud: '<path d="M7 18.5a4 4 0 0 1-.6-8 5.5 5.5 0 0 1 10.7-1.2A4.2 4.2 0 0 1 16.5 18.5z"/>',
  key: '<circle cx="8" cy="14.5" r="4"/><path d="m11 11.5 8-8M16.5 6l2.5 2.5M14 8.5l2 2"/>',
  pulse: '<path d="M3.5 12h3.4l2-4.5 3 9 2.2-4.5h6.4"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.3 3.9 5.1 3.9 8.5s-1.3 6.2-3.9 8.5c-2.6-2.3-3.9-5.1-3.9-8.5s1.3-6.2 3.9-8.5z"/>',
  zap: '<path d="M13 3 5 13.5h5.5L11 21l8-10.5h-5.5z"/>',
  shield: '<path d="M12 3.5 5.5 6v5.5c0 4.4 2.8 7.4 6.5 9 3.7-1.6 6.5-4.6 6.5-9V6z"/><path d="m9.3 12 2 2 3.6-4"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  trash: '<path d="M4.5 6.5h15M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5M6.5 6.5l.8 12A2 2 0 0 0 9.3 20.5h5.4a2 2 0 0 0 2-1.9l.8-12.1"/><path d="M10 10.5v6M14 10.5v6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  ext: '<path d="M7 17 17 7M9.5 7H17v7.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  logout: '<path d="M14 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h7"/><path d="m16 8 4 4-4 4M20 12H9.5"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/>',
  dl: '<path d="M12 4v11M7.5 11 12 15.5 16.5 11"/><path d="M4.5 19.5h15"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4.5 7.5 7.5 5.5 7.5-5.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2.5"/>',
  db: '<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
  file: '<path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5z"/><path d="M13.5 3.5v5h5"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 3.5v3.8h-3.8"/>',
  alert: '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4M12 16.6v.4"/>',
  hour: '<path d="M7 3.5h10M7 20.5h10"/><path d="M8 3.5v3.2c0 2.3 1.6 3.5 3 4.6l1 .7 1-.7c1.4-1.1 3-2.3 3-4.6V3.5M8 20.5v-3.2c0-2.3 1.6-3.5 3-4.6l1-.7 1 .7c1.4 1.1 3 2.3 3 4.6v3.2"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 0 0-5.4 4.9L4 16.5a2 2 0 1 0 2.8 2.8l5.1-5.1a4 4 0 0 0 4.9-5.4L14 11.5l-2.5-2.5z"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  tag: '<path d="M4 4h7l9 9-7 7-9-9z"/><circle cx="8.5" cy="8.5" r="1.3"/>',
  moon: '<path d="M19.5 14.2A8 8 0 0 1 9.8 4.5a8 8 0 1 0 9.7 9.7z"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"/>',
  package: '<path d="m12 3 8 4v10l-8 4-8-4V7z"/><path d="m4 7 8 4 8-4M12 11v10"/>',
};
function I({ n, s = 17, c = "" }: { n: string; s?: number; c?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" className={c} aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: P[n] ?? P.file }} />
  );
}

/* ═══════════════ ZIP-движок (CRC32 + STORE) ═══════════════ */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(d: Uint8Array): number { let c = 0xffffffff; for (let i = 0; i < d.length; i++) c = CRC_T[(c ^ d[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
type ZF = { path: string; content: string };
function makeZip(entries: ZF[]): Blob {
  const enc = new TextEncoder(); const parts: Uint8Array[] = []; const central: Uint8Array[] = [];
  let off = 0; const now = new Date();
  const dosD = (((now.getFullYear() - 1980) & 0x7f) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const dosT = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  for (const e of entries) {
    const name = enc.encode(e.path); const data = enc.encode(e.content); const crc = crc32(data);
    const lh = new Uint8Array(30 + name.length); const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true);
    lv.setUint16(10, dosT, true); lv.setUint16(12, dosD, true); lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, name.length, true);
    lh.set(name, 30); parts.push(lh, data);
    const ch = new Uint8Array(46 + name.length); const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true); cv.setUint16(12, dosT, true); cv.setUint16(14, dosD, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true); cv.setUint32(42, off, true); ch.set(name, 46); central.push(ch);
    off += lh.length + data.length;
  }
  let cs = 0; central.forEach((c) => (cs += c.length));
  const eo = new Uint8Array(22); const ev = new DataView(eo.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cs, true); ev.setUint32(16, off, true);
  return new Blob([...parts, ...central, eo] as BlobPart[], { type: "application/zip" });
}
function dlBlob(b: Blob, name: string) {
  const u = URL.createObjectURL(b); const a = document.createElement("a");
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}
const fmtB = (n: number) => (n < 1024 ? n + " Б" : n < 1048576 ? Math.round(n / 1024) + " КБ" : (n / 1048576).toFixed(1).replace(".", ",") + " МБ");

/* ═══════════════ Манифест пакета ═══════════════ */
const MANIFEST: { path: string; note: string }[] = [
  { path: "Wordtime_cms/index.php", note: "Фронт-контроллер: сайт, REST API, ?admin=1" },
  { path: "Wordtime_cms/install.php", note: "Веб-установщик · самоблокируется после установки" },
  { path: "Wordtime_cms/wt-config-sample.php", note: "Образец конфигурации" },
  { path: "Wordtime_cms/wt-includes/bootstrap.php", note: "Ядро: PDO, хуки, 2FA, кеш, ЧПУ, виджеты, REST" },
  { path: "Wordtime_cms/wt-includes/wp-compat.php", note: "Слой совместимости WordPress API (add_action, get_option, WP_Widget…)" },
  { path: "Wordtime_cms/wt-admin/index.php", note: "Консоль: вход с 2FA, каркас, действия" },
  { path: "Wordtime_cms/wt-admin/screens.php", note: "26 разделов консоли" },
  { path: "Wordtime_cms/wt-content/themes/wordtime-twenty/index.php", note: "Тема: шапка c site_menu, авто-SEO" },
  { path: "Wordtime_cms/wt-content/themes/wordtime-twenty/functions.php", note: "Хуки темы (плагины не грузит)" },
  { path: "Wordtime_cms/wt-content/themes/wordtime-twenty/style.css", note: "Стили стартовой темы" },
  { path: "Wordtime_cms/wt-content/uploads/index.html", note: "Каталог медиафайлов" },
  { path: "Wordtime_cms/wt-content/plugins/index.html", note: "Каталог плагинов" },
  { path: "Wordtime_cms/wt-cron.php", note: "Очередь задач + автоочистка кеша" },
  { path: "Wordtime_cms/nginx-wordtime.conf", note: "Конфиг nginx + php8.3-fpm" },
  { path: "Wordtime_cms/.htaccess", note: "Apache: защита, сжатие, кеш" },
  { path: "Wordtime_cms/README.md", note: "Пошаговая установка" },
];

/* ═══════════════ Утилиты ═══════════════ */
const rnd6 = () => String(Math.floor(100000 + Math.random() * 900000));
const hex = (n: number) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
function useHash() {
  const [h, setH] = useState(() => window.location.hash);
  useEffect(() => {
    const f = () => setH(window.location.hash);
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return h;
}

/* ═══════════════ Тосты ═══════════════ */
type Toast = { id: number; kind: "ok" | "warn" | "err" | "info"; title: string; text?: string };
function Toasts({ list, drop }: { list: Toast[]; drop: (id: number) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-[95] flex flex-col gap-2.5 w-[min(360px,calc(100vw-32px))]">
      {list.map((t) => (
        <div key={t.id} className="anim-slide-right bg-card border border-line rounded-xl shadow-pop overflow-hidden flex">
          <div className={`w-1.5 ${t.kind === "ok" ? "bg-ok" : t.kind === "warn" ? "bg-warn" : t.kind === "err" ? "bg-danger" : "bg-teal-deep"}`} />
          <div className="flex-1 px-4 py-3 flex gap-3">
            <span className={`mt-0.5 w-7 h-7 rounded-full grid place-items-center shrink-0 ${t.kind === "ok" ? "bg-ok/12 text-ok" : t.kind === "warn" ? "bg-warn/12 text-warn" : t.kind === "err" ? "bg-danger/10 text-danger" : "bg-teal-deep/10 text-teal-deep"}`}>
              <I n={t.kind === "ok" ? "check" : t.kind === "info" ? "mail" : "alert"} s={14} />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-ink-900 leading-tight">{t.title}</p>
              {t.text && <p className="text-[12.5px] text-mut mt-0.5 leading-snug">{t.text}</p>}
            </div>
          </div>
          <button onClick={() => drop(t.id)} className="px-3 text-mut hover:text-ink-900 cursor-pointer self-start mt-3"><I n="x" s={13} /></button>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════ Общие UI-детали ═══════════════ */
const inputCls = "w-full h-10 px-3.5 rounded-lg border border-line bg-card text-[14px] text-ink-900 outline-none transition-all placeholder:text-mut/70 focus:border-teal-deep focus:ring-[3px] focus:ring-teal-deep/15";
function Btn({ kind = "primary", sm, className = "", children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "primary" | "ghost" | "danger" | "amber" | "dark"; sm?: boolean }) {
  const k = {
    primary: "bg-teal-deep text-white hover:bg-ink-800 shadow-[0_2px_10px_-3px_rgba(14,147,132,.6)]",
    ghost: "border border-line bg-card text-ink-800 hover:border-teal-deep/60 hover:text-teal-deep",
    danger: "bg-danger text-white hover:bg-[#b91c1c]",
    amber: "bg-amber-brand text-deep hover:bg-amber-deep hover:text-white",
    dark: "bg-deep-2 text-teal-brand hover:bg-deep-line",
  }[kind];
  return <button className={`inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all active:scale-[.97] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${sm ? "text-[12.5px] px-3 h-8" : "text-[13.5px] px-4 h-10"} ${k} ${className}`} {...rest}>{children}</button>;
}
function Toggle({ on, set, dis }: { on: boolean; set: (v: boolean) => void; dis?: boolean }) {
  return (
    <button type="button" disabled={dis} onClick={() => set(!on)}
      className={`relative shrink-0 w-11 h-6.5 rounded-full transition-colors cursor-pointer disabled:opacity-40 ${on ? "bg-teal-deep" : "bg-[#b9c9cc]"}`}>
      <span className={`absolute top-0.5 w-5.5 h-5.5 rounded-full bg-white shadow transition-all ${on ? "left-5" : "left-0.5"}`} />
    </button>
  );
}
function Badge({ tone = "mut", children }: { tone?: "ok" | "warn" | "danger" | "mut" | "teal" | "amber"; children: React.ReactNode }) {
  const c = { ok: "bg-ok/12 text-ok border-ok/25", warn: "bg-warn/12 text-warn border-warn/25", danger: "bg-danger/10 text-danger border-danger/25", mut: "bg-ink-600/8 text-mut border-ink-600/15", teal: "bg-teal-deep/10 text-teal-deep border-teal-deep/25", amber: "bg-amber-brand/15 text-amber-deep border-amber-brand/30" }[tone];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold tracking-wide ${c}`}>{children}</span>;
}
function Card({ title, sub, right, pad = true, children }: { title?: string; sub?: string; right?: React.ReactNode; pad?: boolean; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-line rounded-xl shadow-panel mb-4.5 overflow-hidden anim-fade-up">
      {(title || right) && (
        <header className="px-5.5 pt-4.5 pb-3.5 border-b border-line flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            {title && <h2 className="font-display font-bold text-[15.5px] text-ink-900">{title}</h2>}
            {sub && <p className="text-[12.5px] text-mut mt-0.5">{sub}</p>}
          </div>
          {right}
        </header>
      )}
      <div className={pad ? "px-5.5 py-4.5" : ""}>{children}</div>
    </section>
  );
}

/* ═══════════════ Модель данных демо-консоли ═══════════════ */
type PostT = { id: number; title: string; cat: string; status: "published" | "draft"; date: string; text: string };
type CmtT = { id: number; author: string; text: string; status: "approved" | "pending" | "spam"; post: string };
type PlugT = { file: string; active: boolean };
type KeyT = { id: number; name: string; scopes: string; date: string; fp: string };
type MenuT = { label: string; url: string };

const seedPosts: PostT[] = [
  { id: 1, title: "Wordtime 1.0.5: консоль с выпадающими меню", cat: "Новости", status: "published", date: "12.02.2026", text: "Полная PHP-консоль: 26 разделов, 2FA в ядре, редактор тем и меню сайта прямо из админки." },
  { id: 2, title: "Безопасность из коробки", cat: "Руководства", status: "published", date: "08.02.2026", text: "Обязательная двухфакторная аутентификация, блокировка после 5 неудачных попыток входа, подготовка всех SQL-запросов." },
  { id: 3, title: "REST API для мобильных приложений", cat: "Технологии", status: "published", date: "02.02.2026", text: "Методы /?rest=posts, pages, info, comments и cache. Ключи создаются в консоли, лимит 120 запросов в минуту." },
  { id: 4, title: "Черновик: переезд на новый хостинг", cat: "Без рубрики", status: "draft", date: "14.02.2026", text: "Заметки по миграции: архив, дамп, nginx-wordtime.conf…" },
];
const seedCmts: CmtT[] = [
  { id: 1, author: "Мария", text: "Установила на Timeweb за десять минут, код 2FA пришёл сразу.", status: "approved", post: "Wordtime 1.0.5…" },
  { id: 2, author: "Игорь", text: "А есть ли тёмная тема в консоли?", status: "pending", post: "Wordtime 1.0.5…" },
  { id: 3, author: "buy-followerscheap", text: "Best prices!!! click here >>>", status: "spam", post: "Безопасность из коробки" },
  { id: 4, author: "Дмитрий", text: "REST API работает отлично, подключил Flutter-приложение.", status: "pending", post: "REST API для мобильных приложений" },
];

/* ═══════════════ Экран входа (демо 2FA) ═══════════════ */
function Login({ onOk, toast }: { onOk: (name: string) => void; toast: (k: Toast["kind"], t: string, x?: string) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [code, setCode] = useState("");
  const [real, setReal] = useState("");
  const [err, setErr] = useState("");
  const [fails, setFails] = useState(0);
  const [lock, setLock] = useState(0);
  const [mailIn, setMailIn] = useState(false);
  useEffect(() => {
    if (lock <= 0) return;
    const t = setInterval(() => setLock((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [lock]);

  const submit1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (lock > 0) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || pass.length < 4) {
      const f = fails + 1; setFails(f);
      if (f >= 5) { setLock(60); setFails(0); setErr("Слишком много попыток — вход заблокирован на 60 секунд."); toast("err", "Защита от подбора", "Вход заблокирован на 60 секунд"); }
      else { setErr(`Неверная почта или пароль. Осталось попыток: ${5 - f}.`); }
      return;
    }
    setErr(""); setFails(0);
    const c = rnd6(); setReal(c); setStep(2); setMailIn(false);
    setTimeout(() => setMailIn(true), 700);
  };
  const submit2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === real) { onOk(email.split("@")[0] || "admin"); }
    else { setErr("Неверный код. Проверьте письмо и попробуйте снова."); toast("err", "Код не подошёл", "Проверьте шести-значный код из письма"); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(340px,440px)_1fr] bg-canvas">
      {/* брендовая панель */}
      <div className="relative overflow-hidden bg-deep text-paper blueprint grain flex flex-col p-10 lg:p-12">
        <div className="absolute -left-28 -bottom-32 w-[380px] h-[380px] rounded-full opacity-25 pointer-events-none" style={{ background: "radial-gradient(circle,#14b8a6 0%,transparent 65%)" }} />
        <div className="relative w-[88px] h-[88px] rounded-[22px] grid place-items-center border border-deep-line anim-float" style={{ background: "linear-gradient(150deg,#10424d,#0a2730)", boxShadow: "0 18px 40px -18px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.08)" }}>
          <span className="anim-hourflip text-teal-brand"><I n="hour" s={42} /></span>
        </div>
        <h1 className="relative font-display font-black text-[clamp(26px,3vw,34px)] mt-8 leading-[1.12] text-white">Wordtime</h1>
        <p className="relative text-[14.5px] text-paper/65 mt-3.5 max-w-[330px] leading-relaxed">Вход защищён двухфакторной аутентификацией — код приходит на почту.</p>
        <ul className="relative mt-auto space-y-3">
          {[["shield", "2FA обязательна для каждого входа"], ["zap", "Блокировка после 5 неудачных попыток"], ["plug", "Плагины и темы WordPress-типа"], ["globe", "Быстро. Безопасно. По-русски."]].map(([ic, tx]) => (
            <li key={tx} className="flex gap-3 items-center text-[13.5px] font-medium text-paper/75">
              <i className="w-6.5 h-6.5 shrink-0 rounded-lg bg-teal-brand/15 text-teal-brand grid place-items-center not-italic"><I n={ic} s={13} /></i>{tx}
            </li>
          ))}
        </ul>
      </div>

      {/* форма */}
      <div className="grid place-items-center p-6 relative" style={{ background: "radial-gradient(900px 500px at 80% -10%, var(--wt-teal-soft), transparent 60%), var(--wt-canvas)" }}>
        <div className="w-full max-w-[430px] bg-card border border-line rounded-2xl shadow-pop p-8 anim-scale-in">
          {step === 1 ? (
            <form onSubmit={submit1}>
              <h2 className="font-display font-extrabold text-[20px] text-ink-900">Вход в консоль</h2>
              <p className="text-[13.3px] text-mut mt-1.5 mb-1">После пароля пришлём код подтверждения на почту.</p>
              {err && <div className="alertx mt-3 bg-danger/8 border border-danger/25 text-danger rounded-lg px-3.5 py-2.5 text-[13px] font-semibold flex gap-2 items-center anim-fade"><I n="alert" s={15} />{lock > 0 ? `Заблокировано ещё ${lock} сек.` : err}</div>}
              <label className="block text-[12.8px] font-semibold text-ink-700 mt-4 mb-1.5">Почта</label>
              <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@сайт.ru" required autoFocus />
              <label className="block text-[12.8px] font-semibold text-ink-700 mt-3.5 mb-1.5">Пароль</label>
              <input className={inputCls} type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••••" required />
              <Btn className="w-full mt-5 h-11" disabled={lock > 0}>Продолжить — код придёт на почту</Btn>
              <p className="text-[12px] text-mut mt-4 flex gap-2 items-start leading-snug"><I n="shield" s={14} c="text-teal-deep shrink-0 mt-0.5" />Неверный пароль 5 раз подряд — вход блокируется на 60 секунд. Это живая демонстрация защиты PHP-ядра.</p>
            </form>
          ) : (
            <form onSubmit={submit2}>
              <h2 className="font-display font-extrabold text-[20px] text-ink-900">Подтверждение входа</h2>
              <p className="text-[13.3px] text-mut mt-1.5">Шести-значный код из письма действует 5 минут.</p>
              {mailIn && (
                <div className="mt-4 rounded-xl bg-deep-2 text-paper p-4 anim-slide-right border border-deep-line">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-amber-brand text-deep grid place-items-center"><I n="mail" s={14} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-amber-brand tracking-wider uppercase">Новое письмо</p>
                      <p className="text-[11.5px] text-paper/60 truncate">Wordtime &lt;no-reply@wordtime.ru&gt; → {email}</p>
                    </div>
                    <span className="text-[11px] text-teal-brand font-bold flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-teal-brand" style={{ animation: "wt-pulse-dot 1.4s infinite" }} />сейчас</span>
                  </div>
                  <div className="mt-3 bg-deep rounded-lg border border-dashed border-teal-brand/40 py-2.5 text-center">
                    <span className="font-display font-bold text-[22px] tracking-[.35em] text-teal-brand tabular">{real}</span>
                  </div>
                </div>
              )}
              {err && <div className="mt-3 bg-danger/8 border border-danger/25 text-danger rounded-lg px-3.5 py-2.5 text-[13px] font-semibold flex gap-2 items-center anim-fade"><I n="alert" s={15} />{err}</div>}
              <label className="block text-[12.8px] font-semibold text-ink-700 mt-4 mb-1.5">Код подтверждения</label>
              <input className={inputCls + " font-display font-bold text-[22px] tracking-[.4em] text-center pl-6"} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••••" required autoFocus />
              <Btn className="w-full mt-5 h-11">Подтвердить и войти</Btn>
              <p className="text-center mt-3.5"><button type="button" onClick={() => { setStep(1); setCode(""); setErr(""); setMailIn(false); }} className="text-[12.5px] font-bold text-mut hover:text-teal-deep cursor-pointer">Отмена — другой пользователь</button></p>
            </form>
          )}
        </div>
        <p className="absolute bottom-5 text-[12px] text-mut">Wordtime CMS 1.0.5 · PHP 7.4–8.3 · MariaDB · предпросмотр консоли</p>
      </div>
    </div>
  );
}

/* ═══════════════ Меню консоли (как в PHP-версии) ═══════════════ */
type MItem = { k: string; l: string; i: string; cnt?: string; dot?: boolean; fly?: { t: string; l: string }[] };
const MENU: { sec: string; items: MItem[] }[] = [
  { sec: "УПРАВЛЕНИЕ", items: [
    { k: "", l: "Консоль", i: "dash", fly: [{ t: "", l: "Главная" }, { t: "events", l: "События" }] },
    { k: "updates", l: "Обновления", i: "refresh", dot: true },
    { k: "posts", l: "Записи", i: "pin", cnt: "1 черн.", fly: [{ t: "posts", l: "Все записи" }, { t: "posts&new=1", l: "Добавить новую" }, { t: "categories", l: "Рубрики" }, { t: "tags", l: "Метки" }] },
    { k: "media", l: "Медиафайлы", i: "image", fly: [{ t: "media", l: "Библиотека" }, { t: "media&new=1", l: "Добавить новый" }] },
    { k: "pages", l: "Страницы", i: "pages", fly: [{ t: "pages", l: "Все страницы" }, { t: "pages&new=1", l: "Добавить новую" }] },
    { k: "comments", l: "Комментарии", i: "comment", cnt: "2" },
  ] },
  { sec: "ДИЗАЙН", items: [
    { k: "themes", l: "Внешний вид", i: "palette", fly: [{ t: "themes", l: "Темы" }, { t: "theme-new", l: "Добавить новую" }, { t: "menus", l: "Меню" }, { t: "widgets", l: "Виджеты" }, { t: "theme-editor", l: "Редактор тем" }] },
    { k: "plugins", l: "Плагины", i: "plug", fly: [{ t: "plugins", l: "Установленные" }, { t: "plugin-new", l: "Добавить новый" }] },
  ] },
  { sec: "СИСТЕМА", items: [
    { k: "users", l: "Пользователи", i: "users", fly: [{ t: "users", l: "Все пользователи" }, { t: "users&new=1", l: "Добавить нового" }, { t: "profile", l: "Ваш профиль" }] },
    { k: "import", l: "Инструменты", i: "wrench", fly: [{ t: "import", l: "Импорт" }, { t: "export", l: "Экспорт" }, { t: "migration", l: "Миграция сайта" }] },
    { k: "perf", l: "Оптимизация", i: "zap", fly: [{ t: "perf", l: "Скорость и кеш" }, { t: "images", l: "Изображения" }, { t: "sitemap", l: "Sitemap" }, { t: "seo", l: "SEO-заголовки" }, { t: "api", l: "Мобильные приложения и API" }] },
    { k: "settings", l: "Настройки", i: "gear", fly: [{ t: "settings", l: "Общие" }, { t: "settings&tab=comments", l: "Обсуждение" }, { t: "settings&tab=cache", l: "Кеш и скорость" }, { t: "settings&tab=permalinks", l: "Постоянные ссылки" }, { t: "settings&tab=security", l: "Безопасность и 2FA" }, { t: "settings&tab=backups", l: "Резервные копии" }, { t: "settings&tab=login", l: "Страница входа" }] },
    { k: "hosting", l: "Установка на хостинг", i: "globe" },
    { k: "health", l: "Здоровье системы", i: "pulse" },
  ] },
];
const TITLES: Record<string, [string, string]> = {
  "": ["Консоль", "Сводка сайта — всё важное на одном экране"],
  posts: ["Записи", "Публикация, черновики, редактирование"],
  pages: ["Страницы", "Статичные разделы сайта"],
  comments: ["Комментарии", "Модерация: одобрение, спам, удаление"],
  media: ["Медиафайлы", "Библиотека с GD-оптимизацией при загрузке"],
  themes: ["Темы", "Оформление сайта — активная тема применяется мгновенно"],
  "theme-new": ["Добавить тему", "Каталог тем WordPress.org — установка и активация, как в WordPress"],
  widgets: ["Виджеты", "Области темы — сайдбар и подвал: добавление, настройка, порядок"],
  menus: ["Меню", "Пункты навигации в шапке сайта — порядок и состав"],
  "theme-editor": ["Редактор тем", "Файлы активной темы — правки применяются сразу"],
  plugins: ["Плагины", "Расширения ядра через хуки wt_add_action / wt_add_filter"],
  "plugin-new": ["Добавить плагин", "Загрузка .php-расширения в каталог плагинов"],
  users: ["Пользователи", "Учётные записи и роли — вход только с кодом 2FA"],
  profile: ["Ваш профиль", "Личные данные и смена пароля"],
  categories: ["Рубрики", "Разделы сайта, по которым группируются записи"],
  tags: ["Метки", "Сквозные теги записей"],
  import: ["Импорт", "Перенос данных: дамп SQL и экспорт WordPress"],
  export: ["Экспорт", "Выгрузка: полный архив, дамп базы, sitemap"],
  migration: ["Миграция сайта", "Переезд на другой хостинг — аналог All-in-One WP Migration"],
  perf: ["Скорость и кеш", "Страничный кеш, автоочистка, показатели под нагрузкой"],
  images: ["Изображения", "Автоматическая оптимизация загружаемых изображений (GD)"],
  sitemap: ["Sitemap", "Карта сайта для поисковиков — генерируется автоматически"],
  seo: ["SEO-заголовки", "Title и description — автоматически в <head> каждой страницы"],
  api: ["Мобильные приложения и API", "REST API для Android, iOS и любых клиентов"],
  settings: ["Настройки", "Общие, обсуждение, кеш, безопасность, копии, страница входа"],
  hosting: ["Установка на хостинг", "nginx или Apache + PHP 7.4–8.3 + MySQL/MariaDB"],
  health: ["Здоровье системы", "Проверка окружения хостинга, базы и файлов"],
  events: ["События", "Полный журнал действий: входы, правки, безопасность"],
  updates: ["Обновления", "Версия ядра, журнал изменений, проверка актуальности"],
};

/* ═══════════════ Экраны консоли ═══════════════ */
type Store = {
  posts: PostT[]; cmts: CmtT[]; plugins: PlugT[]; keys: KeyT[]; menu: MenuT[];
  siteTitle: string; tagline: string; adminEmail: string;
  commentsOff: boolean; moderate: boolean; cacheOn: boolean; imgAuto: boolean;
  titleTpl: string; descTpl: string;
  backups: { name: string; size: number; date: string; kind: string }[];
  log: string[];
  widgetAreas: { id: string; name: string; items: { type: string; title: string; text: string }[] }[];
  media: { id: number; name: string; grad: string }[];
};

const DEMO_MEDIA: { id: number; name: string; grad: string }[] = [
  { id: 1, name: "server-room.jpg", grad: "linear-gradient(140deg,#0d3039,#14b8a6 130%)" },
  { id: 2, name: "keyboard-code.jpg", grad: "linear-gradient(140deg,#071b21,#f0b429 150%)" },
  { id: 3, name: "ink-teal.jpg", grad: "linear-gradient(140deg,#134450,#2dd4bf 140%)" },
  { id: 4, name: "diagram.png", grad: "linear-gradient(140deg,#0c2e36,#3d7c8c 150%)" },
];
const W_TYPES: Record<string, string> = { text: "Текст", html: "Произвольный HTML", search: "Поиск", recent: "Свежие записи", categories: "Рубрики", menu: "Меню" };

function StatCard({ ic, n, label, bg, fg, delay }: { ic: string; n: number; label: string; bg: string; fg: string; delay: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const step = (ts: number) => { const k = Math.min(1, (ts - t0) / 650); setV(Math.round(n * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); };
    const to = setTimeout(() => { raf = requestAnimationFrame(step); }, delay);
    return () => { clearTimeout(to); cancelAnimationFrame(raf); };
  }, [n, delay]);
  return (
    <div className="stat bg-card border border-line rounded-xl p-4 hover:-translate-y-0.5 hover:shadow-panel transition-all anim-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <span className="w-8.5 h-8.5 rounded-[10px] grid place-items-center mb-2.5" style={{ background: bg, color: fg }}><I n={ic} s={16} /></span>
      <b className="block font-display font-extrabold text-[24px] text-ink-900 tabular">{v}</b>
      <span className="block mt-1 text-[11.5px] font-semibold text-mut">{label}</span>
    </div>
  );
}

function Screens({ st, set, route, toast }: { st: Store; set: (fn: (s: Store) => Store) => void; route: string; toast: (k: Toast["kind"], t: string, x?: string) => void }) {
  const page = route.split("&")[0];
  const tabM = route.match(/tab=([a-z-]+)/); const tab = tabM ? tabM[1] : "";
  const [editing, setEditing] = useState<PostT | null>(null);
  const [form, setForm] = useState({ title: "", cat: "Новости", text: "" });
  const [pub, setPub] = useState({ status: "published", visibility: "public", password: "", date: "" });
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaSel, setMediaSel] = useState<number | null>(null);
  const [perm, setPerm] = useState("");
  const [wpQuery, setWpQuery] = useState("");
  const [wpItems, setWpItems] = useState<{ name: string; slug: string; desc: string; meta: string; icon?: string; shot?: string }[] | null>(null);
  const [wpBusy, setWpBusy] = useState(false);
  const [wpInstalling, setWpInstalling] = useState<string | null>(null);
  const [selMedia, setSelMedia] = useState<number | null>(null);

  /* Живой поиск по каталогу WordPress.org (публичное API, CORS разрешён) */
  const wpSearch = useCallback(async (kind: "plugins" | "themes", q: string) => {
    setWpBusy(true); setWpItems(null);
    try {
      const fields = kind === "plugins" ? "download_link&request[fields][icons]=1&request[fields][active_installs]=1" : "download_link&request[fields][screenshot_url]=1";
      const r = await fetch(`https://api.wordpress.org/${kind}/info/1.2/?action=${kind === "plugins" ? "query_plugins" : "query_themes"}&request[search]=${encodeURIComponent(q)}&request[per_page]=12&request[fields][${fields}`);
      const j = await r.json();
      const raw = (kind === "plugins" ? j.plugins : j.themes) ?? [];
      setWpItems(raw.map((p: Record<string, unknown>) => ({
        name: String(p.name ?? "").replace(/<[^>]+>/g, ""),
        slug: String(p.slug ?? ""),
        desc: String((p.short_description ?? p.description ?? "") as string).replace(/<[^>]+>/g, "").slice(0, 180),
        meta: kind === "plugins"
          ? `${(((p.active_installs ?? 0) as number) >= 1e6 ? (((p.active_installs ?? 0) as number) / 1e6).toFixed(1) + " млн" : Math.round(((p.active_installs ?? 0) as number) / 1e3) + " тыс.")} активных`
          : `рейтинг ${Math.round(((p.rating ?? 0) as number) / 20)}★`,
        icon: ((p.icons ?? {}) as Record<string, string>)["1x"] || ((p.icons ?? {}) as Record<string, string>)["default"],
        shot: p.screenshot_url as string | undefined,
      })));
    } catch {
      /* офлайн-фолбэк, чтобы каталог был виден всегда */
      setWpItems((kind === "plugins"
        ? [["Classic Editor", "Возвращает классический редактор записей"], ["WP Super Cache", "Статический кеш страниц для высоких нагрузок"], ["Contact Form 7", "Простые и гибкие контактные формы"], ["Wordfence Security", "Файрвол и сканер безопасности"], ["Yoast SEO", "SEO-оптимизация: заголовки, sitemap, анализ"], ["UpdraftPlus", "Резервные копии по расписанию"]]
        : [["Astra", "Быстрая и лёгкая тема с готовыми сайтами"], ["OceanWP", "Гибкая тема для магазинов и блогов"], ["Kadence", "Современная блочная тема"], ["Neve", "Минималистичная тема для старта"]]).map(([name, desc]) => ({ name, slug: name.toLowerCase().replace(/\s+/g, "-"), desc, meta: "каталог WP" })));
      toast("info", "Работаем офлайн", "Показан демо-список каталога");
    }
    setWpBusy(false);
  }, [toast]);

  const wpInstall = (kind: "plugins" | "themes", it: { name: string; slug: string }) => {
    setWpInstalling(it.slug);
    setTimeout(() => {
      if (kind === "plugins") set((s) => ({ ...s, plugins: [{ file: it.slug + ".php", active: false }, ...s.plugins], log: [`Плагин «${it.name}» установлен из каталога WordPress.org`, ...s.log] }));
      else toast("ok", "Тема установлена", `«${it.name}» появилась в разделе Темы — активируйте её`);
      setWpInstalling(null);
      toast("ok", kind === "plugins" ? "Плагин установлен" : "Тема установлена", "Скачивание и распаковка завершены");
    }, 1200);
  };

  const sqlDump = useMemo(() => {
    let s = `-- Wordtime CMS 1.0.5 — дамп базы (демо)\nSET NAMES utf8mb4;\n\n`;
    st.posts.forEach((p) => { s += `INSERT INTO wt_posts (post_title, category, post_status) VALUES ('${p.title.replace(/'/g, "\\'")}', '${p.cat}', '${p.status}');\n`; });
    st.cmts.forEach((c) => { s += `INSERT INTO wt_comments (author, text, status) VALUES ('${c.author.replace(/'/g, "\\'")}', '${c.text.replace(/'/g, "\\'")}', '${c.status}');\n`; });
    return s;
  }, [st.posts, st.cmts]);

  const sitemapXml = useMemo(() => {
    let x = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://ваш-домен.ru/</loc><priority>1.0</priority></url>\n`;
    st.posts.filter((p) => p.status === "published").forEach((p) => { x += `  <url><loc>https://ваш-домен.ru/?p=post:${p.id}</loc><priority>0.8</priority></url>\n`; });
    return x + `</urlset>`;
  }, [st.posts]);

  /* ── Записи: редактор ── */
  if (page === "posts" && (route.includes("new=1") || editing)) {
    const p = editing;
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        set((s) => p
          ? { ...s, posts: s.posts.map((x) => x.id === p.id ? { ...x, title: form.title, cat: form.cat, text: form.text } : x), log: [`Запись #${p.id} обновлена`, ...s.log] }
          : { ...s, posts: [{ id: Math.max(0, ...s.posts.map((x) => x.id)) + 1, title: form.title, cat: form.cat, status: "published", date: new Date().toLocaleDateString("ru-RU"), text: form.text }, ...s.posts], log: [`Создана запись «${form.title}»`, ...s.log] });
        toast("ok", "Запись сохранена"); setEditing(null); setForm({ title: "", cat: "Новости", text: "" });
      }}>
        {/* Медиамодаль — вставка изображения из библиотеки, как в WordPress */}
        {mediaOpen && (
          <div className="fixed inset-0 z-[120] bg-deep/70 grid place-items-center p-5" onClick={() => setMediaOpen(false)}>
            <div className="bg-card border border-line rounded-2xl max-w-[720px] w-full max-h-[82vh] flex flex-col overflow-hidden shadow-pop anim-scale-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-line">
                <h2 className="font-display font-bold text-[15px] text-ink-900 m-0">Медиафайлы</h2>
                <span className="text-[12.5px] text-mut">выберите изображение для вставки</span>
                <button className="ml-auto w-8 h-8 grid place-items-center rounded-lg text-mut hover:bg-paper cursor-pointer" onClick={() => setMediaOpen(false)}><I n="x" s={15} /></button>
              </div>
              <div className="overflow-y-auto p-5 grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2.5">
                {st.media.map((m) => (
                  <button key={m.id} onClick={() => setMediaSel(m.id)}
                    className={`h-[86px] rounded-xl overflow-hidden border-2 cursor-pointer transition-all hover:-translate-y-0.5 ${mediaSel === m.id ? "border-teal-deep ring-[3px] ring-teal-deep/20" : "border-line"}`}
                    style={{ background: m.grad }} title={m.name}>
                    <span className="w-full h-full grid place-items-center text-white/70"><I n="image" s={22} /></span>
                  </button>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-line flex gap-2.5 items-center flex-wrap">
                <span className="text-[12.5px] text-mut flex-1">{mediaSel ? st.media.find((m) => m.id === mediaSel)?.name : "ничего не выбрано"}</span>
                <Btn kind="ghost" sm type="button" onClick={() => { set((s) => ({ ...s, media: [...s.media, { id: Date.now(), name: `foto-${s.media.length + 1}.jpg`, grad: `linear-gradient(140deg,#0d3039,#14b8a6 ${120 + s.media.length * 10}%)` }] })); toast("ok", "Файл загружен", "Изображение оптимизировано (GD) и добавлено в библиотеку"); }}><I n="dl" s={14} />Загрузить (демо)</Btn>
                <Btn sm type="button" disabled={!mediaSel} onClick={() => {
                  const m = st.media.find((x) => x.id === mediaSel); if (!m) return;
                  setForm((f) => ({ ...f, text: f.text + (f.text ? "\n\n" : "") + `<img src="/wt-content/uploads/${m.name}" alt="${m.name.replace(/\.[a-z]+$/i, "")}">` }));
                  setMediaOpen(false); toast("ok", "Изображение вставлено", "Тег img добавлен в текст записи");
                }}><I n="check" s={14} />Вставить в запись</Btn>
              </div>
            </div>
          </div>
        )}
        <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
          <Card pad>
            <label className="block text-[12.8px] font-semibold text-ink-700 mb-1.5">Заголовок</label>
            <input className={inputCls + " text-[16px] font-bold"} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Заголовок записи" required autoFocus />
            <label className="block text-[12.8px] font-semibold text-ink-700 mt-4 mb-1.5">Текст записи</label>
            <textarea className={inputCls + " h-56 py-3 resize-y leading-relaxed"} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Абзацы разделяйте пустой строкой…" />
            <p className="mt-3"><Btn kind="ghost" sm type="button" onClick={() => { setMediaSel(null); setMediaOpen(true); }}><I n="image" s={14} />Вставить изображение из медиафайлов</Btn></p>
          </Card>
          <div>
            <Card title="Публикация" sub="Настройки — как в WordPress" pad>
              <div className="flex justify-between items-center gap-3 py-2 border-b border-dashed border-line text-[13px]">
                <b className="font-semibold text-mut">Статус</b>
                <select className={inputCls + " h-8 w-auto text-[12.5px] py-0"} value={pub.status} onChange={(e) => setPub({ ...pub, status: e.target.value })}>
                  <option value="published">Опубликовано</option><option value="draft">Черновик</option>
                </select>
              </div>
              <div className="py-2 border-b border-dashed border-line text-[13px]">
                <b className="font-semibold text-mut block mb-1.5">Видимость</b>
                {([["public", "Для всех"], ["password", "Защищена паролем"], ["private", "Приватная (только админ)"]] as const).map(([k, l]) => (
                  <label key={k} className="flex gap-2 items-center my-1 cursor-pointer font-medium">
                    <input type="radio" className="w-auto" checked={pub.visibility === k} onChange={() => setPub({ ...pub, visibility: k })} />{l}
                  </label>
                ))}
                {pub.visibility === "password" && <input className={inputCls + " h-8 mt-2 text-[12.5px]"} placeholder="Пароль записи" value={pub.password} onChange={(e) => setPub({ ...pub, password: e.target.value })} />}
              </div>
              <div className="py-2 text-[13px]">
                <b className="font-semibold text-mut block mb-1.5">Дата публикации</b>
                <input type="datetime-local" className={inputCls + " h-8 text-[12.5px]"} value={pub.date} onChange={(e) => setPub({ ...pub, date: e.target.value })} />
                <p className="text-[11.5px] text-mut mt-1.5">{pub.date && new Date(pub.date).getTime() > Date.now() ? <b className="text-warn">Запланирована: {new Date(pub.date).toLocaleString("ru-RU")}</b> : "Пусто — опубликовать сразу"}</p>
              </div>
              <div className="flex gap-2 mt-3">
                <Btn type="submit"><I n="check" s={15} />Сохранить</Btn>
                <Btn kind="ghost" type="button" onClick={() => { setEditing(null); setForm({ title: "", cat: "Новости", text: "" }); }}>Отмена</Btn>
              </div>
            </Card>
            <Card title="Рубрика" pad>
              <select className={inputCls} value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
                {["Новости", "Руководства", "Технологии", "Без рубрики"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Card>
          </div>
        </div>
      </form>
    );
  }

  switch (page) {
    case "": return (
      <>
        <div className="relative overflow-hidden rounded-2xl text-paper p-7 mb-5 border border-deep-line anim-fade-up" style={{ background: "linear-gradient(140deg,#071b21,#0d323c 60%,#10424d)" }}>
          <div className="absolute inset-0 blueprint opacity-60 pointer-events-none" />
          <h2 className="relative font-display font-extrabold text-[clamp(19px,2.4vw,25px)] text-white">С днём работы, администратор!</h2>
          <p className="relative mt-2 text-[13.8px] text-paper/65 max-w-[560px]">Wordtime 1.0.5 работает на PHP 8.3. Записи, комментарии, резервные копии и REST API — под рукой. Это предпросмотр: настоящая консоль живёт на вашем хостинге по адресу <b className="text-teal-brand">?admin=1</b>.</p>
          <div className="relative flex gap-2.5 mt-5 flex-wrap">
            <Btn kind="amber" onClick={() => { setEditing(null); setForm({ title: "", cat: "Новости", text: "" }); location.hash = "#posts&new=1"; }}><I n="plus" s={15} />Написать запись</Btn>
            <a className="inline-flex items-center gap-2 font-semibold rounded-lg text-[13.5px] px-4 h-10 bg-deep-2 text-teal-brand hover:bg-deep-line transition-all" href="#/download"><I n="dl" s={15} />Wordtime_cms.zip</a>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5 mb-5">
          <StatCard ic="pin" n={st.posts.length} label="Записей" bg="#e2f5f2" fg="#0b7a6e" delay={0} />
          <StatCard ic="pages" n={3} label="Страниц" bg="#eef2f3" fg="#33525b" delay={60} />
          <StatCard ic="comment" n={st.cmts.filter((c) => c.status === "approved").length} label="Комментариев" bg="#e5f5ec" fg="#137a43" delay={120} />
          <StatCard ic="alert" n={st.cmts.filter((c) => c.status === "pending").length} label="Ждут модерации" bg="#fdf1d7" fg="#92610a" delay={180} />
          <StatCard ic="users" n={1} label="Пользователей" bg="#e2f5f2" fg="#0b7a6e" delay={240} />
          <StatCard ic="image" n={4} label="Медиафайлов" bg="#eef2f3" fg="#33525b" delay={300} />
        </div>
        <div className="grid lg:grid-cols-[1.25fr_1fr] gap-4 items-start">
          <Card title="Последние записи" right={<Btn kind="ghost" sm onClick={() => location.hash = "#posts"}>Все</Btn>} pad={false}>
            <table className="w-full text-[13.8px]">
              <tbody>
                {st.posts.slice(0, 4).map((p) => (
                  <tr key={p.id} className="border-b border-line/70 last:border-0 hover:bg-paper transition-colors">
                    <td className="px-5.5 py-3.5"><b className="text-ink-900">{p.title}</b><br /><span className="text-[12px] text-mut">{p.text.slice(0, 52)}…</span></td>
                    <td className="px-3 py-3.5 whitespace-nowrap">{p.status === "published" ? <Badge tone="ok">Опубликовано</Badge> : <Badge>Черновик</Badge>}</td>
                    <td className="px-3 py-3.5 text-[12.5px] text-mut whitespace-nowrap">{p.date}</td>
                    <td className="px-4 py-3.5"><Btn kind="ghost" sm onClick={() => { setEditing(p); setForm({ title: p.title, cat: p.cat, text: p.text }); location.hash = "#posts&edit=" + p.id; }}>Изменить</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div>
            <Card title="Журнал активности" pad={false}>
              <div className="px-5 py-4"><div className="logbox bg-deep text-[#bfe0da] rounded-xl p-4 font-mono text-[12.5px] leading-[1.85] max-h-52 overflow-auto dark-scroll">
                {st.log.slice(0, 8).map((l, i) => <p key={i} className={i === 0 ? "anim-fade" : ""}><span className="text-[#54808a]">[{new Date().toLocaleDateString("ru-RU")}]</span> {l}</p>)}
              </div></div>
            </Card>
            <Card title="Состояние" pad>
              {[["Версия ядра", "Wordtime 1.0.5"], ["PHP", "8.3 — отлично"], ["Кеш", st.cacheOn ? "включён · 128 КБ" : "отключён"], ["Комментарии", st.commentsOff ? "отключены" : "включены"]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-2.5 border-b border-dashed border-line last:border-0 text-[13.5px]"><b className="font-semibold text-mut">{k}</b><span className="font-bold text-ink-800 text-right">{v}</span></div>
              ))}
            </Card>
          </div>
        </div>
      </>
    );

    case "posts": return (
      <>
        <p className="mb-4"><Btn onClick={() => { setEditing(null); setForm({ title: "", cat: "Новости", text: "" }); location.hash = "#posts&new=1"; }}><I n="plus" s={15} />Добавить запись</Btn></p>
        <Card pad={false}>
          <table className="w-full text-[13.8px]">
            <thead><tr className="bg-paper text-left text-mut text-[11px] uppercase tracking-[0.12em]"><th className="px-5.5 py-3 font-bold">Заголовок</th><th className="px-3 py-3 font-bold">Рубрика</th><th className="px-3 py-3 font-bold">Статус</th><th className="px-3 py-3 font-bold">Дата</th><th className="px-4 py-3" /></tr></thead>
            <tbody>
              {st.posts.map((p) => (
                <tr key={p.id} className="border-b border-line/70 last:border-0 hover:bg-paper transition-colors">
                  <td className="px-5.5 py-3.5"><b className="text-ink-900">{p.title}</b><br /><span className="text-[12px] text-mut">{p.text.slice(0, 60)}…</span></td>
                  <td className="px-3 py-3.5"><Badge tone="teal">{p.cat}</Badge></td>
                  <td className="px-3 py-3.5">{p.status === "published" ? <Badge tone="ok">Опубликовано</Badge> : <Badge>Черновик</Badge>}</td>
                  <td className="px-3 py-3.5 text-mut whitespace-nowrap">{p.date}</td>
                  <td className="px-4 py-3.5"><div className="flex gap-2 justify-end">
                    <Btn kind="ghost" sm onClick={() => { setEditing(p); setForm({ title: p.title, cat: p.cat, text: p.text }); location.hash = "#posts&edit=" + p.id; }}>Изменить</Btn>
                    <Btn kind="danger" sm onClick={() => { set((s) => ({ ...s, posts: s.posts.filter((x) => x.id !== p.id), log: [`Запись #${p.id} удалена`, ...s.log] })); toast("ok", "Запись удалена"); }}><I n="trash" s={13} /></Btn>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </>
    );

    case "comments": {
      const tabs = [["all", "Все"], ["pending", "Ожидают"], ["approved", "Одобренные"], ["spam", "Спам"]] as const;
      const cur = (tab || "all") as string;
      const list = st.cmts.filter((c) => cur === "all" || c.status === cur);
      return (
        <>
          {st.commentsOff && <div className="alertx mb-4 bg-warn/8 border border-warn/25 text-warn rounded-xl px-4 py-3 text-[13.5px] font-semibold flex gap-2.5 items-center anim-fade"><I n="alert" s={16} />Комментарии на сайте <b>отключены</b> в настройках — новые не принимаются.</div>}
          <div className="inline-flex gap-1 bg-paper border border-line p-1 rounded-xl mb-4 flex-wrap">
            {tabs.map(([k, l]) => (
              <button key={k} onClick={() => { location.hash = "#comments" + (k !== "all" ? "&tab=" + k : ""); }}
                className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${cur === k ? "bg-deep-2 text-white shadow" : "text-mut hover:text-ink-900"}`}>
                {l} · {k === "all" ? st.cmts.length : st.cmts.filter((c) => c.status === k).length}
              </button>
            ))}
          </div>
          <Card pad={false}>
            <table className="w-full text-[13.8px]">
              <thead><tr className="bg-paper text-left text-mut text-[11px] uppercase tracking-[0.12em]"><th className="px-5.5 py-3 font-bold">Автор</th><th className="px-3 py-3 font-bold">Комментарий</th><th className="px-3 py-3 font-bold">Статус</th><th className="px-4 py-3" /></tr></thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-b border-line/70 last:border-0 hover:bg-paper transition-colors">
                    <td className="px-5.5 py-3.5 whitespace-nowrap"><b className="text-ink-900">{c.author}</b><br /><span className="text-[12px] text-mut">к «{c.post}»</span></td>
                    <td className="px-3 py-3.5 max-w-[320px]"><span className="block truncate text-ink-800">{c.text}</span></td>
                    <td className="px-3 py-3.5">{c.status === "approved" ? <Badge tone="ok">Одобрен</Badge> : c.status === "pending" ? <Badge tone="warn">Ожидает</Badge> : <Badge tone="danger">Спам</Badge>}</td>
                    <td className="px-4 py-3.5"><div className="flex gap-2 justify-end flex-wrap">
                      {c.status !== "approved" && <Btn kind="ghost" sm onClick={() => { set((s) => ({ ...s, cmts: s.cmts.map((x) => x.id === c.id ? { ...x, status: "approved" as const } : x) })); toast("ok", "Комментарий одобрен"); }}><I n="check" s={13} />Одобрить</Btn>}
                      {c.status !== "spam" && <Btn kind="ghost" sm onClick={() => { set((s) => ({ ...s, cmts: s.cmts.map((x) => x.id === c.id ? { ...x, status: "spam" as const } : x) })); toast("warn", "Помечен как спам"); }}>В спам</Btn>}
                      <Btn kind="danger" sm onClick={() => { set((s) => ({ ...s, cmts: s.cmts.filter((x) => x.id !== c.id) })); toast("ok", "Комментарий удалён"); }}><I n="trash" s={13} /></Btn>
                    </div></td>
                  </tr>
                ))}
                {list.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-mut">Комментариев нет.</td></tr>}
              </tbody>
            </table>
          </Card>
        </>
      );
    }

    case "plugins": return (
      <>
        <Card pad={false} title="Установленные плагины" sub="Активные подключает только ядро (wt_load_plugins) — переключатель настоящий" right={<Btn sm onClick={() => { location.hash = "#plugin-new"; }}><I n="plus" s={14} />Добавить новый</Btn>}>
          <table className="w-full text-[13.8px]">
            <tbody>
              {st.plugins.map((p) => (
                <tr key={p.file} className="border-b border-line/70 last:border-0 hover:bg-paper transition-colors">
                  <td className="px-5.5 py-4"><span className="flex items-center gap-3">
                    <span className={`w-9 h-9 shrink-0 rounded-[10px] grid place-items-center ${p.active ? "bg-teal-deep/10 text-teal-deep" : "bg-paper text-mut"}`}><I n="plug" s={17} /></span>
                    <span><b className="text-ink-900 font-mono text-[13px]">{p.file}</b><br /><span className="text-[12px] text-mut">Файл в каталоге плагинов</span></span>
                  </span></td>
                  <td className="px-3 py-4">{p.active ? <Badge tone="ok">Активен</Badge> : <Badge>Отключён</Badge>}</td>
                  <td className="px-4 py-4 text-right"><Btn kind={p.active ? "ghost" : "amber"} sm onClick={() => { set((s) => ({ ...s, plugins: s.plugins.map((x) => x.file === p.file ? { ...x, active: !x.active } : x), log: [`Плагин ${p.file} ${p.active ? "отключён" : "активирован"}`, ...s.log] })); toast(p.active ? "warn" : "ok", `Плагин ${p.active ? "отключён" : "активирован"}`); }}>{p.active ? "Отключить" : "Активировать"}</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Совместимость с WordPress" pad>
          <p className="text-[13.5px] text-mut leading-relaxed">Единое API хуков: <code className="text-[12.5px] bg-paper border border-line rounded px-1.5 py-0.5 font-mono">wt_add_action()</code>, <code className="text-[12.5px] bg-paper border border-line rounded px-1.5 py-0.5 font-mono">wt_add_filter()</code>. Действия: <b>wt_head</b>, <b>wt_queue_*</b>; фильтры: <b>wt_title</b>, <b>wt_description</b>, <b>wt_excerpt_length</b>.</p>
        </Card>
      </>
    );

    case "settings": {
          const tabs = [["", "Общие"], ["comments", "Обсуждение"], ["cache", "Кеш и скорость"], ["permalinks", "Постоянные ссылки"], ["security", "Безопасность и 2FA"], ["backups", "Резервные копии"], ["login", "Страница входа"]] as const;      return (
        <>
          <div className="inline-flex gap-1 bg-paper border border-line p-1 rounded-xl mb-4 flex-wrap">
            {tabs.map(([k, l]) => (
              <button key={k || "g"} onClick={() => { location.hash = "#settings" + (k ? "&tab=" + k : ""); }}
                className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${tab === k ? "bg-deep-2 text-white shadow" : "text-mut hover:text-ink-900"}`}>{l}</button>
            ))}
          </div>
          {(tab === "" || tab === "general") && (
            <Card title="Общие настройки" sub="Название сайта показывается в консоли, на странице входа и в браузере посетителя" pad>
              <div className="grid sm:grid-cols-2 gap-x-5">
                <div><label className="block text-[12.8px] font-semibold text-ink-700 mt-1 mb-1.5">Название сайта</label><input className={inputCls} value={st.siteTitle} onChange={(e) => set((s) => ({ ...s, siteTitle: e.target.value }))} /></div>
                <div><label className="block text-[12.8px] font-semibold text-ink-700 mt-1 mb-1.5">Краткое описание</label><input className={inputCls} value={st.tagline} onChange={(e) => set((s) => ({ ...s, tagline: e.target.value }))} /></div>
                <div><label className="block text-[12.8px] font-semibold text-ink-700 mt-3.5 mb-1.5">Почта администратора</label><input className={inputCls} value={st.adminEmail} onChange={(e) => set((s) => ({ ...s, adminEmail: e.target.value }))} /></div>
                <div><label className="block text-[12.8px] font-semibold text-ink-700 mt-3.5 mb-1.5">Язык сайта</label><input className={inputCls + " opacity-60"} value="Русский (зафиксировано)" readOnly /></div>
              </div>
              <div className="mt-4"><Btn onClick={() => toast("ok", "Настройки сохранены", "Изменения применены ко всему сайту")}>Сохранить изменения</Btn></div>
            </Card>
          )}
          {tab === "comments" && (
            <Card title="Отключение комментариев" sub="Главный переключатель комментирования для всего сайта" pad>
              <div className={`flex items-start gap-4 p-5 rounded-xl border-2 transition-all ${st.commentsOff ? "border-warn/40 bg-warn/6" : "border-teal-deep/30 bg-teal-soft/40"}`}>
                <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${st.commentsOff ? "bg-warn/15 text-warn" : "bg-teal-deep/12 text-teal-deep"}`}><I n="comment" s={21} /></span>
                <div className="flex-1">
                  <p className="font-bold text-[15px] text-ink-900">Отключение комментариев</p>
                  <p className="text-[13px] text-mut mt-1">{st.commentsOff ? "Комментарии выключены: форма скрыта на всех записях, новые не принимаются." : "Комментарии включены: новые попадают в очередь модерации."}</p>
                </div>
                <Toggle on={!st.commentsOff} set={(v) => { set((s) => ({ ...s, commentsOff: !v, log: [v ? "Комментарии включены" : "Комментарии отключены на всём сайте", ...s.log] })); toast(v ? "ok" : "warn", v ? "Комментарии включены" : "Комментарии отключены"); }} />
              </div>
              <div className={`mt-5 space-y-4 transition-opacity ${st.commentsOff ? "opacity-45 pointer-events-none" : ""}`}>
                <div className="flex items-center gap-4"><div className="flex-1"><p className="text-[14px] font-bold text-ink-900">Отправлять новые комментарии на модерацию</p></div><Toggle on={st.moderate} set={(v) => set((s) => ({ ...s, moderate: v }))} /></div>
                <div className="flex items-center gap-4"><div className="flex-1"><p className="text-[14px] font-bold text-ink-900">Требовать имя и почту</p></div><Toggle on set={() => undefined} /></div>
              </div>
            </Card>
          )}
          {tab === "cache" && (
            <>
              <Card title="Страничный кеш" sub="WT-Кеш собирает страницы один раз и отдаёт их мгновенно" pad>
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex-1"><p className="text-[14px] font-bold text-ink-900">Страничный кеш</p><p className="text-[12.5px] text-mut mt-0.5">wt_cache_get/set уважают этот переключатель — при выключении кеш не читается и не пишется.</p></div>
                  <Toggle on={st.cacheOn} set={(v) => { set((s) => ({ ...s, cacheOn: v })); toast(v ? "ok" : "warn", v ? "Кеш включён" : "Кеш отключён"); }} />
                </div>
                <div className="relative overflow-hidden rounded-xl bg-deep-2 text-paper p-6 grain">
                  <div className="absolute inset-0 blueprint opacity-60" />
                  <div className="relative flex flex-wrap items-center gap-6">
                    <div><p className="text-[11.5px] font-extrabold uppercase tracking-[0.16em] text-teal-brand">Занято в кеше</p><p className="font-display font-extrabold text-[32px] tabular mt-1">{st.cacheOn ? "128 КБ" : "0 КБ"}</p></div>
                    <div className="hidden sm:block w-px h-12 bg-deep-line" />
                    <div><p className="text-[11.5px] font-extrabold uppercase tracking-[0.16em] text-amber-brand">Обслужено запросов</p><p className="font-display font-extrabold text-[22px] tabular mt-1.5">{st.cacheOn ? "4 812" : "0"}</p></div>
                    <Btn kind="amber" className="ml-auto" disabled={!st.cacheOn} onClick={() => toast("ok", "Кеш очищен", "Страницы пересоберутся при следующем визите")}><I n="zap" s={16} />Очистить кеш сайта</Btn>
                  </div>
                </div>
              </Card>
            </>
          )}
          {tab === "security" && (
            <>
              <Card title="Двухфакторная аутентификация (2FA)" pad>
                <div className="flex items-start gap-4 p-5 rounded-xl border-2 border-ok/30 bg-ok/6">
                  <span className="w-11 h-11 rounded-xl bg-ok/15 text-ok grid place-items-center shrink-0"><I n="shield" s={21} /></span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap"><p className="font-bold text-[15px] text-ink-900">2FA включена и обязательна</p><Badge tone="ok">ЗАЩИЩЕНО</Badge></div>
                    <p className="text-[13px] text-mut mt-1 leading-snug">Шести-значный код на почту, 5 минут действия, 5 попыток. Выход из консоли — только по ссылке с nonce (CSRF-защита).</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-5 mt-5">
                  <div><label className="block text-[12.8px] font-semibold text-ink-700 mb-1.5">Способ доставки кода</label><select className={inputCls}><option>Код на электронную почту</option><option disabled>TOTP-приложение — скоро</option></select></div>
                  <div><label className="block text-[12.8px] font-semibold text-ink-700 mb-1.5">Почта для кодов</label><input className={inputCls} value={st.adminEmail} readOnly /></div>
                </div>
              </Card>
              <Card title="Попытки подбора пароля" sub="Блокировка 60 секунд после 5 неудачных попыток — счётчик живёт в wt_login_attempts" pad={false}>
                <table className="w-full text-[13.8px]">
                  <tbody>
                    <tr className="border-b border-line/70"><td className="px-5.5 py-3.5 font-mono text-[13px]">185.10.10.41</td><td className="px-3 py-3.5">admin@ваш-домен.ru</td><td className="px-3 py-3.5"><Badge tone="danger">5</Badge></td><td className="px-4 py-3.5 text-right"><Badge tone="danger">ещё 34 сек</Badge></td></tr>
                    <tr><td className="px-5.5 py-3.5 font-mono text-[13px]">92.38.17.7</td><td className="px-3 py-3.5">—</td><td className="px-3 py-3.5"><Badge tone="warn">2</Badge></td><td className="px-4 py-3.5 text-right"><Badge>нет</Badge></td></tr>
                  </tbody>
                </table>
              </Card>
            </>
          )}
          {tab === "backups" && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Card title="Полная копия сайта (.zip)" sub="Все файлы + дамп базы внутри" pad>
                  <Btn onClick={() => { const name = `wordtime-full-${Date.now()}.zip`; set((s) => ({ ...s, backups: [{ name, size: 2_412_000, date: new Date().toLocaleString("ru-RU"), kind: "Полная" }, ...s.backups], log: [`Создан полный бэкап ${name}`, ...s.log] })); toast("ok", "Архив создан", "Скачайте его из списка ниже"); }}><I n="cloud" s={15} />Создать полную копию</Btn>
                </Card>
                <Card title="Только база данных (.sql)" sub="Быстрый дамп всех таблиц wt_*" pad>
                  <Btn kind="dark" onClick={() => { dlBlob(new Blob([sqlDump], { type: "text/plain" }), "wordtime-db-demo.sql"); set((s) => ({ ...s, backups: [{ name: "wordtime-db-demo.sql", size: sqlDump.length, date: new Date().toLocaleString("ru-RU"), kind: "База" }, ...s.backups], log: ["Создан дамп базы", ...s.log] })); toast("ok", "Дамп базы скачан", "wordtime-db-demo.sql"); }}><I n="db" s={15} />Сделать дамп базы</Btn>
                </Card>
              </div>
              <Card title="Сохранённые копии" sub="Восстановление из .sql понимает кавычки — «;» внутри текстов не рвёт запросы" right={<Badge tone="teal">{st.backups.length} шт.</Badge>} pad={false}>
                <table className="w-full text-[13.8px]">
                  <tbody>
                    {st.backups.map((b) => (
                      <tr key={b.name} className="border-b border-line/70 last:border-0 hover:bg-paper transition-colors">
                        <td className="px-5.5 py-3.5"><b className="text-ink-900">{b.name}</b></td>
                        <td className="px-3 py-3.5 text-mut">{fmtB(b.size)}</td>
                        <td className="px-3 py-3.5 text-mut whitespace-nowrap">{b.date}</td>
                        <td className="px-4 py-3.5"><Badge tone={b.kind === "Полная" ? "teal" : "mut"}>{b.kind.toUpperCase()}</Badge></td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex gap-2 justify-end">
                            <Btn kind="ghost" sm onClick={() => { dlBlob(new Blob([sqlDump], { type: "text/plain" }), b.name.replace(/\.zip$/, ".sql")); toast("ok", "Скачивание началось", b.name); }}><I n="dl" s={13} />Скачать</Btn>
                            <Btn kind="danger" sm onClick={() => { set((s) => ({ ...s, backups: s.backups.filter((x) => x.name !== b.name) })); toast("ok", "Копия удалена"); }}><I n="trash" s={13} /></Btn>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {st.backups.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-mut">Копий пока нет — создайте первую выше.</td></tr>}
                  </tbody>
                </table>
              </Card>
            </>
          )}
          {tab === "login" && (
            <Card title="Кастомизация страницы входа" sub="Так страницу входа и подтверждения 2FA увидят пользователи" pad>
              <div className="grid sm:grid-cols-2 gap-x-5">
                <div><label className="block text-[12.8px] font-semibold text-ink-700 mt-1 mb-1.5">Название на странице</label><input className={inputCls} defaultValue="Wordtime" /></div>
                <div><label className="block text-[12.8px] font-semibold text-ink-700 mt-1 mb-1.5">Акцентный цвет (HEX)</label><input className={inputCls} defaultValue="#14b8a6" /></div>
                <div className="sm:col-span-2"><label className="block text-[12.8px] font-semibold text-ink-700 mt-3.5 mb-1.5">Сообщение под логотипом</label><input className={inputCls} defaultValue="Вход защищён двухфакторной аутентификацией" /></div>
              </div>
              <div className="mt-4 flex gap-2.5"><Btn onClick={() => toast("ok", "Страница входа обновлена", "Выйдите, чтобы увидеть изменения")}>Сохранить оформление</Btn><Btn kind="ghost" onClick={() => toast("info", "Предпросмотр", "В настоящей CMS эта кнопка завершает сессию")}>Выйти и посмотреть</Btn></div>
            </Card>
          )}
        </>
      );
    }

    case "menus": return (
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4 items-start">
        <Card title="Пункты меню" sub="Сохраняются в опцию site_menu — тема показывает их в шапке" pad={false}>
          <table className="w-full text-[13.8px]">
            <tbody>
              {st.menu.map((m, i) => (
                <tr key={i} className="border-b border-line/70 last:border-0 hover:bg-paper transition-colors">
                  <td className="px-5.5 py-3"><input className={inputCls + " h-9 text-[13.5px]"} value={m.label} onChange={(e) => set((s) => ({ ...s, menu: s.menu.map((x, j) => j === i ? { ...x, label: e.target.value } : x) }))} /></td>
                  <td className="px-3 py-3"><input className={inputCls + " h-9 text-[13.5px] font-mono"} value={m.url} onChange={(e) => set((s) => ({ ...s, menu: s.menu.map((x, j) => j === i ? { ...x, url: e.target.value } : x) }))} /></td>
                  <td className="px-4 py-3"><div className="flex gap-1.5 justify-end">
                    <button className="icobtnx w-8 h-8 grid place-items-center rounded-lg border border-line bg-card text-mut hover:text-teal-deep cursor-pointer" onClick={() => set((s) => { const m2 = [...s.menu]; if (i > 0) { const t = m2[i - 1]; m2[i - 1] = m2[i]; m2[i] = t; } return { ...s, menu: m2 }; })} title="Вверх"><I n="up" s={14} /></button>
                    <button className="icobtnx w-8 h-8 grid place-items-center rounded-lg border border-line bg-card text-mut hover:text-teal-deep cursor-pointer" onClick={() => set((s) => { const m2 = [...s.menu]; if (i < m2.length - 1) { const t = m2[i + 1]; m2[i + 1] = m2[i]; m2[i] = t; } return { ...s, menu: m2 }; })} title="Вниз"><I n="down" s={14} /></button>
                    <button className="icobtnx w-8 h-8 grid place-items-center rounded-lg border border-line bg-card text-danger hover:bg-danger/10 cursor-pointer" onClick={() => set((s) => ({ ...s, menu: s.menu.filter((_, j) => j !== i) }))} title="Убрать"><I n="x" s={14} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t border-line"><Btn onClick={() => toast("ok", "Меню сайта сохранено", `${st.menu.length} пунктов — шапка сайта обновлена`)}><I n="check" s={15} />Сохранить меню</Btn></div>
        </Card>
        <Card title="Предпросмотр шапки" pad>
          <div className="bg-deep rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap">
            <b className="font-display font-extrabold text-[13px] text-white">{st.siteTitle}</b>
            {st.menu.slice(0, 5).map((m) => <span key={m.label} className="text-[12.5px] font-semibold text-paper/70">{m.label}</span>)}
          </div>
          <MenuAdd onAdd={(l, u) => { set((s) => ({ ...s, menu: [...s.menu, { label: l, url: u }] })); toast("ok", "Пункт меню добавлен"); }} />
        </Card>
      </div>
    );

    case "sitemap": return (
      <Card title="sitemap.xml" sub="Генерируется автоматически из записей и страниц" right={<div className="flex gap-2"><Btn kind="ghost" sm onClick={() => { navigator.clipboard?.writeText(sitemapXml).catch(() => undefined); toast("ok", "XML скопирован"); }}><I n="copy" s={13} />Копировать</Btn><Btn kind="amber" sm onClick={() => { dlBlob(new Blob([sitemapXml], { type: "application/xml" }), "sitemap.xml"); toast("ok", "sitemap.xml скачан"); }}><I n="dl" s={13} />Скачать</Btn></div>} pad>
        <pre className="bg-deep text-[#a8d8cf] rounded-xl p-4 font-mono text-[12.5px] leading-relaxed overflow-auto max-h-72 whitespace-pre dark-scroll">{sitemapXml}</pre>
        <div className="mt-4 flex justify-between gap-3 py-2 border-b border-dashed border-line text-[13.5px]"><b className="font-semibold text-mut">Адрес для поисковиков</b><code className="font-mono text-[12.5px] text-teal-deep">https://ваш-домен.ru/?p=sitemap.xml</code></div>
        <div className="flex justify-between gap-3 py-2 text-[13.5px]"><b className="font-semibold text-mut">Указан в robots.txt</b><Badge tone="ok">ДА</Badge></div>
      </Card>
    );

    case "seo": {
      const exT = st.titleTpl ? st.titleTpl.replace("{title}", "Пример записи").replace("{site}", st.siteTitle) : "Пример записи — " + st.siteTitle;
      const exD = st.descTpl ? st.descTpl.replace("{excerpt}", "Первые 150 символов текста записи…").replace("{site}", st.siteTitle) : "Первые 150 символов текста записи…";
      return (
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <Card title="Шаблоны" pad>
            <label className="block text-[12.8px] font-semibold text-ink-700 mb-1.5">Шаблон title <span className="font-normal text-mut">({"{title}"} — заголовок, {"{site}"} — сайт)</span></label>
            <input className={inputCls} value={st.titleTpl} onChange={(e) => set((s) => ({ ...s, titleTpl: e.target.value }))} placeholder="{title} — {site}" />
            <label className="block text-[12.8px] font-semibold text-ink-700 mt-3.5 mb-1.5">Шаблон description</label>
            <input className={inputCls} value={st.descTpl} onChange={(e) => set((s) => ({ ...s, descTpl: e.target.value }))} placeholder="{excerpt}" />
            <div className="mt-4"><Btn onClick={() => toast("ok", "SEO-настройки сохранены")}>Сохранить</Btn></div>
          </Card>
          <Card title="Предпросмотр сниппета Google" pad>
            <div className="border border-line rounded-xl p-4 bg-card">
              <p className="text-[12px] text-[#1a6b54]">ваш-домен.ru › primer-zapisi</p>
              <p className="text-[17.5px] text-[#1a0dab] font-semibold leading-snug mt-0.5">{exT}</p>
              <p className="text-[13px] text-[#4d5156] leading-normal mt-1">{exD}</p>
            </div>
            <div className="mt-3 flex justify-between py-2 border-b border-dashed border-line text-[13.5px]"><b className="font-semibold text-mut">Длина title</b><Badge tone={exT.length <= 60 ? "ok" : "warn"}>{exT.length} / 60</Badge></div>
            <div className="flex justify-between py-2 text-[13.5px]"><b className="font-semibold text-mut">Длина description</b><Badge tone={exD.length <= 160 ? "ok" : "warn"}>{exD.length} / 160</Badge></div>
          </Card>
        </div>
      );
    }

    case "api": return (
      <>
        <div className="grid sm:grid-cols-2 gap-4">
          <Card title="Создать ключ" pad>
            <label className="block text-[12.8px] font-semibold text-ink-700 mb-1.5">Название приложения</label>
            <input className={inputCls} id="apiname" placeholder="Моё приложение Android" />
            <label className="block text-[12.8px] font-semibold text-ink-700 mt-3.5 mb-1.5">Права</label>
            <select className={inputCls}><option>Только чтение</option><option>Чтение + комментарии</option><option>Полный доступ</option></select>
            <div className="mt-4"><Btn onClick={() => {
              const el = document.getElementById("apiname") as HTMLInputElement | null;
              const name = el?.value.trim() || "Приложение";
              set((s) => ({ ...s, keys: [{ id: Date.now(), name, scopes: "read", date: new Date().toLocaleDateString("ru-RU"), fp: "wt_" + hex(24) }, ...s.keys], log: [`Создан API-ключ «${name}»`, ...s.log] }));
              if (el) el.value = "";
              toast("ok", "Ключ создан", "Скопируйте его из списка — повторно он не показывается");
            }}><I n="key" s={15} />Создать ключ</Btn></div>
          </Card>
          <Card title="Методы API" pad>
            <div className="space-y-2 text-[13px] text-mut leading-relaxed">
              {[["GET /?rest=posts", "записи"], ["GET /?rest=pages", "страницы"], ["GET /?rest=info", "информация о сайте"], ["POST /?rest=comments", "комментарий (X-WT-Key)"], ["POST /?rest=cache", "очистить кеш"]].map(([m, d]) => (
                <p key={m}><code className="font-mono text-[12.5px] bg-paper border border-line rounded px-1.5 py-0.5 text-teal-deep">{m}</code> — {d}</p>
              ))}
              <p className="text-[12.5px] pt-1">Лимит — 120 запросов в минуту на ключ. GET-методы без ключа доступны всем.</p>
            </div>
          </Card>
        </div>
        <Card title="Выпущенные ключи" sub="Хранятся только в виде SHA-256" pad={false}>
          <table className="w-full text-[13.8px]">
            <tbody>
              {st.keys.map((k) => (
                <tr key={k.id} className="border-b border-line/70 last:border-0 hover:bg-paper transition-colors">
                  <td className="px-5.5 py-3.5"><b className="text-ink-900">{k.name}</b></td>
                  <td className="px-3 py-3.5"><Badge tone="teal">{k.scopes}</Badge></td>
                  <td className="px-3 py-3.5 text-mut whitespace-nowrap">{k.date}</td>
                  <td className="px-3 py-3.5"><button className="font-mono text-[12px] text-teal-deep hover:underline cursor-pointer" onClick={() => { navigator.clipboard?.writeText(k.fp).catch(() => undefined); toast("ok", "Ключ скопирован"); }}>{k.fp.slice(0, 14)}…</button></td>
                  <td className="px-4 py-3.5 text-right"><Btn kind="danger" sm onClick={() => { set((s) => ({ ...s, keys: s.keys.filter((x) => x.id !== k.id) })); toast("ok", "Ключ отозван"); }}>Отозвать</Btn></td>
                </tr>
              ))}
              {st.keys.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-mut">Ключей нет — создайте первый для мобильного приложения.</td></tr>}
            </tbody>
          </table>
        </Card>
      </>
    );

    case "health": {
      return <HealthScreen toast={toast} />;
    }

    case "events": return (
      <Card title="Журнал событий" sub="Входы, правки, загрузки, безопасность" right={<Btn kind="ghost" sm onClick={() => { set((s) => ({ ...s, log: [] })); toast("ok", "Журнал очищен"); }}><I n="trash" s={13} />Очистить</Btn>} pad={false}>
        <table className="w-full text-[13.8px]">
          <tbody>
            {st.log.map((l, i) => (
              <tr key={i} className="border-b border-line/70 last:border-0 hover:bg-paper transition-colors">
                <td className="px-5.5 py-3 whitespace-nowrap text-mut"><code className="font-mono text-[12px]">{new Date().toLocaleString("ru-RU")}</code></td>
                <td className="px-3 py-3"><Badge tone={/блокир|Заблокирована/i.test(l) ? "danger" : /удал/i.test(l) ? "warn" : "teal"}>•</Badge> <span className="ml-1.5 text-ink-800">{l}</span></td>
              </tr>
            ))}
            {st.log.length === 0 && <tr><td colSpan={2} className="px-5 py-10 text-center text-mut">Журнал пуст.</td></tr>}
          </tbody>
        </table>
      </Card>
    );

    case "updates": return (
      <>
        <div className="relative overflow-hidden rounded-2xl text-paper p-6 mb-4 border border-deep-line anim-fade-up" style={{ background: "linear-gradient(140deg,#071b21,#0d323c)" }}>
          <div className="absolute inset-0 blueprint opacity-60" />
          <h2 className="relative font-display font-extrabold text-[18px] text-white">Wordtime 1.0.5 — установлена последняя версия</h2>
          <p className="relative text-[13.5px] text-paper/65 mt-1.5">Ядро обновляется вместе с дистрибутивом: база и настройки не затрагиваются.</p>
          <div className="relative mt-4"><Btn kind="amber" sm onClick={() => toast("ok", "Проверка завершена", "Обновлений нет")}>Проверить обновления</Btn></div>
        </div>
        <Card title="Журнал изменений" pad>
          {[["1.0.5", ["Консоль: 26 разделов с выпадающими меню", "SQL-парсер для восстановления дампов", "Выход из консоли защищён nonce", "Авто-.htaccess для wt-data на Apache"]],
          ["1.0.4", ["Автоопределение базового пути — работа в подпапках", "SMTP-отправка кодов 2FA + файловый фолбэк", "nginx-конфиг в дистрибутиве"]],
          ["1.0.0", ["Первый публичный выпуск", "2FA в ядре, блокировка подбора паролей", "REST API /?rest= для мобильных приложений"]]].map(([v, items]) => (
            <div key={v as string} className="flex gap-4 py-3.5 border-b border-dashed border-line last:border-0">
              <Badge tone="teal">v{v as string}</Badge>
              <ul className="text-[13.5px] text-ink-700 space-y-1 list-disc pl-4">{(items as string[]).map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          ))}
        </Card>
      </>
    );

    case "hosting": return (
      <>
        <div className="relative overflow-hidden rounded-2xl text-paper p-6 mb-4 border border-deep-line anim-fade-up" style={{ background: "linear-gradient(140deg,#071b21,#0d323c)" }}>
          <div className="absolute inset-0 blueprint opacity-60" />
          <h2 className="relative font-display font-extrabold text-[18px] text-white">Классический хостинг: nginx / Apache + PHP 7.4–8.3 + MariaDB</h2>
          <p className="relative text-[13.5px] text-paper/65 mt-1.5 max-w-[600px]">Распакуйте Wordtime_cms.zip в корень сайта, откройте домен — установщик сделает всё сам и заблокируется после установки (повторный запуск невозможен, как в WordPress).</p>
          <div className="relative mt-4"><a className="inline-flex items-center gap-2 font-semibold rounded-lg text-[13.5px] px-4 h-10 bg-amber-brand text-deep hover:bg-amber-deep hover:text-white transition-all" href="#/download"><I n="dl" s={15} />Скачать Wordtime_cms.zip</a></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Card title="Требования" pad={false}>
            <table className="w-full text-[13.8px]"><tbody>
              {[["PHP 8.3-FPM", true], ["pdo_mysql", true], ["mbstring", true], ["GD", true], ["ZipArchive", true], ["Запись в каталог", true]].map(([n, ok]) => (
                <tr key={n as string} className="border-b border-line/70 last:border-0"><td className="px-5.5 py-3 font-bold text-ink-900">{n as string}</td><td className="px-4 py-3 text-right">{ok ? <Badge tone="ok"><I n="check" s={11} /> Есть</Badge> : <Badge tone="warn">Нет</Badge>}</td></tr>
              ))}
            </tbody></table>
          </Card>
          <Card title="Безопасность данных" pad>
            <ul className="text-[13.5px] text-ink-700 space-y-2.5 leading-relaxed">
              <li className="flex gap-2.5"><I n="shield" s={16} c="text-teal-deep shrink-0 mt-0.5" /><span><b>wt-data/ закрыт от веба</b> — на nginx конфигом, на Apache ядро само создаёт .htaccess (бэкапы и коды 2FA не скачать прямой ссылкой).</span></li>
              <li className="flex gap-2.5"><I n="zap" s={16} c="text-teal-deep shrink-0 mt-0.5" /><span><b>5 попыток входа → блокировка 60 сек</b>, счётчик в базе, переживает перезагрузку.</span></li>
              <li className="flex gap-2.5"><I n="key" s={16} c="text-teal-deep shrink-0 mt-0.5" /><span><b>Все SQL-запросы — prepared statements</b>, вывод экранируется (XSS).</span></li>
            </ul>
          </Card>
        </div>
      </>
    );

    case "perf": return (
      <>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5 mb-4">
          <StatCard ic="zap" n={128} label="КБ в кеше" bg="#fdf1d7" fg="#92610a" delay={0} />
          <StatCard ic="file" n={36} label="объектов кешировано" bg="#e2f5f2" fg="#0b7a6e" delay={60} />
          <StatCard ic="db" n={4} label="МБ размер базы" bg="#eef2f3" fg="#33525b" delay={120} />
          <StatCard ic="clock" n={38} label="мс генерация страницы" bg="#e5f5ec" fg="#137a43" delay={180} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Card title="Кеширование" pad>
            <div className="flex items-center gap-4"><div className="flex-1"><p className="text-[14px] font-bold text-ink-900">Страничный кеш</p><p className="text-[12.5px] text-mut mt-0.5">Готовые страницы в wt-data/cache</p></div><Toggle on={st.cacheOn} set={(v) => { set((s) => ({ ...s, cacheOn: v })); toast(v ? "ok" : "warn", v ? "Кеш включён" : "Кеш отключён"); }} /></div>
            <label className="block text-[12.8px] font-semibold text-ink-700 mt-4 mb-1.5">Автоочистка кеша</label>
            <select className={inputCls}><option>Раз в сутки</option><option>Каждый час</option><option>Каждые 6 часов</option><option>Раз в неделю</option><option>Никогда (вручную)</option></select>
          </Card>
          <Card title="Что уже в ядре" pad>
            {[["Объектный кеш запросов", "встроен"], ["Подготовка SQL-запросов", "PDO"], ["Асинхронная очередь", "wt-cron.php"], ["Сжатие статики (gzip)", "nginx / .htaccess"]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-2.5 border-b border-dashed border-line last:border-0 text-[13.5px]"><b className="font-semibold text-mut">{k}</b><Badge tone="ok">{v}</Badge></div>
            ))}
          </Card>
        </div>
      </>
    );

    case "images": return (
      <>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3.5 mb-4">
          <StatCard ic="image" n={4} label="файлов в библиотеке" bg="#e2f5f2" fg="#0b7a6e" delay={0} />
          <StatCard ic="db" n={2} label="МБ на диске" bg="#eef2f3" fg="#33525b" delay={60} />
          <StatCard ic="check" n={100} label="% работает GD" bg="#e5f5ec" fg="#137a43" delay={120} />
        </div>
        <Card title="Настройки оптимизации" sub="При каждой загрузке ядро ресайзит и пережимает изображение (GD)" pad>
          <div className="flex items-center gap-4 mb-4"><div className="flex-1"><p className="text-[14px] font-bold text-ink-900">Оптимизировать изображения при загрузке</p></div><Toggle on={st.imgAuto} set={(v) => { set((s) => ({ ...s, imgAuto: v })); toast("ok", "Сохранено"); }} /></div>
          <div className="grid sm:grid-cols-2 gap-x-5">
            <div><label className="block text-[12.8px] font-semibold text-ink-700 mb-1.5">Максимальная ширина (px)</label><input className={inputCls} type="number" defaultValue={1920} /></div>
            <div><label className="block text-[12.8px] font-semibold text-ink-700 mb-1.5">Качество JPEG/WebP (%)</label><input className={inputCls} type="number" defaultValue={82} /></div>
          </div>
          <div className="mt-4"><Btn onClick={() => toast("ok", "Настройки изображений сохранены")}>Сохранить</Btn></div>
        </Card>
      </>
    );

    case "media": return (
      <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
        <Card title="Библиотека" sub={`${st.media.length} файл(ов) · изображения оптимизируются при загрузке (GD)`}
          right={<Btn kind="amber" sm onClick={() => { set((s) => ({ ...s, media: [...s.media, { id: Date.now(), name: `foto-${s.media.length + 1}.jpg`, grad: `linear-gradient(140deg,#0d3039,#f0b429 ${130 + s.media.length * 8}%)` }] })); toast("ok", "Файл загружен", "Оптимизирован и добавлен в библиотеку"); }}><I n="dl" s={14} />Загрузить (демо)</Btn>} pad>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
            {st.media.map((m) => (
              <button key={m.id} onClick={() => setSelMedia(m.id)}
                className={`rounded-xl overflow-hidden border-2 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-panel text-left ${selMedia === m.id ? "border-teal-deep ring-[3px] ring-teal-deep/20" : "border-line"}`}
                style={{ background: m.grad }}>
                <span className="h-[86px] grid place-items-center text-white/70"><I n="image" s={24} /></span>
                <span className="block bg-card px-2.5 py-2"><b className="block text-[11.5px] text-ink-900 truncate">{m.name}</b><span className="text-[10.5px] text-mut">2026/02 · 240 КБ</span></span>
              </button>
            ))}
          </div>
        </Card>
        <Card title="Данные файла" sub="Название, alt и подпись — как в WordPress" pad>
          {(() => {
            const m = st.media.find((x) => x.id === selMedia);
            if (!m) return <p className="text-[13px] text-mut py-6 text-center">Выберите файл в библиотеке слева</p>;
            return (
              <>
                <div className="h-32 rounded-xl mb-3 grid place-items-center text-white/70" style={{ background: m.grad }}><I n="image" s={26} /></div>
                <label className="block text-[12.5px] font-semibold text-ink-700 mb-1">Название</label>
                <input className={inputCls} defaultValue={m.name.replace(/\.[a-z]+$/i, "")} />
                <label className="block text-[12.5px] font-semibold text-ink-700 mt-3 mb-1">Атрибут alt</label>
                <input className={inputCls} placeholder="Описание для поисковиков" />
                <label className="block text-[12.5px] font-semibold text-ink-700 mt-3 mb-1">Подпись</label>
                <input className={inputCls} placeholder="Подпись под изображением" />
                <div className="flex gap-2 mt-4 flex-wrap">
                  <Btn kind="ghost" sm onClick={() => { navigator.clipboard?.writeText(`/wt-content/uploads/2026/02/${m.name}`).catch(() => undefined); toast("ok", "URL скопирован"); }}><I n="copy" s={13} />Копировать URL</Btn>
                  <Btn kind="danger" sm onClick={() => { set((s) => ({ ...s, media: s.media.filter((x) => x.id !== m.id) })); setSelMedia(null); toast("ok", "Файл удалён"); }}><I n="trash" s={13} />Удалить</Btn>
                </div>
                <p className="text-[12px] text-mut mt-3 leading-relaxed">Вставка в запись — через кнопку «Вставить изображение» в редакторе.</p>
              </>
            );
          })()}
        </Card>
      </div>
    );

    case "widgets": return (
      <div className="grid lg:grid-cols-[270px_1fr] gap-4 items-start">
        <Card title="Добавить виджет" sub="Выберите область и тип" pad>
          {st.widgetAreas.map((a) => (
            <div key={a.id} className="border-t border-dashed border-line pt-2.5 mt-2.5 first:border-0 first:mt-0 first:pt-0">
              <b className="text-[13px] text-ink-900">{a.name}</b> <Badge>{a.id}</Badge>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {Object.entries(W_TYPES).map(([k, v]) => (
                  <Btn key={k} kind="ghost" sm onClick={() => { set((s) => ({ ...s, widgetAreas: s.widgetAreas.map((x) => x.id === a.id ? { ...x, items: [...x.items, { type: k, title: v, text: "" }] } : x) })); toast("ok", "Виджет добавлен", `«${v}» — в области «${a.name}»`); }}>{v}</Btn>
                ))}
              </div>
            </div>
          ))}
        </Card>
        <div>
          {st.widgetAreas.map((a) => (
            <Card key={a.id} title={a.name} sub={`Область темы · ${a.items.length} видж.`} pad>
              {a.items.length === 0 && <p className="text-[13px] text-mut py-3">Область пуста — добавьте виджет слева.</p>}
              {a.items.map((w, i) => (
                <div key={i} className="border border-line rounded-xl p-3.5 mb-2.5 bg-paper anim-fade">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone="teal">{W_TYPES[w.type] ?? w.type}</Badge>
                    <input className={inputCls + " h-8 flex-1 min-w-[160px] text-[13px]"} value={w.title}
                      onChange={(e) => set((s) => ({ ...s, widgetAreas: s.widgetAreas.map((x) => x.id === a.id ? { ...x, items: x.items.map((y, j) => j === i ? { ...y, title: e.target.value } : y) } : x) }))} />
                    <span className="flex gap-1">
                      <button className="icobtn w-8 h-8 grid place-items-center rounded-lg border border-line bg-card text-mut hover:text-teal-deep cursor-pointer disabled:opacity-30" disabled={i === 0}
                        onClick={() => set((s) => ({ ...s, widgetAreas: s.widgetAreas.map((x) => { if (x.id !== a.id) return x; const it = [...x.items]; const t = it[i - 1]; it[i - 1] = it[i]; it[i] = t; return { ...x, items: it }; }) }))} title="Выше"><I n="up" s={13} /></button>
                      <button className="icobtn w-8 h-8 grid place-items-center rounded-lg border border-line bg-card text-mut hover:text-teal-deep cursor-pointer disabled:opacity-30" disabled={i === a.items.length - 1}
                        onClick={() => set((s) => ({ ...s, widgetAreas: s.widgetAreas.map((x) => { if (x.id !== a.id) return x; const it = [...x.items]; const t = it[i + 1]; it[i + 1] = it[i]; it[i] = t; return { ...x, items: it }; }) }))} title="Ниже"><I n="down" s={13} /></button>
                      <button className="icobtn w-8 h-8 grid place-items-center rounded-lg border border-line bg-card text-danger hover:bg-danger/10 cursor-pointer"
                        onClick={() => { set((s) => ({ ...s, widgetAreas: s.widgetAreas.map((x) => x.id === a.id ? { ...x, items: x.items.filter((_, j) => j !== i) } : x) })); toast("ok", "Виджет удалён"); }} title="Удалить"><I n="x" s={13} /></button>
                    </span>
                  </div>
                  {(w.type === "text" || w.type === "html") && (
                    <textarea className={inputCls + " mt-2 h-16 py-2 text-[12.5px] resize-y"} placeholder={w.type === "html" ? "HTML-код" : "Текст виджета"} value={w.text}
                      onChange={(e) => set((s) => ({ ...s, widgetAreas: s.widgetAreas.map((x) => x.id === a.id ? { ...x, items: x.items.map((y, j) => j === i ? { ...y, text: e.target.value } : y) } : x) }))} />
                  )}
                </div>
              ))}
              {a.items.length > 0 && <Btn sm onClick={() => toast("ok", "Виджеты сохранены", `Область «${a.name}» обновлена на сайте`)}><I n="check" s={14} />Сохранить виджеты</Btn>}
            </Card>
          ))}
          <p className="text-[12.5px] text-mut">Области регистрирует тема через <code className="text-[12px]">register_sidebar()</code>: сайдбар — на странице записи, подвал — на всех страницах. Виджеты WordPress-плагинов (<code className="text-[12px]">WP_Widget</code>) тоже поддерживаются.</p>
        </div>
      </div>
    );

    case "plugin-new":
    case "theme-new": {
      const kind = page === "plugin-new" ? "plugins" as const : "themes" as const;
      return (
        <>
          <Card pad>
            <form className="flex gap-2.5 flex-wrap" onSubmit={(e) => { e.preventDefault(); wpSearch(kind, wpQuery); }}>
              <input className={inputCls + " flex-1 min-w-[240px]"} placeholder={`Найти ${kind === "plugins" ? "плагин" : "тему"} в каталоге WordPress.org…`} value={wpQuery} onChange={(e) => setWpQuery(e.target.value)} />
              <Btn type="submit" disabled={wpBusy}><I n={wpBusy ? "refresh" : kind === "plugins" ? "plug" : "palette"} s={15} c={wpBusy ? "anim-spin" : ""} />{wpBusy ? "Загружаем…" : "Искать"}</Btn>
            </form>
            <p className="text-[12.5px] text-mut mt-2.5">Список подгружается из публичного API wordpress.org — установка в один клик: скачивание, распаковка{kind === "plugins" ? ", активация" : ""}. В PHP-версии консоли это делает сервер.</p>
          </Card>
          {!wpItems && !wpBusy && (
            <Card pad>
              <div className="py-10 text-center">
                <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-deep-2/8 text-mut mb-4"><I n={kind === "plugins" ? "plug" : "palette"} s={26} /></span>
                <p className="text-[14px] font-bold text-ink-900">Введите запрос — подгрузим каталог WordPress.org</p>
                <p className="text-[13px] text-mut mt-1.5">Например: {kind === "plugins" ? "cache, seo, forms, security" : "astra, kadence, blog"}</p>
                <div className="flex gap-2 justify-center mt-4 flex-wrap">
                  {(kind === "plugins" ? ["cache", "seo", "forms"] : ["blog", "shop", "news"]).map((q) => (
                    <Btn key={q} kind="ghost" sm onClick={() => { setWpQuery(q); wpSearch(kind, q); }}>{q}</Btn>
                  ))}
                </div>
              </div>
            </Card>
          )}
          {wpItems && (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {wpItems.map((it) => (
                <Card key={it.slug} pad>
                  <div className="flex gap-3">
                    {kind === "themes"
                      ? <span className="w-[92px] h-[68px] shrink-0 rounded-lg overflow-hidden grid place-items-center text-white/70" style={{ background: "linear-gradient(140deg,#0d3039,#134450)" }}>{it.shot ? <img src={it.shot} alt="" className="w-full h-full object-cover" /> : <I n="palette" s={22} />}</span>
                      : <span className="w-13 h-13 w-[52px] h-[52px] shrink-0 rounded-xl bg-paper grid place-items-center text-mut overflow-hidden">{it.icon ? <img src={it.icon} alt="" className="w-full h-full object-cover" /> : <I n="plug" s={22} />}</span>}
                    <div className="min-w-0">
                      <b className="block text-[14px] text-ink-900 truncate">{it.name}</b>
                      <span className="text-[11.5px] text-amber-brand">★★★★★</span>
                      <p className="text-[11.5px] text-mut">{it.meta}</p>
                    </div>
                  </div>
                  <p className="text-[12.5px] text-mut mt-2.5 leading-relaxed line-clamp-3">{it.desc || "Описание доступно в каталоге WordPress.org."}</p>
                  <div className="flex items-center gap-2 mt-3 border-t border-dashed border-line pt-3">
                    {kind === "plugins" && <label className="flex gap-1.5 items-center text-[11.5px] text-mut cursor-pointer"><input type="checkbox" defaultChecked className="w-auto" />активировать</label>}
                    <span className="flex-1" />
                    <Btn sm disabled={wpInstalling !== null} onClick={() => wpInstall(kind, it)}>{wpInstalling === it.slug ? "Устанавливаем…" : "Установить"}</Btn>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      );
    }

    default: {
      const [t, s] = TITLES[page] ?? ["Раздел", ""];
      return (
        <Card title={t} sub={s} pad>
          <div className="py-8 text-center">
            <span className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-deep-2/8 text-mut mb-4"><I n={MENU.flatMap((m) => m.items).find((i) => i.k === page)?.i ?? "file"} s={26} /></span>
            <p className="text-[14px] font-bold text-ink-900">Раздел работает на вашем хостинге</p>
            <p className="text-[13px] text-mut mt-1.5 max-w-sm mx-auto">Это предпросмотр консоли. Полная реализация — в файлах <b>wt-admin/</b> из пакета Wordtime_cms.zip: там этот раздел полностью функционален.</p>
            <a className="inline-flex items-center gap-2 font-semibold rounded-lg text-[13.5px] px-4 h-10 bg-amber-brand text-deep hover:bg-amber-deep hover:text-white transition-all mt-5" href="#/download"><I n="dl" s={15} />Скачать пакет</a>
          </div>
        </Card>
      );
    }
  }
}

function MenuAdd({ onAdd }: { onAdd: (l: string, u: string) => void }) {
  const [l, setL] = useState(""); const [u, setU] = useState("");
  return (
    <form className="mt-4" onSubmit={(e) => { e.preventDefault(); if (!l.trim() || !u.trim()) return; onAdd(l.trim(), u.trim()); setL(""); setU(""); }}>
      <label className="block text-[12.8px] font-semibold text-ink-700 mb-1.5">Название</label>
      <input className={inputCls} value={l} onChange={(e) => setL(e.target.value)} placeholder="О проекте" />
      <label className="block text-[12.8px] font-semibold text-ink-700 mt-3 mb-1.5">Ссылка</label>
      <input className={inputCls} value={u} onChange={(e) => setU(e.target.value)} placeholder="/ или ?p=page:o-sajte" />
      <div className="mt-3.5"><Btn sm type="submit"><I n="plus" s={14} />Добавить</Btn></div>
    </form>
  );
}

function HealthScreen({ toast }: { toast: (k: Toast["kind"], t: string, x?: string) => void }) {
  const checks: [string, boolean, string][] = [
    ["PHP 8.3.14", true, ""], ["PDO + MySQL", true, ""], ["mbstring", true, ""],
    ["GD (обработка изображений)", true, ""], ["ZipArchive (полные бэкапы)", true, ""],
    ["Каталог wt-data доступен для записи", true, ""], ["Защита wt-data (.htaccess / nginx)", true, ""], ["Соединение с MariaDB", true, ""],
  ];
  const [n, setN] = useState(0);
  const [busy, setBusy] = useState(false);
  const run = useCallback(() => {
    setBusy(true); setN(0);
    let i = 0;
    const t = setInterval(() => { i++; setN(i); if (i >= checks.length) { clearInterval(t); setBusy(false); toast("ok", "Все проверки пройдены", "Окружение хостинга готово к работе"); } }, 260);
  }, [checks.length, toast]);
  useEffect(() => { run(); return () => undefined; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  return (
    <>
      <Card title="Проверки окружения" sub="Запуск при каждом открытии раздела — как в «Здоровье системы» на хостинге"
        right={<div className="flex items-center gap-2.5">{busy && <I n="refresh" s={16} c="anim-spin text-teal-deep" />}<Badge tone={n >= checks.length ? "ok" : "warn"}>{n >= checks.length ? "ВСЁ В ПОРЯДКЕ" : `ПРОВЕРКА ${n}/${checks.length}`}</Badge></div>} pad={false}>
        <table className="w-full text-[13.8px]">
          <tbody>
            {checks.map(([name, ok, tip], i) => (
              <tr key={name} className={`border-b border-line/70 last:border-0 transition-colors ${i < n ? "hover:bg-paper" : "opacity-40"}`}>
                <td className="px-5.5 py-3.5 font-bold text-ink-900">{name}</td>
                <td className="px-3 py-3.5">{i < n ? (ok ? <Badge tone="ok"><I n="check" s={11} /> Работает</Badge> : <Badge tone="warn"><I n="alert" s={11} /> Внимание</Badge>) : <Badge>ожидание</Badge>}</td>
                <td className="px-4 py-3.5 text-mut text-[12.5px]">{i < n ? tip || "—" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="grid sm:grid-cols-2 gap-4">
        <Card title="Служебные пути" pad>
          {[["Корень сайта", "/var/www/Wordtime_cms"], ["Данные и бэкапы", "wt-data/ (закрыт от веба)"], ["Коды 2FA (без SMTP)", "wt-data/2fa-log.txt"], ["Префикс таблиц", "wt_"]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-2.5 border-b border-dashed border-line last:border-0 text-[13.5px]"><b className="font-semibold text-mut">{k}</b><code className="font-mono text-[12px] text-ink-800 text-right">{v}</code></div>
          ))}
        </Card>
        <Card title="Рекомендации" pad>
          <ul className="text-[13.5px] text-ink-700 space-y-2.5 leading-relaxed">
            <li className="flex gap-2.5"><I n="clock" s={16} c="text-teal-deep shrink-0 mt-0.5" />Добавьте cron: <code className="font-mono text-[12px]">* * * * * php wt-cron.php</code> — асинхронная очередь и автоочистка кеша.</li>
            <li className="flex gap-2.5"><I n="mail" s={16} c="text-teal-deep shrink-0 mt-0.5" />Настройте SMTP в «Настройки → Безопасность и 2FA», чтобы коды приходили письмами.</li>
            <li className="flex gap-2.5"><I n="globe" s={16} c="text-teal-deep shrink-0 mt-0.5" />Подключите nginx-wordtime.conf — красивые ссылки и защита служебных каталогов.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}

/* ═══════════════ Каркас консоли с flyout-меню ═══════════════ */
function Admin({ userName, onOut, toast }: { userName: string; onOut: () => void; toast: (k: Toast["kind"], t: string, x?: string) => void }) {
  const hash = useHash();
  const route = hash.replace(/^#/, "") || "";
  const page = route.split("&")[0];
  const [st, setSt] = useState<Store>({
    posts: seedPosts, cmts: seedCmts,
    plugins: [{ file: "wt-seo-helper.php", active: true }, { file: "wt-turbo-cache.php", active: false }, { file: "hello-wordtime.php", active: false }],
    keys: [{ id: 1, name: "Приложение Android", scopes: "read,comments", date: "01.02.2026", fp: "wt_" + hex(24) }],
    menu: [{ label: "Главная", url: "/" }, { label: "О сайте", url: "?p=page:o-sajte" }, { label: "Контакты", url: "?p=page:kontakty" }],
    siteTitle: "Мой сайт на Wordtime", tagline: "Работает на Wordtime", adminEmail: "admin@ваш-домен.ru",
    commentsOff: false, moderate: true, cacheOn: true, imgAuto: true,
    titleTpl: "{title} — {site}", descTpl: "{excerpt}",
    backups: [], log: ["Вход в консоль подтверждён (2FA)", "Кеш очищен автоматически", "Создан API-ключ «Приложение Android»"],
    widgetAreas: [
      { id: "sidebar-1", name: "Сайдбар", items: [{ type: "search", title: "Поиск", text: "" }, { type: "recent", title: "Свежие записи", text: "" }, { type: "categories", title: "Рубрики", text: "" }] },
      { id: "footer-1", name: "Подвал: колонка 1", items: [{ type: "text", title: "О сайте", text: "Сайт работает на Wordtime CMS." }] },
      { id: "footer-2", name: "Подвал: колонка 2", items: [{ type: "menu", title: "Разделы", text: "" }] },
    ],
    media: DEMO_MEDIA,
  });
  const set = useCallback((fn: (s: Store) => Store) => setSt(fn), []);
  const [fly, setFly] = useState<{ item: MItem; top: number } | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.getAttribute("data-theme") === "dark");
  const flyTimer = useRef<number | null>(null);
  const setTheme = (d: boolean) => { setDark(d); document.documentElement.setAttribute("data-theme", d ? "dark" : "light"); try { localStorage.setItem("wordtime_theme", d ? "dark" : "light"); } catch { /* noop */ } };
  useEffect(() => {
    const onScroll = () => setFly(null);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);
  useEffect(() => { setFly(null); setSideOpen(false); }, [route]);

  const showFly = (item: MItem, el: HTMLElement) => {
    if (flyTimer.current) window.clearTimeout(flyTimer.current);
    if (!item.fly) { setFly(null); return; }
    const r = el.getBoundingClientRect();
    let top = r.top - 8;
    const est = 40 + item.fly.length * 38;
    if (top + est > window.innerHeight - 12) top = Math.max(12, window.innerHeight - 12 - est);
    setFly({ item, top });
  };
  const hideFly = () => { flyTimer.current = window.setTimeout(() => setFly(null), 140); };

  const [title, sub] = TITLES[page] ?? ["Раздел", ""];

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* сайдбар */}
      <aside className={`side w-[254px] shrink-0 sticky top-0 h-screen flex flex-col text-[#cfe4e6] z-40 fixed lg:static inset-y-0 left-0 transition-transform lg:translate-x-0 ${sideOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "linear-gradient(170deg,#071b21,#0b2831 55%,#0d3039)" }}>
        <div className="absolute inset-0 blueprint pointer-events-none" />
        <div className="relative flex items-center gap-3 px-5 pt-5 pb-4">
          <span className="w-10 h-10 shrink-0 rounded-[11px] grid place-items-center border border-[#1d5160] text-teal-brand" style={{ background: "linear-gradient(150deg,#10424d,#0b2f38)" }}><I n="hour" s={21} /></span>
          <span><b className="font-display font-extrabold text-[15.5px] text-white block leading-none">Wordtime</b><small className="block mt-1 text-[10.5px] font-bold tracking-[0.14em] text-[#5f8891] uppercase">CMS 1.0.5</small></span>
        </div>
        <nav className="relative flex-1 overflow-y-auto px-3 pb-3 dark-scroll">
          {MENU.map((sec) => (
            <div key={sec.sec}>
              <div className="px-2.5 pt-4 pb-1.5 text-[10.5px] font-bold tracking-[0.16em] uppercase text-[#4e7680]">{sec.sec}</div>
              {sec.items.map((it) => {
                const active = it.k === page || (it.fly?.some((f) => f.t === route) ?? false);
                return (
                  <a key={it.k + it.l} href={"#" + it.k}
                    onMouseEnter={(e) => showFly(it, e.currentTarget)} onMouseLeave={hideFly}
                    className={`it relative flex items-center gap-2.5 px-2.5 py-[9px] my-0.5 rounded-[10px] font-semibold text-[13.8px] transition-all cursor-pointer ${active ? "text-white" : "text-[#a9c6ca] hover:text-white hover:bg-teal-brand/10"}`}
                    style={active ? { background: "linear-gradient(90deg,rgba(20,184,166,.2),rgba(20,184,166,.07))" } : undefined}>
                    {active && <span className="absolute -left-3 top-2 bottom-2 w-[3.5px] rounded-r bg-amber-brand" />}
                    <I n={it.i} s={17} c={active ? "text-teal-brand" : "opacity-75"} />
                    <span>{it.l}</span>
                    {it.cnt && <span className="ml-auto text-[11px] font-bold bg-amber-brand/15 text-amber-brand rounded-full px-2 py-px">{it.cnt}</span>}
                    {it.dot && !it.cnt && <span className="ml-auto w-[7px] h-[7px] rounded-full bg-amber-brand" style={{ boxShadow: "0 0 8px rgba(240,180,41,.8)" }} />}
                    {it.fly && <I n="chev" s={13} c={`ml-auto opacity-50 ${it.cnt || it.dot ? "" : ""}`} />}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="relative p-3.5 border-t border-white/6">
          <div className="flex items-center gap-2.5 p-2.5 rounded-[11px] bg-white/4 border border-white/7">
            <span className="w-8 h-8 shrink-0 rounded-[9px] grid place-items-center font-display font-extrabold text-[13px] text-white" style={{ background: "linear-gradient(150deg,#0e9384,#0b6e63)" }}>{userName[0]?.toUpperCase()}</span>
            <span className="min-w-0 flex-1"><b className="block text-white text-[13px] truncate">{userName}</b><span className="text-[11px] text-[#6f959d]">administrator</span></span>
            <button onClick={onOut} title="Выйти" className="w-7.5 h-7.5 grid place-items-center rounded-lg text-[#7fa3ab] hover:text-white hover:bg-danger/25 transition-colors cursor-pointer"><I n="logout" s={15} /></button>
          </div>
        </div>
      </aside>
      {sideOpen && <div className="fixed inset-0 bg-deep/60 z-30 lg:hidden" onClick={() => setSideOpen(false)} />}

      {/* flyout-подменю */}
      {fly && (
        <div className="fixed z-[90] min-w-[224px] bg-deep-2 border border-deep-line rounded-[13px] p-1.5 anim-sub" style={{ left: window.innerWidth > 1024 ? 262 : undefined, right: window.innerWidth > 1024 ? undefined : 12, top: fly.top, boxShadow: "0 24px 50px -18px rgba(0,0,0,.65)" }}
          onMouseEnter={() => flyTimer.current && window.clearTimeout(flyTimer.current)} onMouseLeave={hideFly}>
          <div className="px-3 pt-2 pb-1 text-[10.5px] font-bold tracking-[0.14em] uppercase text-[#4e7680]">{fly.item.l}</div>
          {fly.item.fly?.map((f) => (
            <a key={f.t + f.l} href={"#" + f.t}
              className={`flex items-center gap-2.5 px-3 py-[8.5px] rounded-[9px] font-semibold text-[13.3px] transition-colors ${f.t === route ? "bg-teal-brand/15 text-white" : "text-[#a9c6ca] hover:bg-teal-brand/12 hover:text-white"}`}>
              <span className={`w-[5px] h-[5px] rounded-full ${f.t === route ? "bg-amber-brand" : "bg-[#35626d]"}`} />{f.l}
            </a>
          ))}
        </div>
      )}

      {/* контент */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="top sticky top-0 z-30 flex items-center gap-3 h-[58px] px-5 border-b border-[#123844] text-[#d8e8ea]" style={{ background: "rgba(7,27,33,.97)" }}>
          <button className="lg:hidden cursor-pointer p-1.5" onClick={() => setSideOpen(true)} aria-label="Меню"><I n="menu" s={21} /></button>
          <span className="text-[13px] font-bold text-[#7fa3ab]">Консоль / <b className="text-white font-extrabold">{title}</b></span>
          <span className="flex-1" />
          <button onClick={() => setTheme(!dark)} title="Тема оформления" className="w-9 h-9 grid place-items-center rounded-lg border border-[#1d4d59] text-[#cfe4e6] hover:text-teal-brand hover:border-teal-brand/50 transition-all cursor-pointer">
            <I n={dark ? "sun" : "moon"} s={16} />
          </button>
          <Btn kind="amber" sm onClick={() => toast("ok", "Кеш очищен", "Страницы пересоберутся при следующем визите")}><I n="zap" s={14} />Очистить кеш</Btn>
          <a className="inline-flex items-center gap-2 font-semibold rounded-lg text-[12.5px] px-3 h-8 border border-[#1d4d59] text-[#cfe4e6] hover:border-teal-brand/50 hover:text-teal-brand transition-all" href="#/download"><I n="dl" s={14} />ZIP</a>
        </div>
        <main className="flex-1 w-full max-w-[1180px] mx-auto px-5 lg:px-7 py-6 pb-16" key={route}>
          <h1 className="font-display font-extrabold text-[23px] text-ink-900 tracking-tight anim-fade-up">{title}</h1>
          <p className="text-[13.5px] text-mut mt-1.5 mb-5 anim-fade-up">{sub}</p>
          <Screens st={st} set={set} route={route} toast={toast} />
        </main>
      </div>
    </div>
  );
}

/* ═══════════════ Страница скачивания ═══════════════ */
function DownloadPage({ toast }: { toast: (k: Toast["kind"], t: string, x?: string) => void }) {
  const [files, setFiles] = useState<ZF[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [packed, setPacked] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(3);
  const [copied, setCopied] = useState(false);
  const fired = useRef(false);
  const base = ((import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/").replace(/\/$/, "");

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const all = await Promise.all(MANIFEST.map(async (m) => {
          const r = await fetch(base + m.path);
          if (!r.ok) throw new Error(m.path);
          return { path: m.path, content: await r.text() };
        }));
        if (!dead) setFiles(all);
      } catch { if (!dead) setFailed(true); }
    })();
    return () => { dead = true; };
  }, [base]);

  useEffect(() => {
    if (!files) return;
    const t = setInterval(() => setPacked((p) => { if (p >= files.length) { clearInterval(t); return p; } return p + 1; }), 240);
    return () => clearInterval(t);
  }, [files]);

  const doDl = useCallback(() => {
    if (!files || fired.current) return;
    fired.current = true; setStarted(true);
    dlBlob(makeZip(files), "Wordtime_cms.zip");
    setTimeout(() => { setDone(true); toast("ok", "Wordtime_cms.zip скачан", "Распакуйте в корень сайта и откройте домен"); }, 350);
  }, [files, toast]);

  useEffect(() => {
    if (!files || packed < files.length || started) return;
    if (count <= 0) { doDl(); return; }
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [files, packed, started, count, doDl]);

  const total = files?.reduce((s, f) => s + new TextEncoder().encode(f.content).length, 0) ?? 0;
  const share = location.origin + location.pathname + "#/download";

  return (
    <div className="min-h-screen relative overflow-hidden bg-deep text-paper grain">
      <div className="absolute inset-0 blueprint opacity-50 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[560px] h-[560px] rounded-full opacity-25 pointer-events-none" style={{ background: "radial-gradient(circle,#14b8a6 0%,transparent 65%)" }} />
      <div className="absolute -bottom-52 -left-40 w-[520px] h-[520px] rounded-full opacity-15 pointer-events-none" style={{ background: "radial-gradient(circle,#f0b429 0%,transparent 65%)" }} />

      <header className="relative z-10 max-w-6xl mx-auto px-5 h-16 flex items-center gap-4">
        <span className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-[10px] grid place-items-center border border-[#1d5160] text-teal-brand" style={{ background: "linear-gradient(150deg,#10424d,#0b2f38)" }}><span className="anim-hourflip"><I n="hour" s={18} /></span></span>
          <b className="font-display font-extrabold text-[15px]">Wordtime <span className="text-teal-brand">CMS</span></b>
        </span>
        <span className="ml-auto text-[12px] font-bold text-paper/50">PHP 7.4–8.3 · nginx / Apache · MariaDB</span>
        <a href="#" className="text-[13px] font-bold text-teal-brand hover:text-teal-soft transition-colors">← Предпросмотр консоли</a>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-5 pb-16 grid lg:grid-cols-[1.15fr_1fr] gap-10 items-start">
        <div>
          <p className="text-[12px] font-extrabold tracking-[0.22em] uppercase text-amber-brand anim-fade-up">Дистрибутив · v1.0.5</p>
          <h1 className="font-display font-black text-[clamp(30px,4.5vw,46px)] leading-[1.06] mt-3 anim-fade-up" style={{ animationDelay: "60ms" }}>
            Wordtime_cms<span className="text-teal-brand">.zip</span>
          </h1>
          <p className="text-[15px] text-paper/65 mt-4 max-w-lg leading-relaxed anim-fade-up" style={{ animationDelay: "120ms" }}>
            <b className="text-paper">Полное PHP-ядро CMS</b> для классических хостингов. Без Docker и Composer — только файлы и база.
            Распаковали, открыли домен — установщик сделает всё сам и <b className="text-paper">заблокируется после установки</b>.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5 anim-fade-up" style={{ animationDelay: "180ms" }}>
            {[(total ? fmtB(total) : "…") + " · " + MANIFEST.length + " файлов", "2FA в ядре", "SQL-парсер восстановления", "REST API", "самозащита install.php"].map((t) => (
              <span key={t} className="px-3 py-1.5 rounded-lg bg-deep-line/40 border border-deep-line text-[12px] font-bold text-paper/80">{t}</span>
            ))}
          </div>

          <div className="mt-8 p-6 rounded-2xl bg-deep-2/80 border border-deep-line relative overflow-hidden anim-fade-up" style={{ animationDelay: "240ms" }}>
            <div className="absolute inset-0 blueprint opacity-40" />
            <div className="relative flex flex-wrap items-center gap-5">
              <span className={`w-16 h-16 rounded-2xl grid place-items-center shrink-0 transition-all duration-500 ${done ? "bg-ok/20 text-ok" : "bg-amber-brand text-deep"}`}>
                <I n={done ? "check" : "dl"} s={28} c={done ? "" : "anim-float"} />
              </span>
              <div className="flex-1 min-w-[200px]">
                {!started ? (
                  <>
                    <p className="font-display font-bold text-[17px]">
                      {failed ? "Не удалось прочитать файлы пакета" : !files ? "Читаем файлы пакета…" : packed < files.length ? `Упаковываем… ${packed}/${files.length}` : `Скачивание через ${count}…`}
                    </p>
                    <p className="text-[13px] text-paper/60 mt-1">{failed ? "Обновите страницу или скачайте из консоли (кнопка ZIP)" : "или нажмите кнопку, чтобы скачать прямо сейчас"}</p>
                  </>
                ) : (
                  <>
                    <p className="font-display font-bold text-[17px]">{done ? "Скачивание началось" : "Готовим архив…"}</p>
                    <p className="text-[13px] text-paper/60 mt-1">{done ? "Файл появился в папке загрузок браузера" : "Одну секунду"}</p>
                  </>
                )}
              </div>
              <button onClick={doDl} disabled={!files}
                className="h-[52px] px-7 rounded-xl bg-amber-brand text-deep font-display font-extrabold text-[15px] hover:bg-amber-deep hover:text-white transition-all active:scale-[.97] cursor-pointer disabled:opacity-50 flex items-center gap-2.5"
                style={{ boxShadow: "0 8px 24px -8px rgba(240,180,41,.55)" }}>
                <I n="dl" s={18} />Скачать ZIP
              </button>
            </div>
            {done && (
              <button onClick={() => { fired.current = false; setStarted(false); setDone(false); setCount(3); }}
                className="relative mt-4 text-[13px] font-bold text-teal-brand hover:text-teal-soft transition-colors cursor-pointer flex items-center gap-2">
                <I n="refresh" s={14} />Скачать ещё раз
              </button>
            )}
          </div>

          <div className="mt-5 flex items-center gap-3 anim-fade-up" style={{ animationDelay: "300ms" }}>
            <code className="flex-1 truncate text-[12.5px] text-paper/60 bg-deep-2/60 border border-deep-line rounded-lg px-3.5 py-2.5 font-mono">{share}</code>
            <button onClick={() => { navigator.clipboard?.writeText(share).catch(() => undefined); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="h-10 px-4 rounded-lg border border-deep-line text-paper/75 hover:text-teal-brand hover:border-teal-brand/50 transition-all cursor-pointer text-[13px] font-bold flex items-center gap-2 shrink-0">
              <I n={copied ? "check" : "copy"} s={15} />{copied ? "Скопировано" : "Копировать"}
            </button>
          </div>

          <div className="mt-9 grid sm:grid-cols-3 gap-3.5">
            {[["Распакуйте", "в корень сайта — public_html или /var/www"], ["Откройте домен", "установщик запустится автоматически"], ["Войдите в ?admin=1", "пароль + код 2FA из письма"]].map(([t, d], i) => (
              <div key={t} className="p-4 rounded-xl bg-deep-2/50 border border-deep-line hover:border-teal-brand/40 hover:-translate-y-0.5 transition-all anim-fade-up" style={{ animationDelay: `${360 + i * 70}ms` }}>
                <span className="w-7 h-7 rounded-lg bg-teal-brand/15 text-teal-brand grid place-items-center font-display font-extrabold text-[13px]">{i + 1}</span>
                <p className="font-bold text-[14px] mt-2.5">{t}</p>
                <p className="text-[12px] text-paper/55 mt-1 leading-snug">{d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl overflow-hidden border border-deep-line bg-deep-2/60 shadow-pop">
            <div className="flex items-center gap-2 px-4 h-10 bg-deep border-b border-deep-line">
              <span className="w-2.5 h-2.5 rounded-full bg-danger/70" /><span className="w-2.5 h-2.5 rounded-full bg-amber-brand/70" /><span className="w-2.5 h-2.5 rounded-full bg-ok/70" />
              <span className="ml-2 text-[12px] font-bold text-paper/50 font-mono">wt-pack — сборка архива</span>
              <span className="ml-auto text-[11px] font-bold text-teal-brand tabular">{files ? Math.min(packed, files.length) : 0}/{MANIFEST.length}</span>
            </div>
            <div className="p-4 font-mono text-[12px] leading-[1.9] h-56 overflow-hidden">
              <p className="text-paper/50">$ wordtime pack --target Wordtime_cms.zip</p>
              {(files ?? []).slice(0, packed).map((f) => (
                <p key={f.path} className="anim-fade"><span className="text-ok">✓</span> <span className="text-paper/85">{f.path.replace("Wordtime_cms/", "")}</span> <span className="text-paper/40">· {fmtB(new TextEncoder().encode(f.content).length)} · crc {crc32(new TextEncoder().encode(f.content)).toString(16).padStart(8, "0").slice(0, 8)}</span></p>
              ))}
              {files && packed >= files.length && <p className="text-amber-brand anim-fade font-bold">Архив готов — {files.length} файлов, контрольные суммы верны</p>}
              {(!files || packed < files.length) && !failed && <span className="inline-block w-2 h-4 bg-teal-brand align-middle" style={{ animation: "wt-blink 1s steps(2) infinite" }} />}
              {failed && <p className="text-danger">ошибка чтения файлов — обновите страницу</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-deep-line bg-deep-2/40 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-deep-line flex items-center gap-2.5">
              <I n="package" s={15} c="text-teal-brand" />
              <p className="font-display font-bold text-[14px]">Содержимое архива</p>
              <span className="ml-auto text-[11.5px] font-bold text-paper/45 tabular">{total ? fmtB(total) : "…"}</span>
            </div>
            <ul>
              {MANIFEST.map((f) => {
                const content = files?.find((x) => x.path === f.path)?.content ?? "";
                return (
                  <li key={f.path} className="flex items-center gap-3 px-5 py-2.5 border-b border-deep-line/50 last:border-0 hover:bg-deep-line/25 transition-colors group" title={f.note}>
                    <I n="file" s={14} c="text-paper/40 shrink-0" />
                    <span className="font-mono text-[12px] text-paper/90 w-44 shrink-0 truncate">{f.path.replace("Wordtime_cms/", "")}</span>
                    <span className="text-[11.5px] text-paper/50 flex-1 truncate hidden md:block">{f.note}</span>
                    <span className="text-[11px] font-bold text-paper/40 tabular shrink-0">{content ? fmtB(new TextEncoder().encode(content).length) : "…"}</span>
                    <button disabled={!content} onClick={() => { dlBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), f.path.split("/").pop() ?? "file.txt"); toast("ok", "Файл скачан", f.path.replace("Wordtime_cms/", "")); }}
                      className="w-7 h-7 grid place-items-center rounded-md text-paper/35 hover:text-teal-brand hover:bg-teal-brand/10 transition-all cursor-pointer shrink-0 opacity-60 group-hover:opacity-100 disabled:opacity-25" title="Скачать файл">
                      <I n="dl" s={13} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ═══════════════ Корень ═══════════════ */
export default function App() {
  const hash = useHash();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [auth, setAuth] = useState<{ name: string } | null>(() => {
    try { const r = sessionStorage.getItem("wt_demo_auth"); return r ? JSON.parse(r) : null; } catch { return null; }
  });
  const toast = useCallback((kind: Toast["kind"], title: string, text?: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, title, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200);
  }, []);
  const drop = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  if (hash.startsWith("#/download")) {
    return (<><DownloadPage toast={toast} /><Toasts list={toasts} drop={drop} /></>);
  }
  if (!auth) {
    return (<><Login toast={toast} onOk={(name) => { setAuth({ name }); try { sessionStorage.setItem("wt_demo_auth", JSON.stringify({ name })); } catch { /* noop */ } toast("ok", "Вход подтверждён", "2FA пройдена — добро пожаловать в консоль"); }} /><Toasts list={toasts} drop={drop} /></>);
  }
  return (
    <>
      <Admin userName={auth.name} toast={toast} onOut={() => { setAuth(null); try { sessionStorage.removeItem("wt_demo_auth"); } catch { /* noop */ } toast("info", "Вы вышли из консоли", "Сессия завершена"); }} />
      <Toasts list={toasts} drop={drop} />
    </>
  );
}
