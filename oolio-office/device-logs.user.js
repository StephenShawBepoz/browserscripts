// ==UserScript==
// @name         Oolio Office: Download Device Logs
// @namespace    oolio-userscripts
// @version      1.1.1
// @description  Adds a Download logs button to Oolio Office > Logs > Devices. Exports every line for the current filters as CSV or JSON.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/oolio-office/device-logs.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/oolio-office/device-logs.user.js
// @match        https://office.oolio.io/*
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTQwLjA5OSAwQzE3My4xODEgMCAyMDAgMjYuNjk3OSAyMDAgNTkuNjMxNEMyMDAgOTIuNTY0OSAxNzMuMTgxIDExOS4yNjMgMTQwLjA5OSAxMTkuMjYzQzEyNC42NzcgMTE5LjI2MyAxMTAuNjE2IDExMy40NjEgOTkuOTk4NiAxMDMuOTNDODkuMzgzNyAxMTMuNDYxIDc1LjMyMjkgMTE5LjI2MyA1OS45MDEgMTE5LjI2M0MyNi44MTg2IDExOS4yNjMgMCA5Mi41NjQ5IDAgNTkuNjMxNEMwIDI2LjY5NzkgMjYuODE4NiAwIDU5LjkwMSAwQzc1LjMyMzIgMCA4OS4zODQxIDUuODAxOTUgMTAwLjAwMSAxNS4zMzI5QzExMC42MTYgNS44MDE3NyAxMjQuNjc3IDAgMTQwLjA5OSAwWk0xNDAuMDk5IDM5LjkxODVDMTI5LjE2MyAzOS45MTg1IDEyMC4yOTcgNDguNzQ0MyAxMjAuMjk3IDU5LjYzMTRDMTIwLjI5NyA3MC41MTg1IDEyOS4xNjMgNzkuMzQ0MiAxNDAuMDk5IDc5LjM0NDJDMTUxLjAzNSA3OS4zNDQyIDE1OS45MDEgNzAuNTE4NSAxNTkuOTAxIDU5LjYzMTRDMTU5LjkwMSA0OC43NDQzIDE1MS4wMzUgMzkuOTE4NSAxNDAuMDk5IDM5LjkxODVaTTU5LjkwMSAzOS45MTg1QzQ4Ljk2NDcgMzkuOTE4NSA0MC4wOTkgNDguNzQ0MyA0MC4wOTkgNTkuNjMxNEM0MC4wOTkgNzAuNTE4NSA0OC45NjQ3IDc5LjM0NDIgNTkuOTAxIDc5LjM0NDJDNzAuODM3MyA3OS4zNDQyIDc5LjcwMyA3MC41MTg1IDc5LjcwMyA1OS42MzE0Qzc5LjcwMyA0OC43NDQzIDcwLjgzNzMgMzkuOTE4NSA1OS45MDEgMzkuOTE4NVoiIGZpbGw9IiM2NzNBQjYiLz4KPC9zdmc+Cg==
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const ROUTE = 'routes/app/logs/devices.resources.logs';
  const PAGE_SIZE = 200;
  const MAX_PAGES = 1000;

  // ---------- Data ----------

  // Minimal decoder for Remix / React Router "turbo-stream" .data responses
  function decode(text) {
    const arr = JSON.parse(text.split('\n')[0]);
    const memo = new Map();
    const SPECIAL = { '-1': undefined, '-2': null, '-3': NaN, '-4': -Infinity, '-5': Infinity, '-6': -0, '-7': undefined };
    function h(i) {
      if (i < 0) return SPECIAL[i];
      if (memo.has(i)) return memo.get(i);
      const v = arr[i];
      if (v === null || typeof v !== 'object') { memo.set(i, v); return v; }
      if (Array.isArray(v)) {
        if (v[0] === 'D' && v.length === 2) { const d = new Date(v[1]); memo.set(i, d); return d; }
        const out = []; memo.set(i, out);
        for (const j of v) out.push(h(j));
        return out;
      }
      const o = {}; memo.set(i, o);
      for (const k in v) o[h(+k.slice(1))] = h(v[k]);
      return o;
    }
    return h(0);
  }

  function baseUrl() {
    const m = location.pathname.match(/^\/([^/]+)\/logs\/devices/);
    if (!m) return null;
    const u = new URL(location.origin + m[0] + '/resources/logs.data');
    new URLSearchParams(location.search).forEach((v, k) => u.searchParams.set(k, v));
    u.searchParams.set('orgId', m[1]);
    u.searchParams.set('limit', String(PAGE_SIZE));
    u.searchParams.set('_routes', ROUTE);
    return u;
  }

  async function fetchAll(onProgress) {
    const base = baseUrl();
    if (!base) throw new Error('Open Logs > Devices first');
    const all = [];
    const seen = new Set();
    let cursor = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const u = new URL(base);
      if (cursor) u.searchParams.set('cursor', cursor);
      const res = await fetch(u, { credentials: 'include' });
      const data = decode(await res.text())?.[ROUTE]?.data;
      if (!data?.page) {
        if (page === 0) throw new Error(data?.error || 'Unexpected response from Oolio Office');
        break; // the API returns 400 once past the last page
      }
      const { lines = [], nextCursor } = data.page;
      for (const l of lines) {
        const key = l.lineHash || JSON.stringify(l);
        if (!seen.has(key)) { seen.add(key); all.push(l); }
      }
      onProgress(all.length);
      if (!nextCursor || lines.length < PAGE_SIZE) break;
      cursor = nextCursor;
    }
    return all;
  }

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const toDate = ts => new Date(String(ts).replace(' UTC', 'Z').replace(' ', 'T'));
  function localTs(ts) {
    const d = toDate(ts);
    if (isNaN(d)) return ts;
    const p = new Intl.DateTimeFormat('en-AU', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(d)
      .reduce((a, x) => (a[x.type] = x.value, a), {});
    const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
    return `${p.year}-${p.month}-${p.day} ${p.hour === '24' ? '00' : p.hour}:${p.minute}:${p.second}.${ms}`;
  }

  function csvCell(v) {
    if (v === undefined || v === null) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCsv(lines) {
    const head = ['Time (' + tz + ')', 'Time (UTC)', 'Level', 'Tag', 'Device', 'Device Type', 'Message',
      'Order', 'User', 'Acting User', 'Device ID', 'Context'];
    const rows = lines.map(l => {
      const c = l.context || {};
      return [localTs(l.ts), l.ts, (l.level || '').toUpperCase(), l.tag, l.deviceName, l.deviceType, l.msg,
        c.orderNumber ?? c.orderId ?? '', c.userName ?? '', c.actingUserName ?? '', l.deviceId, c];
    });
    return '﻿' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
  }

  function save(content, name, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function fileStem() {
    const q = new URLSearchParams(location.search);
    const f = q.get('from') ? localTs(q.get('from')).slice(0, 16) : '';
    const t = q.get('to') ? localTs(q.get('to')).slice(0, 16) : '';
    return ['oolio-device-logs', f, t].filter(Boolean).join('_').replace(/[^\w\-]+/g, '-').replace(/-+/g, '-');
  }

  // ---------- UI (Oolio brand: purple-first, Inter, Lucide line icons) ----------

  const LOGOMARK = '<svg viewBox="0 0 200 120" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M140.099 0C173.181 0 200 26.6979 200 59.6314C200 92.5649 173.181 119.263 140.099 119.263C124.677 119.263 110.616 113.461 99.9986 103.93C89.3837 113.461 75.3229 119.263 59.901 119.263C26.8186 119.263 0 92.5649 0 59.6314C0 26.6979 26.8186 0 59.901 0C75.3232 0 89.3841 5.80195 100.001 15.3329C110.616 5.80177 124.677 0 140.099 0ZM140.099 39.9185C129.163 39.9185 120.297 48.7443 120.297 59.6314C120.297 70.5185 129.163 79.3442 140.099 79.3442C151.035 79.3442 159.901 70.5185 159.901 59.6314C159.901 48.7443 151.035 39.9185 140.099 39.9185ZM59.901 39.9185C48.9647 39.9185 40.099 48.7443 40.099 59.6314C40.099 70.5185 48.9647 79.3442 59.901 79.3442C70.8373 79.3442 79.703 70.5185 79.703 59.6314C79.703 48.7443 70.8373 39.9185 59.901 39.9185Z"/></svg>';
  const lucide = inner => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const ICON = {
    download: lucide('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>'),
    sheet: lucide('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>'),
    json: lucide('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1"/><path d="M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1"/>'),
    loader: lucide('<path d="M21 12a9 9 0 1 1-6.219-8.56"/>'),
    check: lucide('<path d="M20 6 9 17l-5-5"/>'),
    alert: lucide('<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>'),
    chevron: lucide('<path d="m18 15-6-6-6 6"/>'),
  };

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; }
    .wrap { position: fixed; right: 24px; bottom: 24px; z-index: 2147483000; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
    svg { width: 16px; height: 16px; flex: none; display: block; }

    .fab { display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 16px 0 14px; border: 0; border-radius: 999px;
      background: #673AB6; color: #fff; cursor: pointer; font-size: 14px; font-weight: 700; letter-spacing: -0.01em;
      box-shadow: 0 6px 20px rgba(103,58,182,.35), 0 1px 3px rgba(34,34,34,.2); transition: background .15s, transform .15s; }
    .fab:hover { background: #5E35B1; transform: translateY(-1px); }
    .fab:focus-visible, .item:focus-visible { outline: 2px solid #03A9F4; outline-offset: 2px; }
    .fab .mark { width: 24px; height: auto; }
    .fab .sep { width: 1px; height: 18px; background: rgba(255,255,255,.35); }
    .fab .chev { width: 14px; height: 14px; opacity: .8; transition: transform .15s; }
    .wrap.open .fab .chev { transform: rotate(180deg); }
    .fab[disabled] { cursor: progress; }

    .menu { width: 260px; background: #fff; border-radius: 14px; padding: 6px; display: none;
      box-shadow: 0 12px 32px rgba(34,34,34,.18), 0 0 0 1px rgba(34,34,34,.06); }
    .wrap.open .menu { display: block; }
    .hint { padding: 8px 10px 6px; font-size: 12px; line-height: 1.4; color: #808080; }
    .item { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px; border: 0; border-radius: 10px;
      background: transparent; cursor: pointer; text-align: left; color: #222; }
    .item:hover { background: #F3EEF9; }
    .item .ic { width: 34px; height: 34px; border-radius: 9px; background: #F3EEF9; color: #673AB6; display: grid; place-items: center; }
    .item:hover .ic { background: #fff; }
    .item b { display: block; font-size: 14px; font-weight: 700; }
    .item span { display: block; font-size: 12px; color: #808080; margin-top: 1px; }

    .toast { display: none; align-items: center; gap: 8px; max-width: 320px; padding: 10px 14px; border-radius: 12px;
      background: #222; color: #fff; font-size: 13px; font-weight: 500; box-shadow: 0 6px 20px rgba(34,34,34,.25); }
    .toast.show { display: flex; }
    .toast.ok svg { color: #03A9F4; }
    .toast.err svg { color: #FFEB3B; }
    .spin { animation: spin .9s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;

  let host = null;

  function mount() {
    host = document.createElement('div');
    host.id = 'oolio-logs-download';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>${CSS}</style>
      <div class="wrap">
        <div class="toast" role="status" aria-live="polite"></div>
        <div class="menu" role="menu">
          <div class="hint">Exports every line matching your current filters, not just what's on screen.</div>
          <button class="item" role="menuitem" data-fmt="csv"><div class="ic">${ICON.sheet}</div><div><b>CSV</b><span>Opens in Excel</span></div></button>
          <button class="item" role="menuitem" data-fmt="json"><div class="ic">${ICON.json}</div><div><b>JSON</b><span>Full detail, for engineering</span></div></button>
        </div>
        <button class="fab" aria-haspopup="menu" aria-expanded="false" title="Download device logs">
          <span class="mark">${LOGOMARK}</span><span class="sep"></span>${ICON.download}<span class="label">Download logs</span><span class="chev">${ICON.chevron}</span>
        </button>
      </div>`;

    const wrap = root.querySelector('.wrap');
    const fab = root.querySelector('.fab');
    const toast = root.querySelector('.toast');
    let hideTimer;

    const setOpen = open => { wrap.classList.toggle('open', open); fab.setAttribute('aria-expanded', String(open)); };
    const showToast = (kind, icon, text, autoHide) => {
      clearTimeout(hideTimer);
      toast.className = 'toast show ' + kind;
      toast.innerHTML = icon + '<span></span>';
      toast.querySelector('span').textContent = text;
      if (icon === ICON.loader) toast.querySelector('svg').classList.add('spin');
      if (autoHide) hideTimer = setTimeout(() => toast.classList.remove('show'), autoHide);
    };

    fab.addEventListener('click', () => setOpen(!wrap.classList.contains('open')));
    document.addEventListener('click', e => { if (!e.composedPath().includes(host)) setOpen(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

    root.querySelectorAll('.item').forEach(btn => btn.addEventListener('click', async () => {
      const fmt = btn.dataset.fmt;
      setOpen(false);
      fab.disabled = true;
      showToast('busy', ICON.loader, 'Fetching logs…');
      try {
        const lines = await fetchAll(n => showToast('busy', ICON.loader, `Fetching logs… ${n.toLocaleString('en-AU')} lines`));
        lines.sort((a, b) => toDate(a.ts) - toDate(b.ts));
        if (fmt === 'csv') save(toCsv(lines), fileStem() + '.csv', 'text/csv;charset=utf-8');
        else save(JSON.stringify(lines, null, 2), fileStem() + '.json', 'application/json');
        showToast('ok', ICON.check, `Saved ${lines.length.toLocaleString('en-AU')} lines as ${fmt.toUpperCase()}`, 4000);
      } catch (e) {
        showToast('err', ICON.alert, e.message, 8000);
      } finally {
        fab.disabled = false;
      }
    }));

    document.body.appendChild(host);
  }

  function loadInter() {
    if (document.getElementById('oolio-inter-font')) return;
    const l = document.createElement('link');
    l.id = 'oolio-inter-font';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap';
    document.head.appendChild(l);
  }

  function sync() {
    const onPage = /\/logs\/devices/.test(location.pathname);
    if (onPage && !(host && document.body.contains(host))) { loadInter(); mount(); }
    if (!onPage && host) { host.remove(); host = null; }
  }

  setInterval(sync, 1000); // Oolio Office is a single-page app
  sync();
})();
