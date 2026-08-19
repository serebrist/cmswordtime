<?php
/**
 * Wordtime CMS 1.0.5 — ядро (bootstrap)
 * Классический стек: PHP 7.4–8.3 · MySQL 5.7+/MariaDB 10+ · nginx или Apache
 * Работает и в корне домена, и в подпапке — базовый путь определяется автоматически.
 */
if (!defined('WT_ROOT')) { http_response_code(500); exit('WT_ROOT is not defined'); }

define('WT_VERSION', '1.0.5');
define('WT_DATA', WT_ROOT . '/wt-data');
define('WT_CACHE_DIR', WT_DATA . '/cache');
define('WT_UPLOADS', WT_ROOT . '/wt-content/uploads');

error_reporting(E_ALL);
if (defined('WT_DEBUG') && WT_DEBUG) {
    ini_set('display_errors', '1');
} else {
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
    if (!is_dir(WT_DATA)) @mkdir(WT_DATA, 0700, true);
    ini_set('error_log', WT_DATA . '/error.log');
}
foreach (array(WT_DATA, WT_CACHE_DIR, WT_DATA . '/backups', WT_UPLOADS) as $d) {
    if (!is_dir($d)) @mkdir($d, 0755, true);
}
/* Apache: wt-data закрыт от веба (там бэкапы с дампом БД и коды 2FA!),
   в загрузках запрещён запуск PHP. nginx закрыт конфигом nginx-wordtime.conf. */
function wt_protect_dir($dir, $rules) {
    $f = $dir . '/.htaccess';
    if (@file_get_contents($f) !== $rules) @file_put_contents($f, $rules);
}
wt_protect_dir(WT_DATA, "Require all denied\n");
wt_protect_dir(WT_CACHE_DIR, "Require all denied\n");
wt_protect_dir(WT_DATA . '/backups', "Require all denied\n");
wt_protect_dir(WT_UPLOADS, "<FilesMatch \"\\.ph(p[3457]?|t|tml|ar)$\">\n    Require all denied\n</FilesMatch>\n");

/* ── Базовый URL: корень домена ИЛИ подпапка ──────────────────────── */
function wt_base() {
    if (defined('WT_BASE')) return WT_BASE;
    $script = str_replace('\\', '/', isset($_SERVER['SCRIPT_NAME']) ? $_SERVER['SCRIPT_NAME'] : '/index.php');
    $dir = rtrim(dirname($script), '/');
    foreach (array('/wt-admin', '/wt-includes', '/wt-content') as $seg) {
        $pos = strpos($dir, $seg);
        if ($pos !== false) { $dir = substr($dir, 0, $pos); break; }
    }
    return ($dir === '/' || $dir === '' || $dir === '.') ? '' : $dir;
}
function wt_url($route = '') { return wt_base() . '/?p=' . $route; }
function wt_admin_url($extra = '') { return wt_base() . '/?admin=1' . $extra; }
function wt_asset($rel) { return wt_base() . '/' . ltrim($rel, '/'); }
/* Безопасный локальный URL для редиректов (защита от open redirect):
   разрешены только пути, начинающиеся с '/' (кроме '//'), и только
   внутри базового пути сайта. Всё остальное → null.                  */
function wt_safe_local_url($url) {
    $url = (string)$url;
    if ($url === '' || $url[0] !== '/' || strpos($url, '//') === 0) return null;
    $base = wt_base();
    if ($base !== '' && $url !== $base && strpos($url, $base . '/') !== 0) return null;
    return $url;
}
function wt_pretty($type, $slug) {
    if (defined('WT_PRETTY') && WT_PRETTY) return wt_base() . '/' . $type . '/' . $slug . '/';
    return wt_url($type . ':' . $slug);
}
/* Ссылка пункта меню: внешняя (https://…), относительная (/…) или маршрут (?p=…) */
function wt_menu_href($url) {
    $url = trim((string)$url);
    if (preg_match('#^https?://#i', $url)) return esc_url($url);
    if ($url === '') return esc_url(wt_base() . '/');
    if ($url[0] === '?') return esc_url(wt_base() . '/' . $url);
    return esc_url(wt_base() . '/' . ltrim($url, '/'));
}

/* ── База данных (PDO, только prepared statements) ────────────────── */
function wt_db() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, array(
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ));
    }
    return $pdo;
}
function wt_prefix() { return defined('TABLE_PREFIX') ? TABLE_PREFIX : 'wt_'; }
function wt_t($name) { return wt_prefix() . $name; }

/* ── Хуки (совместимо с плагинами WordPress-типа) ─────────────────── */
function wt_add_filter($tag, $fn, $prio = 10) { $GLOBALS['wt_filters'][$tag][$prio][] = $fn; }
function wt_apply_filters($tag, $value) {
    $args = func_get_args(); array_shift($args);
    if (empty($GLOBALS['wt_filters'][$tag])) return $value;
    $hooks = $GLOBALS['wt_filters'][$tag]; ksort($hooks);
    foreach ($hooks as $fns) foreach ($fns as $fn) { $args[0] = call_user_func_array($fn, $args); }
    return $args[0];
}
function wt_add_action($tag, $fn, $prio = 10) { $GLOBALS['wt_actions'][$tag][$prio][] = $fn; }
function wt_do_action($tag) {
    $args = func_get_args(); array_shift($args);
    if (empty($GLOBALS['wt_actions'][$tag])) return;
    $hooks = $GLOBALS['wt_actions'][$tag]; ksort($hooks);
    foreach ($hooks as $fns) foreach ($fns as $fn) call_user_func_array($fn, $args);
}

/* ── Опции (общий кеш запроса: wt_set_option сразу виден wt_option) ── */
function &wt_options_cache() {
    static $cache = null;
    if ($cache === null) {
        $cache = array();
        try {
            foreach (wt_db()->query('SELECT option_name, option_value FROM ' . wt_t('options'))->fetchAll() as $row) {
                $cache[$row['option_name']] = json_decode($row['option_value'], true);
            }
        } catch (Exception $e) { /* установка не завершена */ }
    }
    return $cache;
}
function wt_option($name, $default = null) {
    $cache = &wt_options_cache();
    return array_key_exists($name, $cache) ? $cache[$name] : $default;
}
function wt_set_option($name, $value) {
    $st = wt_db()->prepare('INSERT INTO ' . wt_t('options') . ' (option_name, option_value) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE option_value = VALUES(option_value)');
    $st->execute(array($name, json_encode($value, JSON_UNESCAPED_UNICODE)));
    $cache = &wt_options_cache();
    $cache[$name] = $value; /* без этого в рамках запроса читалось бы старое значение */
    wt_cache_flush();
}

/* ── Экранирование (защита от XSS) ────────────────────────────────── */
function esc($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function esc_attr($s) { return esc($s); }
function esc_url($s) {
    $s = trim((string)$s);
    if ($s === '' || stripos($s, 'javascript:') === 0) return '#';
    return esc($s);
}
function wt_kses($html) {
    /* Разрешённые теги и БЕЗОПАСНЫЕ атрибуты (src/href валидируются:
       только http(s) и относительные пути — никаких javascript: и data:) */
    $allowed = array('p' => array(), 'br' => array(), 'b' => array(), 'strong' => array(), 'i' => array(), 'em' => array(), 'u' => array(),
        'a' => array('href', 'title'), 'ul' => array(), 'ol' => array(), 'li' => array(),
        'h2' => array(), 'h3' => array(), 'h4' => array(), 'blockquote' => array(), 'code' => array(), 'pre' => array(),
        'img' => array('src', 'alt', 'title', 'class'), 'figure' => array('class'), 'figcaption' => array());
    $safeUrl = function ($v) {
        $v = trim((string)$v);
        $low = strtolower(preg_replace('/\s+/', '', $v));
        if (strpos($low, 'javascript:') === 0 || strpos($low, 'data:') === 0 || strpos($low, 'vbscript:') === 0) return '';
        return $v;
    };
    return preg_replace_callback('/<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*)?)\s*\/?>/', function ($m) use ($allowed, $safeUrl) {
        $tag = strtolower($m[1]);
        if (!array_key_exists($tag, $allowed)) return '';
        $close = strpos($m[0], '</') === 0 ? '</' . $tag . '>' : '';
        if ($close !== '') return $close;
        $attrs = '';
        if (preg_match_all('/([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+))/', $m[2], $am, PREG_SET_ORDER)) {
            foreach ($am as $a) {
                $name = strtolower($a[1]);
                $val = isset($a[4]) && $a[4] !== '' ? $a[4] : (isset($a[3]) && $a[3] !== '' ? $a[3] : (isset($a[2]) ? $a[2] : ''));
                if (!in_array($name, $allowed[$tag], true)) continue;
                if ($name === 'src' || $name === 'href') { $val = $safeUrl($val); if ($val === '') continue; }
                $attrs .= ' ' . $name . '="' . htmlspecialchars($val, ENT_QUOTES, 'UTF-8') . '"';
            }
        }
        $self = ($tag === 'br' || $tag === 'img') ? ' /' : '';
        return '<' . $tag . $attrs . $self . '>';
    }, (string)$html);
}
function wt_nonce($action = 'default') {
    wt_session_start();
    return hash_hmac('sha256', $action . '|' . session_id(), defined('AUTH_KEY') ? AUTH_KEY : 'wordtime');
}
function wt_check_nonce($action = 'default') {
    $n = isset($_POST['wt_nonce']) ? $_POST['wt_nonce'] : (isset($_GET['wt_nonce']) ? $_GET['wt_nonce'] : '');
    return hash_equals(wt_nonce($action), (string)$n);
}

/* ── Сессии ───────────────────────────────────────────────────────── */
function wt_session_start() {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $b = wt_base();
    session_set_cookie_params(array('lifetime' => 0, 'path' => $b === '' ? '/' : $b . '/', 'httponly' => true, 'samesite' => 'Lax'));
    session_name('WORDTIME_SESS');
    @session_start();
}

/* ── Журнал активности ────────────────────────────────────────────── */
function wt_log($text) {
    @file_put_contents(WT_DATA . '/activity.log', '[' . date('Y-m-d H:i:s') . '] ' . $text . "\n", FILE_APPEND);
}

/* ── Защита от подбора паролей ────────────────────────────────────── */
function wt_ip() { return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'cli'; }
function wt_attempt_locked($email) {
    $st = wt_db()->prepare('SELECT fails, locked_until FROM ' . wt_t('login_attempts') . ' WHERE ip = ? AND email = ?');
    $st->execute(array(wt_ip(), mb_strtolower(trim($email))));
    $row = $st->fetch();
    if (!$row) return 0;
    if ((int)$row['locked_until'] > time()) return (int)$row['locked_until'] - time();
    return 0;
}
function wt_attempt_fail($email) {
    $email = mb_strtolower(trim($email));
    wt_db()->prepare('INSERT INTO ' . wt_t('login_attempts') . ' (ip, email, fails, locked_until) VALUES (?, ?, 1, 0)
        ON DUPLICATE KEY UPDATE fails = fails + 1')->execute(array(wt_ip(), $email));
    $st = wt_db()->prepare('SELECT fails FROM ' . wt_t('login_attempts') . ' WHERE ip = ? AND email = ?');
    $st->execute(array(wt_ip(), $email));
    $fails = (int)$st->fetchColumn();
    if ($fails >= 5) {
        wt_db()->prepare('UPDATE ' . wt_t('login_attempts') . ' SET locked_until = ?, fails = 0 WHERE ip = ? AND email = ?')
            ->execute(array(time() + 60, wt_ip(), $email));
        wt_log('Подбор пароля: 5 неудачных попыток (' . $email . ') — блокировка 60 сек');
        return 0;
    }
    return $fails;
}
function wt_attempt_ok($email) {
    wt_db()->prepare('DELETE FROM ' . wt_t('login_attempts') . ' WHERE ip = ? AND email = ?')
        ->execute(array(wt_ip(), mb_strtolower(trim($email))));
}

/* ── Пользователи и вход ──────────────────────────────────────────── */
function wt_find_user($email) {
    $st = wt_db()->prepare('SELECT * FROM ' . wt_t('users') . ' WHERE user_email = ? LIMIT 1');
    $st->execute(array(mb_strtolower(trim($email))));
    return $st->fetch();
}
function wt_current_user() {
    wt_session_start();
    if (empty($_SESSION['wt_uid'])) return null;
    $st = wt_db()->prepare('SELECT * FROM ' . wt_t('users') . ' WHERE id = ? LIMIT 1');
    $st->execute(array((int)$_SESSION['wt_uid']));
    return $st->fetch();
}
function wt_login_user($uid) {
    wt_session_start();
    session_regenerate_id(true);
    $_SESSION['wt_uid'] = (int)$uid;
}
function wt_logout() {
    wt_session_start();
    $_SESSION = array();
    @session_destroy();
}

/* ── 2FA: шести-значный код ───────────────────────────────────────── */
function wt_rand6() { return (string)random_int(100000, 999999); }
function wt_2fa_start($user) {
    wt_session_start();
    $code = wt_rand6();
    $_SESSION['wt_2fa_uid'] = (int)$user['id'];
    $_SESSION['wt_2fa_hash'] = hash('sha256', $code . (defined('SECURE_KEY') ? SECURE_KEY : 'wt'));
    $_SESSION['wt_2fa_until'] = time() + 300;
    $_SESSION['wt_2fa_tries'] = 0;
    $body = "Здравствуйте, " . $user['user_login'] . "!\n\nКод подтверждения входа в консоль Wordtime:\n\n    " . $code . "\n\nКод действует 5 минут. Если это не вы — смените пароль.\n\n— Wordtime, " . date('d.m.Y H:i');
    $r = wt_mail($user['user_email'], 'Wordtime: код подтверждения входа', $body);
    wt_log('2FA: код отправлен пользователю ' . $user['user_email'] . ' (' . $r['method'] . ')');
    return $r;
}
function wt_2fa_verify($code) {
    wt_session_start();
    if (empty($_SESSION['wt_2fa_hash'])) return array(false, 'Сессия подтверждения истекла — войдите заново.');
    if (time() > $_SESSION['wt_2fa_until']) return array(false, 'Код просрочен (5 минут). Войдите заново.');
    if ($_SESSION['wt_2fa_tries'] >= 5) return array(false, 'Слишком много попыток. Войдите заново.');
    $_SESSION['wt_2fa_tries']++;
    if (!hash_equals($_SESSION['wt_2fa_hash'], hash('sha256', trim($code) . (defined('SECURE_KEY') ? SECURE_KEY : 'wt')))) {
        return array(false, 'Неверный код. Осталось попыток: ' . (5 - $_SESSION['wt_2fa_tries']) . '.');
    }
    $uid = (int)$_SESSION['wt_2fa_uid'];
    unset($_SESSION['wt_2fa_uid'], $_SESSION['wt_2fa_hash'], $_SESSION['wt_2fa_until'], $_SESSION['wt_2fa_tries']);
    return array(true, $uid);
}

/* ── Почта: SMTP → mail() → файл ──────────────────────────────────── */
function wt_mail($to, $subject, $body) {
    $from = (defined('WT_MAIL_FROM') && WT_MAIL_FROM !== '')
        ? WT_MAIL_FROM
        : 'Wordtime <no-reply@' . (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost') . '>';
    $headers = 'From: ' . $from . "\r\nContent-Type: text/plain; charset=utf-8\r\nX-Mailer: Wordtime/" . WT_VERSION . "\r\n";
    $smtpErr = 'SMTP не настроен';
    if (defined('WT_SMTP_HOST') && WT_SMTP_HOST !== '') {
        $r = wt_smtp_send($to, $subject, $body, $from);
        if ($r === true) return array('ok' => true, 'method' => 'SMTP (' . WT_SMTP_HOST . ')');
        $smtpErr = is_string($r) ? $r : 'ошибка SMTP';
    }
    if (function_exists('mail') && @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers)) {
        return array('ok' => true, 'method' => 'mail()');
    }
    $log = WT_DATA . '/2fa-log.txt';
    @file_put_contents($log, '[' . date('Y-m-d H:i:s') . "] Кому: $to\nТема: $subject\n\n$body\n----------------------------------------\n", FILE_APPEND);
    @chmod($log, 0600);
    return array('ok' => false, 'method' => 'файл', 'log' => wt_base() . '/wt-data/2fa-log.txt', 'error' => $smtpErr);
}
function wt_smtp_send($to, $subject, $body, $from) {
    $host = WT_SMTP_HOST;
    $port = defined('WT_SMTP_PORT') ? (int)WT_SMTP_PORT : 587;
    $addr = ($port === 465 ? 'ssl://' : '') . $host;
    $sock = @fsockopen($addr, $port, $errno, $errstr, 10);
    if (!$sock) return 'нет соединения: ' . $errstr;
    stream_set_timeout($sock, 10);
    $read = function () use ($sock) { $d = ''; while ($l = fgets($sock, 515)) { $d .= $l; if (isset($l[3]) && $l[3] === ' ') break; } return $d; };
    $cmd = function ($c, $expect) use ($sock, $read) { fwrite($sock, $c . "\r\n"); $r = $read(); return strpos($r, (string)$expect) === 0 ? $r : false; };
    $read();
    if (!$cmd('EHLO wordtime', 250)) { fclose($sock); return 'EHLO отклонён'; }
    if ($port === 587 && !$cmd('STARTTLS', 220)) { fclose($sock); return 'STARTTLS отклонён'; }
    if ($port === 587 && !@stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) { fclose($sock); return 'TLS не поднялся'; }
    if ($port === 587) $cmd('EHLO wordtime', 250);
    if (defined('WT_SMTP_USER') && WT_SMTP_USER !== '') {
        if (!$cmd('AUTH LOGIN', 334)) { fclose($sock); return 'AUTH отклонён'; }
        if (!$cmd(base64_encode(WT_SMTP_USER), 334)) { fclose($sock); return 'неверный логин SMTP'; }
        if (!$cmd(base64_encode(defined('WT_SMTP_PASS') ? WT_SMTP_PASS : ''), 235)) { fclose($sock); return 'неверный пароль SMTP'; }
    }
    $fromAddr = preg_match('/<(.+)>/', $from, $m) ? $m[1] : $from;
    if (!$cmd('MAIL FROM:<' . $fromAddr . '>', 250)) { fclose($sock); return 'MAIL FROM отклонён'; }
    if (!$cmd('RCPT TO:<' . $to . '>', 250)) { fclose($sock); return 'RCPT TO отклонён'; }
    if (!$cmd('DATA', 354)) { fclose($sock); return 'DATA отклонён'; }
    $msg = 'From: ' . $from . "\r\nTo: " . $to . "\r\nSubject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n"
        . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\nX-Mailer: Wordtime/" . WT_VERSION . "\r\n\r\n"
        . str_replace("\r\n.", "\r\n..", str_replace("\n", "\r\n", $body)) . "\r\n.";
    if (!$cmd($msg, 250)) { fclose($sock); return 'письмо не принято сервером'; }
    $cmd('QUIT', 221);
    fclose($sock);
    return true;
}

/* ── Файловый кеш (уважает настройку «Страничный кеш») ────────────── */
function wt_cache_get($key) {
    if (!wt_option('cache_enabled', true)) return null; /* кеш выключен — всегда «промах» */
    $f = WT_CACHE_DIR . '/' . md5($key) . '.cache';
    if (!is_file($f)) return null;
    $raw = @file_get_contents($f);
    if ($raw === false) return null;
    $d = @unserialize($raw);
    if ($d === false || (isset($d['exp']) && $d['exp'] < time())) return null;
    return $d['val'];
}
function wt_cache_set($key, $val, $ttl = 3600) {
    if (!wt_option('cache_enabled', true)) return; /* кеш выключен — не пишем */
    @file_put_contents(WT_CACHE_DIR . '/' . md5($key) . '.cache', serialize(array('exp' => time() + $ttl, 'val' => $val)));
}
function wt_cache_flush() {
    foreach ((array)@glob(WT_CACHE_DIR . '/*.cache') as $f) @unlink($f);
}
function wt_cache_size() {
    $s = 0; foreach ((array)@glob(WT_CACHE_DIR . '/*.cache') as $f) $s += filesize($f);
    return $s;
}

/* ── Очередь асинхронных задач (cron) ─────────────────────────────── */
function wt_queue_add($action, $payload = array()) {
    wt_db()->prepare('INSERT INTO ' . wt_t('queue') . ' (action, payload, created) VALUES (?, ?, NOW())')
        ->execute(array($action, json_encode($payload, JSON_UNESCAPED_UNICODE)));
}
function wt_queue_run($limit = 20) {
    $done = 0;
    $rows = wt_db()->query('SELECT * FROM ' . wt_t('queue') . ' ORDER BY id LIMIT ' . (int)$limit)->fetchAll();
    foreach ($rows as $row) {
        try {
            wt_do_action('wt_queue_' . $row['action'], json_decode($row['payload'], true));
        } catch (Throwable $e) {
            /* сбойный обработчик не должен валить cron и «вешать» остальные задачи */
            wt_log('Очередь: задача ' . $row['action'] . ' #' . $row['id'] . ' завершена с ошибкой: ' . $e->getMessage());
        }
        wt_db()->prepare('DELETE FROM ' . wt_t('queue') . ' WHERE id = ?')->execute(array($row['id']));
        $done++;
    }
    return $done;
}

/* ── Контент ──────────────────────────────────────────────────────── */
function wt_posts($args = array()) {
    $args = array_merge(array('limit' => 20, 'offset' => 0, 'category' => '', 's' => ''), $args);
    $key = 'posts:' . md5(serialize($args));
    $hit = wt_cache_get($key);
    if ($hit !== null) return $hit;
    $where = array('post_status = ?'); $params = array('published');
    if ($args['category'] !== '') { $where[] = 'category = ?'; $params[] = $args['category']; }
    if ($args['s'] !== '') { $where[] = '(post_title LIKE ? OR post_content LIKE ?)'; $params[] = '%' . $args['s'] . '%'; $params[] = '%' . $args['s'] . '%'; }
    $sql = 'SELECT * FROM ' . wt_t('posts') . ' WHERE ' . implode(' AND ', $where) . ' ORDER BY post_date DESC LIMIT ' . (int)($args['limit'] + 10) . ' OFFSET ' . (int)$args['offset'];
    $st = wt_db()->prepare($sql);
    $st->execute($params);
    $rows = array_values(array_filter($st->fetchAll(), 'wt_post_visible')); /* приватные и отложенные скрыты */
    $rows = array_slice($rows, 0, (int)$args['limit']);
    wt_cache_set($key, $rows, 600);
    return $rows;
}
function wt_post_by_slug($slug) {
    $st = wt_db()->prepare('SELECT * FROM ' . wt_t('posts') . ' WHERE slug = ? LIMIT 1');
    $st->execute(array($slug));
    return $st->fetch();
}
function wt_page_by_slug($slug) {
    $st = wt_db()->prepare('SELECT * FROM ' . wt_t('pages') . ' WHERE slug = ? LIMIT 1');
    $st->execute(array($slug));
    return $st->fetch();
}
function wt_pages_list() {
    return wt_db()->query('SELECT * FROM ' . wt_t('pages') . ' ORDER BY id')->fetchAll();
}
function wt_comments_of($post_id, $status = 'approved') {
    $st = wt_db()->prepare('SELECT * FROM ' . wt_t('comments') . ' WHERE post_id = ? AND status = ? ORDER BY created');
    $st->execute(array((int)$post_id, $status));
    return $st->fetchAll();
}
function wt_excerpt($text, $len = 0) {
    if ($len === 0) $len = (int)wt_apply_filters('wt_excerpt_length', 42);
    $t = trim(preg_replace('/\s+/', ' ', strip_tags((string)$text)));
    if (function_exists('mb_strlen') && mb_strlen($t) <= $len) return $t;
    $cut = function_exists('mb_substr') ? mb_substr($t, 0, $len) : substr($t, 0, $len);
    return rtrim($cut, ',.;: ') . '…';
}
function wt_slugify($s) {
    $map = array('а'=>'a','б'=>'b','в'=>'v','г'=>'g','д'=>'d','е'=>'e','ё'=>'e','ж'=>'zh','з'=>'z','и'=>'i','й'=>'y','к'=>'k','л'=>'l','м'=>'m','н'=>'n','о'=>'o','п'=>'p','р'=>'r','с'=>'s','т'=>'t','у'=>'u','ф'=>'f','х'=>'h','ц'=>'c','ч'=>'ch','ш'=>'sh','щ'=>'sch','ъ'=>'','ы'=>'y','ь'=>'','э'=>'e','ю'=>'yu','я'=>'ya');
    $s = mb_strtolower((string)$s);
    $s = strtr($s, $map);
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    return trim($s, '-') !== '' ? trim($s, '-') : substr(md5((string)microtime()), 0, 6);
}
function wt_categories() {
    $c = wt_option('categories', array('Без рубрики'));
    return is_array($c) && count($c) > 0 ? $c : array('Без рубрики');
}

/* ── Загрузка медиафайлов + оптимизация (GD) ──────────────────────── */
function wt_handle_upload($field) {
    if (empty($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) return array(false, 'Файл не получен или ошибка загрузки.');
    $f = $_FILES[$field];
    if ($f['size'] > 20 * 1024 * 1024) return array(false, 'Файл больше 20 МБ.');
    $ok = array('jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'mp4');
    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $ok, true)) return array(false, 'Тип файла не разрешён.');
    $sub = date('Y/m');
    $dir = WT_UPLOADS . '/' . $sub;
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $name = substr(md5(uniqid('', true)), 0, 10) . '.' . $ext;
    if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $name)) return array(false, 'Не удалось сохранить файл.');
    $optimized = false;
    $maxW = (int)wt_option('img_max_width', 1920);
    $quality = (int)wt_option('img_quality', 82);
    if (wt_option('img_auto', true) && $maxW > 0 && function_exists('imagecreatefromstring')
        && in_array($ext, array('jpg', 'jpeg', 'png', 'webp'), true)) {
        $path = $dir . '/' . $name;
        $img = @imagecreatefromstring((string)file_get_contents($path));
        if ($img) {
            $w = imagesx($img); $h = imagesy($img);
            if ($w > $maxW) {
                $nh = (int)round($h * $maxW / $w);
                $res = imagecreatetruecolor($maxW, $nh);
                imagecopyresampled($res, $img, 0, 0, 0, 0, $maxW, $nh, $w, $h);
                if ($ext === 'png') imagepng($res, $path, 6);
                elseif ($ext === 'webp' && function_exists('imagewebp')) imagewebp($res, $path, $quality);
                else imagejpeg($res, $path, $quality);
                imagedestroy($res);
                $optimized = true;
                wt_log('Изображение оптимизировано: ' . $w . 'px → ' . $maxW . 'px (' . $name . ')');
            }
            imagedestroy($img);
        }
    }
    /* метаданные файла (заголовок по имени) — как в медиатеке WordPress */
    wt_media_meta($sub . '/' . $name, array('title' => preg_replace('/\.[a-z0-9]+$/i', '', $f['name']), 'alt' => '', 'caption' => ''));
    return array(true, array('url' => wt_asset('wt-content/uploads/' . $sub . '/' . $name), 'name' => $f['name'], 'size' => filesize($dir . '/' . $name), 'optimized' => $optimized));
}

/* ── SEO: title / description в <head> (шаблоны из настроек) ──────── */
function wt_head($title, $desc, $canonical = '') {
    $tpl = (string)wt_option('title_template', '');
    if ($tpl !== '' && strpos($tpl, '{title}') !== false) {
        $title = strtr($tpl, array('{title}' => $title, '{site}' => wt_option('site_title', 'Wordtime')));
    }
    $dtpl = (string)wt_option('desc_template', '');
    if ($dtpl !== '' && strpos($dtpl, '{excerpt}') !== false) {
        $desc = strtr($dtpl, array('{excerpt}' => $desc, '{site}' => wt_option('site_title', 'Wordtime')));
    }
    if (trim((string)$desc) === '') $desc = (string)wt_option('desc_fallback', 'Сайт работает на Wordtime CMS');
    $title = esc(wt_apply_filters('wt_title', $title));
    $desc = esc(wt_apply_filters('wt_description', $desc));
    $canonical = $canonical !== '' ? esc_url($canonical) : '';
    echo "<title>" . $title . "</title>\n";
    echo "<meta name=\"description\" content=\"" . $desc . "\">\n";
    if ($canonical !== '') echo "<link rel=\"canonical\" href=\"" . $canonical . "\">\n";
    echo "<meta property=\"og:title\" content=\"" . $title . "\">\n";
    echo "<meta property=\"og:description\" content=\"" . $desc . "\">\n";
    echo "<meta property=\"og:type\" content=\"website\">\n";
    if ($canonical !== '') echo "<meta property=\"og:url\" content=\"" . $canonical . "\">\n";
    wt_do_action('wt_head');
}

/* ── Sitemap и robots ─────────────────────────────────────────────── */
function wt_site_origin() {
    return (isset($_SERVER['REQUEST_SCHEME']) ? $_SERVER['REQUEST_SCHEME'] : 'https') . '://'
        . (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost') . wt_base();
}
function wt_sitemap_xml() {
    $base = wt_site_origin();
    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    $xml .= "  <url><loc>" . esc($base . '/') . "</loc><priority>1.0</priority><changefreq>daily</changefreq></url>\n";
    foreach (wt_posts(array('limit' => 500)) as $p) {
        $xml .= "  <url><loc>" . esc($base . '/?p=post:' . $p['slug']) . "</loc><lastmod>" . date('Y-m-d', strtotime($p['post_date'])) . "</lastmod><priority>0.8</priority></url>\n";
    }
    foreach (wt_pages_list() as $pg) {
        $xml .= "  <url><loc>" . esc($base . '/?p=page:' . $pg['slug']) . "</loc><priority>0.6</priority></url>\n";
    }
    $xml .= "</urlset>\n";
    return $xml;
}
function wt_sitemap() {
    header('Content-Type: application/xml; charset=utf-8');
    echo wt_sitemap_xml();
}
function wt_robots() {
    header('Content-Type: text/plain; charset=utf-8');
    echo "User-agent: *\nAllow: /\nDisallow: /wt-admin\nDisallow: /wt-includes\nDisallow: /wt-data\n\nSitemap: " . wt_site_origin() . "/?p=sitemap.xml\n";
}

/* ── REST API для мобильных приложений ────────────────────────────── */
function wt_api_key_ok($key) {
    if ($key === '') return false;
    $st = wt_db()->prepare('SELECT * FROM ' . wt_t('api_keys') . ' WHERE key_hash = ? LIMIT 1');
    $st->execute(array(hash('sha256', $key)));
    $row = $st->fetch();
    if (!$row) return false;
    $f = WT_DATA . '/rate_' . substr(md5($key), 0, 8) . '.json';
    $d = is_file($f) ? json_decode((string)file_get_contents($f), true) : array('t' => 0, 'n' => 0);
    if (!is_array($d)) $d = array('t' => 0, 'n' => 0);
    if (time() - $d['t'] > 60) $d = array('t' => time(), 'n' => 0);
    $d['n']++;
    @file_put_contents($f, json_encode($d));
    if ($d['n'] > 120) return 'limit';
    return $row;
}
function wt_rest_handle($route) {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Headers: Content-Type, X-WT-Key');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
    $route = trim((string)$route, '/');
    $parts = $route !== '' ? explode('/', $route) : array();
    $resource = isset($parts[0]) ? $parts[0] : '';
    $method = $_SERVER['REQUEST_METHOD'];
    $json = function ($data, $code = 200) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT); exit; };
    if ($method === 'GET' && $resource === 'posts') $json(array('data' => wt_posts(array('limit' => isset($_GET['per_page']) ? (int)$_GET['per_page'] : 20))));
    if ($method === 'GET' && $resource === 'pages') $json(array('data' => wt_pages_list()));
    if ($method === 'GET' && $resource === 'info') $json(array('data' => array('site' => wt_option('site_title', 'Wordtime'), 'version' => WT_VERSION, 'tagline' => wt_option('tagline', ''))));
    if ($method === 'GET' && $resource === 'media') $json(array('data' => wt_media_list()));
    if ($resource === 'comments' && $method === 'POST') {
        $key = isset($_SERVER['HTTP_X_WT_KEY']) ? $_SERVER['HTTP_X_WT_KEY'] : '';
        $auth = wt_api_key_ok($key);
        if ($auth === false) $json(array('error' => 'Неверный API-ключ'), 401);
        if ($auth === 'limit') $json(array('error' => 'Лимит 120 запросов в минуту'), 429);
        $in = json_decode((string)file_get_contents('php://input'), true);
        $post_id = isset($in['post_id']) ? (int)$in['post_id'] : 0;
        $author = isset($in['author']) ? trim(strip_tags($in['author'])) : '';
        $text = isset($in['text']) ? trim(strip_tags($in['text'])) : '';
        if ($post_id < 1 || $author === '' || $text === '') $json(array('error' => 'post_id, author и text обязательны'), 422);
        $st = wt_db()->prepare('INSERT INTO ' . wt_t('comments') . ' (post_id, author, email, text, status, created) VALUES (?, ?, ?, ?, ?, NOW())');
        $st->execute(array($post_id, mb_substr($author, 0, 80), '', mb_substr($text, 0, 2000), 'pending'));
        wt_log('REST: новый комментарий к записи #' . $post_id . ' (API)');
        $json(array('data' => array('id' => (int)wt_db()->lastInsertId(), 'status' => 'pending')), 201);
    }
    if ($resource === 'cache' && $method === 'POST') {
        $key = isset($_SERVER['HTTP_X_WT_KEY']) ? $_SERVER['HTTP_X_WT_KEY'] : '';
        $auth = wt_api_key_ok($key);
        if ($auth === false) $json(array('error' => 'Неверный API-ключ'), 401);
        wt_cache_flush();
        wt_log('REST: кеш очищен через API');
        $json(array('data' => array('flushed' => true)));
    }
    $json(array('error' => 'Маршрут не найден: /wt/v1/' . $route), 404);
}

/* ── Разбор SQL-дампа: корректное разбиение на запросы ──────────────
   Понимает одинарные/двойные кавычки, экранирование (\', '', \"),
   обратные кавычки идентификаторов и комментарии (--, #, блоки).
   Точка с запятой ВНУТРИ строковых значений запрос не разрывает.   */
function wt_sql_statements($sql) {
    $out = array(); $buf = '';
    $len = strlen((string)$sql);
    $inS = false; $inD = false; $inB = false; $inLine = false; $inBlock = false;
    for ($i = 0; $i < $len; $i++) {
        $ch = $sql[$i];
        $nx = $i + 1 < $len ? $sql[$i + 1] : '';
        if ($inLine) { if ($ch === "\n") $inLine = false; continue; }
        if ($inBlock) { if ($ch === '*' && $nx === '/') { $i++; $inBlock = false; } continue; }
        if ($inS) {
            $buf .= $ch;
            if ($ch === '\\' && $nx !== '') { $buf .= $nx; $i++; continue; }
            if ($ch === "'") { if ($nx === "'") { $buf .= "'"; $i++; } else $inS = false; }
            continue;
        }
        if ($inD) {
            $buf .= $ch;
            if ($ch === '\\' && $nx !== '') { $buf .= $nx; $i++; continue; }
            if ($ch === '"') $inD = false;
            continue;
        }
        if ($inB) { $buf .= $ch; if ($ch === '`') $inB = false; continue; }
        if ($ch === '-' && $nx === '-' && ($i + 2 >= $len || $sql[$i + 2] === ' ' || $sql[$i + 2] === "\t" || $sql[$i + 2] === "\n" || $sql[$i + 2] === "\r")) { $inLine = true; continue; }
        if ($ch === '#') { $inLine = true; continue; }
        if ($ch === '/' && $nx === '*') { $inBlock = true; $i++; continue; }
        if ($ch === "'") { $inS = true; $buf .= $ch; continue; }
        if ($ch === '"') { $inD = true; $buf .= $ch; continue; }
        if ($ch === '`') { $inB = true; $buf .= $ch; continue; }
        if ($ch === ';') {
            $stmt = trim($buf);
            if ($stmt !== '') $out[] = $stmt;
            $buf = '';
            continue;
        }
        $buf .= $ch;
    }
    $stmt = trim($buf);
    if ($stmt !== '') $out[] = $stmt;
    return $out;
}

/* ── Резервные копии ──────────────────────────────────────────────── */
function wt_backup_db_sql() {
    $sql = "-- Wordtime CMS " . WT_VERSION . " — дамп базы от " . date('Y-m-d H:i:s') . "\nSET NAMES utf8mb4;\n\n";
    $tables = wt_db()->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $t) {
        $sql .= "DROP TABLE IF EXISTS `" . $t . "`;\n";
        $sql .= wt_db()->query('SHOW CREATE TABLE `' . $t . '`')->fetchColumn(1) . ";\n\n";
        $rows = wt_db()->query('SELECT * FROM `' . $t . '`')->fetchAll();
        foreach ($rows as $row) {
            $vals = array();
            foreach ($row as $v) $vals[] = $v === null ? 'NULL' : wt_db()->quote((string)$v);
            $sql .= 'INSERT INTO `' . $t . '` VALUES (' . implode(', ', $vals) . ");\n";
        }
        $sql .= "\n";
    }
    return $sql;
}
function wt_backup_zip() {
    if (!class_exists('ZipArchive')) return array(false, 'Расширение zip недоступно на хостинге.');
    $name = 'wordtime-full-' . date('Ymd-His') . '.zip';
    $path = WT_DATA . '/backups/' . $name;
    $zip = new ZipArchive();
    if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) return array(false, 'Не удалось создать архив.');
    $skip = array('wt-data', '.git');
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(WT_ROOT, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $file) {
        $rel = substr($file->getPathname(), strlen(WT_ROOT) + 1);
        $top = explode('/', str_replace('\\', '/', $rel));
        if (in_array($top[0], $skip, true)) continue;
        if ($file->isFile()) $zip->addFile($file->getPathname(), 'Wordtime_cms/' . $rel);
    }
    $zip->addFromString('Wordtime_cms/backup-database.sql', wt_backup_db_sql());
    $zip->close();
    return array(true, $name);
}

/* ── Тема ─────────────────────────────────────────────────────────── */
function wt_theme_dir() {
    $t = wt_option('active_theme', 'wordtime-twenty');
    $dir = WT_ROOT . '/wt-content/themes/' . $t;
    return is_dir($dir) ? $dir : WT_ROOT . '/wt-content/themes/wordtime-twenty';
}
function wt_load_theme_functions() {
    $f = wt_theme_dir() . '/functions.php';
    if (is_file($f)) require_once $f;
}

/* ── Плагины: ЕДИНСТВЕННАЯ точка загрузки (ядро уважает статус) ───── */
function wt_load_plugins() {
    $active = wt_option('active_plugins', array());
    if (!is_array($active)) return;
    foreach ($active as $file) {
        $file = basename((string)$file);
        $path = WT_ROOT . '/wt-content/plugins/' . $file;
        if (substr($file, -4) === '.php' && is_file($path)) require_once $path;
    }
}

/* ── Комментарии с сайта ──────────────────────────────────────────── */
function wt_comment_submit() {
    if (!wt_check_nonce('comment')) return 'Проверка безопасности не пройдена — обновите страницу и попробуйте снова.';
    if (!empty($_POST['website'])) return null; /* honeypot */
    if (wt_option('comments_disabled', false)) return 'Комментарии на сайте отключены.';
    $post_id = isset($_POST['post_id']) ? (int)$_POST['post_id'] : 0;
    $author = isset($_POST['author']) ? trim(strip_tags($_POST['author'])) : '';
    $email = isset($_POST['email']) ? trim(strip_tags($_POST['email'])) : '';
    $text = isset($_POST['text']) ? trim(strip_tags($_POST['text'])) : '';
    if ($post_id < 1 || $author === '' || $text === '') return 'Заполните имя и текст комментария.';
    $status = wt_option('moderate_first', true) ? 'pending' : 'approved';
    wt_db()->prepare('INSERT INTO ' . wt_t('comments') . ' (post_id, author, email, text, status, created) VALUES (?, ?, ?, ?, ?, NOW())')
        ->execute(array($post_id, mb_substr($author, 0, 80), mb_substr($email, 0, 120), mb_substr($text, 0, 2000), $status));
    wt_cache_flush();
    wt_log('Новый комментарий от ' . $author . ' к записи #' . $post_id . ' (' . $status . ')');
    return null;
}

/* ── Помощники хуков (нужны слою совместимости) ───────────────────── */
function wt_has_hook($kind, $tag, $fn = false) {
    $g = $kind === 'a' ? 'wt_actions' : 'wt_filters';
    if (empty($GLOBALS[$g][$tag])) return false;
    if ($fn === false) return true;
    foreach ($GLOBALS[$g][$tag] as $fns) foreach ($fns as $f) if ($f === $fn) return true;
    return false;
}
function wt_remove_hook($kind, $tag, $fn, $priority = 10) {
    $g = $kind === 'a' ? 'wt_actions' : 'wt_filters';
    if (empty($GLOBALS[$g][$tag][$priority])) return;
    foreach ($GLOBALS[$g][$tag][$priority] as $i => $f) {
        if ($f === $fn) { unset($GLOBALS[$g][$tag][$priority][$i]); return; }
    }
}
function wt_footer() {
    wt_do_action('wt_footer');
    if (function_exists('wp_footer')) wp_footer();
}

/* ── Постоянные ссылки (как в WordPress) ──────────────────────────── */
function wt_permalink_structure() { return (string)wt_option('permalink_structure', ''); }
function wt_permalink($post) {
    $s = wt_permalink_structure();
    $slug = is_array($post) ? $post['slug'] : $post;
    if ($s === '') return wt_url('post:' . $slug);
    $date = is_array($post) && !empty($post['post_date']) ? strtotime($post['post_date']) : time();
    $cat = is_array($post) && !empty($post['category']) ? wt_slugify($post['category']) : 'bez-rubriki';
    $map = array('%postname%' => $slug, '%year%' => date('Y', $date), '%monthnum%' => date('m', $date),
        '%day%' => date('d', $date), '%category%' => $cat, '%post_id%' => is_array($post) ? $post['id'] : '');
    $path = strtr($s, $map);
    return wt_base() . '/' . ltrim($path, '/');
}
function wt_permalink_page($pg) {
    $s = wt_permalink_structure();
    $slug = is_array($pg) ? $pg['slug'] : $pg;
    if ($s === '') return wt_url('page:' . $slug);
    return wt_base() . '/' . ltrim($slug, '/') . '/';
}
function wt_parse_pretty_url() {
    /* Возвращает массив route-параметров, если REQUEST_URI — красивая ссылка */
    $uri = isset($_SERVER['REQUEST_URI']) ? (string)$_SERVER['REQUEST_URI'] : '/';
    $path = parse_url($uri, PHP_URL_PATH);
    $base = wt_base();
    if ($base !== '' && strpos($path, $base) === 0) $path = substr($path, strlen($base));
    $path = trim((string)$path, '/');
    if ($path === '' || strpos($path, 'wt-admin') === 0 || strpos($path, 'wt-data') === 0) return null;
    $seg = array_values(array_filter(explode('/', $path), 'strlen'));
    $n = count($seg);
    if ($n === 0) return null;
    $slug = function ($s) { return preg_replace('/[^a-z0-9-]/', '', mb_strtolower($s)); };
    /* /страница/ имеет приоритет, затем структуры записей */
    $page = wt_page_by_slug($slug($seg[$n - 1]));
    if ($n === 1 && $page) return array('p' => 'page:' . $page['slug']);
    if ($n === 1) { $post = wt_post_by_slug($slug($seg[0])); if ($post) return array('p' => 'post:' . $post['slug']); return null; }
    if ($n === 2) { $post = wt_post_by_slug($slug($seg[1])); if ($post) return array('p' => 'post:' . $post['slug']); return null; }
    if ($n === 3 && ctype_digit($seg[0]) && ctype_digit($seg[1])) {
        $post = wt_post_by_slug($slug($seg[2]));
        if ($post) return array('p' => 'post:' . $post['slug']);
    }
    return null;
}

/* ── Публикация: видимость, пароль, отложенные записи ─────────────── */
function wt_post_visible($p) {
    if (!is_array($p)) return false;
    if ($p['post_status'] !== 'published') return false;
    if (!empty($p['post_date']) && strtotime($p['post_date']) > time()) return false; /* отложенная */
    $vis = isset($p['visibility']) ? $p['visibility'] : 'public';
    return $vis !== 'private';
}
function wt_post_unlocked($p) {
    if (empty($p['post_password'])) return true;
    wt_session_start();
    return in_array((int)$p['id'], (array)(isset($_SESSION['wt_pp']) ? $_SESSION['wt_pp'] : array()), true);
}

/* ── Медиафайлы: метаданные (заголовок, alt, подпись) как в WordPress ── */
function wt_media_meta($file, $data = null) {
    try {
        if ($data === null) {
            $st = wt_db()->prepare('SELECT * FROM ' . wt_t('media') . ' WHERE file = ? LIMIT 1');
            $st->execute(array($file));
            return $st->fetch();
        }
        $st = wt_db()->prepare('INSERT INTO ' . wt_t('media') . ' (file, title, alt, caption) VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE title = VALUES(title), alt = VALUES(alt), caption = VALUES(caption)');
        $st->execute(array($file, $data['title'], $data['alt'], $data['caption']));
        return true;
    } catch (Exception $e) { return $data === null ? false : false; }
}
function wt_media_list() {
    $out = array();
    if (!is_dir(WT_UPLOADS)) return $out;
    try {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(WT_UPLOADS, FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) {
            if (!$f->isFile()) continue;
            $rel = str_replace('\\', '/', substr($f->getPathname(), strlen(WT_UPLOADS) + 1));
            if (basename($rel) === 'index.html' || basename($rel) === '.htaccess') continue;
            $meta = wt_media_meta($rel);
            $out[] = array(
                'file' => $rel,
                'url' => wt_asset('wt-content/uploads/' . $rel),
                'name' => basename($rel),
                'size' => $f->getSize(),
                'time' => $f->getMTime(),
                'title' => $meta ? $meta['title'] : preg_replace('/\.[a-z0-9]+$/i', '', basename($rel)),
                'alt' => $meta ? $meta['alt'] : '',
                'caption' => $meta ? $meta['caption'] : '',
                'image' => (bool)preg_match('/\.(jpe?g|png|gif|webp)$/i', $rel),
            );
        }
    } catch (Exception $e) { /* каталог недоступен */ }
    usort($out, function ($a, $b) { return $b['time'] - $a['time']; });
    return $out;
}

/* ── Виджеты (как в WordPress: области + набор виджетов) ──────────── */
function wt_widgets_all() {
    $w = wt_option('wt_widgets', null);
    if (!is_array($w)) {
        $w = array(
            'sidebar-1' => array(
                array('type' => 'search', 'title' => 'Поиск', 'text' => '', 'count' => 5),
                array('type' => 'recent', 'title' => 'Свежие записи', 'text' => '', 'count' => 5),
                array('type' => 'categories', 'title' => 'Рубрики', 'text' => '', 'count' => 5),
            ),
            'footer-1' => array(array('type' => 'text', 'title' => 'О сайте', 'text' => "Сайт работает на Wordtime CMS.", 'count' => 5)),
            'footer-2' => array(array('type' => 'menu', 'title' => 'Разделы', 'text' => '', 'count' => 5)),
        );
    }
    return $w;
}
function wt_widgets_of($sidebar_id) {
    $all = wt_widgets_all();
    return isset($all[$sidebar_id]) ? $all[$sidebar_id] : array();
}
function wt_widgets_save($sidebar_id, $items) {
    $all = wt_widgets_all();
    $all[$sidebar_id] = $items;
    wt_set_option('wt_widgets', $all);
    wt_cache_flush();
}
function wt_widget_types() {
    return array(
        'text' => array('Текст', 'Произвольный текст с заголовком'),
        'html' => array('Произвольный HTML', 'HTML-код (безопасный)'),
        'search' => array('Поиск', 'Форма поиска по сайту'),
        'recent' => array('Свежие записи', 'Список последних записей'),
        'categories' => array('Рубрики', 'Список рубрик сайта'),
        'menu' => array('Меню', 'Пункты меню сайта из консоли'),
    );
}
function wt_render_sidebar($sidebar_id) {
    $sidebars = function_exists('wp_get_sidebars') ? wp_get_sidebars() : array($sidebar_id => array('id' => $sidebar_id, 'before_widget' => '<div class="widget">', 'after_widget' => '</div>', 'before_title' => '<h3 class="widget-title">', 'after_title' => '</h3>'));
    $sb = isset($sidebars[$sidebar_id]) ? $sidebars[$sidebar_id] : array('before_widget' => '<div class="widget %1$s">', 'after_widget' => '</div>', 'before_title' => '<h3 class="widget-title">', 'after_title' => '</h3>');
    $items = wt_widgets_of($sidebar_id);
    foreach ($items as $i => $w) {
        $type = isset($w['type']) ? $w['type'] : 'text';
        $title = isset($w['title']) ? (string)$w['title'] : '';
        $bw = str_replace('%1$s', 'widget-' . preg_replace('/[^a-z0-9-]/', '', $type), $sb['before_widget']);
        echo $bw;
        if ($title !== '') echo $sb['before_title'] . esc($title) . $sb['after_title'];
        switch ($type) {
            case 'text':
                echo '<div class="widget-text">' . wpautop(esc(isset($w['text']) ? $w['text'] : '')) . '</div>';
                break;
            case 'html':
                echo wt_kses(isset($w['text']) ? $w['text'] : '');
                break;
            case 'search':
                echo '<form class="widget-search" method="get" action="' . esc_attr(wt_base() . '/') . '"><input type="hidden" name="p" value=""><input type="search" name="s" placeholder="Найти…" value="' . esc_attr(isset($_GET['s']) ? (string)$_GET['s'] : '') . '"><button type="submit">→</button></form>';
                break;
            case 'recent':
                $posts = wt_posts(array('limit' => max(1, (int)(isset($w['count']) ? $w['count'] : 5))));
                echo '<ul class="widget-list">';
                foreach ($posts as $p) echo '<li><a href="' . esc_url(wt_permalink($p)) . '">' . esc($p['post_title']) . '</a></li>';
                echo '</ul>';
                break;
            case 'categories':
                echo '<ul class="widget-list">';
                foreach (wt_categories() as $c) echo '<li><a href="' . esc_url(wt_base() . '/?p=&category=' . rawurlencode($c)) . '">' . esc($c) . '</a></li>';
                echo '</ul>';
                break;
            case 'menu':
                $m = wt_option('site_menu', array());
                echo '<ul class="widget-list">';
                foreach ((array)$m as $it) if (is_array($it)) echo '<li><a href="' . wt_menu_href($it['url']) . '">' . esc($it['label']) . '</a></li>';
                echo '</ul>';
                break;
            case 'wpclass':
                /* виджет, зарегистрированный WP-плагином через register_widget() */
                $cls = isset($w['class']) ? $w['class'] : '';
                if ($cls !== '' && !empty($GLOBALS['wt_widget_classes'][$cls])) {
                    $args = array('before_widget' => '', 'after_widget' => '', 'before_title' => $sb['before_title'], 'after_title' => $sb['after_title']);
                    try { $GLOBALS['wt_widget_classes'][$cls]->widget($args, $w); } catch (Throwable $e) { wt_log('Виджет ' . $cls . ': ' . $e->getMessage()); }
                }
                break;
        }
        echo $sb['after_widget'];
    }
}

/* ── Каталог WordPress.org: поиск плагинов и тем ──────────────────── */
function wt_wp_api($kind, $search = '', $page = 1) {
    /* Публичное API wordpress.org; кеш результатов — 1 час */
    $cache = WT_DATA . '/wpcatalog-' . $kind . '-' . md5($search . '|' . $page) . '.json';
    if (is_file($cache) && time() - filemtime($cache) < 3600) {
        $d = json_decode((string)file_get_contents($cache), true);
        if (is_array($d)) return $d;
    }
    $req = array('search' => $search, 'per_page' => 18, 'page' => max(1, (int)$page),
        'fields' => array('download_link' => true, 'icons' => true, 'ratings' => true, 'downloaded' => true, 'active_installs' => true, 'screenshot_url' => true, 'num_ratings' => true));
    $url = 'https://api.wordpress.org/' . ($kind === 'plugins' ? 'plugins' : 'themes') . '/info/1.2/?action=' . ($kind === 'plugins' ? 'query_plugins' : 'query_themes') . '&' . http_build_query(array('request' => $req));
    $body = null;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, array(CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12, CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_USERAGENT => 'Wordtime/' . WT_VERSION, CURLOPT_SSL_VERIFYPEER => true));
        $body = curl_exec($ch);
        curl_close($ch);
    } else {
        $ctx = stream_context_create(array('http' => array('timeout' => 12, 'user_agent' => 'Wordtime/' . WT_VERSION)));
        $body = @file_get_contents($url, false, $ctx);
    }
    if (!$body) return null;
    $d = json_decode($body, true);
    if (!is_array($d)) return null;
    @file_put_contents($cache, $body);
    return $d;
}
function wt_install_wp_zip($download_url, $kind) {
    /* Установка плагина/темы из ZIP WordPress.org — как в самой WordPress:
       скачиваем архив, распаковываем в каталог, плагин можно активировать. */
    if (!class_exists('ZipArchive')) return array(false, 'На хостинге нет расширения zip — включите его в панели (раздел PHP-расширения).');
    $u = parse_url((string)$download_url);
    $host = isset($u['host']) ? strtolower($u['host']) : '';
    if ((!isset($u['scheme']) || $u['scheme'] !== 'https') || !preg_match('/(^|\.)wordpress\.org$/', $host)) {
        return array(false, 'Установка разрешена только из каталога WordPress.org (downloads.wordpress.org).');
    }
    $tmpZip = WT_DATA . '/dl-' . md5($download_url) . '.zip';
    $ok = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($download_url);
        $fp = fopen($tmpZip, 'w+');
        curl_setopt_array($ch, array(CURLOPT_FILE => $fp, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 60, CURLOPT_USERAGENT => 'Wordtime/' . WT_VERSION));
        $ok = curl_exec($ch) !== false;
        curl_close($ch); fclose($fp);
    } else {
        $ctx = stream_context_create(array('http' => array('timeout' => 60, 'user_agent' => 'Wordtime/' . WT_VERSION)));
        $data = @file_get_contents($download_url, false, $ctx);
        $ok = $data !== false && @file_put_contents($tmpZip, $data) !== false;
    }
    if (!$ok || !is_file($tmpZip) || filesize($tmpZip) < 100) { @unlink($tmpZip); return array(false, 'Не удалось скачать архив с WordPress.org.'); }
    $tmpDir = WT_DATA . '/unzip-' . md5($download_url . microtime());
    @mkdir($tmpDir, 0755, true);
    $zip = new ZipArchive();
    if ($zip->open($tmpZip) !== true) { @unlink($tmpZip); return array(false, 'Архив повреждён.'); }
    $zip->extractTo($tmpDir);
    $zip->close();
    @unlink($tmpZip);
    /* корень пакета: сам каталог, либо единственная папка внутри */
    $entries = array_values(array_diff(scandir($tmpDir), array('.', '..')));
    $src = count($entries) === 1 && is_dir($tmpDir . '/' . $entries[0]) ? $tmpDir . '/' . $entries[0] : $tmpDir;
    $name = basename($src) !== basename($tmpDir) ? basename($src) : preg_replace('/[^a-z0-9-]/i', '-', pathinfo(parse_url($download_url, PHP_URL_PATH), PATHINFO_FILENAME));
    $destParent = WT_ROOT . '/wt-content/' . ($kind === 'plugins' ? 'plugins' : 'themes');
    $dest = $destParent . '/' . $name;
    if (is_dir($dest)) { wt_rrmdir($tmpDir); return array(false, '«' . esc($name) . '» уже установлен.'); }
    if (!@rename($src, $dest)) {
        /* rename не сработал между разделами — копируем рекурсивно */
        wt_rcopy($src, $dest);
    }
    wt_rrmdir($tmpDir);
    if ($kind === 'plugins') {
        if (!empty($GLOBALS['wt_activate_hooks'])) foreach ($GLOBALS['wt_activate_hooks'] as $f => $fn) { try { $fn(); } catch (Throwable $e) {} }
    }
    wt_log(($kind === 'plugins' ? 'Плагин' : 'Тема') . ' «' . $name . '» установлен из каталога WordPress.org');
    wt_cache_flush();
    return array(true, $name);
}
function wt_rrmdir($dir) {
    if (!is_dir($dir)) { @unlink($dir); return; }
    foreach ((array)@scandir($dir) as $f) {
        if ($f === '.' || $f === '..') continue;
        $p = $dir . '/' . $f;
        is_dir($p) ? wt_rrmdir($p) : @unlink($p);
    }
    @rmdir($dir);
}
function wt_rcopy($src, $dst) {
    if (!is_dir($dst)) @mkdir($dst, 0755, true);
    foreach ((array)@scandir($src) as $f) {
        if ($f === '.' || $f === '..') continue;
        $s = $src . '/' . $f; $d = $dst . '/' . $f;
        is_dir($s) ? wt_rcopy($s, $d) : @copy($s, $d);
    }
}
/** Установка плагина/темы из загруженного ZIP-архива WordPress —
 *  аналог «Загрузить плагин/тему» в самой WordPress:
 *  распаковка, поиск главного файла, проверка структуры.           */
function wt_install_zip_upload($field, $kind) {
    if (empty($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) return array(false, 'Файл не получен или ошибка загрузки.', '');
    $f = $_FILES[$field];
    if (strtolower(pathinfo($f['name'], PATHINFO_EXTENSION)) !== 'zip') return array(false, 'Нужен ZIP-архив (.zip) — стандартная упаковка WordPress.', '');
    if ($f['size'] > 64 * 1024 * 1024) return array(false, 'Архив больше 64 МБ.', '');
    if (!class_exists('ZipArchive')) return array(false, 'На хостинге нет расширения zip — включите его в панели (PHP-расширения).', '');
    $zip = new ZipArchive();
    if ($zip->open($f['tmp_name']) !== true) return array(false, 'Архив повреждён или защищён паролем.', '');
    $tmp = WT_DATA . '/unpack-up-' . md5(uniqid('', true));
    @mkdir($tmp, 0755, true);
    /* Распаковка файл за файлом с санацией путей (защита от ../ и абсолютных путей) */
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $en = $zip->getNameIndex($i);
        if ($en === false) continue;
        $en = str_replace('\\', '/', $en);
        if ($en === '' || $en[0] === '/') continue;
        $segs = array(); $bad = false;
        foreach (explode('/', $en) as $seg) {
            if ($seg === '' || $seg === '.') continue;
            if ($seg === '..') { $bad = true; break; }
            $segs[] = $seg;
        }
        if ($bad || count($segs) === 0) continue;
        $dst = $tmp . '/' . implode('/', $segs);
        if (substr($en, -1) === '/') { @mkdir($dst, 0755, true); continue; }
        @mkdir(dirname($dst), 0755, true);
        $data = $zip->getFromIndex($i);
        if ($data === false) continue;
        @file_put_contents($dst, $data);
    }
    $zip->close();
    /* Корень пакета: единственная папка верхнего уровня (как пакует WordPress) */
    $entries = array_values(array_diff((array)@scandir($tmp), array('.', '..')));
    if (count($entries) === 0) { wt_rrmdir($tmp); return array(false, 'Архив пуст.', ''); }
    $src = (count($entries) === 1 && is_dir($tmp . '/' . $entries[0])) ? $tmp . '/' . $entries[0] : $tmp;
    $name = basename($src) !== basename($tmp) ? basename($src) : preg_replace('/\.zip$/i', '', pathinfo($f['name'], PATHINFO_FILENAME));
    $name = preg_replace('/[^a-z0-9._-]/i', '-', $name);
    $destParent = WT_ROOT . '/wt-content/' . ($kind === 'plugins' ? 'plugins' : 'themes');
    $dest = $destParent . '/' . $name;
    if (is_dir($dest)) { wt_rrmdir($tmp); return array(false, '«' . esc($name) . '» уже установлен.', $name); }

    if ($kind === 'plugins') {
        /* главный файл плагина — первый .php с заголовком «Plugin Name:» (правило WordPress) */
        $main = '';
        $scan = function ($dir) use (&$scan, &$main) {
            foreach ((array)@scandir($dir) as $ff) {
                if ($ff === '.' || $ff === '..' || $main !== '') continue;
                $p = $dir . '/' . $ff;
                if (is_dir($p)) { $scan($p); continue; }
                if (strtolower(pathinfo($ff, PATHINFO_EXTENSION)) !== 'php') continue;
                $head = (string)file_get_contents($p, false, null, 0, 2048);
                if (stripos($head, 'Plugin Name:') !== false || stripos($head, 'plugin name:') !== false) $main = $p;
            }
        };
        $scan($src);
        $anyPhp = count((array)@glob($src . '/*.php')) > 0 || $main !== '';
        if (!$anyPhp) { wt_rrmdir($tmp); return array(false, 'В архиве нет PHP-файлов — это не пакет плагина WordPress.', ''); }
        if (!@rename($src, $dest)) wt_rcopy($src, $dest);
        wt_rrmdir($tmp);
        $mainRel = $main !== '' ? $name . '/' . str_replace('\\', '/', substr($main, strlen($src) + 1)) : '';
        wt_log('Плагин «' . $name . '» установлен из ZIP-архива' . ($mainRel !== '' ? ' (главный файл: ' . $mainRel . ')' : ''));
        wt_cache_flush();
        return array(true, $name, $mainRel);
    }

    /* тема: обязателен style.css, желателен заголовок «Theme Name:» */
    if (!is_file($src . '/style.css')) { wt_rrmdir($tmp); return array(false, 'В корне архива нет style.css — это не тема WordPress.', ''); }
    if (!@rename($src, $dest)) wt_rcopy($src, $dest);
    wt_rrmdir($tmp);
    wt_log('Тема «' . $name . '» установлена из ZIP-архива');
    wt_cache_flush();
    return array(true, $name, '');
}

/* ── Обновление схемы (мягкое, при каждом запуске) ────────────────── */
function wt_upgrade() {
    try {
        $db = wt_db();
        /* таблица медиафайлов */
        $db->exec('CREATE TABLE IF NOT EXISTS ' . wt_t('media') . ' (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, file VARCHAR(255) UNIQUE NOT NULL, title VARCHAR(255) DEFAULT "", alt VARCHAR(255) DEFAULT "", caption TEXT, created DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
        /* колонки публикаций: пароль и видимость */
        $cols = $db->query('SHOW COLUMNS FROM ' . wt_t('posts'))->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('post_password', $cols, true)) $db->exec('ALTER TABLE ' . wt_t('posts') . ' ADD COLUMN post_password VARCHAR(120) DEFAULT ""');
        if (!in_array('visibility', $cols, true)) $db->exec('ALTER TABLE ' . wt_t('posts') . ' ADD COLUMN visibility VARCHAR(20) DEFAULT "public"');
    } catch (Exception $e) { /* установка ещё не завершена или нет прав */ }
}

/* ── Слой совместимости с WordPress API ───────────────────────────── */
require_once __DIR__ . '/wp-compat.php';
wt_upgrade();
