// ==UserScript==
// @name         myTNT: Copy HubSpot note
// @namespace    oolio-userscripts
// @version      1.2.0
// @description  Adds Copy HubSpot note and Copy customer message buttons to myTNT shipment details. One click copies a formatted note or a customer-ready message, with the consignment number linked to tracking.
// @author       Stephen Balderson
// @match        https://mytnt.tnt.com/*
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTQwLjA5OSAwQzE3My4xODEgMCAyMDAgMjYuNjk3OSAyMDAgNTkuNjMxNEMyMDAgOTIuNTY0OSAxNzMuMTgxIDExOS4yNjMgMTQwLjA5OSAxMTkuMjYzQzEyNC42NzcgMTE5LjI2MyAxMTAuNjE2IDExMy40NjEgOTkuOTk4NiAxMDMuOTNDODkuMzgzNyAxMTMuNDYxIDc1LjMyMjkgMTE5LjI2MyA1OS45MDEgMTE5LjI2M0MyNi44MTg2IDExOS4yNjMgMCA5Mi41NjQ5IDAgNTkuNjMxNEMwIDI2LjY5NzkgMjYuODE4NiAwIDU5LjkwMSAwQzc1LjMyMzIgMCA4OS4zODQxIDUuODAxOTUgMTAwLjAwMSAxNS4zMzI5QzExMC42MTYgNS44MDE3NyAxMjQuNjc3IDAgMTQwLjA5OSAwWk0xNDAuMDk5IDM5LjkxODVDMTI5LjE2MyAzOS45MTg1IDEyMC4yOTcgNDguNzQ0MyAxMjAuMjk3IDU5LjYzMTRDMTIwLjI5NyA3MC41MTg1IDEyOS4xNjMgNzkuMzQ0MiAxNDAuMDk5IDc5LjM0NDJDMTUxLjAzNSA3OS4zNDQyIDE1OS45MDEgNzAuNTE4NSAxNTkuOTAxIDU5LjYzMTRDMTU5LjkwMSA0OC43NDQzIDE1MS4wMzUgMzkuOTE4NSAxNDAuMDk5IDM5LjkxODVaTTU5LjkwMSAzOS45MTg1QzQ4Ljk2NDcgMzkuOTE4NSA0MC4wOTkgNDguNzQ0MyA0MC4wOTkgNTkuNjMxNEM0MC4wOTkgNzAuNTE4NSA0OC45NjQ3IDc5LjM0NDIgNTkuOTAxIDc5LjM0NDJDNzAuODM3MyA3OS4zNDQyIDc5LjcwMyA3MC41MTg1IDc5LjcwMyA1OS42MzE0Qzc5LjcwMyA0OC43NDQzIDcwLjgzNzMgMzkuOTE4NSA1OS45MDEgMzkuOTE4NVoiIGZpbGw9IiM2NzNBQjYiLz4KPC9zdmc+Cg==
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/tnt/copy-hubspot-note.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/tnt/copy-hubspot-note.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  /* =====================================================================
   * SITE: myTNT
   * Everything that knows about TNT's pages lives in this block. When we
   * move to FedEx Ship Manager, rewrite this block and leave the rest.
   * Selectors use TNT's own data-e2e-id test hooks and Angular component
   * tags, not generated class names. Verified against myTNT 2 on 13/10/2026.
   * ===================================================================== */
  const SITE = {
    carrier: 'TNT',

    // Hash routes (myTNT is a single-page app)
    isDetails: (hash) => /^#\/shipment-history\/detail\/[0-9a-f-]{8,}/i.test(hash),
    isTrackTab: (hash) => /[?&]tab=track\b/i.test(hash),
    isThankYou: (hash) => /^#\/create-shipment\/thank-you\b/i.test(hash),
    isList: (hash) => /^#\/shipment-history\/?(\?|$)/i.test(hash),
    detailId: (hash) => (hash.match(/^#\/shipment-history\/detail\/([0-9a-f-]{8,})/i) || [])[1] || null,

    // Public tracking page. myTNT never shows a per-shipment tracking link, so this is
    // built from the number (agreed 13/10/2026). Works without a login.
    trackingUrl: (con) =>
      'https://www.tnt.com/express/en_au/site/shipping-tools/tracking.html?searchType=con&cons=' +
      encodeURIComponent(con),

    sel: {
      // Shipment details, Details tab
      heading: 'h1',
      consignment: '[data-e2e-id="shipment.history.details.consignmentNumberValue"]',
      bookedOn: '[data-e2e-id="shipment.history.details.BookedOnDateValue"]',
      reference: '[data-e2e-id="shipment.history.details.customerReferenceValue"]',
      service: '[data-e2e-id="shipment.history.details.ProductDescriptionValue"]',
      receiver: '[data-e2e-id="shipment.details.DestinationAddress"]',
      company: '[data-e2e-id="shipment.details.address.companyName"]',
      contact: '[data-e2e-id="shipment.details.address.contactName"]',
      city: '[data-e2e-id="shipment.details.address.city"]', // "7250 Launceston" (postcode first)
      country: '[data-e2e-id="shipment.details.address.country"]',
      packages: '[data-e2e-id="section-packages"]', // "Total items: 4" + "2x Box - 52 x 39 x 28cm - 3kg"
      // Shipment details, Track tab
      originDate: 'tnt-shipment-origin-date', // collection date, "13 October 2026"
      destinationDate: 'tnt-shipment-destination-date', // expected delivery, "16 October 2026 before 09:00"
      // Shipment history list
      listItem: 'tnt-shipments-overview-item',
      listDetailLink: '[data-e2e-id="shipments-overview.tracking-status-btn"]',
      listConsignment: '[data-e2e-id="shipments-overview.shipment-number"]',
      listCollection: '[data-e2e-id="shipments-overview.collectionDate"]',
      listDelivery: '[data-e2e-id="shipments-overview.destinationDate"]',
      // Booking confirmation (thank-you) screen. Read from myTNT's code, not yet seen live.
      thanksBox: 'tnt-shipment-information',
      thanksConsignment: '[data-e2e-id="mytnt.createShipment.thankYou.shipmentNumber"]',
    },
  };
  /* ======================= end of SITE block ========================= */

  const REQUIRED = {
    note: {
      details: { consignment: 'Consignment number', receiverCompany: 'Receiver company' },
      thankYou: { consignment: 'Consignment number' },
    },
    customer: {
      details: { consignment: 'Consignment number' },
      thankYou: { consignment: 'Consignment number' },
    },
  };

  /* HubSpot: a customer reference that holds a ticket ID links to the ticket in the internal note.
   * Ticket IDs are 10 to 13 digits and don't start with 0 (so phone numbers and order codes
   * like SOBG15222 are left alone). The rest of the reference stays as plain text.
   */
  const HUBSPOT = {
    ticketId: /\b([1-9]\d{9,12})\b/,
    ticketUrl: (id) => 'https://app.hubspot.com/contacts/5205495/record/0-5/' + id,
  };

  /* ---------------- Helpers ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const text = (sel, root) => {
    const el = $(sel, root);
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  // "13 Oct 2026", "13 October 2026" or "13 Oct 2026 at 14:36 (GMT+11)" -> "13/10/2026"
  function toDDMMYYYY(s) {
    const m = (s || '').match(/(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{4})/);
    if (!m) return '';
    const month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    if (month < 0) return '';
    return String(m[1]).padStart(2, '0') + '/' + String(month + 1).padStart(2, '0') + '/' + m[3];
  }

  // "16/10/2026" -> "Friday 16/10/2026"
  function withWeekday(ddmmyyyy) {
    const [d, m, y] = ddmmyyyy.split('/').map(Number);
    const day = new Date(y, m - 1, d).toLocaleDateString('en-AU', { weekday: 'long' });
    return day + ' ' + ddmmyyyy;
  }

  // Australian postcode to state. myTNT doesn't show the state, and each postcode belongs to one.
  function auState(postcode) {
    const n = parseInt(postcode, 10);
    if (!/^\d{4}$/.test(postcode) || Number.isNaN(n)) return '';
    if ((n >= 200 && n <= 299) || (n >= 2600 && n <= 2618) || (n >= 2900 && n <= 2920)) return 'ACT';
    if (n >= 800 && n <= 999) return 'NT';
    if (n >= 1000 && n <= 2999) return 'NSW';
    if ((n >= 3000 && n <= 3999) || (n >= 8000 && n <= 8999)) return 'VIC';
    if ((n >= 4000 && n <= 4999) || (n >= 9000 && n <= 9999)) return 'QLD';
    if (n >= 5000 && n <= 5999) return 'SA';
    if (n >= 6000 && n <= 6999) return 'WA';
    if (n >= 7000 && n <= 7999) return 'TAS';
    return '';
  }

  // "7250 Launceston" -> "Launceston TAS 7250"
  function formatPlace(city, country) {
    const m = city.match(/^(\d{3,4})\s+(.+)$/) || city.match(/^(.+?)\s+(\d{3,4})$/);
    if (!m) return city;
    const [postcode, suburb] = /^\d/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
    const state = /australia/i.test(country) ? auState(postcode.padStart(4, '0')) : '';
    return [suburb, state, postcode].filter(Boolean).join(' ');
  }

  // Package lines are "<count>x <type> - <dims> - <weight per item>kg". Weight is only
  // returned when every line can be read, so the note never shows a partial total.
  function readPackages(section) {
    if (!section) return { pieces: null, weightKg: null };
    const heading = (section.querySelector('h3, h4') || {}).textContent || '';
    const total = heading.match(/(\d+)/);
    const lines = [...section.querySelectorAll('li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim());
    let count = 0;
    let weight = 0;
    let allRead = lines.length > 0;
    for (const line of lines) {
      const m = line.match(/^(\d+)\s*x\b.*?([\d.,]+)\s*kg\s*$/i);
      if (!m) { allRead = false; continue; }
      count += +m[1];
      weight += +m[1] * parseFloat(m[2].replace(',', '.'));
    }
    return {
      pieces: total ? +total[1] : (allRead ? count : null),
      weightKg: allRead ? Math.round(weight * 100) / 100 : null,
    };
  }

  /* ---------------- Dates seen elsewhere ----------------
   * The Details tab shows neither the collection date nor the expected delivery date.
   * The list and the Track tab do, so remember them and use them on Details. Clicking
   * a row in the list reloads the whole page, so they're kept in this tab's
   * sessionStorage (gone when the tab closes). Keys: "collect:<id or number>", "deliver:<id or number>".
   */
  const STORE_KEY = 'oolio-tnt-dates';
  const STORE_MAX = 600;
  let rememberedDates = {};
  try { rememberedDates = JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { /* storage blocked */ }

  function rememberDates() {
    const hash = location.hash;
    const seen = {};
    const note = (keys, kind, raw) => {
      const date = toDDMMYYYY(raw);
      if (date) keys.filter(Boolean).forEach((k) => { seen[kind + ':' + k] = date; });
    };
    if (SITE.isList(hash)) {
      for (const item of document.querySelectorAll(SITE.sel.listItem)) {
        const link = $(SITE.sel.listDetailLink, item);
        const id = link && SITE.detailId('#' + (link.getAttribute('href') || '').split('#')[1]);
        const keys = [id, text(SITE.sel.listConsignment, item)];
        note(keys, 'collect', text(SITE.sel.listCollection, item));
        note(keys, 'deliver', text(SITE.sel.listDelivery, item));
      }
    } else if (SITE.isDetails(hash) && SITE.isTrackTab(hash)) {
      const keys = [SITE.detailId(hash)];
      note(keys, 'collect', text(SITE.sel.originDate));
      note(keys, 'deliver', text(SITE.sel.destinationDate));
    }
    if (Object.keys(seen).every((k) => rememberedDates[k] === seen[k])) return;
    rememberedDates = Object.fromEntries(Object.entries({ ...rememberedDates, ...seen }).slice(-STORE_MAX));
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(rememberedDates)); } catch (e) { /* storage blocked */ }
  }
  const recall = (kind, id, con) => rememberedDates[kind + ':' + id] || rememberedDates[kind + ':' + con] || '';

  /* ---------------- extract(): page -> plain object ---------------- */
  function extract() {
    const hash = location.hash;

    if (SITE.isThankYou(hash)) {
      const box = $(SITE.sel.thanksBox);
      let reference = '';
      if (box) {
        const label = [...box.querySelectorAll('h5')].find((h) => /^\s*customer reference:?\s*$/i.test(h.textContent));
        const value = label && label.parentElement.querySelector('strong');
        reference = value ? value.textContent.replace(/\s+/g, ' ').trim() : '';
      }
      return {
        kind: 'thankYou',
        carrier: SITE.carrier,
        consignment: text(SITE.sel.thanksConsignment, box || document),
        reference,
      };
    }

    if (SITE.isDetails(hash)) {
      if (SITE.isTrackTab(hash)) return { kind: 'trackTab' };
      const receiver = $(SITE.sel.receiver);
      const consignment = text(SITE.sel.consignment);
      const pkg = readPackages($(SITE.sel.packages));
      const city = receiver ? text(SITE.sel.city, receiver) : '';
      const country = receiver ? text(SITE.sel.country, receiver) : '';
      const heading = ((text(SITE.sel.heading) || '').match(/(\d{6,})/) || [])[1] || '';
      const id = SITE.detailId(hash);
      const collected = recall('collect', id, consignment);
      return {
        kind: 'details',
        carrier: SITE.carrier,
        headingNumber: heading,
        consignment,
        trackingUrl: consignment ? SITE.trackingUrl(consignment) : '',
        sentDate: collected || toDDMMYYYY(text(SITE.sel.bookedOn)),
        sentDateSource: collected ? 'collection' : 'booking',
        service: text(SITE.sel.service),
        receiverCompany: receiver ? text(SITE.sel.company, receiver) : '',
        receiverContact: receiver ? text(SITE.sel.contact, receiver) : '',
        expectedDelivery: recall('deliver', id, consignment),
        receiverPlace: city ? formatPlace(city, country) : '',
        pieces: pkg.pieces,
        weightKg: pkg.weightKg,
        reference: text(SITE.sel.reference),
      };
    }

    return { kind: 'none' };
  }

  /* ---------------- format(): plain object -> { html, text } ---------------- */
  function format(d) {
    const lines = []; // [label, value text, value html]
    const add = (label, value, html) => { if (value) lines.push([label, value, html || esc(value)]); };

    if (d.consignment) {
      const link = d.trackingUrl ? '<a href="' + esc(d.trackingUrl) + '">' + esc(d.consignment) + '</a>' : esc(d.consignment);
      lines.push(['Consignment', d.consignment + (d.trackingUrl ? ' (' + d.trackingUrl + ')' : ''), link]);
    }
    add('Sent', d.sentDate);
    add('Service', d.service);
    add('To', [d.receiverCompany, d.receiverContact].filter(Boolean).join(', '));
    add('Address', d.receiverPlace);
    if (d.pieces != null && d.weightKg != null) add('Pieces', d.pieces + ', ' + d.weightKg + ' kg');
    else if (d.pieces != null) add('Pieces', String(d.pieces));
    else if (d.weightKg != null) add('Weight', d.weightKg + ' kg');
    if (d.reference) {
      const m = d.reference.match(HUBSPOT.ticketId);
      if (m) {
        const url = HUBSPOT.ticketUrl(m[1]);
        const before = d.reference.slice(0, m.index);
        const after = d.reference.slice(m.index + m[1].length);
        lines.push(['Reference', d.reference + ' (' + url + ')',
          esc(before) + '<a href="' + esc(url) + '">' + esc(m[1]) + '</a>' + esc(after)]);
      } else {
        add('Reference', d.reference);
      }
    }

    const title = 'Item sent via ' + (d.carrier || 'TNT');
    return {
      text: [title, ...lines.map(([l, v]) => l + ': ' + v)].join('\n'),
      html: '<p>' + [esc(title), ...lines.map(([l, , h]) => esc(l) + ': ' + h)].join('<br>') + '</p>',
    };
  }

  /* ---------------- formatCustomer(): plain object -> { html, text } ----------------
   * The message for the customer. Change the wording here.
   */
  function formatCustomer(d) {
    const firstName = (d.receiverContact || '').split(/\s+/)[0];
    const carrier = d.carrier || 'TNT';
    const details = []; // [label, value text, value html]
    if (d.consignment) details.push(['Consignment number', d.consignment, esc(d.consignment)]);
    if (d.trackingUrl) {
      // Full address as the link text, so it still works if an email client drops the link
      details.push(['Track your delivery', d.trackingUrl, '<a href="' + esc(d.trackingUrl) + '">' + esc(d.trackingUrl) + '</a>']);
    }
    if (d.expectedDelivery) details.push(['Expected delivery', withWeekday(d.expectedDelivery), esc(withWeekday(d.expectedDelivery))]);
    if (d.pieces != null) details.push(['Items', String(d.pieces), String(d.pieces)]);

    const paragraphs = [
      ['Hi ' + (firstName || 'there') + ','],
      ['Thanks for your order. Your shipment is ready and has been booked with ' + carrier + '.'],
      details,
      ['It can take a few hours after booking for tracking to show the first update.'],
      ['If you have any questions, just reply to this email.'],
    ];
    const asText = (p) => p.map((line) => (Array.isArray(line) ? line[0] + ': ' + line[1] : line)).join('\n');
    const asHtml = (p) => '<p>' + p.map((line) => (Array.isArray(line) ? esc(line[0]) + ': ' + line[2] : esc(line))).join('<br>') + '</p>';
    return {
      text: paragraphs.map(asText).join('\n\n'),
      html: paragraphs.map(asHtml).join(''),
      leftOut: [!firstName && 'name', !d.expectedDelivery && 'expected delivery date'].filter(Boolean),
    };
  }

  /* ---------------- deliver(): note -> clipboard ----------------
   * Kept separate so a later version can POST to the HubSpot relay instead.
   * Puts text/html (keeps the link in HubSpot's note editor) and text/plain on the clipboard.
   */
  async function deliver(note) {
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([note.html], { type: 'text/html' }),
          'text/plain': new Blob([note.text], { type: 'text/plain' }),
        })]);
        return;
      } catch (e) { /* fall back to a copy event below */ }
    }
    let done = false;
    const onCopy = (e) => {
      e.clipboardData.setData('text/html', note.html);
      e.clipboardData.setData('text/plain', note.text);
      e.preventDefault();
      done = true;
    };
    document.addEventListener('copy', onCopy, true);
    try { document.execCommand('copy'); } finally { document.removeEventListener('copy', onCopy, true); }
    if (!done) throw new Error('The browser blocked the clipboard');
  }

  /* ---------------- Click: extract -> check -> format -> deliver ----------------
   * which: 'note' (HubSpot note) or 'customer' (message for the customer)
   */
  async function onCopyClick(which) {
    const d = extract();
    if (d.kind === 'trackTab') return toast('Open the Details tab, then copy.', 'err');
    if (d.kind === 'none') return toast('No shipment on this page.', 'err');

    const missing = Object.entries(REQUIRED[which][d.kind]).filter(([key]) => !d[key]).map(([, name]) => name);
    if (missing.length) return toast('Not copied. Missing: ' + missing.join(', ') + '. Wait for the page to load and try again.', 'err');
    if (d.kind === 'details' && d.headingNumber && d.headingNumber !== d.consignment) {
      return toast('Not copied. The page is still changing shipments. Try again in a moment.', 'err');
    }

    const out = which === 'customer' ? formatCustomer(d) : format(d);
    try {
      await deliver(out);
    } catch (e) {
      return toast('Not copied. ' + e.message + '.', 'err');
    }

    if (which === 'customer') {
      if (out.leftOut.length) {
        toast('Customer message copied without the ' + out.leftOut.join(' or ') +
          ' (not on this page). To include it, open the shipment from Shipment history. Check before sending.', 'warn');
      } else {
        toast('Customer message for ' + d.consignment + ' copied. Paste it into your reply.', 'ok');
      }
    } else if (d.kind === 'thankYou') {
      toast('Short note copied (number and reference only). For the full note, open this shipment in Shipment history.', 'warn');
    } else {
      toast('Note for ' + d.consignment + ' copied. Paste it into the HubSpot ticket.', 'ok');
    }
  }

  /* ---------------- Oolio-branded buttons and toast ---------------- */
  const ICON_COPY =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
  const ICON_MAIL =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';
  const OOLIO_MARK_WHITE =
    '<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path fill="#fff" fill-rule="evenodd" clip-rule="evenodd" d="M140.099 0C173.181 0 200 26.6979 200 59.6314C200 92.5649 173.181 119.263 140.099 119.263C124.677 119.263 110.616 113.461 99.9986 103.93C89.3837 113.461 75.3229 119.263 59.901 119.263C26.8186 119.263 0 92.5649 0 59.6314C0 26.6979 26.8186 0 59.901 0C75.3232 0 89.3841 5.80195 100.001 15.3329C110.616 5.80177 124.677 0 140.099 0ZM140.099 39.9185C129.163 39.9185 120.297 48.7443 120.297 59.6314C120.297 70.5185 129.163 79.3442 140.099 79.3442C151.035 79.3442 159.901 70.5185 159.901 59.6314C159.901 48.7443 151.035 39.9185 140.099 39.9185ZM59.901 39.9185C48.9647 39.9185 40.099 48.7443 40.099 59.6314C40.099 70.5185 48.9647 79.3442 59.901 79.3442C70.8373 79.3442 79.703 70.5185 79.703 59.6314C79.703 48.7443 70.8373 39.9185 59.901 39.9185Z"/></svg>';

  // Shadow DOM keeps our styles away from myTNT's and theirs away from ours.
  // Inter is used if it's installed; nothing is downloaded.
  const STYLE = `
    :host { all: initial; }
    .stack { position: fixed; right: 24px; bottom: 24px; z-index: 2147483000; display: flex; flex-direction: column;
      align-items: flex-end; gap: 8px; }
    .stack[hidden] { display: none; }
    .b { display: inline-flex; align-items: center;
      gap: 10px; height: 44px; padding: 0 16px 0 14px; border: 0; border-radius: 999px; cursor: pointer;
      background: #673AB6; color: #fff; font: 700 14px Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
      letter-spacing: -0.01em; box-shadow: 0 6px 20px rgba(103,58,182,.35), 0 1px 3px rgba(34,34,34,.2);
      transition: background .15s, transform .15s; }
    .b:hover { background: #5E35B1; transform: translateY(-1px); }
    .b.alt { height: 38px; padding: 0 14px; background: #fff; color: #673AB6; box-shadow: inset 0 0 0 1.5px #673AB6, 0 4px 14px rgba(34,34,34,.15); }
    .b.alt:hover { background: #F3EEF9; }
    .b:focus-visible { outline: 2px solid #03A9F4; outline-offset: 2px; }
    .b svg { width: 16px; height: 16px; flex: none; display: block; }
    .b .mark svg { width: 24px; height: auto; }
    .b .sep { width: 1px; height: 18px; background: rgba(255,255,255,.35); }
    .t { position: fixed; left: 50%; bottom: 28px; transform: translate(-50%, 8px); z-index: 2147483002;
      max-width: min(520px, calc(100vw - 32px)); box-sizing: border-box; padding: 10px 14px; border-radius: 12px;
      background: #222; color: #fff; opacity: 0; pointer-events: none; transition: opacity .15s, transform .15s;
      font: 500 13px/1.4 Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
      box-shadow: 0 6px 20px rgba(34,34,34,.25); border-left: 4px solid #673AB6; }
    .t.show { opacity: 1; transform: translate(-50%, 0); }
    .t.warn { border-left-color: #03A9F4; }
    .t.err { background: #fff; color: #222; border: 1px solid #d0d0d0; border-left: 4px solid #C62828; }
  `;

  let host;
  let stack;
  let toastEl;
  let toastTimer;

  function mount() {
    if (host && host.isConnected) return;
    host = document.createElement('div');
    host.id = 'oolio-tnt-hubspot-note';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>' + STYLE + '</style>' +
      '<div class="stack" hidden>' +
      '<button class="b alt" type="button" data-copy="customer" title="Copy a message to send the customer">' +
      ICON_MAIL + '<span>Copy customer message</span></button>' +
      '<button class="b" type="button" data-copy="note" title="Copy a note for the HubSpot ticket">' +
      '<span class="mark">' + OOLIO_MARK_WHITE + '</span><span class="sep"></span>' + ICON_COPY +
      '<span>Copy HubSpot note</span></button></div>' +
      '<div class="t" role="status" aria-live="polite"></div>';
    stack = root.querySelector('.stack');
    toastEl = root.querySelector('.t');
    root.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => onCopyClick(b.dataset.copy)));
    document.body.appendChild(host);
  }

  function toast(message, kind) {
    toastEl.textContent = message;
    toastEl.className = 't show ' + (kind || 'ok');
    toastEl.setAttribute('role', kind === 'err' ? 'alert' : 'status');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), kind === 'ok' ? 2500 : 6000);
  }

  /* ---------------- Show the buttons only where there's a shipment ---------------- */
  function hasShipment() {
    const hash = location.hash;
    if (SITE.isThankYou(hash)) return !!$(SITE.sel.thanksConsignment);
    if (SITE.isDetails(hash)) return !!($(SITE.sel.consignment) || $(SITE.sel.originDate));
    return false;
  }

  function update() {
    mount();
    rememberDates();
    stack.hidden = !hasShipment();
  }

  // myTNT changes page without reloading, so react to route changes and DOM changes
  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    setTimeout(() => { pending = false; update(); }, 150);
  };
  window.addEventListener('hashchange', schedule);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  update();
})();
