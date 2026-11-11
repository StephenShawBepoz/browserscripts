// ==UserScript==
// @name         HubSpot: Quick set
// @namespace    oolio-userscripts
// @version      0.1.0
// @description  An orange box on BP Implementation tickets to set the Implementation Category, Ticket owner, Install and Go Live dates and Installers in one go, with the Accounts Status alongside.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/quick-set.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/quick-set.user.js
// @match        https://app.hubspot.com/help-desk/*
// @match        https://app.hubspot.com/contacts/*
// @match        https://oolio-hubspot-addons.vercel.app/*
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTQwLjA5OSAwQzE3My4xODEgMCAyMDAgMjYuNjk3OSAyMDAgNTkuNjMxNEMyMDAgOTIuNTY0OSAxNzMuMTgxIDExOS4yNjMgMTQwLjA5OSAxMTkuMjYzQzEyNC42NzcgMTE5LjI2MyAxMTAuNjE2IDExMy40NjEgOTkuOTk4NiAxMDMuOTNDODkuMzgzNyAxMTMuNDYxIDc1LjMyMjkgMTE5LjI2MyA1OS45MDEgMTE5LjI2M0MyNi44MTg2IDExOS4yNjMgMCA5Mi41NjQ5IDAgNTkuNjMxNEMwIDI2LjY5NzkgMjYuODE4NiAwIDU5LjkwMSAwQzc1LjMyMzIgMCA4OS4zODQxIDUuODAxOTUgMTAwLjAwMSAxNS4zMzI5QzExMC42MTYgNS44MDE3NyAxMjQuNjc3IDAgMTQwLjA5OSAwWk0xNDAuMDk5IDM5LjkxODVDMTI5LjE2MyAzOS45MTg1IDEyMC4yOTcgNDguNzQ0MyAxMjAuMjk3IDU5LjYzMTRDMTIwLjI5NyA3MC41MTg1IDEyOS4xNjMgNzkuMzQ0MiAxNDAuMDk5IDc5LjM0NDJDMTUxLjAzNSA3OS4zNDQyIDE1OS45MDEgNzAuNTE4NSAxNTkuOTAxIDU5LjYzMTRDMTU5LjkwMSA0OC43NDQzIDE1MS4wMzUgMzkuOTE4NSAxNDAuMDk5IDM5LjkxODVaTTU5LjkwMSAzOS45MTg1QzQ4Ljk2NDcgMzkuOTE4NSA0MC4wOTkgNDguNzQ0MyA0MC4wOTkgNTkuNjMxNEM0MC4wOTkgNzAuNTE4NSA0OC45NjQ3IDc5LjM0NDIgNTkuOTAxIDc5LjM0NDJDNzAuODM3MyA3OS4zNDQyIDc5LjcwMyA3MC41MTg1IDc5LjcwMyA1OS42MzE0Qzc5LjcwMyA0OC43NDQzIDcwLjgzNzMgMzkuOTE4NSA1OS45MDEgMzkuOTE4NVoiIGZpbGw9IiM2NzNBQjYiLz4KPC9zdmc+Cg==
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  // On the HubSpot add-ons page, just say this script is installed (and which version), then stop
  if (location.hostname === 'oolio-hubspot-addons.vercel.app') {
    const v = typeof GM_info !== 'undefined' && GM_info.script ? GM_info.script.version : '';
    document.documentElement.setAttribute('data-installed-quick-set', v || 'yes');
    document.dispatchEvent(new Event('zoo:installed'));
    return;
  }

  // A second copy (installed twice) stays out of the way
  if (window.__oolioQuickSet) return;
  window.__oolioQuickSet = true;

  /* ---------------- Things you might want to change ---------------- */

  // The fields in the box, top to bottom. "owner" fields pick a HubSpot user, "date" fields a day; "list" fields
  // are drop-downs whose choices come from HubSpot, so a new category shows up here by itself.
  const FIELDS = [
    { name: 'bp___implementation_category', label: 'BP | Implementation Category', kind: 'list' },
    { name: 'hubspot_owner_id', label: 'Ticket owner', kind: 'owner' },
    { name: 'accounts_status', label: 'Accounts Status', kind: 'list', viewOnly: true }, // shown, never changed here (Accounts own it)
    { name: 'install_date', label: 'Install Date', kind: 'date' },
    { name: 'go_live_date', label: 'Go Live Date', kind: 'date' },
    { name: 'installer', label: 'Installer', kind: 'owner' },
    { name: 'installer_2', label: 'Installer 2', kind: 'owner' },
    { name: 'installer_3', label: 'Installer 3', kind: 'owner' },
    { name: 'installer_4', label: 'Installer 4', kind: 'owner', extra: true },
    { name: 'installer_5', label: 'Installer 5', kind: 'owner', extra: true },
  ];

  // Tickets in these pipelines get the orange button (Tampermonkey menu: "Show on every ticket" for all)
  const PIPELINES = /^BP \| (Implementation|Add Ons|Upgrades)/i;

  // People in a HubSpot team starting with this are listed first when picking someone
  const MY_TEAMS = /^BP \|/;

  const OWNERS_KEEP_MS = 12 * 60 * 60 * 1000; // the list of HubSpot users is remembered for 12 hours
  const SHORTCUT = 'KeyQ'; // Alt + Q (Option + Q on a Mac) opens and closes the box

  const ORANGE = '#ff7a1a';
  const ORANGE_DARK = '#e2620a';

  const gmGet = (k, d) => (typeof GM_getValue === 'function' ? GM_getValue(k, d) : d);
  const gmSet = (k, v) => { if (typeof GM_setValue === 'function') GM_setValue(k, v); };

  // Search the browser console for "Oolio quick set" to see why something didn't work
  const log = (...a) => console.info('[Oolio quick set]', ...a);

  // ---------- Helpers ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // HubSpot may require Trusted Types for innerHTML
  let ttPolicy = null;
  try {
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      ttPolicy = window.trustedTypes.createPolicy('oolio-quick-set', { createHTML: (s) => s });
    }
  } catch (e) { log('Trusted Types policy blocked:', e.message); }
  const setHTML = (el, html) => { el.innerHTML = ttPolicy ? ttPolicy.createHTML(html) : html; };

  // The ticket on screen: Help Desk, or the ticket's record page
  function getTicket() {
    let m = location.pathname.match(/^\/help-desk\/(\d+)\/(?:.*\/)?ticket\/(\d+)/);
    if (m) return { portal: m[1], id: m[2], helpDesk: true };
    m = location.pathname.match(/^\/contacts\/(\d+)\/(?:record\/0-5|ticket)\/(\d+)/);
    if (m) return { portal: m[1], id: m[2], helpDesk: false };
    return null;
  }

  /* ---------------- HubSpot, with your login ---------------- */
  // The same calls HubSpot's own pages make. Nothing changes in HubSpot until you click Save.

  function csrf() {
    const m = document.cookie.match(/(?:^|;\s*)hubspotapi-csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }
  async function hubspot(path, portal, { method = 'GET', body } = {}) {
    const url = `${location.origin}/api/${path}${path.includes('?') ? '&' : '?'}portalId=${portal}`;
    let err;
    for (let attempt = 0; attempt < 2; attempt++) {
      const headers = { Accept: 'application/json', 'X-HubSpot-CSRF-hubspotapi': csrf() };
      if (body) headers['Content-Type'] = 'application/json';
      const res = await fetch(url, { method, credentials: 'include', headers, body: body ? JSON.stringify(body) : undefined });
      if (res.ok) return res.status === 204 ? null : res.json().catch(() => null);
      const text = await res.text().catch(() => '');
      err = new Error(`HubSpot replied ${res.status}${text ? ': ' + text.slice(0, 160) : ''}`);
      if (res.status !== 403) break; // a 403 can be a stale login token after idle, so try once more
      await new Promise((r) => setTimeout(r, 600));
    }
    throw err;
  }

  async function readTicket(t) {
    const props = ['hs_pipeline', 'subject', ...FIELDS.map((f) => f.name)].join(',');
    const d = await hubspot(`crm/v3/objects/0-5/${t.id}?properties=${props}`, t.portal);
    return (d && d.properties) || {};
  }

  const pipelineCache = {};
  async function pipelineName(t, id) {
    if (!id) return '';
    if (!pipelineCache[t.portal]) {
      pipelineCache[t.portal] = hubspot('crm-pipelines/v1/pipelines/0-5', t.portal)
        .then((d) => {
          const list = Array.isArray(d) ? d : (d && d.results) || [];
          return Object.fromEntries(list.map((p) => [String(p.pipelineId), p.label]));
        })
        .catch((e) => { delete pipelineCache[t.portal]; throw e; });
    }
    return (await pipelineCache[t.portal])[id] || '';
  }

  // Drop-down choices for the "list" fields, straight from HubSpot
  const optionsCache = {};
  function listOptions(t, name) {
    if (!optionsCache[name]) {
      optionsCache[name] = hubspot(`crm/v3/properties/0-5/${name}`, t.portal)
        .then((d) => ((d && d.options) || []).filter((o) => !o.hidden).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)))
        .catch((e) => { delete optionsCache[name]; throw e; });
    }
    return optionsCache[name];
  }

  // Every HubSpot user, sorted: your BP teams first, then everyone else
  let ownersPromise = null;
  function owners(t) {
    if (ownersPromise) return ownersPromise;
    const kept = gmGet('owners', null);
    if (kept && kept.portal === t.portal && Date.now() - kept.at < OWNERS_KEEP_MS && kept.list && kept.list.length) {
      ownersPromise = Promise.resolve(kept.list);
      return ownersPromise;
    }
    ownersPromise = (async () => {
      const list = [];
      let after = '';
      for (let page = 0; page < 20; page++) {
        const d = await hubspot(`crm/v3/owners?limit=500${after ? '&after=' + encodeURIComponent(after) : ''}`, t.portal);
        ((d && d.results) || []).forEach((o) => {
          const name = [o.firstName, o.lastName].filter(Boolean).join(' ').trim() || o.email || `User ${o.id}`;
          const team = ((o.teams || []).find((x) => x.primary) || (o.teams || [])[0] || {}).name || '';
          list.push({ id: String(o.id), name, email: o.email || '', team, mine: (o.teams || []).some((x) => MY_TEAMS.test(x.name || '')) });
        });
        after = d && d.paging && d.paging.next ? d.paging.next.after : '';
        if (!after) break;
      }
      list.sort((a, b) => (b.mine - a.mine) || a.name.localeCompare(b.name));
      gmSet('owners', { portal: t.portal, at: Date.now(), list });
      return list;
    })().catch((e) => { ownersPromise = null; throw e; });
    return ownersPromise;
  }

  /* ---------------- Look ---------------- */

  function addStyles() {
    if (document.getElementById('oolio-qs-style')) return;
    const s = document.createElement('style');
    s.id = 'oolio-qs-style';
    s.textContent = `
      .oolio-qs-btn { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
        background: ${ORANGE}; color: #fff; font: 600 13px/1 "Lexend Deca", Helvetica, Arial, sans-serif; padding: 7px 12px;
        border-radius: 999px; box-shadow: 0 1px 3px rgba(0,0,0,.18); }
      .oolio-qs-btn:hover { background: ${ORANGE_DARK}; }
      .oolio-qs-btn:focus-visible { outline: 2px solid #2d3e50; outline-offset: 2px; }
      .oolio-qs-btn svg { width: 14px; height: 14px; }
      .oolio-qs-row { margin: 8px 0 4px; align-self: flex-start; }
      .oolio-qs-float { position: fixed; z-index: 2147483000; left: 50%; transform: translateX(-50%); bottom: 18px; }

      .oolio-qs-box { position: fixed; z-index: 2147483001; top: 72px; right: 24px; width: 380px; max-height: calc(100vh - 96px);
        display: flex; flex-direction: column; background: #fff; border: 3px solid ${ORANGE}; border-radius: 12px;
        box-shadow: 0 12px 40px rgba(0,0,0,.28); font: 14px/1.35 "Lexend Deca", Helvetica, Arial, sans-serif; color: #33475b; }
      .oolio-qs-head { display: flex; align-items: center; gap: 8px; background: ${ORANGE}; color: #fff; padding: 10px 12px; border-radius: 8px 8px 0 0; cursor: move; user-select: none; }
      .oolio-qs-head svg { width: 16px; height: 16px; flex: none; }
      .oolio-qs-head b { font-size: 15px; flex: none; }
      .oolio-qs-head .sub { opacity: .9; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
      .oolio-qs-x { all: unset; cursor: pointer; font-size: 20px; line-height: 1; padding: 0 4px; }
      .oolio-qs-body { padding: 10px 12px 4px; overflow: auto; }
      .oolio-qs-f { display: grid; grid-template-columns: 128px 1fr; align-items: center; gap: 8px; margin-bottom: 8px; }
      .oolio-qs-f[hidden] { display: none; }
      .oolio-qs-f label { font-size: 12px; font-weight: 600; color: #516f90; }
      .oolio-qs-f.changed label { color: ${ORANGE_DARK}; }
      .oolio-qs-f.changed label::after { content: " •"; }
      .oolio-qs-f select, .oolio-qs-f input { box-sizing: border-box; width: 100%; height: 32px; padding: 4px 8px; border: 1px solid #cbd6e2;
        border-radius: 6px; background: #f5f8fa; font: inherit; font-size: 13px; color: #33475b; }
      .oolio-qs-f select:focus, .oolio-qs-f input:focus { outline: none; border-color: ${ORANGE}; box-shadow: 0 0 0 2px rgba(255,122,26,.25); background: #fff; }
      .oolio-qs-view { display: flex; align-items: center; min-height: 32px; padding: 0 8px; border: 1px dashed #cbd6e2; border-radius: 6px;
        box-sizing: border-box; font-size: 13px; color: #33475b; background: #fff; cursor: default; }
      .oolio-qs-pick { position: relative; display: flex; gap: 4px; }
      .oolio-qs-clear { all: unset; cursor: pointer; color: #7c98b6; padding: 0 4px; font-size: 16px; }
      .oolio-qs-clear:hover { color: #33475b; }
      .oolio-qs-menu { position: fixed; z-index: 2147483002; max-height: 240px; overflow: auto; background: #fff;
        border: 1px solid #cbd6e2; border-radius: 6px; box-shadow: 0 6px 18px rgba(0,0,0,.15); }
      .oolio-qs-menu div { padding: 6px 8px; cursor: pointer; font-size: 13px; }
      .oolio-qs-menu div small { color: #7c98b6; margin-left: 6px; }
      .oolio-qs-menu div.on { background: #fff1e6; }
      .oolio-qs-menu .grp { cursor: default; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #7c98b6; background: #f5f8fa; }
      .oolio-qs-more { all: unset; cursor: pointer; color: ${ORANGE_DARK}; font-size: 12px; font-weight: 600; margin: 0 0 8px 136px; }
      .oolio-qs-foot { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-top: 1px solid #eaf0f6; }
      .oolio-qs-msg { flex: 1; font-size: 12px; color: #516f90; }
      .oolio-qs-msg.err { color: #d93f4c; }
      .oolio-qs-msg.ok { color: #00a36c; }
      .oolio-qs-save { all: unset; cursor: pointer; background: ${ORANGE}; color: #fff; font-weight: 600; font-size: 13px; padding: 8px 14px; border-radius: 6px; }
      .oolio-qs-save[disabled] { opacity: .45; cursor: default; }
      .oolio-qs-save:not([disabled]):hover { background: ${ORANGE_DARK}; }
      .oolio-qs-link { all: unset; cursor: pointer; color: #0091ae; font-size: 12px; text-decoration: underline; }
    `;
    document.head.appendChild(s);
  }

  const PENCIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

  /* ---------------- The orange button ---------------- */

  let state = { key: '', ticket: null, props: null, show: false };

  function button() {
    let b = document.getElementById('oolio-qs-open');
    if (!b) {
      b = document.createElement('button');
      b.id = 'oolio-qs-open';
      b.type = 'button';
      b.className = 'oolio-qs-btn';
      b.title = 'Set the category, owner, accounts status and installers (Alt + Q)';
      setHTML(b, `${PENCIL}<span>Quick set</span>`);
      b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleBox(); });
    }
    return b;
  }

  // Under Pipeline / Ticket status: in the left panel of a ticket record, in the right sidebar in Help Desk.
  // Floats at the bottom of the screen if HubSpot moves things. (HubSpot's markers, checked November 2026.)
  const RECORD_SPOT = '[data-test-id="properties-list"]';
  const HELPDESK_SPOT = '[data-test-id="ticket-header-stage-dropdown"]';
  function placeButton() {
    const b = button();
    if (!state.show) { const w = b.parentElement; if (w && w.classList.contains('oolio-qs-wrap')) w.remove(); else b.remove(); return; }
    const anchor = document.querySelector(state.ticket.helpDesk ? HELPDESK_SPOT : RECORD_SPOT);
    let wrap = b.parentElement && b.parentElement.classList.contains('oolio-qs-wrap') ? b.parentElement : null;
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'oolio-qs-wrap'; wrap.appendChild(b); }
    if (anchor) {
      wrap.className = 'oolio-qs-wrap oolio-qs-row';
      if (anchor.nextElementSibling !== wrap) anchor.insertAdjacentElement('afterend', wrap);
    } else {
      wrap.className = 'oolio-qs-wrap oolio-qs-float';
      if (wrap.parentElement !== document.body) document.body.appendChild(wrap);
    }
  }

  async function onPage() {
    const t = getTicket();
    const key = t ? `${t.portal}/${t.id}` : '';
    if (key !== state.key) {
      state = { key, ticket: t, props: null, show: false };
      closeBox();
      if (t) {
        try {
          const props = await readTicket(t);
          if (state.key !== key) return;
          state.props = props;
          const pipe = await pipelineName(t, props.hs_pipeline);
          if (state.key !== key) return;
          state.show = gmGet('everyTicket', false) || PIPELINES.test(pipe);
          log(`ticket ${t.id} in "${pipe}"`, state.show ? '' : '(not a BP Implementation pipeline, button hidden)');
        } catch (e) { log('could not read the ticket:', e.message); }
      }
    }
    placeButton();
  }

  /* ---------------- The box ---------------- */

  let box = null;
  let fieldState = {}; // name -> { start, now }

  function closeBox() { if (box) { box.remove(); box = null; } }
  function toggleBox() { if (box) closeBox(); else openBox(); }

  async function openBox() {
    const t = state.ticket;
    if (!t) return;
    addStyles();
    closeBox();
    box = document.createElement('div');
    box.className = 'oolio-qs-box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Quick set');
    setHTML(box, `
      <div class="oolio-qs-head">${PENCIL}<b>Quick set</b><span class="sub"></span><button class="oolio-qs-x" title="Close (Esc)" aria-label="Close">×</button></div>
      <div class="oolio-qs-body"><div class="oolio-qs-msg">Loading…</div></div>
      <div class="oolio-qs-foot"><span class="oolio-qs-msg"></span><button class="oolio-qs-save" disabled>Save</button></div>`);
    document.body.appendChild(box);
    box.querySelector('.oolio-qs-x').addEventListener('click', closeBox);
    box.querySelector('.oolio-qs-save').addEventListener('click', save);
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !box.querySelector('.oolio-qs-menu')) { e.stopPropagation(); closeBox(); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
    });
    dragBy(box.querySelector('.oolio-qs-head'), box);

    const myBox = box;
    try {
      const [props, people, ...lists] = await Promise.all([
        readTicket(t), owners(t),
        ...FIELDS.map((f) => (f.kind === 'list' ? listOptions(t, f.name) : null)),
      ]);
      if (box !== myBox) return;
      state.props = props;
      box.querySelector('.sub').textContent = props.subject || `Ticket ${t.id}`;
      fieldState = {};
      const body = box.querySelector('.oolio-qs-body');
      setHTML(body, '');
      const extraSet = FIELDS.some((f) => f.extra && props[f.name]);
      FIELDS.forEach((f, i) => {
        if (f.extra && !extraSet && f === FIELDS.find((x) => x.extra)) {
          const more = document.createElement('button');
          more.className = 'oolio-qs-more';
          more.textContent = '+ More installers';
          more.addEventListener('click', () => { box.querySelectorAll('[data-extra]').forEach((r) => { r.hidden = false; }); more.remove(); });
          body.appendChild(more);
        }
        const row = document.createElement('div');
        row.className = 'oolio-qs-f';
        row.dataset.name = f.name;
        if (f.extra) { row.dataset.extra = '1'; row.hidden = !extraSet; }
        const id = `oolio-qs-${f.name}`;
        setHTML(row, `<label for="${id}">${esc(f.label)}</label>`);
        const start = props[f.name] || '';
        if (f.viewOnly) {
          const opt = (lists[i] || []).find((o) => o.value === start);
          const v = document.createElement('span');
          v.id = id;
          v.className = 'oolio-qs-view';
          v.title = 'View only. Accounts set this one.';
          v.textContent = start ? (opt ? opt.label : start) : '—';
          row.appendChild(v);
          body.appendChild(row);
          return;
        }
        fieldState[f.name] = { start, now: start };
        const onChange = (v) => { fieldState[f.name].now = v; row.classList.toggle('changed', v !== start); refreshSave(); };
        row.appendChild(f.kind === 'owner' ? ownerPicker(id, people, start, onChange)
          : f.kind === 'date' ? datePicker(id, start, onChange)
          : listPicker(id, lists[i] || [], start, onChange));
        body.appendChild(row);
      });
      const first = body.querySelector('select, input');
      if (first) first.focus();
      refreshSave();
    } catch (e) {
      if (box !== myBox) return;
      log('could not load the box:', e);
      const m = box.querySelector('.oolio-qs-body .oolio-qs-msg');
      m.className = 'oolio-qs-msg err';
      m.textContent = `Couldn't load from HubSpot. ${e.message}`;
    }
  }

  function listPicker(id, options, start, onChange) {
    const sel = document.createElement('select');
    sel.id = id;
    const opts = [{ value: '', label: '—' }, ...options];
    if (start && !options.some((o) => o.value === start)) opts.push({ value: start, label: `${start} (no longer a choice)` });
    setHTML(sel, opts.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join(''));
    sel.value = start;
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }

  // HubSpot keeps a date as YYYY-MM-DD, the same as the browser's date picker
  function datePicker(id, start, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'oolio-qs-pick';
    const input = document.createElement('input');
    input.id = id;
    input.type = 'date';
    input.value = /^\d{4}-\d{2}-\d{2}/.test(start) ? start.slice(0, 10) : '';
    const begin = input.value;
    input.addEventListener('change', () => onChange(input.value === begin ? start : input.value));
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'oolio-qs-clear';
    clear.title = 'Clear';
    clear.textContent = '×';
    clear.addEventListener('click', () => { input.value = ''; onChange(''); input.focus(); });
    wrap.append(input, clear);
    return wrap;
  }

  // Type a name to search; Enter picks the top match, arrows move, Esc gives up
  function ownerPicker(id, people, start, onChange) {
    const byId = new Map(people.map((p) => [p.id, p]));
    const nameOf = (v) => (!v ? '' : byId.has(v) ? byId.get(v).name : `User ${v} (inactive)`);
    const wrap = document.createElement('div');
    wrap.className = 'oolio-qs-pick';
    const input = document.createElement('input');
    input.id = id;
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = 'Type a name…';
    let value = start;
    input.value = nameOf(value);
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'oolio-qs-clear';
    clear.title = 'Clear';
    clear.textContent = '×';
    wrap.append(input, clear);

    let menu = null; let matches = []; let at = 0;
    const set = (v) => { value = v; input.value = nameOf(v); onChange(v); };
    const close = () => { if (menu) { menu.remove(); menu = null; } };
    // Floats over the page so the box doesn't clip it; opens upwards when there's no room below
    const place = () => {
      if (!menu) return;
      const r = input.getBoundingClientRect();
      const below = innerHeight - r.bottom - 8;
      menu.style.left = `${r.left}px`;
      menu.style.width = `${r.width + 24}px`;
      if (below >= 160 || below >= r.top) { menu.style.top = `${r.bottom + 2}px`; menu.style.bottom = ''; menu.style.maxHeight = `${Math.min(240, below)}px`; }
      else { menu.style.bottom = `${innerHeight - r.top + 2}px`; menu.style.top = ''; menu.style.maxHeight = `${Math.min(240, r.top - 8)}px`; }
    };
    document.addEventListener('scroll', (e) => { if (menu && e.target !== menu) place(); }, true);
    let typed = false; // false: list everyone (just focused); true: filter by what's typed
    const draw = () => {
      const q = typed ? fold(input.value).trim() : '';
      const words = q.split(/\s+/).filter(Boolean);
      matches = people.filter((p) => { const h = fold(`${p.name} ${p.email}`); return words.every((w) => h.includes(w)); });
      if (typed) matches = matches.slice(0, 60);
      at = Math.min(at, Math.max(0, matches.length - 1));
      if (!menu) { menu = document.createElement('div'); menu.className = 'oolio-qs-menu'; wrap.appendChild(menu); }
      place();
      let html = ''; let lastMine = null;
      matches.forEach((p, i) => {
        if (p.mine !== lastMine) { html += `<div class="grp">${p.mine ? 'Bepoz teams' : 'Everyone else'}</div>`; lastMine = p.mine; }
        html += `<div data-i="${i}" class="${i === at ? 'on' : ''}">${esc(p.name)}<small>${esc(p.team)}</small></div>`;
      });
      setHTML(menu, html || '<div class="grp">No one by that name</div>');
      const on = menu.querySelector('.on');
      if (on) on.scrollIntoView({ block: 'nearest' });
    };
    input.addEventListener('focus', () => {
      typed = false;
      at = Math.max(0, people.findIndex((p) => p.id === value)); // start on the person already set
      input.select();
      draw();
    });
    input.addEventListener('input', () => { typed = true; at = 0; draw(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!menu) draw(); at = Math.max(0, Math.min(matches.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1))); draw(); }
      else if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); if (menu && matches[at]) { set(matches[at].id); close(); } }
      else if (e.key === 'Escape' && menu) { e.preventDefault(); e.stopPropagation(); input.value = nameOf(value); close(); }
      else if (e.key === 'Tab') { if (menu && typed && input.value.trim() && matches[at]) set(matches[at].id); close(); }
    });
    input.addEventListener('blur', () => setTimeout(() => {
      if (!wrap.contains(document.activeElement)) {
        if (!input.value.trim() && value) set(''); else input.value = nameOf(value);
        close();
      }
    }, 120));
    wrap.addEventListener('mousedown', (e) => {
      const row = e.target.closest('.oolio-qs-menu div[data-i]');
      if (!row) return;
      e.preventDefault();
      set(matches[Number(row.dataset.i)].id);
      close();
    });
    clear.addEventListener('click', () => { set(''); input.focus(); });
    return wrap;
  }

  function changes() {
    const out = {};
    Object.entries(fieldState).forEach(([k, s]) => { if (s.now !== s.start) out[k] = s.now; });
    return out;
  }
  function refreshSave() {
    if (!box) return;
    const n = Object.keys(changes()).length;
    const b = box.querySelector('.oolio-qs-save');
    b.disabled = !n;
    b.textContent = n ? `Save ${n} change${n === 1 ? '' : 's'}` : 'Save';
    const m = box.querySelector('.oolio-qs-foot .oolio-qs-msg');
    if (n && !m.classList.contains('err')) { m.className = 'oolio-qs-msg'; m.textContent = ''; }
  }

  let saving = false;
  async function save() {
    const t = state.ticket;
    const props = changes();
    if (!box || !t || saving || !Object.keys(props).length) return;
    saving = true;
    const b = box.querySelector('.oolio-qs-save');
    const m = box.querySelector('.oolio-qs-foot .oolio-qs-msg');
    b.disabled = true;
    b.textContent = 'Saving…';
    try {
      await hubspot(`crm/v3/objects/0-5/${t.id}`, t.portal, { method: 'PATCH', body: { properties: props } });
      log('saved', props);
      Object.values(fieldState).forEach((s) => { s.start = s.now; });
      box.querySelectorAll('.oolio-qs-f.changed').forEach((r) => r.classList.remove('changed'));
      refreshSave();
      m.className = 'oolio-qs-msg ok';
      setHTML(m, `Saved. HubSpot shows it after a <button class="oolio-qs-link">refresh</button>.`);
      m.querySelector('.oolio-qs-link').addEventListener('click', () => location.reload());
    } catch (e) {
      log('save failed:', e);
      m.className = 'oolio-qs-msg err';
      m.textContent = `Not saved. ${e.message}`;
      refreshSave();
    } finally {
      saving = false;
    }
  }

  // Drag the box by its orange header; it remembers where you left it
  function dragBy(handle, el) {
    const pos = gmGet('boxPos', null);
    if (pos) { el.style.left = `${Math.min(pos.x, innerWidth - 120)}px`; el.style.top = `${Math.min(Math.max(0, pos.y), innerHeight - 60)}px`; el.style.right = 'auto'; }
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const dx = e.clientX - r.left; const dy = e.clientY - r.top;
      const move = (ev) => { el.style.left = `${ev.clientX - dx}px`; el.style.top = `${Math.max(0, ev.clientY - dy)}px`; el.style.right = 'auto'; };
      const up = () => {
        document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
        const nr = el.getBoundingClientRect(); gmSet('boxPos', { x: nr.left, y: nr.top });
      };
      document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    });
    handle.addEventListener('dblclick', () => { gmSet('boxPos', null); el.style.left = ''; el.style.top = ''; el.style.right = ''; });
  }

  /* ---------------- Start ---------------- */

  addStyles();
  document.addEventListener('keydown', (e) => {
    if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === SHORTCUT && state.ticket) { e.preventDefault(); toggleBox(); }
  }, true);

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand(`${gmGet('everyTicket', false) ? '✓ ' : ''}Show on every ticket (not just BP Implementation)`, () => {
      gmSet('everyTicket', !gmGet('everyTicket', false));
      location.reload();
    });
    GM_registerMenuCommand('Reload the list of people', () => { gmSet('owners', null); ownersPromise = null; });
  }

  let timer = null;
  const kick = () => { clearTimeout(timer); timer = setTimeout(onPage, 250); };
  new MutationObserver(kick).observe(document.body, { childList: true, subtree: true });
  kick();
})();
