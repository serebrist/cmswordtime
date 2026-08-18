# Wordtime CMS 1.0.5 — установка на классический хостинг

Классическая PHP-система управления: **nginx или Apache + PHP 7.4–8.3 (FPM) + MySQL/MariaDB**.
Работает и в корне домена, и в подпапке — базовый путь определяется автоматически.

## Что внутри

    index.php                     фронт-контроллер (сайт, REST API, сервисные маршруты)
    install.php                   веб-установщик
    wt-config-sample.php          образец конфигурации
    wt-cron.php                   асинхронная очередь (cron)
    nginx-wordtime.conf           готовый конфиг nginx + php8.3-fpm
    wt-includes/bootstrap.php     ядро: PDO, хуки, кеш, 2FA, анти-брутфорс, REST
    wt-admin/index.php            консоль (вход: адрес/?admin=1)
    wt-content/themes/            темы (wordtime-twenty — стартовая)
    wt-content/plugins/           плагины (*.php подключаются автоматически)
    wt-content/uploads/           медиафайлы

## Способ 1 — хостинг с панелью (cPanel, ISPmanager, Plesk)

1. Создайте базу MySQL/MariaDB, пользователя и пароль, привяжите все права.
2. «Диспетчер файлов» → корень сайта (public_html) → загрузите архив → распакуйте
   так, чтобы `index.php` оказался в корне сайта.
3. Откройте домен — запустится установщик: данные БД, администратор, SMTP (необязательно).
4. Консоль: откройте адрес сайта и добавьте `?admin=1`. Вход — пароль + код 2FA.
5. Удалите `install.php` после установки.

## Способ 2 — VPS с nginx + PHP 8.3-FPM + MariaDB

    unzip Wordtime_cms.zip -d /var/www/
    sudo chown -R www-data:www-data /var/www/Wordtime_cms
    sudo mysql -e "CREATE DATABASE wordtime CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    cp /var/www/Wordtime_cms/nginx-wordtime.conf /etc/nginx/sites-available/wordtime.conf
    # поправьте server_name и root в wordtime.conf
    ln -s /etc/nginx/sites-available/wordtime.conf /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx

Откройте домен → установщик → готово. HTTPS: `certbot --nginx`.

Без подключения конфига CMS тоже работает — по маршрутам `/?p=...` и `/?admin=1`.

## Вход в консоль и 2FA

Адрес: `https://ваш-домен/?admin=1` (или `/Wordtime_cms/?admin=1` в подпапке).
После пароля на почту приходит шести-значный код (5 минут, 5 попыток,
блокировка подбора — 60 секунд после 5 неудачных попыток).

**Если письма не приходят:** на многих хостингах функция `mail()` отключена.
Варианты:
- укажите SMTP в установщике или позже: консоль → Настройки → Безопасность;
- без SMTP код записывается в защищённый файл `wt-data/2fa-log.txt`
  (откройте его через файловый менеджер хостинга).

## REST API для мобильных приложений

    GET  /?rest=posts        список записей        (и /wt/v1/posts при красивых ссылках)
    GET  /?rest=pages        страницы
    GET  /?rest=info         информация о сайте
    POST /?rest=comments     новый комментарий     (заголовок X-WT-Key)
    POST /?rest=cache        очистить кеш          (заголовок X-WT-Key)

Ключи создаются в консоли: «API и приложения». Лимит — 120 запросов в минуту.

## Резервные копии

Консоль → «Резервные копии»: ZIP всего сайта (файлы + дамп БД) или отдельный
дамп `.sql`; скачивание, восстановление, удаление.

## Cron (асинхронные задачи)

    * * * * * php /путь/к/сайту/wt-cron.php >> /var/log/wordtime-cron.log 2>&1

## Совместимость с WordPress

Плагины WordPress-типа кладутся в `wt-content/plugins/` и подключаются
автоматически; в коде доступны хуки `wt_add_action()` / `wt_add_filter()`
(аналог `add_action` / `add_filter`).
