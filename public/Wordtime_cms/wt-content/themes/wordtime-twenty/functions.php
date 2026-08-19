<?php
/**
 * Theme Name: Wordtime Twenty
 * Wordtime CMS — функции стартовой темы.
 *
 * ВАЖНО: тема НЕ подключает плагины. Плагины загружает только ядро
 * (wt_load_plugins() в wt-includes/bootstrap.php) и только активированные
 * в консоли («Плагины → Активировать»). Здесь — только хуки самой темы.
 */
if (!defined('WT_ROOT')) exit;

/* Длина выдержки текста в карточках (в словах-символах) */
wt_add_filter('wt_excerpt_length', function ($len) {
    return 44;
});

/* Своя строка в <head> — пример действия темы */
wt_add_action('wt_head', function () {
    echo '<meta name="generator" content="Wordtime ' . WT_VERSION . '">' . "\n";
});
