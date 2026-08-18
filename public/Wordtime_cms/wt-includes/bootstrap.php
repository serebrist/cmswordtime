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
function wt_pretty($type, $slug) {
    /* если nginx настроен по nginx-wordtime.conf — красивые ссылки, иначе ?p= */
    if (defined('WT_PRETTY') && WT_PRETTY) return wt_base() . '/' . $type . '/' . $slug . '/';
    return wt_url($type . ':' . $slug);
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

/* ── Опции ────────────────────────────────────────────────────────── */
function wt_option($name, $default = null) {
    static $cache = null;
    if ($cache === null) {
        $cache = array();
        try {
            foreach (wt_db()->query('SELECT option_name, option_value FROM ' . wt_t('options'))->fetchAll() as $row) {
                $cache[$row['option_name']] = json_decode($row['option_value'], true);
            }
        } catch (Exception $e) { /* установка не завершена */ }
    }
    return array_key_exists($name, $cache) ? $cache[$name] : $default;
}
function wt_set_option($name, $value) {
    $st = wt_db()->prepare('INSERT INTO ' . wt_t('options') . ' (option_name, option_value) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE option_value = VALUES(option_value)');
    $st->execute(array($name, json_encode($value, JSON_UNESCAPED_UNICODE)));
    wt_cache_flush();
}

/* ── Экранирование (защита от XSS) ────────────────────────────────── */
function esc($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function esc_attr($s) { return esc($s); }
function esc_url($s) {
    $s = trim((string)$s);
    if ($s === '' || strpos($s, 'javascript:') === 0 || strpos($s, 'data:text') === 0) return '#';
    return esc($s);
}
function wt_kses($html) {
    return strip_tags((string)$html, '<p><br><b><strong><i><em><u><a><ul><ol><li><h2><h3><blockquote><code><pre>');
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
        return 0; // только что заблокировали
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
function wt_require_login() {
    if (!wt_current_user()) { header('Location: ' . wt_admin_url()); exit; }
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

/* ── Файловый кеш ─────────────────────────────────────────────────── */
function wt_cache_get($key) {
    $f = WT_CACHE_DIR . '/' . md5($key) . '.cache';
    if (!is_file($f)) return null;
    $raw = @file_get_contents($f);
    if ($raw === false) return null;
    $d = @unserialize($raw);
    if ($d === false || (isset($d['exp']) && $d['exp'] < time())) return null;
    return $d['val'];
}
function wt_cache_set($key, $val, $ttl = 3600) {
    @file_put_contents(WT_CACHE_DIR . '/' . md5($key) . '.cache', serialize(array('exp' => time() + $ttl, 'val' => $val)));
}
function wt_cache_flush() {
    foreach ((array)glob(WT_CACHE_DIR . '/*.cache') as $f) @unlink($f);
}
function wt_cache_size() {
    $s = 0; foreach ((array)glob(WT_CACHE_DIR . '/*.cache') as $f) $s += filesize($f);
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
        wt_do_action('wt_queue_' . $row['action'], json_decode($row['payload'], true));
        wt_db()->prepare('DELETE FROM ' . wt_t('queue') . ' WHERE id = ?')->execute(array($row['id']));
        $done++;
    }
    return $done;
}

/* ── Контент ──────────────────────────────────────────────────────── */
function wt_posts($args = array()) {
    $key = 'posts:' . md5(serialize($args));
    $hit = wt_cache_get($key);
    if ($hit !== null) return $hit;
    $where = array('post_status = ?'); $params = array('published'); $args = array_merge(array('limit' => 20, 'offset' => 0, 'category' => '', 's' => ''), $args);
    if ($args['category'] !== '') { $where[] = 'category = ?'; $params[] = $args['category']; }
    if ($args['s'] !== '') { $where[] = '(post_title LIKE ? OR post_content LIKE ?)'; $params[] = '%' . $args['s'] . '%'; $params[] = '%' . $args['s'] . '%'; }
    $sql = 'SELECT * FROM ' . wt_t('posts') . ' WHERE ' . implode(' AND ', $where) . ' ORDER BY post_date DESC LIMIT ' . (int)$args['limit'] . ' OFFSET ' . (int)$args['offset'];
    $st = wt_db()->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll();
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
    if (function_exists('mb_substr') && mb_strlen($t) <= $len) return $t;
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
    return is_array($c) ? $c : array('Без рубрики');
}

/* ── Загрузка медиафайлов ─────────────────────────────────────────── */
function wt_handle_upload($field) {
    if (empty($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) return array(false, 'Файл не получен или ошибка загрузки.');
    $f = $_FILES[$field];
    if ($f['size'] > 20 * 1024 * 1024) return array(false, 'Файл больше 20 МБ.');
    $ok = array('jpg','jpeg','png','gif','webp','svg','pdf','mp4');
    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $ok, true)) return array(false, 'Тип файла не разрешён.');
    $sub = date('Y/m');
    $dir = WT_UPLOADS . '/' . $sub;
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    $name = substr(md5(uniqid('', true)), 0, 10) . '.' . $ext;
    if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $name)) return array(false, 'Не удалось сохранить файл.');
    return array(true, array('url' => wt_asset('wt-content/uploads/' . $sub . '/' . $name), 'name' => $f['name'], 'size' => $f['size']));
}

/* ── SEO: title / description в <head> ────────────────────────────── */
function wt_head($title, $desc, $canonical = '') {
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
function wt_sitemap() {
    header('Content-Type: application/xml; charset=utf-8');
    $base = (isset($_SERVER['REQUEST_SCHEME']) ? $_SERVER['REQUEST_SCHEME'] : 'https') . '://' . (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost') . wt_base();
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    echo "  <url><loc>" . esc($base . '/') . "</loc><priority>1.0</priority><changefreq>daily</changefreq></url>\n";
    foreach (wt_posts(array('limit' => 500)) as $p) {
        echo "  <url><loc>" . esc($base . '/?p=post:' . $p['slug']) . "</loc><lastmod>" . date('Y-m-d', strtotime($p['post_date'])) . "</lastmod><priority>0.8</priority></url>\n";
    }
    foreach (wt_pages_list() as $pg) {
        echo "  <url><loc>" . esc($base . '/?p=page:' . $pg['slug']) . "</loc><priority>0.6</priority></url>\n";
    }
    echo "</urlset>\n";
}
function wt_robots() {
    header('Content-Type: text/plain; charset=utf-8');
    $host = (isset($_SERVER['REQUEST_SCHEME']) ? $_SERVER['REQUEST_SCHEME'] : 'https') . '://' . (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost') . wt_base();
    echo "User-agent: *\nAllow: /\nDisallow: /wt-admin\nDisallow: /wt-includes\nDisallow: /wt-data\n\nSitemap: " . $host . "/?p=sitemap.xml\n";
}

/* ── REST API для мобильных приложений ────────────────────────────── */
function wt_api_key_ok($key) {
    if ($key === '') return false;
    $st = wt_db()->prepare('SELECT * FROM ' . wt_t('api_keys') . ' WHERE key_hash = ? LIMIT 1');
    $st->execute(array(hash('sha256', $key)));
    $row = $st->fetch();
    if (!$row) return false;
    /* лимит 120 запросов в минуту */
    $f = WT_DATA . '/rate_' . substr(md5($key), 0, 8) . '.json';
    $d = is_file($f) ? json_decode(file_get_contents($f), true) : array('t' => 0, 'n' => 0);
    if (time() - $d['t'] > 60) $d = array('t' => time(), 'n' => 0);
    $d['n']++;
    file_put_contents($f, json_encode($d));
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

    if ($method === 'GET' && $resource === 'posts') {
        $json(array('data' => wt_posts(array('limit' => isset($_GET['per_page']) ? (int)$_GET['per_page'] : 20))));
    }
    if ($method === 'GET' && $resource === 'pages') {
        $json(array('data' => wt_pages_list()));
    }
    if ($method === 'GET' && $resource === 'info') {
        $json(array('data' => array('site' => wt_option('site_title', 'Wordtime'), 'version' => WT_VERSION, 'tagline' => wt_option('tagline', ''))));
    }
    if ($resource === 'comments' && $method === 'POST') {
        $key = isset($_SERVER['HTTP_X_WT_KEY']) ? $_SERVER['HTTP_X_WT_KEY'] : '';
        $auth = wt_api_key_ok($key);
        if ($auth === false) $json(array('error' => 'Неверный API-ключ'), 401);
        if ($auth === 'limit') $json(array('error' => 'Лимит 120 запросов в минуту'), 429);
        $in = json_decode(file_get_contents('php://input'), true);
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
function wt_theme_file($f) { return wt_theme_dir() . '/' . $f; }
function wt_load_theme_functions() {
    $f = wt_theme_dir() . '/functions.php';
    if (is_file($f)) require_once $f;
}

/* ── Комментарии с сайта ──────────────────────────────────────────── */
function wt_comment_submit() {
    if (!wt_check_nonce('comment')) return 'Проверка безопасности не пройдена — обновите страницу и попробуйте снова.';
    if (!empty($_POST['website'])) return null; // honeypot: бот попался, молча «успех»
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
