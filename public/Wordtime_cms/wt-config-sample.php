<?php
/**
 * Wordtime CMS — образец конфигурации.
 * Обычно создавать вручную не нужно: установщик создаёт wt-config.php сам.
 * Вручную — только для переноса: скопируйте в wt-config.php и заполните.
 */
define('DB_HOST', 'localhost');
define('DB_NAME', 'wordtime');
define('DB_USER', 'wordtime');
define('DB_PASSWORD', 'СЛОЖНЫЙ_ПАРОЛЬ');
define('TABLE_PREFIX', 'wt_');

/* Базовый путь: '' — сайт в корне домена, '/blog' — сайт в подпапке */
define('WT_BASE', '');

/* Секретные ключи — сгенерируйте новые (например, openssl rand -hex 32) */
define('AUTH_KEY', 'замените-на-случайную-строку-64-символа');
define('SECURE_KEY', 'замените-на-другую-случайную-строку-64-символа');

/* SMTP для писем и кодов 2FA (пустой хост — попытка mail(), затем файл wt-data/2fa-log.txt) */
define('WT_SMTP_HOST', '');
define('WT_SMTP_PORT', '587');
define('WT_SMTP_USER', '');
define('WT_SMTP_PASS', '');
define('WT_MAIL_FROM', '');

/* define('WT_DEBUG', true); — показывать ошибки PHP (только на время отладки) */
/* define('WT_PRETTY', true); — красивые ссылки /post/slug/ (нужен nginx-wordtime.conf) */
