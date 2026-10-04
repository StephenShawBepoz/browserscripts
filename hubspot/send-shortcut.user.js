// ==UserScript==
// @name         HubSpot: Cmd/Ctrl + Enter to send
// @namespace    oolio-userscripts
// @version      1.2.0
// @description  Press Cmd + Enter (Mac) or Ctrl + Enter (Windows) in a HubSpot comment, note, email or task to click its Send, Save, Create or OK button.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/send-shortcut.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/hubspot/send-shortcut.user.js
// @match        https://app.hubspot.com/*
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTQwLjA5OSAwQzE3My4xODEgMCAyMDAgMjYuNjk3OSAyMDAgNTkuNjMxNEMyMDAgOTIuNTY0OSAxNzMuMTgxIDExOS4yNjMgMTQwLjA5OSAxMTkuMjYzQzEyNC42NzcgMTE5LjI2MyAxMTAuNjE2IDExMy40NjEgOTkuOTk4NiAxMDMuOTNDODkuMzgzNyAxMTMuNDYxIDc1LjMyMjkgMTE5LjI2MyA1OS45MDEgMTE5LjI2M0MyNi44MTg2IDExOS4yNjMgMCA5Mi41NjQ5IDAgNTkuNjMxNEMwIDI2LjY5NzkgMjYuODE4NiAwIDU5LjkwMSAwQzc1LjMyMzIgMCA4OS4zODQxIDUuODAxOTUgMTAwLjAwMSAxNS4zMzI5QzExMC42MTYgNS44MDE3NyAxMjQuNjc3IDAgMTQwLjA5OSAwWk0xNDAuMDk5IDM5LjkxODVDMTI5LjE2MyAzOS45MTg1IDEyMC4yOTcgNDguNzQ0MyAxMjAuMjk3IDU5LjYzMTRDMTIwLjI5NyA3MC41MTg1IDEyOS4xNjMgNzkuMzQ0MiAxNDAuMDk5IDc5LjM0NDJDMTUxLjAzNSA3OS4zNDQyIDE1OS45MDEgNzAuNTE4NSAxNTkuOTAxIDU5LjYzMTRDMTU5LjkwMSA0OC43NDQzIDE1MS4wMzUgMzkuOTE4NSAxNDAuMDk5IDM5LjkxODVaTTU5LjkwMSAzOS45MTg1QzQ4Ljk2NDcgMzkuOTE4NSA0MC4wOTkgNDguNzQ0MyA0MC4wOTkgNTkuNjMxNEM0MC4wOTkgNzAuNTE4NSA0OC45NjQ3IDc5LjM0NDIgNTkuOTAxIDc5LjM0NDJDNzAuODM3MyA3OS4zNDQyIDc5LjcwMyA3MC41MTg1IDc5LjcwMyA1OS42MzE0Qzc5LjcwMyA0OC43NDQzIDcwLjgzNzMgMzkuOTE4NSA1OS45MDEgMzkuOTE4NVoiIGZpbGw9IiM2NzNBQjYiLz4KPC9zdmc+Cg==
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Buttons the shortcut may press, best match first. Matched against the button's
  // visible text, so HubSpot renaming a button only needs a change here.
  const ACTIONS = [
    /^send( now)?$/i,
    /^reply$/i,
    /^(add |post )?comment$/i,
    /^(save|save note|save task|create|create note|create task|log activity|log (call|email|meeting|note))$/i,
    /^(ok|done|confirm|apply)$/i,
  ];
  // Never press these, even if they sit next to the editor
  const NEVER = /cancel|discard|delete|remove|schedule|close|back/i;

  // How far up from the text box to look for the button (keeps it to the same composer)
  const MAX_LEVELS = 12;

  function isEditable(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    return el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|search|email|url)$/i.test(el.type || 'text'));
  }

  function isUsable(btn) {
    if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') return false;
    const r = btn.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const s = getComputedStyle(btn);
    return s.visibility !== 'hidden' && s.display !== 'none';
  }

  const labelOf = (btn) => (btn.innerText || btn.value || btn.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');

  // Walk up from the text box. At the first level that contains a usable action button,
  // pick the best one there. Stopping at the nearest level keeps us inside the same composer.
  // Stops as soon as the search area reaches a different text box, so a button that
  // belongs to another comment or email can never be pressed.
  function findAction(target) {
    const from = target.closest('[contenteditable="true"]') || target;
    let node = from;
    for (let i = 0; node && i < MAX_LEVELS; i++, node = node.parentElement) {
      const otherEditor = [...node.querySelectorAll('[contenteditable="true"], textarea')]
        .some((ed) => ed !== from && !from.contains(ed) && !ed.contains(from));
      if (otherEditor) return null;
      const buttons = [...node.querySelectorAll('button, [role="button"], input[type="submit"]')]
        .filter((b) => isUsable(b) && !NEVER.test(labelOf(b)));
      for (const rx of ACTIONS) {
        const hit = buttons.filter((b) => rx.test(labelOf(b)));
        if (hit.length === 1) return hit[0];
        if (hit.length > 1) return null; // ambiguous, do nothing rather than guess
      }
    }
    return null;
  }

  /* ---------- Small Oolio-branded toast so you know what was pressed ---------- */
  let toastHost = null;
  let toastTimer;
  function toast(text, ok) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.id = 'oolio-send-shortcut-toast';
      const root = toastHost.attachShadow({ mode: 'open' });
      root.innerHTML = `
        <style>
          :host { all: initial; }
          .t { position: fixed; left: 50%; bottom: 28px; transform: translate(-50%, 8px); z-index: 2147483002;
            display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 12px;
            background: #222; color: #fff; opacity: 0; pointer-events: none; transition: opacity .15s, transform .15s;
            font: 500 13px Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
            box-shadow: 0 6px 20px rgba(34,34,34,.25); border-left: 4px solid #673AB6; }
          .t.show { opacity: 1; transform: translate(-50%, 0); }
          .t.err { border-left-color: #808080; }
          kbd { font: 700 12px Inter, system-ui, sans-serif; padding: 2px 6px; border-radius: 6px; background: #673AB6; color: #fff; }
        </style>
        <div class="t" role="status" aria-live="polite"><kbd></kbd><span></span></div>`;
      root.querySelector('kbd').textContent = /Mac/i.test(navigator.platform) ? '⌘ Enter' : 'Ctrl Enter';
      document.body.appendChild(toastHost);
    }
    const t = toastHost.shadowRoot.querySelector('.t');
    t.querySelector('span').textContent = text;
    t.classList.toggle('err', !ok);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ok ? 1600 : 3000);
  }

  document.addEventListener('keydown', (e) => {
    // Quick actions now includes this shortcut; when it's installed, this script steps aside
    if (document.documentElement.dataset.oqaShortcut) return;
    if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey || e.repeat || e.isComposing) return;
    const target = e.composedPath()[0];
    if (!isEditable(target)) return;

    const btn = findAction(target);
    // Nothing to press here: stay quiet and leave the key to HubSpot, which handles it in some boxes itself
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    btn.click();
    toast(labelOf(btn), true);
  }, true); // capture, so the editor doesn't swallow the key first
})();
