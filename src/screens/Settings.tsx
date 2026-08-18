import React, { useRef, useState } from "react";
import { I, IconName, WTMark } from "../components/icons";
import { Badge, Btn, Field, Modal, Progress, SmartImg, Toggle, inputCls, selectCls } from "../components/ui";
import { fmtKB, plural } from "../lib/data";
import { useFileRead, useStore } from "../lib/store";

const TABS: { key: string; label: string; icon: IconName }[] = [
  { key: "general", label: "Общие", icon: "gear" },
  { key: "discussion", label: "Обсуждение", icon: "comment" },
  { key: "cache", label: "Кеш и скорость", icon: "zap" },
  { key: "security", label: "Безопасность и 2FA", icon: "shield" },
  { key: "backups", label: "Резервные копии", icon: "cloud" },
  { key: "login", label: "Страница входа", icon: "lock" },
];

export default function Settings({ tab, onTab }: { tab: string; onTab: (t: string) => void }) {
  return (
    <div className="anim-fade-up">
      <h1 className="font-display font-extrabold text-[24px] text-ink-900 tracking-tight mb-5">Настройки</h1>
      <div className="grid lg:grid-cols-[230px_1fr] gap-6 items-start">
        <nav className="bg-card border border-line rounded-xl shadow-panel overflow-hidden lg:sticky lg:top-0">
          {TABS.map(t => (
            <button key={t.key} onClick={() => onTab(t.key)}
              className={`w-full flex items-center gap-3 px-4 h-11.5 text-[13.5px] font-bold border-b border-line last:border-0 transition-all cursor-pointer
                ${tab === t.key ? "bg-ink-900 text-white" : "text-ink-800 hover:bg-paper"}`}>
              <span className={tab === t.key ? "text-teal-brand" : "text-mut"}><I n={t.icon} size={16} /></span>
              <span className="flex-1 text-left">{t.label}</span>
              {tab === t.key && <I n="chevR" size={13} />}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          {tab === "general" && <GeneralTab />}
          {tab === "discussion" && <DiscussionTab />}
          {tab === "cache" && <CacheTab />}
          {tab === "security" && <SecurityTab />}
          {tab === "backups" && <BackupsTab />}
          {tab === "login" && <LoginTab />}
        </div>
      </div>
    </div>
  );
}

function Card({ title, desc, children, footer }: { title: string; desc?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="bg-card border border-line rounded-xl shadow-panel mb-5 overflow-hidden">
      <header className="px-6 pt-5 pb-4 border-b border-line">
        <h2 className="font-display font-bold text-[16px] text-ink-900">{title}</h2>
        {desc && <p className="text-[13px] text-mut mt-1">{desc}</p>}
      </header>
      <div className="px-6 py-5">{children}</div>
      {footer && <footer className="px-6 py-4 border-t border-line bg-paper/50">{footer}</footer>}
    </section>
  );
}

/* ── Общие ── */
function GeneralTab() {
  const { state, patchSettings, toast, mutate } = useStore();
  const s = state.settings;
  const [title, setTitle] = useState(s.siteTitle);
  const [tagline, setTagline] = useState(s.tagline);
  const [mail, setMail] = useState(s.adminEmail);
  const [tz, setTz] = useState(s.timezone);

  return (
    <>
      <Card title="Общие настройки" desc="Название сайта показывается в консоли, на странице входа и в браузере посетителя."
        footer={<div className="flex justify-end"><Btn onClick={() => { patchSettings({ siteTitle: title.trim() || "Wordtime", tagline, adminEmail: mail, timezone: tz }); mutate(st => { st.activity.unshift({ id: "a" + Date.now(), text: "Обновлены общие настройки сайта", time: "только что", icon: "gear" }); }); toast("ok", "Настройки сохранены", "Изменения применены ко всему сайту."); }}>Сохранить изменения</Btn></div>}>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Название сайта"><input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} /></Field>
          <Field label="Краткое описание"><input value={tagline} onChange={e => setTagline(e.target.value)} className={inputCls} /></Field>
          <Field label="Почта администратора" hint="На неё приходят коды 2FA и уведомления."><input value={mail} onChange={e => setMail(e.target.value)} className={inputCls} /></Field>
          <Field label="Язык сайта">
            <div className="relative">
              <select className={selectCls} defaultValue="Русский">
                <option>Русский</option>
                <option disabled>English — недоступно в Wordtime</option>
                <option disabled>Deutsch — недоступно в Wordtime</option>
              </select>
            </div>
          </Field>
          <Field label="Часовой пояс">
            <select value={tz} onChange={e => setTz(e.target.value)} className={selectCls}>
              {["Калининград (UTC+2)", "Москва (UTC+3)", "Самара (UTC+4)", "Екатеринбург (UTC+5)", "Новосибирск (UTC+7)", "Владивосток (UTC+10)"].map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Формат даты"><input value="12.02.2026" disabled className={inputCls + " opacity-60 cursor-not-allowed"} /></Field>
        </div>
        <p className="mt-4 flex items-center gap-2 text-[12.5px] text-mut"><I n="globe" size={14} /> Wordtime говорит по-русски: весь интерфейс, даты и числа — в русской локали.</p>
      </Card>
    </>
  );
}

/* ── Обсуждение (отключение комментариев) ── */
function DiscussionTab() {
  const { state, patchSettings, toast, mutate, nav } = useStore();
  const s = state.settings;
  const off = s.commentsDisabled;

  return (
    <>
      <Card title="Комментарии на сайте" desc="Главный переключатель комментирования для всего сайта.">
        <div className={`flex items-start gap-4 p-5 rounded-xl border-2 transition-all ${off ? "border-warn/40 bg-warn/6" : "border-teal-deep/30 bg-teal-soft/40"}`}>
          <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${off ? "bg-warn/15 text-warn" : "bg-teal-deep/12 text-teal-deep"}`}><I n="comment" size={21} /></span>
          <div className="flex-1">
            <p className="font-bold text-[15px] text-ink-900">Отключение комментариев</p>
            <p className="text-[13px] text-mut mt-1 leading-snug">
              {off ? "Комментарии выключены: форма скрыта на всех записях и страницах, новые комментарии не принимаются." : "Комментарии включены: посетители могут обсуждать записи, новые комментарии попадают в очередь."}
            </p>
          </div>
          <Toggle big on={!off} onChange={v => {
            patchSettings({ commentsDisabled: !v });
            mutate(st => { st.activity.unshift({ id: "a" + Date.now(), text: v ? "Комментарии включены" : "Комментарии отключены на всём сайте", time: "только что", icon: "comment" }); });
            toast(v ? "ok" : "warn", v ? "Комментарии включены" : "Комментарии отключены", v ? "Форма комментирования снова видна посетителям." : "Форма скрыта, очередь модерации сохранена.");
          }} />
        </div>

        <div className={`mt-5 space-y-4 transition-opacity ${off ? "opacity-45 pointer-events-none" : ""}`}>
          {[
            { k: "moderateFirst" as const, l: "Отправлять новые комментарии на модерацию", d: "Комментарий появится на сайте только после одобрения." },
            { k: "requireEmail" as const, l: "Требовать имя и почту для комментирования", d: "Почта не показывается другим посетителям." },
          ].map(o => (
            <div key={o.k} className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-[14px] font-bold text-ink-900">{o.l}</p>
                <p className="text-[12.5px] text-mut mt-0.5">{o.d}</p>
              </div>
              <Toggle on={s[o.k]} onChange={v => { patchSettings({ [o.k]: v } as never); toast("ok", "Сохранено", o.l); }} />
            </div>
          ))}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[14px] font-bold text-ink-900">Закрывать комментарии через</p>
              <p className="text-[12.5px] text-mut mt-0.5">дней после публикации записи.</p>
            </div>
            <input type="number" min={1} max={365} value={s.closeAfterDays} onChange={e => patchSettings({ closeAfterDays: Math.max(1, Number(e.target.value) || 1) })}
              className={inputCls + " w-24! text-center"} />
          </div>
        </div>
      </Card>
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-mut">{state.comments.filter(c => c.status === "pending").length} {plural(state.comments.filter(c => c.status === "pending").length, "комментарий ждёт", "комментария ждут", "комментариев ждут")} проверки</p>
        <Btn kind="outline" onClick={() => nav("comments")}>Открыть очередь модерации</Btn>
      </div>
    </>
  );
}

/* ── Кеш ── */
function CacheTab() {
  const { state, patchSettings, clearCache, toast } = useStore();
  const s = state.settings;
  const [sweeping, setSweeping] = useState(false);

  const doClear = () => {
    if (sweeping) return;
    setSweeping(true);
    window.setTimeout(() => { clearCache(); setSweeping(false); }, 900);
  };

  return (
    <>
      <Card title="Кеширование сайта" desc="WT-Кеш собирает страницы один раз и отдаёт их мгновенно. Очистка нужна после правок дизайна и обновлений.">
        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1">
            <p className="text-[14px] font-bold text-ink-900">Страничный кеш</p>
            <p className="text-[12.5px] text-mut mt-0.5">При отключении сайт генерирует каждую страницу заново — медленнее, но всегда свежо.</p>
          </div>
          <Toggle big on={s.cacheEnabled} onChange={v => { patchSettings({ cacheEnabled: v }); toast(v ? "ok" : "warn", v ? "Кеш включён" : "Кеш отключён"); }} />
        </div>

        <div className="relative overflow-hidden rounded-xl bg-ink-900 text-paper p-6 grain">
          <div className="absolute inset-0 blueprint opacity-60" />
          {sweeping && <span className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-teal-brand/25 to-transparent" style={{ animation: "wt-sweep 0.9s ease both" }} />}
          <div className="relative flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[11.5px] font-extrabold uppercase tracking-[0.16em] text-teal-brand">Занято в кеше</p>
              <p className="font-display font-extrabold text-[34px] tabular leading-tight mt-1">{sweeping ? "0 КБ" : fmtKB(state.cache.sizeKB)}</p>
            </div>
            <div className="hidden sm:block w-px h-12 bg-ink-700" />
            <div>
              <p className="text-[11.5px] font-extrabold uppercase tracking-[0.16em] text-amber-brand">Обслужено запросов</p>
              <p className="font-display font-extrabold text-[22px] tabular leading-tight mt-1.5">{state.cache.hits.toLocaleString("ru-RU")}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[12px] text-paper/60">последняя очистка</p>
              <p className="text-[13.5px] font-bold mt-0.5">{state.cache.lastCleared}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Btn kind="amber" size="lg" onClick={doClear} disabled={!s.cacheEnabled}>
            <I n="refresh" size={17} className={sweeping ? "anim-spin" : ""} />{sweeping ? "Очищаем…" : "Очистить кеш сайта"}
          </Btn>
          <span className="text-[12.5px] text-mut">Кнопка также доступна в верхней панели консоли.</span>
        </div>
      </Card>

      <Card title="Автоочистка">
        <Field label="Очищать кеш автоматически" hint="Плановая очистка не затрагивает посетителей — страницы пересобираются в фоне.">
          <select value={s.autoPurge} onChange={e => { patchSettings({ autoPurge: e.target.value }); toast("ok", "Расписание обновлено", e.target.value); }} className={selectCls + " max-w-xs"}>
            {["Каждый час", "Каждые 6 часов", "Раз в сутки", "Раз в неделю", "Никогда (вручную)"].map(o => <option key={o}>{o}</option>)}
          </select>
        </Field>
      </Card>
    </>
  );
}

/* ── Безопасность ── */
function SecurityTab() {
  const { state, mutate, toast, authed } = useStore();
  const s = state.settings;

  return (
    <>
      <Card title="Двухфакторная аутентификация (2FA)" desc="В Wordtime второй фактор обязателен для всех — это встроено в ядро и не отключается.">
        <div className="flex items-start gap-4 p-5 rounded-xl border-2 border-ok/30 bg-ok/6">
          <span className="w-11 h-11 rounded-xl bg-ok/15 text-ok grid place-items-center shrink-0"><I n="shield" size={21} /></span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-[15px] text-ink-900">2FA включена и обязательна</p>
              <Badge tone="ok">ЗАЩИЩЕНО</Badge>
            </div>
            <p className="text-[13px] text-mut mt-1 leading-snug">После пароля на почту приходит шести значный код. Код действует 5 минут, даётся 5 попыток, каждый вход фиксируется.</p>
          </div>
        </div>
        <div className="mt-5 grid sm:grid-cols-2 gap-5">
          <Field label="Способ доставки кода">
            <select value={s.twoFAMethod} onChange={e => toast("info", "Способ сохранён", "В этой версии коды доставляются на почту.")} className={selectCls}>
              <option>Код на электронную почту</option>
              <option disabled>TOTP-приложение — скоро</option>
              <option disabled>СМС — скоро</option>
            </select>
          </Field>
          <Field label="Почта для кодов">
            <div className="flex gap-2">
              <input value={authed?.email ?? s.adminEmail} disabled className={inputCls + " opacity-70"} />
              <Btn kind="outline" onClick={() => toast("ok", "Тестовый код отправлен", `Шести значный код улетел на ${authed?.email}.`)}>Тест</Btn>
            </div>
          </Field>
        </div>
      </Card>

      <Card title="Активные сессии" desc="Устройства, на которых выполнен вход. Чужая сессия? Завершите её.">
        <div className="space-y-2.5">
          {s.sessions.map(se => (
            <div key={se.id} className="flex items-center gap-4 p-3.5 rounded-xl border border-line hover:border-ink-600/30 transition-colors">
              <span className={`w-10 h-10 rounded-lg grid place-items-center shrink-0 ${se.current ? "bg-teal-deep/12 text-teal-deep" : "bg-paper text-mut"}`}><I n="monitor" size={18} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-bold text-ink-900">{se.device} {se.current && <Badge tone="teal">ТЕКУЩАЯ</Badge>}</p>
                <p className="text-[12.5px] text-mut">{se.place} · {se.time}</p>
              </div>
              {!se.current && (
                <Btn size="sm" kind="ghost" className="text-danger! hover:bg-danger/8!" onClick={() => { mutate(st => { st.settings.sessions = st.settings.sessions.filter(x => x.id !== se.id); }); toast("ok", "Сессия завершена", `${se.device} отключён от сайта.`); }}>Завершить</Btn>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Журнал входов" desc="Последние подтверждения 2FA.">
        <ul className="space-y-2">
          {[["Вход подтверждён кодом из письма", "сегодня, " + new Date().toTimeString().slice(0, 5), true], ["Вход подтверждён кодом из письма", "вчера, 21:14", true], ["Неверный пароль — вход отклонён", "вчера, 20:58", false]].map(([t, d, ok], i) => (
            <li key={i} className="flex items-center gap-3 text-[13.5px]">
              <span className={`w-6 h-6 rounded-full grid place-items-center shrink-0 ${ok ? "bg-ok/12 text-ok" : "bg-danger/10 text-danger"}`}><I n={ok ? "check" : "x"} size={12} sw={2.6} /></span>
              <span className="font-semibold text-ink-800 flex-1">{t as string}</span>
              <span className="text-[12.5px] text-mut">{d as string}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

/* ── Резервные копии (WT-Миграция) ── */
function BackupsTab() {
  const { state, runBackup, backupBusy, downloadBackup, restoreBackup, importWpress, importBusy, restoreFromFile, mutate, toast } = useStore();
  const [confirm, setConfirm] = useState<string | null>("file");
  const [pendingRestore, setPendingRestore] = useState<{ id: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const readFile = useFileRead((text, file) => {
    if (file.name.toLowerCase().endsWith(".wpress")) { importWpress(file); return; }
    (file as unknown as { __text: string }).__text = text;
    restoreFromFile(file);
  });

  const busyLabel = backupBusy < 0 ? "" : backupBusy < 30 ? "Собираем базу данных…" : backupBusy < 60 ? "Пакуем медиафайлы…" : backupBusy < 90 ? "Архивируем темы и плагины…" : "Финализируем архив…";

  return (
    <>
      <Card title="WT-Миграция — резервная копия всего сайта"
        desc="Полный снимок сайта одним файлом .wtm: база, записи, медиафайлы, темы, плагины и настройки. Скачивайте, переносите на другой хостинг, восстанавливайте — как All-in-One WP Migration, только уже в ядре.">
        <div className="rounded-xl bg-ink-900 text-paper p-6 grain relative overflow-hidden">
          <div className="absolute inset-0 blueprint opacity-60" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="w-11 h-11 rounded-xl bg-teal-brand/15 text-teal-brand grid place-items-center"><I n="cloud" size={22} /></span>
              <div className="flex-1 min-w-[200px]">
                <p className="font-display font-bold text-[16px]">Создать резервную копию</p>
                <p className="text-[12.5px] text-paper/60 mt-0.5">Обычно занимает меньше 10 секунд для сайтов до 1 ГБ.</p>
              </div>
              <div className="flex gap-2.5">
                <Btn kind="amber" onClick={() => runBackup("Полная", "Полная копия сайта")} disabled={backupBusy >= 0}><I n="cloud" size={15} />Полная копия</Btn>
                <Btn kind="dark" className="bg-ink-700! hover:bg-ink-600!" onClick={() => runBackup("База данных", "Только база данных")} disabled={backupBusy >= 0}><I n="database" size={15} />Только база</Btn>
              </div>
            </div>
            {backupBusy >= 0 && (
              <div className="mt-5 anim-fade">
                <Progress value={backupBusy} tone="amber" label={busyLabel} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-mut mb-3">Сохранённые копии · {state.backups.length}</p>
          <div className="space-y-2.5">
            {state.backups.map(b => (
              <div key={b.id} className="flex flex-wrap items-center gap-3.5 p-4 rounded-xl border border-line hover:border-teal-deep/40 hover:shadow-panel transition-all group">
                <span className="w-10 h-10 rounded-lg bg-teal-deep/10 text-teal-deep grid place-items-center shrink-0"><I n={b.kind === "Полная" ? "cloud" : "database"} size={18} /></span>
                <div className="flex-1 min-w-[180px]">
                  <p className="text-[14px] font-bold text-ink-900">{b.label}</p>
                  <p className="text-[12.5px] text-mut">{b.date} · {fmtKB(b.sizeKB)} · <Badge tone={b.kind === "Полная" ? "teal" : "mut"}>{b.kind.toUpperCase()}</Badge></p>
                </div>
                <div className="flex gap-2">
                  <Btn size="sm" kind="outline" onClick={() => downloadBackup(b)}><I n="download" size={14} />Скачать .wtm</Btn>
                  <Btn size="sm" kind="dark" onClick={() => setPendingRestore({ id: b.id })}><I n="refresh" size={14} />Восстановить</Btn>
                  <button onClick={() => { mutate(s => { s.backups = s.backups.filter(x => x.id !== b.id); }); toast("ok", "Копия удалена"); }}
                    className="w-9 h-8 grid place-items-center rounded-lg text-mut hover:text-danger hover:bg-danger/8 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"><I n="trash" size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Восстановление сайта" desc="Перетащите файл копии — сайт вернётся к сохранённому состоянию: записи, страницы, комментарии, настройки и медиафайлы.">
        <input ref={fileRef} type="file" accept=".wtm,.wpress,.json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ""; }} />
        <button onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) readFile(f); }}
          className={`w-full py-10 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center
            ${dragOver ? "border-teal-deep bg-teal-soft/60 scale-[1.01]" : "border-line bg-paper/50 hover:border-teal-deep/50 hover:bg-teal-soft/30"}`}>
          <span className={`mx-auto w-12 h-12 rounded-full grid place-items-center mb-3 transition-colors ${dragOver ? "bg-teal-deep text-white" : "bg-ink-900/6 text-ink-600"}`}><I n="upload" size={22} /></span>
          <p className="text-[14.5px] font-bold text-ink-900">{dragOver ? "Отпустите файл — начнём восстановление" : "Выберите файл или перетащите его сюда"}</p>
          <p className="text-[12.5px] text-mut mt-1.5">Поддерживаются <b>.wtm</b> (Wordtime) и <b>.wpress</b> (All-in-One WP Migration — сконвертируем автоматически)</p>
        </button>
        {importBusy >= 0 && <div className="mt-4"><Progress value={importBusy} tone="amber" label="Конвертируем архив WordPress в формат Wordtime…" /></div>}
      </Card>

      <Modal open={!!pendingRestore} onClose={() => setPendingRestore(null)} title="Восстановить сайт из копии?" width={460}>
        <div className="flex gap-3.5">
          <span className="w-11 h-11 rounded-xl bg-warn/12 text-warn grid place-items-center shrink-0"><I n="zap" size={20} /></span>
          <p className="text-[13.5px] text-ink-800 leading-relaxed">
            Текущее содержимое сайта будет <b>полностью заменено</b> данными копии от{" "}
            <b>{state.backups.find(b => b.id === pendingRestore?.id)?.date}</b>. Рекомендуем сначала скачать текущую копию.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2.5">
          <Btn kind="outline" onClick={() => setPendingRestore(null)}>Отмена</Btn>
          <Btn kind="amber" onClick={() => { const b = state.backups.find(x => x.id === pendingRestore?.id); if (b) restoreBackup(b); setPendingRestore(null); }}>Да, восстановить</Btn>
        </div>
      </Modal>
    </>
  );
}

/* ── Страница входа ── */
const ACCENTS = ["#0e9384", "#2563a8", "#d99417", "#a4286a", "#0f766e", "#334155"];

function LoginTab() {
  const { state, patchLoginCustom, toast } = useStore();
  const L = state.settings.login;

  const previewBg = L.mode === "solid"
    ? { background: L.accent }
    : L.mode === "image" && L.imageUrl
      ? { backgroundImage: `linear-gradient(rgba(7,27,33,0.8), rgba(12,46,54,0.86)), url(${L.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: `linear-gradient(160deg, #071b21 0%, #0c2e36 45%, ${L.accent} 140%)` };

  return (
    <>
      <Card title="Кастомизация страницы входа и регистрации" desc="Всё, что вы настроите здесь, посетитель увидит на странице входа — мгновенно и без плагинов.">
        <div className="grid xl:grid-cols-[1fr_340px] gap-8 items-start">
          <div className="space-y-6">
            <div>
              <p className="text-[13px] font-bold text-ink-900 mb-2.5">Акцентный цвет</p>
              <div className="flex flex-wrap items-center gap-2.5">
                {ACCENTS.map(c => (
                  <button key={c} onClick={() => { patchLoginCustom({ accent: c }); toast("ok", "Цвет применён"); }}
                    className={`w-9 h-9 rounded-full transition-transform cursor-pointer hover:scale-110 ${L.accent === c ? "ring-[3px] ring-offset-2 ring-ink-900/50 scale-110" : ""}`}
                    style={{ background: c }} aria-label={`Цвет ${c}`} />
                ))}
                <label className="relative w-9 h-9 rounded-full border-2 border-dashed border-line grid place-items-center cursor-pointer hover:border-teal-deep transition-colors" title="Свой цвет">
                  <I n="plus" size={14} className="text-mut" />
                  <input type="color" value={L.accent} onChange={e => patchLoginCustom({ accent: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer" />
                </label>
              </div>
            </div>

            <div>
              <p className="text-[13px] font-bold text-ink-900 mb-2.5">Фон брендовой панели</p>
              <div className="grid grid-cols-3 gap-2.5">
                {([["gradient", "Градиент"], ["solid", "Цвет"], ["image", "Изображение"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => patchLoginCustom({ mode: k })}
                    className={`h-10 rounded-lg border text-[13px] font-bold transition-all cursor-pointer ${L.mode === k ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-card text-mut hover:border-ink-600/40"}`}>{l}</button>
                ))}
              </div>
              {L.mode === "image" && (
                <div className="mt-3 grid grid-cols-4 gap-2 anim-fade">
                  {state.media.filter(m => m.kind === "image").map(m => (
                    <button key={m.id} onClick={() => patchLoginCustom({ imageUrl: m.url })}
                      className={`rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:scale-[1.03] ${L.imageUrl === m.url ? "border-teal-deep ring-2 ring-teal-deep/25" : "border-line"}`}>
                      <SmartImg src={m.url} alt={m.name} className="w-full h-14 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Название на странице входа">
                <input value={L.logoText} onChange={e => patchLoginCustom({ logoText: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Приветственное сообщение">
                <input value={L.message} onChange={e => patchLoginCustom({ message: e.target.value })} className={inputCls} />
              </Field>
            </div>

            <Field label="Подпись внизу брендовой панели">
              <input value={L.sideNote} onChange={e => patchLoginCustom({ sideNote: e.target.value })} className={inputCls} />
            </Field>

            <div className="flex flex-wrap gap-x-10 gap-y-4">
              <div className="flex items-center gap-3">
                <Toggle on={L.rounded} onChange={v => patchLoginCustom({ rounded: v })} />
                <span className="text-[13.5px] font-bold text-ink-900">Скруглённая карточка</span>
              </div>
              <div className="flex items-center gap-3">
                <Toggle on={L.showRegister} onChange={v => patchLoginCustom({ showRegister: v })} />
                <span className="text-[13.5px] font-bold text-ink-900">Показывать вкладку «Регистрация»</span>
              </div>
            </div>
          </div>

          {/* живой предпросмотр */}
          <div className="xl:sticky xl:top-0">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-mut mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ok" style={{ animation: "wt-pulse-dot 1.6s infinite" }} />Живой предпросмотр
            </p>
            <div className="rounded-xl overflow-hidden border border-line shadow-pop">
              <div className="relative p-4 h-40 text-paper grain" style={previewBg}>
                <div className="flex items-center gap-2">
                  <WTMark size={20} />
                  <span className="font-display font-extrabold text-[11px]">{L.logoText || "Wordtime"}</span>
                </div>
                <p className="font-display font-extrabold text-[14px] mt-4 leading-tight">Ваш сайт.<br />Ваше время.</p>
                <p className="text-[9px] text-paper/60 mt-2.5">{L.sideNote}</p>
              </div>
              <div className="bg-card p-4">
                <p className="font-display font-extrabold text-[13px] text-ink-900">Вход в консоль</p>
                <p className="text-[10.5px] text-mut mt-0.5">{L.message}</p>
                {L.showRegister && (
                  <div className="mt-2.5 grid grid-cols-2 p-0.5 bg-paper rounded-lg text-[9.5px] font-bold">
                    <span className="h-6 grid place-items-center bg-card rounded-md shadow text-ink-900">Вход</span>
                    <span className="grid place-items-center text-mut">Регистрация</span>
                  </div>
                )}
                <div className="mt-2.5 space-y-2">
                  <div className="h-7 rounded-md border border-line bg-card" />
                  <div className="h-7 rounded-md border border-line bg-card" />
                  <div className={`h-8 grid place-items-center text-white text-[10px] font-bold ${L.rounded ? "rounded-lg" : "rounded-sm"}`} style={{ background: L.accent }}>Продолжить → код на почту</div>
                </div>
              </div>
            </div>
            <p className="text-[12px] text-mut mt-3 leading-relaxed">Так страницу входа увидят новые пользователи. Код 2FA остаётся обязательным при любом оформлении.</p>
          </div>
        </div>
      </Card>
    </>
  );
}
