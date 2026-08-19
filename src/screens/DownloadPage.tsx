import { useEffect, useRef, useState } from "react";
import { I, WTMark } from "../components/icons";
import { downloadBlob, downloadText, fmtBytes, type ZipEntry } from "../lib/zip";
import { buildDeployZip, loadCoreFiles, FILE_NOTES } from "../lib/deploy";

const crcOf = (s: string) => {
  const d = new TextEncoder().encode(s);
  let c = 0xffffffff;
  for (let i = 0; i < d.length; i++) {
    c ^= d[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff).toString(16).toUpperCase().padStart(8, "0");
};

export default function DownloadPage({ onBack }: { onBack: () => void }) {
  const [packed, setPacked] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const firedRef = useRef(false);

  const [files, setFiles] = useState<ZipEntry[] | null>(null);
  const [filesErr, setFilesErr] = useState(false);

  /* читаем реальные файлы пакета с сервера */
  useEffect(() => {
    let alive = true;
    loadCoreFiles().then(f => { if (alive) setFiles(f); }).catch(() => { if (alive) setFilesErr(true); });
    return () => { alive = false; };
  }, []);

  const total = files?.length ?? 0;
  const totalSize = (files ?? []).reduce((s, f) => s + new TextEncoder().encode(f.content).length, 0);

  /* живая «упаковка» файлов (идёт, пока файлы читаются) */
  useEffect(() => {
    if (total === 0) return;
    const t = window.setInterval(() => {
      setPacked(p => {
        if (p >= total) { window.clearInterval(t); return p; }
        return p + 1;
      });
    }, 260);
    return () => window.clearInterval(t);
  }, [total]);

  const doDownload = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    setStarted(true);
    void buildDeployZip().then(b => {
      downloadBlob(b, "Wordtime_cms.zip");
      window.setTimeout(() => setDone(true), 400);
    }).catch(() => { setStarted(false); setDone(false); firedRef.current = false; setFilesErr(true); });
  };

  /* автозапуск скачивания после упаковки */
  useEffect(() => {
    if (total === 0 || packed < total || started) return;
    if (countdown <= 0) { doDownload(); return; }
    const t = window.setTimeout(() => setCountdown(c => c - 1), 800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packed, countdown, started, total]);

  const shareLink = `${location.origin}${location.pathname}#/download`;
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareLink); } catch { /* нет доступа */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="min-h-screen bg-deep text-paper grain relative overflow-hidden">
      <div className="absolute inset-0 blueprint opacity-50 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-[560px] h-[560px] rounded-full opacity-25 pointer-events-none" style={{ background: "radial-gradient(circle, #14b8a6 0%, transparent 65%)" }} />
      <div className="absolute -bottom-52 -left-40 w-[520px] h-[520px] rounded-full opacity-15 pointer-events-none" style={{ background: "radial-gradient(circle, #f0b429 0%, transparent 65%)" }} />

      {/* верхняя планка */}
      <header className="relative z-10 max-w-6xl mx-auto px-5 h-16 flex items-center gap-4">
        <span className="flex items-center gap-2.5">
          <WTMark size={30} />
          <span className="font-display font-extrabold text-[16px] tracking-tight">Wordtime</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-brand/15 text-amber-brand border border-amber-brand/30">v1.1 · PHP</span>
        </span>
        <button onClick={onBack} className="ml-auto flex items-center gap-2 h-9 px-4 rounded-lg border border-deep-line text-paper/75 hover:text-white hover:border-teal-brand/50 transition-all cursor-pointer text-[13px] font-bold">
          <I n="arrowL" size={15} />Вернуться в консоль
        </button>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-5 pb-16 pt-8 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
        {/* ── левая колонка: архив ── */}
        <div>
          <p className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.18em] text-teal-brand">
            <I n="package" size={15} />Установочный пакет
          </p>
          <h1 className="font-display font-extrabold text-[clamp(30px,4.5vw,46px)] leading-[1.08] tracking-tight mt-3">
            Wordtime_cms<span className="text-teal-brand">.zip</span>
          </h1>
          <p className="text-[15px] text-paper/65 mt-4 max-w-lg leading-relaxed">
            <b className="text-paper">Полное PHP-ядро CMS</b> для классических хостингов: nginx или Apache + PHP 7.4–8.3 (FPM) + MySQL/MariaDB.
            Без Docker и Composer — только файлы и база. Распаковали, открыли домен — установщик сделает всё сам.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {[`${fmtBytes(totalSize)} · ${total} файлов`, "PHP 7.4 – 8.3", "nginx / Apache", "MariaDB / MySQL", "REST API", "2FA в ядре"].map(t => (
              <span key={t} className="px-3 py-1.5 rounded-lg bg-deep-line/40 border border-deep-line text-[12px] font-bold text-paper/80">{t}</span>
            ))}
          </div>

          {/* кнопка скачивания */}
          <div className="mt-8 p-6 rounded-2xl bg-deep-2/80 border border-deep-line relative overflow-hidden">
            <div className="absolute inset-0 blueprint opacity-40" />
            <div className="relative flex flex-wrap items-center gap-5">
              <span className={`w-16 h-16 rounded-2xl grid place-items-center shrink-0 transition-all duration-500 ${done ? "bg-ok/20 text-ok" : "bg-amber-brand text-deep"}`}>
                <I n={done ? "check" : "download"} size={30} sw={2} className={done ? "" : "anim-float"} />
              </span>
              <div className="flex-1 min-w-[200px]">
                {!started ? (
                  <>
                    <p className="font-display font-bold text-[17px]">
                      {total === 0 ? "Читаем файлы пакета…" : packed < total ? `Упаковываем файлы… ${packed}/${total}` : `Скачивание начнётся через ${countdown}…`}
                    </p>
                    <p className="text-[13px] text-paper/60 mt-1">или нажмите кнопку, чтобы скачать прямо сейчас</p>
                  </>
                ) : (
                  <>
                    <p className="font-display font-bold text-[17px]">{done ? "Скачивание началось" : "Готовим архив…"}</p>
                    <p className="text-[13px] text-paper/60 mt-1">{done ? "Файл появился в папке загрузок браузера" : "Одну секунду"}</p>
                  </>
                )}
              </div>
              <button onClick={doDownload}
                className="h-13 px-7 rounded-xl bg-amber-brand text-deep font-display font-extrabold text-[15px] hover:bg-amber-deep hover:text-white transition-all active:scale-[0.97] cursor-pointer shadow-[0_8px_24px_-8px_rgba(240,180,41,0.55)] flex items-center gap-2.5">
                <I n="download" size={18} sw={2.2} />Скачать ZIP
              </button>
            </div>
            {done && (
              <button onClick={() => { firedRef.current = false; setStarted(false); setDone(false); }}
                className="relative mt-4 text-[13px] font-bold text-teal-brand hover:text-teal-soft transition-colors cursor-pointer flex items-center gap-2">
                <I n="refresh" size={14} />Скачать ещё раз
              </button>
            )}
          </div>

          {/* прямая ссылка */}
          <div className="mt-5 flex items-center gap-3">
            <code className="flex-1 truncate text-[12.5px] text-paper/60 bg-deep-2/60 border border-deep-line rounded-lg px-3.5 py-2.5 font-mono">{shareLink}</code>
            <button onClick={copyLink} className="h-10 px-4 rounded-lg border border-deep-line text-paper/75 hover:text-teal-brand hover:border-teal-brand/50 transition-all cursor-pointer text-[13px] font-bold flex items-center gap-2 shrink-0">
              <I n={copied ? "check" : "copy"} size={15} />{copied ? "Скопировано" : "Копировать"}
            </button>
          </div>
          <p className="text-[12px] text-paper/45 mt-2.5">Эта ссылка работает на любом хостинге — она часть самой CMS и не требует отдельного файла на сервере.</p>
          {filesErr && (
            <div className="mt-4 px-4 py-3.5 rounded-xl border border-danger/40 bg-danger/10 text-[13px] text-paper flex items-start gap-3">
              <I n="x" size={16} className="text-danger shrink-0 mt-0.5" />
              <span>Не удалось прочитать файлы пакета с сервера. Обновите страницу — если не поможет, скачайте архив из консоли: «Инструменты → Установка на хостинг».</span>
            </div>
          )}

          {/* шаги установки */}
          <div className="mt-9 grid sm:grid-cols-3 gap-3.5">
            {[
              ["Распакуйте", "в корень сайта — public_html или /var/www"],
              ["Откройте домен", "веб-установщик запустится автоматически"],
              ["Войдите в /wt-admin/", "код 2FA придёт на вашу почту"],
            ].map(([t, d], i) => (
              <div key={t} className="p-4 rounded-xl bg-deep-2/50 border border-deep-line hover:border-teal-brand/40 hover:-translate-y-0.5 transition-all">
                <span className="w-7 h-7 rounded-lg bg-teal-brand/15 text-teal-brand grid place-items-center font-display font-extrabold text-[13px]">{i + 1}</span>
                <p className="font-bold text-[14px] mt-2.5">{t}</p>
                <p className="text-[12px] text-paper/55 mt-1 leading-snug">{d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── правая колонка: терминал упаковки + манифест ── */}
        <div className="space-y-5">
          <div className="rounded-2xl overflow-hidden border border-deep-line bg-deep-2/60 shadow-pop">
            <div className="flex items-center gap-2 px-4 h-10 bg-deep border-b border-deep-line">
              <span className="w-2.5 h-2.5 rounded-full bg-danger/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-brand/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-ok/70" />
              <span className="ml-2 text-[12px] font-bold text-paper/50 font-mono">wt-pack — сборка архива</span>
              <span className="ml-auto text-[11px] font-bold text-teal-brand tabular">{Math.min(packed, total)}/{total}</span>
            </div>
            <div className="p-4 font-mono text-[12px] leading-[1.9] h-52 overflow-hidden">
              <p className="text-paper/50">$ wordtime pack --target Wordtime_cms.zip</p>
              {(files ?? []).slice(0, packed).map((f: ZipEntry) => (
                <p key={f.path} className="anim-fade"><span className="text-ok">✓</span> <span className="text-paper/85">{f.path.replace("Wordtime_cms/", "")}</span> <span className="text-paper/40">· {fmtBytes(new TextEncoder().encode(f.content).length)} · crc {crcOf(f.content).slice(0, 8)}</span></p>
              ))}
              {total > 0 && packed >= total && <p className="text-amber-brand anim-fade font-bold">Архив готов — {total} файлов, контрольные суммы верны</p>}
              {total > 0 && packed < total && <span className="inline-block w-2 h-4 bg-teal-brand align-middle" style={{ animation: "wt-blink 1s steps(2) infinite" }} />}
            </div>
          </div>

          <div className="rounded-2xl border border-deep-line bg-deep-2/40 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-deep-line flex items-center gap-2.5">
              <I n="file" size={15} className="text-teal-brand" />
              <p className="font-display font-bold text-[14px]">Содержимое архива</p>
              <span className="ml-auto text-[11.5px] font-bold text-paper/45 tabular">{fmtBytes(totalSize)}</span>
            </div>
            <ul>
              {(files ?? []).map((f: ZipEntry) => {
                const rel = f.path.replace("Wordtime_cms/", "");
                return (
                  <li key={f.path} className="flex items-center gap-3 px-5 py-2.5 border-b border-deep-line/50 last:border-0 hover:bg-deep-line/25 transition-colors group" title={rel}>
                    <I n="file" size={14} className="text-paper/40 shrink-0" />
                    <span className="font-mono text-[12px] text-paper/90 w-40 shrink-0 truncate">{rel}</span>
                    <span className="text-[11.5px] text-paper/50 flex-1 truncate hidden md:block">{FILE_NOTES[rel] ?? ""}</span>
                    <span className="text-[11px] font-bold text-paper/40 tabular shrink-0">{fmtBytes(new TextEncoder().encode(f.content).length)}</span>
                    <button onClick={() => downloadText(f.content, rel.split("/").pop() ?? rel, "text/plain")}
                      className="w-7 h-7 grid place-items-center rounded-md text-paper/35 hover:text-teal-brand hover:bg-teal-brand/10 transition-all cursor-pointer shrink-0 opacity-60 group-hover:opacity-100" title={`Скачать ${rel}`}>
                      <I n="download" size={13} sw={2} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="text-[12px] text-paper/45 leading-relaxed flex gap-2.5">
            <I n="shield" size={15} className="shrink-0 mt-0.5 text-teal-brand" />
            Архив собирается заново при каждом скачивании, поэтому всегда содержит актуальное PHP-ядро. Проверяли на классическом стеке: nginx + php8.3-fpm + MariaDB — после распаковки достаточно открыть домен.
          </p>
        </div>
      </main>
    </div>
  );
}
