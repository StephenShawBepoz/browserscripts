// ==UserScript==
// @name         HubSpot: Payments badge
// @namespace    oolio-userscripts
// @version      1.2.0
// @description  Shows whether a company pays through Adyen or WPay, plus its OPAY details (merchant IDs, last 7 days sales, MOTO terminal serials), on company, contact, deal and ticket records and Help Desk.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/payments-badge.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/payments-badge.user.js
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
    document.documentElement.setAttribute('data-installed-payments-badge', v || 'yes');
    document.dispatchEvent(new Event('zoo:installed'));
    return;
  }

  // A second copy (installed twice) stays out of the way
  if (window.__oolioPaymentsBadge) return;
  window.__oolioPaymentsBadge = true;

  /* ---------------- Things you might want to change ---------------- */

  const FRESH_MS = 60000; // a company's payment details are read again after this long

  // The company fields the badge reads. "Acquirer - POS" decides; the merchant IDs fill in when it's blank.
  // The rest are for the OPAY details.
  const PROPS = ['name', 'acquirer', 'adyen_merchant_id___pos', 'balance___merchant_id___pos', 'adyen_account_holder_id', 'wpay___merchant_id___pos',
    'sales_last_7_days', 'pos_sales_last_7_days', 'last_sales_date'];
  // Merchant IDs (the "store ID"), in the order the OPAY details list them: Advanced / Manage / WPay Merchant ID - POS, Adyen Account Holder Id
  const MIDS = [
    ['balance___merchant_id___pos', 'Advanced MID'],
    ['adyen_merchant_id___pos', 'Manage MID'],
    ['wpay___merchant_id___pos', 'WPay MID'],
    ['adyen_account_holder_id', 'Account holder'],
  ];
  // The MOTO fields on the company's OPAY ticket (KYC / Onboarding); the newest ticket with any of them wins
  const MOTO_COUNT = 'opay__number_of_moto_terminals';
  const MOTO_SERIALS = [1, 2, 3, 4, 5].map((n) => [`opay__moto_terminal_${n}_serial`, `Terminal ${n}`])
    .concat([['opay__moto_terminal_other_serials', 'Other serial(s)']]);
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

  // Record types the badge works on: HubSpot's type ID, and the "primary company" link type from it
  const TYPES = {
    ticket: { typeId: '0-5', path: 'ticket', primary: 26 },
    company: { typeId: '0-2', path: 'company' },
    contact: { typeId: '0-1', path: 'contact', primary: 1 },
    deal: { typeId: '0-3', path: 'deal', primary: 5 },
  };

  // The record on screen: a company, contact, deal or ticket (Help Desk or its record page)
  function getPage() {
    const m = location.pathname.match(/^\/help-desk\/(\d+)\/(?:.*\/)?ticket\/(\d+)/);
    if (m) return { portal: m[1], type: 'ticket', id: m[2], helpDesk: true };
    for (const [type, t] of Object.entries(TYPES)) {
      const r = location.pathname.match(new RegExp(`^/contacts/(\\d+)/(?:record/${t.typeId}|${t.path})/(\\d+)`));
      if (r) return { portal: r[1], type, id: r[2] };
    }
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

  // Company IDs linked to the ticket, contact or deal, primary first
  async function linkedCompanies(p) {
    const t = TYPES[p.type];
    const d = await hubspot(`crm/v4/objects/${t.typeId}/${p.id}/associations/0-2?limit=100`, p.portal);
    const rows = (d && d.results) || [];
    const isPrimary = (r) => (r.associationTypes || []).some((x) => x.label === 'Primary' || (x.category === 'HUBSPOT_DEFINED' && x.typeId === t.primary));
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
  // The newest ticket on the company that has any MOTO field filled in: { id, subject, count, serials: [[label, serial]] } or null
  async function readMoto(p, companyId) {
    const fields = [MOTO_COUNT, ...MOTO_SERIALS.map(([k]) => k)];
    const d = await hubspot('crm-search/search?clienttimeout=14000', p.portal, {
      method: 'POST',
      body: {
        objectTypeId: '0-5', count: 1, offset: 0, query: '',
        filterGroups: fields.map((f) => ({ filters: [
          { property: 'associations.company', operator: 'EQ', value: companyId },
          { property: f, operator: 'HAS_PROPERTY' },
        ] })),
        sorts: [{ property: 'createdate', order: 'DESC' }],
        requestOptions: { properties: ['subject', ...fields] },
      },
    });
    const r = d && d.results && d.results[0];
    if (!r) return null;
    const v = {};
    Object.entries(r.properties || {}).forEach(([k, x]) => { v[k] = clean(x && typeof x === 'object' ? x.value : x); });
    return {
      id: String(r.objectId), subject: v.subject, count: v[MOTO_COUNT],
      serials: MOTO_SERIALS.map(([k, label]) => [label, v[k]]).filter(([, s]) => s),
    };
  }

  /* ---------------- What the company pays through ---------------- */
  // { adyen, wpay, label, why } or null when there's nothing to go on
  function classify(v) {
    const acq = clean(v.acquirer);
    const adyenId = clean(v.adyen_merchant_id___pos) || clean(v.balance___merchant_id___pos) || clean(v.adyen_account_holder_id);
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

  // companyId -> { at, name, pay, opay, moto } so moving between tickets of the same venue doesn't ask again
  // (moto is undefined until it's been read, null when there's no ticket with MOTO details)
  const cache = new Map();
  const remember = (id, v) => cache.set(id, { at: Date.now(), name: clean(v.name) || `Company ${id}`, pay: classify(v), opay: opayFrom(v) });

  // The OPAY details kept from the company: { mids: [[label, id]], pay7, pos7, lastSale } or null when there are none
  function opayFrom(v) {
    const mids = MIDS.map(([k, label]) => [label, clean(v[k])]).filter(([, id]) => id);
    const num = (x) => (clean(x) === '' || isNaN(Number(x)) ? null : Number(x));
    const o = { mids, pay7: num(v.sales_last_7_days), pos7: num(v.pos_sales_last_7_days), lastSale: clean(v.last_sales_date) };
    return mids.length || o.pay7 !== null || o.pos7 !== null ? o : null;
  }
  // state: { key, page, loading, error, companies: [companyId] (primary first) }
  let state = null;
  let seq = 0;

  async function check(p) {
    const my = ++seq;
    const key = `${p.type}/${p.portal}/${p.id}`;
    state = { key, page: p, loading: true, companies: [] };
    render(); // the last record's badge goes straight away
    try {
      const ids = p.type === 'company' ? [p.id] : await linkedCompanies(p);
      const stale = ids.filter((id) => !cache.has(id) || Date.now() - cache.get(id).at > FRESH_MS);
      const read = await readCompanies(p, stale);
      stale.forEach((id) => remember(id, read.get(id) || {}));
      // MOTO serials for the company at the top (they're on a ticket, so it's one more ask)
      const topId = topCompany(ids);
      if (topId && cache.get(topId).moto === undefined) {
        cache.get(topId).moto = await readMoto(p, topId).catch((e) => { log('Couldn\'t read the MOTO ticket:', e.message); return null; });
      }
      if (my !== seq) return;
      state = { key, page: p, loading: false, companies: ids };
      log(`${p.type[0].toUpperCase() + p.type.slice(1)} ${p.id}:`,
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
    .opb-line .opb-pill { padding: 0 7px; }
    /* The OPAY details button and the box it opens */
    button.opb-pill.opb-opay { border-color: #673AB6; background: #F3EEFB; color: #45237F; font: inherit; cursor: pointer; }
    button.opb-pill.opb-opay:hover, button.opb-pill.opb-opay[aria-expanded="true"] { background: #E6DCF7; }
    .opb-box { position: fixed; z-index: 2147483000; width: 360px; max-height: 70vh; overflow: auto; box-sizing: border-box;
      padding: 12px 14px; border: 1px solid #CBD6E2; border-radius: 8px; background: #fff; color: #33475B;
      box-shadow: 0 8px 24px rgba(45, 62, 80, .2); font: 13px/1.45 Inter, system-ui, -apple-system, "Segoe UI", sans-serif; }
    .opb-box h4 { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #213343; }
    .opb-box h5 { margin: 10px 0 4px; font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: #516F90; }
    .opb-box dl { display: grid; grid-template-columns: auto 1fr auto; gap: 3px 8px; margin: 0; align-items: center; }
    .opb-box dt { color: #516F90; white-space: nowrap; }
    .opb-box dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
    .opb-box dd.wide { grid-column: 2 / 4; }
    .opb-box .none { color: #7C98B6; font-style: italic; }
    .opb-box a { color: #0091AE; }
    .opb-copy { border: 1px solid #CBD6E2; border-radius: 4px; background: #F5F8FA; color: #33475B; font: 11px/16px inherit; padding: 0 6px; cursor: pointer; }
    .opb-copy:hover { background: #EAF0F6; }`;

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
  // The OPAY button that follows the badge: "OPAY · 7 days $5,425 · 1 MOTO"
  const money = (n, dp = 0) => '$' + n.toLocaleString('en-AU', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  function opayHTML(id) {
    const c = cache.get(id);
    if (!c || (!c.opay && !c.moto)) return '';
    const o = c.opay || {};
    const bits = ['OPAY'];
    if (o.pay7 != null) bits.push(`7 days ${money(o.pay7)}`);
    if (c.moto) bits.push(`MOTO ${c.moto.count || c.moto.serials.filter(([l]) => l !== 'Other serial(s)').length}`);
    return `<button type="button" class="opb-pill opb-opay" data-opay="${esc(id)}" aria-expanded="false" title="OPAY details">${esc(bits.join(' · '))} ▾</button>`;
  }
  const copyBtn = (text) => `<button type="button" class="opb-copy" data-copy="${esc(text)}">Copy</button>`;
  function boxHTML(id, portal) {
    const c = cache.get(id);
    const o = c.opay || { mids: [] };
    const row = (label, value, copy) => `<dt>${esc(label)}</dt><dd${copy ? '' : ' class="wide"'}>${esc(value)}</dd>${copy ? copyBtn(value) : ''}`;
    const date = o.lastSale && !isNaN(Number(o.lastSale)) ? new Date(Number(o.lastSale)).toLocaleDateString('en-AU', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }) : o.lastSale;
    let h = `<h4>${esc(c.name)}</h4>`;
    h += '<h5>Store / merchant IDs</h5>';
    h += o.mids.length ? `<dl>${o.mids.map(([l, v]) => row(l, v, true)).join('')}</dl>` : '<div class="none">No merchant ID on the company</div>';
    h += '<h5>Sales, last 7 days</h5><dl>';
    h += row('Pay', o.pay7 != null ? money(o.pay7, 2) : '—');
    h += row('POS', o.pos7 != null ? money(o.pos7, 2) : '—');
    if (date) h += row('Last Pay sale', date);
    h += '</dl><h5>MOTO terminals</h5>';
    if (c.moto === undefined) h += '<div class="none">Not read yet</div>';
    else if (!c.moto) h += '<div class="none">No OPAY ticket with MOTO details</div>';
    else {
      h += '<dl>';
      h += row('Number', c.moto.count || '—');
      c.moto.serials.forEach(([l, s]) => { h += row(l, s, true); });
      h += '</dl>';
      h += `<div style="margin-top:6px">From <a href="/contacts/${esc(portal)}/record/0-5/${esc(c.moto.id)}" target="_blank" rel="noopener">${esc(c.moto.subject || 'ticket ' + c.moto.id)}</a></div>`;
    }
    return h;
  }

  // The box, opened from the OPAY button; one at a time, closed by clicking elsewhere, Escape, or a new record
  let box = null;
  function closeBox() {
    if (!box) return;
    box.remove();
    box = null;
    document.querySelectorAll('button.opb-opay[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }
  function openBox(btn) {
    const id = btn.dataset.opay;
    const p = getPage();
    if (box && box.dataset.id === id) { closeBox(); return; }
    closeBox();
    box = document.createElement('div');
    box.className = 'opb-box';
    box.dataset.id = id;
    setHTML(box, boxHTML(id, p ? p.portal : ''));
    document.body.appendChild(box);
    const r = btn.getBoundingClientRect();
    box.style.top = `${Math.min(r.bottom + 6, window.innerHeight - box.offsetHeight - 8)}px`;
    box.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - box.offsetWidth - 8))}px`;
    btn.setAttribute('aria-expanded', 'true');
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('button.opb-opay');
    if (btn) { e.preventDefault(); e.stopPropagation(); openBox(btn); return; }
    const copy = e.target.closest && e.target.closest('.opb-box .opb-copy');
    if (copy) {
      navigator.clipboard.writeText(copy.dataset.copy).then(() => {
        copy.textContent = 'Copied';
        setTimeout(() => { copy.textContent = 'Copy'; }, 1200);
      }).catch((err) => log('Couldn\'t copy:', err.message));
      return;
    }
    if (box && !box.contains(e.target)) closeBox();
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBox(); });

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

  // The company the top badge is about: the first (primary) one with anything to show
  const topCompany = (ids) => ids.find((id) => { const c = cache.get(id); return c && (c.pay || c.opay); });

  function render() {
    const p = isEnabled() ? getPage() : null;
    const live = p && state && state.key === `${p.type}/${p.portal}/${p.id}` && !state.loading && !state.error;
    const ids = live ? state.companies : [];

    // Top: the company itself, or the record's primary company (named, when there's more than one),
    // followed by its OPAY button
    const first = topCompany(ids);
    if (first) placeTop(badgeHTML(first, p.type !== 'company' && ids.length > 1) + opayHTML(first), tipFor(first));
    else top?.remove();
    if (box && box.dataset.id !== first) closeBox();

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
      ids.forEach((id) => remember(id, read.get(id) || {}));
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
