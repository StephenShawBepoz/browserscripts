// ==UserScript==
// @name         HubSpot: Quick actions
// @namespace    oolio-userscripts
// @version      0.1.0
// @description  Meeting and Directions buttons on HubSpot tickets, deals, companies and contacts. Directions shows the drive (and optionally public transport) time from your saved places to the customer's company.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/quick-actions.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/quick-actions.user.js
// @match        https://app.hubspot.com/help-desk/*
// @match        https://app.hubspot.com/contacts/*
// @match        https://app.hubspot.com/calendar-select-iframe/*
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTQwLjA5OSAwQzE3My4xODEgMCAyMDAgMjYuNjk3OSAyMDAgNTkuNjMxNEMyMDAgOTIuNTY0OSAxNzMuMTgxIDExOS4yNjMgMTQwLjA5OSAxMTkuMjYzQzEyNC42NzcgMTE5LjI2MyAxMTAuNjE2IDExMy40NjEgOTkuOTk4NiAxMDMuOTNDODkuMzgzNyAxMTMuNDYxIDc1LjMyMjkgMTE5LjI2MyA1OS45MDEgMTE5LjI2M0MyNi44MTg2IDExOS4yNjMgMCA5Mi41NjQ5IDAgNTkuNjMxNEMwIDI2LjY5NzkgMjYuODE4NiAwIDU5LjkwMSAwQzc1LjMyMzIgMCA4OS4zODQxIDUuODAxOTUgMTAwLjAwMSAxNS4zMzI5QzExMC42MTYgNS44MDE3NyAxMjQuNjc3IDAgMTQwLjA5OSAwWk0xNDAuMDk5IDM5LjkxODVDMTI5LjE2MyAzOS45MTg1IDEyMC4yOTcgNDguNzQ0MyAxMjAuMjk3IDU5LjYzMTRDMTIwLjI5NyA3MC41MTg1IDEyOS4xNjMgNzkuMzQ0MiAxNDAuMDk5IDc5LjM0NDJDMTUxLjAzNSA3OS4zNDQyIDE1OS45MDEgNzAuNTE4NSAxNTkuOTAxIDU5LjYzMTRDMTU5LjkwMSA0OC43NDQzIDE1MS4wMzUgMzkuOTE4NSAxNDAuMDk5IDM5LjkxODVaTTU5LjkwMSAzOS45MTg1QzQ4Ljk2NDcgMzkuOTE4NSA0MC4wOTkgNDguNzQ0MyA0MC4wOTkgNTkuNjMxNEM0MC4wOTkgNzAuNTE4NSA0OC45NjQ3IDc5LjM0NDIgNTkuOTAxIDc5LjM0NDJDNzAuODM3MyA3OS4zNDQyIDc5LjcwMyA3MC41MTg1IDc5LjcwMyA1OS42MzE0Qzc5LjcwMyA0OC43NDQzIDcwLjgzNzMgMzkuOTE4NSA1OS45MDEgMzkuOTE4NVoiIGZpbGw9IiM2NzNBQjYiLz4KPC9zdmc+Cg==
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      nominatim.openstreetmap.org
// @connect      routing.openstreetmap.de
// @connect      api.transitous.org
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  /* ---------------- Things you might want to change ---------------- */

  // Meeting title format. Invites go to every attendee, customers included.
  // Examples: (t) => t.name   or   (t) => `Bepoz: ${t.name}`
  const TITLE_FORMAT = (t) => t.name;

  // Free, open services, so there are no keys to keep out of this public repo.
  // Each one asks for light use only. Read their rules before changing how often
  // this calls them. All three can be swapped in Directions > settings > Advanced.
  //   Address lookup:   https://operations.osmfoundation.org/policies/nominatim/
  //   Driving routes:   https://fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/
  //   Public transport: https://transitous.org/api/  (off until you turn it on)
  const SERVICES = {
    geocode: 'https://nominatim.openstreetmap.org/search',
    drive: 'https://routing.openstreetmap.de/routed-car/route/v1/driving',
    transit: 'https://api.transitous.org/api/v6/plan',
  };
  const TILES = 'https://tile.openstreetmap.org';
  const REPO = 'https://github.com/StephenShawBepoz/browserscripts';
  const VERSION = typeof GM_info !== 'undefined' && GM_info.script ? GM_info.script.version : '0';
  const USER_AGENT = `OolioQuickActions/${VERSION} (+${REPO})`;

  /* ---------------- Oolio brand styles ---------------- */
  function injectBrand() {
    if (document.getElementById('oqa-style')) return;

    // Inter, the Oolio typeface. If HubSpot blocks the font, the system font is used instead.
    if (!document.getElementById('oqa-font')) {
      const font = document.createElement('link');
      font.id = 'oqa-font';
      font.rel = 'stylesheet';
      font.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap';
      document.head.appendChild(font);
    }

    const css = document.createElement('style');
    css.id = 'oqa-style';
    css.textContent = `
      .tm-oolio { --oolio-purple:#673AB6; --oolio-deep:#5E35B1; --oolio-blue:#03A9F4; --oolio-charcoal:#222222;
        --oolio-grey:#6F6F6F; --oolio-line:#E6E1EE; --oolio-tint:#F3EEF9;
        font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }
      .tm-oolio svg { flex:none; display:block; }

      /* The old "Prefill meeting" button. This script replaces it. */
      #tm-book-meeting { display:none !important; }

      /* ---------- Toolbar ---------- */
      #oqa-bar { position:fixed; right:24px; bottom:90px; z-index:2147483000; display:none; align-items:center; gap:2px;
        height:44px; padding:0 4px 0 14px; border-radius:999px; background:var(--oolio-purple); color:#fff;
        box-shadow:0 6px 20px rgba(103,58,182,.35), 0 1px 3px rgba(34,34,34,.2); }
      #oqa-bar .oqa-mark svg { width:24px; height:auto; }
      #oqa-bar .oqa-sep { width:1px; height:18px; margin:0 6px 0 10px; background:rgba(255,255,255,.35); }
      #oqa-bar button { display:inline-flex; align-items:center; gap:8px; height:36px; padding:0 12px; border:0;
        border-radius:999px; background:transparent; color:#fff; cursor:pointer; font:inherit; font-size:14px;
        font-weight:700; letter-spacing:-0.01em; transition:background .15s; }
      #oqa-bar button:hover, #oqa-bar button[aria-pressed="true"] { background:rgba(255,255,255,.18); }
      #oqa-bar button:focus-visible { outline:2px solid var(--oolio-blue); outline-offset:1px; }
      #oqa-bar button svg { width:16px; height:16px; }

      /* ---------- Meeting loading overlay (Help Desk) ---------- */
      #oqa-overlay { position:fixed; inset:0; z-index:2147483002; background:rgba(34,34,34,.55); }
      #oqa-card { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:300px;
        padding:28px 24px 24px; border-radius:16px; background:#fff; text-align:center;
        box-shadow:0 12px 40px rgba(0,0,0,.25); border-top:4px solid var(--oolio-purple); }
      #oqa-card .oqa-bigmark { width:44px; height:auto; display:block; margin:0 auto 16px; }
      #oqa-card .oqa-title { margin:0 0 6px; color:var(--oolio-charcoal); font-size:16px; font-weight:900; }
      #oqa-card .oqa-msg { margin:0; color:var(--oolio-grey); font-size:13px; line-height:1.45; }
      #oqa-card .oqa-bar { height:4px; margin-top:18px; border-radius:4px; overflow:hidden; background:var(--oolio-tint); }
      #oqa-card .oqa-bar i { display:block; width:40%; height:100%; border-radius:4px;
        background:linear-gradient(90deg, var(--oolio-purple), var(--oolio-blue)); animation:oqa-slide 1.1s ease-in-out infinite; }
      #oqa-card.oqa-error .oqa-bar { display:none; }
      #oqa-card.oqa-error { border-top-color:var(--oolio-grey); }
      @keyframes oqa-slide { 0% { transform:translateX(-100%); } 100% { transform:translateX(250%); } }
      #oqa-close { position:absolute; top:14px; right:16px; z-index:2; display:flex; align-items:center;
        justify-content:center; width:36px; height:36px; padding:0; border:0; border-radius:50%; cursor:pointer;
        background:#fff; color:var(--oolio-purple); box-shadow:0 2px 8px rgba(0,0,0,.2); }
      #oqa-close:hover { background:var(--oolio-tint); }
      #oqa-close svg { width:18px; height:18px; }

      /* ---------- Directions panel ---------- */
      #oqa-panel { position:fixed; right:24px; bottom:146px; z-index:2147483001; width:360px; max-width:calc(100vw - 32px);
        max-height:calc(100vh - 170px); display:flex; flex-direction:column; overflow:hidden; border-radius:16px;
        background:#fff; color:var(--oolio-charcoal); font-size:13px; line-height:1.4; text-align:left;
        box-shadow:0 12px 40px rgba(34,34,34,.22), 0 0 0 1px rgba(34,34,34,.06); }
      #oqa-panel * { box-sizing:border-box; }
      #oqa-panel [hidden] { display:none !important; }
      #oqa-panel header { display:flex; align-items:center; gap:2px; padding:10px 8px 8px 16px;
        border-top:4px solid var(--oolio-purple); }
      #oqa-panel header b { flex:1; font-size:15px; font-weight:900; }
      #oqa-panel .oqa-body { overflow:auto; padding:2px 16px 14px; }
      #oqa-panel button, #oqa-panel input, #oqa-panel select { font:inherit; color:inherit; margin:0; }
      #oqa-panel .oqa-icon-btn { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px;
        padding:0; border:0; border-radius:8px; background:transparent; color:var(--oolio-grey); cursor:pointer; flex:none; }
      #oqa-panel .oqa-icon-btn:hover { background:var(--oolio-tint); color:var(--oolio-purple); }
      #oqa-panel .oqa-icon-btn svg { width:18px; height:18px; }
      #oqa-panel :focus-visible { outline:2px solid var(--oolio-blue); outline-offset:1px; }

      #oqa-panel .oqa-ends { position:relative; display:grid; gap:4px; padding:0 40px 12px 0; }
      #oqa-panel .oqa-end { display:flex; align-items:flex-start; gap:10px; min-height:36px; }
      #oqa-panel .oqa-dot { width:12px; height:12px; margin-top:12px; border-radius:50%; flex:none;
        border:3px solid var(--oolio-charcoal); background:#fff; }
      #oqa-panel .oqa-dot.oqa-cust-dot { border-color:#fff; background:var(--oolio-purple); box-shadow:0 0 0 1px var(--oolio-purple); }
      #oqa-panel .oqa-end > div { flex:1; min-width:0; }
      #oqa-panel select, #oqa-panel input[type="text"] { width:100%; height:36px; padding:0 10px; border:1px solid var(--oolio-line);
        border-radius:8px; background:#fff; }
      #oqa-panel select:focus, #oqa-panel input[type="text"]:focus { border-color:var(--oolio-purple); outline:none; }
      #oqa-panel .oqa-cust { padding-top:6px; }
      #oqa-panel .oqa-cust b { display:block; font-size:14px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      #oqa-panel .oqa-cust small, #oqa-panel .oqa-muted { color:var(--oolio-grey); font-size:12px; }
      #oqa-panel .oqa-tag { display:inline-block; margin-left:6px; padding:0 6px; border-radius:999px; background:var(--oolio-tint);
        color:var(--oolio-purple); font-size:11px; font-weight:700; vertical-align:1px; }
      #oqa-panel .oqa-swap { position:absolute; right:0; top:50%; margin-top:-22px; }
      #oqa-panel .oqa-link { padding:0; border:0; background:none; color:var(--oolio-purple); font-size:12px;
        font-weight:500; cursor:pointer; text-decoration:underline; text-underline-offset:2px; }
      #oqa-panel .oqa-inline { display:flex; gap:6px; margin-top:6px; }
      #oqa-panel .oqa-btn { height:36px; padding:0 14px; border:0; border-radius:8px; background:var(--oolio-purple);
        color:#fff; font-weight:700; cursor:pointer; white-space:nowrap; }
      #oqa-panel .oqa-btn:hover { background:var(--oolio-deep); }
      #oqa-panel .oqa-btn.oqa-quiet { background:var(--oolio-tint); color:var(--oolio-purple); }
      #oqa-panel .oqa-btn[disabled] { opacity:.6; cursor:progress; }

      #oqa-panel .oqa-map { position:relative; height:150px; margin:0 0 10px; overflow:hidden; border-radius:10px;
        background:var(--oolio-tint); }
      #oqa-panel .oqa-map img { position:absolute; width:256px; height:256px; max-width:none; user-select:none; }
      #oqa-panel .oqa-map svg { position:absolute; left:0; top:0; }
      #oqa-panel .oqa-map .oqa-osm { position:absolute; right:0; bottom:0; padding:1px 5px; border-top-left-radius:6px;
        background:rgba(255,255,255,.85); color:var(--oolio-charcoal); font-size:10px; text-decoration:none; }

      #oqa-panel .oqa-modes { display:grid; gap:6px; }
      #oqa-panel .oqa-mode { display:flex; align-items:center; gap:12px; padding:10px; border-radius:10px;
        background:#fff; border:1px solid var(--oolio-line); color:inherit; text-decoration:none; }
      #oqa-panel a.oqa-mode:hover { border-color:var(--oolio-purple); background:var(--oolio-tint); }
      #oqa-panel .oqa-mode .oqa-ic { display:grid; place-items:center; width:34px; height:34px; border-radius:9px; flex:none;
        background:var(--oolio-tint); color:var(--oolio-purple); }
      #oqa-panel .oqa-mode .oqa-ic svg { width:18px; height:18px; }
      #oqa-panel .oqa-mode > div { flex:1; min-width:0; }
      #oqa-panel .oqa-mode b { display:block; font-size:16px; font-weight:900; }
      #oqa-panel .oqa-mode .oqa-sub { display:block; color:var(--oolio-grey); font-size:12px; }
      #oqa-panel .oqa-mode .oqa-go { color:var(--oolio-grey); flex:none; }
      #oqa-panel .oqa-mode .oqa-go svg { width:16px; height:16px; }
      #oqa-panel .oqa-note { margin:10px 0 0; color:var(--oolio-grey); font-size:12px; }
      #oqa-panel .oqa-note.oqa-warn { color:#8a5300; }
      #oqa-panel .oqa-more { display:flex; flex-wrap:wrap; align-items:center; gap:4px 12px; margin-top:10px; }
      #oqa-panel .oqa-more:empty { display:none; }
      #oqa-panel footer { padding:8px 16px; border-top:1px solid var(--oolio-line); color:var(--oolio-grey); font-size:10px; }
      #oqa-panel footer a { color:inherit; }

      #oqa-panel .oqa-skel { display:block; height:12px; margin:4px 0; border-radius:6px; background:linear-gradient(90deg,
        var(--oolio-tint) 0%, #fff 50%, var(--oolio-tint) 100%); background-size:200% 100%; animation:oqa-shimmer 1.2s linear infinite; }
      @keyframes oqa-shimmer { from { background-position:200% 0; } to { background-position:-200% 0; } }

      #oqa-panel h3 { margin:12px 0 4px; font-size:14px; font-weight:900; }
      #oqa-panel .oqa-places { margin:8px 0; padding:0; list-style:none; display:grid; grid-template-columns:minmax(0, 1fr); gap:6px; }
      #oqa-panel .oqa-places li { min-width:0; display:flex; align-items:center; gap:4px; padding:6px 4px 6px 10px; border:1px solid var(--oolio-line);
        border-radius:10px; }
      #oqa-panel .oqa-places li > div { flex:1; min-width:0; }
      #oqa-panel .oqa-places li b { display:block; font-weight:700; }
      #oqa-panel .oqa-places li small { display:block; color:var(--oolio-grey); font-size:11px; overflow:hidden;
        text-overflow:ellipsis; white-space:nowrap; }
      #oqa-panel .oqa-star[aria-pressed="true"] { color:var(--oolio-purple); }
      #oqa-panel .oqa-star[aria-pressed="true"] svg { fill:currentColor; }
      #oqa-panel .oqa-form { display:grid; gap:6px; }
      #oqa-panel .oqa-check { display:flex; gap:8px; align-items:flex-start; margin-top:6px; cursor:pointer; }
      #oqa-panel .oqa-check input { margin-top:2px; accent-color:var(--oolio-purple); }
      #oqa-panel details { margin-top:12px; }
      #oqa-panel summary { cursor:pointer; font-weight:700; }
      #oqa-panel label.oqa-field { display:grid; gap:2px; margin-top:6px; font-size:12px; color:var(--oolio-grey); }
      #oqa-panel .oqa-error-text { margin:0; color:#b00020; font-size:12px; }
    `;
    document.head.appendChild(css);
  }

  /* ---------------- Icons: Lucide (line style, 2px stroke) and the Oolio logomark ---------------- */
  const lucide = (inner) =>
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  const ICON = {
    calendarPlus: lucide('<path d="M8 2v4"/><path d="M16 2v4"/><path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><path d="M3 10h18"/><path d="M16 19h6"/><path d="M19 16v6"/>'),
    car: lucide('<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>'),
    train: lucide('<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/>'),
    x: lucide('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    settings: lucide('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
    swap: lucide('<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>'),
    external: lucide('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
    trash: lucide('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>'),
    star: lucide('<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>'),
    back: lucide('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>'),
  };
  const MARK_PATH = 'd="M140.099 0C173.181 0 200 26.6979 200 59.6314C200 92.5649 173.181 119.263 140.099 119.263C124.677 119.263 110.616 113.461 99.9986 103.93C89.3837 113.461 75.3229 119.263 59.901 119.263C26.8186 119.263 0 92.5649 0 59.6314C0 26.6979 26.8186 0 59.901 0C75.3232 0 89.3841 5.80195 100.001 15.3329C110.616 5.80177 124.677 0 140.099 0ZM140.099 39.9185C129.163 39.9185 120.297 48.7443 120.297 59.6314C120.297 70.5185 129.163 79.3442 140.099 79.3442C151.035 79.3442 159.901 70.5185 159.901 59.6314C159.901 48.7443 151.035 39.9185 140.099 39.9185ZM59.901 39.9185C48.9647 39.9185 40.099 48.7443 40.099 59.6314C40.099 70.5185 48.9647 79.3442 59.901 79.3442C70.8373 79.3442 79.703 70.5185 79.703 59.6314C79.703 48.7443 70.8373 39.9185 59.901 39.9185Z"';
  const OOLIO_MARK = '<svg class="oqa-bigmark" viewBox="0 0 200 120" aria-label="Oolio"><path fill="#673AB6" fill-rule="evenodd" clip-rule="evenodd" ' + MARK_PATH + '/></svg>';
  const OOLIO_MARK_WHITE = '<svg viewBox="0 0 200 120" aria-hidden="true"><path fill="#fff" fill-rule="evenodd" clip-rule="evenodd" ' + MARK_PATH + '/></svg>';

  /* ---------------- Small helpers ---------------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (...a) => console.info('[Oolio quick actions]', ...a);

  // Saved places and caches live in Tampermonkey's storage for this script, on this computer only
  const store = {
    get(name, fallback) {
      try {
        if (typeof GM_getValue === 'function') { const v = GM_getValue(name); return v === undefined ? fallback : v; }
        const v = localStorage.getItem('oolio-qa:' + name);
        return v ? JSON.parse(v) : fallback;
      } catch (e) { return fallback; }
    },
    set(name, value) {
      try {
        if (typeof GM_setValue === 'function') GM_setValue(name, value);
        else localStorage.setItem('oolio-qa:' + name, JSON.stringify(value));
      } catch (e) { /* storage full or blocked */ }
    },
  };

  function loadSettings() {
    const s = store.get('settings', {}) || {};
    return {
      places: Array.isArray(s.places) ? s.places.filter((p) => p && p.id && isFinite(p.lat) && isFinite(p.lon)) : [],
      defaultFrom: s.defaultFrom || '',
      direction: s.direction === 'from' ? 'from' : 'to',
      transit: s.transit === true,
      services: s.services && typeof s.services === 'object' ? s.services : {},
    };
  }
  const saveSettings = (s) => store.set('settings', s);
  const service = (k) => clean(loadSettings().services[k]) || SERVICES[k];

  // Calls to the map services. Sent by Tampermonkey with no cookies, naming this script
  // (as the services ask), and never with the HubSpot page address.
  function getJson(url, timeout = 15000) {
    if (typeof GM_xmlhttpRequest !== 'function') {
      return fetch(url, { credentials: 'omit', referrerPolicy: 'origin' }).then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    }
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET', url, timeout, anonymous: true,
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT, Referer: REPO },
        onload: (r) => {
          if (r.status < 200 || r.status >= 300) return reject(new Error('HTTP ' + r.status));
          try { resolve(JSON.parse(r.responseText)); } catch (e) { reject(new Error('Unreadable reply')); }
        },
        onerror: () => reject(new Error('Network error')),
        ontimeout: () => reject(new Error('Timed out')),
      });
    });
  }

  // One request at a time per service, at most one a second (Nominatim and FOSSGIS rules)
  const lanes = {};
  function oneAtATime(lane, fn) {
    const l = lanes[lane] || (lanes[lane] = { chain: Promise.resolve(), last: 0 });
    const run = async () => {
      const wait = l.last + 1100 - Date.now();
      if (wait > 0) await sleep(wait);
      try { return await fn(); } finally { l.last = Date.now(); }
    };
    const p = l.chain.then(run, run);
    l.chain = p.catch(() => {});
    return p;
  }

  // Which record is on screen? Record pages and Help Desk tickets.
  const TYPE_IDS = { contact: '0-1', company: '0-2', deal: '0-3', ticket: '0-5' };
  function getRecord() {
    let m = location.pathname.match(/^\/contacts\/(\d+)\/(?:record\/(0-[1235])|(contact|company|deal|ticket))\/(\d+)/);
    if (m) return { portal: m[1], type: m[2] || TYPE_IDS[m[3]], id: m[4], helpDesk: false };
    m = location.pathname.match(/^\/help-desk\/(\d+)\/(?:.*\/)?ticket\/(\d+)/);
    if (m) return { portal: m[1], type: '0-5', id: m[2], helpDesk: true };
    return null;
  }
  const recordKey = (r) => (r ? `${r.type}/${r.id}` : '');

  /* ---------------- Toolbar ---------------- */
  function toolbar() {
    injectBrand();

    const bar = document.createElement('div');
    bar.id = 'oqa-bar';
    bar.className = 'tm-oolio';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Oolio quick actions');
    bar.innerHTML =
      '<span class="oqa-mark">' + OOLIO_MARK_WHITE + '</span><span class="oqa-sep"></span>' +
      '<button type="button" data-act="meeting" title="Book a meeting">' + ICON.calendarPlus + '<span>Meeting</span></button>' +
      '<button type="button" data-act="directions" title="Directions to the customer" aria-pressed="false">' + ICON.car + '<span>Directions</span></button>';
    document.body.appendChild(bar);

    bar.querySelector('[data-act="meeting"]').addEventListener('click', () => {
      const rec = getRecord();
      if (!rec) return;
      if (rec.helpDesk) meetingModal(rec);
      else meetingOnRecord();
    });
    const dirBtn = bar.querySelector('[data-act="directions"]');
    dirBtn.addEventListener('click', () => toggleDirections(getRecord()));

    // HubSpot is a single-page app, so re-check the URL every second
    let lastKey = recordKey(getRecord());
    const sync = () => {
      const rec = getRecord();
      bar.style.display = rec ? 'inline-flex' : 'none';
      const key = recordKey(rec);
      if (key !== lastKey) {
        lastKey = key;
        closeDirections();
      }
      dirBtn.setAttribute('aria-pressed', String(!!directions.el));
    };
    setInterval(sync, 1000);
    sync();
  }

  /* ---------------- Meeting ---------------- */

  // Record pages already have HubSpot's own "Schedule a meeting" button, so press it
  let meetingBusy = false;
  function meetingOnRecord() {
    if (meetingBusy) return;
    meetingBusy = true;
    closeDirections();
    let tries = 0;
    const timer = setInterval(() => {
      const schedBtn = document.querySelector('[data-selenium-test="create-engagement-schedule-button"]');
      if (schedBtn) {
        clearInterval(timer);
        meetingBusy = false;
        schedBtn.click();
      } else if (++tries > 20) {
        clearInterval(timer);
        meetingBusy = false;
        alert('Couldn\'t find the meeting button on this record. Try again once the page has finished loading.');
      }
    }, 250);
  }

  // Help Desk has no meeting button, so open the ticket record in a modal and press it there
  let overlay = null;
  let meetingOpen = false;
  function closeMeeting(force) {
    if (!overlay) return;
    if (!force && meetingOpen && !confirm('Close without scheduling? Anything you have entered will be lost.')) return;
    overlay.remove();
    overlay = null;
    meetingOpen = false;
    document.removeEventListener('keydown', onMeetingEsc);
  }
  function onMeetingEsc(e) { if (e.key === 'Escape') closeMeeting(); }

  function meetingModal(t) {
    if (overlay) return;
    closeDirections();

    overlay = document.createElement('div');
    overlay.id = 'oqa-overlay';
    overlay.className = 'tm-oolio';
    overlay.innerHTML =
      '<div id="oqa-card">' + OOLIO_MARK +
      '<p class="oqa-title">Opening the scheduler</p>' +
      '<p class="oqa-msg">Hang tight, this takes a few seconds.</p>' +
      '<div class="oqa-bar"><i></i></div></div>' +
      '<button id="oqa-close" type="button" title="Close (Esc)" aria-label="Close">' + ICON.x + '</button>';

    const frame = document.createElement('iframe');
    frame.src = `/contacts/${t.portal}/record/0-5/${t.id}`;
    frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;opacity:0;transition:opacity .2s';
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    overlay.querySelector('#oqa-close').addEventListener('click', () => closeMeeting());
    document.addEventListener('keydown', onMeetingEsc);
    frame.addEventListener('load', () => {
      try { frame.contentDocument.addEventListener('keydown', onMeetingEsc); } catch (e) { /* ignore */ }
    });

    const card = overlay.querySelector('#oqa-card');
    const showError = (msg) => {
      card.classList.add('oqa-error');
      card.querySelector('.oqa-title').textContent = 'Something went wrong';
      card.querySelector('.oqa-msg').textContent = msg;
    };

    // Wait for the ticket record to load, click "Schedule a meeting", then close when the scheduler goes away
    let clicked = false, seenScheduler = false, tries = 0, clickedAt = 0;
    const timer = setInterval(() => {
      if (!overlay) return clearInterval(timer);
      tries++;
      let d;
      try { d = frame.contentDocument; } catch (e) { return; }
      if (!d) return;

      if (!clicked) {
        const schedBtn = d.querySelector('[data-selenium-test="create-engagement-schedule-button"]');
        if (schedBtn) { schedBtn.click(); clicked = true; clickedAt = tries; }
        else if (tries > 60) { clearInterval(timer); showError('Couldn\'t find the meeting button. Press Esc or × to close.'); }
        return;
      }

      const sched = [...d.querySelectorAll('iframe')].find((f) => f.src.includes('expanded-scheduler'));
      if (sched && !seenScheduler) {
        seenScheduler = true;
        meetingOpen = true;
        frame.style.opacity = '1';
        card.style.display = 'none';
      }
      if (!seenScheduler && tries - clickedAt > 40) {
        clearInterval(timer);
        showError('The Schedule window didn\'t open. Press Esc or × to close.');
      }
      // Only close once the scheduler is removed (scheduled or cancelled).
      // Minimising only hides it, so that leaves the window open.
      if (seenScheduler && !sched) {
        clearInterval(timer);
        meetingOpen = false;
        setTimeout(() => closeMeeting(true), 800);
      }
    }, 500);
  }

  /* ---------------- The customer's company and address, from HubSpot ---------------- */
  // There's no public way to read this without an API key, so this asks HubSpot the same way
  // its own pages do, with your login. If one way stops working it tries the next, and the
  // browser console shows which one answered. Calls only happen when you click Directions.

  const OBJECT_NAMES = { '0-1': 'contacts', '0-3': 'deals', '0-5': 'tickets' };
  const PRIMARY_TYPE = { '0-1': 'contact_to_company', '0-3': 'deal_to_company', '0-5': 'ticket_to_company' };
  const PRIMARY_TYPE_ID = { '0-1': 1, '0-3': 5, '0-5': 26 };
  // This portal spells longitude "longtitude"; both are asked for and HubSpot ignores the missing one
  const COMPANY_PROPS = ['name', 'address', 'address2', 'city', 'state', 'zip', 'country', 'latitude', 'longtitude', 'longitude'];
  // Bepoz's ticket copy of the primary company, used if the company itself can't be read
  const TICKET_MIRROR = ['primary_company_name__associated_', 'primary_company_address__associated_'];

  function csrf() {
    const m = document.cookie.match(/(?:^|;\s*)hubspotapi-csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  async function hubspot(path, portal, body) {
    const url = `${location.origin}/api/${path}${path.includes('?') ? '&' : '?'}portalId=${portal}`;
    let err;
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      try {
        const headers = { Accept: 'application/json', 'X-HubSpot-CSRF-hubspotapi': csrf() };
        if (body) headers['Content-Type'] = 'application/json';
        const res = await fetch(url, {
          method: body ? 'POST' : 'GET', credentials: 'include', headers, signal: ctrl.signal,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (res.ok) return await res.json();
        err = new Error('HubSpot replied ' + res.status);
        err.status = res.status;
        if (res.status === 404) err.notFound = true;
        if (res.status !== 403) break; // a 403 can be a stale login token after idle, so try once more
      } catch (e) {
        err = e;
        break;
      } finally {
        clearTimeout(timer);
      }
      await sleep(600);
    }
    throw err;
  }

  // Companies linked to the record: { primary, all, mirror, via }
  async function linkedCompanies(rec) {
    if (rec.type === '0-2') return { primary: rec.id, all: [rec.id], via: 'this company' };

    const attempts = [
      ['crm v3', async () => {
        const props = rec.type === '0-5' ? '&properties=' + TICKET_MIRROR.join(',') : '';
        const d = await hubspot(`crm/v3/objects/${OBJECT_NAMES[rec.type]}/${rec.id}?associations=companies${props}`, rec.portal);
        const rows = (d.associations && d.associations.companies && d.associations.companies.results) || [];
        const p = rows.find((r) => r.type === PRIMARY_TYPE[rec.type]);
        const pr = d.properties || {};
        return {
          primary: p ? String(p.id) : '',
          all: [...new Set(rows.map((r) => String(r.id)))],
          mirror: pr.primary_company_address__associated_
            ? { name: clean(pr.primary_company_name__associated_), text: tidyAddress(pr.primary_company_address__associated_) } : null,
        };
      }],
      ['crm v4', async () => {
        const d = await hubspot(`crm/v4/objects/${rec.type}/${rec.id}/associations/0-2?limit=100`, rec.portal);
        const rows = d.results || [];
        const isPrimary = (r) => (r.associationTypes || []).some((t) =>
          (t.category === 'HUBSPOT_DEFINED' && t.typeId === PRIMARY_TYPE_ID[rec.type]) || t.label === 'Primary');
        const p = rows.find(isPrimary);
        return { primary: p ? String(p.toObjectId) : '', all: [...new Set(rows.map((r) => String(r.toObjectId)))] };
      }],
      ['page', async () => companiesOnPage()],
    ];

    for (const [via, attempt] of attempts) {
      try {
        const r = await attempt();
        if (!r) continue;
        // An answer from HubSpot of "no companies" is final; the page is only a fallback
        if (r.all.length || via !== 'page') {
          log('linked companies via', via, r);
          return { ...r, via };
        }
      } catch (e) {
        log('linked companies via', via, 'failed:', e.message);
      }
    }
    return { primary: '', all: [], via: 'none' };
  }

  // Last resort: the Companies card in the record's sidebar
  function companiesOnPage() {
    const re = /\/contacts\/\d+\/(?:record\/0-2|company)\/(\d+)/;
    const idsIn = (el) => new Set([...el.querySelectorAll('a[href]')].map((a) => (a.getAttribute('href').match(re) || [])[1]).filter(Boolean));
    const links = [...document.querySelectorAll('a[href]')].filter((a) => re.test(a.getAttribute('href')) && !a.closest('.tm-oolio'));
    const all = [];
    let primary = '';
    for (const a of links) {
      const id = a.getAttribute('href').match(re)[1];
      if (!all.includes(id)) all.push(id);
      if (primary) continue;
      // The smallest box around this company that holds no other company
      let box = a;
      while (box.parentElement && idsIn(box.parentElement).size <= 1 && box.parentElement !== document.body) box = box.parentElement;
      const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (walker.currentNode.nodeValue.trim() === 'Primary') { primary = id; break; }
      }
    }
    return { primary, all };
  }

  async function readCompany(portal, id) {
    const attempts = [
      ['crm v3', async () => (await hubspot(`crm/v3/objects/companies/${id}?properties=${COMPANY_PROPS.join(',')}`, portal)).properties || {}],
      ['inbounddb', async () => {
        const d = await hubspot(`inbounddb-objects/v1/crm-objects/0-2/${id}?allPropertiesFetchMode=latest_version`, portal);
        const out = {};
        COMPANY_PROPS.forEach((k) => {
          const p = d.properties && d.properties[k];
          if (p) out[k] = p.value != null ? p.value : p.versions && p.versions[0] ? p.versions[0].value : '';
        });
        return out;
      }],
    ];
    let lastErr;
    for (const [via, attempt] of attempts) {
      try {
        const p = await attempt();
        log('company', id, 'via', via);
        const lat = parseFloat(p.latitude), lon = parseFloat(p.longtitude != null && p.longtitude !== '' ? p.longtitude : p.longitude);
        const inAustralia = lat < -9 && lat > -45 && lon > 110 && lon < 155;
        const isAustralian = !clean(p.country) || /^(australia|au)$/i.test(clean(p.country));
        const usable = isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && (lat || lon) && (inAustralia || !isAustralian);
        return {
          id, via, name: clean(p.name),
          parts: { street: clean(p.address), street2: clean(p.address2), city: clean(p.city), state: clean(p.state), zip: clean(p.zip), country: clean(p.country) },
          lat: usable ? lat : null, lon: usable ? lon : null,
        };
      } catch (e) {
        lastErr = e;
        log('company', id, 'via', via, 'failed:', e.message);
        if (e.notFound) break;
      }
    }
    throw lastErr || new Error('No reply');
  }

  // "1 Spender Lane, Kings Beach, Kings Beach, QLD, 4551, Australia" style strings: drop blanks and repeats
  function tidyAddress(s) {
    const out = [];
    String(s || '').split(',').map(clean).forEach((part) => {
      if (part && (!out.length || out[out.length - 1].toLowerCase() !== part.toLowerCase())) out.push(part);
    });
    return out.join(', ');
  }

  // The customer shown in the panel. Everything here comes back usable, even when HubSpot doesn't answer.
  async function getCustomer(rec, pickedId) {
    const recKey = 'rec:' + recordKey(rec);
    const linked = directions.linked || (directions.linked = await linkedCompanies(rec));
    const id = pickedId || linked.primary || linked.all[0];
    const base = { count: linked.all.length, isPrimary: !!id && id === linked.primary };

    if (!id) {
      if (linked.mirror) return { ...base, key: recKey, name: linked.mirror.name || 'Customer', text: linked.mirror.text, via: 'ticket copy' };
      return { ...base, key: recKey, name: 'No company', error: linked.via === 'none'
        ? 'Couldn\'t read the linked company from HubSpot.'
        : 'No company is linked to this record.' };
    }
    try {
      const c = await companyOnce(rec.portal, id);
      return { ...base, ...c, key: 'co:' + id };
    } catch (e) {
      if (linked.mirror && id === linked.primary) {
        return { ...base, id, key: 'co:' + id, name: linked.mirror.name || 'Customer', text: linked.mirror.text, via: 'ticket copy' };
      }
      return { ...base, id, key: 'co:' + id, name: 'Customer', error: 'Couldn\'t read the company from HubSpot (' + e.message + ').' };
    }
  }

  // Each company is read once per panel, however often it's shown
  function companyOnce(portal, id) {
    const cache = directions.companies;
    if (!cache.has(id)) {
      const p = readCompany(portal, id);
      cache.set(id, p);
      p.catch(() => cache.delete(id));
    }
    return cache.get(id);
  }

  // Names and suburbs of every linked company, for the "pick another company" list
  async function companyChoices(rec) {
    const linked = directions.linked;
    const ids = linked.all.slice(0, 15);
    const out = [];
    for (let i = 0; i < ids.length; i += 3) {
      const batch = await Promise.all(ids.slice(i, i + 3).map((id) =>
        companyOnce(rec.portal, id).then((c) => c, () => ({ id, name: 'Company ' + id, parts: {} }))));
      out.push(...batch);
    }
    out.sort((a, b) => (b.id === linked.primary) - (a.id === linked.primary));
    return { list: out, more: linked.all.length - ids.length };
  }

  /* ---------------- Finding places on the map (OpenStreetMap Nominatim) ---------------- */

  function nominatim(params) {
    return oneAtATime('geocode', async () => {
      const u = new URL(service('geocode'));
      u.searchParams.set('format', 'jsonv2');
      u.searchParams.set('limit', '1');
      u.searchParams.set('addressdetails', '1');
      Object.entries(params).forEach(([k, v]) => { if (v) u.searchParams.set(k, v); });
      const rows = await getJson(u.toString());
      const r = Array.isArray(rows) && rows[0];
      if (!r) return null;
      const a = r.address || {};
      const short = [[a.house_number, a.road].filter(Boolean).join(' '),
        a.suburb || a.town || a.village || a.city || a.municipality, a.state, a.postcode].filter(Boolean).join(', ');
      return { lat: +r.lat, lon: +r.lon, display: short || r.display_name };
    });
  }

  // "Shop 3/123 Smith St" and "Level 2, 45 King St" confuse the geocoder; keep the street number and name
  function streetOnly(street) {
    let s = clean(street), prev;
    do {
      prev = s;
      s = s.replace(/^(shop|unit|suite|ste|level|lvl|tenancy|kiosk|lot|bay|building|bldg|floor|office)\s*[\w.-]+\s*[,/]?\s*/i, '');
      s = s.replace(/^[\w-]+\s*\/\s*(?=\d)/, '');
    } while (s !== prev);
    return s;
  }

  // "-31.95, 115.86" or a Google Maps link with @lat,lon: no lookup needed
  function parseCoords(text) {
    const m = String(text).match(/@?(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
    if (!m) return null;
    const lat = +m[1], lon = +m[2];
    return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon, display: `${lat.toFixed(5)}, ${lon.toFixed(5)}` } : null;
  }

  const COUNTRY_CODES = { australia: 'au', au: 'au', 'new zealand': 'nz', nz: 'nz', 'united kingdom': 'gb', uk: 'gb', 'united states': 'us', usa: 'us' };

  // { lat, lon, display, approx } or null. Answers are kept, so each address is only looked up once.
  async function geocode(a) {
    const coords = a.text ? parseCoords(a.text) : null;
    if (coords && clean(a.text).replace(/[@\d.,\s-]/g, '').length < 3) return { ...coords, approx: false };

    const cacheKey = 'v2|' + clean([a.street, a.city, a.state, a.zip, a.country, a.text].join('|')).toLowerCase();
    const cache = store.get('geo', {}) || {};
    if (cache[cacheKey]) return cache[cacheKey];

    const cc = COUNTRY_CODES[clean(a.country).toLowerCase()] || (clean(a.country) ? '' : 'au');
    let hit = null, approx = false;
    if (a.text) {
      hit = await nominatim({ q: clean(a.text), countrycodes: 'au,nz' });
      if (!hit) hit = await nominatim({ q: clean(a.text) });
    } else {
      const street = streetOnly(a.street);
      if (street) hit = await nominatim({ street, city: a.city, state: a.state, postalcode: a.zip, countrycodes: cc });
      if (!hit && street) hit = await nominatim({ q: [street, a.city, a.state, a.zip].filter(Boolean).join(', '), countrycodes: cc });
      // Last resort: the suburb, so there is at least a rough time
      if (!hit && (a.city || a.zip)) {
        hit = await nominatim({ city: a.city, state: a.state, postalcode: a.zip, countrycodes: cc });
        approx = !!hit;
      }
    }
    if (!hit) return null;
    const out = { ...hit, approx };

    const keys = Object.keys(cache);
    if (keys.length >= 300) keys.slice(0, keys.length - 299).forEach((k) => delete cache[k]);
    cache[cacheKey] = out;
    store.set('geo', cache);
    return out;
  }

  /* ---------------- Travel times ---------------- */
  const routeCache = new Map();
  const pt = (p) => `${(+p.lat).toFixed(5)},${(+p.lon).toFixed(5)}`;

  async function remember(key, maxAgeMs, fn) {
    const hit = routeCache.get(key);
    if (hit && Date.now() - hit.at < maxAgeMs) return hit.value;
    const value = await fn();
    routeCache.set(key, { at: Date.now(), value });
    return value;
  }

  // Driving: FOSSGIS's OSRM server. No live traffic, so it's a guide; Google has the live time.
  function driveRoute(a, z) {
    return remember('drive:' + pt(a) + ';' + pt(z), 6 * 3600 * 1000, () => oneAtATime('drive', async () => {
      const d = await getJson(`${service('drive')}/${a.lon},${a.lat};${z.lon},${z.lat}?overview=simplified&geometries=geojson&alternatives=false&steps=false`);
      const r = d && d.code === 'Ok' && d.routes && d.routes[0];
      if (!r) throw new Error((d && d.message) || 'No route');
      return { seconds: r.duration, metres: r.distance, line: r.geometry && r.geometry.coordinates };
    }));
  }

  // Public transport: Transitous, a volunteer service for personal, non-commercial use.
  // Off until you turn it on in settings, as they ask to hear from you first.
  function transitPlan(a, z) {
    return remember('transit:' + pt(a) + ';' + pt(z), 2 * 60 * 1000, () => oneAtATime('transit', async () => {
      const u = new URL(service('transit'));
      u.searchParams.set('fromPlace', pt(a));
      u.searchParams.set('toPlace', pt(z));
      u.searchParams.set('time', new Date().toISOString());
      u.searchParams.set('numItineraries', '3');
      const d = await getJson(u.toString(), 25000);
      const trips = (d && d.itineraries) || [];
      const walk = d && d.direct && d.direct[0];
      if (!trips.length) return walk ? { walkOnly: true, seconds: walk.duration } : null;
      // Earliest arrival wins; fewer changes breaks a tie
      const best = trips.slice().sort((x, y) => (new Date(x.endTime) - new Date(y.endTime)) || (x.transfers - y.transfers))[0];
      const lines = (best.legs || [])
        .filter((l) => !/^(WALK|BIKE|CAR|RENTAL|FLEX|ODM)/.test(l.mode))
        .map((l) => clean(l.routeShortName || l.displayName || l.mode.toLowerCase().replace(/_/g, ' ')));
      const tz = ((best.legs || []).find((l) => l.from && l.from.tz) || { from: {} }).from.tz;
      return { seconds: best.duration, leave: best.startTime, arrive: best.endTime, changes: best.transfers, lines, tz };
    }));
  }

  /* ---------------- Formatting and links ---------------- */
  function fmtDuration(sec) {
    const mins = Math.max(1, Math.round(sec / 60));
    if (mins < 60) return mins + ' min';
    const h = Math.floor(mins / 60), m = mins % 60;
    return h + ' hr' + (m ? ' ' + m + ' min' : '');
  }
  const fmtDistance = (m) => { const km = m / 1000; return (km < 10 ? km.toFixed(1) : Math.round(km)) + ' km'; };
  function fmtTime(iso, tz) {
    try { return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: tz || undefined }); }
    catch (e) { return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }); }
  }

  // Free links, no keys: each opens the same trip in a full map app for live traffic, turn by turn and timetables
  const gmaps = (a, z, mode) => 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(a.query) +
    '&destination=' + encodeURIComponent(z.query) + '&travelmode=' + mode;
  function moreLinks(a, z, transitOn) {
    const link = (href, text) => `<a class="oqa-link" href="${esc(href)}" target="_blank" rel="noopener">${text}</a>`;
    const out = [link(`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${pt(a)}%3B${pt(z)}`, 'OpenStreetMap')];
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
      out.push(link(`https://maps.apple.com/directions?source=${encodeURIComponent(a.query)}&destination=${encodeURIComponent(z.query)}&mode=driving`, 'Apple Maps'));
    }
    if (transitOn) {
      out.push(link(`https://api.transitous.org/?fromPlace=${pt(a)}&fromName=${encodeURIComponent(a.label || '')}&toPlace=${pt(z)}&toName=${encodeURIComponent(z.label || '')}`, 'Transitous'));
    }
    return '<span class="oqa-muted">Also open in</span> ' + out.join('');
  }

  /* ---------------- Map preview (OpenStreetMap tiles, no library) ---------------- */
  function project(lat, lon, z) {
    const size = 256 * Math.pow(2, z);
    const sin = Math.min(0.9999, Math.max(-0.9999, Math.sin((lat * Math.PI) / 180)));
    return [((lon + 180) / 360) * size, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size];
  }

  function drawMap(box, from, to, line) {
    const W = box.clientWidth || 328, H = box.clientHeight || 150, PAD = 24;
    const pts = (line && line.length ? line.map(([lon, lat]) => [lat, lon]) : []).concat([[from.lat, from.lon], [to.lat, to.lon]]);
    const extent = (z) => {
      const px = pts.map(([la, lo]) => project(la, lo, z));
      const xs = px.map((p) => p[0]), ys = px.map((p) => p[1]);
      return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    };
    let z = 16, e = extent(z);
    while (z > 2 && (e.x1 - e.x0 > W - PAD * 2 || e.y1 - e.y0 > H - PAD * 2)) e = extent(--z);
    const left = (e.x0 + e.x1) / 2 - W / 2, top = (e.y0 + e.y1) / 2 - H / 2, n = Math.pow(2, z);

    let html = '';
    for (let tx = Math.floor(left / 256); tx * 256 < left + W; tx++) {
      for (let ty = Math.max(0, Math.floor(top / 256)); ty * 256 < top + H && ty < n; ty++) {
        html += `<img alt="" draggable="false" src="${TILES}/${z}/${((tx % n) + n) % n}/${ty}.png" ` +
          `style="left:${Math.round(tx * 256 - left)}px;top:${Math.round(ty * 256 - top)}px">`;
      }
    }
    const xy = (la, lo) => { const p = project(la, lo, z); return [(p[0] - left).toFixed(1), (p[1] - top).toFixed(1)]; };
    const route = line && line.length ? line.map(([lo, la]) => xy(la, lo).join(',')).join(' ') : '';
    const [fx, fy] = xy(from.lat, from.lon), [cx, cy] = xy(to.lat, to.lon);
    html +=
      `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">` +
      (route
        ? `<polyline points="${route}" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>` +
          `<polyline points="${route}" fill="none" stroke="#673AB6" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`
        : `<line x1="${fx}" y1="${fy}" x2="${cx}" y2="${cy}" stroke="#673AB6" stroke-width="2" stroke-dasharray="4 4"/>`) +
      `<circle cx="${fx}" cy="${fy}" r="6" fill="#fff" stroke="#222" stroke-width="3"/>` +
      `<circle cx="${cx}" cy="${cy}" r="7" fill="#673AB6" stroke="#fff" stroke-width="3"/></svg>` +
      '<a class="oqa-osm" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>';
    box.innerHTML = html;
  }

  /* ---------------- Directions panel ---------------- */
  const directions = { el: null, rec: null, linked: null, companies: new Map(), picked: '', customer: null, dest: null, oneOff: '', run: 0, lastVia: '' };

  // Where directions start: your default place, or whatever you picked earlier in this tab
  function currentFrom(s) {
    let v = '';
    try { v = sessionStorage.getItem('oolio-qa:from') || ''; } catch (e) { /* ignore */ }
    const valid = (x) => x === 'here' || x === 'other' || s.places.some((p) => p.id === x);
    if (valid(v) && (v !== 'other' || directions.oneOff)) return v;
    if (valid(s.defaultFrom)) return s.defaultFrom;
    return s.places.length ? s.places[0].id : 'here';
  }
  function setCurrentFrom(v) {
    try { sessionStorage.setItem('oolio-qa:from', v); } catch (e) { /* ignore */ }
  }

  function toggleDirections(rec) {
    if (directions.el) closeDirections();
    else if (rec) openDirections(rec);
  }

  function closeDirections() {
    if (!directions.el) return;
    directions.el.remove();
    directions.el = null;
    directions.run++;
    document.removeEventListener('keydown', onDirectionsKey);
  }
  function onDirectionsKey(e) {
    if (e.key !== 'Escape' || overlay || !directions.el) return;
    const a = document.activeElement;
    if (!a || a === document.body || directions.el.contains(a)) closeDirections();
  }

  function openDirections(rec) {
    injectBrand();
    const el = document.createElement('div');
    el.id = 'oqa-panel';
    el.className = 'tm-oolio';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Directions');
    el.innerHTML =
      '<header><b>Directions</b>' +
      '<button type="button" class="oqa-icon-btn" data-act="settings" title="Your places and settings" aria-label="Your places and settings">' + ICON.settings + '</button>' +
      '<button type="button" class="oqa-icon-btn" data-act="close" title="Close (Esc)" aria-label="Close">' + ICON.x + '</button></header>' +
      '<div class="oqa-body"></div><footer></footer>';
    document.body.appendChild(el);
    Object.assign(directions, { el, rec, linked: null, companies: new Map(), picked: '', customer: null, dest: null });
    el.querySelector('[data-act="close"]').addEventListener('click', closeDirections);
    el.querySelector('[data-act="settings"]').addEventListener('click', () => {
      if (el.dataset.view === 'settings') showRoute();
      else showSettings();
    });
    document.addEventListener('keydown', onDirectionsKey);
    showRoute();
  }

  const body = () => directions.el.querySelector('.oqa-body');
  const skeleton = (w) => `<i class="oqa-skel" style="width:${w}px"></i>`;

  function setFooter() {
    const s = loadSettings();
    directions.el.querySelector('footer').innerHTML =
      'Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors. ' +
      'Drive times: <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener">FOSSGIS</a>' +
      (s.transit ? '. Public transport: <a href="https://transitous.org/sources/" target="_blank" rel="noopener">Transitous</a>' : '') + '.';
  }

  function addressLine(c) {
    if (c.override) return c.override;
    if (c.text) return c.text;
    const p = c.parts || {};
    const country = clean(p.country);
    return [p.street, p.street2, [p.city, p.state, p.zip].filter(Boolean).join(' '),
      /^(australia|au)$/i.test(country) ? '' : country].map(clean).filter(Boolean).join(', ');
  }

  /* ----- Route view ----- */
  function showRoute() {
    const el = directions.el;
    if (!el) return;
    el.dataset.view = 'route';
    setFooter();
    const s = loadSettings();
    const from = currentFrom(s);
    const options = s.places.map((p) => `<option value="${esc(p.id)}">${esc(p.label)}</option>`).join('') +
      '<option value="here">My current location</option><option value="other">Another address…</option>';

    const you =
      '<div class="oqa-end"><span class="oqa-dot"></span><div>' +
      `<select class="oqa-from" aria-label="${s.direction === 'to' ? 'Start from' : 'Go to'}">${options}</select>` +
      '<div class="oqa-inline oqa-other" hidden><input type="text" class="oqa-other-input" placeholder="Type an address" aria-label="Address">' +
      '<button type="button" class="oqa-btn" data-act="other-go">Go</button></div>' +
      (s.places.length ? '' : '<div class="oqa-muted" style="margin-top:4px">Save your office or home: <button type="button" class="oqa-link" data-act="add-place">add a place</button></div>') +
      '</div></div>';
    const cust = '<div class="oqa-end"><span class="oqa-dot oqa-cust-dot"></span><div class="oqa-cust">' + skeleton(160) + skeleton(220) + '</div></div>';

    body().innerHTML =
      '<div class="oqa-ends">' + (s.direction === 'to' ? you + cust : cust + you) +
      `<button type="button" class="oqa-icon-btn oqa-swap" data-act="swap" title="Swap start and end" aria-label="Swap start and end">${ICON.swap}</button></div>` +
      '<div class="oqa-map"></div><div class="oqa-modes"></div><p class="oqa-note" hidden></p><div class="oqa-more"></div>';

    const b = body();
    const sel = b.querySelector('.oqa-from');
    sel.value = from;
    const other = b.querySelector('.oqa-other');
    const otherInput = b.querySelector('.oqa-other-input');
    other.hidden = from !== 'other';
    otherInput.value = directions.oneOff;

    sel.addEventListener('change', () => {
      setCurrentFrom(sel.value);
      other.hidden = sel.value !== 'other';
      if (sel.value === 'other') {
        otherInput.focus();
        if (!directions.oneOff) return;
      }
      calculate();
    });
    const goOther = () => {
      directions.oneOff = clean(otherInput.value);
      if (directions.oneOff) calculate();
    };
    b.querySelector('[data-act="other-go"]').addEventListener('click', goOther);
    otherInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') goOther(); });
    b.querySelector('[data-act="swap"]').addEventListener('click', () => {
      const st = loadSettings();
      st.direction = st.direction === 'to' ? 'from' : 'to';
      saveSettings(st);
      showRoute();
    });
    const add = b.querySelector('[data-act="add-place"]');
    if (add) add.addEventListener('click', showSettings);

    calculate();
  }

  function setNote(text, warn) {
    const n = body().querySelector('.oqa-note');
    if (!n) return;
    n.hidden = !text;
    n.textContent = text || '';
    n.classList.toggle('oqa-warn', !!warn);
  }

  // Customer card. "Edit" keeps a corrected address for that company in this browser.
  function renderCustomer() {
    const box = body().querySelector('.oqa-cust');
    const c = directions.customer;
    if (!box || !c) return;
    const line = c.error ? '' : addressLine(c);
    const many = c.count > 1
      ? `<button type="button" class="oqa-link" data-act="pick">${c.count} companies, pick another</button>` : '';
    box.innerHTML =
      `<b title="${esc(c.name)}">${esc(c.name || 'Customer')}${c.isPrimary && c.count > 1 ? '<span class="oqa-tag">Primary</span>' : ''}</b>` +
      `<small>${esc(c.error || line || 'No address in HubSpot')}${c.override ? ' (your edit)' : ''}</small> ` +
      `<div><button type="button" class="oqa-link" data-act="edit">${line ? 'Edit address' : 'Type the address'}</button>${many ? ' · ' + many : ''}</div>`;
    box.querySelector('[data-act="edit"]').addEventListener('click', () => editCustomer(box));
    const pick = box.querySelector('[data-act="pick"]');
    if (pick) pick.addEventListener('click', () => pickCompany(box));
  }

  function editCustomer(box) {
    const c = directions.customer || {};
    const overrides = store.get('overrides', {}) || {};
    box.innerHTML = `<b>${esc(c.name || 'Customer')}</b>` +
      '<div class="oqa-inline"><input type="text" class="oqa-addr" aria-label="Customer address" placeholder="Street, suburb, state, postcode">' +
      '<button type="button" class="oqa-btn" data-act="save">Save</button></div>' +
      '<div style="margin-top:4px"><button type="button" class="oqa-link" data-act="cancel">Cancel</button>' +
      (overrides[c.key] ? ' · <button type="button" class="oqa-link" data-act="reset">Use the HubSpot address</button>' : '') + '</div>' +
      '<small>Kept in this browser only. To fix it for everyone, update the company in HubSpot.</small>';
    const input = box.querySelector('.oqa-addr');
    input.value = c.error ? '' : addressLine(c);
    input.focus();
    input.select();
    const save = (value) => {
      const o = store.get('overrides', {}) || {};
      if (value) o[c.key] = value;
      else delete o[c.key];
      store.set('overrides', o);
      directions.customer = null;
      directions.dest = null;
      calculate();
    };
    box.querySelector('[data-act="save"]').addEventListener('click', () => save(clean(input.value)));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(clean(input.value)); });
    box.querySelector('[data-act="cancel"]').addEventListener('click', renderCustomer);
    const reset = box.querySelector('[data-act="reset"]');
    if (reset) reset.addEventListener('click', () => save(''));
  }

  // More than one company on the record (often a Head Office plus the venue): let you choose
  async function pickCompany(box) {
    const rec = directions.rec;
    box.innerHTML = '<b>Linked companies</b>' + skeleton(200) + skeleton(160);
    const run = directions.run;
    let choices;
    try { choices = await companyChoices(rec); } catch (e) { choices = { list: [], more: 0 }; }
    if (!directions.el || run !== directions.run) return;
    if (!choices.list.length) { renderCustomer(); return; }
    const current = directions.customer && directions.customer.id;
    box.innerHTML = '<b>Linked companies</b>' +
      `<select class="oqa-company" aria-label="Company">${choices.list.map((c) =>
        `<option value="${esc(c.id)}"${c.id === current ? ' selected' : ''}>${esc(c.name || 'Company ' + c.id)}` +
        `${c.parts && c.parts.city ? ' (' + esc(c.parts.city) + ')' : ''}${c.id === directions.linked.primary ? ', primary' : ''}</option>`).join('')}</select>` +
      (choices.more > 0 ? `<small>And ${choices.more} more not shown.</small>` : '') +
      '<div style="margin-top:4px"><button type="button" class="oqa-link" data-act="cancel">Cancel</button></div>';
    const sel = box.querySelector('.oqa-company');
    sel.focus();
    sel.addEventListener('change', () => {
      directions.picked = sel.value;
      directions.customer = null;
      directions.dest = null;
      calculate();
    });
    box.querySelector('[data-act="cancel"]').addEventListener('click', renderCustomer);
  }

  async function loadCustomer(run) {
    if (!directions.customer) {
      let c;
      try {
        c = await getCustomer(directions.rec, directions.picked);
      } catch (e) {
        c = { key: 'rec:' + recordKey(directions.rec), name: 'Customer', error: 'Couldn\'t read the company from HubSpot.' };
      }
      if (run !== directions.run || !directions.el) return null;
      // A typed-in address wins over HubSpot's
      const o = store.get('overrides', {}) || {};
      if (o[c.key]) Object.assign(c, { override: o[c.key], error: null, lat: null, lon: null });
      directions.customer = c;
      directions.lastVia = (directions.linked ? directions.linked.via : '') + (c.via ? ' / ' + c.via : '');
    }
    renderCustomer();
    return directions.customer;
  }

  async function customerPoint(c) {
    if (directions.dest) return directions.dest;
    if (c.lat !== null && c.lat !== undefined && isFinite(c.lat) && isFinite(c.lon)) {
      directions.dest = { lat: +c.lat, lon: +c.lon, approx: false, fromHubSpot: true };
    } else if (c.override || c.text) {
      directions.dest = await geocode({ text: c.override || c.text });
    } else {
      const p = c.parts || {};
      directions.dest = await geocode({ street: [p.street, p.street2].filter(Boolean).join(' '), city: p.city, state: p.state, zip: p.zip, country: p.country });
    }
    return directions.dest;
  }

  function getPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('This browser can\'t share your location. Pick a saved place.'));
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
        (e) => reject(new Error(e.code === 1
          ? 'Location is blocked for HubSpot. Allow it from the icon in the address bar, or pick a saved place.'
          : 'Couldn\'t get your location. Pick a saved place instead.')),
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 });
    });
  }

  // Where you are: a saved place, your current location, or a one-off address
  async function yourPoint(from) {
    if (from === 'here') {
      const p = await getPosition();
      return { ...p, label: 'My location', query: pt(p) };
    }
    if (from === 'other') {
      const g = await geocode({ text: directions.oneOff });
      if (!g) throw new Error(`Couldn't find "${directions.oneOff}" on the map. Try adding the suburb and postcode.`);
      return { ...g, label: directions.oneOff, query: directions.oneOff };
    }
    const p = loadSettings().places.find((x) => x.id === from);
    if (!p) throw new Error('That saved place has gone. Pick another.');
    return { lat: p.lat, lon: p.lon, label: p.label, query: parseCoords(p.address) ? pt(p) : p.address };
  }

  function modeRow(kind, icon, href) {
    return `<a class="oqa-mode" data-mode="${kind}" href="${esc(href)}" target="_blank" rel="noopener" title="Open in Google Maps">` +
      `<span class="oqa-ic">${icon}</span><div><b>${skeleton(70)}</b><span class="oqa-sub">${skeleton(150)}</span></div>` +
      `<span class="oqa-go">${ICON.external}</span></a>`;
  }
  function fillMode(kind, big, small) {
    const row = directions.el && body().querySelector(`.oqa-mode[data-mode="${kind}"]`);
    if (!row) return;
    row.querySelector('b').textContent = big;
    row.querySelector('.oqa-sub').textContent = small;
  }

  async function calculate() {
    if (!directions.el) return;
    const run = ++directions.run;
    const live = () => run === directions.run && !!directions.el;
    const b = body();
    const modes = b.querySelector('.oqa-modes');
    const map = b.querySelector('.oqa-map');
    const more = b.querySelector('.oqa-more');
    if (!modes) return;
    setNote('');
    modes.innerHTML = '';
    more.innerHTML = '';
    map.innerHTML = '';
    map.hidden = false;

    const c = await loadCustomer(run);
    if (!live() || !c) return;
    if (c.error || (!addressLine(c) && c.lat == null)) {
      map.hidden = true;
      setNote(c.error ? 'Type the customer\'s address above to get directions.'
        : 'This company has no address in HubSpot. Type one above, or add it to the company record.', true);
      return;
    }

    const s = loadSettings();
    let dest, you;
    try {
      [dest, you] = await Promise.all([
        customerPoint(c).catch((e) => { log('address lookup failed:', e.message); return null; }),
        yourPoint(b.querySelector('.oqa-from').value),
      ]);
    } catch (e) {
      if (!live()) return;
      map.hidden = true;
      setNote(e.message, true);
      return;
    }
    if (!live()) return;
    if (!dest) {
      map.hidden = true;
      setNote('Couldn\'t find this address on the map. Check it with Edit address, or try Google Maps.', true);
      const custQ = { query: addressLine(c) };
      modes.innerHTML = modeRow('drive', ICON.car, s.direction === 'to' ? gmaps(you, custQ, 'driving') : gmaps(custQ, you, 'driving'));
      fillMode('drive', 'Google Maps', 'Open the route in Google Maps');
      return;
    }

    // Google gets the address text (it finds the venue better than a pin), with the country added when missing
    const line = addressLine(c);
    const hasCountry = /\b(australia|new zealand|united kingdom|united states)\b/i.test(line);
    const custEnd = { ...dest, label: c.name, query: dest.approx || !line ? pt(dest) : line + (hasCountry ? '' : ', Australia') };
    const [a, z] = s.direction === 'to' ? [you, custEnd] : [custEnd, you];

    modes.innerHTML = modeRow('drive', ICON.car, gmaps(a, z, 'driving')) + modeRow('transit', ICON.train, gmaps(a, z, 'transit'));
    more.innerHTML = moreLinks(a, z, s.transit);
    drawMap(map, a, z, null);
    if (dest.approx) setNote('Couldn\'t find the exact street, so times go to the suburb. Edit the address for a closer match.', true);
    else if (dest.display && !dest.fromHubSpot) setNote('Map pin: ' + dest.display);

    driveRoute(a, z).then((r) => {
      if (!live()) return;
      fillMode('drive', fmtDuration(r.seconds), `${fmtDistance(r.metres)} by car, without traffic`);
      drawMap(map, a, z, r.line);
    }).catch((e) => {
      log('drive route failed:', e.message);
      if (live()) fillMode('drive', 'Drive', 'Couldn\'t work out a time here. Open Google Maps instead.');
    });

    if (!s.transit) {
      fillMode('transit', 'Public transport', 'Open Google Maps for times');
      return;
    }
    transitPlan(a, z).then((t) => {
      if (!live()) return;
      if (!t) return fillMode('transit', 'Public transport', 'No services found. Open Google Maps instead.');
      if (t.walkOnly) return fillMode('transit', fmtDuration(t.seconds), 'Walk, it\'s close');
      const changes = t.changes ? `${t.changes} change${t.changes > 1 ? 's' : ''}` : 'direct';
      fillMode('transit', fmtDuration(t.seconds),
        `Leave ${fmtTime(t.leave, t.tz)}, arrive ${fmtTime(t.arrive, t.tz)}. ${t.lines.slice(0, 4).join(' then ')}${t.lines.length ? ', ' : ''}${changes}`);
    }).catch((e) => {
      log('public transport failed:', e.message);
      if (live()) fillMode('transit', 'Public transport', 'Couldn\'t get times here. Open Google Maps instead.');
    });
  }

  /* ----- Settings view ----- */
  function showSettings() {
    const el = directions.el;
    if (!el) return;
    directions.run++;
    el.dataset.view = 'settings';
    const s = loadSettings();
    const defaultId = s.defaultFrom && (s.defaultFrom === 'here' || s.places.some((p) => p.id === s.defaultFrom))
      ? s.defaultFrom : (s.places[0] ? s.places[0].id : 'here');
    const star = (id, label) =>
      `<button type="button" class="oqa-icon-btn oqa-star" data-star="${esc(id)}" aria-pressed="${defaultId === id}" ` +
      `title="${defaultId === id ? 'Directions start here' : 'Start directions here'}" aria-label="Start directions from ${esc(label)}">${ICON.star}</button>`;

    body().innerHTML =
      `<button type="button" class="oqa-link" data-act="back" style="margin:2px 0 4px">Back to directions</button>` +
      '<h3>Your places</h3>' +
      '<p class="oqa-muted" style="margin:0">Saved in Tampermonkey on this computer only. The star is where directions start.</p>' +
      '<ul class="oqa-places">' +
      s.places.map((p) =>
        `<li><div><b>${esc(p.label)}</b><small title="${esc(p.display || p.address)}">${esc(p.display || p.address)}</small></div>` +
        star(p.id, p.label) +
        `<button type="button" class="oqa-icon-btn" data-del="${esc(p.id)}" title="Remove" aria-label="Remove ${esc(p.label)}">${ICON.trash}</button></li>`).join('') +
      `<li><div><b>My current location</b><small>Your browser asks the first time</small></div>${star('here', 'my current location')}</li>` +
      '</ul>' +
      '<form class="oqa-form" autocomplete="off">' +
      '<h3 style="margin-top:4px">Add a place</h3>' +
      '<input type="text" name="label" maxlength="40" placeholder="Name, for example Perth office or Home" aria-label="Place name">' +
      '<input type="text" name="address" placeholder="Address, or a Google Maps link" aria-label="Place address">' +
      '<div class="oqa-inline" style="margin:0"><button type="submit" class="oqa-btn">Add place</button>' +
      '<button type="button" class="oqa-btn oqa-quiet" data-act="here">Use where I am now</button></div>' +
      '<p class="oqa-error-text" hidden></p>' +
      '<small class="oqa-muted">For home, a nearby corner or your suburb is enough. Addresses are looked up on OpenStreetMap; ' +
      '"Use where I am now" saves the spot without sending an address anywhere.</small></form>' +
      '<h3>Public transport times</h3>' +
      `<label class="oqa-check"><input type="checkbox" data-act="transit"${s.transit ? ' checked' : ''}>` +
      '<span>Show public transport times here, from <a href="https://transitous.org/api/" target="_blank" rel="noopener">Transitous</a>. ' +
      'It\'s a free volunteer service for personal, non-commercial use, and they ask to hear from you before you use it. ' +
      'When off, the public transport row opens Google Maps.</span></label>' +
      '<details><summary>Advanced</summary>' +
      '<p class="oqa-muted" style="margin:6px 0 0">Service addresses, in case one moves or asks you to switch. Clear a box to go back to the default.</p>' +
      ['geocode:Address lookup', 'drive:Driving routes', 'transit:Public transport'].map((x) => {
        const [k, label] = x.split(':');
        return `<label class="oqa-field">${label}<input type="text" data-service="${k}" placeholder="${esc(SERVICES[k])}" value="${esc(s.services[k] || '')}"></label>`;
      }).join('') +
      `<p class="oqa-muted" style="margin:8px 0 0">Version ${esc(VERSION)}. Last company lookup: ${esc(directions.lastVia || 'none yet')}.</p>` +
      '</details>';

    const b = body();
    b.querySelector('[data-act="back"]').addEventListener('click', showRoute);
    b.querySelectorAll('[data-star]').forEach((btn) => btn.addEventListener('click', () => {
      const st = loadSettings();
      st.defaultFrom = btn.dataset.star;
      saveSettings(st);
      setCurrentFrom(st.defaultFrom);
      showSettings();
    }));
    b.querySelectorAll('[data-del]').forEach((btn) => btn.addEventListener('click', () => {
      const st = loadSettings();
      st.places = st.places.filter((p) => p.id !== btn.dataset.del);
      if (st.defaultFrom === btn.dataset.del) st.defaultFrom = '';
      saveSettings(st);
      showSettings();
    }));
    b.querySelector('[data-act="transit"]').addEventListener('change', (e) => {
      const st = loadSettings();
      st.transit = e.target.checked;
      saveSettings(st);
      setFooter();
    });
    b.querySelectorAll('[data-service]').forEach((input) => input.addEventListener('change', () => {
      const st = loadSettings();
      const v = clean(input.value);
      if (v && !/^https:\/\//.test(v)) { input.value = ''; return; }
      st.services = { ...st.services, [input.dataset.service]: v };
      if (!v) delete st.services[input.dataset.service];
      saveSettings(st);
    }));

    const form = b.querySelector('form');
    const err = form.querySelector('.oqa-error-text');
    const showErr = (msg) => { err.textContent = msg; err.hidden = !msg; };
    const addPlace = (label, address, g) => {
      const st = loadSettings();
      const id = 'p' + Date.now().toString(36);
      st.places.push({ id, label, address, lat: g.lat, lon: g.lon, display: g.display });
      if (st.places.length === 1 && !st.defaultFrom) st.defaultFrom = id;
      saveSettings(st);
      showSettings();
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const label = clean(form.label.value), address = clean(form.address.value);
      if (!label) return showErr('Give the place a name.');
      if (!address) return showErr('Add an address, or use where you are now.');
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Finding it…';
      showErr('');
      let g = null;
      try { g = await geocode({ text: address }); } catch (x) { log('place lookup failed:', x.message); }
      if (!directions.el || directions.el.dataset.view !== 'settings') return;
      btn.disabled = false;
      btn.textContent = 'Add place';
      if (!g) return showErr('Couldn\'t find that address. Try adding the suburb and postcode.');
      addPlace(label, address, g);
    });
    form.querySelector('[data-act="here"]').addEventListener('click', async () => {
      const label = clean(form.label.value) || 'Saved spot';
      showErr('');
      try {
        const p = await getPosition();
        if (!directions.el || directions.el.dataset.view !== 'settings') return;
        addPlace(label, pt(p), { ...p, display: 'Saved from your location' });
      } catch (x) {
        showErr(x.message);
      }
    });
    if (!s.places.length) form.label.focus();
  }

  /* ---------------- Scheduler iframe: prefill title + attendee description ---------------- */
  function scheduler() {
    // The parent is the record page (either the normal tab or the Help Desk modal).
    // Only tickets and deals are prefilled; contacts and companies are left as HubSpot sets them.
    const TYPES = { '0-5': 'Ticket', ticket: 'Ticket', '0-3': 'Deal', deal: 'Deal' };
    const TYPE_PATHS = { Ticket: '0-5', Deal: '0-3' };

    function getTicket() {
      try {
        const host = window.parent;
        const m = host.location.pathname.match(/^\/contacts\/(\d+)\/(?:record\/(0-\d+)|(ticket|deal))\/(\d+)/);
        const label = m && TYPES[m[2] || m[3]];
        if (!label) return null;
        const titleEl = host.document.querySelector('[data-selenium-test="highlightTitle"]');
        const name = (titleEl ? titleEl.innerText : host.document.title).trim();
        const url = `${location.origin}/contacts/${m[1]}/record/${TYPE_PATHS[label]}/${m[4]}`;
        return name ? { name, url, label } : null;
      } catch (e) {
        return null;
      }
    }

    // The collapsed description box opens on Enter (synthetic clicks are ignored)
    function pressEnter(el) {
      el.focus();
      const opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
      el.dispatchEvent(new KeyboardEvent('keydown', opts));
      el.dispatchEvent(new KeyboardEvent('keyup', opts));
    }

    function setReactInput(input, value) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // The tmDone / tmClicked flags match the old "Prefill meeting" script,
    // so if both are installed the description is only added once
    function run() {
      const ticket = getTicket();
      if (!ticket) return;

      const title = document.querySelector('input[data-test-id="title-input"]');
      if (title && !title.dataset.tmDone) {
        title.dataset.tmDone = '1';
        if (!title.value.trim()) setReactInput(title, TITLE_FORMAT(ticket));
      }

      const desc = document.querySelector('[data-selenium-test="attendee-description-editor"], [data-test-id="attendee-description-editor"]');
      if (!desc || desc.dataset.tmDone) return;

      const editor = desc.querySelector('.ProseMirror[contenteditable="true"]');
      if (!editor) {
        const placeholder = desc.querySelector('[data-test-id="stackable-editable-description"]');
        if (placeholder && !placeholder.dataset.tmClicked) {
          placeholder.dataset.tmClicked = '1';
          pressEnter(placeholder);
        }
        return;
      }

      desc.dataset.tmDone = '1';
      if (editor.innerHTML.includes(ticket.url)) return;

      editor.focus();
      // Put the cursor at the end so any existing text stays first
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      // Show the full URL as the link text. HubSpot drops the href when it sends
      // the invite, so a bare URL is what lets Outlook make it clickable.
      const dt = new DataTransfer();
      dt.setData('text/html', `<p>${ticket.label}: ${esc(ticket.name)}<br><a href="${ticket.url}">${ticket.url}</a></p>`);
      dt.setData('text/plain', `${ticket.label}: ${ticket.name}\n${ticket.url}`);
      editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      if (title) title.focus();
    }

    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      setTimeout(() => { pending = false; run(); }, 250);
    }).observe(document.body, { childList: true, subtree: true });
    run();
  }

  /* ---------------- Start ---------------- */
  if (location.pathname.startsWith('/calendar-select-iframe/')) scheduler();
  // Skip the record page loaded inside the Help Desk meeting modal
  else if (window.top === window) toolbar();
})();
