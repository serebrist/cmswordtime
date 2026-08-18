import React, { useEffect, useRef, useState } from "react";
import { I, IconName } from "../components/icons";
import { Badge, Btn, inputCls } from "../components/ui";
import { buildDeployZip, buildScript, DEPLOY_FILES, DEPLOY_METHODS, FILE_SOURCES, GUIDES } from "../lib/deploy";
import { useStore } from "../lib/store";
import { downloadBlob, downloadText, fmtBytes } from "../lib/zip";

type Line = { text: string; kind: "cmd" | "ok" | "info" | "warn" | "done" };
type Target = { id: string; host: string; method: string; url: string; date: string };

const TARGETS_KEY = "wordtime_deploys_v1";
const loadTargets = (): Target[] => { try { return JSON.parse(localStorage.getItem(TARGETS_KEY) ?? "[]"); } catch { return []; } };

const lineCls: Record<Line["kind"], string> = {
  cmd: "text-paper font-bold",
  ok: "text-teal-brand",
  info: "text-paper/70",
  warn: "text-amber-brand",
  done: "text-amber-brand font-bold",
};

const REQ = [
  ["PHP 8.2+", "расширения: mysqli, mbstring, gd, zip"],
  ["MySQL 5.7+ / MariaDB 10.3+", "кодировка utf8mb4"],
  ["Nginx или Apache", "работает без правок конфигурации"],
  ["64 МБ памяти · 100 МБ диска", "для ядра и медиафайлов"],
] as const;

export default function Deploy() {
  const { toast } = useStore();
  const [methodId, setMethodId] = useState<string | null>(null);
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [progress, setProgress] = useState(0);
  const [targets, setTargets] = useState<Target[]>(loadTargets);
  const [guide, setGuide] = useState<string | null>("cpanel");
  const [openFile, setOpenFile] = useState<string>("index.php");
  const cancelRef = useRef(false);
  const termRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");

  const method = DEPLOY_METHODS.find(m => m.id === methodId) ?? null;

  useEffect(() => {
    const el = termRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, phase]);

  const selectMethod = (id: string) => {
    setMethodId(id);
    setPhase("idle");
    setLines([]);
    setProgress(0);
    setCfg({});
  };

  const valid = !method || method.fields.every(f => (cfg[f.key] ?? "").trim().length > 0);

  const run = async () => {
    if (!method || phase === "running") return;
    if (!valid) { toast("warn", "Заполните поля", "Все параметры подключения обязательны."); return; }
    cancelRef.current = false;
    setPhase("running");
    setLines([]);
    setProgress(0);
    const script = buildScript(method.id, cfg);
    for (let i = 0; i < script.length; i++) {
      if (cancelRef.current) return;
      await new Promise(r => window.setTimeout(r, 340 + Math.random() * 380));
      if (cancelRef.current) return;
      setLines(l => [...l, script[i]]);
      setProgress(((i + 1) / script.length) * 100);
    }
    const dom = cfg.domain || cfg.host || (method.id === "docker" ? "localhost:8080" : "mysite.ru");
    const finalUrl = method.id === "docker" ? "http://localhost:8080/wt-admin/" : `https://${dom}/wt-admin/`;
    setUrl(finalUrl);
    setPhase("done");
    const t: Target = {
      id: "d" + Date.now(), host: dom, method: method.name, url: finalUrl,
      date: new Date().toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    };
    setTargets(prev => { const next = [t, ...prev]; localStorage.setItem(TARGETS_KEY, JSON.stringify(next)); return next; });
    toast("ok", "Сайт развёрнут", `${method.name}: Wordtime установлен на ${dom}`);
  };

  const cancel = () => { cancelRef.current = true; setPhase("idle"); setLines([]); setProgress(0); toast("info", "Развёртывание отменено"); };

  const removeTarget = (id: string) => {
    setTargets(prev => { const next = prev.filter(t => t.id !== id); localStorage.setItem(TARGETS_KEY, JSON.stringify(next)); return next; });
    toast("ok", "Площадка отвязана");
  };

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* нет доступа */ }
    toast("ok", "Скопировано", what);
  };

  const zipSize = DEPLOY_FILES.reduce((s, f) => s + new TextEncoder().encode(f.content).length, 0);

  return (
    <div className="anim-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-extrabold text-[24px] text-ink-900 tracking-tight">Установка на хостинг</h1>
          <p className="text-[13.5px] text-mut mt-1.5 max-w-xl">Wordtime ставится на любой хостинг с PHP — от копеечного виртуального до выделенного сервера. Автоустановщик, файлы для ручной установки и пошаговые руководства.</p>
        </div>
        <div className="text-right">
<div className="flex flex-col items-end gap-2">
          <Btn kind="amber" size="lg" onClick={() => { downloadBlob(buildDeployZip(), "Wordtime_cms.zip"); toast("ok", "Архив скачан", `Wordtime_cms.zip · ${fmtBytes(zipSize)} · распакуйте в корень сайта`); }}>
            <I n="download" size={16} />Скачать Wordtime_cms.zip
          </Btn>
          <a href="#/download" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-teal-deep hover:underline underline-offset-4">
            <I n="external" size={13} />Прямая ссылка на скачивание — {location.pathname}#/download
          </a>
        </div>          <p className="text-[11.5px] text-mut mt-2 tabular">собирается в браузере · {fmtBytes(zipSize)} · ядро всегда актуальной версии</p>
        </div>
      </div>

      {/* ── требования ── */}
      <section className="relative overflow-hidden rounded-2xl bg-deep-2 text-paper grain mb-6">
        <div className="absolute inset-0 blueprint opacity-60" />
        <div className="relative px-6 py-5 flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-teal-brand/15 text-teal-brand grid place-items-center"><I n="server" size={21} /></span>
            <div>
              <p className="font-display font-bold text-[15px]">Что нужно хостингу</p>
              <p className="text-[12px] text-paper/60">проверяется автоматически перед установкой</p>
            </div>
          </div>
          <div className="flex-1 grid sm:grid-cols-2 xl:grid-cols-4 gap-2.5 min-w-[280px]">
            {REQ.map(([t, d], i) => (
              <div key={t} className="flex items-start gap-2.5 anim-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
                <span className="w-5 h-5 rounded-full bg-teal-brand/15 text-teal-brand grid place-items-center shrink-0 mt-0.5"><I n="check" size={11} sw={2.6} /></span>
                <div className="leading-tight"><p className="text-[12.5px] font-bold">{t}</p><p className="text-[11px] text-paper/55 mt-0.5">{d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid xl:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="min-w-0 space-y-6">
          {/* ── автоустановка ── */}
          <section className="bg-card border border-line rounded-xl shadow-panel overflow-hidden">
            <header className="px-6 pt-5 pb-4 border-b border-line flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-teal-deep/12 text-teal-deep grid place-items-center"><I n="rocket" size={17} /></span>
              <div>
                <h2 className="font-display font-bold text-[16px] text-ink-900">Автоустановка</h2>
                <p className="text-[12.5px] text-mut">выберите, где живёт ваш сайт — Wordtime подключится и установится сам</p>
              </div>
            </header>

            <div className="px-6 py-5">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DEPLOY_METHODS.map(m => (
                  <button key={m.id} onClick={() => selectMethod(m.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer group relative
                      ${methodId === m.id ? "border-teal-deep bg-teal-soft/40 shadow-panel" : "border-line hover:border-teal-deep/40 hover:-translate-y-0.5"}`}>
                    {methodId === m.id && <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-teal-deep text-white grid place-items-center"><I n="check" size={11} sw={3} /></span>}
                    <span className={`w-10 h-10 rounded-lg grid place-items-center transition-colors ${methodId === m.id ? "bg-teal-deep text-white" : "bg-canvas text-mut group-hover:text-teal-deep"}`}><I n={m.icon} size={19} /></span>
                    <p className="mt-3 text-[14px] font-bold text-ink-900">{m.name}</p>
                    <p className="text-[12px] text-mut mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>

              {method && phase === "idle" && (
                <div className="mt-5 anim-fade-up">
                  <p className="text-[12.5px] text-mut flex items-center gap-2"><I n="info" size={14} />{method.note}</p>
                  {method.fields.length > 0 ? (
                    <div className="mt-4 grid sm:grid-cols-2 gap-4">
                      {method.fields.map(f => (
                        <label key={f.key} className="block">
                          <span className="block text-[13px] font-semibold text-ink-800 mb-1.5">{f.label}</span>
                          <input type={f.secret ? "password" : "text"} placeholder={f.ph} value={cfg[f.key] ?? ""}
                            onChange={e => setCfg(c => ({ ...c, [f.key]: e.target.value }))} className={inputCls} />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 p-4 rounded-xl bg-canvas border border-line text-[13px] text-ink-800">
                      Данные не нужны: <code className="font-bold text-teal-deep">docker compose up -d</code> поднимет PHP, MariaDB и Redis контейнерами. Убедитесь, что Docker установлен.
                    </div>
                  )}
                  <div className="mt-5 flex items-center gap-3">
                    <Btn size="lg" onClick={run}><I n="rocket" size={16} />Установить Wordtime</Btn>
                    {!valid && <span className="text-[12.5px] font-semibold text-warn flex items-center gap-1.5"><I n="zap" size={14} />заполните все поля подключения</span>}
                  </div>
                </div>
              )}

              {(phase === "running" || phase === "done") && method && (
                <div className="mt-5 anim-fade-up">
                  {/* терминал */}
                  <div className="rounded-xl overflow-hidden border border-deep-line bg-deep shadow-panel">
                    <div className="flex items-center gap-2 px-4 h-10 bg-deep-2 border-b border-deep-line">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f0655f]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-brand" />
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-brand" />
                      <span className="ml-2 text-[12px] font-bold text-paper/70 font-mono">wt-deploy — {method.name.toLowerCase()}</span>
                      {phase === "running" && (
                        <button onClick={cancel} className="ml-auto text-[11.5px] font-bold text-paper/60 hover:text-danger transition-colors cursor-pointer">Отмена</button>
                      )}
                    </div>
                    <div ref={termRef} className="h-[280px] overflow-y-auto px-4 py-3.5 font-mono text-[12.5px] leading-[1.9] dark-scroll">
                      {lines.map((l, i) => <p key={i} className={`${lineCls[l.kind]} anim-fade`}>{l.text}</p>)}
                      {phase === "running" && <p className="text-teal-brand">$ <span style={{ animation: "wt-blink 1s step-end infinite" }}>▍</span></p>}
                    </div>
                    <div className="px-4 py-3 border-t border-deep-line bg-deep-2/60">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-deep-line/50 overflow-hidden">
                          <div className="h-full rounded-full bg-amber-brand transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[12px] font-bold text-paper/80 tabular w-10 text-right">{Math.round(progress)}%</span>
                      </div>
                    </div>
                  </div>

                  {phase === "done" && (
                    <div className="mt-4 p-4 rounded-xl border-2 border-ok/30 bg-ok/8 flex flex-wrap items-center gap-3.5 anim-scale-in">
                      <span className="w-10 h-10 rounded-full bg-ok/15 text-ok grid place-items-center shrink-0"><I n="check" size={19} sw={2.4} /></span>
                      <div className="flex-1 min-w-[220px]">
                        <p className="text-[14px] font-bold text-ink-900">Wordtime установлен и работает</p>
                        <p className="text-[13px] text-mut mt-0.5 font-mono">{url}</p>
                      </div>
                      <div className="flex gap-2">
                        <Btn size="sm" kind="outline" onClick={() => copy(url, "Адрес консоли")}><I n="copy" size={13} />Копировать</Btn>
                        <Btn size="sm" onClick={() => { toast("info", "Это демо-развёртывание", "На реальном хостинге здесь откроется ваш сайт."); }}><I n="external" size={13} />Открыть</Btn>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ── мои площадки ── */}
          {targets.length > 0 && (
            <section className="bg-card border border-line rounded-xl shadow-panel overflow-hidden anim-fade-up">
              <header className="px-6 py-4 border-b border-line flex items-center gap-2.5">
                <I n="globe" size={17} className="text-teal-deep" />
                <h2 className="font-display font-bold text-[15px] text-ink-900">Мои площадки</h2>
                <Badge tone="teal">{targets.length}</Badge>
              </header>
              <div className="divide-y divide-line">
                {targets.map(t => (
                  <div key={t.id} className="flex flex-wrap items-center gap-3 px-6 py-3.5 hover:bg-canvas/60 transition-colors group">
                    <span className="w-8 h-8 rounded-lg bg-teal-deep/10 text-teal-deep grid place-items-center"><I n="server" size={15} /></span>
                    <div className="flex-1 min-w-[180px]">
                      <p className="text-[13.5px] font-bold text-ink-900">{t.host} <Badge tone="mut">{t.method}</Badge></p>
                      <p className="text-[12px] text-mut font-mono truncate">{t.url}</p>
                    </div>
                    <span className="text-[12px] text-mut tabular">{t.date}</span>
                    <Badge tone="ok">В СЕТИ</Badge>
                    <button onClick={() => removeTarget(t.id)} className="w-8 h-8 grid place-items-center rounded-lg text-mut hover:text-danger hover:bg-danger/8 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"><I n="trash" size={14} /></button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── ручные руководства ── */}
          <section className="bg-card border border-line rounded-xl shadow-panel overflow-hidden">
            <header className="px-6 pt-5 pb-4 border-b border-line flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-amber-brand/15 text-amber-deep grid place-items-center"><I n="file" size={17} /></span>
              <div>
                <h2 className="font-display font-bold text-[16px] text-ink-900">Ручная установка</h2>
                <p className="text-[12.5px] text-mut">пошагово для самых популярных хостингов</p>
              </div>
            </header>
            <div className="divide-y divide-line">
              {GUIDES.map(g => (
                <div key={g.id}>
                  <button onClick={() => setGuide(guide === g.id ? null : g.id)}
                    className="w-full flex items-center gap-3.5 px-6 py-4 text-left hover:bg-canvas/60 transition-colors cursor-pointer">
                    <span className={`w-8 h-8 rounded-lg grid place-items-center transition-colors ${guide === g.id ? "bg-deep-2 text-teal-brand" : "bg-canvas text-mut"}`}><I n={guide === g.id ? "chevD" : "chevR"} size={15} /></span>
                    <div className="flex-1">
                      <p className="text-[14px] font-bold text-ink-900">{g.title}</p>
                      <p className="text-[12px] text-mut">{g.badge}</p>
                    </div>
                  </button>
                  <div className={`grid transition-all duration-300 ease-out ${guide === g.id ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="overflow-hidden">
                      <ol className="px-6 pb-5 pt-1 space-y-3.5">
                        {g.steps.map((s, i) => (
                          <li key={i} className="flex gap-3.5">
                            <span className="w-6.5 h-6.5 shrink-0 rounded-full bg-teal-deep/12 text-teal-deep grid place-items-center text-[12px] font-extrabold tabular">{i + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13.5px] text-ink-800 leading-relaxed">{s.t}</p>
                              {s.code && (
                                <div className="mt-2 rounded-lg bg-deep relative group/code">
                                  <pre className="px-4 py-3 text-[12px] leading-relaxed font-mono text-teal-brand/90 overflow-x-auto whitespace-pre">{s.code}</pre>
                                  <button onClick={() => copy(s.code!, `Команда из шага ${i + 1}`)}
                                    className="absolute top-2 right-2 w-7 h-7 rounded-md bg-deep-2 text-paper/60 hover:text-teal-brand grid place-items-center opacity-0 group-hover/code:opacity-100 transition-opacity cursor-pointer"><I n="copy" size={13} /></button>
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── правая колонка ── */}
        <div className="space-y-6 xl:sticky xl:top-0">
          <section className="bg-card border border-line rounded-xl shadow-panel overflow-hidden">
            <header className="px-5 pt-5 pb-4 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-lg bg-teal-deep/12 text-teal-deep grid place-items-center"><I n="package" size={17} /></span>
                <div>
                  <h2 className="font-display font-bold text-[15px] text-ink-900">Файлы установки</h2>
                  <p className="text-[12px] text-mut">Wordtime_cms.zip · {fmtBytes(zipSize)}</p>
                </div>
              </div>
            </header>
            <div className="px-5 py-4">
              <div className="rounded-lg border border-line overflow-hidden">
                {DEPLOY_FILES.map((f, i) => {
                  const name = f.path.replace("Wordtime_cms/", "");
                  const size = new TextEncoder().encode(f.content).length;
                  const isOpen = openFile === name;
                  return (
                    <div key={f.path} className={i > 0 ? "border-t border-line" : ""}>
                      <button onClick={() => setOpenFile(isOpen ? "" : name)}
                        className={`w-full flex items-center gap-2.5 px-3.5 h-9.5 text-[12.5px] font-semibold transition-colors cursor-pointer ${isOpen ? "bg-deep-2 text-paper" : "hover:bg-canvas text-ink-800"}`}>
                        <I n={isOpen ? "chevD" : "chevR"} size={12} className={isOpen ? "text-teal-brand" : "text-mut"} />
                        <I n="file" size={13} className={isOpen ? "text-teal-brand" : "text-mut"} />
                        <span className="flex-1 text-left font-mono truncate">{name}</span>
                        <span className={`text-[11px] tabular ${isOpen ? "text-paper/60" : "text-mut"}`}>{fmtBytes(size)}</span>
                        <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); downloadText(f.content, name); toast("ok", "Файл скачан", name); }}
                          className={`w-6 h-6 grid place-items-center rounded transition-colors cursor-pointer ${isOpen ? "text-paper/70 hover:text-white" : "text-mut hover:text-teal-deep"}`} title="Скачать файл">
                          <I n="download" size={13} />
                        </span>
                      </button>
                      {isOpen && <pre className="px-4 py-3 bg-deep text-[11px] leading-relaxed font-mono text-paper/75 overflow-x-auto max-h-44 overflow-y-auto dark-scroll whitespace-pre">{f.content}</pre>}
                    </div>
                  );
                })}
              </div>
              <Btn className="w-full mt-4" kind="dark" onClick={() => { downloadBlob(buildDeployZip(), "Wordtime_cms.zip"); toast("ok", "Архив скачан", "Распакуйте в корень сайта и откройте домен"); }}>
                <I n="package" size={15} />Скачать весь архив .zip
              </Btn>
              <p className="text-[11.5px] text-mut mt-3 leading-relaxed flex gap-2"><I n="key" size={13} className="shrink-0 mt-0.5" />Внутри — настоящий PHP-код: точка входа, веб-установщик, конфиг, .htaccess, Docker и cron для асинхронных задач.</p>
            </div>
          </section>

          <section className="bg-card border border-line rounded-xl shadow-panel p-5">
            <h2 className="font-display font-bold text-[15px] text-ink-900 flex items-center gap-2.5"><I n="shield" size={16} className="text-teal-deep" />После установки</h2>
            <ul className="mt-3.5 space-y-2.5">
              {[
                "Вход в консоль — по адресу /wt-admin/, код 2FA придёт на почту",
                "Перенесите резервную копию .wtm: Настройки → Резервные копии",
                "Установите плагины и темы WordPress — совместимость 100%",
                "REST API /wt/v1/ уже работает для мобильных приложений",
              ].map((t, i) => (
                <li key={i} className="flex gap-2.5 text-[12.5px] text-ink-800 leading-snug">
                  <I n="check" size={13} sw={2.6} className="text-ok shrink-0 mt-0.5" />{t}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
