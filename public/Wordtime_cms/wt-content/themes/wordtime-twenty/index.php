<?php
/**
 * Wordtime Twenty — стартовая тема Wordtime CMS
 * Лента, записи (с виджетами и паролем), страницы, поиск, меню из консоли.
 */
if (!defined('WT_ROOT')) exit;

$p = isset($_GET['p']) ? (string)$_GET['p'] : '';
$s = isset($_GET['s']) ? trim((string)$_GET['s']) : '';
$category = isset($_GET['category']) ? (string)$_GET['category'] : '';
if (strpos($p, 'category:') === 0) $category = substr($p, 9);

$post = null; $page = null;
if (strpos($p, 'post:') === 0) $post = wt_post_by_slug(substr($p, 5));
if (strpos($p, 'page:') === 0) $page = wt_page_by_slug(substr($p, 5));

$menuItems = wt_option('site_menu', null);
$customMenu = is_array($menuItems) && count($menuItems) > 0;

$site = wt_option('site_title', 'Wordtime');
$tagline = wt_option('tagline', '');

$title = $site; $desc = $tagline !== '' ? $tagline : (string)wt_option('desc_fallback', 'Сайт работает на Wordtime CMS');
if ($post) { $title = $post['post_title']; $desc = wt_excerpt($post['post_content'], 150); }
if ($page) { $title = $page['title']; $desc = wt_excerpt($page['content'], 150); }
if ($s !== '') $title = 'Поиск: «' . $s . '»';
if ($category !== '') $title = 'Рубрика: ' . $category;
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wt_head($title, $desc); ?>
<?php if (function_exists('wp_head')) wp_head(); /* стили и скрипты WP-плагинов */ ?>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;800&family=Golos+Text:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?php echo esc_attr(wt_asset('wt-content/themes/' . basename(wt_theme_dir()) . '/style.css')); ?>">
</head>
<body>
<header class="hdr">
  <div class="wrap hdr-in">
    <a class="brand" href="<?php echo esc_attr(wt_base() . '/'); ?>">
      <span class="mark"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h10M7 20.5h10"/><path d="M8 3.5v3.2c0 2.3 1.6 3.5 3 4.6l1 .7 1-.7c1.4-1.1 3-2.3 3-4.6V3.5M8 20.5v-3.2c0-2.3 1.6-3.5 3-4.6l1-.7 1 .7c1.4 1.1 3 2.3 3 4.6v3.2"/></svg></span>
      <?php echo esc($site); ?>
    </a>
    <nav class="nav">
      <?php if ($customMenu): ?>
        <?php foreach ($menuItems as $it): if (!is_array($it)) continue; ?>
          <?php $ext = preg_match('#^https?://#i', (string)$it['url']); ?>
          <a href="<?php echo wt_menu_href($it['url']); ?>"<?php echo $ext ? ' target="_blank" rel="noopener"' : ''; ?>><?php echo esc($it['label']); ?></a>
        <?php endforeach; ?>
      <?php else: ?>
        <a href="<?php echo esc_attr(wt_base() . '/'); ?>">Главная</a>
        <?php foreach (wt_pages_list() as $pg): if ($pg['status'] !== 'published') continue; ?>
          <a href="<?php echo esc_attr(wt_permalink_page($pg)); ?>"><?php echo esc($pg['title']); ?></a>
        <?php endforeach; ?>
      <?php endif; ?>
    </nav>
    <form class="srch" method="get" action="<?php echo esc_attr(wt_base() . '/'); ?>">
      <input type="search" name="s" placeholder="Поиск…" value="<?php echo esc_attr($s); ?>">
    </form>
  </div>
</header>

<div class="wrap body">
<?php if ($post): ?>
  <article class="post">
    <p class="muted"><?php echo esc($post['category']); ?> · <?php echo esc(date((string)wt_option('date_format', 'd.m.Y'), strtotime($post['post_date']))); ?> · <?php echo esc($post['post_author']); ?></p>
    <h1><?php echo esc($post['post_title']); ?></h1>
    <?php if ($post['post_image'] !== ''): ?><img class="cover" src="<?php echo esc_url($post['post_image']); ?>" alt="<?php echo esc($post['post_title']); ?>"><?php endif; ?>

    <?php if (!wt_post_unlocked($post)): /* запись под паролем */ ?>
      <form method="post" class="cmform" style="max-width:420px;margin:26px 0">
        <p class="muted">Эта запись защищена паролем. Введите пароль, чтобы прочитать её.</p>
        <input type="password" name="wt_post_pass" placeholder="Пароль" required autofocus>
        <button class="btn" type="submit">Открыть запись</button>
      </form>
    <?php else: ?>
      <div class="content">
        <?php foreach (preg_split('/\n{2,}/', (string)$post['post_content']) as $block): $block = trim($block); if ($block === '') continue; ?>
          <p><?php echo str_replace("\n", "<br>", $block); ?></p>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </article>

  <?php if (wt_post_unlocked($post)): ?>
  <div class="post-cols">
    <div class="post-main">
      <section class="comments">
        <h2>Комментарии (<?php echo count(wt_comments_of($post['id'])); ?>)</h2>
        <?php if (isset($_GET['cm'])): ?>
          <p class="muted"><?php echo $_GET['cm'] === 'ok' ? 'Комментарий отправлен — спасибо!' : 'Не удалось сохранить комментарий.'; ?></p>
        <?php endif; ?>
        <?php if (wt_option('comments_disabled', false)): ?>
          <p class="muted">Комментарии на сайте отключены.</p>
        <?php else: ?>
          <?php foreach (wt_comments_of($post['id']) as $c): ?>
            <div class="cm"><b><?php echo esc($c['author']); ?></b> <span class="muted"><?php echo esc(date('d.m.Y H:i', strtotime($c['created']))); ?></span><p><?php echo esc($c['text']); ?></p></div>
          <?php endforeach; ?>
          <form method="post" action="<?php echo esc_attr(wt_url('comment-add')); ?>" class="cmform">
            <input type="hidden" name="wt_nonce" value="<?php echo wt_nonce('comment'); ?>">
            <input type="hidden" name="post_id" value="<?php echo (int)$post['id']; ?>">
            <input type="hidden" name="redirect_to" value="<?php echo esc_url(wt_permalink($post)); ?>">
            <input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">
            <div class="cmrow">
              <input type="text" name="author" placeholder="Ваше имя" required>
              <input type="email" name="email" placeholder="Почта (не публикуется)">
            </div>
            <textarea name="text" rows="4" placeholder="Ваш комментарий…" required></textarea>
            <button class="btn" type="submit">Отправить комментарий</button>
          </form>
        <?php endif; ?>
      </section>
    </div>
    <aside class="post-side">
      <?php wt_render_sidebar('sidebar-1'); /* виджеты — как в WordPress */ ?>
    </aside>
  </div>
  <?php endif; ?>

<?php elseif ($page): ?>
  <article class="post">
    <h1><?php echo esc($page['title']); ?></h1>
    <div class="content">
      <?php foreach (preg_split('/\n{2,}/', (string)$page['content']) as $block): $block = trim($block); if ($block === '') continue; ?>
        <p><?php echo str_replace("\n", "<br>", $block); ?></p>
      <?php endforeach; ?>
    </div>
  </article>

<?php else: /* лента */ ?>
  <?php $posts = wt_posts(array('limit' => (int)wt_option('posts_per_page', 12), 's' => $s, 'category' => $category)); ?>
  <?php if ($s !== ''): ?><h1 class="list-h">Поиск: «<?php echo esc($s); ?>»</h1><?php endif; ?>
  <?php if ($category !== ''): ?><h1 class="list-h">Рубрика: <?php echo esc($category); ?></h1><?php endif; ?>
  <?php if (count($posts) === 0): ?>
    <p class="note">Записей пока нет — добавьте первую в консоли (адрес сайта + <code>?admin=1</code>).</p>
  <?php else: ?>
    <div class="grid">
      <?php foreach ($posts as $it): ?>
        <a class="card" href="<?php echo esc_attr(wt_permalink($it)); ?>">
          <?php if ($it['post_image'] !== ''): ?>
            <img src="<?php echo esc_url($it['post_image']); ?>" alt="<?php echo esc($it['post_title']); ?>">
          <?php else: ?>
            <span class="ph"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10.5" r="1.6"/><path d="m5 17.5 4.5-4 3 2.6 3.5-3.6 3.5 3.5"/></svg></span>
          <?php endif; ?>
          <span class="card-b">
            <span class="cat" style="color:var(--teal)"><?php echo esc($it['category']); ?></span>
            <h3><?php echo esc($it['post_title']); ?></h3>
            <p><?php echo esc(wt_excerpt($it['post_content'])); ?></p>
            <span class="date"><?php echo esc(date((string)wt_option('date_format', 'd.m.Y'), strtotime($it['post_date']))); ?><?php echo !empty($it['post_password']) ? ' · 🔒' : ''; ?></span>
          </span>
        </a>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
<?php endif; ?>
</div>

<footer class="ftr">
  <div class="wrap ftr-cols">
    <div class="ftr-col">
      <b style="color:#fff;font-family:var(--disp);font-weight:800"><?php echo esc($site); ?></b>
      <p class="muted" style="margin:8px 0 0;color:#8fb4ba;font-size:13px"><?php echo esc($tagline !== '' ? $tagline : 'Работает на Wordtime CMS ' . WT_VERSION); ?></p>
    </div>
    <div class="ftr-col"><?php wt_render_sidebar('footer-1'); ?></div>
    <div class="ftr-col"><?php wt_render_sidebar('footer-2'); ?></div>
  </div>
  <div class="wrap" style="margin-top:22px;padding-top:16px;border-top:1px solid #123844">
    <a href="<?php echo esc_attr(wt_url('sitemap.xml')); ?>">Sitemap</a> · <a href="<?php echo esc_attr(wt_admin_url()); ?>">Консоль</a>
  </div>
</footer>
<?php wt_footer(); /* хуки wp_footer: скрипты WP-плагинов */ ?>
</body>
</html>
