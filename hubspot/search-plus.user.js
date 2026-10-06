// ==UserScript==
// @name         HubSpot: Search plus
// @namespace    oolio-userscripts
// @version      0.1.0
// @description  Shows each company's products (Bepoz, Oolio Pay, OrderMate and so on) in HubSpot's search results, so venues with the same name are easy to tell apart.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/search-plus.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/search-plus.user.js
// @match        https://app.hubspot.com/*
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTQwLjA5OSAwQzE3My4xODEgMCAyMDAgMjYuNjk3OSAyMDAgNTkuNjMxNEMyMDAgOTIuNTY0OSAxNzMuMTgxIDExOS4yNjMgMTQwLjA5OSAxMTkuMjYzQzEyNC42NzcgMTE5LjI2MyAxMTAuNjE2IDExMy40NjEgOTkuOTk4NiAxMDMuOTNDODkuMzgzNyAxMTMuNDYxIDc1LjMyMjkgMTE5LjI2MyA1OS45MDEgMTE5LjI2M0MyNi44MTg2IDExOS4yNjMgMCA5Mi41NjQ5IDAgNTkuNjMxNEMwIDI2LjY5NzkgMjYuODE4NiAwIDU5LjkwMSAwQzc1LjMyMzIgMCA4OS4zODQxIDUuODAxOTUgMTAwLjAwMSAxNS4zMzI5QzExMC42MTYgNS44MDE3NyAxMjQuNjc3IDAgMTQwLjA5OSAwWk0xNDAuMDk5IDM5LjkxODVDMTI5LjE2MyAzOS45MTg1IDEyMC4yOTcgNDguNzQ0MyAxMjAuMjk3IDU5LjYzMTRDMTIwLjI5NyA3MC41MTg1IDEyOS4xNjMgNzkuMzQ0MiAxNDAuMDk5IDc5LjM0NDJDMTUxLjAzNSA3OS4zNDQyIDE1OS45MDEgNzAuNTE4NSAxNTkuOTAxIDU5LjYzMTRDMTU5LjkwMSA0OC43NDQzIDE1MS4wMzUgMzkuOTE4NSAxNDAuMDk5IDM5LjkxODVaTTU5LjkwMSAzOS45MTg1QzQ4Ljk2NDcgMzkuOTE4NSA0MC4wOTkgNDguNzQ0MyA0MC4wOTkgNTkuNjMxNEM0MC4wOTkgNzAuNTE4NSA0OC45NjQ3IDc5LjM0NDIgNTkuOTAxIDc5LjM0NDJDNzAuODM3MyA3OS4zNDQyIDc5LjcwMyA3MC41MTg1IDc5LjcwMyA1OS42MzE0Qzc5LjcwMyA0OC43NDQzIDcwLjgzNzMgMzkuOTE4NSA1OS45MDEgMzkuOTE4NVoiIGZpbGw9IiM2NzNBQjYiLz4KPC9zdmc+Cg==
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==

// Reads companies with your own HubSpot login, the same way Company contacts does. Read only.
// Search results are found by their link to the company plus the "Company • ..." line under the name,
// so nothing depends on HubSpot's class names. If HubSpot changes the results, they just show as normal.

(function () {
  'use strict';

  if (window.__oolioSearchPlus) return;
  window.__oolioSearchPlus = true;

  // Labels as HubSpot shows them (06/10/2026). Anything not listed shows as stored, which is usually the label.
  const PRODUCT_LABELS = { 'Oolio POS': 'Oolio One' };
  const GROUP_LABELS = {
    'Bepoz': 'Bepoz - AU', 'Deliverit': 'Deliverit - AU', 'Idealpos': 'Idealpos - AU', 'Oolio POS': 'Oolio One - AU',
    'Ordermate': 'OrderMate - AU', 'Oolio Pay': 'Oolio Pay - AU', 'SwiftPOS': 'SwiftPOS - AU',
    'Bepoz - NZ': 'Oolio - NZ', 'Bepoz - UK': 'Oolio - UK', 'Oolio Platform - UK': 'Oolio One - UK'
  };
  const PROPERTIES = ['product', 'group_company'];
  const BATCH = 100; // companies per lookup
  const LOOKUP_TIMEOUT = 8000;
  const KEEP_FOR = 10 * 60 * 1000; // look a company up again after this long
  const RETRY_AFTER = 30 * 1000; // after a failed lookup

  const LINKS = 'a[href*="/company/"], a[href*="/record/0-2/"]';
  const COMPANY_LINK = /\/contacts\/(\d+)\/(?:company|record\/0-2)\/(\d+)(?:[/?#]|$)/;
  // The start of the line under each result, e.g. "Company • Melbourne • VIC". Not "Company owner" or "Companies".
  const TYPE = /^\s*Company\s*(?:[•·|–-]|$)/;
  const TAG = 'oolio-sp';

  const log = (...a) => console.info('[Oolio search plus]', ...a);
  const cache = new Map(); // company id -> { at, data: { products, group } | null, pending, failed }
  const waiting = new Map(); // company id -> portal id
  const matched = new WeakSet(); // "Company • ..." text nodes tied to a company link
  let flushTimer = null;

  function csrf() { return (document.cookie.match(/hubspotapi-csrf=([^;]+)/) || [])[1] || ''; }

  function lookup(portalId, ids) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), LOOKUP_TIMEOUT);
    return fetch('/api/crm-search/search?portalId=' + portalId, {
      method: 'POST',
      credentials: 'include',
      signal: abort.signal,
      headers: { 'content-type': 'application/json', 'X-HubSpot-CSRF-hubspotapi': csrf() },
      body: JSON.stringify({
        objectTypeId: '0-2', count: ids.length, offset: 0,
        filterGroups: [{ filters: [{ property: 'hs_object_id', operator: 'IN', values: ids }] }],
        requestOptions: { properties: PROPERTIES }
      })
    })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(j => {
        const found = new Map();
        (j.results || []).forEach(c => {
          const p = c.properties || {};
          const value = name => String((p[name] && p[name].value) || '').trim();
          found.set(String(c.objectId), {
            products: value('product').split(';').map(s => s.trim()).filter(Boolean),
            group: value('group_company')
          });
        });
        return found;
      })
      .finally(() => clearTimeout(timer));
  }

  function want(id, portalId) {
    const c = cache.get(id);
    if (c && (c.pending || Date.now() - c.at < (c.failed ? RETRY_AFTER : KEEP_FOR))) return;
    waiting.set(id, portalId);
    if (!flushTimer) flushTimer = setTimeout(flush, 50);
  }

  function flush() {
    flushTimer = null;
    const byPortal = new Map();
    waiting.forEach((portalId, id) => {
      if (!byPortal.has(portalId)) byPortal.set(portalId, []);
      byPortal.get(portalId).push(id);
    });
    waiting.clear();
    byPortal.forEach((ids, portalId) => {
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH);
        batch.forEach(id => cache.set(id, Object.assign({}, cache.get(id), { pending: true })));
        lookup(portalId, batch)
          .then(found => {
            // A company HubSpot didn't return (deleted, or hidden from you) is remembered as having nothing to show
            batch.forEach(id => cache.set(id, { at: Date.now(), data: found.get(id) || { products: [], group: '' } }));
          }, err => {
            log('Couldn\'t look up products for ' + batch.length + ' companies. Trying again shortly.', err);
            batch.forEach(id => {
              const old = cache.get(id) || {};
              cache.set(id, { at: Date.now(), data: old.data || null, failed: true });
            });
          })
          .then(schedule);
      }
    });
  }

  // The "Company • ..." text inside el: the text node, 'many' if el holds more than one result, or null
  function typeText(el) {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let hit = null;
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!TYPE.test(n.nodeValue) || (n.parentElement && n.parentElement.closest('.' + TAG))) continue;
      if (hit) return 'many';
      hit = n;
    }
    return hit;
  }

  // Whether el's text starts with "Company", leaving out our own products
  function startsWithCompany(el) {
    const own = el.cloneNode(true);
    own.querySelectorAll('.' + TAG).forEach(t => t.remove());
    return /^\s*Company/.test(own.textContent);
  }

  // The line under the result's name that starts "Company", for this company link, or null if this isn't a search result
  function metaLine(link, id) {
    let row = link;
    for (let i = 0; i < 4 && row && row !== document.body; i++, row = row.parentElement) {
      if (i > 0 && [...row.querySelectorAll(LINKS)].some(a => {
        const m = COMPANY_LINK.exec(a.getAttribute('href') || '');
        return m && m[2] !== id;
      })) return null; // gone up into a list of several companies
      const text = typeText(row);
      if (text === 'many') return null;
      if (!text) continue;
      matched.add(text);
      let el = text.parentElement;
      while (el && el !== row && el.parentElement && el.parentElement !== row && startsWithCompany(el.parentElement)) el = el.parentElement;
      return el;
    }
    return null;
  }

  function pills(data) {
    if (!data) return [];
    if (data.products.length) {
      return data.products.map(p => ({ text: PRODUCT_LABELS[p] || p, title: 'Product(s) on this company' }));
    }
    if (data.group) {
      return [{ text: GROUP_LABELS[data.group] || data.group, title: 'Group Company. Product(s) isn\'t filled in on this company.', group: true }];
    }
    return [];
  }

  function paint(meta, id, painted) {
    let tag = [...meta.children].find(c => c.classList.contains(TAG));
    const entry = cache.get(id);
    const list = pills(entry && entry.data);
    if (!list.length) { if (tag) tag.remove(); return; }
    const key = id + '|' + list.map(p => p.text + (p.group ? '*' : '')).join(',');
    if (!tag) {
      tag = document.createElement('span');
      tag.className = TAG;
    }
    if (tag.dataset.key !== key) {
      tag.dataset.key = key;
      tag.replaceChildren(...list.map(p => {
        const pill = document.createElement('span');
        pill.className = TAG + '-pill' + (p.group ? ' is-group' : '');
        pill.textContent = p.text;
        pill.title = p.title;
        return pill;
      }));
    }
    if (meta.lastChild !== tag) meta.appendChild(tag); // keep it last if HubSpot adds to the line
    painted.add(tag);
  }

  let rows = 0;
  function scan() {
    const painted = new Set();
    let seen = 0;
    document.querySelectorAll(LINKS).forEach(link => {
      const m = COMPANY_LINK.exec(link.getAttribute('href') || '');
      if (!m) return;
      const meta = metaLine(link, m[2]);
      if (!meta) return;
      seen++;
      want(m[2], m[1]);
      paint(meta, m[2], painted);
    });
    // Rows HubSpot has reused for something else keep no stale products
    document.querySelectorAll('.' + TAG).forEach(t => { if (!painted.has(t)) t.remove(); });
    if (seen && !rows) log('Showing products on ' + seen + ' company results.');
    rows = Math.max(rows, seen);
    checkSearch();
  }

  // While someone is searching, check every company result was tied to its company. If one wasn't, say once how
  // that result is built, without any customer details, so a HubSpot change can be fixed.
  let reported = false;
  let lastCheck = 0;
  function checkSearch() {
    if (reported || Date.now() - lastCheck < 2000) return;
    const box = document.activeElement;
    if (!box || box.tagName !== 'INPUT' || box.value.trim().length < 3 ||
      !/search|breeze/i.test((box.placeholder || '') + ' ' + (box.getAttribute('aria-label') || ''))) return;
    lastCheck = Date.now();
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!TYPE.test(n.nodeValue) || matched.has(n)) continue;
      const chain = [];
      for (let el = n.parentElement; el && el !== document.body && chain.length < 8; el = el.parentElement) {
        chain.push(el.tagName.toLowerCase() + (el.getAttribute('role') ? '[role=' + el.getAttribute('role') + ']' : '') +
          (el.tagName === 'A' ? '[href=' + (el.getAttribute('href') || '').replace(/\d+/g, 'N') + ']' : ''));
      }
      reported = true;
      log('A company result in search isn\'t tied to its company, so it has no products. HubSpot may have changed. ' +
        'Path from the result up: ' + chain.join(' < '));
      return;
    }
  }

  let scanTimer = null;
  function schedule() {
    if (!scanTimer) scanTimer = setTimeout(() => {
      scanTimer = null;
      try { scan(); } catch (e) { log('Something went wrong; search results show as normal.', e); }
    }, 100);
  }

  const style = document.createElement('style');
  style.textContent =
    '.' + TAG + '{display:inline-flex;flex-wrap:wrap;gap:4px;margin-left:8px;vertical-align:middle;}' +
    '.' + TAG + '-pill{display:inline-block;padding:0 7px;border-radius:999px;background:#EFE9F8;color:#673AB6;' +
      'font:600 11px/17px Inter,system-ui,-apple-system,"Segoe UI",sans-serif;white-space:nowrap;}' +
    '.' + TAG + '-pill.is-group{background:transparent;box-shadow:inset 0 0 0 1px #C9B8E6;color:#5E35B1;font-weight:500;}';
  document.head.appendChild(style);

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href'] });
  schedule();
})();
