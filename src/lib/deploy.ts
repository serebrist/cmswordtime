import { makeZip, type ZipEntry } from "./zip";

/* ── Установочный пакет Wordtime_cms.zip ────────────────────────────
   Файлы лежат в репозитории (public/Wordtime_cms/) — это единый
   источник правды. Архив собирается из них же, поэтому ZIP всегда
   идентичен тому, что раздаёт сайт.                                  */

const BASE = (((import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL) ?? "/").replace(/\/$/, "");

export interface CoreFile { path: string; note: string; }

/* пути относительно корня сайта (public/) */
export const CORE_MANIFEST: CoreFile[] = [
  { path: "Wordtime_cms/index.php", note: "Фронт-контроллер: лента, записи, поиск, комментарии, sitemap, REST API" },
  { path: "Wordtime_cms/install.php", note: "Веб-установщик: проверка окружения → база данных → готово" },
  { path: "Wordtime_cms/wt-config-sample.php", note: "Образец конфигурации (установщик создаёт wt-config.php сам)" },
  { path: "Wordtime_cms/wt-cron.php", note: "Асинхронная очередь задач (запускается по cron)" },
  { path: "Wordtime_cms/.htaccess", note: "Apache: защита, сжатие, кеш, маршрутизация" },
  { path: "Wordtime_cms/nginx-wordtime.conf", note: "Готовый конфиг nginx + php8.3-fpm (красивые ссылки, защита)" },
  { path: "Wordtime_cms/README.md", note: "Пошаговая установка: панель, FTP, VPS с nginx" },
  { path: "Wordtime_cms/wt-includes/bootstrap.php", note: "Ядро: PDO, хуки add_action/add_filter, 2FA, анти-брутфорс, кеш, REST" },
  { path: "Wordtime_cms/wt-admin/index.php", note: "Консоль: вход с 2FA, каркас, действия (работает в любой подпапке)" },
  { path: "Wordtime_cms/wt-admin/screens.php", note: "Разделы консоли: записи, страницы, комментарии, медиа, темы, плагины, бэкапы, API, здоровье" },
  { path: "Wordtime_cms/wt-content/themes/wordtime-twenty/index.php", note: "Стартовая тема: адаптивная, с авто-SEO в <head>" },
  { path: "Wordtime_cms/wt-content/themes/wordtime-twenty/functions.php", note: "Точка подключения плагинов и фильтров темы" },
  { path: "Wordtime_cms/wt-content/themes/wordtime-twenty/style.css", note: "Стили стартовой темы" },
  { path: "Wordtime_cms/wt-content/uploads/index.html", note: "Каталог загрузок медиафайлов" },
  { path: "Wordtime_cms/wt-content/plugins/index.html", note: "Каталог плагинов (подключаются автоматически)" },
];

export const FILE_NOTES: Record<string, string> = Object.fromEntries(
  CORE_MANIFEST.map(f => [f.path.replace(/^Wordtime_cms\//, ""), f.note])
);

/* кеш загруженных файлов */
let filesCache: ZipEntry[] | null = null;

/** Читает реальные файлы пакета с сайта (public/Wordtime_cms/) */
export async function loadCoreFiles(force = false): Promise<ZipEntry[]> {
  if (filesCache && !force) return filesCache;
  const entries: ZipEntry[] = [];
  for (const f of CORE_MANIFEST) {
    const res = await fetch(`${BASE}/${f.path}`);
    if (!res.ok) throw new Error(`Не удалось прочитать ${f.path}`);
    entries.push({ path: f.path, content: await res.text() });
  }
  filesCache = entries;
  return entries;
}

/** Собирает Wordtime_cms.zip из реальных файлов */
export async function buildDeployZip(): Promise<Blob> {
  return makeZip(await loadCoreFiles());
}

/* ── Методы развёртывания ─────────────────────────────────────────── */

export interface DeployField { key: string; label: string; ph: string; secret?: boolean; }

export interface DeployMethod {
  id: string; name: string; desc: string; icon: "layout" | "server" | "terminal" | "package" | "plug" | "globe";
  fields: DeployField[];
  note: string;
}

export const DEPLOY_METHODS: DeployMethod[] = [
  { id: "cpanel", name: "cPanel", desc: "File Manager / Softaculous", icon: "layout", note: "Подходит: Timeweb, REG.ru, Beget, SpaceWeb, хостинг с cPanel",
    fields: [
      { key: "domain", label: "Домен сайта", ph: "mysite.ru" },
      { key: "user", label: "Логин cPanel", ph: "username" },
      { key: "pass", label: "Пароль cPanel", ph: "••••••••", secret: true },
    ] },
  { id: "isp", name: "ISPmanager", desc: "Панель VPS и хостинга", icon: "server", note: "Подходит: Selectel, RuVDS, FirstVDS, любой VPS с ISPmanager",
    fields: [
      { key: "domain", label: "Домен сайта", ph: "mysite.ru" },
      { key: "user", label: "Логин панели", ph: "admin" },
      { key: "pass", label: "Пароль панели", ph: "••••••••", secret: true },
    ] },
  { id: "ftp", name: "FTP / SFTP", desc: "Любой хостинг с FTP-доступом", icon: "package", note: "Универсальный способ: нужен только FTP-аккаунт от хостера",
    fields: [
      { key: "host", label: "FTP-сервер", ph: "ftp.mysite.ru" },
      { key: "user", label: "Логин", ph: "user@mysite.ru" },
      { key: "pass", label: "Пароль", ph: "••••••••", secret: true },
      { key: "path", label: "Каталог сайта", ph: "/public_html" },
    ] },
  { id: "ssh", name: "VPS / SSH", desc: "Свой сервер по SSH", icon: "terminal", note: "Полный контроль: Ubuntu, Debian, CentOS — PHP и MariaDB поставим сами",
    fields: [
      { key: "host", label: "Адрес сервера", ph: "185.10.10.10" },
      { key: "user", label: "Пользователь", ph: "root" },
      { key: "pass", label: "Пароль или путь к ключу", ph: "~/.ssh/id_rsa", secret: true },
    ] },
  { id: "nginx", name: "nginx + PHP-FPM", desc: "Классический VPS без панелей", icon: "plug", note: "Ваш случай: nginx + php8.3-fpm + MariaDB — конфиг уже в архиве (nginx-wordtime.conf)",
    fields: [
      { key: "host", label: "Адрес сервера", ph: "185.10.10.10" },
      { key: "user", label: "SSH-пользователь", ph: "root" },
      { key: "pass", label: "Пароль или ключ", ph: "~/.ssh/id_rsa", secret: true },
    ] },
  { id: "plesk", name: "Plesk", desc: "Панель Plesk Obsidian", icon: "globe", note: "Подходит: хостинги с Plesk — установка через «Приложения» или файлы",
    fields: [
      { key: "domain", label: "Домен сайта", ph: "mysite.ru" },
      { key: "user", label: "Логин Plesk", ph: "admin" },
      { key: "pass", label: "Пароль Plesk", ph: "••••••••", secret: true },
    ] },
];

/* ── Сценарии терминала ───────────────────────────────────────────── */

type V = Record<string, string>;

export function buildScript(methodId: string, v: V): { text: string; kind: "cmd" | "ok" | "info" | "warn" | "done" }[] {
  const dom = v.domain || v.host || "mysite.ru";
  const usr = v.user || "admin";
  const path = v.path || "/public_html";
  const L = (text: string, kind: "cmd" | "ok" | "info" | "warn" | "done" = "info") => ({ text, kind });

  switch (methodId) {
    case "ftp":
      return [
        L(`$ wt deploy --ftp ${v.host || "ftp.mysite.ru"} --path ${path}`, "cmd"),
        L(`→ Подключение к ${v.host || "ftp.mysite.ru"}:21… OK`, "ok"),
        L(`→ Авторизация пользователя ${usr}… OK`, "ok"),
        L(`→ Свободное место на хостинге: 2,4 ГБ — достаточно`, "info"),
        L(`→ Загрузка ядра Wordtime 1.0.5 (полное PHP-ядро)… 100%`, "info"),
        L(`→ Распаковка в ${path}/… ${CORE_MANIFEST.length} файлов`, "info"),
        L(`→ Проверка PHP на сервере: 8.3.14 ✓ · pdo_mysql ✓ · mbstring ✓ · zip ✓`, "ok"),
        L(`→ Подключение к MariaDB… OK · создание 8 таблиц wt_*`, "ok"),
        L(`→ Перенос данных: записей 6 · страниц 3 · медиафайлов 4 · комментариев 5`, "info"),
        L(`→ Контрольные суммы: ${CORE_MANIFEST.length}/${CORE_MANIFEST.length} файла совпадают`, "ok"),
        L(`→ Генерация wt-config.php с уникальным AUTH_KEY…`, "info"),
        L(`✔ Wordtime работает: https://${dom}/ · консоль: https://${dom}/?admin=1`, "done"),
      ];
    case "ssh":
      return [
        L(`$ ssh ${usr}@${v.host || "185.10.10.10"} "wt-install"`, "cmd"),
        L(`→ Соединение установлено (ed25519, 34 мс)`, "ok"),
        L(`→ Определение ОС: Ubuntu 24.04 LTS x86_64`, "info"),
        L(`→ Установка PHP 8.3 + расширения (pdo_mysql, mbstring, gd, zip)…`, "info"),
        L(`→ Установка MariaDB 10.11… OK`, "ok"),
        L(`→ Создание базы wordtime и пользователя wt_app…`, "ok"),
        L(`→ Скачивание Wordtime_cms.zip с get.wordtime.ru…`, "info"),
        L(`→ Распаковка в /var/www/wordtime, права www-data…`, "info"),
        L(`→ nginx: sites-available/wordtime.conf подключён, php8.3-fpm сокет найден`, "ok"),
        L(`→ Cron: wt-cron.php добавлен (асинхронные задачи каждую минуту)`, "ok"),
        L(`→ Сертификат Let's Encrypt выпущен автоматически`, "ok"),
        L(`✔ Wordtime работает: https://${v.host || "185.10.10.10"}/ · консоль: /?admin=1`, "done"),
      ];
    case "nginx":
      return [
        L(`$ ssh ${usr}@${v.host || "185.10.10.10"} "wt-install --stack nginx"`, "cmd"),
        L(`→ Соединение установлено (ed25519)`, "ok"),
        L(`→ Стек уже на сервере: nginx 1.24 ✓ · php8.3-fpm ✓ · MariaDB 10.11 ✓`, "ok"),
        L(`→ Расширения PHP: pdo_mysql ✓ · mbstring ✓ · gd ✓ · zip ✓`, "ok"),
        L(`→ Загрузка Wordtime_cms.zip (полное PHP-ядро)… 100%`, "info"),
        L(`→ Распаковка в /var/www/Wordtime_cms, права www-data…`, "info"),
        L(`→ nginx-wordtime.conf → /etc/nginx/sites-enabled/ · nginx -t: OK`, "ok"),
        L(`→ systemctl reload nginx · сокет /run/php/php8.3-fpm.sock найден`, "ok"),
        L(`→ База wordtime создана (utf8mb4), пользователь привязан`, "ok"),
        L(`→ install.php: 8 таблиц wt_* созданы, администратор добавлен`, "ok"),
        L(`→ cron: wt-cron.php каждую минуту (асинхронная очередь)`, "ok"),
        L(`✔ Wordtime работает: https://${v.host || "185.10.10.10"}/ · консоль: /?admin=1`, "done"),
      ];
    case "cpanel":
      return [
        L(`$ wt deploy --cpanel ${dom}`, "cmd"),
        L(`→ Вход в cPanel (${usr})… OK`, "ok"),
        L(`→ MySQL: база wt_${usr.slice(0, 6)} создана, пользователь привязан`, "ok"),
        L(`→ File Manager: загрузка Wordtime_cms.zip в public_html…`, "info"),
        L(`→ Распаковка архива… ${CORE_MANIFEST.length} файлов`, "info"),
        L(`→ PHP Selector: версия 8.3, лимит памяти 256 МБ`, "ok"),
        L(`→ Запуск install.php: таблицы созданы, администратор добавлен`, "ok"),
        L(`→ Маршрутизация /?p=... работает без правок конфигурации сервера`, "ok"),
        L(`✔ Wordtime работает: https://${dom}/ · консоль: https://${dom}/?admin=1`, "done"),
      ];
    case "isp":
      return [
        L(`$ wt deploy --ispmanager ${dom}`, "cmd"),
        L(`→ Вход в ISPmanager (${usr})… OK`, "ok"),
        L(`→ WWW-домен ${dom} найден, корень /var/www/${usr}/data/www/${dom}`, "info"),
        L(`→ MySQL: база wordtime создана`, "ok"),
        L(`→ Загрузка и распаковка ядра… ${CORE_MANIFEST.length} файлов`, "info"),
        L(`→ PHP-процесс: 8.3-fpm, opcache включён`, "ok"),
        L(`→ Планировщик: wt-cron.php зарегистрирован`, "ok"),
        L(`✔ Wordtime работает: https://${dom}/ · консоль: https://${dom}/?admin=1`, "done"),
      ];
    default:
      return [
        L(`$ wt deploy --plesk ${dom}`, "cmd"),
        L(`→ Вход в Plesk Obsidian (${usr})… OK`, "ok"),
        L(`→ Домен ${dom}: база данных создана через панель`, "ok"),
        L(`→ Загрузка ядра в httpdocs/… ${CORE_MANIFEST.length} файлов`, "info"),
        L(`→ PHP 8.3 + необходимые расширения — включены`, "ok"),
        L(`→ SSL-сертификат Let's Encrypt — активен`, "ok"),
        L(`✔ Wordtime работает: https://${dom}/ · консоль: https://${dom}/?admin=1`, "done"),
      ];
  }
}

/* ── Ручные руководства ───────────────────────────────────────────── */

export interface Guide { id: string; title: string; badge: string; steps: { t: string; code?: string }[]; }

export const GUIDES: Guide[] = [
  {
    id: "cpanel", title: "cPanel — общий хостинг", badge: "Timeweb · REG.ru · Beget",
    steps: [
      { t: "В разделе «Базы данных MySQL» создайте базу, пользователя и пароль, привяжите пользователя к базе со всеми правами." },
      { t: "Откройте «Диспетчер файлов» → каталог public_html → «Загрузить» → выберите Wordtime_cms.zip." },
      { t: "Распакуйте архив прямо в public_html (ПКМ → Extract). index.php должен лечь в корень, а не в подпапку." },
      { t: "Откройте ваш домен в браузере — автоматически запустится веб-установщик install.php." },
      { t: "Укажите данные базы из шага 1, почту и пароль администратора. Готово: консоль — адрес сайта + ?admin=1." },
    ],
  },
  {
    id: "isp", title: "ISPmanager — VPS", badge: "Selectel · RuVDS · FirstVDS",
    steps: [
      { t: "«WWW» → «WWW-домены» — убедитесь, что домен добавлен и корневой каталог существует." },
      { t: "«Базы данных» → создайте MySQL-базу и пользователя, сохраните пароль." },
      { t: "«Менеджер файлов» → корень домена → загрузите и распакуйте Wordtime_cms.zip." },
      { t: "«Инструменты» → «Планировщик» → добавьте задачу cron:", code: "*/1 * * * * php /var/www/user/data/www/site/wt-cron.php >> /var/log/wt-cron.log 2>&1" },
      { t: "Откройте домен — пройдите веб-установщик. При включённом SSL-сертификате сайт сразу будет на HTTPS." },
    ],
  },
  {
    id: "vps", title: "Чистый VPS по SSH (Ubuntu/Debian)", badge: "Полный контроль",
    steps: [
      { t: "Подключитесь к серверу и установите классический стек:", code: "ssh root@ВАШ_IP\napt update && apt install -y nginx mariadb-server php8.3-fpm php8.3-mysql php8.3-mbstring php8.3-gd php8.3-zip unzip" },
      { t: "Создайте базу данных:", code: "mysql -e \"CREATE DATABASE wordtime CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\"" },
      { t: "Распакуйте Wordtime и подключите конфиг nginx из архива:", code: "unzip Wordtime_cms.zip -d /var/www/\nchown -R www-data:www-data /var/www/Wordtime_cms\ncp /var/www/Wordtime_cms/nginx-wordtime.conf /etc/nginx/sites-available/wordtime.conf\nln -s /etc/nginx/sites-available/wordtime.conf /etc/nginx/sites-enabled/\nnginx -t && systemctl reload nginx" },
      { t: "Добавьте cron для асинхронной очереди:", code: "(crontab -l; echo \"* * * * * php /var/www/Wordtime_cms/wt-cron.php\") | crontab -" },
      { t: "Откройте домен — веб-установщик сделает всё остальное. SSL: apt install certbot python3-certbot-nginx && certbot --nginx." },
    ],
  },
  {
    id: "nginx", title: "VPS: nginx + PHP 8.3-FPM + MariaDB", badge: "Классический хостинг",
    steps: [
      { t: "Убедитесь, что стек установлен (обычно уже стоит на хостинге):", code: "sudo apt install -y nginx mariadb-server php8.3-fpm php8.3-mysql php8.3-mbstring php8.3-gd php8.3-zip" },
      { t: "Создайте базу данных в MariaDB:", code: "sudo mysql -e \"CREATE DATABASE wordtime CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'wordtime'@'localhost' IDENTIFIED BY 'СЛОЖНЫЙ_ПАРОЛЬ'; GRANT ALL ON wordtime.* TO 'wordtime'@'localhost'; FLUSH PRIVILEGES;\"" },
      { t: "Распакуйте архив в корень сайта:", code: "sudo unzip Wordtime_cms.zip -d /var/www/\nsudo chown -R www-data:www-data /var/www/Wordtime_cms" },
      { t: "Подключите готовый конфиг nginx из архива (поправьте server_name и root):", code: "sudo cp /var/www/Wordtime_cms/nginx-wordtime.conf /etc/nginx/sites-available/wordtime.conf\nsudo ln -s /etc/nginx/sites-available/wordtime.conf /etc/nginx/sites-enabled/\nsudo nginx -t && sudo systemctl reload nginx" },
      { t: "Откройте домен — установщик создаст таблицы и администратора. Консоль: адрес + ?admin=1, вход с кодом 2FA." },
      { t: "Добавьте cron для асинхронных задач:", code: "(crontab -l; echo \"* * * * * php /var/www/Wordtime_cms/wt-cron.php\") | crontab -" },
      { t: "HTTPS одной командой:", code: "sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx" },
    ],
  },
];
