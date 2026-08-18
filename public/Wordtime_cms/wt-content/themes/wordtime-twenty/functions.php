<?php
/**
 * Wordtime Twenty — файл темы (аналог functions.php в WordPress)
 * Здесь подключаются плагины и настраиваются фильтры.
 */
if (!defined('WT_ROOT')) exit;

/* Плагины темы: каждый файл в wt-content/plugins/*.php подключается автоматически */
$wt_plugin_dir = WT_ROOT . '/wt-content/plugins';
if (is_dir($wt_plugin_dir)) {
    foreach ((array)glob($wt_plugin_dir . '/*.php') as $wt_pf) {
        require_once $wt_pf;
    }
}

/* Фильтр: длина автоматического описания (description) */
wt_add_filter('wt_excerpt_length', function ($len) { return 42; });

/* Фильтр: добавляем год к заголовку вкладки на главной */
wt_add_filter('wt_title', function ($title) { return $title; });

/* Действие: счётчик просмотров записи (демо хука wt_head) */
wt_add_action('wt_head', function () {
    echo "<meta name=\"generator\" content=\"Wordtime CMS " . WT_VERSION . "\">\n";
});
