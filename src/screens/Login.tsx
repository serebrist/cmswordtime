import React, { useEffect, useMemo, useRef, useState } from "react";
import { I, WTMark } from "../components/icons";
import { Btn, EmailNotifier } from "../components/ui";
import { useStore } from "../lib/store";

/* ── дрейфующие глифы на брендовой панели ── */
const GLYPHS = ["W", "Р", "Д", "М", "Б", "t", "e", "i", "K", "Ж", "§", "m", "Я", "w"];

function Drift() {
  const items = useMemo(() =>
    Array.from({ length: 16 }, (_, i) => ({
      g: GLYPHS[i % GLYPHS.length],
      left: (i * 61) % 100,
      top: 18 + ((i * 37) % 74),
      dur: 9 + ((i * 13) % 9),
      delay: (i * 0.85) % 8,
      size: 13 + ((i * 7) % 22),
      o: 0.14 + ((i * 11) % 30) / 100,
    })), []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map((it, i) => (
        <span key={i} className="absolute font-display font-bold text-teal-brand"
          style={{
            left: `${it.left}%`, top: `${it.top}%`, fontSize: it.size,
            ["--o" as string]: it.o, ["--dx" as string]: `${((i % 5) - 2) * 26}px`, ["--rot" as string]: `${((i % 7) - 3) * 9}deg`,
            animation: `wt-drift ${it.dur}s linear ${it.delay}s infinite`, opacity: 0,
          }}>{it.g}</span>
      ))}
    </div>
  );
}

/* ── шести значный код ── */
function CodeInput({ onFull, disabled }: { onFull: (code: string) => void; disabled?: boolean }) {
  const [vals, setVals] = useState<string[]>(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  const set = (i: number, v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 6);
    const next = [...vals];
    if (digits.length > 1) {
      for (let k = 0; k < 6; k++) next[k] = digits[k] ?? "";
      setVals(next);
      refs.current[Math.min(digits.length, 5)]?.focus();
      if (digits.length === 6) onFull(digits);
      return;
    }
    next[i] = digits;
    setVals(next);
    if (digits && i < 5) refs.current[i + 1]?.focus();
    if (next.every(d => d !== "")) onFull(next.join(""));
  };

  return (
    <div className="flex gap-2 justify-between">
      {vals.map((v, i) => (
        <input key={i} ref={el => { refs.current[i] = el; }} value={v} disabled={disabled}
          onChange={e => set(i, e.target.value)}
          onKeyDown={e => {
            if (e.key === "Backspace" && !v && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
          }}
          inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} aria-label={`Цифра ${i + 1}`}
          className="code-box w-full aspect-[4/5] max-w-[52px] text-center font-display font-bold text-[22px] text-ink-900 bg-paper border-2 border-line rounded-xl outline-none transition-all disabled:opacity-50"
        />
      ))}
    </div>
  );
}

/* ── экран входа ── */
export default function Login() {
  const { state, pending, email, startLogin, startRegister, verifyCode, resendCode } = useStore();
  const L = state.settings.login;
  const [tab, setTab] = useState<"login" | "register">("login");
  const [mail, setMail] = useState(""); const [pass, setPass] = useState(""); const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [checking, setChecking] = useState(false);
  const [codeErr, setCodeErr] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!pending) { setSent(false); setCodeErr(false); return; }
    setSent(false);
    const t = window.setTimeout(() => setSent(true), 750);
    return () => window.clearTimeout(t);
  }, [pending?.code]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const bg = L.mode === "solid"
    ? { background: L.accent }
    : L.mode === "image" && L.imageUrl
      ? { backgroundImage: `linear-gradient(rgba(7,27,33,0.82), rgba(12,46,54,0.88)), url(${L.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: `linear-gradient(160deg, #071b21 0%, #0c2e36 42%, ${L.accent} 135%)` };

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    const error = tab === "login" ? startLogin(mail, pass) : startRegister(name, mail, pass);
    if (error) { setErr(error); setShake(s => s + 1); setCooldown(30); return; }
    setCooldown(30);
  };

  const onCode = (code: string) => {
    setChecking(true);
    window.setTimeout(() => {
      const ok = verifyCode(code);
      setChecking(false);
      if (!ok) { setCodeErr(true); setShake(s => s + 1); }
    }, 550);
  };

  const radius = L.rounded ? "rounded-2xl" : "rounded-md";
  const attemptsLeft = pending ? 5 - pending.attempts : 5;

  return (
    <div className="theme-force-light min-h-screen flex bg-ink-950 text-paper">
      {email && <EmailNotifier msg={email} />}

      {/* ── брендовая панель ── */}
      <div className="relative hidden lg:flex flex-col justify-between w-[46%] max-w-[620px] grain blueprint overflow-hidden" style={bg}>
        <Drift />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-25 blur-3xl" style={{ background: L.accent }} />
        <div className="relative p-10">
          <div className="flex items-center gap-3.5">
            <WTMark size={44} />
            <div>
              <p className="font-display font-extrabold text-[21px] leading-none tracking-tight">{L.logoText || "Wordtime"}</p>
              <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-paper/50 mt-1.5">система управления сайтом</p>
            </div>
          </div>
        </div>
        <div className="relative p-10">
          <p className="font-display font-extrabold text-[clamp(26px,3.2vw,42px)] leading-[1.12] tracking-tight">
            Ваш сайт.<br />Ваше время.<br />
            <span className="text-teal-brand">Wordtime.</span>
          </p>
          <p className="mt-5 text-[14px] text-paper/65 max-w-md leading-relaxed">
            Знакомая консоль, русский язык из коробки, обязательная 2FA и перенос сайта одним файлом — всё уже в ядре.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["WT-Совместимость с WordPress®", "2FA из коробки", "Миграция одним файлом"].map(t => (
              <span key={t} className="px-3 py-1.5 rounded-full border border-paper/15 bg-ink-950/30 text-[12px] font-semibold text-paper/75">{t}</span>
            ))}
          </div>
        </div>
        <div className="relative p-10 pt-0 flex items-center gap-2.5 text-[12px] text-paper/45">
          <I n="shield" size={15} /> {L.sideNote} · ядро {state.version}
        </div>
      </div>

      {/* ── форма ── */}
      <div className="flex-1 grid place-items-center p-6 relative">
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-3">
          <WTMark size={38} /><span className="font-display font-extrabold text-[18px]">{L.logoText || "Wordtime"}</span>
        </div>

        <div className={`w-full max-w-[440px] bg-card text-ink-900 ${radius} shadow-pop anim-fade-up ${shake ? "anim-shake" : ""}`} key={shake}>
          <div className="p-8">
            {!pending && (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="font-display font-extrabold text-[24px] tracking-tight text-ink-900">{tab === "login" ? "Вход в консоль" : "Регистрация"}</h1>
                    <p className="text-[13.5px] text-mut mt-1.5">{L.message}</p>
                  </div>
                  <span className="lg:hidden"><WTMark size={40} light /></span>
                </div>

                {L.showRegister && (
                  <div className="mt-6 grid grid-cols-2 p-1 bg-paper rounded-xl text-[13px] font-bold">
                    {(["login", "register"] as const).map(t => (
                      <button key={t} onClick={() => { setTab(t); setErr(null); }}
                        className={`h-9 rounded-lg transition-all cursor-pointer ${tab === t ? "bg-card shadow text-ink-900" : "text-mut hover:text-ink-800"}`}>
                        {t === "login" ? "Вход" : "Регистрация"}
                      </button>
                    ))}
                  </div>
                )}

                <form onSubmit={submit} className="mt-6 space-y-4">
                  {tab === "register" && (
                    <div>
                      <label className="block text-[12.5px] font-bold text-ink-800 mb-1.5">Ваше имя</label>
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="Иван Печатников"
                        className="w-full h-11 px-3.5 rounded-lg border border-line bg-card outline-none focus:border-teal-deep focus:ring-[3px] focus:ring-teal-deep/15 transition-all text-[14px]" />
                    </div>
                  )}
                  <div>
                    <label className="block text-[12.5px] font-bold text-ink-800 mb-1.5">Электронная почта</label>
                    <input value={mail} onChange={e => setMail(e.target.value)} placeholder="admin@wordtime.ru" type="email" required
                      className="w-full h-11 px-3.5 rounded-lg border border-line bg-card outline-none focus:border-teal-deep focus:ring-[3px] focus:ring-teal-deep/15 transition-all text-[14px]" />
                  </div>
                  <div>
                    <label className="block text-[12.5px] font-bold text-ink-800 mb-1.5">Пароль</label>
                    <div className="relative">
                      <input value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" required
                        type={showPass ? "text" : "password"}
                        className="w-full h-11 px-3.5 pr-11 rounded-lg border border-line bg-card outline-none focus:border-teal-deep focus:ring-[3px] focus:ring-teal-deep/15 transition-all text-[14px]" />
                      <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-mut hover:text-ink-800 cursor-pointer">
                        <I n={showPass ? "eyeoff" : "eye"} size={18} />
                      </button>
                    </div>
                  </div>

                  {err && (
                    <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-danger/8 border border-danger/20 text-danger text-[13px] font-semibold anim-fade">
                      <I n="info" size={16} className="mt-0.5 shrink-0" />{err}
                    </div>
                  )}

                  <button type="submit" className="w-full h-12 rounded-lg font-bold text-[15px] text-white transition-all active:scale-[0.98] cursor-pointer hover:brightness-110" style={{ background: L.accent }}>
                    {tab === "login" ? "Продолжить → код на почту" : "Создать аккаунт"}
                  </button>
                </form>

                <div className="mt-5 flex items-center gap-2 text-[12px] text-mut">
                  <I n="lock" size={14} /> Следующий шаг — шести значный код подтверждения (2FA обязательна).
                </div>

                {tab === "login" && (
                  <button onClick={() => { setMail("admin@wordtime.ru"); setPass("wordtime"); setErr(null); }}
                    className="mt-4 w-full flex items-center justify-between px-4 py-3 rounded-xl border border-dashed border-teal-deep/40 bg-teal-soft/40 hover:bg-teal-soft transition-colors cursor-pointer group">
                    <span className="text-left">
                      <span className="block text-[12.5px] font-bold text-teal-deep">Демо-доступ</span>
                      <span className="block text-[12px] text-mut">admin@wordtime.ru · пароль: wordtime</span>
                    </span>
                    <span className="text-teal-deep group-hover:translate-x-1 transition-transform"><I n="chevR" size={18} /></span>
                  </button>
                )}
              </>
            )}

            {pending && (
              <div className="anim-fade-up">
                <button onClick={() => { /* сброс невозможен без потери кода — просто подсказка */ }} className="hidden" />
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: `${L.accent}1f`, color: L.accent }}>
                    <I n="mail" size={21} sw={1.9} />
                  </span>
                  <div>
                    <h1 className="font-display font-extrabold text-[19px] tracking-tight">Подтверждение входа</h1>
                    <p className="text-[13px] text-mut mt-0.5">Код отправлен на <b className="text-ink-800">{pending.email}</b></p>
                  </div>
                </div>

                {!sent ? (
                  <div className="mt-8 py-8 text-center">
                    <div className="w-10 h-10 mx-auto rounded-full border-[3px] border-line border-t-teal-deep anim-spin" />
                    <p className="mt-4 text-[13.5px] font-semibold text-mut">Отправляем письмо с кодом…</p>
                  </div>
                ) : (
                  <>
                    <div className="mt-7">
                      <CodeInput onFull={onCode} disabled={checking} />
                    </div>
                    {codeErr && (
                      <p className="mt-3 text-[12.5px] font-bold text-danger anim-fade flex items-center gap-1.5">
                        <I n="x" size={13} sw={2.4} /> Неверный код. Осталось попыток: {attemptsLeft}. Письмо — в правом верхнем углу.
                      </p>
                    )}
                    {checking && <p className="mt-3 text-[12.5px] font-semibold text-mut anim-fade">Проверяем код…</p>}
                    <div className="mt-6 flex items-center justify-between">
                      <button onClick={resendCode} disabled={cooldown > 0}
                        className="text-[13px] font-bold text-teal-deep hover:underline disabled:text-mut disabled:no-underline cursor-pointer disabled:cursor-default">
                        {cooldown > 0 ? `Отправить повторно (${cooldown} с)` : "Отправить код ещё раз"}
                      </button>
                      <span className="text-[12px] text-mut">действует 5 минут</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="px-8 py-4 border-t border-line bg-paper/60 flex items-center justify-between text-[11.5px] text-mut rounded-b-[inherit]">
            <span className="flex items-center gap-1.5"><I n="globe" size={13} /> Русский · Россия</span>
            <span className="font-semibold">Wordtime {state.version} «Первая»</span>
          </div>
        </div>
      </div>
    </div>
  );
}
