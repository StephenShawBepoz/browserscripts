// ==UserScript==
// @name         HubSpot: Prefill meeting from ticket
// @namespace    oolio-userscripts
// @version      2.4.0
// @description  Book meeting button on Help Desk tickets and on contact, company, deal and ticket records; prefills title with the ticket or deal name and adds a link to the Attendee description.
// @match        https://app.hubspot.com/help-desk/*
// @match        https://app.hubspot.com/contacts/*
// @match        https://app.hubspot.com/calendar-select-iframe/*
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTQwLjA5OSAwQzE3My4xODEgMCAyMDAgMjYuNjk3OSAyMDAgNTkuNjMxNEMyMDAgOTIuNTY0OSAxNzMuMTgxIDExOS4yNjMgMTQwLjA5OSAxMTkuMjYzQzEyNC42NzcgMTE5LjI2MyAxMTAuNjE2IDExMy40NjEgOTkuOTk4NiAxMDMuOTNDODkuMzgzNyAxMTMuNDYxIDc1LjMyMjkgMTE5LjI2MyA1OS45MDEgMTE5LjI2M0MyNi44MTg2IDExOS4yNjMgMCA5Mi41NjQ5IDAgNTkuNjMxNEMwIDI2LjY5NzkgMjYuODE4NiAwIDU5LjkwMSAwQzc1LjMyMzIgMCA4OS4zODQxIDUuODAxOTUgMTAwLjAwMSAxNS4zMzI5QzExMC42MTYgNS44MDE3NyAxMjQuNjc3IDAgMTQwLjA5OSAwWk0xNDAuMDk5IDM5LjkxODVDMTI5LjE2MyAzOS45MTg1IDEyMC4yOTcgNDguNzQ0MyAxMjAuMjk3IDU5LjYzMTRDMTIwLjI5NyA3MC41MTg1IDEyOS4xNjMgNzkuMzQ0MiAxNDAuMDk5IDc5LjM0NDJDMTUxLjAzNSA3OS4zNDQyIDE1OS45MDEgNzAuNTE4NSAxNTkuOTAxIDU5LjYzMTRDMTU5LjkwMSA0OC43NDQzIDE1MS4wMzUgMzkuOTE4NSAxNDAuMDk5IDM5LjkxODVaTTU5LjkwMSAzOS45MTg1QzQ4Ljk2NDcgMzkuOTE4NSA0MC4wOTkgNDguNzQ0MyA0MC4wOTkgNTkuNjMxNEM0MC4wOTkgNzAuNTE4NSA0OC45NjQ3IDc5LjM0NDIgNTkuOTAxIDc5LjM0NDJDNzAuODM3MyA3OS4zNDQyIDc5LjcwMyA3MC41MTg1IDc5LjcwMyA1OS42MzE0Qzc5LjcwMyA0OC43NDQzIDcwLjgzNzMgMzkuOTE4NSA1OS45MDEgMzkuOTE4NVoiIGZpbGw9IiM2NzNBQjYiLz4KPC9zdmc+Cg==
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Meeting title format. Invites go to every attendee, customers included.
  // Examples: (t) => t.name   or   (t) => `Bepoz: ${t.name}`
  const TITLE_FORMAT = (t) => t.name;

  /* ---------------- Oolio brand styles ---------------- */
  function injectBrand() {
    if (document.getElementById('tm-oolio-style')) return;

    // Inter, the Oolio typeface. If HubSpot blocks the font, the system font is used instead.
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap';
    document.head.appendChild(font);

    const css = document.createElement('style');
    css.id = 'tm-oolio-style';
    css.textContent = `
      .tm-oolio { --oolio-purple:#673AB6; --oolio-deep:#5E35B1; --oolio-blue:#03A9F4; --oolio-charcoal:#222222;
        --oolio-grey:#808080; --oolio-tint:#F3EEF9;
        font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }

      #tm-book-meeting { position:fixed; right:24px; bottom:90px; z-index:2147483000; display:none;
        align-items:center; gap:10px; height:44px; padding:0 16px 0 14px; border:0; border-radius:999px; cursor:pointer;
        background:var(--oolio-purple); color:#fff; font-size:14px; font-weight:700; letter-spacing:-0.01em;
        box-shadow:0 6px 20px rgba(103,58,182,.35), 0 1px 3px rgba(34,34,34,.2); transition:background .15s, transform .15s; }
      #tm-book-meeting:hover { background:var(--oolio-deep); transform:translateY(-1px); }
      #tm-book-meeting:focus-visible { outline:2px solid var(--oolio-blue); outline-offset:2px; }
      #tm-book-meeting svg { width:16px; height:16px; flex:none; display:block; }
      #tm-book-meeting .tm-btn-mark svg { width:24px; height:auto; }
      #tm-book-meeting .tm-btn-sep { width:1px; height:18px; background:rgba(255,255,255,.35); }

      #tm-overlay { position:fixed; inset:0; z-index:2147483001; background:rgba(34,34,34,.55); }

      #tm-card { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:300px;
        padding:28px 24px 24px; border-radius:16px; background:#fff; text-align:center;
        box-shadow:0 12px 40px rgba(0,0,0,.25); border-top:4px solid var(--oolio-purple); }
      #tm-card .tm-mark { width:44px; height:auto; display:block; margin:0 auto 16px; }
      #tm-card .tm-title { margin:0 0 6px; color:var(--oolio-charcoal); font-size:16px; font-weight:900; }
      #tm-card .tm-msg { margin:0; color:var(--oolio-grey); font-size:13px; font-weight:400; line-height:1.45; }
      #tm-card .tm-bar { height:4px; margin-top:18px; border-radius:4px; overflow:hidden; background:var(--oolio-tint); }
      #tm-card .tm-bar i { display:block; width:40%; height:100%; border-radius:4px;
        background:linear-gradient(90deg, var(--oolio-purple), var(--oolio-blue));
        animation:tm-slide 1.1s ease-in-out infinite; }
      #tm-card.tm-error .tm-bar { display:none; }
      #tm-card.tm-error { border-top-color:var(--oolio-grey); }
      @keyframes tm-slide { 0% { transform:translateX(-100%); } 100% { transform:translateX(250%); } }

      #tm-close { position:absolute; top:14px; right:16px; z-index:2; display:flex; align-items:center;
        justify-content:center; width:36px; height:36px; padding:0; border:0; border-radius:50%; cursor:pointer;
        background:#fff; color:var(--oolio-purple); box-shadow:0 2px 8px rgba(0,0,0,.2); transition:background .15s; }
      #tm-close:hover { background:var(--oolio-tint); }
      #tm-close:focus-visible { outline:2px solid var(--oolio-blue); outline-offset:2px; }
      #tm-close svg { width:18px; height:18px; }
    `;
    document.head.appendChild(css);
  }

  // Lucide icons (line style, 2px stroke) and the Oolio logomark
  const ICON_CALENDAR_PLUS =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M8 2v4"/><path d="M16 2v4"/><path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/>' +
    '<path d="M3 10h18"/><path d="M16 19h6"/><path d="M19 16v6"/></svg>';
  const ICON_X =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  const OOLIO_MARK =
    '<svg class="tm-mark" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-label="Oolio">' +
    '<path fill="#673AB6" fill-rule="evenodd" clip-rule="evenodd" d="M140.099 0C173.181 0 200 26.6979 200 59.6314C200 92.5649 173.181 119.263 140.099 119.263C124.677 119.263 110.616 113.461 99.9986 103.93C89.3837 113.461 75.3229 119.263 59.901 119.263C26.8186 119.263 0 92.5649 0 59.6314C0 26.6979 26.8186 0 59.901 0C75.3232 0 89.3841 5.80195 100.001 15.3329C110.616 5.80177 124.677 0 140.099 0ZM140.099 39.9185C129.163 39.9185 120.297 48.7443 120.297 59.6314C120.297 70.5185 129.163 79.3442 140.099 79.3442C151.035 79.3442 159.901 70.5185 159.901 59.6314C159.901 48.7443 151.035 39.9185 140.099 39.9185ZM59.901 39.9185C48.9647 39.9185 40.099 48.7443 40.099 59.6314C40.099 70.5185 48.9647 79.3442 59.901 79.3442C70.8373 79.3442 79.703 70.5185 79.703 59.6314C79.703 48.7443 70.8373 39.9185 59.901 39.9185Z"/></svg>';

  const OOLIO_MARK_WHITE = OOLIO_MARK.replace('class="tm-mark" ', '').replace('fill="#673AB6"', 'fill="#fff"');

  // Floating "Book meeting" button. HubSpot is a single-page app, so the URL is
  // re-checked every second and the button only shows when isActive() is true.
  function addButton(onClick, isActive) {
    injectBrand();
    const btn = document.createElement('button');
    btn.id = 'tm-book-meeting';
    btn.className = 'tm-oolio';
    btn.type = 'button';
    btn.innerHTML = '<span class="tm-btn-mark">' + OOLIO_MARK_WHITE + '</span><span class="tm-btn-sep"></span>' +
      ICON_CALENDAR_PLUS + '<span>Book meeting</span>';
    btn.addEventListener('click', onClick);
    document.body.appendChild(btn);
    setInterval(() => { btn.style.display = isActive() ? 'inline-flex' : 'none'; }, 1000);
    return btn;
  }

  /* ---------------- Record pages: "Book meeting" button ---------------- */
  // Contact, company, deal and ticket records already have HubSpot's own
  // "Schedule a meeting" button, so this just presses it for you.
  function recordPage() {
    const isRecord = () =>
      /^\/contacts\/\d+\/(?:record\/0-[1235]|contact|company|deal|ticket)\/\d+/.test(location.pathname);

    const btn = addButton(() => {
      if (btn.dataset.tmBusy) return;
      btn.dataset.tmBusy = '1';
      let tries = 0;
      const timer = setInterval(() => {
        const schedBtn = document.querySelector('[data-selenium-test="create-engagement-schedule-button"]');
        if (schedBtn) {
          clearInterval(timer);
          delete btn.dataset.tmBusy;
          schedBtn.click();
        } else if (++tries > 20) {
          clearInterval(timer);
          delete btn.dataset.tmBusy;
          alert('Couldn\'t find the meeting button on this record. Try again once the page has finished loading.');
        }
      }, 250);
    }, isRecord);
  }

  /* ---------------- Help Desk: "Book meeting" button + modal ---------------- */
  function helpDesk() {
    const getTicket = () => {
      const m = location.pathname.match(/^\/help-desk\/(\d+)\/(?:.*\/)?ticket\/(\d+)/);
      return m ? { portal: m[1], id: m[2] } : null;
    };

    addButton(open, getTicket);

    let overlay = null;
    let meetingOpen = false;

    function close(force) {
      if (!overlay) return;
      if (!force && meetingOpen && !confirm('Close without scheduling? Anything you have entered will be lost.')) return;
      overlay.remove();
      overlay = null;
      meetingOpen = false;
      document.removeEventListener('keydown', onEsc);
    }
    function onEsc(e) { if (e.key === 'Escape') close(); }

    function open() {
      const t = getTicket();
      if (!t || overlay) return;

      overlay = document.createElement('div');
      overlay.id = 'tm-overlay';
      overlay.className = 'tm-oolio';
      overlay.innerHTML =
        '<div id="tm-card">' + OOLIO_MARK +
        '<p class="tm-title">Opening the scheduler</p>' +
        '<p class="tm-msg">Hang tight, this takes a few seconds.</p>' +
        '<div class="tm-bar"><i></i></div></div>' +
        '<button id="tm-close" type="button" title="Close (Esc)" aria-label="Close">' + ICON_X + '</button>';

      const frame = document.createElement('iframe');
      frame.src = `/contacts/${t.portal}/record/0-5/${t.id}`;
      frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;opacity:0;transition:opacity .2s';
      overlay.appendChild(frame);
      document.body.appendChild(overlay);
      overlay.querySelector('#tm-close').addEventListener('click', () => close());
      document.addEventListener('keydown', onEsc);
      frame.addEventListener('load', () => {
        try { frame.contentDocument.addEventListener('keydown', onEsc); } catch (e) { /* ignore */ }
      });

      const card = overlay.querySelector('#tm-card');
      const showError = (msg) => {
        if (!card) return;
        card.classList.add('tm-error');
        card.querySelector('.tm-title').textContent = 'Something went wrong';
        card.querySelector('.tm-msg').textContent = msg;
      };

      // Wait for the ticket record to load, click "Schedule a meeting", then close when the scheduler goes away
      let clicked = false, seenScheduler = false, tries = 0, clickedAt = 0;
      const timer = setInterval(() => {
        if (!overlay) return clearInterval(timer);
        tries++;
        let d;
        try { d = frame.contentDocument; } catch (e) { return; }
        if (!d) return;

        if (!clicked) {
          const schedBtn = d.querySelector('[data-selenium-test="create-engagement-schedule-button"]');
          if (schedBtn) { schedBtn.click(); clicked = true; clickedAt = tries; }
          else if (tries > 60) { clearInterval(timer); showError('Couldn\'t find the meeting button. Press Esc or × to close.'); }
          return;
        }

        const sched = [...d.querySelectorAll('iframe')].find((f) => f.src.includes('expanded-scheduler'));
        if (sched && !seenScheduler) {
          seenScheduler = true;
          meetingOpen = true;
          frame.style.opacity = '1';
          if (card) card.style.display = 'none';
        }
        if (!seenScheduler && tries - clickedAt > 40) {
          clearInterval(timer);
          showError('The Schedule window didn\'t open. Press Esc or × to close.');
        }
        // Only close once the scheduler is removed (scheduled or cancelled).
        // Minimising only hides it, so that leaves the window open.
        if (seenScheduler && !sched) {
          clearInterval(timer);
          meetingOpen = false;
          setTimeout(() => close(true), 800);
        }
      }, 500);
    }
  }

  /* ---------------- Scheduler iframe: prefill title + attendee description ---------------- */
  function scheduler() {
    // The parent is the record page (either the normal tab or the Help Desk modal).
    // Only tickets and deals are prefilled; contacts and companies are left as HubSpot sets them.
    const TYPES = { '0-5': 'Ticket', ticket: 'Ticket', '0-3': 'Deal', deal: 'Deal' };
    const TYPE_IDS = { Ticket: '0-5', Deal: '0-3' };

    function getTicket() {
      try {
        const host = window.parent;
        const m = host.location.pathname.match(/^\/contacts\/(\d+)\/(?:record\/(0-\d+)|(ticket|deal))\/(\d+)/);
        const label = m && TYPES[m[2] || m[3]];
        if (!label) return null;
        const titleEl = host.document.querySelector('[data-selenium-test="highlightTitle"]');
        const name = (titleEl ? titleEl.innerText : host.document.title).trim();
        const url = `${location.origin}/contacts/${m[1]}/record/${TYPE_IDS[label]}/${m[4]}`;
        return name ? { name, url, label } : null;
      } catch (e) {
        return null;
      }
    }

    // The collapsed description box opens on Enter (synthetic clicks are ignored)
    function pressEnter(el) {
      el.focus();
      const opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
      el.dispatchEvent(new KeyboardEvent('keydown', opts));
      el.dispatchEvent(new KeyboardEvent('keyup', opts));
    }

    function setReactInput(input, value) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function escapeHtml(s) {
      return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    function run() {
      const ticket = getTicket();
      if (!ticket) return;

      const title = document.querySelector('input[data-test-id="title-input"]');
      if (title && !title.dataset.tmDone) {
        title.dataset.tmDone = '1';
        if (!title.value.trim()) setReactInput(title, TITLE_FORMAT(ticket));
      }

      const desc = document.querySelector('[data-selenium-test="attendee-description-editor"], [data-test-id="attendee-description-editor"]');
      if (!desc || desc.dataset.tmDone) return;

      const editor = desc.querySelector('.ProseMirror[contenteditable="true"]');
      if (!editor) {
        const placeholder = desc.querySelector('[data-test-id="stackable-editable-description"]');
        if (placeholder && !placeholder.dataset.tmClicked) {
          placeholder.dataset.tmClicked = '1';
          pressEnter(placeholder);
        }
        return;
      }

      desc.dataset.tmDone = '1';
      if (editor.innerHTML.includes(ticket.url)) return;

      editor.focus();
      // Put the cursor at the end so any existing text stays first
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      // Show the full URL as the link text. HubSpot drops the href when it sends
      // the invite, so a bare URL is what lets Outlook make it clickable.
      const dt = new DataTransfer();
      dt.setData('text/html',
        `<p>${ticket.label}: ${escapeHtml(ticket.name)}<br><a href="${ticket.url}">${ticket.url}</a></p>`);
      dt.setData('text/plain', `${ticket.label}: ${ticket.name}\n${ticket.url}`);
      editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      if (title) title.focus();
    }

    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      setTimeout(() => { pending = false; run(); }, 250);
    }).observe(document.body, { childList: true, subtree: true });
    run();
  }

  /* ---------------- Start ---------------- */
  const path = location.pathname;
  if (path.startsWith('/help-desk/') && window.top === window) helpDesk();
  // Skip the record page loaded inside the Help Desk modal, which has its own button
  else if (path.startsWith('/contacts/') && window.top === window) recordPage();
  else if (path.startsWith('/calendar-select-iframe/')) scheduler();
})();
