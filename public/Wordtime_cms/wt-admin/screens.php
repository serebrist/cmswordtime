<?php
/**
 * Wordtime CMS 1.0.5 — разделы консоли
 * Подключается из wt-admin/index.php после авторизации.
 */
if (!defined('WT_ROOT')) exit;

function wt_media_files() {
    $out = array();
    if (!is_dir(WT_UPLOADS)) return $out;
    try {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(WT_UPLOADS, FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) {
            if (!$f->isFile()) continue;
            $rel = str_replace('\\', '/', substr($f->getPathname(), strlen(WT_UPLOADS) + 1));
            if (basename($rel) === 'index.html') continue;
            $out[] = array('rel' => $rel, 'size' => $f->getSize(), 'time' => $f->getMTime());
        }
    } catch (Exception $e) { /* каталог недоступен */ }
    usort($out, function ($a, $b) { return $b['time'] - $a['time']; });
    return $out;
}
function wt_fmt_kb($b) { return $b < 1024 ? $b . ' Б' : ($b < 1048576 ? round($b / 1024) . ' КБ' : number_format($b / 1048576, 1, ',', ' ') . ' МБ'); }
function wt_dir_size($dir) {
    $s = 0;
    if (!is_dir($dir)) return 0;
    try {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) if ($f->isFile()) $s += $f->getSize();
    } catch (Exception $e) { /* недоступно */ }
    return $s;
}
function wt_log_lines($limit = 40) {
    $log = WT_DATA . '/activity.log';
    if (!is_file($log) || !is_readable($log)) return array();
    $lines = array_slice(array_filter(array_map('trim', file($log))), -$limit);
    $out = array();
    foreach (array_reverse($lines) as $l) {
        if (preg_match('/^\[(.+?)\] (.*)$/', $l, $m)) $out[] = array($m[1], $m[2]);
    }
    return $out;
}

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
    echo '<a class="btn dark" href="' . esc_attr(wt_admin_url('&page=settings&tab=backups')) . '">' . wt_icon('cloud', 15) . 'Резервная копия</a>';
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
    echo '<div style="display:grid;grid-template-columns:1.25fr 1fr;gap:18px;align-items:start"><div>';
    echo '<div class="card np"><div class="hd"><h2>Последние записи</h2><span class="sp"></span><a class="btn ghost sm" href="' . esc_attr(wt_admin_url('&page=posts')) . '">Все</a></div><table><tbody>';
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
    echo '</div></div></div><div>';
    echo '<div class="card"><h2>Быстрый черновик</h2>';
    wt_form_open(array('action' => 'quick-draft'));
    echo '<label>Заголовок</label><input type="text" name="title" placeholder="О чём напишем?">';
    echo '<label>Текст</label><textarea name="content" rows="4" placeholder="Набросок — сохранится как черновик"></textarea>';
    echo '<p style="margin:14px 0 0"><button class="btn" type="submit">' . wt_icon('check', 15) . 'Сохранить черновик</button></p></form></div>';
    echo '<div class="card np"><div class="hd"><h2>Журнал активности</h2><span class="sp"></span><a class="btn ghost sm" href="' . esc_attr(wt_admin_url('&page=events')) . '">Все события</a></div><div style="padding:14px 18px"><div class="logbox">';
    $events = wt_log_lines(7);
    if (count($events) === 0) echo '<i>Журнал пуст — действия появятся здесь.</i>';
    foreach ($events as $e) echo '<i>' . esc($e[0]) . '</i> ' . esc($e[1]) . '<br>';
    echo '</div></div></div>';
    echo '<div class="card"><h2>Состояние</h2>';
    echo '<div class="kv"><b>Версия ядра</b><span>Wordtime ' . WT_VERSION . '</span></div>';
    echo '<div class="kv"><b>PHP</b><span>' . PHP_VERSION . ' ' . (PHP_VERSION_ID >= 80000 ? '<span class="badge b-ok">отлично</span>' : '<span class="badge b-amber">работает</span>') . '</span></div>';
    echo '<div class="kv"><b>Кеш</b><span>' . (wt_option('cache_enabled', true) ? '<span class="badge b-ok">включён</span>' : '<span class="badge b-mut">отключён</span>') . ' · ' . wt_fmt_kb(wt_cache_size()) . '</span></div>';
    echo '<div class="kv"><b>Комментарии на сайте</b><span>' . (wt_option('comments_disabled', false) ? '<span class="badge b-amber">отключены</span>' : '<span class="badge b-ok">включены</span>') . '</span></div>';
    echo '</div></div></div>';
    wt_shell_close(); exit;
}

function wt_screen_events() {
    wt_shell('events', 'События', 'Полный журнал действий на сайте: входы, правки, загрузки, безопасность');
    $events = wt_log_lines(100);
    echo '<div class="card np"><div class="hd"><h2>Журнал событий</h2><span class="sp"></span><span style="color:var(--mut);font-size:12.5px">' . count($events) . ' записей</span>';
    wt_form_open(array('action' => 'log-clear'));
    echo '<button class="btn ghost sm" type="submit" onclick="return confirm(\'Очистить журнал?\')">' . wt_icon('trash', 13) . 'Очистить</button></form></div>';
    echo '<table><tr><th style="width:170px">Время</th><th>Событие</th></tr>';
    if (count($events) === 0) echo '<tr><td colspan="2" class="empty">' . wt_icon('clock', 28) . '<br>Событий пока нет.</td></tr>';
    foreach ($events as $e) {
        $tone = (strpos($e[1], 'блокир') !== false || strpos($e[1], 'Заблокирована') !== false) ? 'b-red' : (strpos($e[1], 'удал') !== false ? 'b-amber' : 'b-teal');
        echo '<tr><td style="white-space:nowrap;color:var(--mut)"><code>' . esc($e[0]) . '</code></td>';
        echo '<td><span class="badge ' . $tone . '">•</span> ' . esc($e[1]) . '</td></tr>';
    }
    echo '</table></div>';
    wt_shell_close(); exit;
}

function wt_screen_updates() {
    wt_shell('updates', 'Обновления', 'Версия ядра, журнал изменений и проверка актуальности');
    echo '<div class="hello" style="padding:24px 28px"><h2 style="font-size:19px">Wordtime ' . WT_VERSION . ' — установлена последняя версия</h2>';
    echo '<p style="margin:7px 0 0">Ядро обновляется вместе с дистрибутивом: скачайте свежий Wordtime_cms.zip и замените файлы (база и настройки не затрагиваются).</p>';
    echo '<div class="acts">';
    wt_form_open(array('action' => 'check-updates'));
    echo '<button class="btn amber" type="submit">' . wt_icon('refresh', 15) . 'Проверить обновления</button></form>';
    echo '<a class="btn dark" href="' . esc_attr(wt_admin_url('&page=health')) . '">' . wt_icon('pulse', 15) . 'Здоровье системы</a>';
    echo '</div></div>';
    echo '<div style="display:grid;grid-template-columns:1.25fr 1fr;gap:18px;align-items:start">';
    echo '<div class="card np"><div class="hd"><h2>Журнал изменений</h2></div><div style="padding:18px 22px">';
    $changelog = array(
        array('1.0.5', 'сегодня', array('Консоль с выпадающими меню: 27 разделов', 'Установщик блокируется после установки (самозащита)', 'Меню сайта из консоли отображается в шапке темы', 'GD-оптимизация изображений при загрузке', 'SEO-шаблоны title/description и экран Sitemap')),
        array('1.0.4', '2 недели назад', array('Автоопределение базового пути — работа в подпапках', 'SMTP-отправка кодов 2FA + файловый фолбэк', 'Nginx-конфиг в дистрибутиве')),
        array('1.0.0', 'месяц назад', array('Первый публичный выпуск', '2FA в ядре, блокировка подбора паролей', 'REST API /wt/v1/ для мобильных приложений', 'Резервные копии: ZIP сайта + дамп SQL')),
    );
    foreach ($changelog as $i => $c) {
        echo '<div style="display:flex;gap:15px;padding:' . ($i === 0 ? '0 0 16px' : '16px 0') . ';' . ($i > 0 ? 'border-top:1px dashed #e2eaea' : '') . '">';
        echo '<span style="flex:none;width:64px"><span class="badge ' . ($i === 0 ? 'b-teal' : 'b-mut') . '">v' . $c[0] . '</span></span>';
        echo '<div style="min-width:0"><p style="margin:0 0 6px;font-weight:700;font-size:13px;color:var(--mut)">' . $c[1] . '</p><ul style="margin:0;padding-left:18px;color:#33525b;font-size:13.5px;line-height:1.8">';
        foreach ($c[2] as $f) echo '<li>' . esc($f) . '</li>';
        echo '</ul></div></div>';
    }
    echo '</div></div>';
    echo '<div class="card np" style="margin:0"><div class="hd"><h2>Модули ядра</h2></div><table>';
    $mods = array(
        array('wt-includes/bootstrap.php', 'Ядро: PDO, хуки, 2FA, кеш, REST'),
        array('wt-admin/index.php', 'Консоль: вход и каркас'),
        array('wt-admin/screens.php', 'Разделы консоли'),
        array('wt-content/themes/wordtime-twenty/index.php', 'Стартовая тема'),
        array('wt-cron.php', 'Асинхронная очередь'),
    );
    foreach ($mods as $m) {
        $ok = file_exists(WT_ROOT . '/' . $m[0]);
        echo '<tr><td><code>' . esc($m[0]) . '</code><br><span style="color:var(--mut);font-size:12px">' . esc($m[1]) . '</span></td>';
        echo '<td style="width:100px">' . ($ok ? '<span class="badge b-ok">на месте</span>' : '<span class="badge b-red">отсутствует</span>') . '</td></tr>';
    }
    echo '</table></div></div>';
    wt_shell_close(); exit;
}

function wt_screen_posts() {
    if (isset($_GET['edit']) || isset($_GET['new'])) {
        $id = isset($_GET['edit']) ? (int)$_GET['edit'] : 0;
        $row = $id > 0 ? wt_db()->query('SELECT * FROM ' . wt_t('posts') . ' WHERE id = ' . $id)->fetch() : null;
        if ($id > 0 && !$row) { header('Location: ' . wt_admin_url('&page=posts')); exit; }
        if (!$row) $row = array('id' => 0, 'post_title' => '', 'slug' => '', 'post_content' => '', 'category' => wt_categories()[0], 'tags' => '', 'post_status' => 'published', 'post_image' => '');
        wt_shell('posts', $id > 0 ? 'Редактор записи' : 'Новая запись', $id > 0 ? 'Изменения вступят в силу сразу после сохранения' : 'Заполните заголовок и текст — остальное сделаем сами');
        wt_form_open(array('action' => 'post-save', 'id' => $row['id']));
        echo '<div style="display:grid;grid-template-columns:1fr 320px;gap:18px;align-items:start">';
        echo '<div class="card"><label>Заголовок</label><input type="text" name="title" value="' . esc_attr($row['post_title']) . '" required placeholder="Заголовок записи" style="font-size:17px;font-weight:700">';
        echo '<label>Текст записи</label><textarea name="content" rows="14" placeholder="Абзацы разделяйте пустой строкой. Разрешены ссылки, списки, цитаты.">' . esc($row['post_content']) . '</textarea></div><div>';
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

function wt_screen_categories() {
    $cats = wt_categories();
    $counts = array();
    foreach (wt_db()->query('SELECT category, COUNT(*) c FROM ' . wt_t('posts') . ' GROUP BY category')->fetchAll() as $r) $counts[$r['category']] = (int)$r['c'];
    wt_shell('categories', 'Рубрики', 'Разделы сайта, по которым группируются записи');
    echo '<div style="display:grid;grid-template-columns:1.3fr 1fr;gap:18px;align-items:start">';
    echo '<div class="card np"><table><tr><th>Название</th><th>Записей</th><th></th></tr>';
    foreach ($cats as $c) {
        echo '<tr><td><b>' . esc($c) . '</b></td><td><span class="badge b-mut">' . (isset($counts[$c]) ? $counts[$c] : 0) . '</span></td><td class="row-inline">';
        wt_form_open(array('action' => 'category-delete', 'name' => $c));
        echo '<button class="btn red sm" type="submit" onclick="return confirm(\'Удалить рубрику? Записи переедут в «' . esc($cats[0]) . '».\')">' . wt_icon('trash', 13) . '</button></form></td></tr>';
    }
    echo '</table></div>';
    echo '<div class="card"><h2>Добавить рубрику</h2>';
    wt_form_open(array('action' => 'category-add'));
    echo '<label>Название</label><input type="text" name="name" required placeholder="Технологии">';
    echo '<p style="margin:16px 0 0"><button class="btn" type="submit">' . wt_icon('plus', 15) . 'Добавить</button></p></form></div></div>';
    wt_shell_close(); exit;
}

function wt_screen_tags() {
    $tags = array();
    foreach (wt_db()->query('SELECT tags FROM ' . wt_t('posts') . ' WHERE tags != ""')->fetchAll(PDO::FETCH_COLUMN) as $t) {
        foreach (array_filter(array_map('trim', explode(',', $t)), 'strlen') as $one) {
            $key = mb_strtolower($one);
            if (!isset($tags[$key])) $tags[$key] = 0;
            $tags[$key]++;
        }
    }
    arsort($tags);
    wt_shell('tags', 'Метки', 'Теги записей — сквозные метки для поиска и навигации');
    echo '<div class="card np"><div class="hd"><h2>Все метки</h2><span class="sp"></span><span style="color:var(--mut);font-size:12.5px">' . count($tags) . ' шт.</span></div>';
    if (count($tags) === 0) echo '<div class="empty">' . wt_icon('tag', 28) . '<br>Меток пока нет — добавляйте их в редакторе записей.</div></div>';
    else {
        echo '<div style="padding:20px 22px;display:flex;flex-wrap:wrap;gap:9px">';
        foreach ($tags as $t => $n) echo '<span class="swatch"><i></i>' . esc($t) . ' <b style="color:var(--mut)">× ' . $n . '</b></span>';
        echo '</div></div>';
    }
    wt_shell_close(); exit;
}

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

function wt_screen_comments() {
    global $tab;
    if ($tab === '') $tab = 'all';
    $safe = preg_replace('/[^a-z]/', '', $tab);
    $where = $safe === 'all' ? '' : ' WHERE status = "' . $safe . '"';
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

function wt_screen_media() {
    $files = wt_media_files();
    $isNew = isset($_GET['new']);
    wt_shell('media', 'Медиафайлы', 'Загрузка, оптимизация и управление файлами · ' . count($files) . ' шт. · ' . wt_fmt_kb(wt_dir_size(WT_UPLOADS)));
    echo '<div class="card" ' . ($isNew ? 'style="border-color:var(--amber);box-shadow:0 0 0 3px rgba(240,180,41,.18)"' : '') . '><h2>Загрузить файл</h2>';
    echo '<p style="color:var(--mut);font-size:13px;margin:4px 0 12px">JPG, PNG, GIF, WebP, SVG, PDF, MP4 · до 20 МБ.' . (function_exists('imagecreatefromstring') && wt_option('img_auto', true) ? ' Изображения автоматически оптимизируются (настройки — «Оптимизация → Изображения»).' : '') . '</p>';
    wt_form_open(array('action' => 'upload', 'enctype' => 1));
    echo '<div style="display:flex;gap:10px;flex-wrap:wrap"><input type="file" name="file" required ' . ($isNew ? 'autofocus' : '') . ' style="flex:1;min-width:240px"><button class="btn amber" type="submit">' . wt_icon('dl', 15) . 'Загрузить</button></div></form></div>';
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

function wt_screen_users() {
    global $user;
    $rows = wt_db()->query('SELECT * FROM ' . wt_t('users') . ' ORDER BY id')->fetchAll();
    $isNew = isset($_GET['new']);
    wt_shell('users', 'Пользователи', 'Учётные записи и роли — вход для всех только с кодом 2FA');
    echo '<div style="display:grid;grid-template-columns:1.3fr 1fr;gap:18px;align-items:start">';
    echo '<div class="card np"><table><tr><th>Пользователь</th><th>Роль</th><th>Создан</th><th></th></tr>';
    foreach ($rows as $u) {
        $self = (int)$u['id'] === (int)$user['id'];
        echo '<tr><td><span style="display:flex;align-items:center;gap:10px"><span style="width:32px;height:32px;flex:none;border-radius:9px;background:linear-gradient(150deg,var(--teal),#0b6e63);color:#fff;display:grid;place-items:center;font:800 12px var(--disp)">' . esc(mb_strtoupper(mb_substr($u['user_login'], 0, 1))) . '</span><span><b>' . esc($u['user_login']) . '</b>' . ($self ? ' <span class="badge b-teal">вы</span>' : '') . '<br><span style="color:var(--mut);font-size:12px">' . esc($u['user_email']) . '</span></span></span></td>';
        echo '<td><span class="badge ' . ($u['user_role'] === 'administrator' ? 'b-amber' : 'b-mut') . '">' . esc($u['user_role']) . '</span></td>';
        echo '<td style="color:var(--mut);white-space:nowrap">' . esc(date('d.m.Y', strtotime($u['created']))) . '</td><td class="row-inline">';
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
    echo '<div class="card" ' . ($isNew ? 'style="border-color:var(--amber);box-shadow:0 0 0 3px rgba(240,180,41,.18)"' : '') . '><h2>Добавить пользователя</h2>';
    wt_form_open(array('action' => 'user-add'));
    echo '<label>Логин</label><input type="text" name="login" required placeholder="maria" ' . ($isNew ? 'autofocus' : '') . '>';
    echo '<label>Почта (для кодов 2FA)</label><input type="email" name="email" required placeholder="maria@site.ru">';
    echo '<label>Пароль (минимум 8 символов)</label><input type="password" name="pass" required minlength="8">';
    echo '<label>Роль</label><select name="role">';
    foreach (array('administrator' => 'Администратор', 'editor' => 'Редактор', 'author' => 'Автор', 'subscriber' => 'Подписчик') as $k => $l) echo '<option value="' . $k . '">' . $l . '</option>';
    echo '</select>';
    echo '<p style="margin:16px 0 0"><button class="btn" type="submit">' . wt_icon('plus', 15) . 'Создать</button></p></form></div></div>';
    wt_shell_close(); exit;
}

function wt_screen_profile() {
    global $user;
    wt_shell('profile', 'Ваш профиль', 'Личные данные и смена пароля');
    echo '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start">';
    echo '<div class="card"><h2>Данные учётной записи</h2>';
    wt_form_open(array('action' => 'profile-save'));
    echo '<label>Логин</label><input type="text" name="login" value="' . esc_attr($user['user_login']) . '" required>';
    echo '<label>Почта (на неё приходят коды 2FA)</label><input type="email" name="email" value="' . esc_attr($user['user_email']) . '" required>';
    echo '<label>Новый пароль</label><input type="password" name="pass" minlength="8" placeholder="Оставьте пустым, чтобы не менять">';
    echo '<p style="margin:16px 0 0"><button class="btn" type="submit">' . wt_icon('check', 15) . 'Сохранить профиль</button></p></form></div>';
    echo '<div class="card"><h2>Безопасность аккаунта</h2>';
    echo '<div class="kv"><b>Роль</b><span class="badge b-amber">' . esc($user['user_role']) . '</span></div>';
    echo '<div class="kv"><b>Двухфакторная аутентификация</b><span class="badge b-ok">включена обязательно</span></div>';
    echo '<div class="kv"><b>Аккаунт создан</b><span>' . esc(date('d.m.Y H:i', strtotime($user['created']))) . '</span></div>';
    echo '<p style="color:var(--mut);font-size:13px;margin:14px 0 0;line-height:1.7">Каждый вход в консоль подтверждается шести-значным кодом из письма. После 5 неудачных попыток вход блокируется на 60 секунд.</p></div></div>';
    wt_shell_close(); exit;
}

function wt_screen_themes() {
    $active = wt_option('active_theme', 'wordtime-twenty');
    $dirs = array_values(array_filter((array)@glob(WT_ROOT . '/wt-content/themes/*'), 'is_dir'));
    wt_shell('themes', 'Темы', 'Оформление сайта — активная тема применяется мгновенно');
    echo '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px">';
    foreach ($dirs as $d) {
        $name = basename($d);
        $label = $name;
        $css = $d . '/style.css';
        if (is_file($css) && preg_match('/Theme Name:\s*(.+)/i', (string)file_get_contents($css), $m)) $label = trim($m[1]);
        $isOn = $name === $active;
        echo '<div class="card" style="margin:0;overflow:hidden;padding:0;border-color:' . ($isOn ? 'var(--teal)' : 'var(--line)') . '">';
        echo '<div style="height:110px;background:linear-gradient(140deg,#0d3039,#134450);display:grid;place-items:center;color:#5f97a1;position:relative">' . wt_icon('palette', 30);
        if ($isOn) echo '<span class="badge b-ok" style="position:absolute;top:10px;right:10px">' . wt_icon('check', 11) . 'Активна</span>';
        echo '</div><div style="padding:15px 17px"><b style="font:700 14.5px var(--disp)">' . esc($label) . '</b>';
        echo '<p style="margin:5px 0 12px;color:var(--mut);font-size:12.5px">Каталог: <code>' . esc($name) . '</code></p>';
        if (!$isOn) { wt_form_open(array('action' => 'theme-activate', 'theme' => $name)); echo '<button class="btn ghost sm" type="submit">Активировать</button></form>'; }
        else echo '<span style="font-size:12.5px;color:var(--teal);font-weight:700">Используется сайтом сейчас</span>';
        echo '</div></div>';
    }
    echo '</div>';
    echo '<div class="card" style="margin-top:18px"><h2>Как добавить тему</h2><p style="color:var(--mut);font-size:13.5px;margin:6px 0 0;line-height:1.7">Скопируйте папку темы в <code>wt-content/themes/</code> — внутри должны быть <code>index.php</code>, <code>functions.php</code> и <code>style.css</code> с заголовком <code>Theme Name</code>. Файлы активной темы можно править в <a href="' . esc_attr(wt_admin_url('&page=theme-editor')) . '">Редакторе тем</a>.</p></div>';
    wt_shell_close(); exit;
}

function wt_screen_menus() {
    $m = wt_option('site_menu', null);
    $m = is_array($m) ? $m : array();
    wt_shell('menus', 'Меню', 'Пункты навигации в шапке сайта — порядок, состав и внешние ссылки');
    echo '<div class="alert ok">' . wt_icon('check', 17) . '<span>Сохранённое меню отображается в шапке сайта автоматически. Пустое меню — показывается «Главная» и опубликованные страницы.</span></div>';
    echo '<div style="display:grid;grid-template-columns:1.3fr 1fr;gap:18px;align-items:start"><div>';
    echo '<div class="card np"><div class="hd"><h2>Пункты меню</h2><span class="sp"></span><span style="color:var(--mut);font-size:12.5px">' . count($m) . ' шт.</span></div>';
    if (count($m) === 0) echo '<div class="empty">' . wt_icon('menu', 28) . '<br>Меню пустое — добавьте первый пункт справа.</div>';
    else {
        wt_form_open(array('action' => 'menu-save'));
        echo '<table><tr><th>Название</th><th>Ссылка</th><th></th></tr>';
        foreach ($m as $it) {
            echo '<tr><td><input type="text" name="labels[]" value="' . esc_attr($it['label']) . '"></td>';
            echo '<td><input type="text" name="targets[]" value="' . esc_attr($it['url']) . '" placeholder="/ , ?p=page:o-sajte или https://…"></td>';
            echo '<td class="row-inline" style="white-space:nowrap">';
            echo '<button class="icobtn" type="button" title="Вверх" onclick="var r=this.closest(\'tr\');if(r.previousElementSibling)r.parentNode.insertBefore(r,r.previousElementSibling)">' . wt_icon('up', 14) . '</button>';
            echo '<button class="icobtn" type="button" title="Вниз" onclick="var r=this.closest(\'tr\');if(r.nextElementSibling)r.parentNode.insertBefore(r.nextElementSibling,r)">' . wt_icon('down', 14) . '</button>';
            echo '<button class="icobtn" type="button" title="Убрать" style="color:var(--red)" onclick="this.closest(\'tr\').remove()">' . wt_icon('x', 14) . '</button>';
            echo '</td></tr>';
        }
        echo '</table><div style="padding:14px 22px;border-top:1px solid var(--line)"><button class="btn" type="submit">' . wt_icon('check', 15) . 'Сохранить меню</button></div></form>';
    }
    echo '</div></div><div>';
    echo '<div class="card"><h2>Добавить пункт</h2>';
    wt_form_open(array('action' => 'menu-add'));
    echo '<label>Название</label><input type="text" name="label" required placeholder="О проекте">';
    echo '<label>Ссылка</label><input type="text" name="target" required placeholder="/ , ?p=page:o-sajte или https://…">';
    echo '<p style="margin:16px 0 0"><button class="btn" type="submit">' . wt_icon('plus', 15) . 'Добавить</button></p></form></div>';
    echo '<div class="card"><h2>Предпросмотр шапки</h2><div style="background:#071b21;border-radius:12px;padding:13px 16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">';
    echo '<b style="font:800 13px var(--disp);color:#fff">' . esc(wt_option('site_title', 'Wordtime')) . '</b>';
    if (count($m) === 0) { echo '<span style="color:#9fc0c5;font-size:12.5px;font-weight:600">Главная</span><span style="color:#5f8891;font-size:12px">+ страницы сайта</span>'; }
    else foreach (array_slice($m, 0, 6) as $it) echo '<span style="color:#9fc0c5;font-size:12.5px;font-weight:600">' . esc($it['label']) . '</span>';
    if (count($m) > 6) echo '<span style="color:#5f8891;font-size:12px">+' . (count($m) - 6) . '</span>';
    echo '</div></div></div></div>';
    wt_shell_close(); exit;
}

function wt_screen_theme_editor() {
    $allow = array('style.css' => 'Стили темы', 'functions.php' => 'Хуки и логика темы', 'index.php' => 'Шаблон вывода');
    $file = isset($_GET['file']) && isset($allow[$_GET['file']]) ? (string)$_GET['file'] : 'style.css';
    $path = wt_theme_dir() . '/' . $file;
    $content = is_file($path) ? (string)file_get_contents($path) : '';
    wt_shell('theme-editor', 'Редактор тем', 'Файлы активной темы «' . basename(wt_theme_dir()) . '» — правки применяются сразу');
    echo '<div class="tabs">';
    foreach ($allow as $f => $l) echo '<a class="' . ($file === $f ? 'on' : '') . '" href="' . esc_attr(wt_admin_url('&page=theme-editor&file=' . $f)) . '">' . $l . '</a>';
    echo '</div>';
    echo '<div class="alert warn">' . wt_icon('alert', 17) . '<span>Осторожно: ошибка в <b>functions.php</b> или <b>index.php</b> может сломать вывод сайта. Перед правками сделайте <a href="' . esc_attr(wt_admin_url('&page=settings&tab=backups')) . '">резервную копию</a>.</span></div>';
    wt_form_open(array('action' => 'theme-file-save', 'file' => $file));
    echo '<div class="card np"><div class="hd"><h2>' . esc($file) . '</h2><span class="sp"></span><span style="color:var(--mut);font-size:12px">' . wt_fmt_kb(strlen($content)) . '</span></div>';
    echo '<div style="padding:14px 16px"><textarea name="content" rows="18" style="font:12.5px/1.7 ui-monospace,Menlo,Consolas,monospace;min-height:380px">' . esc($content) . '</textarea></div>';
    echo '<div style="padding:0 22px 18px"><button class="btn" type="submit">' . wt_icon('check', 15) . 'Сохранить файл</button></div></div></form>';
    wt_shell_close(); exit;
}

function wt_screen_plugins() {
    $active = wt_option('active_plugins', array()); if (!is_array($active)) $active = array();
    $files = array();
    foreach ((array)@glob(WT_ROOT . '/wt-content/plugins/*.php') as $f) $files[] = basename($f);
    wt_shell('plugins', 'Плагины', 'Установленные расширения — активные подключает ядро на каждой странице');
    echo '<p><a class="btn" href="' . esc_attr(wt_admin_url('&page=plugin-new')) . '">' . wt_icon('plus', 15) . 'Добавить новый</a></p>';
    echo '<div class="card np"><table><tr><th>Плагин</th><th>Статус</th><th></th></tr>';
    if (count($files) === 0) echo '<tr><td colspan="3" class="empty">' . wt_icon('plug', 28) . '<br>Плагинов пока нет. Загрузите .php-файл — он появится здесь.</td></tr>';
    foreach ($files as $f) {
        $on = in_array($f, $active, true);
        echo '<tr><td><span style="display:flex;align-items:center;gap:11px"><span style="width:34px;height:34px;flex:none;border-radius:10px;background:' . ($on ? '#e2f5f2' : '#eef2f3') . ';color:' . ($on ? '#0b7a6e' : '#5c7379') . ';display:grid;place-items:center">' . wt_icon('plug', 17) . '</span><span><b>' . esc($f) . '</b><br><span style="color:var(--mut);font-size:12px">Файл в каталоге плагинов</span></span></span></td>';
        echo '<td>' . ($on ? '<span class="badge b-ok">Активен</span>' : '<span class="badge b-mut">Отключён</span>') . '</td>';
        echo '<td class="row-inline">';
        wt_form_open(array('action' => 'plugin-toggle', 'file' => $f));
        echo '<button class="btn ' . ($on ? 'ghost' : 'amber') . ' sm" type="submit">' . ($on ? 'Отключить' : 'Активировать') . '</button></form></td></tr>';
    }
    echo '</table></div>';
    echo '<div class="card"><h2>Совместимость с WordPress</h2><p style="color:var(--mut);font-size:13.5px;margin:6px 0 0;line-height:1.7">Единое API хуков: <code>wt_add_action()</code>, <code>wt_add_filter()</code>. Плагины подключает <b>только ядро</b> (<code>wt_load_plugins()</code>) и только активированные — переключатель выше настоящий. Действия: <code>wt_head</code>, <code>wt_queue_*</code>; фильтры: <code>wt_title</code>, <code>wt_description</code>, <code>wt_excerpt_length</code>.</p></div>';
    wt_shell_close(); exit;
}

function wt_screen_plugin_new() {
    wt_shell('plugin-new', 'Добавить плагин', 'Загрузка .php-расширения в каталог плагинов');
    /* Пример кода — nowdoc: одинарные кавычки внутри НЕ ломают PHP */
    $example = <<<'WT_PLUGIN_EXAMPLE'
<?php
/**
 * Plugin Name: Мой плагин
 * Description: Пример расширения Wordtime
 */

// Свой вывод в <head> на каждой странице
wt_add_action('wt_head', function () {
    echo '<meta name="generator" content="Мой плагин">';
});

// Фильтр заголовков (аналог the_title в WordPress)
wt_add_filter('wt_title', function ($title) {
    return $title . ' — проверено плагином';
});

// Фоновая задача через очередь (выполняет wt-cron.php)
wt_add_action('wt_queue_my_task', function ($payload) {
    // обработка полезной нагрузки…
});
WT_PLUGIN_EXAMPLE;
    echo '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start">';
    echo '<div class="card"><h2>Загрузить плагин</h2><p style="color:var(--mut);font-size:13px;margin:4px 0 12px">Файл должен начинаться с <code>&lt;?php</code> и использовать хуки Wordtime. После загрузки активируйте его в списке.</p>';
    wt_form_open(array('action' => 'plugin-upload', 'enctype' => 1));
    echo '<input type="file" name="plugin" accept=".php" required>';
    echo '<p style="margin:16px 0 0"><button class="btn amber" type="submit">' . wt_icon('dl', 15) . 'Загрузить и проверить</button></p></form></div>';
    echo '<div class="card"><h2>Каркас плагина</h2><pre class="codebox" style="max-height:320px">' . esc($example) . '</pre></div></div>';
    wt_shell_close(); exit;
}

function wt_screen_import() {
    wt_shell('import', 'Импорт', 'Перенос данных в Wordtime: дамп SQL и экспорт WordPress');
    echo '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start">';
    echo '<div class="card"><h2>Импорт из дампа SQL</h2><p style="color:var(--mut);font-size:13px;margin:6px 0 12px">Подходит для переноса с другого сервера Wordtime или восстановления.</p>';
    wt_form_open(array('action' => 'backup-restore', 'enctype' => 1, 'back' => 'import'));
    echo '<input type="file" name="sql" accept=".sql" required>';
    echo '<label style="display:flex;gap:8px;align-items:center;margin-top:14px;font-weight:500;cursor:pointer"><input type="checkbox" name="confirm" value="1" style="width:auto"> понимаю, что текущая база будет перезаписана</label>';
    echo '<p style="margin:14px 0 0"><button class="btn" type="submit">' . wt_icon('dl', 15) . 'Импортировать</button></p></form></div>';
    echo '<div class="card"><h2>Перенос из WordPress</h2><p style="color:var(--mut);font-size:13.5px;line-height:1.8;margin:6px 0 0">1. В WordPress: «Инструменты → Экспорт» (WXR-файл) — сохраните контент.<br>2. Базу целиком перенесите дампом через phpMyAdmin и адаптацией префикса таблиц <code>wp_</code> → <code>' . esc(wt_prefix()) . '</code>.<br>3. Медиафайлы скопируйте в <code>wt-content/uploads/</code> через FTP — они подхватятся в библиотеке.<br>4. Плагины WordPress-типа подключаются через <code>wt-content/plugins/</code> и хуки.</p></div></div>';
    wt_shell_close(); exit;
}

function wt_screen_export() {
    wt_shell('export', 'Экспорт', 'Выгрузка данных сайта: полный архив, дамп базы, sitemap');
    echo '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
    echo '<div class="card" style="margin:0"><h2>Полный архив сайта (.zip)</h2><p style="color:var(--mut);font-size:13px;margin:6px 0 14px">Все файлы + дамп базы внутри. Подходит для переезда и резервных копий.</p>';
    wt_form_open(array('action' => 'backup-zip', 'back' => 'export'));
    echo '<button class="btn" type="submit">' . wt_icon('cloud', 15) . 'Создать архив</button></form></div>';
    echo '<div class="card" style="margin:0"><h2>Только база данных (.sql)</h2><p style="color:var(--mut);font-size:13px;margin:6px 0 14px">Быстрый дамп всех таблиц — записи, страницы, комментарии, настройки.</p>';
    wt_form_open(array('action' => 'backup-sql', 'back' => 'export'));
    echo '<button class="btn dark" type="submit">' . wt_icon('db', 15) . 'Сделать дамп</button></form></div></div>';
    echo '<div class="card"><h2>Публичные выгрузки</h2>';
    echo '<div class="kv"><b>Sitemap для поисковиков</b><span><a href="' . esc_attr(wt_url('sitemap.xml')) . '" target="_blank">?p=sitemap.xml ↗</a></span></div>';
    echo '<div class="kv"><b>Robots.txt</b><span><a href="' . esc_attr(wt_url('robots.txt')) . '" target="_blank">?p=robots.txt ↗</a></span></div>';
    echo '<div class="kv"><b>REST API (JSON)</b><span><a href="' . esc_attr(wt_base() . '/?rest=posts') . '" target="_blank">?rest=posts ↗</a></span></div>';
    echo '<p style="color:var(--mut);font-size:13px;margin:12px 0 0">Готовые копии скачивайте в разделе <a href="' . esc_attr(wt_admin_url('&page=settings&tab=backups')) . '">Настройки → Резервные копии</a>.</p></div>';
    wt_shell_close(); exit;
}

function wt_screen_migration() {
    wt_shell('migration', 'Миграция сайта', 'Переезд на другой хостинг или домен — встроенный аналог All-in-One WP Migration');
    echo '<div class="hello" style="padding:24px 28px"><h2 style="font-size:19px">Перенос в три шага</h2>';
    echo '<p style="margin:7px 0 0">Один архив содержит всё: ядро, тему, плагины, медиафайлы и дамп базы. На новом хостинге достаточно распаковать и импортировать базу.</p></div>';
    echo '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">';
    $steps = array(
        array('1', 'Скачайте полный архив', 'Кнопка ниже соберёт .zip всего сайта с дампом базы внутри.'),
        array('2', 'Распакуйте на новом хостинге', 'Файлы — в корень сайта, базу создайте в панели хостинга.'),
        array('3', 'Импортируйте базу', '«Инструменты → Импорт», файл .sql из архива — и сайт на месте.'),
    );
    foreach ($steps as $s) {
        echo '<div class="card" style="margin:0"><span style="width:30px;height:30px;border-radius:9px;background:#e2f5f2;color:#0b7a6e;display:grid;place-items:center;font:800 13px var(--disp)">' . $s[0] . '</span>';
        echo '<h2 style="font-size:14.5px;margin-top:12px">' . $s[1] . '</h2><p style="color:var(--mut);font-size:13px;margin:6px 0 0;line-height:1.65">' . $s[2] . '</p></div>';
    }
    echo '</div>';
    echo '<div class="card"><h2>Действия</h2><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">';
    wt_form_open(array('action' => 'backup-zip', 'back' => 'migration'));
    echo '<button class="btn amber" type="submit">' . wt_icon('cloud', 15) . 'Собрать миграционный пакет</button></form>';
    echo '<a class="btn ghost" href="' . esc_attr(wt_admin_url('&page=import')) . '">' . wt_icon('dl', 15) . 'Импортировать базу</a>';
    echo '<a class="btn ghost" href="' . esc_attr(wt_admin_url('&page=hosting')) . '">' . wt_icon('globe', 15) . 'Настройка хостинга</a>';
    echo '</div></div>';
    wt_shell_close(); exit;
}

function wt_screen_perf() {
    $cacheFiles = (array)@glob(WT_CACHE_DIR . '/*.cache');
    $dbSize = 0;
    try { $dbSize = (int)wt_db()->query("SELECT SUM(data_length + index_length) FROM information_schema.tables WHERE table_schema = DATABASE()")->fetchColumn(); } catch (Exception $e) {}
    wt_shell('perf', 'Скорость и кеш', 'Объектный и страничный кеш, автоочистка, показатели под нагрузкой');
    echo '<div class="stats">';
    echo '<div class="stat"><span class="ic" style="background:#fdf1d7;color:#92610a">' . wt_icon('zap', 17) . '</span><b style="font-size:19px">' . wt_fmt_kb(wt_cache_size()) . '</b><span>занято в кеше</span></div>';
    echo '<div class="stat"><span class="ic" style="background:#e2f5f2;color:#0b7a6e">' . wt_icon('file', 17) . '</span><b data-n="' . count($cacheFiles) . '">0</b><span>объектов кешировано</span></div>';
    echo '<div class="stat"><span class="ic" style="background:#eef2f3;color:#33525b">' . wt_icon('db', 17) . '</span><b style="font-size:19px">' . wt_fmt_kb($dbSize) . '</b><span>размер базы</span></div>';
    echo '<div class="stat"><span class="ic" style="background:#e5f5ec;color:#137a43">' . wt_icon('clock', 17) . '</span><b style="font-size:19px">' . number_format((microtime(true) - WT_START) * 1000, 0, ',', ' ') . ' мс</b><span>генерация этой страницы</span></div>';
    echo '</div>';
    echo '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start">';
    wt_form_open(array('action' => 'perf-save'));
    echo '<div class="card" style="margin:0"><h2>Кеширование</h2>';
    echo '<label style="display:flex;gap:10px;align-items:center;cursor:pointer;margin-top:8px"><input type="checkbox" name="cache_enabled" value="1" style="width:auto" ' . (wt_option('cache_enabled', true) ? 'checked' : '') . '> <b>Страничный кеш</b> — готовые страницы в wt-data/cache</label>';
    echo '<label>Автоочистка кеша</label><select name="auto_purge">';
    foreach (array('Каждый час', 'Каждые 6 часов', 'Раз в сутки', 'Раз в неделю', 'Никогда (вручную)') as $o) echo '<option ' . (wt_option('auto_purge', 'Раз в сутки') === $o ? 'selected' : '') . '>' . $o . '</option>';
    echo '</select>';
    echo '<p style="margin:16px 0 0"><button class="btn" type="submit">' . wt_icon('check', 15) . 'Сохранить</button></p></div></form>';
    echo '<div><div class="card" style="margin-bottom:18px"><h2>Обслуживание</h2>';
    wt_form_open(array('action' => 'cache-clear', 'back' => 'perf'));
    echo '<p style="color:var(--mut);font-size:13px;margin:4px 0 14px">Очистка нужна после правок темы, обновлений и восстановления базы.</p>';
    echo '<button class="btn amber" type="submit">' . wt_icon('zap', 15) . 'Очистить кеш сейчас</button></form></div>';
    echo '<div class="card" style="margin:0"><h2>Что уже в ядре</h2>';
    echo '<div class="kv"><b>Объектный кеш запросов</b><span class="badge b-ok">встроен</span></div>';
    echo '<div class="kv"><b>Подготовка SQL-запросов</b><span class="badge b-ok">PDO</span></div>';
    echo '<div class="kv"><b>Асинхронная очередь</b><span class="badge b-ok">wt-cron.php</span></div>';
    echo '<div class="kv"><b>Сжатие статики (gzip)</b><span class="badge b-ok">nginx / .htaccess</span></div>';
    echo '</div></div></div>';
    wt_shell_close(); exit;
}

function wt_screen_images() {
    $files = wt_media_files();
    $gd = function_exists('imagecreatefromstring');
    wt_shell('images', 'Изображения', 'Автоматическая оптимизация загружаемых изображений (GD)');
    echo '<div class="stats">';
    echo '<div class="stat"><span class="ic" style="background:#e2f5f2;color:#0b7a6e">' . wt_icon('image', 17) . '</span><b data-n="' . count($files) . '">0</b><span>файлов в библиотеке</span></div>';
    echo '<div class="stat"><span class="ic" style="background:#eef2f3;color:#33525b">' . wt_icon('db', 17) . '</span><b style="font-size:19px">' . wt_fmt_kb(wt_dir_size(WT_UPLOADS)) . '</b><span>занято на диске</span></div>';
    echo '<div class="stat"><span class="ic" style="background:' . ($gd ? '#e5f5ec' : '#fdf1d7') . ';color:' . ($gd ? '#137a43' : '#92610a') . '">' . wt_icon('check', 17) . '</span><b style="font-size:19px">' . ($gd ? 'GD' : 'нет GD') . '</b><span>обработка изображений</span></div>';
    echo '</div>';
    wt_form_open(array('action' => 'images-save'));
    echo '<div class="card"><h2>Настройки оптимизации</h2>';
    echo '<label style="display:flex;gap:10px;align-items:center;cursor:pointer;margin-top:8px"><input type="checkbox" name="img_auto" value="1" style="width:auto" ' . (wt_option('img_auto', true) ? 'checked' : '') . '> <b>Оптимизировать изображения при загрузке</b> — ресайз и пережатие на сервере</label>';
    echo '<div class="grid2"><div><label>Максимальная ширина (px)</label><input type="number" name="img_max_width" min="320" max="4096" value="' . (int)wt_option('img_max_width', 1920) . '"></div>';
    echo '<div><label>Качество JPEG/WebP (%)</label><input type="number" name="img_quality" min="40" max="100" value="' . (int)wt_option('img_quality', 82) . '"></div></div>';
    echo '<p style="margin:16px 0 0;display:flex;gap:10px;align-items:center"><button class="btn" type="submit">' . wt_icon('check', 15) . 'Сохранить</button>';
    if (!$gd) echo '<span class="badge b-amber">включите расширение GD в панели хостинга</span>';
    echo '</p></div></form>';
    wt_shell_close(); exit;
}

function wt_screen_sitemap() {
    $xml = wt_sitemap_xml();
    $url = wt_site_origin() . '/?p=sitemap.xml';
    wt_shell('sitemap', 'Sitemap', 'Карта сайта для поисковиков — генерируется автоматически из записей и страниц');
    echo '<div class="card np"><div class="hd"><h2>sitemap.xml</h2><span class="sp"></span>';
    echo '<button class="btn ghost sm" type="button" data-copy="' . esc_attr($xml) . '">' . wt_icon('copy', 13) . 'Копировать XML</button>';
    wt_form_open(array('action' => 'cache-clear', 'back' => 'sitemap'));
    echo '<button class="btn sm" type="submit">' . wt_icon('refresh', 13) . 'Перегенерировать</button></form>';
    echo '<a class="btn amber sm" href="' . esc_attr(wt_url('sitemap.xml')) . '" target="_blank">' . wt_icon('ext', 13) . 'Открыть</a></div>';
    echo '<div style="padding:14px 16px"><pre class="codebox">' . esc($xml) . '</pre></div></div>';
    echo '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
    echo '<div class="card" style="margin:0"><h2>Адрес для поисковиков</h2><div style="display:flex;gap:8px;align-items:center;margin-top:10px"><code style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' . esc($url) . '</code><button class="icobtn" type="button" data-copy="' . esc_attr($url) . '" title="Копировать">' . wt_icon('copy', 14) . '</button></div>';
    echo '<p style="color:var(--mut);font-size:13px;margin:12px 0 0;line-height:1.7">Добавьте этот адрес в <b>Яндекс.Вебмастер</b> и <b>Google Search Console</b>. Sitemap указан и в <a href="' . esc_attr(wt_url('robots.txt')) . '" target="_blank">robots.txt</a>.</p></div>';
    echo '<div class="card" style="margin:0"><h2>Что внутри</h2>';
    echo '<div class="kv"><b>Главная страница</b><span>приоритет 1.0</span></div>';
    echo '<div class="kv"><b>Записи</b><span>приоритет 0.8 · lastmod</span></div>';
    echo '<div class="kv"><b>Страницы</b><span>приоритет 0.6</span></div>';
    echo '<div class="kv"><b>Обновление</b><span>автоматически при правках</span></div>';
    echo '</div></div>';
    wt_shell_close(); exit;
}

function wt_screen_seo() {
    $site = wt_option('site_title', 'Wordtime');
    $tplT = (string)wt_option('title_template', '');
    $tplD = (string)wt_option('desc_template', '');
    $exTitle = $tplT !== '' ? strtr($tplT, array('{title}' => 'Пример записи', '{site}' => $site)) : 'Пример записи — ' . $site;
    $exDesc = $tplD !== '' ? strtr($tplD, array('{excerpt}' => 'Первые 150 символов текста записи…', '{site}' => $site)) : 'Первые 150 символов текста записи…';
    wt_shell('seo', 'SEO-заголовки', 'Title и description для поисковиков — автоматически в <head> каждой страницы');
    echo '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start">';
    wt_form_open(array('action' => 'seo-save'));
    echo '<div class="card" style="margin:0"><h2>Шаблоны</h2>';
    echo '<label>Шаблон title <span style="font-weight:500;color:var(--mut)">({title} — заголовок, {site} — название сайта)</span></label>';
    echo '<input type="text" name="title_template" value="' . esc_attr($tplT) . '" placeholder="{title} — {site}">';
    echo '<label>Шаблон description <span style="font-weight:500;color:var(--mut)">({excerpt} — выдержка текста)</span></label>';
    echo '<input type="text" name="desc_template" value="' . esc_attr($tplD) . '" placeholder="{excerpt}">';
    echo '<label>Description по умолчанию (пустые страницы)</label>';
    echo '<input type="text" name="desc_fallback" value="' . esc_attr((string)wt_option('desc_fallback', '')) . '" placeholder="Сайт работает на Wordtime CMS">';
    echo '<p style="margin:16px 0 0"><button class="btn" type="submit">' . wt_icon('check', 15) . 'Сохранить SEO-настройки</button></p></div></form>';
    echo '<div><div class="card"><h2>Предпросмотр сниппета Google</h2>';
    echo '<div style="border:1px solid var(--line);border-radius:12px;padding:16px 18px;background:#fff">';
    echo '<p style="margin:0;font-size:12px;color:#1a6b54">' . esc(isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'ваш-домен.ru') . ' › primer-zapisi</p>';
    echo '<p style="margin:3px 0;font-size:17.5px;color:#1a0dab;font-weight:600;line-height:1.3">' . esc($exTitle) . '</p>';
    echo '<p style="margin:0;font-size:13px;color:#4d5156;line-height:1.5">' . esc($exDesc) . '</p></div>';
    echo '<div class="kv" style="margin-top:12px"><b>Длина title</b><span class="badge ' . (mb_strlen($exTitle) <= 60 ? 'b-ok' : 'b-amber') . '">' . mb_strlen($exTitle) . ' / 60</span></div>';
    echo '<div class="kv"><b>Длина description</b><span class="badge ' . (mb_strlen($exDesc) <= 160 ? 'b-ok' : 'b-amber') . '">' . mb_strlen($exDesc) . ' / 160</span></div></div>';
    echo '<div class="card" style="margin:0"><h2>Где это в коде</h2>';
    $headExample = <<<'WT_HEAD'
<head>
  <meta charset="utf-8">
  <title>…автоматически из шаблона…</title>
  <meta name="description" content="…">
  <link rel="canonical" href="…">
  <meta property="og:title" content="…">
</head>
WT_HEAD;
    echo '<pre class="codebox" style="max-height:170px">' . esc($headExample) . '</pre>';
    echo '<p style="color:var(--mut);font-size:13px;margin:10px 0 0">Теги ставит функция <code>wt_head()</code> темы — title и description находятся в первых строках <code>&lt;head&gt;</code>, как любят поисковики.</p></div>';
    echo '</div></div>';
    wt_shell_close(); exit;
}

function wt_screen_api() {
    $keys = wt_db()->query('SELECT * FROM ' . wt_t('api_keys') . ' ORDER BY id DESC')->fetchAll();
    $base = wt_site_origin();
    wt_shell('api', 'Мобильные приложения и API', 'REST API для Android, iOS и любых клиентов');
    echo '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">';
    echo '<div class="card" style="margin:0"><h2>Создать ключ</h2>';
    wt_form_open(array('action' => 'key-create'));
    echo '<label>Название приложения</label><input type="text" name="name" placeholder="Моё приложение Android" required>';
    echo '<label>Права</label><select name="scopes"><option value="read">Только чтение</option><option value="read,comments">Чтение + комментарии</option><option value="admin">Полный доступ</option></select>';
    echo '<p style="margin:16px 0 0"><button class="btn" type="submit">' . wt_icon('key', 15) . 'Создать ключ</button></p></form></div>';
    echo '<div class="card" style="margin:0"><h2>Методы API</h2><p style="font-size:13px;color:var(--mut);line-height:2;margin:8px 0 0">';
    echo '<code>GET ' . esc($base) . '/?rest=posts</code> — записи<br><code>GET ' . esc($base) . '/?rest=pages</code> — страницы<br><code>GET ' . esc($base) . '/?rest=info</code> — информация о сайте<br><code>POST ' . esc($base) . '/?rest=comments</code> — комментарий (заголовок X-WT-Key)<br><code>POST ' . esc($base) . '/?rest=cache</code> — очистить кеш</p>';
    echo '<p style="font-size:12.5px;color:var(--mut);margin:10px 0 0">Лимит — 120 запросов в минуту на ключ. GET-методы без ключа доступны всем.</p></div></div>';
    echo '<div class="card np" style="margin-top:16px"><div class="hd"><h2>Выпущенные ключи</h2><span class="sp"></span><span style="color:var(--mut);font-size:12.5px">хранятся только в виде SHA-256</span></div><table><tr><th>Приложение</th><th>Права</th><th>Создан</th><th>Отпечаток</th><th></th></tr>';
    if (count($keys) === 0) echo '<tr><td colspan="5" class="empty">' . wt_icon('key', 28) . '<br>Ключей нет — создайте первый для мобильного приложения.</td></tr>';
    foreach ($keys as $k) {
        echo '<tr><td><b>' . esc($k['name']) . '</b></td><td><span class="badge b-teal">' . esc($k['scopes']) . '</span></td>';
        echo '<td style="color:var(--mut);white-space:nowrap">' . esc(date('d.m.Y', strtotime($k['created']))) . '</td>';
        echo '<td><code>' . esc(substr($k['key_hash'], 0, 12)) . '…</code></td><td class="row-inline">';
        wt_form_open(array('action' => 'key-delete', 'id' => $k['id']));
        echo '<button class="btn red sm" type="submit" onclick="return confirm(\'Отозвать ключ? Приложения с ним потеряют доступ.\')">Отозвать</button></form></td></tr>';
    }
    echo '</table></div>';
    wt_shell_close(); exit;
}

function wt_backups_body() {
    $files = array();
    foreach ((array)@glob(WT_DATA . '/backups/*') as $f) if (is_file($f)) $files[] = array('name' => basename($f), 'size' => filesize($f), 'time' => filemtime($f));
    usort($files, function ($a, $b) { return $b['time'] - $a['time']; });
    echo '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
    echo '<div class="card" style="margin:0"><h2>Полная копия сайта (.zip)</h2><p style="color:var(--mut);font-size:13px;margin:6px 0 14px">Все файлы: ядро, тема, плагины, медиафайлы + дамп базы внутри.</p>';
    wt_form_open(array('action' => 'backup-zip', 'back' => 'settings&tab=backups'));
    echo '<button class="btn" type="submit">' . wt_icon('cloud', 15) . 'Создать полную копию</button></form></div>';
    echo '<div class="card" style="margin:0"><h2>Только база данных (.sql)</h2><p style="color:var(--mut);font-size:13px;margin:6px 0 14px">Быстрый дамп всех таблиц ' . esc(wt_prefix()) . '*.</p>';
    wt_form_open(array('action' => 'backup-sql', 'back' => 'settings&tab=backups'));
    echo '<button class="btn dark" type="submit">' . wt_icon('db', 15) . 'Сделать дамп базы</button></form></div></div>';
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
    wt_form_open(array('action' => 'backup-restore', 'enctype' => 1, 'back' => 'settings&tab=backups'));
    echo '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><input type="file" name="sql" accept=".sql" required style="flex:1;min-width:220px">';
    echo '<label style="display:flex;gap:8px;align-items:center;margin:0;font-weight:500;cursor:pointer"><input type="checkbox" name="confirm" value="1" style="width:auto"> понимаю, что база будет перезаписана</label>';
    echo '<button class="btn amber" type="submit">' . wt_icon('refresh', 15) . 'Восстановить</button></div></form></div>';
}
function wt_screen_backups() {
    wt_shell('backups', 'Резервные копии', 'Полный архив сайта или только база — скачивание и восстановление');
    wt_backups_body();
    wt_shell_close(); exit;
}

function wt_screen_hosting() {
    $checks = array(
        array('PHP ' . PHP_VERSION, PHP_VERSION_ID >= 70400),
        array('PDO + MySQL', extension_loaded('pdo_mysql')),
        array('mbstring', extension_loaded('mbstring')),
        array('GD', extension_loaded('gd')),
        array('ZipArchive', class_exists('ZipArchive')),
        array('Запись в wt-data', is_writable(WT_DATA)),
    );
    wt_shell('hosting', 'Установка на хостинг', 'Классический стек: nginx или Apache + PHP 7.4–8.3 + MySQL/MariaDB');
    echo '<div class="hello" style="padding:24px 28px"><h2 style="font-size:19px">Wordtime уже работает здесь</h2>';
    echo '<p style="margin:7px 0 0">Сайт установлен и отвечает. Установщик заблокирован автоматически (самозащита). Ниже — требования, конфиг nginx и шаги переноса.</p></div>';
    echo '<div style="display:grid;grid-template-columns:1fr 1.3fr;gap:18px;align-items:start">';
    echo '<div class="card np" style="margin:0"><div class="hd"><h2>Требования хостинга</h2></div><table><tr><th>Компонент</th><th>Статус</th></tr>';
    foreach ($checks as $c) {
        echo '<tr><td><b>' . esc($c[0]) . '</b></td><td>' . ($c[1] ? '<span class="badge b-ok">' . wt_icon('check', 11) . ' Есть</span>' : '<span class="badge b-amber">' . wt_icon('alert', 11) . ' Нет</span>') . '</td></tr>';
    }
    echo '</table></div>';
    echo '<div class="card np" style="margin:0"><div class="hd"><h2>Конфиг nginx (из дистрибутива)</h2><span class="sp"></span>';
    $conf = WT_ROOT . '/nginx-wordtime.conf';
    if (is_file($conf)) echo '<button class="btn ghost sm" type="button" data-copy="' . esc_attr((string)file_get_contents($conf)) . '">' . wt_icon('copy', 13) . 'Копировать</button>';
    echo '</div><div style="padding:14px 16px">';
    if (is_file($conf)) echo '<pre class="codebox" style="max-height:300px">' . esc((string)file_get_contents($conf)) . '</pre>';
    else echo '<div class="empty">' . wt_icon('file', 26) . '<br>Файл nginx-wordtime.conf не найден — он есть в свежем дистрибутиве.</div>';
    echo '</div></div></div>';
    echo '<div class="card"><h2>Перенос на другой хостинг</h2><p style="color:var(--mut);font-size:13.5px;margin:6px 0 0;line-height:1.9">1. <a href="' . esc_attr(wt_admin_url('&page=migration')) . '">Миграция сайта</a> — собрать полный архив.<br>2. На новом хостинге распаковать архив в корень (public_html / /var/www).<br>3. Импортировать базу («Инструменты → Импорт») и, при необходимости, подключить <code>nginx-wordtime.conf</code> для красивых ссылок.</p></div>';
    wt_shell_close(); exit;
}

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
    echo '<div class="card np" style="margin:0"><div class="hd"><h2>Журнал событий</h2><span class="sp"></span><a class="btn ghost sm" href="' . esc_attr(wt_admin_url('&page=events')) . '">Все</a></div><div style="padding:14px 18px"><div class="logbox">';
    $events = wt_log_lines(12);
    if (count($events) === 0) echo '<i>Журнал пуст.</i>';
    foreach ($events as $e) echo '<i>' . esc($e[0]) . '</i> ' . esc($e[1]) . '<br>';
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

function wt_screen_settings() {
    global $tab;
    if ($tab === '') $tab = 'general';
    wt_shell('settings', 'Настройки', 'Общие, обсуждение, кеш, безопасность, резервные копии и страница входа');
    echo '<div class="tabs">';
    foreach (array('general' => 'Общие', 'comments' => 'Обсуждение', 'cache' => 'Кеш и скорость', 'security' => 'Безопасность и 2FA', 'backups' => 'Резервные копии', 'login' => 'Страница входа') as $k => $l) {
        echo '<a class="' . ($tab === $k ? 'on' : '') . '" href="' . esc_attr(wt_admin_url('&page=settings&tab=' . $k)) . '">' . $l . '</a>';
    }
    echo '</div>';
    if ($tab === 'general') {
        wt_form_open(array('action' => 'settings-save'));
        echo '<div class="card"><h2>Общие настройки</h2><div class="grid2"><div><label>Название сайта</label><input type="text" name="site_title" value="' . esc_attr(wt_option('site_title', 'Wordtime')) . '"></div>';
        echo '<div><label>Краткое описание</label><input type="text" name="tagline" value="' . esc_attr(wt_option('tagline', '')) . '"></div></div>';
        echo '<label>Почта администратора</label><input type="email" name="admin_email" value="' . esc_attr(wt_option('admin_email', '')) . '">';
        echo '<div class="grid2"><div><label>Язык сайта</label><input type="text" value="Русский (зафиксировано)" disabled style="opacity:.6;cursor:not-allowed"></div>';
        echo '<div><label>Часовой пояс</label><select name="timezone">';
        foreach (array('Калининград (UTC+2)', 'Москва (UTC+3)', 'Самара (UTC+4)', 'Екатеринбург (UTC+5)', 'Новосибирск (UTC+7)', 'Владивосток (UTC+10)') as $tz) echo '<option ' . (wt_option('timezone', 'Москва (UTC+3)') === $tz ? 'selected' : '') . '>' . $tz . '</option>';
        echo '</select></div></div>';
        echo '<div class="grid2"><div><label>Формат даты</label><select name="date_format">';
        foreach (array('d.m.Y' => '12.02.2026', 'j F Y' => '12 февраля 2026', 'd.m.Y H:i' => '12.02.2026 14:30') as $k => $l) {
            echo '<option value="' . $k . '" ' . (wt_option('date_format', 'd.m.Y') === $k ? 'selected' : '') . '>' . $l . '</option>';
        }
        echo '</select></div>';
        echo '<div><label>Записей на странице</label><input type="number" name="posts_per_page" min="1" max="50" value="' . (int)wt_option('posts_per_page', 12) . '"></div></div>';
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
        echo '<label style="display:flex;gap:10px;align-items:center;cursor:pointer"><input type="checkbox" name="require_email" value="1" style="width:auto" ' . (wt_option('require_email', false) ? 'checked' : '') . '> Требовать имя и почту для комментирования</label>';
        echo '<div class="grid2"><div><label>Закрывать комментарии через (дней)</label><input type="number" name="close_after_days" min="1" value="' . (int)wt_option('close_after_days', 30) . '"></div></div>';
        echo '<p style="margin:16px 0 0"><button class="btn" type="submit">' . wt_icon('check', 15) . 'Сохранить</button></p></div></form>';
    } elseif ($tab === 'cache') {
        $on = (bool)wt_option('cache_enabled', true);
        wt_form_open(array('action' => 'cache-toggle'));
        echo '<div class="card"><h2>Страничный кеш</h2>';
        echo '<label style="display:flex;gap:10px;align-items:center;cursor:pointer;margin:6px 0 0"><input type="checkbox" name="cache_enabled" value="1" style="width:auto" ' . ($on ? 'checked' : '') . ' onchange="this.form.submit()"> <b>' . ($on ? 'Кеш включён — страницы отдаются из wt-data/cache' : 'Кеш отключён') . '</b></label></div></form>';
        echo '<div class="card" style="background:linear-gradient(140deg,#071b21,#0d323c);border-color:#174753;color:#eaf4f4"><h2 style="color:#fff">Сейчас в кеше: ' . wt_fmt_kb(wt_cache_size()) . '</h2>';
        echo '<p style="color:#9fc0c5;font-size:13.5px;margin:6px 0 14px">Очистка нужна после правок дизайна, обновлений и восстановления базы. Подробные настройки — «Оптимизация → Скорость и кеш».</p>';
        wt_form_open(array('action' => 'cache-clear', 'back' => 'settings&tab=cache'));
        echo '<button class="btn amber" type="submit">' . wt_icon('zap', 15) . 'Очистить кеш сайта</button></form></div>';
    } elseif ($tab === 'security') {
        echo '<div class="card" style="border-color:#bfe5cf"><h2>Двухфакторная аутентификация</h2>';
        echo '<p style="margin:6px 0 0"><span class="badge b-ok">' . wt_icon('shield', 11) . ' 2FA обязательна для всех</span> <span class="badge b-ok">блокировка после 5 попыток · 60 сек</span> <span class="badge b-ok">подготовка SQL-запросов</span> <span class="badge b-ok">экранирование вывода</span></p>';
        echo '<p style="color:var(--mut);font-size:13.5px;margin:10px 0 0;line-height:1.7">Коды отправляются на почту. Если SMTP не настроен, код сохраняется в защищённый файл <code>wt-data/2fa-log.txt</code> на сервере.</p></div>';
        wt_form_open(array('action' => 'smtp-save'));
        echo '<div class="card"><h2>SMTP для писем и кодов 2FA</h2><div class="grid2">';
        echo '<div><label>SMTP-сервер</label><input type="text" name="smtp_host" value="' . esc_attr(defined('WT_SMTP_HOST') ? WT_SMTP_HOST : '') . '" placeholder="smtp.хостер.ru"></div>';
        echo '<div><label>Порт</label><input type="number" name="smtp_port" value="' . (int)(defined('WT_SMTP_PORT') ? WT_SMTP_PORT : 587) . '"></div>';
        echo '<div><label>Логин</label><input type="text" name="smtp_user" value="' . esc_attr(defined('WT_SMTP_USER') ? WT_SMTP_USER : '') . '"></div>';
        echo '<div><label>Пароль</label><input type="password" name="smtp_pass" value="' . esc_attr(defined('WT_SMTP_PASS') ? WT_SMTP_PASS : '') . '"></div></div>';
        echo '<label>От кого (From)</label><input type="text" name="smtp_from" value="' . esc_attr(defined('WT_MAIL_FROM') ? WT_MAIL_FROM : '') . '" placeholder="Wordtime <no-reply@ваш-домен>">';
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
    } elseif ($tab === 'backups') {
        wt_backups_body();
    } elseif ($tab === 'login') {
        wt_form_open(array('action' => 'login-style'));
        echo '<div class="card"><h2>Кастомизация страницы входа</h2>';
        echo '<p style="color:var(--mut);font-size:13.5px;margin:4px 0 10px">Так страницу входа и подтверждения 2FA увидят пользователи.</p>';
        echo '<div class="grid2"><div><label>Название на странице</label><input type="text" name="logo" value="' . esc_attr(wt_option('login_logo', 'Wordtime')) . '"></div>';
        echo '<div><label>Акцентный цвет (HEX)</label><input type="text" name="accent" value="' . esc_attr(wt_option('login_accent', '#14b8a6')) . '" placeholder="#14b8a6"></div></div>';
        echo '<label>Сообщение под логотипом</label><input type="text" name="message" value="' . esc_attr(wt_option('login_message', 'Вход защищён двухфакторной аутентификацией')) . '">';
        echo '<label>Подпись в нижней панели</label><input type="text" name="side" value="' . esc_attr(wt_option('login_side', 'Быстро. Безопасно. По-русски.')) . '">';
        echo '<p style="margin:16px 0 0;display:flex;gap:10px"><button class="btn" type="submit">' . wt_icon('check', 15) . 'Сохранить оформление</button> <a class="btn ghost" href="' . esc_attr(wt_admin_url('&action=logout&wt_nonce=' . wt_nonce('logout'))) . '">Выйти и посмотреть</a></p></div></form>';
    }
    wt_shell_close(); exit;
}
