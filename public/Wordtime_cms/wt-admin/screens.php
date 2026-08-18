<?php
/**
 * Wordtime CMS 1.0.5 — разделы консоли
 * Подключается из wt-admin/index.php после авторизации.
 */
if (!defined('WT_ROOT')) exit;

function wt_media_files() {
    $out = array();
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(WT_UPLOADS, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $f) {
        if (!$f->isFile()) continue;
        $rel = str_replace('\\', '/', substr($f->getPathname(), strlen(WT_UPLOADS) + 1));
        if (basename($rel) === 'index.html') continue;
        $out[] = array('rel' => $rel, 'size' => $f->getSize(), 'time' => $f->getMTime());
    }
    usort($out, function ($a, $b) { return $b['time'] - $a['time']; });
    return $out;
}
function wt_fmt_kb($b) { return $b < 1024 ? $b . ' Б' : ($b < 1048576 ? round($b / 1024) . ' КБ' : number_format($b / 1048576, 1, ',', ' ') . ' МБ'); }

/* ── Консоль (главная) ── */
function wt_screen_dashboard() {
    global $user;
    $db = wt_db();
    $st = array(
        'posts' => (int)$db->query('SELECT COUNT(*) FROM ' . wt_t('posts'))->fetchColumn(),
        'pages' => (int)$db->query('SELECT COUNT(*) FROM ' . wt_t('pages'))->fetchColumn(),
        'comments' => (int)$db->query('SELECT COUNT(*) FROM ' . wt_t('comments') . ' WHERE status = "approved"')->fetchColumn(),
        'pending' => (int)$db->query('SELECT COUNT(*) FROM ' . wt_t('comments') . ' WHERE status = "pending"')->fetchColumn(),
        'users' => (int)$db->query('SELECT COUNT(*) FROM ' . wt_t('users'))->fetchColumn(),
        'media' => count(wt_media_files()),
    );
    wt_shell('', 'Консоль', 'Сводка сайта «' . wt_option('site_title', 'Wordtime') . '» — всё важное на одном экране');

    echo '<div class="hello"><h2>С днём работы, ' . esc($user['user_login']) . '!</h2>';
    echo '<p>Wordtime ' . WT_VERSION . ' работает на PHP ' . PHP_VERSION . '. Записи, страницы, комментарии, резервные копии и REST API для мобильных приложений — под рукой.</p>';
    echo '<div class="acts">';
    echo '<a class="btn amber" href="' . esc_attr(wt_admin_url('&page=posts&new=1')) . '">' . wt_icon('plus', 15) . 'Написать запись</a>';
    echo '<a class="btn dark" href="' . esc_attr(wt_admin_url('&page=backups')) . '">' . wt_icon('cloud', 15) . 'Резервная копия</a>';
    echo '<a class="btn dark" href="' . esc_attr(wt_admin_url('&page=api')) . '">' . wt_icon('key', 15) . 'API-ключ</a>';
    echo '</div></div>';

    echo '<div class="stats">';
    $cells = array(
        array('pin', 'posts', '#e2f5f2', '#0b7a6e', 'Записей'),
        array('pages', 'pages', '#eef2f3', '#33525b', 'Страниц'),
        array('comment', 'comments', '#e5f5ec', '#137a43', 'Комментариев'),
        array('alert', 'pending', '#fdf1d7', '#92610a', 'Ждут модерации'),
        array('users', 'users', '#e2f5f2', '#0b7a6e', 'Пользователей'),
        array('image', 'media', '#eef2f3', '#33525b', 'Медиафайлов'),
    );
    foreach ($cells as $i => $c) {
        echo '<div class="stat" style="animation-delay:' . ($i * 55) . 'ms"><span class="ic" style="background:' . $c[2] . ';color:' . $c[3] . '">' . wt_icon($c[0], 17) . '</span>';
        echo '<b data-n="' . $st[$c[1]] . '">0</b><span>' . $c[4] . '</span></div>';
    }
    echo '</div>';

    echo '<div style="display:grid;grid-template-columns:1.25fr 1fr;gap:18px">';
    echo '<div><div class="card np"><div class="hd"><h2>Последние записи</h2><span class="sp"></span><a class="btn ghost sm" href="' . esc_attr(wt_admin_url('&page=posts')) . '">Все</a></div>';
    echo '<table><tbody>';
    $rows = $db->query('SELECT * FROM ' . wt_t('posts') . ' ORDER BY post_date DESC LIMIT 5')->fetchAll();
    if (count($rows) === 0) echo '<tr><td class="empty">' . wt_icon('pin', 26) . '<br>Записей пока нет</td></tr>';
    foreach ($rows as $r) {
        echo '<tr><td><b>' . esc($r['post_title']) . '</b><br><span style="color:var(--mut);font-size:12px">' . esc(wt_excerpt($r['post_content'], 12)) . '</span></td>';
        echo '<td style="white-space:nowrap">' . ($r['post_status'] === 'published' ? '<span class="badge b-ok">Опубликовано</span>' : '<span class="badge b-mut">Черновик</span>') . '</td>';
        echo '<td style="white-space:nowrap;color:var(--mut);font-size:12.5px">' . esc(date('d.m.Y', strtotime($r['post_date']))) . '</td>';
        echo '<td class="row-inline"><a class="btn ghost sm" href="' . esc_attr(wt_admin_url('&page=posts&edit=' . $r['id'])) . '">Изменить</a></td></tr>';
    }
    echo '</tbody></table></div>';

    echo '<div class="card np"><div class="hd"><h2>Последние комментарии</h2><span class="sp"></span><a class="btn ghost sm" href="' . esc_attr(wt_admin_url('&page=comments')) . '">Все</a></div><div style="padding:6px 22px 16px">';
    $cm = $db->query('SELECT * FROM ' . wt_t('comments') . ' ORDER BY created DESC LIMIT 4')->fetchAll();
    if (count($cm) === 0) echo '<div class="empty">' . wt_icon('comment', 26) . '<br>Комментариев нет</div>';
    foreach ($cm as $c) {
        echo '<div style="display:flex;gap:11px;padding:11px 0;border-bottom:1px dashed #e2eaea">';
        echo '<span style="width:32px;height:32px;flex:none;border-radius:9px;background:linear-gradient(150deg,var(--teal),#0b6e63);color:#fff;display:grid;place-items:center;font:800 12px var(--disp)">' . esc(mb_strtoupper(mb_substr($c['author'], 0, 1))) . '</span>';
        echo '<div style="min-width:0"><b style="font-size:13px">' . esc($c['author']) . '</b> <span class="badge ' . ($c['status'] === 'approved' ? 'b-ok' : ($c['status'] === 'pending' ? 'b-amber' : 'b-red')) . '">' . ($c['status'] === 'approved' ? 'Одобрен' : ($c['status'] === 'pending' ? 'Ожидает' : 'Спам')) . '</span>';
        echo '<p style="margin:4px 0 0;font-size:12.8px;color:#41606a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' . esc($c['text']) . '</p></div></div>';
    }
    echo '</div></div></div>';

    echo '<div><div class="card"><h2>Быстрый черновик</h2>';
    wt_form_open(array('action' => 'quick-draft'));
    echo '<label>Заголовок</label><input type="text" name="title" placeholder="О чём напишем?">';
    echo '<label>Текст</label><textarea name="content" rows="4" placeholder="Набросок — сохранится как черновик"></textarea>';
    echo '<p style="margin:14px 0 0"><button class="btn" type="submit">' . wt_icon('check', 15) . 'Сохранить черновик</button></p></form></div>';

    echo '<div class="card np"><div class="hd"><h2>Журнал активности</h2></div><div style="padding:14px 18px"><div class="logbox">';
    $log = WT_DATA . '/activity.log';
    if (is_file($log)) {
        $lines = array_slice(array_filter(array_map('trim', file($log))), -7);
        foreach (array_reverse($lines) as $l) {
            if (preg_match('/^\[(.+?)\] (.*)$/', $l, $m)) echo '<i>' . esc($m[1]) . '</i> ' . esc($m[2]) . '<br>';
            else echo esc($l) . '<br>';
        }
    } else echo '<i>Журнал пуст — действия появятся здесь.</i>';
    echo '</div></div></div>';

    echo '<div class="card"><h2>Состояние</h2>';
    echo '<div class="kv"><b>Версия ядра</b><span>Wordtime ' . WT_VERSION . '</span></div>';
    echo '<div class="kv"><b>PHP</b><span>' . PHP_VERSION . ' ' . (PHP_VERSION_ID >= 80000 ? '<span class="badge b-ok">отлично</span>' : '<span class="badge b-amber">работает</span>') . '</span></div>';
    echo '<div class="kv"><b>Кеш</b><span>' . (wt_option('cache_enabled', true) ? '<span class="badge b-ok">включён</span>' : '<span class="badge b-mut">отключён</span>') . ' · ' . wt_fmt_kb(wt_cache_size()) . '</span></div>';
    echo '<div class="kv"><b>Комментарии на сайте</b><span>' . (wt_option('comments_disabled', false) ? '<span class="badge b-amber">отключены</span>' : '<span class="badge b-ok">включены</span>') . '</span></div>';
    echo '</div></div></div>';

    wt_shell_close(); exit;
}

/* ── Записи ── */
function wt_screen_posts() {
    global $user;
    if (isset($_GET['edit']) || isset($_GET['new'])) {
        $id = isset($_GET['edit']) ? (int)$_GET['edit'] : 0;
        $row = $id > 0 ? wt_db()->query('SELECT * FROM ' . wt_t('posts') . ' WHERE id = ' . $id)->fetch() : null;
        if ($id > 0 && !$row) { header('Location: ' . wt_admin_url('&page=posts')); exit; }
        if (!$row) $row = array('id' => 0, 'post_title' => '', 'slug' => '', 'post_content' => '', 'category' => wt_categories()[0], 'tags' => '', 'post_status' => 'published', 'post_image' => '');
        wt_shell('posts', $id > 0 ? 'Редактор записи' : 'Новая запись', $id > 0 ? 'Изменения вступят в силу сразу после сохранения' : 'Заполните заголовок и текст — остальное сделаем сами');
        wt_form_open(array('action' => 'post-save', 'id' => $row['id']));
        echo '<div style="display:grid;grid-template-columns:1fr 320px;gap:18px;align-items:start">';
        echo '<div class="card"><label>Заголовок</label><input type="text" name="title" value="' . esc_attr($row['post_title']) . '" required placeholder="Заголовок записи" style="font-size:17px;font-weight:700">';
        echo '<label>Текст записи</label><textarea name="content" rows="14" placeholder="Абзацы разделяйте пустой строкой. Разрешены ссылки, списки, цитаты.">' . esc($row['post_content']) . '</textarea></div>';
        echo '<div>';
        echo '<div class="card"><h2>Публикация</h2><label>Статус</label><select name="status">';
        foreach (array('published' => 'Опубликовано', 'draft' => 'Черновик') as $k => $l) echo '<option value="' . $k . '" ' . ($row['post_status'] === $k ? 'selected' : '') . '>' . $l . '</option>';
        echo '</select><p style="margin:16px 0 0;display:flex;gap:9px"><button class="btn" type="submit">' . wt_icon('check', 15) . 'Сохранить</button><a class="btn ghost" href="' . esc_attr(wt_admin_url('&page=posts')) . '">Отмена</a></p></div>';
        echo '<div class="card"><h2>Рубрика и теги</h2><label>Рубрика</label><select name="category">';
        foreach (wt_categories() as $c) echo '<option ' . ($row['category'] === $c ? 'selected' : '') . '>' . esc($c) . '</option>';
        echo '</select><label>Теги (через запятую)</label><input type="text" name="tags" value="' . esc_attr($row['tags']) . '" placeholder="кеш, 2fa, релиз"></div>';
        echo '<div class="card"><h2>Ссылка и обложка</h2><label>Ярлык (slug)</label><input type="text" name="slug" value="' . esc_attr($row['slug']) . '" placeholder="пусто — создадим из заголовка">';
        echo '<label>URL обложки</label><input type="url" name="image" value="' . esc_attr($row['post_image']) . '" placeholder="из медиафайлов или внешний">';
        if ($row['post_image'] !== '') echo '<p style="margin:10px 0 0"><img src="' . esc_url($row['post_image']) . '" alt="" style="width:100%;border-radius:10px;border:1px solid var(--line)"></p>';
        echo '</div></div></div></form>';
        wt_shell_close(); exit;
    }
    $rows = wt_db()->query('SELECT * FROM ' . wt_t('posts') . ' ORDER BY post_date DESC')->fetchAll();
    wt_shell('posts', 'Записи', 'Всего: ' . count($rows) . ' — публикация, черновики, редактирование');
    echo '<p><a class="btn" href="' . esc_attr(wt_admin_url('&page=posts&new=1')) . '">' . wt_icon('plus', 15) . 'Добавить запись</a></p>';
    echo '<div class="card np"><table><tr><th>Заголовок</th><th>Рубрика</th><th>Статус</th><th>Дата</th><th></th></tr>';
    if (count($rows) === 0) echo '<tr><td colspan="5" class="empty">' . wt_icon('pin', 28) . '<br>Записей нет — создайте первую</td></tr>';
    foreach ($rows as $r) {
        echo '<tr><td><b>' . esc($r['post_title']) . '</b><br><span style="color:var(--mut);font-size:12px">' . esc(wt_excerpt($r['post_content'], 14)) . '</span></td>';
        echo '<td><span class="badge b-teal">' . esc($r['category']) . '</span></td>';
        echo '<td>' . ($r['post_status'] === 'published' ? '<span class="badge b-ok">Опубликовано</span>' : '<span class="badge b-mut">Черновик</span>') . '</td>';
        echo '<td style="white-space:nowrap;color:var(--mut)">' . esc(date('d.m.Y', strtotime($r['post_date']))) . '</td>';
        echo '<td class="row-inline"><a class="btn ghost sm" href="' . esc_attr(wt_admin_url('&page=posts&edit=' . $r['id'])) . '">Изменить</a>';
        wt_form_open(array('action' => 'post-delete', 'id' => $r['id']));
        echo '<button class="btn red sm" type="submit" onclick="return confirm(\'Удалить запись?\')">' . wt_icon('trash', 13) . '</button></form></td></tr>';
    }
    echo '</table></div>';
    wt_shell_close(); exit;
}

/* ── Страницы ── */
function wt_screen_pages() {
    if (isset($_GET['edit']) || isset($_GET['new'])) {
        $id = isset($_GET['edit']) ? (int)$_GET['edit'] : 0;
        $row = $id > 0 ? wt_db()->query('SELECT * FROM ' . wt_t('pages') . ' WHERE id = ' . $id)->fetch() : null;
        if ($id > 0 && !$row) { header('Location: ' . wt_admin_url('&page=pages')); exit; }
        if (!$row) $row = array('id' => 0, 'title' => '', 'slug' => '', 'content' => '', 'status' => 'published');
        wt_shell('pages', $id > 0 ? 'Редактор страницы' : 'Новая страница', 'Страницы — статичные разделы сайта: «О сайте», «Контакты» и т.п.');
        wt_form_open(array('action' => 'page-save', 'id' => $row['id']));
        echo '<div class="card"><label>Название</label><input type="text" name="title" value="' . esc_attr($row['title']) . '" required style="font-size:17px;font-weight:700">';
        echo '<label>Содержимое</label><textarea name="content" rows="12">' . esc($row['content']) . '</textarea>';
        echo '<div class="grid2"><div><label>Ярлык ссылки</label><input type="text" name="slug" value="' . esc_attr($row['slug']) . '" placeholder="пусто — создадим сами"></div>';
        echo '<div><label>Статус</label><select name="status"><option value="published" ' . ($row['status'] === 'published' ? 'selected' : '') . '>Опубликовано</option><option value="draft" ' . ($row['status'] === 'draft' ? 'selected' : '') . '>Черновик</option></select></div></div>';
        echo '<p style="margin:18px 0 0"><button class="btn" type="submit">' . wt_icon('check', 15) . 'Сохранить</button> <a class="btn ghost" href="' . esc_attr(wt_admin_url('&page=pages')) . '">Отмена</a></p></div></form>';
        wt_shell_close(); exit;
    }
    $rows = wt_pages_list();
    wt_shell('pages', 'Страницы', 'Всего: ' . count($rows) . ' — статичные разделы сайта');
    echo '<p><a class="btn" href="' . esc_attr(wt_admin_url('&page=pages&new=1')) . '">' . wt_icon('plus', 15) . 'Добавить страницу</a></p>';
    echo '<div class="card np"><table><tr><th>Название</th><th>Ссылка</th><th>Статус</th><th></th></tr>';
    if (count($rows) === 0) echo '<tr><td colspan="4" class="empty">' . wt_icon('pages', 28) . '<br>Страниц нет</td></tr>';
    foreach ($rows as $r) {
        echo '<tr><td><b>' . esc($r['title']) . '</b></td><td><code>?p=page:' . esc($r['slug']) . '</code></td>';
        echo '<td>' . ($r['status'] === 'published' ? '<span class="badge b-ok">Опубликовано</span>' : '<span class="badge b-mut">Черновик</span>') . '</td>';
        echo '<td class="row-inline"><a class="btn ghost sm" href="' . esc_attr(wt_admin_url('&page=pages&edit=' . $r['id'])) . '">Изменить</a>';
        wt_form_open(array('action' => 'page-delete', 'id' => $r['id']));
        echo '<button class="btn red sm" type="submit" onclick="return confirm(\'Удалить страницу?\')">' . wt_icon('trash', 13) . '</button></form></td></tr>';
    }
    echo '</table></div>';
    wt_shell_close(); exit;
}

/* ── Комментарии ── */
function wt_screen_comments() {
    global $tab;
    if ($tab === '') $tab = 'all';
    $where = $tab === 'all' ? '' : ' WHERE status = "' . preg_replace('/[^a-z]/', '', $tab) . '"';
    $rows = wt_db()->query('SELECT * FROM ' . wt_t('comments') . $where . ' ORDER BY created DESC')->fetchAll();
    $cnt = function ($s) { return (int)wt_db()->query('SELECT COUNT(*) FROM ' . wt_t('comments') . ($s === 'all' ? '' : ' WHERE status = "' . $s . '"'))->fetchColumn(); };
    wt_shell('comments', 'Комментарии', 'Модерация: одобрение, спам, удаление');
    echo '<div class="tabs">';
    foreach (array('all' => 'Все · ' . $cnt('all'), 'pending' => 'Ожидают · ' . $cnt('pending'), 'approved' => 'Одобренные · ' . $cnt('approved'), 'spam' => 'Спам · ' . $cnt('spam')) as $k => $l) {
        echo '<a class="' . ($tab === $k ? 'on' : '') . '" href="' . esc_attr(wt_admin_url('&page=comments&tab=' . $k)) . '">' . $l . '</a>';
    }
    echo '</div>';
    if (wt_option('comments_disabled', false)) echo '<div class="alert warn">' . wt_icon('alert', 17) . '<span>Комментарии на сайте <b>отключены</b> в настройках — новые не принимаются.</span></div>';
    if (count($rows) === 0) { echo '<div class="card empty">' . wt_icon('comment', 28) . '<br>Комментариев нет.</div>'; wt_shell_close(); exit; }
    echo '<div class="card np"><table><tr><th>Автор</th><th>Комментарий</th><th>К записи</th><th>Статус</th><th></th></tr>';
    foreach ($rows as $c) {
        $post = wt_db()->query('SELECT post_title FROM ' . wt_t('posts') . ' WHERE id = ' . (int)$c['post_id'])->fetchColumn();
        echo '<tr><td><b>' . esc($c['author']) . '</b><br><span style="color:var(--mut);font-size:12px">' . esc(date('d.m.Y H:i', strtotime($c['created']))) . '</span></td>';
        echo '<td style="max-width:340px"><span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' . esc($c['text']) . '</span></td>';
        echo '<td style="color:var(--mut)">' . esc($post !== false ? $post : '—') . '</td>';
        echo '<td>' . ($c['status'] === 'approved' ? '<span class="badge b-ok">Одобрен</span>' : ($c['status'] === 'pending' ? '<span class="badge b-amber">Ожидает</span>' : '<span class="badge b-red">Спам</span>')) . '</td>';
        echo '<td class="row-inline">';
        if ($c['status'] !== 'approved') { wt_form_open(array('action' => 'comment-set', 'id' => $c['id'], 'status' => 'approved')); echo '<button class="btn ghost sm" type="submit">' . wt_icon('check', 13) . 'Одобрить</button></form>'; }
        if ($c['status'] !== 'spam') { wt_form_open(array('action' => 'comment-set', 'id' => $c['id'], 'status' => 'spam')); echo '<button class="btn ghost sm" type="submit">В спам</button></form>'; }
        wt_form_open(array('action' => 'comment-delete', 'id' => $c['id']));
        echo '<button class="btn red sm" type="submit" onclick="return confirm(\'Удалить комментарий?\')">' . wt_icon('trash', 13) . '</button></form>';
        echo '</td></tr>';
    }
    echo '</table></div>';
    wt_shell_close(); exit;
}

/* ── Медиафайлы ── */
function wt_screen_media() {
    $files = wt_media_files();
    wt_shell('media', 'Медиафайлы', 'Загрузка, просмотр и удаление изображений и документов · ' . count($files) . ' файл(ов)');
    echo '<div class="card"><h2>Загрузить файл</h2><p style="color:var(--mut);font-size:13px;margin:4px 0 12px">JPG, PNG, GIF, WebP, SVG, PDF, MP4 · до 20 МБ. Ссылка на файл появится в сетке ниже.</p>';
    wt_form_open(array('action' => 'upload', 'enctype' => 1));
    echo '<div style="display:flex;gap:10px;flex-wrap:wrap"><input type="file" name="file" required style="flex:1;min-width:240px"><button class="btn amber" type="submit">' . wt_icon('dl', 15) . 'Загрузить</button></div></form></div>';
    if (count($files) === 0) { echo '<div class="card empty">' . wt_icon('image', 28) . '<br>Файлов пока нет — загрузите первый.</div>'; wt_shell_close(); exit; }
    echo '<div class="mgrid">';
    foreach ($files as $f) {
        $url = wt_asset('wt-content/uploads/' . $f['rel']);
        $isImg = (bool)preg_match('/\.(jpe?g|png|gif|webp)$/i', $f['rel']);
        echo '<div class="mcell"><div class="ph">' . ($isImg ? '<img src="' . esc_url($url) . '" alt="" loading="lazy">' : wt_icon('file', 26)) . '</div>';
        echo '<div class="in"><b title="' . esc_attr($f['rel']) . '">' . esc(basename($f['rel'])) . '</b><span>' . wt_fmt_kb($f['size']) . ' · ' . esc(date('d.m.Y', $f['time'])) . '</span>';
        echo '<div class="row-inline" style="margin-top:7px"><button class="icobtn" type="button" data-copy="' . esc_attr($url) . '" title="Скопировать ссылку">' . wt_icon('copy', 13) . '</button>';
        wt_form_open(array('action' => 'media-delete', 'rel' => $f['rel']));
        echo '<button class="icobtn" type="submit" title="Удалить" style="color:var(--red)" onclick="return confirm(\'Удалить файл?\')">' . wt_icon('trash', 13) . '</button></form>';
        echo '</div></div></div>';
    }
    echo '</div>';
    wt_shell_close(); exit;
}

/* ── Пользователи ── */
function wt_screen_users() {
    global $user;
    $rows = wt_db()->query('SELECT * FROM ' . wt_t('users') . ' ORDER BY id')->fetchAll();
    wt_shell('users', 'Пользователи', 'Учётные записи и роли — вход для всех только с кодом 2FA');
    echo '<div style="display:grid;grid-template-columns:1.3fr 1fr;gap:18px;align-items:start">';
    echo '<div class="card np"><table><tr><th>Пользователь</th><th>Роль</th><th>Создан</th><th></th></tr>';
    foreach ($rows as $u) {
        $self = (int)$u['id'] === (int)$user['id'];
        echo '<tr><td><span style="display:flex;align-items:center;gap:10px"><span style="width:32px;height:32px;flex:none;border-radius:9px;background:linear-gradient(150deg,var(--teal),#0b6e63);color:#fff;display:grid;place-items:center;font:800 12px var(--disp)">' . esc(mb_strtoupper(mb_substr($u['user_login'], 0, 1))) . '</span><span><b>' . esc($u['user_login']) . '</b>' . ($self ? ' <span class="badge b-teal">вы</span>' : '') . '<br><span style="color:var(--mut);font-size:12px">' . esc($u['user_email']) . '</span></span></span></td>';
        echo '<td><span class="badge ' . ($u['user_role'] === 'administrator' ? 'b-amber' : 'b-mut') . '">' . esc($u['user_role']) . '</span></td>';
        echo '<td style="color:var(--mut);white-space:nowrap">' . esc(date('d.m.Y', strtotime($u['created']))) . '</td>';
        echo '<td class="row-inline">';
        if (!$self && $u['user_role'] !== 'administrator') {
            wt_form_open(array('action' => 'user-role', 'id' => $u['id']));
            echo '<select name="role" onchange="this.form.submit()" style="width:auto;height:31px;padding:0 8px;font-size:12.5px">';
            foreach (array('administrator' => 'Администратор', 'editor' => 'Редактор', 'author' => 'Автор', 'subscriber' => 'Подписчик') as $k => $l) echo '<option value="' . $k . '" ' . ($u['user_role'] === $k ? 'selected' : '') . '>' . $l . '</option>';
            echo '</select></form>';
            wt_form_open(array('action' => 'user-delete', 'id' => $u['id']));
            echo '<button class="btn red sm" type="submit" onclick="return confirm(\'Удалить пользователя?\')">' . wt_icon('trash', 13) . '</button></form>';
        } else echo '<span style="color:var(--mut);font-size:12px">—</span>';
        echo '</td></tr>';
    }
    echo '</table></div>';
    echo '<div class="card"><h2>Добавить пользователя</h2>';
    wt_form_open(array('action' => 'user-add'));
    echo '<label>Логин</label><input type="text" name="login" required placeholder="maria">';
    echo '<label>Почта (для кодов 2FA)</label><input type="email" name="email" required placeholder="maria@site.ru">';
    echo '<label>Пароль (минимум 8 символов)</label><input type="password" name="pass" required minlength="8">';
    echo '<label>Роль</label><select name="role">';
    foreach (array('administrator' => 'Администратор', 'editor' => 'Редактор', 'author' => 'Автор', 'subscriber' => 'Подписчик') as $k => $l) echo '<option value="' . $k . '">' . $l . '</option>';
    echo '</select>';
    echo '<p style="margin:16px 0 0"><button class="btn" type="submit">' . wt_icon('plus', 15) . 'Создать</button></p></form></div>';
    echo '</div>';
    wt_shell_close(); exit;
}

/* ── Темы ── */
function wt_screen_themes() {
    $active = wt_option('active_theme', 'wordtime-twenty');
    $dirs = array_filter(glob(WT_ROOT . '/wt-content/themes/*'), 'is_dir');
    wt_shell('themes', 'Темы', 'Оформление сайта — активная тема применяется мгновенно');
    echo '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px">';
    foreach ($dirs as $d) {
        $name = basename($d);
        $label = $name;
        $css = $d . '/style.css';
        if (is_file($css) && preg_match('/Theme Name:\s*(.+)/i', (string)file_get_contents($css), $m)) $label = trim($m[1]);
        $isOn = $name === $active;
        echo '<div class="card" style="margin:0;position:relative;overflow:hidden;padding:0;border-color:' . ($isOn ? 'var(--teal)' : 'var(--line)') . '">';
        echo '<div style="height:110px;background:linear-gradient(140deg,#0d3039,#134450);display:grid;place-items:center;color:#5f97a1;position:relative">' . wt_icon('palette', 30);
        if ($isOn) echo '<span class="badge b-ok" style="position:absolute;top:10px;right:10px">' . wt_icon('check', 11) . 'Активна</span>';
        echo '</div>';
        echo '<div style="padding:15px 17px"><b style="font:700 14.5px var(--disp)">' . esc($label) . '</b>';
        echo '<p style="margin:5px 0 12px;color:var(--mut);font-size:12.5px">Каталог: <code>' . esc($name) . '</code></p>';
        if (!$isOn) { wt_form_open(array('action' => 'theme-activate', 'theme' => $name)); echo '<button class="btn ghost sm" type="submit">Активировать</button></form>'; }
        else echo '<span style="font-size:12.5px;color:var(--teal);font-weight:700">Используется сайтом сейчас</span>';
        echo '</div></div>';
    }
    echo '</div>';
    echo '<div class="card" style="margin-top:18px"><h2>Как добавить тему</h2><p style="color:var(--mut);font-size:13.5px;margin:6px 0 0;line-height:1.7">Скопируйте папку темы в <code>wt-content/themes/</code> — внутри должны быть <code>index.php</code>, <code>functions.php</code> и <code>style.css</code> с заголовком <code>Theme Name</code>. Тема подхватится автоматически и появится в этом списке. Хуки <code>wt_add_filter</code>/<code>wt_add_action</code> совместимы с плагинами WordPress-типа.</p></div>';
    wt_shell_close(); exit;
}

/* ── Плагины ── */
function wt_screen_plugins() {
    $active = wt_option('active_plugins', array()); if (!is_array($active)) $active = array();
    $files = array();
    foreach ((array)glob(WT_ROOT . '/wt-content/plugins/*.php') as $f) $files[] = basename($f);
    wt_shell('plugins', 'Плагины', 'Расширения ядра — подключаются через wt-content/plugins и хуки');
    echo '<div class="card np"><table><tr><th>Плагин</th><th>Статус</th><th></th></tr>';
    if (count($files) === 0) echo '<tr><td colspan="3" class="empty">' . wt_icon('plug', 28) . '<br>Плагинов пока нет. Загрузите .php-файл в <b>wt-content/plugins/</b> — он появится здесь.</td></tr>';
    foreach ($files as $f) {
        $on = in_array($f, $active, true);
        echo '<tr><td><span style="display:flex;align-items:center;gap:11px"><span style="width:34px;height:34px;flex:none;border-radius:10px;background:' . ($on ? '#e2f5f2' : '#eef2f3') . ';color:' . ($on ? '#0b7a6e' : '#5c7379') . ';display:grid;place-items:center">' . wt_icon('plug', 17) . '</span><span><b>' . esc($f) . '</b><br><span style="color:var(--mut);font-size:12px">Файл в каталоге плагинов</span></span></span></td>';
        echo '<td>' . ($on ? '<span class="badge b-ok">Активен</span>' : '<span class="badge b-mut">Отключён</span>') . '</td>';
        echo '<td class="row-inline">';
        wt_form_open(array('action' => 'plugin-toggle', 'file' => $f));
        echo '<button class="btn ' . ($on ? 'ghost' : 'amber') . ' sm" type="submit">' . ($on ? 'Отключить' : 'Активировать') . '</button></form></td></tr>';
    }
    echo '</table></div>';
    echo '<div class="card"><h2>Совместимость с WordPress</h2><p style="color:var(--mut);font-size:13.5px;margin:6px 0 0;line-height:1.7">Плагины используют единое API хуков: <code>wt_add_action(\'wt_head\', ...)</code>, <code>wt_add_filter(\'wt_title\', ...)</code>. Активные плагины подключаются на каждой странице сайта автоматически, доступные действия: <code>wt_head</code>, <code>wt_queue_*</code>, фильтры <code>wt_title</code>, <code>wt_description</code>, <code>wt_excerpt_length</code>.</p></div>';
    wt_shell_close(); exit;
}

/* ── Резервные копии ── */
function wt_screen_backups() {
    $dir = WT_DATA . '/backups';
    $files = array();
    foreach ((array)glob($dir . '/*') as $f) if (is_file($f)) $files[] = array('name' => basename($f), 'size' => filesize($f), 'time' => filemtime($f));
    usort($files, function ($a, $b) { return $b['time'] - $a['time']; });
    wt_shell('backups', 'Резервные копии', 'Полный архив сайта или только база — скачивание и восстановление в один клик');
    echo '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
    echo '<div class="card" style="margin:0"><h2>Полная копия сайта (.zip)</h2><p style="color:var(--mut);font-size:13px;margin:6px 0 14px">Все файлы: ядро, тема, плагины, медиафайлы + дамп базы внутри. Аналог All-in-One WP Migration, встроенный в ядро.</p>';
    wt_form_open(array('action' => 'backup-zip'));
    echo '<button class="btn" type="submit">' . wt_icon('cloud', 15) . 'Создать полную копию</button></form></div>';
    echo '<div class="card" style="margin:0"><h2>Только база данных (.sql)</h2><p style="color:var(--mut);font-size:13px;margin:6px 0 14px">Быстрый дамп всех таблиц ' . esc(wt_prefix()) . '* — записи, страницы, комментарии, настройки, ключи.</p>';
    wt_form_open(array('action' => 'backup-sql'));
    echo '<button class="btn dark" type="submit">' . wt_icon('db', 15) . 'Сделать дамп базы</button></form></div>';
    echo '</div>';

    echo '<div class="card np" style="margin-top:18px"><div class="hd"><h2>Сохранённые копии</h2><span class="sp"></span><span style="color:var(--mut);font-size:12.5px">' . count($files) . ' шт.</span></div><table><tr><th>Файл</th><th>Размер</th><th>Дата</th><th></th></tr>';
    if (count($files) === 0) echo '<tr><td colspan="4" class="empty">' . wt_icon('cloud', 28) . '<br>Копий пока нет — создайте первую выше.</td></tr>';
    foreach ($files as $f) {
        echo '<tr><td><b>' . esc($f['name']) . '</b></td><td>' . wt_fmt_kb($f['size']) . '</td><td style="color:var(--mut);white-space:nowrap">' . esc(date('d.m.Y H:i', $f['time'])) . '</td><td class="row-inline">';
        echo '<a class="btn ghost sm" href="' . esc_attr(wt_admin_url('&dl=' . urlencode($f['name']) . '&wt_nonce=' . wt_nonce('dl'))) . '">' . wt_icon('dl', 13) . 'Скачать</a>';
        wt_form_open(array('action' => 'backup-delete', 'file' => $f['name']));
        echo '<button class="btn red sm" type="submit" onclick="return confirm(\'Удалить копию?\')">' . wt_icon('trash', 13) . '</button></form></td></tr>';
    }
    echo '</table></div>';

    echo '<div class="card"><h2>Восстановление из .sql</h2><p style="color:var(--mut);font-size:13px;margin:6px 0 12px">Текущая база будет заменена данными из файла. Сначала сделайте свежую копию.</p>';
    wt_form_open(array('action' => 'backup-restore', 'enctype' => 1));
    echo '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><input type="file" name="sql" accept=".sql" required style="flex:1;min-width:220px">';
    echo '<label style="display:flex;gap:8px;align-items:center;margin:0;font-weight:500;cursor:pointer"><input type="checkbox" name="confirm" value="1" style="width:auto"> понимаю, что база будет перезаписана</label>';
    echo '<button class="btn amber" type="submit">' . wt_icon('refresh', 15) . 'Восстановить</button></div></form></div>';
    wt_shell_close(); exit;
}

/* ── API и приложения ── */
function wt_screen_api() {
    $keys = wt_db()->query('SELECT * FROM ' . wt_t('api_keys') . ' ORDER BY id DESC')->fetchAll();
    $base = (isset($_SERVER['REQUEST_SCHEME']) ? $_SERVER['REQUEST_SCHEME'] : 'https') . '://' . (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost') . wt_base();
    wt_shell('api', 'API и приложения', 'REST API для мобильных приложений: Android, iOS, любые клиенты');
    echo '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">';
    echo '<div class="card" style="margin:0"><h2>Создать ключ</h2>';
    wt_form_open(array('action' => 'key-create'));
    echo '<label>Название приложения</label><input type="text" name="name" placeholder="Моё приложение Android" required>';
    echo '<label>Права</label><select name="scopes"><option value="read">Только чтение</option><option value="read,comments">Чтение + комментарии</option><option value="admin">Полный доступ</option></select>';
    echo '<p style="margin:16px 0 0"><button class="btn" type="submit">' . wt_icon('key', 15) . 'Создать ключ</button></p></form></div>';
    echo '<div class="card" style="margin:0"><h2>Методы API</h2><p style="font-size:13px;color:var(--mut);line-height:2;margin:8px 0 0">';
    echo '<code>GET ' . esc($base) . '/?rest=posts</code> — записи<br><code>GET ' . esc($base) . '/?rest=pages</code> — страницы<br><code>GET ' . esc($base) . '/?rest=info</code> — информация о сайте<br><code>POST ' . esc($base) . '/?rest=comments</code> — комментарий (заголовок X-WT-Key)<br><code>POST ' . esc($base) . '/?rest=cache</code> — очистить кеш</p>';
    echo '<p style="font-size:12.5px;color:var(--mut);margin:10px 0 0">Лимит — 120 запросов в минуту на ключ. GET-методы без ключа доступны всем.</p></div>';
    echo '</div>';
    echo '<div class="card np" style="margin-top:16px"><div class="hd"><h2>Выпущенные ключи</h2><span class="sp"></span><span style="color:var(--mut);font-size:12.5px">хранятся только в виде SHA-256</span></div><table><tr><th>Приложение</th><th>Права</th><th>Создан</th><th>Отпечаток</th><th></th></tr>';
    if (count($keys) === 0) echo '<tr><td colspan="5" class="empty">' . wt_icon('key', 28) . '<br>Ключей нет — создайте первый для мобильного приложения.</td></tr>';
    foreach ($keys as $k) {
        echo '<tr><td><b>' . esc($k['name']) . '</b></td><td><span class="badge b-teal">' . esc($k['scopes']) . '</span></td>';
        echo '<td style="color:var(--mut);white-space:nowrap">' . esc(date('d.m.Y', strtotime($k['created']))) . '</td>';
        echo '<td><code>' . esc(substr($k['key_hash'], 0, 12)) . '…</code></td>';
        echo '<td class="row-inline">';
        wt_form_open(array('action' => 'key-delete', 'id' => $k['id']));
        echo '<button class="btn red sm" type="submit" onclick="return confirm(\'Отозвать ключ? Приложения с ним потеряют доступ.\')">Отозвать</button></form></td></tr>';
    }
    echo '</table></div>';
    wt_shell_close(); exit;
}

/* ── Здоровье системы ── */
function wt_screen_health() {
    $db = wt_db();
    $checks = array(
        array('PHP ' . PHP_VERSION, PHP_VERSION_ID >= 70400, 'обновите версию PHP в панели хостинга'),
        array('PDO + MySQL', extension_loaded('pdo_mysql'), 'включите расширение pdo_mysql'),
        array('mbstring', extension_loaded('mbstring'), 'включите mbstring для кириллицы'),
        array('GD (обработка изображений)', extension_loaded('gd'), 'необязательно, но желательно'),
        array('ZipArchive (полные бэкапы)', class_exists('ZipArchive'), 'без него доступны только SQL-дампы'),
        array('Каталог wt-data доступен для записи', is_writable(WT_DATA), 'chmod 755 и владелец www-data'),
        array('Каталог загрузок доступен для записи', is_writable(WT_UPLOADS), 'chmod 755 wt-content/uploads'),
        array('Соединение с MariaDB/MySQL', true, ''),
    );
    $dbSize = 0;
    try { $dbSize = (int)$db->query("SELECT SUM(data_length + index_length) FROM information_schema.tables WHERE table_schema = DATABASE()")->fetchColumn(); } catch (Exception $e) {}
    $bad = 0; foreach ($checks as $c) if (!$c[1]) $bad++;
    wt_shell('health', 'Здоровье системы', 'Проверка окружения хостинга, базы и файлов');
    echo '<div class="stats">';
    echo '<div class="stat"><span class="ic" style="background:' . ($bad === 0 ? '#e5f5ec' : '#fdf1d7') . ';color:' . ($bad === 0 ? '#137a43' : '#92610a') . '">' . wt_icon($bad === 0 ? 'check' : 'alert', 17) . '</span><b data-n="' . (count($checks) - $bad) . '">0</b><span>проверок пройдено из ' . count($checks) . '</span></div>';
    echo '<div class="stat"><span class="ic" style="background:#e2f5f2;color:#0b7a6e">' . wt_icon('db', 17) . '</span><b style="font-size:20px">' . wt_fmt_kb($dbSize) . '</b><span>размер базы данных</span></div>';
    echo '<div class="stat"><span class="ic" style="background:#eef2f3;color:#33525b">' . wt_icon('zap', 17) . '</span><b style="font-size:20px">' . wt_fmt_kb(wt_cache_size()) . '</b><span>занято в кеше</span></div>';
    echo '<div class="stat"><span class="ic" style="background:#e2f5f2;color:#0b7a6e">' . wt_icon('image', 17) . '</span><b data-n="' . count(wt_media_files()) . '">0</b><span>медиафайлов загружено</span></div>';
    echo '</div>';
    echo '<div class="card np"><div class="hd"><h2>Проверки окружения</h2><span class="sp"></span><span class="badge ' . ($bad === 0 ? 'b-ok' : 'b-amber') . '">' . ($bad === 0 ? 'ВСЁ В ПОРЯДКЕ' : 'ЕСТЬ ЗАМЕЧАНИЯ') . '</span></div><table><tr><th>Компонент</th><th>Статус</th><th>Рекомендация</th></tr>';
    foreach ($checks as $c) {
        echo '<tr><td><b>' . esc($c[0]) . '</b></td>';
        echo '<td>' . ($c[1] ? '<span class="badge b-ok">' . wt_icon('check', 11) . ' Работает</span>' : '<span class="badge b-amber">' . wt_icon('alert', 11) . ' Внимание</span>') . '</td>';
        echo '<td style="color:var(--mut)">' . esc($c[2]) . '</td></tr>';
    }
    echo '</table></div>';
    echo '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">';
    echo '<div class="card np" style="margin:0"><div class="hd"><h2>Журнал событий</h2></div><div style="padding:14px 18px"><div class="logbox">';
    $log = WT_DATA . '/activity.log';
    if (is_file($log)) {
        foreach (array_reverse(array_slice(array_filter(array_map('trim', file($log))), -12)) as $l) {
            if (preg_match('/^\[(.+?)\] (.*)$/', $l, $m)) echo '<i>' . esc($m[1]) . '</i> ' . esc($m[2]) . '<br>'; else echo esc($l) . '<br>';
        }
    } else echo '<i>Журнал пуст.</i>';
    echo '</div></div></div>';
    echo '<div class="card" style="margin:0"><h2>Служебные пути</h2>';
    echo '<div class="kv"><b>Корень сайта</b><span style="font-family:monospace;font-size:12px">' . esc(WT_ROOT) . '</span></div>';
    echo '<div class="kv"><b>Данные и бэкапы</b><span style="font-family:monospace;font-size:12px">' . esc(WT_DATA) . '</span></div>';
    echo '<div class="kv"><b>Коды 2FA (если почта недоступна)</b><span style="font-family:monospace;font-size:12px">' . esc(WT_DATA) . '/2fa-log.txt</span></div>';
    echo '<div class="kv"><b>Префикс таблиц</b><span><code>' . esc(wt_prefix()) . '</code></span></div>';
    echo '<div class="kv"><b>Версия ядра</b><span>Wordtime ' . WT_VERSION . '</span></div>';
    echo '</div></div>';
    wt_shell_close(); exit;
}

/* ── Настройки ── */
function wt_screen_settings() {
    global $tab, $user;
    if ($tab === '') $tab = 'general';
    wt_shell('settings', 'Настройки', 'Общие, обсуждение, кеш, безопасность и страница входа');
    echo '<div class="tabs">';
    foreach (array('general' => 'Общие', 'comments' => 'Обсуждение', 'cache' => 'Кеш', 'security' => 'Безопасность', 'login' => 'Страница входа') as $k => $l) {
        echo '<a class="' . ($tab === $k ? 'on' : '') . '" href="' . esc_attr(wt_admin_url('&page=settings&tab=' . $k)) . '">' . $l . '</a>';
    }
    echo '</div>';

    if ($tab === 'general') {
        wt_form_open(array('action' => 'settings-save'));
        echo '<div class="card"><h2>Общие настройки</h2><div class="grid2"><div><label>Название сайта</label><input type="text" name="site_title" value="' . esc_attr(wt_option('site_title', 'Wordtime')) . '"></div>';
        echo '<div><label>Краткое описание</label><input type="text" name="tagline" value="' . esc_attr(wt_option('tagline', '')) . '"></div></div>';
        echo '<label>Почта администратора</label><input type="email" name="admin_email" value="' . esc_attr(wt_option('admin_email', '')) . '">';
        echo '<label>Рубрики (через запятую)</label><input type="text" name="categories" value="' . esc_attr(implode(', ', wt_categories())) . '">';
        echo '<p style="margin:16px 0 0"><button class="btn" type="submit">' . wt_icon('check', 15) . 'Сохранить</button></p></div></form>';
        echo '<div class="card"><h2>О системе</h2><p style="color:var(--mut);font-size:13.5px;margin:6px 0 0;line-height:1.8">Wordtime ' . WT_VERSION . ' · PHP ' . PHP_VERSION . ' · таблицы с префиксом <code>' . esc(wt_prefix()) . '</code><br>Язык интерфейса — только русский. Ядро совместимо с хуками плагинов WordPress-типа.</p></div>';
    } elseif ($tab === 'comments') {
        $off = (bool)wt_option('comments_disabled', false);
        wt_form_open(array('action' => 'settings-comments'));
        echo '<div class="card" style="border-color:' . ($off ? '#f0dcae' : 'var(--line)') . '"><h2>Отключение комментариев</h2>';
        echo '<p style="color:var(--mut);font-size:13.5px;margin:4px 0 14px">Главный переключатель комментирования для всего сайта.</p>';
        echo '<label style="display:flex;gap:10px;align-items:center;cursor:pointer;margin:0"><input type="checkbox" name="comments_disabled" value="1" style="width:auto" ' . ($off ? 'checked' : '') . ' onchange="this.form.submit()"> <b style="font-size:14px">' . ($off ? 'Комментарии отключены — форма скрыта на сайте' : 'Комментарии включены') . '</b></label></div>';
        echo '<div class="card"><h2>Модерация</h2>';
        echo '<label style="display:flex;gap:10px;align-items:center;cursor:pointer"><input type="checkbox" name="moderate_first" value="1" style="width:auto" ' . (wt_option('moderate_first', true) ? 'checked' : '') . '> Отправлять новые комментарии на модерацию</label>';
        echo '<div class="grid2"><div><label>Закрывать комментарии через (дней)</label><input type="number" name="close_after_days" min="1" value="' . (int)wt_option('close_after_days', 30) . '"></div></div>';
        echo '<p style="margin:16px 0 0"><button class="btn" type="submit">' . wt_icon('check', 15) . 'Сохранить</button></p></div></form>';
    } elseif ($tab === 'cache') {
        $on = (bool)wt_option('cache_enabled', true);
        wt_form_open(array('action' => 'cache-toggle'));
        echo '<div class="card"><h2>Страничный кеш</h2>';
        echo '<label style="display:flex;gap:10px;align-items:center;cursor:pointer;margin:6px 0 0"><input type="checkbox" name="cache_enabled" value="1" style="width:auto" ' . ($on ? 'checked' : '') . ' onchange="this.form.submit()"> <b>' . ($on ? 'Кеш включён — страницы отдаются из wt-data/cache' : 'Кеш отключён') . '</b></label></div></form>';
        echo '<div class="card" style="background:linear-gradient(140deg,#071b21,#0d323c);border-color:#174753;color:#eaf4f4"><h2 style="color:#fff">Сейчас в кеше: ' . wt_fmt_kb(wt_cache_size()) . '</h2>';
        echo '<p style="color:#9fc0c5;font-size:13.5px;margin:6px 0 14px">Очистка нужна после правок дизайна, обновлений и восстановления базы.</p>';
        wt_form_open(array('action' => 'cache-clear'));
        echo '<button class="btn amber" type="submit">' . wt_icon('zap', 15) . 'Очистить кеш сайта</button></form></div>';
    } elseif ($tab === 'security') {
        echo '<div class="card" style="border-color:#bfe5cf"><h2>Двухфакторная аутентификация</h2>';
        echo '<p style="margin:6px 0 0"><span class="badge b-ok">' . wt_icon('shield', 11) . ' 2FA обязательна для всех</span> <span class="badge b-ok">блокировка после 5 попыток · 60 сек</span> <span class="badge b-ok">подготовка SQL-запросов</span> <span class="badge b-ok">экранирование вывода</span></p>';
        echo '<p style="color:var(--mut);font-size:13.5px;margin:10px 0 0;line-height:1.7">Коды отправляются на почту. Если SMTP не настроен, код сохраняется в защищённый файл <code>wt-data/2fa-log.txt</code> на сервере.</p></div>';
        $smtpHost = defined('WT_SMTP_HOST') ? WT_SMTP_HOST : '';
        wt_form_open(array('action' => 'smtp-save'));
        echo '<div class="card"><h2>SMTP для писем и кодов 2FA</h2><div class="grid2">';
        echo '<div><label>SMTP-сервер</label><input type="text" name="smtp_host" value="' . esc_attr($smtpHost) . '" placeholder="smtp.хостер.ru"></div>';
        echo '<div><label>Порт</label><input type="number" name="smtp_port" value="' . (int)(defined('WT_SMTP_PORT') ? WT_SMTP_PORT : 587) . '"></div>';
        echo '<div><label>Логин</label><input type="text" name="smtp_user" value="' . esc_attr(defined('WT_SMTP_USER') ? WT_SMTP_USER : '') . '"></div>';
        echo '<div><label>Пароль</label><input type="password" name="smtp_pass" value="' . esc_attr(defined('WT_SMTP_PASS') ? WT_SMTP_PASS : '') . '"></div></div>';
        echo '<label>От кого (From)</label><input type="text" name="smtp_from" value="' . esc_attr(defined('WT_MAIL_FROM') ? WT_MAIL_FROM : '') . '" placeholder="Wordtime <no-reply@' . esc_attr(isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'сайт') . '>">';
        echo '<p style="margin:16px 0 0;display:flex;gap:10px"><button class="btn" type="submit">' . wt_icon('check', 15) . 'Сохранить SMTP</button></p></form>';
        wt_form_open(array('action' => 'smtp-test'));
        echo '<p style="margin:12px 0 0"><button class="btn ghost" type="submit">' . wt_icon('mail', 15) . 'Отправить тестовое письмо</button></p></form></div>';
        $attempts = wt_db()->query('SELECT * FROM ' . wt_t('login_attempts') . ' WHERE fails > 0 OR locked_until > 0 ORDER BY locked_until DESC LIMIT 6')->fetchAll();
        echo '<div class="card np"><div class="hd"><h2>Попытки подбора пароля</h2><span class="sp"></span>';
        wt_form_open(array('action' => 'attempts-clear'));
        echo '<button class="btn ghost sm" type="submit">Сбросить счётчики</button></form></div><table><tr><th>IP</th><th>Почта</th><th>Неудачных попыток</th><th>Блокировка</th></tr>';
        if (count($attempts) === 0) echo '<tr><td colspan="4" class="empty">' . wt_icon('shield', 26) . '<br>Подозрительной активности нет.</td></tr>';
        foreach ($attempts as $a) {
            $left = (int)$a['locked_until'] - time();
            echo '<tr><td><code>' . esc($a['ip']) . '</code></td><td>' . esc($a['email']) . '</td><td><span class="badge ' . ((int)$a['fails'] >= 3 ? 'b-red' : 'b-amber') . '">' . (int)$a['fails'] . '</span></td>';
            echo '<td>' . ($left > 0 ? '<span class="badge b-red">ещё ' . $left . ' сек</span>' : '<span class="badge b-mut">нет</span>') . '</td></tr>';
        }
        echo '</table></div>';
    } elseif ($tab === 'login') {
        wt_form_open(array('action' => 'login-style'));
        echo '<div class="card"><h2>Кастомизация страницы входа</h2>';
        echo '<p style="color:var(--mut);font-size:13.5px;margin:4px 0 10px">Так страницу входа и подтверждения 2FA увидят пользователи.</p>';
        echo '<div class="grid2"><div><label>Название на странице</label><input type="text" name="logo" value="' . esc_attr(wt_option('login_logo', 'Wordtime')) . '"></div>';
        echo '<div><label>Акцентный цвет (HEX)</label><input type="text" name="accent" value="' . esc_attr(wt_option('login_accent', '#14b8a6')) . '" placeholder="#14b8a6"></div></div>';
        echo '<label>Сообщение под логотипом</label><input type="text" name="message" value="' . esc_attr(wt_option('login_message', 'Вход защищён двухфакторной аутентификацией')) . '">';
        echo '<label>Подпись в нижней панели</label><input type="text" name="side" value="' . esc_attr(wt_option('login_side', 'Быстро. Безопасно. По-русски.')) . '">';
        echo '<p style="margin:16px 0 0;display:flex;gap:10px"><button class="btn" type="submit">' . wt_icon('check', 15) . 'Сохранить оформление</button> <a class="btn ghost" href="' . esc_attr(wt_admin_url('&action=logout')) . '">Выйти и посмотреть</a></p></div></form>';
    }
    wt_shell_close(); exit;
}
