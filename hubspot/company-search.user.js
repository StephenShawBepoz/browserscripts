// ==UserScript==
// @name         HubSpot: Products in company search
// @namespace    oolio-userscripts
// @version      1.0.0
// @description  In the Add existing Company panel, shows each company's products under its name, lets you hide products you don't work with, links to contacts and tickets, and shows 100 per page.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/company-search.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/company-search.user.js
// @match        https://app.hubspot.com/*
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTQwLjA5OSAwQzE3My4xODEgMCAyMDAgMjYuNjk3OSAyMDAgNTkuNjMxNEMyMDAgOTIuNTY0OSAxNzMuMTgxIDExOS4yNjMgMTQwLjA5OSAxMTkuMjYzQzEyNC42NzcgMTE5LjI2MyAxMTAuNjE2IDExMy40NjEgOTkuOTk4NiAxMDMuOTNDODkuMzgzNyAxMTMuNDYxIDc1LjMyMjkgMTE5LjI2MyA1OS45MDEgMTE5LjI2M0MyNi44MTg2IDExOS4yNjMgMCA5Mi41NjQ5IDAgNTkuNjMxNEMwIDI2LjY5NzkgMjYuODE4NiAwIDU5LjkwMSAwQzc1LjMyMzIgMCA4OS4zODQxIDUuODAxOTUgMTAwLjAwMSAxNS4zMzI5QzExMC42MTYgNS44MDE3NyAxMjQuNjc3IDAgMTQwLjA5OSAwWk0xNDAuMDk5IDM5LjkxODVDMTI5LjE2MyAzOS45MTg1IDEyMC4yOTcgNDguNzQ0MyAxMjAuMjk3IDU5LjYzMTRDMTIwLjI5NyA3MC41MTg1IDEyOS4xNjMgNzkuMzQ0MiAxNDAuMDk5IDc5LjM0NDJDMTUxLjAzNSA3OS4zNDQyIDE1OS45MDEgNzAuNTE4NSAxNTkuOTAxIDU5LjYzMTRDMTU5LjkwMSA0OC43NDQzIDE1MS4wMzUgMzkuOTE4NSAxNDAuMDk5IDM5LjkxODVaTTU5LjkwMSAzOS45MTg1QzQ4Ljk2NDcgMzkuOTE4NSA0MC4wOTkgNDguNzQ0MyA0MC4wOTkgNTkuNjMxNEM0MC4wOTkgNzAuNTE4NSA0OC45NjQ3IDc5LjM0NDIgNTkuOTAxIDc5LjM0NDJDNzAuODM3MyA3OS4zNDQyIDc5LjcwMyA3MC41MTg1IDc5LjcwMyA1OS42MzE0Qzc5LjcwMyA0OC43NDQzIDcwLjgzNzMgMzkuOTE4NSA1OS45MDEgMzkuOTE4NVoiIGZpbGw9IiM2NzNBQjYiLz4KPC9zdmc+Cg==
// @grant        none
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  /* ---------------- Products ---------------- */
  // The HubSpot company property that holds the products, and the chips shown above
  // the list. value = what HubSpot stores, label = what you see. Anything not listed
  // here counts as "Other".
  const PRODUCT_PROPERTY = 'product';
  const PRODUCTS = [
    { value: 'Bepoz', label: 'Bepoz' },
    { value: 'Oolio POS', label: 'Oolio One' },
    { value: 'Oolio Pay', label: 'Oolio Pay' },
    { value: 'SwiftPOS', label: 'SwiftPOS' },
    { value: 'Idealpos', label: 'Idealpos' },
  ];
  const OTHER = '__other';
  const NONE = '__none';

  // Friendly labels for extra fields. Anything else shows its internal name.
  const FIELD_LABELS = {
    lifecycle__owner__tech: 'LS, O, T',
    full_address: 'Address',
    city: 'City',
    state: 'State',
    existing_pos_: 'Existing POS',
    lifecyclestage: 'Lifecycle stage',
    domain: 'Domain',
    phone: 'Phone',
  };

  /* ---------------- Your settings (saved in this browser) ---------------- */
  const STORE_KEY = 'oolio-company-search';
  const DEFAULTS = {
    off: [],                          // chips switched off
    showHidden: false,                // show filtered companies faded instead of hiding them
    pageSize: 100,                    // 0 leaves HubSpot's page size alone
    contacts: true,
    tickets: true,
    open: true,
    fields: ['lifecycle__owner__tech'],
  };
  let settings = load();

  function load() {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') };
    } catch (e) {
      return { ...DEFAULTS };
    }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch (e) { /* private window */ }
  }
  const isOff = (key) => settings.off.includes(key);

  const VERSION = typeof GM_info !== 'undefined' ? GM_info.script.version : '';

  /* ---------------- Debug notes ---------------- */
  const notes = [];
  const netLog = [];
  function note(msg) {
    notes.push(new Date().toTimeString().slice(0, 8) + ' ' + msg);
    if (notes.length > 30) notes.shift();
  }

  /* ---------------- Company cache ---------------- */
  const records = new Map(); // company ID -> { id, name, domain, props, have }
  const byName = new Map();  // normalised name -> Set of IDs
  const norm = (s) => String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

  function neededProps() {
    return [...new Set(['name', 'domain', PRODUCT_PROPERTY, 'num_associated_contacts', ...settings.fields])];
  }
  const hasAll = (rec, props) => !!rec && props.every((p) => rec.have.has(p));

  // Results from HubSpot's search. `requested` is the property list that was asked for,
  // so a missing property means "empty" rather than "not fetched".
  function ingest(results, requested) {
    if (!Array.isArray(results)) return 0;
    let n = 0;
    for (const r of results) {
      const id = String((r && (r.objectId != null ? r.objectId : r.id)) || '');
      if (!/^\d+$/.test(id)) continue;
      const p = r.properties || {};
      const val = (k) => {
        const v = p[k];
        if (v == null) return '';
        return typeof v === 'object' ? String(v.value == null ? '' : v.value) : String(v);
      };
      const rec = records.get(id) || { id, name: '', domain: '', props: {}, have: new Set() };
      for (const k of requested || Object.keys(p)) {
        rec.props[k] = val(k);
        rec.have.add(k);
      }
      if (val('name')) rec.name = val('name');
      if (val('domain')) rec.domain = val('domain');
      records.set(id, rec);
      if (rec.name) {
        const key = norm(rec.name);
        if (!byName.has(key)) byName.set(key, new Set());
        byName.get(key).add(id);
      }
      n++;
    }
    return n;
  }

  /* ---------------- Network ---------------- */
  // HubSpot's own company search gets the product fields added to it, so the
  // list usually arrives with everything needed and no extra lookups.
  const SEARCH_PATH = /\/crm-search\/search(?:\?|$)/;
  const origFetch = window.fetch;

  function logRequest(url, body) {
    try {
      const path = String(url).replace(/^https?:\/\/[^/]+/, '').split('?')[0];
      if (!/\/api\//.test(path) || !/search|graphql|associat/i.test(path)) return;
      let info = '';
      if (typeof body === 'string' && body.length < 200000 && body[0] === '{') {
        const j = JSON.parse(body);
        info = ' keys=' + Object.keys(j).slice(0, 12).join(',');
        if (j.objectTypeId) info += ' type=' + j.objectTypeId;
        if (j.operationName) info += ' op=' + j.operationName;
      }
      netLog.push(path.replace(/\d{6,}/g, '#') + info);
      if (netLog.length > 15) netLog.shift();
    } catch (e) { /* ignore */ }
  }

  function augment(url, body) {
    if (!SEARCH_PATH.test(String(url)) || typeof body !== 'string' || body.length > 200000 || body[0] !== '{') return null;
    try {
      const j = JSON.parse(body);
      if (String(j.objectTypeId) !== '0-2') return null;
      const list = j.requestOptions && Array.isArray(j.requestOptions.properties) ? j.requestOptions.properties
        : Array.isArray(j.properties) ? j.properties : null;
      if (!list) return null;
      for (const p of neededProps()) if (!list.includes(p)) list.push(p);
      return { body: JSON.stringify(j), props: list.slice() };
    } catch (e) {
      return null;
    }
  }

  function ingestResponse(j, props) {
    const n = ingest(j && j.results, props);
    if (n) { note(`Panel search: ${n} companies`); scheduleRun(); }
  }

  window.fetch = function (input, init) {
    let aug = null;
    try {
      const url = typeof input === 'string' ? input : input && (input.url || input.href);
      logRequest(url, init && init.body);
      aug = augment(url, init && init.body);
      if (aug) init = { ...init, body: aug.body };
    } catch (e) { aug = null; }
    const res = origFetch.call(window, input, init);
    if (aug) {
      const props = aug.props;
      res.then((r) => r.clone().json()).then((j) => ingestResponse(j, props)).catch(() => {});
    }
    return res;
  };

  const xhrOpen = XMLHttpRequest.prototype.open;
  const xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__ocpUrl = String(url);
    return xhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    let aug = null;
    try {
      logRequest(this.__ocpUrl, body);
      aug = augment(this.__ocpUrl, body);
      if (aug) {
        const props = aug.props;
        this.addEventListener('load', () => {
          try {
            const j = this.responseType === 'json' ? this.response
              : (!this.responseType || this.responseType === 'text') ? JSON.parse(this.responseText) : null;
            ingestResponse(j, props);
          } catch (e) { /* ignore */ }
        });
      }
    } catch (e) { aug = null; }
    return aug ? xhrSend.call(this, aug.body) : xhrSend.apply(this, arguments);
  };

  /* ---------------- HubSpot API (uses your login) ---------------- */
  function portalId() {
    const m = location.pathname.match(/^\/[\w-]+\/(\d+)(?:\/|$)/);
    return m ? m[1] : '';
  }
  function csrf() {
    const m = document.cookie.match(/(?:^|;\s*)hubspotapi-csrf=([^;]*)/) || document.cookie.match(/(?:^|;\s*)csrf\.app=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : '';
  }
  const recordUrl = (type, id) => `/contacts/${portalId()}/record/${type}/${id}`;

  let apiError = '';
  async function crmSearch(objectTypeId, { filters = [], query = '', count = 100, props }) {
    const pid = portalId();
    if (!pid) throw new Error('No portal ID in the page address');
    const res = await origFetch.call(window, `/api/crm-search/search?portalId=${pid}&clienttimeout=14000`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-HubSpot-CSRF-hubspotapi': csrf() },
      body: JSON.stringify({
        objectTypeId, count, offset: 0, query,
        filterGroups: [{ filters }],
        sorts: [],
        requestOptions: { properties: props },
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HubSpot returned ${res.status}${text ? ': ' + text.slice(0, 160) : ''}`);
    }
    apiError = '';
    return res.json();
  }

  // Look up companies by ID, up to 100 at a time
  const wantIds = new Set();
  const inflight = new Set();
  const failed = new Map(); // id -> { msg, at }
  const badIds = new Set();  // IDs that turned out not to be this company
  let idTimer = null;

  function requestIds(ids) {
    for (const id of ids) if (!inflight.has(id)) wantIds.add(id);
    if (wantIds.size && !idTimer) idTimer = setTimeout(flushIds, 120);
  }
  async function flushIds() {
    idTimer = null;
    const ids = [...wantIds].slice(0, 100);
    ids.forEach((id) => { wantIds.delete(id); inflight.add(id); });
    if (wantIds.size) idTimer = setTimeout(flushIds, 50);
    if (!ids.length) return;
    const props = neededProps();
    try {
      const j = await crmSearch('0-2', {
        filters: [{ property: 'hs_object_id', operator: 'IN', values: ids }], count: ids.length, props,
      });
      ingest(j.results, props);
      const missing = ids.filter((id) => !hasAll(records.get(id), props));
      missing.forEach((id) => badIds.add(id));
      note(`ID lookup: ${ids.length - missing.length} of ${ids.length} found`);
    } catch (e) {
      apiError = e.message;
      ids.forEach((id) => failed.set(id, { msg: e.message, at: Date.now() }));
      note('ID lookup failed: ' + e.message);
    } finally {
      ids.forEach((id) => inflight.delete(id));
      scheduleRun();
    }
  }

  // Fallback when a row's ID can't be read: search by its name, three at a time
  const nameJobs = new Map(); // normalised label -> { state, msg, at }
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
      const props = neededProps();
      nameActive++;
      nameJobs.set(key, { state: 'pending' });
      crmSearch('0-2', { query: splitLabel(label).name, count: 20, props })
        .then((j) => { ingest(j.results, props); nameJobs.set(key, { state: 'done', at: Date.now() }); })
        .catch((e) => {
          apiError = e.message;
          nameJobs.set(key, { state: 'error', msg: e.message, at: Date.now() });
          note('Name lookup failed: ' + e.message);
        })
        .finally(() => { nameActive--; pumpNames(); scheduleRun(); });
    }
  }

  // Contacts and tickets for one company, shown when you click the link
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
    note(`${kind} lookup failed: ${lastErr.message}`);
    expanded.set(id, { kind, state: 'error', msg: lastErr.message });
    scheduleRun(0);
  }

  /* ---------------- Matching rows to companies ---------------- */
  // HubSpot shows "Name (domain.com)" when a company has a domain
  function splitLabel(label) {
    const m = label.match(/^(.*\S)\s*\(([^()\s]+\.[^()\s]+)\)$/);
    return m ? { name: m[1], domain: m[2] } : { name: label, domain: '' };
  }
  const bareDomain = (d) => norm(d).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');

  function matchesName(label, rec) {
    if (!rec || !rec.name) return false;
    if (norm(rec.name) === norm(label)) return true;
    const { name, domain } = splitLabel(label);
    if (norm(rec.name) !== norm(name)) return false;
    return !domain || !rec.domain || bareDomain(rec.domain) === bareDomain(domain);
  }

  function idsForLabel(label) {
    const ids = new Set([...(byName.get(norm(label)) || []), ...(byName.get(norm(splitLabel(label).name)) || [])]);
    return [...ids].filter((id) => !badIds.has(id) && matchesName(label, records.get(id)));
  }

  function currentRecordId() {
    const m = location.pathname.match(/\/(?:record\/0-\d+|contact|company|deal|ticket)\/(\d+)/);
    return m ? m[1] : '';
  }
  function isId(v) {
    if (typeof v !== 'number' && typeof v !== 'string') return false;
    const s = String(v);
    return /^\d{6,}$/.test(s) && s !== portalId() && s !== currentRecordId();
  }

  // React keeps each row's data on its DOM nodes. Walk up from the checkbox
  // until a company ID turns up, stopping before leaving the row.
  function fiberOf(el) {
    for (const k in el) if (k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')) return el[k];
    return null;
  }
  const ID_KEYS = ['objectId', 'recordId', 'companyId', 'id', 'value'];
  function idInProps(p, level) {
    if (!p || typeof p !== 'object' || Array.isArray(p) || p.$$typeof || p instanceof Node) return null;
    for (const k of ID_KEYS) if (isId(p[k])) return String(p[k]);
    if (level) return null;
    for (const k of Object.keys(p)) {
      if (k === 'children' || /^on[A-Z]/.test(k)) continue;
      const id = idInProps(p[k], 1);
      if (id) return id;
    }
    return null;
  }
  function idFromReact(box) {
    let f = fiberOf(box);
    for (let depth = 0; f && depth < 30; depth++, f = f.return) {
      const node = f.stateNode;
      if (node instanceof Element && node !== box && (node.querySelectorAll('input[type="checkbox"]').length > 1 ||
        node.querySelectorAll('[role="checkbox"]').length > 1)) break;
      if (f.key != null && isId(f.key)) return String(f.key);
      const id = idInProps(f.memoizedProps, 0);
      if (id) return id;
    }
    return null;
  }

  const idCache = new WeakMap(); // row host -> { label, id, how }
  function readId(it) {
    const c = idCache.get(it.host);
    if (c && c.label === it.label) return c;
    let id = null;
    let how = 'none';
    const a = it.host.querySelector('a[href*="/record/0-2/"], a[href*="/company/"]');
    const m = a && a.getAttribute('href').match(/\/(?:record\/0-2|company)\/(\d+)/);
    if (m) { id = m[1]; how = 'link'; }
    if (!id && isId(it.box.getAttribute('value'))) { id = it.box.getAttribute('value'); how = 'value'; }
    if (!id) { try { id = idFromReact(it.box); } catch (e) { id = null; } if (id) how = 'react'; }
    const out = { label: it.label, id, how };
    idCache.set(it.host, out);
    return out;
  }

  function resolve(it) {
    const props = neededProps();
    const ids = it.id && !badIds.has(it.id) ? [it.id] : idsForLabel(it.label);
    if (ids.length) {
      const missing = ids.filter((id) => !hasAll(records.get(id), props));
      if (missing.length) {
        const now = Date.now();
        const fails = missing.map((id) => failed.get(id)).filter((f) => f && now - f.at < 30000);
        if (fails.length === missing.length) return { state: 'error', msg: fails[0].msg };
        requestIds(missing.filter((id) => !failed.has(id) || now - failed.get(id).at >= 30000));
        return { state: 'loading' };
      }
      const recs = ids.map((id) => records.get(id));
      if (it.id && ids[0] === it.id && !matchesName(it.label, recs[0])) {
        badIds.add(it.id);
        note(`ID ${it.how} didn't match its row, using name search`);
        return resolve({ ...it, id: null });
      }
      return { state: 'ready', recs };
    }
    const key = norm(it.label);
    const job = nameJobs.get(key);
    if (!job || (job.state === 'error' && Date.now() - job.at > 30000)) { requestName(it.label); return { state: 'loading' }; }
    if (job.state === 'error') return { state: 'error', msg: job.msg };
    if (job.state === 'done') return { state: 'missing' };
    return { state: 'loading' };
  }

  /* ---------------- Products ---------------- */
  const productsOf = (rec) => String(rec.props[PRODUCT_PROPERTY] || '').split(';').map((s) => s.trim()).filter(Boolean);
  const chipKey = (v) => (PRODUCTS.some((p) => p.value === v) ? v : OTHER);
  const productLabel = (v) => (PRODUCTS.find((p) => p.value === v) || { label: v }).label;

  function chipKeys(recs) {
    const keys = new Set(recs.flatMap(productsOf).map(chipKey));
    if (!keys.size) keys.add(NONE);
    return keys;
  }
  const wanted = (recs) => [...chipKeys(recs)].some((k) => !isOff(k));

  function fieldLabel(f) {
    return FIELD_LABELS[f] || f.replace(/_+/g, ' ').trim().replace(/^\w/, (c) => c.toUpperCase());
  }
  function fmtValue(v) {
    v = String(v || '').trim().replace(/[,;\s]+$/, '');
    if (/^\d{13}$/.test(v)) return new Date(+v).toLocaleDateString('en-AU');
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleDateString('en-AU');
    return v.replace(/;/g, ', ');
  }

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
      [data-ocp-dim] { opacity:.45; }
      [data-ocp-dim]:hover { opacity:.8; }

      .ocp-ui { font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; letter-spacing:0; text-transform:none; }
      .ocp-ui svg { width:12px; height:12px; flex:none; display:block; }

      .ocp-line { display:block; margin:3px 0 2px; color:#808080; font-size:12px; font-weight:400; line-height:1.5;
        white-space:normal; text-align:left; cursor:default; }
      .ocp-line .ocp-row { display:flex; flex-wrap:wrap; align-items:center; gap:3px 10px; }
      .ocp-pills { display:inline-flex; flex-wrap:wrap; gap:4px; }
      .ocp-pill { display:inline-flex; align-items:center; height:18px; padding:0 7px; border-radius:999px;
        background:#F3EEF9; color:#673AB6; font-size:11px; font-weight:700; }
      .ocp-pill.ocp-muted { background:#F0F0F0; color:#808080; font-weight:600; }
      .ocp-field { color:#555; }
      .ocp-field b { color:#808080; font-weight:600; }
      .ocp-note { color:#808080; }
      .ocp-warn { color:#B3261E; }
      .ocp-link { all:unset; display:inline-flex; align-items:center; gap:4px; cursor:pointer; color:#673AB6; font-weight:600; }
      .ocp-link:hover { text-decoration:underline; }
      .ocp-link:focus-visible, .ocp-sub a:focus-visible { outline:2px solid #03A9F4; outline-offset:1px; border-radius:3px; }
      .ocp-link[aria-expanded="true"] { color:#5E35B1; text-decoration:underline; }
      .ocp-sub { margin:5px 0 2px; padding:6px 10px; border-left:2px solid #673AB6; border-radius:0 8px 8px 0; background:#FAF8FD; }
      .ocp-sub ul { margin:0 0 2px; padding:0; list-style:none; }
      .ocp-sub li { display:flex; flex-wrap:wrap; gap:0 8px; padding:1px 0; }
      .ocp-sub li a { color:#222; font-weight:600; text-decoration:none; }
      .ocp-sub li a:hover { color:#673AB6; text-decoration:underline; }

      .ocp-bar { margin:8px 0; padding:8px 10px; border:1px solid #E6E0F0; border-radius:10px; background:#FBFAFD;
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
      .ocp-chip:focus-visible, .ocp-gear:focus-visible, .ocp-settings button:focus-visible { outline:2px solid #03A9F4; outline-offset:2px; }
      .ocp-n { font-size:11px; font-weight:400; opacity:.85; }
      .ocp-status { display:inline-flex; align-items:center; gap:6px; margin-left:auto; color:#808080; }
      .ocp-gear { all:unset; display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px;
        border-radius:50%; color:#673AB6; cursor:pointer; }
      .ocp-gear:hover, .ocp-gear[aria-expanded="true"] { background:#F3EEF9; }
      .ocp-gear svg { width:16px; height:16px; }

      .ocp-settings { margin-top:10px; padding-top:10px; border-top:1px solid #E6E0F0; display:grid; gap:10px; }
      .ocp-settings[hidden] { display:none; }
      .ocp-settings .ocp-set { display:grid; gap:4px; font-weight:600; }
      .ocp-settings .ocp-checks { display:flex; flex-wrap:wrap; gap:4px 14px; }
      .ocp-settings .ocp-checks label { display:inline-flex; align-items:center; gap:6px; font-weight:400; cursor:pointer; }
      .ocp-settings select, .ocp-settings input[type="text"] { box-sizing:border-box; width:100%; height:30px; padding:0 8px;
        border:1px solid #D6D6D6; border-radius:6px; background:#fff; color:#222; font:inherit; font-weight:400; }
      .ocp-settings input[type="checkbox"] { accent-color:#673AB6; margin:0; }
      .ocp-hint { margin:-4px 0 0; color:#808080; font-weight:400; }
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
  const ICON_USERS = svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>');
  const ICON_TICKET = svg('<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>');
  const ICON_EXT = svg('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>');

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- Finding the panel and its rows ---------------- */
  const CHECKBOX = 'input[type="checkbox"], [role="checkbox"]';
  const HEADING = /^add existing compan(y|ies)$/i;

  function textOf(el) {
    let s = '';
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (!n.parentElement.closest('.ocp-ui')) s += n.nodeValue;
    return s.replace(/\s+/g, ' ').trim();
  }

  function findPanels() {
    const out = [];
    const seen = new Set();
    const snap = document.evaluate("//text()[contains(., 'Add existing')]", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < snap.snapshotLength; i++) {
      let head = null;
      for (let e = snap.snapshotItem(i).parentElement, k = 0; e && k < 3; e = e.parentElement, k++) {
        const t = e.textContent.replace(/\s+/g, ' ').trim();
        if (HEADING.test(t)) { head = e; break; }
        if (t.length > 40) break;
      }
      if (!head || head.closest('.ocp-ui')) continue;
      // The panel is the nearest ancestor with checkboxes in it, but never something page-wide
      let panel = head.closest('[role="dialog"], [aria-modal="true"]');
      if (!panel || !panel.querySelector(CHECKBOX)) {
        panel = null;
        for (let e = head.parentElement, k = 0; e && e !== document.body && k < 15; e = e.parentElement, k++) {
          if (e.getBoundingClientRect().width > window.innerWidth * 0.8) break;
          if (e.querySelector(CHECKBOX)) { panel = e; break; }
        }
      }
      if (panel && !seen.has(panel)) { seen.add(panel); out.push({ panel, head }); }
    }
    return out;
  }

  function getRows(panel) {
    const items = [];
    const seen = new Set();
    for (const box of panel.querySelectorAll(CHECKBOX)) {
      if (box.closest('.ocp-ui')) continue;
      let host = box.closest('label');
      if (!host || !panel.contains(host) || !textOf(host)) {
        host = box.parentElement;
        while (host && host !== panel && !textOf(host)) host = host.parentElement;
      }
      if (!host || host === panel || seen.has(host)) continue;
      seen.add(host);
      if (host.querySelectorAll('input[type="checkbox"]').length > 1) continue; // a header or the whole list
      const label = textOf(host);
      if (!label || label.length > 200 || /^select all/i.test(label)) continue;
      items.push({ box, host, label });
    }
    return items;
  }

  function lca(els) {
    let a = els[0];
    while (a && !els.every((e) => a.contains(e))) a = a.parentElement;
    return a;
  }
  function rowOf(el, container) {
    while (container && el.parentElement && el.parentElement !== container) el = el.parentElement;
    return el;
  }

  /* ---------------- Line under each company ---------------- */
  function firstTextNode(host) {
    const w = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeValue.trim() && !n.parentElement.closest('.ocp-ui')) return n;
    }
    return null;
  }

  // Put the line inside the element holding the name, so it sits under the name.
  // If the name is itself a button or link, put it just after that instead.
  function placeLine(it, line) {
    const text = firstTextNode(it.host);
    let parent = text ? text.parentElement : it.host;
    let before = null;
    const trigger = parent.closest('a, button, [role="button"]');
    if (trigger && it.host.contains(trigger) && trigger !== it.host) { parent = trigger.parentElement; before = trigger.nextSibling; }
    parent.insertBefore(line, before);

    const cs = getComputedStyle(parent);
    if (/flex/.test(cs.display) && !/column/.test(cs.flexDirection)) {
      parent.style.flexWrap = 'wrap';
      line.style.flexBasis = '100%';
      if (text) {
        const r = document.createRange();
        r.selectNodeContents(text);
        const off = r.getBoundingClientRect().left - parent.getBoundingClientRect().left - parseFloat(cs.paddingLeft || 0);
        if (off > 2) line.style.marginLeft = Math.round(off) + 'px';
      }
    } else if (/grid/.test(cs.display)) {
      line.style.gridColumn = '1 / -1';
    }
  }

  function lineHtml(r) {
    if (r.state === 'loading') return '<span class="ocp-note">Loading products…</span>';
    if (r.state === 'error') return `<span class="ocp-note ocp-warn" title="${esc(r.msg)}">Couldn't load details</span>`;
    if (r.state === 'missing') return '<span class="ocp-note">No details found</span>';

    const recs = r.recs;
    const rec = recs[0];
    const prods = [...new Set(recs.flatMap(productsOf))];
    const pills = prods.length
      ? prods.map((v) => `<span class="ocp-pill${isOff(chipKey(v)) ? ' ocp-muted' : ''}">${esc(productLabel(v))}</span>`).join('')
      : '<span class="ocp-pill ocp-muted">No product</span>';
    const parts = [`<span class="ocp-pills">${pills}</span>`];
    if (recs.length > 1) parts.push(`<span class="ocp-note">${recs.length} companies with this name</span>`);
    for (const f of settings.fields) {
      const v = fmtValue(rec.props[f]);
      if (v) parts.push(`<span class="ocp-field"><b>${esc(fieldLabel(f))}:</b> ${esc(v)}</span>`);
    }
    const ex = expanded.get(rec.id);
    if (settings.contacts) {
      const n = Number(rec.props.num_associated_contacts) || 0;
      parts.push(n
        ? `<button type="button" class="ocp-link" data-act="contacts" data-id="${rec.id}" aria-expanded="${!!ex && ex.kind === 'contacts'}">${ICON_USERS}${n} contact${n === 1 ? '' : 's'}</button>`
        : '<span class="ocp-note">No contacts</span>');
    }
    if (settings.tickets) {
      parts.push(`<button type="button" class="ocp-link" data-act="tickets" data-id="${rec.id}" aria-expanded="${!!ex && ex.kind === 'tickets'}">${ICON_TICKET}Tickets</button>`);
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
      return `<div class="ocp-sub"><span class="ocp-note ocp-warn" title="${esc(ex.msg)}">Couldn't load ${what}.</span> ${openCompany('Open the company')}</div>`;
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
    const t = e.target.closest('[data-act]');
    if (!t) return; // clicking a product pill acts like clicking the name
    e.stopPropagation();
    if (t.tagName === 'A') return; // let the link open in a new tab
    e.preventDefault();
    toggleList(t.dataset.id, t.dataset.act);
  }
  function stopIfAction(e) {
    if (e.target.closest('[data-act]')) e.stopPropagation();
  }

  function renderLine(it, r) {
    let line = it.host.querySelector('.ocp-line');
    if (!line) {
      line = document.createElement('div');
      line.className = 'ocp-ui ocp-line';
      line.addEventListener('click', onLineClick);
      line.addEventListener('mousedown', stopIfAction);
      line.addEventListener('pointerdown', stopIfAction);
      line.addEventListener('keydown', (e) => e.stopPropagation());
      placeLine(it, line);
    }
    const html = lineHtml(r);
    if (line.__ocpHtml !== html) { line.innerHTML = html; line.__ocpHtml = html; }
  }

  /* ---------------- Filter bar above the list ---------------- */
  const CHIPS = [...PRODUCTS.map((p) => ({ key: p.value, label: p.label })),
    { key: OTHER, label: 'Other', title: 'Any other product, such as OrderMate or Deliverit' },
    { key: NONE, label: 'No product', title: 'Companies with no product set' }];

  function buildBar() {
    const bar = document.createElement('div');
    bar.className = 'ocp-ui ocp-bar';
    bar.innerHTML =
      '<div class="ocp-bar-row">' +
      `<span class="ocp-bar-label">${ICON_FILTER}Show</span>` +
      CHIPS.map((c) => `<button type="button" class="ocp-chip" data-chip="${esc(c.key)}"${c.title ? ` title="${esc(c.title)}"` : ''}>` +
        `${ICON_CHECK}<span class="ocp-chip-label">${esc(c.label)}</span><span class="ocp-n"></span></button>`).join('') +
      '<span class="ocp-status"></span>' +
      `<button type="button" class="ocp-gear" data-act="settings" title="Settings" aria-label="Settings" aria-expanded="false">${ICON_SLIDERS}</button>` +
      '</div>' +
      '<div class="ocp-settings" hidden>' +
      '<label class="ocp-set">Rows per page<select data-set="pageSize">' +
      '<option value="0">Leave as HubSpot sets it</option><option>10</option><option>25</option><option>50</option><option>100</option></select></label>' +
      '<div class="ocp-set">Under each company<div class="ocp-checks">' +
      '<label><input type="checkbox" data-set="contacts">Contacts</label>' +
      '<label><input type="checkbox" data-set="tickets">Tickets</label>' +
      '<label><input type="checkbox" data-set="open">Open link</label></div></div>' +
      '<label class="ocp-set">Extra fields<input type="text" data-set="fields" spellcheck="false" placeholder="e.g. city, existing_pos_"></label>' +
      '<p class="ocp-hint">Internal names from HubSpot Settings &gt; Properties, separated by commas.</p>' +
      '<div class="ocp-actions"><button type="button" data-act="debug">Copy debug info</button><button type="button" data-act="reset">Reset</button></div>' +
      '</div>';

    bar.addEventListener('click', (e) => {
      e.stopPropagation();
      const chip = e.target.closest('[data-chip]');
      const act = e.target.closest('[data-act]');
      if (chip) {
        const k = chip.dataset.chip;
        settings.off = isOff(k) ? settings.off.filter((x) => x !== k) : [...settings.off, k];
        save();
      } else if (act && act.dataset.act === 'settings') {
        const box = bar.querySelector('.ocp-settings');
        box.hidden = !box.hidden;
        act.setAttribute('aria-expanded', String(!box.hidden));
        if (!box.hidden) fillSettings(bar);
      } else if (act && act.dataset.act === 'showhidden') {
        settings.showHidden = !settings.showHidden;
        save();
      } else if (act && act.dataset.act === 'debug') {
        copyDebug(act, bar);
      } else if (act && act.dataset.act === 'reset') {
        settings = { ...DEFAULTS };
        save();
        fillSettings(bar);
      } else {
        return;
      }
      scheduleRun(0);
    });
    bar.addEventListener('change', (e) => {
      const el = e.target.closest('[data-set]');
      if (!el) return;
      const k = el.dataset.set;
      if (k === 'pageSize') { settings.pageSize = Number(el.value) || 0; sized = new WeakSet(); }
      else if (k === 'fields') settings.fields = el.value.split(/[\s,]+/).filter((f) => /^[a-z0-9_]+$/i.test(f)).slice(0, 5);
      else settings[k] = el.checked;
      save();
      scheduleRun(0);
    });
    bar.addEventListener('keydown', (e) => {
      e.stopPropagation(); // keep HubSpot's shortcuts out of the settings
      if (e.key === 'Enter' && e.target.matches('input[type="text"]')) { e.preventDefault(); e.target.blur(); }
    });
    for (const t of ['mousedown', 'pointerdown', 'keyup', 'keypress']) bar.addEventListener(t, (e) => e.stopPropagation());
    return bar;
  }

  function fillSettings(bar) {
    bar.querySelector('[data-set="pageSize"]').value = String(settings.pageSize || 0);
    for (const k of ['contacts', 'tickets', 'open']) bar.querySelector(`[data-set="${k}"]`).checked = !!settings[k];
    bar.querySelector('[data-set="fields"]').value = settings.fields.join(', ');
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
    if (stats.errors && !stats.ready) html = `<span class="ocp-warn" title="${esc(apiError)}">Couldn't load products. Settings &gt; Copy debug info and send it to Stephen.</span>`;
    else if (stats.loading) html = `<span>Loading ${stats.loading}…</span>`;
    if (stats.filtered) {
      html += `<span>${stats.filtered} ${settings.showHidden ? 'faded' : 'hidden'}</span>` +
        `<button type="button" class="ocp-link" data-act="showhidden">${settings.showHidden ? 'Hide them' : 'Show'}</button>`;
    }
    const status = bar.querySelector('.ocp-status');
    if (status.__ocpHtml !== html) { status.innerHTML = html; status.__ocpHtml = html; }
  }

  /* ---------------- Rows per page ---------------- */
  let sized = new WeakSet();
  let sizing = false;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function findSizeControl(panel) {
    const snap = document.evaluate(".//text()[contains(., 'items')]", panel, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < snap.snapshotLength; i++) {
      const el = snap.snapshotItem(i).parentElement;
      if (!el || el.closest('.ocp-ui')) continue;
      const ctl = el.closest('button, [role="button"], [role="combobox"], select') || el;
      if (/^\d+ items\W*$/i.test(ctl.textContent.replace(/\s+/g, ' ').trim())) return ctl;
    }
    return panel.querySelector('select[aria-label*="page" i]');
  }

  function press(el) {
    const o = { bubbles: true, cancelable: true, button: 0, view: window };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    el.dispatchEvent(new MouseEvent('mousedown', o));
    el.dispatchEvent(new PointerEvent('pointerup', o));
    el.dispatchEvent(new MouseEvent('mouseup', o));
    el.dispatchEvent(new MouseEvent('click', o));
  }

  function findOption(size, ctl) {
    const visible = (el) => el !== ctl && !ctl.contains(el) && !el.closest('.ocp-ui') && el.getClientRects().length > 0;
    const textIs = (el, re) => re.test(el.textContent.replace(/\s+/g, ' ').trim());
    const all = [...document.querySelectorAll('[role="option"], [role="menuitem"], [role="menuitemradio"], li, button, a')].filter(visible);
    const exact = all.filter((el) => textIs(el, new RegExp(`^${size} items$`, 'i')));
    if (exact.length) return exact[exact.length - 1];
    const loose = all.filter((el) => el.matches('[role="option"], [role="menuitem"], [role="menuitemradio"]') && textIs(el, new RegExp(`^${size}$`)));
    return loose[loose.length - 1] || null;
  }

  async function choosePageSize(ctl, size) {
    if (ctl.tagName === 'SELECT') {
      const opt = [...ctl.options].find((o) => parseInt(o.value, 10) === size || parseInt(o.textContent, 10) === size);
      if (!opt) return false;
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(ctl, opt.value);
      ctl.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    for (const open of [() => ctl.click(), () => press(ctl)]) {
      open();
      for (let i = 0; i < 10; i++) {
        await sleep(150);
        const opt = findOption(size, ctl);
        if (opt) { (opt.closest('[role="option"], [role="menuitem"], [role="menuitemradio"], button, a, li') || opt).click(); return true; }
      }
    }
    return false;
  }

  // Once per panel, so changing it yourself afterwards sticks
  function autoPageSize(panel) {
    const size = Number(settings.pageSize) || 0;
    if (!size || sizing || sized.has(panel)) return;
    const ctl = findSizeControl(panel);
    if (!ctl) return;
    sized.add(panel);
    if (parseInt(ctl.value || ctl.textContent, 10) === size) return;
    sizing = true;
    choosePageSize(ctl, size)
      .then((ok) => note(ok ? `Rows per page set to ${size}` : `Couldn't find the ${size} items option`))
      .catch((e) => note('Rows per page failed: ' + e.message))
      .finally(() => { sizing = false; });
  }

  /* ---------------- Main pass ---------------- */
  let lastPass = null;

  function processPanel({ panel, head }) {
    autoPageSize(panel);
    const items = getRows(panel);
    if (!items.length) return;

    const container = items.length > 1 ? lca(items.map((i) => i.host)) : null;
    let bar = panel.querySelector('.ocp-bar');
    if (!bar) {
      bar = buildBar();
      const firstRow = rowOf(items[0].host, container);
      const anchor = container && container !== panel && !container.contains(head) ? container : firstRow;
      anchor.parentElement.insertBefore(bar, anchor);
    }

    // An ID that shows up on more than one row is the list's, not the row's
    const found = items.map((it) => readId(it));
    const seenIds = new Map();
    found.forEach((f) => f.id && seenIds.set(f.id, (seenIds.get(f.id) || 0) + 1));

    const counts = new Map();
    const stats = { ready: 0, loading: 0, errors: 0, filtered: 0 };
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      it.id = found[i].id && seenIds.get(found[i].id) === 1 ? found[i].id : null;
      it.how = it.id ? found[i].how : 'name';
      const r = resolve(it);
      renderLine(it, r);
      stats[r.state === 'ready' ? 'ready' : r.state === 'loading' ? 'loading' : 'errors']++;

      let hide = false;
      if (r.state === 'ready') {
        for (const k of chipKeys(r.recs)) counts.set(k, (counts.get(k) || 0) + 1);
        hide = !wanted(r.recs);
      }
      if (hide) stats.filtered++;
      const row = container ? rowOf(it.host, container) : it.host;
      const hidden = hide && !settings.showHidden;
      const dim = hide && settings.showHidden;
      if (row.hasAttribute('data-ocp-hidden') !== hidden) row.toggleAttribute('data-ocp-hidden', hidden);
      if (row.hasAttribute('data-ocp-dim') !== dim) row.toggleAttribute('data-ocp-dim', dim);
    }
    updateBar(bar, counts, stats);
    lastPass = { items, found, stats };
  }

  function run() {
    for (const p of findPanels()) processPanel(p);
  }

  let runTimer = null;
  function scheduleRun(delay = 250) {
    if (runTimer) { if (delay) return; clearTimeout(runTimer); }
    runTimer = setTimeout(() => {
      runTimer = null;
      try { run(); } catch (e) { note('Error: ' + e.message); }
    }, delay);
  }

  /* ---------------- Debug info ---------------- */
  // Shape of the page only: tags, classes and attribute names, with text replaced by its length
  function skeleton(el, depth) {
    if (!el || depth > 7) return '';
    const pad = '  '.repeat(depth);
    if (el.nodeType === 3) return el.nodeValue.trim() ? `${pad}"…${el.nodeValue.trim().length} chars"\n` : '';
    if (el.nodeType !== 1 || el.classList.contains('ocp-ui')) return '';
    const attrs = [...el.attributes].filter((a) => a.name !== 'style' && a.name !== 'class')
      .map((a) => (/^(type|role|data-test-id|data-selenium-test|data-testid|aria-checked)$/.test(a.name) ? `${a.name}="${a.value}"` : a.name)).join(' ');
    const cls = typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    const disp = getComputedStyle(el).display;
    let s = `${pad}<${el.tagName.toLowerCase()}${cls}${attrs ? ' ' + attrs : ''}> {${disp}}\n`;
    for (const c of el.childNodes) s += skeleton(c, depth + 1);
    return s;
  }

  function fiberSummary(box) {
    const out = [];
    let f = fiberOf(box);
    for (let d = 0; f && d < 14; d++, f = f.return) {
      const t = f.type;
      const name = typeof t === 'string' ? t : (t && (t.displayName || t.name)) || '?';
      const keys = f.memoizedProps && typeof f.memoizedProps === 'object' ? Object.keys(f.memoizedProps).filter((k) => k !== 'children').slice(0, 10) : [];
      out.push(`  ${d}: ${name}${f.key != null ? ` key(${String(f.key).replace(/\d/g, '#')})` : ''} [${keys.join(', ')}]`);
    }
    return out.length ? out.join('\n') : '  (no React data on the checkbox)';
  }

  function debugText() {
    const panels = findPanels();
    const p = panels[0];
    const items = p ? getRows(p.panel) : [];
    const how = {};
    if (lastPass) lastPass.items.forEach((it) => { how[it.how] = (how[it.how] || 0) + 1; });
    const ctl = p && findSizeControl(p.panel);
    return [
      `HubSpot: Products in company search ${VERSION}`,
      `Page: ${location.pathname.replace(/\d{5,}/g, '#')}`,
      `Portal ID: ${portalId() ? 'yes' : 'no'}, CSRF cookie: ${csrf() ? 'yes' : 'no'}, fetch hooked: ${window.fetch !== origFetch}`,
      `Panel: ${p ? 'found' : 'not found'}, rows: ${items.length}, rows-per-page control: ${ctl ? `"${ctl.textContent.trim()}"` : 'not found'}`,
      `How rows were matched: ${JSON.stringify(how)}`,
      `Last pass: ${lastPass ? JSON.stringify(lastPass.stats) : 'none'}`,
      `Companies cached: ${records.size}, bad IDs: ${badIds.size}`,
      `Last API error: ${apiError || 'none'}`,
      '', 'Requests:', ...netLog.map((l) => '  ' + l),
      '', 'Notes:', ...notes.map((l) => '  ' + l),
      '', 'React chain from the first checkbox:', items[0] ? fiberSummary(items[0].box) : '  (no rows)',
      '', 'First row:', items[0] ? skeleton(lastPass && lastPass.items[0] && lastPass.items[0].host.parentElement || items[0].host, 0) : '  (no rows)',
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
  function start() {
    injectStyles();
    new MutationObserver(() => scheduleRun()).observe(document.body, { childList: true, subtree: true, characterData: true });
    scheduleRun();
  }
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
