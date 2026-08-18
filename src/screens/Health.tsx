import React, { useState } from "react";
import { I, IconName } from "../components/icons";
import { Badge, Btn } from "../components/ui";
import { useStore } from "../lib/store";

/* ── модель дерева файлов ── */
type Node = { name: string; kind: "folder" | "file"; note?: string; hl?: boolean; children?: Node[] };

const TREE: Node[] = [
  {
    name: "wordtime_cms/", kind: "folder", note: "корень сайта", children: [
      { name: "wt-admin/", kind: "folder", note: "консоль управления — аналог wp-admin/", children: [
        { name: "index.php", kind: "file" }, { name: "admin.php", kind: "file" }, { name: "includes/", kind: "folder", children: [{ name: "class-wt-admin.php", kind: "file" }] },
      ] },
      { name: "wt-includes/", kind: "folder", note: "ядро Wordtime — хуки, маршрутизатор, БД", children: [
        { name: "plugin.php", kind: "file", note: "add_action / add_filter — 1-в-1 как в WP" },
        { name: "class-wt-db.php", kind: "file" }, { name: "taxonomy.php", kind: "file" }, { name: "theme.php", kind: "file" },
      ] },
      {
        name: "wt-content/", kind: "folder", note: "всё пользовательское — аналог wp-content/", children: [
          { name: "plugins/", kind: "folder", note: "сюда встают .zip-плагины от WordPress", hl: true, children: [
            { name: "wordfence/", kind: "folder" }, { name: "yoast-seo/", kind: "folder" }, { name: "woocommerce/", kind: "folder" },
          ] },
          { name: "themes/", kind: "folder", note: "темы WordPress — иерархия шаблонов сохранена", hl: true, children: [
            { name: "aurora/", kind: "folder", children: [{ name: "index.php", kind: "file" }, { name: "style.css", kind: "file" }, { name: "functions.php", kind: "file" }] },
          ] },
          { name: "uploads/", kind: "folder", note: "медиафайлы по годам и месяцам" },
          { name: "backups/", kind: "folder", note: "архивы WT-Миграции (.wtm)" },
        ],
      },
      { name: "wt-config.php", kind: "file", note: "ключи БД, соли, языки — аналог wp-config.php", hl: true },
      { name: "index.php", kind: "file" },
      { name: ".htaccess", kind: "file", note: "красивые ссылки ЧПУ" },
    ],
  },
];

function FileGlyph({ className }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M6 3.5h8L19 8.5v12H6z" strokeLinejoin="round" /><path d="M14 3.5v5h5" strokeLinejoin="round" />
      <path d="M10.8 12.5c-1 0-1.8.6-1.8 1.7 0 2.2 3.4 1.3 3.4 3 0 .9-.8 1.4-1.7 1.4" strokeLinecap="round" />
    </svg>
  );
}

function TreeNode({ node, depth = 0 }: { node: Node; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const isFolder = node.kind === "folder";
  return (
    <div>
      <button
        onClick={() => isFolder && setOpen(o => !o)}
        className={`w-full flex items-center gap-2 py-[7px] pr-3 rounded-lg text-left transition-all group
          ${isFolder ? "cursor-pointer hover:bg-canvas" : "cursor-default"}
          ${node.hl ? "bg-teal-soft/70" : ""}`}
        style={{ paddingLeft: 10 + depth * 20 }}
      >
        <span className={`w-4 h-4 grid place-items-center text-mut transition-transform duration-200 ${isFolder ? (open ? "rotate-90" : "") : "opacity-0"}`}>
          <I n="chevR" size={12} sw={2.4} />
        </span>
        <span className={isFolder ? "text-amber-deep" : "text-teal-deep"}>
          {isFolder ? <I n="folder" size={16} /> : <FileGlyph />}
        </span>
        <span className={`text-[13.5px] ${isFolder ? "font-bold text-ink-900" : "font-semibold text-ink-800"} ${node.name.endsWith(".php") ? "tabular" : ""}`}>
          {node.name}
        </span>
        {node.note && <span className="ml-auto hidden md:inline text-[11.5px] text-mut opacity-0 group-hover:opacity-100 transition-opacity truncate pl-3">{node.note}</span>}
      </button>
      {isFolder && open && node.children && (
        <div className="relative anim-fade">
          <span className="absolute top-0 bottom-1.5 bg-line" style={{ left: 21 + depth * 20 }} />
          {node.children.map((c, i) => <TreeNode key={i} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

/* ── проверки ── */
const CHECKS: { label: string; value: string; icon: IconName; status: "ok" | "warn"; note: string }[] = [
  { label: "Версия PHP", value: "8.3.14", icon: "gear", status: "ok", note: "Та же ветка, на которой работает современный WordPress" },
  { label: "База данных", value: "MariaDB 10.11.6", icon: "database", status: "ok", note: "Схема таблиц wt_* зеркалит wp_* — миграция без потерь" },
  { label: "Ядро Wordtime", value: "1.0.4", icon: "wt", status: "ok", note: "API хуков: add_action(), add_filter(), do_action()" },
  { label: "HTTPS", value: "Действующий сертификат", icon: "lock", status: "ok", note: "TLS 1.3, автопродление Let's Encrypt" },
  { label: "REST API", value: "wordtime.ru/wt-json/", icon: "globe", status: "ok", note: "Эндпоинты совместимы с wp-json-клиентами" },
  { label: "Память PHP", value: "256 МБ из 512 МБ", icon: "zap", status: "ok", note: "Рекомендуемый минимум для магазинов — пройден" },
  { label: "Почта (SMTP)", value: "Демо-доставка в консоли", icon: "mail", status: "warn", note: "В браузерной сборке письма показываются прямо в интерфейсе" },
];

export default function HealthScreen() {
  const { state, toast } = useStore();
  const [checking, setChecking] = useState(false);
  const [step, setStep] = useState("");
  const okCount = CHECKS.filter(c => c.status === "ok").length;

  const runChecks = () => {
    if (checking) return;
    setChecking(true);
    const steps = ["Подключаемся к MariaDB…", "Спрашиваем версию PHP…", "Проверяем права на папки…", "Тестируем REST API…"];
    steps.forEach((s, i) => window.setTimeout(() => setStep(s), i * 350));
    window.setTimeout(() => {
      setChecking(false); setStep("");
      toast("ok", "Проверка завершена", `${okCount} из ${CHECKS.length} проверок пройдено, 1 требует внимания.`);
    }, steps.length * 350 + 500);
  };

  return (
    <div className="anim-fade-up">
      {/* шапка */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-extrabold text-[24px] text-ink-900 tracking-tight">Здоровье системы</h1>
          <p className="text-[13.5px] text-mut mt-1">Серверный стек, структура папок <b className="text-ink-800">Wordtime_cms</b> и совместимость с экосистемой WordPress.</p>
        </div>
        <Btn onClick={runChecks} disabled={checking}>
          <I n="refresh" size={16} className={checking ? "anim-spin" : ""} />
          {checking ? "Проверяем…" : "Повторить проверки"}
        </Btn>
      </div>

      {/* сводка */}
      <div className="relative overflow-hidden rounded-2xl bg-deep-2 text-paper p-6 mb-6 grain">
        <div className="absolute inset-0 blueprint opacity-60" />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-2xl bg-ok/15 text-ok grid place-items-center"><I n="heart" size={27} /></span>
            <div>
              <p className="font-display font-extrabold text-[19px]">Сайт здоров</p>
              <p className="text-[13px] text-paper/60 mt-0.5">{okCount} из {CHECKS.length} проверок пройдено · 1 рекомендация</p>
            </div>
          </div>
          <div className="hidden sm:block w-px h-12 bg-deep-line" />
          <div className="flex-1 min-w-[220px]">
            <p className="text-[11.5px] font-extrabold uppercase tracking-[0.16em] text-teal-brand mb-2">{checking ? step || "Запуск…" : "Wordtime работает на том же стеке, что и WordPress"}</p>
            <div className="flex flex-wrap gap-2">
              {["PHP 8.3", "MariaDB 10.11", "Apache / nginx", "WT-Core 1.0.4"].map(t => (
                <span key={t} className="px-2.5 py-1 rounded-md bg-deep-line/60 border border-deep-line text-[12px] font-bold tabular">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* проверки */}
        <section className="bg-card border border-line rounded-xl shadow-panel overflow-hidden">
          <header className="px-6 pt-5 pb-4 border-b border-line flex items-center gap-2.5">
            <h2 className="font-display font-bold text-[16px] text-ink-900">Проверки окружения</h2>
            <Badge tone="ok">{okCount} ОК</Badge><Badge tone="warn">1</Badge>
          </header>
          <ul className="divide-y divide-line">
            {CHECKS.map((c, i) => (
              <li key={c.label} className={`px-6 py-3.5 flex items-center gap-3.5 transition-colors hover:bg-canvas/70 ${checking ? "anim-row-scan" : ""}`} style={checking ? { animationDelay: `${i * 0.12}s` } : undefined}>
                <span className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${c.status === "ok" ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"}`}><I n={c.icon} size={17} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-bold text-ink-900">{c.label} <span className="font-semibold text-mut ml-1.5 tabular">{c.value}</span></p>
                  <p className="text-[12px] text-mut mt-0.5 truncate">{c.note}</p>
                </div>
                <span className={`w-6 h-6 rounded-full grid place-items-center shrink-0 ${c.status === "ok" ? "bg-ok/12 text-ok" : "bg-warn/12 text-warn"}`}>
                  <I n={c.status === "ok" ? "check" : "info"} size={13} sw={2.4} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* дерево папок */}
        <section className="bg-card border border-line rounded-xl shadow-panel overflow-hidden">
          <header className="px-6 pt-5 pb-4 border-b border-line">
            <h2 className="font-display font-bold text-[16px] text-ink-900">Папка Wordtime_cms</h2>
            <p className="text-[12.5px] text-mut mt-1">Структура 1-в-1 повторяет WordPress: wt-admin ↔ wp-admin, wt-content ↔ wp-content. Наведите на строку — появится пояснение.</p>
          </header>
          <div className="p-3 font-mono">
            {TREE.map((n, i) => <TreeNode key={i} node={n} />)}
          </div>
          <footer className="px-6 py-3.5 border-t border-line bg-canvas/50 text-[12px] text-mut flex items-center gap-2">
            <I n="info" size={14} /> Подсвечены ключевые точки совместимости с WordPress.
          </footer>
        </section>
      </div>

      {/* почему плагины WP встают как родные */}
      <div className="mt-6 grid lg:grid-cols-[1.15fr_1fr] gap-6">
        <section className="bg-card border border-line rounded-xl shadow-panel overflow-hidden">
          <header className="px-6 pt-5 pb-4 border-b border-line">
            <h2 className="font-display font-bold text-[16px] text-ink-900">Почему плагины и темы WordPress работают в Wordtime</h2>
          </header>
          <div className="px-6 py-5 grid sm:grid-cols-2 gap-5">
            {[
              { icon: "plug" as IconName, t: "Единое API хуков", d: "add_action() и add_filter() ведут себя идентично: плагин даже не замечает подмены ядра." },
              { icon: "layout" as IconName, t: "Иерархия шаблонов", d: "header.php, footer.php, single.php, functions.php — темы грузятся по правилам WordPress." },
              { icon: "database" as IconName, t: "Совместимая схема БД", d: "Таблицы wt_posts, wt_options, wt_postmeta повторяют структуру wp_* — данные переносятся напрямую." },
              { icon: "shield" as IconName, t: "Слой wt-compat", d: "Функции wp_* автоматически картируются на wt_*: старый код запускается без правок." },
            ].map(f => (
              <div key={f.t} className="flex gap-3.5 group">
                <span className="w-10 h-10 rounded-xl bg-deep-2 text-teal-brand grid place-items-center shrink-0 group-hover:scale-110 group-hover:bg-teal-deep group-hover:text-white transition-all duration-200"><I n={f.icon} size={18} /></span>
                <div>
                  <p className="text-[13.5px] font-bold text-ink-900">{f.t}</p>
                  <p className="text-[12.5px] text-mut mt-1 leading-relaxed">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* сниппет */}
        <section className="rounded-xl overflow-hidden border border-deep-line bg-deep text-paper shadow-panel flex flex-col">
          <div className="flex items-center gap-2 px-4 h-10 bg-deep-2 border-b border-deep-line">
            <span className="w-2.5 h-2.5 rounded-full bg-danger/70" /><span className="w-2.5 h-2.5 rounded-full bg-warn/70" /><span className="w-2.5 h-2.5 rounded-full bg-ok/70" />
            <span className="ml-2 text-[11.5px] font-bold text-paper/50 font-mono">wt-content/plugins/moy-plugin/plugin.php</span>
          </div>
          <pre className="p-5 text-[12.5px] leading-[1.75] font-mono overflow-x-auto flex-1">
            <code>
              <span className="text-paper/40">{"// Тот же плагин WordPress — без единой правки"}</span>{"\n"}
              <span className="text-[#7fd3c7]">add_action</span>(<span className="text-amber-brand">'init'</span>, <span className="text-[#7fd3c7]">function</span>() {"{"}{"\n"}
              {"  "}<span className="text-[#7fd3c7]">register_post_type</span>(<span className="text-amber-brand">'afisha'</span>, [...]);{"\n"}
              {"}"});{"\n\n"}
              <span className="text-[#7fd3c7]">add_filter</span>(<span className="text-amber-brand">'the_content'</span>, <span className="text-[#7fd3c7]">function</span>($c) {"{"}{"\n"}
              {"  "}<span className="text-[#7fd3c7]">return</span> $c . <span className="text-amber-brand">' — сделано на Wordtime'</span>;{"\n"}
              {"}"});
            </code>
          </pre>
          <div className="px-5 py-3 border-t border-deep-line text-[11.5px] text-paper/50 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-brand" style={{ animation: "wt-pulse-dot 1.6s infinite" }} />
            Слои wt-includes/plugin.php и wt-compat/ перехватывают вызовы автоматически.
          </div>
        </section>
      </div>

      {/* честная архитектура */}
      <section className="mt-6 rounded-xl border border-line bg-card shadow-panel px-6 py-5 flex flex-wrap items-center gap-5">
        <span className="w-11 h-11 rounded-xl bg-amber-brand/15 text-amber-deep grid place-items-center shrink-0"><I n="sparkle" size={21} /></span>
        <div className="flex-1 min-w-[260px]">
          <p className="text-[14px] font-bold text-ink-900">Серверная и браузерная сборки</p>
          <p className="text-[13px] text-mut mt-1 leading-relaxed max-w-3xl">
            На хостинге Wordtime исполняется как классический PHP-стек: <b className="text-ink-800">PHP 8.3 + MariaDB</b>, папка <b className="text-ink-800">Wordtime_cms</b> со структурой выше.
            Этот демо-стенд развёрнут как браузерная сборка: та же консоль работает на встроенном слое хранения,
            а письма с кодами 2FA доставляются прямо в интерфейс — поэтому всё можно пощупать без сервера.
          </p>
        </div>
        <Badge tone="teal">WT {state.version}</Badge>
      </section>
    </div>
  );
}
