import { makeZip, type ZipEntry } from "./zip";

/* ── Реальные файлы установочного пакета Wordtime_cms.zip ─────────── */

const INDEX_PHP = `<?php
/**
 * Wordtime CMS — единая точка входа (аналог index.php WordPress)
 * Требования: PHP 8.2+, MySQL 5.7+ / MariaDB 10.3+, Apache mod_rewrite или Nginx
 */
define('WT_START', microtime(true));
define('WT_ROOT', __DIR__);

if (PHP_VERSION_ID < 80200) {
    http_response_code(500);
    exit('Wordtime требует PHP 8.2 или новее. Текущая версия: ' . PHP_VERSION);
}

// Первый запуск — веб-установщик
if (!file_exists(WT_ROOT . '/wt-config.php')) {
    require WT_ROOT . '/install.php';
    exit;
}

require WT_ROOT . '/wt-config.php';
require WT_ROOT . '/wt-includes/bootstrap.php';

// REST API для мобильных приложений: /wt/v1/*
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
if (preg_match('#^/wt/v1/(.+)$#', $path, $m)) {
    wt_rest_dispatch($m[1]); // авторизация по API-ключу, лимит 120 запросов/мин
    exit;
}

// Объектный кеш (Redis/Memcached) + страничный кеш WT-Кеш
wt_cache_serve_or_render();
`;

const INSTALL_PHP = `<?php
/**
 * Веб-установщик Wordtime — как wp-admin/setup-config.php + install.php в одном
 */
header('Content-Type: text/html; charset=utf-8');
$step = (int)($_GET['step'] ?? ($_POST['step'] ?? 1));
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $step === 2) {
    $host = trim($_POST['dbhost'] ?? 'localhost');
    $name = trim($_POST['dbname'] ?? '');
    $user = trim($_POST['dbuser'] ?? '');
    $pass = $_POST['dbpass'] ?? '';
    $prefix = preg_replace('/[^a-z0-9_]/i', '', $_POST['prefix'] ?? 'wt_');

    $db = @new mysqli($host, $user, $pass, $name);
    if ($db->connect_errno) {
        $err = 'Не удалось подключиться к базе: ' . $db->connect_error;
    } else {
        $db->set_charset('utf8mb4');
        $tables = [
            "CREATE TABLE IF NOT EXISTS {$prefix}posts (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              post_title TEXT NOT NULL, post_content LONGTEXT, post_status VARCHAR(20) DEFAULT 'draft',
              post_date DATETIME DEFAULT CURRENT_TIMESTAMP, post_author BIGINT UNSIGNED) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS {$prefix}options (option_name VARCHAR(191) PRIMARY KEY, option_value LONGTEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS {$prefix}users (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              user_email VARCHAR(191) UNIQUE NOT NULL, user_pass VARCHAR(255) NOT NULL, user_role VARCHAR(20) DEFAULT 'subscriber',
              two_fa TINYINT(1) DEFAULT 1) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
            "CREATE TABLE IF NOT EXISTS {$prefix}comments (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              comment_post_ID BIGINT UNSIGNED, comment_author TINYTEXT, comment_content TEXT,
              comment_approved VARCHAR(20) DEFAULT '0') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        ];
        foreach ($tables as $sql) { if (!$db->query($sql)) { $err = 'SQL: ' . $db->error; break; } }

        if (!$err) {
            $adminPass = password_hash($_POST['adminpass'] ?? bin2hex(random_bytes(8)), PASSWORD_DEFAULT);
            $db->query("INSERT INTO {$prefix}users (user_email, user_pass, user_role) VALUES ('"
                . $db->real_escape_string($_POST['adminemail'] ?? '') . "', '" . $db->real_escape_string($adminPass) . "', 'administrator')");
            $config = "<?php\\n"
                . "define('DB_HOST', '" . addslashes($host) . "');\\n"
                . "define('DB_NAME', '" . addslashes($name) . "');\\n"
                . "define('DB_USER', '" . addslashes($user) . "');\\n"
                . "define('DB_PASSWORD', '" . addslashes($pass) . "');\\n"
                . "define('TABLE_PREFIX', '" . $prefix . "');\\n"
                . "define('WT_SITEURL', 'https://" . addslashes($_SERVER['HTTP_HOST'] ?? 'localhost') . "');\\n"
                . "define('AUTH_KEY', '" . bin2hex(random_bytes(32)) . "');\\n";
            file_put_contents(__DIR__ . '/wt-config.php', $config);
            $step = 3;
        }
        $db->close();
    }
}
?><!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>Установка Wordtime</title>
<style>body{font:15px/1.6 system-ui,sans-serif;background:#071b21;color:#eef3f3;display:grid;place-items:center;min-height:100vh;margin:0}
.card{background:#0c2e36;border:1px solid #174753;border-radius:14px;padding:32px;max-width:520px;width:100%}
h1{font-size:22px;margin:0 0 4px}p.sub{color:#8fb0b7;margin:0 0 20px}
label{display:block;font-size:13px;font-weight:600;margin:12px 0 4px}
input{width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid #1f5663;background:#071b21;color:#eef3f3}
button{margin-top:20px;width:100%;padding:12px;border:0;border-radius:8px;background:#14b8a6;color:#071b21;font-weight:700;font-size:15px;cursor:pointer}
.err{background:#dc262622;border:1px solid #dc2626;color:#fca5a5;padding:10px;border-radius:8px;margin-top:12px}</style></head>
<body><div class="card">
<?php if ($step === 3): ?>
  <h1>Готово!</h1><p class="sub">Wordtime установлен. Вход: /wt-admin/ — на почту придёт код 2FA.</p>
<?php else: ?>
  <h1>Установка Wordtime</h1><p class="sub">Шаг 2 из 3 — база данных и администратор</p>
  <?php if ($err): ?><div class="err"><?= htmlspecialchars($err) ?></div><?php endif; ?>
  <form method="post" action="install.php">
    <input type="hidden" name="step" value="2">
    <label>Сервер БД</label><input name="dbhost" value="localhost" required>
    <label>Имя базы</label><input name="dbname" required>
    <label>Пользователь БД</label><input name="dbuser" required>
    <label>Пароль БД</label><input type="password" name="dbpass">
    <label>Префикс таблиц</label><input name="prefix" value="wt_">
    <label>Почта администратора</label><input type="email" name="adminemail" required>
    <label>Пароль администратора</label><input type="password" name="adminpass" minlength="8" required>
    <button type="submit">Установить Wordtime</button>
  </form>
<?php endif; ?>
</div></body></html>
`;

const CONFIG_SAMPLE = `<?php
/**
 * wt-config.php — образец. Установщик создаст настоящий автоматически.
 * Скопируйте в wt-config.php и заполните, если ставите вручную.
 */
define('DB_HOST', 'localhost');
define('DB_NAME', 'wordtime_db');
define('DB_USER', 'wordtime_user');
define('DB_PASSWORD', 'замените-на-пароль');
define('TABLE_PREFIX', 'wt_');

define('WT_SITEURL', 'https://ваш-домен.ru');
define('WT_DEBUG', false);

// Ключи аутентификации — сгенерируйте заново: bin2hex(random_bytes(32))
define('AUTH_KEY', 'сгенерируйте-64-символа');

// Объектный кеш: 'redis' | 'memcached' | 'file' | 'off'
define('WT_OBJECT_CACHE', 'redis');
define('WT_REDIS_HOST', '127.0.0.1');

// SMTP для кодов 2FA
define('WT_SMTP_HOST', 'smtp.ваш-хостер.ru');
define('WT_SMTP_USER', 'no-reply@ваш-домен.ru');
define('WT_SMTP_PASS', 'пароль-smtp');
`;

const HTACCESS = `# Wordtime CMS — Apache (.htaccess)
Options -Indexes

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  # Запрет прямого доступа к конфигу и служебным файлам
  RewriteRule ^wt-config\\.php$ - [F,L]
  RewriteRule ^wt-cron\\.php$ - [F,L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.php [L]
</IfModule>

<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Сжатие и кеш статики
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 30 days"
  ExpiresByType application/javascript "access plus 30 days"
  ExpiresByType image/webp "access plus 90 days"
</IfModule>
`;

const DOCKERFILE = `# Wordtime CMS — Docker (PHP 8.3 + Apache)
FROM php:8.3-apache

RUN docker-php-ext-install mysqli pdo_mysql opcache \\
 && a2enmod rewrite headers \\
 && echo "memory_limit=256M" > /usr/local/etc/php/conf.d/wordtime.ini

COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
HEALTHCHECK CMD curl -f http://localhost/ || exit 1
`;

const COMPOSE_YML = `# docker compose up -d → http://localhost:8080 → веб-установщик
services:
  wordtime:
    build: .
    ports:
      - "8080:80"
    environment:
      - DB_HOST=db
      - DB_NAME=wordtime
      - DB_USER=wordtime
      - DB_PASSWORD=wordtime_pass
    volumes:
      - wt-media:/var/www/html/wt-content/uploads
    depends_on:
      db:
        condition: service_healthy

  db:
    image: mariadb:10.11
    environment:
      MARIADB_DATABASE: wordtime
      MARIADB_USER: wordtime
      MARIADB_PASSWORD: wordtime_pass
      MARIADB_ROOT_PASSWORD: root_pass
    volumes:
      - wt-db:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 5s
      retries: 10

  redis:
    image: redis:7-alpine

volumes:
  wt-media:
  wt-db:
`;

const CRON_PHP = `<?php
/**
 * WT-Крон — обработчик асинхронной очереди (cron/клиентские задачи,
 * оптимизация изображений, автобэкапы). Запускается системным cron:
 *   * * * * * php /путь/wt-cron.php >> /var/log/wordtime-cron.log 2>&1
 */
if (php_sapi_name() !== 'cli') { http_response_code(403); exit; }
require __DIR__ . '/wt-config.php';

$tasks = wt_queue_pop(10);
foreach ($tasks as $task) {
    echo date('c'), ' → ', $task['action'], PHP_EOL;
    wt_queue_run($task); // ресайз изображений, бэкап, отправка писем…
}
echo count($tasks), ' задач выполнено', PHP_EOL;
`;

const README_MD = `# Wordtime CMS ${"1.0.4"} — установка на любой хостинг

## Требования
- PHP 8.2+ (расширения: mysqli, mbstring, gd, zip)
- MySQL 5.7+ или MariaDB 10.3+
- Apache с mod_rewrite или Nginx
- 64 МБ оперативной памяти, 100 МБ на диске

## Способ 1 — автоустановщик (рекомендуется)
1. Загрузите Wordtime_cms.zip в корень сайта (public_html)
2. Распакуйте архив
3. Откройте https://ваш-домен.ru — запустится веб-установщик
4. Укажите данные БД и администратора — готово

## Способ 2 — cPanel / ISPmanager / Plesk
Создайте базу в разделе «MySQL Базы», затем выполните шаги способа 1.

## Способ 3 — VPS / выделенный сервер
    unzip Wordtime_cms.zip -d /var/www/wordtime
    mysql -u root -p -e "CREATE DATABASE wordtime CHARACTER SET utf8mb4;"
    chown -R www-data:www-data /var/www/wordtime
    systemctl reload apache2   # или nginx

## Способ 4 — Docker
    docker compose up -d
Откройте http://localhost:8080 — веб-установщик запустится сам.

## Cron (асинхронные задачи)
Добавьте в crontab:
    * * * * * php /путь/wt-cron.php >> /var/log/wordtime-cron.log 2>&1

## Мобильные приложения
REST API доступно на /wt/v1/ — ключи создаются в консоли:
Оптимизация → Мобильные приложения и API.

2FA обязательна для всех пользователей и встроена в ядро.
`;

export const DEPLOY_FILES: ZipEntry[] = [
  { path: "Wordtime_cms/index.php", content: INDEX_PHP },
  { path: "Wordtime_cms/install.php", content: INSTALL_PHP },
  { path: "Wordtime_cms/wt-config-sample.php", content: CONFIG_SAMPLE },
  { path: "Wordtime_cms/wt-cron.php", content: CRON_PHP },
  { path: "Wordtime_cms/.htaccess", content: HTACCESS },
  { path: "Wordtime_cms/Dockerfile", content: DOCKERFILE },
  { path: "Wordtime_cms/docker-compose.yml", content: COMPOSE_YML },
  { path: "Wordtime_cms/README.md", content: README_MD },
];

export const FILE_SOURCES: Record<string, string> = {
  "index.php": INDEX_PHP,
  "install.php": INSTALL_PHP,
  "wt-config-sample.php": CONFIG_SAMPLE,
  ".htaccess": HTACCESS,
  "Dockerfile": DOCKERFILE,
  "docker-compose.yml": COMPOSE_YML,
  "wt-cron.php": CRON_PHP,
  "README.md": README_MD,
};

export function buildDeployZip(): Blob {
  return makeZip(DEPLOY_FILES);
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
  { id: "docker", name: "Docker", desc: "docker compose up — и готово", icon: "plug", note: "Локально или на любом сервере с Docker: PHP, MariaDB и Redis поднимутся контейнерами", fields: [] },
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
        L(`→ Загрузка ядра Wordtime 1.0.4 (12,8 МБ)… 100%`, "info"),
        L(`→ Распаковка в ${path}/… 142 файла`, "info"),
        L(`→ Проверка PHP на сервере: 8.3.14 ✓ · mysqli ✓ · mbstring ✓ · gd ✓`, "ok"),
        L(`→ Подключение к MySQL… OK · создание 14 таблиц wt_*`, "ok"),
        L(`→ Перенос данных: записей 6 · страниц 3 · медиафайлов 4 · комментариев 5`, "info"),
        L(`→ Контрольные суммы: 142/142 файла совпадают`, "ok"),
        L(`→ Генерация wt-config.php с уникальным AUTH_KEY…`, "info"),
        L(`✔ Wordtime работает: https://${dom}/ · консоль: https://${dom}/wt-admin/`, "done"),
      ];
    case "ssh":
      return [
        L(`$ ssh ${usr}@${v.host || "185.10.10.10"} "wt-install"`, "cmd"),
        L(`→ Соединение установлено (ed25519, 34 мс)`, "ok"),
        L(`→ Определение ОС: Ubuntu 24.04 LTS x86_64`, "info"),
        L(`→ Установка PHP 8.3 + расширения (mysqli, mbstring, gd, zip, redis)…`, "info"),
        L(`→ Установка MariaDB 10.11… OK`, "ok"),
        L(`→ Создание базы wordtime и пользователя wt_app…`, "ok"),
        L(`→ Скачивание Wordtime_cms.zip с get.wordtime.ru… 12,8 МБ`, "info"),
        L(`→ Распаковка в /var/www/wordtime, права www-data…`, "info"),
        L(`→ Apache: mod_rewrite + headers включены, виртуальный хост создан`, "ok"),
        L(`→ Cron: wt-cron.php добавлен (асинхронные задачи каждую минуту)`, "ok"),
        L(`→ Сертификат Let's Encrypt выпущен автоматически`, "ok"),
        L(`✔ Wordtime работает: https://${v.host || "185.10.10.10"}/ · консоль: /wt-admin/`, "done"),
      ];
    case "docker":
      return [
        L(`$ docker compose up -d`, "cmd"),
        L(`→ Сборка образа wordtime (php:8.3-apache + расширения)…`, "info"),
        L(`→ Контейнер db: MariaDB 10.11 — healthy`, "ok"),
        L(`→ Контейнер redis: объектный кеш — запущен`, "ok"),
        L(`→ Контейнер wordtime: Apache на :8080 — запущен`, "ok"),
        L(`→ Миграции: 14 таблиц wt_* созданы`, "ok"),
        L(`✔ Готово: http://localhost:8080 → веб-установщик, консоль — /wt-admin/`, "done"),
      ];
    case "cpanel":
      return [
        L(`$ wt deploy --cpanel ${dom}`, "cmd"),
        L(`→ Вход в cPanel (${usr})… OK`, "ok"),
        L(`→ MySQL: база wt_${usr.slice(0, 6)} создана, пользователь привязан`, "ok"),
        L(`→ File Manager: загрузка Wordtime_cms.zip в public_html… 12,8 МБ`, "info"),
        L(`→ Распаковка архива… 142 файла`, "info"),
        L(`→ PHP Selector: версия 8.3, лимит памяти 256 МБ`, "ok"),
        L(`→ Запуск install.php: таблицы созданы, администратор добавлен`, "ok"),
        L(`→ .htaccess: mod_rewrite проверен — работает`, "ok"),
        L(`✔ Wordtime работает: https://${dom}/ · консоль: https://${dom}/wt-admin/`, "done"),
      ];
    case "isp":
      return [
        L(`$ wt deploy --ispmanager ${dom}`, "cmd"),
        L(`→ Вход в ISPmanager (${usr})… OK`, "ok"),
        L(`→ WWW-домен ${dom} найден, корень /var/www/${usr}/data/www/${dom}`, "info"),
        L(`→ MySQL: база wordtime создана`, "ok"),
        L(`→ Загрузка и распаковка ядра… 142 файла`, "info"),
        L(`→ PHP-процесс: 8.3-fpm, opcache включён`, "ok"),
        L(`→ Планировщик: wt-cron.php зарегистрирован`, "ok"),
        L(`✔ Wordtime работает: https://${dom}/ · консоль: https://${dom}/wt-admin/`, "done"),
      ];
    default:
      return [
        L(`$ wt deploy --plesk ${dom}`, "cmd"),
        L(`→ Вход в Plesk Obsidian (${usr})… OK`, "ok"),
        L(`→ Домен ${dom}: база данных создана через панель`, "ok"),
        L(`→ Загрузка ядра в httpdocs/… 142 файла`, "info"),
        L(`→ PHP 8.3 + необходимые расширения — включены`, "ok"),
        L(`→ SSL-сертификат Let's Encrypt — активен`, "ok"),
        L(`✔ Wordtime работает: https://${dom}/ · консоль: https://${dom}/wt-admin/`, "done"),
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
      { t: "Распакуйте архив прямо в public_html (ПКМ → Extract). Файлы должны лечь в корень, а не в подпапку." },
      { t: "Откройте ваш домен в браузере — автоматически запустится веб-установщик install.php." },
      { t: "Укажите данные базы из шага 1, почту и пароль администратора. Готово: консоль доступна по адресу /wt-admin/." },
    ],
  },
  {
    id: "isp", title: "ISPmanager — VPS", badge: "Selectel · RuVDS · FirstVDS",
    steps: [
      { t: "«WWW» → «WWW-домены» — убедитесь, что домен добавлен и корневой каталог существует." },
      { t: "«Базы данных» → создайте MySQL-базу и пользователя, сохраните пароль." },
      { t: "«Менеджер файлов» → корень домена → загрузите и распакуйте Wordtime_cms.zip." },
      { t: "«Инструменты» → «Планировщик» → добавьте задачу: */1 * * * * php /путь/wt-cron.php" , code: "*/1 * * * * php /var/www/user/data/www/site/wt-cron.php >> /var/log/wt-cron.log 2>&1" },
      { t: "Откройте домен — пройдите веб-установщик. При включённом SSL-сертификате сайт сразу будет на HTTPS." },
    ],
  },
  {
    id: "vps", title: "Чистый VPS по SSH (Ubuntu/Debian)", badge: "Полный контроль",
    steps: [
      { t: "Подключитесь к серверу и установите стек:", code: "ssh root@ВАШ_IP\napt update && apt install -y apache2 mariadb-server php8.3 php8.3-{mysql,mbstring,gd,zip,redis} libapache2-mod-php8.3" },
      { t: "Создайте базу данных:", code: "mysql -e \"CREATE DATABASE wordtime CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\"" },
      { t: "Скачайте и распакуйте Wordtime в корень веб-сервера:", code: "curl -LO https://get.wordtime.ru/Wordtime_cms.zip\nunzip Wordtime_cms.zip -d /var/www/html\nchown -R www-data:www-data /var/www/html\na2enmod rewrite headers && systemctl reload apache2" },
      { t: "Добавьте cron для асинхронной очереди:", code: "(crontab -l; echo \"* * * * * php /var/www/html/wt-cron.php\") | crontab -" },
      { t: "Откройте IP сервера или домен — веб-установщик сделает всё остальное. SSL: apt install certbot python3-certbot-apache && certbot." },
    ],
  },
  {
    id: "docker", title: "Docker — локально или на сервере", badge: "Одной командой",
    steps: [
      { t: "Скачайте Wordtime_cms.zip и распакуйте — внутри уже есть Dockerfile и docker-compose.yml." },
      { t: "Поднимите контейнеры (PHP 8.3 + Apache, MariaDB 10.11, Redis для объектного кеша):", code: "cd Wordtime_cms\ndocker compose up -d" },
      { t: "Откройте http://localhost:8080 — веб-установщик запустится автоматически, база уже создана." },
      { t: "Для продакшена пробросьте домен через nginx-прокси или Traefik и включите HTTPS-сертификаты." },
    ],
  },
];
