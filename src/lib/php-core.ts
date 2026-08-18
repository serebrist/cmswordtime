import type { ZipEntry } from "./zip";

/* ════════════════════════════════════════════════════════════════════
   Wordtime CMS 1.1 — ПОЛНОЕ PHP-ЯДРО для классических хостингов
   Стек: nginx (или Apache) + PHP 7.4–8.3 (FPM) + MySQL/MariaDB
   Без Composer, без Docker, без внешних зависимостей.
   ════════════════════════════════════════════════════════════════════ */

const INDEX_PHP = String.raw`<?php
/**
 * Wordtime CMS 1.1 — публичный сайт (фронт-контроллер)
 * Работает на классическом хостинге: nginx / Apache + PHP-FPM + MariaDB
 * Маршрутизация через ?p=... — не требует правок конфигурации сервера.
 *
 *   ?p=home      — главная (лента записей)
 *   ?p=post&id=N — запись        ?p=page&id=N — страница
 *   ?p=search&q= — поиск         ?p=category&c= — рубрика
 *   ?p=rest&path=posts — REST API для мобильных приложений
 *   ?p=sitemap / ?p=robots — для поисковых систем
 */
define('WT_START', microtime(true));
define('WT_ROOT', __DIR__);

/* Первый запуск — перенаправляем на веб-установщик */
if (!file_exists(WT_ROOT . '/wt-config.php')) {
    header('Location: install.php');
    exit;
}

require WT_ROOT . '/wt-config.php';
require WT_ROOT . '/wt-includes/bootstrap.php';

/* Действия посетителей (комментарии, подписки) — до вывода темы */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['wt_action'] ?? '';
    if ($action === 'comment') { wt_handle_comment(); exit; }
}

$p = isset($_GET['p']) ? preg_replace('/[^a-z0-9_-]/i', '', $_GET['p']) : 'home';

if ($p === 'rest')    { wt_rest_dispatch(isset($_GET['path']) ? $_GET['path'] : ''); exit; }
if ($p === 'sitemap') { wt_sitemap(); exit; }
if ($p === 'robots')  { wt_robots(); exit; }

/* Тема оформления (иерархия шаблонов, как в WordPress) */
$theme = wt_get_option('theme', 'wordtime-twenty');
$theme_dir = WT_ROOT . '/wt-content/themes/' . $theme;
if (file_exists($theme_dir . '/functions.php')) require $theme_dir . '/functions.php';
require $theme_dir . '/index.php';
`;

const INSTALL_PHP = String.raw`<?php
/**
 * Wordtime CMS 1.1 — веб-установщик (аналог wp-admin/install.php)
 * Шаги: 1) проверка окружения  2) база + сайт + администратор  3) готово
 */
header('Content-Type: text/html; charset=utf-8');
define('WT_ROOT', __DIR__);
$step = isset($_REQUEST['step']) ? (int)$_REQUEST['step'] : 1;
$err = '';

$checks = [
    ['PHP 7.4 или новее', version_compare(PHP_VERSION, '7.4.0', '>='), 'Текущая версия: ' . PHP_VERSION],
    ['Расширение PDO MySQL', extension_loaded('pdo_mysql'), 'Нужно для работы с базой'],
    ['Расширение mbstring', extension_loaded('mbstring'), 'Нужно для UTF-8'],
    ['Папка записываема', is_writable(WT_ROOT), 'Права на каталог сайта'],
];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $step === 2) {
    $host   = trim($_POST['dbhost'] ?? 'localhost');
    $name   = trim($_POST['dbname'] ?? '');
    $user   = trim($_POST['dbuser'] ?? '');
    $pass   = $_POST['dbpass'] ?? '';
    $prefix = preg_replace('/[^a-z0-9_]/i', '', $_POST['prefix'] ?? 'wt_');
    if ($prefix === '') $prefix = 'wt_';
    $site    = trim($_POST['sitename'] ?? 'Мой сайт');
    $tagline = trim($_POST['tagline'] ?? 'Сайт на Wordtime');
    $email   = trim($_POST['adminemail'] ?? '');
    $apass   = $_POST['adminpass'] ?? '';
    $aname   = trim($_POST['adminname'] ?? 'Администратор');

    if ($name === '' || $user === '' || $email === '' || strlen($apass) < 8) {
        $err = 'Заполните все поля. Пароль администратора — не короче 8 символов.';
    } else {
        try {
            $db = new PDO('mysql:host=' . $host . ';charset=utf8mb4', $user, $pass,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            $db->exec("CREATE DATABASE IF NOT EXISTS " . preg_replace('/[^a-z0-9_]/i', '', $name) . " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $db->exec("USE " . preg_replace('/[^a-z0-9_]/i', '', $name));
            $db->exec("SET NAMES utf8mb4");

            $db->exec("CREATE TABLE IF NOT EXISTS {$prefix}posts (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                post_title VARCHAR(500) NOT NULL, post_content LONGTEXT,
                post_excerpt VARCHAR(500) DEFAULT '', post_type VARCHAR(20) DEFAULT 'post',
                post_status VARCHAR(20) DEFAULT 'draft', post_category VARCHAR(191) DEFAULT 'Без рубрики',
                post_date DATETIME DEFAULT CURRENT_TIMESTAMP, post_author VARCHAR(191) DEFAULT '',
                post_views BIGINT UNSIGNED DEFAULT 0, INDEX idx_status (post_status, post_type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $db->exec("CREATE TABLE IF NOT EXISTS {$prefix}users (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_email VARCHAR(191) UNIQUE NOT NULL, user_pass VARCHAR(255) NOT NULL,
                user_name VARCHAR(191) DEFAULT '', user_role VARCHAR(20) DEFAULT 'subscriber',
                two_fa TINYINT(1) DEFAULT 1, created DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $db->exec("CREATE TABLE IF NOT EXISTS {$prefix}comments (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                comment_post_id BIGINT UNSIGNED NOT NULL, comment_author VARCHAR(191) DEFAULT '',
                comment_email VARCHAR(191) DEFAULT '', comment_content TEXT,
                comment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                comment_approved VARCHAR(20) DEFAULT '0', INDEX idx_post (comment_post_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $db->exec("CREATE TABLE IF NOT EXISTS {$prefix}options (
                option_name VARCHAR(191) PRIMARY KEY, option_value LONGTEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $db->exec("CREATE TABLE IF NOT EXISTS {$prefix}queue (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                action VARCHAR(100) NOT NULL, payload LONGTEXT, created DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            /* стартовое содержимое */
            $st = $db->prepare("INSERT INTO {$prefix}posts (post_title, post_content, post_excerpt, post_type, post_status, post_category, post_author) VALUES (?,?,?,?,?,?,?)");
            $st->execute(['Добро пожаловать в Wordtime!',
                "Это первая запись вашего нового сайта.\n\nWordtime — это CMS с обязательной двухфакторной аутентификацией, встроенным резервным копированием, объектным кешем и REST API для мобильных приложений.\n\nЗаписи, страницы и комментарии редактируются в консоли: откройте /wt-admin/ и войдите с кодом из письма.",
                'Первая запись нового сайта на Wordtime', 'post', 'publish', 'Новости', $aname]);
            $st->execute(['О сайте', "Эта страница создана автоматически при установке Wordtime.\n\nОтредактируйте её в консоли: Страницы → О сайте.", 'Страница о сайте', 'page', 'publish', '', $aname]);

            $hash = password_hash($apass, PASSWORD_DEFAULT);
            $db->prepare("INSERT INTO {$prefix}users (user_email, user_pass, user_name, user_role, two_fa) VALUES (?,?,?,?,1)")
               ->execute([$email, $hash, $aname, 'administrator']);

            $opt = $db->prepare("INSERT INTO {$prefix}options (option_name, option_value) VALUES (?,?)");
            foreach ([
                'site_title' => $site, 'tagline' => $tagline, 'admin_email' => $email,
                'theme' => 'wordtime-twenty', 'version' => '1.1.0',
                'comments_disabled' => '0', 'moderate_first' => '1',
                'cache_enabled' => '1', 'cache_last_flush' => date('d.m.Y H:i'),
                'api_keys' => '[]', 'bf_store' => '{}',
            ] as $k => $v) $opt->execute([$k, $v]);

            /* конфиг с уникальными ключами */
            $proto = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            $siteurl = $proto . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
            $cfg = "<?php\n"
                . "/* wt-config.php — создан установщиком Wordtime " . date('d.m.Y H:i') . " */\n"
                . "define('DB_HOST', '" . addslashes($host) . "');\n"
                . "define('DB_NAME', '" . addslashes($name) . "');\n"
                . "define('DB_USER', '" . addslashes($user) . "');\n"
                . "define('DB_PASSWORD', '" . addslashes($pass) . "');\n"
                . "define('TABLE_PREFIX', '" . $prefix . "');\n"
                . "define('WT_SITEURL', '" . addslashes($siteurl) . "');\n"
                . "define('WT_DEBUG', false);\n"
                . "define('WT_THEME', 'wordtime-twenty');\n"
                . "define('AUTH_KEY', '" . bin2hex(random_bytes(32)) . "');\n"
                . "define('SECURE_AUTH_KEY', '" . bin2hex(random_bytes(32)) . "');\n"
                . "define('LOGGED_IN_KEY', '" . bin2hex(random_bytes(32)) . "');\n";
            if (file_put_contents(WT_ROOT . '/wt-config.php', $cfg) === false) {
                $err = 'Не удалось записать wt-config.php — проверьте права на каталог сайта.';
            } else {
                $step = 3;
            }
        } catch (PDOException $e) {
            $err = 'Ошибка базы данных: ' . $e->getMessage();
        }
    }
}
?><!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Установка Wordtime</title>
<style>
 *{box-sizing:border-box} body{font:15px/1.6 system-ui,-apple-system,sans-serif;background:#071b21;color:#eef3f3;margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}
 .card{background:#0c2e36;border:1px solid #174753;border-radius:14px;padding:34px;max-width:560px;width:100%;box-shadow:0 24px 60px -20px rgba(0,0,0,.6)}
 h1{font-size:24px;margin:0 0 4px;letter-spacing:-.02em} .sub{color:#8fb0b7;margin:0 0 22px;font-size:14px}
 label{display:block;font-size:13px;font-weight:600;margin:14px 0 5px;color:#bcd7db}
 input{width:100%;padding:11px 12px;border-radius:9px;border:1px solid #1f5663;background:#071b21;color:#eef3f3;font-size:14px}
 input:focus{outline:none;border-color:#14b8a6}
 .row{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
 button{margin-top:24px;width:100%;padding:13px;border:0;border-radius:9px;background:#14b8a6;color:#071b21;font-weight:800;font-size:15px;cursor:pointer}
 button:hover{background:#2dd4bf}
 .err{background:rgba(220,38,38,.15);border:1px solid rgba(220,38,38,.5);color:#fca5a5;padding:11px 13px;border-radius:9px;margin-top:14px;font-size:13.5px}
 .chk{display:flex;gap:12px;align-items:flex-start;padding:11px 0;border-bottom:1px solid #123844;font-size:14px}
 .chk b{display:block} .chk span{color:#8fb0b7;font-size:12.5px}
 .ok{color:#34d399;font-weight:800} .no{color:#f87171;font-weight:800}
 .links a{color:#2dd4bf}
 code{background:#071b21;border:1px solid #1f5663;padding:2px 7px;border-radius:6px;font-size:13px}
</style></head>
<body><div class="card">
<?php if ($step === 1): $allok = true; foreach ($checks as $c) if (!$c[1]) $allok = false; ?>
  <h1>Установка Wordtime</h1>
  <p class="sub">Шаг 1 из 3 — проверка окружения хостинга</p>
  <?php foreach ($checks as $c): ?>
    <div class="chk"><span class="<?= $c[1] ? 'ok' : 'no' ?>"><?= $c[1] ? '✓' : '✗' ?></span><div><b><?= htmlspecialchars($c[0]) ?></b><span><?= htmlspecialchars($c[2]) ?></span></div></div>
  <?php endforeach; ?>
  <?php if ($allok): ?><a href="install.php?step=2"><button type="button">Продолжить установку →</button></a>
  <?php else: ?><div class="err">Хостинг не соответствует требованиям. Обратитесь к поддержке хостера или смените версию PHP в панели.</div><?php endif; ?>

<?php elseif ($step === 2): ?>
  <h1>Установка Wordtime</h1>
  <p class="sub">Шаг 2 из 3 — база данных и администратор</p>
  <?php if ($err !== ''): ?><div class="err"><?= htmlspecialchars($err) ?></div><?php endif; ?>
  <form method="post" action="install.php">
    <input type="hidden" name="step" value="2">
    <label>Сервер базы данных</label><input name="dbhost" value="localhost" required>
    <div class="row">
      <div><label>Имя базы</label><input name="dbname" required placeholder="wordtime_db"></div>
      <div><label>Префикс таблиц</label><input name="prefix" value="wt_"></div>
    </div>
    <div class="row">
      <div><label>Пользователь БД</label><input name="dbuser" required></div>
      <div><label>Пароль БД</label><input type="password" name="dbpass"></div>
    </div>
    <label>Название сайта</label><input name="sitename" value="Мой сайт" required>
    <label>Краткое описание</label><input name="tagline" value="Сайт на Wordtime">
    <label>Ваше имя</label><input name="adminname" value="Администратор">
    <label>Почта администратора (на неё приходят коды 2FA)</label><input type="email" name="adminemail" required>
    <label>Пароль администратора (минимум 8 символов)</label><input type="password" name="adminpass" minlength="8" required>
    <button type="submit">Установить Wordtime</button>
  </form>

<?php else: ?>
  <h1>Wordtime установлен!</h1>
  <p class="sub">Шаг 3 из 3 — готово</p>
  <div class="chk"><span class="ok">✓</span><div><b>База данных</b><span>Таблицы созданы, стартовое содержимое добавлено</span></div></div>
  <div class="chk"><span class="ok">✓</span><div><b>Администратор</b><span>Двухфакторная аутентификация включена</span></div></div>
  <div class="chk"><span class="ok">✓</span><div><b>Конфигурация</b><span>wt-config.php записан с уникальными ключами</span></div></div>
  <p class="links" style="margin-top:22px">
    Ваш сайт: <a href="./">открыть →</a><br>
    Консоль управления: <a href="wt-admin/"><code>/wt-admin/</code> →</a>
  </p>
  <p class="sub" style="margin-top:18px">Рекомендуем удалить файл <code>install.php</code> после установки.</p>
<?php endif; ?>
</div></body></html>
`;

const CONFIG_SAMPLE = String.raw`<?php
/**
 * wt-config-sample.php — образец конфигурации Wordtime.
 * Веб-установщик создаёт wt-config.php автоматически.
 * Этот файл нужен только для ручной установки.
 */

/* ── База данных (MariaDB / MySQL) ── */
define('DB_HOST', 'localhost');
define('DB_NAME', 'wordtime_db');
define('DB_USER', 'wordtime_user');
define('DB_PASSWORD', 'замените-на-пароль');
define('TABLE_PREFIX', 'wt_');

/* ── Сайт ── */
define('WT_SITEURL', 'https://ваш-домен.ru');
define('WT_DEBUG', false);          /* true — показывать ошибки (только для отладки) */
define('WT_THEME', 'wordtime-twenty');

/* ── Ключи аутентификации — сгенерируйте свои:
      php -r "echo bin2hex(random_bytes(32));"        */
define('AUTH_KEY',        'сгенерируйте-64-символа');
define('SECURE_AUTH_KEY', 'сгенерируйте-64-символа');
define('LOGGED_IN_KEY',   'сгенерируйте-64-символа');
`;

const BOOTSTRAP_PHP = String.raw`<?php
/**
 * Wordtime CMS 1.1 — ядро (bootstrap)
 * Стек: nginx + PHP 8.3-FPM + MariaDB (работает и на PHP 7.4+, и на Apache)
 *
 * Встроено в ядро:
 *  • PDO + prepared statements — защита от SQL-инъекций
 *  • экранирование вывода — защита от XSS
 *  • детектор инъекций на входе форм
 *  • 2FA по почте + блокировка подбора пароля (5 попыток → 60 сек)
 *  • CSRF-нонсы для всех форм
 *  • хуки add_action/add_filter — слой совместимости с плагинами WordPress
 *  • файловый объектный и страничный кеш
 *  • REST API /?p=rest для мобильных приложений (X-WT-Key)
 *  • sitemap.xml и robots.txt
 *  • очередь асинхронных задач (wt-cron.php)
 */

if (!defined('WT_ROOT')) exit;

error_reporting(WT_DEBUG ? E_ALL : 0);
ini_set('display_errors', WT_DEBUG ? '1' : '0');
if (function_exists('mb_internal_encoding')) mb_internal_encoding('UTF-8');

/* ── База данных ─────────────────────────────────────────────────── */
function wt_db() {
    static $db = null;
    if ($db === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $db = new PDO($dsn, DB_USER, DB_PASSWORD, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $db->exec("SET NAMES utf8mb4");
    }
    return $db;
}

/* ── Хуки (совместимость с плагинами WordPress) ──────────────────── */
$GLOBALS['wt_actions'] = [];
$GLOBALS['wt_filters'] = [];
function wt_add_action($hook, $fn, $prio = 10) { $GLOBALS['wt_actions'][$hook][$prio][] = $fn; }
function wt_do_action($hook) {
    $args = func_get_args(); array_shift($args);
    if (empty($GLOBALS['wt_actions'][$hook])) return;
    $levels = $GLOBALS['wt_actions'][$hook]; ksort($levels);
    foreach ($levels as $fns) foreach ($fns as $fn) call_user_func_array($fn, $args);
}
function wt_add_filter($hook, $fn, $prio = 10) { $GLOBALS['wt_filters'][$hook][$prio][] = $fn; }
function wt_apply_filters($hook, $value) {
    $args = func_get_args(); array_shift($args);
    if (empty($GLOBALS['wt_filters'][$hook])) return $value;
    $levels = $GLOBALS['wt_filters'][$hook]; ksort($levels);
    foreach ($levels as $fns) foreach ($fns as $fn) { $args[0] = $value; $value = call_user_func_array($fn, $args); }
    return $value;
}
/* алиасы в стиле WordPress — плагины подключаются без переписывания */
if (!function_exists('add_action'))     { function add_action($h, $f, $p = 10) { wt_add_action($h, $f, $p); } }
if (!function_exists('add_filter'))     { function add_filter($h, $f, $p = 10) { wt_add_filter($h, $f, $p); } }
if (!function_exists('do_action'))      { function do_action($h) { $a = func_get_args(); call_user_func_array('wt_do_action', $a); } }
if (!function_exists('apply_filters'))  { function apply_filters($h, $v) { $a = func_get_args(); return call_user_func_array('wt_apply_filters', $a); } }

/* ── Опции ───────────────────────────────────────────────────────── */
function wt_get_option($name, $default = '') {
    static $cache = null;
    if ($cache === null) {
        $cache = [];
        try {
            foreach (wt_db()->query("SELECT option_name, option_value FROM " . TABLE_PREFIX . "options") as $r)
                $cache[$r['option_name']] = $r['option_value'];
        } catch (PDOException $e) { /* база ещё не установлена */ }
    }
    return isset($cache[$name]) ? $cache[$name] : $default;
}
function wt_update_option($name, $value) {
    wt_db()->prepare("INSERT INTO " . TABLE_PREFIX . "options (option_name, option_value) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE option_value = VALUES(option_value)")->execute([$name, $value]);
}

/* ── Экранирование (анти-XSS) ────────────────────────────────────── */
function wt_esc($s)      { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function wt_esc_attr($s) { return wt_esc($s); }
function wt_esc_url($s)  { return str_replace(['"', "'", '<', '>'], '', (string)$s); }

/* ── Анти-инъекции на входе ──────────────────────────────────────── */
function wt_detect_injection($s) {
    $bad = '/(<script|javascript:|onerror\s*=|onload\s*=|union\s+select|information_schema|drop\s+table|;\s*--|\bexec\s*\()/i';
    return (bool)preg_match($bad, (string)$s);
}
function wt_sanitize($s) { return trim(strip_tags((string)$s)); }

/* ── Кеш: файловый объектный + страничный ────────────────────────── */
function wt_cache_dir() {
    $d = WT_ROOT . '/wt-content/cache';
    if (!is_dir($d)) @mkdir($d, 0755, true);
    return $d;
}
function wt_cache_get($key) {
    if (wt_get_option('cache_enabled', '1') !== '1') return null;
    $f = wt_cache_dir() . '/' . md5($key) . '.cache';
    if (!is_file($f)) return null;
    $d = @unserialize(file_get_contents($f));
    if (!is_array($d) || $d['exp'] < time()) return null;
    return $d['val'];
}
function wt_cache_set($key, $val, $ttl = 3600) {
    if (wt_get_option('cache_enabled', '1') !== '1') return;
    @file_put_contents(wt_cache_dir() . '/' . md5($key) . '.cache',
        serialize(['exp' => time() + $ttl, 'val' => $val]));
}
function wt_cache_flush() {
    $n = 0;
    foreach (glob(wt_cache_dir() . '/*.cache') as $f) { @unlink($f); $n++; }
    wt_update_option('cache_last_flush', date('d.m.Y H:i'));
    return $n;
}
function wt_cache_size_kb() {
    $s = 0;
    foreach (glob(wt_cache_dir() . '/*.cache') as $f) $s += filesize($f);
    return round($s / 1024, 1);
}

/* ── Записи и страницы ───────────────────────────────────────────── */
function wt_get_posts($type = 'post', $status = 'publish', $limit = 50) {
    $key = 'posts_' . $type . '_' . $status . '_' . $limit;
    if (($c = wt_cache_get($key)) !== null) return $c;
    $st = wt_db()->prepare("SELECT * FROM " . TABLE_PREFIX . "posts
        WHERE post_type = ? AND post_status = ? ORDER BY post_date DESC LIMIT " . (int)$limit);
    $st->execute([$type, $status]);
    $rows = $st->fetchAll();
    wt_cache_set($key, $rows);
    return $rows;
}
function wt_get_post($id) {
    $st = wt_db()->prepare("SELECT * FROM " . TABLE_PREFIX . "posts WHERE id = ?");
    $st->execute([(int)$id]);
    return $st->fetch();
}
function wt_the_content($text) {
    $html = '';
    foreach (preg_split('/\n{2,}/', trim((string)$text)) as $par) {
        $par = trim($par);
        if ($par !== '') $html .= '<p>' . nl2br(wt_esc($par)) . '</p>';
    }
    return wt_apply_filters('the_content', $html);
}
function wt_the_excerpt($post) {
    if (!empty($post['post_excerpt'])) return wt_esc($post['post_excerpt']);
    return wt_esc(mb_substr(strip_tags($post['post_content']), 0, 160)) . '…';
}

/* ── Комментарии ─────────────────────────────────────────────────── */
function wt_get_comments($post_id, $only_approved = true) {
    $sql = "SELECT * FROM " . TABLE_PREFIX . "comments WHERE comment_post_id = ?";
    if ($only_approved) $sql .= " AND comment_approved = '1'";
    $sql .= " ORDER BY comment_date ASC";
    $st = wt_db()->prepare($sql);
    $st->execute([(int)$post_id]);
    return $st->fetchAll();
}
function wt_handle_comment() {
    if (wt_get_option('comments_disabled', '0') === '1') { header('Location: ' . WT_SITEURL . '/'); exit; }
    if (!wt_check_nonce($_POST['wt_nonce'] ?? '')) { http_response_code(403); exit('CSRF'); }
    $post_id = (int)($_POST['post_id'] ?? 0);
    $author  = wt_sanitize($_POST['author'] ?? '');
    $email   = wt_sanitize($_POST['email'] ?? '');
    $text    = wt_sanitize($_POST['text'] ?? '');
    if ($post_id < 1 || $author === '' || $text === '' || wt_detect_injection($author . $text)) {
        header('Location: ' . WT_SITEURL . '/?p=post&id=' . $post_id . '&cerr=1'); exit;
    }
    $approved = wt_get_option('moderate_first', '1') === '1' ? '0' : '1';
    wt_db()->prepare("INSERT INTO " . TABLE_PREFIX . "comments
        (comment_post_id, comment_author, comment_email, comment_content, comment_approved)
        VALUES (?,?,?,?,?)")->execute([$post_id, $author, $email, $text, $approved]);
    wt_do_action('comment_post', $post_id);
    header('Location: ' . WT_SITEURL . '/?p=post&id=' . $post_id . '&cok=1');
    exit;
}

/* ── Сессии, CSRF, почта ─────────────────────────────────────────── */
if (session_status() === PHP_SESSION_NONE) { session_name('WTSID'); session_start(); }
function wt_nonce() {
    if (empty($_SESSION['wt_nonce'])) $_SESSION['wt_nonce'] = bin2hex(random_bytes(16));
    return $_SESSION['wt_nonce'];
}
function wt_check_nonce($n) { return isset($_SESSION['wt_nonce']) && hash_equals($_SESSION['wt_nonce'], (string)$n); }

function wt_send_mail($to, $subject, $body) {
    $from = 'Wordtime <no-reply@' . (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost') . '>';
    $headers = "From: " . $from . "\r\nContent-Type: text/plain; charset=utf-8\r\n";
    return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);
}

/* ── Вход: пароль + 2FA + защита от подбора ──────────────────────── */
function wt_bf_get($email) {
    $store = json_decode(wt_get_option('bf_store', '{}'), true);
    if (!is_array($store)) $store = [];
    $k = md5(strtolower($email));
    return isset($store[$k]) ? $store[$k] : ['count' => 0, 'until' => 0];
}
function wt_bf_set($email, $count, $until) {
    $store = json_decode(wt_get_option('bf_store', '{}'), true);
    if (!is_array($store)) $store = [];
    $store[md5(strtolower($email))] = ['count' => $count, 'until' => $until];
    wt_update_option('bf_store', json_encode($store));
}
function wt_bf_seconds_left($email) {
    $r = wt_bf_get($email);
    return $r['until'] > time() ? $r['until'] - time() : 0;
}
function wt_try_password_login($email, $password) {
    if (wt_detect_injection($email) || wt_detect_injection($password))
        return ['ok' => false, 'error' => 'Ввод содержит запрещённые конструкции.'];
    $left = wt_bf_seconds_left($email);
    if ($left > 0)
        return ['ok' => false, 'error' => 'Сработала защита от подбора паролей. Повторите через ' . $left . ' сек.'];
    $st = wt_db()->prepare("SELECT * FROM " . TABLE_PREFIX . "users WHERE user_email = ?");
    $st->execute([strtolower(trim($email))]);
    $u = $st->fetch();
    $ok = $u && password_verify($password, $u['user_pass']);
    if (!$ok) {
        $r = wt_bf_get($email);
        $count = $r['count'] + 1;
        if ($count >= 5) { wt_bf_set($email, 0, time() + 60); return ['ok' => false, 'error' => '5 неудачных попыток. Вход заблокирован на 60 секунд.']; }
        wt_bf_set($email, $count, 0);
        return ['ok' => false, 'error' => 'Неверная почта или пароль. Осталось попыток: ' . (5 - $count)];
    }
    wt_bf_set($email, 0, 0);
    /* 2FA: шести-значный код на почту, живёт 5 минут */
    $code = (string)random_int(100000, 999999);
    $_SESSION['wt_2fa'] = ['uid' => $u['id'], 'email' => $u['user_email'], 'name' => $u['user_name'],
                           'code' => $code, 'exp' => time() + 300, 'tries' => 0];
    wt_send_mail($u['user_email'], 'Wordtime: код подтверждения входа',
        "Здравствуйте!\n\nКод для входа в консоль: " . $code . "\n\nОн действует 5 минут. Если это были не вы — смените пароль.\n\n— Wordtime");
    return ['ok' => true];
}
function wt_verify_2fa($code) {
    if (empty($_SESSION['wt_2fa'])) return 'Сначала введите пароль.';
    $s = $_SESSION['wt_2fa'];
    if ($s['exp'] < time()) { unset($_SESSION['wt_2fa']); return 'Код истёк — войдите заново.'; }
    if ($s['tries'] >= 5)   { unset($_SESSION['wt_2fa']); return 'Слишком много попыток — войдите заново.'; }
    if (!hash_equals($s['code'], trim((string)$code))) {
        $_SESSION['wt_2fa']['tries'] = $s['tries'] + 1;
        return 'Неверный код. Осталось попыток: ' . (5 - $s['tries'] - 1);
    }
    $_SESSION['wt_uid']   = $s['uid'];
    $_SESSION['wt_email'] = $s['email'];
    $_SESSION['wt_name']  = $s['name'];
    unset($_SESSION['wt_2fa']);
    session_regenerate_id(true);
    return true;
}
function wt_is_logged()      { return !empty($_SESSION['wt_uid']); }
function wt_current_user()   { return wt_is_logged() ? ['id' => $_SESSION['wt_uid'], 'email' => $_SESSION['wt_email'], 'name' => $_SESSION['wt_name']] : null; }
function wt_require_login()  { if (!wt_is_logged()) { header('Location: index.php?a=login'); exit; } }
function wt_logout()         { $_SESSION = []; session_destroy(); }

/* ── REST API для мобильных приложений: /?p=rest&path=posts ─────── */
function wt_rest_dispatch($path) {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'cli';
    $hits = (int)wt_cache_get('rate_' . md5($ip));
    if ($hits > 120) { http_response_code(429); echo json_encode(['error' => 'Слишком много запросов (лимит 120/мин)']); return; }
    wt_cache_set('rate_' . md5($ip), $hits + 1, 60);

    $key = isset($_SERVER['HTTP_X_WT_KEY']) ? $_SERVER['HTTP_X_WT_KEY'] : (isset($_GET['key']) ? $_GET['key'] : '');
    $keys = json_decode(wt_get_option('api_keys', '[]'), true);
    $key_ok = false;
    if (is_array($keys)) foreach ($keys as $k) if (is_array($k) && hash_equals($k['key'], (string)$key)) $key_ok = true;

    $parts = array_values(array_filter(explode('/', trim((string)$path, '/'))));
    $res = $parts[0] ?? '';
    $id  = isset($parts[1]) ? (int)$parts[1] : 0;
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'POST' && !$key_ok) { http_response_code(401); echo json_encode(['error' => 'Для записи нужен ключ API (заголовок X-WT-Key)']); return; }

    if ($res === 'posts' && $id)  { echo json_encode(wt_get_post($id) ?: ['error' => 'не найдено']); return; }
    if ($res === 'posts')         { echo json_encode(wt_get_posts('post')); return; }
    if ($res === 'pages')         { echo json_encode(wt_get_posts('page')); return; }
    if ($res === 'comments' && $id) { echo json_encode(wt_get_comments($id)); return; }
    if ($res === 'site')          { echo json_encode(['title' => wt_get_option('site_title'), 'tagline' => wt_get_option('tagline'), 'version' => wt_get_option('version', '1.1.0')]); return; }
    http_response_code(404);
    echo json_encode(['error' => 'нет такого ресурса', 'hint' => 'posts, pages, comments/{id}, site']);
}

/* ── SEO: sitemap и robots ───────────────────────────────────────── */
function wt_sitemap() {
    header('Content-Type: application/xml; charset=utf-8');
    $base = WT_SITEURL;
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    echo "  <url><loc>" . wt_esc($base . '/') . "</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n";
    foreach (wt_get_posts('post') as $p)
        echo "  <url><loc>" . wt_esc($base . '/?p=post&id=' . $p['id']) . "</loc><lastmod>" . date('Y-m-d', strtotime($p['post_date'])) . "</lastmod><priority>0.8</priority></url>\n";
    foreach (wt_get_posts('page') as $p)
        echo "  <url><loc>" . wt_esc($base . '/?p=page&id=' . $p['id']) . "</loc><priority>0.6</priority></url>\n";
    echo "</urlset>\n";
}
function wt_robots() {
    header('Content-Type: text/plain; charset=utf-8');
    echo "User-agent: *\nAllow: /\nSitemap: " . WT_SITEURL . "/?p=sitemap\n";
}

/* ── Очередь асинхронных задач (запускается из wt-cron.php) ──────── */
function wt_queue_push($action, $payload = []) {
    wt_db()->prepare("INSERT INTO " . TABLE_PREFIX . "queue (action, payload) VALUES (?,?)")
        ->execute([$action, json_encode($payload)]);
}
function wt_queue_run_all($limit = 10) {
    $st = wt_db()->query("SELECT * FROM " . TABLE_PREFIX . "queue ORDER BY id ASC LIMIT " . (int)$limit);
    $done = 0;
    foreach ($st->fetchAll() as $t) {
        $action = $t['action'];
        if ($action === 'cache_prune') wt_cache_flush();
        wt_do_action('wt_queue_task', $action, json_decode($t['payload'], true));
        wt_db()->prepare("DELETE FROM " . TABLE_PREFIX . "queue WHERE id = ?")->execute([$t['id']]);
        $done++;
    }
    return $done;
}

/* ── Резервное копирование: дамп БД ──────────────────────────────── */
function wt_db_dump() {
    $db = wt_db();
    $out = "-- Wordtime CMS: резервная копия базы данных\n-- " . date('d.m.Y H:i') . "\nSET NAMES utf8mb4;\n\n";
    $tables = $db->query("SHOW TABLES LIKE " . $db->quote(TABLE_PREFIX . '%'))->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $t) {
        $out .= "DROP TABLE IF EXISTS " . $t . ";\n";
        $out .= $db->query("SHOW CREATE TABLE " . $t)->fetchColumn(1) . ";\n\n";
        foreach ($db->query("SELECT * FROM " . $t) as $row) {
            $vals = [];
            foreach ($row as $v) $vals[] = $v === null ? 'NULL' : $db->quote($v);
            $out .= "INSERT INTO " . $t . " VALUES (" . implode(',', $vals) . ");\n";
        }
        $out .= "\n";
    }
    return $out;
}

wt_do_action('wt_loaded');
`;

const ADMIN_PHP = String.raw`<?php
/**
 * Wordtime CMS 1.1 — консоль управления (/wt-admin/)
 * Вход: пароль → шести-значный код 2FA на почту.
 * Защита: prepared statements, CSRF-нонсы, экранирование вывода,
 *         блокировка подбора пароля (5 попыток → 60 сек).
 */
define('WT_ROOT', dirname(__DIR__));
require WT_ROOT . '/wt-config.php';
require WT_ROOT . '/wt-includes/bootstrap.php';

$a = isset($_GET['a']) ? preg_replace('/[^a-z0-9_-]/i', '', $_GET['a']) : 'dashboard';
$msg = ''; $msg_kind = 'ok';

/* ── обработка действий ── */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $act = $_POST['a'] ?? '';

    if ($act === 'do-login') {
        $r = wt_try_password_login($_POST['email'] ?? '', $_POST['password'] ?? '');
        if ($r['ok']) { header('Location: index.php?a=2fa'); exit; }
        $msg = $r['error']; $a = 'login';
    }
    elseif ($act === 'do-2fa') {
        $r = wt_verify_2fa($_POST['code'] ?? '');
        if ($r === true) { header('Location: index.php?a=dashboard'); exit; }
        $msg = $r; $a = '2fa';
    }
    elseif ($act === 'logout') { wt_logout(); header('Location: index.php?a=login'); exit; }

    else { /* далее — только для вошедших */
        wt_require_login();
        if (!wt_check_nonce($_POST['wt_nonce'] ?? '')) { http_response_code(403); exit('CSRF-проверка не пройдена'); }

        if ($act === 'save-post') {
            $title   = wt_sanitize($_POST['title'] ?? '');
            $content = trim($_POST['content'] ?? '');
            $type    = ($_POST['ptype'] ?? 'post') === 'page' ? 'page' : 'post';
            $status  = ($_POST['status'] ?? 'draft') === 'publish' ? 'publish' : 'draft';
            $cat     = wt_sanitize($_POST['category'] ?? 'Без рубрики');
            $me      = wt_current_user();
            if (wt_detect_injection($title)) { $msg = 'Заголовок отклонён фильтром безопасности.'; $msg_kind = 'err'; }
            elseif ((int)($_POST['id'] ?? 0) > 0) {
                wt_db()->prepare("UPDATE " . TABLE_PREFIX . "posts SET post_title=?, post_content=?, post_status=?, post_category=? WHERE id=?")
                    ->execute([$title, $content, $status, $cat, (int)$_POST['id']]);
                $msg = 'Сохранено.';
            } else {
                wt_db()->prepare("INSERT INTO " . TABLE_PREFIX . "posts (post_title, post_content, post_type, post_status, post_category, post_author) VALUES (?,?,?,?,?,?)")
                    ->execute([$title, $content, $type, $status, $cat, $me['name']]);
                $msg = ($type === 'page' ? 'Страница' : 'Запись') . ' создана.';
            }
            wt_cache_flush();
            $a = $type === 'page' ? 'pages' : 'posts';
        }
        elseif ($act === 'delete-post') {
            wt_db()->prepare("DELETE FROM " . TABLE_PREFIX . "posts WHERE id=?")->execute([(int)($_POST['id'] ?? 0)]);
            wt_db()->prepare("DELETE FROM " . TABLE_PREFIX . "comments WHERE comment_post_id=?")->execute([(int)($_POST['id'] ?? 0)]);
            wt_cache_flush(); $msg = 'Удалено.'; $a = 'posts';
        }
        elseif ($act === 'comment-set') {
            wt_db()->prepare("UPDATE " . TABLE_PREFIX . "comments SET comment_approved=? WHERE id=?")
                ->execute([$_POST['val'] ?? '0', (int)($_POST['id'] ?? 0)]);
            wt_cache_flush(); $msg = 'Комментарий обновлён.'; $a = 'comments';
        }
        elseif ($act === 'comment-del') {
            wt_db()->prepare("DELETE FROM " . TABLE_PREFIX . "comments WHERE id=?")->execute([(int)($_POST['id'] ?? 0)]);
            wt_cache_flush(); $msg = 'Комментарий удалён.'; $a = 'comments';
        }
        elseif ($act === 'save-settings') {
            foreach (['site_title', 'tagline', 'admin_email'] as $k)
                if (isset($_POST[$k])) wt_update_option($k, wt_sanitize($_POST[$k]));
            wt_update_option('comments_disabled', isset($_POST['comments_disabled']) ? '1' : '0');
            wt_update_option('moderate_first',  isset($_POST['moderate_first']) ? '1' : '0');
            wt_update_option('cache_enabled',   isset($_POST['cache_enabled']) ? '1' : '0');
            $msg = 'Настройки сохранены.'; $a = 'settings';
        }
        elseif ($act === 'flush-cache') {
            $n = wt_cache_flush(); $msg = 'Кеш очищен: удалено файлов — ' . $n . '.'; $a = 'settings';
        }
        elseif ($act === 'new-api-key') {
            $keys = json_decode(wt_get_option('api_keys', '[]'), true);
            if (!is_array($keys)) $keys = [];
            $keys[] = ['name' => wt_sanitize($_POST['keyname'] ?? 'Ключ'), 'key' => 'wt_' . bin2hex(random_bytes(16)), 'date' => date('d.m.Y')];
            wt_update_option('api_keys', json_encode($keys));
            $msg = 'Ключ API создан (для мобильных приложений).'; $a = 'settings';
        }
        elseif ($act === 'restore-sql' && !empty($_FILES['sql']['tmp_name'])) {
            $sql = file_get_contents($_FILES['sql']['tmp_name']);
            $db = wt_db(); $db->beginTransaction(); $n = 0;
            foreach (preg_split('/;\s*\n/', $sql) as $q) {
                $q = trim($q);
                if ($q !== '' && stripos($q, '--') !== 0) { $db->exec($q); $n++; }
            }
            $db->commit(); wt_cache_flush();
            $msg = 'База восстановлена: выполнено запросов — ' . $n . '.'; $a = 'backups';
        }
    }
}

/* скачивания (дампы, архивы) */
if ($a === 'download-sql') {
    wt_require_login();
    header('Content-Type: application/sql; charset=utf-8');
    header('Content-Disposition: attachment; filename="wordtime-db-' . date('Y-m-d-His') . '.sql"');
    echo wt_db_dump(); exit;
}
if ($a === 'download-site' && class_exists('ZipArchive')) {
    wt_require_login();
    $zip_file = WT_ROOT . '/wt-content/cache/site-' . date('Ymd-His') . '.zip';
    $zip = new ZipArchive();
    if ($zip->open($zip_file, ZipArchive::CREATE) === true) {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(WT_ROOT, FilesystemIterator::SKIP_DOTS));
        foreach ($it as $file) {
            $rel = str_replace(WT_ROOT . DIRECTORY_SEPARATOR, '', $file->getPathname());
            if (strpos($rel, 'wt-config.php') !== false) continue; /* конфиг не отдаём */
            if ($file->isFile() && filesize($file->getPathname()) < 20 * 1024 * 1024) $zip->addFile($file->getPathname(), 'Wordtime_cms/' . $rel);
        }
        $zip->addFromString('Wordtime_cms/backup-db.sql', wt_db_dump());
        $zip->close();
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="wordtime-site-' . date('Y-m-d') . '.zip"');
        readfile($zip_file); @unlink($zip_file); exit;
    }
}

/* ── страницы входа ── */
if (!wt_is_logged() && !in_array($a, ['login', '2fa'], true)) { header('Location: index.php?a=login'); exit; }

function wt_admin_head($title) {
    echo '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<title>' . wt_esc($title) . ' — Wordtime</title><style>
    *{box-sizing:border-box;margin:0} body{font:14px/1.55 system-ui,sans-serif;background:#eef2f3;color:#123038}
    .wrap{max-width:1060px;margin:0 auto;padding:0 18px}
    header{background:#071b21;color:#eef3f3;position:sticky;top:0;z-index:5}
    header .wrap{display:flex;align-items:center;gap:18px;height:52px}
    header a{color:#9fd8cf;text-decoration:none;font-weight:600;font-size:13px}
    header a:hover{color:#fff}
    .logo{font-weight:800;color:#fff !important;letter-spacing:-.02em;font-size:15px}
    nav.main{background:#0c2e36;border-bottom:1px solid #174753}
    nav.main .wrap{display:flex;gap:4px;overflow-x:auto}
    nav.main a{display:block;padding:10px 14px;color:#9fd8cf;text-decoration:none;font-size:13px;font-weight:600;white-space:nowrap;border-bottom:2px solid transparent}
    nav.main a.on{color:#fff;border-color:#14b8a6;background:#0f3944}
    main{padding:26px 0 70px}
    h1{font-size:22px;letter-spacing:-.02em;margin-bottom:16px}
    .card{background:#fff;border:1px solid #d7e2e4;border-radius:12px;padding:20px;margin-bottom:18px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
    .stat{background:#fff;border:1px solid #d7e2e4;border-radius:12px;padding:16px}
    .stat b{font-size:26px;display:block;letter-spacing:-.02em}
    .stat span{color:#5c7379;font-size:12.5px;font-weight:600}
    table{width:100%;border-collapse:collapse;font-size:13.5px}
    th{text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;color:#5c7379;padding:9px 10px;border-bottom:1px solid #d7e2e4}
    td{padding:10px;border-bottom:1px solid #e7eef0;vertical-align:top}
    tr:hover td{background:#f4f8f8}
    a{color:#0e9384} .btn{display:inline-block;background:#0e9384;color:#fff;border:0;border-radius:8px;padding:9px 16px;font-weight:700;font-size:13px;text-decoration:none;cursor:pointer}
    .btn:hover{background:#0b7a6e} .btn.sec{background:#e5ecee;color:#123038} .btn.danger{background:#dc2626}
    input,textarea,select{width:100%;padding:10px 12px;border:1px solid #c6d4d7;border-radius:8px;font:inherit;background:#fff}
    input:focus,textarea:focus{outline:none;border-color:#0e9384}
    label{display:block;font-weight:600;font-size:13px;margin:13px 0 5px}
    .flash{padding:12px 16px;border-radius:10px;margin-bottom:16px;font-weight:600}
    .flash.ok{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}
    .flash.err{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
    .loginbox{max-width:400px;margin:9vh auto;background:#fff;border:1px solid #d7e2e4;border-radius:16px;padding:34px}
    .loginbox h1{font-size:20px}
    .badge{display:inline-block;font-size:11px;font-weight:800;padding:2px 8px;border-radius:99px;background:#e0f5f1;color:#0e9384}
    .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .muted{color:#5c7379;font-size:12.5px}
    code{background:#f0f5f6;padding:2px 7px;border-radius:6px;font-size:12.5px}
    </style></head><body>
    <header><div class="wrap"><a class="logo" href="index.php">Wordtime</a>
    <a href="../" target="_blank">Сайт ↗</a>
    <span style="flex:1"></span>';
    if (wt_is_logged()) echo '<span class="muted" style="color:#9fd8cf">' . wt_esc(wt_current_user()['name']) . '</span>
    <form method="post" style="margin:0"><input type="hidden" name="a" value="logout"><button class="btn sec" style="padding:6px 12px">Выйти</button></form>';
    echo '</div></header>';
    if (wt_is_logged()) {
        echo '<nav class="main"><div class="wrap">';
        foreach (['dashboard' => 'Консоль', 'posts' => 'Записи', 'pages' => 'Страницы', 'comments' => 'Комментарии', 'settings' => 'Настройки', 'backups' => 'Резервные копии'] as $k => $v) {
            $on = (isset($_GET['a']) && $_GET['a'] === $k) || ($k === 'posts' && in_array($a, ['post-edit'], true)) || ($k === 'pages' && $a === 'page-edit');
            echo '<a href="index.php?a=' . $k . '"' . ($on ? ' class="on"' : '') . '>' . $v . '</a>';
        }
        echo '</div></nav>';
    }
    echo '<main><div class="wrap">';
}
function wt_admin_foot() { echo '</div></main></body></html>'; }
function wt_field_hidden() { return '<input type="hidden" name="wt_nonce" value="' . wt_esc(wt_nonce()) . '">'; }

/* ── экраны ── */
if ($a === 'login') {
    wt_admin_head('Вход');
    echo '<div class="loginbox"><h1>Вход в консоль</h1><p class="muted" style="margin:4px 0 14px">После пароля на почту придёт шести-значный код.</p>';
    if ($msg !== '') echo '<div class="flash err">' . wt_esc($msg) . '</div>';
    echo '<form method="post">' . wt_field_hidden() . '<input type="hidden" name="a" value="do-login">
    <label>Почта</label><input type="email" name="email" required autofocus>
    <label>Пароль</label><input type="password" name="password" required>
    <p style="margin-top:16px"><button class="btn" style="width:100%">Продолжить → код на почту</button></p>
    <p class="muted" style="margin-top:12px">Защита: 5 неудачных попыток → блокировка на 60 секунд.</p></form></div>';
    wt_admin_foot(); exit;
}
if ($a === '2fa') {
    wt_admin_head('Подтверждение');
    $to = isset($_SESSION['wt_2fa']) ? $_SESSION['wt_2fa']['email'] : '';
    echo '<div class="loginbox"><h1>Введите код из письма</h1><p class="muted" style="margin:4px 0 14px">Код отправлен на ' . wt_esc($to) . ' и действует 5 минут.</p>';
    if ($msg !== '') echo '<div class="flash err">' . wt_esc($msg) . '</div>';
    echo '<form method="post"><input type="hidden" name="a" value="do-2fa">
    <input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autofocus
       style="text-align:center;font-size:26px;letter-spacing:.4em;font-weight:800" placeholder="000000">
    <p style="margin-top:16px"><button class="btn" style="width:100%">Войти в консоль</button></p>
    <p class="muted" style="margin-top:12px"><a href="index.php?a=login">← другой пользователь</a></p></form></div>';
    wt_admin_foot(); exit;
}

wt_require_login();
$P = TABLE_PREFIX;
$db = wt_db();

if ($a === 'dashboard') {
    wt_admin_head('Консоль');
    $c_posts = $db->query("SELECT COUNT(*) FROM {$P}posts WHERE post_type='post'")->fetchColumn();
    $c_pages = $db->query("SELECT COUNT(*) FROM {$P}posts WHERE post_type='page'")->fetchColumn();
    $c_com   = $db->query("SELECT COUNT(*) FROM {$P}comments")->fetchColumn();
    $c_pend  = $db->query("SELECT COUNT(*) FROM {$P}comments WHERE comment_approved='0'")->fetchColumn();
    echo '<h1>Добро пожаловать, ' . wt_esc(wt_current_user()['name']) . '!</h1>';
    if (wt_get_option('comments_disabled') === '1') echo '<div class="flash err">Комментарии отключены на всём сайте — Настройки → Обсуждение.</div>';
    echo '<div class="grid">
      <div class="stat"><b>' . (int)$c_posts . '</b><span>записей</span></div>
      <div class="stat"><b>' . (int)$c_pages . '</b><span>страниц</span></div>
      <div class="stat"><b>' . (int)$c_com . '</b><span>комментариев</span></div>
      <div class="stat"><b>' . (int)$c_pend . '</b><span>ждут модерации</span></div>
      <div class="stat"><b>' . wt_cache_size_kb() . ' КБ</b><span>кеш сайта</span></div>
      <div class="stat"><b>' . wt_esc(wt_get_option('version', '1.1.0')) . '</b><span>версия Wordtime</span></div>
    </div>
    <div class="card"><b>Быстрые действия</b>
      <p class="row" style="margin-top:12px">
        <a class="btn" href="index.php?a=post-edit">＋ Запись</a>
        <a class="btn sec" href="index.php?a=comments">Комментарии</a>
        <a class="btn sec" href="index.php?a=backups">Резервная копия</a>
      </p></div>';
    wt_admin_foot(); exit;
}

if ($a === 'posts' || $a === 'pages') {
    $type = $a === 'pages' ? 'page' : 'post';
    wt_admin_head($a === 'pages' ? 'Страницы' : 'Записи');
    echo '<div class="row" style="justify-content:space-between;margin-bottom:14px"><h1 style="margin:0">' . ($type === 'page' ? 'Страницы' : 'Записи') . '</h1>
      <a class="btn" href="index.php?a=' . ($type === 'page' ? 'page-edit' : 'post-edit') . '">＋ Добавить</a></div>';
    if ($msg !== '') echo '<div class="flash ' . $msg_kind . '">' . wt_esc($msg) . '</div>';
    $rows = wt_get_posts($type, null, 200);
    /* wt_get_posts кеширует по статусу; для админки берём все напрямую */
    $st = $db->prepare("SELECT * FROM {$P}posts WHERE post_type=? ORDER BY post_date DESC");
    $st->execute([$type]); $rows = $st->fetchAll();
    echo '<div class="card" style="padding:6px 14px"><table><tr><th>Заголовок</th><th>Рубрика</th><th>Статус</th><th>Дата</th><th></th></tr>';
    foreach ($rows as $r) {
        echo '<tr><td><a href="index.php?a=' . ($type === 'page' ? 'page-edit' : 'post-edit') . '&id=' . $r['id'] . '"><b>' . wt_esc($r['post_title']) . '</b></a></td>
        <td>' . wt_esc($r['post_category']) . '</td>
        <td>' . ($r['post_status'] === 'publish' ? '<span class="badge">Опубликовано</span>' : '<span class="badge" style="background:#f1f5f9;color:#64748b">Черновик</span>') . '</td>
        <td class="muted">' . date('d.m.Y', strtotime($r['post_date'])) . '</td>
        <td><form method="post" onsubmit="return confirm(\'Удалить безвозвратно?\')"><input type="hidden" name="a" value="delete-post">' . wt_field_hidden() . '<input type="hidden" name="id" value="' . $r['id'] . '"><button class="btn danger" style="padding:5px 11px">Удалить</button></form></td></tr>';
    }
    if (!$rows) echo '<tr><td colspan="5" class="muted" style="padding:22px">Пока пусто — добавьте первую запись.</td></tr>';
    echo '</table></div>';
    wt_admin_foot(); exit;
}

if ($a === 'post-edit' || $a === 'page-edit') {
    $type = $a === 'page-edit' ? 'page' : 'post';
    $id = (int)($_GET['id'] ?? 0);
    $r = $id ? wt_get_post($id) : null;
    wt_admin_head($id ? 'Редактирование' : ($type === 'page' ? 'Новая страница' : 'Новая запись'));
    if ($msg !== '') echo '<div class="flash ' . $msg_kind . '">' . wt_esc($msg) . '</div>';
    echo '<div class="card"><h1 style="font-size:18px">' . ($id ? 'Редактирование' : ($type === 'page' ? 'Новая страница' : 'Новая запись')) . '</h1>
    <form method="post"><input type="hidden" name="a" value="save-post">' . wt_field_hidden() . '
    <input type="hidden" name="id" value="' . $id . '"><input type="hidden" name="ptype" value="' . $type . '">
    <label>Заголовок</label><input name="title" required value="' . wt_esc_attr($r ? $r['post_title'] : '') . '">
    ' . ($type === 'post' ? '<label>Рубрика</label><input name="category" value="' . wt_esc_attr($r ? $r['post_category'] : 'Без рубрики') . '">' : '') . '
    <label>Текст</label><textarea name="content" rows="12">' . wt_esc($r ? $r['post_content'] : '') . '</textarea>
    <label>Статус</label><select name="status">
      <option value="publish"' . ($r && $r['post_status'] === 'publish' ? ' selected' : '') . '>Опубликовано</option>
      <option value="draft"' . ($r && $r['post_status'] === 'draft' ? ' selected' : '') . '>Черновик</option></select>
    <p style="margin-top:18px"><button class="btn">Сохранить</button>
    <a class="btn sec" style="margin-left:8px" href="index.php?a=' . ($type === 'page' ? 'pages' : 'posts') . '">Отмена</a></p></form></div>';
    wt_admin_foot(); exit;
}

if ($a === 'comments') {
    wt_admin_head('Комментарии');
    if ($msg !== '') echo '<div class="flash ok">' . wt_esc($msg) . '</div>';
    $rows = $db->query("SELECT c.*, p.post_title FROM {$P}comments c LEFT JOIN {$P}posts p ON p.id=c.comment_post_id ORDER BY c.comment_date DESC")->fetchAll();
    echo '<h1>Комментарии</h1><div class="card" style="padding:6px 14px"><table><tr><th>Автор</th><th>Комментарий</th><th>К записи</th><th>Статус</th><th></th></tr>';
    foreach ($rows as $c) {
        $st = $c['comment_approved'] === '1' ? '<span class="badge">Одобрен</span>' : ($c['comment_approved'] === 'spam' ? '<span class="badge" style="background:#fee2e2;color:#991b1b">Спам</span>' : '<span class="badge" style="background:#fef9c3;color:#854d0e">Ожидает</span>');
        echo '<tr><td><b>' . wt_esc($c['comment_author']) . '</b><br><span class="muted">' . wt_esc($c['comment_email']) . '</span></td>
        <td>' . wt_esc($c['comment_content']) . '</td><td class="muted">' . wt_esc($c['post_title'] ?? '—') . '</td><td>' . $st . '</td>
        <td><form method="post" class="row" style="margin:0"><input type="hidden" name="a" value="comment-set">' . wt_field_hidden() . '<input type="hidden" name="id" value="' . $c['id'] . '">
        <select name="val" style="width:auto"><option value="1">Одобрить</option><option value="0">В ожидание</option><option value="spam">Спам</option></select>
        <button class="btn sec" style="padding:6px 12px">OK</button></form>
        <form method="post"><input type="hidden" name="a" value="comment-del">' . wt_field_hidden() . '<input type="hidden" name="id" value="' . $c['id'] . '"><button class="btn danger" style="padding:5px 11px">Удалить</button></form></td></tr>';
    }
    if (!$rows) echo '<tr><td colspan="5" class="muted" style="padding:22px">Комментариев пока нет.</td></tr>';
    echo '</table></div>';
    wt_admin_foot(); exit;
}

if ($a === 'settings') {
    wt_admin_head('Настройки');
    if ($msg !== '') echo '<div class="flash ok">' . wt_esc($msg) . '</div>';
    $o = function ($k, $d = '') { return wt_get_option($k, $d); };
    $chk = function ($k) { return wt_get_option($k) === '1' ? ' checked' : ''; };
    echo '<h1>Настройки</h1>
    <div class="card"><b>Общие</b>
    <form method="post"><input type="hidden" name="a" value="save-settings">' . wt_field_hidden() . '
    <label>Название сайта</label><input name="site_title" value="' . wt_esc_attr($o('site_title')) . '">
    <label>Краткое описание</label><input name="tagline" value="' . wt_esc_attr($o('tagline')) . '">
    <label>Почта администратора (коды 2FA)</label><input type="email" name="admin_email" value="' . wt_esc_attr($o('admin_email')) . '">
    <p style="margin-top:18px"><button class="btn">Сохранить</button></p></form></div>

    <div class="card"><b>Обсуждение · отключение комментариев</b>
    <form method="post"><input type="hidden" name="a" value="save-settings">' . wt_field_hidden() . '
    <input type="hidden" name="site_title" value="' . wt_esc_attr($o('site_title')) . '">
    <input type="hidden" name="tagline" value="' . wt_esc_attr($o('tagline')) . '">
    <input type="hidden" name="admin_email" value="' . wt_esc_attr($o('admin_email')) . '">
    <input type="hidden" name="moderate_first" value="1"' . $chk('moderate_first') . ' style="display:none">
    <input type="hidden" name="cache_enabled" value="1"' . $chk('cache_enabled') . ' style="display:none">
    <p style="margin:12px 0"><label style="display:inline-flex;gap:9px;align-items:center;font-weight:600">
      <input type="checkbox" name="comments_disabled" value="1"' . $chk('comments_disabled') . ' style="width:auto">
      Полностью отключить комментарии на сайте</label></p>
    <p><label style="display:inline-flex;gap:9px;align-items:center;font-weight:600">
      <input type="checkbox" name="moderate_first" value="1"' . $chk('moderate_first') . ' style="width:auto">
      Отправлять новые комментарии на модерацию</label></p>
    <p style="margin-top:14px"><button class="btn">Сохранить</button></p></form></div>

    <div class="card"><b>Кеш и скорость</b>
    <p class="muted">Занято: ' . wt_cache_size_kb() . ' КБ · последняя очистка: ' . wt_esc($o('cache_last_flush', '—')) . '</p>
    <form method="post" style="margin-top:12px"><input type="hidden" name="a" value="flush-cache">' . wt_field_hidden() . '
    <button class="btn">Очистить кеш сайта</button></form></div>

    <div class="card"><b>Безопасность</b>
    <p class="muted">2FA по почте обязательна для всех пользователей и встроена в ядро. Защита от подбора: 5 попыток → 60 секунд блокировки.</p></div>

    <div class="card"><b>API для мобильных приложений</b>
    <p class="muted">REST: <code>' . wt_esc(WT_SITEURL) . '/?p=rest&path=posts</code> · заголовок <code>X-WT-Key</code></p>
    <form method="post" class="row" style="margin-top:12px"><input type="hidden" name="a" value="new-api-key">' . wt_field_hidden() . '
    <input name="keyname" placeholder="Например: Android-приложение" style="width:auto;flex:1"><button class="btn">Создать ключ</button></form>
    <table style="margin-top:14px"><tr><th>Название</th><th>Ключ</th><th>Создан</th></tr>';
    $keys = json_decode(wt_get_option('api_keys', '[]'), true);
    if (is_array($keys)) foreach ($keys as $k) echo '<tr><td>' . wt_esc($k['name']) . '</td><td><code>' . wt_esc($k['key']) . '</code></td><td class="muted">' . wt_esc($k['date']) . '</td></tr>';
    echo '</table></div>';
    wt_admin_foot(); exit;
}

if ($a === 'backups') {
    wt_admin_head('Резервные копии');
    if ($msg !== '') echo '<div class="flash ok">' . wt_esc($msg) . '</div>';
    echo '<h1>Резервные копии</h1>
    <div class="grid">
      <div class="card"><b>Дамп базы данных</b><p class="muted" style="margin:8px 0 14px">SQL-файл со всеми таблицами и данными — для восстановления и переноса.</p>
        <a class="btn" href="index.php?a=download-sql">Скачать .sql</a></div>
      <div class="card"><b>Весь сайт одним архивом</b><p class="muted" style="margin:8px 0 14px">ZIP со всеми файлами + дамп базы внутри (аналог All-in-One WP Migration).</p>
        <a class="btn" href="index.php?a=download-site">Скачать .zip</a></div>
      <div class="card"><b>Восстановление</b><p class="muted" style="margin:8px 0 14px">Загрузите .sql-дамп — таблицы будут заменены данными из файла.</p>
        <form method="post" enctype="multipart/form-data"><input type="hidden" name="a" value="restore-sql">' . wt_field_hidden() . '
        <input type="file" name="sql" accept=".sql" required><p style="margin-top:12px"><button class="btn danger">Восстановить из файла</button></p></form></div>
    </div>';
    wt_admin_foot(); exit;
}

header('Location: index.php?a=dashboard');
`;

const THEME_INDEX = String.raw`<?php
/**
 * Тема Wordtime Twenty — главный шаблон (иерархия, как в WordPress:
 * index.php → single-шаблоны через ?p=)
 * title и description генерируются автоматически в правильном месте <head>.
 */
$P = TABLE_PREFIX;
$view = isset($_GET['p']) ? $_GET['p'] : 'home';
$current = null;
if (($view === 'post' || $view === 'page') && isset($_GET['id'])) {
    $current = wt_get_post((int)$_GET['id']);
    if ($current) {
        wt_db()->prepare("UPDATE " . TABLE_PREFIX . "posts SET post_views = post_views + 1 WHERE id = ?")->execute([(int)$current['id']]);
    }
}
$site_title = wt_get_option('site_title', 'Wordtime');
$tagline    = wt_get_option('tagline', '');

/* автоматические SEO-заголовки */
if ($current) {
    $seo_title = $current['post_title'] . ' — ' . $site_title;
    $seo_desc  = mb_substr(strip_tags($current['post_content']), 0, 155);
} elseif ($view === 'search') {
    $seo_title = 'Поиск: ' . wt_esc($_GET['q'] ?? '') . ' — ' . $site_title;
    $seo_desc  = 'Результаты поиска по сайту ' . $site_title;
} else {
    $seo_title = $site_title . ($tagline ? ' — ' . $tagline : '');
    $seo_desc  = $tagline !== '' ? $tagline : 'Сайт работает на Wordtime CMS';
}
$canonical = WT_SITEURL . '/?p=' . $view . (isset($_GET['id']) ? '&id=' . (int)$_GET['id'] : '');
$comments_on = wt_get_option('comments_disabled', '0') !== '1';
?><!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?php echo wt_esc($seo_title); ?></title>
<meta name="description" content="<?php echo wt_esc_attr($seo_desc); ?>">
<link rel="canonical" href="<?php echo wt_esc_url($canonical); ?>">
<meta property="og:type" content="<?php echo $current ? 'article' : 'website'; ?>">
<meta property="og:title" content="<?php echo wt_esc_attr($seo_title); ?>">
<meta property="og:description" content="<?php echo wt_esc_attr($seo_desc); ?>">
<meta property="og:url" content="<?php echo wt_esc_url($canonical); ?>">
<meta name="robots" content="index,follow">
<style>
 :root{--ink:#071b21;--teal:#0e9384;--amber:#d99417;--mut:#5c7379;--line:#dfe9ea;--bg:#f4f7f7}
 *{box-sizing:border-box;margin:0} body{font:16px/1.7 system-ui,-apple-system,"Segoe UI",sans-serif;color:#17323a;background:var(--bg)}
 .wrap{max-width:1000px;margin:0 auto;padding:0 20px}
 header.site{background:var(--ink);color:#fff}
 header.site .wrap{display:flex;align-items:center;gap:22px;height:66px}
 header.site a{color:#cfe8e4;text-decoration:none;font-weight:600;font-size:14px}
 header.site a:hover{color:#fff}
 .brand{font-weight:800;font-size:19px;color:#fff !important;letter-spacing:-.02em;display:flex;align-items:center;gap:10px}
 .brand i{width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,#14b8a6,#0e9384);display:inline-block;position:relative}
 .brand i:after{content:"";position:absolute;inset:7px;border:2px solid #fff;border-radius:3px}
 main{padding:34px 0 60px;min-height:60vh}
 h1.page{font-size:clamp(26px,4vw,40px);letter-spacing:-.03em;line-height:1.15;margin-bottom:10px}
 .meta{color:var(--mut);font-size:13.5px;font-weight:600}
 .card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:26px;margin-bottom:20px;transition:transform .18s,box-shadow .18s}
 .post-card:hover{transform:translateY(-3px);box-shadow:0 14px 34px -18px rgba(7,27,33,.35)}
 .post-card h2{font-size:21px;letter-spacing:-.02em;line-height:1.3;margin:6px 0 8px}
 .post-card h2 a{color:#123038;text-decoration:none}
 .post-card h2 a:hover{color:var(--teal)}
 .cat{display:inline-block;font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--teal)}
 .more{color:var(--teal);font-weight:700;font-size:14px;text-decoration:none}
 .more:hover{text-decoration:underline}
 article p{margin:0 0 16px}
 .comments{margin-top:36px;border-top:2px solid var(--line);padding-top:26px}
 .comment{display:flex;gap:12px;margin-bottom:16px}
 .ava{width:38px;height:38px;border-radius:50%;background:var(--teal);color:#fff;display:grid;place-items:center;font-weight:800;flex:none}
 .cbody{background:#fff;border:1px solid var(--line);border-radius:12px;padding:13px 16px;flex:1}
 .cbody b{font-size:13.5px} .cbody .meta{font-weight:600;margin-left:8px}
 form.cform textarea{width:100%;border:1px solid #c6d4d7;border-radius:10px;padding:12px 14px;font:inherit;resize:vertical;min-height:90px}
 form.cform input{border:1px solid #c6d4d7;border-radius:10px;padding:10px 12px;font:inherit;width:100%}
 form.cform input:focus,form.cform textarea:focus{outline:none;border-color:var(--teal)}
 button.submit{background:var(--teal);color:#fff;border:0;border-radius:10px;padding:11px 22px;font-weight:800;font-size:14px;cursor:pointer}
 button.submit:hover{background:#0b7a6e}
 .grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin:14px 0}
 .notice{padding:12px 16px;border-radius:10px;background:#dcfce7;color:#166534;border:1px solid #bbf7d0;font-weight:600;margin-bottom:18px}
 .notice.warn{background:#fef9c3;color:#854d0e;border-color:#fde68a}
 footer.site{background:var(--ink);color:#9fb9be;padding:26px 0;font-size:13.5px}
 footer.site b{color:#fff}
 .searchbar{display:flex;gap:10px;margin-bottom:26px}
 .searchbar input{flex:1;border:1px solid #c6d4d7;border-radius:10px;padding:11px 14px;font:inherit;background:#fff}
</style>
</head>
<body>
<?php wt_do_action('wt_header'); ?>
<header class="site"><div class="wrap">
  <a class="brand" href="./"><i></i><?php echo wt_esc($site_title); ?></a>
  <span style="flex:1"></span>
  <a href="./">Главная</a>
  <?php foreach (wt_get_posts('page') as $pg): ?>
    <a href="?p=page&id=<?php echo (int)$pg['id']; ?>"><?php echo wt_esc($pg['post_title']); ?></a>
  <?php endforeach; ?>
</div></header>

<main><div class="wrap">
<?php if (isset($_GET['cok'])) echo '<div class="notice">Спасибо! Комментарий появится после проверки.</div>'; ?>
<?php if (isset($_GET['cerr'])) echo '<div class="notice warn">Комментарий не принят — проверьте текст.</div>'; ?>

<?php if ($view === 'post' && $current): /* ── запись ── */ ?>
  <p class="meta"><span class="cat"><?php echo wt_esc($current['post_category']); ?></span> · <?php echo date('d.m.Y', strtotime($current['post_date'])); ?> · <?php echo wt_esc($current['post_author']); ?></p>
  <h1 class="page"><?php echo wt_esc($current['post_title']); ?></h1>
  <article><?php echo wt_the_content($current['post_content']); ?></article>

  <section class="comments">
    <h2 style="font-size:20px;letter-spacing:-.02em">Комментарии · <?php echo count(wt_get_comments($current['id'])); ?></h2>
    <?php if (!$comments_on): ?>
      <p class="meta" style="margin-top:14px">Комментарии отключены администратором сайта.</p>
    <?php else: ?>
      <div style="margin-top:18px">
      <?php foreach (wt_get_comments($current['id']) as $c): ?>
        <div class="comment"><span class="ava"><?php echo wt_esc(mb_substr($c['comment_author'], 0, 1)); ?></span>
          <div class="cbody"><b><?php echo wt_esc($c['comment_author']); ?></b><span class="meta"><?php echo date('d.m.Y', strtotime($c['comment_date'])); ?></span>
          <p style="margin-top:5px"><?php echo wt_esc($c['comment_content']); ?></p></div></div>
      <?php endforeach; ?>
      </div>
      <form class="cform" method="post" action="./" style="margin-top:22px">
        <input type="hidden" name="wt_action" value="comment">
        <input type="hidden" name="wt_nonce" value="<?php echo wt_esc_attr(wt_nonce()); ?>">
        <input type="hidden" name="post_id" value="<?php echo (int)$current['id']; ?>">
        <div class="grid2">
          <input name="author" placeholder="Ваше имя" required>
          <input type="email" name="email" placeholder="Почта (не публикуется)">
        </div>
        <textarea name="text" placeholder="Ваш комментарий…" required></textarea>
        <p style="margin-top:12px"><button class="submit" type="submit">Отправить комментарий</button></p>
      </form>
    <?php endif; ?>
  </section>

<?php elseif ($view === 'page' && $current): /* ── страница ── */ ?>
  <h1 class="page"><?php echo wt_esc($current['post_title']); ?></h1>
  <article><?php echo wt_the_content($current['post_content']); ?></article>

<?php elseif ($view === 'search'): /* ── поиск ── */
  $q = wt_sanitize($_GET['q'] ?? '');
  $st = wt_db()->prepare("SELECT * FROM {$P}posts WHERE post_type='post' AND post_status='publish' AND (post_title LIKE ? OR post_content LIKE ?) ORDER BY post_date DESC LIMIT 30");
  $like = '%' . $q . '%'; $st->execute([$like, $like]); $found = $st->fetchAll(); ?>
  <h1 class="page">Поиск: «<?php echo wt_esc($q); ?>»</h1>
  <p class="meta" style="margin-bottom:20px">Найдено: <?php echo count($found); ?></p>
  <?php foreach ($found as $r): ?>
    <div class="card post-card"><span class="cat"><?php echo wt_esc($r['post_category']); ?></span>
      <h2><a href="?p=post&id=<?php echo (int)$r['id']; ?>"><?php echo wt_esc($r['post_title']); ?></a></h2>
      <p style="color:#3d5a62"><?php echo wt_the_excerpt($r); ?></p></div>
  <?php endforeach; ?>

<?php else: /* ── главная: лента ── */ ?>
  <form class="searchbar" method="get"><input type="hidden" name="p" value="search"><input name="q" placeholder="Поиск по сайту…" value="<?php echo wt_esc_attr($_GET['q'] ?? ''); ?>"><button class="submit" type="submit">Найти</button></form>
  <?php foreach (wt_get_posts('post') as $r): ?>
    <div class="card post-card"><span class="cat"><?php echo wt_esc($r['post_category']); ?></span>
      <h2><a href="?p=post&id=<?php echo (int)$r['id']; ?>"><?php echo wt_esc($r['post_title']); ?></a></h2>
      <p style="color:#3d5a62"><?php echo wt_the_excerpt($r); ?></p>
      <p class="meta" style="margin-top:10px"><?php echo date('d.m.Y', strtotime($r['post_date'])); ?> · <?php echo wt_esc($r['post_author']); ?>
        · <a class="more" href="?p=post&id=<?php echo (int)$r['id']; ?>">Читать →</a></p></div>
  <?php endforeach; ?>
<?php endif; ?>

</div></main>

<footer class="site"><div class="wrap">
  <b><?php echo wt_esc($site_title); ?></b> — <?php echo wt_esc($tagline); ?><br>
  Работает на <b>Wordtime</b> <?php echo wt_esc(wt_get_option('version', '1.1.0')); ?> ·
  <?php echo round((microtime(true) - WT_START) * 1000); ?> мс ·
  <a href="?p=sitemap" style="color:#9fb9be">sitemap</a>
</div></footer>
<?php wt_do_action('wt_footer'); ?>
</body>
</html>
`;

const THEME_FUNCTIONS = String.raw`<?php
/**
 * Wordtime Twenty — functions.php
 * Точка подключения плагинов и кастомизации темы (как в WordPress).
 */

/* Пример: свой фильтр контента */
add_filter('the_content', function ($html) {
    return $html; /* здесь можно добавить свои преобразования */
});

/* Пример: свой код в подвал сайта */
add_action('wt_footer', function () {
    /* echo '<!-- свой счётчик -->'; */
});
`;

const NGINX_CONF = String.raw`# ─────────────────────────────────────────────────────────────────────
# Wordtime CMS — конфигурация nginx (классический хостинг / VPS)
# Стек: nginx + php8.3-fpm + MariaDB
#
# Установка:
#   1) положите файл в /etc/nginx/sites-available/wordtime.conf
#   2) ln -s /etc/nginx/sites-available/wordtime.conf /etc/nginx/sites-enabled/
#   3) nginx -t && systemctl reload nginx
#
# Маршрутизация Wordtime работает и БЕЗ этого файла (через ?p=...),
# конфиг лишь даёт красивые ссылки вида /post/1 вместо /?p=post&id=1.
# ─────────────────────────────────────────────────────────────────────
server {
    listen 80;
    server_name ваш-домен.ru;                 # ← замените на свой домен
    root /var/www/wordtime;                   # ← путь к распакованному архиву
    index index.php;
    charset utf-8;
    client_max_body_size 64M;                 # загрузка медиафайлов

    access_log /var/log/nginx/wordtime.access.log;
    error_log  /var/log/nginx/wordtime.error.log;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;   # ← сокет вашего PHP-FPM
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_read_timeout 120s;
    }

    # защита служебных файлов
    location = /wt-config.php { deny all; }
    location = /wt-cron.php   { deny all; }
    location ~ /wt-content/cache/ { deny all; }

    # кеш и сжатие статики
    location ~* \.(css|js|jpg|jpeg|png|gif|webp|svg|ico|woff2)$ {
        expires 30d;
        add_header Cache-Control "public";
        gzip_static on;
    }

    # заголовки безопасности
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
`;

const CRON_PHP = String.raw`<?php
/**
 * Wordtime CMS — обработчик асинхронной очереди (запускается по cron)
 *
 * Добавьте в crontab (на хостинге — «Планировщик заданий» в панели):
 *   * * * * * php /путь/к/сайту/wt-cron.php >> /var/log/wordtime-cron.log 2>&1
 */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('Только из cron'); }
define('WT_ROOT', __DIR__);
if (!file_exists(WT_ROOT . '/wt-config.php')) exit('Сначала установите Wordtime');
require WT_ROOT . '/wt-config.php';
require WT_ROOT . '/wt-includes/bootstrap.php';

$n = wt_queue_run_all(10);
echo date('d.m.Y H:i:s'), ' — выполнено задач: ', $n, PHP_EOL;
`;

const UPLOADS_GUARD = String.raw`<!-- Wordtime: каталог загрузок. Файлы медиа появляются здесь автоматически. -->
`;

const README_MD = String.raw`# Wordtime CMS 1.1 — установка на классический хостинг

Полноценная CMS на PHP для хостингов с **nginx / Apache + PHP 7.4–8.3 (FPM) + MySQL/MariaDB**.
Без Composer, без Docker, без внешних зависимостей — только файлы и база данных.

## Что внутри
- index.php — сайт (лента, записи, страницы, поиск, комментарии, sitemap, REST API)
- install.php — веб-установщик (проверка окружения → база → готово)
- wt-includes/bootstrap.php — ядро: PDO, хуки add_action/add_filter, 2FA, кеш, REST
- wt-admin/ — консоль: записи, страницы, комментарии, настройки, бэкапы, API-ключи
- wt-content/themes/wordtime-twenty/ — стартовая тема
- nginx-wordtime.conf — готовый конфиг для nginx + php8.3-fpm

## Требования
- PHP 7.4–8.3, расширения: pdo_mysql, mbstring (gd и zip — желательно)
- MySQL 5.7+ или MariaDB 10.3+
- nginx или Apache

## Установка на хостинге с панелью (cPanel, ISPmanager, Plesk, FTP)
1. В панели создайте базу MySQL и пользователя, сохраните пароль.
2. Загрузите Wordtime_cms.zip в корень сайта (public_html) и распакуйте.
3. Откройте ваш домен — запустится установщик: укажите данные БД, почту и пароль.
4. Готово! Консоль: /wt-admin/ (вход по паролю + код 2FA из письма).
5. Удалите install.php.

## Установка на VPS: nginx + PHP 8.3-FPM + MariaDB
    sudo apt update
    sudo apt install -y nginx mariadb-server php8.3-fpm php8.3-mysql php8.3-mbstring php8.3-gd php8.3-zip unzip

    sudo mysql -e "CREATE DATABASE wordtime CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
                   CREATE USER 'wordtime'@'localhost' IDENTIFIED BY 'СЛОЖНЫЙ_ПАРОЛЬ';
                   GRANT ALL ON wordtime.* TO 'wordtime'@'localhost'; FLUSH PRIVILEGES;"

    sudo unzip Wordtime_cms.zip -d /var/www/
    sudo chown -R www-data:www-data /var/www/Wordtime_cms

    sudo cp /var/www/Wordtime_cms/nginx-wordtime.conf /etc/nginx/sites-available/wordtime.conf
    # отредактируйте server_name и root в этом файле
    sudo ln -s /etc/nginx/sites-available/wordtime.conf /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx

Откройте домен — установщик сделает остальное.
HTTPS: sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx

## Cron (асинхронные задачи)
    * * * * * php /var/www/Wordtime_cms/wt-cron.php >> /var/log/wordtime-cron.log 2>&1

## REST API для мобильных приложений
- GET  /?p=rest&path=posts      — записи
- GET  /?p=rest&path=pages      — страницы
- GET  /?p=rest&path=comments/1 — комментарии записи 1
- GET  /?p=rest&path=site       — название и описание сайта
- Запись — с заголовком X-WT-Key (ключ создаётся в консоли: Настройки → API).
- Лимит: 120 запросов в минуту с одного IP.

## Безопасность (встроено в ядро)
- PDO + prepared statements — защита от SQL-инъекций
- экранирование всего вывода — защита от XSS
- CSRF-нонсы во всех формах
- 2FA по почте обязательна для всех, код живёт 5 минут
- подбор пароля: 5 неудачных попыток → блокировка 60 секунд

## Резервные копии
Консоль → «Резервные копии»: дамп .sql, ZIP всего сайта (аналог All-in-One
WP Migration), восстановление из .sql-файла.

## Обновление темы
Свои темы кладите в wt-content/themes/имя-темы/ и укажите её в опции theme.
Плагины подключаются через add_action/add_filter в functions.php темы.
`;

export const CORE_FILES: ZipEntry[] = [
  { path: "Wordtime_cms/index.php", content: INDEX_PHP },
  { path: "Wordtime_cms/install.php", content: INSTALL_PHP },
  { path: "Wordtime_cms/wt-config-sample.php", content: CONFIG_SAMPLE },
  { path: "Wordtime_cms/wt-includes/bootstrap.php", content: BOOTSTRAP_PHP },
  { path: "Wordtime_cms/wt-admin/index.php", content: ADMIN_PHP },
  { path: "Wordtime_cms/wt-content/themes/wordtime-twenty/index.php", content: THEME_INDEX },
  { path: "Wordtime_cms/wt-content/themes/wordtime-twenty/functions.php", content: THEME_FUNCTIONS },
  { path: "Wordtime_cms/wt-content/uploads/index.html", content: UPLOADS_GUARD },
  { path: "Wordtime_cms/nginx-wordtime.conf", content: NGINX_CONF },
  { path: "Wordtime_cms/wt-cron.php", content: CRON_PHP },
  { path: "Wordtime_cms/README.md", content: README_MD },
];
