<?php
/**
 * Wordtime CMS — слой совместимости с WordPress API.
 * Подключается ядром после основных функций. Позволяет устанавливать
 * плагины и темы WordPress: знакомые им функции работают поверх ядра Wordtime.
 *
 * Покрыто: хуки, опции, i18n-заглушки, экранирование, URL, enqueue,
 * шорткоды, виджеты (register_sidebar / dynamic_sidebar / WP_Widget),
 * wpautop, get_posts, wp_trim_words и другие часто используемые API.
 */
if (defined('WT_COMPAT_LOADED')) return;
define('WT_COMPAT_LOADED', true);

if (!defined('ABSPATH'))          define('ABSPATH', WT_ROOT . '/');
if (!defined('WPINC'))            define('WPINC', 'wt-includes');
if (!defined('WP_CONTENT_DIR'))   define('WP_CONTENT_DIR', WT_ROOT . '/wt-content');
if (!defined('WP_PLUGIN_DIR'))    define('WP_PLUGIN_DIR', WT_CONTENT_DIR . '/plugins');
if (!defined('WP_CONTENT_URL'))   define('WP_CONTENT_URL', wt_asset('wt-content'));
if (!defined('WP_PLUGIN_URL'))    define('WP_PLUGIN_URL', wt_asset('wt-content/plugins'));

/* ── Хуки (1:1 поверх ядра) ───────────────────────────────────────── */
function add_action($tag, $fn, $priority = 10, $args = 1) { wt_add_action($tag, $fn, $priority); return true; }
function add_filter($tag, $fn, $priority = 10, $args = 1) { wt_add_filter($tag, $fn, $priority); return true; }
function do_action($tag, ...$args) { call_user_func_array('wt_do_action', array_merge(array($tag), $args)); }
function apply_filters($tag, $value, ...$args) { return call_user_func_array('wt_apply_filters', array_merge(array($tag, $value), $args)); }
function remove_action($tag, $fn, $priority = 10) { wt_remove_hook('a', $tag, $fn, $priority); return true; }
function remove_filter($tag, $fn, $priority = 10) { wt_remove_hook('f', $tag, $fn, $priority); return true; }
function has_action($tag, $fn = false) { return wt_has_hook('a', $tag, $fn); }
function has_filter($tag, $fn = false) { return wt_has_hook('f', $tag, $fn); }
function did_action($tag) { return isset($GLOBALS['wt_did'][$tag]) ? $GLOBALS['wt_did'][$tag] : 0; }

/* ── Опции ────────────────────────────────────────────────────────── */
function get_option($name, $default = false) {
    $v = wt_option($name, null);
    return $v === null ? $default : $v;
}
function update_option($name, $value, $autoload = null) { wt_set_option($name, $value); return true; }
function add_option($name, $value = '', $deprecated = '', $autoload = 'yes') {
    if (wt_option($name, null) === null) wt_set_option($name, $value);
    return true;
}
function delete_option($name) { wt_set_option($name, null); return true; }

/* ── i18n-заглушки (Wordtime — только русский, строки возвращаются как есть) ── */
function __($text, $domain = 'default') { return $text; }
function _e($text, $domain = 'default') { echo $text; }
function _x($text, $context, $domain = 'default') { return $text; }
function _n($single, $plural, $number, $domain = 'default') { return $number == 1 ? $single : $plural; }
function esc_html__($text, $domain = 'default') { return esc($text); }
function esc_attr__($text, $domain = 'default') { return esc_attr($text); }
function esc_html_e($text, $domain = 'default') { echo esc($text); }
function esc_attr_e($text, $domain = 'default') { echo esc_attr($text); }

/* ── Экранирование и санитизация ──────────────────────────────────── */
function esc_html($s) { return esc($s); }
function esc_textarea($s) { return esc($s); }
function esc_sql($s) { return is_array($s) ? array_map('esc_sql', $s) : addslashes((string)$s); }
function sanitize_text_field($s) { return trim(preg_replace('/[\r\n\t ]+/', ' ', strip_tags((string)$s))); }
function sanitize_title($s) { return wt_slugify($s); }
function sanitize_key($s) { return preg_replace('/[^a-z0-9_\-]/', '', strtolower((string)$s)); }
function sanitize_file_name($s) { return preg_replace('/[^a-z0-9._-]/i', '-', (string)$s); }
function wp_kses_post($html) { return wt_kses($html); }
function wp_strip_all_tags($s, $break = false) { return trim(strip_tags((string)$s)); }
function absint($n) { return abs((int)$n); }

/* ── URL ──────────────────────────────────────────────────────────── */
function home_url($path = '', $scheme = null) { return wt_base() . '/' . ltrim((string)$path, '/'); }
function site_url($path = '', $scheme = null) { return home_url($path, $scheme); }
function get_home_url($blog_id = null, $path = '') { return home_url($path); }
function admin_url($path = '', $scheme = 'admin') { return wt_admin_url($path !== '' ? '&' . ltrim($path, '&') : ''); }
function content_url($path = '') { return wt_asset('wt-content' . ($path !== '' ? '/' . ltrim($path, '/') : '')); }
function includes_url($path = '') { return wt_asset('wt-includes' . ($path !== '' ? '/' . ltrim($path, '/') : '')); }
function plugins_url($path = '', $plugin = '') {
    $base = wt_asset('wt-content/plugins');
    if ($plugin !== '') {
        $dir = basename(dirname((string)$plugin));
        if ($dir !== '.' && $dir !== 'plugins') $base .= '/' . $dir;
    }
    return $path !== '' ? $base . '/' . ltrim($path, '/') : $base;
}
function plugin_dir_path($file) { return rtrim(dirname((string)$file), '/\\') . '/'; }
function plugin_dir_url($file) { return plugins_url('', $file) . '/'; }
function plugin_basename($file) { return basename(dirname((string)$file)) . '/' . basename((string)$file); }
function trailingslashit($s) { return rtrim((string)$s, '/\\') . '/'; }
function untrailingslashit($s) { return rtrim((string)$s, '/\\'); }

/* ── Тема ─────────────────────────────────────────────────────────── */
function get_template_directory() { return wt_theme_dir(); }
function get_stylesheet_directory() { return wt_theme_dir(); }
function get_template_directory_uri() { return wt_asset('wt-content/themes/' . basename(wt_theme_dir())); }
function get_stylesheet_directory_uri() { return get_template_directory_uri(); }
function get_stylesheet_uri() { return get_template_directory_uri() . '/style.css'; }
function wp_get_theme() {
    $name = basename(wt_theme_dir());
    $css = wt_theme_dir() . '/style.css';
    if (is_file($css) && preg_match('/Theme Name:\s*(.+)/i', (string)file_get_contents($css), $m)) $name = trim($m[1]);
    return new class($name) {
        private $n;
        public function __construct($n) { $this->n = $n; }
        public function get($h = '') { return $this->n; }
        public function get_template() { return basename(wt_theme_dir()); }
        public function __toString() { return $this->n; }
    };
}
function get_header($name = null) { wt_do_action('get_header'); }
function get_footer($name = null) { wt_footer(); }

/* ── Enqueue: стили и скрипты собираются и выводятся в wp_head/wp_footer ── */
function wp_enqueue_style($handle, $src = '', $deps = array(), $ver = false, $media = 'all') {
    if ($src === '') return;
    $GLOBALS['wt_enq_css'][$handle] = array($src, $ver, $media);
}
function wp_enqueue_script($handle, $src = '', $deps = array(), $ver = false, $in_footer = false) {
    if ($src === '') return;
    $GLOBALS['wt_enq_js'][$handle] = array($src, $ver, $in_footer);
}
function wp_register_style($h, $s = '', $d = array(), $v = false, $m = 'all') { wp_enqueue_style($h, $s, $d, $v, $m); }
function wp_register_script($h, $s = '', $d = array(), $v = false, $f = false) { wp_enqueue_script($h, $s, $d, $v, $f); }
function wp_localize_script($handle, $obj, $data) {
    $GLOBALS['wt_enq_local'][$handle][] = array($obj, $data);
    return true;
}
function wp_head() {
    /* Хук wt_head уже вызывается ядром (wt_head()); здесь — только
       плагины WordPress и подключённые ими стили.                      */
    wt_do_action('wp_head');
    if (!empty($GLOBALS['wt_enq_css'])) {
        foreach ($GLOBALS['wt_enq_css'] as $h => $e) {
            echo '<link rel="stylesheet" id="' . esc_attr($h) . '-css" href="' . esc_url($e[0]) . ($e[1] ? '?ver=' . esc_attr($e[1]) : '') . '" media="' . esc_attr($e[2]) . '">' . "\n";
        }
    }
}
function wp_footer() {
    if (!empty($GLOBALS['wt_enq_local'])) {
        foreach ($GLOBALS['wt_enq_local'] as $h => $list) {
            foreach ($list as $pair) {
                echo '<script>var ' . preg_replace('/[^a-zA-Z0-9_$]/', '', $pair[0]) . ' = ' . json_encode($pair[1], JSON_UNESCAPED_UNICODE) . ";</script>\n";
            }
        }
    }
    if (!empty($GLOBALS['wt_enq_js'])) {
        foreach ($GLOBALS['wt_enq_js'] as $h => $e) {
            echo '<script id="' . esc_attr($h) . '-js" src="' . esc_url($e[0]) . ($e[1] ? '?ver=' . esc_attr($e[1]) : '') . '"></script>' . "\n";
        }
    }
    wt_do_action('wp_footer');
}
function wp_body_open() { wt_do_action('wp_body_open'); }

/* ── Шорткоды ─────────────────────────────────────────────────────── */
function add_shortcode($tag, $fn) { $GLOBALS['wt_shortcodes'][$tag] = $fn; }
function shortcode_exists($tag) { return isset($GLOBALS['wt_shortcodes'][$tag]); }
function do_shortcode($content) {
    if (empty($GLOBALS['wt_shortcodes'])) return $content;
    $tags = implode('|', array_map('preg_quote', array_keys($GLOBALS['wt_shortcodes'])));
    /* [tag attr="x"]…[/tag] и самозакрывающиеся [tag attr="x" /] */
    $content = preg_replace_callback(
        '/\[(' . $tags . ')([^\]]*?)\](?:(.*?)\[\/\1\])?/s',
        function ($m) {
            $tag = $m[1];
            $attrs = array();
            if (preg_match_all('/(\w+)\s*=\s*"([^"]*)"/', $m[2], $am, PREG_SET_ORDER)) {
                foreach ($am as $a) $attrs[$a[1]] = $a[2];
            }
            return call_user_func($GLOBALS['wt_shortcodes'][$tag], $attrs, isset($m[3]) ? $m[3] : '', $tag);
        },
        (string)$content
    );
    return $content;
}

/* ── Записи (поверх ядра) ─────────────────────────────────────────── */
function get_posts($args = array()) {
    $map = array('numberposts' => 'limit', 'posts_per_page' => 'limit', 'category_name' => 'category', 's' => 's', 'offset' => 'offset');
    $out = array();
    foreach ($args as $k => $v) if (isset($map[$k])) $out[$map[$k]] = $v;
    $rows = wt_posts($out);
    return array_map(function ($r) { return (object)$r; }, $rows);
}
function get_the_title($post = null) {
    if (is_object($post) || is_array($post)) { $r = (array)$post; return isset($r['post_title']) ? $r['post_title'] : ''; }
    return '';
}
function wp_trim_words($text, $num = 55, $more = '…') {
    $words = preg_split('/\s+/', trim(strip_tags((string)$text)));
    if (count($words) <= $num) return implode(' ', $words);
    return implode(' ', array_slice($words, 0, $num)) . ' ' . $more;
}
function wpautop($text) {
    $text = (string)$text;
    if (strpos($text, '<p>') !== false) return $text;
    $blocks = preg_split('/\n\s*\n/', trim($text));
    $out = '';
    foreach ($blocks as $b) {
        $b = trim($b);
        if ($b === '') continue;
        $out .= '<p>' . str_replace("\n", "<br>\n", $b) . "</p>\n";
    }
    return $out;
}

/* ── Виджеты: области (sidebars) + нативные виджеты Wordtime + классы WP_Widget ── */
function register_sidebar($args = array()) {
    $d = array_merge(array('id' => 'sidebar-1', 'name' => 'Сайдбар', 'description' => '',
        'before_widget' => '<div class="widget %1$s">', 'after_widget' => '</div>',
        'before_title' => '<h3 class="widget-title">', 'after_title' => '</h3>'), $args);
    if (empty($d['id']) && !empty($d['id_base'])) $d['id'] = $d['id_base'];
    $GLOBALS['wt_sidebars'][$d['id']] = $d;
    return $d['id'];
}
function wp_get_sidebars() {
    $base = array(
        'sidebar-1' => array('id' => 'sidebar-1', 'name' => 'Сайдбар', 'description' => 'Боковая колонка на странице записи',
            'before_widget' => '<div class="widget %1$s">', 'after_widget' => '</div>',
            'before_title' => '<h3 class="widget-title">', 'after_title' => '</h3>'),
        'footer-1' => array('id' => 'footer-1', 'name' => 'Подвал: колонка 1', 'description' => 'Первая колонка подвала',
            'before_widget' => '<div class="widget %1$s">', 'after_widget' => '</div>',
            'before_title' => '<h3 class="widget-title">', 'after_title' => '</h3>'),
        'footer-2' => array('id' => 'footer-2', 'name' => 'Подвал: колонка 2', 'description' => 'Вторая колонка подвала',
            'before_widget' => '<div class="widget %1$s">', 'after_widget' => '</div>',
            'before_title' => '<h3 class="widget-title">', 'after_title' => '</h3>'),
    );
    /* темы регистрируют свои области через register_sidebar в functions.php */
    foreach ((array)(isset($GLOBALS['wt_sidebars']) ? $GLOBALS['wt_sidebars'] : array()) as $id => $s) $base[$id] = $s;
    return $base;
}
function is_active_sidebar($id) { return count(wt_widgets_of($id)) > 0; }
function dynamic_sidebar($id) { wt_render_sidebar($id); return is_active_sidebar($id); }

/** Минимальная база WP_Widget: плагин описывает класс, менеджер Wordtime его исполняет */
class WP_Widget {
    public $id_base = ''; public $name = ''; public $widget_options = array();
    public function __construct($id_base = '', $name = '', $widget_options = array(), $control_options = array()) {
        $this->id_base = $id_base; $this->name = $name; $this->widget_options = $widget_options;
    }
    public function widget($args, $instance) { /* переопределяется в плагине */ }
    public function update($new, $old) { return $new; }
    public function form($instance) { return ''; }
}
function register_widget($class) {
    $obj = is_string($class) ? new $class() : $class;
    $GLOBALS['wt_widget_classes'][get_class($obj)] = $obj;
}

/* ── Разное, часто встречающееся в плагинах ───────────────────────── */
function wp_parse_args($args, $defaults = array()) { return array_merge((array)$defaults, (array)$args); }
function wp_json_encode($data, $options = 0, $depth = 512) { return json_encode($data, $options | JSON_UNESCAPED_UNICODE); }
function wp_send_json($data, $code = null) { if ($code) http_response_code($code); header('Content-Type: application/json; charset=utf-8'); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function wp_send_json_success($data = null) { wp_send_json(array('success' => true, 'data' => $data)); }
function wp_send_json_error($data = null) { wp_send_json(array('success' => false, 'data' => $data)); }
function wp_die($message = '', $title = '', $args = array()) { http_response_code(500); exit(is_scalar($message) ? esc((string)$message) : ''); }
function wp_nonce_field($action = -1, $name = '_wpnonce', $referer = true, $echo = true) {
    $f = '<input type="hidden" name="' . esc_attr($name) . '" value="' . wt_nonce((string)$action) . '">';
    if ($echo) echo $f; return $f;
}
function wp_verify_nonce($nonce, $action = -1) { return hash_equals(wt_nonce((string)$action), (string)$nonce) ? 1 : false; }
function wp_create_nonce($action = -1) { return wt_nonce((string)$action); }
function checked($checked, $current = true, $echo = true) {
    $r = ((string)$checked === (string)$current) ? ' checked="checked"' : '';
    if ($echo) echo $r; return $r;
}
function selected($selected, $current = true, $echo = true) {
    $r = ((string)$selected === (string)$current) ? ' selected="selected"' : '';
    if ($echo) echo $r; return $r;
}
function current_time($type, $gmt = 0) { return $type === 'mysql' ? date('Y-m-d H:i:s') : time(); }
function wp_date($format, $timestamp = null) { return date($format, $timestamp === null ? time() : $timestamp); }
function number_format_i18n($number, $decimals = 0) { return number_format((float)$number, $decimals, ',', ' '); }
function size_format($bytes, $decimals = 0) {
    $bytes = (float)$bytes;
    foreach (array('Б', 'КБ', 'МБ', 'ГБ') as $u) { if ($bytes < 1024 || $u === 'ГБ') return number_format($bytes, $decimals, ',', ' ') . ' ' . $u; $bytes /= 1024; }
    return (string)$bytes;
}
function wp_remote_get($url, $args = array()) {
    $ctx = stream_context_create(array('http' => array('timeout' => isset($args['timeout']) ? (int)$args['timeout'] : 10, 'user_agent' => 'Wordtime/' . WT_VERSION)));
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) return new WP_Error('http', 'нет соединения');
    return array('body' => $body, 'response' => array('code' => 200));
}
function wp_remote_post($url, $args = array()) {
    $ctx = stream_context_create(array('http' => array('method' => 'POST', 'timeout' => 10, 'header' => "Content-Type: application/x-www-form-urlencoded\r\n", 'content' => isset($args['body']) ? (is_array($args['body']) ? http_build_query($args['body']) : $args['body']) : '')));
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) return new WP_Error('http', 'нет соединения');
    return array('body' => $body, 'response' => array('code' => 200));
}
function wp_remote_retrieve_body($r) { return is_array($r) && isset($r['body']) ? $r['body'] : ''; }
function wp_remote_retrieve_response_code($r) { return is_array($r) && isset($r['response']['code']) ? (int)$r['response']['code'] : 0; }
function is_wp_error($t) { return $t instanceof WP_Error; }
class WP_Error {
    private $code; private $msg;
    public function __construct($code = '', $message = '') { $this->code = $code; $this->msg = $message; }
    public function get_error_message() { return $this->msg; }
    public function get_error_code() { return $this->code; }
}
function wp_upload_dir() {
    $sub = date('Y/m');
    return array(
        'basedir' => WT_UPLOADS, 'baseurl' => wt_asset('wt-content/uploads'),
        'path' => WT_UPLOADS . '/' . $sub, 'url' => wt_asset('wt-content/uploads/' . $sub),
        'subdir' => '/' . $sub, 'error' => false,
    );
}
function current_user_can($cap) { $u = wt_current_user(); return $u && $u['user_role'] === 'administrator'; }
function wp_get_current_user() { $u = wt_current_user(); return $u ? (object)$u : (object)array('ID' => 0); }
function get_bloginfo($show = '') {
    switch ($show) {
        case 'name': return wt_option('site_title', 'Wordtime');
        case 'description': return wt_option('tagline', '');
        case 'admin_email': return wt_option('admin_email', '');
        case 'url': case 'wpurl': case 'siteurl': return home_url();
        case 'version': return WT_VERSION;
        case 'charset': return 'UTF-8';
        case 'language': return 'ru-RU';
        default: return wt_option('site_title', 'Wordtime');
    }
}
function bloginfo($show = '') { echo esc(get_bloginfo($show)); }
function add_rewrite_rule($regex, $redirect, $after = 'bottom') { /* ЧПУ настраиваются в «Постоянные ссылки» */ }
function flush_rewrite_rules($hard = true) { wt_cache_flush(); }
function register_activation_hook($file, $fn) { /* хранится и выполняется при активации плагина в консоли */ $GLOBALS['wt_activate_hooks'][basename((string)$file)] = $fn; }
function register_deactivation_hook($file, $fn) { $GLOBALS['wt_deactivate_hooks'][basename((string)$file)] = $fn; }
function load_plugin_textdomain($domain, $deprecated = false, $path = false) { return true; }
function wp_mail($to, $subject, $message, $headers = '', $attachments = array()) {
    $r = wt_mail($to, $subject, $message);
    return !empty($r['ok']);
}
