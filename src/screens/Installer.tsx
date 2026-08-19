import React, { useEffect, useRef, useState } from "react";
import { I } from "../components/icons";
import { Btn, Toggle, inputCls } from "../components/ui";
import { useStore } from "../lib/store";

/* ── Логотип-окно с песочными часами ── */
export function WTWindowMark({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-label="Wordtime — установка">
      <rect x="10" y="14" width="76" height="68" rx="12" fill="#0c2e36" stroke="#2c6b7a" strokeWidth="2.5" />
      <rect x="10" y="14" width="76" height="18" rx="12" fill="#133b45" />
      <rect x="10" y="26" width="76" height="6" fill="#133b45" />
      <circle cx="22" cy="23" r="3" fill="#e5484d" />
      <circle cx="32" cy="23" r="3" fill="#f5a524" />
      <circle cx="42" cy="23" r="3" fill="#30a46c" />
      <g className="anim-hourflip" style={{ transformOrigin: "48px 56px" }}>
        <path d="M36 40h24M36 72h24" stroke="#f5c36b" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M38.5 40v4.2c0 5.4 9.5 6.6 9.5 11.8s-9.5 6.4-9.5 11.8V72M57.5 40v4.2c0 5.4-9.5 6.6-9.5 11.8s9.5 6.4 9.5 11.8V72" stroke="#3fd0c0" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M44 67c1-2.2 2.7-3.2 4-3.2s3 1 4 3.2" stroke="#f5c36b" strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
      </g>
    </svg>
  );
}

const REQ = [
  ["Сервер", "PHP 8.3.14 (минимум 7.4)"],
  ["База данных", "MariaDB 10.11.6 (минимум 5.7)"],
  ["Веб-сервер", "Apache 2.4 + mod_rewrite"],
  ["Расширения", "mbstring · gd · curl · openssl · zip"],
  ["Память PHP", "256 МБ (рекомендуется 512)"],
  ["Протокол", "HTTPS / TLS 1.3"],
] as const;

const DB_STEPS = [
  "Создание таблиц: wt_posts, wt_options, wt_users, wt_comments…",
  "Копирование ядра: wt-admin/, wt-includes/",
  "Активация WT-Кеш и объектного кеша (Redis-совместимый)",
  "Подключение слоя совместимости WordPress (хуки, wp-* API)",
  "Настройка защиты: 2FA, анти-брутфорс, экранирование инъекций",
];

function pwdStrength(p: string): { score: number; label: string; color: string } {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-ZА-Я]/.test(p) && /[a-zа-я]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-zА-Яа-я0-9]/.test(p)) s++;
  return [
    { score: 0, label: "Введите пароль", color: "#b9c9cc" },
    { score: 1, label: "Слабый", color: "#e5484d" },
    { score: 2, label: "Средний", color: "#f5a524" },
    { score: 3, label: "Надёжный", color: "#3fd0c0" },
    { score: 4, label: "Отличный", color: "#30a46c" },
  ][p.length === 0 ? 0 : Math.max(1, s)];
}

export default function Installer({ onDone }: { onDone: () => void }) {
  const { state, patchSettings, toast } = useStore();
  const [step, setStep] = useState(0);
  const [checks, setChecks] = useState<boolean[]>(REQ.map(() => false));
  const [db, setDb] = useState({ host: "localhost", name: "wordtime", user: "wt_admin", pass: "", prefix: "wt_" });
  const [dbCheck, setDbCheck] = useState<"idle" | "busy" | "ok">("idle");
  const [prog, setProg] = useState(-1);
  const [site, setSite] = useState({ title: "Мой сайт на Wordtime", email: state.settings.adminEmail, pass: "", show: false });
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(t => window.clearTimeout(t)), []);

  /* анимация проверок окружения */
  useEffect(() => {
    if (step !== 1) return;
    setChecks(REQ.map(() => false));
    REQ.forEach((_, i) => timers.current.push(window.setTimeout(() => setChecks(c => c.map((v, j) => (j <= i ? true : v))), 420 * (i + 1))));
  }, [step]);

  /* прогресс установки */
  useEffect(() => {
    if (step !== 3) return;
    setProg(0);
    let p = 0;
    const t = window.setInterval(() => {
      p = Math.min(100, p + 1.6 + Math.random() * 2.6);
      setProg(p);
      if (p >= 100) window.clearInterval(t);
    }, 70);
    timers.current.push(t as unknown as number);
  }, [step]);

  const finish = () => {
    patchSettings({ siteTitle: site.title.trim() || "Мой сайт на Wordtime", adminEmail: site.email });
    toast("ok", "Wordtime установлен", "Вход защищён 2FA — код придёт на почту.");
    onDone();
  };

  const STEPS = ["Язык", "Проверка", "База данных", "Установка", "Ваш сайт"];
  const cur = Math.min(step, 4);

  return (
    <div className="theme-force-dark min-h-screen relative overflow-hidden bg-ink-950 text-paper grain flex items-center justify-center p-4 py-8">
      <div className="absolute inset-0 blueprint opacity-70" />
      <div className="absolute -top-40 -left-40 w-[560px] h-[560px] rounded-full" style={{ background: "radial-gradient(circle, rgba(14,147,132,0.22), transparent 65%)" }} />
      <div className="absolute -bottom-48 -right-32 w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(217,148,23,0.13), transparent 65%)" }} />

      <div className="relative w-full max-w-4xl">
        {/* шапка установщика */}
        <div className="flex items-center gap-5 mb-7">
          <WTWindowMark size={74} />
          <div>
            <p className="font-display font-extrabold text-[26px] leading-none tracking-tight">Установка Wordtime</p>
            <p className="text-[13.5px] text-paper/55 mt-2">Пошаговый мастер — как в WordPress: язык → проверка → база данных → сайт</p>
          </div>
          <span className="ml-auto hidden sm:flex items-center gap-2 text-[12px] font-bold text-teal-brand border border-teal-brand/30 bg-teal-brand/8 px-3 py-1.5 rounded-full">
            <I n="shield" size={14} /> 2FA включается сразу
          </span>
        </div>

        <div className="grid md:grid-cols-[210px_1fr] bg-ink-900/85 border border-ink-700 rounded-2xl shadow-pop overflow-hidden">
          {/* рельса шагов */}
          <div className="bg-ink-950/60 p-4 border-b md:border-b-0 md:border-r border-ink-700/70">
            {STEPS.map((s, i) => (
              <div key={s} className={`flex items-center gap-3 px-3 h-11 rounded-lg mb-1 transition-all ${i === cur ? "bg-teal-deep/15 text-teal-brand" : i < cur ? "text-paper/75" : "text-paper/35"}`}>
                <span className={`w-6 h-6 rounded-full grid place-items-center text-[11.5px] font-extrabold border transition-all
                  ${i < cur ? "bg-teal-deep border-teal-deep text-white" : i === cur ? "border-teal-brand text-teal-brand" : "border-ink-600"}`}>
                  {i < cur ? <I n="check" size={12} sw={3} /> : i + 1}
                </span>
                <span className="text-[13px] font-bold">{s}</span>
                {i === 3 && prog >= 0 && prog < 100 && <I n="refresh" size={13} className="ml-auto anim-spin" />}
              </div>
            ))}
            <p className="mt-4 px-3 text-[11.5px] text-paper/35 leading-relaxed">Wordtime {state.version} · ядро совместимо с плагинами и темами WordPress</p>
          </div>

          {/* содержимое шага */}
          <div className="p-6 md:p-8 min-h-[430px] flex flex-col anim-fade-up" key={step}>
            {step === 0 && (
              <>
                <h2 className="font-display font-extrabold text-[20px]">Выберите язык</h2>
                <p className="text-[13.5px] text-paper/55 mt-1.5">Язык интерфейса консоли и установщика.</p>
                <div className="mt-5 space-y-2.5">
                  <button onClick={() => { }} className="w-full flex items-center gap-3.5 p-4 rounded-xl border-2 border-teal-brand bg-teal-deep/12 cursor-default">
                    <span className="w-5 h-5 rounded-full border-[5px] border-teal-brand" />
                    <span className="text-left"><span className="block font-bold text-[15px]">Русский</span><span className="block text-[12px] text-paper/50">Полная локализация — даты, числа, склонения</span></span>
                    <span className="ml-auto text-[11px] font-extrabold text-teal-brand border border-teal-brand/40 px-2 py-1 rounded-md">ВЫБРАН</span>
                  </button>
                  {["English", "Deutsch"].map(l => (
                    <div key={l} className="w-full flex items-center gap-3.5 p-4 rounded-xl border border-ink-700 opacity-45">
                      <span className="w-5 h-5 rounded-full border-2 border-ink-600" />
                      <span className="font-bold text-[15px]">{l}</span>
                      <span className="ml-auto text-[11.5px] text-paper/50">недоступно — Wordtime только на русском</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-6 flex justify-end"><Btn size="lg" onClick={() => setStep(1)}>Продолжить <I n="chevR" size={15} /></Btn></div>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="font-display font-extrabold text-[20px]">Проверка окружения</h2>
                <p className="text-[13.5px] text-paper/55 mt-1.5">Wordtime проверяет сервер перед установкой.</p>
                <div className="mt-5 space-y-2">
                  {REQ.map(([k, v], i) => (
                    <div key={k} className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-all duration-300 ${checks[i] ? "border-teal-deep/40 bg-teal-deep/8" : "border-ink-700 bg-ink-950/40"}`}>
                      <span className={`w-7 h-7 rounded-full grid place-items-center shrink-0 transition-all ${checks[i] ? "bg-teal-deep text-white" : "bg-ink-700 text-paper/40"}`}>
                        {checks[i] ? <I n="check" size={14} sw={2.6} /> : <I n="clock" size={14} />}
                      </span>
                      <span className="text-[13.5px] font-bold w-32">{k}</span>
                      <span className={`text-[13px] ${checks[i] ? "text-paper/75" : "text-paper/35"}`}>{v}</span>
                      {checks[i] && <span className="ml-auto text-[11.5px] font-extrabold text-teal-brand">ОК</span>}
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-6 flex justify-between">
                  <Btn kind="dark" className="bg-ink-800!" onClick={() => setStep(0)}><I n="arrowL" size={15} />Назад</Btn>
                  <Btn size="lg" disabled={!checks.every(Boolean)} onClick={() => setStep(2)}>Всё готово — к базе данных</Btn>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="font-display font-extrabold text-[20px]">Подключение базы данных</h2>
                <p className="text-[13.5px] text-paper/55 mt-1.5">Таблицы создаются с префиксом — как <code className="text-teal-brand">wp_</code> в WordPress, только <code className="text-teal-brand">wt_</code>.</p>
                <div className="mt-5 grid sm:grid-cols-2 gap-4">
                  <label className="block"><span className="block text-[12.5px] font-bold text-paper/70 mb-1.5">Сервер БД</span>
                    <input value={db.host} onChange={e => { setDb({ ...db, host: e.target.value }); setDbCheck("idle"); }} className={inputCls + " bg-ink-950/60 border-ink-600 text-paper"} /></label>
                  <label className="block"><span className="block text-[12.5px] font-bold text-paper/70 mb-1.5">Имя базы</span>
                    <input value={db.name} onChange={e => { setDb({ ...db, name: e.target.value }); setDbCheck("idle"); }} className={inputCls + " bg-ink-950/60 border-ink-600 text-paper"} /></label>
                  <label className="block"><span className="block text-[12.5px] font-bold text-paper/70 mb-1.5">Пользователь</span>
                    <input value={db.user} onChange={e => { setDb({ ...db, user: e.target.value }); setDbCheck("idle"); }} className={inputCls + " bg-ink-950/60 border-ink-600 text-paper"} /></label>
                  <label className="block"><span className="block text-[12.5px] font-bold text-paper/70 mb-1.5">Пароль</span>
                    <input type="password" value={db.pass} onChange={e => { setDb({ ...db, pass: e.target.value }); setDbCheck("idle"); }} placeholder="••••••••" className={inputCls + " bg-ink-950/60 border-ink-600 text-paper"} /></label>
                  <label className="block"><span className="block text-[12.5px] font-bold text-paper/70 mb-1.5">Префикс таблиц</span>
                    <input value={db.prefix} onChange={e => { setDb({ ...db, prefix: e.target.value }); setDbCheck("idle"); }} className={inputCls + " bg-ink-950/60 border-ink-600 text-paper"} /></label>
                  <div className="flex items-end">
                    <Btn kind="outline" className="w-full border-ink-600! text-paper! hover:border-teal-brand/60!" onClick={() => { setDbCheck("busy"); timers.current.push(window.setTimeout(() => { setDbCheck("ok"); }, 1100)); }}>
                      {dbCheck === "busy" ? <><I n="refresh" size={15} className="anim-spin" />Проверяем…</> : <><I n="database" size={15} />Проверить соединение</>}
                    </Btn>
                  </div>
                </div>
                {dbCheck === "ok" && (
                  <div className="mt-4 flex items-center gap-3 p-3.5 rounded-xl border border-ok/35 bg-ok/10 text-ok anim-fade">
                    <I n="check" size={17} sw={2.4} />
                    <span className="text-[13.5px] font-bold">Соединение установлено — будет создано 12 таблиц {db.prefix}*</span>
                  </div>
                )}
                <div className="mt-auto pt-6 flex justify-between">
                  <Btn kind="dark" className="bg-ink-800!" onClick={() => setStep(1)}><I n="arrowL" size={15} />Назад</Btn>
                  <Btn size="lg" disabled={dbCheck !== "ok"} onClick={() => setStep(3)}>Установить</Btn>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="font-display font-extrabold text-[20px]">Устанавливаем Wordtime…</h2>
                <p className="text-[13.5px] text-paper/55 mt-1.5">Не закрывайте страницу — идёт распаковка ядра.</p>
                <div className="mt-5 h-3 rounded-full bg-ink-950 overflow-hidden border border-ink-700">
                  <div className="h-full rounded-full transition-all duration-200" style={{ width: `${prog}%`, background: "linear-gradient(90deg, #0e9384, #3fd0c0)" }} />
                </div>
                <div className="mt-5 space-y-2.5">
                  {DB_STEPS.map((s, i) => {
                    const done = prog >= (i + 1) * 19;
                    const active = !done && prog >= i * 19;
                    return (
                      <div key={s} className={`flex items-center gap-3 text-[13.5px] transition-all ${done ? "text-teal-brand" : active ? "text-paper" : "text-paper/30"}`}>
                        {done ? <I n="check" size={15} sw={2.6} /> : active ? <I n="refresh" size={15} className="anim-spin" /> : <span className="w-[15px]" />}
                        <span className={active ? "font-bold" : ""}>{s}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-auto pt-6 flex justify-end">
                  <Btn size="lg" disabled={prog < 100} onClick={() => setStep(4)}>{prog < 100 ? `Идёт установка · ${Math.min(99, Math.round(prog))}%` : "Установка завершена — дальше"}</Btn>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="font-display font-extrabold text-[20px]">Ваш сайт</h2>
                <p className="text-[13.5px] text-paper/55 mt-1.5">Последний шаг — название сайта и учётная запись администратора.</p>
                <div className="mt-5 space-y-4">
                  <label className="block"><span className="block text-[12.5px] font-bold text-paper/70 mb-1.5">Название сайта</span>
                    <input value={site.title} onChange={e => setSite({ ...site, title: e.target.value })} className={inputCls + " bg-ink-950/60 border-ink-600 text-paper"} /></label>
                  <label className="block"><span className="block text-[12.5px] font-bold text-paper/70 mb-1.5">Почта администратора</span>
                    <input value={site.email} onChange={e => setSite({ ...site, email: e.target.value })} className={inputCls + " bg-ink-950/60 border-ink-600 text-paper"} /></label>
                  <div>
                    <span className="block text-[12.5px] font-bold text-paper/70 mb-1.5">Пароль администратора</span>
                    <div className="flex gap-2">
                      <input type={site.show ? "text" : "password"} value={site.pass} onChange={e => setSite({ ...site, pass: e.target.value })} placeholder="Минимум 8 символов" className={inputCls + " bg-ink-950/60 border-ink-600 text-paper"} />
                      <button onClick={() => setSite({ ...site, show: !site.show })} className="w-11 shrink-0 rounded-lg border border-ink-600 text-paper/60 hover:text-teal-brand transition-colors grid place-items-center cursor-pointer"><I n={site.show ? "eyeoff" : "eye"} size={17} /></button>
                    </div>
                    <div className="flex gap-1.5 mt-2.5">
                      {[0, 1, 2, 3].map(i => <span key={i} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: i < pwdStrength(site.pass).score ? pwdStrength(site.pass).color : "#1d3a42" }} />)}
                      <span className="text-[11.5px] font-bold w-24 text-right" style={{ color: pwdStrength(site.pass).color }}>{pwdStrength(site.pass).label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-ink-700 bg-ink-950/40">
                    <Toggle on={true} disabled big onChange={() => undefined} />
                    <div><p className="text-[13.5px] font-bold">2FA по почте — обязательна</p><p className="text-[12px] text-paper/50">Шестизначный код при каждом входе. Отключить нельзя — это ядро безопасности Wordtime.</p></div>
                  </div>
                </div>
                <div className="mt-auto pt-6 flex justify-between">
                  <Btn kind="dark" className="bg-ink-800!" onClick={() => setStep(3)}><I n="arrowL" size={15} />Назад</Btn>
                  <Btn size="lg" kind="amber" disabled={site.pass.length < 8 || !site.email.includes("@")} onClick={finish}>Завершить установку</Btn>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-[12px] text-paper/35 mt-5">Демо-режим: данные хранятся локально в вашем браузере. Вход после установки — почта администратора + код из письма.</p>
      </div>
    </div>
  );
}
