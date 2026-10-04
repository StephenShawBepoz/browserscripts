// ==UserScript==
// @name         HubSpot: Company contacts
// @namespace    oolio-userscripts
// @version      1.3.1
// @description  On tickets and deals, the Add existing Contact panel lists only contacts at the record's companies and their parent companies, 100 to a page. Optional email-only filter.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/company-contacts.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/company-contacts.user.js
// @match        https://app.hubspot.com/object-builder/*/0-1/embed*
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTQwLjA5OSAwQzE3My4xODEgMCAyMDAgMjYuNjk3OSAyMDAgNTkuNjMxNEMyMDAgOTIuNTY0OSAxNzMuMTgxIDExOS4yNjMgMTQwLjA5OSAxMTkuMjYzQzEyNC42NzcgMTE5LjI2MyAxMTAuNjE2IDExMy40NjEgOTkuOTk4NiAxMDMuOTNDODkuMzgzNyAxMTMuNDYxIDc1LjMyMjkgMTE5LjI2MyA1OS45MDEgMTE5LjI2M0MyNi44MTg2IDExOS4yNjMgMCA5Mi41NjQ5IDAgNTkuNjMxNEMwIDI2LjY5NzkgMjYuODE4NiAwIDU5LjkwMSAwQzc1LjMyMzIgMCA4OS4zODQxIDUuODAxOTUgMTAwLjAwMSAxNS4zMzI5QzExMC42MTYgNS44MDE3NyAxMjQuNjc3IDAgMTQwLjA5OSAwWk0xNDAuMDk5IDM5LjkxODVDMTI5LjE2MyAzOS45MTg1IDEyMC4yOTcgNDguNzQ0MyAxMjAuMjk3IDU5LjYzMTRDMTIwLjI5NyA3MC41MTg1IDEyOS4xNjMgNzkuMzQ0MiAxNDAuMDk5IDc5LjM0NDJDMTUxLjAzNSA3OS4zNDQyIDE1OS45MDEgNzAuNTE4NSAxNTkuOTAxIDU5LjYzMTRDMTU5LjkwMSA0OC43NDQzIDE1MS4wMzUgMzkuOTE4NSAxNDAuMDk5IDM5LjkxODVaTTU5LjkwMSAzOS45MTg1QzQ4Ljk2NDcgMzkuOTE4NSA0MC4wOTkgNDguNzQ0MyA0MC4wOTkgNTkuNjMxNEM0MC4wOTkgNzAuNTE4NSA0OC45NjQ3IDc5LjM0NDIgNTkuOTAxIDc5LjM0NDJDNzAuODM3MyA3OS4zNDQyIDc5LjcwMyA3MC41MTg1IDc5LjcwMyA1OS42MzE0Qzc5LjcwMyA0OC43NDQzIDcwLjgzNzMgMzkuOTE4NSA1OS45MDEgMzkuOTE4NVoiIGZpbGw9IiM2NzNBQjYiLz4KPC9zdmc+Cg==
// @grant        none
// @run-at       document-start
// ==/UserScript==

// Must stay @grant none and @run-at document-start, with no @noframes: it patches HubSpot's own
// XMLHttpRequest inside the Add existing Contact iframe before the panel's first search.
// Any GM_* grant moves it into Tampermonkey's sandbox, where it would filter nothing.

(function () {
  'use strict';

  // Only one copy may patch the page, or every search would be held back and filtered twice
  if (window.__oolioCompanyContacts) return;
  window.__oolioCompanyContacts = true;

  const EMAIL_KEY = 'oolio-company-contacts-email-only';
  // HubSpot-defined association type IDs (contact -> X) seen in the panel's search request
  const FROM_TYPE = { 15: 'ticket', 4: 'deal' };
  const MAX_COMPANIES = 20;
  const PAGE_SIZE = '100'; // HubSpot offers 10, 20 or 100
  // How long each company lookup may take before the search goes ahead with all contacts
  const LOOKUP_TIMEOUT = 8000;
  // After a toggle, how long HubSpot gets to search again before we say it didn't
  const REFETCH_WAIT = 2500;

  const portalId = (location.pathname.match(/object-builder\/(\d+)/) || [])[1];
  // status: null (no search seen yet), 'loading', 'ready' or 'failed'.
  // "Company only" starts on for each record; "Email only" is remembered.
  const state = { record: null, fromType: null, status: null, companies: [], on: true, emailOnly: readPref(EMAIL_KEY, false), stale: false };
  const lookups = {};
  let lastSearch = 0; // when the panel last sent a ticket or deal contact search
  let changedAt = 0; // when the bar was last clicked
  let caughtUp = 0; // when a search held from before that click went out with the new choice
  let sawSearch = false; // whether the panel has sent any contact search (for any record type)
  const log = (...a) => console.info('[Oolio company contacts]', ...a);

  function readPref(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v === 'on'; } catch (e) { return fallback; }
  }
  function savePref(key, value) { try { localStorage.setItem(key, value ? 'on' : 'off'); } catch (e) {} }
  function csrf() { return (document.cookie.match(/hubspotapi-csrf=([^;]+)/) || [])[1] || ''; }

  function searchCompanies(filters) {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), LOOKUP_TIMEOUT);
    return fetch('/api/crm-search/search?portalId=' + portalId, {
      method: 'POST',
      credentials: 'include',
      signal: abort.signal,
      headers: { 'content-type': 'application/json', 'X-HubSpot-CSRF-hubspotapi': csrf() },
      body: JSON.stringify({
        objectTypeId: '0-2', count: MAX_COMPANIES, offset: 0,
        filterGroups: [{ filters: filters }],
        requestOptions: { properties: ['name', 'hs_parent_company_id'] }
      })
    })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(j => {
        if (j.total > MAX_COMPANIES) log('Using the first ' + MAX_COMPANIES + ' of ' + j.total + ' companies.');
        return (j.results || []).map(c => {
          const p = c.properties || {};
          return {
            id: String(c.objectId),
            name: (p.name && p.name.value) || 'Unnamed company',
            parentId: (p.hs_parent_company_id && p.hs_parent_company_id.value) || null
          };
        });
      })
      .finally(() => clearTimeout(timer));
  }

  // Every company on the ticket/deal, plus the parent of each one: { companies } or { failed: true }.
  // A failure is remembered, so later searches aren't held up again; "Try again" clears it.
  function getCompanies(fromType, fromId) {
    const key = fromType + ':' + fromId;
    if (!lookups[key]) {
      lookups[key] = searchCompanies([{ property: 'associations.' + fromType, operator: 'EQ', value: String(fromId) }])
        .then(direct => {
          const have = new Set(direct.map(c => c.id));
          const parentIds = [...new Set(direct.map(c => c.parentId).filter(id => id && !have.has(String(id))))];
          if (!parentIds.length) return direct;
          return searchCompanies([{ property: 'hs_object_id', operator: 'IN', values: parentIds.map(String) }])
            .then(parents => direct.concat(parents.map(c => Object.assign(c, { isParent: true }))))
            .catch(err => { log('Parent company lookup failed, using the direct companies only.', err); return direct; });
        })
        .then(companies => ({ companies }), err => { log('Company lookup failed, showing all contacts.', err); return { failed: true }; });
    }
    return lookups[key];
  }

  // The panel's contact search for a single ticket or deal, if this request is one
  function contactSearch(url, body) {
    if (!url || url.indexOf('/api/graphql/crm') === -1 || typeof body !== 'string' || body.indexOf('SearchObjectsQuery') === -1) return null;
    sawSearch = true;
    let req;
    try { req = JSON.parse(body); } catch (e) { return null; }
    const v = req && req.variables;
    const fromType = v && v.objectTypeId === '0-1' && FROM_TYPE[v.associationTypeId];
    const ids = fromType && v.toObjectIds;
    return Array.isArray(ids) && ids.length === 1 && ids[0] ? { req, v, fromType, fromId: ids[0] } : null;
  }

  // The request body with our filters added to each of HubSpot's own filter groups
  function filteredBody(search, body, companies) {
    const extra = [];
    if (state.on && companies.length) {
      extra.push({ property: 'associations.company', operator: 'IN', values: companies.map(c => c.id) });
    }
    if (state.emailOnly) extra.push({ property: 'email', operator: 'HAS_PROPERTY' });
    if (!extra.length) return body;
    const v = search.v;
    const groups = v.filterGroups && v.filterGroups.length ? v.filterGroups : [{ filters: [] }];
    v.filterGroups = groups.map(g => {
      const filters = (g && g.filters) || [];
      // Skip any filter already there, for example from an older copy of this script
      const add = extra.filter(x => !filters.some(f => f && f.property === x.property && f.operator === x.operator));
      return Object.assign({}, g, { filters: filters.concat(add) });
    });
    return JSON.stringify(search.req);
  }

  // Intercept the panel's contact search and hold it back until we know the record's companies.
  // Anything that goes wrong on our side sends HubSpot's request unchanged.
  // An older copy pasted in before this script lived on GitHub patches the same calls;
  // if it got here first, leave the filtering to it and just ask for it to be deleted.
  const legacy = /SearchObjectsQuery/.test(String(XMLHttpRequest.prototype.send));
  if (legacy) log('An older copy of this script is also installed. Delete it in Tampermonkey.');
  else {
    const xOpen = XMLHttpRequest.prototype.open;
    const xSend = XMLHttpRequest.prototype.send;
    const xAbort = XMLHttpRequest.prototype.abort;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__occUrl = String(url);
      this.__occHeld = null; // reopening replaces any search we were holding back
      return xOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.abort = function () {
      // HubSpot cancelled a search we were still holding back (the user kept typing).
      // Send it and cancel it for real, so HubSpot gets its usual abort and no stale results.
      const held = this.__occHeld;
      if (held) {
        this.__occHeld = null;
        try { xSend.call(this, held.body); } catch (e) {}
      }
      return xAbort.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
      let search = null;
      try { search = contactSearch(this.__occUrl, body); } catch (e) {}
      if (!search || document.getElementById('occ-bar')) return xSend.apply(this, arguments); // an older copy is filtering

      const xhr = this;
      const held = { body, at: Date.now() };
      xhr.__occHeld = held;
      lastSearch = Date.now();
      const record = search.fromType + ':' + search.fromId;
      if (state.record !== record) {
        Object.assign(state, { record, fromType: search.fromType, status: 'loading', companies: [], on: true, stale: false });
        safeRender();
      }

      const release = result => {
        if (xhr.__occHeld !== held) return; // already sent, cancelled or reopened
        xhr.__occHeld = null;
        if (held.at < changedAt) caughtUp = Date.now(); // it goes out with the latest choice
        const companies = (result && result.companies) || [];
        let out = body;
        try {
          if (state.record === record) {
            state.status = result && !result.failed ? 'ready' : 'failed';
            state.companies = companies;
            state.stale = false;
          }
          out = filteredBody(search, body, companies);
        } catch (e) { log('Could not add the filters, sending the search unchanged.', e); out = body; }
        try { xSend.call(xhr, out); } catch (e) { log('Could not send the search.', e); }
        safeRender();
      };
      // Belt and braces: never hold HubSpot's search longer than both lookups could take
      setTimeout(() => release(null), LOOKUP_TIMEOUT * 2 + 1000);
      try { getCompanies(search.fromType, search.fromId).then(release, () => release(null)); }
      catch (e) { log('Company lookup failed, showing all contacts.', e); Promise.resolve(null).then(release); }
    };
  }

  // Re-run the panel's search by nudging the search box, as HubSpot has no other way in.
  // If HubSpot shows its earlier list instead of searching again, the bar says so.
  let refetching = false;
  function refetch() {
    const input = document.querySelector('[data-test-id="associate-panel-search"]');
    if (!input || refetching) return; // the search already on its way picks up the latest choice
    refetching = true;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const original = input.value;
    const nudged = original + ' ';
    setValue.call(input, nudged);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    setTimeout(() => {
      refetching = false;
      const now = input.value;
      // If they've typed since, keep what they typed and just drop our extra space
      if (now !== nudged && !now.startsWith(nudged)) return;
      const restoredAt = Date.now();
      setValue.call(input, original + now.slice(nudged.length));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => {
        if (lastSearch >= restoredAt || caughtUp >= changedAt || !input.isConnected) return;
        state.stale = true;
        log('HubSpot did not search again after the change, so the list may be out of date.');
        safeRender();
      }, REFETCH_WAIT);
    }, 600);
  }

  // Switch the panel's page size to 100 once per panel, using HubSpot's own dropdown,
  // so the page numbers stay right. After that, picking 10 or 20 sticks.
  // Opening the dropdown takes focus, so wait for a pause in typing and hand focus back after.
  let lastKey = 0;
  document.addEventListener('keydown', () => { lastKey = Date.now(); }, true);
  const inDropdown = (el, combo) => !el || el === document.body || el === combo || !!(el.closest && el.closest('[role="listbox"],[role="option"]'));
  function setPageSize(section) {
    if (section.__occSized) return;
    const combo = [...section.querySelectorAll('[role="combobox"]')]
      .find(el => /items$/i.test(el.getAttribute('aria-label') || ''));
    if (!combo || combo.disabled || combo.getAttribute('aria-disabled') === 'true') return; // try again on the next change
    if (combo.getAttribute('aria-label') === PAGE_SIZE + ' items') { section.__occSized = true; return; }
    const quiet = Date.now() - lastKey;
    if (quiet < 800) {
      if (!section.__occRetry) section.__occRetry = setTimeout(() => { section.__occRetry = null; safeRender(); }, 850 - quiet);
      return;
    }
    section.__occSized = true;
    let focused = document.activeElement;
    const track = e => { if (!inDropdown(e.target, combo)) focused = e.target; };
    document.addEventListener('focusin', track, true);
    const done = () => setTimeout(() => {
      document.removeEventListener('focusin', track, true);
      const now = document.activeElement;
      if (focused && focused !== document.body && focused.isConnected && now !== focused && inDropdown(now, combo)) {
        focused.focus({ preventScroll: true });
      }
    }, 0);
    combo.click();
    let tries = 0;
    const pick = setInterval(() => {
      const list = document.getElementById(combo.getAttribute('aria-controls') || '') || document;
      const sel = '[role="option"][data-value="' + PAGE_SIZE + '"]';
      const option = list.querySelector(sel) || document.querySelector(sel);
      if (option) {
        clearInterval(pick);
        option.click();
        done();
      } else if (++tries > 80) {
        clearInterval(pick);
        if (combo.getAttribute('aria-expanded') === 'true') combo.click();
        done();
        log('Could not find the ' + PAGE_SIZE + ' items option.');
      }
    }, 25);
  }

  // Oolio-branded status bar under the search box
  const MARK = '<svg class="occ-mark" viewBox="0 0 200 120" aria-hidden="true"><path fill="#673AB6" fill-rule="evenodd" clip-rule="evenodd" d="M140.099 0C173.181 0 200 26.6979 200 59.6314C200 92.5649 173.181 119.263 140.099 119.263C124.677 119.263 110.616 113.461 99.9986 103.93C89.3837 113.461 75.3229 119.263 59.901 119.263C26.8186 119.263 0 92.5649 0 59.6314C0 26.6979 26.8186 0 59.901 0C75.3232 0 89.3841 5.80195 100.001 15.3329C110.616 5.80177 124.677 0 140.099 0ZM140.099 39.9185C129.163 39.9185 120.297 48.7443 120.297 59.6314C120.297 70.5185 129.163 79.3442 140.099 79.3442C151.035 79.3442 159.901 70.5185 159.901 59.6314C159.901 48.7443 151.035 39.9185 140.099 39.9185ZM59.901 39.9185C48.9647 39.9185 40.099 48.7443 40.099 59.6314C40.099 70.5185 48.9647 79.3442 59.901 79.3442C70.8373 79.3442 79.703 70.5185 79.703 59.6314C79.703 48.7443 70.8373 39.9185 59.901 39.9185Z"/></svg>';
  const css = `
    #oolio-cc-bar{font-family:Inter,-apple-system,"Segoe UI",sans-serif;font-size:13px;display:flex;align-items:center;
      justify-content:space-between;gap:10px;margin:8px 0 4px;padding:8px 12px;border-radius:6px;
      background:#F3EEF9;border-left:3px solid #673AB6;color:#222}
    #oolio-cc-bar.off{background:#f5f5f5;border-left-color:#808080}
    #oolio-cc-bar.warn{background:#FFF7E8;border-left-color:#B54708}
    #oolio-cc-bar .occ-label{display:flex;align-items:center;gap:8px;min-width:0}
    #oolio-cc-bar .occ-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #oolio-cc-bar .occ-mark{flex:none;width:20px;height:12px}
    #oolio-cc-bar b{color:#673AB6}
    #oolio-cc-bar button{flex:none;font:600 12px Inter,-apple-system,"Segoe UI",sans-serif;cursor:pointer;
      border:1px solid #673AB6;color:#673AB6;background:#fff;border-radius:4px;padding:4px 10px}
    #oolio-cc-bar button:hover{background:#E6E1EE}
    #oolio-cc-bar button[aria-pressed="true"]{background:#673AB6;color:#fff}
    #oolio-cc-bar button[aria-pressed="true"]:hover{background:#5E35B1}
    #oolio-cc-bar button:focus-visible{outline:2px solid #673AB6;outline-offset:2px}
    #oolio-cc-bar .occ-actions{display:flex;gap:6px;flex:none}
    #oolio-cc-bar.warn .occ-text{white-space:normal}
    #oolio-cc-bar .occ-parent{color:#5F5F5F;font-weight:400}`;

  function esc(s) { return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

  function onBarClick(e) {
    const btn = e.target.closest && e.target.closest('[data-occ]');
    const action = btn && btn.getAttribute('data-occ');
    if (action === 'company') state.on = !state.on;
    else if (action === 'email') { state.emailOnly = !state.emailOnly; savePref(EMAIL_KEY, state.emailOnly); }
    else if (action === 'retry') {
      const rec = state.record;
      if (!rec) return;
      delete lookups[rec];
      state.status = 'loading';
      // Look the companies up now, so the bar settles even if HubSpot doesn't search again
      getCompanies(state.fromType, rec.slice(rec.indexOf(':') + 1)).then(result => {
        if (state.record !== rec || state.status !== 'loading') return;
        state.status = result.failed ? 'failed' : 'ready';
        state.companies = result.companies || [];
        safeRender();
      });
    } else return;
    state.stale = false;
    changedAt = Date.now();
    const hadFocus = document.activeElement === btn;
    render();
    const again = hadFocus && document.querySelector('#oolio-cc-bar [data-occ="' + action + '"]');
    if (again) again.focus();
    refetch();
  }

  let watching = false;
  function render() {
    const input = document.querySelector('[data-test-id="associate-panel-search"]');
    const section = input && input.closest('[data-test-id="ungated-search-view"]');
    if (!section) return;
    const oldCopy = legacy || !!document.getElementById('occ-bar');
    if (!oldCopy) setPageSize(section);
    if (state.status === 'unseen' && sawSearch) state.status = null; // it was just slow, and not for a ticket or deal
    if (!state.status && !oldCopy) {
      const stray = document.getElementById('oolio-cc-bar');
      if (stray) stray.remove();
      // The panel is open but its search hasn't come through here: HubSpot may have changed how it searches
      if (!watching) {
        watching = true;
        setTimeout(() => {
          if (state.status || sawSearch) return;
          state.status = 'unseen';
          log('Did not see the panel\'s contact search, so nothing is filtered.');
          safeRender();
        }, 5000);
      }
      return;
    }

    if (!document.getElementById('oolio-cc-style')) {
      const style = document.createElement('style');
      style.id = 'oolio-cc-style';
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    }

    let anchor = input;
    while (anchor.parentElement && anchor.parentElement !== section) anchor = anchor.parentElement;

    let bar = document.getElementById('oolio-cc-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'oolio-cc-bar';
      bar.addEventListener('click', onBarClick);
    }
    let prev = bar.previousElementSibling;
    if (prev && prev.id === 'occ-bar') prev = prev.previousElementSibling; // the older copy's bar may sit between
    if (prev !== anchor) anchor.insertAdjacentElement('afterend', bar);

    const record = esc(state.fromType || 'record');
    const all = state.emailOnly ? 'all contacts with an email address' : 'all contacts';
    const names = state.companies.map(c => c.name + (c.isParent ? ' (parent)' : '')).join(', ');
    const nameHtml = state.companies
      .map(c => '<b>' + esc(c.name) + '</b>' + (c.isParent ? ' <span class="occ-parent">(parent)</span>' : ''))
      .join(', ');
    const emailBtn = `<button type="button" data-occ="email" aria-pressed="${state.emailOnly}" title="Only show contacts with an email address">Email only</button>`;
    const companyBtn = !state.companies.length ? ''
      : state.on ? '<button type="button" data-occ="company" title="Not here? Search every contact before you create a new one">Show all</button>'
      : `<button type="button" data-occ="company" title="${esc('Only contacts at ' + names)}">Company only</button>`;
    const label = (text, title) => `<span class="occ-label" title="${esc(title || text.replace(/<[^>]*>/g, ''))}">${MARK}<span class="occ-text">${text}</span></span>`;
    let cls, html;
    if (oldCopy) {
      cls = 'warn';
      html = label('An older copy of this script is also running. Delete version 1.2.0 or earlier in Tampermonkey.');
    } else if (state.status === 'unseen') {
      cls = 'warn';
      html = label('The company filter isn\'t working here, so all contacts are listed. HubSpot may have changed.');
    } else if (state.status === 'loading') {
      cls = '';
      html = label(`Finding this ${record}'s companies…`) + `<span class="occ-actions">${emailBtn}</span>`;
    } else if (state.stale) {
      cls = 'warn';
      html = label('HubSpot didn\'t refresh the list. Type in the search box to update it.') + `<span class="occ-actions">${emailBtn}${companyBtn}</span>`;
    } else if (state.status === 'failed') {
      cls = 'warn';
      html = label(`Couldn't load this ${record}'s companies, so showing ${all}.`) +
        `<span class="occ-actions">${emailBtn}<button type="button" data-occ="retry">Try again</button></span>`;
    } else if (!state.companies.length) {
      cls = 'off';
      html = label(`No company on this ${record}, so showing all contacts.`) + `<span class="occ-actions">${emailBtn}</span>`;
    } else if (state.on) {
      cls = '';
      html = label(`Only contacts at ${nameHtml}`, names) + `<span class="occ-actions">${emailBtn}${companyBtn}</span>`;
    } else {
      cls = 'off';
      html = label('Showing all contacts') + `<span class="occ-actions">${emailBtn}${companyBtn}</span>`;
    }
    // Only touch the DOM when something changed, so the observer doesn't loop
    if (bar.className !== cls) bar.className = cls;
    if (bar.__occHtml !== html) { bar.__occHtml = html; bar.innerHTML = html; }
  }
  function safeRender() { try { render(); } catch (e) { log('Could not draw the bar.', e); } }

  // Keep the bar in place as HubSpot re-renders the panel
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; safeRender(); });
  }).observe(document, { childList: true, subtree: true });
})();
