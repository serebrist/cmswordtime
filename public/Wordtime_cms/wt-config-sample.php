<?php
/**
 * Wordtime CMS 1.0.5 — образец конфигурации.
 * Установщик создаёт настоящий wt-config.php автоматически.
 * Этот файл нужен только для ручной установки: скопируйте в wt-config.php.
 */

/* ── База данных (MariaDB / MySQL) ── */
define('DB_HOST', 'localhost');
define('DB_NAME', 'wordtime_db');
define('DB_USER', 'wordtime_user');
define('DB_PASSWORD', 'замените-на-пароль');
define('TABLE_PREFIX', 'wt_');

/* ── Путь к сайту: '' — корень домена, '/Wordtime_cms' — подпапка ── */
define('WT_BASE', '');

/* ── Ключи безопасности: сгенерируйте заново — bin2hex(random_bytes(32)) ── */
define('AUTH_KEY', 'сгенерируйте-64-случайных-символа');
define('SECURE_KEY', 'ещё-64-случайных-символа');

/* ── Режимы ── */
define('WT_DEBUG', false);      /* true — показывать ошибки при разработке */
define('WT_PRETTY', false);     /* true — красивые ссылки после подключения nginx-wordtime.conf */

/* ── SMTP для кодов 2FA и писем.
   Если сервер пуст — код входа сохраняется в защищённый файл wt-data/2fa-log.txt ── */
define('WT_SMTP_HOST', '');
define('WT_SMTP_PORT', 587);
define('WT_SMTP_USER', '');
define('WT_SMTP_PASS', '');
define('WT_MAIL_FROM', '');     /* например: Wordtime <no-reply@ваш-домен.ru> */
