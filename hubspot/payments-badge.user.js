// ==UserScript==
// @name         HubSpot: Payments badge
// @namespace    oolio-userscripts
// @version      1.0.0
// @description  Shows whether a company pays through Adyen or WPay, on company records, tickets and Help Desk.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/payments-badge.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/payments-badge.user.js
// @match        https://app.hubspot.com/help-desk/*
// @match        https://app.hubspot.com/contacts/*
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTQwLjA5OSAwQzE3My4xODEgMCAyMDAgMjYuNjk3OSAyMDAgNTkuNjMxNEMyMDAgOTIuNTY0OSAxNzMuMTgxIDExOS4yNjMgMTQwLjA5OSAxMTkuMjYzQzEyNC42NzcgMTE5LjI2MyAxMTAuNjE2IDExMy40NjEgOTkuOTk4NiAxMDMuOTNDODkuMzgzNyAxMTMuNDYxIDc1LjMyMjkgMTE5LjI2MyA1OS45MDEgMTE5LjI2M0MyNi44MTg2IDExOS4yNjMgMCA5Mi41NjQ5IDAgNTkuNjMxNEMwIDI2LjY5NzkgMjYuODE4NiAwIDU5LjkwMSAwQzc1LjMyMzIgMCA4OS4zODQxIDUuODAxOTUgMTAwLjAwMSAxNS4zMzI5QzExMC42MTYgNS44MDE3NyAxMjQuNjc3IDAgMTQwLjA5OSAwWk0xNDAuMDk5IDM5LjkxODVDMTI5LjE2MyAzOS45MTg1IDEyMC4yOTcgNDguNzQ0MyAxMjAuMjk3IDU5LjYzMTRDMTIwLjI5NyA3MC41MTg1IDEyOS4xNjMgNzkuMzQ0MiAxNDAuMDk5IDc5LjM0NDJDMTUxLjAzNSA3OS4zNDQyIDE1OS45MDEgNzAuNTE4NSAxNTkuOTAxIDU5LjYzMTRDMTU5LjkwMSA0OC43NDQzIDE1MS4wMzUgMzkuOTE4NSAxNDAuMDk5IDM5LjkxODVaTTU5LjkwMSAzOS45MTg1QzQ4Ljk2NDcgMzkuOTE4NSA0MC4wOTkgNDguNzQ0MyA0MC4wOTkgNTkuNjMxNEM0MC4wOTkgNzAuNTE4NSA0OC45NjQ3IDc5LjM0NDIgNTkuOTAxIDc5LjM0NDJDNzAuODM3MyA3OS4zNDQyIDc5LjcwMyA3MC41MTg1IDc5LjcwMyA1OS42MzE0Qzc5LjcwMyA0OC43NDQzIDcwLjgzNzMgMzkuOTE4NSA1OS45MDEgMzkuOTE4NVoiIGZpbGw9IiM2NzNBQjYiLz4KPC9zdmc+Cg==
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  // A second copy (installed twice) stays out of the way
  if (window.__oolioPaymentsBadge) return;
  window.__oolioPaymentsBadge = true;

  /* ---------------- Things you might want to change ---------------- */

  const FRESH_MS = 60000; // a company's payment details are read again after this long

  // The company fields the badge reads. "Acquirer - POS" decides; the merchant IDs fill in when it's blank.
  const PROPS = ['name', 'acquirer', 'adyen_merchant_id___pos', 'adyen_account_holder_id', 'wpay___merchant_id___pos'];
  // "Acquirer - POS" values (internal value -> what the badge says)
  const ACQUIRERS = {
    Advance: { adyen: true, label: 'Adyen Balance' },
    Adyen: { adyen: true, label: 'Adyen Manage' },
    WPay: { wpay: true, label: 'WPay' },
    'Adyen + WPay': { adyen: true, wpay: true, label: 'Adyen + WPay' },
  };

  // HubSpot's own markers (checked on company records, ticket records and Help Desk, October 2026)
  const HEADER_CONTACT = '[data-test-id="ticket-header-contact-detail-link"]'; // the contact's name in a Help Desk ticket title
  const RECORD_TITLE = 'h2[data-test-id="highlight-record-label"]'; // the record's name, top left of a record page
  const RECORD_PROPS = '[data-test-id="properties-list"]'; // the phone, dates etc. under that name
  const COMPANY_TITLE = '[data-test-id="company-chicklet-title"]'; // inside a company card, "chicklet-<companyId>"

  const gmGet = (k, d) => (typeof GM_getValue === 'function' ? GM_getValue(k, d) : d);
  const gmSet = (k, v) => { if (typeof GM_setValue === 'function') GM_setValue(k, v); };
  const isEnabled = () => gmGet('enabled', true);

  // Search the browser console for "Oolio payments badge" to see why something didn't work
  const log = (...a) => console.info('[Oolio payments badge]', ...a);

  // ---------- Helpers ----------
  const clean = (s) => (s || '').replace(/[​-‍⁠﻿]/g, '').replace(/\s+/g, ' ').trim();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // HubSpot may require Trusted Types for innerHTML
  let ttPolicy = null;
  try {
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      ttPolicy = window.trustedTypes.createPolicy('oolio-payments-badge', { createHTML: (s) => s });
    }
  } catch (e) { log('Trusted Types policy blocked:', e.message); }
  const setHTML = (el, html) => { el.innerHTML = ttPolicy ? ttPolicy.createHTML(html) : html; };

  // The record on screen: a company, or a ticket (Help Desk or its record page)
  function getPage() {
    let m = location.pathname.match(/^\/help-desk\/(\d+)\/(?:.*\/)?ticket\/(\d+)/);
    if (m) return { portal: m[1], type: 'ticket', id: m[2], helpDesk: true };
    m = location.pathname.match(/^\/contacts\/(\d+)\/(?:record\/0-5|ticket)\/(\d+)/);
    if (m) return { portal: m[1], type: 'ticket', id: m[2] };
    m = location.pathname.match(/^\/contacts\/(\d+)\/(?:record\/0-2|company)\/(\d+)/);
    if (m) return { portal: m[1], type: 'company', id: m[2] };
    return null;
  }

  /* ---------------- HubSpot, with your login ---------------- */
  // The same calls HubSpot's own pages make. Read-only: nothing is ever changed.

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

  // Company IDs linked to the ticket, primary first
  async function ticketCompanies(p) {
    const d = await hubspot(`crm/v4/objects/0-5/${p.id}/associations/0-2?limit=100`, p.portal);
    const rows = (d && d.results) || [];
    const isPrimary = (r) => (r.associationTypes || []).some((x) => x.label === 'Primary' || (x.category === 'HUBSPOT_DEFINED' && x.typeId === 26));
    return [...rows.filter(isPrimary), ...rows.filter((r) => !isPrimary(r))]
      .map((r) => String(r.toObjectId)).filter((id, i, a) => a.indexOf(id) === i);
  }
  // id -> properties (plain values) for up to 100 companies
  async function readCompanies(p, ids) {
    const out = new Map();
    if (!ids.length) return out;
    const d = await hubspot('crm-search/search?clienttimeout=14000', p.portal, {
      method: 'POST',
      body: {
        objectTypeId: '0-2', count: 100, offset: 0, query: '',
        filterGroups: [{ filters: [{ property: 'hs_object_id', operator: 'IN', values: ids.slice(0, 100) }] }],
        sorts: [], requestOptions: { properties: PROPS },
      },
    });
    ((d && d.results) || []).forEach((r) => {
      const v = {};
      Object.entries(r.properties || {}).forEach(([k, x]) => { v[k] = x && typeof x === 'object' ? x.value : x; });
      out.set(String(r.objectId || v.hs_object_id), v);
    });
    return out;
  }

  /* ---------------- What the company pays through ---------------- */
  // { adyen, wpay, label, why } or null when there's nothing to go on
  function classify(v) {
    const acq = clean(v.acquirer);
    const adyenId = clean(v.adyen_merchant_id___pos) || clean(v.adyen_account_holder_id);
    const wpayId = clean(v.wpay___merchant_id___pos);
    const ids = [adyenId && `Adyen merchant ID: ${adyenId}`, wpayId && `WPay merchant ID: ${wpayId}`].filter(Boolean);
    const known = ACQUIRERS[acq];
    if (known) return { ...known, why: [`Acquirer - POS: ${known.label}`, ...ids] };
    if (acq) return { other: true, label: acq, why: [`Acquirer - POS: ${acq}`, ...ids] };
    // Acquirer not filled in: go by the merchant IDs
    if (adyenId || wpayId) {
      return {
        adyen: !!adyenId, wpay: !!wpayId, guessed: true,
        label: adyenId && wpayId ? 'Adyen + WPay' : adyenId ? 'Adyen' : 'WPay',
        why: ['Acquirer - POS is blank, so this is from the merchant ID', ...ids],
      };
    }
    return null;
  }

  // companyId -> { at, name, pay } so moving between tickets of the same venue doesn't ask again
  const cache = new Map();
  // state: { key, page, loading, error, companies: [companyId] (primary first) }
  let state = null;
  let seq = 0;

  async function check(p) {
    const my = ++seq;
    const key = `${p.type}/${p.portal}/${p.id}`;
    state = { key, page: p, loading: true, companies: [] };
    render(); // the last record's badge goes straight away
    try {
      const ids = p.type === 'company' ? [p.id] : await ticketCompanies(p);
      const stale = ids.filter((id) => !cache.has(id) || Date.now() - cache.get(id).at > FRESH_MS);
      const read = await readCompanies(p, stale);
      stale.forEach((id) => {
        const v = read.get(id) || {};
        cache.set(id, { at: Date.now(), name: clean(v.name) || `Company ${id}`, pay: classify(v) });
      });
      if (my !== seq) return;
      state = { key, page: p, loading: false, companies: ids };
      log(`${p.type === 'company' ? 'Company' : 'Ticket'} ${p.id}:`,
        ids.map((id) => `${cache.get(id).name} = ${cache.get(id).pay ? cache.get(id).pay.label : 'nothing set'}`).join(', ') || 'no company');
    } catch (e) {
      if (my !== seq) return;
      log('Couldn\'t read the payment details:', e.message);
      state = { ...state, loading: false, error: e.message };
    }
    render();
  }

  /* ---------------- On the page ---------------- */
  // Lucide "credit-card"
  const CARD = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>';

  const style = document.createElement('style');
  style.id = 'oolio-payments-style';
  style.textContent = `
    .opb { display: inline-flex; align-items: center; gap: 4px; flex: none; vertical-align: middle; white-space: nowrap;
      font: 600 12px/18px Inter, system-ui, -apple-system, "Segoe UI", sans-serif; cursor: default; }
    .opb-pill { display: inline-flex; align-items: center; gap: 5px; padding: 2px 9px; border: 1px solid; border-radius: 999px; }
    .opb-pill svg { flex: none; }
    .opb-adyen { border-color: #0ABF53; background: #E6F8EE; color: #06612A; }
    .opb-wpay { border-color: #1E6FD9; background: #E8F1FC; color: #0E4A99; }
    .opb-other { border-color: #B0BCC9; background: #F5F8FA; color: #33475B; }
    .opb-pill.guessed { border-style: dashed; }
    /* Help Desk: next to the ticket title (and the Unlinked contacts chip, if that's there) */
    .opb.header { margin: 0 8px; }
    /* Record pages: a line of its own under the record's name */
    .opb-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 8px; }
    /* Company cards: a "Payments:" line under the card's other details (HubSpot clips anything next to the name) */
    .opb-line { display: flex; align-items: center; gap: 6px; margin-top: 2px; list-style: none;
      color: inherit; font-family: inherit; font-size: inherit; line-height: inherit; }
    .opb-line .opb { font-size: 11px; line-height: 16px; }
    .opb-line .opb-pill { padding: 0 7px; }`;

  // One company's badge: one pill, or two (Adyen and WPay) when it has both
  function badgeHTML(id, withName) {
    const c = cache.get(id);
    const pay = c && c.pay;
    if (!pay) return '';
    const kinds = pay.other ? ['other'] : [pay.adyen && 'adyen', pay.wpay && 'wpay'].filter(Boolean);
    const text = (k) => (k === 'other' ? pay.label : kinds.length > 1 ? (k === 'adyen' ? 'Adyen' : 'WPay') : pay.label);
    const name = withName ? `${esc(c.name)}: ` : '';
    return kinds.map((k, i) => `<span class="opb-pill opb-${k}${pay.guessed ? ' guessed' : ''}">${i ? '' : CARD}${i ? '' : name}${esc(text(k))}</span>`).join('');
  }
  const tipFor = (id) => {
    const c = cache.get(id);
    return c && c.pay ? `${c.name}\n${c.pay.why.join('\n')}` : '';
  };

  // Put a badge element in place, only touching the page when something changed
  function fill(el, html, tip) {
    if (el.dataset.html !== html) { setHTML(el, html); el.dataset.html = html; }
    if (el.title !== tip) el.title = tip;
  }

  // The badge at the top: next to the Help Desk title, or under the record's name
  let top = null;
  function placeTop(html, tip) {
    if (!top) top = document.createElement('span');
    const head = document.querySelector(HEADER_CONTACT);
    const titleRow = head && head.parentElement && head.parentElement.parentElement;
    const recordTitle = document.querySelector(RECORD_TITLE);
    const props = recordTitle && document.querySelector(RECORD_PROPS);
    let cls;
    if (titleRow && titleRow.parentElement) {
      cls = 'opb header';
      // Anywhere after the title in the same row is fine, so the Unlinked contacts chip can sit first
      if (top.parentElement !== titleRow.parentElement) titleRow.insertAdjacentElement('afterend', top);
    } else if (props && props.parentElement) {
      cls = 'opb opb-row';
      if (top.nextElementSibling !== props) props.insertAdjacentElement('beforebegin', top);
    } else {
      top.remove();
      return;
    }
    if (top.className !== cls) top.className = cls;
    fill(top, html, tip);
  }

  function render() {
    const p = isEnabled() ? getPage() : null;
    const live = p && state && state.key === `${p.type}/${p.portal}/${p.id}` && !state.loading && !state.error;
    const ids = live ? state.companies : [];

    // Top: the company itself, or the ticket's primary company (named, when the ticket has more than one)
    const first = ids.find((id) => cache.get(id) && cache.get(id).pay);
    if (first) placeTop(badgeHTML(first, p.type === 'ticket' && ids.length > 1), tipFor(first));
    else top?.remove();

    // Company cards in the sidebar (tickets, and other companies' cards on a company page)
    document.querySelectorAll(COMPANY_TITLE).forEach((title) => {
      const card = title.closest('[data-test-id^="chicklet-"]');
      const id = card && (card.getAttribute('data-test-id').match(/^chicklet-(\d+)$/) || [])[1];
      let line = card && card.querySelector('.opb-line');
      const html = isEnabled() && id ? badgeHTML(id, false) : '';
      if (!html) { line?.remove(); return; }
      if (!line) {
        // The card's list of details ("Company owner:" and so on); the card itself if it has none
        const list = card.querySelector('[data-test-id^="formatted-property-"]')?.closest('ul');
        line = document.createElement(list ? 'li' : 'div');
        line.className = 'opb-line';
        setHTML(line, 'Payments:<span class="opb"></span>');
        (list || card).appendChild(line);
      }
      fill(line.querySelector('.opb'), html, tipFor(id));
    });
  }

  // Company cards for companies the check didn't cover (e.g. "Associated companies" on a company page)
  let cardsAsked = 0;
  async function readCards() {
    const p = getPage();
    if (!p || Date.now() - cardsAsked < 3000) return;
    const ids = [...document.querySelectorAll(COMPANY_TITLE)]
      .map((t) => { const card = t.closest('[data-test-id^="chicklet-"]'); return card && (card.getAttribute('data-test-id').match(/^chicklet-(\d+)$/) || [])[1]; })
      .filter((id) => id && !cache.has(id));
    if (!ids.length) return;
    cardsAsked = Date.now();
    try {
      const read = await readCompanies(p, [...new Set(ids)]);
      ids.forEach((id) => { const v = read.get(id) || {}; cache.set(id, { at: Date.now(), name: clean(v.name) || `Company ${id}`, pay: classify(v) }); });
      render();
    } catch (e) { log('Couldn\'t read the company cards:', e.message); }
  }

  /* ---------------- Keeping up with the page ---------------- */
  // HubSpot changes record without reloading and redraws its cards, so look once a second
  function sync() {
    if (!document.getElementById(style.id)) document.head.appendChild(style);
    const p = isEnabled() ? getPage() : null;
    if (!p) {
      if (state) { state = null; seq++; }
      render();
      return;
    }
    const key = `${p.type}/${p.portal}/${p.id}`;
    if (!state || state.key !== key) { check(p); return; }
    if (!state.loading) readCards();
    render();
  }
  setInterval(sync, 1000);
  sync();

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand(isEnabled() ? 'Turn payments badge off' : 'Turn payments badge on', () => {
      gmSet('enabled', !isEnabled());
      location.reload();
    });
    GM_registerMenuCommand('Read payments again', () => { cache.clear(); const p = getPage(); if (p) check(p); });
  }
})();
