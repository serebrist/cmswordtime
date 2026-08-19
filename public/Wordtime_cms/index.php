<?php
/**
 * Wordtime CMS 1.0.5 — единая точка входа
 * nginx + PHP-FPM или Apache · MySQL/MariaDB
 * Работает и в корне домена, и в подпапке — ничего настраивать не нужно.
 */
define('WT_START', microtime(true));
define('WT_ROOT', __DIR__);

if (PHP_VERSION_ID < 70400) {
    http_response_code(500);
    exit('Wordtime требует PHP 7.4 или новее. Сейчас: ' . PHP_VERSION);
}

/* Первый запуск — веб-установщик */
if (!file_exists(WT_ROOT . '/wt-config.php')) {
    require WT_ROOT . '/install.php';
    exit;
}

require WT_ROOT . '/wt-config.php';
require WT_ROOT . '/wt-includes/bootstrap.php';
wt_load_plugins();          /* плагины подключает ТОЛЬКО ядро (уважает статус «Активен») */
wt_load_theme_functions();

/* ── Консоль (работает на любом хостинге без правок nginx) ────────── */
if (isset($_GET['admin']) || (isset($_GET['p']) && $_GET['p'] === 'admin')) {
    require WT_ROOT . '/wt-admin/index.php';
    exit;
}

/* ── REST API: /?rest=… и красивые /wt/v1/… (если настроен nginx) ─── */
$uriPath = parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH);
if (isset($_GET['rest'])) { wt_rest_handle($_GET['rest']); }
if (is_string($uriPath) && preg_match('#/wt/v1/(.+)$#', $uriPath, $m)) { wt_rest_handle($m[1]); }

/* ── Относительный маршрут с учётом подпапки ──────────────────────── */
$base = wt_base();
$rel = is_string($uriPath) ? trim((string)substr($uriPath, strlen($base)), '/') : '';
$segments = $rel !== '' ? explode('/', $rel) : array();

/* Красивые ссылки (если подключён nginx-wordtime.conf): /post/slug/, /page/slug/ */
if (count($segments) >= 2) {
    if ($segments[0] === 'post') { $_GET['p'] = 'post:' . $segments[1]; }
    if ($segments[0] === 'page') { $_GET['p'] = 'page:' . $segments[1]; }
    if ($segments[0] === 'category') { $_GET['p'] = 'category:' . $segments[1]; }
}

/* Постоянные ссылки по выбранной структуре: /запись/, /2026/02/запись/, /рубрика/запись/ */
if (!isset($_GET['p'])) {
    $pretty = wt_parse_pretty_url();
    if ($pretty !== null) $_GET['p'] = $pretty['p'];
}

$p = isset($_GET['p']) ? (string)$_GET['p'] : '';

/* ── Запись под паролем: проверка пароля ──────────────────────────── */
if (strpos($p, 'post:') === 0 && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['wt_post_pass'])) {
    $pp = wt_post_by_slug(substr($p, 5));
    wt_session_start();
    if ($pp && $pp['post_password'] !== '' && hash_equals($pp['post_password'], (string)$_POST['wt_post_pass'])) {
        $unlocked = (array)(isset($_SESSION['wt_pp']) ? $_SESSION['wt_pp'] : array());
        $unlocked[] = (int)$pp['id'];
        $_SESSION['wt_pp'] = array_values(array_unique($unlocked));
    }
    header('Location: ' . wt_permalink($pp ? $pp : substr($p, 5)));
    exit;
}

/* ── Служебные маршруты ───────────────────────────────────────────── */
if ($p === 'sitemap.xml' || $rel === 'sitemap.xml') { wt_sitemap(); exit; }
if ($p === 'robots.txt' || $rel === 'robots.txt') { wt_robots(); exit; }
if ($p === 'comment-add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $err = wt_comment_submit();
    /* только внутренние пути (защита от open redirect через redirect_to) */
    $back = wt_safe_local_url(isset($_POST['redirect_to']) ? $_POST['redirect_to'] : '');
    if ($back === null) $back = wt_url('');
    header('Location: ' . $back . (strpos($back, '?') === false ? '?' : '&') . 'cm=' . ($err === null ? 'ok' : 'err'));
    exit;
}

/* ── Сайт: рендер через тему ──────────────────────────────────────── */
require wt_theme_dir() . '/index.php';
