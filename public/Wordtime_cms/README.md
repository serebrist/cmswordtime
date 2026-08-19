# Wordtime CMS 1.0.5

Классическая PHP-CMS: **nginx или Apache · PHP 7.4–8.3 (FPM) · MySQL 5.7+ / MariaDB 10+**.
Без Docker и Composer — только файлы и база. Весь интерфейс — на русском.

## Что внутри

- Вход в консоль **только с 2FA** (шести-значный код на почту), блокировка после 5 неудачных попыток
- Записи, страницы, комментарии с модерацией, медиафайлы с **GD-оптимизацией при загрузке**
- Темы и **плагины WordPress-типа** (хуки `wt_add_action` / `wt_add_filter`); активные плагины подключает только ядро
- Меню сайта из консоли отображается в шапке темы
- Резервные копии: **ZIP всего сайта** (аналог All-in-One WP Migration) + дамп SQL + восстановление
- REST API `/?rest=posts|pages|info|comments|cache` для мобильных приложений (ключи в консоли)
- Sitemap (`/?p=sitemap.xml`), robots.txt, автоматические title/description в `<head>`
- Работает и в корне домена, и в подпапке — путь определяется автоматически

## Установка (любой хостинг)

1. Распакуйте архив в корень сайта (`public_html`, `httpdocs` или `/var/www/…`).
2. Создайте базу MySQL в панели хостинга (имя, пользователь, пароль).
3. Откройте домен в браузере — **установщик запустится автоматически**:
   проверка окружения → данные базы → сайт и администратор → SMTP (необязательно).
4. Готово: сайт работает, консоль — по адресу `ваш-домен/?admin=1`.

**Установщик защищён сам**: после успешной установки `install.php` показывает
«Wordtime уже установлен» и больше не запускается (как в WordPress) — и на Apache,
и на nginx. Для чистой переустановки удалите `wt-config.php`.

## nginx + PHP 8.3-FPM (VPS)

Стек: `nginx`, `php8.3-fpm`, `php8.3-mysql`, `mariadb-server`.

```
sudo mysql -e "CREATE DATABASE wordtime CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; \
  CREATE USER 'wordtime'@'localhost' IDENTIFIED BY 'СЛОЖНЫЙ_ПАРОЛЬ'; \
  GRANT ALL ON wordtime.* TO 'wordtime'@'localhost'; FLUSH PRIVILEGES;"
sudo unzip Wordtime_cms.zip -d /var/www/
sudo chown -R www-data:www-data /var/www/Wordtime_cms
sudo cp /var/www/Wordtime_cms/nginx-wordtime.conf /etc/nginx/sites-available/wordtime.conf
# поправьте server_name и root в wordtime.conf
sudo ln -s /etc/nginx/sites-available/wordtime.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Откройте домен — дальше всё сделает веб-установщик.
Красивые ссылки `/post/slug/` включаются этим конфигом; без него работают `?p=…`.
HTTPS: `sudo certbot --nginx`.

## Cron (асинхронные задачи и автоочистка кеша)

```
* * * * * php /var/www/Wordtime_cms/wt-cron.php >> /var/log/wt-cron.log 2>&1
```

## Почта и коды 2FA

- Настроен SMTP (`wt-config.php` или консоль → Настройки → Безопасность и 2FA) — коды приходят письмом.
- SMTP нет — код сохраняется в защищённый файл `wt-data/2fa-log.txt` (права 600).

## Обновление

Скачайте свежий `Wordtime_cms.zip`, замените файлы (кроме `wt-config.php`,
`wt-data/` и `wt-content/uploads/`). База и настройки не затрагиваются.

## Структура

```
index.php               фронт-контроллер (сайт, REST API, ?admin=1)
install.php             веб-установщик (самоблокируется после установки)
wt-config.php           создаётся установщиком (вне архива)
wt-includes/bootstrap.php  ядро: PDO, хуки, 2FA, кеш, REST, бэкапы
wt-admin/               консоль управления
wt-content/themes/      темы (wordtime-twenty — стартовая)
wt-content/plugins/     плагины (подключает ядро, только активные)
wt-content/uploads/     медиафайлы
wt-data/                кеш, бэкапы, журналы (закрыт от веба)
nginx-wordtime.conf     готовый конфиг nginx
wt-cron.php             обработчик очереди
```
