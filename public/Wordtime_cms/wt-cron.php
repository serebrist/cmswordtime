<?php
/**
 * Wordtime CMS — обработчик асинхронной очереди (WT-Крон)
 * Запускается системным cron каждую минуту:
 *   * * * * * php /путь/к/сайту/wt-cron.php >> /var/log/wordtime-cron.log 2>&1
 * В панелях (cPanel / ISPmanager) — раздел «Планировщик заданий».
 */
if (php_sapi_name() !== 'cli') { http_response_code(403); exit('CLI only'); }
if (!defined('WT_ROOT')) define('WT_ROOT', __DIR__);
if (!file_exists(WT_ROOT . '/wt-config.php')) { fwrite(STDERR, "Wordtime не установлен\n"); exit(1); }

require WT_ROOT . '/wt-config.php';
require WT_ROOT . '/wt-includes/bootstrap.php';

$done = wt_queue_run(20);
echo date('c'), ' — выполнено задач: ', $done, "\n";

/* раз в сутки: чистим устаревший кеш и счётчики блокировок */
if (date('Hi') === '0300') {
    wt_cache_flush();
    wt_db()->exec('DELETE FROM ' . wt_t('login_attempts') . ' WHERE locked_until < ' . time());
    echo date('c'), " — плановая очистка кеша и счётчиков\n";
}
