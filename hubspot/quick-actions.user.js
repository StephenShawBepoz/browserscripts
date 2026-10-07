// ==UserScript==
// @name         HubSpot: Quick actions
// @namespace    oolio-userscripts
// @version      0.7.0
// @description  Meeting, task, drive time, public transport and multi-stop trip buttons on HubSpot tickets, deals, companies and contacts, worked out from the record's company address.
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
// @grant        GM_addValueChangeListener
// @grant        GM_listValues
// @grant        GM_deleteValue
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

  // Task title format. The cursor is left at the end, so you can type straight after it.
  // Examples: (t) => `Follow up: ${t.name}`   or   (t) => ''   (to leave it empty)
  const TASK_TITLE_FORMAT = (t) => `Follow up: ${t.name}`;

  // Free, open services, so there are no keys to keep out of this public repo.
  // Each one asks for light use only. Read their rules before changing how often
  // this calls them. All three can be swapped in the panel's settings > Advanced.
  //   Address lookup:   https://operations.osmfoundation.org/policies/nominatim/
  //   Driving routes:   https://routing.openstreetmap.de/about.html
  //   Public transport: https://transitous.org/api/  (off until you turn it on)
  const SERVICES = {
    geocode: 'https://nominatim.openstreetmap.org/search',
    drive: 'https://routing.openstreetmap.de/routed-car',
    transit: 'https://api.transitous.org/api/v6/plan',
  };
  // Bepoz / Oolio offices, from https://www.bepoz.com.au/contact (checked October 2026).
  // Directions start from whichever is nearest the customer, unless you star another start.
  // Map points: the building, except Brisbane and Adelaide, which are the street (within a few hundred metres).
  const OFFICES = [
    { id: 'off-mel', area: 'North Melbourne', label: 'Melbourne office', address: 'Unit 5, 63-71 Boundary Road, North Melbourne VIC 3051, Australia', lat: -37.79317, lon: 144.93836 },
    { id: 'off-syd', area: 'Mascot', label: 'Sydney office', address: 'Unit 7, 689-691 Gardeners Road, Mascot NSW 2020, Australia', lat: -33.92007, lon: 151.18267 },
    { id: 'off-bne', area: 'Pinkenba', label: 'Brisbane office', address: '601 Curtin Avenue East, Pinkenba QLD 4008, Australia', lat: -27.4352, lon: 153.10418 },
    { id: 'off-adl', area: 'Kingswood', label: 'Adelaide office', address: 'Unit 4, 55 Belair Road, Kingswood SA 5062, Australia', lat: -34.96593, lon: 138.60865 },
    { id: 'off-per', area: 'Subiaco', label: 'Perth office', address: 'Suite 41, 5/531 Hay Street, Subiaco WA 6008, Australia', lat: -31.94759, lon: 115.82212 },
    { id: 'off-akl', area: 'Grey Lynn', label: 'Auckland office', address: '60M Surrey Crescent, Grey Lynn, Auckland 1021, New Zealand', lat: -36.86317, lon: 174.73379 },
    { id: 'off-war', area: 'Warrington', label: 'Warrington office', address: 'St James Business Centre, Wilderspool Causeway, Warrington WA4 6PS, United Kingdom', lat: 53.38277, lon: -2.59009 },
    { id: 'off-rkh', area: 'Rock Hill', label: 'South Carolina office', address: '452 Lakeshore Parkway, Suite 210, Rock Hill SC 29730, United States', lat: 34.93248, lon: -80.99886 },
  ];

  const TILES = 'https://tile.openstreetmap.org';
  const REPO = 'https://github.com/StephenShawBepoz/browserscripts';
  const VERSION = typeof GM_info !== 'undefined' && GM_info.script ? GM_info.script.version : '0';
  const USER_AGENT = `OolioQuickActions/${VERSION} (+${REPO})`;
  // Google Maps links take up to 9 stops on top of the start
  const MAX_STOPS = 9;

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
        height:44px; padding:0 4px 0 2px; border-radius:999px; background:var(--oolio-purple); color:#fff; user-select:none;
        box-shadow:0 6px 20px rgba(103,58,182,.35), 0 1px 3px rgba(34,34,34,.2); }
      #oqa-bar.oqa-dragging { box-shadow:0 12px 32px rgba(103,58,182,.45), 0 2px 6px rgba(34,34,34,.25); }
      #oqa-bar .oqa-grip { width:18px; margin-right:2px; color:rgba(255,255,255,.7); cursor:grab; touch-action:none; }
      #oqa-bar .oqa-grip:hover { color:#fff; }
      #oqa-bar .oqa-grip svg { width:16px; height:16px; }
      html.oqa-moving, html.oqa-moving * { cursor:grabbing !important; user-select:none !important; }
      #oqa-bar .oqa-markbtn { width:auto; padding:0 4px; margin-left:-4px; }
      #oqa-bar .oqa-markbtn svg { width:24px; height:auto; }
      #oqa-bar.oqa-collapsed { padding:0 4px 0 2px; }
      #oqa-bar.oqa-collapsed > :not(.oqa-markbtn):not(.oqa-grip) { display:none; }
      #oqa-bar.oqa-collapsed .oqa-markbtn { margin:0; padding:0 8px; }
      #oqa-bar .oqa-sep { width:1px; height:18px; margin:0 6px 0 10px; background:rgba(255,255,255,.35); }
      #oqa-bar button { position:relative; display:inline-flex; align-items:center; justify-content:center; width:38px; height:36px;
        padding:0; border:0; border-radius:999px; background:transparent; color:#fff; cursor:pointer; transition:background .15s; }
      #oqa-bar button:hover, #oqa-bar button[aria-pressed="true"] { background:rgba(255,255,255,.2); }
      #oqa-bar button:focus-visible { outline:2px solid #fff; outline-offset:-2px; }
      #oqa-bar button svg { width:18px; height:18px; }
      #oqa-bar .oqa-badge { position:absolute; top:2px; right:2px; min-width:16px; height:16px; padding:0 4px; border-radius:999px;
        background:#fff; color:var(--oolio-purple); font:700 10px/16px Inter, system-ui, sans-serif; text-align:center; }
      #oqa-bar .oqa-badge:empty { display:none; }

      /* ---------- Drive time from the nearest office, next to the bar ---------- */
      #oqa-chip { position:fixed; right:24px; bottom:60px; z-index:2147483000; display:none; align-items:center; gap:6px;
        height:24px; padding:0 10px; border:1px solid var(--oolio-line); border-radius:999px; background:#fff; color:var(--oolio-charcoal);
        box-shadow:0 2px 8px rgba(34,34,34,.12); font-size:12px; cursor:pointer; white-space:nowrap; max-width:calc(100vw - 48px); }
      #oqa-chip:hover { border-color:var(--oolio-purple); }
      #oqa-chip:focus-visible { outline:2px solid var(--oolio-purple); outline-offset:1px; }
      #oqa-chip svg { width:14px; height:14px; color:var(--oolio-purple); }
      #oqa-chip b { font-weight:700; }
      #oqa-chip span { overflow:hidden; text-overflow:ellipsis; }

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

      /* ---------- Panel ---------- */
      #oqa-panel { position:fixed; right:24px; bottom:146px; z-index:2147483001; width:360px; max-width:calc(100vw - 32px);
        max-height:calc(100vh - 170px); display:flex; flex-direction:column; overflow:hidden; border-radius:16px;
        background:#fff; color:var(--oolio-charcoal); font-size:13px; line-height:1.4; text-align:left;
        box-shadow:0 12px 40px rgba(34,34,34,.22), 0 0 0 1px rgba(34,34,34,.06); }
      #oqa-panel * { box-sizing:border-box; }
      #oqa-panel [hidden] { display:none !important; }
      #oqa-panel header { display:flex; align-items:center; gap:8px; padding:10px 8px 8px 16px;
        border-top:4px solid var(--oolio-purple); }
      #oqa-panel header .oqa-hicon { color:var(--oolio-purple); }
      #oqa-panel header .oqa-hicon svg { width:18px; height:18px; }
      #oqa-panel header b { flex:1; font-size:15px; font-weight:900; }
      #oqa-panel .oqa-body { overflow:auto; padding:2px 16px 14px; }
      #oqa-panel button, #oqa-panel input, #oqa-panel select { font:inherit; color:inherit; margin:0; }
      #oqa-panel .oqa-icon-btn { display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px;
        padding:0; border:0; border-radius:8px; background:transparent; color:var(--oolio-grey); cursor:pointer; flex:none; }
      #oqa-panel .oqa-icon-btn:hover { background:var(--oolio-tint); color:var(--oolio-purple); }
      #oqa-panel .oqa-icon-btn[disabled] { opacity:.35; cursor:default; background:transparent; color:var(--oolio-grey); }
      #oqa-panel .oqa-icon-btn svg { width:18px; height:18px; }
      #oqa-panel :focus-visible { outline:2px solid var(--oolio-purple); outline-offset:1px; }

      #oqa-panel .oqa-ends { position:relative; display:grid; grid-template-columns:minmax(0, 1fr); gap:4px; padding:0 40px 12px 0; }
      #oqa-panel .oqa-ends.oqa-solo { padding-right:0; }
      #oqa-panel .oqa-end { display:flex; align-items:flex-start; gap:10px; min-height:36px; min-width:0; }
      #oqa-panel .oqa-dot { width:12px; height:12px; margin-top:12px; border-radius:50%; flex:none;
        border:3px solid var(--oolio-charcoal); background:#fff; }
      #oqa-panel .oqa-dot.oqa-cust-dot { border-color:#fff; background:var(--oolio-purple); box-shadow:0 0 0 1px var(--oolio-purple); }
      #oqa-panel .oqa-end > div { flex:1; min-width:0; }
      #oqa-panel select, #oqa-panel input[type="text"] { width:100%; height:36px; padding:0 10px; border:1px solid var(--oolio-line);
        border-radius:8px; background:#fff; }
      #oqa-panel select:focus, #oqa-panel input[type="text"]:focus { border-color:var(--oolio-purple); outline:none; }
      #oqa-panel .oqa-cust { padding-top:6px; }
      #oqa-panel .oqa-from-note { display:block; margin-top:4px; }
      #oqa-panel .oqa-name { display:flex; align-items:baseline; gap:6px; min-width:0; }
      #oqa-panel .oqa-name b { min-width:0; font-size:14px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      #oqa-panel .oqa-cust small, #oqa-panel .oqa-muted { color:var(--oolio-grey); font-size:12px; }
      #oqa-panel .oqa-tag { flex:none; padding:0 6px; border-radius:999px; background:var(--oolio-tint);
        color:var(--oolio-purple); font-size:11px; font-weight:700; }
      #oqa-panel .oqa-swap { position:absolute; right:0; top:50%; margin-top:-22px; }
      #oqa-panel .oqa-link { padding:0; border:0; background:none; color:var(--oolio-purple); font-size:12px;
        font-weight:500; cursor:pointer; text-decoration:underline; text-underline-offset:2px; }
      #oqa-panel .oqa-inline { display:flex; gap:6px; margin-top:6px; }
      #oqa-panel .oqa-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; height:36px; padding:0 14px;
        border:0; border-radius:8px; background:var(--oolio-purple); color:#fff; font-weight:700; cursor:pointer; white-space:nowrap;
        text-decoration:none; }
      #oqa-panel .oqa-btn svg { width:16px; height:16px; }
      #oqa-panel .oqa-btn:hover { background:var(--oolio-deep); }
      #oqa-panel .oqa-btn.oqa-quiet { background:var(--oolio-tint); color:var(--oolio-purple); }
      #oqa-panel .oqa-btn.oqa-quiet:hover { background:#E8DEF5; }
      #oqa-panel .oqa-btn[disabled] { opacity:.6; cursor:default; }
      #oqa-panel .oqa-actions { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }

      #oqa-panel .oqa-map { position:relative; height:160px; margin:0 0 10px; overflow:hidden; border-radius:10px;
        background:var(--oolio-tint); }
      #oqa-panel .oqa-map img { position:absolute; width:256px; height:256px; max-width:none; user-select:none; }
      #oqa-panel .oqa-map svg { position:absolute; left:0; top:0; }
      #oqa-panel .oqa-map .oqa-osm { position:absolute; right:0; bottom:0; padding:1px 5px; border-top-left-radius:6px;
        background:rgba(255,255,255,.85); color:var(--oolio-charcoal); font-size:10px; text-decoration:none; }

      #oqa-panel .oqa-mode { display:flex; align-items:center; gap:12px; padding:10px; border-radius:10px;
        background:#fff; border:1px solid var(--oolio-line); color:inherit; text-decoration:none; }
      #oqa-panel a.oqa-mode:hover { border-color:var(--oolio-purple); background:var(--oolio-tint); }
      #oqa-panel .oqa-mode .oqa-ic { display:grid; place-items:center; width:34px; height:34px; border-radius:9px; flex:none;
        background:var(--oolio-tint); color:var(--oolio-purple); }
      #oqa-panel .oqa-mode .oqa-ic svg { width:18px; height:18px; }
      #oqa-panel .oqa-mode > div { flex:1; min-width:0; }
      #oqa-panel .oqa-mode b { display:block; font-size:18px; font-weight:900; }
      #oqa-panel .oqa-mode .oqa-sub { display:block; color:var(--oolio-grey); font-size:12px; }
      #oqa-panel .oqa-mode .oqa-go { color:var(--oolio-grey); flex:none; }
      #oqa-panel .oqa-mode .oqa-go svg { width:16px; height:16px; }

      #oqa-panel .oqa-legs { margin:8px 0 0; padding:0; list-style:none; display:grid; gap:4px; }
      #oqa-panel .oqa-legs li { display:flex; gap:8px; align-items:baseline; font-size:12px; }
      #oqa-panel .oqa-legs .oqa-line { flex:none; min-width:34px; padding:0 6px; border-radius:6px; background:var(--oolio-purple);
        color:#fff; font-weight:700; text-align:center; }
      #oqa-panel .oqa-legs .oqa-line.oqa-walkline { background:var(--oolio-tint); color:var(--oolio-grey); font-weight:500; }
      #oqa-panel .oqa-callout { margin-top:10px; padding:10px 12px; border-radius:10px; background:var(--oolio-tint); font-size:12px; }
      #oqa-panel .oqa-callout p { margin:0 0 8px; }
      #oqa-panel .oqa-note { margin:10px 0 0; color:var(--oolio-grey); font-size:12px; }
      #oqa-panel .oqa-note.oqa-warn { color:#8a5300; }
      #oqa-panel .oqa-more { display:flex; flex-wrap:wrap; align-items:center; gap:4px 12px; margin-top:10px; }
      #oqa-panel .oqa-more:empty { display:none; }
      #oqa-panel footer { padding:8px 16px; border-top:1px solid var(--oolio-line); color:var(--oolio-grey); font-size:10px; }
      #oqa-panel footer a { color:inherit; }

      #oqa-panel .oqa-stops { margin:0 0 8px; padding:0; list-style:none; display:grid; grid-template-columns:minmax(0, 1fr); gap:6px; }
      #oqa-panel .oqa-stops li { display:flex; align-items:center; gap:8px; min-width:0; padding:6px 2px 6px 8px;
        border:1px solid var(--oolio-line); border-radius:10px; }
      #oqa-panel .oqa-stops li > div { flex:1; min-width:0; }
      #oqa-panel .oqa-stops a.oqa-stop-name { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
        color:inherit; font-weight:700; text-decoration:none; }
      #oqa-panel .oqa-stops a.oqa-stop-name:hover { color:var(--oolio-purple); text-decoration:underline; }
      #oqa-panel .oqa-stops small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--oolio-grey); font-size:11px; }
      #oqa-panel .oqa-stops .oqa-legtime { color:var(--oolio-purple); font-weight:700; }
      #oqa-panel .oqa-num { display:grid; place-items:center; width:22px; height:22px; flex:none; border-radius:50%;
        background:var(--oolio-purple); color:#fff; font-size:11px; font-weight:700; }
      #oqa-panel .oqa-suggest { display:grid; gap:4px; margin:8px 0; }
      #oqa-panel .oqa-suggest button { display:flex; align-items:center; gap:8px; width:100%; padding:6px 8px; border:1px dashed var(--oolio-line);
        border-radius:10px; background:#fff; cursor:pointer; text-align:left; min-width:0; }
      #oqa-panel .oqa-suggest button:hover { border-color:var(--oolio-purple); background:var(--oolio-tint); }
      #oqa-panel .oqa-suggest button svg { width:16px; height:16px; color:var(--oolio-purple); }
      #oqa-panel .oqa-suggest button span { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      #oqa-panel .oqa-suggest button small { flex:none; color:var(--oolio-grey); font-size:11px; }
      #oqa-panel .oqa-total { margin:4px 0 8px; font-size:13px; }
      #oqa-panel .oqa-total b { font-size:18px; font-weight:900; }

      #oqa-panel .oqa-skel { display:block; height:12px; margin:4px 0; border-radius:6px; background:linear-gradient(90deg,
        var(--oolio-tint) 0%, #fff 50%, var(--oolio-tint) 100%); background-size:200% 100%; animation:oqa-shimmer 1.2s linear infinite; }
      @keyframes oqa-shimmer { from { background-position:200% 0; } to { background-position:-200% 0; } }

      #oqa-panel h3 { margin:12px 0 4px; font-size:14px; font-weight:900; }
      #oqa-panel .oqa-places { margin:8px 0; padding:0; list-style:none; display:grid; grid-template-columns:minmax(0, 1fr); gap:6px; }
      #oqa-panel .oqa-places li { min-width:0; display:flex; align-items:center; gap:4px; padding:6px 4px 6px 10px;
        border:1px solid var(--oolio-line); border-radius:10px; }
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
    task: lucide('<rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>'),
    route: lucide('<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>'),
    plus: lucide('<path d="M5 12h14"/><path d="M12 5v14"/>'),
    up: lucide('<path d="m18 15-6-6-6 6"/>'),
    down: lucide('<path d="m6 9 6 6 6-6"/>'),
    back: lucide('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>'),
    grip: lucide('<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>'),
  };
  const MARK_PATH = 'd="M140.099 0C173.181 0 200 26.6979 200 59.6314C200 92.5649 173.181 119.263 140.099 119.263C124.677 119.263 110.616 113.461 99.9986 103.93C89.3837 113.461 75.3229 119.263 59.901 119.263C26.8186 119.263 0 92.5649 0 59.6314C0 26.6979 26.8186 0 59.901 0C75.3232 0 89.3841 5.80195 100.001 15.3329C110.616 5.80177 124.677 0 140.099 0ZM140.099 39.9185C129.163 39.9185 120.297 48.7443 120.297 59.6314C120.297 70.5185 129.163 79.3442 140.099 79.3442C151.035 79.3442 159.901 70.5185 159.901 59.6314C159.901 48.7443 151.035 39.9185 140.099 39.9185ZM59.901 39.9185C48.9647 39.9185 40.099 48.7443 40.099 59.6314C40.099 70.5185 48.9647 79.3442 59.901 79.3442C70.8373 79.3442 79.703 70.5185 79.703 59.6314C79.703 48.7443 70.8373 39.9185 59.901 39.9185Z"';
  const OOLIO_MARK = '<svg class="oqa-bigmark" viewBox="0 0 200 120" aria-label="Oolio"><path fill="#673AB6" fill-rule="evenodd" clip-rule="evenodd" ' + MARK_PATH + '/></svg>';
  const OOLIO_MARK_WHITE = '<svg viewBox="0 0 200 120" aria-hidden="true"><path fill="#fff" fill-rule="evenodd" clip-rule="evenodd" ' + MARK_PATH + '/></svg>';

  /* ---------------- Small helpers ---------------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (...a) => console.info('[Oolio quick actions]', ...a);

  // Saved places, the trip and caches live in Tampermonkey's storage for this script, on this computer only.
  // Every HubSpot tab shares it, which is how a trip collects stops from several tabs.
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
    remove(name) {
      try {
        if (typeof GM_deleteValue === 'function') GM_deleteValue(name);
        else localStorage.removeItem('oolio-qa:' + name);
      } catch (e) { /* ignore */ }
    },
    keys() {
      try {
        if (typeof GM_listValues === 'function') return GM_listValues();
        return Object.keys(localStorage).filter((k) => k.startsWith('oolio-qa:')).map((k) => k.slice(9));
      } catch (e) { return []; }
    },
    watch(name, fn) {
      if (typeof GM_addValueChangeListener === 'function') GM_addValueChangeListener(name, (n, oldV, newV, remote) => fn(newV, remote));
    },
  };

  function loadSettings() {
    const s = store.get('settings', {}) || {};
    return {
      places: Array.isArray(s.places) ? s.places.filter((p) => p && p.id && isFinite(p.lat) && isFinite(p.lon)) : [],
      defaultFrom: s.defaultFrom || '',
      direction: s.direction === 'from' ? 'from' : 'to',
      transit: s.transit === true,
      chip: s.chip !== false,
      services: s.services && typeof s.services === 'object' ? s.services : {},
    };
  }
  const saveSettings = (s) => store.set('settings', s);
  const service = (k) => clean(loadSettings().services[k]) || SERVICES[k];

  // Calls to the map services. Sent by Tampermonkey with no cookies, naming this script
  // (as the services ask), and never with the HubSpot page address.
  // A failed call says why in e.kind (and e.status, e.body for an HTTP error), for whyFailed below.
  function getJson(url, timeout = 15000) {
    const fail = (kind, message, more) => Object.assign(new Error(message), { kind }, more);
    const read = (status, text) => {
      let data;
      try { data = JSON.parse(text); } catch (e) { /* not JSON */ }
      if (!status) throw fail('network', 'No reply');
      if (status < 200 || status >= 300) throw fail('http', 'HTTP ' + status, { status, body: data });
      if (data === undefined) throw fail('garbled', 'Unreadable reply');
      return data;
    };
    if (typeof GM_xmlhttpRequest !== 'function') {
      return fetch(url, { credentials: 'omit', referrerPolicy: 'origin' })
        .catch((e) => { throw fail('network', 'Network error: ' + e.message); })
        .then((r) => r.text().then((text) => read(r.status, text)));
    }
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET', url, timeout, anonymous: true,
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT, Referer: REPO },
        onload: (r) => {
          try { resolve(read(r.status, r.responseText)); } catch (e) { reject(e); }
        },
        onerror: (r) => {
          const detail = clean(r && (r.error || r.statusText));
          // Tampermonkey's own refusals read "Refused to connect to …" (a blocked domain, or one not in @connect)
          const kind = /refused to connect|@connect|blacklist|blocklist/i.test(detail) ? 'refused' : 'network';
          reject(fail(kind, 'Network error' + (detail ? ': ' + detail : '')));
        },
        ontimeout: () => reject(fail('timeout', 'Timed out')),
      });
    });
  }

  // What went wrong with a map service, in words people can act on. The HTTP code is kept
  // so it can be passed on; the browser console has the rest.
  const SERVICE_NAMES = { geocode: 'the address lookup', drive: 'the driving route service', transit: 'the public transport service' };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function whyFailed(e, k) {
    const name = SERVICE_NAMES[k];
    let host = '';
    try { host = new URL(service(k)).host; } catch (x) { /* a mistyped address in settings > Advanced */ }
    const who = host ? `${name} (${host})` : name;
    const { kind, status, body } = e || {};
    let why;
    if (kind === 'noroute' || /^No(Route|Segment)$/.test(body && body.code)) {
      why = 'There\'s no road route between these places on the map.';
    } else if (kind === 'refused') {
      why = `Tampermonkey is blocking ${host || name} for this script. In the Tampermonkey dashboard, open HubSpot: Quick actions, ` +
        'then its Settings tab, and allow that domain.';
    } else if (kind === 'network') {
      why = navigator.onLine === false ? 'You look to be offline. Check your connection, then try again.'
        : `Couldn't reach ${who} from this computer. A VPN, network filter or venue Wi-Fi may be blocking it. Try another network.`;
    } else if (kind === 'timeout') {
      why = `${cap(name)} took too long to answer. Try again in a minute.`;
    } else if (kind === 'garbled') {
      why = `${cap(name)} sent back a web page instead of an answer, so a Wi-Fi sign-in page or network filter is probably in the way. ` +
        'Open any website to check.';
    } else if (status === 403 || status === 429) {
      why = `${cap(who)} is refusing your network for now (HTTP ${status}), usually because a shared office or VPN connection is busy. ` +
        'It normally clears within the hour, or try with the VPN off or on another network.';
    } else if (status >= 500) {
      why = `${cap(name)} is having problems at its end (HTTP ${status}). Try again in a few minutes.`;
    } else if (status) {
      why = `${cap(name)} turned the request down (HTTP ${status}). If it keeps happening, pass this message on.`;
    } else {
      why = `${cap(name)} didn't answer. Try again in a minute.`;
    }
    return why + (clean(loadSettings().services[k]) ? ' You\'ve set your own address for it in settings > Advanced.' : '');
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
  const TYPE_NAMES = { '0-1': 'Contact', '0-2': 'Company', '0-3': 'Deal', '0-5': 'Ticket' };
  function getRecord() {
    let m = location.pathname.match(/^\/contacts\/(\d+)\/(?:record\/(0-[1235])|(contact|company|deal|ticket))\/(\d+)/);
    if (m) return { portal: m[1], type: m[2] || TYPE_IDS[m[3]], id: m[4], helpDesk: false };
    m = location.pathname.match(/^\/help-desk\/(\d+)\/(?:.*\/)?ticket\/(\d+)/);
    if (m) return { portal: m[1], type: '0-5', id: m[2], helpDesk: true };
    return null;
  }
  const recordKey = (r) => (r ? `${r.type}/${r.id}` : '');
  const recordUrl = (r) => `${location.origin}/contacts/${r.portal}/record/${r.type}/${r.id}`;
  function recordTitle() {
    const el = document.querySelector('[data-selenium-test="highlightTitle"]');
    return clean(el ? el.innerText : document.title.replace(/\s*\|\s*HubSpot.*$/i, ''));
  }

  /* ---------------- Open records in other tabs ---------------- */
  // Each tab notes which record it is showing (nothing is fetched), so a trip can offer them as stops.
  // Every tab writes only its own entry. Chrome slows tabs left in the background to about once a
  // minute, so an entry counts as open for 3 minutes; closing a tab removes its entry straight away.
  const TAB_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const TAB_KEY = 'tab:' + TAB_ID;
  const TAB_TTL = 3 * 60 * 1000;
  let tabNote = { key: '', title: '', at: 0 };
  const tabKeys = () => store.keys().filter((k) => k.startsWith('tab:'));

  function noteThisTab(rec) {
    const key = recordKey(rec), title = rec ? recordTitle() : '';
    if (key === tabNote.key && title === tabNote.title && Date.now() - tabNote.at < 20000) return;
    tabNote = { key, title, at: Date.now() };
    if (rec) store.set(TAB_KEY, { portal: rec.portal, type: rec.type, id: rec.id, title, at: tabNote.at });
    else store.remove(TAB_KEY);
    tabKeys().forEach((k) => {
      const t = store.get(k, null);
      if (k !== TAB_KEY && (!t || Date.now() - t.at > TAB_TTL)) store.remove(k);
    });
    // Only a nudge for the other tabs' trip view; the entries themselves live under tab:…
    store.set('tabs', Date.now());
  }
  function forgetThisTab() {
    store.remove(TAB_KEY);
    store.set('tabs', Date.now());
  }
  function openRecords() {
    const seen = new Set(), out = [];
    tabKeys().map((k) => store.get(k, null)).forEach((t) => {
      if (!t || Date.now() - t.at > TAB_TTL) return;
      const key = `${t.type}/${t.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ ...t, key });
    });
    return out;
  }

  /* ---------------- Where the bar sits ---------------- */
  // Drag the dots at the bar's left end to move it. The spot is kept as a distance from the nearest
  // corner, so it stays in that corner when the window changes size, and every HubSpot tab uses it.
  // The panel opens towards the middle of the screen, and the drive time sits on the other side of the bar.
  const EDGE = 8, CHIP_H = 24, CHIP_GAP = 6, CHIP_ROOM = CHIP_H + CHIP_GAP, PANEL_GAP = 12;
  const DEFAULT_SPOT = { h: 'right', x: 24, v: 'bottom', y: 90 };
  function savedSpot() {
    const s = store.get('barSpot', null);
    return s && (s.h === 'left' || s.h === 'right') && (s.v === 'top' || s.v === 'bottom') &&
      isFinite(s.x) && isFinite(s.y) ? s : null;
  }
  const viewport = () => ({ vw: document.documentElement.clientWidth, vh: document.documentElement.clientHeight });

  // The spot for the bar with its top-left corner here, measured from the nearest corner
  function spotAt(left, top, bar) {
    const { vw, vh } = viewport(), w = bar.offsetWidth, h = bar.offsetHeight;
    const hs = left + w / 2 > vw / 2 ? 'right' : 'left', vs = top + h / 2 > vh / 2 ? 'bottom' : 'top';
    return { h: hs, x: hs === 'right' ? vw - left - w : left, v: vs, y: vs === 'bottom' ? vh - top - h : top };
  }

  // Puts the bar at a spot (or the saved one), kept on screen, with the drive time and panel beside it.
  // Returns where it ended up, or null while the bar is hidden.
  function placeBar(spot) {
    const bar = document.getElementById('oqa-bar');
    if (!bar || bar.style.display === 'none') return null;
    const s = spot || savedSpot() || DEFAULT_SPOT;
    const { vw, vh } = viewport(), w = bar.offsetWidth, h = bar.offsetHeight;
    const within = (n, lo, hi) => Math.max(lo, Math.min(n, hi));
    const px = (n) => Math.round(n) + 'px';
    const left = within(s.h === 'right' ? vw - s.x - w : s.x, EDGE, vw - EDGE - w);
    // The panel opens on whichever side of the bar has more room, judged from where the bar ends up
    // on this screen (a spot saved on a bigger one can land in the other half)
    const want = s.v === 'bottom' ? vh - s.y - h : s.y;
    const up = within(want, 0, vh - h) + h / 2 > vh / 2;
    const top = within(want, EDGE + (up ? 0 : CHIP_ROOM), vh - EDGE - h - (up ? CHIP_ROOM : 0));
    const right = vw - left - w, bottom = vh - top - h;

    // Held from its own corner, so tucking the bar away shrinks it towards that corner.
    // The drive time and panel line up with the same edges.
    Object.assign(bar.style,
      s.h === 'right' ? { left: 'auto', right: px(right) } : { left: px(left), right: 'auto' },
      s.v === 'bottom' ? { top: 'auto', bottom: px(bottom) } : { top: px(top), bottom: 'auto' });

    const chip = document.getElementById('oqa-chip');
    if (chip) {
      const chipTop = up ? top + h + CHIP_GAP : top - CHIP_ROOM;
      Object.assign(chip.style,
        s.h === 'right' ? { left: 'auto', right: px(right), maxWidth: px(left + w - 24) } : { left: px(left), right: 'auto', maxWidth: px(vw - left - 24) },
        s.v === 'bottom' ? { top: 'auto', bottom: px(vh - chipTop - CHIP_H) } : { top: px(chipTop), bottom: 'auto' });
    }

    const p = panel.el;
    if (p) {
      const pw = p.offsetWidth;
      const pl = within(s.h === 'right' ? left + w - pw : left, EDGE, vw - EDGE - pw);
      Object.assign(p.style,
        s.h === 'right' ? { left: 'auto', right: px(vw - pl - pw) } : { left: px(pl), right: 'auto' },
        up
          ? { top: 'auto', bottom: px(bottom + h + PANEL_GAP), maxHeight: px(Math.max(0, top - PANEL_GAP - 24)) }
          : { top: px(top + h + PANEL_GAP), bottom: 'auto', maxHeight: px(Math.max(0, vh - top - h - PANEL_GAP - 24)) });
    }
    return { h: s.h, x: s.h === 'right' ? right : left, v: s.v, y: s.v === 'bottom' ? bottom : top };
  }

  /* ---------------- Toolbar ---------------- */
  const MODES = {
    drive: { icon: 'car', title: 'Drive time to the customer', heading: 'Drive' },
    transit: { icon: 'train', title: 'Public transport to the customer', heading: 'Public transport' },
    trip: { icon: 'route', title: 'Trip with several stops', heading: 'Trip' },
  };

  function toolbar() {
    injectBrand();

    const bar = document.createElement('div');
    bar.id = 'oqa-bar';
    bar.className = 'tm-oolio';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Oolio quick actions');
    bar.innerHTML =
      `<button type="button" class="oqa-grip" data-act="move" title="Drag to move. Double-click to put it back." ` +
      `aria-label="Move these buttons with the arrow keys" aria-roledescription="drag handle">${ICON.grip}</button>` +
      `<button type="button" class="oqa-markbtn" data-act="collapse" aria-expanded="true" title="Hide these buttons" aria-label="Hide Oolio quick actions">${OOLIO_MARK_WHITE}</button>` +
      '<span class="oqa-sep"></span>' +
      `<button type="button" data-act="meeting" title="Book a meeting" aria-label="Book a meeting">${ICON.calendarPlus}</button>` +
      `<button type="button" data-act="task" title="Create a task" aria-label="Create a task">${ICON.task}</button>` +
      Object.entries(MODES).map(([mode, m]) =>
        `<button type="button" data-mode="${mode}" title="${m.title}" aria-label="${m.title}" aria-pressed="false">${ICON[m.icon]}` +
        (mode === 'trip' ? '<span class="oqa-badge" aria-hidden="true"></span>' : '') + '</button>').join('');
    document.body.appendChild(bar);

    bar.querySelector('[data-act="meeting"]').addEventListener('click', () => {
      const rec = getRecord();
      if (!rec) return;
      if (rec.helpDesk) meetingModal(rec);
      else meetingOnRecord();
    });
    bar.querySelector('[data-act="task"]').addEventListener('click', () => {
      const rec = getRecord();
      if (!rec) return;
      if (rec.helpDesk) taskInHelpDesk(rec);
      else taskOnRecord(rec);
    });
    bar.querySelectorAll('[data-mode]').forEach((btn) => btn.addEventListener('click', () => openPanel(btn.dataset.mode)));

    // The logo tucks the bar away to just itself and the dots (remembered), for when it sits over something
    const markBtn = bar.querySelector('[data-act="collapse"]');
    let tucked = false;
    const chip = document.createElement('button');
    chip.id = 'oqa-chip';
    chip.type = 'button';
    chip.className = 'tm-oolio';
    chip.title = 'Drive time from the nearest Oolio office. Click for directions.';
    chip.addEventListener('click', () => openPanel('drive'));
    document.body.appendChild(chip);
    const setCollapsed = () => {
      const c = store.get('barCollapsed', false) === true || tucked;
      bar.classList.toggle('oqa-collapsed', c);
      chipState.hidden = c;
      paintChip(chip);
      markBtn.setAttribute('aria-expanded', String(!c));
      markBtn.title = c ? 'Show Oolio quick actions' : 'Hide these buttons';
      markBtn.setAttribute('aria-label', c ? 'Show Oolio quick actions' : 'Hide Oolio quick actions');
      placeBar();
    };
    markBtn.addEventListener('click', () => {
      const c = !bar.classList.contains('oqa-collapsed');
      tucked = false;
      store.set('barCollapsed', c);
      if (c) closePanel();
      setCollapsed();
    });
    setCollapsed();

    // The dots move the bar: drag them, or focus them and use the arrow keys. Double-click puts it back.
    const grip = bar.querySelector('[data-act="move"]');
    let drag = null, droppedAt = 0;
    grip.addEventListener('pointerdown', (e) => {
      // Ctrl + click on a Mac opens the context menu, which swallows the release
      if (e.button !== 0 || e.ctrlKey) return;
      e.preventDefault();
      const r = bar.getBoundingClientRect();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, left: r.left, top: r.top, spot: null };
      try { grip.setPointerCapture(e.pointerId); } catch (x) { /* the pointer has already gone */ }
      bar.classList.add('oqa-dragging');
      document.documentElement.classList.add('oqa-moving');
    });
    grip.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      // A wobble while clicking isn't a move
      if (!drag.spot && Math.abs(dx) + Math.abs(dy) < 4) return;
      drag.spot = placeBar(spotAt(drag.left + dx, drag.top + dy, bar)) || drag.spot;
    });
    const endDrag = (keep) => {
      if (!drag) return;
      if (drag.spot && keep) { store.set('barSpot', drag.spot); droppedAt = Date.now(); }
      // A plain click focuses the dots, ready for the arrow keys. A drag leaves focus where it was.
      else if (keep) grip.focus({ preventScroll: true });
      drag = null;
      bar.classList.remove('oqa-dragging');
      document.documentElement.classList.remove('oqa-moving');
      if (!keep) placeBar();
    };
    const drop = (e, keep) => { if (drag && e.pointerId === drag.id) endDrag(keep); };
    grip.addEventListener('pointerup', (e) => drop(e, true));
    grip.addEventListener('lostpointercapture', (e) => drop(e, true));
    grip.addEventListener('pointercancel', (e) => drop(e, false));
    grip.addEventListener('contextmenu', () => endDrag(false));
    grip.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 50 : 10;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d || drag || e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();
      const r = bar.getBoundingClientRect();
      const spot = placeBar(spotAt(r.left + d[0], r.top + d[1], bar));
      if (spot) store.set('barSpot', spot);
    });
    grip.addEventListener('dblclick', () => {
      // Two quick drags in a row aren't a double-click
      if (Date.now() - droppedAt < 800) return;
      store.remove('barSpot');
      placeBar();
    });
    // Another tab moved it, or the window changed size
    store.watch('barSpot', () => { if (!drag) placeBar(); });
    let placing = false;
    window.addEventListener('resize', () => {
      if (placing) return;
      placing = true;
      requestAnimationFrame(() => { placing = false; if (!drag) placeBar(); });
    });

    // HubSpot is a single-page app, so re-check the URL every second
    let lastKey = recordKey(getRecord());
    const badge = bar.querySelector('.oqa-badge');
    const setBadge = () => { const n = tripStops().length; badge.textContent = n ? String(n) : ''; };
    const sync = () => {
      const rec = getRecord();
      const display = rec ? 'inline-flex' : 'none';
      if (bar.style.display !== display) {
        bar.style.display = display;
        placeBar();
      }
      const key = recordKey(rec);
      if (key !== lastKey) {
        lastKey = key;
        // The trip isn't tied to one record, so it stays open (with a fresh lookup context for the new record).
        // A panel already opened for the new record (a quick click after moving) is left alone.
        if (!panel.el || recordKey(panel.rec) === key) { /* nothing to do */ }
        else if (!rec || panel.mode !== 'trip') closePanel();
        else {
          Object.assign(panel, { rec, linked: null, companies: new Map(), picked: '', customer: null, dest: null });
          if (panel.el.dataset.view === 'trip') showTrip();
        }
      }
      bar.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(!!panel.el && panel.mode === b.dataset.mode)));
      setBadge();
      noteThisTab(rec);
      chipFor(rec, chip);
    };
    setInterval(sync, 1000);
    sync();
    window.addEventListener('pagehide', forgetThisTab);
    // Another tab changed the trip, or opened or closed a record: refresh the trip view if it's showing
    const tripShowing = () => panel.el && panel.el.dataset.view === 'trip';
    const busy = () => {
      const a = document.activeElement;
      return panel.ordering || (!!a && panel.el.contains(a) && a.matches('input[type="text"], select'));
    };
    store.watch('trip', (v, remote) => {
      setBadge();
      if (!remote || !panel.el) return;
      if (tripShowing()) { if (!busy()) showTrip(); }
      else if (panel.el.dataset.view === 'route' && panel.customer && panel.dest) tripButton(body().querySelector('.oqa-actions'), panel.customer, panel.dest);
    });
    store.watch('tabs', () => { if (tripShowing() && !busy() && suggestionKey() !== panel.suggestKey) showTrip(); });
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
    if (!force && meetingOpen && !confirm('Close without saving? Anything you have entered will be lost.')) return;
    overlay.remove();
    overlay = null;
    meetingOpen = false;
    document.removeEventListener('keydown', onMeetingEsc);
  }
  function onMeetingEsc(e) { if (e.key === 'Escape' && !e.defaultPrevented) closeMeeting(); }

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

  /* ---------------- Task ---------------- */

  // HubSpot's own Task button, in the row with Note, Email, Call and Meeting
  function findTaskButton(doc) {
    const direct = doc.querySelector('[data-selenium-test="create-engagement-task-button"]');
    if (direct) return direct;
    const meet = doc.querySelector('[data-selenium-test="create-engagement-schedule-button"]');
    let row = meet && meet.parentElement;
    for (let i = 0; row && i < 5; i++, row = row.parentElement) {
      const hit = [...row.querySelectorAll('button, [role="button"]')].find((b) => b !== meet && !b.closest('.tm-oolio') &&
        /^(create )?task$/i.test(clean(b.getAttribute('aria-label') || b.innerText || '')));
      if (hit) return hit;
    }
    return null;
  }

  // The task window's title box ("Enter your task")
  const findTaskTitle = (doc) => doc.querySelector('input[placeholder="Enter your task" i], textarea[placeholder="Enter your task" i]');

  function setReactValue(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Fill an empty task title once, then leave the cursor at the end (name can be a promise)
  async function prefillTask(doc, name) {
    try { name = await name; } catch (e) { name = ''; }
    let tries = 0;
    const timer = setInterval(() => {
      const input = findTaskTitle(doc);
      if (!input && ++tries < 40) return;
      clearInterval(timer);
      if (!input || input.dataset.oqaDone || input.value.trim()) return;
      input.dataset.oqaDone = '1';
      const title = name ? TASK_TITLE_FORMAT({ name }) : '';
      if (!title) return;
      setReactValue(input, title);
      input.focus();
      try { input.setSelectionRange(title.length, title.length); } catch (e) { /* not a text box */ }
    }, 250);
  }

  // Record pages: press HubSpot's Task button. If it can't be found, HubSpot opens the task
  // window from the address too (?interaction=task), so reload with that instead.
  let taskBusy = false;
  function taskOnRecord(rec) {
    if (taskBusy) return;
    taskBusy = true;
    closePanel();
    const name = recordTitle();
    let tries = 0;
    const timer = setInterval(() => {
      const btn = findTaskButton(document);
      if (btn) {
        clearInterval(timer);
        taskBusy = false;
        btn.click();
        prefillTask(document, name);
      } else if (++tries > 12) {
        clearInterval(timer);
        taskBusy = false;
        try { sessionStorage.setItem('oolio-qa:task', recordKey(rec)); } catch (e) { /* ignore */ }
        const u = new URL(location.href);
        u.searchParams.set('interaction', 'task');
        location.assign(u.toString());
      }
    }, 250);
  }

  // After that reload: fill the title, once
  function prefillAfterReload() {
    let want = '';
    try { want = sessionStorage.getItem('oolio-qa:task') || ''; sessionStorage.removeItem('oolio-qa:task'); } catch (e) { /* ignore */ }
    if (want && want === recordKey(getRecord()) && /[?&]interaction=task\b/.test(location.search)) {
      setTimeout(() => prefillTask(document, recordTitle()), 1500);
    }
  }

  // Help Desk: press "Create task" in its own Tasks card, so HubSpot's task window opens right there.
  // The title comes from the ticket's name in HubSpot, as the Help Desk header shortens it.
  // Whatever you click for an element whose own text is exactly this (a link, a button, or the text itself)
  function clickableByText(rx) {
    const leaf = [...document.querySelectorAll('body *')].find((el) => !el.closest('.tm-oolio') &&
      ![...el.children].some((c) => rx.test(clean(c.textContent))) && rx.test(clean(el.textContent)));
    return leaf ? leaf.closest('button, a, [role="button"]') || leaf : null;
  }
  async function taskInHelpDesk(rec) {
    closePanel();
    let link = clickableByText(/^create task$/i);
    if (!link) {
      // The Tasks card may be collapsed: open it and look again
      const card = clickableByText(/^tasks \(\d+\)$/i);
      if (card) {
        card.click();
        for (let i = 0; i < 8 && !link; i++) { await sleep(250); link = clickableByText(/^create task$/i); }
      }
    }
    if (!link) {
      log('Help Desk: no "Create task" in the Tasks card, so opening the ticket in a pop-up instead');
      return recordModal(rec, 'task');
    }
    link.scrollIntoView({ block: 'nearest' });
    link.click();
    const name = hubspot(`crm/v3/objects/tickets/${rec.id}?properties=subject`, rec.portal)
      .then((d) => clean(d.properties && d.properties.subject))
      .catch(() => recordTitle().split(' | ')[0]);
    prefillTask(document, name);
  }

  // Fallback when Help Desk has no Tasks card: open the ticket record in a pop-up, straight into its task window
  function recordModal(t, kind) {
    if (overlay) return;
    closePanel();
    overlay = document.createElement('div');
    overlay.id = 'oqa-overlay';
    overlay.className = 'tm-oolio';
    overlay.innerHTML =
      '<div id="oqa-card">' + OOLIO_MARK +
      '<p class="oqa-title">Opening the task</p>' +
      '<p class="oqa-msg">Hang tight, this takes a few seconds.</p>' +
      '<div class="oqa-bar"><i></i></div></div>' +
      '<button id="oqa-close" type="button" title="Close (Esc)" aria-label="Close">' + ICON.x + '</button>';
    const frame = document.createElement('iframe');
    frame.src = `/contacts/${t.portal}/record/0-5/${t.id}?interaction=${kind}`;
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

    // Wait for the task window (pressing Task if the address didn't open it), then close once it's gone
    let seen = false, pressed = false, tries = 0;
    const timer = setInterval(() => {
      if (!overlay) return clearInterval(timer);
      tries++;
      let d;
      try { d = frame.contentDocument; } catch (e) { return; }
      if (!d || !d.body) return;
      const input = findTaskTitle(d);
      if (input && !seen) {
        seen = true;
        meetingOpen = true;
        frame.style.opacity = '1';
        card.style.display = 'none';
        const titleEl = d.querySelector('[data-selenium-test="highlightTitle"]');
        prefillTask(d, clean(titleEl ? titleEl.innerText : ''));
      }
      if (!seen && !pressed && tries > 16) {
        const btn = findTaskButton(d);
        if (btn) { pressed = true; btn.click(); }
      }
      if (!seen && tries > 60) {
        clearInterval(timer);
        showError('The task window didn\'t open. Press Esc or × to close.');
      }
      if (seen && !input) {
        clearInterval(timer);
        meetingOpen = false;
        setTimeout(() => closeMeeting(true), 800);
      }
    }, 500);
  }

  /* ---------------- Esc closes HubSpot's Schedule and Task windows ---------------- */
  // It presses HubSpot's own Cancel or close button, so anything HubSpot asks before discarding still
  // applies. An open drop-down (task type, priority and so on) closes first, as usual.
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const buttonLabel = (b) => clean(b.getAttribute('aria-label') || b.innerText || b.getAttribute('title') || '');
  const isClose = (b) => /^close\b/i.test(buttonLabel(b)) || b.matches('[data-selenium-test*="close" i], [data-test-id*="close" i]');

  function scheduleCancel(doc) {
    const go = [...doc.querySelectorAll('button')].find((b) => /^schedule meeting$/i.test(buttonLabel(b)) && visible(b));
    for (let box = go && go.parentElement, i = 0; box && i < 5; i++, box = box.parentElement) {
      const c = [...box.querySelectorAll('button')].find((b) => /^cancel$/i.test(buttonLabel(b)) && visible(b));
      if (c) return c;
    }
    return null;
  }
  // The task window that holds the "Enter your task" box (the largest box around it that's still just the window)
  function taskWindow(doc) {
    const input = findTaskTitle(doc);
    let win = null;
    for (let box = input && input.parentElement, i = 0; box && box !== doc.body && i < 14; i++, box = box.parentElement) {
      if (box.querySelector('[data-selenium-test="highlightTitle"]')) break; // gone past the task window
      win = box;
    }
    return win;
  }
  function taskClose(doc) {
    const win = taskWindow(doc);
    if (!win) return null;
    const buttons = [...win.querySelectorAll('button, [role="button"]')].filter((b) => visible(b) && !b.closest('.tm-oolio'));
    // 1. A button that says it closes
    const labelled = buttons.find(isClose);
    if (labelled) return labelled;
    // 2. The last button in the row with the "Task" heading (collapse, then close)
    const heading = [...win.querySelectorAll('*')].find((el) => el.children.length === 0 && clean(el.textContent) === 'Task' && visible(el));
    for (let row = heading && heading.parentElement, i = 0; row && row !== win && i < 4; i++, row = row.parentElement) {
      const inRow = buttons.filter((b) => row.contains(b) && !clean(b.innerText));
      if (inRow.length) return inRow[inRow.length - 1];
    }
    log('Esc: found the task window but not its close button. Buttons seen:',
      buttons.map((b) => ({ label: buttonLabel(b), test: b.getAttribute('data-selenium-test') || b.getAttribute('data-test-id') || '' })));
    return null;
  }
  // The scheduler lives in its own frame: look inside it from the record page, and at its frame's close button from inside
  function schedulerFrameCancel(doc) {
    const f = [...doc.querySelectorAll('iframe')].find((x) => /expanded-scheduler|calendar-select-iframe/.test(x.src) && visible(x));
    try { return f && f.contentDocument ? scheduleCancel(f.contentDocument) : null; } catch (e) { return null; }
  }
  function frameCloseInParent() {
    try {
      const host = [...window.parent.document.querySelectorAll('iframe')].find((x) => x.contentWindow === window);
      for (let box = host && host.parentElement, i = 0; box && i < 8; i++, box = box.parentElement) {
        const c = [...box.querySelectorAll('button')].find((b) => isClose(b) && visible(b));
        if (c) return c;
      }
    } catch (e) { /* not reachable */ }
    return null;
  }

  function onEscape(e) {
    if (e.key !== 'Escape' || e.defaultPrevented || e.repeat || e.isComposing) return;
    const doc = document;
    // Our own panel has its own Esc handling
    if (panel.el && (panel.el.contains(doc.activeElement) || doc.activeElement === doc.body)) return;
    // An open drop-down closes first
    if ([...doc.querySelectorAll('[role="listbox"], [role="menu"]')].some(visible)) return;
    const win = taskWindow(doc);
    if (win && win.querySelector('[aria-expanded="true"]')) return;
    const btn = scheduleCancel(doc) || taskClose(doc) || schedulerFrameCancel(doc) ||
      (window.top !== window && location.pathname.startsWith('/calendar-select-iframe/') ? frameCloseInParent() : null);
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    btn.click();
  }

  /* ---------------- Drive time from the nearest office, next to the bar ---------------- */
  // Shown on each record you stay on for a moment. Results are kept for a week per record, so a record
  // you've seen costs nothing, and nothing is asked for while you flick between records.
  const CHIP_WAIT = 1500, CHIP_DAYS = 7;
  const chipState = { key: '', text: '', hidden: false, timer: 0 };

  function paintChip(chip) {
    const show = !!chipState.text && !chipState.hidden && loadSettings().chip;
    chip.style.display = show ? 'inline-flex' : 'none';
  }
  function setChip(chip, key, text) {
    if (key !== chipState.key) return;
    chipState.text = text;
    chip.innerHTML = text ? ICON.car + text : '';
    chip.setAttribute('aria-label', text ? clean(text.replace(/<[^>]+>/g, ' ')) + '. Open directions.' : '');
    paintChip(chip);
  }

  function chipFor(rec, chip) {
    const key = recordKey(rec);
    if (key === chipState.key) return;
    chipState.key = key;
    clearTimeout(chipState.timer);
    setChip(chip, key, '');
    if (!rec || !loadSettings().chip) return;
    const cached = (store.get('chips', {}) || {})[key];
    if (cached && Date.now() - cached.at < CHIP_DAYS * 864e5) return setChip(chip, key, cached.text);
    chipState.timer = setTimeout(async () => {
      if (chipState.key !== key) return;
      let text = '';
      try {
        const c = await getCustomer(rec, { rec, linked: null, companies: new Map() });
        if (c.error || (!addressLine(c) && c.lat == null)) return;
        const dest = await pointFor(c);
        if (!dest || chipState.key !== key) return;
        const o = nearestOffice(dest);
        const r = await driveRoute([o, dest]);
        text = `<b>${dest.approx ? 'About ' : ''}${fmtDuration(r.seconds)}</b><span>from the ${esc(o.label)}</span>`;
        const all = store.get('chips', {}) || {};
        const keys = Object.keys(all);
        if (keys.length >= 300) keys.slice(0, keys.length - 299).forEach((k) => delete all[k]);
        all[key] = { text, at: Date.now() };
        store.set('chips', all);
      } catch (e) {
        log('drive time next to the bar failed:', e.message);
      }
      setChip(chip, key, text);
    }, CHIP_WAIT);
  }

  /* ---------------- The customer's company and address, from HubSpot ---------------- */
  // There's no public way to read this without an API key, so this asks HubSpot the same way
  // its own pages do, with your login. If one way stops working it tries the next, and the
  // browser console shows which one answered. Calls only happen when you click.

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

  // "1 Spender Lane, Kings Beach, Kings Beach, QLD, 4551, Australia" style strings: drop blanks and repeats
  function tidyAddress(s) {
    const out = [];
    String(s || '').split(',').map(clean).forEach((part) => {
      if (part && (!out.length || out[out.length - 1].toLowerCase() !== part.toLowerCase())) out.push(part);
    });
    return out.join(', ');
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
      // Only the record on screen has its sidebar to read
      ['page', async () => (recordKey(getRecord()) === recordKey(rec) ? companiesOnPage() : null)],
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

  // Each company is read once per lookup context (the open panel, or one trip stop), however often it's shown
  function companyOnce(ctx, portal, id) {
    if (!ctx.companies.has(id)) {
      const p = readCompany(portal, id);
      ctx.companies.set(id, p);
      p.catch(() => ctx.companies.delete(id));
    }
    return ctx.companies.get(id);
  }

  // The customer for a record. Always comes back usable, even when HubSpot doesn't answer:
  // { key, name, parts | text | override, lat, lon, count, isPrimary, error? }
  async function getCustomer(rec, ctx, pickedId) {
    const recKey = 'rec:' + recordKey(rec);
    let linked = ctx.linked;
    if (!linked) {
      linked = await linkedCompanies(rec);
      // A slow answer for an earlier panel mustn't land in this one
      if (ctx.rec === rec && linked.via !== 'none') ctx.linked = linked;
    }
    const id = pickedId || linked.primary || linked.all[0];
    const base = { count: linked.all.length, isPrimary: !!id && id === linked.primary, via: linked.via };
    let c;

    if (!id) {
      c = linked.mirror
        ? { ...base, key: recKey, name: linked.mirror.name || 'Customer', text: linked.mirror.text }
        : { ...base, key: recKey, name: 'No company', error: linked.via === 'none'
          ? 'Couldn\'t read the linked company from HubSpot.'
          : 'No company is linked to this record.' };
    } else {
      try {
        c = { ...base, ...(await companyOnce(ctx, rec.portal, id)), key: 'co:' + id };
        c.via = base.via + ' / ' + c.via;
      } catch (e) {
        c = linked.mirror && id === linked.primary
          ? { ...base, id, key: 'co:' + id, name: linked.mirror.name || 'Customer', text: linked.mirror.text }
          : { ...base, id, key: 'co:' + id, name: 'Customer', error: 'Couldn\'t read the company from HubSpot (' + e.message + ').' };
      }
    }
    // A typed-in address wins over HubSpot's
    const o = store.get('overrides', {}) || {};
    if (o[c.key]) Object.assign(c, { override: o[c.key], error: null, lat: null, lon: null });
    return c;
  }

  // Names and suburbs of every linked company, for the "pick another company" list
  async function companyChoices(rec, ctx) {
    const linked = ctx.linked;
    const ids = linked.all.slice(0, 15);
    const out = [];
    for (let i = 0; i < ids.length; i += 3) {
      const batch = await Promise.all(ids.slice(i, i + 3).map((id) =>
        companyOnce(ctx, rec.portal, id).then((c) => c, () => ({ id, name: 'Company ' + id, parts: {} }))));
      out.push(...batch);
    }
    out.sort((a, b) => (b.id === linked.primary) - (a.id === linked.primary));
    return { list: out, more: linked.all.length - ids.length };
  }

  function addressLine(c) {
    if (c.override) return c.override;
    if (c.text) return c.text;
    const p = c.parts || {};
    const country = clean(p.country);
    return [p.street, p.street2, [p.city, p.state, p.zip].filter(Boolean).join(' '),
      /^(australia|au)$/i.test(country) ? '' : country].map(clean).filter(Boolean).join(', ');
  }

  // What Google Maps gets: the address text (it finds the venue better than a pin), with the country if missing
  function addressQuery(c, point) {
    const line = addressLine(c);
    // A Google Maps link or bare coordinates (typed via Edit address) go to Google as the map point
    const pinOnly = !line || /^https?:\/\//i.test(line) || (parseCoords(line) && line.replace(/[@\d.,\s-]/g, '').length < 3);
    if (pinOnly) return point && point.lat != null ? pt(point) : line;
    return line + (/\b(australia|new zealand|united kingdom|united states)\b/i.test(line) ? '' : ', Australia');
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

  // "Shop 3/123 Smith St", "Level 2, 45 King St" and "Shops 3-4, 1 Smith St" confuse the geocoder;
  // keep the street number and name. A unit word only counts with a number (or one letter) after it,
  // so "Bay Road" and "Level Crossing Road" are left alone.
  function streetOnly(street) {
    let s = clean(street), prev;
    do {
      prev = s;
      s = s.replace(/^(?:shops?|units?|suites?|ste|levels?|lvl|tenanc(?:y|ies)|kiosks?|lots?|bays?|building|bldg|floor|office)(?:\.?\s*[a-z]{0,2}\d[\w.-]*(?:\s*(?:&|and)\s*[a-z]{0,2}\d[\w.-]*)?|(?:\.\s*|\s+)[a-z](?![a-z]))\s*[,/]?\s*/i, '');
      s = s.replace(/^(?:ground|first|second|third|upper|lower)\s+(?:floor|level)\s*,?\s*/i, '');
      s = s.replace(/^[a-z]{0,2}\d+[a-z]?\s*\/\s*(?=\d)/i, '');
    } while (s !== prev);
    return s;
  }

  // "-31.95, 115.86", or a Google Maps link: the place pin (!3d…!4d…) beats the map centre (@…)
  function parseCoords(text) {
    const t = String(text);
    const m = t.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/) || t.match(/(?:^|[^\d.])@?(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
    if (!m) return null;
    const lat = +m[1], lon = +m[2];
    return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon, display: `${lat.toFixed(5)}, ${lon.toFixed(5)}` } : null;
  }

  const COUNTRY_CODES = { australia: 'au', au: 'au', 'new zealand': 'nz', nz: 'nz', 'united kingdom': 'gb', uk: 'gb', 'united states': 'us', usa: 'us' };
  const MISS_DAYS = 3;

  // { lat, lon, display, approx } or null for "not found". Throws if the service can't be reached.
  // Answers (and misses, for a few days) are kept, so each address is only looked up once.
  async function geocode(a) {
    const raw = clean(a.text);
    const isLink = /^https?:\/\//i.test(raw);
    if (raw) {
      const coords = parseCoords(raw);
      if (coords && (isLink || raw.replace(/[@\d.,\s-]/g, '').length < 3)) return { ...coords, approx: false };
      if (isLink) return null;
    }

    if (!raw && !clean(a.street) && !clean(a.street2) && !clean(a.city) && !clean(a.zip)) return null;
    const cacheKey = 'v4|' + clean([a.street, a.street2, a.city, a.state, a.zip, a.country, raw].join('|')).toLowerCase();
    const cached = (store.get('geo', {}) || {})[cacheKey];
    if (cached && !cached.miss) return cached;
    if (cached && Date.now() - cached.miss < MISS_DAYS * 864e5) return null;

    const cc = COUNTRY_CODES[clean(a.country).toLowerCase()] || (clean(a.country) ? '' : 'au');
    let hit = null, approx = false;
    if (raw) {
      const tidy = raw.split(',').map(streetOnly).filter(Boolean).join(', ') || raw;
      hit = await nominatim({ q: tidy, countrycodes: 'au,nz' });
      if (!hit && tidy !== raw) hit = await nominatim({ q: raw, countrycodes: 'au,nz' });
      if (!hit) hit = await nominatim({ q: tidy });
    } else {
      // One street line: whichever part has the street number ("570 Bourke St", not "Level 24" or "Westfield Centre")
      const parts = [a.street, a.street2].flatMap((l) => String(l || '').split(',')).map(streetOnly).filter(Boolean);
      const street = parts.find((l) => /^\d/.test(l)) || [a.street, a.street2].map(streetOnly).filter(Boolean)[0] || '';
      if (street) hit = await nominatim({ street, city: a.city, state: a.state, postalcode: a.zip, countrycodes: cc });
      if (!hit && street) hit = await nominatim({ q: [street, a.city, a.state, a.zip].filter(Boolean).join(', '), countrycodes: cc });
      // Last resort: the suburb, so there is at least a rough time
      if (!hit && (a.city || a.zip)) {
        hit = await nominatim({ city: a.city, state: a.state, postalcode: a.zip, countrycodes: cc });
        approx = !!hit;
      }
    }

    // Read the cache again just before writing, in case another lookup saved meanwhile
    const out = hit ? { ...hit, approx } : { miss: Date.now() };
    const fresh = store.get('geo', {}) || {};
    const keys = Object.keys(fresh);
    if (keys.length >= 300) keys.slice(0, keys.length - 299).forEach((k) => delete fresh[k]);
    fresh[cacheKey] = out;
    store.set('geo', fresh);
    return hit ? out : null;
  }

  // Map point for a customer: HubSpot's own lat/long when it has them, otherwise a lookup
  function pointFor(c) {
    if (c.lat != null && isFinite(c.lat) && isFinite(c.lon)) return Promise.resolve({ lat: +c.lat, lon: +c.lon, approx: false, fromHubSpot: true });
    if (c.override || c.text) return geocode({ text: c.override || c.text });
    const p = c.parts || {};
    return geocode({ street: p.street, street2: p.street2, city: p.city, state: p.state, zip: p.zip, country: p.country });
  }

  /* ---------------- Travel times ---------------- */
  const routeCache = new Map();
  const pt = (p) => `${(+p.lat).toFixed(5)},${(+p.lon).toFixed(5)}`;
  const lonlat = (p) => `${(+p.lon).toFixed(5)},${(+p.lat).toFixed(5)}`;

  // Answers are kept for a while, and a request already on its way is shared rather than sent twice
  function remember(key, maxAgeMs, fn) {
    const hit = routeCache.get(key);
    if (hit && Date.now() - hit.at < maxAgeMs) return hit.promise;
    const promise = fn();
    routeCache.set(key, { at: Date.now(), promise });
    promise.catch(() => routeCache.delete(key));
    return promise;
  }

  // Driving through two or more points, in order: FOSSGIS's OSRM server.
  // No live traffic, so it's a guide; Google has the live time.
  function driveRoute(points) {
    const coords = points.map(lonlat).join(';');
    return remember('drive:' + coords, 6 * 3600 * 1000, () => oneAtATime('drive', async () => {
      const d = await getJson(`${service('drive')}/route/v1/driving/${coords}?overview=simplified&geometries=geojson&alternatives=false&steps=false`);
      const r = d && d.code === 'Ok' && d.routes && d.routes[0];
      if (!r) throw Object.assign(new Error((d && d.message) || 'No route'), { body: d });
      return { seconds: r.duration, metres: r.distance, line: r.geometry && r.geometry.coordinates,
        legs: (r.legs || []).map((l) => ({ seconds: l.duration, metres: l.distance })) };
    }));
  }

  // Quickest order for the stops, starting at points[0]. One request for the drive time between every
  // pair (OSRM's table), then every order is checked exactly; with up to 9 stops that's instant.
  // Returns the stops' indexes (1..n) in visiting order.
  function bestOrder(points, roundTrip) {
    const coords = points.map(lonlat).join(';');
    return oneAtATime('drive', async () => {
      const d = await getJson(`${service('drive')}/table/v1/driving/${coords}?annotations=duration`);
      if (!d || d.code !== 'Ok' || !d.durations) throw Object.assign(new Error((d && d.message) || 'No table'), { body: d });
      return quickestOrder(d.durations, roundTrip);
    });
  }

  // Held-Karp over the stops: cost[set][last] = quickest way to visit that set ending at last
  function quickestOrder(T, roundTrip) {
    const n = T.length - 1, full = (1 << n) - 1;
    const t = (a, b) => (T[a] && T[a][b] != null ? T[a][b] : Infinity);
    const cost = Array.from({ length: 1 << n }, () => new Array(n).fill(Infinity));
    const prev = Array.from({ length: 1 << n }, () => new Array(n).fill(-1));
    for (let j = 0; j < n; j++) cost[1 << j][j] = t(0, j + 1);
    for (let set = 1; set <= full; set++) {
      for (let j = 0; j < n; j++) {
        if (!(set & (1 << j)) || cost[set][j] === Infinity) continue;
        for (let k = 0; k < n; k++) {
          if (set & (1 << k)) continue;
          const next = set | (1 << k), c = cost[set][j] + t(j + 1, k + 1);
          if (c < cost[next][k]) { cost[next][k] = c; prev[next][k] = j; }
        }
      }
    }
    let last = 0, best = Infinity;
    for (let j = 0; j < n; j++) {
      const c = cost[full][j] + (roundTrip ? t(j + 1, 0) : 0);
      if (c < best) { best = c; last = j; }
    }
    if (best === Infinity) throw Object.assign(new Error('Some stops can\'t be reached by road'), { kind: 'noroute' });
    const order = [];
    for (let set = full, j = last; j >= 0;) { order.unshift(j + 1); const p = prev[set][j]; set &= ~(1 << j); j = p; }
    return order;
  }

  // Google's encoded polyline, used by Transitous for each leg's shape
  function decodePolyline(str, precision) {
    const f = Math.pow(10, precision || 6), out = [];
    let i = 0, lat = 0, lon = 0;
    const next = () => {
      let b, shift = 0, result = 0;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20 && i < str.length + 1);
      return result & 1 ? ~(result >> 1) : result >> 1;
    };
    while (i < str.length) {
      lat += next();
      lon += next();
      out.push([lon / f, lat / f]);
    }
    return out;
  }

  const MODE_WORDS = { BUS: 'Bus', COACH: 'Coach', TRAM: 'Tram', SUBWAY: 'Metro', METRO: 'Metro', FERRY: 'Ferry', AIRPLANE: 'Flight',
    RAIL: 'Train', REGIONAL_RAIL: 'Train', REGIONAL_FAST_RAIL: 'Train', HIGHSPEED_RAIL: 'Train', LONG_DISTANCE: 'Train',
    NIGHT_RAIL: 'Train', SUBURBAN: 'Train', CABLE_CAR: 'Cable car', FUNICULAR: 'Funicular', AERIAL_LIFT: 'Gondola' };
  const isWalk = (mode) => /^(WALK|BIKE|CAR|RENTAL|FLEX|ODM)/.test(mode);

  // Public transport: Transitous, a volunteer service for personal, non-commercial use.
  // Off until you turn it on in settings, as they ask to hear from you first.
  function transitPlan(a, z) {
    return remember('transit:' + pt(a) + ';' + pt(z), 2 * 60 * 1000, () => oneAtATime('transit', async () => {
      const u = new URL(service('transit'));
      u.searchParams.set('fromPlace', pt(a));
      u.searchParams.set('toPlace', pt(z));
      u.searchParams.set('time', new Date().toISOString());
      u.searchParams.set('numItineraries', '4');
      const d = await getJson(u.toString(), 25000);
      const trips = ((d && d.itineraries) || []).filter((t) => (t.legs || []).some((l) => !isWalk(l.mode)));
      const walk = d && d.direct && d.direct.find((x) => (x.legs || []).every((l) => l.mode === 'WALK'));
      if (!trips.length) return walk ? { walkOnly: true, seconds: walk.duration } : null;
      const options = trips.map((t) => {
        const legs = (t.legs || []).map((l) => ({
          walk: isWalk(l.mode),
          mode: MODE_WORDS[l.mode] || clean(String(l.mode).toLowerCase().replace(/_/g, ' ')),
          line: clean(l.routeShortName || l.displayName || ''),
          from: clean(l.from && l.from.name),
          to: clean(l.to && l.to.name),
          leave: l.startTime || (l.from && l.from.departure),
          seconds: l.duration,
          shape: l.legGeometry && l.legGeometry.points ? decodePolyline(l.legGeometry.points, l.legGeometry.precision) : null,
        }));
        return { seconds: t.duration, leave: t.startTime, arrive: t.endTime, changes: t.transfers, legs };
      }).sort((x, y) => new Date(x.leave) - new Date(y.leave));
      // Earliest arrival is the one to show; fewer changes breaks a tie
      const best = options.slice().sort((x, y) => (new Date(x.arrive) - new Date(y.arrive)) || (x.changes - y.changes))[0];
      const tz = ((d.itineraries[0].legs || []).find((l) => l.from && l.from.tz) || { from: {} }).from.tz;
      return { best, options, tz };
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

  // Free links, no keys: each opens the trip in a full map app for live traffic, turn by turn and timetables
  const gmaps = (a, z, mode, via) => 'https://www.google.com/maps/dir/?api=1' +
    (a.query ? '&origin=' + encodeURIComponent(a.query) : '') +
    (z.query ? '&destination=' + encodeURIComponent(z.query) : '') + '&travelmode=' + mode +
    (via && via.length ? '&waypoints=' + encodeURIComponent(via.map((v) => v.query).join('|')) : '');
  const isApple = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const link = (href, text) => `<a class="oqa-link" href="${esc(href)}" target="_blank" rel="noopener">${text}</a>`;

  /* ---------------- Map preview (OpenStreetMap tiles, no library) ---------------- */
  function project(lat, lon, z) {
    const size = 256 * Math.pow(2, z);
    const sin = Math.min(0.9999, Math.max(-0.9999, Math.sin((lat * Math.PI) / 180)));
    return [((lon + 180) / 360) * size, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size];
  }

  // markers: [{ lat, lon, kind: 'you' | 'cust' | 'stop', label }]; lines: [{ coords: [[lon, lat]], kind: 'drive' | 'transit' | 'walk' | 'guess' }]
  function drawMap(box, markers, lines) {
    if (!box || !markers.length) return;
    const W = box.clientWidth || 328, H = box.clientHeight || 160, PAD = 24;
    const pts = markers.map((m) => [m.lat, m.lon]);
    (lines || []).forEach((l) => (l.coords || []).forEach(([lo, la]) => pts.push([la, lo])));
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
    const poly = (l) => l.coords.map(([lo, la]) => xy(la, lo).join(',')).join(' ');
    let svg = '';
    (lines || []).filter((l) => l.coords && l.coords.length > 1).forEach((l) => {
      const p = poly(l);
      if (l.kind === 'walk' || l.kind === 'guess') {
        svg += `<polyline points="${p}" fill="none" stroke="${l.kind === 'walk' ? '#6F6F6F' : '#673AB6'}" stroke-width="2.5" stroke-dasharray="2 5" stroke-linecap="round"/>`;
      } else {
        svg += `<polyline points="${p}" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>` +
          `<polyline points="${p}" fill="none" stroke="${l.kind === 'transit' ? '#03A9F4' : '#673AB6'}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`;
      }
    });
    markers.forEach((m) => {
      const [x, y] = xy(m.lat, m.lon);
      if (m.kind === 'you') svg += `<circle cx="${x}" cy="${y}" r="6" fill="#fff" stroke="#222" stroke-width="3"/>`;
      else if (m.kind === 'stop') svg += `<circle cx="${x}" cy="${y}" r="9" fill="#673AB6" stroke="#fff" stroke-width="2"/>` +
        `<text x="${x}" y="${(+y + 3.5).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" font-family="Inter, system-ui, sans-serif" fill="#fff">${esc(m.label)}</text>`;
      else svg += `<circle cx="${x}" cy="${y}" r="7" fill="#673AB6" stroke="#fff" stroke-width="3"/>`;
    });
    html += `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${svg}</svg>` +
      '<a class="oqa-osm" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>';
    box.innerHTML = html;
  }

  /* ---------------- Panel: drive, public transport and trip ---------------- */
  // The panel is also the lookup context for the record on screen (linked companies, company cache)
  const panel = { el: null, mode: 'drive', draft: '', ordering: false, focusNext: null, rec: null, linked: null, companies: new Map(), picked: '', customer: null, dest: null, oneOff: '', run: 0, lastVia: '' };

  // Where you start: your default place, or whatever you picked earlier in this tab
  function currentFrom(s) {
    let v = '';
    try { v = sessionStorage.getItem('oolio-qa:from') || ''; } catch (e) { /* ignore */ }
    const valid = (x) => isStart(s, x);
    if (valid(v) && (v !== 'other' || panel.oneOff || panel.draft)) return v;
    return defaultStart(s);
  }
  // Any start you can pick: nearest office, an office, a saved place, your location or a typed address
  const isStart = (s, x) => x === 'nearest' || x === 'here' || x === 'other' ||
    OFFICES.some((o) => o.id === x) || s.places.some((p) => p.id === x);
  const defaultStart = (s) => (s.defaultFrom && s.defaultFrom !== 'other' && isStart(s, s.defaultFrom) ? s.defaultFrom : 'nearest');

  // Straight-line distance in km, enough to pick the nearest office
  function kmBetween(a, b) {
    const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }
  const nearestOffice = (p) => OFFICES.reduce((best, o) => (kmBetween(o, p) < kmBetween(best, p) ? o : best));

  function setCurrentFrom(v) {
    try { sessionStorage.setItem('oolio-qa:from', v); } catch (e) { /* ignore */ }
  }

  // Toolbar buttons: the same button again closes, another one switches
  function openPanel(mode) {
    const rec = getRecord();
    if (!rec) return;
    if (panel.el && panel.mode === mode && recordKey(panel.rec) === recordKey(rec)) return closePanel();
    panel.mode = mode;
    if (!panel.el || recordKey(panel.rec) !== recordKey(rec)) {
      closePanel(true);
      buildPanel(rec);
    }
    render();
  }

  function closePanel(quiet) {
    if (!panel.el) return;
    const refocus = !quiet && panel.el.contains(document.activeElement);
    panel.el.remove();
    panel.el = null;
    panel.run++;
    document.removeEventListener('keydown', onPanelKey);
    const btn = refocus && document.querySelector(`#oqa-bar [data-mode="${panel.mode}"]`);
    if (btn) btn.focus();
  }
  const closeDirections = () => closePanel();

  // Esc closes the panel (or just cancels an edit), but not while you're typing somewhere in HubSpot
  function onPanelKey(e) {
    if (e.key !== 'Escape' || overlay || !panel.el) return;
    const a = document.activeElement, bar = document.getElementById('oqa-bar');
    const inPanel = !!a && panel.el.contains(a);
    if (a && a !== document.body && !inPanel && !(bar && bar.contains(a))) return;
    const cancel = inPanel && panel.el.querySelector('.oqa-cust [data-act="cancel"]');
    if (cancel) cancel.click();
    else closePanel();
  }

  function buildPanel(rec) {
    injectBrand();
    const el = document.createElement('div');
    el.id = 'oqa-panel';
    el.className = 'tm-oolio';
    el.setAttribute('role', 'dialog');
    el.innerHTML =
      '<header><span class="oqa-hicon"></span><b></b>' +
      '<button type="button" class="oqa-icon-btn" data-act="settings" title="Your places and settings" aria-label="Your places and settings">' + ICON.settings + '</button>' +
      '<button type="button" class="oqa-icon-btn" data-act="close" title="Close (Esc)" aria-label="Close">' + ICON.x + '</button></header>' +
      '<div class="oqa-body"></div><footer></footer>';
    document.body.appendChild(el);
    Object.assign(panel, { el, rec, linked: null, companies: new Map(), picked: '', customer: null, dest: null });
    placeBar();
    el.querySelector('[data-act="close"]').addEventListener('click', () => closePanel());
    el.querySelector('[data-act="settings"]').addEventListener('click', () => {
      if (el.dataset.view === 'settings') render();
      else showSettings();
    });
    document.addEventListener('keydown', onPanelKey);
  }

  function render() {
    if (!panel.el) return;
    const m = MODES[panel.mode];
    panel.el.querySelector('.oqa-hicon').innerHTML = ICON[m.icon];
    panel.el.querySelector('header b').textContent = m.heading;
    panel.el.setAttribute('aria-label', m.heading);
    setFooter();
    if (panel.mode === 'trip') showTrip();
    else showRoute();
  }

  const body = () => panel.el.querySelector('.oqa-body');

  // Redraws replace the panel's contents, so remember which control had focus and put it back
  function focusKey() {
    const f = panel.el && panel.el.contains(document.activeElement) ? document.activeElement : null;
    if (!f) return null;
    const a = ['data-act', 'data-up', 'data-down', 'data-remove', 'data-suggest'].find((x) => f.hasAttribute(x));
    if (a) return `[${a}="${f.getAttribute(a)}"]`;
    if (f.classList.contains('oqa-from')) return '.oqa-from';
    if (f.classList.contains('oqa-other-input')) return '.oqa-other-input';
    return null;
  }
  function restoreFocus(keys) {
    if (!keys || !panel.el) return;
    const t = [].concat(keys).map((q) => body().querySelector(q)).find((x) => x && !x.disabled && !x.hidden);
    (t || body().querySelector('select, button:not([disabled]), input')).focus();
  }
  const skeleton = (w) => `<i class="oqa-skel" style="width:${w}px"></i>`;

  function setFooter() {
    const s = loadSettings();
    const transit = panel.mode === 'transit' && s.transit;
    panel.el.querySelector('footer').innerHTML =
      'Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors. ' +
      (transit
        ? 'Public transport: <a href="https://transitous.org/sources/" target="_blank" rel="noopener">Transitous</a>. '
        : 'Drive times: <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener">FOSSGIS</a>. ') +
      '<a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener">Report a map error</a>.';
  }

  function setNote(text, warn) {
    const n = panel.el && body().querySelector('.oqa-note');
    if (!n) return;
    n.hidden = !text;
    n.textContent = text || '';
    n.classList.toggle('oqa-warn', !!warn);
  }

  // The "where you are" picker, shared by every view
  function fromPicker(s, label) {
    const options = '<option value="nearest">Nearest Oolio office</option>' +
      (s.places.length ? '<optgroup label="Your places">' + s.places.map((p) => `<option value="${esc(p.id)}">${esc(p.label)}</option>`).join('') + '</optgroup>' : '') +
      '<optgroup label="Oolio offices">' + OFFICES.map((o) => `<option value="${o.id}">${esc(o.label)}</option>`).join('') + '</optgroup>' +
      '<optgroup label="Somewhere else"><option value="here">My current location</option><option value="other">Another address…</option></optgroup>';
    return `<select class="oqa-from" aria-label="${label}">${options}</select>` +
      '<small class="oqa-muted oqa-from-note" hidden></small>' +
      '<div class="oqa-inline oqa-other" hidden><input type="text" class="oqa-other-input" placeholder="Type an address" aria-label="Address">' +
      '<button type="button" class="oqa-btn" data-act="other-go">Go</button></div>' +
      (s.places.length ? '' : '<div class="oqa-muted" style="margin-top:4px">Often start from home? <button type="button" class="oqa-link" data-act="add-place">Add it as a place</button></div>');
  }
  function wireFromPicker(b, s, onChange) {
    const sel = b.querySelector('.oqa-from');
    const from = currentFrom(s);
    sel.value = from;
    const other = b.querySelector('.oqa-other');
    const otherInput = b.querySelector('.oqa-other-input');
    other.hidden = from !== 'other';
    otherInput.value = panel.draft || panel.oneOff;
    otherInput.addEventListener('input', () => { panel.draft = otherInput.value; });
    sel.addEventListener('change', () => {
      setCurrentFrom(sel.value);
      other.hidden = sel.value !== 'other';
      if (sel.value === 'other') {
        otherInput.focus();
        if (!panel.oneOff) return;
      }
      onChange();
    });
    const goOther = () => {
      panel.oneOff = clean(otherInput.value);
      if (panel.oneOff) onChange();
    };
    b.querySelector('[data-act="other-go"]').addEventListener('click', goOther);
    otherInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') goOther(); });
    const add = b.querySelector('[data-act="add-place"]');
    if (add) add.addEventListener('click', showSettings);
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
  async function yourPoint(from, target) {
    if (from === 'nearest') {
      if (!target) throw new Error('Can\'t tell which office is nearest without the customer\'s address. Pick an office instead.');
      const o = nearestOffice(target);
      return { lat: o.lat, lon: o.lon, label: o.label, query: o.address, office: o };
    }
    const office = OFFICES.find((o) => o.id === from);
    if (office) return { lat: office.lat, lon: office.lon, label: office.label, query: office.address, office };
    if (from === 'here') {
      const p = await getPosition();
      return { ...p, label: 'My location', query: pt(p) };
    }
    if (from === 'other') {
      if (!panel.oneOff) throw new Error('Type an address above, then press Go.');
      const g = await geocode({ text: panel.oneOff }).catch((e) => {
        log('address lookup failed:', e.message);
        throw new Error(whyFailed(e, 'geocode'));
      });
      if (!g) throw new Error(`Couldn't find "${panel.oneOff}" on the map. Try adding the suburb and postcode.`);
      return { ...g, label: panel.oneOff, query: parseCoords(panel.oneOff) ? pt(g) : panel.oneOff };
    }
    const p = loadSettings().places.find((x) => x.id === from);
    if (!p) throw new Error('That saved place has gone. Pick another.');
    return { lat: p.lat, lon: p.lon, label: p.label, query: parseCoords(p.address) ? pt(p) : p.address };
  }

  // Under the picker: which office "nearest" chose
  function setFromNote(you, from) {
    const n = panel.el && body().querySelector('.oqa-from-note');
    if (!n) return;
    const show = from === 'nearest' && you && you.office;
    n.hidden = !show;
    const o = show ? you.office : null;
    n.textContent = o ? `Nearest is the ${o.label}${o.label.includes(o.area) ? '' : ' in ' + o.area}` : '';
  }

  /* ----- Customer (drive and public transport views) ----- */

  async function loadCustomer(run) {
    if (!panel.customer || (panel.customer.error && !panel.customer.override)) {
      let c;
      try {
        c = await getCustomer(panel.rec, panel, panel.picked);
      } catch (e) {
        c = { key: 'rec:' + recordKey(panel.rec), name: 'Customer', error: 'Couldn\'t read the company from HubSpot.' };
      }
      if (run !== panel.run || !panel.el) return null;
      panel.customer = c;
      panel.lastVia = c.via || '';
    }
    renderCustomer();
    return panel.customer;
  }

  // The customer's map point, kept for this panel. A slow lookup for a customer that's
  // no longer showing (another company picked, an edit saved) is thrown away.
  async function customerPoint(c) {
    if (panel.dest && panel.dest.of === c) return panel.dest;
    const p = await pointFor(c);
    if (p && panel.customer === c) panel.dest = { ...p, of: c };
    return p;
  }

  function renderCustomer() {
    const box = panel.el && body().querySelector('.oqa-cust');
    const c = panel.customer;
    if (!box || !c) return;
    const line = c.error ? '' : addressLine(c);
    const many = c.count > 1 ? `<button type="button" class="oqa-link" data-act="pick">${c.count} companies, pick another</button>` : '';
    box.innerHTML =
      `<div class="oqa-name"><b title="${esc(c.name)}">${esc(c.name || 'Customer')}</b>${c.isPrimary && c.count > 1 ? '<span class="oqa-tag">Primary</span>' : ''}</div>` +
      `<small>${esc(c.error || line || 'No address in HubSpot')}${c.override ? ' (your edit)' : ''}</small> ` +
      `<div><button type="button" class="oqa-link" data-act="edit">${line ? 'Edit address' : 'Type the address'}</button>${many ? ' · ' + many : ''}</div>`;
    box.querySelector('[data-act="edit"]').addEventListener('click', () => editCustomer(box));
    const pick = box.querySelector('[data-act="pick"]');
    if (pick) pick.addEventListener('click', () => pickCompany(box));
  }

  function editCustomer(box) {
    const c = panel.customer || {};
    const overrides = store.get('overrides', {}) || {};
    box.innerHTML = `<div class="oqa-name"><b>${esc(c.name || 'Customer')}</b></div>` +
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
      store.set('chips', {});
      chipState.key = '';
      panel.customer = null;
      panel.dest = null;
      calculate();
    };
    box.querySelector('[data-act="save"]').addEventListener('click', () => save(clean(input.value)));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(clean(input.value)); });
    box.querySelector('[data-act="cancel"]').addEventListener('click', () => {
      renderCustomer();
      const edit = box.querySelector('[data-act="edit"]');
      if (edit) edit.focus();
    });
    const reset = box.querySelector('[data-act="reset"]');
    if (reset) reset.addEventListener('click', () => save(''));
  }

  // More than one company on the record (often a Head Office plus the venue): let you choose
  async function pickCompany(box) {
    const rec = panel.rec;
    box.innerHTML = '<div class="oqa-name"><b>Linked companies</b></div>' + skeleton(200) + skeleton(160);
    const run = panel.run;
    let choices;
    try { choices = await companyChoices(rec, panel); } catch (e) { choices = { list: [], more: 0 }; }
    if (!panel.el || run !== panel.run) return;
    if (!choices.list.length) { renderCustomer(); return; }
    const current = panel.customer && panel.customer.id;
    box.innerHTML = '<div class="oqa-name"><b>Linked companies</b></div>' +
      `<select class="oqa-company" aria-label="Company">${choices.list.map((c) =>
        `<option value="${esc(c.id)}"${c.id === current ? ' selected' : ''}>${esc(c.name || 'Company ' + c.id)}` +
        `${c.parts && c.parts.city ? ' (' + esc(c.parts.city) + ')' : ''}${c.id === panel.linked.primary ? ', primary' : ''}</option>`).join('')}</select>` +
      (choices.more > 0 ? `<small>And ${choices.more} more not shown.</small>` : '') +
      '<div style="margin-top:4px"><button type="button" class="oqa-link" data-act="cancel">Cancel</button></div>';
    const sel = box.querySelector('.oqa-company');
    sel.focus();
    sel.addEventListener('change', () => {
      panel.picked = sel.value;
      panel.customer = null;
      panel.dest = null;
      calculate();
    });
    box.querySelector('[data-act="cancel"]').addEventListener('click', renderCustomer);
  }

  /* ----- Drive and public transport views ----- */
  function showRoute() {
    const el = panel.el;
    el.dataset.view = 'route';
    const s = loadSettings();
    const you = `<div class="oqa-end"><span class="oqa-dot"></span><div>${fromPicker(s, s.direction === 'to' ? 'Start from' : 'Go to')}</div></div>`;
    const cust = '<div class="oqa-end"><span class="oqa-dot oqa-cust-dot"></span><div class="oqa-cust">' + skeleton(160) + skeleton(220) + '</div></div>';

    body().innerHTML =
      '<div class="oqa-ends">' + (s.direction === 'to' ? you + cust : cust + you) +
      `<button type="button" class="oqa-icon-btn oqa-swap" data-act="swap" title="Swap start and end" aria-label="Swap start and end">${ICON.swap}</button></div>` +
      '<div class="oqa-map"></div><div class="oqa-result"></div><p class="oqa-note" hidden></p>' +
      '<div class="oqa-actions"></div><div class="oqa-more"></div>';

    const b = body();
    wireFromPicker(b, s, calculate);
    b.querySelector('[data-act="swap"]').addEventListener('click', () => {
      const st = loadSettings();
      st.direction = st.direction === 'to' ? 'from' : 'to';
      saveSettings(st);
      showRoute();
    });
    if (b.querySelector('.oqa-from').value === 'other' && !panel.oneOff) loadCustomer(++panel.run);
    else calculate();
  }

  function resultRow(icon, href, title) {
    return `<a class="oqa-mode" href="${esc(href)}" target="_blank" rel="noopener" title="${title}">` +
      `<span class="oqa-ic">${icon}</span><div><b>${skeleton(70)}</b><span class="oqa-sub">${skeleton(150)}</span></div>` +
      `<span class="oqa-go">${ICON.external}</span></a>`;
  }
  function fillResult(big, small) {
    const row = panel.el && body().querySelector('.oqa-result .oqa-mode');
    if (!row) return;
    row.querySelector('b').textContent = big;
    row.querySelector('.oqa-sub').textContent = small;
  }

  async function calculate() {
    if (!panel.el || panel.el.dataset.view !== 'route') return;
    const run = ++panel.run;
    const live = () => run === panel.run && !!panel.el;
    const mode = panel.mode;
    const b = body();
    const result = b.querySelector('.oqa-result');
    const map = b.querySelector('.oqa-map');
    const more = b.querySelector('.oqa-more');
    const actions = b.querySelector('.oqa-actions');
    setNote('');
    result.innerHTML = '';
    more.innerHTML = '';
    actions.innerHTML = '';
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
    const from = b.querySelector('.oqa-from').value;
    let lookupErr = null, you;
    const dest = await customerPoint(c).catch((e) => { log('address lookup failed:', e.message); lookupErr = e; return null; });
    if (!live()) return;
    try {
      // Without the customer's map point there's no nearest office; Google can still start from where you are
      you = !dest && from === 'nearest' ? { label: '', query: '' } : await yourPoint(from, dest);
    } catch (e) {
      if (!live()) return;
      map.hidden = true;
      setNote(e.message, true);
      return;
    }
    if (!live()) return;
    setFromNote(you, from);

    const travel = mode === 'transit' ? 'transit' : 'driving';
    const icon = mode === 'transit' ? ICON.train : ICON.car;
    if (!dest) {
      // No point to route to, but Google can still try the address text
      map.hidden = true;
      const custQ = { query: addressQuery(c, {}) };
      result.innerHTML = resultRow(icon, s.direction === 'to' ? gmaps(you, custQ, travel) : gmaps(custQ, you, travel), 'Open in Google Maps');
      fillResult('Google Maps', 'Open the route in Google Maps');
      setNote(lookupErr ? 'No time yet. ' + whyFailed(lookupErr, 'geocode')
        : 'Couldn\'t find this address on the map. Check it with Edit address, or open Google Maps.', true);
      return;
    }

    const custEnd = { lat: dest.lat, lon: dest.lon, label: c.name, query: addressQuery(c, dest) };
    const [a, z] = s.direction === 'to' ? [you, custEnd] : [custEnd, you];
    const markers = [{ ...you, kind: 'you' }, { ...custEnd, kind: 'cust' }];

    result.innerHTML = resultRow(icon, gmaps(a, z, travel), 'Open in Google Maps');
    drawMap(map, markers, [{ coords: [[a.lon, a.lat], [z.lon, z.lat]], kind: 'guess' }]);
    if (dest.approx) setNote('Couldn\'t find the exact street, so times go to the suburb. Edit the address for a closer match.', true);
    else if (dest.display && !dest.fromHubSpot) setNote('Map pin: ' + dest.display);
    tripButton(actions, c, dest);

    const links = mode === 'drive' ? [link(`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${pt(a)}%3B${pt(z)}`, 'OpenStreetMap')] : [];
    if (isApple()) links.push(link(`https://maps.apple.com/directions?source=${encodeURIComponent(a.query)}&destination=${encodeURIComponent(z.query)}&mode=${travel}`, 'Apple Maps'));
    if (mode === 'transit' && s.transit) links.push(link(`https://api.transitous.org/?fromPlace=${pt(a)}&toPlace=${pt(z)}`, 'Transitous'));
    if (links.length) more.innerHTML = '<span class="oqa-muted">Also open in</span> ' + links.join('');

    if (mode === 'drive') {
      driveRoute([a, z]).then((r) => {
        if (!live()) return;
        fillResult(fmtDuration(r.seconds), `${fmtDistance(r.metres)} by car, without traffic`);
        drawMap(map, markers, [{ coords: r.line, kind: 'drive' }]);
      }).catch((e) => {
        log('drive route failed:', e.message);
        if (!live()) return;
        fillResult('Drive', 'Couldn\'t work out a time here. Open Google Maps instead.');
        setNote(whyFailed(e, 'drive'), true);
      });
      return;
    }

    if (!s.transit) {
      fillResult('Google Maps', 'Opens with live public transport times');
      const call = document.createElement('div');
      call.className = 'oqa-callout';
      call.innerHTML = '<p>Want the times here instead? <a href="https://transitous.org/api/" target="_blank" rel="noopener">Transitous</a> ' +
        'can show them. It\'s a free volunteer service for personal, non-commercial use, and they ask to hear from you before you use it.</p>' +
        '<button type="button" class="oqa-btn" data-act="transit-on">Show times here</button>';
      result.appendChild(call);
      call.querySelector('[data-act="transit-on"]').addEventListener('click', () => {
        const st = loadSettings();
        st.transit = true;
        saveSettings(st);
        render();
      });
      return;
    }

    transitPlan(a, z).then((t) => {
      if (!live()) return;
      if (!t) return fillResult('No services', 'Nothing found from here. Open Google Maps instead.');
      if (t.walkOnly) return fillResult(fmtDuration(t.seconds), 'Walk, it\'s close');
      const best = t.best;
      const changes = best.changes ? `${best.changes} change${best.changes > 1 ? 's' : ''}` : 'no changes';
      fillResult(fmtDuration(best.seconds), `Leave ${fmtTime(best.leave, t.tz)}, arrive ${fmtTime(best.arrive, t.tz)}, ${changes}`);
      const legs = document.createElement('ol');
      legs.className = 'oqa-legs';
      legs.setAttribute('aria-label', 'Steps');
      legs.innerHTML = best.legs.filter((l) => !l.walk || l.seconds >= 60).map((l) => l.walk
        ? `<li><span class="oqa-line oqa-walkline">Walk</span><span>${fmtDuration(l.seconds)}${l.to && l.to !== 'END' ? ' to ' + esc(l.to) : ''}</span></li>`
        : `<li><span class="oqa-line">${esc(l.line || l.mode)}</span><span>${esc(l.mode)} from ${esc(l.from)}, ${fmtTime(l.leave, t.tz)}${l.to && l.to !== 'END' ? ', get off at ' + esc(l.to) : ''}</span></li>`).join('');
      const later = t.options.filter((o) => o !== best).slice(0, 3)
        .map((o) => `${fmtTime(o.leave, t.tz)} (${fmtDuration(o.seconds)})`);
      result.appendChild(legs);
      if (later.length) {
        const p = document.createElement('p');
        p.className = 'oqa-muted';
        p.style.margin = '6px 0 0';
        p.textContent = 'Other departures: ' + later.join(', ');
        result.appendChild(p);
      }
      drawMap(map, markers, best.legs.filter((l) => l.shape).map((l) => ({ coords: l.shape, kind: l.walk ? 'walk' : 'transit' })));
    }).catch((e) => {
      log('public transport failed:', e.message);
      if (!live()) return;
      fillResult('Public transport', 'Couldn\'t get times here. Open Google Maps instead.');
      setNote(whyFailed(e, 'transit'), true);
    });
  }

  /* ----- Trip: several customers in one drive ----- */
  const tripStops = () => {
    const t = store.get('trip', null);
    return t && Array.isArray(t.stops) ? t.stops : [];
  };
  function saveTrip(stops, extra) {
    const t = store.get('trip', null) || {};
    store.set('trip', { ...t, ...extra, stops: stops.slice(0, MAX_STOPS), at: Date.now() });
  }

  // Records open in your HubSpot tabs that aren't in the trip yet (including ones whose company already is)
  const tripSuggestions = (stops) => openRecords().filter((t) =>
    !stops.some((x) => x.url === recordUrl(t) || (x.also || []).includes(recordUrl(t))));
  const suggestionKey = () => tripSuggestions(tripStops()).map((t) => t.key + ':' + t.title).sort().join('|');

  // "Add to trip" under a drive or public transport result
  function tripButton(box, c, dest) {
    const stops = tripStops();
    const i = stops.findIndex((x) => x.key === c.key);
    const inTrip = i >= 0;
    // An edited address moves the stop too
    if (inTrip) {
      const fresh = { ...stopFrom(c, dest, panel.rec), url: stops[i].url, also: stops[i].also };
      if (['lat', 'lon', 'line', 'query', 'approx'].some((k) => fresh[k] !== stops[i][k])) {
        stops[i] = fresh;
        saveTrip(stops);
      }
    }
    box.innerHTML = inTrip
      ? `<button type="button" class="oqa-btn oqa-quiet" data-act="view-trip">${ICON.route}In your trip, view it</button>`
      : `<button type="button" class="oqa-btn oqa-quiet" data-act="add-trip"${stops.length >= MAX_STOPS ? ' disabled title="A trip can have up to ${MAX_STOPS} stops"' : ''}>${ICON.plus}Add to trip</button>`;
    const view = box.querySelector('[data-act="view-trip"]');
    if (view) view.addEventListener('click', () => openPanel('trip'));
    const add = box.querySelector('[data-act="add-trip"]');
    if (add) add.addEventListener('click', () => {
      const list = tripStops();
      if (list.length >= MAX_STOPS) setNote(`Your trip already has ${MAX_STOPS} stops. Remove one to add this.`, true);
      else if (!list.some((x) => x.key === c.key)) saveTrip([...list, stopFrom(c, dest, panel.rec)]);
      tripButton(box, c, dest);
      const btn = box.querySelector('button');
      if (btn) btn.focus();
    });
  }

  function stopFrom(c, dest, rec) {
    return { key: c.key, name: c.name || 'Customer', line: addressLine(c), lat: dest.lat, lon: dest.lon,
      approx: !!dest.approx, url: recordUrl(rec), query: addressQuery(c, dest) };
  }

  // A stop for a record open in another tab: read its company and find it on the map
  async function stopForRecord(t) {
    const rec = { portal: t.portal, type: t.type, id: t.id };
    const ctx = { rec, linked: null, companies: new Map() };
    const c = await getCustomer(rec, ctx);
    if (c.error) throw new Error(`${t.title || 'That record'}: ${c.error}`);
    if (!addressLine(c) && c.lat == null) throw new Error(`${c.name} has no address in HubSpot. Open it and use Edit address.`);
    let dest;
    try {
      dest = await pointFor(c);
    } catch (e) {
      log('address lookup failed:', e.message);
      throw new Error(`Couldn't add ${c.name}. ${whyFailed(e, 'geocode')}`);
    }
    if (!dest) throw new Error(`Couldn't find ${c.name} on the map. Open it and use Edit address.`);
    return stopFrom(c, dest, rec);
  }

  function showTrip() {
    const el = panel.el;
    if (!el) return;
    el.dataset.view = 'trip';
    const run = ++panel.run;
    const live = () => run === panel.run && !!panel.el && panel.el.dataset.view === 'trip';
    const s = loadSettings();
    const trip = store.get('trip', null) || {};
    const stops = tripStops();
    const back = trip.back === true;
    const here = getRecord();
    const suggestions = tripSuggestions(stops);
    panel.suggestKey = suggestionKey();
    const keep = panel.focusNext || focusKey();
    panel.focusNext = null;
    // This tab's record first
    suggestions.sort((x, y) => (recordKey(y) === recordKey(here)) - (recordKey(x) === recordKey(here)));

    body().innerHTML =
      `<div class="oqa-ends oqa-solo"><div class="oqa-end"><span class="oqa-dot"></span><div>${fromPicker(s, 'Start from')}</div></div></div>` +
      (stops.length
        ? '<ol class="oqa-stops">' + stops.map((x, i) =>
          `<li><span class="oqa-num">${i + 1}</span><div><a class="oqa-stop-name" href="${esc(x.url)}" title="Open ${esc(x.name)}">${esc(x.name)}</a>` +
          `<small><span class="oqa-legtime" data-leg="${i}"></span>${esc(x.line || '')}</small></div>` +
          `<button type="button" class="oqa-icon-btn" data-up="${i}" title="Move up" aria-label="Move ${esc(x.name)} up"${i === 0 ? ' disabled' : ''}>${ICON.up}</button>` +
          `<button type="button" class="oqa-icon-btn" data-down="${i}" title="Move down" aria-label="Move ${esc(x.name)} down"${i === stops.length - 1 ? ' disabled' : ''}>${ICON.down}</button>` +
          `<button type="button" class="oqa-icon-btn" data-remove="${i}" title="Remove" aria-label="Remove ${esc(x.name)}">${ICON.x}</button></li>`).join('') + '</ol>'
        : '<p class="oqa-muted" style="margin:0 0 8px">No stops yet. Add records you have open in HubSpot, or use <b>Add to trip</b> under a drive time.</p>') +
      (suggestions.length && stops.length < MAX_STOPS
        ? '<div class="oqa-suggest"><span class="oqa-muted">Open in your tabs</span>' + suggestions.slice(0, 8).map((t, i) =>
          `<button type="button" data-suggest="${i}">${ICON.plus}<span>${esc(t.title || TYPE_NAMES[t.type] + ' ' + t.id)}</span>` +
          `<small>${recordKey(t) === recordKey(here) ? 'This tab' : TYPE_NAMES[t.type] || ''}</small></button>`).join('') + '</div>'
        : '') +
      '<p class="oqa-note" hidden></p>' +
      (stops.length
        ? `<label class="oqa-check"><input type="checkbox" data-act="back"${back ? ' checked' : ''}><span>Come back to the start at the end</span></label>` +
          '<div class="oqa-total" aria-live="polite">' + skeleton(180) + '</div><div class="oqa-map"></div>' +
          '<div class="oqa-actions">' +
          `<a class="oqa-btn" data-act="gmaps" target="_blank" rel="noopener" href="#" hidden>${ICON.external}Google Maps</a>` +
          (stops.length > 1 ? `<button type="button" class="oqa-btn oqa-quiet" data-act="order">${ICON.route}Best order</button>` : '') +
          '<button type="button" class="oqa-btn oqa-quiet" data-act="clear">Clear</button></div>'
        : '');

    const b = body();
    wireFromPicker(b, s, showTrip);
    restoreFocus(keep);
    const move = (from, to) => {
      const list = tripStops();
      const [x] = list.splice(from, 1);
      list.splice(to, 0, x);
      saveTrip(list);
      // Focus follows the stop that moved
      panel.focusNext = [`[data-${to > from ? 'down' : 'up'}="${to}"]`, `[data-${to > from ? 'up' : 'down'}="${to}"]`];
      showTrip();
    };
    b.querySelectorAll('[data-up]').forEach((x) => x.addEventListener('click', () => move(+x.dataset.up, +x.dataset.up - 1)));
    b.querySelectorAll('[data-down]').forEach((x) => x.addEventListener('click', () => move(+x.dataset.down, +x.dataset.down + 1)));
    b.querySelectorAll('[data-remove]').forEach((x) => x.addEventListener('click', () => {
      const list = tripStops();
      list.splice(+x.dataset.remove, 1);
      saveTrip(list);
      panel.focusNext = [`[data-remove="${Math.min(+x.dataset.remove, list.length - 1)}"]`, '.oqa-from'];
      showTrip();
    }));
    b.querySelectorAll('[data-suggest]').forEach((x) => x.addEventListener('click', async () => {
      const t = suggestions[+x.dataset.suggest];
      x.disabled = true;
      x.querySelector('small').textContent = 'Adding…';
      try {
        const stop = await stopForRecord(t);
        const list = tripStops();
        // Another ticket for a company that's already a stop: remember it, so it stops being suggested
        const dup = list.find((y) => y.key === stop.key);
        if (dup) dup.also = [...(dup.also || []), stop.url];
        else if (list.length >= MAX_STOPS) throw new Error(`Your trip already has ${MAX_STOPS} stops. Remove one to add another.`);
        saveTrip(dup ? list : [...list, stop]);
        if (panel.el && panel.el.dataset.view === 'trip') showTrip();
        if (dup) setNote(`${stop.name} is already in your trip.`);
      } catch (e) {
        if (!panel.el || panel.el.dataset.view !== 'trip') return;
        x.disabled = false;
        x.querySelector('small').textContent = recordKey(t) === recordKey(here) ? 'This tab' : TYPE_NAMES[t.type] || '';
        setNote(e.message, true);
      }
    }));
    if (!stops.length) return;

    b.querySelector('[data-act="back"]').addEventListener('change', (e) => { saveTrip(tripStops(), { back: e.target.checked }); showTrip(); });
    b.querySelector('[data-act="clear"]').addEventListener('click', () => {
      if (stops.length > 1 && !confirm('Clear all ' + stops.length + ' stops from your trip?')) return;
      saveTrip([], { back: false });
      showTrip();
    });

    const total = b.querySelector('.oqa-total');
    const map = b.querySelector('.oqa-map');
    const gm = b.querySelector('[data-act="gmaps"]');
    const order = b.querySelector('[data-act="order"]');
    if (order) order.disabled = true;

    const middle = { lat: stops.reduce((t, x) => t + x.lat, 0) / stops.length, lon: stops.reduce((t, x) => t + x.lon, 0) / stops.length };
    const tripFrom = b.querySelector('.oqa-from').value;
    yourPoint(tripFrom, middle).then(async (you) => {
      if (!live()) return;
      setFromNote(you, tripFrom);
      const points = [you, ...stops];
      const route = back ? [...points, you] : points;
      const last = back ? you : stops[stops.length - 1];
      const via = back ? stops : stops.slice(0, -1);
      gm.href = gmaps(you, last, 'driving', via);
      gm.hidden = false;
      const markers = [{ ...you, kind: 'you' }, ...stops.map((x, i) => ({ ...x, kind: 'stop', label: String(i + 1) }))];
      drawMap(map, markers, [{ coords: route.map((p) => [p.lon, p.lat]), kind: 'guess' }]);
      if (stops.some((x) => x.approx)) setNote('Some stops only matched the suburb, so their times are rough.', true);

      if (order) {
        order.disabled = false;
        if ([].concat(keep).includes('[data-act="order"]')) order.focus();
        order.addEventListener('click', async () => {
          order.disabled = true;
          order.lastChild.textContent = 'Working it out…';
          panel.ordering = true;
          let idx, err;
          try {
            idx = await bestOrder(points, back);
          } catch (e) {
            err = e;
            log('best order failed:', e.message);
          } finally {
            panel.ordering = false;
          }
          if (!live()) return;
          const reset = (msg, warn) => { order.disabled = false; order.lastChild.textContent = 'Best order'; setNote(msg, warn); };
          if (!idx) return reset('Couldn\'t work out the best order. ' + whyFailed(err, 'drive'), true);
          if (idx.every((v, k) => v === k + 1)) return reset('This is already the quickest order.');
          saveTrip(idx.map((i) => stops[i - 1]));
          panel.focusNext = '[data-act="order"]';
          showTrip();
          setNote('Reordered for the quickest drive.');
        });
      }

      try {
        const r = await driveRoute(route);
        if (!live()) return;
        total.innerHTML = `<b>${fmtDuration(r.seconds)}</b> driving, ${fmtDistance(r.metres)}` +
          '<div class="oqa-muted">Without traffic, and not counting time at each stop.</div>';
        r.legs.forEach((l, i) => {
          const span = b.querySelector(`[data-leg="${i}"]`);
          if (span) span.textContent = `+${fmtDuration(l.seconds)}  `;
        });
        const home = back && r.legs[stops.length];
        if (home) total.insertAdjacentHTML('beforeend', `<div class="oqa-muted">Includes ${fmtDuration(home.seconds)} back to ${esc(you.label)}.</div>`);
        drawMap(map, markers, [{ coords: r.line, kind: 'drive' }]);
      } catch (e) {
        log('trip route failed:', e.message);
        if (!live()) return;
        total.innerHTML = '<span class="oqa-muted">Couldn\'t work out the drive here. Google Maps can still plan it.</span>';
        setNote(whyFailed(e, 'drive'), true);
      }
    }).catch((e) => {
      if (!live()) return;
      total.innerHTML = '';
      map.hidden = true;
      setNote(e.message, true);
    });
  }

  /* ----- Settings ----- */
  function showSettings() {
    const el = panel.el;
    if (!el) return;
    panel.run++;
    el.dataset.view = 'settings';
    const s = loadSettings();
    const defaultId = defaultStart(s);
    const star = (id, label) =>
      `<button type="button" class="oqa-icon-btn oqa-star" data-star="${esc(id)}" aria-pressed="${defaultId === id}" ` +
      `title="${defaultId === id ? 'You start here' : 'Start here'}" aria-label="Start from ${esc(label)}">${ICON.star}</button>`;

    body().innerHTML =
      `<button type="button" class="oqa-link" data-act="back" style="margin:2px 0 4px">Back to ${MODES[panel.mode].heading.toLowerCase()}</button>` +
      '<h3>Your places</h3>' +
      '<p class="oqa-muted" style="margin:0">Saved in Tampermonkey on this computer only. The star is where you start; out of the box, that\'s the nearest Oolio office.</p>' +
      '<ul class="oqa-places">' +
      s.places.map((p) =>
        `<li><div><b>${esc(p.label)}</b><small title="${esc(p.display || p.address)}">${esc(p.display || p.address)}</small></div>` +
        star(p.id, p.label) +
        `<button type="button" class="oqa-icon-btn" data-del="${esc(p.id)}" title="Remove" aria-label="Remove ${esc(p.label)}">${ICON.trash}</button></li>`).join('') +
      `<li><div><b>My current location</b><small>Your browser asks the first time</small></div>${star('here', 'my current location')}</li>` +
      '</ul>' +
      '<h3>Oolio offices</h3>' +
      '<ul class="oqa-places">' +
      `<li><div><b>Nearest Oolio office</b><small>Whichever of the ${OFFICES.length} offices is closest to each customer</small></div>${star('nearest', 'the nearest Oolio office')}</li>` +
      '</ul>' +
      `<details><summary>All ${OFFICES.length} offices</summary><ul class="oqa-places">` +
      OFFICES.map((o) => `<li><div><b>${esc(o.label)}</b><small title="${esc(o.address)}">${esc(o.address)}</small></div>${star(o.id, o.label)}</li>`).join('') +
      '</ul></details>' +
      '<form class="oqa-form" autocomplete="off" novalidate>' +
      '<h3 style="margin-top:4px">Add a place</h3>' +
      '<input type="text" name="label" maxlength="40" placeholder="Name, for example Perth office or Home" aria-label="Place name">' +
      '<input type="text" name="address" placeholder="Address, or a Google Maps link to the place" aria-label="Place address">' +
      '<div class="oqa-inline" style="margin:0"><button type="submit" class="oqa-btn">Add place</button>' +
      '<button type="button" class="oqa-btn oqa-quiet" data-act="here">Use where I am now</button></div>' +
      '<p class="oqa-error-text" hidden></p>' +
      '<small class="oqa-muted">For home, a nearby corner or your suburb is enough. Typed addresses are looked up on OpenStreetMap. ' +
      '"Use where I am now" sends no address and saves your spot to about 100 m; that point goes to the route services when you get directions.</small></form>' +
      '<h3>Where the buttons sit</h3>' +
      '<p class="oqa-muted" style="margin:0">Drag the dots at the left end of the purple bar to move it anywhere, or click them and use the arrow keys. ' +
      'Every HubSpot tab uses the same spot.</p>' +
      '<div class="oqa-inline"><button type="button" class="oqa-btn oqa-quiet" data-act="respot">Put them back bottom right</button></div>' +
      '<h3>Drive time next to the buttons</h3>' +
      `<label class="oqa-check"><input type="checkbox" data-act="chip"${s.chip ? ' checked' : ''}>` +
      '<span>Show how long the drive is from the nearest Oolio office, on every record you open. ' +
      'Each record is looked up once a week at most.</span></label>' +
      '<h3>Public transport times</h3>' +
      `<label class="oqa-check"><input type="checkbox" data-act="transit"${s.transit ? ' checked' : ''}>` +
      '<span>Show public transport times in the panel, from <a href="https://transitous.org/api/" target="_blank" rel="noopener">Transitous</a>. ' +
      'It\'s a free volunteer service for personal, non-commercial use, and they ask to hear from you before you use it. ' +
      'When off, the public transport button opens Google Maps.</span></label>' +
      '<details><summary>Advanced</summary>' +
      '<p class="oqa-muted" style="margin:6px 0 0">Service addresses, in case one moves or asks you to switch. Clear a box to go back to the default.</p>' +
      ['geocode:Address lookup', 'drive:Driving routes', 'transit:Public transport'].map((x) => {
        const [k, label] = x.split(':');
        return `<label class="oqa-field">${label}<input type="text" data-service="${k}" placeholder="${esc(SERVICES[k])}" value="${esc(s.services[k] || '')}"></label>`;
      }).join('') +
      `<p class="oqa-muted" style="margin:8px 0 0">Version ${esc(VERSION)}. Last company lookup: ${esc(panel.lastVia || 'none yet')}.</p>` +
      '</details>';

    const b = body();
    b.querySelector('[data-act="back"]').addEventListener('click', render);
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
    b.querySelector('[data-act="respot"]').addEventListener('click', () => {
      store.remove('barSpot');
      placeBar();
    });
    b.querySelector('[data-act="chip"]').addEventListener('change', (e) => {
      const st = loadSettings();
      st.chip = e.target.checked;
      saveSettings(st);
      chipState.key = '';
    });
    b.querySelector('[data-act="transit"]').addEventListener('change', (e) => {
      const st = loadSettings();
      st.transit = e.target.checked;
      saveSettings(st);
    });
    b.querySelectorAll('[data-service]').forEach((input) => input.addEventListener('change', () => {
      const st = loadSettings();
      const v = clean(input.value);
      input.setCustomValidity('');
      if (v && !/^https:\/\/[^\s/]+/.test(v)) {
        input.value = st.services[input.dataset.service] || '';
        input.setCustomValidity('Use an address that starts with https://');
        input.reportValidity();
        return;
      }
      st.services = { ...st.services, [input.dataset.service]: v.replace(/\/+$/, '') };
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
      saveSettings(st);
      showSettings();
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const label = clean(form.label.value), address = clean(form.address.value);
      if (!label) return showErr('Give the place a name.');
      if (!address) return showErr('Add an address, or use where you are now.');
      if (/^https?:\/\//i.test(address) && !parseCoords(address)) {
        return showErr('That link has no map position in it. Open it, wait for the map to load, then copy the address bar again.');
      }
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Finding it…';
      showErr('');
      let g = null, err = null;
      try { g = await geocode({ text: address }); } catch (x) { err = x; log('place lookup failed:', x.message); }
      if (!panel.el || panel.el.dataset.view !== 'settings') return;
      btn.disabled = false;
      btn.textContent = 'Add place';
      if (!g) return showErr(err ? whyFailed(err, 'geocode') : 'Couldn\'t find that address. Try adding the suburb and postcode.');
      addPlace(label, address, g);
    });
    form.querySelector('[data-act="here"]').addEventListener('click', async () => {
      const label = clean(form.label.value) || 'Saved spot';
      showErr('');
      try {
        const p = await getPosition();
        if (!panel.el || panel.el.dataset.view !== 'settings') return;
        // Rounded to about 100 m: plenty for travel times
        const q = { lat: +p.lat.toFixed(3), lon: +p.lon.toFixed(3) };
        addPlace(label, pt(q), { ...q, display: 'Saved from your location, to about 100 m' });
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
  // Capture, so the key is seen before HubSpot's own boxes swallow it
  window.addEventListener('keydown', onEscape, true);
  if (location.pathname.startsWith('/calendar-select-iframe/')) scheduler();
  // Skip the record page loaded inside the Help Desk meeting modal
  else if (window.top === window) {
    toolbar();
    prefillAfterReload();
  }
})();
