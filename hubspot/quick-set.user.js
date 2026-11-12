// ==UserScript==
// @name         HubSpot: Quick set
// @namespace    oolio-userscripts
// @version      0.5.0
// @description  An orange box on BP Implementation tickets to set the Implementation Category, Ticket owner, Project Manager, Install and Go Live dates and Installers in one go, and book the onsite (drag the time, with travel from the nearest office) with the installers invited.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/quick-set.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/quick-set.user.js
// @match        https://app.hubspot.com/help-desk/*
// @match        https://app.hubspot.com/contacts/*
// @match        https://app.hubspot.com/calendar-select-iframe/*
// @match        https://oolio-hubspot-addons.vercel.app/*
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTQwLjA5OSAwQzE3My4xODEgMCAyMDAgMjYuNjk3OSAyMDAgNTkuNjMxNEMyMDAgOTIuNTY0OSAxNzMuMTgxIDExOS4yNjMgMTQwLjA5OSAxMTkuMjYzQzEyNC42NzcgMTE5LjI2MyAxMTAuNjE2IDExMy40NjEgOTkuOTk4NiAxMDMuOTNDODkuMzgzNyAxMTMuNDYxIDc1LjMyMjkgMTE5LjI2MyA1OS45MDEgMTE5LjI2M0MyNi44MTg2IDExOS4yNjMgMCA5Mi41NjQ5IDAgNTkuNjMxNEMwIDI2LjY5NzkgMjYuODE4NiAwIDU5LjkwMSAwQzc1LjMyMzIgMCA4OS4zODQxIDUuODAxOTUgMTAwLjAwMSAxNS4zMzI5QzExMC42MTYgNS44MDE3NyAxMjQuNjc3IDAgMTQwLjA5OSAwWk0xNDAuMDk5IDM5LjkxODVDMTI5LjE2MyAzOS45MTg1IDEyMC4yOTcgNDguNzQ0MyAxMjAuMjk3IDU5LjYzMTRDMTIwLjI5NyA3MC41MTg1IDEyOS4xNjMgNzkuMzQ0MiAxNDAuMDk5IDc5LjM0NDJDMTUxLjAzNSA3OS4zNDQyIDE1OS45MDEgNzAuNTE4NSAxNTkuOTAxIDU5LjYzMTRDMTU5LjkwMSA0OC43NDQzIDE1MS4wMzUgMzkuOTE4NSAxNDAuMDk5IDM5LjkxODVaTTU5LjkwMSAzOS45MTg1QzQ4Ljk2NDcgMzkuOTE4NSA0MC4wOTkgNDguNzQ0MyA0MC4wOTkgNTkuNjMxNEM0MC4wOTkgNzAuNTE4NSA0OC45NjQ3IDc5LjM0NDIgNTkuOTAxIDc5LjM0NDJDNzAuODM3MyA3OS4zNDQyIDc5LjcwMyA3MC41MTg1IDc5LjcwMyA1OS42MzE0Qzc5LjcwMyA0OC43NDQzIDcwLjgzNzMgMzkuOTE4NSA1OS45MDEgMzkuOTE4NVoiIGZpbGw9IiM2NzNBQjYiLz4KPC9zdmc+Cg==
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      nominatim.openstreetmap.org
// @connect      routing.openstreetmap.de
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // On the HubSpot add-ons page, just say this script is installed (and which version), then stop
  if (location.hostname === 'oolio-hubspot-addons.vercel.app') {
    const v = typeof GM_info !== 'undefined' && GM_info.script ? GM_info.script.version : '';
    document.documentElement.setAttribute('data-installed-quick-set', v || 'yes');
    document.dispatchEvent(new Event('zoo:installed'));
    return;
  }

  // A second copy (installed twice) stays out of the way
  if (window.__oolioQuickSet) return;
  window.__oolioQuickSet = true;

  // Hand-over to HubSpot's Schedule window (it's a separate frame): who to invite, kept for a couple of minutes
  const BOOKING_KEY = 'oolio-quick-set-booking';
  const BOOKING_KEEP_MS = 2 * 60 * 1000;

  const IN_SCHEDULE_WINDOW = location.pathname.startsWith('/calendar-select-iframe/');
  if (!IN_SCHEDULE_WINDOW && window.top !== window) return; // e.g. a ticket page loaded inside Help Desk

  /* ---------------- Things you might want to change ---------------- */

  // The fields in the box, top to bottom. "owner" fields pick a HubSpot user, "date" fields a day; "list" fields
  // are drop-downs whose choices come from HubSpot, so a new category shows up here by itself.
  const FIELDS = [
    { name: 'bp___implementation_category', label: 'BP | Implementation Category', kind: 'list' },
    { name: 'hubspot_owner_id', label: 'Ticket owner', kind: 'owner' },
    { name: 'coordinator', label: 'Project Manager / Co-Ordinator', kind: 'owner', me: true }, // me: a Me button puts you in
    { name: 'accounts_status', label: 'Accounts Status', kind: 'list', viewOnly: true }, // shown, never changed here (Accounts own it)
    { name: 'install_date', label: 'Install Date', kind: 'date' },
    { name: 'go_live_date', label: 'Go Live Date', kind: 'date', sameAs: 'install_date' }, // sameAs: a Same day button copies that date
    { name: 'installer', label: 'Installer', kind: 'owner' },
    { name: 'installer_2', label: 'Installer 2', kind: 'owner' },
    { name: 'installer_3', label: 'Installer 3', kind: 'owner' },
    { name: 'installer_4', label: 'Installer 4', kind: 'owner', extra: true },
    { name: 'installer_5', label: 'Installer 5', kind: 'owner', extra: true },
  ];

  // Tickets in these pipelines get the orange button (Tampermonkey menu: "Show on every ticket" for all)
  const PIPELINES = /^BP \| (Implementation|Add Ons|Upgrades)/i;

  // People in a HubSpot team starting with this are listed first when picking someone
  const MY_TEAMS = /^BP \|/;

  const OWNERS_KEEP_MS = 12 * 60 * 60 * 1000; // the list of HubSpot users is remembered for 12 hours
  const SHORTCUT = 'KeyQ'; // Alt + Q (Option + Q on a Mac) opens and closes the box

  // Drive time from the nearest Oolio office, for the travel buffer when booking an onsite. Free, open
  // services (the same ones Quick actions uses), so there are no keys in this public repo; each answer is
  // remembered so an address is only looked up once.
  //   Address lookup: https://operations.osmfoundation.org/policies/nominatim/
  //   Driving routes: https://routing.openstreetmap.de/about.html
  const SERVICES = {
    geocode: 'https://nominatim.openstreetmap.org/search',
    drive: 'https://routing.openstreetmap.de/routed-car',
  };
  const TRAVEL_KEEP_DAYS = 30;
  const TRAVEL_ROUND_TO = 5; // minutes
  // Bepoz / Oolio offices (as in Quick actions, from https://www.bepoz.com.au/contact, October 2026)
  const OFFICES = [
    { label: 'Melbourne office', lat: -37.79317, lon: 144.93836 },
    { label: 'Sydney office', lat: -33.92007, lon: 151.18267 },
    { label: 'Brisbane office', lat: -27.4352, lon: 153.10418 },
    { label: 'Adelaide office', lat: -34.96593, lon: 138.60865 },
    { label: 'Perth office', lat: -31.94759, lon: 115.82212 },
    { label: 'Auckland office', lat: -36.86317, lon: 174.73379 },
    { label: 'Warrington office', lat: 53.38277, lon: -2.59009 },
    { label: 'South Carolina office', lat: 34.93248, lon: -80.99886 },
  ];

  const ORANGE = '#ff7a1a';
  const ORANGE_DARK = '#e2620a';

  const gmGet = (k, d) => (typeof GM_getValue === 'function' ? GM_getValue(k, d) : d);
  const gmSet = (k, v) => { if (typeof GM_setValue === 'function') GM_setValue(k, v); };

  // Search the browser console for "Oolio quick set" to see why something didn't work
  const log = (...a) => console.info('[Oolio quick set]', ...a);

  // ---------- Helpers ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // HubSpot may require Trusted Types for innerHTML
  let ttPolicy = null;
  try {
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
      ttPolicy = window.trustedTypes.createPolicy('oolio-quick-set', { createHTML: (s) => s });
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

  /* ---------------- HubSpot, with your login ---------------- */
  // The same calls HubSpot's own pages make. Nothing changes in HubSpot until you click Save.

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

  async function readTicket(t) {
    const props = ['hs_pipeline', 'subject', ...FIELDS.map((f) => f.name)].join(',');
    const d = await hubspot(`crm/v3/objects/0-5/${t.id}?properties=${props}`, t.portal);
    return (d && d.properties) || {};
  }

  const pipelineCache = {};
  async function pipelineName(t, id) {
    if (!id) return '';
    if (!pipelineCache[t.portal]) {
      pipelineCache[t.portal] = hubspot('crm-pipelines/v1/pipelines/0-5', t.portal)
        .then((d) => {
          const list = Array.isArray(d) ? d : (d && d.results) || [];
          return Object.fromEntries(list.map((p) => [String(p.pipelineId), p.label]));
        })
        .catch((e) => { delete pipelineCache[t.portal]; throw e; });
    }
    return (await pipelineCache[t.portal])[id] || '';
  }

  // Drop-down choices for the "list" fields, straight from HubSpot
  const optionsCache = {};
  function listOptions(t, name) {
    if (!optionsCache[name]) {
      optionsCache[name] = hubspot(`crm/v3/properties/0-5/${name}`, t.portal)
        .then((d) => ((d && d.options) || []).filter((o) => !o.hidden).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)))
        .catch((e) => { delete optionsCache[name]; throw e; });
    }
    return optionsCache[name];
  }

  // Every HubSpot user, sorted: your BP teams first, then everyone else
  let ownersPromise = null;
  function owners(t) {
    if (ownersPromise) return ownersPromise;
    const kept = gmGet('owners2', null);
    if (kept && kept.portal === t.portal && Date.now() - kept.at < OWNERS_KEEP_MS && kept.list && kept.list.length) {
      ownersPromise = Promise.resolve(kept.list);
      return ownersPromise;
    }
    ownersPromise = (async () => {
      const list = [];
      let after = '';
      for (let page = 0; page < 20; page++) {
        const d = await hubspot(`crm/v3/owners?limit=500${after ? '&after=' + encodeURIComponent(after) : ''}`, t.portal);
        ((d && d.results) || []).forEach((o) => {
          const name = [o.firstName, o.lastName].filter(Boolean).join(' ').trim() || o.email || `User ${o.id}`;
          const team = ((o.teams || []).find((x) => x.primary) || (o.teams || [])[0] || {}).name || '';
          list.push({ id: String(o.id), userId: String(o.userId || o.userIdIncludingInactive || ''), name, email: o.email || '', team, mine: (o.teams || []).some((x) => MY_TEAMS.test(x.name || '')) });
        });
        after = d && d.paging && d.paging.next ? d.paging.next.after : '';
        if (!after) break;
      }
      list.sort((a, b) => (b.mine - a.mine) || a.name.localeCompare(b.name));
      gmSet('owners2', { portal: t.portal, at: Date.now(), list });
      return list;
    })().catch((e) => { ownersPromise = null; throw e; });
    return ownersPromise;
  }

  // Your own HubSpot user, as a person you can pick (for the Me button)
  let mePromise = null;
  function myOwnerId(t) {
    if (!mePromise) {
      mePromise = Promise.all([hubspot('login-verify/hub-user-info', t.portal), owners(t)])
        .then(([d, list]) => {
          const uid = String((d && d.user && d.user.user_id) || '');
          const mine = uid && list.find((p) => p.userId === uid);
          if (!mine) log('could not find you in the list of people, so there is no Me button');
          return mine ? mine.id : '';
        })
        .catch((e) => { log('could not tell who you are:', e.message); mePromise = null; return ''; });
    }
    return mePromise;
  }

  /* ---------------- Drive time from the nearest office ---------------- */

  const REPO = 'https://github.com/StephenShawBepoz/browserscripts';
  function getJson(url) {
    if (typeof GM_xmlhttpRequest !== 'function') return fetch(url, { credentials: 'omit' }).then((r) => r.json());
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET', url, timeout: 15000, anonymous: true,
        headers: { Accept: 'application/json', 'User-Agent': `OolioQuickSet (+${REPO})`, Referer: REPO },
        onload: (r) => { try { resolve(JSON.parse(r.responseText)); } catch (e) { reject(new Error(`Unreadable reply (${r.status})`)); } },
        onerror: () => reject(new Error('No reply')), ontimeout: () => reject(new Error('Timed out')),
      });
    });
  }
  const kmBetween = (a, b) => {
    const rad = (x) => (x * Math.PI) / 180;
    const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  };
  // "Shop 3/123 Smith St" or "Level 2, 45 King St" confuse the address lookup; keep the street number and name
  const streetOnly = (street) => String(street || '').split(',').map((x) => x.trim())
    .map((x) => x.replace(/^(?:shops?|units?|suites?|levels?|lvl|tenancy|kiosk|lot|building|floor)\s*[\w.-]*\s*[,/]?\s*/i, '').replace(/^[a-z]{0,2}\d+[a-z]?\s*\/\s*(?=\d)/i, ''))
    .find((x) => /^\d/.test(x)) || String(street || '').trim();
  async function lookUp(params) {
    const u = new URL(SERVICES.geocode);
    u.searchParams.set('format', 'jsonv2');
    u.searchParams.set('limit', '1');
    Object.entries(params).forEach(([k, v]) => { if (v) u.searchParams.set(k, v); });
    const rows = await getJson(u.toString());
    return Array.isArray(rows) && rows[0] ? { lat: +rows[0].lat, lon: +rows[0].lon } : null;
  }

  // The record's primary company (a company record is its own), or null
  async function primaryCompanyId(portal, type, id) {
    if (type === '0-2') return String(id);
    const assoc = await hubspot(`crm/v4/objects/${type}/${id}/associations/0-2?limit=50`, portal);
    const rows = (assoc && assoc.results) || [];
    const primary = rows.find((r) => (r.associationTypes || []).some((x) => x.label === 'Primary' || (x.category === 'HUBSPOT_DEFINED' && [1, 5, 26, 280].includes(x.typeId))));
    if (primary) return String(primary.toObjectId);
    if (rows.length < 2) return rows[0] ? String(rows[0].toObjectId) : null;
    // No primary company (common on sub-tickets): the one named in the record's name, else the first
    const ids = rows.slice(0, 8).map((r) => String(r.toObjectId));
    try {
      const rec = await hubspot(`crm/v3/objects/${type}/${id}?properties=subject,dealname`, portal);
      const title = ((rec && rec.properties && (rec.properties.subject || rec.properties.dealname)) || '').toLowerCase();
      const named = await Promise.all(ids.map((cid) => hubspot(`crm/v3/objects/0-2/${cid}?properties=name`, portal)
        .then((c) => ({ cid, name: ((c && c.properties && c.properties.name) || '').trim().toLowerCase() })).catch(() => ({ cid, name: '' }))));
      const hit = named.filter((c) => c.name && title.includes(c.name)).sort((a, b) => b.name.length - a.name.length)[0];
      if (hit) return hit.cid;
    } catch (e) { log('picking the company:', e.message); }
    return ids[0];
  }
  // "Unit 7/652 Northeast Road, Holden Hill SA 5088"
  async function companyAddress(portal, companyId) {
    const c = await hubspot(`crm/v3/objects/0-2/${companyId}?properties=name,address,address2,city,state,zip`, portal);
    const p = (c && c.properties) || {};
    const street = [p.address, p.address2].map((x) => String(x || '').trim()).filter(Boolean).join(', ');
    const town = [p.city, p.state, p.zip].map((x) => String(x || '').trim()).filter(Boolean).join(' ');
    return { name: p.name || '', text: [street, town].filter(Boolean).join(', ') };
  }

  // { minutes, from: 'Perth office', venue } for the ticket's primary company, or null if there's no address
  const travelPromises = {};
  function travelFor(t) {
    if (!travelPromises[t.id]) travelPromises[t.id] = (async () => {
      const id = await primaryCompanyId(t.portal, '0-5', t.id);
      if (!id) return null;
      const kept = gmGet(`travel:${id}`, null);
      if (kept && Date.now() - kept.at < TRAVEL_KEEP_DAYS * 864e5) return kept.result;
      const c = await hubspot(`crm/v3/objects/0-2/${id}?properties=name,address,address2,city,state,zip,country,latitude,longitude,longtitude`, t.portal);
      const p = (c && c.properties) || {};
      let place = null;
      const lat = parseFloat(p.latitude); const lon = parseFloat(p.longitude || p.longtitude);
      if (Math.abs(lat) > 0 && Math.abs(lon) > 0) place = { lat, lon };
      const street = streetOnly([p.address, p.address2].filter(Boolean).join(', '));
      if (!place && street) place = await lookUp({ street, city: p.city, state: p.state, postalcode: p.zip, countrycodes: 'au,nz' });
      if (!place && street) place = await lookUp({ q: [street, p.city, p.state, p.zip].filter(Boolean).join(', '), countrycodes: 'au,nz' });
      if (!place && (p.city || p.zip)) place = await lookUp({ city: p.city, state: p.state, postalcode: p.zip, countrycodes: 'au,nz' });
      let result = null;
      if (place) {
        const office = OFFICES.reduce((best, o) => (kmBetween(o, place) < kmBetween(best, place) ? o : best));
        const r = await getJson(`${SERVICES.drive}/route/v1/driving/${office.lon},${office.lat};${place.lon},${place.lat}?overview=false&alternatives=false&steps=false`);
        const secs = r && r.code === 'Ok' && r.routes && r.routes[0] ? r.routes[0].duration : null;
        if (secs != null) result = { minutes: Math.max(TRAVEL_ROUND_TO, Math.ceil(secs / 60 / TRAVEL_ROUND_TO) * TRAVEL_ROUND_TO), from: office.label, venue: p.name || '' };
      }
      gmSet(`travel:${id}`, { at: Date.now(), result });
      return result;
    })().catch((e) => { log('drive time:', e.message); delete travelPromises[t.id]; return null; });
    return travelPromises[t.id];
  }
  const showMinutes = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`);

  /* ---------------- Look ---------------- */

  function addStyles() {
    if (document.getElementById('oolio-qs-style')) return;
    const s = document.createElement('style');
    s.id = 'oolio-qs-style';
    s.textContent = `
      .oolio-qs-btn { all: unset; box-sizing: border-box; position: fixed; z-index: 2147483000; display: inline-flex; align-items: center; gap: 8px;
        cursor: pointer; background: ${ORANGE}; color: #fff; font: 600 14px/1 "Lexend Deca", Helvetica, Arial, sans-serif; padding: 10px 16px 10px 13px;
        border-radius: 999px; box-shadow: 0 4px 14px rgba(0,0,0,.25); user-select: none; touch-action: none; }
      .oolio-qs-btn:hover { background: ${ORANGE_DARK}; }
      .oolio-qs-btn.dragging { cursor: grabbing; opacity: .9; }
      .oolio-qs-btn:focus-visible { outline: 2px solid #2d3e50; outline-offset: 2px; }
      .oolio-qs-btn svg { width: 18px; height: 18px; flex: none; }

      .oolio-qs-box { position: fixed; z-index: 2147483001; top: 72px; right: 24px; width: 380px; max-height: calc(100vh - 96px);
        display: flex; flex-direction: column; background: #fff; border: 3px solid ${ORANGE}; border-radius: 12px;
        box-shadow: 0 12px 40px rgba(0,0,0,.28); font: 14px/1.35 "Lexend Deca", Helvetica, Arial, sans-serif; color: #33475b; }
      .oolio-qs-head { display: flex; align-items: center; gap: 8px; background: ${ORANGE}; color: #fff; padding: 10px 12px; border-radius: 8px 8px 0 0; cursor: move; user-select: none; }
      .oolio-qs-head svg { width: 16px; height: 16px; flex: none; }
      .oolio-qs-head b { font-size: 15px; flex: none; }
      .oolio-qs-head .sub { opacity: .9; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
      .oolio-qs-x { all: unset; cursor: pointer; font-size: 20px; line-height: 1; padding: 0 4px; }
      .oolio-qs-body { padding: 10px 12px 4px; overflow: auto; }
      .oolio-qs-f { display: grid; grid-template-columns: 128px 1fr; align-items: center; gap: 8px; margin-bottom: 8px; }
      .oolio-qs-f[hidden] { display: none; }
      .oolio-qs-f label { font-size: 12px; font-weight: 600; color: #516f90; }
      .oolio-qs-f.changed label { color: ${ORANGE_DARK}; }
      .oolio-qs-f.changed label::after { content: " •"; }
      .oolio-qs-f select, .oolio-qs-f input { box-sizing: border-box; width: 100%; height: 32px; padding: 4px 8px; border: 1px solid #cbd6e2;
        border-radius: 6px; background: #f5f8fa; font: inherit; font-size: 13px; color: #33475b; }
      .oolio-qs-f select:focus, .oolio-qs-f input:focus { outline: none; border-color: ${ORANGE}; box-shadow: 0 0 0 2px rgba(255,122,26,.25); background: #fff; }
      .oolio-qs-view { display: flex; align-items: center; min-height: 32px; padding: 0 8px; border: 1px dashed #cbd6e2; border-radius: 6px;
        box-sizing: border-box; font-size: 13px; color: #33475b; background: #fff; cursor: default; }
      .oolio-qs-pick { position: relative; display: flex; gap: 4px; }
      .oolio-qs-me { all: unset; cursor: pointer; flex: none; background: ${ORANGE}; color: #fff; font-size: 12px; font-weight: 700; padding: 0 9px; border-radius: 6px; line-height: 32px; }
      .oolio-qs-me:hover { background: ${ORANGE_DARK}; }
      .oolio-qs-clear { all: unset; cursor: pointer; color: #7c98b6; padding: 0 4px; font-size: 16px; }
      .oolio-qs-clear:hover { color: #33475b; }
      .oolio-qs-menu { position: fixed; z-index: 2147483002; max-height: 240px; overflow: auto; background: #fff;
        border: 1px solid #cbd6e2; border-radius: 6px; box-shadow: 0 6px 18px rgba(0,0,0,.15); }
      .oolio-qs-menu div { padding: 6px 8px; cursor: pointer; font-size: 13px; }
      .oolio-qs-menu div small { color: #7c98b6; margin-left: 6px; }
      .oolio-qs-menu div.on { background: #fff1e6; }
      .oolio-qs-menu .grp { cursor: default; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #7c98b6; background: #f5f8fa; }
      .oolio-qs-drive { margin: 2px 0 8px 136px; font-size: 12px; color: #516f90; }
      .oolio-qs-more { all: unset; cursor: pointer; color: ${ORANGE_DARK}; font-size: 12px; font-weight: 600; margin: 0 0 8px 136px; }
      .oolio-qs-foot { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-top: 1px solid #eaf0f6; }
      .oolio-qs-msg { flex: 1; font-size: 12px; color: #516f90; }
      .oolio-qs-msg.err { color: #d93f4c; }
      .oolio-qs-msg.ok { color: #00a36c; }
      .oolio-qs-book { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; border: 2px solid ${ORANGE}; color: ${ORANGE_DARK};
        font-weight: 600; font-size: 13px; padding: 6px 10px; border-radius: 6px; flex: none; }
      .oolio-qs-book:hover { background: #fff1e6; }
      .oolio-qs-book svg { width: 15px; height: 15px; }
      .oolio-qs-save { all: unset; cursor: pointer; background: ${ORANGE}; color: #fff; font-weight: 600; font-size: 13px; padding: 8px 14px; border-radius: 6px; }
      .oolio-qs-save[disabled] { opacity: .45; cursor: default; }
      .oolio-qs-save:not([disabled]):hover { background: ${ORANGE_DARK}; }
      .oolio-qs-link { all: unset; cursor: pointer; color: #0091ae; font-size: 12px; text-decoration: underline; }
    `;
    document.head.appendChild(s);
  }


  /* ---------------- The orange button ---------------- */

  let state = { key: '', ticket: null, props: null, show: false };

  // A hard hat: the installer
  const HARD_HAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M14 6a6 6 0 0 1 6 6v3"/><path d="M4 15v-3a6 6 0 0 1 6-6"/><rect x="2" y="15" width="20" height="4" rx="1"/></svg>';

  function button() {
    let b = document.getElementById('oolio-qs-open');
    if (!b) {
      b = document.createElement('button');
      b.id = 'oolio-qs-open';
      b.type = 'button';
      b.className = 'oolio-qs-btn';
      b.title = 'Set the category, owner, project manager, dates and installers (Alt + Q). Drag to move it.';
      setHTML(b, `${HARD_HAT}<span>Quick set</span>`);
      pillDrag(b);
    }
    return b;
  }

  // Always a floating pill. Out of the box it sits bottom right (above Quick actions, if you have it); drag it anywhere and
  // every HubSpot tab uses that spot. It's kept inside the window when the window changes size.
  function pillSpot(b) {
    const pos = gmGet('pillPos', null);
    if (!pos) {
      // Out of the box: bottom right, stacked just above the purple Quick actions bar if that's in the way
      let bottom = 24;
      const qa = document.getElementById('oqa-bar');
      const r = qa && qa.getBoundingClientRect();
      if (r && r.width && r.right > innerWidth - 200) bottom = Math.max(bottom, Math.round(innerHeight - r.top + 10));
      b.style.left = ''; b.style.top = ''; b.style.right = '24px'; b.style.bottom = `${bottom}px`;
      return;
    }
    const w = b.offsetWidth || 120; const h = b.offsetHeight || 40;
    b.style.right = ''; b.style.bottom = '';
    b.style.left = `${Math.max(4, Math.min(innerWidth - w - 4, pos.x))}px`;
    b.style.top = `${Math.max(4, Math.min(innerHeight - h - 4, pos.y))}px`;
  }
  function pillDrag(b) {
    let down = null; let moved = false;
    b.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const r = b.getBoundingClientRect();
      down = { x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top };
      moved = false;
      const move = (ev) => {
        if (!moved && Math.hypot(ev.clientX - down.x, ev.clientY - down.y) < 5) return;
        moved = true;
        b.classList.add('dragging');
        gmSet('pillPos', { x: ev.clientX - down.dx, y: ev.clientY - down.dy });
        pillSpot(b);
      };
      const up = () => {
        document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
        b.classList.remove('dragging');
      };
      document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    });
    b.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      if (moved) { moved = false; return; } // that was a drag, not a click
      toggleBox();
    });
    addEventListener('resize', () => pillSpot(b));
  }

  function placeButton() {
    const b = button();
    if (!state.show) { b.remove(); return; }
    if (b.parentElement !== document.body) document.body.appendChild(b);
    if (!gmGet('pillPos', null)) pillSpot(b); // follows the Quick actions bar if that moves
  }

  async function onPage() {
    const t = getTicket();
    const key = t ? `${t.portal}/${t.id}` : '';
    if (key !== state.key) {
      state = { key, ticket: t, props: null, show: false };
      closeBox();
      if (t) {
        try {
          const props = await readTicket(t);
          if (state.key !== key) return;
          state.props = props;
          const pipe = await pipelineName(t, props.hs_pipeline);
          if (state.key !== key) return;
          state.show = gmGet('everyTicket', false) || PIPELINES.test(pipe);
          log(`ticket ${t.id} in "${pipe}"`, state.show ? '' : '(not a BP Implementation pipeline, button hidden)');
        } catch (e) { log('could not read the ticket:', e.message); }
      }
    }
    placeButton();
  }

  /* ---------------- The box ---------------- */

  let box = null;
  let fieldState = {}; // name -> { start, now }

  function closeBox() { if (box) { box.remove(); box = null; } }
  function toggleBox() { if (box) closeBox(); else openBox(); }

  async function openBox() {
    const t = state.ticket;
    if (!t) return;
    addStyles();
    closeBox();
    box = document.createElement('div');
    box.className = 'oolio-qs-box';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Quick set');
    setHTML(box, `
      <div class="oolio-qs-head">${HARD_HAT}<b>Quick set</b><span class="sub"></span><button class="oolio-qs-x" title="Close (Esc)" aria-label="Close">×</button></div>
      <div class="oolio-qs-body"><div class="oolio-qs-msg">Loading…</div></div>
      <div class="oolio-qs-foot"><button class="oolio-qs-book" title="Open HubSpot's Schedule window with the installers invited">${CALENDAR}<span>Book onsite</span></button><span class="oolio-qs-msg"></span><button class="oolio-qs-save" disabled>Save</button></div>`);
    document.body.appendChild(box);
    box.querySelector('.oolio-qs-x').addEventListener('click', closeBox);
    box.querySelector('.oolio-qs-save').addEventListener('click', save);
    box.querySelector('.oolio-qs-book').addEventListener('click', bookOnsite);
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !box.querySelector('.oolio-qs-menu')) { e.stopPropagation(); closeBox(); }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
    });
    dragBy(box.querySelector('.oolio-qs-head'), box);

    const myBox = box;
    try {
      const [props, people, me, ...lists] = await Promise.all([
        readTicket(t), owners(t), myOwnerId(t),
        ...FIELDS.map((f) => (f.kind === 'list' ? listOptions(t, f.name) : null)),
      ]);
      if (box !== myBox) return;
      state.props = props;
      state.people = people;
      box.querySelector('.sub').textContent = props.subject || `Ticket ${t.id}`;
      fieldState = {};
      const body = box.querySelector('.oolio-qs-body');
      setHTML(body, '');
      const extraSet = FIELDS.some((f) => f.extra && props[f.name]);
      FIELDS.forEach((f, i) => {
        if (f.extra && !extraSet && f === FIELDS.find((x) => x.extra)) {
          const more = document.createElement('button');
          more.className = 'oolio-qs-more';
          more.textContent = '+ More installers';
          more.addEventListener('click', () => { box.querySelectorAll('[data-extra]').forEach((r) => { r.hidden = false; }); more.remove(); });
          body.appendChild(more);
        }
        const row = document.createElement('div');
        row.className = 'oolio-qs-f';
        row.dataset.name = f.name;
        if (f.extra) { row.dataset.extra = '1'; row.hidden = !extraSet; }
        const id = `oolio-qs-${f.name}`;
        setHTML(row, `<label for="${id}">${esc(f.label)}</label>`);
        const start = props[f.name] || '';
        if (f.viewOnly) {
          const opt = (lists[i] || []).find((o) => o.value === start);
          const v = document.createElement('span');
          v.id = id;
          v.className = 'oolio-qs-view';
          v.title = 'View only. Accounts set this one.';
          v.textContent = start ? (opt ? opt.label : start) : '—';
          row.appendChild(v);
          body.appendChild(row);
          return;
        }
        fieldState[f.name] = { start, now: start };
        const onChange = (v) => { fieldState[f.name].now = v; row.classList.toggle('changed', v !== start); refreshSave(); };
        row.appendChild(f.kind === 'owner' ? ownerPicker(id, people, start, onChange, f.me ? me : '')
          : f.kind === 'date' ? datePicker(id, start, onChange, f.sameAs)
          : listPicker(id, lists[i] || [], start, onChange));
        body.appendChild(row);
      });
      const drive = document.createElement('div');
      drive.className = 'oolio-qs-drive';
      drive.textContent = 'Drive: working it out…';
      body.appendChild(drive);
      travelFor(t).then((tr) => {
        drive.textContent = tr ? `Drive: ${showMinutes(tr.minutes)} from the ${tr.from}` : 'Drive: no address on the company';
        drive.title = 'From the nearest Oolio office, without traffic. Book onsite adds it before and after the visit.';
      });
      const first = body.querySelector('select, input');
      if (first) first.focus();
      refreshSave();
    } catch (e) {
      if (box !== myBox) return;
      log('could not load the box:', e);
      const m = box.querySelector('.oolio-qs-body .oolio-qs-msg');
      m.className = 'oolio-qs-msg err';
      m.textContent = `Couldn't load from HubSpot. ${e.message}`;
    }
  }

  function listPicker(id, options, start, onChange) {
    const sel = document.createElement('select');
    sel.id = id;
    const opts = [{ value: '', label: '—' }, ...options];
    if (start && !options.some((o) => o.value === start)) opts.push({ value: start, label: `${start} (no longer a choice)` });
    setHTML(sel, opts.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join(''));
    sel.value = start;
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }

  // HubSpot keeps a date as YYYY-MM-DD, the same as the browser's date picker
  // No earliest/latest limits on purpose: Go Live can be the same day as the install (or any day).
  function datePicker(id, start, onChange, sameAs) {
    const wrap = document.createElement('div');
    wrap.className = 'oolio-qs-pick';
    const input = document.createElement('input');
    input.id = id;
    input.type = 'date';
    input.value = /^\d{4}-\d{2}-\d{2}/.test(start) ? start.slice(0, 10) : '';
    const begin = input.value;
    input.addEventListener('change', () => onChange(input.value === begin ? start : input.value));
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'oolio-qs-clear';
    clear.title = 'Clear';
    clear.textContent = '×';
    clear.addEventListener('click', () => { input.value = ''; onChange(''); input.focus(); });
    if (sameAs) {
      const other = FIELDS.find((x) => x.name === sameAs);
      const same = document.createElement('button');
      same.type = 'button';
      same.className = 'oolio-qs-me';
      same.textContent = 'Same day';
      same.title = `Same as the ${other ? other.label : sameAs}`;
      same.addEventListener('click', () => {
        const v = (fieldState[sameAs] && fieldState[sameAs].now) || '';
        if (!v) {
          const m = box && box.querySelector('.oolio-qs-foot .oolio-qs-msg');
          if (m) { m.className = 'oolio-qs-msg err'; m.textContent = `Set the ${other ? other.label : sameAs} first.`; }
          const o = document.getElementById(`oolio-qs-${sameAs}`);
          if (o) o.focus();
          return;
        }
        input.value = v.slice(0, 10);
        onChange(input.value === begin ? start : input.value);
      });
      wrap.append(same);
    }
    wrap.append(input, clear);
    return wrap;
  }

  // Type a name to search; Enter picks the top match, arrows move, Esc gives up
  function ownerPicker(id, people, start, onChange, meId) {
    const byId = new Map(people.map((p) => [p.id, p]));
    const nameOf = (v) => (!v ? '' : byId.has(v) ? byId.get(v).name : `User ${v} (inactive)`);
    const wrap = document.createElement('div');
    wrap.className = 'oolio-qs-pick';
    const input = document.createElement('input');
    input.id = id;
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = 'Type a name…';
    let value = start;
    input.value = nameOf(value);
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'oolio-qs-clear';
    clear.title = 'Clear';
    clear.textContent = '×';
    wrap.append(input, clear);

    let menu = null; let matches = []; let at = 0;
    const set = (v) => { value = v; input.value = nameOf(v); onChange(v); };
    const close = () => { if (menu) { menu.remove(); menu = null; } };
    // Floats over the page so the box doesn't clip it; opens upwards when there's no room below
    const place = () => {
      if (!menu) return;
      const r = input.getBoundingClientRect();
      const below = innerHeight - r.bottom - 8;
      menu.style.left = `${r.left}px`;
      menu.style.width = `${r.width + 24}px`;
      if (below >= 160 || below >= r.top) { menu.style.top = `${r.bottom + 2}px`; menu.style.bottom = ''; menu.style.maxHeight = `${Math.min(240, below)}px`; }
      else { menu.style.bottom = `${innerHeight - r.top + 2}px`; menu.style.top = ''; menu.style.maxHeight = `${Math.min(240, r.top - 8)}px`; }
    };
    document.addEventListener('scroll', (e) => { if (menu && e.target !== menu) place(); }, true);
    let typed = false; // false: list everyone (just focused); true: filter by what's typed
    const draw = () => {
      const q = typed ? fold(input.value).trim() : '';
      const words = q.split(/\s+/).filter(Boolean);
      matches = people.filter((p) => { const h = fold(`${p.name} ${p.email}`); return words.every((w) => h.includes(w)); });
      if (typed) matches = matches.slice(0, 60);
      at = Math.min(at, Math.max(0, matches.length - 1));
      if (!menu) { menu = document.createElement('div'); menu.className = 'oolio-qs-menu'; wrap.appendChild(menu); }
      place();
      let html = ''; let lastMine = null;
      matches.forEach((p, i) => {
        if (p.mine !== lastMine) { html += `<div class="grp">${p.mine ? 'Bepoz teams' : 'Everyone else'}</div>`; lastMine = p.mine; }
        html += `<div data-i="${i}" class="${i === at ? 'on' : ''}">${esc(p.name)}<small>${esc(p.team)}</small></div>`;
      });
      setHTML(menu, html || '<div class="grp">No one by that name</div>');
      const on = menu.querySelector('.on');
      if (on) on.scrollIntoView({ block: 'nearest' });
    };
    input.addEventListener('focus', () => {
      typed = false;
      at = Math.max(0, people.findIndex((p) => p.id === value)); // start on the person already set
      input.select();
      draw();
    });
    input.addEventListener('input', () => { typed = true; at = 0; draw(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!menu) draw(); at = Math.max(0, Math.min(matches.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1))); draw(); }
      else if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); if (menu && matches[at]) { set(matches[at].id); close(); } }
      else if (e.key === 'Escape' && menu) { e.preventDefault(); e.stopPropagation(); input.value = nameOf(value); close(); }
      else if (e.key === 'Tab') { if (menu && typed && input.value.trim() && matches[at]) set(matches[at].id); close(); }
    });
    input.addEventListener('blur', () => setTimeout(() => {
      if (!wrap.contains(document.activeElement)) {
        if (!input.value.trim() && value) set(''); else input.value = nameOf(value);
        close();
      }
    }, 120));
    wrap.addEventListener('mousedown', (e) => {
      const row = e.target.closest('.oolio-qs-menu div[data-i]');
      if (!row) return;
      e.preventDefault();
      set(matches[Number(row.dataset.i)].id);
      close();
    });
    clear.addEventListener('click', () => { set(''); input.focus(); });
    if (meId) {
      const mine = document.createElement('button');
      mine.type = 'button';
      mine.className = 'oolio-qs-me';
      mine.title = 'Put yourself in';
      mine.textContent = 'Me';
      mine.addEventListener('click', () => { set(meId); close(); });
      wrap.append(mine);
    }
    return wrap;
  }

  function changes() {
    const out = {};
    Object.entries(fieldState).forEach(([k, s]) => { if (s.now !== s.start) out[k] = s.now; });
    return out;
  }
  function refreshSave() {
    if (!box) return;
    const n = Object.keys(changes()).length;
    const b = box.querySelector('.oolio-qs-save');
    b.disabled = !n;
    b.textContent = n ? `Save ${n} change${n === 1 ? '' : 's'}` : 'Save';
    const m = box.querySelector('.oolio-qs-foot .oolio-qs-msg');
    if (n && !m.classList.contains('err')) { m.className = 'oolio-qs-msg'; m.textContent = ''; }
  }

  let saving = false;
  async function save() {
    const t = state.ticket;
    const props = changes();
    if (!box || !t || saving || !Object.keys(props).length) return false;
    saving = true;
    const b = box.querySelector('.oolio-qs-save');
    const m = box.querySelector('.oolio-qs-foot .oolio-qs-msg');
    b.disabled = true;
    b.textContent = 'Saving…';
    try {
      await hubspot(`crm/v3/objects/0-5/${t.id}`, t.portal, { method: 'PATCH', body: { properties: props } });
      log('saved', props);
      Object.values(fieldState).forEach((s) => { s.start = s.now; });
      box.querySelectorAll('.oolio-qs-f.changed').forEach((r) => r.classList.remove('changed'));
      refreshSave();
      m.className = 'oolio-qs-msg ok';
      setHTML(m, `Saved. HubSpot shows it after a <button class="oolio-qs-link">refresh</button>.`);
      m.querySelector('.oolio-qs-link').addEventListener('click', () => location.reload());
      return true;
    } catch (e) {
      log('save failed:', e);
      m.className = 'oolio-qs-msg err';
      m.textContent = `Not saved. ${e.message}`;
      refreshSave();
      return false;
    } finally {
      saving = false;
    }
  }

  /* ---------------- Book onsite ---------------- */
  // Opens HubSpot's own Schedule window for this ticket and invites the installers in the box, so the meeting is
  // logged on the ticket as usual. Nothing is booked until you click Schedule there.

  const CALENDAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>';

  async function bookOnsite() {
    const t = state.ticket;
    if (!box || !t) return;
    const m = box.querySelector('.oolio-qs-foot .oolio-qs-msg');
    const say = (text, cls = '') => { m.className = `oolio-qs-msg ${cls}`; m.textContent = text; };
    const byId = new Map((state.people || []).map((p) => [p.id, p]));
    const people = FIELDS.filter((f) => /^installer/.test(f.name))
      .map((f) => fieldState[f.name] && fieldState[f.name].now).filter(Boolean)
      .filter((id, i, a) => a.indexOf(id) === i)
      .map((id) => byId.get(id)).filter((p) => p && p.email);
    if (!people.length) { say('Pick an installer first.', 'err'); return; }
    // Unsaved changes go in first, so the ticket matches the invite
    if (Object.keys(changes()).length && !(await save())) return;
    const subject = (state.props && state.props.subject) || '';
    say('Working out the drive…');
    const travel = await Promise.race([travelFor(t), new Promise((r) => setTimeout(() => r(null), 6000))]);
    try {
      sessionStorage.setItem(BOOKING_KEY, JSON.stringify({
        ticket: t.id, at: Date.now(), title: `Onsite: ${subject}`.trim(), subject, travel,
        installDate: (fieldState.install_date && fieldState.install_date.now) || '',
        people: people.map((p) => ({ name: p.name, email: p.email })),
      }));
    } catch (e) { log('could not hand over the installers:', e.message); }
    log('booking onsite with', people.map((p) => p.name).join(', '));
    closeBox();
    if (t.helpDesk) { scheduleOverlay(t); return; }
    const sched = document.querySelector('[data-selenium-test="create-engagement-schedule-button"]');
    if (sched) sched.click();
    else location.assign(`/contacts/${t.portal}/record/0-5/${t.id}?interaction=schedule`);
  }

  // Help Desk has no Schedule window of its own, so the ticket's record page opens over it with the window
  // already open (HubSpot's ?interaction=schedule). It closes itself once you schedule or cancel.
  function scheduleOverlay(t) {
    if (document.getElementById('oolio-qs-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'oolio-qs-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483003;background:rgba(34,34,34,.55)';
    const frame = document.createElement('iframe');
    frame.src = `/contacts/${t.portal}/record/0-5/${t.id}?interaction=schedule`;
    frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;opacity:0;transition:opacity .2s';
    const x = document.createElement('button');
    x.type = 'button';
    x.title = 'Close (Esc)';
    x.textContent = '×';
    x.style.cssText = `position:absolute;top:14px;right:16px;z-index:2;width:36px;height:36px;border:0;border-radius:50%;cursor:pointer;background:#fff;color:${ORANGE_DARK};font:700 22px/36px sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.2)`;
    overlay.append(frame, x);
    document.body.appendChild(overlay);
    let shown = false;
    const close = (ask) => {
      if (ask && shown && !confirm('Close without scheduling? Anything you have entered will be lost.')) return;
      clearInterval(timer); overlay.remove(); document.removeEventListener('keydown', onEsc, true);
    };
    const onEsc = (e) => { if (e.key === 'Escape') close(true); };
    document.addEventListener('keydown', onEsc, true);
    x.addEventListener('click', () => close(true));
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      let d; try { d = frame.contentDocument; } catch (e) { return; }
      const sched = d && [...d.querySelectorAll('iframe')].find((f) => /calendar-select-iframe/.test(f.src) && f.getBoundingClientRect().width > 0);
      if (sched && !shown) { shown = true; frame.style.opacity = '1'; }
      if (!shown && tries > 60) { close(false); alert("HubSpot's Schedule window didn't open. Try Book onsite from the ticket's record page."); }
      if (shown && !sched) setTimeout(() => close(false), 600); // scheduled or cancelled
    }, 500);
  }

  // Runs inside HubSpot's Schedule window: drag to pick the time (always), and invites the installers
  // handed over by Book onsite (with the travel buffer)
  function scheduleWindow() {
    let job = null;
    try { job = JSON.parse(sessionStorage.getItem(BOOKING_KEY) || 'null'); } catch (e) { /* none */ }
    if (job && Date.now() - job.at > BOOKING_KEEP_MS) job = null;
    // Only the ticket it was meant for
    try {
      const m = window.parent.location.pathname.match(/\/record\/0-5\/(\d+)/);
      if (job && (!m || m[1] !== String(job.ticket))) job = null;
    } catch (e) { job = null; }
    if (job) sessionStorage.removeItem(BOOKING_KEY);

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    async function until(fn, ms = 15000) {
      for (let waited = 0; waited < ms; waited += 150) { const v = fn(); if (v) return v; await wait(150); }
      return null;
    }
    const setInput = (input, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const press = (el) => ['mousedown', 'mouseup', 'click'].forEach((type) =>
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window })));

    function toast(text, ms = 8000) {
      document.querySelectorAll('.oolio-qs-toast').forEach((x) => x.remove());
      const n = document.createElement('div');
      n.className = 'oolio-qs-toast';
      n.style.cssText = `position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483000;background:${ORANGE};color:#fff;font:600 13px/1.3 "Lexend Deca",Helvetica,Arial,sans-serif;padding:8px 14px;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.25);max-width:80%`;
      n.textContent = text;
      document.body.appendChild(n);
      setTimeout(() => n.remove(), ms);
    }

    const showDay = dragToBook(job && job.travel, toast, setInput, wait);
    fillAddress(toast, setInput);
    if (!job) return;

    function note(missed, added = []) {
      const n = document.createElement('div');
      n.style.cssText = `position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483000;background:${ORANGE};color:#fff;font:600 13px/1.3 "Lexend Deca",Helvetica,Arial,sans-serif;padding:8px 14px;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.25);max-width:80%`;
      n.textContent = missed.length
        ? `${added.length ? `Quick set invited ${added.join(', ')}, but couldn't add` : "Quick set couldn't add"} ${missed.join(', ')}. Add them under Attendees by hand.`
        : `Quick set invited ${added.join(', ')}. Drag down a day to pick the time on site${job.travel ? ` (travel of ${showMinutes(job.travel.minutes)} each way is added)` : ''}, then Schedule meeting.`;
      document.body.appendChild(n);
      setTimeout(() => n.remove(), missed.length ? 12000 : 6000);
    }

    (async () => {
      const btn = await until(() => document.querySelector('[data-test-id="unified-attendee-select"] button[data-dropdown]'));
      if (!btn) { log('Schedule window: no Attendees box found'); note(job.people.map((p) => p.name)); return; }

      // Let the window settle first. Quick actions fills in the description here, and moving the cursor
      // closes the Attendees list, so wait for that (or a few seconds) before touching anything.
      await until(() => {
        const ed = document.querySelector('[data-test-id="attendee-description-editor"] .ProseMirror, [data-selenium-test="attendee-description-editor"] .ProseMirror');
        return ed && ed.textContent.trim();
      }, 3500);
      await wait(700);

      // Title, unless someone's already typed their own (Quick actions puts in the ticket name, which is fine to replace)
      const title = document.querySelector('input[data-test-id="title-input"]');
      if (title && (!title.value.trim() || title.value.trim() === job.subject.trim())) setInput(title, job.title);

      const pop = () => document.getElementById(btn.getAttribute('aria-owns'));
      const isOpen = () => btn.getAttribute('data-dropdown-open') === 'true' && pop();
      async function openList() {
        if (!isOpen()) { btn.click(); await until(isOpen, 3000); }
        return until(() => pop() && pop().querySelector('input[type="search"]'), 3000);
      }
      // Each result row holds a real tick box; its checked state is what HubSpot uses (aria-selected stays false)
      const tickBox = (row) => row && row.querySelector('input[type="checkbox"]');
      const isTicked = (row) => { if (!row) return false; const cb = tickBox(row); return cb ? cb.checked : row.getAttribute('aria-selected') === 'true'; };
      // The row for this email, looked up fresh each time (HubSpot redraws the list as results arrive)
      const rowFor = (email) => {
        const p = pop();
        const row = p && [...p.querySelectorAll('[role="option"]')].find((o) => !o.querySelector('button') && o.textContent.toLowerCase().includes(email));
        return row ? (row.querySelector('[role="option"]') || row) : null;
      };

      const added = []; const missed = [];
      for (const person of job.people) {
        const email = person.email.toLowerCase();
        let ok = false;
        for (let attempt = 0; attempt < 3 && !ok; attempt++) {
          const search = await openList();
          if (!search) continue;
          if (search.value !== person.email) setInput(search, person.email);
          // Wait for the results to arrive and stop changing
          if (!(await until(() => rowFor(email), 7000))) break; // no such person in HubSpot's list
          await wait(450);
          const row = rowFor(email);
          if (!row) continue;
          if (isTicked(row)) { ok = true; break; } // already invited
          const cb = tickBox(row);
          if (cb && attempt === 0) cb.click(); else press(row); // the tick box first, the row as a fallback
          ok = !!(await until(() => isTicked(rowFor(email)), 2000));
          if (!ok) log(`Schedule window: ${person.name} not ticked yet, trying again`);
        }
        (ok ? added : missed).push(person.name);
      }

      // Tidy up: clear the search and close the list
      const search = pop() && pop().querySelector('input[type="search"]');
      if (search && search.value) { setInput(search, ''); await wait(200); }
      if (isOpen()) btn.click();
      await wait(200);
      if (isOpen()) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      if (job.installDate) await showDay(job.installDate);
      log('Schedule window: invited', added.join(', ') || 'nobody', missed.length ? `; not found: ${missed.join(', ')}` : '');
      note(missed, added);
    })();
  }

  // Location > In-person shows an empty Address box: put the primary company's address in it. Only an empty
  // box is filled, and only once each time it appears, so clearing it or typing your own sticks.
  function fillAddress(toast, setInput) {
    let rec = null;
    try {
      const m = window.parent.location.pathname.match(/^\/contacts\/(\d+)\/record\/(0-[1235])\/(\d+)/);
      if (m) rec = { portal: m[1], type: m[2], id: m[3] };
    } catch (e) { /* not a record page */ }
    if (!rec) return;
    let addressPromise = null;
    const address = () => addressPromise || (addressPromise = primaryCompanyId(rec.portal, rec.type, rec.id)
      .then((cid) => (cid ? companyAddress(rec.portal, cid) : null))
      .catch((e) => { log('company address:', e.message); addressPromise = null; return null; }));
    const box = () => document.querySelector('input[data-test-id="location-type-input"], [data-test-id="location-type-input"] input');
    let busy = false;
    new MutationObserver(async () => {
      const input = box();
      if (!input || busy || input.dataset.oolioQsTried || input.value.trim()) return;
      busy = true;
      input.dataset.oolioQsTried = '1';
      const a = await address();
      busy = false;
      const now = box();
      if (!a || !a.text) { toast('No address on the company to put in.', 5000); return; }
      if (now && !now.value.trim()) {
        setInput(now, a.text);
        now.blur();
        toast(`Address from ${a.name || 'the company'}: ${a.text}`, 6000);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  // Drag down a day in HubSpot's Schedule calendar to pick the time: an orange block follows the mouse, and
  // letting go fills in the date, start and end. With a travel buffer (from Book onsite) the drive there and
  // back shows as striped blocks and is included in the booking, so the installers' calendars are blocked.
  function dragToBook(travel, toast, setInput, wait) {
    const CELL = /^WEEK-day-(\d+)-(\d+)-(\d{4})-(\d+)$/; // HubSpot's hour cells: day-month-year-hour
    const travelMins = travel && travel.minutes > 0 ? travel.minutes : 0;
    const cellAt = (x, y) => document.elementsFromPoint(x, y).find((e) => CELL.test(e.getAttribute('data-test-id') || ''));
    const dayKey = (cell) => { const m = cell.getAttribute('data-test-id').match(CELL); return `${m[1]}-${m[2]}-${m[3]}`; };
    const midnight = (key) => { const c = document.querySelector(`[data-test-id="WEEK-day-${key}-0"]`); return c && c.getBoundingClientRect(); };
    const minutesAt = (key, y) => { const r = midnight(key); return r ? Math.max(0, Math.min(1440, ((y - r.top) / r.height) * 60)) : 0; };
    const pad = (n) => String(n).padStart(2, '0');
    const inputOf = (id) => document.querySelector(`[data-test-id="${id}"] input`);
    const clock = (mins, twelve) => {
      const h = Math.floor(mins / 60) % 24; const m = mins % 60;
      return twelve ? `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}` : `${pad(h)}:${pad(m)}`;
    };
    const span = (a, b) => `${clock(a, true).replace(':00', '')}–${clock(b, true).replace(':00', '')}`;

    // HubSpot's date picker pop-up stays open after a typed date; a click outside it closes it
    const closePopups = () => ['mousedown', 'mouseup', 'click'].forEach((type) =>
      document.body.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window })));

    let drag = null; let swallowClick = false; let layer = null;
    function draw(key, start, end) {
      const r = midnight(key);
      if (!r) return;
      if (!layer) {
        layer = document.createElement('div');
        layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147482000';
        document.body.appendChild(layer);
      }
      const px = (mins) => r.top + (mins / 60) * r.height;
      const block = (from, to, css, text = '') => `<div style="position:fixed;left:${r.left + 2}px;width:${r.width - 4}px;top:${px(from)}px;height:${Math.max(2, px(to) - px(from))}px;border-radius:4px;box-sizing:border-box;${css}">${text}</div>`;
      const stripes = `background:repeating-linear-gradient(45deg,rgba(255,122,26,.35) 0 6px,rgba(255,122,26,.12) 6px 12px);border:1px dashed ${ORANGE}`;
      const label = `<span style="display:block;padding:3px 6px;font:600 11px/1.3 'Lexend Deca',Helvetica,Arial,sans-serif;color:#fff">On site ${esc(span(start, end))}</span>`;
      setHTML(layer, (travelMins ? block(start - travelMins, start, stripes) + block(end, end + travelMins, stripes) : '')
        + block(start, end, `background:rgba(255,122,26,.85);border:1px solid ${ORANGE_DARK}`, label));
    }
    const clear = () => { if (layer) { layer.remove(); layer = null; } };

    document.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const cell = cellAt(e.clientX, e.clientY);
      if (!cell) return;
      const key = dayKey(cell);
      drag = { key, y0: e.clientY, m0: minutesAt(key, e.clientY), active: false };
    }, true);
    document.addEventListener('mousemove', (e) => {
      if (!drag) return;
      // Let go outside this window (over the Quick set box, say): finish where the block last was
      if (e.buttons === 0) { const d = drag; drag = null; document.body.style.userSelect = ''; if (d.active) apply(d.key, d.start, d.end); else clear(); return; }
      if (!drag.active && Math.abs(e.clientY - drag.y0) < 8) return;
      if (!drag.active) { drag.active = true; document.body.style.userSelect = 'none'; }
      e.preventDefault();
      const m1 = minutesAt(drag.key, e.clientY);
      drag.start = Math.floor(Math.min(drag.m0, m1) / 15) * 15;
      drag.end = Math.max(drag.start + 15, Math.ceil(Math.max(drag.m0, m1) / 15) * 15);
      draw(drag.key, drag.start, drag.end);
    }, true);
    document.addEventListener('mouseup', (e) => {
      const d = drag; drag = null;
      document.body.style.userSelect = '';
      if (!d || !d.active) return;
      e.preventDefault(); e.stopPropagation();
      swallowClick = true; setTimeout(() => { swallowClick = false; }, 400);
      apply(d.key, d.start, d.end);
    }, true);
    document.addEventListener('click', (e) => { if (swallowClick) { e.preventDefault(); e.stopPropagation(); swallowClick = false; } }, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drag) { drag = null; document.body.style.userSelect = ''; clear(); } }, true);

    // Open the calendar on a given day (Book onsite passes the Install Date), keeping the times as they are
    return async function showDay(isoDate) {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate || '');
      const dateIn = inputOf('date-picker-start');
      if (!m || !dateIn) return;
      const want = (dateIn.getAttribute('data-format') || 'DD/MM/YYYY').replace('DD', m[3]).replace('MM', m[2]).replace('YYYY', m[1]);
      if (dateIn.value === want) return;
      dateIn.focus(); setInput(dateIn, want); await wait(250);
      ['keydown', 'keyup'].forEach((type) => dateIn.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true })));
      dateIn.blur();
      await wait(250);
      closePopups();
    };

    async function apply(key, start, end) {
      const from = Math.max(0, start - travelMins); const to = Math.min(1439, end + travelMins);
      const [dd, mm, yyyy] = key.split('-').map(Number);
      const dateIn = inputOf('date-picker-start'); const startIn = inputOf('time-picker-start'); const endIn = inputOf('time-picker-end');
      if (!dateIn || !startIn || !endIn) { clear(); toast("Couldn't find HubSpot's date and time boxes. Type the times in instead."); return; }
      const fmt = (dateIn.getAttribute('data-format') || 'DD/MM/YYYY').replace('DD', pad(dd)).replace('MM', pad(mm)).replace('YYYY', yyyy);
      const twelve = /am|pm/i.test(startIn.value || startIn.placeholder || 'AM');
      const enter = (el) => ['keydown', 'keyup'].forEach((type) => el.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true })));
      const put = async (el, v) => { el.focus(); setInput(el, v); await wait(250); enter(el); el.blur(); await wait(250); };
      if (dateIn.value !== fmt) { await put(dateIn, fmt); swallowClick = false; closePopups(); await wait(200); }
      await put(startIn, clock(from, twelve)); // HubSpot moves the end to keep the length, so the end goes last
      await put(endIn, clock(to, twelve));
      clear();
      const ok = startIn.value.replace(/\s/g, '').toLowerCase() === clock(from, twelve).replace(/\s/g, '').toLowerCase();
      toast(!ok ? "HubSpot didn't take the new time. Check Start and End before you schedule."
        : travelMins ? `On site ${span(start, end)}, booked ${span(from, to)} with ${showMinutes(travelMins)} travel each way from the ${travel.from}.`
          : `Booked ${span(from, to)}.`, 9000);
    }
  }

  // Drag the box by its orange header; it remembers where you left it
  function dragBy(handle, el) {
    const pos = gmGet('boxPos', null);
    if (pos) { el.style.left = `${Math.min(pos.x, innerWidth - 120)}px`; el.style.top = `${Math.min(Math.max(0, pos.y), innerHeight - 60)}px`; el.style.right = 'auto'; }
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const dx = e.clientX - r.left; const dy = e.clientY - r.top;
      const move = (ev) => { el.style.left = `${ev.clientX - dx}px`; el.style.top = `${Math.max(0, ev.clientY - dy)}px`; el.style.right = 'auto'; };
      const up = () => {
        document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
        const nr = el.getBoundingClientRect(); gmSet('boxPos', { x: nr.left, y: nr.top });
      };
      document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
    });
    handle.addEventListener('dblclick', () => { gmSet('boxPos', null); el.style.left = ''; el.style.top = ''; el.style.right = ''; });
  }

  /* ---------------- Start ---------------- */

  if (IN_SCHEDULE_WINDOW) { scheduleWindow(); return; }

  addStyles();
  document.addEventListener('keydown', (e) => {
    if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === SHORTCUT && state.ticket) { e.preventDefault(); toggleBox(); }
  }, true);

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand(`${gmGet('everyTicket', false) ? '✓ ' : ''}Show on every ticket (not just BP Implementation)`, () => {
      gmSet('everyTicket', !gmGet('everyTicket', false));
      location.reload();
    });
    GM_registerMenuCommand('Put the Quick set button back bottom right', () => { gmSet('pillPos', null); const b = document.getElementById('oolio-qs-open'); if (b) pillSpot(b); });
    GM_registerMenuCommand('Reload the list of people', () => { gmSet('owners2', null); ownersPromise = null; });
  }

  let timer = null;
  const kick = () => { clearTimeout(timer); timer = setTimeout(onPage, 250); };
  new MutationObserver(kick).observe(document.body, { childList: true, subtree: true });
  kick();
})();
