<?php
/**
 * Wordtime CMS — обработчик асинхронной очереди (запускается по cron)
 * Добавьте в cron:  * * * * * php /путь/к/сайту/wt-cron.php
 * В ISPmanager/cPanel — раздел «Планировщик»/«Cron Jobs».
 */
define('WT_ROOT', __DIR__);
if (!file_exists(WT_ROOT . '/wt-config.php')) { exit('Wordtime не установлен'); }
require WT_ROOT . '/wt-config.php';
require WT_ROOT . '/wt-includes/bootstrap.php';

$done = wt_queue_run(20);

/* Автоочистка кеша по расписанию из консоли («Оптимизация → Скорость и кеш») */
$purge = wt_option('auto_purge', 'Раз в сутки');
$flag = WT_DATA . '/last-purge';
$last = is_file($flag) ? (int)file_get_contents($flag) : 0;
$intervals = array('Каждый час' => 3600, 'Каждые 6 часов' => 21600, 'Раз в сутки' => 86400, 'Раз в неделю' => 604800);
if (isset($intervals[$purge]) && time() - $last > $intervals[$purge]) {
    wt_cache_flush();
    @file_put_contents($flag, (string)time());
    $done .= ' +кеш';
}

echo date('Y-m-d H:i:s') . " wt-cron: выполнено задач: " . $done . "\n";
