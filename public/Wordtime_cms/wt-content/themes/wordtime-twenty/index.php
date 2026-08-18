<?php
/**
 * Wordtime Twenty — стартовая тема (шаблон сайта)
 * Подключается из index.php; все данные берутся из функций ядра.
 */
if (!defined('WT_ROOT')) { http_response_code(403); exit; }

$view = $GLOBALS['wt_view'];
$p = $view['route'];
$siteTitle = wt_option('site_title', 'Wordtime');
$tagline = wt_option('tagline', '');
$accent = wt_option('login_accent', '#0e9384');

$single = null; $pageRow = null; $cat = ''; $search = '';
if (strpos($p, 'post:') === 0) { $single = wt_post_by_slug(substr($p, 5)); }
elseif (strpos($p, 'page:') === 0) { $pageRow = wt_page_by_slug(substr($p, 5)); }
elseif (strpos($p, 'category:') === 0) { $cat = substr($p, 9); }
if (isset($_GET['s'])) $search = trim(strip_tags((string)$_GET['s']));

/* title и description — автоматически, в правильном месте <head> */
if ($single) {
    $title = $single['post_title'] . ' — ' . $siteTitle;
    $desc = wt_excerpt($single['post_content'], 30);
} elseif ($pageRow) {
    $title = $pageRow['title'] . ' — ' . $siteTitle;
    $desc = wt_excerpt($pageRow['content'], 30);
} elseif ($cat !== '') {
    $title = 'Рубрика: ' . $cat . ' — ' . $siteTitle;
    $desc = 'Все записи рубрики «' . $cat . '» на сайте ' . $siteTitle;
} elseif ($search !== '') {
    $title = 'Поиск: ' . $search . ' — ' . $siteTitle;
    $desc = 'Результаты поиска по запросу «' . $search . '»';
} else {
    $title = $siteTitle . ($tagline !== '' ? ' — ' . $tagline : '');
    $desc = $tagline !== '' ? $tagline : 'Сайт на Wordtime CMS: записи, страницы, комментарии.';
}
$posts = wt_posts(array('limit' => 12, 'category' => $cat, 's' => $search));
?><!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wt_head($title, $desc); ?>
<link rel="stylesheet" href="<?php echo esc_url(wt_asset('wt-content/themes/wordtime-twenty/style.css')); ?>">
<link rel="alternate" type="application/xml" title="Sitemap" href="<?php echo esc_url(wt_url('sitemap.xml')); ?>">
</head>
<body>
<header class="hdr">
  <div class="wrap hdr-in">
    <a class="brand" href="<?php echo esc_url(wt_base() . '/'); ?>">
      <span class="mark">⧗</span><?php echo esc($siteTitle); ?>
    </a>
    <nav class="nav">
      <a href="<?php echo esc_url(wt_base() . '/'); ?>">Главная</a>
      <?php foreach (wt_pages_list() as $pg): if ($pg['status'] !== 'published') continue; ?>
        <a href="<?php echo esc_url(wt_pretty('page', $pg['slug'])); ?>"><?php echo esc($pg['title']); ?></a>
      <?php endforeach; ?>
    </nav>
    <form class="srch" method="get" action="<?php echo esc_url(wt_base() . '/'); ?>">
      <input type="hidden" name="p" value="search"><input name="s" value="<?php echo esc_attr($search); ?>" placeholder="Поиск…">
    </form>
  </div>
</header>

<main class="wrap body">
<?php if ($single): ?>
  <article class="post">
    <p class="crumbs"><a href="<?php echo esc_url(wt_base() . '/'); ?>">Главная</a> → <a href="<?php echo esc_url(wt_url('category:' . $single['category'])); ?>"><?php echo esc($single['category']); ?></a></p>
    <h1><?php echo esc($single['post_title']); ?></h1>
    <p class="meta"><?php echo esc(date('d.m.Y', strtotime($single['post_date']))); ?> · <?php echo esc($single['post_author']); ?></p>
    <?php if ($single['post_image'] !== ''): ?><img class="cover" src="<?php echo esc_url($single['post_image']); ?>" alt=""><?php endif; ?>
    <div class="content"><?php echo nl2br(wt_kses($single['post_content'])); ?></div>

    <section class="cmts">
      <h2>Комментарии · <?php echo count(wt_comments_of($single['id'], 'approved')); ?></h2>
      <?php if (isset($_GET['cm']) && $_GET['cm'] === 'ok'): ?><p class="note ok">Комментарий отправлен на модерацию.</p><?php endif; ?>
      <?php if (isset($_GET['cm']) && $_GET['cm'] === 'err'): ?><p class="note err"><?php echo esc(wt_option('last_comment_error', 'Не удалось сохранить комментарий.')); ?></p><?php endif; ?>
      <?php if (wt_option('comments_disabled', false)): ?>
        <p class="note">Комментарии на сайте отключены администратором.</p>
      <?php else: ?>
        <?php foreach (wt_comments_of($single['id'], 'approved') as $c): ?>
          <div class="cmt"><b><?php echo esc($c['author']); ?></b> <span><?php echo esc(date('d.m.Y H:i', strtotime($c['created']))); ?></span><p><?php echo esc($c['text']); ?></p></div>
        <?php endforeach; ?>
        <form class="cmt-form" method="post" action="<?php echo esc_url(wt_url('comment-add')); ?>">
          <input type="hidden" name="wt_nonce" value="<?php echo wt_nonce('comment'); ?>">
          <input type="hidden" name="post_id" value="<?php echo (int)$single['id']; ?>">
          <input type="hidden" name="redirect_to" value="<?php echo esc_url(wt_pretty('post', $single['slug'])); ?>">
          <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off">
          <div class="row2">
            <input name="author" placeholder="Ваше имя" required>
            <input name="email" type="email" placeholder="Почта (не показывается)">
          </div>
          <textarea name="text" rows="4" placeholder="Ваш комментарий…" required></textarea>
          <button type="submit" style="background:<?php echo esc_attr($accent); ?>">Отправить</button>
        </form>
      <?php endif; ?>
    </section>
  </article>

<?php elseif ($pageRow): ?>
  <article class="post">
    <h1><?php echo esc($pageRow['title']); ?></h1>
    <div class="content"><?php echo nl2br(wt_kses($pageRow['content'])); ?></div>
  </article>

<?php else: ?>
  <?php if ($cat !== ''): ?><h1 class="list-h">Рубрика: <?php echo esc($cat); ?></h1><?php endif; ?>
  <?php if ($search !== ''): ?><h1 class="list-h">Поиск: «<?php echo esc($search); ?>»</h1><?php endif; ?>
  <?php if (count($posts) === 0): ?>
    <p class="note">Записей пока нет — добавьте первую в консоли (адрес сайта + ?admin=1).</p>
  <?php else: ?>
  <div class="grid">
    <?php foreach ($posts as $r): ?>
      <a class="card" href="<?php echo esc_url(wt_pretty('post', $r['slug'])); ?>">
        <?php if ($r['post_image'] !== ''): ?><img src="<?php echo esc_url($r['post_image']); ?>" alt=""><?php else: ?><div class="ph" style="background:linear-gradient(120deg,#0c2e36,<?php echo esc_attr($accent); ?>)">⧗</div><?php endif; ?>
        <div class="card-b">
          <span class="cat" style="color:<?php echo esc_attr($accent); ?>"><?php echo esc($r['category']); ?></span>
          <h3><?php echo esc($r['post_title']); ?></h3>
          <p><?php echo esc(wt_excerpt($r['post_content'], 26)); ?></p>
          <span class="date"><?php echo esc(date('d.m.Y', strtotime($r['post_date']))); ?> · <?php echo count(wt_comments_of($r['id'], 'approved')); ?> комм.</span>
        </div>
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
