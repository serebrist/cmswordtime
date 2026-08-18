import React, { useEffect, useState } from "react";
import { I } from "../components/icons";
import { Badge, Btn, Progress, Stars } from "../components/ui";
import { useStore } from "../lib/store";

/* ── Плагины ── */
export function PluginsScreen({ initialTab }: { initialTab?: "installed" | "catalog" }) {
  const { state, mutate, toast } = useStore();
  const [tab, setTab] = useState<"installed" | "catalog">(initialTab ?? "installed");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<Record<string, number>>({});

  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);

  const installed = state.plugins.filter(p => p.installed);
  const catalog = state.plugins.filter(p => !p.installed && (q.trim() === "" || (p.name + p.desc + p.author).toLowerCase().includes(q.toLowerCase())));

  const compatStage = (p: number) =>
    p < 20 ? "Сверка версии PHP 8.3 и ядра Wordtime…" :
    p < 40 ? "Проверка хуков add_action / add_filter…" :
    p < 60 ? "Тест совместимости REST API wp/v2 ↔ wt/v1…" :
    p < 80 ? "Экранирование SQL-запросов плагина…" :
    p < 100 ? "Проверка прав и файлов…" : "Совместимость 100% — активация";

  const install = (slug: string) => {
    setBusy(b => ({ ...b, [slug]: 5 }));
    const steps = [18, 38, 57, 74, 88, 100];
    steps.forEach((p, i) => window.setTimeout(() => {
      setBusy(b => ({ ...b, [slug]: p }));
      if (p === 100) {
        mutate(s => { const pl = s.plugins.find(x => x.slug === slug); if (pl) { pl.installed = true; pl.active = true; } s.activity.unshift({ id: "act" + Date.now(), text: `Установлен и активирован плагин «${state.plugins.find(x => x.slug === slug)?.name}»`, time: "только что", icon: "plug" }); });
        window.setTimeout(() => setBusy(b => { const n = { ...b }; delete n[slug]; return n; }), 600);
        toast("ok", "Плагин установлен", "Слой WT-Compat подтвердил полную совместимость.");
      }
    }, 320 * (i + 1)));
  };

  const toggleActive = (slug: string) => {
    mutate(s => { const pl = s.plugins.find(x => x.slug === slug); if (pl && !pl.builtin) pl.active = !pl.active; });
    const pl = state.plugins.find(x => x.slug === slug);
    if (!pl?.builtin) toast("info", pl?.active ? "Плагин деактивирован" : "Плагин активирован", pl?.name);
  };

  const uninstall = (slug: string) => {
    mutate(s => { const pl = s.plugins.find(x => x.slug === slug); if (pl && !pl.builtin) { pl.installed = false; pl.active = false; } });
    toast("ok", "Плагин удалён", "Файлы плагина стёрты, настройки сброшены.");
  };

  return (
    <div className="anim-fade-up">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="font-display font-extrabold text-[24px] text-ink-900 tracking-tight mr-auto">Плагины</h1>
        <div className="flex items-center gap-2 px-3.5 h-9 rounded-lg bg-ok/10 border border-ok/25 text-ok text-[12.5px] font-extrabold">
          <I n="shield" size={15} /> WT-Совместимость активна · плагины WordPress® поддерживаются
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {([["installed", `Установленные · ${installed.length}`], ["catalog", "Добавить новый"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 h-9 rounded-lg text-[13px] font-bold transition-all cursor-pointer border
              ${tab === k ? "bg-ink-900 text-white border-ink-900" : "bg-card text-mut border-line hover:border-ink-600/40 hover:text-ink-900"}`}>{l}</button>
        ))}
      </div>

      {tab === "installed" ? (
        <div className="space-y-3">
          {installed.map(p => (
            <div key={p.slug} className={`bg-card border rounded-xl p-5 flex flex-wrap items-center gap-4 transition-all ${p.active ? "border-line shadow-panel" : "border-line opacity-90"}`}>
              <span className="w-12 h-12 rounded-xl grid place-items-center font-display font-extrabold text-[18px] text-white shrink-0" style={{ background: p.color }}>{p.letter}</span>
              <div className="min-w-[240px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-[15px] text-ink-900">{p.name}</p>
                  <span className="text-[12px] text-mut tabular">v{p.version}</span>
                  {p.builtin && <Badge tone="amber">В ЯДРЕ</Badge>}
                  {p.active ? <Badge tone="ok">АКТИВЕН</Badge> : !p.builtin && <Badge tone="mut">НЕ АКТИВЕН</Badge>}
                </div>
                <p className="text-[13px] text-mut mt-1 leading-snug max-w-2xl">{p.desc}</p>
                <p className="text-[12px] text-mut/80 mt-1">Автор: {p.author}</p>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {!p.builtin && (
                  <>
                    <Btn size="sm" kind={p.active ? "outline" : "primary"} onClick={() => toggleActive(p.slug)}>{p.active ? "Деактивировать" : "Активировать"}</Btn>
                    <Btn size="sm" kind="ghost" className="text-danger! hover:bg-danger/8!" onClick={() => uninstall(p.slug)}>Удалить</Btn>
                  </>
                )}
                {p.builtin && <span className="text-[12px] font-bold text-mut">встроен в Wordtime</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="relative max-w-md mb-5">
            <I n="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mut" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск среди 59 000+ плагинов WordPress…"
              className="w-full h-10 pl-9 pr-3.5 rounded-lg border border-line bg-card text-[14px] outline-none focus:border-teal-deep focus:ring-[3px] focus:ring-teal-deep/15 transition-all" />
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
            {catalog.map(p => (
              <div key={p.slug} className="bg-card border border-line rounded-xl p-5 flex flex-col hover:-translate-y-1 hover:shadow-panel transition-all">
                <div className="flex items-start gap-3.5">
                  <span className="w-11 h-11 rounded-xl grid place-items-center font-display font-extrabold text-[16px] text-white shrink-0" style={{ background: p.color }}>{p.letter}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-[14.5px] text-ink-900 leading-tight">{p.name}</p>
                    <p className="text-[12px] text-mut mt-0.5">{p.author}</p>
                    <div className="flex items-center gap-2 mt-1.5"><Stars n={p.rating} /><span className="text-[11.5px] text-mut tabular">{p.installs}</span></div>
                  </div>
                </div>
                <p className="text-[13px] text-mut mt-3 leading-snug flex-1">{p.desc}</p>
                <div className="mt-4 flex items-center gap-2">
                  <Badge tone="teal"><I n="check" size={10} sw={3} />СОВМЕСТИМ С WT</Badge>
                  <span className="text-[11.5px] text-mut tabular ml-auto">v{p.version}</span>
                </div>
                <div className="mt-3">
                  {busy[p.slug] !== undefined ? (
                    <Progress value={busy[p.slug]} label={compatStage(busy[p.slug])} />
                  ) : (
                    <Btn className="w-full" kind="dark" onClick={() => install(p.slug)}><I n="download" size={15} />Установить и активировать</Btn>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Темы ── */
function ThemePreview({ c1, c2, pattern, font }: { c1: string; c2: string; pattern: string; font: string }) {
  return (
    <div className="w-full h-36 relative overflow-hidden" style={{ background: "#f4f6f7" }}>
      <div className="h-7 flex items-center gap-1.5 px-3" style={{ background: c1 }}>
        <span className="w-8 h-1.5 rounded-full" style={{ background: c2 }} />
        <span className="ml-auto flex gap-1">{[0, 1, 2].map(i => <span key={i} className="w-4 h-1 rounded-full bg-white/40" />)}</span>
      </div>
      {pattern === "hero" && (
        <div className="p-4">
          <div className="h-16 rounded-lg relative overflow-hidden" style={{ background: `linear-gradient(120deg, ${c1}, ${c2})` }}>
            <span className="absolute left-3 top-3 w-16 h-2 rounded-full bg-white/85" />
            <span className="absolute left-3 top-6.5 w-10 h-1.5 rounded-full bg-white/50" />
            <span className="absolute right-3 bottom-3 w-8 h-3 rounded-md bg-white/90" />
          </div>
          <div className="flex gap-2 mt-2.5">{[0, 1, 2].map(i => <span key={i} className="flex-1 h-8 rounded-md bg-white border border-[#e2e8e9]" />)}</div>
        </div>
      )}
      {pattern === "bars" && (
        <div className="p-4 space-y-2.5">
          <span className="block w-24 h-2.5 rounded-full" style={{ background: c1 }} />
          {[90, 100, 70].map((w, i) => <span key={i} className="block h-1.5 rounded-full bg-[#d3dcde]" style={{ width: `${w}%` }} />)}
          <div className="flex gap-2 pt-1">{[0, 1].map(i => <span key={i} className="w-12 h-4 rounded-md" style={{ background: i ? "#d3dcde" : c2 }} />)}</div>
        </div>
      )}
      {pattern === "grid" && (
        <div className="p-4 grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded-md bg-white border border-[#e2e8e9] p-1.5">
              <span className="block h-3 rounded-sm" style={{ background: i % 3 === 0 ? c2 : "#dde5e7" }} />
              <span className="block h-1 w-3/4 mt-1 rounded-full bg-[#d3dcde]" />
            </div>
          ))}
        </div>
      )}
      {pattern === "split" && (
        <div className="flex h-[calc(100%-28px)]">
          <div className="w-1/3 p-3 space-y-1.5" style={{ background: c1 }}>
            <span className="block w-8 h-1.5 rounded-full" style={{ background: c2 }} />
            {[0, 1, 2, 3].map(i => <span key={i} className="block h-1 rounded-full bg-white/30" />)}
          </div>
          <div className="flex-1 p-3 space-y-2">
            <span className="block w-20 h-2 rounded-full bg-[#c7d2d5]" />
            {[100, 85, 92, 60].map((w, i) => <span key={i} className="block h-1.5 rounded-full bg-[#d3dcde]" style={{ width: `${w}%` }} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export function ThemesScreen() {
  const { state, mutate, toast } = useStore();
  const [busy, setBusy] = useState<string | null>(null);

  const install = (slug: string) => {
    setBusy(slug);
    toast("info", "Проверка совместимости темы…", "Иерархия шаблонов, sidebar, меню, блоки — по стандартам WordPress.");
    window.setTimeout(() => {
      mutate(s => { const t = s.themes.find(x => x.slug === slug); if (t) t.installed = true; });
      setBusy(null);
      toast("ok", "Тема установлена", "Совместимость 100%: шаблоны, виджеты и меню работают как в WordPress.");
    }, 2100);
  };

  const activate = (slug: string) => {
    mutate(s => { s.themes.forEach(t => { t.active = t.slug === slug; }); s.activity.unshift({ id: "act" + Date.now(), text: `Активирована тема «${s.themes.find(t => t.slug === slug)?.name}»`, time: "только что", icon: "brush" }); });
    toast("ok", "Тема активирована", "Сайт уже переоделся — загляните через «Перейти на сайт».");
  };

  return (
    <div className="anim-fade-up">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="font-display font-extrabold text-[24px] text-ink-900 tracking-tight mr-auto">Темы</h1>
        <div className="flex items-center gap-2 px-3.5 h-9 rounded-lg bg-ok/10 border border-ok/25 text-ok text-[12.5px] font-extrabold">
          <I n="shield" size={15} /> Темы WordPress® работают через WT-Совместимость
        </div>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 stagger">
        {state.themes.map(t => (
          <div key={t.slug} className={`bg-card border rounded-xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-panel ${t.active ? "border-teal-deep ring-[3px] ring-teal-deep/15" : "border-line"}`}>
            <ThemePreview c1={t.c1} c2={t.c2} pattern={t.pattern} font={t.font} />
            <div className="p-4.5">
              <div className="flex items-center gap-2">
                <p className="font-bold text-[15px] text-ink-900">{t.name}</p>
                {t.active && <Badge tone="teal">АКТИВНА</Badge>}
              </div>
              <p className="text-[12.5px] text-mut mt-0.5">{t.author}</p>
              <div className="mt-3.5 flex gap-2">
                {t.active ? (
                  <Btn size="sm" kind="outline" className="flex-1" onClick={() => toast("info", "Эта тема уже активна", "Настройте её в разделе «Внешний вид → Настроить».")}>Настроить</Btn>
                ) : t.installed ? (
                  <Btn size="sm" className="flex-1" onClick={() => activate(t.slug)}>Активировать</Btn>
                ) : busy === t.slug ? (
                  <div className="flex-1"><Progress value={62} label="Установка…" /></div>
                ) : (
                  <Btn size="sm" kind="dark" className="flex-1" onClick={() => install(t.slug)}><I n="download" size={14} />Установить</Btn>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
