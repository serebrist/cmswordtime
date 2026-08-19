<?php
/**
 * Wordtime CMS 1.0.5 — веб-установщик
 * Открывается автоматически, пока нет wt-config.php.
 * САМОЗАЩИТА: после успешной установки установщик блокируется
 * (как в WordPress) — повторный запуск невозможен ни на Apache, ни на nginx.
 */
if (!defined('WT_ROOT')) define('WT_ROOT', __DIR__);

/* ── Самозащита: установлен — установщик закрыт ───────────────────── */
if (file_exists(WT_ROOT . '/wt-config.php')) {
    $script = str_replace('\\', '/', isset($_SERVER['SCRIPT_NAME']) ? $_SERVER['SCRIPT_NAME'] : '/install.php');
    $dir = rtrim(dirname($script), '/');
    $base = ($dir === '/' || $dir === '' || $dir === '.') ? '' : $dir;
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
    echo '<title>Wordtime уже установлен</title>';
    echo '<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&family=Golos+Text:wght@400;600;700&display=swap" rel="stylesheet">';
    echo '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#071b21;color:#dcebee;font:15px/1.65 "Golos Text",system-ui,sans-serif;padding:24px}';
    echo '.w{max-width:560px;width:100%;background:#0c2e36;border:1px solid #1c4a56;border-radius:20px;padding:38px 38px 34px;box-shadow:0 30px 80px -30px rgba(0,0,0,.8);text-align:center}';
    echo '.m{width:84px;height:84px;margin:0 auto 22px;border-radius:20px;background:linear-gradient(150deg,#10424d,#0a2730);border:1px solid #1d5160;display:grid;place-items:center;color:#14b8a6}';
    echo 'h1{font:900 24px "Unbounded",sans-serif;color:#fff;margin:0 0 10px}p{color:#9fc0c5;margin:0 0 22px}';
    echo '.btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}';
    echo 'a{display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:11px;font:700 14px "Golos Text";text-decoration:none;transition:.15s}';
    echo '.a1{background:#f0b429;color:#0c2e36}.a1:hover{background:#e2a51c}.a2{background:#123f4b;color:#9fd8cd;border:1px solid #1c4a56}.a2:hover{background:#17505f}';
    echo 'small{display:block;margin-top:22px;color:#5f8891;font-size:12.5px}</small></style></head><body><div class="w">';
    echo '<div class="m"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h10M7 20.5h10"/><path d="M8 3.5v3.2c0 2.3 1.6 3.5 3 4.6l1 .7 1-.7c1.4-1.1 3-2.3 3-4.6V3.5M8 20.5v-3.2c0-2.3 1.6-3.5 3-4.6l1-.7 1 .7c1.4 1.1 3 2.3 3 4.6v3.2"/></svg></div>';
    echo '<h1>Wordtime уже установлен</h1>';
    echo '<p>Сайт работает, поэтому установщик заблокирован автоматически — это защита от повторного запуска и перезаписи базы.</p>';
    echo '<div class="btns"><a class="a1" href="' . htmlspecialchars($base . '/') . '">Открыть сайт</a>';
    echo '<a class="a2" href="' . htmlspecialchars($base . '/?admin=1') . '">Консоль — ?admin=1</a></div>';
    echo '<small>Для чистой переустановки удалите файл <b>wt-config.php</b> и обновите эту страницу.</small>';
    echo '</div></body></html>';
    exit;
}

define('WT_INSTALLING', true);
$step = isset($_REQUEST['step']) ? (int)$_REQUEST['step'] : 1;
$err = ''; $okMsg = '';
$v = array(
    'dbhost' => 'localhost', 'dbname' => '', 'dbuser' => '', 'dbpass' => '', 'prefix' => 'wt_',
    'site' => 'Мой сайт на Wordtime', 'login' => 'admin', 'email' => '', 'pass' => '',
    'smtp_host' => '', 'smtp_port' => '587', 'smtp_user' => '', 'smtp_pass' => '', 'smtp_from' => '',
);
foreach ($v as $k => $d) if (isset($_POST[$k])) $v[$k] = trim((string)$_POST[$k]);

function wt_env_checks() {
    $r = array();
    $r[] = array('PHP ' . PHP_VERSION . ' (нужен 7.4+)', PHP_VERSION_ID >= 70400, 'обновите версию PHP в панели хостинга');
    $r[] = array('Расширение pdo_mysql', extension_loaded('pdo_mysql'), 'включите pdo_mysql в PHP-расширениях');
    $r[] = array('Расширение mbstring', extension_loaded('mbstring'), 'включите mbstring в PHP-расширениях');
    $r[] = array('Каталог сайта доступен для записи', is_writable(WT_ROOT), 'chmod -R 755 и владелец www-data');
    $r[] = array('Расширение zip (бэкапы)', extension_loaded('zip'), 'необязательно: бэкапы будут только в SQL');
    $r[] = array('Расширение gd (оптимизация изображений)', extension_loaded('gd'), 'необязательно');
    return $r;
}
$env = wt_env_checks();
$envOk = true;
foreach ($env as $i => $c) if (!$c[1] && $i < 4) $envOk = false;

function wt_install_smtp_test($host, $port, $user, $pass, $from, $to) {
    $addr = ($port == 465 ? 'ssl://' : '') . $host;
    $sock = @fsockopen($addr, (int)$port, $errno, $errstr, 8);
    if (!$sock) return 'нет соединения: ' . $errstr;
    stream_set_timeout($sock, 8);
    $read = function () use ($sock) { $d = ''; while ($l = fgets($sock, 515)) { $d .= $l; if (isset($l[3]) && $l[3] === ' ') break; } return $d; };
    $cmd = function ($c, $e) use ($sock, $read) { fwrite($sock, $c . "\r\n"); $r = $read(); return strpos($r, (string)$e) === 0; };
    $read();
    $cmd('EHLO wordtime', 250);
    if ($port == 587) { if (!$cmd('STARTTLS', 220)) return 'STARTTLS отклонён'; @stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT); $cmd('EHLO wordtime', 250); }
    if ($user !== '') {
        if (!$cmd('AUTH LOGIN', 334)) return 'AUTH отклонён';
        if (!$cmd(base64_encode($user), 334)) return 'неверный логин SMTP';
        if (!$cmd(base64_encode($pass), 235)) return 'неверный пароль SMTP';
    }
    if (!$cmd('MAIL FROM:<' . $from . '>', 250)) return 'MAIL FROM отклонён';
    if (!$cmd('RCPT TO:<' . $to . '>', 250)) return 'RCPT TO отклонён';
    if (!$cmd('DATA', 354)) return 'DATA отклонён';
    $msg = "From: Wordtime <$from>\r\nTo: $to\r\nSubject: =?UTF-8?B?" . base64_encode('Тест SMTP от Wordtime') . "?=\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nSMTP работает. Коды 2FA будут приходить на эту почту.";
    if (!$cmd($msg, 250)) return 'письмо не принято';
    $cmd('QUIT', 221);
    fclose($sock);
    return true;
}

$done = false;
$manualCfg = ''; /* если конфиг не удалось записать — покажем его для ручного создания */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['test_mail']) && $step === 2) {
    $r = $v['smtp_host'] === '' ? 'Укажите SMTP-сервер' : wt_install_smtp_test($v['smtp_host'], $v['smtp_port'], $v['smtp_user'], $v['smtp_pass'], $v['smtp_from'] !== '' ? $v['smtp_from'] : $v['email'], $v['email']);
    if ($r === true) $okMsg = 'SMTP работает — тестовое письмо отправлено на ' . $v['email'];
    else $err = 'SMTP: ' . $r;
}
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $step === 2 && !isset($_POST['test_mail'])) {
    if ($v['dbname'] === '' || $v['dbuser'] === '') $err = 'Укажите имя базы и пользователя БД.';
    elseif ($v['email'] === '' || strpos($v['email'], '@') === false) $err = 'Укажите корректную почту администратора — на неё приходят коды 2FA.';
    elseif (strlen($v['pass']) < 8) $err = 'Пароль администратора — минимум 8 символов.';
    if ($err === '') {
        try {
            $db = new PDO('mysql:host=' . $v['dbhost'] . ';charset=utf8mb4', $v['dbuser'], $v['dbpass'], array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION));
            $db->exec('CREATE DATABASE IF NOT EXISTS `' . str_replace('`', '', $v['dbname']) . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
            $db->exec('USE `' . str_replace('`', '', $v['dbname']) . '`');
            $pr = preg_replace('/[^a-z0-9_]/i', '', $v['prefix']);
            if ($pr === '') $pr = 'wt_';
            $db->exec("CREATE TABLE IF NOT EXISTS {$pr}posts (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, post_title VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE NOT NULL, post_content LONGTEXT, category VARCHAR(120) DEFAULT 'Без рубрики', tags VARCHAR(255) DEFAULT '', post_status VARCHAR(20) DEFAULT 'published', post_image VARCHAR(500) DEFAULT '', post_password VARCHAR(120) DEFAULT '', visibility VARCHAR(20) DEFAULT 'public', post_date DATETIME DEFAULT CURRENT_TIMESTAMP, post_author VARCHAR(120) DEFAULT 'Администратор') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $db->exec("CREATE TABLE IF NOT EXISTS {$pr}media (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, file VARCHAR(255) UNIQUE NOT NULL, title VARCHAR(255) DEFAULT '', alt VARCHAR(255) DEFAULT '', caption TEXT, created DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $db->exec("CREATE TABLE IF NOT EXISTS {$pr}pages (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE NOT NULL, content LONGTEXT, status VARCHAR(20) DEFAULT 'published') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $db->exec("CREATE TABLE IF NOT EXISTS {$pr}comments (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, post_id INT UNSIGNED NOT NULL, author VARCHAR(120) NOT NULL, email VARCHAR(150) DEFAULT '', text TEXT NOT NULL, status VARCHAR(20) DEFAULT 'pending', created DATETIME DEFAULT CURRENT_TIMESTAMP, KEY post_id (post_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $db->exec("CREATE TABLE IF NOT EXISTS {$pr}users (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_login VARCHAR(120) NOT NULL, user_email VARCHAR(191) UNIQUE NOT NULL, user_pass VARCHAR(255) NOT NULL, user_role VARCHAR(30) DEFAULT 'administrator', created DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $db->exec("CREATE TABLE IF NOT EXISTS {$pr}options (option_name VARCHAR(191) PRIMARY KEY, option_value LONGTEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $db->exec("CREATE TABLE IF NOT EXISTS {$pr}login_attempts (ip VARCHAR(45) NOT NULL, email VARCHAR(191) NOT NULL, fails INT DEFAULT 0, locked_until INT DEFAULT 0, PRIMARY KEY (ip, email)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $db->exec("CREATE TABLE IF NOT EXISTS {$pr}api_keys (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NOT NULL, key_hash VARCHAR(64) UNIQUE NOT NULL, scopes VARCHAR(255) DEFAULT 'read', created DATETIME DEFAULT CURRENT_TIMESTAMP, last_used DATETIME NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $db->exec("CREATE TABLE IF NOT EXISTS {$pr}queue (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, action VARCHAR(120) NOT NULL, payload LONGTEXT, created DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

            $q = function ($sql, $p) use ($db) { $st = $db->prepare($sql); $st->execute($p); };
            $opt = function ($n, $val) use ($db, $pr) { $st = $db->prepare("INSERT INTO {$pr}options (option_name, option_value) VALUES (?, ?)"); $st->execute(array($n, json_encode($val, JSON_UNESCAPED_UNICODE))); };
            $opt('site_title', $v['site']);
            $opt('tagline', 'Работает на Wordtime');
            $opt('admin_email', $v['email']);
            $opt('categories', array('Новости', 'Руководства', 'Без рубрики'));
            $opt('comments_disabled', false);
            $opt('moderate_first', true);
            $opt('cache_enabled', true);
            $opt('img_auto', true);
            $opt('active_theme', 'wordtime-twenty');

            $q("INSERT INTO {$pr}users (user_login, user_email, user_pass, user_role) VALUES (?, ?, ?, 'administrator')",
                array($v['login'], mb_strtolower($v['email']), password_hash($v['pass'], PASSWORD_DEFAULT)));
            $q("INSERT INTO {$pr}posts (post_title, slug, post_content, category, post_author) VALUES (?, ?, ?, 'Новости', ?)",
                array('Привет, Wordtime!', 'privet-wordtime', "Это первая запись вашего нового сайта.\n\nКонсоль управления: откройте адрес сайта и добавьте ?admin=1 — вход по паролю и коду 2FA из письма.\n\nЗаписи, страницы, комментарии, резервные копии и REST API для мобильных приложений уже работают.", $v['login']));
            $q("INSERT INTO {$pr}posts (post_title, slug, post_content, category, post_author) VALUES (?, ?, ?, 'Руководства', ?)",
                array('Безопасность из коробки', 'bezopasnost', "В ядро встроены: обязательная двухфакторная аутентификация, блокировка после 5 неудачных попыток входа (60 секунд), подготовка всех SQL-запросов (защита от инъекций) и экранирование вывода (защита от XSS).\n\nЕсли SMTP не настроен, коды 2FA сохраняются в защищённый файл wt-data/2fa-log.txt на сервере.", $v['login']));
            $q("INSERT INTO {$pr}pages (title, slug, content) VALUES (?, ?, ?)",
                array('О сайте', 'o-sajte', "Сайт работает на Wordtime CMS — классическая PHP-система управления: nginx или Apache, PHP 7.4–8.3, MySQL/MariaDB."));
            $q("INSERT INTO {$pr}comments (post_id, author, email, text, status) VALUES (1, ?, ?, 'Поздравляю с запуском! Консоль — по адресу с ?admin=1.', 'approved')",
                array('Команда Wordtime', 'hello@wordtime.ru'));

            /* базовый путь: корень домена или подпапка */
            $script = str_replace('\\', '/', isset($_SERVER['SCRIPT_NAME']) ? $_SERVER['SCRIPT_NAME'] : '/install.php');
            $dir = rtrim(dirname($script), '/');
            $wtBase = ($dir === '/' || $dir === '' || $dir === '.') ? '' : $dir;

            $key1 = bin2hex(random_bytes(32)); $key2 = bin2hex(random_bytes(32));
            $cfg = "<?php\n/** Wordtime CMS — конфигурация (создана установщиком " . date('Y-m-d H:i') . ") */\n"
                . "define('DB_HOST', " . var_export($v['dbhost'], true) . ");\n"
                . "define('DB_NAME', " . var_export($v['dbname'], true) . ");\n"
                . "define('DB_USER', " . var_export($v['dbuser'], true) . ");\n"
                . "define('DB_PASSWORD', " . var_export($v['dbpass'], true) . ");\n"
                . "define('TABLE_PREFIX', " . var_export($pr, true) . ");\n"
                . "define('WT_BASE', " . var_export($wtBase, true) . ");\n"
                . "define('AUTH_KEY', " . var_export($key1, true) . ");\n"
                . "define('SECURE_KEY', " . var_export($key2, true) . ");\n"
                . "define('WT_SMTP_HOST', " . var_export($v['smtp_host'], true) . ");\n"
                . "define('WT_SMTP_PORT', " . var_export($v['smtp_port'], true) . ");\n"
                . "define('WT_SMTP_USER', " . var_export($v['smtp_user'], true) . ");\n"
                . "define('WT_SMTP_PASS', " . var_export($v['smtp_pass'], true) . ");\n"
                . "define('WT_MAIL_FROM', " . var_export($v['smtp_from'], true) . ");\n";
            if (@file_put_contents(WT_ROOT . '/wt-config.php', $cfg) === false) {
                $err = 'Не удалось записать wt-config.php автоматически. Создайте файл wt-config.php в корне сайта вручную — содержимое ниже (скопировать можно одной кнопкой).';
                $manualCfg = $cfg;
            } else {
                @chmod(WT_ROOT . '/wt-config.php', 0600);
                $done = true;
            }
        } catch (Exception $e) {
            $err = 'База данных: ' . $e->getMessage();
        }
    }
}

/* ── Интерфейс установщика ── */
function wt_install_page($title, $body) {
    echo '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
    echo '<title>' . htmlspecialchars($title) . ' — установка Wordtime</title>';
    echo '<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&family=Golos+Text:wght@400;500;600;700&display=swap" rel="stylesheet">';
    echo '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(1000px 600px at 85% -10%,#0e3742,transparent 60%),#071b21;color:#dcebee;font:15px/1.6 "Golos Text",system-ui,sans-serif;padding:28px}';
    echo '.w{max-width:640px;width:100%;background:#0c2e36;border:1px solid #1c4a56;border-radius:20px;overflow:hidden;box-shadow:0 30px 80px -30px rgba(0,0,0,.8)}';
    echo '.top{display:flex;align-items:center;gap:14px;padding:20px 28px;background:#0a2229;border-bottom:1px solid #1c4a56}';
    echo '.top .m{width:44px;height:44px;flex:none;border-radius:12px;background:linear-gradient(150deg,#10424d,#0a2730);border:1px solid #1d5160;display:grid;place-items:center;color:#14b8a6}';
    echo '.top b{font:900 17px "Unbounded",sans-serif;color:#fff}.top span{display:block;font:700 10.5px "Golos Text";letter-spacing:.16em;color:#5f8891;text-transform:uppercase;margin-top:3px}';
    echo '.b{padding:26px 30px 30px}h2{font:800 19px "Unbounded",sans-serif;color:#fff;margin:0 0 6px}p.sub{color:#9fc0c5;margin:0 0 20px;font-size:14px}';
    echo 'label{display:block;font:600 12.5px "Golos Text";color:#8fb4ba;margin:13px 0 5px}';
    echo 'input{width:100%;font:500 14.5px "Golos Text";color:#eaf4f4;background:#071b21;border:1px solid #1c4a56;border-radius:10px;padding:10px 13px;outline:none;transition:.15s}';
    echo 'input:focus{border-color:#14b8a6;box-shadow:0 0 0 3px rgba(20,184,166,.15)}';
    echo '.grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}';
    echo '.btn{display:inline-flex;align-items:center;gap:8px;font:700 14px "Golos Text";padding:12px 22px;border-radius:11px;border:0;background:#f0b429;color:#0c2e36;cursor:pointer;transition:.15s;text-decoration:none}';
    echo '.btn:hover{background:#e2a51c;transform:translateY(-1px)}.btn.sec{background:#123f4b;color:#9fd8cd;border:1px solid #1c4a56}';
    echo '.checks{margin:16px 0 0;display:grid;gap:8px}';
    echo '.ck{display:flex;gap:10px;align-items:center;font-size:13.5px;padding:9px 13px;border-radius:10px;background:#0a2229;border:1px solid #174753}';
    echo '.ck i{width:20px;height:20px;flex:none;border-radius:6px;display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:800}';
    echo '.ok i{background:rgba(22,163,74,.18);color:#4ade80}.no i{background:rgba(220,38,38,.18);color:#f87171}';
    echo '.alert{padding:12px 15px;border-radius:11px;font-size:13.5px;margin:0 0 16px;border:1px solid}';
    echo '.a-err{background:rgba(220,38,38,.1);border-color:rgba(220,38,38,.4);color:#fca5a5}';
    echo '.a-ok{background:rgba(22,163,74,.1);border-color:rgba(22,163,74,.4);color:#86efac}';
    echo '.steps{display:flex;gap:6px;margin-left:auto}.steps i{width:26px;height:5px;border-radius:99px;background:#174753;font-style:normal}.steps i.on{background:#f0b429}';
    echo 'code{background:#071b21;border:1px solid #174753;border-radius:6px;padding:1px 7px;font:12.5px ui-monospace,Menlo,monospace;color:#9fd8cd}';
    echo '.cfg{margin:8px 0 0;background:#071b21;border:1px solid #174753;border-radius:12px;padding:14px 16px;color:#9fd8cd;font:12.5px/1.7 ui-monospace,Menlo,Consolas,monospace;white-space:pre;overflow:auto;max-height:300px}';
    echo '</style></head><body><div class="w">';
    echo '<div class="top"><span class="m"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h10M7 20.5h10"/><path d="M8 3.5v3.2c0 2.3 1.6 3.5 3 4.6l1 .7 1-.7c1.4-1.1 3-2.3 3-4.6V3.5M8 20.5v-3.2c0-2.3 1.6-3.5 3-4.6l1-.7 1 .7c1.4 1.1 3 2.3 3 4.6v3.2"/></svg></span>';
    echo '<div><b>Wordtime</b><span>Установка CMS</span></div>';
    echo '<div class="steps"><i class="on"></i><i class="' . ($GLOBALS['step'] >= 2 ? 'on' : '') . '"></i><i class="' . ($GLOBALS['done'] ? 'on' : '') . '"></i></div></div>';
    echo '<div class="b">' . $body . '</div></div></body></html>';
    exit;
}
$GLOBALS['step'] = $step; $GLOBALS['done'] = $done;

if ($done) {
    $script = str_replace('\\', '/', isset($_SERVER['SCRIPT_NAME']) ? $_SERVER['SCRIPT_NAME'] : '/install.php');
    $dir = rtrim(dirname($script), '/');
    $base = ($dir === '/' || $dir === '' || $dir === '.') ? '' : $dir;
    $smtpNote = $v['smtp_host'] !== ''
        ? 'SMTP настроен — коды 2FA будут приходить на почту.'
        : 'SMTP не настроен: коды 2FA будут сохраняться в файл <code>wt-data/2fa-log.txt</code> на сервере. Настроить почту можно в консоли: Настройки → Безопасность и 2FA.';
    wt_install_page('Готово', '<h2>Wordtime установлен</h2><p class="sub">База создана, администратор добавлен, конфиг записан и защищён (права 600). Установщик заблокирован автоматически.</p>'
        . '<div class="alert a-ok">' . $smtpNote . '</div>'
        . '<p class="sub">Вход: <b>' . htmlspecialchars($v['email']) . '</b> + пароль, затем шести-значный код из письма.</p>'
        . '<div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn" href="' . htmlspecialchars($base . '/?admin=1') . '">Открыть консоль — ?admin=1</a>'
        . '<a class="btn sec" href="' . htmlspecialchars($base . '/') . '">Посмотреть сайт</a></div>');
}

if ($step === 1 || !$envOk) {
    $rows = '';
    foreach ($env as $c) {
        $rows .= '<div class="ck ' . ($c[1] ? 'ok' : 'no') . '"><i>' . ($c[1] ? '✓' : '!') . '</i><span><b>' . htmlspecialchars($c[0]) . '</b>'
            . ($c[1] ? '' : ' — ' . htmlspecialchars($c[2])) . '</span></div>';
    }
    wt_install_page('Проверка окружения', '<h2>Проверка окружения</h2><p class="sub">Классический хостинг: nginx или Apache · PHP 7.4–8.3 · MySQL/MariaDB.</p>'
        . '<div class="checks">' . $rows . '</div>'
        . '<p style="margin:20px 0 0">' . ($envOk
            ? '<a class="btn" href="?step=2">Всё в порядке — продолжить →</a>'
            : '<a class="btn sec" href="?step=1" style="opacity:.7;pointer-events:none">Исправьте замечания и обновите страницу</a>') . '</p>');
}

/* шаг 2 — форма */
$f = function ($k, $ph = '') use ($v) { return htmlspecialchars(isset($v[$k]) ? $v[$k] : $ph); };
$msg = '';
if ($err !== '') $msg = '<div class="alert a-err">' . htmlspecialchars($err) . '</div>';
if ($okMsg !== '') $msg = '<div class="alert a-ok">' . htmlspecialchars($okMsg) . '</div>';
if ($manualCfg !== '') {
    $msg .= '<label style="margin-top:18px">Содержимое wt-config.php — создайте файл в корне сайта и вставьте:</label>'
        . '<pre class="cfg">' . htmlspecialchars($manualCfg) . '</pre>';
}
wt_install_page('База данных и сайт', '<h2>Подключение к базе и сайт</h2><p class="sub">Данные базы берите в панели хостинга (cPanel, ISPmanager) — раздел «MySQL».</p>' . $msg
    . '<form method="post" action="?step=2">'
    . '<div class="grid2"><div><label>Сервер БД</label><input name="dbhost" value="' . $f('dbhost') . '"></div>'
    . '<div><label>Префикс таблиц</label><input name="prefix" value="' . $f('prefix') . '"></div></div>'
    . '<div class="grid2"><div><label>Имя базы</label><input name="dbname" value="' . $f('dbname') . '" required></div>'
    . '<div><label>Пользователь БД</label><input name="dbuser" value="' . $f('dbuser') . '" required></div></div>'
    . '<label>Пароль БД</label><input type="password" name="dbpass" value="' . $f('dbpass') . '">'
    . '<div class="grid2"><div><label>Название сайта</label><input name="site" value="' . $f('site') . '"></div>'
    . '<div><label>Логин администратора</label><input name="login" value="' . $f('login') . '"></div></div>'
    . '<div class="grid2"><div><label>Почта администратора (для 2FA)</label><input type="email" name="email" value="' . $f('email') . '" required></div>'
    . '<div><label>Пароль (минимум 8 символов)</label><input type="password" name="pass" minlength="8" required></div></div>'
    . '<div class="grid2"><div><label>SMTP-сервер (необязательно)</label><input name="smtp_host" value="' . $f('smtp_host') . '" placeholder="smtp.хостер.ru"></div>'
    . '<div><label>Порт SMTP</label><input name="smtp_port" value="' . $f('smtp_port') . '"></div></div>'
    . '<div class="grid2"><div><label>Логин SMTP</label><input name="smtp_user" value="' . $f('smtp_user') . '"></div>'
    . '<div><label>Пароль SMTP</label><input type="password" name="smtp_pass" value="' . $f('smtp_pass') . '"></div></div>'
    . '<p style="margin:22px 0 0;display:flex;gap:10px;flex-wrap:wrap"><button class="btn" type="submit">Установить Wordtime</button>'
    . '<button class="btn sec" type="submit" name="test_mail" value="1">Проверить SMTP</button></p></form>');
