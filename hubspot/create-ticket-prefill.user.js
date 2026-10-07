// ==UserScript==
// @name         HubSpot: Create ticket prefill
// @namespace    oolio-userscripts
// @version      1.0.0
// @description  On new tickets in BP | Bepoz Support, prefills Source Internal, Priority P2 - High and Brands Bepoz. Never changes the pipeline.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/create-ticket-prefill.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/create-ticket-prefill.user.js
// @match        https://app.hubspot.com/object-builder/*/0-5/*
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTQwLjA5OSAwQzE3My4xODEgMCAyMDAgMjYuNjk3OSAyMDAgNTkuNjMxNEMyMDAgOTIuNTY0OSAxNzMuMTgxIDExOS4yNjMgMTQwLjA5OSAxMTkuMjYzQzEyNC42NzcgMTE5LjI2MyAxMTAuNjE2IDExMy40NjEgOTkuOTk4NiAxMDMuOTNDODkuMzgzNyAxMTMuNDYxIDc1LjMyMjkgMTE5LjI2MyA1OS45MDEgMTE5LjI2M0MyNi44MTg2IDExOS4yNjMgMCA5Mi41NjQ5IDAgNTkuNjMxNEMwIDI2LjY5NzkgMjYuODE4NiAwIDU5LjkwMSAwQzc1LjMyMzIgMCA4OS4zODQxIDUuODAxOTUgMTAwLjAwMSAxNS4zMzI5QzExMC42MTYgNS44MDE3NyAxMjQuNjc3IDAgMTQwLjA5OSAwWk0xNDAuMDk5IDM5LjkxODVDMTI5LjE2MyAzOS45MTg1IDEyMC4yOTcgNDguNzQ0MyAxMjAuMjk3IDU5LjYzMTRDMTIwLjI5NyA3MC41MTg1IDEyOS4xNjMgNzkuMzQ0MiAxNDAuMDk5IDc5LjM0NDJDMTUxLjAzNSA3OS4zNDQyIDE1OS45MDEgNzAuNTE4NSAxNTkuOTAxIDU5LjYzMTRDMTU5LjkwMSA0OC43NDQzIDE1MS4wMzUgMzkuOTE4NSAxNDAuMDk5IDM5LjkxODVaTTU5LjkwMSAzOS45MTg1QzQ4Ljk2NDcgMzkuOTE4NSA0MC4wOTkgNDguNzQ0MyA0MC4wOTkgNTkuNjMxNEM0MC4wOTkgNzAuNTE4NSA0OC45NjQ3IDc5LjM0NDIgNTkuOTAxIDc5LjM0NDJDNzAuODM3MyA3OS4zNDQyIDc5LjcwMyA3MC41MTg1IDc5LjcwMyA1OS42MzE0Qzc5LjcwMyA0OC43NDQzIDcwLjgzNzMgMzkuOTE4NSA1OS45MDEgMzkuOTE4NVoiIGZpbGw9IiM2NzNBQjYiLz4KPC9zdmc+Cg==
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Only one copy may fill the form, or two would fight over the same dropdowns
  if (window.__oolioTicketPrefill) return;
  window.__oolioTicketPrefill = true;

  // ---- Labels must match the dropdown text exactly. ----
  // Only tickets in this pipeline get the defaults below; the pipeline itself is never changed.
  const PIPELINE = 'BP | Bepoz Support';
  // Create date is left blank on purpose: HubSpot then stamps the exact time,
  // where a date picked in the form could land at midnight and skew SLA and time-to-close.
  const DEFAULTS = {
    source: 'Internal',
    priority: 'P2 - High',
    brands: ['Bepoz'],
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitFor(fn, timeout = 8000, step = 100) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const v = fn();
      if (v) return v;
      await sleep(step);
    }
    return null;
  }

  // Same property can render twice (pipeline conditional card); use the first visible one.
  const field = (prop) =>
    [...document.querySelectorAll(`[data-test-id="${prop}-input"]`)].find((el) => el.offsetParent !== null) ||
    document.querySelector(`[data-test-id="${prop}-input"]`);

  const text = (el) => (el ? el.textContent.replace(/​/g, '').trim() : '');

  function mousedown(el) {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, button: 0 }));
  }

  function closeDropdowns() {
    const target = document.activeElement || document.body;
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
  }

  const options = () => [...document.querySelectorAll('[role="listbox"] .Select-option')];
  const findOption = (label) => options().find((o) => text(o) === label);

  // Long lists are paged behind "Load more", so fall back to the dropdown's search box.
  async function findOptionWithSearch(label) {
    await waitFor(() => options().length, 3000);
    let opt = findOption(label);
    if (opt) return opt;
    const search = [...document.querySelectorAll('input[type="search"]')].find((i) => i.offsetParent !== null);
    if (!search) return null;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, label);
    search.dispatchEvent(new Event('input', { bubbles: true }));
    return waitFor(() => findOption(label), 4000);
  }

  async function selectOption(prop, label) {
    const btn = field(prop);
    if (!btn) return console.warn('[Ticket prefill] field not found:', prop);
    if (text(btn) === label) return; // already set

    btn.click();
    const opt = await findOptionWithSearch(label);
    if (!opt) {
      closeDropdowns();
      return console.warn(`[Ticket prefill] option "${label}" not found for`, prop);
    }
    mousedown(opt);
    await sleep(300);
    if (btn.getAttribute('data-dropdown-open') === 'true') closeDropdowns();
    await sleep(200);
  }

  // Multi-select: makes the selection exactly `labels` (ticks missing ones, unticks anything else).
  // If none of `labels` is offered, leaves HubSpot's choice alone rather than clearing it.
  async function selectMultiExact(prop, labels) {
    const btn = field(prop);
    if (!btn) return console.warn('[Ticket prefill] field not found:', prop);

    btn.click();
    await waitFor(() => options().length, 3000);
    if (!options().some((o) => labels.includes(text(o)))) {
      closeDropdowns();
      return console.warn(`[Ticket prefill] none of "${labels.join('", "')}" found for`, prop);
    }
    for (const o of options()) {
      const box = o.querySelector('input[type="checkbox"]');
      if (!box) continue;
      const want = labels.includes(text(o));
      if (box.checked !== want) {
        mousedown(o);
        await sleep(300);
      }
    }
    closeDropdowns();
    await sleep(200);
  }

  async function fillDefaults() {
    await selectOption('source_type', DEFAULTS.source);
    await selectOption('ticket_priority', DEFAULTS.priority);
    await selectMultiExact('hs_all_assigned_business_unit_ids', DEFAULTS.brands);

    // Leave the cursor in Ticket name, ready to type, unless it's already filled in.
    const name = field('subject');
    if (name && !name.value) name.focus();
  }

  // Fills in once, when the pipeline reads Bepoz Support: as the panel opens, or when someone picks it.
  // In any other pipeline the form is left alone.
  async function prefill() {
    if (!(await waitFor(() => field('hs_pipeline'), 15000))) return;
    await sleep(400); // let the form settle
    await waitFor(() => text(field('hs_pipeline')) === PIPELINE, Infinity, 500);
    await sleep(600); // picking a pipeline re-renders the dependent fields
    await fillDefaults();
  }

  // The panel iframe is created fresh each time "Create ticket" is clicked, so this runs once per panel.
  prefill().catch((e) => console.error('[Ticket prefill]', e));
})();
