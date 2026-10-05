// ==UserScript==
// @name         HubSpot: Status prompt after email
// @namespace    oolio-userscripts
// @version      1.2.0
// @description  After you send an email reply on a Help Desk ticket, asks what the ticket status should be. Enter sets the waiting status. Tab, the arrow keys or a number move the highlight. Esc keeps the current status.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/status-prompt.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/status-prompt.user.js
// @match        https://app.hubspot.com/help-desk/*
// @match        https://app.hubspot.com/contacts/*
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTQwLjA5OSAwQzE3My4xODEgMCAyMDAgMjYuNjk3OSAyMDAgNTkuNjMxNEMyMDAgOTIuNTY0OSAxNzMuMTgxIDExOS4yNjMgMTQwLjA5OSAxMTkuMjYzQzEyNC42NzcgMTE5LjI2MyAxMTAuNjE2IDExMy40NjEgOTkuOTk4NiAxMDMuOTNDODkuMzgzNyAxMTMuNDYxIDc1LjMyMjkgMTE5LjI2MyA1OS45MDEgMTE5LjI2M0MyNi44MTg2IDExOS4yNjMgMCA5Mi41NjQ5IDAgNTkuNjMxNEMwIDI2LjY5NzkgMjYuODE4NiAwIDU5LjkwMSAwQzc1LjMyMzIgMCA4OS4zODQxIDUuODAxOTUgMTAwLjAwMSAxNS4zMzI5QzExMC42MTYgNS44MDE3NyAxMjQuNjc3IDAgMTQwLjA5OSAwWk0xNDAuMDk5IDM5LjkxODVDMTI5LjE2MyAzOS45MTg1IDEyMC4yOTcgNDguNzQ0MyAxMjAuMjk3IDU5LjYzMTRDMTIwLjI5NyA3MC41MTg1IDEyOS4xNjMgNzkuMzQ0MiAxNDAuMDk5IDc5LjM0NDJDMTUxLjAzNSA3OS4zNDQyIDE1OS45MDEgNzAuNTE4NSAxNTkuOTAxIDU5LjYzMTRDMTU5LjkwMSA0OC43NDQzIDE1MS4wMzUgMzkuOTE4NSAxNDAuMDk5IDM5LjkxODVaTTU5LjkwMSAzOS45MTg1QzQ4Ljk2NDcgMzkuOTE4NSA0MC4wOTkgNDguNzQ0MyA0MC4wOTkgNTkuNjMxNEM0MC4wOTkgNzAuNTE4NSA0OC45NjQ3IDc5LjM0NDIgNTkuOTAxIDc5LjM0NDJDNzAuODM3MyA3OS4zNDQyIDc5LjcwMyA3MC41MTg1IDc5LjcwMyA1OS42MzE0Qzc5LjcwMyA0OC43NDQzIDcwLjgzNzMgMzkuOTE4NSA1OS45MDEgMzkuOTE4NVoiIGZpbGw9IiM2NzNBQjYiLz4KPC9zdmc+Cg==
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  /* ---------------- Things you might want to change ---------------- */

  // Highlighted when the prompt opens: the first of these found in the ticket's pipeline. They match the portal's
  // "Pending (Waiting on contact)", "Pending (Contact)" and "Pending (Waiting on Customer)" (checked October 2026).
  // If none match, the current status is highlighted, so Enter changes nothing.
  const DEFAULT_STATUS = [/waiting on contact/i, /^pending \(contact\)$/i, /waiting on customer/i];

  // Which replies bring up the prompt, by the name on the composer's channel button
  const CHANNELS = /^email$/i;

  const SEND_TIMEOUT_MS = 20000; // how long to wait for HubSpot to send
  const UNDO_MS = 8000; // how long Undo stays on screen
  const DETAILS_WAIT_MS = 120000; // how long to wait while you fill in HubSpot's box for a status that needs more details
  const LIST_WAIT_MS = 10000; // how long to wait for HubSpot to load the status list when it opens

  // HubSpot's own markers for the reply composer
  const SEND_SELECTOR = '[data-test-id="composer-send-button"]';
  const CHANNEL_SELECTOR = 'button[aria-label="Change channel"]';

  // Saved per person in Tampermonkey. Read fresh each time, so a change in one tab applies to all of them.
  const gmGet = (k, d) => (typeof GM_getValue === 'function' ? GM_getValue(k, d) : d);
  const gmSet = (k, v) => { if (typeof GM_setValue === 'function') GM_setValue(k, v); };
  const isEnabled = () => gmGet('enabled', true);
  const skipped = () => gmGet('skippedPipelines', []);

  // Search the browser console for "Oolio status prompt" to see why something didn't work
  const log = (...a) => console.info('[Oolio status prompt]', ...a);

  // ---------- Helpers ----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function waitFor(fn, timeout = 3000, every = 80) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const v = fn();
      if (v) return v;
      await sleep(every);
    }
    return null;
  }
  // HubSpot labels can carry zero-width spaces (one stage is "At Risk" plus one)
  const clean = (s) => (s || '').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '').replace(/\s+/g, ' ').trim();

  function ticketId() {
    const m = location.pathname.match(/\/ticket\/(\d+)/) || location.pathname.match(/\/record\/0-5\/(\d+)/);
    return m ? m[1] : null;
  }
  // The prompt only ever changes the ticket it opened on
  const pageKey = () => ticketId() || location.pathname;

  function fieldButton(labelText) {
    const labels = [...document.querySelectorAll('label[id]')].filter(
      (l) => clean(l.textContent).replace(/\*$/, '').trim() === labelText
    );
    for (const l of labels) {
      // label[for] points at the dropdown button; the search box inside the open dropdown shares the label, so skip inputs
      const b = (l.htmlFor && document.getElementById(l.htmlFor)) ||
        document.querySelector(`button[aria-labelledby="${CSS.escape(l.id)}"]`);
      if (b && b.tagName === 'BUTTON') return b;
    }
    return null;
  }
  const statusButton = () => fieldButton('Ticket status');
  const pipelineName = () => clean(fieldButton('Pipeline')?.textContent); // '' when the Pipeline field isn't shown
  // The ticket's name, read the same way as Quick actions
  function ticketName() {
    const el = document.querySelector('[data-selenium-test="highlightTitle"]');
    return clean(el ? el.innerText : document.title.replace(/\s*\|\s*HubSpot.*$/i, '').replace(/^Help Desk\s*\|\s*/i, ''));
  }

  // The status a field's text shows: an exact match, or else the longest label it starts with,
  // in case HubSpot puts something else (an icon's title, say) in the button
  function findOption(text, options) {
    return options.find((o) => o.label === text) ||
      options.filter((o) => text.startsWith(o.label)).sort((a, b) => b.label.length - a.label.length)[0] || null;
  }
  const showsStatus = (opt, options) => findOption(clean(statusButton()?.textContent), options) === opt;

  function isEditable(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.isContentEditable) return true;
    return el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|search|email|url|tel|number)$/i.test(el.type || 'text'));
  }

  // ---------- Composer ----------
  // The smallest box around Send that also holds the editor and the channel button. Never one holding two Send
  // buttons: that would be two composers, and the wrong one could be read.
  function composerRoot(sendBtn) {
    let p = sendBtn;
    while (p && !(p.querySelector('[contenteditable="true"]') && p.querySelector(CHANNEL_SELECTOR))) {
      p = p.parentElement;
      if (p && p.querySelectorAll(SEND_SELECTOR).length > 1) return null;
    }
    return p;
  }
  function readComposer(send) {
    const root = send && composerRoot(send);
    if (!root) return null;
    const editor = root.querySelector('[contenteditable="true"]');
    return {
      send,
      root,
      channel: clean(root.querySelector(CHANNEL_SELECTOR)?.textContent),
      text: editor ? clean(editor.innerText) : '',
      disabled: send.getAttribute('aria-disabled') === 'true' || !!send.disabled || !!send.querySelector('[aria-disabled="true"], :disabled'),
    };
  }
  // The composer a key press happened in, when there's more than one on the page
  const composerFor = (el) => [...document.querySelectorAll(SEND_SELECTOR)].map(readComposer).find((c) => c && c.root.contains(el));

  // ---------- Status dropdown access ----------
  const OPTION = '[role="option"]';
  const optionLabel = (o) => clean((o.querySelector('[data-option-text]') || o).textContent);
  // HubSpot's own id for a status (on the row or the row around it), or its name if there isn't one
  const optionId = (o) => o.getAttribute('data-option-value') || o.closest('[data-option-value]')?.getAttribute('data-option-value') ||
    o.getAttribute('data-value') || optionLabel(o);
  // HubSpot opens the list with a "Loading" row and fills the statuses in once they've loaded
  const isPlaceholder = (o) => /^loading\b/i.test(optionLabel(o)) || o.getAttribute('aria-busy') === 'true';
  const isShown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  // Greyed out, as pipeline rules do to statuses a ticket can't move to
  const DISABLED = '[aria-disabled="true"], [data-disabled="true"], [disabled]';
  function isDisabled(o, panel) {
    for (let el = o; el && el !== panel; el = el.parentElement) {
      if (el.matches(DISABLED) || /(^|[\s_-])disabled\b/i.test(el.getAttribute('class') || '')) return true;
    }
    return !!o.querySelector(DISABLED);
  }
  // Each status once. HubSpot nests one row inside another, so take the innermost (its text is just the name).
  // Rows that aren't on screen are left out when any are, and a name is only kept once.
  function realOptions(panel) {
    let rows = [...panel.querySelectorAll(OPTION)].filter((o) => !o.querySelector(OPTION) && !isPlaceholder(o) && optionLabel(o));
    if (rows.some(isShown)) rows = rows.filter(isShown);
    const byLabel = new Map();
    for (const o of rows) {
      const label = optionLabel(o);
      if (!byLabel.has(label) && !isDisabled(o, panel)) byLabel.set(label, o);
    }
    return [...byLabel.values()];
  }
  const listboxes = () => [...document.querySelectorAll('[role="listbox"]')];
  // The open status list: the one the button points to, or else a list that appeared on the page when it was
  // opened (never one that was already there, such as a list of tickets)
  function dropdownPanel(btn, already) {
    const b = statusButton() || btn;
    for (const attr of ['aria-owns', 'aria-controls']) {
      const el = document.getElementById(b.getAttribute(attr) || '');
      if (el && el.querySelector(OPTION)) return el;
    }
    return listboxes().find((l) => !already?.has(l) && isShown(l) && l.querySelector(OPTION)) || null;
  }
  // What the console shows when the list can't be read, so the cause can be found without guessing.
  // Only the status field and its list, so no ticket or customer details.
  function describeList(btn, already) {
    const b = statusButton() || btn;
    const p = dropdownPanel(b, already);
    const first = p && p.querySelector(OPTION);
    return {
      button: b ? ['aria-owns', 'aria-controls', 'aria-expanded', 'aria-haspopup'].map((a) => `${a}=${b.getAttribute(a)}`).join(' ') : 'not found',
      listFound: !!p,
      rowsInList: p ? p.querySelectorAll(OPTION).length : 0,
      statusesInList: p ? realOptions(p).map(optionLabel) : [],
      newLists: listboxes().filter((l) => !already?.has(l)).map((l) => `${l.id || 'no id'}, ${l.querySelectorAll(OPTION).length} rows${isShown(l) ? '' : ', hidden'}`),
      firstRow: first ? first.outerHTML.slice(0, 600) : null,
    };
  }
  // Opens HubSpot's status list and waits until it has loaded: statuses showing, no "Loading" row or spinner,
  // and the same number of statuses three checks running. A "Loading" row on its own is never read as a status.
  async function openDropdown(btn) {
    const already = new Set(listboxes());
    if (btn.getAttribute('aria-expanded') !== 'true') btn.click();
    let n = -1;
    let steady = 0;
    let wasOpen = false;
    const panel = await waitFor(() => {
      // Closed by something else (you, or the first copy of this script) after it opened: stop waiting
      const open = statusButton()?.getAttribute('aria-expanded') === 'true';
      if (wasOpen && !open) return 'closed';
      wasOpen = wasOpen || open;
      const p = dropdownPanel(btn, already);
      const real = p ? realOptions(p) : [];
      steady = real.length && real.length === n ? steady + 1 : 0;
      n = real.length || -1;
      const loading = !p || [...p.querySelectorAll(OPTION)].some(isPlaceholder) ||
        p.querySelector('[aria-busy="true"], [role="progressbar"]');
      // Done once steady, or after about half a second steady if a "Loading more" row stays at the bottom
      return steady >= (loading ? 6 : 2) ? p : null;
    }, LIST_WAIT_MS, 80);
    if (panel === 'closed') { log("HubSpot's status list was closed before it loaded", describeList(btn, already)); return null; }
    if (!panel) log("Couldn't read HubSpot's status list. Please send this to Stephen:", JSON.stringify(describeList(btn, already), null, 1));
    return panel;
  }
  // Finds the button again, as HubSpot may have redrawn it. If the list is still showing after that,
  // presses Esc in it, which closes HubSpot's drop-downs.
  function closeDropdown() {
    const btn = statusButton();
    if (btn && btn.getAttribute('aria-expanded') === 'true') btn.click();
    const a = document.activeElement;
    if (a && a !== document.body && a !== host && a.closest?.('[role="listbox"], [role="dialog"], [aria-modal]') ) {
      a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true }));
    }
  }

  const statusCache = new Map(); // pipeline name -> [{id, label}]
  async function readStatuses() {
    const btn = statusButton();
    if (!btn) { log('No Ticket status field on this page'); return null; }
    const text = clean(btn.textContent);
    const pipeline = pipelineName();
    let options = pipeline ? statusCache.get(pipeline) : null;
    // A saved list without the current status is out of date, so read it again.
    // Without a Pipeline field there's no telling pipelines apart, so read every time.
    if (!options || !findOption(text, options)) {
      const wasOpen = btn.getAttribute('aria-expanded') === 'true';
      const panel = await openDropdown(btn);
      options = panel ? realOptions(panel).map((o) => ({ id: optionId(o), label: optionLabel(o) })) : [];
      if (!wasOpen) closeDropdown();
      if (!options.length) return null;
      log(`Read ${options.length} statuses${pipeline ? ` for ${pipeline}` : ''}:`, options.map((o) => o.label).join(', '));
      // Only remember a list that has the current status in it, so a half-loaded one isn't kept
      if (pipeline && findOption(text, options)) statusCache.set(pipeline, options);
      else log(`The current status (${text}) isn't in the list read`, options.map((o) => o.label));
    }
    return { text, current: findOption(text, options), pipeline, options };
  }

  // Picks the status in HubSpot's own field. Returns 'set', 'unchanged', or the box HubSpot opened for more details.
  async function applyStatus(opt, options, key) {
    const btn = statusButton();
    if (!btn) throw new Error("the Ticket status field isn't on screen");
    if (showsStatus(opt, options)) return 'set';
    const panel = await openDropdown(btn);
    // By its id, or else by its name, in case HubSpot numbers the rows differently each time
    const rows = panel ? realOptions(panel) : [];
    const item = rows.find((o) => optionId(o) === opt.id) || rows.find((o) => optionLabel(o) === opt.label);
    // Checked again just before the click, in case you've moved to another ticket meanwhile
    if (!item || pageKey() !== key) {
      closeDropdown();
      throw new Error(pageKey() !== key ? 'you moved to another ticket' : `${opt.label} isn't in this ticket's list`);
    }
    const dialogsBefore = new Set(document.querySelectorAll('[role="dialog"]'));
    const target = item.querySelector('button') || item;
    // A full mouse press, not just a click: HubSpot's list picks on the press. No "view" in the events,
    // as Tampermonkey's window isn't one the browser accepts there.
    try {
      for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
        if (!target.isConnected) break; // picked already, and the list has closed
        const Ev = type.startsWith('pointer') && typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
        target.dispatchEvent(new Ev(type, { bubbles: true, cancelable: true, composed: true, button: 0, buttons: type.endsWith('down') ? 1 : 0 }));
      }
    } catch (err) {
      log('Pressing the status failed, so clicking it instead:', err.message);
      if (target.isConnected) target.click();
    }
    const res = await waitFor(() => {
      if (showsStatus(opt, options)) return 'set';
      return [...document.querySelectorAll('[role="dialog"]')].find((d) => !dialogsBefore.has(d)) || null;
    }, 5000);
    if (res) return res;
    closeDropdown();
    return 'unchanged';
  }

  // ---------- UI ----------
  // Lucide "mail-check" and "x"
  const lucide = (paths) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const MAIL_ICON = lucide('<path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><path d="m16 19 2 2 4-4"/>');
  const X_ICON = lucide('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>');

  const host = document.createElement('div');
  host.id = 'oolio-status-prompt';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; }
      [hidden] { display: none !important; }
      .wrap { position: fixed; left: 50%; bottom: 120px; transform: translateX(-50%); z-index: 2147483647;
              width: 420px; max-width: calc(100vw - 32px); background: #fff; border-radius: 12px;
              box-shadow: 0 12px 40px rgba(34,34,34,.28); overflow: hidden; outline: none; }
      .head { display: flex; align-items: center; gap: 10px; padding: 12px 10px 12px 16px; color: #fff;
              background: linear-gradient(-135deg, #673AB6, #5E35B1); }
      .head svg { flex: none; display: block; }
      .titles { flex: 1; min-width: 0; }
      .title { font-weight: 700; font-size: 14px; }
      .sub { font-size: 12px; opacity: .85; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .x { flex: none; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; padding: 0;
           border: 0; border-radius: 999px; background: transparent; color: #fff; cursor: pointer; }
      .x:hover { background: rgba(255,255,255,.2); }
      .list { padding: 8px; max-height: 320px; overflow: auto; outline: none; }
      .opt { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; font-size: 14px;
             color: #222; cursor: pointer; border: 2px solid transparent; }
      .opt:hover { background: #F3EEF9; }
      .opt.sel { border-color: #673AB6; background: #F3EEF9; font-weight: 700; color: #673AB6; }
      .num { flex: none; width: 18px; font-size: 11px; font-weight: 700; color: #6F6F6F; text-align: center; }
      .label { flex: 1; min-width: 0; }
      .tag { flex: none; font-size: 11px; color: #6F6F6F; font-weight: 400; }
      .foot { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; border-top: 1px solid #eee;
              padding: 10px 16px; font-size: 12px; color: #6F6F6F; }
      .foot > span { white-space: nowrap; }
      kbd { background: #F3EEF9; color: #673AB6; border-radius: 4px; padding: 1px 6px; font-weight: 700; font-size: 11px; font-family: inherit; }
      .skip { margin-left: auto; border: 0; padding: 0; background: none; color: #6F6F6F; font-size: 12px; text-decoration: underline; cursor: pointer; }
      .skip:hover { color: #673AB6; }
      .toast { position: fixed; left: 50%; bottom: 120px; transform: translateX(-50%); z-index: 2147483647;
               display: flex; align-items: center; gap: 12px; max-width: calc(100vw - 32px); padding: 10px 14px; border-radius: 12px;
               background: #222; color: #fff; font-size: 13px; font-weight: 500; border-left: 4px solid #673AB6;
               box-shadow: 0 6px 20px rgba(34,34,34,.25); }
      .toast.err { border-left-color: #808080; }
      .toast button { flex: none; border: 0; padding: 2px 4px; background: none; color: #CDB8F0; font-size: 13px; font-weight: 700;
                      text-decoration: underline; cursor: pointer; }
    </style>
    <div class="wrap" role="dialog" aria-labelledby="sp-title" hidden>
      <div class="head">${MAIL_ICON}
        <div class="titles"><div class="title" id="sp-title">Update the ticket status?</div><div class="sub"></div></div>
        <button class="x" type="button" aria-label="Keep the current status" title="Keep the current status (Esc)">${X_ICON}</button>
      </div>
      <div class="list" role="listbox" aria-labelledby="sp-title" tabindex="-1"></div>
      <div class="foot">
        <span><kbd>Enter</kbd> set</span><span><kbd>Tab</kbd> <kbd>&uarr;</kbd> <kbd>&darr;</kbd> move</span><span><kbd>1</kbd>-<kbd>9</kbd> jump</span><span><kbd>Esc</kbd> keep</span>
        <button class="skip" type="button" hidden>Don't ask on this pipeline</button>
      </div>
    </div>
    <div class="toast" role="status" aria-live="polite" hidden><span class="msg"></span><button type="button" hidden></button></div>`;
  const wrap = shadow.querySelector('.wrap');
  const sub = shadow.querySelector('.sub');
  const list = shadow.querySelector('.list');
  const skipBtn = shadow.querySelector('.skip');
  const toastEl = shadow.querySelector('.toast');
  const toastMsg = toastEl.querySelector('.msg');
  const actionBtn = toastEl.querySelector('button');

  function mount() {
    if (host.isConnected) return;
    // Inter, the Oolio typeface, loaded the same way as Quick actions. If HubSpot blocks it, the system font is used.
    if (!document.querySelector('link[href*="family=Inter"]')) {
      const font = document.createElement('link');
      font.rel = 'stylesheet';
      font.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap';
      document.head.appendChild(font);
    }
    document.body.appendChild(host);
  }

  // { options, current, text, index, key, pipeline, returnFocus, openedAt }
  // current is the option the ticket is on (null if it can't be told), index the highlighted one (-1 for none)
  let state = null;

  function render() {
    list.innerHTML = '';
    state.options.forEach((o, i) => {
      const row = document.createElement('div');
      row.className = 'opt' + (i === state.index ? ' sel' : '');
      row.id = `sp-opt-${i}`;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(i === state.index));
      row.innerHTML = '<span class="num"></span><span class="label"></span>';
      row.querySelector('.num').textContent = i < 9 ? String(i + 1) : '';
      row.querySelector('.label').textContent = o.label;
      if (o === state.current) row.insertAdjacentHTML('beforeend', '<span class="tag">current</span>');
      row.addEventListener('mousedown', (e) => e.preventDefault()); // keeps focus in the list
      row.addEventListener('click', (e) => { if (state && e.button === 0) { state.index = i; choose(); } });
      list.appendChild(row);
    });
    if (state.index >= 0) list.setAttribute('aria-activedescendant', `sp-opt-${state.index}`);
    else list.removeAttribute('aria-activedescendant');
    list.children[state.index]?.scrollIntoView({ block: 'nearest' });
  }

  // action: an optional button on the toast, { label, run }, such as Undo
  let toastTimer;
  let toastAction = null;
  function toast(msg, ok, action, ms) {
    mount();
    toastMsg.textContent = msg;
    toastEl.className = 'toast' + (ok ? '' : ' err');
    toastAction = action || null;
    actionBtn.hidden = !action;
    actionBtn.textContent = action ? action.label : '';
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, ms || (action ? UNDO_MS : ok ? 2500 : 5000));
  }
  function hideToast() {
    toastEl.hidden = true;
    toastAction = null;
  }
  actionBtn.addEventListener('click', () => {
    const action = toastAction;
    hideToast();
    if (action) action.run();
  });

  // Puts the cursor back in the box you were typing in, unless you've since clicked somewhere else.
  // Never onto a button: Enter there would press it again, and that could be Send.
  function restoreFocus(el) {
    if (!el || !el.isConnected || !isEditable(el)) return;
    const a = document.activeElement;
    const sb = statusButton();
    if (!a || a === document.body || a === host || (sb && sb.contains(a)) || a.closest?.('[role="option"], [role="listbox"]')) {
      el.focus({ preventScroll: true });
    }
  }

  let navTimer;
  function close() {
    wrap.hidden = true;
    const was = state;
    state = null;
    window.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerdown', onPointer, true);
    clearInterval(navTimer);
    return was;
  }
  const nameOf = (s) => (s.current ? s.current.label : s.text);
  // Leave the status as it is
  function keep(focusBack = true) {
    const was = close();
    if (!was) return;
    toast(`Status kept: ${nameOf(was)}`, true);
    if (focusBack) restoreFocus(was.returnFocus);
  }

  // Keys for HubSpot's "more details" box while it's open: Cmd/Ctrl + Enter presses its Save, Esc its Cancel.
  // An open drop-down inside the box gets Esc first, so it closes as usual.
  const SAVE_KEYS = /Mac|iPhone|iPad/i.test(navigator.platform) ? 'Cmd + Enter' : 'Ctrl + Enter';
  function boxButton(box, rx) {
    // The box HubSpot reports may be just part of the panel, so look a few levels out for its buttons
    for (let el = box, i = 0; el && el !== document.body && i < 4; el = el.parentElement, i++) {
      const b = [...el.querySelectorAll('button')].find((x) => rx.test(clean(x.innerText || x.textContent)) && isShown(x));
      if (b) return b;
    }
    return null;
  }
  function onBoxKey(e, box, onCancel) {
    if (!box.isConnected || e.repeat || e.isComposing) return;
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      const save = boxButton(box, /^save$/i);
      if (!save) return;
      e.preventDefault();
      e.stopImmediatePropagation(); // so the send shortcut doesn't press it as well
      if (save.disabled || save.getAttribute('aria-disabled') === 'true') {
        return toast(`Fill in the fields marked * first. ${SAVE_KEYS} saves, Esc cancels.`, false, null, DETAILS_WAIT_MS);
      }
      save.click();
    } else if (e.key === 'Escape' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      if (box.querySelector('[aria-expanded="true"]')) return; // a drop-down in the box is open: HubSpot closes that
      const cancel = boxButton(box, /^cancel$/i) ||
        [...box.querySelectorAll('button[aria-label]')].find((b) => /close/i.test(b.getAttribute('aria-label')));
      if (!cancel) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onCancel();
      cancel.click();
    }
  }

  // undoTo: the status Undo goes back to, if there's one to offer
  async function setStatus(opt, key, options, undoTo, isUndo) {
    if (pageKey() !== key) return toast("That ticket isn't open any more, so its status was left alone");
    let res;
    try {
      res = await applyStatus(opt, options, key);
    } catch (err) {
      log(`Couldn't set ${opt.label}:`, err.message);
      return toast(`Couldn't change the status: ${err.message}`);
    }
    if (res !== 'set' && res !== 'unchanged') {
      // HubSpot opened a box for more details (a close reason, say). Wait while it's filled in, then say how it went.
      const box = res;
      toast(`Fill in HubSpot's box to finish setting ${opt.label}. ${SAVE_KEYS} saves, Esc cancels.`, true, null, DETAILS_WAIT_MS);
      let cancelled = false;
      const boxKeys = (e) => onBoxKey(e, box, () => { cancelled = true; });
      window.addEventListener('keydown', boxKeys, true);
      try {
        res = await waitFor(() => {
          if (pageKey() !== key) return 'moved';
          return showsStatus(opt, options) ? 'set' : box.isConnected ? null : 'closed';
        }, DETAILS_WAIT_MS, 250);
      } finally {
        window.removeEventListener('keydown', boxKeys, true);
      }
      if (res === 'closed' && cancelled) return toast(`Cancelled. ${opt.label} wasn't set.`, true);
      if (res === 'closed' && !(await waitFor(() => showsStatus(opt, options), 1500))) {
        log(`HubSpot's box closed without setting ${opt.label}`);
        return toast(`HubSpot's box closed before ${opt.label} was set. Check the status in the sidebar.`);
      }
      if (!res || res === 'moved') return hideToast(); // still filling it in, or gone elsewhere: leave it to HubSpot
      res = 'set';
    }
    if (res === 'unchanged') {
      log(`${opt.label} didn't take`);
      return toast(`Status not changed. If HubSpot asked for more details, finish there.`);
    }
    toast(`${isUndo ? 'Status back to' : 'Status set:'} ${opt.label}`, true,
      undoTo && { label: 'Undo', run: () => setStatus(undoTo, key, options, null, true) });
  }

  async function choose() {
    if (!state) return;
    const was = close();
    const opt = was.options[was.index];
    // Read the status again, in case a HubSpot workflow changed it while the prompt was open. Undo goes back to it.
    const now = findOption(clean(statusButton()?.textContent), was.options) || was.current;
    if (opt && opt !== now) await setStatus(opt, was.key, was.options, now);
    else toast(`Status kept: ${now ? now.label : was.text}`, true);
    restoreFocus(was.returnFocus);
  }

  function onKey(e) {
    if (!state || e.isComposing) return;
    const k = e.key;
    const n = state.options.length;
    const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
    const typing = isEditable(e.composedPath()[0]); // HubSpot put the cursor back in a box
    const digit = plain && !typing && /^[1-9]$/.test(k) && Number(k) <= n ? Number(k) : 0;
    const move = plain && (k === 'Tab' || k === 'ArrowDown' || k === 'ArrowUp' || k === 'Home' || k === 'End');
    if (!(k === 'Enter' || k === 'Escape' || digit || move)) {
      // Typing in a box means you've moved on: keep the status and let the key through
      if (plain && k.length === 1 && typing) keep(false);
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    // A key still held from sending (Cmd + Enter), or pressed just as the prompt appeared, mustn't pick a status
    if (!move && k !== 'Escape' && (e.repeat || performance.now() - state.openedAt < 250)) return;
    if (k === 'Enter') choose();
    else if (k === 'Escape') keep();
    else if (digit) { state.index = digit - 1; render(); } // only Enter or a click changes the ticket
    else {
      const back = (k === 'Tab' && e.shiftKey) || k === 'ArrowUp';
      if (k === 'Home') state.index = 0;
      else if (k === 'End') state.index = n - 1;
      else if (state.index < 0) state.index = back ? n - 1 : 0;
      else state.index = (state.index + (back ? n - 1 : 1)) % n;
      render();
    }
  }

  // Clicking anywhere else on the page means you've moved on
  function onPointer(e) {
    if (state && !e.composedPath().includes(host)) keep(false);
  }

  shadow.querySelector('.x').addEventListener('click', () => keep());

  skipBtn.addEventListener('click', () => {
    const was = close();
    if (!was || !was.pipeline) return;
    gmSet('skippedPipelines', [...new Set([...skipped(), was.pipeline])]);
    refreshMenu();
    toast(`Won't ask on ${was.pipeline} tickets. To ask again, click the Tampermonkey icon, then Ask on every pipeline again.`, true, null, 6000);
    restoreFocus(was.returnFocus);
  });

  // The first copy, installed by hand before this one was in the repo, would fight this one for the keyboard.
  // It only shows up on the page once it has shown something, so this is checked again after reading.
  let warnedOldCopy = false;
  function oldCopy() {
    const old = document.getElementById('hs-status-prompt-host');
    if (!old) return false;
    if (!warnedOldCopy) {
      warnedOldCopy = true;
      log('The first copy of the status prompt is still installed, so this one is standing aside');
      // Wait until the old box is closed, so the reminder doesn't cover it
      const oldOpen = () => old.shadowRoot?.querySelector('.wrap')?.hidden === false;
      waitFor(() => !oldOpen(), 60000, 500).then(() => toast(
        'The first copy of the status prompt is still installed. Delete it in Tampermonkey to use this one.', false, null, 10000));
    }
    return true;
  }

  // You're already doing something else, so offer the prompt instead of taking the keyboard
  function offer(key, statusBefore) {
    log('You clicked or typed after sending, so the prompt is offered instead of opened');
    toast('Email sent. Update the ticket status?', true, {
      label: 'Choose',
      run: () => (pageKey() === key ? showPrompt({ statusBefore }) : toast("That ticket isn't open any more")),
    });
  }

  let opening = false;
  // ctx: { statusBefore, armedAt } after a send, { test: true } from the menu
  async function showPrompt(ctx = {}) {
    if (state || opening || oldCopy()) return;
    const key = pageKey();
    if (!ctx.test && skipped().includes(pipelineName())) return log(`Not asking on ${pipelineName()} tickets (skipped in the prompt)`);
    opening = true;
    const returnFocus = document.activeElement;
    let data;
    try {
      data = await readStatuses();
    } finally {
      opening = false;
    }
    if (pageKey() !== key || oldCopy()) return; // moved to another ticket while reading, or the first copy showed up
    // Clicked or typed somewhere while the statuses were read: don't take the keyboard now
    if (ctx.armedAt && lastInput > ctx.armedAt) return offer(key, ctx.statusBefore);
    if (!data) return toast("Couldn't read this ticket's statuses. Set it in the sidebar. The browser console says why (search Oolio status prompt).");
    // If the status changed while sending (a send-and-close, or a HubSpot workflow), start on what it is now
    const changed = ctx.statusBefore && ctx.statusBefore !== data.text;
    let index = -1;
    if (!changed) {
      for (const rx of DEFAULT_STATUS) {
        index = data.options.findIndex((o) => rx.test(o.label));
        if (index >= 0) break;
      }
    }
    // Otherwise the current status, or nothing if it can't be told (then Enter changes nothing either)
    if (index < 0) index = data.options.indexOf(data.current);
    state = { ...data, index, key, returnFocus, openedAt: performance.now() };
    sub.textContent = [ctx.test ? 'Test, nothing was sent' : 'Email sent', ticketName(), data.pipeline].filter(Boolean).join(' · ');
    sub.title = sub.textContent;
    skipBtn.hidden = !data.pipeline || !!ctx.test;
    skipBtn.title = data.pipeline ? `Stop asking on ${data.pipeline} tickets` : '';
    hideToast();
    mount();
    render();
    wrap.hidden = false;
    list.focus({ preventScroll: true }); // the list holds focus, so screen readers follow the highlight
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    // Close if you move to another ticket, so the choice can't land on the wrong one
    navTimer = setInterval(() => { if (state && (pageKey() !== state.key || oldCopy())) close(); }, 300);
  }

  // ---------- Detect a sent email ----------
  // When you last clicked or typed. If that's after Send, you've moved on, so the prompt mustn't take the keyboard.
  // Cmd/Ctrl + Enter doesn't count: that's the send itself.
  let lastInput = 0;
  // A second press on Send (a double-click, say) isn't moving on either
  document.addEventListener('pointerdown', (e) => {
    if (e.isTrusted && !e.target.closest?.(SEND_SELECTOR)) lastInput = performance.now();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (!e.isTrusted || e.repeat || /^(Shift|Control|Meta|Alt|AltGraph|CapsLock|Fn)$/.test(e.key)) return;
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) return;
    lastInput = performance.now();
  }, true);

  let watchToken = 0;
  let watching = null; // { root, sentText } of the send being watched
  async function watchSend(send) {
    if (!isEnabled()) return log('Turned off in the Tampermonkey menu');
    if (state || opening) return;
    const before = readComposer(send);
    if (!before) return log("Couldn't find the reply box around Send");
    if (before.disabled) return;
    if (!CHANNELS.test(before.channel)) return log(`Not an email reply (channel: ${before.channel || 'unknown'})`);
    const statusBtn = statusButton();
    // Not a ticket (an email from a contact, company or deal), so there's no status to set
    if (!statusBtn || !ticketId()) return log('Not a ticket, so there is no status to set');
    // Already clearing after this send (a shortcut and a click for the same send): let the running wait finish
    if (watching && watching.root === before.root && before.text.length < watching.sentText.length) return;
    const token = ++watchToken; // a second Send click starts the wait again
    const armedAt = performance.now();
    const key = pageKey();
    const statusBefore = clean(statusBtn.textContent);
    const sentText = before.text;
    watching = { root: before.root, sentText };
    // You editing the message, or using the composer's controls (to change the channel, say), means it didn't go.
    // HubSpot clearing it after sending is neither. Key presses count as well as input, because HubSpot's editor
    // handles Backspace itself and the browser reports no input for it.
    let edited = false;
    const EDIT_EVENTS = ['beforeinput', 'keydown', 'paste', 'cut', 'drop', 'pointerdown'];
    const onEdit = (e) => {
      if (!e.isTrusted || !before.root.contains(e.target)) return;
      const inBox = isEditable(e.composedPath()[0]);
      // Clicking into the message isn't an edit, and nor is another click on Send
      if (e.type === 'pointerdown' && (inBox || send.contains(e.target))) return;
      // Only keys that change the text count: not arrows, Tab or the send shortcut
      if (e.type === 'keydown' && (!inBox || e.repeat || e.metaKey || e.ctrlKey || e.altKey ||
        !(e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Enter'))) return;
      edited = true;
    };
    EDIT_EVENTS.forEach((t) => document.addEventListener(t, onEdit, true));
    let gone = 0;
    const sent = await waitFor(() => {
      if (token !== watchToken || edited || pageKey() !== key) return 'stop';
      const s = before.root.isConnected
        ? readComposer(before.root.querySelector(SEND_SELECTOR))
        : readComposer(document.querySelector(SEND_SELECTOR)); // redrawn after sending
      if (!s) return ++gone >= 2 ? 'sent' : null; // composer closed (twice running, not just redrawing)
      gone = 0;
      if (s.text !== sentText && s.text.length < sentText.length) return 'sent'; // cleared (the signature may stay)
      if (!CHANNELS.test(s.channel)) return 'switched'; // to a comment, say
      return null;
    }, SEND_TIMEOUT_MS, 250);
    EDIT_EVENTS.forEach((t) => document.removeEventListener(t, onEdit, true));
    if (token !== watchToken) return; // a newer Send took over
    watching = null;
    if (sent !== 'sent') {
      return log(edited ? 'You edited the message after Send, so it looks unsent'
        : sent === 'switched' ? 'Switched away from email before it sent'
        : sent === 'stop' ? 'Moved to another ticket before it sent'
        : "The email didn't seem to send within 20 seconds");
    }
    await sleep(400);
    if (pageKey() !== key) return;
    if (lastInput > armedAt) return oldCopy() || offer(key, statusBefore);
    showPrompt({ statusBefore, armedAt });
  }

  document.addEventListener('click', (e) => {
    const send = e.target.closest && e.target.closest(SEND_SELECTOR);
    if (!send) return;
    // A menu arrow inside the Send button (send later, say) isn't a send
    const btn = e.target.closest('button');
    if (btn && btn !== send && send.contains(btn) && btn.hasAttribute('aria-haspopup')) return;
    watchSend(send);
  }, true);

  // Cmd/Ctrl + Enter, in case HubSpot or another script sends without a click on the button
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey) || e.repeat || e.isComposing) return;
    const target = e.composedPath()[0];
    if (!target.isContentEditable) return;
    const c = composerFor(target);
    if (c) watchSend(c.send);
  }, true);

  // ---------- Tampermonkey menu ----------
  let menuIds = [];
  function refreshMenu() {
    if (typeof GM_registerMenuCommand !== 'function') return;
    // Without unregister the labels can't change, so register once
    if (menuIds.length && typeof GM_unregisterMenuCommand !== 'function') return;
    menuIds.forEach((id) => GM_unregisterMenuCommand(id));
    const turnOn = !isEnabled();
    menuIds = [
      GM_registerMenuCommand('Show the status prompt on this ticket', () =>
        (ticketId() ? showPrompt({ test: true }) : toast('Open a ticket first, then try again'))),
      // Does what its label says, even if another tab has changed the setting since
      GM_registerMenuCommand(turnOn ? 'Turn the status prompt on' : 'Turn the status prompt off', () => {
        gmSet('enabled', turnOn);
        if (!turnOn) close();
        refreshMenu();
        toast(`Status prompt ${turnOn ? 'on' : 'off'}`, true);
      }),
    ];
    const n = skipped().length;
    if (n) {
      menuIds.push(GM_registerMenuCommand(`Ask on every pipeline again (${n} skipped)`, () => {
        gmSet('skippedPipelines', []);
        refreshMenu();
        toast('The status prompt will ask on every pipeline', true);
      }));
    }
  }
  refreshMenu();
  // Keep the menu right when another tab changes a setting
  if (typeof GM_addValueChangeListener === 'function') {
    ['enabled', 'skippedPipelines'].forEach((k) => GM_addValueChangeListener(k, (n, o, v, remote) => { if (remote) refreshMenu(); }));
  }
})();
