import React, { useState } from "react";
import { I, WTMark } from "../components/icons";
import { SmartImg } from "../components/ui";
import { ruDate } from "../lib/data";
import { detectInjection, sanitizeInput, secLogPush, useStore } from "../lib/store";

export default function SitePreview() {
  const { state, setSiteOpen, toast } = useStore();
  const [openPost, setOpenPost] = useState<string | null>(null);
  const theme = state.themes.find(t => t.active) ?? state.themes[0];
  const posts = state.posts.filter(p => p.status === "published");
  const post = posts.find(p => p.id === openPost);
  const accent = theme.c2;
  const commentsOff = state.settings.commentsDisabled;

  const postComments = (id: string) => state.comments.filter(c => c.postId === id && c.status === "approved");

  return (
    <div className="theme-force-light fixed inset-0 z-[70] bg-paper overflow-y-auto anim-fade">
      {/* плавающая кнопка возврата в консоль */}
      <button onClick={() => setSiteOpen(false)}
        className="fixed bottom-6 right-6 z-20 flex items-center gap-2.5 h-12 px-5 rounded-full bg-ink-950 text-white shadow-pop hover:bg-ink-800 transition-all hover:-translate-y-0.5 cursor-pointer">
        <I n="gear" size={17} className="text-teal-brand" />
        <span className="text-[13.5px] font-bold">Вернуться в консоль</span>
      </button>

      {/* шапка сайта */}
      <header style={{ background: theme.c1 }} className="text-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center gap-6">
          <button onClick={() => setOpenPost(null)} className="flex items-center gap-2.5 cursor-pointer group">
            <WTMark size={30} />
            <span className="font-display font-extrabold text-[17px] tracking-tight group-hover:opacity-80 transition-opacity">{state.settings.siteTitle}</span>
          </button>
          <nav className="ml-auto hidden sm:flex items-center gap-5 text-[13.5px] font-bold text-white/75">
            {["Главная", "Блог", "О проекте", "Контакты"].map(n => (
              <button key={n} onClick={() => setOpenPost(null)} className="hover:text-white transition-colors cursor-pointer">{n}</button>
            ))}
          </nav>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/25 text-white/70 hidden md:inline">демо-просмотр</span>
        </div>
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      </header>

      {!post ? (
        <>
          {/* герой — свежая запись */}
          {posts[0] && (
            <section className="max-w-5xl mx-auto px-5 pt-10">
              <button onClick={() => setOpenPost(posts[0].id)} className="w-full text-left group cursor-pointer">
                <div className="relative rounded-2xl overflow-hidden">
                  {posts[0].image
                    ? <SmartImg src={posts[0].image} alt={posts[0].title} className="w-full h-[300px] md:h-[380px] object-cover group-hover:scale-[1.02] transition-transform duration-700" />
                    : <div className="w-full h-[300px] md:h-[380px]" style={{ background: `linear-gradient(120deg, ${theme.c1}, ${accent})` }} />}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
                    <span className="text-[11.5px] font-extrabold uppercase tracking-[0.16em]" style={{ color: accent }}>{posts[0].category} · {ruDate(posts[0].date)}</span>
                    <h1 className="font-display font-extrabold text-[clamp(22px,3.4vw,36px)] leading-tight mt-2 max-w-2xl group-hover:underline decoration-2 underline-offset-4" style={{ textDecorationColor: accent }}>{posts[0].title}</h1>
                    <p className="text-[13.5px] text-white/70 mt-2.5 flex items-center gap-2">Читать запись <I n="chevR" size={14} className="group-hover:translate-x-1 transition-transform" /></p>
                  </div>
                </div>
              </button>
            </section>
          )}

          {/* лента */}
          <section className="max-w-5xl mx-auto px-5 py-10">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-display font-extrabold text-[20px] text-ink-900">Свежие записи</h2>
              <span className="h-px flex-1 bg-line" />
              <span className="text-[12.5px] font-bold text-mut">{posts.length} публикаций</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {posts.slice(1).map(p => (
                <button key={p.id} onClick={() => setOpenPost(p.id)}
                  className="text-left bg-card border border-line rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-panel transition-all group cursor-pointer">
                  {p.image
                    ? <SmartImg src={p.image} alt={p.title} className="w-full h-40 object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                    : <div className="w-full h-40 grid place-items-center text-white/80" style={{ background: `linear-gradient(120deg, ${theme.c1}, ${accent})` }}><I n="pin" size={28} /></div>}
                  <div className="p-5">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: accent }}>{p.category}</span>
                    <h3 className="font-display font-bold text-[16px] text-ink-900 leading-snug mt-1.5 group-hover:underline underline-offset-4" style={{ textDecorationColor: accent }}>{p.title}</h3>
                    <p className="text-[13px] text-mut mt-2.5 leading-relaxed line-clamp-2">{p.content.split("\n")[0]}</p>
                    <div className="flex items-center gap-3 mt-4 text-[12px] font-bold text-mut">
                      <span>{ruDate(p.date)}</span><span>·</span>
                      <span className="flex items-center gap-1.5"><I n="comment" size={13} />{postComments(p.id).length}</span>
                      <span className="ml-auto" style={{ color: accent }}>Читать →</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        /* ── статья ── */
        <article className="max-w-3xl mx-auto px-5 py-10 anim-fade-up">
          <button onClick={() => setOpenPost(null)} className="flex items-center gap-2 text-[13px] font-bold text-mut hover:text-ink-900 transition-colors cursor-pointer mb-6">
            <I n="arrowL" size={15} />Все записи
          </button>
          <span className="text-[12px] font-extrabold uppercase tracking-[0.16em]" style={{ color: accent }}>{post.category} · {ruDate(post.date)} · {post.author}</span>
          <h1 className="font-display font-extrabold text-[clamp(24px,3.6vw,38px)] leading-[1.15] text-ink-900 mt-3 tracking-tight">{post.title}</h1>
          {post.image && <SmartImg src={post.image} alt="" className="w-full h-72 md:h-96 object-cover rounded-2xl mt-7" />}
          <div className="mt-7 space-y-5 text-[16px] leading-[1.8] text-[#23393f]">
            {post.content.split(/\n{2,}|\n/).filter(Boolean).map((par, i) => <p key={i}>{par}</p>)}
          </div>

          {/* комментарии */}
          <section className="mt-12 pt-8 border-t border-line">
            <h2 className="font-display font-bold text-[19px] text-ink-900 flex items-center gap-2.5">
              Комментарии <span className="text-[13px] font-bold text-mut tabular">· {postComments(post.id).length}</span>
            </h2>
            {commentsOff ? (
              <div className="mt-5 p-5 rounded-xl bg-paper border border-dashed border-line text-center">
                <I n="lock" size={22} className="mx-auto text-mut" />
                <p className="text-[14px] font-bold text-ink-800 mt-2.5">Комментарии отключены</p>
                <p className="text-[13px] text-mut mt-1">Автор сайта выключил комментирование в настройках Wordtime.</p>
              </div>
            ) : (
              <>
                <div className="mt-5 space-y-4">
                  {postComments(post.id).map(c => (
                    <div key={c.id} className="flex gap-3.5">
                      <span className="w-9 h-9 rounded-full grid place-items-center font-display font-bold text-[13px] text-white shrink-0"
                        style={{ background: ["#0e9384", "#d99417", "#2c6b7a", "#a4286a"][c.author.length % 4] }}>{c.author[0]}</span>
                      <div className="flex-1 bg-card border border-line rounded-xl px-4.5 py-3.5">
                        <p className="text-[13px] font-bold text-ink-900">{c.author} <span className="font-semibold text-mut ml-2">{ruDate(c.date)}</span></p>
                        <p className="text-[14px] text-[#23393f] mt-1.5 leading-relaxed">{c.text}</p>
                      </div>
                    </div>
                  ))}
                  {postComments(post.id).length === 0 && <p className="text-[13.5px] text-mut">Будьте первым, кто оставит комментарий.</p>}
                </div>
                <form className="mt-6" onSubmit={e => {
                  e.preventDefault();
                  const f = e.target as HTMLFormElement;
                  const raw = (f.elements.namedItem("ctext") as HTMLTextAreaElement)?.value ?? "";
                  if (detectInjection(raw)) { secLogPush("Заблокирована инъекция в форме комментария на сайте"); toast("danger", "Комментарий отклонён", "Обнаружена попытка инъекции — текст не принят."); return; }
                  const clean = sanitizeInput(raw).trim();
                  if (clean.length < 2) return;
                  toast("info", "Комментарий отправлен на модерацию", "Он появится после одобрения администратором.");
                  f.reset();
                }}>
                  <textarea required rows={3} name="ctext" placeholder="Ваш комментарий…"
                    className="w-full px-4 py-3.5 rounded-xl border border-line bg-card text-[14px] outline-none focus:ring-[3px] transition-all resize-none"
                    style={{ ["--tw-ring-color" as string]: accent + "30" }} />
                  <button type="submit" className="mt-3 h-11 px-6 rounded-lg text-white text-[13.5px] font-bold hover:brightness-110 transition-all active:scale-[0.98] cursor-pointer" style={{ background: accent }}>
                    Отправить комментарий
                  </button>
                </form>
              </>
            )}
          </section>
        </article>
      )}

      <footer className="mt-6 py-10 text-center text-[12.5px] text-mut" style={{ background: theme.c1, color: "rgba(255,255,255,0.55)" }}>
        <p className="font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>{state.settings.siteTitle} — {state.settings.tagline}</p>
        <p className="mt-1.5">Работает на Wordtime {state.version} · тема «{theme.name}»</p>
      </footer>
    </div>
  );
}
