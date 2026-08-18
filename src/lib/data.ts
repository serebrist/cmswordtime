/* ── Wordtime CMS: типы и стартовые данные ─────────────────────────── */

export type PostStatus = "published" | "draft";
export interface Post {
  id: string; title: string; content: string; category: string; tags: string[];
  status: PostStatus; date: string; author: string; image?: string; views: number;
}
export interface Page { id: string; title: string; status: PostStatus; date: string; }
export type CommentStatus = "approved" | "pending" | "spam";
export interface Comment {
  id: string; postId: string; author: string; email: string; text: string;
  date: string; status: CommentStatus;
}
export interface PluginItem {
  slug: string; name: string; desc: string; author: string; version: string;
  color: string; letter: string; rating: number; installs: string;
  installed: boolean; active: boolean; builtin?: boolean;
  progress?: number;
}
export interface ThemeItem {
  slug: string; name: string; author: string; installed: boolean; active: boolean;
  c1: string; c2: string; font: string; pattern: "bars" | "hero" | "grid" | "split";
}
export interface UserItem { id: string; name: string; email: string; role: string; date: string; color: string; password?: string; }
export interface BackupItem { id: string; date: string; sizeKB: number; label: string; kind: "Полная" | "База данных"; snapshot: string; }
export interface MediaItem { id: string; name: string; url: string; kind: "image" | "gradient"; size: string; dims: string; date: string; hue?: number; }

export interface LoginCustom {
  accent: string; mode: "gradient" | "solid" | "image";
  imageUrl?: string; logoText: string; message: string;
  rounded: boolean; showRegister: boolean; sideNote: string;
}

export interface Settings {
  siteTitle: string; tagline: string; adminEmail: string; timezone: string;
  commentsDisabled: boolean; moderateFirst: boolean; closeAfterDays: number; requireEmail: boolean;
  cacheEnabled: boolean; autoPurge: string;
  twoFAMethod: string; sessions: { id: string; device: string; place: string; time: string; current?: boolean }[];
  login: LoginCustom;
}

export interface AppState {
  version: string;
  settings: Settings;
  categories: string[];
  posts: Post[]; pages: Page[]; comments: Comment[];
  plugins: PluginItem[]; themes: ThemeItem[]; users: UserItem[];
  backups: BackupItem[]; media: MediaItem[];
  cache: { sizeKB: number; lastCleared: string; hits: number };
  activity: { id: string; text: string; time: string; icon: string }[];
  welcomeDismissed: boolean;
}

/* ── стартовое наполнение ──────────────────────────────────────────── */

export const CATEGORIES = ["Новости", "Технологии", "Безопасность", "Руководства"];

export function seedState(): AppState {
  return {
    version: "1.0.4",
    categories: ["Новости", "Технологии", "Безопасность", "Руководства", "Без рубрики"],
    settings: {
      siteTitle: "Wordtime", tagline: "Быстрая CMS нового поколения",
      adminEmail: "admin@wordtime.ru", timezone: "Москва (UTC+3)",
      commentsDisabled: false, moderateFirst: true, closeAfterDays: 30, requireEmail: true,
      cacheEnabled: true, autoPurge: "Каждые 6 часов",
      twoFAMethod: "Код на электронную почту",
      sessions: [
        { id: "s1", device: "Chrome · Windows", place: "Москва, Россия", time: "сейчас", current: true },
        { id: "s2", device: "Safari · iPhone", place: "Санкт-Петербург, Россия", time: "вчера, 21:14" },
      ],
      login: {
        accent: "#0e9384", mode: "gradient",
        logoText: "Wordtime", message: "Рады видеть вас снова",
        rounded: true, showRegister: true,
        sideNote: "Совместимо с плагинами и темами WordPress®",
      },
    },
    posts: [
      {
        id: "p1", title: "Wordtime 1.0 — первый публичный выпуск",
        content: "Сегодня мы выпускаем Wordtime 1.0 — CMS, которая говорит с вами по-русски и понимает вас с полуслова.\n\nВнутри: знакомая по WordPress структура консоли, слой совместимости WT-Compat для тысяч плагинов и тем, встроенная двухфакторная аутентификация и миграция сайта одним файлом.\n\nМы переосмыслили каждую панель: консоль загружается мгновенно, кеш очищается одной кнопкой, а резервная копия всего сайта создаётся за секунды и скачивается одним файлом .wtm.\n\nСпасибо, что строите вместе с нами. Дальше — больше.",
        category: "Новости", tags: ["релиз", "wordtime"], status: "published",
        date: "2026-02-12", author: "Администратор", image: "https://image.qwenlm.ai/generated-images/c7683d80-d0ef-4935-a592-c59e38c91a81/_result.png", views: 4821,
      },
      {
        id: "p2", title: "Как слой WT-Compat запускает плагины WordPress",
        content: "Главный вопрос, который нам задают: «А точно ли мои плагины заработают?»\n\nСлой WT-Compat эмулирует программные интерфейсы WordPress на уровне ядра: хуки, фильтры, шорткоды и REST-эндпоинты транслируются в нативные вызовы Wordtime. Плагин «думает», что работает в привычной среде, а выполняет его быстрый движок Wordtime.\n\nНа практике это означает, что Yoast SEO, WooCommerce, Elementor и Contact Form 7 ставятся в один клик — без танцев с бубном.",
        category: "Технологии", tags: ["wt-compat", "плагины"], status: "published",
        date: "2026-02-08", author: "Администратор", image: "https://image.qwenlm.ai/generated-images/518dff58-f601-4b6f-be1f-3b3d252f8a50/_result.png", views: 3104,
      },
      {
        id: "p3", title: "Кеширование в Wordtime: разбор архитектуры",
        content: "Кеш в Wordtime — гражданин первого класса, а не надстройка.\n\nСтраничный кеш, кеш объектов и кеш фрагментов живут в едином хранилище с мгновенной инвалидацией по тегам. Сохранили запись — связанные страницы обновились сами.\n\nВ настройках «Кеш и производительность» видно занятое место, число обслуженных запросов и дата последней очистки. Одна кнопка — и кеш девственно чист.",
        category: "Технологии", tags: ["кеш", "производительность"], status: "published",
        date: "2026-02-02", author: "Мария Соколова", image: "https://image.qwenlm.ai/generated-images/99e18776-df3f-4588-9239-51b06aee1012/_result.png", views: 2570,
      },
      {
        id: "p4", title: "Двухфакторная аутентификация из коробки",
        content: "Пароли утекают. Поэтому в Wordtime вход без второго фактора невозможен в принципе.\n\nПосле ввода пароля на почту приходит шести значный код. Ввели — вошли. Код живёт пять минут, попыток всего пять, а каждая новая сессия фиксируется в журнале.\n\nНикаких плагинов безопасности ставить не нужно: WT-Безопасность уже в ядре.",
        category: "Безопасность", tags: ["2fa", "безопасность"], status: "published",
        date: "2026-01-27", author: "Дмитрий Орлов", views: 1988,
      },
      {
        id: "p5", title: "Миграция с WordPress за 4 минуты",
        content: "Черновик руководства по переезду: экспорт из WordPress, импорт в WT-Миграцию, проверка постоянных ссылок и перенос медиафайлов.\n\nTODO: скриншоты мастера восстановления и сравнение размеров файлов экспорта.",
        category: "Руководства", tags: ["миграция"], status: "draft",
        date: "2026-02-14", author: "Администратор", views: 12,
      },
      {
        id: "p6", title: "Гид по темам: от Twenty Twenty до Astra",
        content: "Черновик обзора тем, совместимых с Wordtime через WT-Compat: Twenty Twenty-Five, Astra, OceanWP, GeneratePress и фирменной Wordtime Start.",
        category: "Руководства", tags: ["темы"], status: "draft",
        date: "2026-02-15", author: "Мария Соколова", views: 4,
      },
    ],
    pages: [
      { id: "pg1", title: "Главная", status: "published", date: "2026-01-10" },
      { id: "pg2", title: "О проекте", status: "published", date: "2026-01-12" },
      { id: "pg3", title: "Контакты", status: "published", date: "2026-01-15" },
      { id: "pg4", title: "Политика конфиденциальности", status: "draft", date: "2026-02-01" },
    ],
    comments: [
      { id: "c1", postId: "p1", author: "Игорь Ветров", email: "igor@example.ru", text: "Наконец-то CMS с нормальной русской локалью из коробки. Переношу три клиентских сайта уже на этой неделе.", date: "2026-02-12", status: "approved" },
      { id: "c2", postId: "p1", author: "Анна Крылова", email: "anna.k@example.ru", text: "А поддерживает ли WT-Compat Gutenberg-блоки из старых записей?", date: "2026-02-13", status: "pending" },
      { id: "c3", postId: "p2", author: "Сергей", email: "serg@example.ru", text: "Elementor завёлся с первого раза, не ожидал. Респект команде ядра.", date: "2026-02-09", status: "approved" },
      { id: "c4", postId: "p3", author: "buy-followers-top", email: "spam1@xmail.biz", text: "Best promotion for your site!!! Click here >>> http://spam.example", date: "2026-02-10", status: "spam" },
      { id: "c5", postId: "p4", author: "Павел Гущин", email: "pg@example.ru", text: "2FA по почте — хорошо, но когда добавите TOTP-приложения?", date: "2026-01-28", status: "pending" },
      { id: "c6", postId: "p2", author: "Лидия Мороз", email: "lidia@example.ru", text: "WooCommerce работает, но корзина чуть медленнее, чем на оригинале. Ждём оптимизаций!", date: "2026-02-11", status: "approved" },
      { id: "c7", postId: "p1", author: "Тимур", email: "timur@example.ru", text: "Установка заняла меньше минуты. Впечатлён скоростью консоли.", date: "2026-02-14", status: "approved" },
    ],
    plugins: [
      { slug: "wt-migration", name: "WT-Миграция", desc: "Резервное копирование, перенос и восстановление всего сайта одним файлом. Встроено в ядро Wordtime.", author: "Команда Wordtime", version: "1.0.4", color: "#0e9384", letter: "М", rating: 5, installs: "в ядре", installed: true, active: true, builtin: true },
      { slug: "wt-security", name: "WT-Безопасность (2FA)", desc: "Обязательная двухфакторная аутентификация, журнал входов и контроль сессий.", author: "Команда Wordtime", version: "1.0.4", color: "#f2b03d", letter: "Щ", rating: 5, installs: "в ядре", installed: true, active: true, builtin: true },
      { slug: "wt-cache", name: "WT-Кеш", desc: "Страничный кеш, кеш объектов и мгновенная инвалидация по тегам.", author: "Команда Wordtime", version: "1.0.4", color: "#2c6b7a", letter: "К", rating: 5, installs: "в ядре", installed: true, active: true, builtin: true },
      { slug: "hello-dolly", name: "Hello Dolly", desc: "Классика от Луи Армстронга прямо в консоли. Немного лирики в будни администратора.", author: "Matt Mullenweg", version: "1.7.2", color: "#8896a4", letter: "♪", rating: 4, installs: "6 млн+", installed: true, active: false },
      { slug: "wordpress-seo", name: "Yoast SEO", desc: "Всё для поисковой оптимизации: мета-теги, карта сайта, анализ читабельности.", author: "Team Yoast", version: "24.6", color: "#a4286a", letter: "Y", rating: 5, installs: "5 млн+", installed: false, active: false },
      { slug: "woocommerce", name: "WooCommerce", desc: "Полноценный интернет-магазин: товары, корзина, оплата, доставка.", author: "Automattic", version: "9.8.1", color: "#7f54b3", letter: "W", rating: 4, installs: "5 млн+", installed: false, active: false },
      { slug: "elementor", name: "Elementor", desc: "Визуальный конструктор страниц с перетаскиванием блоков.", author: "Elementor.com", version: "3.28", color: "#92003b", letter: "E", rating: 5, installs: "5 млн+", installed: false, active: false },
      { slug: "contact-form-7", name: "Contact Form 7", desc: "Простые и гибкие контактные формы для любых задач.", author: "Takayuki Miyoshi", version: "6.0.5", color: "#2563a8", letter: "C", rating: 4, installs: "5 млн+", installed: false, active: false },
      { slug: "akismet", name: "Akismet Anti-Spam", desc: "Автоматическая фильтрация спам-комментариев по облачной базе.", author: "Automattic", version: "5.4", color: "#148a74", letter: "A", rating: 5, installs: "5 млн+", installed: false, active: false },
      { slug: "wordfence", name: "Wordfence Security", desc: "Межсетевой экран, сканер вредоносного кода и защита входа.", author: "Wordfence", version: "8.0.4", color: "#e05c3c", letter: "W", rating: 5, installs: "4 млн+", installed: false, active: false },
      { slug: "wpforms-lite", name: "WPForms", desc: "Дружелюбный мастер форм: заявки, опросы, подписки.", author: "WPForms LLC", version: "1.9.4", color: "#e27730", letter: "F", rating: 5, installs: "6 млн+", installed: false, active: false },
      { slug: "rank-math", name: "Rank Math SEO", desc: "Мощный SEO-набор с подсказками в реальном времени.", author: "Rank Math", version: "1.0.238", color: "#4a6cf7", letter: "R", rating: 5, installs: "3 млн+", installed: false, active: false },
      { slug: "litespeed-cache", name: "LiteSpeed Cache", desc: "Ускорение сайта на уровне сервера и браузера.", author: "LiteSpeed Technologies", version: "7.1", color: "#3aa3e3", letter: "L", rating: 5, installs: "6 млн+", installed: false, active: false },
      { slug: "wp-mail-smtp", name: "WP Mail SMTP", desc: "Надёжная отправка почты через SMTP-провайдера.", author: "WP Mail SMTP", version: "4.3", color: "#4f46e5", letter: "M", rating: 4, installs: "3 млн+", installed: false, active: false },
    ],
    themes: [
      { slug: "wordtime-start", name: "Wordtime Start", author: "Команда Wordtime", installed: true, active: true, c1: "#0c2e36", c2: "#14b8a6", font: "Unbounded", pattern: "hero" },
      { slug: "twentytwentyfive", name: "Twenty Twenty-Five", author: "wordpress.org", installed: true, active: false, c1: "#1a1a1a", c2: "#5b7bd5", font: "Manrope", pattern: "bars" },
      { slug: "astra", name: "Astra", author: "Brainstorm Force", installed: false, active: false, c1: "#2d2e38", c2: "#ff5f6c", font: "Golos Text", pattern: "grid" },
      { slug: "oceanwp", name: "OceanWP", author: "OceanWP", installed: false, active: false, c1: "#123a5c", c2: "#13aff0", font: "Golos Text", pattern: "split" },
      { slug: "generatepress", name: "GeneratePress", author: "Tom Usborne", installed: false, active: false, c1: "#303437", c2: "#22b3b0", font: "Golos Text", pattern: "bars" },
      { slug: "neve", name: "Neve", author: "ThemeIsle", installed: false, active: false, c1: "#262932", c2: "#0366d6", font: "Golos Text", pattern: "hero" },
    ],
    users: [
      { id: "u1", name: "Администратор", email: "admin@wordtime.ru", role: "Администратор", date: "2026-01-10", color: "#0e9384", password: "wordtime" },
      { id: "u2", name: "Мария Соколова", email: "maria@wordtime.ru", role: "Редактор", date: "2026-01-14", color: "#d99417" },
      { id: "u3", name: "Дмитрий Орлов", email: "dmitry@wordtime.ru", role: "Автор", date: "2026-01-20", color: "#2c6b7a" },
      { id: "u4", name: "Гость Ярмарки", email: "guest@example.ru", role: "Подписчик", date: "2026-02-02", color: "#8896a4" },
    ],
    backups: [
      { id: "b1", date: "2026-02-14 03:00", sizeKB: 2148, label: "Автоматическая копия", kind: "Полная", snapshot: "" },
    ],
    media: [
      { id: "m1", name: "media-launch.jpg", url: "https://image.qwenlm.ai/generated-images/c7683d80-d0ef-4935-a592-c59e38c91a81/_result.png", kind: "image", size: "386 КБ", dims: "1536 × 1024", date: "2026-02-12" },
      { id: "m2", name: "media-code.jpg", url: "https://image.qwenlm.ai/generated-images/518dff58-f601-4b6f-be1f-3b3d252f8a50/_result.png", kind: "image", size: "412 КБ", dims: "1536 × 1024", date: "2026-02-08" },
      { id: "m3", name: "media-server.jpg", url: "https://image.qwenlm.ai/generated-images/99e18776-df3f-4588-9239-51b06aee1012/_result.png", kind: "image", size: "354 КБ", dims: "1536 × 1024", date: "2026-02-02" },
      { id: "m4", name: "media-ink.jpg", url: "https://image.qwenlm.ai/generated-images/a3277af0-b678-4b2f-ab28-c9a4a21f77c5/_result.png", kind: "image", size: "298 КБ", dims: "1536 × 1024", date: "2026-01-25" },
    ],
    cache: { sizeKB: 18432, lastCleared: "2026-02-15 09:12", hits: 48210 },
    activity: [
      { id: "a1", text: "Тимур оставил комментарий к «Wordtime 1.0»", time: "2 часа назад", icon: "comment" },
      { id: "a2", text: "Мария Соколова обновила черновик «Гид по темам»", time: "5 часов назад", icon: "edit" },
      { id: "a3", text: "WT-Кеш автоматически очищен (планово)", time: "9 часов назад", icon: "zap" },
      { id: "a4", text: "Автоматическая резервная копия создана", time: "вчера, 03:00", icon: "cloud" },
      { id: "a5", text: "Akismet заблокировал 14 спам-комментариев", time: "вчера, 03:00", icon: "shield" },
      { id: "a6", text: "Дмитрий Орлов опубликовал запись о 2FA", time: "3 дня назад", icon: "pin" },
    ],
    welcomeDismissed: false,
  };
}

/* ── утилиты ───────────────────────────────────────────────────────── */

export const uid = () => Math.random().toString(36).slice(2, 10);

export function fmtKB(kb: number): string {
  if (kb >= 1024 * 1024) return (kb / 1024 / 1024).toFixed(2).replace(".", ",") + " ГБ";
  if (kb >= 1024) return (kb / 1024).toFixed(1).replace(".", ",") + " МБ";
  return Math.round(kb) + " КБ";
}

export function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function todayISO(): string { return nowStamp().slice(0, 10); }

export function ruDate(iso: string): string {
  const d = new Date(iso.replace(" ", "T"));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
