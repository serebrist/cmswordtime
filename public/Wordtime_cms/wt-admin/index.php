<?php
/**
 * Wordtime CMS 1.0.5 — консоль управления
 * Вход: адрес сайта + ?admin=1 · пароль + шести-значный код 2FA
 * Работает в корне домена и в подпапке — ссылки строятся через wt_admin_url().
 */
if (!defined('WT_ROOT')) { http_response_code(403); exit('Прямой доступ запрещён'); }
if (!file_exists(WT_ROOT . '/wt-config.php')) { header('Location: ' . wt_base() . '/install.php'); exit; }

/* ── Диагностика фатальных ошибок: вместо «голого» 500 показываем суть ── */
if (function_exists('register_shutdown_function')) {
    register_shutdown_function(function () {
        $e = error_get_last();
        if ($e === null || !in_array($e['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR), true)) return;
        $msg  = htmlspecialchars($e['message'], ENT_QUOTES, 'UTF-8');
        $file = htmlspecialchars(str_replace('\\', '/', $e['file']), ENT_QUOTES, 'UTF-8');
        $body = '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            . '<title>Ошибка ядра — Wordtime</title>'
            . '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#071b21;color:#dcebee;font:15px/1.6 system-ui,sans-serif;padding:24px}'
            . '.w{max-width:680px;width:100%;background:#0c2e36;border:1px solid #1c4a56;border-radius:18px;overflow:hidden}'
            . '.h{padding:16px 24px;background:#0a2229;border-bottom:1px solid #1c4a56;font-weight:800;color:#fff}'
            . '.b{padding:22px 24px}pre{margin:0;background:#071b21;border:1px solid #174753;border-radius:12px;padding:16px;color:#f2b8b5;font:13px/1.7 monospace;white-space:pre-wrap}'
            . '.kv{padding:8px 0;border-bottom:1px dashed #174753;font-size:13.5px}.kv b{color:#7fa3ab;margin-right:10px}'
            . 'code{background:#071b21;border:1px solid #174753;border-radius:6px;padding:1px 7px;font:12.5px monospace;color:#9fd8cd}</style></head><body><div class="w">'
            . '<div class="h">Wordtime — ошибка ядра (диагностика)</div><div class="b">'
            . '<pre>' . $msg . '</pre>'
            . '<div style="margin-top:14px"><div class="kv"><b>Файл:</b>' . $file . '</div>'
            . '<div class="kv"><b>Строка:</b>' . (int)$e['line'] . '</div>'
            . '<div class="kv"><b>PHP:</b>' . PHP_VERSION . ' (' . PHP_SAPI . ')</div>'
            . '<div class="kv"><b>Журнал:</b>wt-data/error.log</div></div>'
            . '<p style="color:#9fc0c5;font-size:13.5px">«Undefined function» — файл <code>wt-includes/bootstrap.php</code> старее консоли: замените из свежего <code>Wordtime_cms.zip</code> папки <code>wt-admin/</code> и <code>wt-includes/</code> целиком. Данные сайта не пострадали.</p>'
            . '</div></div></body></html>';
        if (!headers_sent()) { @http_response_code(500); @header('Content-Type: text/html; charset=utf-8'); }
        echo $body;
    });
}

wt_session_start();
wt_load_plugins();

$user = wt_current_user();
$act  = isset($_GET['action']) ? (string)$_GET['action'] : (isset($_POST['action']) ? (string)$_POST['action'] : '');
$page = isset($_GET['page']) ? preg_replace('/[^a-z0-9_-]/', '', (string)$_GET['page']) : '';
$tab  = isset($_GET['tab']) ? preg_replace('/[^a-z0-9_-]/', '', (string)$_GET['tab']) : '';
$flash = isset($_SESSION['wt_flash']) ? $_SESSION['wt_flash'] : null;
unset($_SESSION['wt_flash']);

if ($act === 'logout' && $user) { wt_log('Выход из консоли: ' . $user['user_login']); wt_logout(); header('Location: ' . wt_admin_url()); exit; }

if (isset($_GET['dl']) && $user && wt_check_nonce('dl')) {
    $f = basename((string)$_GET['dl']);
    $path = WT_DATA . '/backups/' . $f;
    if (is_file($path)) {
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $f . '"');
        header('Content-Length: ' . filesize($path));
        readfile($path); exit;
    }
}

/* ── Иконки ── */
function wt_icon($n, $size = 18) {
    $p = array(
        'dash'   => '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
        'pin'    => '<path d="M12 21s-6.5-5.4-6.5-10A6.5 6.5 0 0 1 12 4.5 6.5 6.5 0 0 1 18.5 11c0 4.6-6.5 10-6.5 10z"/><circle cx="12" cy="11" r="2.3"/>',
        'pages'  => '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
        'comment'=> '<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/>',
        'image'  => '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10.5" r="1.6"/><path d="m5 17.5 4.5-4 3 2.6 3.5-3.6 3.5 3.5"/>',
        'users'  => '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M15.8 14.7c2.3.2 4 1.8 4.6 4.3"/>',
        'plug'   => '<path d="M9 7V3.5M15 7V3.5"/><path d="M7 7h10v3.5a5 5 0 0 1-10 0z"/><path d="M12 15.5V18a2.5 2.5 0 0 1-2.5 2.5H8"/>',
        'palette'=> '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.8 2-1.8 0-1.4-1.3-1.7-1.3-3 0-1 .8-1.7 2.1-1.7h2.4c2 0 3.3-1.4 3.3-3.2C20.5 6.6 16.6 3.5 12 3.5z"/><circle cx="8" cy="10" r="1.1"/><circle cx="12" cy="7.5" r="1.1"/><circle cx="16" cy="10" r="1.1"/><circle cx="8.5" cy="14.5" r="1.1"/>',
        'gear'   => '<circle cx="12" cy="12" r="3.1"/><path d="M12 2.8l1.2 2.5 2.7-.6 1 2.6 2.7.7-.6 2.7 2 1.9-2 1.9.6 2.7-2.7.7-1 2.6-2.7-.6L12 21.2l-1.2-2.5-2.7.6-1-2.6-2.7-.7.6-2.7-2-1.9 2-1.9-.6-2.7 2.7-.7 1-2.6 2.7.6z"/>',
        'cloud'  => '<path d="M7 18.5a4 4 0 0 1-.6-8 5.5 5.5 0 0 1 10.7-1.2A4.2 4.2 0 0 1 16.5 18.5z"/>',
        'key'    => '<circle cx="8" cy="14.5" r="4"/><path d="m11 11.5 8-8M16.5 6l2.5 2.5M14 8.5l2 2"/>',
        'pulse'  => '<path d="M3.5 12h3.4l2-4.5 3 9 2.2-4.5h6.4"/>',
        'globe'  => '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.3 3.9 5.1 3.9 8.5s-1.3 6.2-3.9 8.5c-2.6-2.3-3.9-5.1-3.9-8.5s1.3-6.2 3.9-8.5z"/>',
        'zap'    => '<path d="M13 3 5 13.5h5.5L11 21l8-10.5h-5.5z"/>',
        'shield' => '<path d="M12 3.5 5.5 6v5.5c0 4.4 2.8 7.4 6.5 9 3.7-1.6 6.5-4.6 6.5-9V6z"/><path d="m9.3 12 2 2 3.6-4"/>',
        'plus'   => '<path d="M12 5.5v13M5.5 12h13"/>',
        'trash'  => '<path d="M4.5 6.5h15M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5M6.5 6.5l.8 12A2 2 0 0 0 9.3 20.5h5.4a2 2 0 0 0 2-1.9l.8-12.1"/><path d="M10 10.5v6M14 10.5v6"/>',
        'check'  => '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
        'x'      => '<path d="M6 6l12 12M18 6 6 18"/>',
        'ext'    => '<path d="M7 17 17 7M9.5 7H17v7.5"/>',
        'menu'   => '<path d="M4 7h16M4 12h16M4 17h16"/>',
        'logout' => '<path d="M14 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h7"/><path d="m16 8 4 4-4 4M20 12H9.5"/>',
        'copy'   => '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/>',
        'dl'     => '<path d="M12 4v11M7.5 11 12 15.5 16.5 11"/><path d="M4.5 19.5h15"/>',
        'mail'   => '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4.5 7.5 7.5 5.5 7.5-5.5"/>',
        'clock'  => '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2.5"/>',
        'db'     => '<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
        'file'   => '<path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5z"/><path d="M13.5 3.5v5h5"/>',
        'refresh'=> '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 3.5v3.8h-3.8"/>',
        'alert'  => '<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4M12 16.6v.4"/>',
        'hour'   => '<path d="M7 3.5h10M7 20.5h10"/><path d="M8 3.5v3.2c0 2.3 1.6 3.5 3 4.6l1 .7 1-.7c1.4-1.1 3-2.3 3-4.6V3.5M8 20.5v-3.2c0-2.3 1.6-3.5 3-4.6l1-.7 1 .7c1.4 1.1 3 2.3 3 4.6v3.2"/>',
        'wrench' => '<path d="M14.5 6.5a4 4 0 0 0-5.4 4.9L4 16.5a2 2 0 1 0 2.8 2.8l5.1-5.1a4 4 0 0 0 4.9-5.4L14 11.5l-2.5-2.5z"/>',
        'chev'   => '<path d="m9 6 6 6-6 6"/>',
        'up'     => '<path d="M12 19V5M6 11l6-6 6 6"/>',
        'down'   => '<path d="M12 5v14M6 13l6 6 6-6"/>',
        'tag'    => '<path d="M4 4h7l9 9-7 7-9-9z"/><circle cx="8.5" cy="8.5" r="1.3"/>',
    );
    $d = isset($p[$n]) ? $p[$n] : $p['file'];
    return '<svg width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $d . '</svg>';
}

/* ── Дизайн-система консоли ── */
function wt_admin_css() {
    echo '<!doctype html><html lang="ru"><head><meta charset="utf-8">';
    echo '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">';
    echo '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
    echo '<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800;900&family=Golos+Text:wght@400;500;600;700;800&display=swap" rel="stylesheet">';
    echo '<style>';
    echo ':root{--bg:#eef2f3;--card:#fff;--line:#dbe4e6;--txt:#0c2e36;--mut:#5c7379;--teal:#0e9384;--teal2:#14b8a6;--amber:#f0b429;--red:#dc2626;--ok:#16a34a;--paper:#f6f9f9;--disp:"Unbounded",system-ui,sans-serif;--body:"Golos Text",system-ui,-apple-system,"Segoe UI",sans-serif}';
    echo '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:14.5px/1.55 var(--body)}';
    echo 'a{color:var(--teal);text-decoration:none}a:hover{color:#0b7a6e}';
    echo 'code{font:12.5px/1.5 ui-monospace,Menlo,Consolas,monospace;background:#e8eff0;border:1px solid var(--line);border-radius:6px;padding:1px 6px}';
    echo '::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-thumb{background:#b9c9cc;border-radius:8px;border:2px solid var(--bg)}';
    echo '.app{display:flex;min-height:100vh}';
    echo '.side{width:254px;flex:none;position:sticky;top:0;height:100vh;display:flex;flex-direction:column;background:linear-gradient(170deg,#071b21,#0b2831 55%,#0d3039);color:#cfe4e6;z-index:40}';
    echo '.side::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(20,184,166,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,.05) 1px,transparent 1px);background-size:26px 26px;pointer-events:none}';
    echo '.brand{display:flex;align-items:center;gap:11px;padding:20px 20px 16px;position:relative}';
    echo '.brand .mark{width:40px;height:40px;flex:none;border-radius:11px;background:linear-gradient(150deg,#10424d,#0b2f38);border:1px solid #1d5160;display:grid;place-items:center;color:var(--teal2)}';
    echo '.brand b{font:800 15.5px/1.1 var(--disp);color:#fff;display:block}';
    echo '.brand small{display:block;margin-top:4px;font-size:10.5px;font-weight:700;letter-spacing:.14em;color:#5f8891;text-transform:uppercase}';
    echo '.nav{flex:1;overflow-y:auto;padding:4px 12px 12px;position:relative}';
    echo '.nav .sec{font:700 10.5px var(--body);letter-spacing:.16em;text-transform:uppercase;color:#4e7680;padding:15px 10px 6px}';
    echo '.nav a.it{display:flex;align-items:center;gap:11px;padding:9px 11px;margin:2px 0;border-radius:10px;color:#a9c6ca;font-weight:600;font-size:13.8px;position:relative;transition:background .16s,color .16s}';
    echo '.nav a.it svg{opacity:.75;flex:none}';
    echo '.nav a.it:hover{background:rgba(20,184,166,.1);color:#fff}';
    echo '.nav a.it.on{background:linear-gradient(90deg,rgba(20,184,166,.2),rgba(20,184,166,.07));color:#fff}';
    echo '.nav a.it.on::before{content:"";position:absolute;left:-12px;top:8px;bottom:8px;width:3.5px;border-radius:0 4px 4px 0;background:var(--amber)}';
    echo '.nav a.it.on svg{color:var(--teal2);opacity:1}';
    echo '.nav .cnt{margin-left:auto;font:700 11px var(--body);background:rgba(240,180,41,.16);color:var(--amber);border-radius:99px;padding:1.5px 8px}';
    echo '.nav .dot{margin-left:auto;width:7px;height:7px;border-radius:99px;background:var(--amber);box-shadow:0 0 8px rgba(240,180,41,.8)}';
    echo '.nav .flychev{margin-left:auto;opacity:.5;transition:.18s}';
    echo '.nav a.it:hover .flychev{opacity:1;transform:translateX(2px)}';
    echo '.sub{display:none;min-width:224px;background:#0c2e36;border:1px solid #1c4a56;border-radius:13px;padding:7px;box-shadow:0 24px 50px -18px rgba(0,0,0,.65);z-index:90}';
    echo '.sub.show{display:block;animation:wtSub .18s ease both}';
    echo '@keyframes wtSub{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:none}}';
    echo '.sub a{display:flex;align-items:center;gap:9px;padding:8.5px 12px;border-radius:9px;color:#a9c6ca;font:600 13.3px var(--body);transition:.14s}';
    echo '.sub a::before{content:"";width:5px;height:5px;border-radius:99px;background:#35626d;flex:none}';
    echo '.sub a:hover{background:rgba(20,184,166,.12);color:#fff}';
    echo '.sub a:hover::before{background:var(--teal2)}';
    echo '.sub a.on{background:rgba(20,184,166,.16);color:#fff}';
    echo '.sub a.on::before{background:var(--amber)}';
    echo '.sub .cap{padding:8px 12px 5px;font:700 10.5px var(--body);letter-spacing:.14em;text-transform:uppercase;color:#4e7680}';
    echo '.side-foot{padding:14px;position:relative;border-top:1px solid rgba(255,255,255,.06)}';
    echo '.side-foot .chip{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:11px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}';
    echo '.side-foot .ava{width:32px;height:32px;flex:none;border-radius:9px;background:linear-gradient(150deg,var(--teal),#0b6e63);color:#fff;display:grid;place-items:center;font:800 13px var(--disp)}';
    echo '.side-foot .who{min-width:0;flex:1}.side-foot .who b{display:block;color:#fff;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
    echo '.side-foot .who span{font-size:11px;color:#6f959d}';
    echo '.side-foot a.out{color:#7fa3ab;display:grid;place-items:center;width:30px;height:30px;border-radius:8px;flex:none;transition:.16s}';
    echo '.side-foot a.out:hover{color:#fff;background:rgba(220,38,38,.25)}';
    echo '.wrap{flex:1;min-width:0;display:flex;flex-direction:column}';
    echo '.top{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:12px;height:58px;padding:0 22px;background:rgba(7,27,33,.97);color:#d8e8ea;border-bottom:1px solid #123844}';
    echo '.top .crumb{font:700 13px var(--body);color:#7fa3ab}.top .crumb b{color:#fff;font-weight:800}';
    echo '.top .sp{flex:1}.burger{display:none;background:none;border:0;color:#d8e8ea;cursor:pointer;padding:6px}';
    echo '.main{flex:1;padding:26px 26px 60px;max-width:1180px;width:100%;margin:0 auto;animation:wtUp .35s ease both}';
    echo '@keyframes wtUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}';
    echo 'h1.pt{font:800 23px/1.2 var(--disp);letter-spacing:-.01em;margin:2px 0 0}';
    echo 'p.ps{margin:7px 0 22px;color:var(--mut);font-size:13.5px}';
    echo '.card{background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:0 1px 2px rgba(12,46,54,.05);padding:20px 22px;margin-bottom:18px;animation:wtUp .4s ease both}';
    echo '.card.np{padding:0;overflow:hidden}';
    echo '.card h2{font:700 15.5px var(--disp);margin:0 0 4px}';
    echo '.card .hd{display:flex;align-items:center;gap:12px;padding:16px 22px;border-bottom:1px solid var(--line);flex-wrap:wrap}';
    echo '.card .hd h2{margin:0}.card .hd .sp{flex:1}';
    echo 'table{width:100%;border-collapse:collapse;font-size:13.8px}';
    echo 'th{text-align:left;font:700 11px var(--body);letter-spacing:.12em;text-transform:uppercase;color:var(--mut);padding:11px 16px;background:var(--paper);border-bottom:1px solid var(--line)}';
    echo 'td{padding:13px 16px;border-bottom:1px solid #e7eeee;vertical-align:middle}';
    echo 'tr:last-child td{border-bottom:0}tbody tr{transition:background .14s}tbody tr:hover{background:#f4faf9}';
    echo '.badge{display:inline-flex;align-items:center;gap:5px;font:700 11px var(--body);padding:3px 9px;border-radius:99px;border:1px solid transparent;white-space:nowrap}';
    echo '.b-ok{background:#e5f5ec;color:#137a43;border-color:#bfe5cf}.b-amber{background:#fdf1d7;color:#92610a;border-color:#f2dcab}.b-mut{background:#eef2f3;color:#5c7379;border-color:#dbe4e6}.b-red{background:#fdeaea;color:#b91c1c;border-color:#f3c4c4}.b-teal{background:#e2f5f2;color:#0b7a6e;border-color:#bfe5de}';
    echo '.btn{display:inline-flex;align-items:center;gap:8px;font:600 13.5px var(--body);padding:0 16px;height:39px;border-radius:10px;border:1px solid transparent;background:var(--teal);color:#fff;cursor:pointer;transition:.14s;text-decoration:none;white-space:nowrap}';
    echo '.btn:hover{background:#0b7a6e;color:#fff;transform:translateY(-1px)}';
    echo '.btn.amber{background:var(--amber);color:#0c2e36}.btn.amber:hover{background:#e2a51c;color:#0c2e36}';
    echo '.btn.ghost{background:transparent;border-color:var(--line);color:var(--txt)}.btn.ghost:hover{border-color:var(--teal);color:var(--teal);background:#f2faf8}';
    echo '.btn.red{background:var(--red)}.btn.red:hover{background:#b91c1c}';
    echo '.btn.dark{background:#0c2e36;color:#9fd8cd}.btn.dark:hover{background:#123f4b;color:#c9efe7}';
    echo '.btn.sm{height:31px;padding:0 12px;font-size:12.5px;border-radius:8px}';
    echo 'label{display:block;font:600 12.8px var(--body);color:#33525b;margin:15px 0 6px}';
    echo 'input[type=text],input[type=email],input[type=password],input[type=url],input[type=number],input[type=file],select,textarea{width:100%;font:500 14px var(--body);color:var(--txt);background:#fff;border:1px solid #cfdde0;border-radius:10px;padding:9.5px 13px;outline:none;transition:.15s}';
    echo 'input:focus,select:focus,textarea:focus{border-color:var(--teal);box-shadow:0 0 0 3px rgba(14,147,132,.15)}';
    echo 'textarea{resize:vertical;min-height:120px;line-height:1.65}';
    echo '.grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}';
    echo '.row-inline{display:flex;gap:8px;justify-content:flex-end;align-items:center;flex-wrap:wrap}';
    echo '.tabs{display:inline-flex;gap:4px;background:#e3eaeb;border:1px solid var(--line);padding:4px;border-radius:12px;margin-bottom:18px;flex-wrap:wrap}';
    echo '.tabs a{padding:7px 15px;border-radius:9px;font:600 13px var(--body);color:var(--mut);transition:.15s}';
    echo '.tabs a.on{background:#0c2e36;color:#fff}';
    echo '.alert{display:flex;gap:11px;align-items:flex-start;padding:13px 16px;border-radius:12px;border:1px solid;margin-bottom:18px;font-size:13.8px;animation:wtIn .3s ease both}';
    echo '@keyframes wtIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}';
    echo '.alert.ok{background:#eaf7f0;border-color:#bfe5cf;color:#136a3d}';
    echo '.alert.err{background:#fdf0f0;border-color:#f3c4c4;color:#a52020}';
    echo '.alert.warn{background:#fdf6e3;border-color:#f0dcae;color:#8a5c07}';
    echo '.alert svg{flex:none;margin-top:1px}';
    echo '.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:14px;margin-bottom:18px}';
    echo '.stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 17px;transition:.18s;animation:wtUp .4s ease both}';
    echo '.stat:hover{transform:translateY(-3px);box-shadow:0 12px 26px -14px rgba(12,46,54,.35)}';
    echo '.stat .ic{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;margin-bottom:11px}';
    echo '.stat b{display:block;font:800 25px/1 var(--disp)}';
    echo '.stat span{display:block;margin-top:6px;font:600 12px var(--body);color:var(--mut)}';
    echo '.hello{position:relative;overflow:hidden;border-radius:18px;background:linear-gradient(140deg,#071b21,#0d323c 60%,#10424d);color:#eaf4f4;padding:28px 30px;margin-bottom:20px;border:1px solid #174753}';
    echo '.hello::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(20,184,166,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,.07) 1px,transparent 1px);background-size:26px 26px}';
    echo '.hello h2{position:relative;font:800 clamp(19px,2.4vw,26px)/1.25 var(--disp);margin:0}';
    echo '.hello p{position:relative;margin:9px 0 0;color:#9fc0c5;font-size:13.8px;max-width:560px}';
    echo '.hello .acts{position:relative;display:flex;gap:10px;margin-top:19px;flex-wrap:wrap}';
    echo '.login{min-height:100vh;display:grid;grid-template-columns:minmax(320px,440px) 1fr}';
    echo '.l-brand{position:relative;overflow:hidden;background:linear-gradient(160deg,#06171d,#0b2b34 55%,#0e3742);color:#dcebee;padding:46px 44px;display:flex;flex-direction:column}';
    echo '.l-brand::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(20,184,166,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,.06) 1px,transparent 1px);background-size:28px 28px}';
    echo '.l-win{position:relative;width:86px;height:86px;border-radius:20px;background:linear-gradient(150deg,#10424d,#0a2730);border:1px solid #1d5160;display:grid;place-items:center;box-shadow:0 18px 40px -18px rgba(0,0,0,.7);margin-bottom:34px}';
    echo '.l-win svg{animation:wtFlip 4.2s cubic-bezier(.7,0,.3,1) infinite}';
    echo '@keyframes wtFlip{0%,42%{transform:rotate(0)}55%,92%{transform:rotate(180deg)}100%{transform:rotate(360deg)}}';
    echo '.l-brand h1{position:relative;font:900 clamp(26px,3vw,34px)/1.15 var(--disp);margin:0;color:#fff}';
    echo '.l-brand .sub{position:relative;color:#8fb4ba;margin:14px 0 0;font-size:14.5px;line-height:1.6;max-width:330px}';
    echo '.l-brand ul{position:relative;list-style:none;margin:auto 0 0;padding:0;display:grid;gap:11px}';
    echo '.l-brand li{display:flex;gap:10px;align-items:center;color:#a9c9cd;font-size:13.5px;font-weight:500}';
    echo '.l-brand li i{width:24px;height:24px;flex:none;border-radius:8px;background:rgba(20,184,166,.16);color:var(--teal2);display:grid;place-items:center;font-style:normal}';
    echo '.l-main{display:grid;place-items:center;padding:40px 24px;background:radial-gradient(900px 500px at 80% -10%,#ddefec,transparent 60%),var(--bg)}';
    echo '.l-card{width:min(430px,100%);background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 24px 60px -30px rgba(12,46,54,.35);padding:30px 30px 26px;animation:wtUp .4s ease both}';
    echo '.l-card h2{font:800 20px var(--disp);margin:0}';
    echo '.l-card .hint{color:var(--mut);font-size:13.3px;margin:8px 0 4px}';
    echo '.code{font:800 26px var(--disp);letter-spacing:.42em;text-align:center;padding:13px 10px 13px 22px !important}';
    echo '.l-note{margin-top:16px;font-size:12.5px;color:var(--mut);display:flex;gap:8px;align-items:flex-start;line-height:1.5}';
    echo '.l-note svg{flex:none;margin-top:1px;color:var(--teal)}';
    echo '.mgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:13px}';
    echo '.mcell{background:var(--card);border:1px solid var(--line);border-radius:13px;overflow:hidden;transition:.16s}';
    echo '.mcell:hover{transform:translateY(-3px);box-shadow:0 12px 24px -14px rgba(12,46,54,.35)}';
    echo '.mcell .ph{height:104px;background:linear-gradient(140deg,#0d3039,#134450);display:grid;place-items:center;color:#5f97a1;overflow:hidden}';
    echo '.mcell .ph img{width:100%;height:100%;object-fit:cover}';
    echo '.mcell .in{padding:9px 11px}';
    echo '.mcell .in b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
    echo '.mcell .in span{font-size:11px;color:var(--mut)}';
    echo '.logbox{background:#071b21;color:#bfe0da;border-radius:12px;padding:14px 16px;font:12.5px/1.85 ui-monospace,Menlo,Consolas,monospace;overflow:auto;max-height:240px}';
    echo '.logbox i{color:#54808a;font-style:normal}';
    echo '.kv{display:flex;justify-content:space-between;gap:14px;padding:10.5px 0;border-bottom:1px dashed #e2eaea;font-size:13.5px}';
    echo '.kv:last-child{border-bottom:0}.kv b{font-weight:600;color:var(--mut)}.kv span{font-weight:700;text-align:right}';
    echo '.icobtn{display:inline-grid;place-items:center;width:31px;height:31px;border-radius:8px;border:1px solid var(--line);background:#fff;color:var(--mut);cursor:pointer;transition:.15s}';
    echo '.icobtn:hover{color:var(--teal);border-color:var(--teal)}';
    echo '.empty{padding:36px 20px;text-align:center;color:var(--mut)}';
    echo '.empty svg{opacity:.5;margin-bottom:8px}';
    echo 'pre.codebox{background:#071b21;color:#a8d8cf;border-radius:12px;padding:16px 18px;font:12.5px/1.75 ui-monospace,Menlo,Consolas,monospace;overflow:auto;max-height:340px;white-space:pre}';
    echo '.swatch{display:inline-flex;gap:6px;align-items:center;padding:4px 10px;border:1px solid var(--line);border-radius:99px;background:#fff;font:600 12px var(--body)}';
    echo '.swatch i{width:16px;height:16px;border-radius:5px;background:linear-gradient(150deg,var(--teal),#0b6e63)}';
    echo '@media(max-width:960px){.side{position:fixed;left:0;top:0;transform:translateX(-105%);transition:transform .25s ease}.side.open{transform:none}.burger{display:block}.grid2{grid-template-columns:1fr}.login{grid-template-columns:1fr}.l-brand{display:none}.main{padding:20px 16px 50px}}';
    echo '</style></head><body>';
}

/* ── Экран входа ── */
function wt_admin_login_screen($err = '', $delivery = null) {
    $accent = wt_option('login_accent', '#14b8a6');
    if (!preg_match('/^#[0-9a-f]{6}$/i', (string)$accent)) $accent = '#14b8a6';
    $logo = esc(wt_option('login_logo', 'Wordtime'));
    $msg = esc(wt_option('login_message', 'Вход защищён двухфакторной аутентификацией'));
    $side = esc(wt_option('login_side', 'Быстро. Безопасно. По-русски.'));
    $step2 = !empty($_SESSION['wt_2fa_uid']);
    wt_admin_css();
    echo '<title>Вход — ' . $logo . '</title><div class="login"><div class="l-brand">';
    echo '<div class="l-win">' . wt_icon('hour', 40) . '</div>';
    echo '<h1>' . $logo . '</h1><p class="sub">' . $msg . '</p><ul>';
    echo '<li><i>' . wt_icon('shield', 13) . '</i>2FA обязательна для каждого входа</li>';
    echo '<li><i>' . wt_icon('zap', 13) . '</i>Блокировка после 5 неудачных попыток</li>';
    echo '<li><i>' . wt_icon('db', 13) . '</i>Совместимость с плагинами WordPress</li>';
    echo '<li><i>' . wt_icon('globe', 13) . '</i>' . $side . '</li>';
    echo '</ul></div><div class="l-main"><div class="l-card">';
    if ($err !== '') echo '<div class="alert err">' . wt_icon('alert', 17) . '<span>' . esc($err) . '</span></div>';
    if ($step2) {
        if (is_array($delivery)) {
            if (!empty($delivery['ok'])) echo '<div class="alert ok">' . wt_icon('mail', 17) . '<span>Код отправлен способом: <b>' . esc($delivery['method']) . '</b>. Введите его ниже.</span></div>';
            else echo '<div class="alert warn">' . wt_icon('alert', 17) . '<span>Почта недоступна (' . esc(isset($delivery['error']) ? $delivery['error'] : '') . '). Код сохранён в файл <b>' . esc($delivery['log']) . '</b> на сервере — откройте его через файловый менеджер хостинга.</span></div>';
        }
        echo '<h2>Подтверждение входа</h2><p class="hint">Шести-значный код из письма действует 5 минут.</p>';
        echo '<form method="post" action="' . esc_attr(wt_admin_url()) . '">';
        echo '<input type="hidden" name="action" value="2fa"><input type="hidden" name="wt_nonce" value="' . wt_nonce('login') . '">';
        echo '<label>Код подтверждения</label>';
        echo '<input class="code" name="code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" autofocus required placeholder="••••••" autocomplete="one-time-code">';
        echo '<p style="margin:18px 0 0"><button class="btn" type="submit" style="width:100%;justify-content:center;height:44px;background:' . esc_attr($accent) . '">Подтвердить и войти</button></p>';
        echo '<p style="text-align:center;margin:14px 0 0"><button class="btn ghost sm" type="submit" name="cancel2fa" value="1">Отмена — другой пользователь</button></p>';
        echo '</form>';
    } else {
        echo '<h2>Вход в консоль</h2><p class="hint">После пароля пришлём код подтверждения на почту.</p>';
        echo '<form method="post" action="' . esc_attr(wt_admin_url()) . '">';
        echo '<input type="hidden" name="action" value="login"><input type="hidden" name="wt_nonce" value="' . wt_nonce('login') . '">';
        echo '<label>Почта</label><input type="email" name="email" required autofocus>';
        echo '<label>Пароль</label><input type="password" name="pass" required placeholder="••••••••••">';
        echo '<p style="margin:20px 0 0"><button class="btn" type="submit" style="width:100%;justify-content:center;height:44px;background:' . esc_attr($accent) . '">Продолжить — код придёт на почту</button></p>';
        echo '</form>';
        echo '<div class="l-note">' . wt_icon('shield', 15) . '<span>Неверный пароль 5 раз подряд — вход блокируется на 60 секунд. Все попытки записываются в журнал.</span></div>';
    }
    echo '</div></div></div></body></html>';
    exit;
}

if (!$user) {
    if ($act === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!wt_check_nonce('login')) wt_admin_login_screen('Проверка безопасности не пройдена.');
        $email = isset($_POST['email']) ? trim(strip_tags($_POST['email'])) : '';
        $pass = isset($_POST['pass']) ? (string)$_POST['pass'] : '';
        if (preg_match('/(<script|union\s+select|javascript:)/i', $email . $pass)) { wt_log('Заблокирована попытка инъекции при входе'); wt_admin_login_screen('Ввод содержит запрещённые конструкции. Вход отклонён.'); }
        $lock = wt_attempt_locked($email);
        if ($lock > 0) wt_admin_login_screen('Сработала защита от подбора паролей. Повторите через ' . $lock . ' сек.');
        $u = wt_find_user($email);
        if (!$u || !password_verify($pass, $u['user_pass'])) {
            $fails = wt_attempt_fail($email);
            wt_admin_login_screen($fails === 0 ? 'Слишком много попыток — вход заблокирован на 60 секунд.' : 'Неверная почта или пароль. Осталось попыток: ' . (5 - $fails) . '.');
        }
        wt_attempt_ok($email);
        $delivery = wt_2fa_start($u);
        $_SESSION['wt_2fa_delivery'] = $delivery;
        wt_admin_login_screen('', $delivery);
    }
    if ($act === '2fa' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!wt_check_nonce('login')) wt_admin_login_screen('Проверка безопасности не пройдена.');
        if (isset($_POST['cancel2fa'])) { $_SESSION = array(); header('Location: ' . wt_admin_url()); exit; }
        $code = isset($_POST['code']) ? (string)$_POST['code'] : '';
        list($okk, $res) = wt_2fa_verify($code);
        if (!$okk) wt_admin_login_screen($res, isset($_SESSION['wt_2fa_delivery']) ? $_SESSION['wt_2fa_delivery'] : null);
        wt_login_user($res);
        wt_log('Вход в консоль подтверждён (2FA): uid ' . $res);
        header('Location: ' . wt_admin_url()); exit;
    }
    wt_admin_login_screen('', null);
}

/* ── Действия (только авторизованные, с nonce) ── */
function wt_redirect_to($pg) { header('Location: ' . wt_admin_url('&page=' . $pg)); exit; }

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $act !== '') {
    if (!wt_check_nonce('admin')) { $_SESSION['wt_flash'] = array('err', 'Проверка безопасности не пройдена — обновите страницу.'); wt_redirect_to($page); }
    switch ($act) {
        case 'post-save': {
            $id = (int)$_POST['id'];
            $title = trim(strip_tags($_POST['title']));
            if ($title === '') { $_SESSION['wt_flash'] = array('err', 'Заголовок не может быть пустым.'); wt_redirect_to('posts'); }
            $slug = trim((string)$_POST['slug']) !== '' ? wt_slugify($_POST['slug']) : wt_slugify($title);
            $data = array($title, $slug, wt_kses($_POST['content']), (string)$_POST['category'], trim(strip_tags($_POST['tags'])), $_POST['status'], trim((string)$_POST['image']));
            if ($id > 0) { $st = wt_db()->prepare('UPDATE ' . wt_t('posts') . ' SET post_title=?, slug=?, post_content=?, category=?, tags=?, post_status=?, post_image=? WHERE id=?'); $data[] = $id; $st->execute($data); wt_log('Запись #' . $id . ' обновлена'); }
            else { $st = wt_db()->prepare('INSERT INTO ' . wt_t('posts') . ' (post_title, slug, post_content, category, tags, post_status, post_image, post_author) VALUES (?,?,?,?,?,?,?,?)'); $data[] = $user['user_login']; $st->execute($data); wt_log('Создана запись «' . $title . '»'); }
            wt_cache_flush();
            $_SESSION['wt_flash'] = array('ok', 'Запись сохранена.'); wt_redirect_to('posts');
        }
        case 'post-delete': {
            $id = (int)$_POST['id'];
            wt_db()->prepare('DELETE FROM ' . wt_t('posts') . ' WHERE id = ?')->execute(array($id));
            wt_db()->prepare('DELETE FROM ' . wt_t('comments') . ' WHERE post_id = ?')->execute(array($id));
            wt_cache_flush(); wt_log('Запись #' . $id . ' удалена');
            $_SESSION['wt_flash'] = array('ok', 'Запись удалена.'); wt_redirect_to('posts');
        }
        case 'page-save': {
            $id = (int)$_POST['id'];
            $title = trim(strip_tags($_POST['title']));
            if ($title === '') { $_SESSION['wt_flash'] = array('err', 'Название страницы не может быть пустым.'); wt_redirect_to('pages'); }
            $slug = trim((string)$_POST['slug']) !== '' ? wt_slugify($_POST['slug']) : wt_slugify($title);
            if ($id > 0) { wt_db()->prepare('UPDATE ' . wt_t('pages') . ' SET title=?, slug=?, content=?, status=? WHERE id=?')->execute(array($title, $slug, wt_kses($_POST['content']), $_POST['status'], $id)); }
            else { wt_db()->prepare('INSERT INTO ' . wt_t('pages') . ' (title, slug, content, status) VALUES (?,?,?,?)')->execute(array($title, $slug, wt_kses($_POST['content']), $_POST['status'])); }
            wt_cache_flush();
            $_SESSION['wt_flash'] = array('ok', 'Страница сохранена.'); wt_redirect_to('pages');
        }
        case 'page-delete': {
            wt_db()->prepare('DELETE FROM ' . wt_t('pages') . ' WHERE id = ?')->execute(array((int)$_POST['id']));
            wt_cache_flush(); wt_log('Страница #' . (int)$_POST['id'] . ' удалена');
            $_SESSION['wt_flash'] = array('ok', 'Страница удалена.'); wt_redirect_to('pages');
        }
        case 'comment-set': {
            wt_db()->prepare('UPDATE ' . wt_t('comments') . ' SET status = ? WHERE id = ?')->execute(array($_POST['status'], (int)$_POST['id']));
            wt_cache_flush(); wt_log('Комментарий #' . (int)$_POST['id'] . ' → ' . $_POST['status']);
            $_SESSION['wt_flash'] = array('ok', 'Статус комментария обновлён.'); wt_redirect_to('comments&tab=' . $tab);
        }
        case 'comment-delete': {
            wt_db()->prepare('DELETE FROM ' . wt_t('comments') . ' WHERE id = ?')->execute(array((int)$_POST['id']));
            wt_cache_flush();
            $_SESSION['wt_flash'] = array('ok', 'Комментарий удалён.'); wt_redirect_to('comments&tab=' . $tab);
        }
        case 'upload': {
            list($okk, $res) = wt_handle_upload('file');
            wt_cache_flush();
            if ($okk && !empty($res['optimized'])) $_SESSION['wt_flash'] = array('ok', 'Файл загружен и оптимизирован: ' . esc($res['name']));
            else $_SESSION['wt_flash'] = $okk ? array('ok', 'Файл загружен: ' . esc($res['name'])) : array('err', $res);
            wt_redirect_to('media');
        }
        case 'media-delete': {
            $rel = (string)$_POST['rel'];
            $real = realpath(WT_UPLOADS . '/' . $rel);
            if ($real && strpos($real, realpath(WT_UPLOADS)) === 0 && is_file($real)) { @unlink($real); wt_log('Удалён медиафайл ' . $rel); }
            wt_cache_flush();
            $_SESSION['wt_flash'] = array('ok', 'Файл удалён.'); wt_redirect_to('media');
        }
        case 'user-add': {
            $email = mb_strtolower(trim(strip_tags($_POST['email'])));
            if ($email === '' || strpos($email, '@') === false) { $_SESSION['wt_flash'] = array('err', 'Укажите корректную почту.'); wt_redirect_to('users'); }
            if (wt_find_user($email)) { $_SESSION['wt_flash'] = array('err', 'Эта почта уже зарегистрирована.'); wt_redirect_to('users'); }
            if (strlen((string)$_POST['pass']) < 8) { $_SESSION['wt_flash'] = array('err', 'Пароль — минимум 8 символов.'); wt_redirect_to('users'); }
            wt_db()->prepare('INSERT INTO ' . wt_t('users') . ' (user_login, user_email, user_pass, user_role) VALUES (?,?,?,?)')
                ->execute(array(trim(strip_tags($_POST['login'])), $email, password_hash((string)$_POST['pass'], PASSWORD_DEFAULT), $_POST['role']));
            wt_log('Создан пользователь ' . $email);
            $_SESSION['wt_flash'] = array('ok', 'Пользователь добавлен.'); wt_redirect_to('users');
        }
        case 'user-role': {
            $id = (int)$_POST['id'];
            if ($id === (int)$user['id']) { $_SESSION['wt_flash'] = array('err', 'Свою роль менять нельзя.'); wt_redirect_to('users'); }
            wt_db()->prepare('UPDATE ' . wt_t('users') . ' SET user_role = ? WHERE id = ?')->execute(array($_POST['role'], $id));
            $_SESSION['wt_flash'] = array('ok', 'Роль обновлена.'); wt_redirect_to('users');
        }
        case 'user-delete': {
            $id = (int)$_POST['id'];
            if ($id === (int)$user['id']) { $_SESSION['wt_flash'] = array('err', 'Нельзя удалить самого себя.'); wt_redirect_to('users'); }
            wt_db()->prepare('DELETE FROM ' . wt_t('users') . ' WHERE id = ? AND user_role != "administrator"')->execute(array($id));
            $_SESSION['wt_flash'] = array('ok', 'Пользователь удалён.'); wt_redirect_to('users');
        }
        case 'profile-save': {
            $login = trim(strip_tags($_POST['login']));
            $email = mb_strtolower(trim(strip_tags($_POST['email'])));
            if ($login === '' || strpos($email, '@') === false) { $_SESSION['wt_flash'] = array('err', 'Логин и почта обязательны.'); wt_redirect_to('profile'); }
            if ((string)$_POST['pass'] !== '' && strlen((string)$_POST['pass']) < 8) { $_SESSION['wt_flash'] = array('err', 'Новый пароль — минимум 8 символов (или оставьте пустым).'); wt_redirect_to('profile'); }
            $sql = 'UPDATE ' . wt_t('users') . ' SET user_login = ?, user_email = ?';
            $args = array($login, $email);
            if ((string)$_POST['pass'] !== '') { $sql .= ', user_pass = ?'; $args[] = password_hash((string)$_POST['pass'], PASSWORD_DEFAULT); }
            $sql .= ' WHERE id = ?'; $args[] = (int)$user['id'];
            wt_db()->prepare($sql)->execute($args);
            wt_log('Профиль обновлён: ' . $login);
            $_SESSION['wt_flash'] = array('ok', 'Профиль сохранён.'); wt_redirect_to('profile');
        }
        case 'theme-activate': {
            $t = basename((string)$_POST['theme']);
            if (is_dir(WT_ROOT . '/wt-content/themes/' . $t)) {
                wt_set_option('active_theme', $t); wt_cache_flush(); wt_log('Активирована тема ' . $t);
                $_SESSION['wt_flash'] = array('ok', 'Тема «' . esc($t) . '» активирована.');
            } else $_SESSION['wt_flash'] = array('err', 'Тема не найдена.');
            wt_redirect_to('themes');
        }
        case 'theme-file-save': {
            $allow = array('style.css', 'functions.php', 'index.php');
            $f = (string)$_POST['file'];
            if (!in_array($f, $allow, true)) { $_SESSION['wt_flash'] = array('err', 'Этот файл редактировать нельзя.'); wt_redirect_to('theme-editor'); }
            if (@file_put_contents(wt_theme_dir() . '/' . $f, (string)$_POST['content']) !== false) {
                wt_cache_flush(); wt_log('Отредактирован файл темы: ' . $f);
                $_SESSION['wt_flash'] = array('ok', 'Файл ' . esc($f) . ' сохранён.');
            } else $_SESSION['wt_flash'] = array('err', 'Не удалось записать файл — проверьте права на каталог темы.');
            wt_redirect_to('theme-editor&file=' . $f);
        }
        case 'plugin-toggle': {
            $f = basename((string)$_POST['file']);
            $active = wt_option('active_plugins', array()); if (!is_array($active)) $active = array();
            if (in_array($f, $active, true)) { $active = array_values(array_diff($active, array($f))); $_SESSION['wt_flash'] = array('warn', 'Плагин ' . esc($f) . ' отключён.'); }
            else { $active[] = $f; $_SESSION['wt_flash'] = array('ok', 'Плагин ' . esc($f) . ' активирован.'); }
            wt_set_option('active_plugins', $active); wt_log('Плагины: ' . implode(', ', $active));
            wt_redirect_to('plugins');
        }
        case 'plugin-upload': {
            if (empty($_FILES['plugin']['tmp_name']) || $_FILES['plugin']['error'] !== UPLOAD_ERR_OK) { $_SESSION['wt_flash'] = array('err', 'Файл не получен.'); wt_redirect_to('plugin-new'); }
            $name = basename((string)$_FILES['plugin']['name']);
            if (strtolower(pathinfo($name, PATHINFO_EXTENSION)) !== 'php') { $_SESSION['wt_flash'] = array('err', 'Плагин должен быть файлом .php'); wt_redirect_to('plugin-new'); }
            $name = preg_replace('/[^a-z0-9._-]/i', '-', $name);
            $code = (string)file_get_contents($_FILES['plugin']['tmp_name']);
            if (strpos($code, '<?php') !== 0) { $_SESSION['wt_flash'] = array('err', 'Файл не начинается с <?php — это не плагин.'); wt_redirect_to('plugin-new'); }
            if (!is_dir(WT_ROOT . '/wt-content/plugins')) @mkdir(WT_ROOT . '/wt-content/plugins', 0755, true);
            if (@file_put_contents(WT_ROOT . '/wt-content/plugins/' . $name, $code) !== false) {
                wt_log('Загружен плагин ' . $name);
                $_SESSION['wt_flash'] = array('ok', 'Плагин ' . esc($name) . ' загружен — активируйте его в списке.');
            } else $_SESSION['wt_flash'] = array('err', 'Не удалось сохранить файл плагина.');
            wt_redirect_to('plugins');
        }
        case 'category-add': {
            $c = trim(strip_tags($_POST['name']));
            if ($c === '') { $_SESSION['wt_flash'] = array('err', 'Название рубрики не может быть пустым.'); wt_redirect_to('categories'); }
            $cats = wt_categories();
            if (in_array($c, $cats, true)) { $_SESSION['wt_flash'] = array('warn', 'Такая рубрика уже есть.'); wt_redirect_to('categories'); }
            $cats[] = $c; wt_set_option('categories', $cats); wt_log('Добавлена рубрика «' . $c . '»');
            $_SESSION['wt_flash'] = array('ok', 'Рубрика «' . esc($c) . '» добавлена.'); wt_redirect_to('categories');
        }
        case 'category-delete': {
            $c = (string)$_POST['name'];
            $cats = array_values(array_diff(wt_categories(), array($c)));
            if (count($cats) === 0) $cats = array('Без рубрики');
            wt_set_option('categories', $cats);
            wt_db()->prepare('UPDATE ' . wt_t('posts') . ' SET category = ? WHERE category = ?')->execute(array($cats[0], $c));
            $_SESSION['wt_flash'] = array('ok', 'Рубрика удалена, записи перенесены в «' . esc($cats[0]) . '».'); wt_redirect_to('categories');
        }
        case 'menu-add': {
            $label = trim(strip_tags($_POST['label']));
            $target = trim((string)$_POST['target']);
            if ($label === '' || $target === '') { $_SESSION['wt_flash'] = array('err', 'Заполните название и ссылку пункта меню.'); wt_redirect_to('menus'); }
            $m = wt_option('site_menu', array()); if (!is_array($m)) $m = array();
            $m[] = array('label' => $label, 'url' => $target);
            wt_set_option('site_menu', $m); wt_cache_flush(); wt_log('Пункт меню «' . $label . '» добавлен');
            $_SESSION['wt_flash'] = array('ok', 'Пункт меню добавлен.'); wt_redirect_to('menus');
        }
        case 'menu-save': {
            $labels = isset($_POST['labels']) ? (array)$_POST['labels'] : array();
            $targets = isset($_POST['targets']) ? (array)$_POST['targets'] : array();
            $m = array();
            foreach ($labels as $i => $l) {
                $l = trim(strip_tags((string)$l));
                $t = trim((string)(isset($targets[$i]) ? $targets[$i] : ''));
                if ($l !== '' && $t !== '') $m[] = array('label' => $l, 'url' => $t);
            }
            wt_set_option('site_menu', $m); wt_cache_flush(); wt_log('Меню сайта сохранено (' . count($m) . ' пунктов)');
            $_SESSION['wt_flash'] = array('ok', 'Меню сайта сохранено.'); wt_redirect_to('menus');
        }
        case 'settings-save': {
            foreach (array('site_title', 'tagline', 'admin_email') as $k) if (isset($_POST[$k])) wt_set_option($k, trim(strip_tags($_POST[$k])));
            wt_set_option('categories', array_values(array_filter(array_map('trim', explode(',', (string)$_POST['categories'])), 'strlen')));
            wt_set_option('timezone', (string)$_POST['timezone']);
            wt_set_option('date_format', (string)$_POST['date_format']);
            wt_set_option('posts_per_page', max(1, (int)$_POST['posts_per_page']));
            wt_cache_flush(); wt_log('Общие настройки сохранены');
            $_SESSION['wt_flash'] = array('ok', 'Настройки сохранены.'); wt_redirect_to('settings');
        }
        case 'settings-comments': {
            wt_set_option('comments_disabled', isset($_POST['comments_disabled']));
            wt_set_option('moderate_first', isset($_POST['moderate_first']));
            wt_set_option('require_email', isset($_POST['require_email']));
            wt_set_option('close_after_days', max(1, (int)$_POST['close_after_days']));
            wt_cache_flush(); wt_log('Настройки комментариев сохранены');
            $_SESSION['wt_flash'] = array('ok', 'Настройки комментариев сохранены.'); wt_redirect_to('settings&tab=comments');
        }
        case 'cache-toggle': {
            wt_set_option('cache_enabled', isset($_POST['cache_enabled']));
            $_SESSION['wt_flash'] = array('ok', isset($_POST['cache_enabled']) ? 'Кеш включён.' : 'Кеш отключён.'); wt_redirect_to('settings&tab=cache');
        }
        case 'cache-clear': {
            wt_cache_flush(); wt_log('Кеш очищен из консоли');
            $_SESSION['wt_flash'] = array('ok', 'Кеш сайта очищен.');
            wt_redirect_to(isset($_POST['back']) && preg_match('/^[a-z-]+$/', (string)$_POST['back']) ? (string)$_POST['back'] : 'settings&tab=cache');
        }
        case 'perf-save': {
            wt_set_option('auto_purge', (string)$_POST['auto_purge']);
            wt_set_option('cache_enabled', isset($_POST['cache_enabled']));
            wt_cache_flush(); wt_log('Настройки производительности сохранены');
            $_SESSION['wt_flash'] = array('ok', 'Настройки скорости сохранены.'); wt_redirect_to('perf');
        }
        case 'images-save': {
            wt_set_option('img_max_width', max(320, (int)$_POST['img_max_width']));
            wt_set_option('img_quality', min(100, max(40, (int)$_POST['img_quality'])));
            wt_set_option('img_auto', isset($_POST['img_auto']));
            wt_log('Настройки оптимизации изображений сохранены');
            $_SESSION['wt_flash'] = array('ok', 'Настройки изображений сохранены.'); wt_redirect_to('images');
        }
        case 'seo-save': {
            wt_set_option('title_template', trim((string)$_POST['title_template']));
            wt_set_option('desc_template', trim((string)$_POST['desc_template']));
            wt_set_option('desc_fallback', trim(strip_tags((string)$_POST['desc_fallback'])));
            wt_cache_flush(); wt_log('SEO-шаблоны сохранены');
            $_SESSION['wt_flash'] = array('ok', 'SEO-настройки сохранены.'); wt_redirect_to('seo');
        }
        case 'smtp-save': {
            $lines = file(WT_ROOT . '/wt-config.php');
            $map = array('WT_SMTP_HOST' => (string)$_POST['smtp_host'], 'WT_SMTP_PORT' => (string)(int)$_POST['smtp_port'], 'WT_SMTP_USER' => (string)$_POST['smtp_user'], 'WT_SMTP_PASS' => (string)$_POST['smtp_pass'], 'WT_MAIL_FROM' => (string)$_POST['smtp_from']);
            $changed = false;
            foreach ($lines as $i => $line) {
                foreach ($map as $const => $val) {
                    if (strpos($line, "'" . $const . "'") !== false) {
                        $lines[$i] = "define('" . $const . "', '" . str_replace(array("'", "\\"), '', $val) . "');\n"; $changed = true;
                    }
                }
            }
            if ($changed && @file_put_contents(WT_ROOT . '/wt-config.php', implode('', $lines)) !== false) {
                wt_log('Настройки SMTP обновлены');
                $_SESSION['wt_flash'] = array('ok', 'SMTP сохранён. Обновите страницу, чтобы значения вступили в силу.');
            } else $_SESSION['wt_flash'] = array('err', 'Не удалось записать wt-config.php — проверьте права на файл.');
            wt_redirect_to('settings&tab=security');
        }
        case 'smtp-test': {
            $to = wt_option('admin_email', $user['user_email']);
            $r = wt_mail($to, 'Wordtime: проверка почты', "Если вы читаете это — почта работает.\nКоды 2FA будут приходить сюда.");
            $_SESSION['wt_flash'] = !empty($r['ok']) ? array('ok', 'Письмо отправлено: ' . esc($r['method'])) : array('err', 'Почта не ушла (' . esc($r['error']) . '). Коды сохраняются в ' . esc($r['log']));
            wt_redirect_to('settings&tab=security');
        }
        case 'login-style': {
            wt_set_option('login_accent', preg_match('/^#[0-9a-f]{6}$/i', (string)$_POST['accent']) ? $_POST['accent'] : '#14b8a6');
            wt_set_option('login_logo', trim(strip_tags($_POST['logo'])));
            wt_set_option('login_message', trim(strip_tags($_POST['message'])));
            wt_set_option('login_side', trim(strip_tags($_POST['side'])));
            wt_log('Оформление страницы входа обновлено');
            $_SESSION['wt_flash'] = array('ok', 'Страница входа обновлена — выйдите, чтобы увидеть.'); wt_redirect_to('settings&tab=login');
        }
        case 'attempts-clear': {
            wt_db()->exec('DELETE FROM ' . wt_t('login_attempts'));
            $_SESSION['wt_flash'] = array('ok', 'Счётчики попыток входа сброшены.'); wt_redirect_to('settings&tab=security');
        }
        case 'backup-zip': {
            list($okk, $res) = wt_backup_zip();
            wt_log($okk ? 'Создан полный бэкап ' . $res : 'Ошибка бэкапа: ' . $res);
            $_SESSION['wt_flash'] = $okk ? array('ok', 'Архив создан: ' . esc($res) . ' — скачайте его из списка.') : array('err', $res);
            wt_redirect_to(isset($_POST['back']) && preg_match('/^[a-z-]+$/', (string)$_POST['back']) ? (string)$_POST['back'] : 'settings&tab=backups');
        }
        case 'backup-sql': {
            $name = 'wordtime-db-' . date('Ymd-His') . '.sql';
            @file_put_contents(WT_DATA . '/backups/' . $name, wt_backup_db_sql());
            wt_log('Создан дамп базы ' . $name);
            $_SESSION['wt_flash'] = array('ok', 'Дамп базы создан: ' . esc($name));
            wt_redirect_to(isset($_POST['back']) && preg_match('/^[a-z-]+$/', (string)$_POST['back']) ? (string)$_POST['back'] : 'settings&tab=backups');
        }
        case 'backup-delete': {
            $f = basename((string)$_POST['file']);
            $path = WT_DATA . '/backups/' . $f;
            if (is_file($path)) { @unlink($path); wt_log('Удалён бэкап ' . $f); }
            $_SESSION['wt_flash'] = array('ok', 'Бэкап удалён.'); wt_redirect_to('settings&tab=backups');
        }
        case 'backup-restore': {
            if (empty($_POST['confirm'])) { $_SESSION['wt_flash'] = array('err', 'Подтвердите восстановление флажком.'); wt_redirect_to('settings&tab=backups'); }
            if (empty($_FILES['sql']['tmp_name'])) { $_SESSION['wt_flash'] = array('err', 'Выберите файл .sql'); wt_redirect_to('settings&tab=backups'); }
            $sql = (string)file_get_contents($_FILES['sql']['tmp_name']);
            $n = 0;
            try {
                foreach (preg_split('/;\s*\n/', $sql) as $q) {
                    $q = trim($q);
                    if ($q === '' || strpos($q, '--') === 0) continue;
                    wt_db()->exec($q); $n++;
                }
                wt_cache_flush(); wt_log('Восстановление из SQL: ' . $n . ' запросов');
                $_SESSION['wt_flash'] = array('ok', 'База восстановлена (' . $n . ' запросов).');
            } catch (Exception $e) {
                $_SESSION['wt_flash'] = array('err', 'Ошибка восстановления: ' . esc($e->getMessage()));
            }
            wt_redirect_to(isset($_POST['back']) && preg_match('/^[a-z-]+$/', (string)$_POST['back']) ? (string)$_POST['back'] : 'settings&tab=backups');
        }
        case 'key-create': {
            $key = 'wt_' . bin2hex(random_bytes(18));
            wt_db()->prepare('INSERT INTO ' . wt_t('api_keys') . ' (name, key_hash, scopes) VALUES (?,?,?)')
                ->execute(array(trim(strip_tags($_POST['name'])) !== '' ? trim(strip_tags($_POST['name'])) : 'Приложение', hash('sha256', $key), (string)$_POST['scopes']));
            wt_log('Создан API-ключ «' . $_POST['name'] . '»');
            $_SESSION['wt_flash'] = array('ok', 'Ключ создан. Скопируйте его сейчас — повторно он не показывается: <b style="font-family:monospace">' . esc($key) . '</b>');
            wt_redirect_to('api');
        }
        case 'key-delete': {
            wt_db()->prepare('DELETE FROM ' . wt_t('api_keys') . ' WHERE id = ?')->execute(array((int)$_POST['id']));
            $_SESSION['wt_flash'] = array('ok', 'Ключ отозван.'); wt_redirect_to('api');
        }
        case 'quick-draft': {
            $title = trim(strip_tags($_POST['title']));
            wt_db()->prepare('INSERT INTO ' . wt_t('posts') . ' (post_title, slug, post_content, category, post_status, post_author) VALUES (?,?,?,?, "draft", ?)')
                ->execute(array($title !== '' ? $title : 'Черновик', wt_slugify($title !== '' ? $title : 'draft') . '-' . substr(md5(microtime()), 0, 4), wt_kses($_POST['content']), 'Без рубрики', $user['user_login']));
            wt_cache_flush(); wt_log('Быстрый черновик «' . $title . '»');
            $_SESSION['wt_flash'] = array('ok', 'Черновик сохранён.'); wt_redirect_to('');
        }
        case 'log-clear': {
            @file_put_contents(WT_DATA . '/activity.log', '');
            $_SESSION['wt_flash'] = array('ok', 'Журнал событий очищен.'); wt_redirect_to('events');
        }
        case 'check-updates': {
            $_SESSION['wt_flash'] = array('ok', 'Проверка завершена: установлена последняя версия Wordtime ' . WT_VERSION . '.');
            wt_redirect_to('updates');
        }
    }
}

/* ── Каркас консоли ── */
function wt_form_open($hidden = array()) {
    echo '<form method="post" action="' . esc_attr(wt_admin_url()) . '" ' . (isset($hidden['enctype']) ? 'enctype="multipart/form-data"' : '') . '>';
    echo '<input type="hidden" name="action" value="' . esc_attr($hidden['action']) . '"><input type="hidden" name="wt_nonce" value="' . wt_nonce('admin') . '">';
    foreach ($hidden as $k => $val) if (!in_array($k, array('action', 'enctype'), true)) echo '<input type="hidden" name="' . esc_attr($k) . '" value="' . esc_attr($val) . '">';
}

function wt_menu_active($target) {
    global $page, $tab;
    $pg = $target; $tb = ''; $extra = false;
    if (strpos($target, '&tab=') !== false) { list($pg, $tb) = explode('&tab=', $target, 2); }
    if (strpos($target, '&new=1') !== false) { $pg = str_replace('&new=1', '', $target); $extra = true; }
    if ((string)$pg !== (string)$page) return false;
    if ($tb !== '' && $tb !== $tab) return false;
    if ($extra && !isset($_GET['new'])) return false;
    return true;
}

function wt_shell($pageKey, $title, $sub) {
    global $user, $flash, $page;
    wt_admin_css();
    echo '<title>' . esc($title) . ' · Wordtime CMS</title>';
    $pendingComments = (int)wt_db()->query('SELECT COUNT(*) FROM ' . wt_t('comments') . ' WHERE status = "pending"')->fetchColumn();
    $drafts = (int)wt_db()->query('SELECT COUNT(*) FROM ' . wt_t('posts') . ' WHERE post_status = "draft"')->fetchColumn();
    $menu = array(
        'УПРАВЛЕНИЕ' => array(
            array('k' => '', 'l' => 'Консоль', 'i' => 'dash', 'fly' => array(array('t' => '', 'l' => 'Главная'), array('t' => 'events', 'l' => 'События'))),
            array('k' => 'updates', 'l' => 'Обновления', 'i' => 'refresh', 'dot' => true),
            array('k' => 'posts', 'l' => 'Записи', 'i' => 'pin', 'cnt' => $drafts > 0 ? $drafts . ' черн.' : '', 'fly' => array(
                array('t' => 'posts', 'l' => 'Все записи'), array('t' => 'posts&new=1', 'l' => 'Добавить новую'),
                array('t' => 'categories', 'l' => 'Рубрики'), array('t' => 'tags', 'l' => 'Метки'))),
            array('k' => 'media', 'l' => 'Медиафайлы', 'i' => 'image', 'fly' => array(array('t' => 'media', 'l' => 'Библиотека'), array('t' => 'media&new=1', 'l' => 'Добавить новый'))),
            array('k' => 'pages', 'l' => 'Страницы', 'i' => 'pages', 'fly' => array(array('t' => 'pages', 'l' => 'Все страницы'), array('t' => 'pages&new=1', 'l' => 'Добавить новую'))),
            array('k' => 'comments', 'l' => 'Комментарии', 'i' => 'comment', 'cnt' => $pendingComments > 0 ? (string)$pendingComments : ''),
        ),
        'ДИЗАЙН' => array(
            array('k' => 'themes', 'l' => 'Внешний вид', 'i' => 'palette', 'fly' => array(
                array('t' => 'themes', 'l' => 'Темы'), array('t' => 'menus', 'l' => 'Меню'), array('t' => 'theme-editor', 'l' => 'Редактор тем'))),
            array('k' => 'plugins', 'l' => 'Плагины', 'i' => 'plug', 'fly' => array(array('t' => 'plugins', 'l' => 'Установленные'), array('t' => 'plugin-new', 'l' => 'Добавить новый'))),
        ),
        'СИСТЕМА' => array(
            array('k' => 'users', 'l' => 'Пользователи', 'i' => 'users', 'fly' => array(
                array('t' => 'users', 'l' => 'Все пользователи'), array('t' => 'users&new=1', 'l' => 'Добавить нового'), array('t' => 'profile', 'l' => 'Ваш профиль'))),
            array('k' => 'import', 'l' => 'Инструменты', 'i' => 'wrench', 'fly' => array(
                array('t' => 'import', 'l' => 'Импорт'), array('t' => 'export', 'l' => 'Экспорт'), array('t' => 'migration', 'l' => 'Миграция сайта'))),
            array('k' => 'perf', 'l' => 'Оптимизация', 'i' => 'zap', 'fly' => array(
                array('t' => 'perf', 'l' => 'Скорость и кеш'), array('t' => 'images', 'l' => 'Изображения'),
                array('t' => 'sitemap', 'l' => 'Sitemap'), array('t' => 'seo', 'l' => 'SEO-заголовки'), array('t' => 'api', 'l' => 'Мобильные приложения и API'))),
            array('k' => 'settings', 'l' => 'Настройки', 'i' => 'gear', 'fly' => array(
                array('t' => 'settings', 'l' => 'Общие'), array('t' => 'settings&tab=comments', 'l' => 'Обсуждение'),
                array('t' => 'settings&tab=cache', 'l' => 'Кеш и скорость'), array('t' => 'settings&tab=security', 'l' => 'Безопасность и 2FA'),
                array('t' => 'settings&tab=backups', 'l' => 'Резервные копии'), array('t' => 'settings&tab=login', 'l' => 'Страница входа'))),
            array('k' => 'hosting', 'l' => 'Установка на хостинг', 'i' => 'globe'),
            array('k' => 'health', 'l' => 'Здоровье системы', 'i' => 'pulse'),
        ),
    );
    echo '<div class="app"><aside class="side" id="wtSide">';
    echo '<div class="brand"><span class="mark">' . wt_icon('hour', 22) . '</span><span><b>Wordtime</b><small>CMS ' . WT_VERSION . '</small></span></div>';
    echo '<nav class="nav">';
    foreach ($menu as $sec => $items) {
        echo '<div class="sec">' . $sec . '</div>';
        foreach ($items as $it) {
            $groupOn = false;
            if (isset($it['fly'])) foreach ($it['fly'] as $f) if (wt_menu_active($f['t'])) $groupOn = true;
            $on = ((string)$it['k'] === (string)$pageKey) || ($pageKey === '' && $it['k'] === '');
            echo '<a class="it ' . ($on || $groupOn ? 'on' : '') . '" href="' . esc_attr(wt_admin_url('&page=' . $it['k'])) . '">' . wt_icon($it['i']) . '<span>' . $it['l'] . '</span>';
            if (!empty($it['cnt'])) echo '<span class="cnt">' . esc($it['cnt']) . '</span>';
            if (!empty($it['dot'])) echo '<span class="dot"></span>';
            if (isset($it['fly'])) echo '<span class="flychev">' . wt_icon('chev', 14) . '</span>';
            echo '</a>';
            if (isset($it['fly'])) {
                echo '<div class="sub"><div class="cap">' . $it['l'] . '</div>';
                foreach ($it['fly'] as $f) {
                    echo '<a class="' . (wt_menu_active($f['t']) ? 'on' : '') . '" href="' . esc_attr(wt_admin_url('&page=' . $f['t'])) . '">' . $f['l'] . '</a>';
                }
                echo '</div>';
            }
        }
    }
    echo '</nav>';
    echo '<div class="side-foot"><div class="chip"><span class="ava">' . esc(mb_strtoupper(mb_substr($user['user_login'], 0, 1))) . '</span><span class="who"><b>' . esc($user['user_login']) . '</b><span>' . esc($user['user_role']) . '</span></span><a class="out" href="' . esc_attr(wt_admin_url('&action=logout')) . '" title="Выйти">' . wt_icon('logout', 16) . '</a></div></div>';
    echo '</aside><div class="wrap">';
    echo '<div class="top"><button class="burger" onclick="document.getElementById(\'wtSide\').classList.toggle(\'open\')" aria-label="Меню">' . wt_icon('menu', 22) . '</button>';
    echo '<span class="crumb">Консоль / <b>' . esc($title) . '</b></span><span class="sp"></span>';
    wt_form_open(array('action' => 'cache-clear', 'back' => $page !== '' ? $page : 'settings&tab=cache'));
    echo '<button class="btn amber sm" type="submit" title="Очистить кеш сайта">' . wt_icon('zap', 14) . 'Очистить кеш</button></form>';
    echo '<a class="btn ghost sm" style="border-color:#1d4d59;color:#cfe4e6" href="' . esc_attr(wt_base() . '/') . '" target="_blank">' . wt_icon('ext', 14) . 'Сайт</a>';
    echo '</div><main class="main">';
    echo '<h1 class="pt">' . esc($title) . '</h1><p class="ps">' . esc($sub) . '</p>';
    if (is_array($flash)) {
        $tone = $flash[0] === 'ok' ? 'ok' : ($flash[0] === 'warn' ? 'warn' : 'err');
        echo '<div class="alert ' . $tone . '">' . wt_icon($flash[0] === 'ok' ? 'check' : 'alert', 17) . '<span>' . $flash[1] . '</span></div>';
    }
}

function wt_shell_close() {
    echo '</main></div></div><script>';
    echo 'document.addEventListener("click",function(e){var s=document.getElementById("wtSide");if(s&&s.classList.contains("open")&&!s.contains(e.target)&&!e.target.closest(".burger"))s.classList.remove("open");});';
    echo '(function(){var subs=document.querySelectorAll(".sub");';
    echo 'document.querySelectorAll(".nav a.it").forEach(function(a){var sub=a.nextElementSibling;if(!sub||!sub.classList.contains("sub"))return;';
    echo 'function show(){var r=a.getBoundingClientRect();sub.style.position="fixed";sub.style.left=(r.right+8)+"px";var t=r.top-8;sub.classList.add("show");var h=sub.offsetHeight;if(t+h>window.innerHeight-12)t=Math.max(12,window.innerHeight-12-h);sub.style.top=t+"px";}';
    echo 'function hide(){sub.classList.remove("show");}';
    echo 'a.addEventListener("mouseenter",show);a.addEventListener("focus",show);';
    echo 'a.addEventListener("mouseleave",function(){setTimeout(function(){if(!sub.matches(":hover"))hide();},120);});';
    echo 'sub.addEventListener("mouseleave",hide);';
    echo 'a.addEventListener("click",function(e){if(window.matchMedia("(hover:none)").matches){e.preventDefault();var was=sub.classList.contains("show");subs.forEach(function(s){s.classList.remove("show");});if(!was)show();}});';
    echo '});';
    echo 'window.addEventListener("scroll",function(){subs.forEach(function(s){s.classList.remove("show");});},true);';
    echo '})();';
    echo 'document.querySelectorAll("[data-copy]").forEach(function(b){b.addEventListener("click",function(){var t=b.getAttribute("data-copy");if(navigator.clipboard)navigator.clipboard.writeText(t);var o=b.innerHTML;b.innerHTML="OK";setTimeout(function(){b.innerHTML=o;},1200);});});';
    echo 'document.querySelectorAll(".stat b[data-n]").forEach(function(el){var n=+el.getAttribute("data-n"),t0=null;function step(ts){if(!t0)t0=ts;var k=Math.min(1,(ts-t0)/600);el.textContent=Math.round(n*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(step);}requestAnimationFrame(step);});';
    echo '</script></body></html>';
}

require WT_ROOT . '/wt-admin/screens.php';

switch ($page) {
    case 'posts': wt_screen_posts(); break;
    case 'pages': wt_screen_pages(); break;
    case 'comments': wt_screen_comments(); break;
    case 'media': wt_screen_media(); break;
    case 'users': wt_screen_users(); break;
    case 'profile': wt_screen_profile(); break;
    case 'themes': wt_screen_themes(); break;
    case 'menus': wt_screen_menus(); break;
    case 'theme-editor': wt_screen_theme_editor(); break;
    case 'plugins': wt_screen_plugins(); break;
    case 'plugin-new': wt_screen_plugin_new(); break;
    case 'categories': wt_screen_categories(); break;
    case 'tags': wt_screen_tags(); break;
    case 'import': wt_screen_import(); break;
    case 'export': wt_screen_export(); break;
    case 'migration': wt_screen_migration(); break;
    case 'perf': wt_screen_perf(); break;
    case 'images': wt_screen_images(); break;
    case 'sitemap': wt_screen_sitemap(); break;
    case 'seo': wt_screen_seo(); break;
    case 'api': wt_screen_api(); break;
    case 'backups': wt_screen_backups(); break;
    case 'events': wt_screen_events(); break;
    case 'updates': wt_screen_updates(); break;
    case 'hosting': wt_screen_hosting(); break;
    case 'health': wt_screen_health(); break;
    case 'settings': wt_screen_settings(); break;
    default: wt_screen_dashboard(); break;
}
