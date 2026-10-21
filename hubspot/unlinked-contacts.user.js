// ==UserScript==
// @name         HubSpot: Unlinked contacts
// @namespace    oolio-userscripts
// @version      1.1.0
// @description  On Help Desk tickets, marks contacts who aren't linked to the ticket's company and links them in one click, with Undo.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/unlinked-contacts.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/unlinked-contacts.user.js
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
    document.documentElement.setAttribute('data-installed-unlinked-contacts', v || 'yes');
    document.dispatchEvent(new Event('zoo:installed'));
    return;
  }

  // A second copy (installed twice) stays out of the way
  if (window.__oolioUnlinkedContacts) return;
  window.__oolioUnlinkedContacts = true;

  /* ---------------- Things you might want to change ---------------- */

  const UNDO_MS = 8000; // how long Undo stays next to a contact you've just linked
  const RECHECK_MS = 5000; // at most one fresh look at HubSpot this often, when the Contacts card changes

  // HubSpot's own markers (checked on Help Desk, October 2026)
  const HEADER_CONTACT = '[data-test-id="ticket-header-contact-detail-link"]'; // the contact's name in the ticket title
  const CHICKLET = '[data-test-id^="chicklet-"]'; // a contact or company card in the sidebar, "chicklet-<id>"

  const gmGet = (k, d) => (typeof GM_getValue === 'function' ? GM_getValue(k, d) : d);
  const gmSet = (k, v) => { if (typeof GM_setValue === 'function') GM_setValue(k, v); };
  const isEnabled = () => gmGet('enabled', true);

  // Search the browser console for "Oolio unlinked contacts" to see why something didn't work
  const log = (...a) => console.info('[Oolio unlinked contacts]', ...a);

  // ---------- Helpers ----------
  const clean = (s) => (s || '').replace(/[​-‍⁠﻿]/g, '').replace(/\s+/g, ' ').trim();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  // HubSpot may require Trusted Types for innerHTML
  let ttPolicy = null;
  try {
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      ttPolicy = window.trustedTypes.createPolicy('oolio-unlinked-contacts', { createHTML: (s) => s });
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
  const recordUrl = (portal, type, id) => `${location.origin}/contacts/${portal}/record/${type}/${id}`;

  /* ---------------- HubSpot, with your login ---------------- */
  // The same calls HubSpot's own pages make. Reads happen when a ticket opens; nothing is changed
  // until you click Link.

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
  async function ticketCompanies(t) {
    const d = await hubspot(`crm/v4/objects/0-5/${t.id}/associations/0-2?limit=100`, t.portal);
    const rows = (d && d.results) || [];
    const isPrimary = (r) => (r.associationTypes || []).some((x) => x.label === 'Primary' || (x.category === 'HUBSPOT_DEFINED' && x.typeId === 26));
    return [...rows.filter(isPrimary), ...rows.filter((r) => !isPrimary(r))]
      .map((r) => String(r.toObjectId)).filter((id, i, a) => a.indexOf(id) === i);
  }
  async function ticketContacts(t) {
    const d = await hubspot(`crm/v4/objects/0-5/${t.id}/associations/0-1?limit=100`, t.portal);
    return [...new Set(((d && d.results) || []).map((r) => String(r.toObjectId)))];
  }
  // contact ID -> [company IDs]. Contacts with no company come back missing (HubSpot answers 207).
  async function companiesOfContacts(t, ids) {
    const out = new Map(ids.map((id) => [id, []]));
    if (!ids.length) return out;
    const d = await hubspot('crm/v4/associations/0-1/0-2/batch/read', t.portal, { method: 'POST', body: { inputs: ids.map((id) => ({ id })) } });
    ((d && d.results) || []).forEach((r) => {
      const from = String(r.from && r.from.id);
      if (out.has(from)) out.set(from, (r.to || []).map((x) => String(x.toObjectId)));
    });
    return out;
  }
  // id -> properties (plain values) for up to 100 records
  async function readRecords(t, objectTypeId, ids, properties) {
    const out = new Map();
    if (!ids.length) return out;
    const d = await hubspot('crm-search/search?clienttimeout=14000', t.portal, {
      method: 'POST',
      body: {
        objectTypeId, count: 100, offset: 0, query: '',
        filterGroups: [{ filters: [{ property: 'hs_object_id', operator: 'IN', values: ids.slice(0, 100) }] }],
        sorts: [], requestOptions: { properties },
      },
    });
    ((d && d.results) || []).forEach((r) => {
      const p = {};
      Object.entries(r.properties || {}).forEach(([k, v]) => { p[k] = v && typeof v === 'object' ? v.value : v; });
      out.set(String(r.objectId || p.hs_object_id), p);
    });
    return out;
  }

  // A plain link with no label. A contact with no company at all also gets it as their primary company,
  // the same as HubSpot does when you add a first company to a contact.
  async function linkContact(t, contactId, companyId, makePrimary) {
    await hubspot(`crm/v4/objects/0-1/${contactId}/associations/default/0-2/${companyId}`, t.portal, { method: 'PUT' });
    if (makePrimary) {
      try {
        await hubspot(`crm/v4/objects/0-1/${contactId}/associations/0-2/${companyId}`, t.portal,
          { method: 'PUT', body: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }] });
      } catch (e) { log('Linked, but couldn\'t make it the primary company:', e.message); }
    }
  }
  // Undo: they weren't linked before, so removing every link between the two puts it back as it was
  const unlinkContact = (t, contactId, companyId) =>
    hubspot(`crm/v4/objects/0-1/${contactId}/associations/0-2/${companyId}`, t.portal, { method: 'DELETE' });

  /* ---------------- The check ---------------- */
  // A contact is fine if they're linked to one of the ticket's companies, or to its parent (a head office).
  // state: { key, ticket, loading, error, companies: [{id, name, primary}], contacts: Map(id -> contact) }
  let state = null;
  let seq = 0;

  async function check(t, quiet) {
    const my = ++seq;
    const key = `${t.portal}/${t.id}`;
    if (!quiet || !state || state.key !== key) state = { key, ticket: t, loading: true, companies: [], contacts: new Map(), checkedAt: Date.now() };
    render();
    try {
      const [companyIds, contactIds] = await Promise.all([ticketCompanies(t), ticketContacts(t)]);
      const theirs = await companiesOfContacts(t, contactIds);
      const allCompanyIds = [...new Set([...companyIds, ...[...theirs.values()].flat()])];
      const [companies, people] = await Promise.all([
        readRecords(t, '0-2', allCompanyIds, ['name', 'hs_parent_company_id']),
        readRecords(t, '0-1', contactIds, ['firstname', 'lastname', 'email']),
      ]);
      if (my !== seq) return;
      const okIds = new Set(companyIds);
      companyIds.forEach((id) => { const p = companies.get(id) && companies.get(id).hs_parent_company_id; if (p) okIds.add(String(p)); });
      const nameOf = (id) => clean(companies.get(id) && companies.get(id).name) || `Company ${id}`;

      const contacts = new Map();
      contactIds.forEach((id) => {
        const p = people.get(id) || {};
        const linked = theirs.get(id) || [];
        const prev = state.contacts.get(id);
        contacts.set(id, {
          id,
          name: clean(`${p.firstname || ''} ${p.lastname || ''}`) || clean(p.email) || `Contact ${id}`,
          email: clean(p.email),
          companies: linked,
          others: linked.filter((c) => !okIds.has(c)).map(nameOf),
          ok: linked.some((c) => okIds.has(c)),
          // Keep "Linked" and its Undo showing across a fresh look
          justLinked: prev && prev.justLinked,
        });
      });
      state = {
        key, ticket: t, loading: false, checkedAt: Date.now(), contacts,
        companies: companyIds.map((id, i) => ({ id, name: nameOf(id), primary: i === 0 })),
      };
      const bad = [...contacts.values()].filter((c) => !c.ok);
      log(`Ticket ${t.id}: ${plural(contacts.size, 'contact', 'contacts')}, ${plural(companyIds.length, 'company', 'companies')}, ` +
        `${bad.length} not linked`, bad.map((c) => c.name));
    } catch (e) {
      if (my !== seq) return;
      log('Couldn\'t check the contacts:', e.message);
      state = { ...state, loading: false, error: e.message };
    }
    render();
  }

  async function doLink(contactId, companyId) {
    const s = state;
    const c = s && s.contacts.get(contactId);
    const co = s && s.companies.find((x) => x.id === companyId);
    if (!c || !co || c.busy) return;
    c.busy = true;
    c.error = '';
    render();
    try {
      await linkContact(s.ticket, contactId, companyId, c.companies.length === 0);
      log(`Linked ${c.name} to ${co.name}`);
      c.ok = true;
      c.companies = [...c.companies, companyId];
      c.justLinked = { companyId, name: co.name, until: Date.now() + UNDO_MS };
      setTimeout(render, UNDO_MS + 50);
    } catch (e) {
      log(`Couldn't link ${c.name} to ${co.name}:`, e.message);
      c.error = 'HubSpot didn\'t link them. Try again, or use the contact\'s record.';
    }
    c.busy = false;
    render();
  }
  async function doUndo(contactId) {
    const s = state;
    const c = s && s.contacts.get(contactId);
    if (!c || !c.justLinked || c.busy) return;
    const { companyId, name } = c.justLinked;
    c.busy = true;
    render();
    try {
      await unlinkContact(s.ticket, contactId, companyId);
      log(`Undid: ${c.name} is no longer linked to ${name}`);
      c.companies = c.companies.filter((x) => x !== companyId);
      c.ok = false;
      c.justLinked = null;
    } catch (e) {
      log('Undo failed:', e.message);
      c.error = 'Undo didn\'t work. Remove the company on the contact\'s record.';
    }
    c.busy = false;
    render();
  }

  /* ---------------- On the page ---------------- */
  // Lucide "circle-alert", "link", "check" and "x"
  const lucide = (paths, size = 14) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const ALERT = '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>';
  const LINK = '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>';
  const CHECK = '<path d="M20 6 9 17l-5-5"/>';
  const X = '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>';

  // Styles for the bits placed inside HubSpot's page (the list itself sits in its own shadow box)
  const style = document.createElement('style');
  style.id = 'oolio-unlinked-style';
  style.textContent = `
    .oul-chip { display: inline-flex; align-items: center; gap: 5px; flex: none; margin: 0 8px; padding: 3px 10px;
      border: 1px solid #E8A33D; border-radius: 999px; background: #FFF4E0; color: #7A4B00; cursor: pointer;
      font: 600 12px/18px Inter, system-ui, -apple-system, "Segoe UI", sans-serif; white-space: nowrap; }
    .oul-chip:hover { background: #FFE9C2; }
    .oul-chip.ok { border-color: #2E7D32; background: #E8F5E9; color: #1B5E20; }
    .oul-chip svg { flex: none; }
    .oul-chip.floating { position: fixed; top: 64px; left: 50%; transform: translateX(-50%); z-index: 2147483646; margin: 0;
      box-shadow: 0 4px 14px rgba(34,34,34,.18); }
    /* A row at the foot of HubSpot's contact card, in the card's own font, under a thin divider */
    .oul-badge { display: flex; align-items: center; gap: 8px; margin-top: 10px; padding-top: 10px;
      border-top: 1px solid #EAF0F6; color: #33475B; font-family: inherit; font-size: 13px; line-height: 18px; }
    .oul-badge .oul-text { flex: 1; min-width: 0; display: flex; align-items: flex-start; gap: 6px; }
    .oul-badge .oul-text svg { flex: none; margin-top: 2px; color: #C77700; }
    .oul-badge.ok .oul-text svg { color: #2E7D32; }
    .oul-badge b { font-weight: 600; }
    .oul-badge button { flex: none; display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px;
      border: 1px solid #673AB6; border-radius: 999px; background: #fff; color: #673AB6; cursor: pointer;
      font: inherit; font-size: 12px; font-weight: 600; line-height: 16px; }
    .oul-badge button:hover { background: #F3EEF9; }
    .oul-badge button.plain { border-color: transparent; background: none; padding: 3px 2px; text-decoration: underline; }
    .oul-badge button:disabled { opacity: .6; cursor: default; }
    /* A soft amber edge down the card's left side */
    .oul-chicklet { box-shadow: inset 3px 0 0 #E8A33D !important; }`;

  // The list of contacts, under the chip
  const host = document.createElement('div');
  host.id = 'oolio-unlinked-contacts';
  const shadow = host.attachShadow({ mode: 'open' });
  setHTML(shadow, `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; }
      [hidden] { display: none !important; }
      .wrap { position: fixed; z-index: 2147483647; width: 400px; max-width: calc(100vw - 24px); background: #fff;
        border-radius: 12px; box-shadow: 0 12px 40px rgba(34,34,34,.28); overflow: hidden; }
      .head { display: flex; align-items: center; gap: 10px; padding: 12px 10px 12px 16px; color: #fff;
        background: linear-gradient(-135deg, #673AB6, #5E35B1); }
      .titles { flex: 1; min-width: 0; }
      .title { font-weight: 700; font-size: 14px; }
      .sub { font-size: 12px; opacity: .85; margin-top: 1px; }
      .x { flex: none; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; padding: 0;
        border: 0; border-radius: 999px; background: transparent; color: #fff; cursor: pointer; }
      .x:hover { background: rgba(255,255,255,.2); }
      .list { max-height: 360px; overflow: auto; padding: 6px 0; }
      .row { padding: 10px 16px; border-bottom: 1px solid #F0F0F0; font-size: 13px; color: #222; }
      .row:last-child { border-bottom: 0; }
      .name { font-weight: 700; color: #673AB6; text-decoration: none; }
      .name:hover { text-decoration: underline; }
      .meta { color: #6F6F6F; font-size: 12px; margin-top: 2px; }
      .btns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
      button.link { display: inline-flex; align-items: center; gap: 5px; max-width: 100%; padding: 5px 11px; border: 0;
        border-radius: 999px; background: #673AB6; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
      button.link:hover { background: #5E35B1; }
      button.link span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      button.link.other { background: #F3EEF9; color: #673AB6; }
      button.link.other:hover { background: #E6DCF4; }
      button:disabled { opacity: .6; cursor: default; }
      .done { display: flex; align-items: center; gap: 6px; margin-top: 6px; color: #1B5E20; font-size: 12px; font-weight: 600; }
      .undo { border: 0; padding: 0; background: none; color: #673AB6; font-size: 12px; font-weight: 600; text-decoration: underline; cursor: pointer; }
      .err { margin-top: 6px; color: #B3261E; font-size: 12px; }
      .foot { border-top: 1px solid #eee; padding: 10px 16px; font-size: 12px; color: #6F6F6F; }
    </style>
    <div class="wrap" hidden role="dialog" aria-label="Contacts not linked to the company">
      <div class="head">
        ${lucide(LINK, 18)}
        <div class="titles"><div class="title"></div><div class="sub"></div></div>
        <button class="x" type="button" title="Close (Esc)" aria-label="Close">${lucide(X, 18)}</button>
      </div>
      <div class="list"></div>
      <div class="foot">Linking adds the company to the contact. HubSpot's cards show it after a refresh.</div>
    </div>`);
  const wrap = shadow.querySelector('.wrap');
  let listOpen = false;
  let chip = null;

  const unlinked = () => (state && !state.loading ? [...state.contacts.values()].filter((c) => !c.ok || (c.justLinked && c.justLinked.until > Date.now())) : []);

  function openList() {
    listOpen = true;
    render();
  }
  function closeList() {
    listOpen = false;
    wrap.hidden = true;
  }
  shadow.querySelector('.x').addEventListener('click', closeList);
  document.addEventListener('keydown', (e) => { if (listOpen && e.key === 'Escape') closeList(); }, true);
  document.addEventListener('mousedown', (e) => {
    if (listOpen && !e.composedPath().includes(host) && !(chip && chip.contains(e.target))) closeList();
  }, true);
  shadow.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b || b.disabled) return;
    if (b.dataset.act === 'link') doLink(b.dataset.contact, b.dataset.company);
    if (b.dataset.act === 'undo') doUndo(b.dataset.contact);
  });

  function rowHTML(c) {
    const t = state.ticket;
    const meta = [c.email, c.justLinked && c.ok ? '' : c.others.length ? `Linked to ${c.others.join(', ')}` : 'Not linked to any company'].filter(Boolean);
    let actions;
    if (c.justLinked && c.ok) {
      actions = `<div class="done">${lucide(CHECK)} Linked to ${esc(c.justLinked.name)}
        <button class="undo" type="button" data-act="undo" data-contact="${c.id}" ${c.busy ? 'disabled' : ''}>Undo</button></div>`;
    } else {
      actions = `<div class="btns">${state.companies.map((co) => `
        <button class="link${co.primary ? '' : ' other'}" type="button" data-act="link" data-contact="${c.id}" data-company="${co.id}"
          title="Link ${esc(c.name)} to ${esc(co.name)}" ${c.busy ? 'disabled' : ''}>${lucide(LINK, 13)}<span>${c.busy ? 'Linking…' : 'Link to ' + esc(co.name)}</span></button>`).join('')}</div>`;
    }
    return `<div class="row">
      <a class="name" href="${recordUrl(t.portal, '0-1', c.id)}" target="_blank" rel="noopener">${esc(c.name)}</a>
      <div class="meta">${esc(meta.join(' · '))}</div>
      ${actions}${c.error ? `<div class="err">${esc(c.error)}</div>` : ''}</div>`;
  }

  function renderList() {
    const rows = unlinked();
    if (!listOpen || !rows.length || !chip) { wrap.hidden = true; if (listOpen && state && !state.loading && !rows.length) listOpen = false; return; }
    const left = rows.filter((c) => !c.ok).length;
    shadow.querySelector('.title').textContent = left ? `${plural(left, 'contact isn\'t', 'contacts aren\'t')} linked to the company` : 'All linked';
    shadow.querySelector('.sub').textContent = `This ticket: ${state.companies.map((c) => c.name).join(', ')}`;
    setHTML(shadow.querySelector('.list'), rows.map(rowHTML).join(''));
    wrap.hidden = false;
    // Under the chip, kept on screen
    const r = chip.getBoundingClientRect();
    const w = wrap.offsetWidth;
    wrap.style.top = `${Math.round(r.bottom + 8)}px`;
    wrap.style.left = `${Math.round(Math.max(12, Math.min(r.left, window.innerWidth - w - 12)))}px`;
  }

  // The chip goes next to the ticket's title; on pages without that title it floats at the top
  function placeChip() {
    if (!chip) {
      chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'oul-chip';
      chip.addEventListener('click', () => (listOpen ? closeList() : openList()));
    }
    const head = document.querySelector(HEADER_CONTACT);
    const titleRow = head && head.parentElement && head.parentElement.parentElement;
    if (titleRow && titleRow.parentElement) {
      chip.classList.remove('floating');
      if (chip.previousElementSibling !== titleRow) titleRow.insertAdjacentElement('afterend', chip);
    } else {
      chip.classList.add('floating');
      if (chip.parentElement !== document.body) document.body.appendChild(chip);
    }
  }

  // The contact's card in HubSpot's Contacts card: an outline and a line saying what's wrong, with Link
  function decorateCards() {
    const rows = state && !state.loading && state.companies.length ? state.contacts : new Map();
    document.querySelectorAll('.oul-badge').forEach((b) => {
      const c = rows.get(b.dataset.contact);
      if (!c || !b.isConnected || (c.ok && !(c.justLinked && c.justLinked.until > Date.now()))) {
        b.closest('.oul-chicklet')?.classList.remove('oul-chicklet');
        b.remove();
      }
    });
    rows.forEach((c) => {
      const showing = !c.ok || (c.justLinked && c.justLinked.until > Date.now());
      if (!showing) return;
      document.querySelectorAll(`[data-test-id="chicklet-${c.id}"]`).forEach((card) => {
        if (!card.querySelector('[data-test-id="contact-chicklet-title"]')) return; // a company card with the same ID shape
        let b = card.querySelector('.oul-badge');
        if (!b) {
          b = document.createElement('div');
          b.className = 'oul-badge';
          b.dataset.contact = c.id;
          b.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            if (btn.dataset.act === 'link') doLink(c.id, btn.dataset.company);
            else if (btn.dataset.act === 'undo') doUndo(c.id);
            else openList();
          });
          card.appendChild(b);
        }
        card.classList.toggle('oul-chicklet', !c.ok);
        const first = state.companies[0];
        let html;
        if (c.ok && c.justLinked) {
          html = `<span class="oul-text">${lucide(CHECK)}<span>Linked to <b>${esc(c.justLinked.name)}</b></span></span>
            <button class="plain" type="button" data-act="undo" ${c.busy ? 'disabled' : ''}>Undo</button>`;
        } else if (state.companies.length === 1) {
          html = `<span class="oul-text">${lucide(ALERT)}<span>Not linked to <b>${esc(first.name)}</b></span></span>
            <button type="button" data-act="link" data-company="${first.id}" title="Link ${esc(c.name)} to ${esc(first.name)}" ${c.busy ? 'disabled' : ''}>${lucide(LINK, 12)}${c.busy ? 'Linking…' : 'Link'}</button>`;
        } else {
          html = `<span class="oul-text">${lucide(ALERT)}<span>Not linked to the ticket's ${state.companies.length} companies</span></span>
            <button type="button" data-act="choose">${lucide(LINK, 12)}Link…</button>`;
        }
        if (b.dataset.html !== html) { setHTML(b, html); b.dataset.html = html; }
        b.classList.toggle('ok', !!c.ok);
      });
    });
  }

  function render() {
    const rows = unlinked();
    const left = rows.filter((c) => !c.ok).length;
    const show = isEnabled() && state && state.key === (getTicket() ? `${getTicket().portal}/${getTicket().id}` : '') &&
      !state.loading && !state.error && state.companies.length && rows.length;
    if (!show) {
      chip?.remove();
      wrap.hidden = true;
    } else {
      placeChip();
      const html = left
        ? `${lucide(ALERT)}${plural(left, 'contact', 'contacts')} not linked to the company`
        : `${lucide(CHECK)}All contacts linked`;
      if (chip.dataset.html !== html) { setHTML(chip, html); chip.dataset.html = html; }
      chip.classList.toggle('ok', !left);
      chip.title = left ? 'Click to see who, and link them' : 'Undo is in the list for a few seconds';
    }
    decorateCards();
    renderList();
  }

  /* ---------------- Keeping up with the page ---------------- */
  // Help Desk changes ticket without reloading, and HubSpot redraws its cards, so look once a second
  function sync() {
    if (!document.getElementById(style.id)) document.head.appendChild(style);
    if (!host.isConnected) document.body.appendChild(host);
    const t = isEnabled() ? getTicket() : null;
    const key = t ? `${t.portal}/${t.id}` : '';
    if (!t) {
      if (state) { state = null; seq++; closeList(); render(); }
      return;
    }
    if (!state || state.key !== key) { closeList(); check(t); return; }
    // A contact added to the ticket (or a card showing one we haven't checked): look again
    if (!state.loading && Date.now() - state.checkedAt > RECHECK_MS) {
      const card = [...document.querySelectorAll(`${CHICKLET} [data-test-id="contact-chicklet-title"]`)]
        .map((el) => (el.closest(CHICKLET).getAttribute('data-test-id').match(/chicklet-(\d+)/) || [])[1]).filter(Boolean);
      if (card.some((id) => !state.contacts.has(id))) { check(t, true); return; }
    }
    render();
  }
  setInterval(sync, 1000);
  window.addEventListener('resize', () => listOpen && renderList());
  sync();

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand(isEnabled() ? 'Turn unlinked contacts off' : 'Turn unlinked contacts on', () => {
      gmSet('enabled', !isEnabled());
      location.reload();
    });
    GM_registerMenuCommand('Check this ticket again', () => { const t = getTicket(); if (t) check(t); });
  }
})();
