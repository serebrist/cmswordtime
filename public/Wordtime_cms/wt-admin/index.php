<?php
/**
 * Wordtime CMS 1.0.5 — консоль управления (wt-admin)
 * Вход: адрес-сайта/?admin=1 · пароль + код 2FA из письма
 */
if (!defined('WT_ROOT')) { http_response_code(403); exit('Direct access forbidden'); }
if (!file_exists(WT_ROOT . '/wt-config.php')) { header('Location: ' . wt_base() . '/install.php'); exit; }

wt_session_start();
$page = isset($_GET['page']) ? (string)$_GET['page'] : 'dashboard';
$act = isset($_POST['action']) ? (string)$_POST['action'] : (isset($_GET['action']) ? (string)$_GET['action'] : '');
$user = wt_current_user();
$flash = isset($_SESSION['wt_flash']) ? $_SESSION['wt_flash'] : null;
unset($_SESSION['wt_flash']);

/* ── Выход ── */
if ($act === 'logout' && $user) { wt_log('Выход из консоли: ' . $user['user_login']); wt_logout(); header('Location: ' . wt_admin_url()); exit; }

/* ── Скачивание бэкапа ── */
if (isset($_GET['dl']) && $user && wt_check_nonce('dl')) {
    $f = basename((string)$_GET['dl']);
    $path = WT_DATA . '/backups/' . $f;
    if (is_file($path) && strpos(realpath($path), realpath(WT_DATA . '/backups')) === 0) {
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $f . '"');
        header('Content-Length: ' . filesize($path));
        readfile($path);
        exit;
    }
    http_response_code(404); exit('Файл не найден');
}

/* ── Вход: пароль → 2FA ── */
function wt_admin_login_screen($err = '', $delivery = null) {
    $accent = wt_option('login_accent', '#14b8a6');
    $logo = esc(wt_option('login_logo', 'Wordtime'));
    $msg = esc(wt_option('login_message', 'Вход защищён двухфакторной аутентификацией'));
    $side = esc(wt_option('login_side', 'Быстро. Безопасно. По-русски.'));
    $step2 = isset($_SESSION['wt_2fa_uid']);
    wt_admin_css();
    echo '<div class="login-wrap">';
    echo '<div class="login-card">';
    echo '<div class="login-brand"><span class="lg-hour"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="' . esc_attr($accent) . '" stroke-width="1.7"><path d="M7 3.5h10M7 20.5h10" stroke-linecap="round"/><path d="M8 3.5v3.2c0 2.3 1.6 3.5 3 4.6l1 .7 1-.7c1.4-1.1 3-2.3 3-4.6V3.5M8 20.5v-3.2c0-2.3 1.6-3.5 3-4.6l1-.7 1 .7c1.4 1.1 3 2.3 3 4.6v3.2" stroke-linejoin="round"/></svg></span><h1>' . $logo . '</h1><p>' . $msg . '</p></div>';
    if ($err !== '') echo '<div class="alert err">' . esc($err) . '</div>';
    if ($step2) {
        if (is_array($delivery)) {
            if (!empty($delivery['ok'])) echo '<div class="alert ok">Код отправлен: ' . esc($delivery['method']) . '</div>';
            else echo '<div class="alert warn">Почта недоступна (' . esc(isset($delivery['error']) ? $delivery['error'] : '') . '). Код сохранён в файл <b>' . esc($delivery['log']) . '</b> на сервере — откройте его через файловый менеджер хостинга.</div>';
        }
        echo '<form method="post" action="' . esc_attr(wt_admin_url()) . '">';
        echo '<input type="hidden" name="action" value="2fa"><input type="hidden" name="wt_nonce" value="' . wt_nonce('login') . '">';
        echo '<label>Шести-значный код из письма</label>';
        echo '<input class="code" name="code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" autofocus required placeholder="••••••">';
        echo '<button class="btn" type="submit">Подтвердить и войти</button>';
        echo '<button class="btn ghost" type="submit" name="cancel2fa" value="1">Отмена — другой пользователь</button>';
        echo '</form>';
    } else {
        echo '<form method="post" action="' . esc_attr(wt_admin_url()) . '">';
        echo '<input type="hidden" name="action" value="login"><input type="hidden" name="wt_nonce" value="' . wt_nonce('login') . '">';
        echo '<label>Почта</label><input type="email" name="email" required autofocus>';
        echo '<label>Пароль</label><input type="password" name="pass" required>';
        echo '<button class="btn" type="submit" style="background:' . esc_attr($accent) . '">Продолжить — код придёт на почту</button>';
        echo '</form>';
    }
    echo '<p class="login-note">' . $side . ' · Wordtime ' . WT_VERSION . '</p>';
    echo '</div></div></body></html>';
    exit;
}

if (!$user) {
    if ($act === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!wt_check_nonce('login')) wt_admin_login_screen('Проверка безопасности не пройдена.');
        $email = isset($_POST['email']) ? trim(strip_tags($_POST['email'])) : '';
        $pass = isset($_POST['pass']) ? (string)$_POST['pass'] : '';
        if (preg_match('/(<script|union\s+select|javascript:)/i', $email . $pass)) { wt_log('Заблокирована попытка инъекции при входе'); wt_admin_login_screen('Ввод содержит запрещённые конструкции. Вход отклонён.'); }
        $lock = wt_attempt_locked($email);
        if ($lock > 0) wt_admin_login_screen('Сработала защита от подбора паролей. Повторите через ' . $lock . ' сек.');
        $u = wt_find_user($email);
        if (!$u || !password_verify($pass, $u['user_pass'])) {
            $fails = wt_attempt_fail($email);
            wt_admin_login_screen($fails === 0 ? 'Слишком много попыток — вход заблокирован на 60 секунд.' : 'Неверная почта или пароль. Осталось попыток: ' . (5 - $fails) . '.');
        }
        wt_attempt_ok($email);
        $delivery = wt_2fa_start($u);
        $_SESSION['wt_2fa_delivery'] = $delivery;
        wt_admin_login_screen('', $delivery);
    }
    if ($act === '2fa' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!wt_check_nonce('login')) wt_admin_login_screen('Проверка безопасности не пройдена.');
        if (isset($_POST['cancel2fa'])) { wt_session_start(); $_SESSION = array(); header('Location: ' . wt_admin_url()); exit; }
        $code = isset($_POST['code']) ? (string)$_POST['code'] : '';
        list($okk, $res) = wt_2fa_verify($code);
        if (!$okk) wt_admin_login_screen($res, isset($_SESSION['wt_2fa_delivery']) ? $_SESSION['wt_2fa_delivery'] : null);
        wt_login_user($res);
        wt_log('Вход в консоль подтверждён (2FA): uid ' . $res);
        header('Location: ' . wt_admin_url()); exit;
    }
    wt_admin_login_screen('', null);
}

/* ── Обработка действий (только авторизованные) ── */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $act !== '') {
    if (!wt_check_nonce('admin')) { $_SESSION['wt_flash'] = array('err', 'Проверка безопасности не пройдена — обновите страницу.'); header('Location: ' . wt_admin_url('&page=' . $page)); exit; }
    switch ($act) {
        case 'post-save': {
            $id = (int)$_POST['id'];
            $title = trim(strip_tags($_POST['title']));
            $slug = trim($_POST['slug']) !== '' ? wt_slugify($_POST['slug']) : wt_slugify($title);
            $data = array($title, $slug, wt_kses($_POST['content']), trim(strip_tags($_POST['category'])), trim(strip_tags($_POST['tags'])), $_POST['status'], trim($_POST['image']));
            if ($id > 0) { $st = wt_db()->prepare('UPDATE ' . wt_t('posts') . ' SET post_title=?, slug=?, post_content=?, category=?, tags=?, post_status=?, post_image=? WHERE id=?'); $data[] = $id; $st->execute($data); wt_log('Запись #' . $id . ' обновлена'); }
            else { $st = wt_db()->prepare('INSERT INTO ' . wt_t('posts') . ' (post_title, slug, post_content, category, tags, post_status, post_image, post_author) VALUES (?,?,?,?,?,?,?,?)'); $data[] = $user['user_login']; $st->execute($data); wt_log('Создана запись «' . $title . '»'); }
            wt_cache_flush();
            $_SESSION['wt_flash'] = array('ok', 'Запись сохранена.'); header('Location: ' . wt_admin_url('&page=posts')); exit;
        }
        case 'post-delete': {
            $id = (int)$_POST['id'];
            wt_db()->prepare('DELETE FROM ' . wt_t('posts') . ' WHERE id = ?')->execute(array($id));
            wt_db()->prepare('DELETE FROM ' . wt_t('comments') . ' WHERE post_id = ?')->execute(array($id));
            wt_cache_flush(); wt_log('Запись #' . $id . ' удалена');
            $_SESSION['wt_flash'] = array('ok', 'Запись удалена.'); header('Location: ' . wt_admin_url('&page=posts')); exit;
        }
        case 'page-save': {
            $id = (int)$_POST['id'];
            $title = trim(strip_tags($_POST['title']));
            $slug = trim($_POST['slug']) !== '' ? wt_slugify($_POST['slug']) : wt_slugify($title);
            if ($id > 0) { wt_db()->prepare('UPDATE ' . wt_t('pages') . ' SET title=?, slug=?, content=?, status=? WHERE id=?')->execute(array($title, $slug, wt_kses($_POST['content']), $_POST['status'], $id)); wt_log('Страница #' . $id . ' обновлена'); }
            else { wt_db()->prepare('INSERT INTO ' . wt_t('pages') . ' (title, slug, content, status) VALUES (?,?,?,?)')->execute(array($title, $slug, wt_kses($_POST['content']), $_POST['status'])); wt_log('Создана страница «' . $title . '»'); }
            wt_cache_flush();
            $_SESSION['wt_flash'] = array('ok', 'Страница сохранена.'); header('Location: ' . wt_admin_url('&page=pages')); exit;
        }
        case 'page-delete': {
            wt_db()->prepare('DELETE FROM ' . wt_t('pages') . ' WHERE id = ?')->execute(array((int)$_POST['id']));
            wt_cache_flush(); wt_log('Страница #' . (int)$_POST['id'] . ' удалена');
            $_SESSION['wt_flash'] = array('ok', 'Страница удалена.'); header('Location: ' . wt_admin_url('&page=pages')); exit;
        }
        case 'comment-set': {
            wt_db()->prepare('UPDATE ' . wt_t('comments') . ' SET status = ? WHERE id = ?')->execute(array($_POST['status'], (int)$_POST['id']));
            wt_cache_flush(); wt_log('Комментарий #' . (int)$_POST['id'] . ' → ' . $_POST['status']);
            $_SESSION['wt_flash'] = array('ok', 'Статус комментария обновлён.'); header('Location: ' . wt_admin_url('&page=comments')); exit;
        }
        case 'comment-delete': {
            wt_db()->prepare('DELETE FROM ' . wt_t('comments') . ' WHERE id = ?')->execute(array((int)$_POST['id']));
            wt_cache_flush(); wt_log('Комментарий #' . (int)$_POST['id'] . ' удалён');
            $_SESSION['wt_flash'] = array('ok', 'Комментарий удалён.'); header('Location: ' . wt_admin_url('&page=comments')); exit;
        }
        case 'upload': {
            list($okk, $res) = wt_handle_upload('file');
            wt_cache_flush();
            $_SESSION['wt_flash'] = $okk ? array('ok', 'Файл загружен: ' . $res['name']) : array('err', $res);
            header('Location: ' . wt_admin_url('&page=media')); exit;
        }
        case 'media-delete': {
            $rel = (string)$_POST['rel'];
            $path = WT_UPLOADS . '/' . $rel;
            $real = realpath($path);
            if ($real && strpos($real, realpath(WT_UPLOADS)) === 0 && is_file($real)) { @unlink($real); wt_log('Удалён медиафайл ' . $rel); }
            wt_cache_flush();
            $_SESSION['wt_flash'] = array('ok', 'Файл удалён.'); header('Location: ' . wt_admin_url('&page=media')); exit;
        }
        case 'user-add': {
            $email = mb_strtolower(trim(strip_tags($_POST['email'])));
            if (wt_find_user($email)) { $_SESSION['wt_flash'] = array('err', 'Эта почта уже зарегистрирована.'); header('Location: ' . wt_admin_url('&page=users')); exit; }
            wt_db()->prepare('INSERT INTO ' . wt_t('users') . ' (user_login, user_email, user_pass, user_role) VALUES (?,?,?,?)')
                ->execute(array(trim(strip_tags($_POST['login'])), $email, password_hash((string)$_POST['pass'], PASSWORD_DEFAULT), $_POST['role']));
            wt_log('Создан пользователь ' . $email);
            $_SESSION['wt_flash'] = array('ok', 'Пользователь добавлен.'); header('Location: ' . wt_admin_url('&page=users')); exit;
        }
        case 'user-delete': {
            $id = (int)$_POST['id'];
            if ($id === (int)$user['id']) { $_SESSION['wt_flash'] = array('err', 'Нельзя удалить самого себя.'); header('Location: ' . wt_admin_url('&page=users')); exit; }
            wt_db()->prepare('DELETE FROM ' . wt_t('users') . ' WHERE id = ? AND user_role != "administrator"')->execute(array($id));
            wt_log('Пользователь #' . $id . ' удалён');
            $_SESSION['wt_flash'] = array('ok', 'Пользователь удалён.'); header('Location: ' . wt_admin_url('&page=users')); exit;
        }
        case 'settings-save': {
            foreach (array('site_title', 'tagline', 'admin_email') as $k) if (isset($_POST[$k])) wt_set_option($k, trim(strip_tags($_POST[$k])));
            wt_set_option('categories', array_values(array_filter(array_map('trim', explode(',', (string)$_POST['categories'])), 'strlen')));
            wt_log('Общие настройки сохранены');
            $_SESSION['wt_flash'] = array('ok', 'Настройки сохранены.'); header('Location: ' . wt_admin_url('&page=settings')); exit;
        }
        case 'settings-comments': {
            wt_set_option('comments_disabled', isset($_POST['comments_disabled']));
            wt_set_option('moderate_first', isset($_POST['moderate_first']));
            wt_set_option('close_after_days', max(1, (int)$_POST['close_after_days']));
            wt_cache_flush(); wt_log('Настройки комментариев сохранены (отключены: ' . (isset($_POST['comments_disabled']) ? 'да' : 'нет') . ')');
            $_SESSION['wt_flash'] = array('ok', 'Настройки комментариев сохранены.'); header('Location: ' . wt_admin_url('&page=settings&tab=comments')); exit;
        }
        case 'cache-toggle': {
            wt_set_option('cache_enabled', isset($_POST['cache_enabled']));
            $_SESSION['wt_flash'] = array('ok', isset($_POST['cache_enabled']) ? 'Кеш включён.' : 'Кеш отключён.'); header('Location: ' . wt_admin_url('&page=settings&tab=cache')); exit;
        }
        case 'cache-clear': {
            wt_cache_flush(); wt_log('Кеш очищен из консоли');
            $_SESSION['wt_flash'] = array('ok', 'Кеш сайта очищен.'); header('Location: ' . wt_admin_url('&page=settings&tab=cache')); exit;
        }
        case 'smtp-save': {
            $lines = file(WT_ROOT . '/wt-config.php');
            $map = array('WT_SMTP_HOST' => (string)$_POST['smtp_host'], 'WT_SMTP_PORT' => (string)(int)$_POST['smtp_port'], 'WT_SMTP_USER' => (string)$_POST['smtp_user'], 'WT_SMTP_PASS' => (string)$_POST['smtp_pass'], 'WT_MAIL_FROM' => (string)$_POST['smtp_from']);
            foreach ($lines as $i => $line) {
                foreach ($map as $const => $val) {
                    if (strpos($line, "define('" . $const . "'") === 0 || strpos($line, "define('" . $const . "',") !== false) {
                        $lines[$i] = "define('" . $const . "', " . ($const === 'WT_SMTP_PORT' ? (int)$val : "'" . addslashes($val) . "'") . ");\n";
                    }
                }
            }
            if (@file_put_contents(WT_ROOT . '/wt-config.php', implode('', $lines)) !== false) {
                wt_log('Настройки SMTP сохранены');
                $_SESSION['wt_flash'] = array('ok', 'SMTP сохранён. Перезагрузите страницу, чтобы значения вступили в силу.');
            } else $_SESSION['wt_flash'] = array('err', 'Не удалось записать wt-config.php — проверьте права на файл.');
            header('Location: ' . wt_admin_url('&page=settings&tab=security')); exit;
        }
        case 'smtp-test': {
            $to = wt_option('admin_email', $user['user_email']);
            $r = wt_mail($to, 'Wordtime: проверка почты', "Если вы читаете это — почта работает.\nКоды 2FA будут приходить сюда.");
            $_SESSION['wt_flash'] = !empty($r['ok']) ? array('ok', 'Письмо отправлено: ' . $r['method']) : array('err', 'Почта не ушла (' . $r['error'] . '). Коды сохраняются в ' . $r['log']);
            header('Location: ' . wt_admin_url('&page=settings&tab=security')); exit;
        }
        case 'login-style': {
            wt_set_option('login_accent', preg_match('/^#[0-9a-f]{6}$/i', (string)$_POST['accent']) ? $_POST['accent'] : '#14b8a6');
            wt_set_option('login_logo', trim(strip_tags($_POST['logo'])));
            wt_set_option('login_message', trim(strip_tags($_POST['message'])));
            wt_set_option('login_side', trim(strip_tags($_POST['side'])));
            wt_log('Оформление страницы входа обновлено');
            $_SESSION['wt_flash'] = array('ok', 'Страница входа обновлена — выйдите, чтобы увидеть.'); header('Location: ' . wt_admin_url('&page=settings&tab=login')); exit;
        }
        case 'attempts-clear': {
            wt_db()->exec('DELETE FROM ' . wt_t('login_attempts'));
            $_SESSION['wt_flash'] = array('ok', 'Счётчики попыток входа сброшены.'); header('Location: ' . wt_admin_url('&page=settings&tab=security')); exit;
        }
        case 'backup-zip': {
            list($okk, $res) = wt_backup_zip();
            wt_log($okk ? 'Создан полный бэкап ' . $res : 'Ошибка бэкапа: ' . $res);
            $_SESSION['wt_flash'] = $okk ? array('ok', 'Архив создан: ' . $res) : array('err', $res);
            header('Location: ' . wt_admin_url('&page=backups')); exit;
        }
        case 'backup-sql': {
            $name = 'wordtime-db-' . date('Ymd-His') . '.sql';
            @file_put_contents(WT_DATA . '/backups/' . $name, wt_backup_db_sql());
            wt_log('Создан дамп базы ' . $name);
            $_SESSION['wt_flash'] = array('ok', 'Дамп базы создан: ' . $name);
            header('Location: ' . wt_admin_url('&page=backups')); exit;
        }
        case 'backup-delete': {
            $f = basename((string)$_POST['file']);
            $path = WT_DATA . '/backups/' . $f;
            if (is_file($path)) { @unlink($path); wt_log('Удалён бэкап ' . $f); }
            $_SESSION['wt_flash'] = array('ok', 'Бэкап удалён.'); header('Location: ' . wt_admin_url('&page=backups')); exit;
        }
        case 'backup-restore': {
            if (empty($_POST['confirm'])) { $_SESSION['wt_flash'] = array('err', 'Подтвердите восстановление флажком.'); header('Location: ' . wt_admin_url('&page=backups')); exit; }
            if (empty($_FILES['sql']['tmp_name'])) { $_SESSION['wt_flash'] = array('err', 'Выберите файл .sql'); header('Location: ' . wt_admin_url('&page=backups')); exit; }
            $sql = file_get_contents($_FILES['sql']['tmp_name']);
            $n = 0;
            try {
                foreach (preg_split('/;\s*\n/', $sql) as $q) {
                    $q = trim($q);
                    if ($q === '' || strpos($q, '--') === 0) continue;
                    wt_db()->exec($q); $n++;
                }
                wt_cache_flush(); wt_log('Восстановление из .sql: выполнено запросов — ' . $n);
                $_SESSION['wt_flash'] = array('ok', 'База восстановлена (' . $n . ' запросов).');
            } catch (Exception $e) {
                $_SESSION['wt_flash'] = array('err', 'Ошибка восстановления: ' . $e->getMessage());
            }
            header('Location: ' . wt_admin_url('&page=backups')); exit;
        }
        case 'key-create': {
            $key = 'wt_' . bin2hex(random_bytes(18));
            wt_db()->prepare('INSERT INTO ' . wt_t('api_keys') . ' (name, key_hash, scopes) VALUES (?,?,?)')
                ->execute(array(trim(strip_tags($_POST['name'])), hash('sha256', $key), (string)$_POST['scopes']));
            wt_log('Создан API-ключ «' . $_POST['name'] . '»');
            $_SESSION['wt_flash'] = array('ok', 'Ключ создан. Скопируйте его сейчас — повторно он не показывается: <b style="font-family:monospace">' . $key . '</b>');
            header('Location: ' . wt_admin_url('&page=api')); exit;
        }
        case 'key-delete': {
            wt_db()->prepare('DELETE FROM ' . wt_t('api_keys') . ' WHERE id = ?')->execute(array((int)$_POST['id']));
            wt_log('Отозван API-ключ #' . (int)$_POST['id']);
            $_SESSION['wt_flash'] = array('ok', 'Ключ отозван.'); header('Location: ' . wt_admin_url('&page=api')); exit;
        }
        case 'quick-draft': {
            $title = trim(strip_tags($_POST['title']));
            wt_db()->prepare('INSERT INTO ' . wt_t('posts') . ' (post_title, slug, post_content, category, post_status, post_author) VALUES (?,?,?,?, "draft", ?)')
                ->execute(array($title !== '' ? $title : 'Черновик', wt_slugify($title !== '' ? $title : 'draft') . '-' . substr(md5(microtime()), 0, 4), wt_kses($_POST['content']), 'Без рубрики', $user['user_login']));
            wt_cache_flush(); wt_log('Быстрый черновик «' . $title . '»');
            $_SESSION['wt_flash'] = array('ok', 'Черновик сохранён.'); header('Location: ' . wt_admin_url()); exit;
        }
    }
}

/* ── Разметка консоли ── */
function wt_admin_css() {
    echo '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">';
    echo '<title>Консоль — Wordtime</title><style>';
    echo ':root{--bg:#eef2f3;--card:#ffffff;--line:#dbe4e6;--txt:#0c2e36;--mut:#5c7379;--deep:#0b2b33;--deep2:#0f3742;--dline:#1c4a56;--teal:#0e9384;--teal2:#14b8a6;--amber:#f0b429;--red:#dc2626;--ok:#16a34a;--paper:#f6f9f9}';
    echo '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:14.5px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}';
    echo 'a{color:var(--teal);text-decoration:none}a:hover{text-decoration:underline}';
    echo '.top{position:sticky;top:0;z-index:30;height:48px;background:var(--deep);color:#cfe3e6;display:flex;align-items:center;gap:16px;padding:0 18px;font-size:13px}';
    echo '.top b{color:#fff;font-size:14px;letter-spacing:-.01em}.top a{color:#9dc3cb}.top a:hover{color:#fff;text-decoration:none}';
    echo '.layout{display:grid;grid-template-columns:225px 1fr;min-height:calc(100vh - 48px)}';
    echo '.side{background:var(--deep);color:#b9d4da;padding:14px 0;border-right:1px solid var(--dline)}';
    echo '.side a{display:flex;align-items:center;gap:10px;padding:9px 18px;color:#b9d4da;font-weight:600;font-size:13.5px;border-left:3px solid transparent}';
    echo '.side a:hover{background:var(--deep2);color:#fff;text-decoration:none}';
    echo '.side a.on{background:var(--deep2);color:#fff;border-left-color:var(--amber)}';
    echo '.side .sec{padding:16px 18px 6px;font-size:10.5px;font-weight:800;letter-spacing:.12em;color:#54808b;text-transform:uppercase}';
    echo '.main{padding:26px 30px 60px;max-width:1120px}';
    echo 'h1{font-size:23px;letter-spacing:-.02em;margin:0 0 4px}h2{font-size:16.5px;margin:0}';
    echo '.sub{color:var(--mut);font-size:13px;margin:0 0 20px}';
    echo '.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px 22px;margin-bottom:18px}';
    echo '.card h2{margin-bottom:12px}';
    echo '.grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px}.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}';
    echo '.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px}';
    echo '.stat b{font-size:26px;display:block;letter-spacing:-.02em}.stat span{color:var(--mut);font-size:12.5px;font-weight:600}';
    echo 'table{width:100%;border-collapse:collapse;font-size:13.5px}';
    echo 'th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);padding:9px 12px;border-bottom:1px solid var(--line);background:var(--paper)}';
    echo 'td{padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:top}';
    echo 'tr:hover td{background:#f2f7f7}';
    echo 'label{display:block;font-size:12.5px;font-weight:700;margin:13px 0 5px}';
    echo 'input[type=text],input[type=email],input[type=password],input[type=number],input[type=url],input[type=color],select,textarea{width:100%;padding:9px 12px;border-radius:8px;border:1px solid var(--line);background:#fff;color:var(--txt);font:inherit;outline:none}';
    echo 'input:focus,select:focus,textarea:focus{border-color:var(--teal);box-shadow:0 0 0 3px rgba(14,147,132,.12)}';
    echo 'textarea{min-height:220px;resize:vertical;line-height:1.65}';
    echo '.btn{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:8px;border:1px solid transparent;background:var(--teal);color:#fff;font-weight:700;font-size:13.5px;cursor:pointer;transition:transform .1s,background .15s}';
    echo '.btn:hover{background:#0b7a6d}.btn:active{transform:scale(.97)}';
    echo '.btn.ghost{background:#fff;border-color:var(--line);color:var(--txt)}.btn.ghost:hover{border-color:var(--teal);color:var(--teal);background:#fff}';
    echo '.btn.red{background:#fff;border-color:var(--line);color:var(--red)}.btn.red:hover{border-color:var(--red);background:#fef2f2}';
    echo '.btn.amber{background:var(--amber);color:#3d2c00}.btn.amber:hover{background:#dba10f}';
    echo '.btn.sm{padding:5px 11px;font-size:12.5px;border-radius:7px}';
    echo '.badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:800;letter-spacing:.03em}';
    echo '.b-ok{background:#dcfce7;color:#15803d}.b-mut{background:#eef2f3;color:#5c7379}.b-warn{background:#fef3c7;color:#b45309}.b-teal{background:#ccfbf1;color:#0f766e}';
    echo '.alert{padding:12px 15px;border-radius:10px;margin:0 0 16px;font-size:13.5px;border:1px solid}';
    echo '.alert.ok{background:#f0fdf4;border-color:#bbf7d0;color:#166534}.alert.err{background:#fef2f2;border-color:#fecaca;color:#991b1b}.alert.warn{background:#fffbeb;border-color:#fde68a;color:#92400e}';
    echo '.tabs{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}';
    echo '.tabs a{padding:7px 14px;border-radius:8px;border:1px solid var(--line);background:#fff;color:var(--mut);font-weight:700;font-size:13px}';
    echo '.tabs a:hover{color:var(--txt);text-decoration:none}.tabs a.on{background:var(--deep);border-color:var(--deep);color:#fff}';
    echo '.login-wrap{min-height:100vh;display:grid;place-items:center;background:radial-gradient(900px 500px at 80% -10%,rgba(20,184,166,.14),transparent),var(--deep);padding:20px}';
    echo '.login-card{width:100%;max-width:400px;background:#0e333d;border:1px solid var(--dline);border-radius:16px;padding:30px;color:#eef3f3;box-shadow:0 30px 70px -25px rgba(0,0,0,.6)}';
    echo '.login-brand{text-align:center;margin-bottom:20px}.login-brand h1{font-size:21px;margin:12px 0 3px;color:#fff}.login-brand p{color:#8fb0b7;font-size:13px;margin:0}';
    echo '.lg-hour{display:inline-grid;place-items:center;width:60px;height:60px;border:2px solid #1c4a56;border-radius:13px;background:#0b2b33}';
    echo '.login-card label{color:#cfe3e6}.login-card input{background:#08222a;border-color:var(--dline);color:#fff}';
    echo '.login-card input.code{text-align:center;font-size:26px;letter-spacing:.5em;font-weight:800;padding:12px}';
    echo '.login-card .btn{width:100%;justify-content:center;padding:12px;margin-top:18px;font-size:14.5px}';
    echo '.login-card .btn.ghost{background:transparent;border-color:var(--dline);color:#8fb0b7}';
    echo '.login-note{text-align:center;color:#54808b;font-size:11.5px;margin:18px 0 0}';
    echo '.alert.warn b{color:#78350f}';
    echo '.media-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}';
    echo '.media-item{border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff}';
    echo '.media-item img{width:100%;height:96px;object-fit:cover;display:block;background:#e6edee}';
    echo '.media-item .mi-b{padding:8px 10px;font-size:11.5px}.media-item .mi-b b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
    echo '.row-inline{display:flex;gap:10px;align-items:center;flex-wrap:wrap}';
    echo 'code{background:var(--paper);border:1px solid var(--line);border-radius:5px;padding:1px 6px;font-size:12px}';
    echo '@media(max-width:900px){.layout{grid-template-columns:1fr}.side{display:flex;overflow-x:auto;padding:8px}.side a{white-space:nowrap;border-left:0;border-radius:8px}.side .sec{display:none}.grid2,.grid3{grid-template-columns:1fr}.main{padding:18px}}';
    echo '</style></head><body>';
}
function wt_form_open($hidden = array()) {
    echo '<form method="post" action="' . esc_attr(wt_admin_url()) . '" ' . (isset($hidden['enctype']) ? 'enctype="multipart/form-data"' : '') . '>';
    echo '<input type="hidden" name="action" value="' . esc_attr($hidden['action']) . '"><input type="hidden" name="wt_nonce" value="' . wt_nonce('admin') . '">';
    foreach ($hidden as $k => $val) if (!in_array($k, array('action', 'enctype'), true)) echo '<input type="hidden" name="' . esc_attr($k) . '" value="' . esc_attr($val) . '">';
}
function wt_shell($page, $title, $sub) {
    global $user, $flash;
    wt_admin_css();
    $items = array(
        array('', 'Консоль', 'dashboard'), array('posts', 'Записи', 'posts'), array('pages', 'Страницы', 'pages'),
        array('comments', 'Комментарии', 'comments'), array('media', 'Медиафайлы', 'media'), array('users', 'Пользователи', 'users'),
        array('settings', 'Настройки', 'settings'), array('backups', 'Резервные копии', 'backups'), array('api', 'API и приложения', 'api'),
    );
    echo '<div class="top"><b>⧗ Wordtime</b><a href="' . esc_attr(wt_base() . '/') . '">Перейти на сайт ↗</a>';
    echo '<span style="margin-left:auto"></span><span>' . esc($user['user_login']) . ' · ' . esc($user['user_role']) . '</span>';
    echo '<a href="' . esc_attr(wt_admin_url('&action=logout')) . '">Выйти</a></div>';
    echo '<div class="layout"><nav class="side"><div class="sec">Управление</div>';
    foreach ($items as $it) {
        $on = ($page === $it[1]) || ($page === '' && $it[1] === 'dashboard');
        echo '<a class="' . ($on ? 'on' : '') . '" href="' . esc_attr(wt_admin_url('&page=' . $it[1])) . '">' . $it[2] . '</a>';
    }
    echo '</nav><main class="main">';
    echo '<h1>' . esc($title) . '</h1><p class="sub">' . esc($sub) . '</p>';
    if (is_array($flash)) echo '<div class="alert ' . ($flash[0] === 'ok' ? 'ok' : ($flash[0] === 'warn' ? 'warn' : 'err')) . '">' . $flash[1] . '</div>';
}
function wt_shell_close() { echo '</main></div></body></html>'; }

$cnt = function ($sql) { return (int)wt_db()->query($sql)->fetchColumn(); };

/* ── Страницы ── */
switch ($page) {
case 'posts': {
    $edit = isset($_GET['edit']) ? (int)$_GET['edit'] : 0;
    $row = null;
    if (isset($_GET['new']) || $edit > 0) {
        if ($edit > 0) { $st = wt_db()->prepare('SELECT * FROM ' . wt_t('posts') . ' WHERE id=?'); $st->execute(array($edit)); $row = $st->fetch(); }
        $row = $row ? $row : array('id' => 0, 'post_title' => '', 'slug' => '', 'post_content' => '', 'category' => 'Без рубрики', 'tags' => '', 'post_status' => 'draft', 'post_image' => '');
        wt_shell('posts', $edit > 0 ? 'Редактирование записи' : 'Новая запись', 'Заголовок, текст, рубрика и статус');
        wt_form_open(array('action' => 'post-save', 'id' => $row['id']));
        echo '<div class="card"><label>Заголовок</label><input type="text" name="title" required value="' . esc_attr($row['post_title']) . '">';
        echo '<label>Текст записи</label><textarea name="content">' . esc($row['post_content']) . '</textarea>';
        echo '<div class="grid3"><div><label>Рубрика</label><select name="category">';
        foreach (wt_categories() as $c) echo '<option ' . ($c === $row['category'] ? 'selected' : '') . '>' . esc($c) . '</option>';
        echo '</select></div><div><label>Ярлыки (через запятую)</label><input type="text" name="tags" value="' . esc_attr($row['tags']) . '"></div>';
        echo '<div><label>Статус</label><select name="status"><option value="draft" ' . ($row['post_status'] === 'draft' ? 'selected' : '') . '>Черновик</option><option value="published" ' . ($row['post_status'] === 'published' ? 'selected' : '') . '>Опубликовано</option></select></div></div>';
        echo '<div class="grid2"><div><label>Ярлык ссылки (slug)</label><input type="text" name="slug" value="' . esc_attr($row['slug']) . '" placeholder="оставьте пустым — создадим сами"></div>';
        echo '<div><label>URL обложки</label><input type="url" name="image" value="' . esc_attr($row['post_image']) . '"></div></div>';
        echo '<p style="margin:18px 0 0"><button class="btn" type="submit">Сохранить запись</button> <a class="btn ghost" href="' . esc_attr(wt_admin_url('&page=posts')) . '">Отмена</a></p></div></form>';
        wt_shell_close(); exit;
    }
    $rows = wt_db()->query('SELECT * FROM ' . wt_t('posts') . ' ORDER BY post_date DESC')->fetchAll();
    wt_shell('posts', 'Записи', 'Всего: ' . count($rows) . ' — публикация, черновики, редактирование');
    echo '<p><a class="btn" href="' . esc_attr(wt_admin_url('&page=posts&new=1')) . '">+ Добавить запись</a></p><div class="card" style="padding:0"><table><tr><th>Заголовок</th><th>Рубрика</th><th>Статус</th><th>Дата</th><th></th></tr>';
    foreach ($rows as $r) {
        echo '<tr><td><b>' . esc($r['post_title']) . '</b><br><span style="color:var(--mut);font-size:12px">' . esc(wt_excerpt($r['post_content'], 14)) . '</span></td>';
        echo '<td>' . esc($r['category']) . '</td><td>' . ($r['post_status'] === 'published' ? '<span class="badge b-ok">Опубликовано</span>' : '<span class="badge b-mut">Черновик</span>') . '</td>';
        echo '<td style="white-space:nowrap">' . esc(date('d.m.Y', strtotime($r['post_date']))) . '</td>';
        echo '<td class="row-inline"><a class="btn ghost sm" href="' . esc_attr(wt_admin_url('&page=posts&edit=' . $r['id'])) . '">Изменить</a>';
        wt_form_open(array('action' => 'post-delete', 'id' => $r['id']));
        echo '<button class="btn red sm" type="submit" onclick="return confirm(\'Удалить запись?\')">Удалить</button></form></td></tr>';
    }
    echo '</table></div>';
    wt_shell_close(); exit;
}
case 'pages': {
    $edit = isset($_GET['edit']) ? (int)$_GET['edit'] : 0;
    $row = null;
    if (isset($_GET['new']) || $edit > 0) {
        if ($edit > 0) { $st = wt_db()->prepare('SELECT * FROM ' . wt_t('pages') . ' WHERE id=?'); $st->execute(array($edit)); $row = $st->fetch(); }
        $row = $row ? $row : array('id' => 0, 'title' => '', 'slug' => '', 'content' => '', 'status' => 'published');
        wt_shell('pages', $edit > 0 ? 'Редактирование страницы' : 'Новая страница', 'Статические страницы сайта');
        wt_form_open(array('action' => 'page-save', 'id' => $row['id']));
        echo '<div class="card"><label>Название</label><input type="text" name="title" required value="' . esc_attr($row['title']) . '">';
        echo '<label>Содержимое</label><textarea name="content">' . esc($row['content']) . '</textarea>';
        echo '<div class="grid2"><div><label>Ярлык ссылки</label><input type="text" name="slug" value="' . esc_attr($row['slug']) . '"></div>';
        echo '<div><label>Статус</label><select name="status"><option value="published" ' . ($row['status'] === 'published' ? 'selected' : '') . '>Опубликовано</option><option value="draft" ' . ($row['status'] === 'draft' ? 'selected' : '') . '>Черновик</option></select></div></div>';
        echo '<p style="margin:18px 0 0"><button class="btn" type="submit">Сохранить</button> <a class="btn ghost" href="' . esc_attr(wt_admin_url('&page=pages')) . '">Отмена</a></p></div></form>';
        wt_shell_close(); exit;
    }
    $rows = wt_pages_list();
    wt_shell('pages', 'Страницы', 'Всего: ' . count($rows));
    echo '<p><a class="btn" href="' . esc_attr(wt_admin_url('&page=pages&new=1')) . '">+ Добавить страницу</a></p><div class="card" style="padding:0"><table><tr><th>Название</th><th>Ссылка</th><th>Статус</th><th></th></tr>';
    foreach ($rows as $r) {
        echo '<tr><td><b>' . esc($r['title']) . '</b></td><td><code>?p=page:' . esc($r['slug']) . '</code></td>';
        echo '<td>' . ($r['status'] === 'published' ? '<span class="badge b-ok">Опубликовано</span>' : '<span class="badge b-mut">Черновик</span>') . '</td>';
        echo '<td class="row-inline"><a class="btn ghost sm" href="' . esc_attr(wt_admin_url('&page=pages&edit=' . $r['id'])) . '">Изменить</a>';
        wt_form_open(array('action' => 'page-delete', 'id' => $r['id']));
        echo '<button class="btn red sm" type="submit" onclick="return confirm(\'Удалить страницу?\')">Удалить</button></form></td></tr>';
    }
    echo '</table></div>';
    wt_shell_close(); exit;
}
case 'comments': {
    $tab = isset($_GET['tab']) ? (string)$_GET['tab'] : 'all';
    $where = $tab === 'all' ? '' : ' WHERE status = ' . wt_db()->quote($tab);
    $rows = wt_db()->query('SELECT c.*, p.post_title FROM ' . wt_t('comments') . ' c LEFT JOIN ' . wt_t('posts') . ' p ON p.id = c.post_id' . $where . ' ORDER BY c.created DESC')->fetchAll();
    wt_shell('comments', 'Комментарии', 'Модерация: одобрение, спам, удаление');
    echo '<div class="tabs">';
    foreach (array('all' => 'Все', 'pending' => 'Ожидают', 'approved' => 'Одобренные', 'spam' => 'Спам') as $k => $l) {
        echo '<a class="' . ($tab === $k ? 'on' : '') . '" href="' . esc_attr(wt_admin_url('&page=comments&tab=' . $k)) . '">' . $l . '</a>';
    }
    echo '</div>';
    if (wt_option('comments_disabled', false)) echo '<div class="alert warn">Комментарии на сайте <b>отключены</b> в настройках — новые не принимаются.</div>';
    if (count($rows) === 0) { echo '<div class="card">Комментариев нет.</div>'; wt_shell_close(); exit; }
    echo '<div class="card" style="padding:0"><table><tr><th>Автор</th><th>Комментарий</th><th>К записи</th><th>Статус</th><th></th></tr>';
    foreach ($rows as $c) {
        echo '<tr><td><b>' . esc($c['author']) . '</b><br><span style="color:var(--mut);font-size:12px">' . esc(date('d.m.Y H:i', strtotime($c['created']))) . '</span></td>';
        echo '<td style="max-width:340px">' . esc($c['text']) . '</td><td>' . esc($c['post_title'] !== null ? $c['post_title'] : '—') . '</td>';
        echo '<td>' . ($c['status'] === 'approved' ? '<span class="badge b-ok">Одобрен</span>' : ($c['status'] === 'pending' ? '<span class="badge b-warn">Ожидает</span>' : '<span class="badge b-mut">Спам</span>')) . '</td><td class="row-inline">';
        if ($c['status'] !== 'approved') { wt_form_open(array('action' => 'comment-set', 'id' => $c['id'], 'status' => 'approved')); echo '<button class="btn ghost sm" type="submit">Одобрить</button></form>'; }
        if ($c['status'] !== 'spam') { wt_form_open(array('action' => 'comment-set', 'id' => $c['id'], 'status' => 'spam')); echo '<button class="btn ghost sm" type="submit">В спам</button></form>'; }
        wt_form_open(array('action' => 'comment-delete', 'id' => $c['id'])); echo '<button class="btn red sm" type="submit">Удалить</button></form>';
        echo '</td></tr>';
    }
    echo '</table></div>';
    wt_shell_close(); exit;
}
case 'media': {
    $files = array();
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(WT_UPLOADS, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $f) if ($f->isFile()) {
        $rel = str_replace('\\', '/', substr($f->getPathname(), strlen(WT_UPLOADS) + 1));
        $files[] = array('rel' => $rel, 'size' => $f->getSize());
    }
    wt_shell('media', 'Медиафайлы', 'Загрузка изображений и документов (до 20 МБ)');
    wt_form_open(array('action' => 'upload', 'enctype' => 1));
    echo '<div class="card row-inline"><input type="file" name="file" required style="flex:1;min-width:220px"><button class="btn" type="submit">Загрузить</button></div></form>';
    if (count($files) === 0) { echo '<div class="card">Загрузок пока нет.</div>'; wt_shell_close(); exit; }
    echo '<div class="media-grid">';
    foreach ($files as $f) {
        $url = wt_asset('wt-content/uploads/' . $f['rel']);
        $isImg = (bool)preg_match('/\.(jpg|jpeg|png|gif|webp|svg)$/i', $f['rel']);
        echo '<div class="media-item">' . ($isImg ? '<img src="' . esc_url($url) . '" alt="">' : '<div style="height:96px;display:grid;place-items:center;background:#eef2f3;color:#5c7379;font-size:22px">📄</div>') . '<div class="mi-b"><b>' . esc(basename($f['rel'])) . '</b>' . esc(round($f['size'] / 1024)) . ' КБ<br><a href="' . esc_url($url) . '" target="_blank">открыть</a> ';
        wt_form_open(array('action' => 'media-delete', 'rel' => $f['rel']));
        echo '<button class="btn red sm" type="submit" style="padding:1px 7px">удалить</button></form></div></div>';
    }
    echo '</div>';
    wt_shell_close(); exit;
}
case 'users': {
    $rows = wt_db()->query('SELECT * FROM ' . wt_t('users') . ' ORDER BY id')->fetchAll();
    wt_shell('users', 'Пользователи', 'Учётные записи консоли — у всех обязательна 2FA');
    echo '<div class="grid2"><div class="card" style="padding:0"><table><tr><th>Логин</th><th>Почта</th><th>Роль</th><th></th></tr>';
    foreach ($rows as $u) {
        echo '<tr><td><b>' . esc($u['user_login']) . '</b></td><td>' . esc($u['user_email']) . '</td><td><span class="badge b-teal">' . esc($u['user_role']) . '</span></td><td>';
        if ((int)$u['id'] !== (int)$user['id']) { wt_form_open(array('action' => 'user-delete', 'id' => $u['id'])); echo '<button class="btn red sm" type="submit" onclick="return confirm(\'Удалить пользователя?\')">Удалить</button></form>'; }
        echo '</td></tr>';
    }
    echo '</table></div>';
    wt_form_open(array('action' => 'user-add'));
    echo '<div class="card"><h2>Добавить пользователя</h2><label>Логин</label><input type="text" name="login" required>';
    echo '<label>Почта (на неё приходят коды 2FA)</label><input type="email" name="email" required>';
    echo '<label>Пароль</label><input type="password" name="pass" minlength="8" required>';
    echo '<label>Роль</label><select name="role"><option value="editor">Редактор</option><option value="author">Автор</option><option value="subscriber">Подписчик</option></select>';
    echo '<p style="margin:16px 0 0"><button class="btn" type="submit">Добавить</button></p></div></form></div>';
    wt_shell_close(); exit;
}
case 'settings': {
    $tab = isset($_GET['tab']) ? (string)$_GET['tab'] : 'general';
    wt_shell('settings', 'Настройки', 'Общие, комментарии, кеш, безопасность и страница входа');
    echo '<div class="tabs">';
    foreach (array('general' => 'Общие', 'comments' => 'Обсуждение', 'cache' => 'Кеш', 'security' => 'Безопасность', 'login' => 'Страница входа') as $k => $l) {
        echo '<a class="' . ($tab === $k ? 'on' : '') . '" href="' . esc_attr(wt_admin_url('&page=settings&tab=' . $k)) . '">' . $l . '</a>';
    }
    echo '</div>';
    if ($tab === 'general') {
        wt_form_open(array('action' => 'settings-save'));
        echo '<div class="card"><div class="grid2"><div><label>Название сайта</label><input type="text" name="site_title" value="' . esc_attr(wt_option('site_title', 'Wordtime')) . '"></div>';
        echo '<div><label>Краткое описание</label><input type="text" name="tagline" value="' . esc_attr(wt_option('tagline', '')) . '"></div></div>';
        echo '<label>Почта администратора</label><input type="email" name="admin_email" value="' . esc_attr(wt_option('admin_email', '')) . '">';
        echo '<label>Рубрики (через запятую)</label><input type="text" name="categories" value="' . esc_attr(implode(', ', wt_categories())) . '">';
        echo '<p style="margin:16px 0 0"><button class="btn" type="submit">Сохранить</button></p></div></form>';
        echo '<div class="card"><h2>О системе</h2><p>Wordtime ' . WT_VERSION . ' · PHP ' . PHP_VERSION . ' · <code>' . wt_t('posts') . '</code> и другие таблицы с префиксом <code>' . esc(wt_prefix()) . '</code><br>Язык интерфейса — только русский.</p></div>';
    } elseif ($tab === 'comments') {
        wt_form_open(array('action' => 'settings-comments'));
        $off = (bool)wt_option('comments_disabled', false);
        echo '<div class="card"><label class="row-inline" style="margin:0"><input type="checkbox" name="comments_disabled" style="width:auto" ' . ($off ? 'checked' : '') . '> <b style="font-size:14.5px">Отключение комментариев на всём сайте</b></label>';
        echo '<p style="color:var(--mut);font-size:13px;margin:8px 0 0">Форма комментирования скрывается, новые комментарии не принимаются. Очередь модерации сохраняется.</p>';
        echo '<label class="row-inline" style="margin-top:16px"><input type="checkbox" name="moderate_first" style="width:auto" ' . (wt_option('moderate_first', true) ? 'checked' : '') . '> Отправлять новые комментарии на модерацию</label>';
        echo '<label>Закрывать комментарии через (дней)</label><input type="number" name="close_after_days" min="1" max="365" value="' . (int)wt_option('close_after_days', 30) . '" style="max-width:120px">';
        echo '<p style="margin:16px 0 0"><button class="btn" type="submit">Сохранить</button></p></div></form>';
    } elseif ($tab === 'cache') {
        $size = wt_cache_size();
        wt_form_open(array('action' => 'cache-toggle'));
        echo '<div class="card"><label class="row-inline" style="margin:0"><input type="checkbox" name="cache_enabled" style="width:auto" ' . (wt_option('cache_enabled', true) ? 'checked' : '') . ' onchange="this.form.submit()"> <b style="font-size:14.5px">Страничный кеш</b></label>';
        echo '<p style="color:var(--mut);font-size:13px;margin:8px 0 0">Сейчас в кеше: <b>' . esc(round($size / 1024, 1)) . ' КБ</b> (' . count((array)glob(WT_CACHE_DIR . '/*.cache')) . ' файлов)</p></form>';
        wt_form_open(array('action' => 'cache-clear'));
        echo '<p style="margin:16px 0 0"><button class="btn amber" type="submit">Очистить кеш сайта</button></p></form></div>';
    } elseif ($tab === 'security') {
        echo '<div class="card"><h2>Двухфакторная аутентификация <span class="badge b-ok">ВКЛЮЧЕНА · ОБЯЗАТЕЛЬНА</span></h2>';
        echo '<p style="color:var(--mut);font-size:13px">Второй фактор встроен в ядро и не отключается: после пароля на почту приходит шести-значный код (5 минут, 5 попыток).<br>';
        if (defined('WT_SMTP_HOST') && WT_SMTP_HOST !== '') echo 'Доставка кодов: SMTP <code>' . esc(WT_SMTP_HOST) . '</code>.';
        else echo 'SMTP не настроен — коды сохраняются в защищённый файл <code>wt-data/2fa-log.txt</code>.';
        echo '</p></div>';
        wt_form_open(array('action' => 'smtp-save'));
        echo '<div class="card"><h2>SMTP для отправки кодов и писем</h2><div class="grid2"><div><label>Сервер</label><input type="text" name="smtp_host" value="' . esc_attr(defined('WT_SMTP_HOST') ? WT_SMTP_HOST : '') . '" placeholder="smtp.хостер.ru"></div>';
        echo '<div><label>Порт</label><input type="number" name="smtp_port" value="' . (defined('WT_SMTP_PORT') ? (int)WT_SMTP_PORT : 587) . '"></div></div>';
        echo '<div class="grid2"><div><label>Логин</label><input type="text" name="smtp_user" value="' . esc_attr(defined('WT_SMTP_USER') ? WT_SMTP_USER : '') . '"></div>';
        echo '<div><label>Пароль</label><input type="password" name="smtp_pass" value="' . esc_attr(defined('WT_SMTP_PASS') ? WT_SMTP_PASS : '') . '"></div></div>';
        echo '<label>Отправитель (From)</label><input type="text" name="smtp_from" value="' . esc_attr(defined('WT_MAIL_FROM') ? WT_MAIL_FROM : '') . '" placeholder="Wordtime <no-reply@домен.ru>">';
        echo '<p style="margin:16px 0 0" class="row-inline"><button class="btn" type="submit">Сохранить SMTP</button></p></form>';
        wt_form_open(array('action' => 'smtp-test')); echo '<button class="btn ghost" type="submit" style="margin-top:-6px">Отправить тестовое письмо</button></form></div>';
        $attempts = wt_db()->query('SELECT COUNT(*) FROM ' . wt_t('login_attempts'))->fetchColumn();
        wt_form_open(array('action' => 'attempts-clear'));
        echo '<div class="card"><h2>Защита от подбора паролей</h2><p style="color:var(--mut);font-size:13px">5 неудачных попыток → блокировка на 60 секунд (по IP и почте). Активных счётчиков: <b>' . (int)$attempts . '</b></p>';
        echo '<button class="btn ghost" type="submit">Сбросить счётчики</button></form>';
        echo '<h2 style="margin:20px 0 8px">Журнал безопасности</h2><pre style="background:var(--deep);color:#9fd8cf;padding:14px;border-radius:10px;font-size:12px;max-height:220px;overflow:auto">';
        $log = is_file(WT_DATA . '/activity.log') ? array_slice(file(WT_DATA . '/activity.log'), -14) : array();
        foreach (array_reverse($log) as $l) echo esc(trim($l)) . "\n";
        echo '</pre></div>';
    } else {
        wt_form_open(array('action' => 'login-style'));
        echo '<div class="card"><h2>Кастомизация страницы входа</h2><div class="grid2"><div><label>Название</label><input type="text" name="logo" value="' . esc_attr(wt_option('login_logo', 'Wordtime')) . '"></div>';
        echo '<div><label>Акцентный цвет</label><input type="color" name="accent" value="' . esc_attr(wt_option('login_accent', '#14b8a6')) . '"></div></div>';
        echo '<label>Сообщение под логотипом</label><input type="text" name="message" value="' . esc_attr(wt_option('login_message', 'Вход защищён двухфакторной аутентификацией')) . '">';
        echo '<label>Подпись внизу</label><input type="text" name="side" value="' . esc_attr(wt_option('login_side', 'Быстро. Безопасно. По-русски.')) . '">';
        echo '<p style="margin:16px 0 0"><button class="btn" type="submit">Сохранить оформление</button> <a class="btn ghost" href="' . esc_attr(wt_admin_url('&action=logout')) . '">Выйти и посмотреть</a></p></div></form>';
    }
    wt_shell_close(); exit;
}
case 'backups': {
    $files = array();
    foreach ((array)glob(WT_DATA . '/backups/*') as $f) $files[] = array('name' => basename($f), 'size' => filesize($f), 'time' => filemtime($f));
    usort($files, function ($a, $b) { return $b['time'] - $a['time']; });
    wt_shell('backups', 'Резервные копии', 'Полный архив сайта или дамп базы — скачивание и восстановление');
    echo '<div class="grid2">';
    wt_form_open(array('action' => 'backup-zip'));
    echo '<div class="card"><h2>Полная копия сайта</h2><p style="color:var(--mut);font-size:13px">Все файлы CMS, темы, загрузки и дамп базы — одним ZIP-архивом.</p><button class="btn amber" type="submit">Создать ZIP-копию</button></div></form>';
    wt_form_open(array('action' => 'backup-sql'));
    echo '<div class="card"><h2>Дамп базы данных</h2><p style="color:var(--mut);font-size:13px">SQL-файл со всеми таблицами — для переноса и восстановления.</p><button class="btn" type="submit">Создать дамп .sql</button></div></form>';
    echo '</div>';
    echo '<div class="card" style="padding:0"><h2 style="padding:18px 22px 0">Сохранённые копии</h2>';
    if (count($files) === 0) echo '<p style="padding:12px 22px 20px;color:var(--mut)">Копий пока нет.</p>';
    else {
        echo '<table style="margin-top:12px"><tr><th>Файл</th><th>Размер</th><th>Дата</th><th></th></tr>';
        foreach ($files as $f) {
            echo '<tr><td><b>' . esc($f['name']) . '</b></td><td>' . esc(round($f['size'] / 1024)) . ' КБ</td><td>' . esc(date('d.m.Y H:i', $f['time'])) . '</td><td class="row-inline">';
            echo '<a class="btn ghost sm" href="' . esc_attr(wt_admin_url('&dl=' . urlencode($f['name']) . '&wt_nonce=' . wt_nonce('dl'))) . '">Скачать</a>';
            wt_form_open(array('action' => 'backup-delete', 'file' => $f['name'])); echo '<button class="btn red sm" type="submit">Удалить</button></form>';
            echo '</td></tr>';
        }
        echo '</table>';
    }
    echo '</div>';
    wt_form_open(array('action' => 'backup-restore', 'enctype' => 1));
    echo '<div class="card"><h2>Восстановление базы из .sql</h2><p style="color:var(--mut);font-size:13px">Текущие данные будут заменены содержимым файла. Рекомендуется сначала сделать свежую копию.</p>';
    echo '<input type="file" name="sql" accept=".sql" required><label class="row-inline" style="margin-top:12px"><input type="checkbox" name="confirm" style="width:auto" required> Подтверждаю восстановление</label>';
    echo '<p style="margin:14px 0 0"><button class="btn red" type="submit">Восстановить</button></p></div></form>';
    wt_shell_close(); exit;
}
case 'api': {
    $rows = wt_db()->query('SELECT * FROM ' . wt_t('api_keys') . ' ORDER BY id DESC')->fetchAll();
    wt_shell('api', 'API и мобильные приложения', 'REST API /wt/v1/ для нативных приложений — авторизация ключом X-WT-Key');
    echo '<div class="grid2">';
    wt_form_open(array('action' => 'key-create'));
    echo '<div class="card"><h2>Создать ключ</h2><label>Название (приложение)</label><input type="text" name="name" placeholder="Моё приложение Android" required>';
    echo '<label>Права</label><select name="scopes"><option value="read">Только чтение</option><option value="read,comments">Чтение + комментарии</option><option value="admin">Полный доступ</option></select>';
    echo '<p style="margin:16px 0 0"><button class="btn" type="submit">Создать ключ</button></p></div></form>';
    echo '<div class="card"><h2>Методы API</h2><p style="font-size:13px;color:var(--mut);line-height:1.9"><code>GET /wt/v1/posts</code> — список записей<br><code>GET /wt/v1/pages</code> — страницы<br><code>GET /wt/v1/info</code> — информация о сайте<br><code>POST /wt/v1/comments</code> — новый комментарий<br><code>POST /wt/v1/cache</code> — очистить кеш</p>';
    echo '<p style="font-size:13px;color:var(--mut)">Лимит: 120 запросов в минуту на ключ. Без ключа доступны только GET-методы.</p></div>';
    echo '</div>';
    echo '<div class="card" style="padding:0"><h2 style="padding:18px 22px 0">Выданные ключи</h2>';
    if (count($rows) === 0) echo '<p style="padding:12px 22px 20px;color:var(--mut)">Ключей нет — создайте первый.</p>';
    else {
        echo '<table style="margin-top:12px"><tr><th>Название</th><th>Права</th><th>Создан</th><th></th></tr>';
        foreach ($rows as $k) {
            echo '<tr><td><b>' . esc($k['name']) . '</b><br><span style="color:var(--mut);font-size:12px">хэш ' . esc(substr($k['key_hash'], 0, 10)) . '…</span></td>';
            echo '<td><span class="badge b-teal">' . esc($k['scopes']) . '</span></td><td>' . esc(date('d.m.Y', strtotime($k['created']))) . '</td><td>';
            wt_form_open(array('action' => 'key-delete', 'id' => $k['id'])); echo '<button class="btn red sm" type="submit">Отозвать</button></form></td></tr>';
        }
        echo '</table>';
    }
    echo '</div>';
    wt_shell_close(); exit;
}
default: {
    $posts = $cnt('SELECT COUNT(*) FROM ' . wt_t('posts'));
    $pages = $cnt('SELECT COUNT(*) FROM ' . wt_t('pages'));
    $pend = $cnt("SELECT COUNT(*) FROM " . wt_t('comments') . " WHERE status = 'pending'");
    $users = $cnt('SELECT COUNT(*) FROM ' . wt_t('users'));
    wt_shell('dashboard', 'Здравствуйте, ' . $user['user_login'] . '!', 'Wordtime ' . WT_VERSION . ' · сайт работает');
    echo '<div class="grid3" style="grid-template-columns:repeat(4,1fr);margin-bottom:18px">';
    echo '<div class="stat"><b>' . $posts . '</b><span>записей</span></div><div class="stat"><b>' . $pages . '</b><span>страниц</span></div>';
    echo '<div class="stat"><b>' . $pend . '</b><span>ждут модерации</span></div><div class="stat"><b>' . $users . '</b><span>пользователей</span></div></div>';
    echo '<div class="grid2">';
    wt_form_open(array('action' => 'quick-draft'));
    echo '<div class="card"><h2>Быстрый черновик</h2><label>Заголовок</label><input type="text" name="title" placeholder="О чём расскажем?">';
    echo '<label>Текст</label><textarea name="content" style="min-height:110px"></textarea>';
    echo '<p style="margin:14px 0 0"><button class="btn" type="submit">Сохранить черновик</button></p></div></form>';
    echo '<div class="card"><h2>Активность</h2><pre style="background:var(--deep);color:#9fd8cf;padding:14px;border-radius:10px;font-size:12px;max-height:250px;overflow:auto;margin:0">';
    $log = is_file(WT_DATA . '/activity.log') ? array_slice(file(WT_DATA . '/activity.log'), -12) : array('Журнал пуст — действий пока не было.');
    foreach (array_reverse($log) as $l) echo esc(trim($l)) . "\n";
    echo '</pre></div></div>';
    echo '<div class="card"><h2>Состояние системы</h2><div class="grid3">';
    echo '<div><b style="font-size:13px">PHP</b><br><span style="color:var(--mut);font-size:13px">' . PHP_VERSION . ' · ' . (PHP_VERSION_ID >= 80000 ? 'FPM' : 'CGI') . '</span></div>';
    echo '<div><b style="font-size:13px">База данных</b><br><span style="color:var(--mut);font-size:13px">' . esc(DB_NAME) . ' · подключена</span></div>';
    echo '<div><b style="font-size:13px">Кеш</b><br><span style="color:var(--mut);font-size:13px">' . esc(round(wt_cache_size() / 1024, 1)) . ' КБ · ' . (wt_option('cache_enabled', true) ? 'включён' : 'отключён') . '</span></div>';
    echo '<div><b style="font-size:13px">Свободно на диске</b><br><span style="color:var(--mut);font-size:13px">' . esc(round(@disk_free_space(WT_ROOT) / 1048576)) . ' МБ</span></div>';
    echo '<div><b style="font-size:13px">SMTP</b><br><span style="color:var(--mut);font-size:13px">' . (defined('WT_SMTP_HOST') && WT_SMTP_HOST !== '' ? esc(WT_SMTP_HOST) : 'не настроен — коды в файле') . '</span></div>';
    echo '<div><b style="font-size:13px">2FA</b><br><span style="color:var(--mut);font-size:13px">обязательна для всех</span></div>';
    echo '</div></div>';
    wt_shell_close(); exit;
}
}
