import React, { useEffect, useRef, useState } from "react";
import { I, IconName } from "../components/icons";
import { Badge, Btn, Field, Progress, SmartImg, Toggle, inputCls, selectCls } from "../components/ui";
import { fmtKB, nowStamp, ruDate, uid } from "../lib/data";
import { secLogRead, useStore } from "../lib/store";

/* ── модуль производительности (отдельное хранилище) ── */
export interface ApiKeyItem { id: string; name: string; key: string; scope: string; created: string; lastUsed: string; }
export interface MobileAppItem { id: string; name: string; platform: "Android" | "iOS"; color: string; status: "сборка" | "опубликовано"; date: string; build: number; }
export interface QueueTask { id: string; label: string; status: "в очереди" | "выполняется" | "готово"; progress: number; }
interface PerfState {
  objectCache: { enabled: boolean; hits: number; misses: number; objects: number; sizeKB: number };
  db: { optimizedAt: string; overhead: number };
  delivery: { brotli: boolean; minCss: boolean; minJs: boolean; lazyCore: boolean };
  images: { webp: boolean; avif: boolean; quality: number; maxW: number; autoUpload: boolean; done: string[]; savedKB: number };
  seo: { titleTpl: string; descTpl: string; auto: boolean; og: boolean };
  sitemap: { updatedAt: string; auto: boolean; freq: string };
  api: { keys: ApiKeyItem[]; apps: MobileAppItem[]; log: string[] };
  queue: QueueTask[];
}

const PERF_KEY = "wordtime_perf_v1";
const genKey = () => "wt_live_" + Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 8)).join("_");

function seedPerf(): PerfState {
  return {
    objectCache: { enabled: true, hits: 48213, misses: 1906, objects: 3421, sizeKB: 8340 },
    db: { optimizedAt: "вчера, 03:00", overhead: 14 },
    delivery: { brotli: true, minCss: true, minJs: true, lazyCore: true },
    images: { webp: true, avif: false, quality: 82, maxW: 1920, autoUpload: true, done: [], savedKB: 0 },
    seo: { titleTpl: "{title} — {site}", descTpl: "auto", auto: true, og: true },
    sitemap: { updatedAt: "сегодня, 06:12", auto: true, freq: "ежедневно в 06:00" },
    api: {
      keys: [
        { id: "k1", name: "Основной ключ консоли", key: "wt_live_9f3kq8_t2mb71_x0pz54_r8wd12", scope: "полный доступ", created: "12.02.2026", lastUsed: "5 мин назад" },
        { id: "k2", name: "Мобильное чтение", key: "wt_live_a7d210_kp45mz_q91x6t_b3nn08", scope: "только чтение", created: "08.02.2026", lastUsed: "2 ч назад" },
      ],
      apps: [{ id: "app1", name: "Wordtime Reader", platform: "Android", color: "#0e9384", status: "опубликовано", date: "05.02.2026", build: 14 }],
      log: ["GET /wt/v1/posts · 200 · 12 мс · WordtimeReader/1.4 (Android)", "GET /wt/v1/posts/4 · 200 · 8 мс", "POST /wt/v1/media · 201 · 210 мс · ключ «Основной»"],
    },
    queue: [
      { id: "q1", label: "Пересборка поискового индекса", status: "готово", progress: 100 },
      { id: "q2", label: "Тёплый прогрев object-кеша", status: "выполняется", progress: 34 },
      { id: "q3", label: "Пинг sitemap в Яндекс и Google", status: "в очереди", progress: 0 },
    ],
  };
}

function loadPerf(): PerfState {
  try {
    const raw = localStorage.getItem(PERF_KEY);
    if (raw) { const s = seedPerf(); const p = JSON.parse(raw) as PerfState; return { ...s, ...p, api: { ...s.api, ...p.api }, images: { ...s.images, ...p.images } }; }
  } catch { /* старт заново */ }
  return seedPerf();
}

const TABS: { key: string; label: string; icon: IconName }[] = [
  { key: "speed", label: "Скорость и кеш", icon: "zap" },
  { key: "images", label: "Изображения", icon: "image" },
  { key: "sitemap", label: "Sitemap", icon: "file" },
  { key: "seo", label: "SEO-заголовки", icon: "search" },
  { key: "api", label: "Мобильные приложения · API", icon: "phone" },
];

export default function Perf({ tab, onTab }: { tab: string; onTab: (t: string) => void }) {
  return (
    <div className="anim-fade-up">
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <h1 className="font-display font-extrabold text-[24px] text-ink-900 tracking-tight">Оптимизация</h1>
          <p className="text-[13.5px] text-mut mt-1">Производительность под высокие нагрузки, мобильное API, sitemap и SEO — встроены в ядро.</p>
        </div>
        <span className="ml-auto hidden md:flex items-center gap-2 text-[12px] font-bold text-teal-deep bg-teal-deep/8 border border-teal-deep/25 px-3 py-1.5 rounded-full"><I n="rocket" size={14} />WT-Turbo активен</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => (
          <button key={t.key} onClick={() => onTab(t.key)}
            className={`flex items-center gap-2 px-4 h-10 rounded-lg text-[13px] font-bold border transition-all cursor-pointer
              ${tab === t.key ? "bg-deep-2 text-white border-deep-2 shadow-panel" : "bg-card text-mut border-line hover:border-ink-600/40 hover:text-ink-900"}`}>
            <span className={tab === t.key ? "text-teal-brand" : ""}><I n={t.icon} size={15} /></span>{t.label}
          </button>
        ))}
      </div>
      {tab === "speed" && <SpeedTab />}
      {tab === "images" && <ImagesTab />}
      {tab === "sitemap" && <SitemapTab />}
      {tab === "seo" && <SeoTab />}
      {tab === "api" && <ApiTab />}
    </div>
  );
}

function Card({ title, desc, children, right }: { title: string; desc?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="bg-card border border-line rounded-xl shadow-panel mb-5 overflow-hidden">
      <header className="px-6 pt-5 pb-4 border-b border-line flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <h2 className="font-display font-bold text-[16px] text-ink-900">{title}</h2>
          {desc && <p className="text-[12.5px] text-mut mt-0.5">{desc}</p>}
        </div>
        {right}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "teal" | "amber" }) {
  return (
    <div className="flex-1 min-w-[130px] p-4 rounded-xl bg-canvas/70 border border-line">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-mut">{label}</p>
      <p className={`font-display font-extrabold text-[24px] tabular leading-tight mt-1 ${tone === "amber" ? "text-amber-deep" : "text-ink-900"}`}>{value}</p>
      {sub && <p className="text-[11.5px] text-mut mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Скорость ── */
function SpeedTab() {
  const { state, toast, mutate } = useStore();
  const [pf, setPf] = useState<PerfState>(loadPerf);
  useEffect(() => { localStorage.setItem(PERF_KEY, JSON.stringify(pf)); }, [pf]);
  const up = (p: Partial<PerfState>) => setPf(s => ({ ...s, ...p }));
  const worker = useRef<number | null>(null);
  const [taskText, setTaskText] = useState("");

  /* object-кеш живёт */
  useEffect(() => {
    const t = window.setInterval(() => {
      if (!pf.objectCache.enabled) return;
      setPf(s => ({ ...s, objectCache: { ...s.objectCache, hits: s.objectCache.hits + Math.round(30 + Math.random() * 180), objects: Math.max(0, s.objectCache.objects + Math.round(-40 + Math.random() * 120)), sizeKB: s.objectCache.sizeKB + Math.round(4 + Math.random() * 30) } }));
    }, 3200);
    return () => window.clearInterval(t);
  }, [pf.objectCache.enabled]);

  /* очередь задач */
  useEffect(() => {
    const run = () => setPf(s => {
      const q = [...s.queue];
      const active = q.findIndex(t => t.status === "выполняется");
      if (active >= 0) {
        const t = { ...q[active], progress: Math.min(100, q[active].progress + Math.round(8 + Math.random() * 16)) };
        if (t.progress >= 100) { t.status = "готово"; const next = q.findIndex(x => x.status === "в очереди"); if (next >= 0) q[next] = { ...q[next], status: "выполняется", progress: 2 }; }
        q[active] = t;
      } else {
        const next = q.findIndex(x => x.status === "в очереди");
        if (next >= 0) q[next] = { ...q[next], status: "выполняется", progress: 2 };
      }
      return { ...s, queue: q };
    });
    worker.current = window.setInterval(run, 700);
    return () => { if (worker.current) window.clearInterval(worker.current); };
  }, []);

  const optTables = [
    { name: "wt_posts", rows: state.posts.length * 3 + 12 },
    { name: "wt_comments", rows: state.comments.length * 2 + 8 },
    { name: "wt_options", rows: 146 },
    { name: "wt_users", rows: state.users.length },
    { name: "wt_termmeta", rows: state.categories.length * 4 },
  ];
  const [optimizing, setOptimizing] = useState(-1);

  const optimizeDb = () => {
    if (optimizing >= 0) return;
    setOptimizing(0);
    optTables.forEach((_, i) => window.setTimeout(() => {
      setOptimizing(i + 1);
      if (i === optTables.length - 1) {
        up({ db: { optimizedAt: "только что", overhead: 2 } });
        toast("ok", "База оптимизирована", "Служебные накладные расходы снижены с 14% до 2%.");
        mutate(s => s.activity.unshift({ id: uid(), text: "Оптимизация таблиц БД завершена", time: "только что", icon: "database" }));
        window.setTimeout(() => setOptimizing(-1), 500);
      }
    }, 520 * (i + 1)));
  };

  const addTask = () => {
    if (taskText.trim().length < 3) return;
    setPf(s => ({ ...s, queue: [...s.queue, { id: uid(), label: taskText.trim(), status: "в очереди", progress: 0 }] }));
    setTaskText("");
    toast("info", "Задача добавлена в очередь", "Асинхронный воркер подхватит её автоматически.");
  };

  const D = pf.delivery;
  const savings = (D.brotli ? 72 : 0) + (D.minCss ? 9 : 0) + (D.minJs ? 14 : 0);

  return (
    <>
      <Card title="Объектный кеш" desc="Хранит результаты запросов к БД и готовые объекты в памяти — страницы под высоким нагрузками не дёргают базу повторно."
        right={<Toggle big on={pf.objectCache.enabled} onChange={v => { up({ objectCache: { ...pf.objectCache, enabled: v } }); toast(v ? "ok" : "warn", v ? "Object-кеш включён" : "Object-кеш выключен"); }} />}>
        <div className="flex flex-wrap gap-3">
          <Stat label="Попаданий" value={pf.objectCache.hits.toLocaleString("ru-RU")} sub="за сессию" tone="teal" />
          <Stat label="Промахов" value={pf.objectCache.misses.toLocaleString("ru-RU")} sub={`${Math.round(pf.objectCache.misses / (pf.objectCache.hits + pf.objectCache.misses) * 1000) / 10}%`} />
          <Stat label="Объектов в памяти" value={pf.objectCache.objects.toLocaleString("ru-RU")} sub="Redis-совместимое хранилище" />
          <Stat label="Занято" value={fmtKB(pf.objectCache.sizeKB)} sub="лимит 64 МБ" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Btn size="sm" kind="outline" onClick={() => { up({ objectCache: { ...pf.objectCache, objects: 0, sizeKB: 120 } }); toast("ok", "Object-кеш сброшен", "Память освобождена, кеш наполнится заново."); }}>Сбросить object-кеш</Btn>
          <span className="self-center text-[12px] text-mut">Hit-rate {Math.round(pf.objectCache.hits / (pf.objectCache.hits + pf.objectCache.misses) * 100)}% — отличный показатель.</span>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <Card title="Оптимизация базы данных" desc={`Накладные расходы таблиц: ${pf.db.overhead}% · последняя: ${pf.db.optimizedAt}`}>
          <div className="space-y-2">
            {optTables.map((t, i) => (
              <div key={t.name} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${optimizing === i ? "border-teal-deep/50 bg-teal-soft/50 anim-row-scan" : "border-line"}`}>
                <I n="database" size={15} className={optimizing > i ? "text-ok" : "text-mut"} />
                <code className="text-[12.5px] font-bold text-ink-800">{t.name}</code>
                <span className="text-[12px] text-mut tabular">{t.rows} строк</span>
                <span className="ml-auto text-[11.5px] font-extrabold">
                  {optimizing > i ? <span className="text-ok flex items-center gap-1"><I n="check" size={12} sw={3} />ОК</span>
                    : optimizing === i ? <span className="text-teal-deep flex items-center gap-1.5"><I n="refresh" size={12} className="anim-spin" />чистим…</span>
                    : <span className="text-mut">ждёт</span>}
                </span>
              </div>
            ))}
          </div>
          <Btn className="mt-4 w-full" onClick={optimizeDb} disabled={optimizing >= 0}><I n="zap" size={15} />{optimizing >= 0 ? "Оптимизируем таблицы…" : "Оптимизировать таблицы"}</Btn>
        </Card>

        <div>
          <Card title="Сжатие и минификация" desc="Ресурсы улетают посетителю сжатыми — меньше трафика, быстрее отрисовка.">
            {[
              { k: "brotli" as const, l: "Brotli-сжатие ответов", d: "−72% к размеру HTML/JS/CSS" },
              { k: "minCss" as const, l: "Минификация CSS", d: "wt-admin.css: 61 КБ → 41 КБ" },
              { k: "minJs" as const, l: "Минификация JavaScript", d: "объединение и сжатие бандлов" },
              { k: "lazyCore" as const, l: "Ленивая загрузка ядра", d: "модули подгружаются по требованию, старт −38%" },
            ].map(o => (
              <div key={o.k} className="flex items-center gap-4 py-2.5">
                <div className="flex-1"><p className="text-[13.5px] font-bold text-ink-900">{o.l}</p><p className="text-[12px] text-mut">{o.d}</p></div>
                <Toggle on={D[o.k]} onChange={v => { up({ delivery: { ...D, [o.k]: v } }); toast(v ? "ok" : "info", v ? "Включено" : "Выключено", o.l); }} />
              </div>
            ))}
            <div className="mt-3 p-3.5 rounded-lg bg-deep-2 text-paper flex items-center gap-3">
              <I n="rocket" size={17} className="text-amber-brand" />
              <span className="text-[13px] font-bold">Итого: передача легче на <span className="text-amber-brand tabular">{savings}%</span></span>
            </div>
          </Card>
        </div>
      </div>

      <Card title="Асинхронные задачи" desc="Тяжёлые операции уходят в фоновую очередь — консоль не блокируется даже под нагрузкой."
        right={<Badge tone="teal">ВОРКЕР АКТИВЕН</Badge>}>
        <div className="space-y-2.5">
          {pf.queue.map(t => (
            <div key={t.id} className="flex items-center gap-4">
              <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${t.status === "готово" ? "bg-ok/12 text-ok" : t.status === "выполняется" ? "bg-teal-deep/12 text-teal-deep" : "bg-ink-600/8 text-mut"}`}>
                <I n={t.status === "готово" ? "check" : t.status === "выполняется" ? "refresh" : "clock"} size={15} className={t.status === "выполняется" ? "anim-spin" : ""} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5"><p className="text-[13.5px] font-bold text-ink-900 truncate">{t.label}</p>
                  <Badge tone={t.status === "готово" ? "ok" : t.status === "выполняется" ? "teal" : "mut"}>{t.status.toUpperCase()}</Badge></div>
                {t.status !== "готово" && <Progress value={t.progress} />}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2.5">
          <input value={taskText} onChange={e => setTaskText(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="Например: пересобрать RSS-ленту" className={inputCls} />
          <Btn kind="outline" onClick={addTask}><I n="plus" size={15} />В очередь</Btn>
        </div>
      </Card>
    </>
  );
}

/* ── Изображения ── */
function ImagesTab() {
  const { state, toast } = useStore();
  const [pf, setPf] = useState<PerfState>(loadPerf);
  useEffect(() => { localStorage.setItem(PERF_KEY, JSON.stringify(pf)); }, [pf]);
  const up = (p: Partial<PerfState>) => setPf(s => ({ ...s, ...p }));
  const [running, setRunning] = useState(-1);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(t => window.clearTimeout(t)), []);

  const hash = (s: string) => Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0);
  const origOf = (id: string, name: string) => 900 + (hash(id + name) % 2400);
  const ratio = () => (pf.images.webp ? 0.32 : 0.55) + (100 - pf.images.quality) / 400 + (pf.images.avif ? -0.08 : 0);
  const optOf = (id: string, name: string) => Math.round(origOf(id, name) * ratio());

  const images = state.media.filter(m => m.kind === "image");

  const optimizeAll = () => {
    const todo = images.filter(m => !pf.images.done.includes(m.id));
    if (todo.length === 0) { toast("info", "Всё уже оптимизировано", "Новые файлы обработаются при загрузке."); return; }
    todo.forEach((m, i) => timers.current.push(window.setTimeout(() => {
      setRunning(i);
      setPf(s => ({ ...s, images: { ...s.images, done: [...s.images.done, m.id], savedKB: s.images.savedKB + (origOf(m.id, m.name) - optOf(m.id, m.name)) } }));
      if (i === todo.length - 1) { setRunning(-1); toast("ok", `Оптимизировано ${todo.length} изображений`, `Формат ${pf.images.avif ? "AVIF" : pf.images.webp ? "WebP" : "JPEG"}, качество ${pf.images.quality}%.`); }
    }, 560 * (i + 1))));
  };

  return (
    <>
      <Card title="Оптимизация изображений при загрузке" desc="Каждый файл из медиатеки автоматически пережимается: ресайз, современный формат, ленивая загрузка на странице.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { k: "webp" as const, l: "Конвертация в WebP", d: "−68% к JPEG" },
            { k: "avif" as const, l: "AVIF (новейший)", d: "ещё −8%, нужен браузерам 2024+" },
          ].map(o => (
            <div key={o.k} className="flex items-center gap-3.5 p-4 rounded-xl border border-line">
              <div className="flex-1"><p className="text-[13.5px] font-bold text-ink-900">{o.l}</p><p className="text-[11.5px] text-mut">{o.d}</p></div>
              <Toggle on={pf.images[o.k]} onChange={v => { up({ images: { ...pf.images, [o.k]: v } }); toast("ok", "Сохранено", o.l); }} />
            </div>
          ))}
          <div className="p-4 rounded-xl border border-line">
            <p className="text-[13.5px] font-bold text-ink-900">Качество · <span className="text-teal-deep tabular">{pf.images.quality}%</span></p>
            <input type="range" min={50} max={95} value={pf.images.quality} onChange={e => up({ images: { ...pf.images, quality: Number(e.target.value) } })} className="w-full mt-2.5 accent-[#0e9384] cursor-pointer" />
          </div>
          <div className="p-4 rounded-xl border border-line">
            <p className="text-[13.5px] font-bold text-ink-900">Макс. ширина</p>
            <select value={pf.images.maxW} onChange={e => up({ images: { ...pf.images, maxW: Number(e.target.value) } })} className={selectCls + " mt-1.5 h-9 text-[13px]"}>
              {[1280, 1600, 1920, 2560].map(w => <option key={w} value={w}>{w} px</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3.5 p-4 rounded-xl border border-line mb-5">
          <div className="flex-1"><p className="text-[13.5px] font-bold text-ink-900">Оптимизировать сразу при загрузке</p><p className="text-[11.5px] text-mut">+ авто-ресайз, + ленивая загрузка на сайте, + srcset для мобильных</p></div>
          <Toggle big on={pf.images.autoUpload} onChange={v => { up({ images: { ...pf.images, autoUpload: v } }); toast(v ? "ok" : "warn", v ? "Автооптимизация включена" : "Автооптимизация выключена"); }} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Btn kind="amber" size="lg" onClick={optimizeAll} disabled={running >= 0}><I n="image" size={16} />{running >= 0 ? `Обрабатываем ${running + 1} из ${images.filter(m => !pf.images.done.includes(m.id)).length + running + 1}…` : "Оптимизировать все изображения"}</Btn>
          <div className="text-[13px] text-mut">Обработано <b className="text-ink-900 tabular">{pf.images.done.length}</b> из <b className="text-ink-900 tabular">{images.length}</b> · сэкономлено <b className="text-ok tabular">{fmtKB(pf.images.savedKB)}</b></div>
        </div>
      </Card>

      <Card title="Медиатека — до и после">
        <div className="space-y-2.5">
          {images.map((m, i) => {
            const done = pf.images.done.includes(m.id);
            const busy = running >= 0 && !done && images.filter(x => !pf.images.done.includes(x.id)).findIndex(x => x.id === m.id) === running;
            return (
              <div key={m.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${done ? "border-ok/30 bg-ok/4" : busy ? "border-teal-deep/50 bg-teal-soft/40 anim-row-scan" : "border-line"}`}>
                <SmartImg src={m.url} alt={m.name} className="w-16 h-12 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold text-ink-900 truncate">{m.name}</p>
                  <p className="text-[12px] text-mut">{m.date} · {m.size}</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[12px] font-bold tabular">
                  <span className="text-mut line-through">{fmtKB(origOf(m.id, m.name))}</span>
                  <I n="arrowL" size={13} className="rotate-180 text-mut" />
                  <span className={done ? "text-ok" : "text-ink-800"}>{done ? fmtKB(optOf(m.id, m.name)) : "—"}</span>
                </div>
                {done ? <Badge tone="ok">−{Math.round((1 - optOf(m.id, m.name) / origOf(m.id, m.name)) * 100)}%</Badge> : busy ? <I n="refresh" size={16} className="anim-spin text-teal-deep" /> : <Badge>в очереди</Badge>}
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

/* ── Sitemap ── */
function slugify(s: string): string {
  const map: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
  return s.toLowerCase().split("").map(c => map[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "post";
}

function SitemapTab() {
  const { state, toast } = useStore();
  const [pf, setPf] = useState<PerfState>(loadPerf);
  useEffect(() => { localStorage.setItem(PERF_KEY, JSON.stringify(pf)); }, [pf]);
  const posts = state.posts.filter(p => p.status === "published");
  const site = "https://" + slugify(state.settings.siteTitle) + ".ru";

  const entries = [
    { url: site + "/", lastmod: "2026-02-12", freq: "daily", prio: "1.0", type: "главная" },
    ...posts.map(p => ({ url: `${site}/blog/${slugify(p.title)}/`, lastmod: p.date, freq: "weekly", prio: "0.8", type: "запись" })),
    ...state.pages.map(p => ({ url: `${site}/${slugify(p.title)}/`, lastmod: p.date, freq: "monthly", prio: "0.6", type: "страница" })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.map(e => `  <url>\n    <loc>${e.url}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n    <changefreq>${e.freq}</changefreq>\n    <priority>${e.prio}</priority>\n  </url>`).join("\n") + `\n</urlset>`;

  const regenerate = () => {
    setPf(s => ({ ...s, sitemap: { ...s.sitemap, updatedAt: "только что" } }));
    toast("ok", "Sitemap пересоздан", `${entries.length} адресов · ${fmtKB(Math.round(xml.length / 1024 * 10) / 10 + 1)}`);
  };
  const copy = async () => { try { await navigator.clipboard.writeText(xml); toast("ok", "XML скопирован в буфер"); } catch { toast("warn", "Не удалось скопировать"); } };
  const download = () => {
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "sitemap.xml"; a.click();
    URL.revokeObjectURL(a.href);
    toast("ok", "sitemap.xml скачан", "Разместите файл в корне сайта.");
  };

  return (
    <>
      <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        <Card title="sitemap.xml" desc={`${site}/sitemap.xml · обновлён: ${pf.sitemap.updatedAt}`}
          right={<div className="flex gap-2">
            <Btn size="sm" kind="outline" onClick={copy}><I n="copy" size={13} />XML</Btn>
            <Btn size="sm" kind="outline" onClick={download}><I n="download" size={13} />Скачать</Btn>
            <Btn size="sm" onClick={regenerate}><I n="refresh" size={13} />Пересоздать</Btn>
          </div>}>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-[12.5px]">
              <thead><tr className="bg-canvas text-left text-mut">
                {["Адрес", "Тип", "lastmod", "частота", "приоритет"].map(h => <th key={h} className="px-4 py-2.5 font-extrabold uppercase text-[10.5px] tracking-[0.1em]">{h}</th>)}
              </tr></thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.url} className="border-t border-line hover:bg-teal-soft/30 transition-colors">
                    <td className="px-4 py-2.5 font-bold text-ink-800 max-w-[300px] truncate">{e.url}</td>
                    <td className="px-4 py-2.5"><Badge tone={e.type === "запись" ? "teal" : "mut"}>{e.type}</Badge></td>
                    <td className="px-4 py-2.5 tabular text-mut">{ruDate(e.lastmod)}</td>
                    <td className="px-4 py-2.5 text-mut">{e.freq}</td>
                    <td className="px-4 py-2.5 tabular font-bold text-ink-800">{e.prio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] text-mut flex items-center gap-2"><I n="check" size={13} className="text-ok" /> Соответствует протоколу sitemaps.org 0.9 — Яндекс и Google принимают без замечаний.</p>
        </Card>

        <div>
          <Card title="Автообновление">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="flex-1"><p className="text-[13.5px] font-bold text-ink-900">Пересоздавать автоматически</p><p className="text-[11.5px] text-mut">при публикации записей и страниц</p></div>
              <Toggle on={pf.sitemap.auto} onChange={v => setPf(s => ({ ...s, sitemap: { ...s.sitemap, auto: v } }))} />
            </div>
            <Field label="Расписание">
              <select value={pf.sitemap.freq} onChange={e => setPf(s => ({ ...s, sitemap: { ...s.sitemap, freq: e.target.value } }))} className={selectCls}>
                {["ежедневно в 06:00", "каждые 6 часов", "раз в неделю", "при каждой публикации"].map(o => <option key={o}>{o}</option>)}
              </select>
            </Field>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Btn size="sm" kind="dark" onClick={() => toast("ok", "Пинг отправлен в Яндекс", "Вебмастер получит обновлённый sitemap.")}>Пинг Яндекса</Btn>
              <Btn size="sm" kind="dark" onClick={() => toast("ok", "Пинг отправлен в Google", "Search Console уведомлён.")}>Пинг Google</Btn>
            </div>
          </Card>
        </div>
      </div>

      <Card title="Живой XML">
        <pre className="p-5 rounded-xl bg-deep text-teal-brand/90 text-[12px] leading-relaxed overflow-auto max-h-72 font-mono whitespace-pre">{xml}</pre>
      </Card>
    </>
  );
}

/* ── SEO ── */
function SeoTab() {
  const { state, toast } = useStore();
  const [pf, setPf] = useState<PerfState>(loadPerf);
  useEffect(() => { localStorage.setItem(PERF_KEY, JSON.stringify(pf)); }, [pf]);
  const seo = pf.seo;
  const up = (p: Partial<PerfState["seo"]>) => setPf(s => ({ ...s, seo: { ...s.seo, ...p } }));
  const post = state.posts.filter(p => p.status === "published")[0];
  const site = state.settings.siteTitle;

  const title = seo.titleTpl.replace("{title}", post.title).replace("{site}", site);
  const desc = (seo.auto ? post.content.replace(/\n+/g, " ").slice(0, 152).trim() + "…" : "").trim();
  const titleLen = title.length;
  const ok = {
    title: titleLen >= 30 && titleLen <= 65,
    desc: desc.length >= 70 && desc.length <= 170,
    h1: true,
    og: seo.og,
    map: pf.sitemap.auto,
  };

  return (
    <>
      <div className="grid lg:grid-cols-[1fr_400px] gap-5 items-start">
        <div>
          <Card title="Шаблоны title и description" desc="Подставляются в <head> каждой страницы — поисковики читают их в первую очередь.">
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Шаблон заголовка (title)" hint="Доступны {title} и {site}">
                <input value={seo.titleTpl} onChange={e => up({ titleTpl: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Description">
                <select value={seo.auto ? "auto" : "manual"} onChange={e => up({ auto: e.target.value === "auto" })} className={selectCls}>
                  <option value="auto">Авто: первые 150 символов записи</option>
                  <option value="manual">Вручную для каждой записи</option>
                </select>
              </Field>
            </div>
            <div className="mt-5 space-y-3">
              {[
                { k: "og" as const, l: "Open Graph и Twitter-карточки", d: "красивые превью при отправке ссылки в мессенджеры" },
              ].map(o => (
                <div key={o.k} className="flex items-center gap-4">
                  <div className="flex-1"><p className="text-[13.5px] font-bold text-ink-900">{o.l}</p><p className="text-[12px] text-mut">{o.d}</p></div>
                  <Toggle on={seo[o.k]} onChange={v => { up({ [o.k]: v } as never); toast("ok", "Сохранено", o.l); }} />
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-deep p-4 overflow-x-auto">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-paper/40 mb-2">Размещение в коде — внутри &lt;head&gt;, до контента</p>
              <pre className="text-[12px] leading-relaxed font-mono text-paper/85"><span className="text-mut">&lt;head&gt;</span>{"\n"}  <span className="text-teal-brand">&lt;title&gt;</span>{title}<span className="text-teal-brand">&lt;/title&gt;</span>{"\n"}  <span className="text-amber-brand">&lt;meta</span> name=<span className="text-teal-brand">"description"</span> content=<span className="text-teal-brand">"{desc.slice(0, 60)}…"</span> <span className="text-amber-brand">/&gt;</span>{"\n"}  {seo.og && <><span className="text-amber-brand">&lt;meta</span> property=<span className="text-teal-brand">"og:title"</span> … <span className="text-amber-brand">/&gt;</span>{"\n"}</>}  <span className="text-amber-brand">&lt;link</span> rel=<span className="text-teal-brand">"canonical"</span> href=<span className="text-teal-brand">"…"</span> <span className="text-amber-brand">/&gt;</span>{"\n"}<span className="text-mut">&lt;/head&gt;</span></pre>
            </div>
          </Card>

          <Card title="Чек-лист SEO" desc="Проверка на примере свежей записи.">
            <ul className="space-y-2.5">
              {[
                [ok.title, `Длина title: ${titleLen} символов (норма 30–65)`],
                [ok.desc, `Description: ${desc.length} символов (норма 70–170)`],
                [ok.h1, "На странице ровно один H1 — заголовок записи"],
                [ok.og, "Open Graph-разметка присутствует"],
                [ok.map, "Запись включена в sitemap.xml"],
              ].map(([v, l], i) => (
                <li key={i} className="flex items-center gap-3 text-[13.5px]">
                  <span className={`w-6 h-6 rounded-full grid place-items-center shrink-0 ${v ? "bg-ok/12 text-ok" : "bg-warn/12 text-warn"}`}><I n={v ? "check" : "zap"} size={13} sw={2.5} /></span>
                  <span className={`font-semibold ${v ? "text-ink-800" : "text-warn"}`}>{l as string}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="lg:sticky lg:top-0">
          <Card title="Как увидит поисковик" desc="Живое превью сниппета Google.">
            <div className="p-4 rounded-xl border border-line bg-card">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-paper border border-line grid place-items-center text-[11px] font-extrabold text-teal-deep">{site[0]}</span>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-ink-900 truncate">{site}</p>
                  <p className="text-[11px] text-mut truncate">https://{slugify(site)}.ru › blog › {slugify(post.title).slice(0, 18)}</p>
                </div>
              </div>
              <p className="mt-2.5 text-[17px] leading-snug text-[#1a4fb8] font-medium cursor-pointer hover:underline">{title}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#4d5156]">{desc}</p>
            </div>
            <div className="mt-4 space-y-2.5">
              <div>
                <div className="flex justify-between text-[11.5px] font-bold mb-1"><span className="text-mut">Title</span><span className={ok.title ? "text-ok" : "text-warn"}>{titleLen}/65</span></div>
                <div className="h-2 rounded-full bg-ink-900/10 overflow-hidden"><div className={`h-full rounded-full transition-all ${ok.title ? "bg-ok" : "bg-warn"}`} style={{ width: `${Math.min(100, titleLen / 65 * 100)}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-[11.5px] font-bold mb-1"><span className="text-mut">Description</span><span className={ok.desc ? "text-ok" : "text-warn"}>{desc.length}/170</span></div>
                <div className="h-2 rounded-full bg-ink-900/10 overflow-hidden"><div className={`h-full rounded-full transition-all ${ok.desc ? "bg-ok" : "bg-warn"}`} style={{ width: `${Math.min(100, desc.length / 170 * 100)}%` }} /></div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/* ── Мобильные приложения + API ── */
function ApiTab() {
  const { toast } = useStore();
  const [pf, setPf] = useState<PerfState>(loadPerf);
  useEffect(() => { localStorage.setItem(PERF_KEY, JSON.stringify(pf)); }, [pf]);
  const [newKey, setNewKey] = useState({ name: "", scope: "только чтение" });
  const [app, setApp] = useState({ name: "", platform: "Android" as "Android" | "iOS", color: "#0e9384" });
  const [building, setBuilding] = useState(-1);
  const [masked, setMasked] = useState<Record<string, boolean>>({});
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(t => window.clearTimeout(t)), []);
  const log = secLogRead();

  /* живой журнал API */
  useEffect(() => {
    const src = ["GET /wt/v1/posts?page=2 · 200 · 11 мс", "GET /wt/v1/comments · 200 · 9 мс", "POST /wt/v1/posts · 201 · 46 мс · ключ «Основной»", "GET /wt/v1/media · 200 · 14 мс · WordtimeReader (iOS)", "GET /wt/v1/sitemap · 200 · 6 мс"];
    let i = 0;
    const t = window.setInterval(() => {
      setPf(s => ({ ...s, api: { ...s.api, log: [src[i % src.length] + " · " + new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), ...s.api.log].slice(0, 8) } }));
      i++;
    }, 3600);
    return () => window.clearInterval(t);
  }, []);

  const addKey = () => {
    if (newKey.name.trim().length < 2) { toast("warn", "Укажите название ключа"); return; }
    setPf(s => ({ ...s, api: { ...s.api, keys: [...s.api.keys, { id: uid(), name: newKey.name.trim(), key: genKey(), scope: newKey.scope, created: nowStamp().slice(0, 10), lastUsed: "ещё не использовался" }] } }));
    setNewKey({ name: "", scope: "только чтение" });
    toast("ok", "Ключ создан", "Скопируйте его сейчас — полностью он показывается один раз.");
  };

  const buildApp = () => {
    if (app.name.trim().length < 2) { toast("warn", "Введите название приложения"); return; }
    if (building >= 0) return;
    setBuilding(0);
    const steps = [14, 31, 52, 71, 88, 100];
    steps.forEach((p, i) => timers.current.push(window.setTimeout(() => {
      setBuilding(p);
      if (p === 100) {
        setPf(s => ({ ...s, api: { ...s.api, apps: [{ id: uid(), name: app.name.trim(), platform: app.platform, color: app.color, status: "опубликовано", date: nowStamp().slice(0, 10), build: 1 }, ...s.api.apps] } }));
        setBuilding(-1);
        setApp({ name: "", platform: app.platform, color: app.color });
        toast("ok", "Приложение собрано", `Сборка для ${app.platform} подключена к API Wordtime.`);
      }
    }, 460 * (i + 1))));
  };

  const manifest = (a: MobileAppItem) => JSON.stringify({ app: a.name, platform: a.platform, build: a.build, api: "https://api.wordtime.ru/wt/v1", auth: "Bearer <ключ API>", theme: a.color, screens: ["лента", "запись", "комментарии", "поиск", "профиль"], push: true }, null, 2);

  const endpoints = [
    ["GET", "/wt/v1/posts", "лента записей с пагинацией", "чтение"],
    ["GET", "/wt/v1/posts/{id}", "запись + комментарии", "чтение"],
    ["POST", "/wt/v1/posts", "создание записи", "запись"],
    ["POST", "/wt/v1/comments", "комментарий (с модерацией)", "запись"],
    ["POST", "/wt/v1/media", "загрузка файла (авто-WebP)", "запись"],
    ["GET", "/wt/v1/sitemap", "адреса сайта в JSON", "чтение"],
  ] as const;

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <Card title="Собрать мобильное приложение" desc="Обёртка вокруг REST API Wordtime: лента, записи, комментарии, push-уведомления.">
          <div className="space-y-4">
            <Field label="Название приложения">
              <input value={app.name} onChange={e => setApp({ ...app, name: e.target.value })} placeholder="Мой журнал" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[13px] font-semibold text-ink-800 mb-1.5">Платформа</p>
                <div className="grid grid-cols-2 p-1 bg-canvas rounded-lg">
                  {(["Android", "iOS"] as const).map(p => (
                    <button key={p} onClick={() => setApp({ ...app, platform: p })}
                      className={`h-9 rounded-md text-[13px] font-bold transition-all cursor-pointer ${app.platform === p ? "bg-deep-2 text-white shadow" : "text-mut hover:text-ink-900"}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-ink-800 mb-1.5">Цвет приложения</p>
                <div className="flex gap-2 h-11 items-center">
                  {["#0e9384", "#2563a8", "#d99417", "#a4286a"].map(c => (
                    <button key={c} onClick={() => setApp({ ...app, color: c })} className={`w-8 h-8 rounded-full transition-transform cursor-pointer hover:scale-110 ${app.color === c ? "ring-[3px] ring-offset-2 ring-ink-900/40 scale-110" : ""}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            {building >= 0 && <Progress value={building} tone="amber" label={building < 40 ? "Генерируем экраны…" : building < 80 ? "Подключаем API и авторизацию…" : "Пакуем сборку…"} />}
            <Btn kind="amber" size="lg" className="w-full" onClick={buildApp} disabled={building >= 0}><I n="phone" size={16} />{building >= 0 ? "Собираем приложение…" : `Собрать для ${app.platform}`}</Btn>
          </div>
          <div className="mt-5 space-y-2.5">
            {pf.api.apps.map(a => (
              <div key={a.id} className="flex items-center gap-3.5 p-3.5 rounded-xl border border-line">
                <span className="w-11 h-11 rounded-xl grid place-items-center text-white shrink-0" style={{ background: a.color }}><I n="phone" size={19} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold text-ink-900">{a.name} <span className="text-mut font-semibold">· сборка {a.build}</span></p>
                  <p className="text-[12px] text-mut">{a.platform} · {ruDate(a.date)} · REST API + push</p>
                </div>
                <Badge tone="ok">{a.status.toUpperCase()}</Badge>
                <button onClick={() => {
                  const blob = new Blob([manifest(a)], { type: "application/json" });
                  const el = document.createElement("a"); el.href = URL.createObjectURL(blob); el.download = `${slugify(a.name)}-manifest.json`; el.click(); URL.revokeObjectURL(el.href);
                  toast("ok", "Манифест скачан", "Передайте его в сборочный сервис.");
                }} className="w-9 h-9 grid place-items-center rounded-lg text-mut hover:text-teal-deep hover:bg-teal-deep/8 transition-colors cursor-pointer" title="Скачать манифест"><I n="download" size={16} /></button>
              </div>
            ))}
          </div>
        </Card>

        <div>
          <Card title="API-ключи" desc="Authorization: Bearer <ключ> · лимит 600 запросов/мин · весь трафик по HTTPS.">
            <div className="space-y-2.5 mb-4">
              {pf.api.keys.map(k => (
                <div key={k.id} className="p-3.5 rounded-xl border border-line">
                  <div className="flex items-center gap-2.5">
                    <p className="text-[13.5px] font-bold text-ink-900 flex-1 truncate">{k.name}</p>
                    <Badge tone={k.scope === "полный доступ" ? "amber" : "teal"}>{k.scope.toUpperCase()}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 text-[12px] text-mut bg-canvas border border-line rounded-md px-2.5 py-1.5 truncate">{masked[k.id] ? k.key : k.key.slice(0, 12) + "••••••••••••"}</code>
                    <button onClick={() => setMasked(m => ({ ...m, [k.id]: !m[k.id] }))} className="w-8 h-8 grid place-items-center rounded-md text-mut hover:text-ink-900 transition-colors cursor-pointer"><I n={masked[k.id] ? "eyeoff" : "eye"} size={15} /></button>
                    <button onClick={async () => { try { await navigator.clipboard.writeText(k.key); toast("ok", "Ключ скопирован"); } catch { toast("warn", "Не удалось скопировать"); } }} className="w-8 h-8 grid place-items-center rounded-md text-mut hover:text-teal-deep transition-colors cursor-pointer"><I n="copy" size={15} /></button>
                    <button onClick={() => { setPf(s => ({ ...s, api: { ...s.api, keys: s.api.keys.map(x => x.id === k.id ? { ...x, key: genKey() } : x) } })); toast("ok", "Ключ перевыпущен", "Старый ключ перестал работать."); }} className="w-8 h-8 grid place-items-center rounded-md text-mut hover:text-warn transition-colors cursor-pointer" title="Перевыпустить"><I n="refresh" size={15} /></button>
                  </div>
                  <p className="text-[11px] text-mut mt-1.5">создан {ruDate(k.created)} · последнее обращение: {k.lastUsed}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newKey.name} onChange={e => setNewKey({ ...newKey, name: e.target.value })} placeholder="Название ключа" className={inputCls} />
              <select value={newKey.scope} onChange={e => setNewKey({ ...newKey, scope: e.target.value })} className={selectCls + " w-44 shrink-0"}>
                <option>только чтение</option><option>запись</option><option>полный доступ</option>
              </select>
              <Btn kind="outline" onClick={addKey}><I n="plus" size={15} /></Btn>
            </div>
          </Card>

          <Card title="Методы REST API" desc="Тот же формат данных, что у wp-json — мобильным разработчикам всё знакомо.">
            <div className="space-y-1.5">
              {endpoints.map(([m, p, d, s]) => (
                <div key={p + m} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-canvas transition-colors">
                  <span className={`w-14 text-center text-[10.5px] font-extrabold py-1 rounded-md ${m === "GET" ? "bg-teal-deep/10 text-teal-deep" : "bg-amber-brand/15 text-amber-deep"}`}>{m}</span>
                  <code className="text-[12.5px] font-bold text-ink-800">{p}</code>
                  <span className="text-[12px] text-mut flex-1 text-right hidden sm:block">{d}</span>
                  <Badge tone={s === "чтение" ? "mut" : "amber"}>{s}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <Card title="Журнал запросов к API" right={<Badge tone="teal">LIVE</Badge>}>
          <div className="space-y-1.5 font-mono text-[12px]">
            {pf.api.log.map((l, i) => (
              <p key={l + i} className={`p-2 rounded-md bg-canvas/60 border border-line truncate ${i === 0 ? "anim-fade text-ink-900" : "text-mut"}`}>{l}</p>
            ))}
          </div>
        </Card>
        <Card title="Журнал защиты" desc="Попытки подбора паролей и инъекции блокируются автоматически — детали в «Настройки → Безопасность».">
          <ul className="space-y-2">
            {(log.length ? log : [{ t: "Подозрительных действий не зафиксировано", time: "—" }]).map((e, i) => (
              <li key={i} className="flex items-center gap-3 text-[13px]">
                <span className="w-6 h-6 rounded-full bg-ok/12 text-ok grid place-items-center shrink-0"><I n="shield" size={12} /></span>
                <span className="font-semibold text-ink-800 flex-1">{e.t}</span>
                <span className="text-[11.5px] text-mut">{e.time}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
