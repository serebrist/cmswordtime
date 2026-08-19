import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState, BackupItem, Comment, Post, UserItem, fmtKB, nowStamp, seedState, uid } from "./data";

/* ── типы ──────────────────────────────────────────────────────────── */

export type ToastKind = "ok" | "info" | "warn" | "danger";
export interface Toast { id: string; kind: ToastKind; title: string; text?: string; }
export interface EmailMsg { to: string; subject: string; code: string; ts: number; }
export interface PendingAuth { purpose: "login" | "register"; email: string; name?: string; code: string; attempts: number; }

interface Store {
  state: AppState;
  route: string; nav: (r: string) => void;
  toasts: Toast[]; toast: (kind: ToastKind, title: string, text?: string) => void; dropToast: (id: string) => void;
  authed: UserItem | null; pending: PendingAuth | null; email: EmailMsg | null;
  startLogin: (email: string, password: string) => string | null;
  startRegister: (name: string, email: string, password: string) => string | null;
  verifyCode: (code: string) => boolean;
  resendCode: () => void;
  logout: () => void;
  dismissEmail: () => void;
  mutate: (fn: (s: AppState) => void) => void;
  patchSettings: (p: Partial<AppState["settings"]>) => void;
  patchLoginCustom: (p: Partial<AppState["settings"]["login"]>) => void;
  clearCache: () => void;
  runBackup: (kind: "Полная" | "База данных", label: string) => void;
  backupBusy: number; // -1 idle, else progress %
  downloadBackup: (b: BackupItem) => void;
  restoreBackup: (b: BackupItem) => boolean;
  importWpress: (file: File) => void;
  importBusy: number;
  restoreFromFile: (file: File) => boolean;
  siteOpen: boolean; setSiteOpen: (v: boolean) => void;
  openPost: (postId?: string) => void;
}

const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);

const LS_KEY = "wordtime_cms_state_v1";

/* ── защита: санитизация, детектор инъекций, журнал безопасности ── */

export function sanitizeInput(v: string): string {
  return v
    .replace(/<\s*\/?\s*(script|iframe|object|embed|style|svg|link|meta)[^>]*>/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/on(error|load|click|mouse\w+)\s*=/gi, "")
    .replace(/('|"|;|--)\s*(union|select|insert|update|delete|drop|truncate)\s+/gi, "$1 ")
    .replace(/<\s*(img|body)\b[^>]*>/gi, "");
}

export function detectInjection(v: string): boolean {
  return /<\s*script|javascript\s*:|onerror\s*=|<\s*iframe|union\s+select|drop\s+table|;\s*delete\s+from|sleep\s*\(\s*\d/i.test(v);
}

export interface SecEntry { t: string; time: string; }
const SEC_KEY = "wordtime_seclog_v1";

export function secLogPush(t: string) {
  try {
    const list = secLogRead();
    list.unshift({ t, time: new Date().toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) });
    localStorage.setItem(SEC_KEY, JSON.stringify(list.slice(0, 40)));
  } catch { /* quota */ }
}

export function secLogRead(): SecEntry[] {
  try {
    const raw = localStorage.getItem(SEC_KEY);
    if (raw) return JSON.parse(raw) as SecEntry[];
  } catch { /* повреждено */ }
  const seed: SecEntry[] = [
    { t: "Ядро 1.0.4: проверка целостности файлов — изменений нет", time: "12.02, 06:12" },
    { t: "Экранирование SQL-запросов активно (подготовленные выражения)", time: "12.02, 06:12" },
    { t: "Отражена тестовая XSS-попытка в поле поиска", time: "11.02, 22:47" },
  ];
  try { localStorage.setItem(SEC_KEY, JSON.stringify(seed)); } catch { /* quota */ }
  return seed;
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      const seed = seedState();
      // мягкое слияние на случай обновления структуры
      return {
        ...seed, ...parsed,
        settings: { ...seed.settings, ...parsed.settings, login: { ...seed.settings.login, ...(parsed.settings?.login ?? {}) } },
        cache: { ...seed.cache, ...(parsed.cache ?? {}) },
      };
    }
  } catch { /* повреждённые данные — стартуем заново */ }
  return seedState();
}

/* ── провайдер ─────────────────────────────────────────────────────── */

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const [route, setRoute] = useState("dashboard");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [authed, setAuthed] = useState<UserItem | null>(null);
  const [pending, setPending] = useState<PendingAuth | null>(null);
  const [email, setEmail] = useState<EmailMsg | null>(null);
  const [backupBusy, setBackupBusy] = useState(-1);
  const [importBusy, setImportBusy] = useState(-1);
  const [siteOpen, setSiteOpen] = useState(false);
  const timers = useRef<number[]>([]);

  /* персистентность */
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { /* quota */ }
  }, [state]);

  /* кеш «дышит» — растёт при активности */
  useEffect(() => {
    const t = window.setInterval(() => {
      setState(s => s.settings.cacheEnabled
        ? { ...s, cache: { ...s.cache, sizeKB: s.cache.sizeKB + Math.round(60 + Math.random() * 220), hits: s.cache.hits + Math.round(40 + Math.random() * 300) } }
        : s);
    }, 12000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)); }, []);

  const mutate: Store["mutate"] = (fn) => setState(s => { const n = structuredClone(s); fn(n); return n; });

  const toast: Store["toast"] = (kind, title, text) => {
    const id = uid();
    setToasts(t => [...t.slice(-3), { id, kind, title, text }]);
    const timer = window.setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4600);
    timers.current.push(timer);
  };
  const dropToast = (id: string) => setToasts(t => t.filter(x => x.id !== id));

  const nav: Store["nav"] = (r) => {
    setRoute(r);
    setSiteOpen(false);
    setState(s => s.settings.cacheEnabled ? { ...s, cache: { ...s.cache, sizeKB: s.cache.sizeKB + Math.round(20 + Math.random() * 90) } } : s);
  };

  /* ── аутентификация + 2FA + защита ── */
  const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

  const sendEmail = (to: string, code: string) => {
    const msg: EmailMsg = { to, subject: "Wordtime: код подтверждения входа", code, ts: Date.now() };
    setEmail(msg); // «письмо» приходит с небольшой задержкой
  };

  /* защита от подбора пароля: 5 неудач → блокировка 60 сек (переживает перезагрузку) */
  const LOCK_KEY = "wordtime_bruteforce_v1";
  const readLock = (): { count: number; until: number } => {
    try { const r = JSON.parse(localStorage.getItem(LOCK_KEY) ?? ""); return { count: r.count ?? 0, until: r.until ?? 0 }; } catch { return { count: 0, until: 0 }; }
  };
  const writeLock = (l: { count: number; until: number }) => localStorage.setItem(LOCK_KEY, JSON.stringify(l));

  const startLogin: Store["startLogin"] = (rawMail, rawPassword) => {
    const lock = readLock();
    const now = Date.now();
    if (lock.until > now) {
      secLogPush(`Вход отклонён: действует блокировка подбора (${Math.ceil((lock.until - now) / 1000)} с)`);
      return `Сработала защита от подбора паролей. Повторите через ${Math.ceil((lock.until - now) / 1000)} сек.`;
    }
    /* анти-инъекция: чистим ввод до любых проверок */
    const mail = sanitizeInput(rawMail);
    const password = sanitizeInput(rawPassword);
    if (detectInjection(rawMail) || detectInjection(rawPassword)) {
      writeLock({ count: 0, until: now + 60_000 });
      secLogPush(`Заблокирована попытка инъекции в форме входа (${rawMail.slice(0, 24)}…)`);
      toast("danger", "Заблокировано", "Похоже на попытку инъекции. Вход закрыт на 60 секунд.");
      return "Ввод содержит запрещённые конструкции. Вход заблокирован на 60 секунд.";
    }
    const user = state.users.find(u => u.email.toLowerCase() === mail.trim().toLowerCase());
    const wrong = !user
      ? "Пользователь с такой почтой не найден."
      : (user.password && user.password !== password) || (!user.password && password.length < 4)
        ? "Неверный пароль. Попробуйте ещё раз."
        : null;
    if (wrong) {
      const count = lock.count + 1;
      if (count >= 5) {
        writeLock({ count: 0, until: now + 60_000 });
        secLogPush(`Подбор пароля: 5 неудачных попыток для «${mail || "—"}» — блокировка 60 с`);
        toast("danger", "Слишком много попыток", "Защита от подбора: вход заблокирован на 60 секунд.");
        return "5 неудачных попыток. Вход заблокирован на 60 секунд.";
      }
      writeLock({ count, until: 0 });
      secLogPush(`Неудачная попытка входа (${count} из 5) для «${mail || "—"}»`);
      return wrong + ` Осталось попыток: ${5 - count}.`;
    }
    writeLock({ count: 0, until: 0 });
    secLogPush(`Пароль принят для «${user!.email}» — отправлен код 2FA`);
    const code = genCode();
    setPending({ purpose: "login", email: user!.email, name: user!.name, code, attempts: 0 });
    window.setTimeout(() => sendEmail(user!.email, code), 700);
    return null;
  };

  const startRegister: Store["startRegister"] = (rawName, rawMail, rawPassword) => {
    const name = sanitizeInput(rawName);
    const m = sanitizeInput(rawMail).trim().toLowerCase();
    const password = sanitizeInput(rawPassword);
    if (detectInjection(rawName) || detectInjection(rawMail)) {
      secLogPush(`Заблокирована инъекция при регистрации (${rawMail.slice(0, 24)}…)`);
      return "Ввод содержит запрещённые конструкции — регистрация отклонена.";
    }
    if (name.trim().length < 2) return "Укажите имя (минимум 2 символа).";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) return "Похоже, в адресе почты опечатка.";
    if (password.length < 6) return "Пароль должен быть не короче 6 символов.";
    if (state.users.some(u => u.email.toLowerCase() === m)) return "Эта почта уже зарегистрирована.";
    const code = genCode();
    setPending({ purpose: "register", email: m, name: sanitizeInput(name).trim(), code, attempts: 0 });
    window.setTimeout(() => sendEmail(m, code), 700);
    return null;
  };

  const verifyCode: Store["verifyCode"] = (code) => {
    if (!pending) return false;
    if (code !== pending.code) {
      if (pending.attempts >= 4) {
        setPending(null); setEmail(null);
        toast("danger", "Слишком много попыток", "Запросите код заново — вход сброшен.");
        return false;
      }
      setPending({ ...pending, attempts: pending.attempts + 1 });
      return false;
    }
    if (pending.purpose === "register") {
      const nu: UserItem = { id: uid(), name: pending.name!, email: pending.email, role: "Автор", date: nowStamp().slice(0, 10), color: "#2c6b7a", password: "" };
      mutate(s => { s.users.push(nu); s.activity.unshift({ id: uid(), text: `Зарегистрирован пользователь ${nu.name}`, time: "только что", icon: "users" }); });
      setAuthed(nu);
      toast("ok", "Аккаунт создан", "Добро пожаловать в Wordtime!");
    } else {
      const user = state.users.find(u => u.email.toLowerCase() === pending.email.toLowerCase())!;
      setAuthed(user);
      toast("ok", `С возвращением, ${user.name.split(" ")[0]}!`, "Код подтверждён, вход выполнен.");
    }
    setPending(null); setEmail(null);
    return true;
  };

  const resendCode = () => {
    if (!pending) return;
    const code = genCode();
    setPending({ ...pending, code, attempts: 0 });
    sendEmail(pending.email, code);
    toast("info", "Код отправлен повторно", `Новый код уже летит на ${pending.email}.`);
  };

  const logout = () => {
    setAuthed(null); setPending(null); setEmail(null);
    setRoute("dashboard"); setSiteOpen(false);
    toast("info", "Вы вышли из консоли", "Сессия завершена безопасно.");
  };

  /* ── настройки ── */
  const patchSettings: Store["patchSettings"] = (p) => mutate(s => { s.settings = { ...s.settings, ...p }; });
  const patchLoginCustom: Store["patchLoginCustom"] = (p) => mutate(s => { s.settings.login = { ...s.settings.login, ...p }; });

  /* ── кеш ── */
  const clearCache = () => {
    mutate(s => { s.cache = { sizeKB: 12 + Math.round(Math.random() * 40), lastCleared: nowStamp(), hits: s.cache.hits }; });
    toast("ok", "Кеш сайта очищен", "Страницы будут собраны заново при следующем обращении.");
  };

  /* ── резервные копии (WT-Миграция) ── */
  const runBackup: Store["runBackup"] = (kind, label) => {
    if (backupBusy >= 0) return;
    setBackupBusy(2);
    const steps = [8, 19, 31, 44, 57, 69, 80, 90, 100];
    steps.forEach((p, i) => {
      const t = window.setTimeout(() => {
        setBackupBusy(p);
        if (p === 100) {
          const snap = JSON.stringify({ app: "Wordtime CMS", format: "wtm", version: state.version, exported: nowStamp(), state });
          const sizeKB = Math.round(new Blob([snap]).size / 1024);
          mutate(s => {
            s.backups.unshift({ id: uid(), date: nowStamp(), sizeKB, label, kind, snapshot: snap });
            s.activity.unshift({ id: uid(), text: `Создана резервная копия (${label.toLowerCase()})`, time: "только что", icon: "cloud" });
          });
          setBackupBusy(-1);
          toast("ok", "Резервная копия готова", `${label} · ${fmtKB(sizeKB)}. Файл доступен для скачивания.`);
        }
      }, 260 * (i + 1));
      timers.current.push(t);
    });
  };

  const downloadBackup: Store["downloadBackup"] = (b) => {
    const body = b.snapshot || JSON.stringify({ app: "Wordtime CMS", format: "wtm", version: state.version, exported: nowStamp(), state });
    const blob = new Blob([body], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wordtime-${b.kind === "Полная" ? "full" : "db"}-${b.date.replace(/[:\s]/g, "-")}.wtm`;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("info", "Скачивание началось", a.download);
  };

  const restoreBackup: Store["restoreBackup"] = (b) => {
    try {
      const snap = b.snapshot ? JSON.parse(b.snapshot) : { state };
      const target = (snap.state ?? snap) as AppState;
      if (!target.settings || !target.posts) throw new Error("bad");
      setState(s => ({ ...s, ...target, version: s.version }));
      toast("ok", "Сайт восстановлен", `Из копии от ${b.date}. Все данные заменены.`);
      return true;
    } catch {
      toast("danger", "Не удалось восстановить", "Файл копии повреждён или несовместим.");
      return false;
    }
  };

  const restoreFromFile: Store["restoreFromFile"] = (file) => {
    try {
      const text = (file as unknown as { __text?: string }).__text;
      if (!text) return false;
      const snap = JSON.parse(text);
      const target = (snap.state ?? snap) as AppState;
      if (!target.settings || !target.posts) throw new Error("bad");
      setState(s => ({ ...s, ...target, version: s.version }));
      toast("ok", "Сайт восстановлен", `Из файла ${file.name}.`);
      return true;
    } catch {
      toast("danger", "Файл не похож на копию Wordtime", "Ожидается файл .wtm с данными сайта.");
      return false;
    }
  };

  /* импорт .wpress (All-in-One WP Migration) — симуляция конвертации */
  const importWpress: Store["importWpress"] = (file) => {
    if (importBusy >= 0) return;
    setImportBusy(2);
    const steps = [12, 28, 47, 63, 78, 89, 100];
    steps.forEach((p, i) => {
      const t = window.setTimeout(() => {
        setImportBusy(p);
        if (p === 100) {
          const sizeKB = Math.max(260, Math.round(file.size / 1024) || 1450);
          mutate(s => {
            s.backups.unshift({ id: uid(), date: nowStamp(), sizeKB, label: `Импорт ${file.name}`, kind: "Полная", snapshot: "" });
            s.activity.unshift({ id: uid(), text: `Импортирован архив ${file.name} через WT-Конвертер`, time: "только что", icon: "cloud" });
          });
          setImportBusy(-1);
          toast("ok", "Архив WordPress импортирован", "Файл .wpress конвертирован в формат Wordtime.");
        }
      }, 340 * (i + 1));
      timers.current.push(t);
    });
  };

  const openPost: Store["openPost"] = (postId) => nav(postId ? `post-edit:${postId}` : "post-new");

  const value: Store = {
    state, route, nav, toasts, toast, dropToast,
    authed, pending, email, startLogin, startRegister, verifyCode, resendCode, logout,
    dismissEmail: () => setEmail(null),
    mutate, patchSettings, patchLoginCustom, clearCache,
    runBackup, backupBusy, downloadBackup, restoreBackup, importWpress, importBusy, restoreFromFile,
    siteOpen, setSiteOpen, openPost,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ── хук чтения файла ── */
export function useFileRead(onText: (text: string, file: File) => void) {
  return (file: File) => {
    const r = new FileReader();
    r.onload = () => onText(String(r.result ?? ""), file);
    r.readAsText(file);
  };
}
