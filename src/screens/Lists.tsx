import React, { useRef, useState } from "react";
import { I } from "../components/icons";
import { Badge, Btn, Empty, Modal, SmartImg, inputCls, selectCls } from "../components/ui";
import { Comment, fmtKB, ruDate, todayISO, uid } from "../lib/data";
import { useStore } from "../lib/store";

/* ── Страницы ── */
export function PagesScreen() {
  const { state, mutate, toast } = useStore();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const add = () => {
    if (title.trim().length < 2) { toast("warn", "Укажите название страницы"); return; }
    mutate(s => { s.pages.unshift({ id: "pg" + uid(), title: title.trim(), status: "draft", date: todayISO() }); s.activity.unshift({ id: uid(), text: `Создана страница «${title.trim()}»`, time: "только что", icon: "pages" }); });
    toast("ok", "Страница создана", "Черновик добавлен в список.");
    setTitle(""); setAdding(false);
  };

  return (
    <div className="anim-fade-up max-w-4xl">
      <div className="flex items-center gap-3 mb-5">
        <h1 className="font-display font-extrabold text-[24px] text-ink-900 tracking-tight mr-auto">Страницы</h1>
        <Btn onClick={() => setAdding(true)}><I n="plus" size={15} sw={2.4} />Добавить страницу</Btn>
      </div>
      <div className="bg-card border border-line rounded-xl shadow-panel overflow-hidden">
        {state.pages.map(p => (
          <div key={p.id} className="flex items-center gap-4 px-5 py-4 border-b border-line last:border-0 group hover:bg-teal-soft/25 transition-colors">
            <span className="w-9 h-9 rounded-lg bg-ink-900/6 text-ink-600 grid place-items-center shrink-0"><I n="pages" size={17} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[14.5px] text-ink-900">{p.title}</p>
              <p className="text-[12.5px] text-mut mt-0.5">wordtime.ru/{p.title.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-|-$/g, "") || "stranica"}</p>
            </div>
            <span className="text-[12.5px] text-mut hidden sm:block">{ruDate(p.date)}</span>
            {p.status === "published" ? <Badge tone="ok">ОПУБЛИКОВАНА</Badge> : <Badge tone="warn">ЧЕРНОВИК</Badge>}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { mutate(s => { const pg = s.pages.find(x => x.id === p.id); if (pg) pg.status = pg.status === "published" ? "draft" : "published"; }); toast("ok", p.status === "published" ? "Страница скрыта" : "Страница опубликована"); }}
                className="w-8 h-8 grid place-items-center rounded-lg text-mut hover:text-teal-deep hover:bg-teal-soft transition-colors cursor-pointer" title="Сменить статус"><I n="refresh" size={15} /></button>
              <button onClick={() => { mutate(s => { s.pages = s.pages.filter(x => x.id !== p.id); }); toast("ok", "Страница удалена", p.title); }}
                className="w-8 h-8 grid place-items-center rounded-lg text-mut hover:text-danger hover:bg-danger/8 transition-colors cursor-pointer" title="Удалить"><I n="trash" size={15} /></button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={adding} onClose={() => setAdding(false)} title="Новая страница" width={440}>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Название страницы" className={inputCls} />
        <div className="mt-4 flex justify-end gap-2.5">
          <Btn kind="outline" onClick={() => setAdding(false)}>Отмена</Btn>
          <Btn onClick={add}>Создать</Btn>
        </div>
      </Modal>
    </div>
  );
}

/* ── Комментарии ── */
export function CommentsScreen() {
  const { state, mutate, toast, nav } = useStore();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "spam">("all");
  const disabled = state.settings.commentsDisabled;

  const list = state.comments.filter(c => filter === "all" || c.status === filter);
  const counts = {
    all: state.comments.length,
    pending: state.comments.filter(c => c.status === "pending").length,
    approved: state.comments.filter(c => c.status === "approved").length,
    spam: state.comments.filter(c => c.status === "spam").length,
  };

  const set = (id: string, status: Comment["status"]) => {
    mutate(s => { const c = s.comments.find(x => x.id === id); if (c) c.status = status; });
    toast("ok", status === "approved" ? "Комментарий одобрен" : status === "spam" ? "Помечен как спам" : "Комментарий снят с публикации");
  };

  const postTitle = (id: string) => state.posts.find(p => p.id === id)?.title ?? "Запись удалена";

  return (
    <div className="anim-fade-up">
      <h1 className="font-display font-extrabold text-[24px] text-ink-900 tracking-tight mb-5">Комментарии</h1>

      {disabled && (
        <div className="mb-5 flex flex-wrap items-center gap-3 px-5 py-4 rounded-xl border border-warn/25 bg-warn/8 anim-fade">
          <span className="w-9 h-9 rounded-lg bg-warn/15 text-warn grid place-items-center shrink-0"><I n="comment" size={17} /></span>
          <p className="text-[13.5px] font-bold text-ink-900 flex-1 min-w-[220px]">
            Комментарии отключены на всём сайте. <span className="font-semibold text-mut">Форма комментирования скрыта, новые комментарии не принимаются.</span>
          </p>
          <Btn size="sm" kind="amber" onClick={() => nav("settings:discussion")}>Включить в настройках</Btn>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {([["all", "Все"], ["pending", "Ожидают"], ["approved", "Одобренные"], ["spam", "Спам"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3.5 h-8.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer border
              ${filter === k ? "bg-ink-900 text-white border-ink-900" : "bg-card text-mut border-line hover:border-ink-600/40 hover:text-ink-900"}`}>
            {l} <span className="opacity-60 tabular">· {counts[k]}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.length === 0 && <div className="bg-card border border-line rounded-xl"><Empty icon="comment" title="Здесь пусто" text="Комментариев с таким статусом нет." /></div>}
        {list.map(c => (
          <article key={c.id} className={`bg-card border rounded-xl p-5 transition-all anim-fade-up ${c.status === "pending" ? "border-amber-brand/40 shadow-[0_0_0_3px_rgba(242,176,61,0.08)]" : "border-line"} ${c.status === "spam" ? "opacity-70" : ""}`}>
            <div className="flex items-start gap-4">
              <span className="w-10 h-10 rounded-full grid place-items-center font-display font-bold text-[14px] text-white shrink-0"
                style={{ background: ["#0e9384", "#d99417", "#2c6b7a", "#a4286a"][c.author.length % 4] }}>{c.author[0]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-bold text-[14px] text-ink-900">{c.author}</p>
                  <span className="text-[12.5px] text-mut">{c.email}</span>
                  <span className="text-[12.5px] text-mut">· {ruDate(c.date)}</span>
                  {c.status === "pending" && <Badge tone="warn">ЖДЁТ ПРОВЕРКИ</Badge>}
                  {c.status === "spam" && <Badge tone="danger">СПАМ</Badge>}
                </div>
                <p className="text-[14px] text-ink-800 mt-2 leading-relaxed">{c.text}</p>
                <p className="text-[12px] text-mut mt-2">к записи: <b className="text-teal-deep">{postTitle(c.postId)}</b></p>
                {!disabled && (
                  <div className="flex flex-wrap gap-2 mt-3.5">
                    {c.status !== "approved" && <Btn size="sm" kind="outline" onClick={() => set(c.id, "approved")}><I n="check" size={13} sw={2.4} />Одобрить</Btn>}
                    {c.status === "approved" && <Btn size="sm" kind="ghost" onClick={() => set(c.id, "pending")}>Снять с публикации</Btn>}
                    {c.status !== "spam" && <Btn size="sm" kind="ghost" className="text-warn! hover:bg-warn/10!" onClick={() => set(c.id, "spam")}>В спам</Btn>}
                    <Btn size="sm" kind="ghost" className="text-danger! hover:bg-danger/8!" onClick={() => { mutate(s => { s.comments = s.comments.filter(x => x.id !== c.id); }); toast("ok", "Комментарий удалён"); }}><I n="trash" size={13} />Удалить</Btn>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ── Медиафайлы ── */
export function MediaScreen() {
  const { state, mutate, toast } = useStore();
  const [sel, setSel] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const item = state.media.find(m => m.id === sel);

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const names = Array.from(files).map(f => f.name);
    mutate(s => {
      Array.from(files).forEach(f => {
        const isImg = f.type.startsWith("image/");
        s.media.unshift({ id: "m" + uid(), name: f.name, url: "", kind: isImg ? "image" : "gradient", size: fmtKB(Math.max(12, f.size / 1024)), dims: isImg ? "1200 × 800" : "—", date: todayISO(), hue: Math.floor(Math.random() * 360) });
      });
      s.activity.unshift({ id: uid(), text: `Загружено файлов: ${files.length}`, time: "только что", icon: "image" });
    });
    toast("ok", names.length === 1 ? `«${names[0]}» загружен` : `Загружено файлов: ${names.length}`, "Файлы добавлены в библиотеку.");
  };

  return (
    <div className="anim-fade-up">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="font-display font-extrabold text-[24px] text-ink-900 tracking-tight mr-auto">Библиотека медиафайлов</h1>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={e => { onFiles(e.target.files); e.target.value = ""; }} />
        <Btn onClick={() => fileRef.current?.click()}><I n="upload" size={15} />Загрузить файлы</Btn>
      </div>

      <button onClick={() => fileRef.current?.click()}
        className="w-full mb-5 py-8 rounded-xl border-2 border-dashed border-line bg-card/60 hover:border-teal-deep/50 hover:bg-teal-soft/30 transition-all text-mut hover:text-teal-deep group cursor-pointer">
        <span className="flex flex-col items-center gap-2 text-[13.5px] font-bold">
          <span className="w-11 h-11 rounded-full bg-ink-900/6 grid place-items-center group-hover:scale-110 transition-transform"><I n="upload" size={20} /></span>
          Перетащите файлы сюда или нажмите для выбора
          <span className="text-[12px] font-semibold text-mut">JPG, PNG, WebP, SVG, PDF — до 64 МБ</span>
        </span>
      </button>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 stagger">
        {state.media.map(m => (
          <button key={m.id} onClick={() => setSel(m.id)}
            className="bg-card border border-line rounded-xl overflow-hidden text-left hover:-translate-y-1 hover:shadow-panel transition-all cursor-pointer group">
            {m.kind === "image" && m.url ? (
              <SmartImg src={m.url} alt={m.name} className="w-full h-28 object-cover group-hover:scale-[1.03] transition-transform duration-300" />
            ) : (
              <div className="w-full h-28 grid place-items-center text-white/85 font-display font-bold text-[12px]"
                style={{ background: `linear-gradient(135deg, hsl(${m.hue ?? 190} 45% 32%), hsl(${(m.hue ?? 190) + 50} 55% 46%))` }}>
                <I n={m.kind === "image" ? "image" : "folder"} size={26} />
              </div>
            )}
            <div className="px-3 py-2.5">
              <p className="text-[12.5px] font-bold text-ink-900 truncate">{m.name}</p>
              <p className="text-[11.5px] text-mut mt-0.5">{m.size} · {m.dims}</p>
            </div>
          </button>
        ))}
      </div>

      <Modal open={!!item} onClose={() => setSel(null)} title="Сведения о файле" width={560}>
        {item && (
          <div>
            {item.kind === "image" && item.url
              ? <SmartImg src={item.url} alt={item.name} className="w-full h-52 object-cover rounded-lg" />
              : <div className="w-full h-52 rounded-lg grid place-items-center text-white" style={{ background: `linear-gradient(135deg, hsl(${item.hue ?? 190} 45% 32%), hsl(${(item.hue ?? 190) + 50} 55% 46%))` }}><I n="image" size={34} /></div>}
            <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
              {[["Имя файла", item.name], ["Размер", item.size], ["Размеры", item.dims], ["Загружен", ruDate(item.date)]].map(([k, v]) => (
                <div key={k} className="bg-paper rounded-lg px-3.5 py-2.5"><dt className="text-[11.5px] font-extrabold uppercase tracking-wide text-mut">{k}</dt><dd className="font-bold text-ink-900 mt-0.5 break-all">{v}</dd></div>
              ))}
            </dl>
            <div className="mt-4 flex gap-2.5">
              {item.url && <Btn kind="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(location.origin + item.url); } catch {} toast("ok", "Ссылка скопирована"); }}><I n="copy" size={14} />Скопировать URL</Btn>}
              <Btn kind="danger" size="sm" className="ml-auto" onClick={() => { mutate(s => { s.media = s.media.filter(x => x.id !== item.id); }); setSel(null); toast("ok", "Файл удалён из библиотеки"); }}><I n="trash" size={14} />Удалить</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ── Пользователи ── */
export function UsersScreen({ autoAdd = false }: { autoAdd?: boolean }) {
  const { state, mutate, toast, authed } = useStore();
  const [adding, setAdding] = useState(autoAdd);
  const [name, setName] = useState(""); const [mail, setMail] = useState(""); const [role, setRole] = useState("Автор");

  const add = () => {
    if (name.trim().length < 2) return toast("warn", "Укажите имя пользователя");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return toast("warn", "Некорректный адрес почты");
    if (state.users.some(u => u.email.toLowerCase() === mail.toLowerCase())) return toast("warn", "Эта почта уже зарегистрирована");
    mutate(s => { s.users.push({ id: "u" + uid(), name: name.trim(), email: mail.toLowerCase(), role, date: todayISO(), color: ["#0e9384", "#d99417", "#2c6b7a", "#a4286a"][Math.floor(Math.random() * 4)] }); });
    toast("ok", "Пользователь добавлен", `${name.trim()} — ${role}. Письмо с приглашением отправлено.`);
    setName(""); setMail(""); setAdding(false);
  };

  return (
    <div className="anim-fade-up">
      <div className="flex items-center gap-3 mb-5">
        <h1 className="font-display font-extrabold text-[24px] text-ink-900 tracking-tight mr-auto">Пользователи</h1>
        <Btn onClick={() => setAdding(true)}><I n="plus" size={15} sw={2.4} />Добавить пользователя</Btn>
      </div>
      <div className="bg-card border border-line rounded-xl shadow-panel overflow-hidden">
        {state.users.map(u => (
          <div key={u.id} className="flex items-center gap-4 px-5 py-4 border-b border-line last:border-0 group hover:bg-teal-soft/25 transition-colors">
            <span className="w-10 h-10 rounded-full grid place-items-center font-display font-bold text-[15px] text-white shrink-0" style={{ background: u.color }}>{u.name[0]}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[14px] text-ink-900">{u.name} {u.id === authed?.id && <Badge tone="teal">ЭТО ВЫ</Badge>}</p>
              <p className="text-[12.5px] text-mut">{u.email} · с {ruDate(u.date)}</p>
            </div>
            <select value={u.role} disabled={u.id === authed?.id}
              onChange={e => { mutate(s => { const x = s.users.find(y => y.id === u.id); if (x) x.role = e.target.value; }); toast("ok", "Роль обновлена", `${u.name}: ${e.target.value}`); }}
              className={selectCls + " w-44! h-9! text-[13px]"}>
              {["Администратор", "Редактор", "Автор", "Участник", "Подписчик"].map(r => <option key={r}>{r}</option>)}
            </select>
            <span className="hidden sm:flex items-center gap-1.5 text-[12px] font-bold text-ok"><span className="w-1.5 h-1.5 rounded-full bg-ok" style={{ animation: "wt-pulse-dot 2s infinite" }} />2FA</span>
            {u.id !== authed?.id && (
              <button onClick={() => { mutate(s => { s.users = s.users.filter(x => x.id !== u.id); }); toast("ok", "Пользователь удалён", u.name); }}
                className="opacity-0 group-hover:opacity-100 w-8 h-8 grid place-items-center rounded-lg text-mut hover:text-danger hover:bg-danger/8 transition-all cursor-pointer"><I n="trash" size={15} /></button>
            )}
          </div>
        ))}
      </div>
      <Modal open={adding} onClose={() => setAdding(false)} title="Новый пользователь" width={440}>
        <div className="space-y-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Имя и фамилия" className={inputCls} />
          <input value={mail} onChange={e => setMail(e.target.value)} placeholder="pochta@example.ru" className={inputCls} />
          <select value={role} onChange={e => setRole(e.target.value)} className={selectCls}>
            {["Администратор", "Редактор", "Автор", "Участник", "Подписчик"].map(r => <option key={r}>{r}</option>)}
          </select>
          <p className="text-[12.5px] text-mut">Пользователь получит письмо с приглашением. Вход возможен только после подтверждения и кода 2FA.</p>
          <div className="flex justify-end gap-2.5"><Btn kind="outline" onClick={() => setAdding(false)}>Отмена</Btn><Btn onClick={add}>Добавить</Btn></div>
        </div>
      </Modal>
    </div>
  );
}

/* ── Обновления ── */
export function UpdatesScreen() {
  const { state, toast } = useStore();
  const rows = [
    { n: "Ядро Wordtime", v: state.version, s: "актуально" },
    { n: "Слой совместимости WT-Compat", v: state.version, s: "актуально" },
    { n: "WT-Кеш", v: state.version, s: "актуально" },
    { n: "Тема «" + (state.themes.find(t => t.active)?.name ?? "") + "»", v: "2.3.1", s: "актуально" },
    { n: "Словарь русской локализации", v: "2026.02", s: "актуально" },
  ];
  return (
    <div className="anim-fade-up max-w-3xl">
      <h1 className="font-display font-extrabold text-[24px] text-ink-900 tracking-tight mb-5">Обновления</h1>
      <div className="bg-card border border-line rounded-xl shadow-panel p-6 flex items-start gap-4">
        <span className="w-11 h-11 rounded-xl bg-ok/12 text-ok grid place-items-center shrink-0"><I n="check" size={22} sw={2.4} /></span>
        <div>
          <p className="font-display font-bold text-[17px] text-ink-900">У вас свежая версия Wordtime</p>
          <p className="text-[13.5px] text-mut mt-1">Ядро, слой совместимости и тема обновлены. Проверка выполняется автоматически каждые 12 часов.</p>
        </div>
      </div>
      <div className="mt-5 bg-card border border-line rounded-xl shadow-panel overflow-hidden">
        {rows.map(r => (
          <div key={r.n} className="flex items-center gap-3 px-5 py-3.5 border-b border-line last:border-0 text-[13.5px]">
            <span className="font-bold text-ink-900 flex-1">{r.n}</span>
            <span className="text-mut tabular">{r.v}</span>
            <Badge tone="ok">АКТУАЛЬНО</Badge>
          </div>
        ))}
      </div>
      <Btn kind="outline" className="mt-5" onClick={() => toast("info", "Проверено", "Новых обновлений не найдено.")}><I n="refresh" size={15} />Проверить снова</Btn>
    </div>
  );
}

/* ── Меню сайта ── */
export function MenusScreen() {
  const { state, mutate, toast } = useStore();
  const [items, setItems] = useState<string[]>(["Главная", "Блог", "О проекте", "Контакты"]);
  const [name, setName] = useState("");
  return (
    <div className="anim-fade-up max-w-3xl">
      <h1 className="font-display font-extrabold text-[24px] text-ink-900 tracking-tight mb-5">Меню сайта</h1>
      <div className="grid md:grid-cols-[1.4fr_1fr] gap-6 items-start">
        <section className="bg-card border border-line rounded-xl shadow-panel overflow-hidden">
          <div className="px-5 py-3.5 border-b border-line text-[12px] font-extrabold uppercase tracking-[0.12em] text-mut">Основное меню · {items.length} пунктов</div>
          {items.map((it, i) => (
            <div key={it + i} className="flex items-center gap-3 px-5 py-3 border-b border-line last:border-0 group">
              <span className="text-mut"><I n="menu" size={15} /></span>
              <span className="font-bold text-[14px] text-ink-900 flex-1">{it}</span>
              <div className="flex gap-1">
                <button disabled={i === 0} onClick={() => setItems(a => { const n = [...a]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })} className="w-7 h-7 grid place-items-center rounded text-mut hover:text-teal-deep disabled:opacity-25 cursor-pointer rotate-90"><I n="chevD" size={13} /></button>
                <button disabled={i === items.length - 1} onClick={() => setItems(a => { const n = [...a]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n; })} className="w-7 h-7 grid place-items-center rounded text-mut hover:text-teal-deep disabled:opacity-25 cursor-pointer -rotate-90"><I n="chevD" size={13} /></button>
                <button onClick={() => setItems(a => a.filter((_, k) => k !== i))} className="w-7 h-7 grid place-items-center rounded text-mut hover:text-danger cursor-pointer"><I n="x" size={13} /></button>
              </div>
            </div>
          ))}
          <div className="px-5 py-3.5"><Btn size="sm" onClick={() => toast("ok", "Меню сохранено", "Изменения применены к сайту.")}>Сохранить меню</Btn></div>
        </section>
        <section className="bg-card border border-line rounded-xl shadow-panel p-5">
          <h3 className="text-[13.5px] font-extrabold text-ink-900 mb-3">Добавить пункт</h3>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Название пункта" className={inputCls} />
          <Btn size="sm" className="mt-3" onClick={() => { if (name.trim().length < 2) return toast("warn", "Укажите название"); setItems(a => [...a, name.trim()]); setName(""); toast("ok", "Пункт добавлен", "Не забудьте сохранить меню."); }}><I n="plus" size={14} sw={2.4} />Добавить в меню</Btn>
          <p className="text-[12.5px] text-mut mt-4 leading-relaxed">Также можно добавить в меню любую страницу или рубрику из списка слева.</p>
        </section>
      </div>
    </div>
  );
}

/* ── Редактор темы ── */
export function ThemeEditorScreen() {
  const { state, toast } = useStore();
  const [file, setFile] = useState("style.css");
  const [css, setCss] = useState(":root {\n  --site-accent: #0e9384;\n  --site-font: 'Golos Text', sans-serif;\n}\n\n.site-header {\n  background: var(--ink-900);\n}\n\na:hover {\n  color: var(--site-accent);\n}");
  const files = ["style.css", "functions.php", "header.php", "footer.php", "index.php"];
  return (
    <div className="anim-fade-up">
      <h1 className="font-display font-extrabold text-[24px] text-ink-900 tracking-tight mb-1.5">Редактор темы</h1>
      <p className="text-[13.5px] text-mut mb-5">Тема: <b className="text-teal-deep">{state.themes.find(t => t.active)?.name}</b> · редактируйте осторожно — изменения применяются сразу.</p>
      <div className="grid lg:grid-cols-[220px_1fr] gap-5 items-start">
        <div className="bg-card border border-line rounded-xl shadow-panel overflow-hidden">
          {files.map(f => (
            <button key={f} onClick={() => setFile(f)} className={`w-full text-left px-4 py-3 text-[13px] font-bold border-b border-line last:border-0 transition-colors cursor-pointer ${file === f ? "bg-ink-900 text-teal-brand" : "text-ink-800 hover:bg-paper"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="bg-ink-950 rounded-xl overflow-hidden shadow-panel">
          <div className="flex items-center justify-between px-4 h-10 border-b border-ink-800">
            <span className="text-[12.5px] font-bold text-paper/70">{file}</span>
            <span className="flex gap-1.5">{["#ff6159", "#ffbd2e", "#28c840"].map(c => <span key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />)}</span>
          </div>
          <textarea value={css} onChange={e => setCss(e.target.value)} rows={14} spellCheck={false}
            className="w-full bg-transparent text-[13px] leading-relaxed text-teal-brand/90 font-mono p-4 outline-none resize-y" />
          <div className="px-4 py-3 border-t border-ink-800 flex justify-end">
            <Btn size="sm" kind="amber" onClick={() => toast("ok", "Файл сохранён", `${file} обновлён в теме.`)}>Сохранить файл</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
