import React, { useEffect, useRef, useState } from "react";
import { I, IconName, WTMark } from "../components/icons";
import { fmtKB, plural } from "../lib/data";
import { useStore } from "../lib/store";

/* ── структура меню (как в WordPress, по-русски) ─────────────────── */

interface NavLeaf { label: string; route: string; }
interface NavGroup { label: string; icon: IconName; route?: string; children?: NavLeaf[]; }

export const NAV: NavGroup[] = [
  { label: "Консоль", icon: "dashboard", children: [{ label: "Главная", route: "dashboard" }, { label: "Обновления", route: "updates" }] },
  { label: "Записи", icon: "pin", children: [{ label: "Все записи", route: "posts" }, { label: "Добавить новую", route: "post-new" }, { label: "Рубрики", route: "categories" }] },
  { label: "Медиафайлы", icon: "image", children: [{ label: "Библиотека", route: "media" }, { label: "Добавить новый", route: "media-upload" }] },
  { label: "Страницы", icon: "pages", children: [{ label: "Все страницы", route: "pages" }, { label: "Добавить новую", route: "page-new" }] },
  { label: "Комментарии", icon: "comment", route: "comments" },
  { label: "Внешний вид", icon: "brush", children: [{ label: "Темы", route: "themes" }, { label: "Меню", route: "menus" }, { label: "Редактор темы", route: "theme-editor" }] },
  { label: "Плагины", icon: "plug", children: [{ label: "Установленные", route: "plugins" }, { label: "Добавить новый", route: "plugins-new" }] },
  { label: "Пользователи", icon: "users", children: [{ label: "Все пользователи", route: "users" }, { label: "Добавить нового", route: "user-new" }] },
  { label: "Инструменты", icon: "wrench", children: [{ label: "Здоровье системы", route: "health" }, { label: "Импорт", route: "settings:backups" }, { label: "Экспорт", route: "settings:backups" }, { label: "Миграция сайта", route: "settings:backups" }] },
  { label: "Оптимизация", icon: "rocket", children: [{ label: "Скорость и кеш", route: "perf:speed" }, { label: "Изображения", route: "perf:images" }, { label: "Sitemap", route: "perf:sitemap" }, { label: "SEO-заголовки", route: "perf:seo" }, { label: "Мобильные приложения и API", route: "perf:api" }] },
  { label: "Настройки", icon: "gear", children: [
    { label: "Общие", route: "settings:general" }, { label: "Обсуждение", route: "settings:discussion" },
    { label: "Кеш и скорость", route: "settings:cache" }, { label: "Безопасность", route: "settings:security" },
    { label: "Резервные копии", route: "settings:backups" }, { label: "Страница входа", route: "settings:login" },
  ] },
];

export function routeTitle(route: string): string {
  if (route === "dashboard") return "Консоль";
  if (route === "updates") return "Обновления";
  if (route === "health") return "Здоровье системы";
  if (route.startsWith("perf")) return "Оптимизация";
  if (route.startsWith("post")) return "Записи";
  if (route.startsWith("page")) return "Страницы";
  if (route.startsWith("media")) return "Медиафайлы";
  if (route === "comments") return "Комментарии";
  if (route === "themes" || route === "menus" || route === "theme-editor") return "Внешний вид";
  if (route.startsWith("plugins")) return "Плагины";
  if (route.startsWith("user")) return "Пользователи";
  if (route === "categories") return "Рубрики";
  if (route.startsWith("settings")) return "Настройки";
  return "Консоль";
}

/* ── пункт меню ── */
function SideItem({ g, route, collapsed, onNav }: { g: NavGroup; route: string; collapsed: boolean; onNav: (r: string) => void }) {
  const leafs = g.children ?? [{ label: g.label, route: g.route! }];
  const activeGroup = leafs.some(l => route === l.route || (l.route.startsWith("post") && route.startsWith("post")) || (l.route.startsWith("settings") && route.startsWith("settings")));
  const [open, setOpen] = useState(activeGroup);
  useEffect(() => { if (activeGroup) setOpen(true); }, [activeGroup]);

  return (
    <div className="relative group/si">
      <button
        onClick={() => { if (!g.children) onNav(g.route!); else { setOpen(o => !o); onNav(leafs[0].route); } }}
        title={collapsed ? g.label : undefined}
        className={`w-full flex items-center gap-3 px-3.5 h-10.5 text-[13.5px] font-semibold transition-all cursor-pointer
          ${activeGroup ? "text-white bg-ink-700/60" : "text-[#a8c3c9] hover:text-white hover:bg-ink-800/70 hover:translate-x-0.5"}`}
      >
        <span className={`shrink-0 transition-colors ${activeGroup ? "text-teal-brand" : ""}`}><I n={g.icon} size={19} /></span>
        {!collapsed && <span className="flex-1 text-left truncate">{g.label}</span>}
        {!collapsed && g.children && <I n="chevD" size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />}
        {collapsed && (
          <span className="hidden group-hover/si:flex absolute left-full top-0 ml-2 z-50 items-center bg-ink-800 text-white text-[12.5px] font-bold px-3 h-10.5 rounded-lg shadow-pop whitespace-nowrap pointer-events-none">
            {g.label}
          </span>
        )}
      </button>
      {activeGroup && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-amber-brand" />}
      {!collapsed && g.children && (
        <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden">
            <div className="py-1.5 pl-[26px] border-l border-ink-700/60 ml-[26px] space-y-0.5">
              {leafs.map(l => (
                <button key={l.route + l.label} onClick={() => onNav(l.route)}
                  className={`block w-full text-left px-3 py-1.5 rounded-md text-[13px] transition-all cursor-pointer
                    ${route === l.route ? "text-amber-brand font-bold bg-ink-800/80" : "text-[#8fb0b7] hover:text-white hover:translate-x-1"}`}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── оболочка ── */
export default function Shell({ children, route, onNav }: { children: React.ReactNode; route: string; onNav: (r: string) => void }) {
  const { state, authed, logout, clearCache, toast, setSiteOpen, openPost, nav } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [createMenu, setCreateMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);

  const pendingComments = state.comments.filter(c => c.status === "pending").length;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenu(false);
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateMenu(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => setMobileOpen(false), [route]);

  const sidebar = (
    <div className={`h-full flex flex-col bg-ink-900 dark-scroll transition-all duration-300 ${collapsed ? "w-[62px]" : "w-[232px]"}`}>
      <div className={`flex items-center gap-2.5 h-[52px] px-4 border-b border-ink-800 ${collapsed ? "justify-center px-0" : ""}`}>
        <WTMark size={30} />
        {!collapsed && (
          <div className="leading-none">
            <p className="font-display font-extrabold text-[15px] text-white tracking-tight">Wordtime</p>
            <p className="text-[9.5px] font-bold tracking-[0.18em] text-teal-brand/80 uppercase mt-1">панель управления</p>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto dark-scroll py-3 space-y-0.5">
        {NAV.map(g => <SideItem key={g.label} g={g} route={route} collapsed={collapsed} onNav={onNav} />)}
      </nav>
      <button onClick={() => setCollapsed(c => !c)}
        className="flex items-center gap-3 px-4 h-11 border-t border-ink-800 text-[#8fb0b7] hover:text-white hover:bg-ink-800/70 transition-colors text-[12.5px] font-bold cursor-pointer">
        <I n={collapsed ? "expand" : "collapse"} size={17} />
        {!collapsed && "Свернуть меню"}
      </button>
    </div>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ── верхняя админ-панель ── */}
      <header className="h-[46px] shrink-0 bg-ink-950 text-[#c3d6da] flex items-center gap-1 px-3 z-40 shadow-[0_2px_10px_rgba(7,27,33,0.3)]">
        <button className="md:hidden w-9 h-9 grid place-items-center hover:text-white cursor-pointer" onClick={() => setMobileOpen(true)}><I n="menu" size={20} /></button>
        <button onClick={() => onNav("dashboard")} className="flex items-center gap-2 px-2 h-9 rounded-lg hover:bg-ink-800 hover:text-white transition-colors cursor-pointer">
          <WTMark size={22} /><span className="font-display font-bold text-[13px] text-white hidden sm:inline">Wordtime</span>
        </button>
        <button onClick={() => setSiteOpen(true)} className="flex items-center gap-2 px-3 h-9 rounded-lg hover:bg-ink-800 hover:text-white transition-colors text-[13px] font-semibold cursor-pointer">
          <I n="home" size={16} /><span className="hidden lg:inline">{state.settings.siteTitle}</span>
        </button>
        <button onClick={() => onNav("comments")} className="relative flex items-center gap-2 px-3 h-9 rounded-lg hover:bg-ink-800 hover:text-white transition-colors text-[13px] font-semibold cursor-pointer">
          <I n="comment" size={16} />
          <span className="hidden lg:inline">Комментарии</span>
          {pendingComments > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-brand text-ink-950 text-[10.5px] font-extrabold grid place-items-center">{pendingComments}</span>}
        </button>

        <div className="flex-1" />

        <button onClick={clearCache} title="Очистить кеш сайта"
          className="flex items-center gap-2 px-3 h-9 rounded-lg hover:bg-ink-800 hover:text-teal-brand transition-colors text-[12.5px] font-bold cursor-pointer">
          <I n="zap" size={15} />
          <span className="hidden xl:inline tabular">Кеш {fmtKB(state.cache.sizeKB)}</span>
          <span className="xl:hidden tabular">{fmtKB(state.cache.sizeKB)}</span>
        </button>

        <div className="relative" ref={createRef}>
          <button onClick={() => setCreateMenu(v => !v)} className="flex items-center gap-1.5 px-3 h-9 rounded-lg hover:bg-ink-800 hover:text-white transition-colors text-[13px] font-bold cursor-pointer">
            <I n="plus" size={16} sw={2.2} /> Создать
          </button>
          {createMenu && (
            <div className="absolute right-0 top-11 w-52 bg-card text-ink-900 rounded-xl shadow-pop border border-line py-1.5 anim-scale-in z-50">
              {[
                { l: "Запись", i: "pin" as IconName, fn: () => openPost() },
                { l: "Страницу", i: "pages" as IconName, fn: () => onNav("page-new") },
                { l: "Пользователя", i: "users" as IconName, fn: () => onNav("user-new") },
                { l: "Резервную копию", i: "cloud" as IconName, fn: () => onNav("settings:backups") },
              ].map(it => (
                <button key={it.l} onClick={() => { it.fn(); setCreateMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-semibold hover:bg-teal-soft/60 transition-colors cursor-pointer">
                  <I n={it.i} size={16} className="text-mut" />{it.l}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={menuRef}>
          <button onClick={() => setUserMenu(v => !v)} className="flex items-center gap-2.5 pl-1.5 pr-2 h-9 rounded-lg hover:bg-ink-800 transition-colors cursor-pointer">
            <span className="w-7 h-7 rounded-full grid place-items-center text-[12px] font-extrabold text-white" style={{ background: authed?.color ?? "#0e9384" }}>
              {(authed?.name ?? "А").slice(0, 1)}
            </span>
            <span className="hidden sm:inline text-[13px] font-bold text-white">{authed?.name.split(" ")[0]}</span>
            <I n="chevD" size={12} />
          </button>
          {userMenu && (
            <div className="absolute right-0 top-11 w-56 bg-card text-ink-900 rounded-xl shadow-pop border border-line py-1.5 anim-scale-in z-50">
              <div className="px-4 py-2.5 border-b border-line">
                <p className="text-[13.5px] font-bold">{authed?.name}</p>
                <p className="text-[12px] text-mut">{authed?.email}</p>
              </div>
              <button onClick={() => { nav("users"); setUserMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-semibold hover:bg-teal-soft/60 transition-colors cursor-pointer">
                <I n="users" size={16} className="text-mut" />Мой профиль
              </button>
              <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-semibold text-danger hover:bg-danger/8 transition-colors cursor-pointer">
                <I n="logout" size={16} />Выйти
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── корпус ── */}
      <div className="flex-1 flex min-h-0">
        <aside className="hidden md:block shrink-0">{sidebar}</aside>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-ink-950/70 anim-fade" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 anim-fade-up">{sidebar}</div>
          </div>
        )}
        <main className="flex-1 min-w-0 overflow-y-auto bg-paper">
          <div className="px-4 md:px-7 py-6 max-w-[1240px] mx-auto">
            <p className="text-[11.5px] font-bold tracking-[0.16em] uppercase text-mut/80 mb-1">Wordtime · {routeTitle(route)}</p>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
