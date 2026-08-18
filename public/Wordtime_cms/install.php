<?php
/**
 * Wordtime CMS 1.0.5 — веб-установщик
 * Открывается автоматически, пока нет wt-config.php.
 */
if (!defined('WT_ROOT')) define('WT_ROOT', __DIR__);
define('WT_INSTALLING', true);
$IV = '1.0.5';

$step = isset($_REQUEST['step']) ? (int)$_REQUEST['step'] : 1;
$err = '';
$okMsg = '';
$v = array(
    'dbhost' => 'localhost', 'dbname' => '', 'dbuser' => '', 'dbpass' => '', 'prefix' => 'wt_',
    'site' => 'Мой сайт на Wordtime', 'login' => 'admin', 'email' => '', 'pass' => '',
    'smtp_host' => '', 'smtp_port' => '587', 'smtp_user' => '', 'smtp_pass' => '', 'smtp_from' => '',
);
foreach ($v as $k => $d) if (isset($_POST[$k])) $v[$k] = trim((string)$_POST[$k]);

/* проверка окружения */
function wt_env_checks() {
    $r = array();
    $r[] = array('PHP ' . PHP_VERSION . ' (нужен 7.4+)', PHP_VERSION_ID >= 70400, 'обновите версию PHP в панели хостинга');
    $r[] = array('Расширение pdo_mysql', extension_loaded('pdo_mysql'), 'включите pdo_mysql в PHP-расширениях');
    $r[] = array('Расширение mbstring', extension_loaded('mbstring'), 'включите mbstring в PHP-расширениях');
    $wr = is_writable(WT_ROOT);
    $r[] = array('Каталог сайта доступен для записи', $wr, 'chmod -R 755 и владелец www-data');
    $r[] = array('Расширение zip (бэкапы)', extension_loaded('zip'), 'необязательно: бэкапы будут только в SQL');
    return $r;
}
$env = wt_env_checks();
$envOk = true;
foreach ($env as $c) if (!$c[1] && strpos($c[0], 'zip') === false) $envOk = false;

/* тест SMTP (автономный, до создания конфига) */
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
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['test_mail']) && $step === 2) {
    $r = $v['smtp_host'] === '' ? 'Укажите SMTP-сервер' : wt_install_smtp_test($v['smtp_host'], $v['smtp_port'], $v['smtp_user'], $v['smtp_pass'], $v['smtp_from'] !== '' ? $v['smtp_from'] : $v['email'], $v['email']);
    $okMsg = $r === true ? 'SMTP работает — тестовое письмо отправлено на ' . $v['email'] : '';
    $err = $r === true ? '' : 'SMTP: ' . $r;
}

/* шаг 2 → установка */
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
            $db->exec("CREATE TABLE IF NOT EXISTS {$pr}posts (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, post_title VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE NOT NULL, post_content LONGTEXT, category VARCHAR(120) DEFAULT 'Без рубрики', tags VARCHAR(255) DEFAULT '', post_status VARCHAR(20) DEFAULT 'published', post_image VARCHAR(500) DEFAULT '', post_date DATETIME DEFAULT CURRENT_TIMESTAMP, post_author VARCHAR(120) DEFAULT 'Администратор') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
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
            $base = ($dir === '/' || $dir === '.') ? '' : $dir;

            $auth = bin2hex(random_bytes(32));
            $sec = bin2hex(random_bytes(32));
            $config = "<?php\n"
                . "/* Wordtime CMS {$IV} — конфигурация. Создана установщиком " . date('d.m.Y H:i') . " */\n"
                . "define('DB_HOST', '" . addslashes($v['dbhost']) . "');\n"
                . "define('DB_NAME', '" . addslashes($v['dbname']) . "');\n"
                . "define('DB_USER', '" . addslashes($v['dbuser']) . "');\n"
                . "define('DB_PASSWORD', '" . addslashes($v['dbpass']) . "');\n"
                . "define('TABLE_PREFIX', '" . $pr . "');\n"
                . "define('WT_BASE', '" . addslashes($base) . "'); /* обнаружен автоматически */\n"
                . "define('AUTH_KEY', '" . $auth . "');\n"
                . "define('SECURE_KEY', '" . $sec . "');\n"
                . "define('WT_DEBUG', false);\n"
                . "define('WT_PRETTY', false); /* true после подключения nginx-wordtime.conf */\n"
                . "/* SMTP для кодов 2FA. Если пусто — код пишется в wt-data/2fa-log.txt */\n"
                . "define('WT_SMTP_HOST', '" . addslashes($v['smtp_host']) . "');\n"
                . "define('WT_SMTP_PORT', " . (int)$v['smtp_port'] . ");\n"
                . "define('WT_SMTP_USER', '" . addslashes($v['smtp_user']) . "');\n"
                . "define('WT_SMTP_PASS', '" . addslashes($v['smtp_pass']) . "');\n"
                . "define('WT_MAIL_FROM', '" . addslashes($v['smtp_from']) . "');\n";
            if (@file_put_contents(WT_ROOT . '/wt-config.php', $config) === false) {
                $err = 'Не удалось записать wt-config.php (нет прав на запись). Создайте файл вручную — содержимое ниже:';
                $okMsg = '<pre class="cfg">' . htmlspecialchars($config) . '</pre>';
            } else {
                $step = 3;
            }
        } catch (Exception $e) {
            $err = 'База данных: ' . $e->getMessage();
        }
    }
}
if ($step === 1 && !$envOk) $err = 'Хостинг не соответствует требованиям — исправьте пункты красным и обновите страницу.';
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Установка Wordtime <?php echo $IV; ?></title>
<style>
:root{--bg:#071b21;--card:#0c2e36;--line:#174753;--line2:#1f5663;--txt:#eef3f3;--mut:#8fb0b7;--teal:#14b8a6;--amber:#f0b429;--red:#f87171;--ok:#4ade80}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:15px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}
.wrap{width:100%;max-width:600px}
.win{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:0 30px 80px -30px rgba(0,0,0,.7)}
.win-top{display:flex;align-items:center;gap:7px;padding:11px 16px;background:#0a242c;border-bottom:1px solid var(--line)}
.dot{width:11px;height:11px;border-radius:50%}.dot.r{background:#f8717199}.dot.y{background:#f0b42999}.dot.g{background:#4ade8099}
.win-top b{margin-left:8px;font-size:12.5px;color:var(--mut);font-weight:600}
.brand{display:flex;flex-direction:column;align-items:center;padding:30px 24px 6px}
.hourglass{width:74px;height:74px;border:2.5px solid var(--teal);border-radius:14px;display:grid;place-items:center;box-shadow:0 0 0 6px rgba(20,184,166,.08),inset 0 0 24px rgba(20,184,166,.12)}
.hourglass svg{animation:flip 3.6s cubic-bezier(.7,0,.3,1) infinite}
@keyframes flip{0%,42%{transform:rotate(0)}55%,92%{transform:rotate(180deg)}100%{transform:rotate(360deg)}}
h1{font-size:22px;margin:16px 0 2px;letter-spacing:-.02em}
.sub{color:var(--mut);margin:0 0 4px;font-size:13.5px}
.steps{display:flex;gap:8px;justify-content:center;margin:16px 0 4px}
.steps span{font-size:11.5px;font-weight:700;padding:4px 11px;border-radius:20px;border:1px solid var(--line);color:var(--mut)}
.steps span.on{background:var(--teal);border-color:var(--teal);color:#04211d}
.steps span.done{border-color:var(--teal);color:var(--teal)}
form,.body{padding:20px 26px 26px}
label{display:block;font-size:12.5px;font-weight:700;margin:13px 0 5px;color:#cfe3e6}
input{width:100%;padding:10px 12px;border-radius:9px;border:1px solid var(--line2);background:#08222a;color:var(--txt);font-size:14px;outline:none;transition:border-color .15s}
input:focus{border-color:var(--teal)}
.row{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
.btn{margin-top:22px;width:100%;padding:13px;border:0;border-radius:10px;background:var(--teal);color:#04211d;font-weight:800;font-size:15px;cursor:pointer;transition:transform .12s,background .15s}
.btn:hover{background:#2dd4bf}.btn:active{transform:scale(.985)}
.btn.ghost{background:transparent;border:1px solid var(--line2);color:var(--mut);margin-top:10px}
.btn.ghost:hover{color:var(--txt);border-color:var(--teal)}
.err{background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.4);color:#fca5a5;padding:11px 14px;border-radius:10px;margin-top:14px;font-size:13.5px}
.ok{background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.35);color:#86efac;padding:11px 14px;border-radius:10px;margin-top:14px;font-size:13.5px}
.checks{list-style:none;margin:14px 0 0;padding:0}
.checks li{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid rgba(23,71,83,.6);font-size:13.5px}
.checks li:last-child{border:0}
.st{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800;flex:none;margin-top:1px}
.st.ok{background:rgba(74,222,128,.15);color:var(--ok)}.st.no{background:rgba(248,113,113,.15);color:var(--red)}
.hint{color:var(--mut);font-size:12px}
.box{background:#08222a;border:1px dashed var(--line2);border-radius:10px;padding:13px 15px;margin-top:14px;font-size:13px;color:var(--mut)}
pre.cfg{background:#08222a;border:1px solid var(--line2);border-radius:10px;padding:14px;overflow:auto;font-size:12px;color:#7dd3c8}
a{color:var(--teal);text-decoration:none;font-weight:700}a:hover{text-decoration:underline}
.links{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}
.links a{display:block;text-align:center;padding:14px;border-radius:10px;border:1px solid var(--line2);transition:border-color .15s,background .15s}
.links a:hover{border-color:var(--teal);background:rgba(20,184,166,.07);text-decoration:none}
.links small{display:block;color:var(--mut);font-weight:400;font-size:11.5px;margin-top:3px}
</style>
</head>
<body>
<div class="wrap">
  <div class="win">
    <div class="win-top"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span><b>Установка Wordtime — wt-install</b></div>
    <div class="brand">
      <div class="hourglass">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="1.7">
          <path d="M7 3.5h10M7 20.5h10" stroke-linecap="round"/>
          <path d="M8 3.5v3.2c0 2.3 1.6 3.5 3 4.6l1 .7 1-.7c1.4-1.1 3-2.3 3-4.6V3.5M8 20.5v-3.2c0-2.3 1.6-3.5 3-4.6l1-.7 1 .7c1.4 1.1 3 2.3 3 4.6v3.2" stroke-linejoin="round"/>
          <path d="M10 17.8c.6-1 1.3-1.6 2-2.1.7.5 1.4 1.1 2 2.1" fill="#f0b429" stroke="none"/>
        </svg>
      </div>
      <h1>Wordtime CMS <?php echo $IV; ?></h1>
      <p class="sub">PHP · MySQL/MariaDB · nginx или Apache — классический хостинг</p>
      <div class="steps">
        <span class="<?php echo $step >= 1 ? ($step > 1 ? 'done' : 'on') : ''; ?>">1 · Проверка</span>
        <span class="<?php echo $step >= 2 ? ($step > 2 ? 'done' : 'on') : ''; ?>">2 · База и сайт</span>
        <span class="<?php echo $step >= 3 ? 'on' : ''; ?>">3 · Готово</span>
      </div>
    </div>

    <?php if ($step === 1): ?>
    <div class="body">
      <ul class="checks">
        <?php foreach ($env as $c): ?>
        <li><span class="st <?php echo $c[1] ? 'ok' : 'no'; ?>"><?php echo $c[1] ? '✓' : '✕'; ?></span>
          <span><b><?php echo htmlspecialchars($c[0]); ?></b><?php if (!$c[1]): ?><br><span class="hint">Как исправить: <?php echo htmlspecialchars($c[2]); ?></span><?php endif; ?></span></li>
        <?php endforeach; ?>
      </ul>
      <?php if ($err !== ''): ?><div class="err"><?php echo htmlspecialchars($err); ?></div><?php endif; ?>
      <form method="post" action="install.php"><input type="hidden" name="step" value="2">
        <button class="btn" type="submit" <?php echo $envOk ? '' : 'disabled style="opacity:.5;cursor:not-allowed"'; ?>>Продолжить установку</button>
      </form>
    </div>

    <?php elseif ($step === 2): ?>
    <form method="post" action="install.php">
      <input type="hidden" name="step" value="2">
      <label>Сервер базы данных</label><input name="dbhost" value="<?php echo htmlspecialchars($v['dbhost']); ?>" required>
      <div class="row">
        <div><label>Имя базы</label><input name="dbname" value="<?php echo htmlspecialchars($v['dbname']); ?>" placeholder="wordtime_db" required></div>
        <div><label>Префикс таблиц</label><input name="prefix" value="<?php echo htmlspecialchars($v['prefix']); ?>"></div>
      </div>
      <div class="row">
        <div><label>Пользователь БД</label><input name="dbuser" value="<?php echo htmlspecialchars($v['dbuser']); ?>" required></div>
        <div><label>Пароль БД</label><input name="dbpass" type="password" value="<?php echo htmlspecialchars($v['dbpass']); ?>"></div>
      </div>
      <label>Название сайта</label><input name="site" value="<?php echo htmlspecialchars($v['site']); ?>" required>
      <div class="row">
        <div><label>Логин администратора</label><input name="login" value="<?php echo htmlspecialchars($v['login']); ?>" required></div>
        <div><label>Почта администратора</label><input name="email" type="email" value="<?php echo htmlspecialchars($v['email']); ?>" placeholder="вы@домен.ru" required></div>
      </div>
      <label>Пароль администратора <span class="hint">(минимум 8 символов)</span></label>
      <input name="pass" type="password" minlength="8" required>
      <div class="box">
        <b style="color:#cfe3e6">SMTP для кодов 2FA — необязательно.</b><br>
        Если не заполнить, коды входа будут сохраняться в защищённый файл <code>wt-data/2fa-log.txt</code> на сервере (его можно посмотреть через файловый менеджер). Настроить SMTP можно и позже в консоли.
      </div>
      <div class="row">
        <div><label>SMTP-сервер</label><input name="smtp_host" value="<?php echo htmlspecialchars($v['smtp_host']); ?>" placeholder="smtp.хостер.ru"></div>
        <div><label>Порт</label><input name="smtp_port" value="<?php echo htmlspecialchars($v['smtp_port']); ?>"></div>
      </div>
      <div class="row">
        <div><label>SMTP-логин</label><input name="smtp_user" value="<?php echo htmlspecialchars($v['smtp_user']); ?>"></div>
        <div><label>SMTP-пароль</label><input name="smtp_pass" type="password" value="<?php echo htmlspecialchars($v['smtp_pass']); ?>"></div>
      </div>
      <?php if ($err !== ''): ?><div class="err"><?php echo htmlspecialchars($err); ?></div><?php endif; ?>
      <?php if ($okMsg !== ''): ?><div class="ok"><?php echo htmlspecialchars($okMsg); ?></div><?php endif; ?>
      <button class="btn" type="submit">Установить Wordtime</button>
      <button class="btn ghost" type="submit" name="test_mail" value="1">Проверить SMTP (отправить тестовое письмо)</button>
    </form>

    <?php else: ?>
    <div class="body">
      <div class="ok"><b>Wordtime установлен!</b><br>База создана, таблицы готовы, администратор добавлен.</div>
      <div class="links">
        <a href="<?php echo htmlspecialchars(wt_base_link()); ?>">Открыть сайт<small><?php echo htmlspecialchars(wt_base_link()); ?></small></a>
        <a href="<?php echo htmlspecialchars(wt_base_link() . '/?admin=1'); ?>">Войти в консоль<small>адрес/?admin=1</small></a>
      </div>
      <div class="box">
        Вход в консоль защищён <b style="color:#cfe3e6">2FA</b>: после пароля придёт шести-значный код.
        <?php if ($v['smtp_host'] === ''): ?><br>SMTP не настроен — первый код появится в файле <code>wt-data/2fa-log.txt</code>. SMTP можно добавить позже: консоль → Настройки → Безопасность.<?php endif; ?>
        <br><br><b style="color:#f0b429">Важно:</b> удалите файл <code>install.php</code> с сервера.
      </div>
    </div>
    <?php endif; ?>
  </div>
  <p style="text-align:center;color:#5c7f88;font-size:12px;margin-top:14px">Wordtime CMS <?php echo $IV; ?> · работает на PHP <?php echo PHP_VERSION; ?></p>
</div>
</body>
</html>
<?php
function wt_base_link() {
    $script = str_replace('\\', '/', isset($_SERVER['SCRIPT_NAME']) ? $_SERVER['SCRIPT_NAME'] : '/install.php');
    $dir = rtrim(dirname($script), '/');
    $base = ($dir === '/' || $dir === '.') ? '' : $dir;
    $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    return $scheme . '://' . (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost') . $base;
}
