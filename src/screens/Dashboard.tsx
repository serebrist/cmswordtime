import React, { useState } from "react";
import { I, IconName } from "../components/icons";
import { Btn, Badge } from "../components/ui";
import { fmtKB, plural } from "../lib/data";
import { useStore } from "../lib/store";

function Panel({ title, icon, action, children, className = "" }: { title: string; icon: IconName; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-card border border-line rounded-xl shadow-panel overflow-hidden ${className}`}>
      <header className="flex items-center justify-between px-5 h-12 border-b border-line">
        <h3 className="flex items-center gap-2.5 text-[13.5px] font-extrabold text-ink-900 tracking-wide">
          <span className="text-teal-deep"><I n={icon} size={16} sw={2} /></span>{title}
        </h3>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function Dashboard() {
  const { state, nav, mutate, toast, clearCache, openPost, authed } = useStore();
  const [draft, setDraft] = useState("");
  const s = state;
  const published = s.posts.filter(p => p.status === "published");
  const approved = s.comments.filter(c => c.status === "approved").length;
  const pending = s.comments.filter(c => c.status === "pending").length;
  const activePlugins = s.plugins.filter(p => p.active).length;
  const hour = new Date().getHours();
  const greet = hour < 5 ? "Доброй ночи" : hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";
  const health = 92 - (pending > 0 ? 4 : 0) - (s.cache.sizeKB > 60 * 1024 ? 6 : 0);
  const ringTo = 260 - (260 * health) / 100;

  const saveDraft = () => {
    if (draft.trim().length < 3) { toast("warn", "Слишком коротко", "Напишите хотя бы пару слов для черновика."); return; }
    mutate(st => {
      st.posts.unshift({ id: "p" + Date.now(), title: draft.trim().slice(0, 60), content: draft.trim(), category: "Без рубрики", tags: [], status: "draft", date: new Date().toISOString().slice(0, 10), author: authed?.name ?? "Администратор", views: 0 });
      st.activity.unshift({ id: "a" + Date.now(), text: "Создан быстрый черновик", time: "только что", icon: "edit" });
    });
    setDraft("");
    toast("ok", "Черновик сохранён", "Найти его можно в разделе «Записи → Черновики».");
  };

  return (
    <div className="space-y-6">
      {/* ── приветствие ── */}
      {!s.welcomeDismissed && (
        <section className="relative overflow-hidden rounded-2xl bg-ink-900 text-paper grain anim-fade-up">
          <div className="absolute inset-0 blueprint" />
          <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-teal-brand/20 blur-3xl" />
          <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <p className="text-[12px] font-bold tracking-[0.2em] uppercase text-teal-brand">{greet}, {authed?.name.split(" ")[0]}</p>
              <h1 className="font-display font-extrabold text-[clamp(22px,3vw,32px)] leading-tight mt-2 tracking-tight">
                {s.settings.siteTitle} работает на&nbsp;Wordtime&nbsp;{s.version}
              </h1>
              <p className="text-[14px] text-paper/65 mt-3 max-w-xl leading-relaxed">
                Все плагины и темы WordPress совместимы через слой WT-Compat. Кеш, 2FA и миграция уже в ядре — ничего устанавливать не нужно.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                <Btn kind="amber" size="md" onClick={() => openPost()}><I n="plus" size={15} sw={2.4} />Написать запись</Btn>
                <Btn kind="dark" className="bg-ink-700! hover:bg-ink-600!" onClick={() => nav("settings:backups")}><I n="cloud" size={15} />Создать копию сайта</Btn>
                <Btn kind="ghost" className="text-paper/80! hover:bg-ink-800!" onClick={() => nav("plugins-new")}>Каталог плагинов →</Btn>
              </div>
            </div>
            <div className="hidden md:block shrink-0">
              <svg width="150" height="150" viewBox="0 0 150 150">
                <circle cx="75" cy="75" r="62" fill="none" stroke="#174753" strokeWidth="12" />
                <circle cx="75" cy="75" r="62" fill="none" stroke="#f2b03d" strokeWidth="12" strokeLinecap="round"
                  strokeDasharray="390" style={{ ["--ring-from" as string]: 390, ["--ring-to" as string]: 390 - 390 * 0.92, animation: "wt-ring 1.4s cubic-bezier(0.22,1,0.36,1) 0.3s both" }}
                  transform="rotate(-90 75 75)" />
                <text x="75" y="70" textAnchor="middle" fill="#fff" fontSize="26" fontWeight="800" fontFamily="Unbounded">92%</text>
                <text x="75" y="92" textAnchor="middle" fill="#8fb0b7" fontSize="11" fontWeight="600">здоровье сайта</text>
              </svg>
            </div>
          </div>
          <button onClick={() => mutate(st => { st.welcomeDismissed = true; })}
            className="absolute top-4 right-4 w-8 h-8 grid place-items-center rounded-lg text-paper/50 hover:text-white hover:bg-ink-800 transition-colors cursor-pointer" title="Скрыть приветствие">
            <I n="x" size={15} />
          </button>
        </section>
      )}

      {/* ── взгляд в цифрах ── */}
      <section className="grid grid-cols-2 lg:grid-cols-5 bg-card border border-line rounded-xl shadow-panel overflow-hidden stagger">
        {[
          { l: "Записей", v: s.posts.length, sub: `${published.length} опубликовано`, i: "pin" as IconName, r: "posts" },
          { l: "Страниц", v: s.pages.length, sub: `${s.pages.filter(p => p.status === "published").length} опубликовано`, i: "pages" as IconName, r: "pages" },
          { l: "Комментариев", v: s.comments.length, sub: s.settings.commentsDisabled ? "отключены" : `${pending} в ожидании`, i: "comment" as IconName, r: "comments" },
          { l: "Плагинов активно", v: activePlugins, sub: `${s.plugins.filter(p => p.installed).length} установлено`, i: "plug" as IconName, r: "plugins" },
          { l: "Посещений за месяц", v: "12 480", sub: "+8,2% к прошлому", i: "monitor" as IconName, r: "dashboard", up: true },
        ].map(st => (
          <button key={st.l} onClick={() => nav(st.r)}
            className="text-left px-5 py-4.5 border-b lg:border-b-0 border-line odd:border-r lg:[&:not(:last-child)]:border-r hover:bg-teal-soft/30 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between text-mut group-hover:text-teal-deep transition-colors">
              <span className="text-[11.5px] font-extrabold uppercase tracking-[0.12em]">{st.l}</span>
              <I n={st.i} size={16} />
            </div>
            <p className="font-display font-extrabold text-[26px] text-ink-900 mt-2 tabular leading-none">{st.v}</p>
            <p className={`text-[12px] mt-1.5 font-semibold ${st.up ? "text-ok" : "text-mut"}`}>{st.sub}</p>
          </button>
        ))}
      </section>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
        <div className="space-y-6">
          {/* ── активность ── */}
          <Panel title="Активность" icon="clock" action={<Btn kind="ghost" size="sm" onClick={() => nav("posts")}>Все записи</Btn>}>
            <ol className="relative space-y-0">
              {s.activity.slice(0, 6).map((a, i) => (
                <li key={a.id} className="relative flex gap-4 pb-4 last:pb-0 group">
                  {i < Math.min(s.activity.length, 6) - 1 && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-line" />}
                  <span className={`w-8 h-8 shrink-0 rounded-full grid place-items-center border transition-colors ${i === 0 ? "bg-teal-deep/10 border-teal-deep/30 text-teal-deep" : "bg-paper border-line text-mut group-hover:border-teal-deep/40"}`}>
                    <I n={(a.icon as IconName) ?? "clock"} size={14} />
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className="text-[13.5px] text-ink-900 font-semibold leading-snug">{a.text}</p>
                    <p className="text-[12px] text-mut mt-0.5">{a.time}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          {/* ── здоровье сайта ── */}
          <Panel title="Состояние здоровья сайта" icon="heart" action={<Badge tone={health > 85 ? "ok" : "warn"}>{health > 85 ? "ХОРОШО" : "ЕСТЬ ЗАДАЧИ"}</Badge>}>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {[
                { t: "SSL-сертификат активен", ok: true },
                { t: "PHP 8.3 — версия актуальна", ok: true },
                { t: "Ядро Wordtime обновлено", ok: true },
                { t: "2FA включена для всех ролей", ok: true },
                { t: pending > 0 ? `Комментарии ждут проверки: ${pending}` : "Очередь модерации пуста", ok: pending === 0 },
                { t: s.cache.sizeKB > 60 * 1024 ? "Кеш разросся — стоит очистить" : "Кеш в пределах нормы", ok: s.cache.sizeKB <= 60 * 1024 },
              ].map(c => (
                <li key={c.t} className="flex items-center gap-2.5 text-[13.5px] font-semibold">
                  <span className={`w-5.5 h-5.5 rounded-full grid place-items-center shrink-0 ${c.ok ? "bg-ok/12 text-ok" : "bg-warn/12 text-warn"}`}>
                    <I n={c.ok ? "check" : "zap"} size={12} sw={2.6} />
                  </span>
                  <span className={c.ok ? "text-ink-800" : "text-warn"}>{c.t}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          {/* ── быстрый черновик ── */}
          <Panel title="Быстрый черновик" icon="edit">
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4} placeholder="О чём хотите написать?"
              className="w-full px-3.5 py-3 rounded-lg border border-line bg-paper/60 text-[14px] outline-none focus:border-teal-deep focus:ring-[3px] focus:ring-teal-deep/15 transition-all resize-none" />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12px] text-mut">{draft.length} символов</span>
              <Btn size="sm" onClick={saveDraft}>Сохранить черновик</Btn>
            </div>
          </Panel>

          {/* ── кеш ── */}
          <Panel title="Кеш сайта" icon="zap" action={s.settings.cacheEnabled ? <Badge tone="ok">АКТИВЕН</Badge> : <Badge tone="mut">ОТКЛЮЧЁН</Badge>}>
            <div className="flex items-end justify-between">
              <div>
                <p className="font-display font-extrabold text-[28px] text-ink-900 tabular leading-none">{fmtKB(s.cache.sizeKB)}</p>
                <p className="text-[12.5px] text-mut mt-1.5">занято в кеше · {s.cache.hits.toLocaleString("ru-RU")} запросов обслужено</p>
              </div>
              <span className="text-teal-deep"><I n="database" size={30} /></span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-ink-900/8 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-teal-deep to-teal-brand transition-all duration-700" style={{ width: `${Math.min(100, (s.cache.sizeKB / (120 * 1024)) * 100)}%` }} />
            </div>
            <p className="text-[12px] text-mut mt-2">Последняя очистка: {s.cache.lastCleared}</p>
            <Btn kind="outline" size="sm" className="mt-3.5 w-full" onClick={clearCache}><I n="refresh" size={14} />Очистить кеш сейчас</Btn>
          </Panel>

          {/* ── события Wordtime ── */}
          <Panel title="События и новости Wordtime" icon="sparkle">
            <ul className="space-y-3.5">
              {[
                { t: "Wordtime 1.1: редактор блоков уже в бете", d: "2 дня назад" },
                { t: "WT-Совместимость прошла 10 000 плагинов", d: "5 дней назад" },
                { t: "Вебинар: переезд с WordPress за вечер", d: "18 февраля, 19:00 МСК" },
              ].map(n => (
                <li key={n.t} className="group cursor-pointer">
                  <p className="text-[13.5px] font-bold text-ink-900 leading-snug group-hover:text-teal-deep transition-colors">{n.t}</p>
                  <p className="text-[12px] text-mut mt-0.5">{n.d}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
