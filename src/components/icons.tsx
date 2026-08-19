import React from "react";

/* Единая фабрика иконок Wordtime (штрих 1.8, сетка 24) */

const P: Record<string, React.ReactNode> = {
  wt: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4.5" fill="currentColor" opacity="0.16" stroke="none" />
      <path d="M6 8.5 8.6 16l2-5 2 5L15.2 8.5" strokeWidth="2" />
      <path d="M16.8 8.5v7.5" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  dashboard: (
    <>
      <path d="M4 13a8 8 0 1 1 16 0" />
      <path d="M12 13l3.5-3.5" strokeLinecap="round" />
      <path d="M3 17h18" strokeLinecap="round" />
      <path d="M5.5 20h13" strokeLinecap="round" opacity="0.5" />
    </>
  ),
  home: <><path d="M4 11 12 4l8 7" /><path d="M6.5 9.8V20h11V9.8" /><path d="M10 20v-5h4v5" /></>,
  pin: (
    <>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M9 9.5h7M9 13h7M9 16.5h4.5" strokeLinecap="round" />
    </>
  ),
  image: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4.5 17.5 10 13l3.5 3 3-2.5 3 3" strokeLinecap="round" />
    </>
  ),
  pages: (
    <>
      <rect x="7.5" y="6.5" width="12" height="13.5" rx="1.8" />
      <path d="M16.5 6.5v-1A1.8 1.8 0 0 0 14.7 3.7H6.3a1.8 1.8 0 0 0-1.8 1.8v11a1.8 1.8 0 0 0 1.8 1.8h1" />
      <path d="M10.5 11h6M10.5 14.5h6" strokeLinecap="round" />
    </>
  ),
  comment: (
    <>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H12l-4.5 4v-4h-1A2.5 2.5 0 0 1 4 13.5z" />
      <path d="M8.5 9h7M8.5 12h4.5" strokeLinecap="round" />
    </>
  ),
  brush: (
    <>
      <path d="M14.5 4.5 19.5 9.5 9 20H4v-5z" />
      <path d="M12.5 6.5l5 5" />
      <path d="M4 20c2.5 0 4.5-.6 5.4-2.4" strokeLinecap="round" opacity="0.55" />
    </>
  ),
  plug: (
    <>
      <path d="M9 3.5V8M15 3.5V8" strokeLinecap="round" />
      <path d="M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0z" />
      <path d="M12 17v3.5" strokeLinecap="round" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" strokeLinecap="round" />
      <path d="M15.5 5.8a3.2 3.2 0 0 1 0 5.4M17.5 14.9c1.7.8 2.7 2.4 3 4.6" strokeLinecap="round" />
    </>
  ),
  wrench: (
    <>
      <path d="M14.5 6.5a4 4 0 0 0 5 5L13 18a2.1 2.1 0 0 1-3-3l6.5-6.5z" transform="rotate(45 12 12)" opacity="0" />
      <path d="M20 7.5a4.5 4.5 0 0 1-6.2 5.2L7 19.5A2.1 2.1 0 0 1 4 16.6l6.8-6.8A4.5 4.5 0 0 1 16 3.6l-2.6 2.6.4 3 3 .4z" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 3.5v2.4M12 18.1v2.4M3.5 12h2.4M18.1 12h2.4M6 6l1.7 1.7M16.3 16.3 18 18M18 6l-1.7 1.7M7.7 16.3 6 18" strokeLinecap="round" />
    </>
  ),
  collapse: <><path d="M11 7 6 12l5 5" strokeLinecap="round" strokeLinejoin="round" /><path d="M18 5v14" strokeLinecap="round" opacity="0.5" /></>,
  expand: <><path d="M13 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 5v14" strokeLinecap="round" opacity="0.5" /></>,
  plus: <path d="M12 5v14M5 12h14" strokeLinecap="round" />,
  search: <><circle cx="10.5" cy="10.5" r="6" /><path d="m15.5 15.5 4.5 4.5" strokeLinecap="round" /></>,
  bell: <><path d="M6 16v-5.5a6 6 0 1 1 12 0V16l1.5 2.5h-15z" strokeLinejoin="round" /><path d="M10 21a2.2 2.2 0 0 0 4 0" /></>,
  cloud: <><path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96A5.5 5.5 0 0 1 17 8.6 4.2 4.2 0 0 1 16.8 18.5z" /><path d="M9.5 14.5 12 12l2.5 2.5M12 12.5V18" strokeLinecap="round" strokeLinejoin="round" /></>,
  shield: <><path d="M12 3.5 19 6v5.5c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V6z" strokeLinejoin="round" /><path d="m8.8 11.8 2.3 2.3 4.2-4.2" strokeLinecap="round" strokeLinejoin="round" /></>,
  zap: <path d="M13 3 5 13.5h5.5L11 21l8-10.5h-5.5z" strokeLinejoin="round" />,
  download: <><path d="M12 4v11M7.5 11 12 15.5 16.5 11" strokeLinecap="round" strokeLinejoin="round" /><path d="M4.5 19.5h15" strokeLinecap="round" /></>,
  upload: <><path d="M12 15.5V4.5M7.5 8.5 12 4l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M4.5 19.5h15" strokeLinecap="round" /></>,
  trash: <><path d="M4.5 6.5h15M9.5 6.5v-2h5v2M6.5 6.5l1 13h9l1-13" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 10.5v5.5M14 10.5v5.5" strokeLinecap="round" /></>,
  edit: <><path d="m14.5 5 4.5 4.5L8.5 20H4v-4.5z" strokeLinejoin="round" /><path d="m12.5 7 4.5 4.5" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />,
  x: <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />,
  chevD: <path d="m6 9.5 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />,
  chevR: <path d="m9.5 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
  arrowL: <path d="M19 12H5m0 0 6-6m-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />,
  external: <><path d="M14 4.5h5.5V10" strokeLinecap="round" strokeLinejoin="round" /><path d="M19.2 4.8 11 13" strokeLinecap="round" /><path d="M18 13.5v4.7a1.8 1.8 0 0 1-1.8 1.8H6.3a1.8 1.8 0 0 1-1.8-1.8V8.3a1.8 1.8 0 0 1 1.8-1.8H11" strokeLinecap="round" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4.5 7.5 7.5 6 7.5-6" strokeLinecap="round" strokeLinejoin="round" /></>,
  lock: <><rect x="5.5" y="10.5" width="13" height="9.5" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /><circle cx="12" cy="15.2" r="1.3" fill="currentColor" stroke="none" /></>,
  eye: <><path d="M3 12s3.5-6.5 9-6.5S21 12 21 12s-3.5 6.5-9 6.5S3 12 3 12z" /><circle cx="12" cy="12" r="2.6" /></>,
  eyeoff: <><path d="M4 4l16 16" strokeLinecap="round" /><path d="M9.9 5.9A8.6 8.6 0 0 1 12 5.5c5.5 0 9 6.5 9 6.5a15.6 15.6 0 0 1-3 3.7M6.6 6.9A15 15 0 0 0 3 12s3.5 6.5 9 6.5a8.8 8.8 0 0 0 3.4-.7" strokeLinecap="round" /></>,
  star: <path d="m12 4 2.4 5 5.6.7-4.1 3.8 1.1 5.5-5-2.8-5 2.8 1.1-5.5L4 9.7 9.6 9z" strokeLinejoin="round" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2.5" strokeLinecap="round" strokeLinejoin="round" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5s1.3-6.2 3.8-8.5z" /></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.4" /><rect x="13" y="4" width="7" height="7" rx="1.4" /><rect x="4" y="13" width="7" height="7" rx="1.4" /><rect x="13" y="13" width="7" height="7" rx="1.4" /></>,
  refresh: <><path d="M5 12a7 7 0 0 1 12-4.9L19.5 9.5" strokeLinecap="round" /><path d="M19.5 4.5v5h-5" strokeLinecap="round" strokeLinejoin="round" /><path d="M19 12a7 7 0 0 1-12 4.9L4.5 14.5" strokeLinecap="round" /><path d="M4.5 19.5v-5h5" strokeLinecap="round" strokeLinejoin="round" /></>,
  copy: <><rect x="8.5" y="8.5" width="11" height="11" rx="1.8" /><path d="M15.5 8.5v-3A1.8 1.8 0 0 0 13.7 3.7H6.3a1.8 1.8 0 0 0-1.8 1.8v7.4a1.8 1.8 0 0 0 1.8 1.8h3" /></>,
  logout: <><path d="M14.5 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h7.5" strokeLinecap="round" /><path d="M16 8.5 19.5 12 16 15.5M19 12h-9" strokeLinecap="round" strokeLinejoin="round" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />,
  send: <path d="M20.5 3.5 3.5 10l6.5 2.5L12.5 19z" strokeLinejoin="round" />,
  tag: <><path d="M4 4.5h7L20 13.5a1.8 1.8 0 0 1 0 2.5l-4.5 4.5a1.8 1.8 0 0 1-2.5 0L4 11.5z" strokeLinejoin="round" /><circle cx="8.5" cy="9" r="1.3" fill="currentColor" stroke="none" /></>,
  folder: <path d="M3.5 7A2.5 2.5 0 0 1 6 4.5h3.5l2 2.5H18A2.5 2.5 0 0 1 20.5 9.5v8A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5z" strokeLinejoin="round" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" strokeLinejoin="round" />,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" strokeLinecap="round" /><circle cx="12" cy="8" r="1.1" fill="currentColor" stroke="none" /></>,
  database: <><ellipse cx="12" cy="6" rx="7.5" ry="3" /><path d="M4.5 6v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6" /><path d="M4.5 12v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6" /></>,
  monitor: <><rect x="3.5" y="4.5" width="17" height="12" rx="2" /><path d="M9 20h6M12 16.5V20" strokeLinecap="round" /></>,
  layout: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 9h17M9.5 9v10.5" /></>,
  sparkle: <><path d="M12 4c.6 3.8 2.2 5.4 6 6-3.8.6-5.4 2.2-6 6-.6-3.8-2.2-5.4-6-6 3.8-.6 5.4-2.2 6-6z" strokeLinejoin="round" /><path d="M19 15.5c.3 1.8 1 2.6 2.5 3-1.5.4-2.2 1.2-2.5 3-.3-1.8-1-2.6-2.5-3 1.5-.4 2.2-1.2 2.5-3z" strokeLinejoin="round" opacity="0.6" /></>,
  hourglass: <><path d="M6.5 3.5h11M6.5 20.5h11" strokeLinecap="round" /><path d="M7.5 3.5v2.6c0 2.7 4.5 3.7 4.5 5.9s-4.5 3.2-4.5 5.9v2.6M16.5 3.5v2.6c0 2.7-4.5 3.7-4.5 5.9s4.5 3.2 4.5 5.9v2.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 17.5c.5-1 1.3-1.5 2-1.5s1.5.5 2 1.5" strokeLinecap="round" opacity="0.7" /></>,
  phone: <><rect x="7" y="3.5" width="10" height="17" rx="2.5" /><path d="M10.5 17.8h3" strokeLinecap="round" /><path d="M9.5 6.5h5" strokeLinecap="round" opacity="0.6" /></>,
  rocket: <><path d="M12 3.5c3.5 1.6 5.5 5 5.5 9l2 3.2-3.6-.6c-1 2-2.4 3.4-3.9 4.1-1.5-.7-2.9-2.1-3.9-4.1l-3.6.6 2-3.2c0-4 2-7.4 5.5-9z" strokeLinejoin="round" /><circle cx="12" cy="9.8" r="1.6" /><path d="M9.3 18.7c-.5 1-1.4 1.7-2.6 1.9.1-1.3.4-2.4 1-3.3M14.7 18.7c.5 1 1.4 1.7 2.6 1.9-.1-1.3-.4-2.4-1-3.3" strokeLinecap="round" /></>,
  code: <path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />,
  file: <><path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5z" strokeLinejoin="round" /><path d="M13.5 3.5v5h5" strokeLinejoin="round" /><path d="M9 13h6M9 16.5h4" strokeLinecap="round" opacity="0.6" /></>,
  pulse: <path d="M3.5 12h4l2.5-6 4 12 2.5-6h4" strokeLinecap="round" strokeLinejoin="round" />,
  sun: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7" strokeLinecap="round" /></>,
  moon: <path d="M19.5 14.2A8 8 0 0 1 9.8 4.5a8 8 0 1 0 9.7 9.7z" strokeLinejoin="round" />,
  server: <><rect x="3.5" y="4" width="17" height="7" rx="1.5" /><rect x="3.5" y="13" width="17" height="7" rx="1.5" /><path d="M7 7.5h.01M7 16.5h.01" strokeLinecap="round" strokeWidth="2.4" /><path d="M13.5 7.5h3.5M13.5 16.5h3.5" strokeLinecap="round" opacity="0.6" /></>,
  terminal: <><rect x="3" y="4.5" width="18" height="15" rx="2" /><path d="m7 9.5 3 2.8-3 2.8M12.5 15.5H17" strokeLinecap="round" strokeLinejoin="round" /></>,
  package: <><path d="M12 3.5 20 7.5v9l-8 4-8-4v-9z" strokeLinejoin="round" /><path d="M4.3 7.7 12 11.5l7.7-3.8M12 11.5v8.6" strokeLinejoin="round" /><path d="M8 5.5l8 4" strokeLinecap="round" opacity="0.55" /></>,
  key: <><circle cx="8" cy="14.5" r="4" /><path d="m11 11.5 8-8M16.5 6l2.5 2.5M14 8.5l2 2" strokeLinecap="round" /></>,
};

export type IconName = keyof typeof P;

export function I({ n, size = 20, className = "", sw = 1.7 }: { n: IconName; size?: number; className?: string; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} className={className} aria-hidden="true">
      {P[n]}
    </svg>
  );
}

/* Логотип-знак Wordtime */
export function WTMark({ size = 34, light = false }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="9" fill={light ? "#e7faf7" : "#0e9384"} />
      <rect width="40" height="40" rx="9" fill="url(#wtg)" opacity="0.55" />
      <defs>
        <linearGradient id="wtg" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor={light ? "#99f6e4" : "#2dd4bf"} stopOpacity="0.9" />
          <stop offset="1" stopColor="#0c2e36" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <path d="M8 12l4.5 16 4.5-10.5L21.5 28 26 12" fill="none" stroke={light ? "#0c2e36" : "#062028"} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M29 12v16" stroke={light ? "#0e9384" : "#f2b03d"} strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="29" cy="9.6" r="2" fill={light ? "#0e9384" : "#f2b03d"} />
    </svg>
  );
}
