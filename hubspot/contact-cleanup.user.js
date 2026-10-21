// ==UserScript==
// @name         HubSpot: Contact clean-up
// @namespace    oolio-userscripts
// @version      0.1.0
// @description  A Clean up contacts button on company records. Finds contacts who are probably the same person across a customer and its venues, compares them side by side and merges them, one group at a time.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/contact-cleanup.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/contact-cleanup.user.js
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
  if (window.__oolioContactCleanup) return;
  window.__oolioContactCleanup = true;

  /* ---------------- Things you might want to change ---------------- */

  const MAX_CONTACTS = 5000; // stop reading after this many (Redcape, 53 companies, had 645 in October 2026)

  // Fields you can choose a value for when merging. Email isn't one: the kept contact keeps its own,
  // and HubSpot adds the other contact's email as an extra email.
  const PICK_FIELDS = [
    ['firstname', 'First name'],
    ['lastname', 'Last name'],
    ['jobtitle', 'Job title'],
    ['phone', 'Phone'],
    ['mobilephone', 'Mobile'],
  ];
  const CONTACT_PROPS = ['firstname', 'lastname', 'email', 'hs_additional_emails', 'phone', 'mobilephone', 'jobtitle',
    'createdate', 'notes_last_updated', 'hs_email_hard_bounce_reason_enum', 'associatedcompanyid',
    'hs_object_source_label', 'hs_object_source_detail_1'];

  // HubSpot's own markers on a company record (checked October 2026)
  const RECORD_TITLE = 'h2[data-test-id="highlight-record-label"]';
  const RECORD_PROPS = '[data-test-id="properties-list"]'; // the phone line under the name

  const gmGet = (k, d) => (typeof GM_getValue === 'function' ? GM_getValue(k, d) : d);
  const gmSet = (k, v) => { if (typeof GM_setValue === 'function') GM_setValue(k, v); };

  // Search the browser console for "Oolio contact clean-up" to see what it found and did
  const log = (...a) => console.info('[Oolio contact clean-up]', ...a);

  // ---------- Helpers ----------
  const clean = (s) => (s || '').replace(/[​-‍⁠﻿]/g, '').replace(/\s+/g, ' ').trim();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, one, many) => `${n.toLocaleString('en-AU')} ${n === 1 ? one : many}`;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const chunks = (a, n) => { const out = []; for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n)); return out; };
  const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const toMs = (v) => { if (!v) return 0; const n = /^\d+$/.test(v) ? +v : Date.parse(v); return isFinite(n) ? n : 0; };

  let ttPolicy = null;
  try {
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      ttPolicy = window.trustedTypes.createPolicy('oolio-contact-cleanup', { createHTML: (s) => s });
    }
  } catch (e) { log('Trusted Types policy blocked:', e.message); }
  const setHTML = (el, html) => { el.innerHTML = ttPolicy ? ttPolicy.createHTML(html) : html; };

  function getCompany() {
    const m = location.pathname.match(/^\/contacts\/(\d+)\/(?:record\/0-2|company)\/(\d+)/);
    return m ? { portal: m[1], id: m[2] } : null;
  }
  const recordUrl = (portal, type, id) => `${location.origin}/contacts/${portal}/record/${type}/${id}`;

  /* ---------------- HubSpot, with your login ---------------- */
  // The same calls HubSpot's own pages make. Opening the clean-up only reads; nothing changes
  // until you confirm a merge.

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
      err = new Error(`HubSpot replied ${res.status}${text ? ': ' + text.slice(0, 200) : ''}`);
      if (res.status !== 403 && res.status !== 429) break; // a 403 can be a stale login token, a 429 too many calls
      await sleep(res.status === 429 ? 2000 : 600);
    }
    throw err;
  }
  const plain = (props) => {
    const p = {};
    Object.entries(props || {}).forEach(([k, v]) => { p[k] = v && typeof v === 'object' ? v.value : v; });
    return p;
  };
  // Every match, a page of 200 at a time
  async function searchAll(portal, objectTypeId, filters, properties, max, onPage) {
    const out = [];
    for (let offset = 0; offset < max;) {
      const d = await hubspot('crm-search/search?clienttimeout=14000', portal, {
        method: 'POST',
        body: { objectTypeId, count: 200, offset, query: '', filterGroups: [{ filters }], sorts: [], requestOptions: { properties } },
      });
      const rows = (d && d.results) || [];
      rows.forEach((r) => out.push({ id: String(r.objectId), ...plain(r.properties) }));
      if (onPage) onPage(out.length, d && d.total);
      if (!rows.length || out.length >= ((d && d.total) || 0)) break;
      offset += rows.length;
    }
    return out;
  }
  // contact ID -> [IDs of the other object], 100 contacts a call
  async function associated(portal, ids, toType) {
    const out = new Map(ids.map((id) => [id, []]));
    for (const part of chunks(ids, 100)) {
      const d = await hubspot(`crm/v4/associations/0-1/${toType}/batch/read`, portal, { method: 'POST', body: { inputs: part.map((id) => ({ id })) } });
      ((d && d.results) || []).forEach((r) => {
        const from = String(r.from && r.from.id);
        if (out.has(from)) out.set(from, [...new Set((r.to || []).map((x) => String(x.toObjectId)))]);
      });
    }
    return out;
  }
  const updateContact = (portal, id, properties) =>
    hubspot(`crm/v3/objects/contacts/${id}`, portal, { method: 'PATCH', body: { properties } });
  // HubSpot's merge: the second contact goes into the first and is gone. It can't be undone.
  const mergeContacts = (portal, keepId, goneId) =>
    hubspot('crm/v3/objects/contacts/merge', portal, { method: 'POST', body: { primaryObjectId: keepId, objectIdToMerge: goneId } });

  /* ---------------- Reading a customer's contacts ---------------- */
  // ctx: { portal, companyId, scope, canGroup, root, companies: Map, contacts: Map, groups, stubs, bounced }

  function sourceOf(p) {
    const label = p.hs_object_source_label || '', detail = clean(p.hs_object_source_detail_1);
    if (/aircall/i.test(detail)) return 'Aircall';
    if (label === 'IMPORT') return detail ? `Import (${detail})` : 'Import';
    if (label === 'CONVERSATIONS') return 'Help Desk email';
    if (label === 'CRM_UI') return 'Added by hand';
    if (label === 'FORM') return 'Form';
    if (label === 'INTEGRATION') return detail || 'Integration';
    return detail || (label ? label.charAt(0) + label.slice(1).toLowerCase().replace(/_/g, ' ') : '');
  }

  async function load(t, scope, progress) {
    const [me] = await searchAll(t.portal, '0-2', [{ property: 'hs_object_id', operator: 'EQ', value: t.id }],
      ['name', 'hs_parent_company_id', 'hs_num_child_companies'], 1);
    if (!me) throw new Error('HubSpot didn\'t return this company');
    const parentId = me.hs_parent_company_id ? String(me.hs_parent_company_id) : '';
    const hasKids = +me.hs_num_child_companies > 0;
    // A head office always means the whole group; a venue can be just itself or its whole group
    const canGroup = !!parentId || hasKids;
    if (!scope) scope = hasKids ? 'group' : 'company';
    const rootId = scope === 'group' ? (parentId || t.id) : t.id;

    progress('Reading the companies…');
    const companies = new Map();
    const [root] = rootId === t.id ? [me] : await searchAll(t.portal, '0-2', [{ property: 'hs_object_id', operator: 'EQ', value: rootId }], ['name'], 1);
    companies.set(rootId, { id: rootId, name: clean(root && root.name) || `Company ${rootId}` });
    if (scope === 'group') {
      const kids = await searchAll(t.portal, '0-2', [{ property: 'hs_parent_company_id', operator: 'EQ', value: rootId }], ['name'], 2000);
      kids.forEach((k) => companies.set(k.id, { id: k.id, name: clean(k.name) || `Company ${k.id}` }));
    }

    const contacts = new Map();
    for (const part of chunks([...companies.keys()], 100)) {
      const rows = await searchAll(t.portal, '0-1', [{ property: 'associations.company', operator: 'IN', values: part }], CONTACT_PROPS,
        MAX_CONTACTS - contacts.size, (n, total) => progress(`Reading contacts… ${(contacts.size + n).toLocaleString('en-AU')}${total ? ' of ' + total.toLocaleString('en-AU') : ''}`));
      rows.forEach((p) => contacts.set(p.id, {
        id: p.id,
        first: clean(p.firstname), last: clean(p.lastname), email: clean(p.email).toLowerCase(),
        extraEmails: (p.hs_additional_emails || '').split(';').map((e) => clean(e).toLowerCase()).filter(Boolean),
        phone: clean(p.phone), mobile: clean(p.mobilephone), job: clean(p.jobtitle),
        created: toMs(p.createdate), lastActivity: toMs(p.notes_last_updated),
        bounced: !!p.hs_email_hard_bounce_reason_enum, primaryCompany: p.associatedcompanyid ? String(p.associatedcompanyid) : '',
        source: sourceOf(p), companies: [], tickets: 0,
      }));
      if (contacts.size >= MAX_CONTACTS) { log(`Stopped at ${MAX_CONTACTS} contacts`); break; }
    }

    progress(`Checking companies and tickets for ${plural(contacts.size, 'contact', 'contacts')}…`);
    const ids = [...contacts.keys()];
    const [cos, tickets] = await Promise.all([associated(t.portal, ids, '0-2'), associated(t.portal, ids, '0-5')]);
    ids.forEach((id) => { const c = contacts.get(id); c.companies = cos.get(id) || []; c.tickets = (tickets.get(id) || []).length; });

    const ctx = { portal: t.portal, companyId: t.id, scope, canGroup, root: companies.get(rootId), companies, contacts };
    findGroups(ctx);
    log(`${ctx.root.name}: ${plural(companies.size, 'company', 'companies')}, ${plural(contacts.size, 'contact', 'contacts')}, ` +
      `${ctx.groups.filter((g) => g.kind === 'likely').length} likely groups, ${ctx.groups.filter((g) => g.kind === 'maybe').length} to look at, ` +
      `${ctx.stubs.length} stubs, ${ctx.bounced.length} bounced`);
    return ctx;
  }

  /* ---------------- Who's probably the same person ---------------- */
  // Checked against Redcape's contacts in October 2026. HubSpot already stops two contacts having the
  // same email, so the doubles are mostly "stubs": a first name and a mobile, no email, made by Aircall
  // calls or an import, next to the real person. A shared phone alone proves nothing: a venue's duty
  // mobile or landline can be on several people with different names.

  // Last 9 digits, so 0412 345 678, +61 412 345 678 and 61412345678 match. Australian mobiles then start with 4.
  const phoneKey = (s) => { let d = (s || '').replace(/\D/g, ''); if (d.startsWith('61')) d = '0' + d.slice(2); return d.length >= 8 ? d.slice(-9) : ''; };
  const isMobile = (k) => /^4\d{8}$/.test(k);
  const firstKey = (c) => (c.first || '').toLowerCase().replace(/[^a-z\s'-]/g, '').trim().split(/\s+/)[0] || '';
  const lastKey = (c) => (c.last || '').toLowerCase().replace(/[^a-z]/g, '');
  // "Chris" and "Christopher" can be the same person; "Chris" and "Kate" can't. A blank name fits anyone.
  const firstFits = (a, b) => !a || !b || a === b || (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a)));
  const namesFit = (a, b) => firstFits(firstKey(a), firstKey(b)) && (!lastKey(a) || !lastKey(b) || lastKey(a) === lastKey(b));
  const fullName = (c) => clean(`${c.first} ${c.last}`);
  const label = (c) => fullName(c) || c.email || c.mobile || c.phone || `Contact ${c.id}`;
  const isStub = (c) => !c.email && !c.last && !c.tickets;
  // enquiries@, accounts@ and the like: a venue's mailbox, not a person
  const SHARED_MAILBOX = /^(enquiries|enquiry|info|accounts?|admin|reception|functions?|bookings?|events|manager|managers|gm|venue|office|hello|contact|bistro|kitchen|bar|gaming|dutymanager|duty\.manager|it|support|sales|marketing|payroll|finance)@/;
  const isShared = (c) => SHARED_MAILBOX.test(c.email);
  const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const notSame = () => gmGet('notSame', {});

  const REASONS = {
    mobile: 'Same mobile',
    name: 'Same name',
    email: 'Email on both',
    phone: 'Same phone (could be the venue\'s)',
    venue: 'Same first name at the same venue',
  };

  function findGroups(ctx) {
    const list = [...ctx.contacts.values()];
    const dismissed = notSame();
    const strong = [], weak = [];
    const edge = (into, a, b, why) => { if (a.id !== b.id && !dismissed[pairKey(a.id, b.id)]) into.push([a.id, b.id, why]); };
    const bucket = (keyFn) => {
      const m = new Map();
      list.forEach((c) => [...new Set([].concat(keyFn(c)).filter(Boolean))].forEach((k) => { if (!m.has(k)) m.set(k, []); m.get(k).push(c); }));
      return [...m.values()].filter((a) => a.length > 1 && a.length <= 40); // a key on 40+ people is a switchboard, not a person
    };
    const eachPair = (arr, fn) => { for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) fn(arr[i], arr[j]); };

    // Same mobile, and the names fit
    bucket((c) => [phoneKey(c.mobile), phoneKey(c.phone)].filter(isMobile)).forEach((arr) =>
      eachPair(arr, (a, b) => namesFit(a, b) && edge(strong, a, b, 'mobile')));
    // Same landline: could just be the venue's number, so only worth a look
    bucket((c) => [phoneKey(c.mobile), phoneKey(c.phone)].filter((k) => k && !isMobile(k))).forEach((arr) =>
      eachPair(arr, (a, b) => namesFit(a, b) && (firstKey(a) || firstKey(b)) && edge(weak, a, b, 'phone')));
    // Same first and last name. Both with their own different emails could be two people, so that's worth a look.
    bucket((c) => (firstKey(c) && lastKey(c) ? `${firstKey(c)} ${lastKey(c)}` : '')).forEach((arr) =>
      eachPair(arr, (a, b) => edge(a.email && b.email ? weak : strong, a, b, 'name')));
    // One's email is listed as the other's extra email
    const byEmail = new Map(list.filter((c) => c.email).map((c) => [c.email, c]));
    list.forEach((c) => c.extraEmails.forEach((e) => { const o = byEmail.get(e); if (o) edge(strong, c, o, 'email'); }));
    // A stub "Chris" at a venue where there's also a "Chris Smith"
    bucket((c) => (firstKey(c) ? c.companies.map((co) => `${co}:${firstKey(c)}`) : [])).forEach((arr) =>
      eachPair(arr, (a, b) => (isStub(a) !== isStub(b)) && namesFit(a, b) && edge(weak, a, b, 'venue')));

    // Join pairs into groups
    const join = (edges) => {
      const up = new Map();
      const top = (x) => { while (up.get(x) !== x) { up.set(x, up.get(up.get(x))); x = up.get(x); } return x; };
      const why = new Map();
      edges.forEach(([a, b, w]) => {
        [a, b].forEach((x) => { if (!up.has(x)) up.set(x, x); (why.get(x) || why.set(x, new Set()).get(x)).add(w); });
        up.set(top(a), top(b));
      });
      const sets = new Map();
      [...up.keys()].forEach((x) => { const r = top(x); (sets.get(r) || sets.set(r, []).get(r)).push(x); });
      return [...sets.values()].map((ids) => ({ ids, why: new Set(ids.flatMap((x) => [...why.get(x)])) }));
    };
    // A strong group whose first names don't all fit each other (Chris, Christopher and Christine) is only worth a look
    const allFit = (ids) => ids.every((a, i) => ids.slice(i + 1).every((b) => firstFits(firstKey(ctx.contacts.get(a)), firstKey(ctx.contacts.get(b)))));
    const groups = [];
    const inStrong = new Map();
    join(strong).forEach((g) => {
      const kind = allFit(g.ids) ? 'likely' : 'maybe';
      groups.push({ ...g, kind, clash: kind === 'maybe' });
      if (kind === 'likely') g.ids.forEach((id) => inStrong.set(id, g));
    });
    join(weak).forEach((g) => {
      // Already one likely group between them: nothing new to look at
      const owners = new Set(g.ids.map((id) => inStrong.get(id)));
      if (owners.size === 1 && !owners.has(undefined)) return;
      groups.push({ ...g, kind: 'maybe' });
    });

    ctx.groups = groups.map((g, i) => {
      const ids = g.ids.slice().sort((a, b) => score(ctx.contacts.get(b)) - score(ctx.contacts.get(a)));
      return {
        key: `g${i}`, kind: g.kind, clash: !!g.clash, ids, why: [...g.why], keeper: ids[0], include: new Set(ids), picks: {}, status: 'open',
      };
    }).sort((a, b) => (a.kind === b.kind ? b.ids.length - a.ids.length : a.kind === 'likely' ? -1 : 1));
    ctx.groups.forEach(defaultPicks.bind(null, ctx));
    const grouped = new Set(ctx.groups.flatMap((g) => g.ids));
    ctx.stubs = list.filter((c) => isStub(c) && !grouped.has(c.id)).sort((a, b) => label(a).localeCompare(label(b)));
    ctx.bounced = list.filter((c) => c.bounced).sort((a, b) => label(a).localeCompare(label(b)));
  }

  // The contact to keep: a working email first, then the one with the most tickets and history
  function score(c) {
    return (c.email && !c.bounced ? 1e6 : 0) + (c.email ? 5e5 : 0) - (isShared(c) ? 3e5 : 0) + c.tickets * 1e4 + (c.last ? 5e3 : 0) + (c.first ? 1e3 : 0) +
      c.companies.length * 100 + (c.lastActivity ? 50 : 0) - (c.created ? c.created / 1e11 : 0);
  }

  // For each field with more than one value: the kept contact's, or the first one that has a value
  function defaultPicks(ctx, g) {
    g.picks = {};
    fillPicks(ctx, g);
  }
  // After someone is left out: keep the choices still possible, fill in the rest
  function fillPicks(ctx, g) {
    const order = [g.keeper, ...g.ids.filter((id) => id !== g.keeper && g.include.has(id))];
    PICK_FIELDS.forEach(([f]) => {
      if (g.picks[f] && g.include.has(g.picks[f]) && fieldValue(ctx.contacts.get(g.picks[f]), f)) return;
      const from = order.find((id) => fieldValue(ctx.contacts.get(id), f));
      if (from) g.picks[f] = from; else delete g.picks[f];
    });
  }
  const FIELD_OF = { firstname: 'first', lastname: 'last', jobtitle: 'job', phone: 'phone', mobilephone: 'mobile' };
  const fieldValue = (c, f) => (c ? c[FIELD_OF[f]] || '' : '');
  // What will change on the kept contact
  function changes(ctx, g) {
    const keep = ctx.contacts.get(g.keeper);
    const out = {};
    const keptNumbers = [keep.phone, keep.mobile].map(phoneKey).filter(Boolean);
    PICK_FIELDS.forEach(([f]) => {
      const v = fieldValue(ctx.contacts.get(g.picks[f]), f);
      if (!v || v === fieldValue(keep, f)) return;
      // The same number already on the kept contact, in either phone field, isn't worth copying
      if ((f === 'phone' || f === 'mobilephone') && keptNumbers.includes(phoneKey(v))) return;
      out[f] = v;
    });
    return out;
  }

  /* ---------------- Merging ---------------- */
  async function mergeGroup(ctx, g) {
    const keep = ctx.contacts.get(g.keeper);
    const set = changes(ctx, g);
    const gone = g.ids.filter((id) => id !== g.keeper && g.include.has(id));
    let keepId = g.keeper;
    const done = [];
    g.status = 'working';
    render();
    try {
      // Set the chosen values first, so they're the newest when HubSpot merges, and again afterwards in case it didn't keep them
      if (Object.keys(set).length) await updateContact(ctx.portal, keepId, set);
      for (const id of gone) {
        const r = await mergeContacts(ctx.portal, keepId, id);
        if (r && r.id) keepId = String(r.id);
        done.push(id);
        log(`Merged ${label(ctx.contacts.get(id))} (${id}) into ${label(keep)} (${keepId})`);
      }
      if (Object.keys(set).length) {
        try { await updateContact(ctx.portal, keepId, set); } catch (e) { log('Couldn\'t set the chosen values again after merging:', e.message); }
      }
      g.status = 'merged';
    } catch (e) {
      log('Merge stopped:', e.message);
      g.status = done.length ? 'partial' : 'failed';
      g.error = e.message;
    }
    // Keep the screen in step: the merged contacts are gone, the kept one has the chosen values
    Object.entries(set).forEach(([f, v]) => { keep[FIELD_OF[f]] = v; });
    done.forEach((id) => {
      const c = ctx.contacts.get(id);
      if (c.email && c.email !== keep.email) keep.extraEmails = [...new Set([...keep.extraEmails, c.email])];
      keep.tickets += c.tickets;
      keep.companies = [...new Set([...keep.companies, ...c.companies])];
      c.mergedInto = keepId;
    });
    if (keepId !== g.keeper) { keep.id = keepId; ctx.contacts.set(keepId, keep); }
    g.result = { keepId, merged: done.length };
    render();
  }

  function markNotSame(g) {
    const d = notSame();
    const ids = g.ids.filter((id) => g.include.has(id));
    ids.forEach((a, i) => ids.slice(i + 1).forEach((b) => { d[pairKey(a, b)] = Date.now(); }));
    gmSet('notSame', d);
    g.status = 'dismissed';
    render();
  }
  function unmarkNotSame(g) {
    const d = notSame();
    g.ids.forEach((a) => g.ids.forEach((b) => { delete d[pairKey(a, b)]; }));
    gmSet('notSame', d);
    g.status = 'open';
    render();
  }

  /* ---------------- The clean-up screen ---------------- */
  const lucide = (paths, size = 16) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  // Lucide "users", "x", "check", "external-link", "triangle-alert", "merge"
  const USERS = '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>';
  const X = '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>';
  const CHECK = '<path d="M20 6 9 17l-5-5"/>';
  const OPEN = '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>';
  const ALERT = '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>';
  const MERGE = '<path d="m8 6 4-4 4 4"/><path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22"/><path d="m20 22-5-5"/>';

  const host = document.createElement('div');
  host.id = 'oolio-contact-cleanup';
  const shadow = host.attachShadow({ mode: 'open' });
  setHTML(shadow, `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; }
      [hidden] { display: none !important; }
      button { font: inherit; }
      .app { position: fixed; inset: 0; z-index: 2147483646; display: flex; flex-direction: column; background: #F7F5FB; color: #222; font-size: 13px; }
      header { flex: none; display: flex; align-items: center; gap: 12px; padding: 10px 12px 10px 20px; color: #fff;
        background: linear-gradient(-135deg, #673AB6, #5E35B1); }
      header .titles { flex: 1; min-width: 0; }
      header .title { font-size: 16px; font-weight: 700; }
      header .sub { font-size: 12px; opacity: .85; margin-top: 1px; }
      .scope { display: flex; background: rgba(255,255,255,.15); border-radius: 999px; padding: 3px; }
      .scope button { border: 0; background: none; color: #fff; padding: 5px 12px; border-radius: 999px; cursor: pointer; font-size: 12px; font-weight: 600; white-space: nowrap; }
      .scope button.on { background: #fff; color: #673AB6; }
      .x { flex: none; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; padding: 0;
        border: 0; border-radius: 999px; background: transparent; color: #fff; cursor: pointer; }
      .x:hover { background: rgba(255,255,255,.2); }
      .tabs { flex: none; display: flex; gap: 4px; padding: 0 20px; background: #fff; border-bottom: 1px solid #E6E1F0; }
      .tabs button { border: 0; background: none; padding: 12px 14px 10px; border-bottom: 3px solid transparent; cursor: pointer;
        color: #555; font-weight: 600; font-size: 13px; }
      .tabs button.on { color: #673AB6; border-bottom-color: #673AB6; }
      .tabs .n { display: inline-block; min-width: 20px; margin-left: 6px; padding: 1px 6px; border-radius: 999px; background: #F3EEF9;
        color: #673AB6; font-size: 11px; text-align: center; }
      .body { flex: 1; min-height: 0; display: flex; }
      aside { flex: none; width: 320px; display: flex; flex-direction: column; border-right: 1px solid #E6E1F0; background: #fff; }
      .find { margin: 12px; padding: 8px 12px; border: 1px solid #D9D2E6; border-radius: 8px; font: inherit; font-size: 13px; outline: none; }
      .find:focus { border-color: #673AB6; }
      .groups { flex: 1; overflow: auto; }
      .g { display: block; width: 100%; text-align: left; border: 0; border-left: 3px solid transparent; background: none;
        padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #F2EFF7; }
      .g:hover { background: #FAF8FD; }
      .g.on { background: #F3EEF9; border-left-color: #673AB6; }
      .g .nm { font-weight: 700; color: #222; }
      .g .why { color: #6F6F6F; font-size: 12px; margin-top: 2px; }
      .g .st { float: right; font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 999px; }
      .st.merged { background: #E8F5E9; color: #1B5E20; }
      .st.dismissed { background: #EEE; color: #555; }
      .st.failed, .st.partial { background: #FDECEA; color: #B3261E; }
      main { flex: 1; min-width: 0; overflow: auto; padding: 20px 24px 100px; }
      .empty { color: #6F6F6F; padding: 40px; text-align: center; font-size: 14px; }
      .loading { display: flex; align-items: center; justify-content: center; gap: 12px; height: 100%; color: #555; font-size: 14px; }
      .spin { width: 18px; height: 18px; border: 2px solid #D9D2E6; border-top-color: #673AB6; border-radius: 50%; animation: s 0.8s linear infinite; }
      @keyframes s { to { transform: rotate(360deg); } }
      h3 { margin: 0 0 4px; font-size: 18px; }
      .lead { color: #555; margin: 0 0 16px; }
      .tw { overflow: auto; border: 1px solid #E6E1F0; border-radius: 10px; background: #fff; }
      table { border-collapse: separate; border-spacing: 0; width: 100%; }
      th, td { padding: 9px 12px; border-bottom: 1px solid #F2EFF7; text-align: left; vertical-align: top; }
      tbody tr:last-child td, tbody tr:last-child th { border-bottom: 0; }
      .cmp th[scope=row] { position: sticky; left: 0; z-index: 1; width: 130px; min-width: 130px; background: #FAF8FD; color: #555; font-weight: 600; }
      .cmp thead th { position: sticky; top: 0; z-index: 2; background: #fff; border-bottom: 1px solid #E6E1F0; min-width: 230px; }
      .cmp thead th:first-child { left: 0; z-index: 3; background: #FAF8FD; }
      .cmp td { min-width: 230px; }
      .cmp td.out, .cmp th.out { opacity: .4; }
      .who { font-weight: 700; font-size: 14px; color: #222; }
      .who a { color: inherit; text-decoration: none; }
      .who a:hover { color: #673AB6; text-decoration: underline; }
      .tags { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 8px; }
      .tag { font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 999px; background: #F0F0F0; color: #555; }
      .tag.sug { background: #F3EEF9; color: #673AB6; }
      .tag.warn { background: #FFF4E0; color: #7A4B00; }
      .ctl { display: flex; flex-direction: column; gap: 4px; font-weight: 400; font-size: 12px; color: #333; }
      .ctl label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
      .ctl input { accent-color: #673AB6; margin: 0; }
      .keep { font-weight: 700; color: #673AB6; }
      .pick { display: flex; align-items: flex-start; gap: 6px; cursor: pointer; }
      .pick input { accent-color: #673AB6; margin: 2px 0 0; }
      .pick.won { font-weight: 600; color: #673AB6; }
      .muted { color: #9A9A9A; }
      .small { font-size: 12px; color: #6F6F6F; }
      .bar { position: fixed; left: 320px; right: 0; bottom: 0; display: flex; align-items: center; gap: 12px; padding: 12px 24px;
        background: #fff; border-top: 1px solid #E6E1F0; box-shadow: 0 -4px 16px rgba(34,34,34,.06); }
      .bar .what { flex: 1; min-width: 0; color: #444; }
      .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 999px; border: 1px solid #673AB6;
        background: #673AB6; color: #fff; font-weight: 600; cursor: pointer; white-space: nowrap; text-decoration: none; font-size: 13px; }
      .btn:hover { background: #5E35B1; }
      .btn.ghost { background: #fff; color: #673AB6; }
      .btn.ghost:hover { background: #F3EEF9; }
      .btn:disabled { opacity: .5; cursor: default; }
      .note { display: flex; gap: 8px; align-items: flex-start; padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; }
      .note.ok { background: #E8F5E9; color: #1B5E20; }
      .note.bad { background: #FDECEA; color: #B3261E; }
      .note.info { background: #F3EEF9; color: #4A2A85; }
      .note svg { flex: none; margin-top: 1px; }
      .list td a, .cmp a.open { color: #673AB6; text-decoration: none; font-weight: 600; }
      .list td a:hover { text-decoration: underline; }
      .list thead th { position: sticky; top: 0; background: #FAF8FD; color: #555; font-weight: 600; border-bottom: 1px solid #E6E1F0; }
      .modal { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center; background: rgba(34,20,60,.45); }
      .dlg { width: 520px; max-width: calc(100vw - 32px); max-height: calc(100vh - 64px); overflow: auto; background: #fff; border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,.3); padding: 22px 24px; }
      .dlg h4 { margin: 0 0 12px; font-size: 17px; }
      .dlg dl { margin: 0 0 14px; display: grid; grid-template-columns: 130px 1fr; gap: 6px 12px; }
      .dlg dt { color: #6F6F6F; }
      .dlg dd { margin: 0; }
      .dlg .warn { display: flex; gap: 8px; padding: 10px 12px; border-radius: 8px; background: #FFF4E0; color: #7A4B00; margin-bottom: 16px; }
      .dlg .btns { display: flex; justify-content: flex-end; gap: 8px; }
    </style>
    <div class="app" hidden role="dialog" aria-label="Clean up contacts">
      <header>
        ${lucide(USERS, 22)}
        <div class="titles"><div class="title">Clean up contacts</div><div class="sub"></div></div>
        <div class="scope" hidden><button type="button" data-scope="company"></button><button type="button" data-scope="group"></button></div>
        <button class="x" type="button" title="Close (Esc)" aria-label="Close">${lucide(X, 20)}</button>
      </header>
      <nav class="tabs"></nav>
      <div class="body"><aside><input class="find" type="search" placeholder="Find a name, email or phone"><div class="groups"></div></aside><main></main></div>
      <div class="bar" hidden></div>
    </div>
    <div class="modal" hidden><div class="dlg" role="alertdialog" aria-modal="true"></div></div>`);
  const $ = (s) => shadow.querySelector(s);
  const app = $('.app'), main = $('main'), aside = $('aside'), bar = $('.bar'), modal = $('.modal');

  // ui: { open, loading, error, ctx, tab, sel, find, scope }
  const ui = { open: false, tab: 'likely', sel: null, find: '' };
  const TABS = [
    ['likely', 'Likely the same person'],
    ['maybe', 'Worth a look'],
    ['stubs', 'Stubs'],
    ['bounced', 'Bounced emails'],
  ];

  async function openCleanup(scope) {
    const t = getCompany();
    if (!t) return;
    ui.open = true;
    ui.loading = 'Getting started…';
    ui.error = '';
    ui.ctx = null;
    ui.sel = null;
    app.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    render();
    try {
      const ctx = await load(t, scope, (msg) => { ui.loading = msg; renderMain(); });
      if (!ui.open) return;
      ui.ctx = ctx;
      ui.loading = '';
      ui.tab = ctx.groups.some((g) => g.kind === 'likely') ? 'likely' : ctx.groups.length ? 'maybe' : 'stubs';
      ui.sel = (ctx.groups.find((g) => g.kind === ui.tab) || {}).key || null;
    } catch (e) {
      log('Couldn\'t read the contacts:', e.message);
      ui.loading = '';
      ui.error = e.message;
    }
    render();
  }
  function closeCleanup() {
    if (ui.ctx && ui.ctx.groups.some((g) => g.status === 'working')) return; // never mid-merge
    ui.open = false;
    app.hidden = true;
    modal.hidden = true;
    document.documentElement.style.overflow = '';
  }

  const groupsOf = (kind) => (ui.ctx ? ui.ctx.groups.filter((g) => g.kind === kind) : []);
  const selected = () => (ui.ctx ? ui.ctx.groups.find((g) => g.key === ui.sel) : null);
  // Numbers match however they're typed: 0450, 450 or +61 450
  const localDigits = (v) => { const d = (v || '').replace(/\D/g, ''); return d.startsWith('61') ? '0' + d.slice(2) : d; };
  const matches = (c, q) => {
    if (!q) return true;
    const qd = localDigits(q).replace(/^0/, '');
    return [label(c), c.email, ...c.extraEmails].some((v) => (v || '').toLowerCase().includes(q)) ||
      (qd.length >= 3 && [c.phone, c.mobile].some((v) => localDigits(v).includes(qd)));
  };

  function render() {
    if (!ui.open) return;
    const ctx = ui.ctx;
    $('.sub').textContent = ctx
      ? `${ctx.root.name} · ${ctx.scope === 'group' ? plural(ctx.companies.size, 'company', 'companies') + ' · ' : ''}${plural(ctx.contacts.size, 'contact', 'contacts')}`
      : 'Reading HubSpot…';
    const scope = $('.scope');
    scope.hidden = !(ctx && ctx.canGroup);
    if (ctx && ctx.canGroup) {
      scope.querySelector('[data-scope=company]').textContent = 'This company';
      scope.querySelector('[data-scope=group]').textContent = 'Whole group';
      scope.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.scope === ctx.scope));
    }
    setHTML($('.tabs'), ctx ? TABS.map(([k, l]) => {
      const n = k === 'stubs' ? ctx.stubs.length : k === 'bounced' ? ctx.bounced.length : groupsOf(k).filter((g) => g.status === 'open').length;
      return `<button type="button" data-tab="${k}" class="${ui.tab === k ? 'on' : ''}">${l}<span class="n">${n}</span></button>`;
    }).join('') : '');
    const listTab = ui.tab === 'likely' || ui.tab === 'maybe';
    aside.hidden = !ctx || !listTab;
    if (ctx && listTab) renderGroups();
    renderMain();
  }

  function renderGroups() {
    const q = ui.find.toLowerCase().trim();
    const rows = groupsOf(ui.tab).filter((g) => !q || g.ids.some((id) => matches(ui.ctx.contacts.get(id), q)));
    setHTML($('.groups'), rows.length ? rows.map((g) => {
      const keep = ui.ctx.contacts.get(g.keeper);
      const st = { merged: 'Merged', dismissed: 'Not the same', failed: 'Didn\'t merge', partial: 'Part merged', working: 'Merging…' }[g.status];
      return `<button type="button" class="g${g.key === ui.sel ? ' on' : ''}" data-g="${g.key}">
        ${st ? `<span class="st ${g.status}">${st}</span>` : ''}
        <div class="nm">${esc(label(keep))} <span class="muted">+ ${g.ids.length - 1}</span></div>
        <div class="why">${esc(g.why.map((w) => REASONS[w]).join(' · '))}</div></button>`;
    }).join('') : `<div class="empty">${q ? 'Nothing matches.' : 'Nothing here.'}</div>`);
  }

  function companyNames(c) {
    const names = c.companies.map((id) => ui.ctx.companies.get(id)).filter(Boolean)
      .sort((a, b) => (b.id === c.primaryCompany) - (a.id === c.primaryCompany));
    const outside = c.companies.length - names.length;
    return names.map((co) => (co.id === c.primaryCompany ? `<b>${esc(co.name)}</b>` : esc(co.name))).join('<br>') +
      (outside ? `${names.length ? '<br>' : ''}<span class="muted">+ ${outside} outside this customer</span>` : '') ||
      '<span class="muted">None</span>';
  }

  function renderMain() {
    bar.hidden = true;
    if (ui.loading) { setHTML(main, `<div class="loading"><span class="spin"></span>${esc(ui.loading)}</div>`); return; }
    if (ui.error) {
      setHTML(main, `<div class="note bad">${lucide(ALERT)}<div>Couldn't read the contacts: ${esc(ui.error)}<br>Close this and try again. The browser console has the details.</div></div>`);
      return;
    }
    const ctx = ui.ctx;
    if (!ctx) return;
    if (ui.tab === 'stubs' || ui.tab === 'bounced') return renderList(ui.tab === 'stubs' ? ctx.stubs : ctx.bounced, ui.tab);
    const g = selected();
    if (!g || g.kind !== ui.tab) {
      setHTML(main, `<div class="empty">${groupsOf(ui.tab).length ? 'Pick a group on the left.' : ui.tab === 'likely'
        ? 'No contacts here look like the same person. Have a look at <b>Worth a look</b> and <b>Stubs</b>.' : 'Nothing to look at here.'}</div>`);
      return;
    }
    renderGroup(ctx, g);
  }

  function renderGroup(ctx, g) {
    const people = g.ids.map((id) => ctx.contacts.get(id));
    const ins = (c) => g.include.has(c.id);
    const cell = (c, html) => `<td class="${ins(c) ? '' : 'out'}">${html}</td>`;
    const head = people.map((c) => {
      const tags = [
        c.id === g.ids[0] ? '<span class="tag sug">Suggested to keep</span>' : '',
        c.source ? `<span class="tag">${esc(c.source)}</span>` : '',
        isStub(c) ? '<span class="tag warn">Stub</span>' : '',
        c.bounced ? '<span class="tag warn">Email bounced</span>' : '',
        isShared(c) ? '<span class="tag warn" title="A venue mailbox rather than a person. Merging a person into it makes this their email.">Shared mailbox</span>' : '',
      ].join('');
      const ctl = g.status === 'open' ? `<div class="ctl">
          <label class="${c.id === g.keeper ? 'keep' : ''}"><input type="radio" name="keep" data-keep="${c.id}" ${c.id === g.keeper ? 'checked' : ''} ${ins(c) ? '' : 'disabled'}> Keep this one</label>
          ${c.id === g.keeper ? '' : `<label><input type="checkbox" data-out="${c.id}" ${ins(c) ? '' : 'checked'}> Leave out of the merge</label>`}
        </div>` : '';
      return `<th class="${ins(c) ? '' : 'out'}"><div class="who"><a href="${recordUrl(ctx.portal, '0-1', c.id)}" target="_blank" rel="noopener">${esc(label(c))}</a></div>
        <div class="tags">${tags}</div>${ctl}</th>`;
    }).join('');

    const rows = PICK_FIELDS.map(([f, name]) => {
      const values = people.filter(ins).map((c) => fieldValue(c, f)).filter(Boolean);
      const differ = new Set(values.map((v) => v.toLowerCase())).size > 1;
      return `<tr><th scope="row">${name}</th>${people.map((c) => {
        const v = fieldValue(c, f);
        if (!v) return cell(c, '<span class="muted">–</span>');
        if (!differ || g.status !== 'open' || !ins(c)) return cell(c, esc(v));
        const won = g.picks[f] === c.id;
        return cell(c, `<label class="pick${won ? ' won' : ''}"><input type="radio" name="pick-${f}" data-pick="${f}" data-from="${c.id}" ${won ? 'checked' : ''}> ${esc(v)}</label>`);
      }).join('')}</tr>`;
    }).join('') + [
      ['Email', (c) => (c.email ? esc(c.email) : '<span class="muted">None</span>') +
        (c.extraEmails.length ? `<div class="small">Also: ${c.extraEmails.map(esc).join(', ')}</div>` : '')],
      ['Companies', companyNames],
      ['Tickets', (c) => (c.tickets ? String(c.tickets) : '<span class="muted">0</span>')],
      ['Created', (c) => `${esc(fmtDate(c.created))}${c.source ? `<div class="small">${esc(c.source)}</div>` : ''}`],
      ['Last activity', (c) => (c.lastActivity ? esc(fmtDate(c.lastActivity)) : '<span class="muted">None</span>')],
    ].map(([name, fn]) => `<tr><th scope="row">${name}</th>${people.map((c) => cell(c, fn(c))).join('')}</tr>`).join('');

    const keep = ctx.contacts.get(g.result ? g.result.keepId : g.keeper);
    let note = '';
    if (g.status === 'merged') {
      note = `<div class="note ok">${lucide(CHECK)}<div>Merged ${plural(g.result.merged, 'contact', 'contacts')} into <b>${esc(label(keep))}</b>.
        <a class="open" href="${recordUrl(ctx.portal, '0-1', g.result.keepId)}" target="_blank" rel="noopener">Open ${esc(label(keep))}</a></div></div>`;
    } else if (g.status === 'partial' || g.status === 'failed') {
      note = `<div class="note bad">${lucide(ALERT)}<div>${g.status === 'partial' ? `Merged ${plural(g.result.merged, 'contact', 'contacts')}, then HubSpot stopped` : 'HubSpot didn\'t merge them'}: ${esc(g.error)}<br>
        Open <a class="open" href="${recordUrl(ctx.portal, '0-1', g.result ? g.result.keepId : g.keeper)}" target="_blank" rel="noopener">${esc(label(keep))}</a> to see where it got to.</div></div>`;
    } else if (g.status === 'dismissed') {
      note = `<div class="note info">${lucide(CHECK)}<div>Marked as not the same people, so they won't be grouped again. <button class="btn ghost" type="button" data-act="unmark">Undo</button></div></div>`;
    } else if (g.kind === 'maybe') {
      note = `<div class="note info">${lucide(ALERT)}<div>${g.clash
        ? 'Some of these first names can\'t be the same person, so it may be two or more people. Use <b>Leave out of the merge</b> for anyone who isn\'t.'
        : `These only might be the same person (${esc(g.why.map((w) => REASONS[w].toLowerCase()).join(', '))}). Check before merging.`}</div></div>`;
    }

    setHTML(main, `<h3>${esc(label(people[0]))} <span class="muted">and ${plural(people.length - 1, 'other', 'others')}</span></h3>
      <p class="lead">${esc(g.why.map((w) => REASONS[w]).join(' · '))}</p>
      ${note}
      <div class="tw"><table class="cmp"><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`);

    if (g.status === 'open' || g.status === 'working') {
      const gone = g.ids.filter((id) => id !== g.keeper && g.include.has(id));
      const set = changes(ctx, g);
      const n = Object.keys(set).length;
      bar.hidden = false;
      setHTML(bar, `<div class="what">${gone.length
        ? `Keep <b>${esc(label(keep))}</b> and merge ${plural(gone.length, 'contact', 'contacts')} into it${n ? `, setting ${PICK_FIELDS.filter(([f]) => set[f]).map(([, l]) => l.toLowerCase()).join(', ')}` : ''}.`
        : 'Choose at least one contact to merge in.'}</div>
        <button class="btn ghost" type="button" data-act="notsame" ${g.status === 'working' ? 'disabled' : ''}>Not the same people</button>
        <button class="btn" type="button" data-act="merge" ${gone.length && g.status === 'open' ? '' : 'disabled'}>${lucide(MERGE)}${g.status === 'working' ? 'Merging…' : `Merge ${plural(gone.length, 'contact', 'contacts')}…`}</button>`);
    } else if (g.status === 'merged' || g.status === 'dismissed') {
      const next = groupsOf(g.kind).find((x) => x.status === 'open');
      if (next) {
        bar.hidden = false;
        setHTML(bar, `<div class="what"></div><button class="btn" type="button" data-act="next" data-g="${next.key}">Next group</button>`);
      }
    }
  }

  function renderList(rows, kind) {
    const q = ui.find.toLowerCase().trim();
    const shown = rows.filter((c) => matches(c, q));
    const lead = kind === 'stubs'
      ? 'Contacts with no email, no last name and no tickets that don\'t match anyone else here. Often made by Aircall calls or an import. Open one to fill it in or merge it by hand.'
      : 'Contacts whose email has bounced. They may have left the venue: check before emailing them.';
    setHTML(main, `<h3>${kind === 'stubs' ? 'Stubs' : 'Bounced emails'} <span class="muted">${shown.length}</span></h3><p class="lead">${lead}</p>
      ${shown.length ? `<div class="tw"><table class="list"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Companies</th><th>Created</th><th>Last activity</th></tr></thead><tbody>
      ${shown.map((c) => `<tr><td><a href="${recordUrl(ui.ctx.portal, '0-1', c.id)}" target="_blank" rel="noopener">${esc(label(c))}</a></td>
        <td>${c.email ? esc(c.email) : '<span class="muted">–</span>'}</td>
        <td>${esc(c.mobile || c.phone) || '<span class="muted">–</span>'}</td>
        <td>${companyNames(c)}</td>
        <td>${esc(fmtDate(c.created))}${c.source ? `<div class="small">${esc(c.source)}</div>` : ''}</td>
        <td>${c.lastActivity ? esc(fmtDate(c.lastActivity)) : '<span class="muted">None</span>'}</td></tr>`).join('')}
      </tbody></table></div>` : '<div class="empty">Nothing here.</div>'}`);
  }

  function confirmMerge(g) {
    const ctx = ui.ctx;
    const keep = ctx.contacts.get(g.keeper);
    const gone = g.ids.filter((id) => id !== g.keeper && g.include.has(id)).map((id) => ctx.contacts.get(id));
    const set = changes(ctx, g);
    const desc = (c) => [c.email, c.mobile || c.phone, c.source].filter(Boolean).join(' · ');
    setHTML($('.dlg'), `<h4>Merge into ${esc(label(keep))}?</h4>
      <dl>
        <dt>Kept</dt><dd><b>${esc(label(keep))}</b><div class="small">${esc(desc(keep))}</div></dd>
        <dt>Merged in</dt><dd>${gone.map((c) => `<div>${esc(label(c))}<div class="small">${esc(desc(c))}</div></div>`).join('')}</dd>
        ${Object.keys(set).length ? `<dt>Set on the kept one</dt><dd>${PICK_FIELDS.filter(([f]) => set[f]).map(([f, l]) => `${l}: <b>${esc(set[f])}</b>`).join('<br>')}</dd>` : ''}
      </dl>
      <div class="warn">${lucide(ALERT)}<div>HubSpot can't undo a merge. Emails, calls, notes, tickets and companies all move to ${esc(label(keep))}, and other emails become extra emails.</div></div>
      <div class="btns"><button class="btn ghost" type="button" data-act="cancel">Cancel</button>
        <button class="btn" type="button" data-act="domerge">${lucide(MERGE)}Merge ${plural(gone.length, 'contact', 'contacts')}</button></div>`);
    modal.hidden = false;
    $('.dlg [data-act=cancel]').focus();
  }

  // ---------- Clicks and keys ----------
  $('.x').addEventListener('click', closeCleanup);
  $('.find').addEventListener('input', (e) => { ui.find = e.target.value; ui.tab === 'likely' || ui.tab === 'maybe' ? renderGroups() : renderMain(); });
  shadow.addEventListener('click', (e) => {
    const el = e.target.closest('[data-tab],[data-g],[data-scope],[data-act]');
    if (!el || el.disabled) return;
    const g = selected();
    if (el.dataset.tab) {
      ui.tab = el.dataset.tab;
      const first = groupsOf(ui.tab).find((x) => x.status === 'open') || groupsOf(ui.tab)[0];
      ui.sel = first ? first.key : null;
      render();
    } else if (el.dataset.scope) {
      if (ui.ctx && el.dataset.scope !== ui.ctx.scope) openCleanup(el.dataset.scope);
    } else if (el.dataset.act === 'merge' && g) confirmMerge(g);
    else if (el.dataset.act === 'cancel') modal.hidden = true;
    else if (el.dataset.act === 'domerge' && g) { modal.hidden = true; mergeGroup(ui.ctx, g); }
    else if (el.dataset.act === 'notsame' && g) markNotSame(g);
    else if (el.dataset.act === 'unmark' && g) unmarkNotSame(g);
    else if (el.dataset.g) { ui.sel = el.dataset.g; render(); main.scrollTop = 0; }
  });
  shadow.addEventListener('change', (e) => {
    const g = selected();
    const el = e.target;
    if (!g || g.status !== 'open') return;
    if (el.dataset.keep) { g.keeper = el.dataset.keep; defaultPicks(ui.ctx, g); }
    else if (el.dataset.out) {
      if (el.checked) g.include.delete(el.dataset.out); else g.include.add(el.dataset.out);
      fillPicks(ui.ctx, g);
    } else if (el.dataset.pick) g.picks[el.dataset.pick] = el.dataset.from;
    render();
  });
  document.addEventListener('keydown', (e) => {
    if (!ui.open || e.key !== 'Escape') return;
    e.stopPropagation();
    if (!modal.hidden) modal.hidden = true; else closeCleanup();
  }, true);

  /* ---------------- The button on the company record ---------------- */
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'oolio-contact-cleanup-button';
  setHTML(button, `${lucide(USERS, 14)}<span>Clean up contacts</span>`);
  button.addEventListener('click', () => openCleanup());
  const buttonStyle = document.createElement('style');
  buttonStyle.textContent = `
    #oolio-contact-cleanup-button { display: inline-flex; align-items: center; gap: 6px; margin: 8px 0 2px; padding: 4px 12px;
      border: 1px solid #673AB6; border-radius: 999px; background: #fff; color: #673AB6; cursor: pointer;
      font: inherit; font-size: 12px; font-weight: 600; line-height: 18px; }
    #oolio-contact-cleanup-button:hover { background: #F3EEF9; }
    #oolio-contact-cleanup-button.floating { position: fixed; left: 80px; bottom: 24px; z-index: 2147483645; margin: 0;
      box-shadow: 0 4px 14px rgba(34,34,34,.18); }`;

  function sync() {
    if (!buttonStyle.isConnected) document.head.appendChild(buttonStyle);
    if (!host.isConnected) document.body.appendChild(host);
    const t = getCompany();
    if (!t) { button.remove(); if (ui.open) closeCleanup(); return; }
    if (ui.open && ui.ctx && ui.ctx.companyId !== t.id) closeCleanup();
    // Under the phone line below the company's name; floating bottom left if HubSpot moves things
    const props = document.querySelector(RECORD_TITLE) && document.querySelector(RECORD_PROPS);
    if (props) {
      button.classList.remove('floating');
      if (button.previousElementSibling !== props) props.insertAdjacentElement('afterend', button);
    } else {
      button.classList.add('floating');
      if (button.parentElement !== document.body) document.body.appendChild(button);
    }
  }
  setInterval(sync, 1000);
  sync();

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Clean up this company\'s contacts', () => openCleanup());
    GM_registerMenuCommand('Forget every "Not the same people"', () => { gmSet('notSame', {}); log('Forgot every "Not the same people"'); });
  }
})();
