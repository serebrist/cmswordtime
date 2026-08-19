<?php
/**
 * Wordtime Twenty — стартовая тема (вывод сайта)
 */
if (!defined('WT_ROOT')) exit;

$siteTitle = wt_option('site_title', 'Wordtime');
$tagline = wt_option('tagline', '');
$p = isset($_GET['p']) ? (string)$_GET['p'] : '';
$search = isset($_GET['s']) ? trim(strip_tags((string)$_GET['s'])) : '';
$post = null; $pageRow = null; $category = '';

if (strpos($p, 'post:') === 0) $post = wt_post_by_slug(substr($p, 5));
elseif (strpos($p, 'page:') === 0) $pageRow = wt_page_by_slug(substr($p, 5));
elseif (strpos($p, 'category:') === 0) $category = substr($p, 9);

if ($post !== null && $post && $post['post_status'] === 'published') {
    wt_head($post['post_title'] . ' — ' . $siteTitle, wt_excerpt($post['post_content'], 150), wt_pretty('post', $post['slug']));
} elseif ($pageRow !== null && $pageRow) {
    wt_head($pageRow['title'] . ' — ' . $siteTitle, wt_excerpt($pageRow['content'], 150));
} elseif ($search !== '') {
    wt_head('Поиск: ' . $search . ' — ' . $siteTitle, 'Результаты поиска по сайту ' . $siteTitle);
} else {
    wt_head($siteTitle . ($tagline !== '' ? ' — ' . $tagline : ''), wt_option('desc_fallback', 'Сайт работает на Wordtime CMS'));
}

/* Меню сайта: из консоли (опция site_menu) или по умолчанию */
$menuItems = wt_option('site_menu', null);
$customMenu = is_array($menuItems) && count($menuItems) > 0;
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800;900&family=Golos+Text:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="<?php echo esc_url(wt_asset('wt-content/themes/' . basename(wt_theme_dir()) . '/style.css')); ?>">
</head>
<body>
<header class="hdr"><div class="wrap hdr-in">
  <a class="brand" href="<?php echo esc_url(wt_base() . '/'); ?>"><span class="mark"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h10M7 20.5h10"/><path d="M8 3.5v3.2c0 2.3 1.6 3.5 3 4.6l1 .7 1-.7c1.4-1.1 3-2.3 3-4.6V3.5M8 20.5v-3.2c0-2.3 1.6-3.5 3-4.6l1-.7 1 .7c1.4 1.1 3 2.3 3 4.6v3.2"/></svg></span><?php echo esc($siteTitle); ?></a>
  <nav class="nav">
    <?php if ($customMenu): ?>
      <?php foreach ($menuItems as $it): ?>
        <?php $ext = preg_match('#^https?://#i', (string)$it['url']); ?>
        <a href="<?php echo wt_menu_href($it['url']); ?>"<?php echo $ext ? ' target="_blank" rel="noopener"' : ''; ?>><?php echo esc($it['label']); ?></a>
      <?php endforeach; ?>
    <?php else: ?>
      <a href="<?php echo esc_url(wt_base() . '/'); ?>">Главная</a>
      <?php foreach (wt_pages_list() as $pg): if ($pg['status'] === 'published'): ?>
        <a href="<?php echo esc_url(wt_pretty('page', $pg['slug'])); ?>"><?php echo esc($pg['title']); ?></a>
      <?php endif; endforeach; ?>
    <?php endif; ?>
  </nav>
  <form class="srch" method="get" action="<?php echo esc_url(wt_base() . '/'); ?>"><input type="search" name="s" placeholder="Поиск…" value="<?php echo esc_attr($search); ?>"></form>
</div></header>

<main class="body wrap">
<?php if ($post !== null && $post): ?>
  <article class="post">
    <p class="cat" style="color:var(--teal)"><?php echo esc($post['category']); ?> · <?php echo esc(date('d.m.Y', strtotime($post['post_date']))); ?> · <?php echo esc($post['post_author']); ?></p>
    <h1><?php echo esc($post['post_title']); ?></h1>
    <?php if ($post['post_image'] !== ''): ?><p><img class="cover" src="<?php echo esc_url($post['post_image']); ?>" alt=""></p><?php endif; ?>
    <div class="content"><?php echo nl2br(esc($post['post_content'])); ?></div>

    <section class="comments">
      <h2>Комментарии · <?php echo count(wt_comments_of($post['id'])); ?></h2>
      <?php if (wt_option('comments_disabled', false)): ?>
        <p class="muted">Комментарии на сайте отключены администратором.</p>
      <?php else: ?>
        <?php foreach (wt_comments_of($post['id']) as $c): ?>
          <div class="cm"><b><?php echo esc($c['author']); ?></b> <span class="muted"><?php echo esc(date('d.m.Y H:i', strtotime($c['created']))); ?></span><p><?php echo esc($c['text']); ?></p></div>
        <?php endforeach; ?>
        <form class="cmform" method="post" action="<?php echo esc_url(wt_url('comment-add')); ?>">
          <input type="hidden" name="wt_nonce" value="<?php echo wt_nonce('comment'); ?>">
          <input type="hidden" name="post_id" value="<?php echo (int)$post['id']; ?>">
          <input type="hidden" name="redirect_to" value="<?php echo esc_url(wt_pretty('post', $post['slug'])); ?>">
          <input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">
          <div class="cmrow">
            <input type="text" name="author" placeholder="Ваше имя" required>
            <input type="email" name="email" placeholder="Почта (не публикуется)" <?php echo wt_option('require_email', false) ? 'required' : ''; ?>>
          </div>
          <textarea name="text" rows="3" placeholder="Ваш комментарий…" required></textarea>
          <button class="btn" type="submit">Отправить комментарий</button>
        </form>
      <?php endif; ?>
    </section>
  </article>

<?php elseif ($pageRow !== null && $pageRow): ?>
  <article class="post">
    <h1><?php echo esc($pageRow['title']); ?></h1>
    <div class="content"><?php echo nl2br(esc($pageRow['content'])); ?></div>
  </article>

<?php else: ?>
  <?php if ($search !== ''): ?><h1 class="list-h">Поиск: «<?php echo esc($search); ?>»</h1><?php endif; ?>
  <?php $posts = wt_posts(array('limit' => (int)wt_option('posts_per_page', 12), 's' => $search, 'category' => $category)); ?>
  <?php if (count($posts) === 0): ?>
    <p class="note">Записей пока нет — добавьте первую в консоли (адрес сайта + ?admin=1).</p>
  <?php else: ?>
  <div class="grid">
    <?php foreach ($posts as $r): ?>
      <a class="card" href="<?php echo esc_url(wt_pretty('post', $r['slug'])); ?>">
        <?php if ($r['post_image'] !== ''): ?><img src="<?php echo esc_url($r['post_image']); ?>" alt="" loading="lazy"><?php else: ?><span class="ph"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 3.5h10M7 20.5h10"/><path d="M8 3.5v3.2c0 2.3 1.6 3.5 3 4.6l1 .7 1-.7c1.4-1.1 3-2.3 3-4.6V3.5M8 20.5v-3.2c0-2.3 1.6-3.5 3-4.6l1-.7 1 .7c1.4 1.1 3 2.3 3 4.6v3.2"/></svg></span><?php endif; ?>
        <span class="card-b">
          <span class="cat" style="color:var(--teal)"><?php echo esc($r['category']); ?></span>
          <h3><?php echo esc($r['post_title']); ?></h3>
          <p><?php echo esc(wt_excerpt($r['post_content'])); ?></p>
          <span class="date"><?php echo esc(date('d.m.Y', strtotime($r['post_date']))); ?> · <?php echo esc($r['post_author']); ?></span>
        </span>
      </a>
    <?php endforeach; ?>
  </div>
  <?php endif; ?>
<?php endif; ?>
</main>

<footer class="ftr">
  <div class="wrap">
    <b><?php echo esc($siteTitle); ?></b><?php if ($tagline !== '') echo ' · ' . esc($tagline); ?><br>
    <span>Работает на Wordtime <?php echo WT_VERSION; ?> · <a href="<?php echo esc_url(wt_url('sitemap.xml')); ?>">sitemap</a> · <a href="<?php echo esc_url(wt_admin_url()); ?>">консоль</a></span>
  </div>
</footer>
</body>
</html>
