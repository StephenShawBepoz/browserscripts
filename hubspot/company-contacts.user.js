// ==UserScript==
// @name         HubSpot: Company filters
// @namespace    oolio-userscripts
// @version      2.3.0
// @description  Add existing Contact lists only contacts at the ticket's or deal's companies. Add existing Company shows each company's products, owner and contacts, and filters by product and lifecycle stage. Both show 100 per page.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/company-contacts.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/company-contacts.user.js
// @match        https://app.hubspot.com/*
// @match        https://oolio-hubspot-addons.vercel.app/*
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTQwLjA5OSAwQzE3My4xODEgMCAyMDAgMjYuNjk3OSAyMDAgNTkuNjMxNEMyMDAgOTIuNTY0OSAxNzMuMTgxIDExOS4yNjMgMTQwLjA5OSAxMTkuMjYzQzEyNC42NzcgMTE5LjI2MyAxMTAuNjE2IDExMy40NjEgOTkuOTk4NiAxMDMuOTNDODkuMzgzNyAxMTMuNDYxIDc1LjMyMjkgMTE5LjI2MyA1OS45MDEgMTE5LjI2M0MyNi44MTg2IDExOS4yNjMgMCA5Mi41NjQ5IDAgNTkuNjMxNEMwIDI2LjY5NzkgMjYuODE4NiAwIDU5LjkwMSAwQzc1LjMyMzIgMCA4OS4zODQxIDUuODAxOTUgMTAwLjAwMSAxNS4zMzI5QzExMC42MTYgNS44MDE3NyAxMjQuNjc3IDAgMTQwLjA5OSAwWk0xNDAuMDk5IDM5LjkxODVDMTI5LjE2MyAzOS45MTg1IDEyMC4yOTcgNDguNzQ0MyAxMjAuMjk3IDU5LjYzMTRDMTIwLjI5NyA3MC41MTg1IDEyOS4xNjMgNzkuMzQ0MiAxNDAuMDk5IDc5LjM0NDJDMTUxLjAzNSA3OS4zNDQyIDE1OS45MDEgNzAuNTE4NSAxNTkuOTAxIDU5LjYzMTRDMTU5LjkwMSA0OC43NDQzIDE1MS4wMzUgMzkuOTE4NSAxNDAuMDk5IDM5LjkxODVaTTU5LjkwMSAzOS45MTg1QzQ4Ljk2NDcgMzkuOTE4NSA0MC4wOTkgNDguNzQ0MyA0MC4wOTkgNTkuNjMxNEM0MC4wOTkgNzAuNTE4NSA0OC45NjQ3IDc5LjM0NDIgNTkuOTAxIDc5LjM0NDJDNzAuODM3MyA3OS4zNDQyIDc5LjcwMyA3MC41MTg1IDc5LjcwMyA1OS42MzE0Qzc5LjcwMyA0OC43NDQzIDcwLjgzNzMgMzkuOTE4NSA1OS45MDEgMzkuOTE4NVoiIGZpbGw9IiM2NzNBQjYiLz4KPC9zdmc+Cg==
// @grant        none
// @run-at       document-start
// ==/UserScript==

// Formerly two scripts: HubSpot: Company contacts (1.3.1) and HubSpot: Products in company search (1.2.1).
// It keeps the Company contacts file name, so copies of that script update to this one by themselves.
//
// Must stay @grant none and @run-at document-start, with no @noframes: it patches HubSpot's own
// XMLHttpRequest and fetch inside the Add existing panels' frames before their first search.
// Any GM_* grant moves it into Tampermonkey's sandbox, where it would filter nothing.

(function () {
  'use strict';

  // On the HubSpot add-ons page, just say this script is installed (and which version), then stop
  if (location.hostname === 'oolio-hubspot-addons.vercel.app') {
    const v = typeof GM_info !== 'undefined' && GM_info.script ? GM_info.script.version : '';
    document.documentElement.setAttribute('data-installed-company-filters', v || 'yes');
    document.dispatchEvent(new Event('zoo:installed'));
    return;
  }

  // A second copy of this script would hold back and filter every search twice
  if (window.__oolioCompanyFilters) return;
  window.__oolioCompanyFilters = true;

  // Add existing Contact opens in its own frame, at /object-builder/<portal>/0-1/embed
  if (/^\/object-builder\/\d+\/0-1\/embed/.test(location.pathname)) contactPanel();
  // Add existing Company is found by its heading, in whichever frame it opens
  companyPanel();

  /* ======================== Add existing Contact ======================== */
  // Lists only contacts at the ticket's or deal's companies and their parent companies.

  function contactPanel() {
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
        html = label(`No company on this ${record}, so showing ${all}.`) + `<span class="occ-actions">${emailBtn}</span>`;
      } else if (state.on) {
        cls = '';
        html = label(`Only contacts at ${nameHtml}`, names) + `<span class="occ-actions">${emailBtn}${companyBtn}</span>`;
      } else {
        cls = 'off';
        html = label('Showing ' + all) + `<span class="occ-actions">${emailBtn}${companyBtn}</span>`;
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
  }

  /* ======================== Add existing Company ======================== */
  // Products, owner and contacts under each company, and chips to filter by product and stage.

  function companyPanel() {
    // The separate Products in company search script (1.2.1 or earlier) does the same job.
    // If it got here first, leave the panel to it and just ask for it to be deleted.
    if (typeof window.ocpDebug === 'function') {
      console.info('[Oolio company filters] HubSpot: Products in company search is also installed. Delete it in Tampermonkey.');
      return;
    }

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
    // Lifecycle stages, chosen in settings. Opportunity also has a chip after the products.
    // value = what HubSpot stores, label = what you see (and what LS, O, T starts with).
    const STAGES = [
      { value: 'subscriber', label: 'Subscriber' },
      { value: 'lead', label: 'Lead' },
      { value: 'marketingqualifiedlead', label: 'Marketing Qualified Lead' },
      { value: 'salesqualifiedlead', label: 'Sales Qualified Lead' },
      { value: 'opportunity', label: 'Opportunity' },
      { value: 'customer', label: 'Customer' },
      { value: 'evangelist', label: 'Evangelist' },
      { value: 'other', label: 'Other' },
      { value: '', label: 'No stage' },
    ];
    const OPP = '__opportunity';
    // A hidden stage is kept in settings.off like a chip. Opportunity keeps the key it had as a chip.
    const stageKey = (v) => (v === 'opportunity' ? OPP : '__stage:' + (v || 'none'));

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
      off: ['Idealpos', 'SwiftPOS', OTHER, OPP], // chips switched off: those companies are hidden
      oppStartsOff: true,                   // OPP has been switched off once for older saved settings
      showHidden: false,                    // show hidden companies faded instead
      pageSize: 100,                        // 10, 30 or 100. 0 leaves HubSpot's choice alone
      owner: true,
      contacts: true,
      tickets: true,
      open: true,
      fields: [],
      pipelinesOff: [],                     // ticket pipeline IDs left out of a company's ticket list
    };
    let settings = load();

    function load() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
        const s = { ...DEFAULTS, ...saved };
        if (!Array.isArray(s.off)) s.off = DEFAULTS.off;
        if (!Array.isArray(s.fields)) s.fields = [];
        if (!Array.isArray(s.pipelinesOff)) s.pipelinesOff = [];
        // Settings saved before the Opportunity chip existed: start it switched off, once
        if (Object.keys(saved).length && !saved.oppStartsOff) {
          s.oppStartsOff = true;
          if (!s.off.includes(OPP)) s.off = [...s.off, OPP];
          try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* private window */ }
        }
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
    // HubSpot is asked once whether it accepts each kind of filter (which fields, which operators).
    // Each kind it accepts is remembered, so a new kind is never sent to the panel untested.
    const SERVER_KEY = 'oolio-company-search-server-filters';
    const accepted = new Set((() => { try { return JSON.parse(localStorage.getItem(SERVER_KEY) || '[]'); } catch (e) { return []; } })());
    let serverFilter = 'unknown'; // 'broken' once HubSpot rejects a filter: rows are then hidden on the page
    let lastServer = '';
    function setServerFilter(state, msg, kind) {
      serverFilter = state;
      lastServer = msg || '';
      // Only success is remembered, so a one-off failure is retried on the next page load
      if (state === 'works' && kind && !accepted.has(kind)) {
        accepted.add(kind);
        try { localStorage.setItem(SERVER_KEY, JSON.stringify([...accepted])); } catch (e) { /* ignore */ }
      }
    }
    const kindOf = (filters) => [...new Set(filters.map((f) => f.property + ':' + f.operator))].sort().join(',');

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

    // Added to every filter group. NEQ and NOT_IN keep companies with no lifecycle stage,
    // so hiding "No stage" is its own filter.
    function stageFilters() {
      const hidden = STAGES.filter((st) => st.value && isOff(stageKey(st.value))).map((st) => st.value);
      const out = [];
      if (hidden.length === 1) out.push({ property: 'lifecyclestage', operator: 'NEQ', value: hidden[0] });
      else if (hidden.length) out.push({ property: 'lifecyclestage', operator: 'NOT_IN', values: hidden });
      if (isOff(stageKey(''))) out.push({ property: 'lifecyclestage', operator: 'HAS_PROPERTY' });
      return out;
    }

    // Returns { body, kind } with the changed request body, or null to leave the request alone
    function filteredBody(url, body) {
      if (typeof body !== 'string' || body.length > 300000 || !/\/api\/graphql\/crm/.test(String(url))) return null;
      let j;
      try { j = JSON.parse(body); } catch (e) { return null; }
      const v = j && j.variables;
      if (!j || j.operationName !== 'SearchObjectsQuery' || !v || String(v.objectTypeId) !== '0-2' || !Array.isArray(v.filterGroups)) return null;
      const extra = productFilters();
      const always = stageFilters();
      if (!extra && !always.length) return null;
      const groups = v.filterGroups.length ? v.filterGroups : [{ filters: [] }];
      // Filter groups are OR'd and filters inside a group are AND'd, so each of HubSpot's own
      // groups is repeated once per product condition, and every group gets the stage filter.
      v.filterGroups = groups.flatMap((g) => (extra || [null]).map((f) =>
        ({ ...g, filters: [...(g.filters || []), ...always, ...(f ? [f] : [])] })));
      return { body: JSON.stringify(j), kind: kindOf([...always, ...(extra || [])]) };
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
      let out = null;
      try {
        if (serverFilter !== 'broken' && init && typeof init.body === 'string') {
          out = filteredBody(typeof input === 'string' ? input : input && input.url, init.body);
        }
      } catch (e) { out = null; }
      if (!out) return pageFetch.apply(this, arguments);
      searchSeenVia = 'fetch';
      try {
        const res = await pageFetch.call(window, input, { ...init, body: out.body });
        const problem = res.ok ? searchFailed(await res.clone().json()) : `HubSpot returned ${res.status}`;
        if (!problem) {
          if (!accepted.has(out.kind)) { setServerFilter('works', '', out.kind); note('Filter accepted by HubSpot: ' + out.kind); }
          return res;
        }
        setServerFilter('broken', problem);
        note('Filter rejected, hiding on the page instead: ' + problem);
      } catch (e) {
        if (e && e.name === 'AbortError') throw e; // HubSpot cancelled it for a newer search
        note('Filtered search failed: ' + (e && e.message));
      }
      return pageFetch.call(window, input, init);
    };

    // HubSpot sends this search with XMLHttpRequest. A request can't be retried once sent, so
    // the first time each kind of filter is used it's checked with a one-row test search; until
    // that answers, the real request waits (a fraction of a second). After that it goes out filtered.
    let searchSeenVia = 'none';
    const probes = new Map(); // kind -> test search on its way
    function checkFilter(url, headers, body, kind) {
      if (!probes.has(kind)) {
        const j = JSON.parse(body);
        j.variables.count = 1;
        probes.set(kind, pageFetch.call(window, url, { method: 'POST', credentials: 'include', headers, body: JSON.stringify(j) })
          .then(async (res) => {
            const problem = res.ok ? searchFailed(await res.json()) : `HubSpot returned ${res.status}`;
            if (problem) { setServerFilter('broken', problem); note('Filter rejected, hiding on the page instead: ' + problem); }
            else { setServerFilter('works', '', kind); note('Filter accepted by HubSpot: ' + kind); }
          })
          .catch((e) => { setServerFilter('broken', e.message); note('Filter check failed: ' + e.message); })
          .finally(() => { probes.delete(kind); scheduleRun(0); }));
      }
      return probes.get(kind);
    }

    const xhrOpen = XMLHttpRequest.prototype.open;
    const xhrSend = XMLHttpRequest.prototype.send;
    const xhrHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__ocpUrl = String(url);
      this.__ocpHeaders = {};
      return xhrOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
      try { if (this.__ocpHeaders) this.__ocpHeaders[k] = v; } catch (e) { /* ignore */ }
      return xhrHeader.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (b) {
      let out = null;
      try { if (serverFilter !== 'broken') out = filteredBody(this.__ocpUrl, b); } catch (e) { out = null; }
      if (!out) return xhrSend.apply(this, arguments);
      searchSeenVia = 'xhr';
      if (accepted.has(out.kind)) return xhrSend.call(this, out.body);
      const xhr = this;
      checkFilter(xhr.__ocpUrl, { ...xhr.__ocpHeaders }, out.body, out.kind).then(() => {
        if (xhr.readyState !== 1) return; // cancelled meanwhile
        try { xhrSend.call(xhr, accepted.has(out.kind) ? out.body : b); } catch (e) { note('Search send failed: ' + e.message); }
      });
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

    // Ticket pipeline names: tickets only carry the pipeline's ID. Tried once per page load,
    // the first time a company's tickets are listed.
    const pipelines = new Map(); // ID -> name
    let pipelineList = []; // active pipelines by name, for the settings list
    let pipelinesState = 'idle'; // idle | loading | ok | failed
    async function loadPipelines() {
      if (pipelinesState !== 'idle' || !portalId()) return;
      pipelinesState = 'loading';
      try {
        const j = await api(`/api/crm-pipelines/v1/pipelines/0-5?portalId=${portalId()}`);
        for (const pl of Array.isArray(j) ? j : j.results || []) {
          if (!pl || pl.pipelineId == null) continue;
          pipelines.set(String(pl.pipelineId), pl.label || '');
          if (pl.active !== false) pipelineList.push({ id: String(pl.pipelineId), label: pl.label || 'Unnamed pipeline' });
        }
        pipelineList.sort((a, b) => a.label.localeCompare(b.label));
        pipelinesState = pipelines.size ? 'ok' : 'failed';
      } catch (e) {
        pipelinesState = 'failed';
        note('Pipelines: ' + e.message.slice(0, 60));
      }
      scheduleRun(0);
    }

    // Fallback when a row's company can't be read from the page: search HubSpot by name
    const NAME_PROPS = ['name', 'domain', PRODUCT_PROPERTY, 'lifecyclestage', 'num_associated_contacts', 'hubspot_owner_id', ...FIELDS.map((f) => f.name)];
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
        props: ['subject', 'createdate', 'hubspot_owner_id', 'hs_pipeline'],
        // Pipelines switched off in settings are left out. NOT_IN keeps tickets with no pipeline.
        filters: (id) => {
          const off = settings.pipelinesOff.length ? [{ property: 'hs_pipeline', operator: 'NOT_IN', values: settings.pipelinesOff }] : [];
          return [
            [{ property: 'associations.company', operator: 'EQ', value: id }, ...off],
            [{ property: 'associations.0-2', operator: 'EQ', value: id }, ...off],
          ];
        },
        sortBy: 'createdate',
        // Owner and pipeline are names looked up separately, so they're turned into text when drawn
        item: (p) => ({ title: p('subject') || 'Untitled ticket', created: fmtValue(p('createdate')), owner: p('hubspot_owner_id'), pipeline: p('hs_pipeline') }),
      },
    };

    function toggleList(id, kind) {
      const cur = expanded.get(id);
      if (cur && cur.kind === kind) { expanded.delete(id); scheduleRun(0); return; }
      fetchList(id, kind);
    }

    async function fetchList(id, kind) {
      const def = LISTS[kind];
      if (!def) return;
      const req = { kind, state: 'loading' };
      expanded.set(id, req);
      if (kind === 'tickets') { loadOwners(); loadPipelines(); }
      scheduleRun(0);
      // Only the latest request for this company may fill in the list (or the list was closed)
      const current = () => expanded.get(id) === req;
      let lastErr = null;
      for (const filters of def.filters(id)) {
        try {
          const j = await crmSearch(def.type, { filters, count: 25, props: def.props });
          if (!current()) return;
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
      if (!current()) return;
      note(`${kind} list failed: ${lastErr.message}`);
      expanded.set(id, { kind, state: 'error', msg: lastErr.message });
      scheduleRun(0);
    }

    // After the pipelines in settings change, list each open tickets list again
    function refreshTicketLists() {
      for (const [id, ex] of expanded) if (ex.kind === 'tickets') fetchList(id, 'tickets');
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
    // HubSpot's list may not carry lifecyclestage itself, but LS, O, T starts with the stage's label
    const STAGE_BY_LABEL = new Map(STAGES.filter((st) => st.value).map((st) => [norm(st.label), st.value]));
    function stageOf(rec) {
      const v = norm(rec.props.lifecyclestage);
      if (v) return v;
      return STAGE_BY_LABEL.get(norm(String(rec.props.lifecycle__owner__tech || '').split(',')[0])) || '';
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
        .ocp-divider { width:1px; height:18px; margin:0 2px; background:#D6D6D6; }
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
        .ocp-dd { font-weight:400; }
        .ocp-dd > summary { list-style:none; display:flex; align-items:center; justify-content:space-between; gap:8px;
          box-sizing:border-box; height:30px; padding:0 8px; border:1px solid #D6D6D6; border-radius:6px; background:#fff;
          color:#222; cursor:pointer; }
        .ocp-dd > summary::-webkit-details-marker { display:none; }
        .ocp-dd > summary:focus-visible { outline:2px solid #03A9F4; outline-offset:1px; }
        .ocp-dd[open] > summary { border-color:#673AB6; }
        .ocp-dd[open] > summary svg { transform:rotate(180deg); }
        .ocp-dd-sum { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ocp-dd-menu { margin-top:4px; padding:6px 8px; border:1px solid #E6E0F0; border-radius:6px; background:#fff; }
        .ocp-dd-tools { display:flex; align-items:center; gap:10px; margin-bottom:4px; }
        .ocp-dd-tools input { flex:1; min-width:0; box-sizing:border-box; height:26px; padding:0 6px; border:1px solid #D6D6D6;
          border-radius:4px; font:inherit; }
        .ocp-dd-list { display:grid; gap:1px; max-height:220px; overflow:auto; }
        .ocp-dd-list label { display:flex; align-items:center; gap:6px; padding:2px 0; cursor:pointer; }
        .ocp-dd-list label[hidden] { display:none; }
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
    const ICON_CHEVRON = svg('<path d="m6 9 6 6 6-6"/>');
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

    // Under a ticket: owner, pipeline and created date. Names still loading are left out for now.
    function ticketMeta(i) {
      const owner = !i.owner ? 'No owner' : owners.get(String(i.owner)) || '';
      return [owner, pipelines.get(String(i.pipeline)) || '', i.created].filter(Boolean).join(' · ');
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
      const leftOut = what === 'tickets' && settings.pipelinesOff.length;
      if (!ex.items.length) {
        return `<div class="ocp-sub"><span class="ocp-note">${leftOut ? 'No tickets in the pipelines you show.' : `No ${what}.`}</span>` +
          (leftOut ? ` ${openCompany('See all on the company')}` : '') + '</div>';
      }
      const type = what === 'contacts' ? '0-1' : '0-5';
      const lis = ex.items.slice(0, 10).map((i) => {
        const meta = what === 'tickets' ? ticketMeta(i) : i.meta;
        return `<li><a href="${recordUrl(type, i.id)}" target="_blank" rel="noopener" data-act="open">${esc(i.title)}</a>` +
          (meta ? `<span class="ocp-note">${esc(meta)}</span>` : '') + '</li>';
      }).join('');
      const more = leftOut ? `<span class="ocp-note">Some pipelines are hidden in settings.</span> ${openCompany('See all on the company')}`
        : ex.total > 10 ? openCompany(`See all ${ex.total} on the company`) : '';
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
      { key: NONE, label: 'No product', title: 'Companies with no product set' },
      { key: OPP, label: 'Opportunity', title: 'Companies whose lifecycle stage is Opportunity', divider: true }];

    // A drop-down list of tick boxes, with All and None (and a search box for long lists)
    function dropdown(name, searchable, items) {
      return `<details class="ocp-dd" data-dd="${name}"><summary><span class="ocp-dd-sum"></span>${ICON_CHEVRON}</summary>` +
        '<div class="ocp-dd-menu"><div class="ocp-dd-tools">' +
        (searchable ? `<input type="search" data-dd-search="${name}" placeholder="Find" aria-label="Find a pipeline">` : '') +
        `<button type="button" class="ocp-link" data-act="dd-all" data-dd="${name}">All</button>` +
        `<button type="button" class="ocp-link" data-act="dd-none" data-dd="${name}">None</button>` +
        `</div><div class="ocp-dd-list">${items}</div></div></details>`;
    }

    // "All stages", "All but Opportunity", "Bepoz | Support, BP | Implementation" or "5 of 52"
    function summarise(shown, hidden, noun) {
      if (!hidden.length) return 'All ' + noun;
      if (!shown.length) return 'None';
      if (hidden.length <= 2 && hidden.length < shown.length) return 'All but ' + hidden.join(', ');
      if (shown.length <= 2) return shown.join(', ');
      return `${shown.length} of ${shown.length + hidden.length}`;
    }

    // Tick boxes and summaries in the two drop-downs, kept in step with the chips
    function updateDropdowns(bar) {
      for (const el of bar.querySelectorAll('[data-stage]')) {
        const on = !isOff(stageKey(el.dataset.stage));
        if (el.checked !== on) el.checked = on;
      }
      const stageSum = bar.querySelector('[data-dd="stages"] .ocp-dd-sum');
      const stageText = summarise(STAGES.filter((st) => !isOff(stageKey(st.value))).map((st) => st.label),
        STAGES.filter((st) => isOff(stageKey(st.value))).map((st) => st.label), 'stages');
      if (stageSum.textContent !== stageText) stageSum.textContent = stageText;

      const list = bar.querySelector('[data-dd="pipelines"] .ocp-dd-list');
      if (list.__ocpFor !== pipelinesState + pipelineList.length) {
        list.__ocpFor = pipelinesState + pipelineList.length;
        setHTML(list, pipelinesState === 'ok'
          ? pipelineList.map((pl) => `<label><input type="checkbox" data-pipeline="${esc(pl.id)}">${esc(pl.label)}</label>`).join('')
          : `<span class="ocp-note">${pipelinesState === 'failed' ? "Couldn't load the pipelines." : 'Loading pipelines…'}</span>`);
      }
      for (const el of list.querySelectorAll('[data-pipeline]')) {
        const on = !settings.pipelinesOff.includes(el.dataset.pipeline);
        if (el.checked !== on) el.checked = on;
      }
      const pipeSum = bar.querySelector('[data-dd="pipelines"] .ocp-dd-sum');
      const pipeText = pipelinesState !== 'ok' && !settings.pipelinesOff.length ? 'All pipelines'
        : summarise(pipelineList.filter((pl) => !settings.pipelinesOff.includes(pl.id)).map((pl) => pl.label),
          settings.pipelinesOff.map((id) => pipelines.get(id) || 'an archived pipeline'), 'pipelines');
      if (pipeSum.textContent !== pipeText) pipeSum.textContent = pipeText;
    }

    function setStages(on) {
      const keys = STAGES.map((st) => stageKey(st.value));
      settings.off = on ? settings.off.filter((k) => !keys.includes(k)) : [...new Set([...settings.off, ...keys])];
    }

    function buildBar() {
      const bar = document.createElement('div');
      bar.className = 'ocp-ui ocp-bar';
      setHTML(bar,
        '<div class="ocp-bar-row">' +
        `<span class="ocp-bar-label">${ICON_FILTER}Show</span>` +
        CHIPS.map((c) => (c.divider ? '<span class="ocp-divider" aria-hidden="true"></span>' : '') +
          `<button type="button" class="ocp-chip" data-chip="${esc(c.key)}" aria-pressed="${!isOff(c.key)}"${c.title ? ` title="${esc(c.title)}"` : ''}>` +
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
        '<div class="ocp-set">Companies: lifecycle stages to show' +
        dropdown('stages', false, STAGES.map((st) => `<label><input type="checkbox" data-stage="${esc(st.value)}">${esc(st.label)}</label>`).join('')) +
        '</div>' +
        '<div class="ocp-set">Tickets: pipelines to show' + dropdown('pipelines', true, '') + '</div>' +
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
          if (!box.hidden) { fillSettings(bar); loadPipelines(); }
        } else if (act && (act.dataset.act === 'dd-all' || act.dataset.act === 'dd-none')) {
          const on = act.dataset.act === 'dd-all';
          if (act.dataset.dd === 'stages') { setStages(on); save(); refreshSearch(); }
          else {
            // Only the pipelines the Find box shows, so "BP" then None hides every BP pipeline
            const shown = [...bar.querySelectorAll('[data-dd="pipelines"] .ocp-dd-list label:not([hidden]) [data-pipeline]')].map((el) => el.dataset.pipeline);
            settings.pipelinesOff = on ? settings.pipelinesOff.filter((id) => !shown.includes(id)) : [...new Set([...settings.pipelinesOff, ...shown])];
            save();
            refreshTicketLists();
          }
          updateDropdowns(bar);
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
          refreshTicketLists();
          fillSettings(bar);
        } else {
          return;
        }
        scheduleRun(0);
      });
      bar.addEventListener('change', (e) => {
        const el = e.target;
        if (el.dataset.stage != null) {
          const k = stageKey(el.dataset.stage);
          settings.off = el.checked ? settings.off.filter((x) => x !== k) : [...settings.off, k];
          save();
          refreshSearch();
          updateDropdowns(bar);
        } else if (el.dataset.pipeline) {
          const id = el.dataset.pipeline;
          settings.pipelinesOff = el.checked ? settings.pipelinesOff.filter((x) => x !== id) : [...settings.pipelinesOff, id];
          save();
          refreshTicketLists();
          updateDropdowns(bar);
        } else if (el.dataset.field) {
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
      // Find a pipeline: hide the ones that don't match
      bar.addEventListener('input', (e) => {
        const name = e.target.dataset && e.target.dataset.ddSearch;
        if (!name) return;
        const q = norm(e.target.value);
        for (const label of bar.querySelectorAll(`[data-dd="${name}"] .ocp-dd-list label`)) label.hidden = !!q && !norm(label.textContent).includes(q);
      });
      for (const t of ['mousedown', 'pointerdown', 'keydown', 'keyup', 'keypress']) bar.addEventListener(t, (e) => e.stopPropagation());
      return bar;
    }

    function fillSettings(bar) {
      bar.querySelector('[data-set="pageSize"]').value = String(settings.pageSize || 0);
      for (const k of ['owner', 'contacts', 'tickets', 'open']) bar.querySelector(`[data-set="${k}"]`).checked = !!settings[k];
      for (const el of bar.querySelectorAll('[data-field]')) el.checked = settings.fields.includes(el.dataset.field);
      updateDropdowns(bar);
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
      const otherStages = STAGES.filter((st) => st.value !== 'opportunity' && isOff(stageKey(st.value))).map((st) => st.label);
      if (otherStages.length) {
        html += `<span title="${esc('Hidden in settings: ' + otherStages.join(', '))}">+${otherStages.length} stage${otherStages.length === 1 ? '' : 's'} hidden</span>`;
      }
      if (serverFilter === 'broken') html += `<span class="ocp-warn" title="${esc(lastServer)}">Filtering this page only</span>`;
      if (window.ocpDebug !== ownDebug) html = '<span class="ocp-warn">Delete <i>Products in company search</i> in Tampermonkey.</span>' + html;
      const status = bar.querySelector('.ocp-status');
      if (status.__ocpHtml !== html) { setHTML(status, html); status.__ocpHtml = html; }
      updateDropdowns(bar);
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
          const stages = r.recs.map(stageOf);
          if (stages.every((st) => st === 'opportunity')) counts.set(OPP, (counts.get(OPP) || 0) + 1);
          hide = !wanted(r.recs) || stages.every((st) => isOff(stageKey(st)));
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
        `HubSpot: Company filters ${VERSION} (Add existing Company)`,
        `Frame: ${location.pathname.replace(/\d{5,}/g, '#')} (${window.top === window ? 'top page' : 'embedded frame'})`,
        `Panel: ${p ? (p.fallback ? 'found (fallback checkboxes)' : 'found') : 'not found'}, rows: ${rows.length}, rows-per-page control: ${ctl ? `"${ctl.textContent.trim()}"` : 'not found'}`,
        `Row data from: ${JSON.stringify(how)}, owners: ${ownersState} (${owners.size}), Trusted Types policy: ${!!ttPolicy}`,
        `Last pass: ${lastPass ? JSON.stringify(lastPass.stats) : 'none'}, row depth: ${rowDepth}`,
        `Filters in HubSpot's search: ${serverFilter === 'broken' ? 'rejected' : 'accepted ' + [...accepted].join(' | ')}${lastServer ? ' (' + lastServer + ')' : ''}, search seen via: ${searchSeenVia}`,
        `Hidden: ${settings.off.join(', ') || 'none'}; ticket pipelines hidden: ${settings.pipelinesOff.length} (pipelines ${pipelinesState}, ${pipelineList.length})`,
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
    // In the console of the panel's frame, type ocpDebug() to see what the script can see.
    // If an older Products in company search replaces it, that copy is running too.
    const ownDebug = () => debugText();
    window.ocpDebug = ownDebug;

    function start() {
      injectStyles();
      new MutationObserver(() => scheduleRun()).observe(document.body, { childList: true, subtree: true, characterData: true });
      scheduleRun();
    }
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
  }
})();
