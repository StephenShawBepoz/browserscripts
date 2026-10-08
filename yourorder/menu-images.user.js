// ==UserScript==
// @name         YourOrder: Download menu images
// @namespace    oolio-userscripts
// @version      1.3.0
// @description  Adds a Download menu images button to YourOrder menus. Saves every product image, full size, into one zip with a list of each image's size.
// @author       Stephen Shaw
// @homepageURL  https://github.com/StephenShawBepoz/browserscripts
// @updateURL    https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/yourorder/menu-images.user.js
// @downloadURL  https://raw.githubusercontent.com/StephenShawBepoz/browserscripts/main/yourorder/menu-images.user.js
// @match        https://*.yourorder.io/*
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDIwMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMTQwLjA5OSAwQzE3My4xODEgMCAyMDAgMjYuNjk3OSAyMDAgNTkuNjMxNEMyMDAgOTIuNTY0OSAxNzMuMTgxIDExOS4yNjMgMTQwLjA5OSAxMTkuMjYzQzEyNC42NzcgMTE5LjI2MyAxMTAuNjE2IDExMy40NjEgOTkuOTk4NiAxMDMuOTNDODkuMzgzNyAxMTMuNDYxIDc1LjMyMjkgMTE5LjI2MyA1OS45MDEgMTE5LjI2M0MyNi44MTg2IDExOS4yNjMgMCA5Mi41NjQ5IDAgNTkuNjMxNEMwIDI2LjY5NzkgMjYuODE4NiAwIDU5LjkwMSAwQzc1LjMyMzIgMCA4OS4zODQxIDUuODAxOTUgMTAwLjAwMSAxNS4zMzI5QzExMC42MTYgNS44MDE3NyAxMjQuNjc3IDAgMTQwLjA5OSAwWk0xNDAuMDk5IDM5LjkxODVDMTI5LjE2MyAzOS45MTg1IDEyMC4yOTcgNDguNzQ0MyAxMjAuMjk3IDU5LjYzMTRDMTIwLjI5NyA3MC41MTg1IDEyOS4xNjMgNzkuMzQ0MiAxNDAuMDk5IDc5LjM0NDJDMTUxLjAzNSA3OS4zNDQyIDE1OS45MDEgNzAuNTE4NSAxNTkuOTAxIDU5LjYzMTRDMTU5LjkwMSA0OC43NDQzIDE1MS4wMzUgMzkuOTE4NSAxNDAuMDk5IDM5LjkxODVaTTU5LjkwMSAzOS45MTg1QzQ4Ljk2NDcgMzkuOTE4NSA0MC4wOTkgNDguNzQ0MyA0MC4wOTkgNTkuNjMxNEM0MC4wOTkgNzAuNTE4NSA0OC45NjQ3IDc5LjM0NDIgNTkuOTAxIDc5LjM0NDJDNzAuODM3MyA3OS4zNDQyIDc5LjcwMyA3MC41MTg1IDc5LjcwMyA1OS42MzE0Qzc5LjcwMyA0OC43NDQzIDcwLjgzNzMgMzkuOTE4NSA1OS45MDEgMzkuOTE4NVoiIGZpbGw9IiM2NzNBQjYiLz4KPC9zdmc+Cg==
// @grant        GM_xmlhttpRequest
// @connect      images.yourorder.io
// @connect      amazonaws.com
// @connect      *
// @require      https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  const W = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const clean = s => (s || 'untitled').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);

  // Product images live on images.yourorder.io or on the venue's own S3 bucket (<venue>-assets.s3...amazonaws.com)
  const IMAGE_HOST = /^https:\/\/(images\.yourorder\.io|[\w.-]+\.s3[\w.-]*\.amazonaws\.com)\//;

  // A YourOrder crop is the original's name plus "-<base64 of outW-outH-x-y-w-h>". Strip it to get the full-size upload.
  function original(url) {
    const m = url.match(/-([A-Za-z0-9+\/]+(?:%3D|=){0,2})(\.\w+)$/);
    try {
      if (m && /^[\d.]+(-[\d.]+){5}$/.test(atob(decodeURIComponent(m[1])))) return url.slice(0, m.index) + m[2];
    } catch (e) { /* not base64, so not a crop */ }
    return url;
  }

  // Primary: read the full menu from the Angular scope (covers hidden categories too)
  function collectFromAngular() {
    const ng = W.angular;
    const anchor = document.querySelector('.ws-menu-content-container') || document.querySelector('.ng-scope');
    if (!ng || !anchor) return null;
    let sc = ng.element(anchor).scope();
    while (sc && !sc.displayCategories) sc = sc.$parent;
    if (!sc) return null;
    const abs = u => (typeof sc.imageurl === 'function' ? sc.imageurl(u) : u); // the app's own resolver for relative paths
    const items = new Map();
    const walk = cat => {
      (cat.products || []).forEach(pr => {
        // A few products only have a picture on one of their sizes
        const src = pr.image_url || ((pr.sizes || []).find(s => s.image_url) || {}).image_url;
        if (!src) return;
        const url = original(abs(src));
        if (!items.has(url)) items.set(url, { name: clean(pr.name), url });
      });
      (cat.children_recursive || []).forEach(walk);
    };
    sc.displayCategories.forEach(walk);
    return [...items.values()];
  }

  // Fallback: scrape whatever is rendered on screen (images load as you scroll, so scroll to the bottom first)
  function collectFromDom() {
    const items = new Map();
    document.querySelectorAll('*').forEach(el => {
      const m = getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
      let url = el.tagName === 'IMG' ? (el.currentSrc || el.src) : m && m[1];
      if (!url || !IMAGE_HOST.test(url)) return;
      url = original(url);
      if (items.has(url)) return;
      const card = el.closest('.ws-menu-content-container');
      const name = card ? card.innerText.split('\n')[0] : url.split('/').pop().replace(/\.\w+$/, '');
      items.set(url, { name: clean(name), url });
    });
    return [...items.values()];
  }

  function fetchBytes(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET', url, responseType: 'arraybuffer', timeout: 30000,
        onload: r => (r.status === 200 ? resolve(new Uint8Array(r.response)) : reject(new Error(r.status))),
        onerror: reject,
        ontimeout: () => reject(new Error('timeout')),
      });
    });
  }

  async function pixelSize(bytes) {
    try {
      const bmp = await createImageBitmap(new Blob([bytes]));
      const size = [bmp.width, bmp.height];
      bmp.close();
      return size;
    } catch (e) {
      return ['', ''];
    }
  }

  async function run(btn) {
    const items = collectFromAngular() || collectFromDom();
    if (!items.length) { alert('No product images found.'); return; }

    const files = {};
    const failed = [];
    const sizes = [];
    let done = 0;
    const queue = [...items];

    const worker = async () => {
      while (queue.length) {
        const it = queue.shift();
        const ext = (it.url.split('?')[0].match(/\.(\w{3,4})$/) || [, 'jpg'])[1].toLowerCase();
        let path = `${it.name}.${ext}`, n = 2;
        while (files[path]) path = `${it.name} (${n++}).${ext}`;
        files[path] = true; // reserve the name
        try {
          files[path] = await fetchBytes(it.url);
          const [w, h] = await pixelSize(files[path]);
          sizes.push({ path, w, h, kb: Math.round(files[path].length / 1024), url: it.url });
        } catch (e) {
          delete files[path];
          failed.push(`${it.url}  (${e.message || e})`);
        }
        btn.textContent = `Downloading ${++done}/${items.length}...`;
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));

    if (failed.length) files['failed.txt'] = fflate.strToU8(failed.join('\n'));

    // Smallest first, so the ones worth chasing the venue for are at the top
    const q = s => `"${String(s).replace(/"/g, '""')}"`;
    sizes.sort((a, b) => (Math.max(a.w, a.h) || 0) - (Math.max(b.w, b.h) || 0));
    files['image-sizes.csv'] = fflate.strToU8('﻿File,Width,Height,KB,URL\n' +
      sizes.map(s => [q(s.path), s.w, s.h, s.kb, q(s.url)].join(',')).join('\n'));

    btn.textContent = 'Zipping...';
    const zipped = fflate.zipSync(files, { level: 0 }); // images are already compressed
    const blob = new Blob([zipped], { type: 'application/zip' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${location.hostname.split('.')[0]}-menu-images.zip`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
    btn.textContent = failed.length ? `Done (${failed.length} failed)` : `Done (${items.length} images)`;
  }

  function addButton() {
    if (document.getElementById('oolio-yo-img-dl')) return;
    const btn = document.createElement('button');
    btn.id = 'oolio-yo-img-dl';
    btn.textContent = 'Download menu images';
    Object.assign(btn.style, {
      position: 'fixed', bottom: '16px', left: '16px', zIndex: 999999,
      padding: '10px 14px', background: '#673AB6', color: '#fff', border: 'none',
      borderRadius: '8px', font: '600 13px Inter, system-ui, sans-serif', cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,.3)',
    });
    btn.onclick = async () => {
      btn.disabled = true;
      try { await run(btn); } catch (e) { console.error(e); btn.textContent = 'Error, see console'; }
      setTimeout(() => { btn.disabled = false; btn.textContent = 'Download menu images'; }, 4000);
    };
    document.body.appendChild(btn);
  }

  // The first copy, installed by hand as "YourOrder - Download Menu Images", adds its own button. Remove it so only this one shows.
  let ticks = 0;
  const wait = setInterval(() => {
    if (!document.body) return;
    addButton();
    const old = document.getElementById('yo-img-dl');
    if (old) { old.remove(); console.info('Oolio YourOrder images: delete the old "YourOrder - Download Menu Images" script in Tampermonkey.'); }
    if (++ticks > 20) clearInterval(wait);
  }, 500);
})();
