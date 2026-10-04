// ==UserScript==
// @name         HubSpot: Products in company search
// @namespace    oolio-userscripts
// @version      1.2.0
// @description  In the Add existing Company panel, shows each company's products, owner and contacts under its name, hides the products you don't work with, and shows 100 per page.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/company-search.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/company-search.user.js
// @match        https://app.hubspot.com/*
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTQwLjA5OSAwQzE3My4xODEgMCAyMDAgMjYuNjk3OSAyMDAgNTkuNjMxNEMyMDAgOTIuNTY0OSAxNzMuMTgxIDExOS4yNjMgMTQwLjA5OSAxMTkuMjYzQzEyNC42NzcgMTE5LjI2MyAxMTAuNjE2IDExMy40NjEgOTkuOTk4NiAxMDMuOTNDODkuMzgzNyAxMTMuNDYxIDc1LjMyMjkgMTE5LjI2MyA1OS45MDEgMTE5LjI2M0MyNi44MTg2IDExOS4yNjMgMCA5Mi41NjQ5IDAgNTkuNjMxNEMwIDI2LjY5NzkgMjYuODE4NiAwIDU5LjkwMSAwQzc1LjMyMzIgMCA4OS4zODQxIDUuODAxOTUgMTAwLjAwMSAxNS4zMzI5QzExMC42MTYgNS44MDE3NyAxMjQuNjc3IDAgMTQwLjA5OSAwWk0xNDAuMDk5IDM5LjkxODVDMTI5LjE2MyAzOS45MTg1IDEyMC4yOTcgNDguNzQ0MyAxMjAuMjk3IDU5LjYzMTRDMTIwLjI5NyA3MC41MTg1IDEyOS4xNjMgNzkuMzQ0MiAxNDAuMDk5IDc5LjM0NDJDMTUxLjAzNSA3OS4zNDQyIDE1OS45MDEgNzAuNTE4NSAxNTkuOTAxIDU5LjYzMTRDMTU5LjkwMSA0OC43NDQzIDE1MS4wMzUgMzkuOTE4NSAxNDAuMDk5IDM5LjkxODVaTTU5LjkwMSAzOS45MTg1QzQ4Ljk2NDcgMzkuOTE4NSA0MC4wOTkgNDguNzQ0MyA0MC4wOTkgNTkuNjMxNEM0MC4wOTkgNzAuNTE4NSA0OC45NjQ3IDc5LjM0NDIgNTkuOTAxIDc5LjM0NDJDNzAuODM3MyA3OS4zNDQyIDc5LjcwMyA3MC41MTg1IDc5LjcwMyA1OS42MzE0Qzc5LjcwMyA0OC43NDQzIDcwLjgzNzMgMzkuOTE4NSA1OS45MDEgMzkuOTE4NVoiIGZpbGw9IiM2NzNBQjYiLz4KPC9zdmc+Cg==
// @grant        none
// @run-at       document-start
// ==/UserScript==

/*
  How it works
  - HubSpot shows "Add existing Company" inside its own frame (/object-builder/<portal>/0-2/embed).
    This script runs in every HubSpot frame and only acts where it finds that panel.
  - Each row's company data (products, contacts, owner ID and more) is already loaded into the list's
    React props, so badges and filtering need no extra requests. Only owner names, the contacts and
    tickets lists, and a fallback lookup (if HubSpot ever changes those props) call HubSpot's API,
    using your own login.
  - Settings live in the bar above the list and are saved in this browser.
*/

(function () {
  'use strict';

  /* ---------------- Products ---------------- */
  // The HubSpot company property that holds the products, and the chips above the list.
  // value = what HubSpot stores, label = what you see. Anything not listed counts as "Other".
  const PRODUCT_PROPERTY = 'product';
  const PRODUCTS = [
    { value: 'Bepoz', label: 'Bepoz', bg: '#E3ECF7', fg: '#1B4F8A' },
    { value: 'Oolio POS', label: 'Oolio One', bg: '#F3EEF9', fg: '#673AB6' },
    { value: 'Oolio Pay', label: 'OolioPay', bg: '#E0F4F1', fg: '#0B7F73' },
    { value: 'SwiftPOS', label: 'SwiftPOS', bg: '#F0F0F0', fg: '#555555' },
    { value: 'Idealpos', label: 'Idealpos', bg: '#F0F0F0', fg: '#555555' },
  ];
  // Other values of the product property in this portal, so "Other" can be asked for by name
  const OTHER_VALUES = ['Deliverit', 'OrderMate', 'Fortis', 'Captial', 'eBev'];
  const OTHER = '__other';
  const NONE = '__none';

  // Extra fields you can switch on. All of these come with the list, so they cost nothing to show.
  const FIELDS = [
    { name: 'lifecycle__owner__tech', label: 'LS, O, T' },
    { name: 'full_address', label: 'Address' },
    { name: 'phone', label: 'Phone' },
    { name: 'website', label: 'Website' },
    { name: 'notes_last_contacted', label: 'Last contacted' },
    { name: 'createdate', label: 'Created' },
  ];

  /* ---------------- Your settings (saved in this browser) ---------------- */
  const STORE_KEY = 'oolio-company-search';
  const DEFAULTS = {
    off: ['Idealpos', 'SwiftPOS', OTHER], // chips switched off: those companies are hidden
    showHidden: false,                    // show hidden companies faded instead
    pageSize: 100,                        // 10, 30 or 100. 0 leaves HubSpot's choice alone
    owner: true,
    contacts: true,
    tickets: true,
    open: true,
    fields: [],
  };
  let settings = load();

  function load() {
    try {
      const s = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') };
      if (!Array.isArray(s.off)) s.off = DEFAULTS.off;
      if (!Array.isArray(s.fields)) s.fields = [];
      return s;
    } catch (e) {
      return { ...DEFAULTS };
    }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) { /* private window */ }
  }
  // Every HubSpot frame shares this storage, so pick up changes made in another frame or tab
  window.addEventListener('storage', (e) => {
    if (e.key === STORE_KEY) { settings = load(); scheduleRun(0); }
  });
  const isOff = (key) => settings.off.includes(key);

  const VERSION = typeof GM_info !== 'undefined' ? GM_info.script.version : '';

  /* ---------------- Debug notes ---------------- */
  const notes = [];
  function note(msg) {
    notes.push(new Date().toTimeString().slice(0, 8) + ' ' + msg);
    if (notes.length > 30) notes.shift();
  }

  /* ---------------- Helpers ---------------- */
  const norm = (s) => String(s == null ? '' : s).toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // HubSpot may require Trusted Types for innerHTML, which would otherwise block every change
  let ttPolicy = null;
  try {
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      ttPolicy = window.trustedTypes.createPolicy('oolio-company-search', { createHTML: (s) => s });
    }
  } catch (e) { note('Trusted Types policy blocked: ' + e.message); }
  const setHTML = (el, html) => { el.innerHTML = ttPolicy ? ttPolicy.createHTML(html) : html; };

  function portalId() {
    const m = location.pathname.match(/^\/[\w-]+\/(\d+)(?:\/|$)/);
    return m ? m[1] : '';
  }
  function csrf() {
    const m = document.cookie.match(/(?:^|;\s*)hubspotapi-csrf=([^;]*)/) || document.cookie.match(/(?:^|;\s*)csrf\.app=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : '';
  }
  const recordUrl = (type, id) => `https://app.hubspot.com/contacts/${portalId()}/record/${type}/${id}`;

  function fmtValue(v) {
    v = String(v == null ? '' : v).trim().replace(/[,;\s]+$/, '');
    if (/^\d{13}$/.test(v)) return new Date(+v).toLocaleDateString('en-AU');
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleDateString('en-AU');
    return v.replace(/;/g, ', ');
  }

  /* ---------------- Filtering at the source ---------------- */
  // The panel asks HubSpot for companies with one GraphQL call (SearchObjectsQuery). Adding
  // "product is one of your chips" to that call means HubSpot only sends your companies, so
  // pages are full and the total is right. If HubSpot ever rejects the filter, the original
  // request is sent instead and the script falls back to hiding rows on the page.
  const SERVER_KEY = 'oolio-company-search-server-filter';
  let serverFilter = (() => { try { return localStorage.getItem(SERVER_KEY) || 'unknown'; } catch (e) { return 'unknown'; } })();
  let lastServer = '';
  function setServerFilter(state, msg) {
    serverFilter = state;
    lastServer = msg || '';
    // Only success is remembered, so a one-off failure is retried on the next page load
    try { if (state === 'works') localStorage.setItem(SERVER_KEY, state); else localStorage.removeItem(SERVER_KEY); } catch (e) { /* ignore */ }
  }

  // The filter groups for your chips, or null when everything is switched on (or off)
  function productFilters() {
    const values = [
      ...PRODUCTS.filter((p) => !isOff(p.value)).map((p) => p.value),
      ...(isOff(OTHER) ? [] : OTHER_VALUES),
    ];
    const none = !isOff(NONE);
    const everything = values.length === PRODUCTS.length + OTHER_VALUES.length && none;
    if (everything || (!values.length && !none)) return null;
    const out = [];
    if (values.length) out.push({ property: PRODUCT_PROPERTY, operator: 'IN', values });
    if (none) out.push({ property: PRODUCT_PROPERTY, operator: 'NOT_HAS_PROPERTY' });
    return out;
  }

  // Returns the changed request body, or null to leave the request alone
  function filteredBody(url, body) {
    if (typeof body !== 'string' || body.length > 300000 || !/\/api\/graphql\/crm/.test(String(url))) return null;
    let j;
    try { j = JSON.parse(body); } catch (e) { return null; }
    const v = j && j.variables;
    if (!j || j.operationName !== 'SearchObjectsQuery' || !v || String(v.objectTypeId) !== '0-2' || !Array.isArray(v.filterGroups)) return null;
    const extra = productFilters();
    if (!extra) return null;
    const groups = v.filterGroups.length ? v.filterGroups : [{ filters: [] }];
    // Filter groups are OR'd and filters inside a group are AND'd, so each of HubSpot's own
    // groups is repeated once per product condition.
    v.filterGroups = groups.flatMap((g) => extra.map((f) => ({ ...g, filters: [...(g.filters || []), f] })));
    return JSON.stringify(j);
  }

  function searchFailed(j) {
    if (!j) return 'no response';
    if (Array.isArray(j.errors) && j.errors.length) return j.errors[0].message || 'GraphQL error';
    const r = j.data && j.data.crmObjectsSearch;
    if (!r) return 'no results in response';
    if (Array.isArray(r.validationErrors) && r.validationErrors.length) return r.validationErrors[0].message || 'validation error';
    return '';
  }

  const pageFetch = window.fetch;
  window.fetch = async function (input, init) {
    let body = null;
    try {
      if (serverFilter !== 'broken' && init && typeof init.body === 'string') {
        body = filteredBody(typeof input === 'string' ? input : input && input.url, init.body);
      }
    } catch (e) { body = null; }
    if (!body) return pageFetch.apply(this, arguments);
    try {
      const res = await pageFetch.call(window, input, { ...init, body });
      const problem = res.ok ? searchFailed(await res.clone().json()) : `HubSpot returned ${res.status}`;
      if (!problem) {
        if (serverFilter !== 'works') { setServerFilter('works'); note('Product filter accepted by HubSpot'); }
        return res;
      }
      setServerFilter('broken', problem);
      note('Product filter rejected, hiding on the page instead: ' + problem);
    } catch (e) {
      if (e && e.name === 'AbortError') throw e; // HubSpot cancelled it for a newer search
      note('Filtered search failed: ' + (e && e.message));
    }
    return pageFetch.call(window, input, init);
  };

  // HubSpot may send the same search with XMLHttpRequest. That can't be retried safely, so
  // it is only filtered once the filter is known to work.
  const xhrOpen = XMLHttpRequest.prototype.open;
  const xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__ocpUrl = String(url);
    return xhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (b) {
    let body = null;
    try { if (serverFilter === 'works') body = filteredBody(this.__ocpUrl, b); } catch (e) { body = null; }
    return body ? xhrSend.call(this, body) : xhrSend.apply(this, arguments);
  };

  // After a chip changes, ask HubSpot to search again by nudging the search box
  function refreshSearch() {
    const input = document.querySelector('input[type="search"], input[placeholder*="Search" i]');
    if (!input || serverFilter === 'broken') return;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const value = input.value;
    set.call(input, value + ' ');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    setTimeout(() => {
      set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, 60);
  }

  /* ---------------- Company data ---------------- */
  const records = new Map(); // company ID -> { id, name, domain, props }

  // A row's company as HubSpot's list holds it
  function recFromItem(item) {
    const props = {};
    for (const p of item.properties || []) if (p && p.name) props[p.name] = p.value == null ? '' : String(p.value);
    const name = (item.primaryDisplayProperty && item.primaryDisplayProperty.value) || props.name || '';
    const rec = { id: String(item.objectId), name: String(name), domain: props.domain || '', props };
    records.set(rec.id, rec);
    return rec;
  }

  function fiberOf(el) {
    for (const k in el) if (k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')) return el[k];
    return null;
  }
  const isCompany = (o) => !!o && typeof o === 'object' && !Array.isArray(o) && o.objectId != null && Array.isArray(o.properties);

  // Walk up from a checkbox through React's props. The row's own company comes first if a
  // component holds it; every list of companies on the way is collected too, because search
  // results and the normal list can sit in different props.
  function companiesNear(box) {
    const out = { own: null, lists: [] };
    let f = fiberOf(box);
    for (let i = 0; f && i < 45; i++, f = f.return) {
      const p = f.memoizedProps;
      if (!p || typeof p !== 'object') continue;
      for (const k of Object.keys(p)) {
        if (k === 'children') continue;
        const v = p[k];
        if (!out.own && !out.lists.length && isCompany(v)) out.own = v;
        else if (Array.isArray(v) && v.length && isCompany(v[0]) && !out.lists.includes(v)) out.lists.push(v);
      }
    }
    return out;
  }

  // HubSpot shows "Name (domain.com)" when a company has a domain
  function splitLabel(label) {
    const m = label.match(/^(.*\S)\s*\(([^()\s]+\.[^()\s]+)\)$/);
    return m ? { name: m[1], domain: m[2] } : { name: label, domain: '' };
  }
  const bareDomain = (d) => norm(d).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  function matchesName(label, rec) {
    if (!rec || !rec.name) return false;
    const l = norm(label);
    const n = norm(rec.name);
    if (l === n) return true;
    const { name, domain } = splitLabel(label);
    if (norm(name) === n) return !domain || !rec.domain || bareDomain(rec.domain) === bareDomain(domain);
    return l.startsWith(n + ' ');
  }

  /* ---------------- HubSpot API (uses your login) ---------------- */
  let apiError = '';
  async function api(path, opts = {}) {
    const res = await fetch(path, {
      credentials: 'include',
      ...opts,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-HubSpot-CSRF-hubspotapi': csrf(), ...(opts.headers || {}) },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HubSpot returned ${res.status}${text ? ': ' + text.slice(0, 160) : ''}`);
    }
    return res.json();
  }
  function crmSearch(objectTypeId, { filters = [], query = '', count = 100, props }) {
    return api(`/api/crm-search/search?portalId=${portalId()}&clienttimeout=14000`, {
      method: 'POST',
      body: JSON.stringify({
        objectTypeId, count, offset: 0, query,
        filterGroups: [{ filters }],
        sorts: [],
        requestOptions: { properties: props },
      }),
    });
  }

  // Owner names: the list only carries the owner's ID. Tried once per page load.
  const owners = new Map();
  let ownersState = 'idle'; // idle | loading | ok | failed
  const OWNER_URLS = [
    (p) => `/api/owners/v2/owners?portalId=${p}&includeInactive=true`,
    (p) => `/api/owners/v3/owners?portalId=${p}&includeInactive=true`,
    (p) => `/owners/v2/owners?portalId=${p}&includeInactive=true`,
  ];
  async function loadOwners() {
    if (ownersState !== 'idle' || !portalId()) return;
    ownersState = 'loading';
    for (const url of OWNER_URLS) {
      try {
        const j = await api(url(portalId()));
        const list = Array.isArray(j) ? j : j.results || j.owners || [];
        for (const o of list) {
          const name = [o.firstName, o.lastName].filter(Boolean).join(' ') || o.email || '';
          if (!name) continue;
          for (const k of ['ownerId', 'id']) if (o[k] != null) owners.set(String(o[k]), name);
        }
        if (owners.size) { ownersState = 'ok'; note(`Owners loaded from ${url('#')}`); break; }
      } catch (e) {
        note(`Owners: ${url('#')} ${e.message.slice(0, 40)}`);
      }
    }
    if (ownersState !== 'ok') ownersState = 'failed';
    scheduleRun(0);
  }

  // Fallback when a row's company can't be read from the page: search HubSpot by name
  const NAME_PROPS = ['name', 'domain', PRODUCT_PROPERTY, 'num_associated_contacts', 'hubspot_owner_id', ...FIELDS.map((f) => f.name)];
  const nameJobs = new Map(); // normalised label -> { state, ids, msg, at }
  const nameQueue = [];
  let nameActive = 0;
  function requestName(label) {
    nameJobs.set(norm(label), { state: 'queued' });
    nameQueue.push(label);
    pumpNames();
  }
  function pumpNames() {
    while (nameActive < 3 && nameQueue.length) {
      const label = nameQueue.shift();
      const key = norm(label);
      nameActive++;
      nameJobs.set(key, { state: 'pending' });
      crmSearch('0-2', { query: splitLabel(label).name, count: 20, props: NAME_PROPS })
        .then((j) => {
          const ids = [];
          for (const r of j.results || []) {
            const props = {};
            for (const [k, v] of Object.entries(r.properties || {})) props[k] = v == null ? '' : String(typeof v === 'object' ? v.value == null ? '' : v.value : v);
            const rec = { id: String(r.objectId || r.id), name: props.name || '', domain: props.domain || '', props };
            records.set(rec.id, rec);
            if (matchesName(label, rec)) ids.push(rec.id);
          }
          nameJobs.set(key, { state: 'done', ids, at: Date.now() });
        })
        .catch((e) => {
          apiError = e.message;
          nameJobs.set(key, { state: 'error', msg: e.message, at: Date.now() });
          note('Name lookup failed: ' + e.message);
        })
        .finally(() => { nameActive--; pumpNames(); scheduleRun(); });
    }
  }
  function resolveByName(label) {
    const job = nameJobs.get(norm(label));
    if (!job || (job.state === 'error' && Date.now() - job.at > 30000)) { requestName(label); return { state: 'loading' }; }
    if (job.state === 'error') return { state: 'error', msg: job.msg };
    if (job.state === 'done') return job.ids.length ? { state: 'ready', recs: job.ids.map((id) => records.get(id)) } : { state: 'missing' };
    return { state: 'loading' };
  }

  // Contacts and tickets for one company, listed when you click the link
  const expanded = new Map(); // company ID -> { kind, state, items, total, msg }
  const LISTS = {
    contacts: {
      type: '0-1',
      props: ['firstname', 'lastname', 'email', 'jobtitle', 'lastmodifieddate'],
      filters: (id) => [
        [{ property: 'associations.company', operator: 'EQ', value: id }],
        [{ property: 'associatedcompanyid', operator: 'EQ', value: id }],
      ],
      sortBy: 'lastmodifieddate',
      item: (p) => ({
        title: [p('firstname'), p('lastname')].join(' ').trim() || p('email') || 'Unnamed contact',
        meta: p('jobtitle') || p('email'),
      }),
    },
    tickets: {
      type: '0-5',
      props: ['subject', 'createdate'],
      filters: (id) => [
        [{ property: 'associations.company', operator: 'EQ', value: id }],
        [{ property: 'associations.0-2', operator: 'EQ', value: id }],
      ],
      sortBy: 'createdate',
      item: (p) => ({ title: p('subject') || 'Untitled ticket', meta: fmtValue(p('createdate')) }),
    },
  };

  async function toggleList(id, kind) {
    const cur = expanded.get(id);
    if (cur && cur.kind === kind) { expanded.delete(id); scheduleRun(0); return; }
    const def = LISTS[kind];
    if (!def) return;
    expanded.set(id, { kind, state: 'loading' });
    scheduleRun(0);
    let lastErr = null;
    for (const filters of def.filters(id)) {
      try {
        const j = await crmSearch(def.type, { filters, count: 25, props: def.props });
        const items = (j.results || []).map((r) => {
          const props = r.properties || {};
          const p = (k) => { const v = props[k]; return v == null ? '' : String(typeof v === 'object' ? v.value || '' : v); };
          return { id: String(r.objectId || r.id), sort: Number(p(def.sortBy)) || Date.parse(p(def.sortBy)) || 0, ...def.item(p) };
        }).sort((a, b) => b.sort - a.sort);
        expanded.set(id, { kind, state: 'ready', items, total: j.total || items.length });
        scheduleRun(0);
        return;
      } catch (e) {
        lastErr = e;
      }
    }
    note(`${kind} list failed: ${lastErr.message}`);
    expanded.set(id, { kind, state: 'error', msg: lastErr.message });
    scheduleRun(0);
  }

  /* ---------------- Products and filtering ---------------- */
  const productsOf = (rec) => String(rec.props[PRODUCT_PROPERTY] || '').split(';').map((s) => s.trim()).filter(Boolean);
  const productDef = (v) => PRODUCTS.find((p) => p.value === v);
  const chipKey = (v) => (productDef(v) ? v : OTHER);

  function chipKeys(recs) {
    const keys = new Set(recs.flatMap(productsOf).map(chipKey));
    if (!keys.size) keys.add(NONE);
    return keys;
  }
  const wanted = (recs) => [...chipKeys(recs)].some((k) => !isOff(k));

  /* ---------------- Styles and icons ---------------- */
  function injectStyles() {
    if (document.getElementById('ocp-style')) return;
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap';
    document.head.appendChild(font);

    const css = document.createElement('style');
    css.id = 'ocp-style';
    css.textContent = `
      [data-ocp-hidden] { display:none !important; }
      [data-ocp-dim] { opacity:.45; transition:opacity .15s; }
      [data-ocp-dim]:hover { opacity:.85; }

      .ocp-ui { font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; letter-spacing:0; text-transform:none; }
      .ocp-ui svg { width:12px; height:12px; flex:none; display:block; }

      .ocp-line { display:block; box-sizing:border-box; min-width:0; margin:3px 0 2px; color:#808080; font-size:12px;
        font-weight:400; line-height:1.5; white-space:normal; text-align:left; cursor:default; }
      .ocp-line .ocp-row { display:flex; flex-wrap:wrap; align-items:center; gap:3px 10px; }
      .ocp-pills { display:inline-flex; flex-wrap:wrap; gap:4px; }
      .ocp-pill { display:inline-flex; align-items:center; height:18px; padding:0 7px; border-radius:999px;
        background:#F0F0F0; color:#555; font-size:11px; font-weight:700; white-space:nowrap; }
      .ocp-pill.ocp-muted { background:#F5F5F5 !important; color:#9A9A9A !important; font-weight:600; }
      .ocp-field { color:#555; }
      .ocp-field b { color:#808080; font-weight:600; }
      .ocp-note { color:#808080; }
      .ocp-warn { color:#B3261E; }
      .ocp-link { all:unset; display:inline-flex; align-items:center; gap:4px; cursor:pointer; color:#673AB6; font-weight:600; white-space:nowrap; }
      .ocp-link:hover { text-decoration:underline; }
      .ocp-link:focus-visible, .ocp-sub a:focus-visible { outline:2px solid #03A9F4; outline-offset:1px; border-radius:3px; }
      .ocp-link[aria-expanded="true"] { color:#5E35B1; text-decoration:underline; }
      .ocp-sub { margin:5px 0 2px; padding:6px 10px; border-left:2px solid #673AB6; border-radius:0 8px 8px 0; background:#FAF8FD; }
      .ocp-sub ul { margin:0 0 2px; padding:0; list-style:none; }
      .ocp-sub li { display:flex; flex-wrap:wrap; gap:0 8px; padding:1px 0; }
      .ocp-sub li a { color:#222; font-weight:600; text-decoration:none; }
      .ocp-sub li a:hover { color:#673AB6; text-decoration:underline; }

      .ocp-bar { margin:8px 0 10px; padding:8px 10px; border:1px solid #E6E0F0; border-radius:10px; background:#FBFAFD;
        color:#222; font-size:12px; font-weight:400; line-height:1.4; }
      .ocp-bar-row { display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
      .ocp-bar-label { display:inline-flex; align-items:center; gap:4px; margin-right:2px; color:#673AB6; font-weight:700; }
      .ocp-chip { all:unset; box-sizing:border-box; display:inline-flex; align-items:center; gap:5px; height:24px; padding:0 9px;
        border:1px solid #673AB6; border-radius:999px; background:#673AB6; color:#fff; cursor:pointer;
        font-size:12px; font-weight:600; transition:background .15s, color .15s; }
      .ocp-chip:hover { background:#5E35B1; }
      .ocp-chip[aria-pressed="false"] { border-color:#D6D6D6; background:#fff; color:#808080; }
      .ocp-chip[aria-pressed="false"] .ocp-chip-label { text-decoration:line-through; }
      .ocp-chip[aria-pressed="false"] svg { display:none; }
      .ocp-chip[aria-pressed="false"]:hover { border-color:#673AB6; color:#673AB6; }
      .ocp-chip:focus-visible, .ocp-gear:focus-visible, .ocp-actions button:focus-visible { outline:2px solid #03A9F4; outline-offset:2px; }
      .ocp-n { font-size:11px; font-weight:400; opacity:.85; }
      .ocp-status { display:inline-flex; align-items:center; gap:6px; margin-left:auto; color:#808080; }
      .ocp-gear { all:unset; display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px;
        border-radius:50%; color:#673AB6; cursor:pointer; }
      .ocp-gear:hover, .ocp-gear[aria-expanded="true"] { background:#F3EEF9; }
      .ocp-gear svg { width:16px; height:16px; }

      .ocp-settings { margin-top:10px; padding-top:10px; border-top:1px solid #E6E0F0; display:grid; gap:10px; }
      .ocp-settings[hidden] { display:none; }
      .ocp-set { display:grid; gap:4px; font-weight:600; }
      .ocp-checks { display:flex; flex-wrap:wrap; gap:4px 14px; }
      .ocp-checks label { display:inline-flex; align-items:center; gap:6px; font-weight:400; cursor:pointer; }
      .ocp-settings select { box-sizing:border-box; width:100%; height:30px; padding:0 8px; border:1px solid #D6D6D6;
        border-radius:6px; background:#fff; color:#222; font:inherit; font-weight:400; }
      .ocp-settings input[type="checkbox"] { accent-color:#673AB6; margin:0; }
      .ocp-actions { display:flex; gap:8px; }
      .ocp-actions button { all:unset; box-sizing:border-box; height:28px; padding:0 12px; border:1px solid #673AB6; border-radius:999px;
        color:#673AB6; font-weight:600; cursor:pointer; }
      .ocp-actions button:hover { background:#F3EEF9; }
      .ocp-debug { width:100%; height:120px; box-sizing:border-box; font:11px/1.4 ui-monospace, monospace; }
    `;
    document.head.appendChild(css);
  }

  // Lucide icons (line style, 2px stroke)
  const svg = (paths) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  const ICON_FILTER = svg('<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>');
  const ICON_CHECK = svg('<path d="M20 6 9 17l-5-5"/>');
  const ICON_SLIDERS = svg('<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>');
  const ICON_USER = svg('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>');
  const ICON_USERS = svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>');
  const ICON_TICKET = svg('<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>');
  const ICON_EXT = svg('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>');

  /* ---------------- Finding the panel and its rows ---------------- */
  // Confirmed on the live page. The generic selector is only a fallback in case HubSpot renames it.
  const ROW_TEST_ID = '[data-test-id="associate-panel-search-checkbox"]';
  const CHECKBOX = `${ROW_TEST_ID} input[type="checkbox"]`;
  const CHECKBOX_FALLBACK = 'input[type="checkbox"]';
  const HEADING = /^add existing compan(y|ies)$/i;

  function textOf(el) {
    let s = '';
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (!n.parentElement.closest('.ocp-ui')) s += n.nodeValue;
    return s.replace(/\s+/g, ' ').trim();
  }

  // The panel is only ever recognised by its heading, so other checkbox lists are left alone
  function findPanel() {
    const snap = document.evaluate("//text()[contains(., 'Add existing')]", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < snap.snapshotLength; i++) {
      let head = null;
      for (let e = snap.snapshotItem(i).parentElement, k = 0; e && k < 3; e = e.parentElement, k++) {
        if (HEADING.test(e.textContent.replace(/\s+/g, ' ').trim())) { head = e; break; }
        if (e.textContent.length > 60) break;
      }
      if (!head || head.closest('.ocp-ui')) continue;
      for (let e = head.parentElement, k = 0; e && k < 20; e = e.parentElement, k++) {
        if (e.querySelector(CHECKBOX)) return { panel: e, head, fallback: false };
        // In the top page, never treat a page-wide element as the panel
        if (window.top === window && e.getBoundingClientRect().width > window.innerWidth * 0.8) break;
        if (e === document.body) {
          return e.querySelector(CHECKBOX_FALLBACK) && window.top !== window ? { panel: e, head, fallback: true } : null;
        }
      }
    }
    return null;
  }

  // A row is the nearest ancestor of the checkbox whose parent holds more than one checkbox.
  // HubSpot renders the list in chunks, and a chunk can hold a single row, so every row uses the
  // smallest depth found. A search with one result reuses the depth learned from a full list.
  let rowDepth = 0;
  // Row checkboxes only: never the tick boxes in this script's own settings
  const rowBoxes = (el) => [...el.querySelectorAll('input[type="checkbox"]')].filter((b) => !b.closest('.ocp-ui'));
  function depthOf(box, panel) {
    let el = box;
    for (let i = 0; i < 14 && el.parentElement && el.parentElement !== panel; i++) {
      if (rowBoxes(el.parentElement).length > 1) return i;
      el = el.parentElement;
    }
    return -1;
  }
  function climb(box, depth, panel) {
    let el = box;
    for (let i = 0; i < depth && el.parentElement && el.parentElement !== panel; i++) el = el.parentElement;
    return el;
  }

  function getRows(panel, fallback) {
    const items = [];
    const boxes = [...panel.querySelectorAll(fallback ? CHECKBOX_FALLBACK : CHECKBOX)].filter((b) => !b.closest('.ocp-ui'));
    const depths = boxes.map((b) => depthOf(b, panel)).filter((d) => d >= 0);
    if (depths.length) rowDepth = Math.min(...depths);
    for (const box of boxes) {
      let row;
      if (rowDepth) row = climb(box, rowDepth, panel);
      else {
        const marked = box.closest(ROW_TEST_ID);
        row = marked && marked.parentElement !== panel ? marked.parentElement : marked;
      }
      if (!row) continue;
      const label = textOf(row);
      if (!label || label.length > 300) continue;
      items.push({ box, row, label });
    }
    return items;
  }

  function lca(els) {
    let a = els[0];
    while (a && !els.every((e) => a.contains(e))) a = a.parentElement;
    return a;
  }

  // Match each row to HubSpot's own company record: by name, then by position
  function matchRows(rows) {
    const byName = new Map();
    const lists = new Set();
    const add = (it, i) => {
      const rec = recFromItem(it);
      rec.index = i;
      const k = norm(rec.name);
      if (!byName.has(k)) byName.set(k, []);
      const list = byName.get(k);
      const at = list.findIndex((r) => r.id === rec.id);
      if (at < 0) list.push(rec); else if (i >= 0) list[at] = rec;
      return rec;
    };
    rows.forEach((r) => {
      const near = companiesNear(r.box);
      r.own = near.own ? add(near.own, -1) : null;
      r.list = near.lists[0] || null; // the nearest list is the one this row was drawn from
      for (const list of near.lists) if (!lists.has(list)) { lists.add(list); list.forEach(add); }
    });
    // Own company first, then the same position in the row's own list, then by name.
    // Two companies can share a name, so a company already used by another row is skipped.
    let found = 0;
    const used = new Set();
    rows.forEach((r, i) => {
      r.rec = null;
      if (r.own && matchesName(r.label, r.own)) r.rec = r.own;
      else if (r.list && isCompany(r.list[i]) && matchesName(r.label, records.get(String(r.list[i].objectId)))) {
        r.rec = records.get(String(r.list[i].objectId));
      }
      if (r.rec) { used.add(r.rec.id); found++; }
    });
    rows.forEach((r) => {
      if (r.rec) return;
      const { name } = splitLabel(r.label);
      const cands = [...(byName.get(norm(r.label)) || []), ...(byName.get(norm(name)) || [])].filter((rec) => matchesName(r.label, rec));
      r.rec = cands.find((c) => !used.has(c.id)) || cands[0] || null;
      if (r.rec) { used.add(r.rec.id); found++; }
    });
    const msg = `Matched ${found} of ${rows.length} rows from ${lists.size} list(s)`;
    if (!notes.length || !notes[notes.length - 1].endsWith(msg)) note(msg);
    return found ? 'react' : 'none';
  }

  /* ---------------- Line under each company ---------------- */
  // The name's text, which HubSpot splits into pieces when it bolds your search term
  function nameTexts(row) {
    const out = [];
    const w = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeValue.trim() && !n.parentElement.closest('.ocp-ui')) out.push(n);
    }
    return out;
  }
  const rectOf = (node) => { const r = document.createRange(); r.selectNodeContents(node); return r.getBoundingClientRect(); };

  // The element holding the whole name, so the line goes after all of it
  function nameHost(row) {
    const texts = nameTexts(row);
    if (!texts.length) return { host: row, first: null };
    let host = lca(texts.map((t) => t.parentElement));
    if (!host || !row.contains(host)) host = row;
    const trigger = host.closest('a, button, [role="button"]');
    if (trigger && row.contains(trigger) && trigger !== row) host = trigger.parentElement;
    return { host, first: texts[0] };
  }

  // Put the line under the name. HubSpot's rows are flex rows, so the line is made
  // full width (forcing a wrap) and indented to start where the name starts.
  function placeLine(row, line) {
    const { host: nameEl, first } = nameHost(row);
    const tries = nameEl !== row ? [nameEl, row] : [row];
    for (const host of tries) {
      if (line.parentElement !== host || line.nextSibling) host.appendChild(line);
      line.__ocpHost = host;
      const cs = getComputedStyle(host);
      line.style.flex = '';
      line.style.width = '';
      if (/flex/.test(cs.display) && !/column/.test(cs.flexDirection)) {
        host.style.flexWrap = 'wrap';
        line.style.flex = '1 0 100%';
        line.style.width = '100%';
      } else if (/grid/.test(cs.display)) {
        line.style.gridColumn = '1 / -1';
      }
      line.style.marginLeft = '';
      if (!first) return;
      const t = rectOf(first);
      const l = line.getBoundingClientRect();
      const off = Math.round(t.left - l.left);
      if (off > 2) line.style.marginLeft = off + 'px';
      if (line.getBoundingClientRect().top >= t.bottom - 2) return; // it sits below the name
    }
  }

  function ownerName(rec) {
    const id = rec.props.hubspot_owner_id;
    if (!id) return '';
    return owners.get(String(id)) || '';
  }

  function lineHtml(r) {
    if (r.state === 'loading') return '<span class="ocp-note">Loading products…</span>';
    if (r.state === 'error') return `<span class="ocp-note ocp-warn" title="${esc(r.msg)}">Couldn't load details</span>`;
    if (r.state === 'missing') return '<span class="ocp-note">No details found</span>';

    const recs = r.recs;
    const rec = recs[0];
    const prods = [...new Set(recs.flatMap(productsOf))];
    const pills = prods.length
      ? prods.map((v) => {
        const d = productDef(v);
        const style = d ? ` style="background:${d.bg};color:${d.fg}"` : '';
        return `<span class="ocp-pill${isOff(chipKey(v)) ? ' ocp-muted' : ''}"${style}>${esc(d ? d.label : v)}</span>`;
      }).join('')
      : '<span class="ocp-pill ocp-muted">No product</span>';
    const parts = [`<span class="ocp-pills">${pills}</span>`];
    if (recs.length > 1) parts.push(`<span class="ocp-note">${recs.length} companies with this name</span>`);

    if (settings.owner && rec.props.hubspot_owner_id) {
      const name = ownerName(rec);
      if (name) parts.push(`<span class="ocp-field" title="Company owner">${ICON_USER.replace('<svg ', '<svg style="display:inline;vertical-align:-1px;margin-right:3px" ')}${esc(name)}</span>`);
    }
    for (const f of FIELDS) {
      // If owner names can't be looked up, LS, O, T still shows the owner's first name
      const fallback = f.name === 'lifecycle__owner__tech' && settings.owner && ownersState === 'failed';
      if (!settings.fields.includes(f.name) && !fallback) continue;
      const v = fmtValue(rec.props[f.name]);
      if (v) parts.push(`<span class="ocp-field"><b>${esc(f.label)}:</b> ${esc(v)}</span>`);
    }
    const ex = expanded.get(rec.id);
    if (settings.contacts) {
      const n = Number(rec.props.num_associated_contacts) || 0;
      parts.push(n
        ? `<button type="button" class="ocp-link" data-act="contacts" data-id="${rec.id}" aria-expanded="${!!ex && ex.kind === 'contacts'}" title="List contacts">${ICON_USERS}${n} contact${n === 1 ? '' : 's'}</button>`
        : '<span class="ocp-note">No contacts</span>');
    }
    if (settings.tickets) {
      parts.push(`<button type="button" class="ocp-link" data-act="tickets" data-id="${rec.id}" aria-expanded="${!!ex && ex.kind === 'tickets'}" title="List tickets">${ICON_TICKET}Tickets</button>`);
    }
    if (settings.open) {
      parts.push(`<a class="ocp-link" href="${recordUrl('0-2', rec.id)}" target="_blank" rel="noopener" data-act="open" title="Open the company in a new tab">Open${ICON_EXT}</a>`);
    }
    return `<div class="ocp-row">${parts.join('')}</div>` + (ex ? subHtml(rec, ex) : '');
  }

  function subHtml(rec, ex) {
    const what = ex.kind;
    const openCompany = (text) => `<a class="ocp-link" href="${recordUrl('0-2', rec.id)}" target="_blank" rel="noopener" data-act="open">${text}${ICON_EXT}</a>`;
    if (ex.state === 'loading') return `<div class="ocp-sub"><span class="ocp-note">Loading ${what}…</span></div>`;
    if (ex.state === 'error') {
      return `<div class="ocp-sub"><span class="ocp-note" title="${esc(ex.msg)}">Couldn't list ${what} here.</span> ${openCompany('See them on the company')}</div>`;
    }
    if (!ex.items.length) return `<div class="ocp-sub"><span class="ocp-note">No ${what}.</span></div>`;
    const type = what === 'contacts' ? '0-1' : '0-5';
    const lis = ex.items.slice(0, 10).map((i) =>
      `<li><a href="${recordUrl(type, i.id)}" target="_blank" rel="noopener" data-act="open">${esc(i.title)}</a>` +
      (i.meta ? `<span class="ocp-note">${esc(i.meta)}</span>` : '') + '</li>').join('');
    const more = ex.total > 10 ? openCompany(`See all ${ex.total} on the company`) : '';
    return `<div class="ocp-sub"><ul>${lis}</ul>${more}</div>`;
  }

  function onLineClick(e) {
    e.stopPropagation(); // clicks on the line never tick the row
    const t = e.target.closest('[data-act]');
    if (!t || t.tagName === 'A') return; // links open in a new tab as normal
    e.preventDefault();
    toggleList(t.dataset.id, t.dataset.act);
  }

  function renderLine(it, r) {
    let line = it.row.querySelector('.ocp-line');
    if (!line) {
      line = document.createElement('div');
      line.className = 'ocp-ui ocp-line';
      line.addEventListener('click', onLineClick);
      for (const t of ['mousedown', 'pointerdown', 'keydown']) line.addEventListener(t, (e) => e.stopPropagation());
      placeLine(it.row, line);
    } else if (nameHost(it.row).host !== line.__ocpHost && line.__ocpHost !== it.row) {
      placeLine(it.row, line); // HubSpot re-drew the name, for example to bold a search term
    }
    const html = lineHtml(r);
    if (line.__ocpHtml !== html) { setHTML(line, html); line.__ocpHtml = html; }
  }

  /* ---------------- Filter bar above the list ---------------- */
  const CHIPS = [...PRODUCTS.map((p) => ({ key: p.value, label: p.label })),
    { key: OTHER, label: 'Other', title: 'Any other product, such as OrderMate or Deliverit' },
    { key: NONE, label: 'No product', title: 'Companies with no product set' }];

  function buildBar() {
    const bar = document.createElement('div');
    bar.className = 'ocp-ui ocp-bar';
    setHTML(bar,
      '<div class="ocp-bar-row">' +
      `<span class="ocp-bar-label">${ICON_FILTER}Show</span>` +
      CHIPS.map((c) => `<button type="button" class="ocp-chip" data-chip="${esc(c.key)}"${c.title ? ` title="${esc(c.title)}"` : ''}>` +
        `${ICON_CHECK}<span class="ocp-chip-label">${esc(c.label)}</span><span class="ocp-n"></span></button>`).join('') +
      '<span class="ocp-status"></span>' +
      `<button type="button" class="ocp-gear" data-act="settings" title="Settings" aria-label="Settings" aria-expanded="false">${ICON_SLIDERS}</button>` +
      '</div>' +
      '<div class="ocp-settings" hidden>' +
      '<label class="ocp-set">Rows per page<select data-set="pageSize">' +
      '<option value="0">Leave as HubSpot sets it</option><option>10</option><option>30</option><option>100</option></select></label>' +
      '<div class="ocp-set">Under each company<div class="ocp-checks">' +
      '<label><input type="checkbox" data-set="owner">Owner</label>' +
      '<label><input type="checkbox" data-set="contacts">Contacts</label>' +
      '<label><input type="checkbox" data-set="tickets">Tickets</label>' +
      '<label><input type="checkbox" data-set="open">Open link</label></div></div>' +
      '<div class="ocp-set">Extra fields<div class="ocp-checks">' +
      FIELDS.map((f) => `<label><input type="checkbox" data-field="${f.name}">${esc(f.label)}</label>`).join('') +
      '</div></div>' +
      '<div class="ocp-actions"><button type="button" data-act="debug">Copy debug info</button><button type="button" data-act="reset">Reset</button></div>' +
      '</div>');

    bar.addEventListener('click', (e) => {
      e.stopPropagation();
      const chip = e.target.closest('[data-chip]');
      const act = e.target.closest('[data-act]');
      if (chip) {
        const k = chip.dataset.chip;
        settings.off = isOff(k) ? settings.off.filter((x) => x !== k) : [...settings.off, k];
        save();
        refreshSearch();
      } else if (act && act.dataset.act === 'settings') {
        const box = bar.querySelector('.ocp-settings');
        box.hidden = !box.hidden;
        act.setAttribute('aria-expanded', String(!box.hidden));
        if (!box.hidden) fillSettings(bar);
      } else if (act && act.dataset.act === 'showhidden') {
        settings.showHidden = !settings.showHidden;
        save();
      } else if (act && act.dataset.act === 'nextpage') {
        const next = findNextPage(bar.closest('body'));
        if (next) next.click();
        return;
      } else if (act && act.dataset.act === 'debug') {
        copyDebug(act, bar);
      } else if (act && act.dataset.act === 'reset') {
        settings = { ...DEFAULTS };
        save();
        refreshSearch();
        fillSettings(bar);
      } else {
        return;
      }
      scheduleRun(0);
    });
    bar.addEventListener('change', (e) => {
      const el = e.target;
      if (el.dataset.field) {
        settings.fields = el.checked ? [...settings.fields, el.dataset.field] : settings.fields.filter((f) => f !== el.dataset.field);
      } else if (el.dataset.set === 'pageSize') {
        settings.pageSize = Number(el.value) || 0;
        sized = new WeakSet();
      } else if (el.dataset.set) {
        settings[el.dataset.set] = el.checked;
      } else {
        return;
      }
      save();
      scheduleRun(0);
    });
    for (const t of ['mousedown', 'pointerdown', 'keydown', 'keyup', 'keypress']) bar.addEventListener(t, (e) => e.stopPropagation());
    return bar;
  }

  function fillSettings(bar) {
    bar.querySelector('[data-set="pageSize"]').value = String(settings.pageSize || 0);
    for (const k of ['owner', 'contacts', 'tickets', 'open']) bar.querySelector(`[data-set="${k}"]`).checked = !!settings[k];
    for (const el of bar.querySelectorAll('[data-field]')) el.checked = settings.fields.includes(el.dataset.field);
  }

  function updateBar(bar, counts, stats) {
    for (const chip of bar.querySelectorAll('[data-chip]')) {
      const k = chip.dataset.chip;
      const pressed = String(!isOff(k));
      if (chip.getAttribute('aria-pressed') !== pressed) chip.setAttribute('aria-pressed', pressed);
      const n = counts.get(k) ? String(counts.get(k)) : '';
      const nEl = chip.querySelector('.ocp-n');
      if (nEl.textContent !== n) nEl.textContent = n;
    }
    let html = '';
    if (stats.errors && !stats.ready) html = `<span class="ocp-warn" title="${esc(apiError)}">Couldn't load products. Settings &gt; Copy debug info.</span>`;
    else if (stats.loading) html = `<span>Loading ${stats.loading}…</span>`;
    if (stats.filtered) {
      html += `<span>${stats.filtered} of ${stats.total} ${settings.showHidden ? 'faded' : 'hidden'}</span>` +
        `<button type="button" class="ocp-link" data-act="showhidden">${settings.showHidden ? 'Hide' : 'Show'}</button>`;
      // A whole page filtered out: say so, and offer the next page
      if (stats.filtered === stats.total && !settings.showHidden && stats.hasNext) {
        html += '<button type="button" class="ocp-link" data-act="nextpage">Next page ›</button>';
      }
    }
    if (serverFilter === 'broken') html += `<span class="ocp-warn" title="${esc(lastServer)}">Filtering this page only</span>`;
    const status = bar.querySelector('.ocp-status');
    if (status.__ocpHtml !== html) { setHTML(status, html); status.__ocpHtml = html; }
  }

  /* ---------------- Rows per page ---------------- */
  let sized = new WeakSet();
  let sizing = false;

  function findSizeControl(panel) {
    for (const b of panel.querySelectorAll('button, [role="button"], [role="combobox"]')) {
      if (!b.closest('.ocp-ui') && /^\d+ items\W*$/i.test(b.textContent.replace(/\s+/g, ' ').trim())) return b;
    }
    return null;
  }

  // HubSpot's own next-page arrow, beside the page numbers (not the Next step button)
  function findNextPage(scope) {
    const next = scope.querySelector('nav[aria-label="Pagination"] [data-next-page="true"], button[aria-label="Next page"]');
    if (!next || next.disabled || next.getAttribute('aria-disabled') === 'true') return null;
    return next;
  }

  function findOption(size, ctl) {
    const re = new RegExp(`^${size} items$`, 'i');
    const opts = [...document.querySelectorAll('[role="option"], [role="menuitem"], [role="menuitemradio"], li, button, a')]
      .filter((el) => el !== ctl && !ctl.contains(el) && !el.closest('.ocp-ui') && el.getClientRects().length > 0 &&
        re.test(el.textContent.replace(/\s+/g, ' ').trim()));
    return opts[opts.length - 1] || null;
  }

  async function choosePageSize(ctl, size) {
    ctl.click();
    for (let i = 0; i < 12; i++) {
      await sleep(120);
      const opt = findOption(size, ctl);
      if (opt) { opt.click(); return true; }
    }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return false;
  }

  // Once per panel, so changing it yourself afterwards sticks
  function autoPageSize(panel) {
    const size = Number(settings.pageSize) || 0;
    if (!size || sizing || sized.has(panel)) return;
    const ctl = findSizeControl(panel);
    if (!ctl) return;
    sized.add(panel);
    if (parseInt(ctl.textContent, 10) === size) return;
    sizing = true;
    choosePageSize(ctl, size)
      .then((ok) => note(ok ? `Rows per page set to ${size}` : `Couldn't find the ${size} items option`))
      .catch((e) => note('Rows per page failed: ' + e.message))
      .finally(() => { sizing = false; });
  }

  /* ---------------- Main pass ---------------- */
  let lastPass = null;

  function processPanel({ panel, head, fallback }) {
    autoPageSize(panel);
    const rows = getRows(panel, fallback);
    if (!rows.length) return;
    const source = matchRows(rows);
    if (settings.owner) loadOwners();

    const list = rows.length > 1 ? lca(rows.map((r) => r.row)) : rows[0].row.parentElement;
    let bar = panel.querySelector('.ocp-bar');
    if (!bar && list) {
      bar = buildBar();
      const anchor = list !== panel && !list.contains(head) && !list.querySelector('input:not([type="checkbox"])') ? list : rows[0].row;
      anchor.parentElement.insertBefore(bar, anchor);
    }

    const counts = new Map();
    const stats = { ready: 0, loading: 0, errors: 0, filtered: 0, total: rows.length };
    for (const it of rows) {
      const r = it.rec ? { state: 'ready', recs: [it.rec] } : resolveByName(it.label);
      it.how = it.rec ? 'react' : 'name';
      renderLine(it, r);
      stats[r.state === 'ready' ? 'ready' : r.state === 'loading' ? 'loading' : 'errors']++;

      let hide = false;
      if (r.state === 'ready') {
        for (const k of chipKeys(r.recs)) counts.set(k, (counts.get(k) || 0) + 1);
        hide = !wanted(r.recs);
      }
      if (hide) stats.filtered++;
      const hidden = hide && !settings.showHidden;
      const dim = hide && settings.showHidden;
      if (it.row.hasAttribute('data-ocp-hidden') !== hidden) it.row.toggleAttribute('data-ocp-hidden', hidden);
      if (it.row.hasAttribute('data-ocp-dim') !== dim) it.row.toggleAttribute('data-ocp-dim', dim);
    }
    if (bar) {
      stats.hasNext = stats.filtered === stats.total && !!findNextPage(panel);
      updateBar(bar, counts, stats);
    }
    lastPass = { rows, stats, source };
  }

  let lastError = '';
  function run() {
    const p = findPanel();
    if (p) processPanel(p);
  }

  let runTimer = null;
  function scheduleRun(delay = 200) {
    if (runTimer) { if (delay) return; clearTimeout(runTimer); }
    runTimer = setTimeout(() => {
      runTimer = null;
      try { run(); } catch (e) {
        lastError = (e && e.stack || String(e)).split('\n').slice(0, 3).join(' | ');
        note('Error: ' + e.message);
      }
    }, delay);
  }

  /* ---------------- Debug info ---------------- */
  // Shape of the page only: tags, classes and attribute names, with text replaced by its length
  function skeleton(el, depth) {
    if (!el || depth > 8) return '';
    const pad = '  '.repeat(depth);
    if (el.nodeType === 3) return el.nodeValue.trim() ? `${pad}"…${el.nodeValue.trim().length} chars"\n` : '';
    if (el.nodeType !== 1 || el.classList.contains('ocp-ui')) return '';
    const attrs = [...el.attributes].filter((a) => a.name !== 'style' && a.name !== 'class')
      .map((a) => (/^(type|role|data-test-id|data-selenium-test|data-testid)$/.test(a.name) ? `${a.name}="${a.value}"` : a.name)).join(' ');
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    let s = `${pad}<${el.tagName.toLowerCase()}${cls}${attrs ? ' ' + attrs : ''}> {${getComputedStyle(el).display}}\n`;
    for (const c of el.childNodes) s += skeleton(c, depth + 1);
    return s;
  }

  function debugText() {
    const p = findPanel();
    const rows = p ? getRows(p.panel, p.fallback) : [];
    const how = {};
    if (lastPass) lastPass.rows.forEach((r) => { how[r.how] = (how[r.how] || 0) + 1; });
    const ctl = p && findSizeControl(p.panel);
    return [
      `HubSpot: Products in company search ${VERSION}`,
      `Frame: ${location.pathname.replace(/\d{5,}/g, '#')} (${window.top === window ? 'top page' : 'embedded frame'})`,
      `Panel: ${p ? (p.fallback ? 'found (fallback checkboxes)' : 'found') : 'not found'}, rows: ${rows.length}, rows-per-page control: ${ctl ? `"${ctl.textContent.trim()}"` : 'not found'}`,
      `Row data from: ${JSON.stringify(how)}, owners: ${ownersState} (${owners.size}), Trusted Types policy: ${!!ttPolicy}`,
      `Last pass: ${lastPass ? JSON.stringify(lastPass.stats) : 'none'}, row depth: ${rowDepth}`,
      `Product filter in HubSpot's search: ${serverFilter}${lastServer ? ' (' + lastServer + ')' : ''}`,
      `Last API error: ${apiError || 'none'}`,
      `Last run error: ${lastError || 'none'}`,
      '', 'Notes:', ...notes.map((l) => '  ' + l),
      '', 'First row:', rows[0] ? skeleton(rows[0].row, 0) : '  (no rows)',
    ].join('\n');
  }

  function copyDebug(btn, bar) {
    const text = debugText();
    const done = () => { btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = 'Copy debug info'; }, 2000); };
    const fallback = () => {
      let ta = bar.querySelector('.ocp-debug');
      if (!ta) {
        ta = document.createElement('textarea');
        ta.className = 'ocp-debug';
        ta.readOnly = true;
        bar.querySelector('.ocp-settings').appendChild(ta);
      }
      ta.value = text;
      ta.select();
      btn.textContent = 'Copy the text below';
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  /* ---------------- Start ---------------- */
  // In the console of the panel's frame, type ocpDebug() to see what the script can see
  window.ocpDebug = () => debugText();

  function start() {
    injectStyles();
    new MutationObserver(() => scheduleRun()).observe(document.body, { childList: true, subtree: true, characterData: true });
    scheduleRun();
  }
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
