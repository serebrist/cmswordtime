import React, { useMemo, useState } from "react";
import { I } from "../components/icons";
import { Badge, Btn, Empty, Field, Modal, SmartImg, inputCls, selectCls } from "../components/ui";
import { Post, fmtKB, plural, ruDate, todayISO, uid } from "../lib/data";
import { useStore } from "../lib/store";

/* ── список записей ── */
export function PostsList() {
  const { state, nav, mutate, toast, openPost } = useStore();
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const list = useMemo(() => state.posts.filter(p =>
    (filter === "all" || p.status === filter) &&
    (q.trim() === "" || (p.title + p.content + p.category).toLowerCase().includes(q.toLowerCase()))
  ), [state.posts, filter, q]);

  const counts = {
    all: state.posts.length,
    published: state.posts.filter(p => p.status === "published").length,
    draft: state.posts.filter(p => p.status === "draft").length,
  };

  const remove = (ids: string[]) => {
    mutate(s => { s.posts = s.posts.filter(p => !ids.includes(p.id)); s.comments = s.comments.filter(c => !ids.includes(c.postId)); });
    toast("ok", ids.length === 1 ? "Запись удалена" : `Удалено записей: ${ids.length}`, "Записи перемещены в корзину и стёрты безвозвратно.");
    setSelected([]);
  };

  const toggle = (id: string) => setSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);

  return (
    <div className="anim-fade-up">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="font-display font-extrabold text-[24px] text-ink-900 tracking-tight mr-auto">Записи</h1>
        <Btn onClick={() => openPost()}><I n="plus" size={15} sw={2.4} />Добавить запись</Btn>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {([["all", "Все"], ["published", "Опубликованные"], ["draft", "Черновики"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3.5 h-8.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer border
              ${filter === k ? "bg-deep-2 text-white border-deep-2" : "bg-card text-mut border-line hover:border-ink-600/40 hover:text-ink-900"}`}>
            {l} <span className="opacity-60 tabular">· {counts[k]}</span>
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <I n="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mut" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск по записям…" className={inputCls + " pl-9! h-9.5!"} />
        </div>
      </div>

      {selected.length > 0 && (
        <div className="mb-3 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-deep-2 text-paper anim-fade">
          <span className="text-[13px] font-bold">Выбрано: {selected.length}</span>
          <button onClick={() => remove(selected)} className="ml-auto flex items-center gap-1.5 text-[13px] font-bold text-amber-brand hover:text-white transition-colors cursor-pointer">
            <I n="trash" size={14} />Удалить
          </button>
          <button onClick={() => setSelected([])} className="text-paper/60 hover:text-white cursor-pointer"><I n="x" size={14} /></button>
        </div>
      )}

      <div className="bg-card border border-line rounded-xl shadow-panel overflow-hidden">
        {list.length === 0 ? (
          <Empty icon="pin" title={q ? "Ничего не нашлось" : "Записей пока нет"} text={q ? `По запросу «${q}» совпадений нет.` : "Создайте первую запись — она появится здесь и на сайте."} />
        ) : (
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-[0.1em] text-mut border-b border-line bg-canvas/60">
                <th className="w-10 px-4 py-3"><input type="checkbox" checked={selected.length === list.length && list.length > 0} onChange={() => setSelected(selected.length === list.length ? [] : list.map(p => p.id))} /></th>
                <th className="px-2 py-3 font-extrabold">Запись</th>
                <th className="px-2 py-3 font-extrabold hidden md:table-cell">Автор</th>
                <th className="px-2 py-3 font-extrabold hidden lg:table-cell">Рубрика</th>
                <th className="px-2 py-3 font-extrabold hidden xl:table-cell">Комм.</th>
                <th className="px-2 py-3 font-extrabold">Дата</th>
                <th className="px-4 py-3 font-extrabold text-right">Статус</th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => {
                const cCount = state.comments.filter(c => c.postId === p.id && c.status === "approved").length;
                return (
                  <tr key={p.id} className="border-b border-line last:border-0 hover:bg-teal-soft/25 transition-colors group">
                    <td className="px-4 py-3.5"><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} /></td>
                    <td className="px-2 py-3.5">
                      <button onClick={() => nav(`post-edit:${p.id}`)} className="font-bold text-ink-900 hover:text-teal-deep transition-colors cursor-pointer text-left">
                        {p.title}
                      </button>
                      <div className="flex gap-3 mt-1 text-[12px] font-bold text-mut opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => nav(`post-edit:${p.id}`)} className="hover:text-teal-deep cursor-pointer">Изменить</button>
                        <button onClick={() => nav(`post-edit:${p.id}`)} className="hover:text-teal-deep cursor-pointer">Редактор</button>
                        <button onClick={() => remove([p.id])} className="hover:text-danger cursor-pointer">Удалить</button>
                      </div>
                    </td>
                    <td className="px-2 py-3.5 text-mut hidden md:table-cell">{p.author}</td>
                    <td className="px-2 py-3.5 hidden lg:table-cell"><Badge tone="teal">{p.category}</Badge></td>
                    <td className="px-2 py-3.5 tabular text-mut hidden xl:table-cell">
                      <span className="inline-flex items-center gap-1.5"><I n="comment" size={13} />{cCount}</span>
                    </td>
                    <td className="px-2 py-3.5 text-mut whitespace-nowrap">{ruDate(p.date)}</td>
                    <td className="px-4 py-3.5 text-right">
                      {p.status === "published" ? <Badge tone="ok">ОПУБЛИКОВАНО</Badge> : <Badge tone="warn">ЧЕРНОВИК</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ── редактор записи ── */
export function PostEditor({ postId }: { postId?: string }) {
  const { state, nav, mutate, toast } = useStore();
  const existing = state.posts.find(p => p.id === postId);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [content, setContent] = useState(existing?.content ?? "");
  const [category, setCategory] = useState(existing?.category ?? state.categories[0]);
  const [tags, setTags] = useState(existing?.tags.join(", ") ?? "");
  const [image, setImage] = useState(existing?.image);
  const [status, setStatus] = useState<Post["status"]>(existing?.status ?? "draft");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  const save = (st: Post["status"]) => {
    if (title.trim().length < 3) { toast("warn", "Нужен заголовок", "Запись без названия теряется в ленте — добавьте хотя бы 3 символа."); return; }
    const data: Post = {
      id: existing?.id ?? "p" + uid(),
      title: title.trim(), content, category,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      status: st, date: existing?.date ?? todayISO(), author: existing?.author ?? "Администратор",
      image, views: existing?.views ?? 0,
    };
    mutate(s => {
      const i = s.posts.findIndex(p => p.id === data.id);
      if (i >= 0) s.posts[i] = data; else s.posts.unshift(data);
      s.activity.unshift({ id: uid(), text: `${st === "published" ? "Опубликована" : "Сохранена"} запись «${data.title.slice(0, 40)}»`, time: "только что", icon: "pin" });
    });
    setStatus(st);
    setSavedFlash(true); window.setTimeout(() => setSavedFlash(false), 1600);
    toast("ok", st === "published" ? "Запись опубликована" : "Черновик сохранён", st === "published" ? "Запись уже видна посетителям сайта." : "Продолжить можно в любой момент.");
  };

  const remove = () => {
    if (!existing) { nav("posts"); return; }
    mutate(s => { s.posts = s.posts.filter(p => p.id !== existing.id); });
    toast("ok", "Запись удалена");
    nav("posts");
  };

  return (
    <div className="anim-fade-up">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <button onClick={() => nav("posts")} className="w-9 h-9 grid place-items-center rounded-lg border border-line bg-card text-mut hover:text-teal-deep hover:border-teal-deep/40 transition-colors cursor-pointer"><I n="arrowL" size={16} /></button>
        <h1 className="font-display font-extrabold text-[22px] text-ink-900 tracking-tight mr-auto">{existing ? "Редактирование записи" : "Новая запись"}</h1>
        {savedFlash && <span className="flex items-center gap-1.5 text-[13px] font-bold text-ok anim-fade"><I n="check" size={14} sw={2.4} />Сохранено</span>}
        {existing && <Btn kind="ghost" size="sm" className="text-danger! hover:bg-danger/8!" onClick={remove}><I n="trash" size={14} />Удалить</Btn>}
        <Btn kind="outline" onClick={() => save("draft")}>В черновики</Btn>
        <Btn onClick={() => save("published")}><I n="send" size={14} />{existing?.status === "published" ? "Обновить" : "Опубликовать"}</Btn>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        <div className="bg-card border border-line rounded-xl shadow-panel overflow-hidden">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Введите заголовок…"
            className="w-full px-6 pt-6 pb-3 font-display font-bold text-[22px] text-ink-900 outline-none placeholder:text-mut/50 bg-transparent" />
          <div className="flex items-center gap-1 px-4 pb-3 border-b border-line">
            {[["B", "font-bold"], ["I", "italic"], ["U", "underline"], ["S", "line-through"]].map(([t, cls]) => (
              <button key={t} className={`w-8 h-8 grid place-items-center rounded-md text-[13px] ${cls} text-ink-700 hover:bg-canvas transition-colors cursor-pointer`}>{t}</button>
            ))}
            <span className="w-px h-5 bg-line mx-1.5" />
            {[["H2", "font-display text-[11px] font-extrabold"], ["❝", "text-[15px]"], ["•≡", "text-[15px] tracking-tighter"]].map(([t, cls], i) => (
              <button key={i} className={`w-8 h-8 grid place-items-center rounded-md ${cls} text-ink-700 hover:bg-canvas transition-colors cursor-pointer`}>{t}</button>
            ))}
            <span className="ml-auto text-[12px] text-mut tabular">{words} {plural(words, "слово", "слова", "слов")}</span>
          </div>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={18}
            placeholder="Расскажите историю. Абзацы разделяются пустой строкой…"
            className="w-full px-6 py-5 text-[14.5px] leading-[1.75] text-ink-900 outline-none resize-y bg-transparent placeholder:text-mut/50 min-h-[320px]" />
        </div>

        <div className="space-y-5">
          <section className="bg-card border border-line rounded-xl shadow-panel p-5">
            <h3 className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-mut mb-3.5">Публикация</h3>
            <div className="space-y-2.5 text-[13px]">
              <p className="flex justify-between"><span className="text-mut font-semibold">Статус</span>
                <span className={`font-bold ${status === "published" ? "text-ok" : "text-warn"}`}>{status === "published" ? "Опубликована" : "Черновик"}</span></p>
              <p className="flex justify-between"><span className="text-mut font-semibold">Дата</span><span className="font-bold text-ink-800">{ruDate(existing?.date ?? todayISO())}</span></p>
              <p className="flex justify-between"><span className="text-mut font-semibold">Просмотры</span><span className="font-bold text-ink-800 tabular">{(existing?.views ?? 0).toLocaleString("ru-RU")}</span></p>
            </div>
          </section>

          <section className="bg-card border border-line rounded-xl shadow-panel p-5">
            <h3 className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-mut mb-3.5">Рубрика</h3>
            <div className="space-y-2">
              {state.categories.map(c => (
                <label key={c} className="flex items-center gap-2.5 text-[13.5px] font-semibold text-ink-800 cursor-pointer hover:text-teal-deep transition-colors">
                  <input type="radio" name="cat" checked={category === c} onChange={() => setCategory(c)} />{c}
                </label>
              ))}
            </div>
          </section>

          <section className="bg-card border border-line rounded-xl shadow-panel p-5">
            <h3 className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-mut mb-3.5">Метки</h3>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="кеш, релиз, 2fa" className={inputCls + " h-9.5!"} />
            <p className="text-[12px] text-mut mt-2">Разделяйте метки запятыми.</p>
          </section>

          <section className="bg-card border border-line rounded-xl shadow-panel p-5">
            <h3 className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-mut mb-3.5">Обложка</h3>
            {image ? (
              <div className="relative rounded-lg overflow-hidden group">
                <SmartImg src={image} alt="Обложка" className="w-full h-28 object-cover" />
                <button onClick={() => setImage(undefined)} className="absolute inset-0 bg-deep/60 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center text-white text-[12.5px] font-bold cursor-pointer">Убрать обложку</button>
              </div>
            ) : (
              <button onClick={() => setPickerOpen(true)} className="w-full h-28 rounded-lg border-2 border-dashed border-line hover:border-teal-deep/50 text-mut hover:text-teal-deep transition-colors grid place-items-center cursor-pointer">
                <span className="text-center text-[12.5px] font-bold"><I n="image" size={20} className="mx-auto mb-1.5" />Выбрать из библиотеки</span>
              </button>
            )}
            {image && <button onClick={() => setPickerOpen(true)} className="mt-2 text-[12.5px] font-bold text-teal-deep hover:underline cursor-pointer">Заменить изображение</button>}
          </section>
        </div>
      </div>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Библиотека медиафайлов" width={640}>
        <div className="grid grid-cols-3 gap-3">
          {state.media.filter(m => m.kind === "image").map(m => (
            <button key={m.id} onClick={() => { setImage(m.url); setPickerOpen(false); toast("ok", "Обложка выбрана", m.name); }}
              className={`rounded-lg overflow-hidden border-2 transition-all cursor-pointer hover:scale-[1.02] ${image === m.url ? "border-teal-deep ring-[3px] ring-teal-deep/20" : "border-line"}`}>
              <SmartImg src={m.url} alt={m.name} className="w-full h-24 object-cover" />
              <p className="px-2 py-1.5 text-[11.5px] font-bold text-mut truncate text-left">{m.name}</p>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

/* ── рубрики ── */
export function CategoriesScreen() {
  const { state, mutate, toast } = useStore();
  const [name, setName] = useState("");
  return (
    <div className="anim-fade-up max-w-3xl">
      <h1 className="font-display font-extrabold text-[24px] text-ink-900 tracking-tight mb-5">Рубрики</h1>
      <div className="grid md:grid-cols-[1fr_1.4fr] gap-6 items-start">
        <section className="bg-card border border-line rounded-xl shadow-panel p-5">
          <h3 className="text-[13.5px] font-extrabold text-ink-900 mb-3">Добавить рубрику</h3>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Например: Интервью" className={inputCls} />
          <Btn size="sm" className="mt-3" onClick={() => {
            const n = name.trim();
            if (n.length < 2) return toast("warn", "Слишком короткое название");
            if (state.categories.some(c => c.toLowerCase() === n.toLowerCase())) return toast("warn", "Такая рубрика уже есть");
            mutate(s => { s.categories.push(n); }); setName("");
            toast("ok", "Рубрика создана", n);
          }}><I n="plus" size={14} sw={2.4} />Добавить</Btn>
        </section>
        <section className="bg-card border border-line rounded-xl shadow-panel overflow-hidden">
          {state.categories.map(c => {
            const count = state.posts.filter(p => p.category === c).length;
            return (
              <div key={c} className="flex items-center gap-3 px-5 py-3.5 border-b border-line last:border-0 group">
                <span className="text-teal-deep"><I n="folder" size={17} /></span>
                <span className="font-bold text-[14px] text-ink-900">{c}</span>
                <span className="text-[12.5px] text-mut ml-auto tabular">{count} {plural(count, "запись", "записи", "записей")}</span>
                <button disabled={c === state.categories[0]} onClick={() => { mutate(s => { s.categories = s.categories.filter(x => x !== c); s.posts.forEach(p => { if (p.category === c) p.category = s.categories[0]; }); }); toast("ok", "Рубрика удалена", `Записи перенесены в «${state.categories[0]}».`); }}
                  className="opacity-0 group-hover:opacity-100 text-mut hover:text-danger transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-0" title="Удалить рубрику"><I n="trash" size={15} /></button>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
