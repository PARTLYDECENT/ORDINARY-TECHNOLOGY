/* =====================================================================
   ORDINARY TECHNOLOGY // 2026 ENHANCEMENT LAYER (JS)
   - Floating command dock with scrollspy + spring indicator
   - ⌘K / Ctrl+K / "/" command palette (native <dialog>)
   - Live headline ticker sourced from the page's own dispatches
   - Pointer-tracked spotlight cards + magnetic controls
   - View Transitions for tab filtering and shared-element dossier open
   - Newsroom bento (auto-featured lead story), metric count-ups
   Everything is progressive: if a feature is unsupported it no-ops.
   ===================================================================== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const canVT = typeof document.startViewTransition === 'function' && !reduceMotion;

  const withTransition = (fn) => {
    if (!canVT) { fn(); return Promise.resolve(); }
    return document.startViewTransition(fn).finished.catch(() => {});
  };

  /* ------------------------------------------------------------------
     1. Scroll progress rail (CSS scroll-timeline, JS fallback)
     ------------------------------------------------------------------ */
  function initProgress() {
    const bar = document.createElement('div');
    bar.id = 'ot-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.prepend(bar);
    if (CSS.supports('animation-timeline: scroll()')) return;
    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty('--ot-progress', max > 0 ? (scrollY / max).toFixed(4) : 0);
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------
     2. Command dock + scrollspy
     ------------------------------------------------------------------ */
  const archiveSections = $$('section#data-archives');
  const SECTIONS = [
    { label: 'OS', el: $('#tentacle-os') },
    { label: 'Breakthroughs', el: $('#interactive-showcase') },
    { label: 'Dispatches', el: archiveSections[0] },
    { label: 'Orbital', el: archiveSections[1] },
    { label: 'Transmission', el: $('#transmission-hub') },
    { label: 'Neural Hub', el: $('#neural-hub-2026') },
    { label: 'Aerospace', el: $('#aerospace-launchpad') }
  ].filter((s) => s.el);

  function initDock() {
    const dock = document.createElement('nav');
    dock.id = 'ot-dock';
    dock.setAttribute('aria-label', 'Primary');
    dock.innerHTML = `
      <a class="ot-dock-brand" href="#" data-top><span class="ot-glyph"></span><span>ORDINARY//TECH</span></a>
      <div class="ot-dock-links" role="list">
        <span class="ot-dock-indicator" aria-hidden="true"></span>
        ${SECTIONS.map((s, i) => `<button type="button" role="listitem" class="ot-dock-link" data-idx="${i}">${s.label}</button>`).join('')}
      </div>
      <div class="ot-dock-right">
        <span id="ot-dock-clock" aria-label="UTC time">--:--:-- UTC</span>
        <button type="button" class="ot-kbd-btn" data-palette aria-label="Open command palette">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <span>Search</span><kbd>${/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'} K</kbd>
        </button>
      </div>`;
    document.body.appendChild(dock);

    const links = $$('.ot-dock-link', dock);
    const indicator = $('.ot-dock-indicator', dock);
    const linksWrap = $('.ot-dock-links', dock);

    const moveIndicator = (btn) => {
      if (!btn) { indicator.style.setProperty('--ind-o', 0); return; }
      indicator.style.setProperty('--ind-x', `${btn.offsetLeft}px`);
      indicator.style.setProperty('--ind-w', `${btn.offsetWidth}px`);
      indicator.style.setProperty('--ind-o', 1);
      const l = btn.offsetLeft, r = l + btn.offsetWidth;
      if (l < linksWrap.scrollLeft || r > linksWrap.scrollLeft + linksWrap.clientWidth) {
        linksWrap.scrollTo({ left: l - 20, behavior: 'smooth' });
      }
    };

    links.forEach((btn) => btn.addEventListener('click', () => {
      SECTIONS[+btn.dataset.idx].el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }));
    $('[data-top]', dock).addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); });
    $('[data-palette]', dock).addEventListener('click', openPalette);

    // Scrollspy: pick the section whose box crosses the 35% viewport line
    let active = -1;
    const spy = () => {
      const line = innerHeight * 0.35;
      let idx = -1;
      SECTIONS.forEach((s, i) => {
        const r = s.el.getBoundingClientRect();
        if (r.top <= line && r.bottom > line) idx = i;
      });
      if (idx !== active) {
        active = idx;
        links.forEach((b, i) => b.classList.toggle('is-active', i === idx));
        moveIndicator(links[idx]);
      }
    };

    // Auto-hide on scroll-down, reveal on scroll-up (Apple / Vercel pattern)
    let lastY = scrollY, ticking = false;
    const onScroll = () => {
      const y = scrollY;
      const down = y > lastY + 6, up = y < lastY - 6;
      if (down && y > 400) dock.classList.add('ot-hidden');
      else if (up || y < 200) dock.classList.remove('ot-hidden');
      if (Math.abs(y - lastY) > 6) lastY = y;
      spy();
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    addEventListener('resize', () => moveIndicator(links[active]));
    dock.addEventListener('pointerenter', () => dock.classList.remove('ot-hidden'));
    spy();

    // Live UTC clock
    const clock = $('#ot-dock-clock');
    const tick = () => {
      const d = new Date();
      clock.textContent = `${d.toISOString().slice(11, 19)} UTC`;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ------------------------------------------------------------------
     3. Live headline ticker
     ------------------------------------------------------------------ */
  function initTicker() {
    const anchor = $('.announcement-banner');
    if (!anchor) return;
    const items = [];
    const dossiers = window.INTEL_DOSSIERS || (typeof INTEL_DOSSIERS !== 'undefined' ? INTEL_DOSSIERS : null);
    if (dossiers) {
      Object.entries(dossiers).forEach(([key, d]) => {
        const tag = (d.meta || '').split('//')[0].trim();
        items.push({ tag, text: d.title, action: () => window.openIntelDossier && window.openIntelDossier(key) });
      });
    }
    $$('.archive-entry').forEach((a) => {
      const t = $('.entry-title', a);
      const tag = $('.entry-type', a);
      if (t) items.push({ tag: tag ? tag.textContent.split(':')[0].trim() : 'LOG', text: t.textContent.trim(), action: () => a.scrollIntoView({ behavior: 'smooth', block: 'center' }) });
    });
    if (!items.length) return;

    const bar = document.createElement('div');
    bar.id = 'ot-ticker';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Live headlines');
    const render = () => items.map((it, i) => `<span class="ot-ticker-item" data-i="${i}"><b>${it.tag}</b>${it.text}</span>`).join('');
    bar.innerHTML = `<div class="ot-ticker-label">LIVE // OCT 2026</div>
      <div class="ot-ticker-viewport"><div class="ot-ticker-track">${render()}<span aria-hidden="true" style="display:contents">${render()}</span></div></div>`;
    bar.style.setProperty('--ot-ticker-dur', `${Math.max(50, items.length * 9)}s`);
    anchor.after(bar);
    bar.addEventListener('click', (e) => {
      const el = e.target.closest('.ot-ticker-item');
      if (el) items[+el.dataset.i].action();
    });
  }

  /* ------------------------------------------------------------------
     4. Spotlight + magnetic
     ------------------------------------------------------------------ */
  const SPOT_SELECTOR = '.showcase-item, .archive-entry, .hub-category, .project-card, .tool-card, .mission-critical-banner';

  function attachSpot(el) {
    if (el.dataset.otSpot) return;
    el.dataset.otSpot = '1';
    el.classList.add('ot-spot-host');
    const s = document.createElement('span');
    s.className = 'ot-spot';
    s.setAttribute('aria-hidden', 'true');
    el.appendChild(s);
  }

  function initSpotlight() {
    if (!finePointer) return;
    $$(SPOT_SELECTOR).forEach(attachSpot);
    let raf = 0, last = null;
    document.addEventListener('pointermove', (e) => {
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const host = last.target.closest && last.target.closest('.ot-spot-host');
        if (!host) return;
        const r = host.getBoundingClientRect();
        host.style.setProperty('--mx', `${last.clientX - r.left}px`);
        host.style.setProperty('--my', `${last.clientY - r.top}px`);
      });
    }, { passive: true });
  }

  function initMagnetic() {
    if (!finePointer || reduceMotion) return;
    const targets = $$('.showcase-button, .news-tab-btn, .container .button, .launch-btn, .mission-btn, .ot-kbd-btn');
    targets.forEach((el) => {
      el.classList.add('ot-magnetic');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.22;
        const y = (e.clientY - (r.top + r.height / 2)) * 0.32;
        el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; });
    });
  }

  /* ------------------------------------------------------------------
     5. Bento lead story + view-transition-powered filters
     ------------------------------------------------------------------ */
  function markFeatured() {
    const grid = $('#main-showcase-grid');
    if (!grid) return;
    const cards = $$('.showcase-item', grid);
    cards.forEach((c) => c.classList.remove('ot-featured'));
    const first = cards.find((c) => !c.classList.contains('tab-hidden'));
    if (first) first.classList.add('ot-featured');
  }

  function nameCards(selector) {
    $$(selector).forEach((el, i) => {
      if (!el.style.viewTransitionName) el.style.viewTransitionName = `ot-card-${selector.length}-${i}`;
    });
  }

  function initFilters() {
    nameCards('#main-showcase-grid .showcase-item');
    $$('section#data-archives').forEach((sec, si) => {
      $$('.archive-entry', sec).forEach((el, i) => { el.style.viewTransitionName = `ot-arch-${si}-${i}`; });
    });

    const origShowcase = window.filterShowcaseTabs;
    if (typeof origShowcase === 'function') {
      window.filterShowcaseTabs = function (cat, btn) {
        withTransition(() => { origShowcase(cat, btn); markFeatured(); });
      };
    }
    const origArchive = window.filterArchiveTabs;
    if (typeof origArchive === 'function') {
      window.filterArchiveTabs = function (cat, btn) {
        withTransition(() => origArchive(cat, btn));
      };
    }
    markFeatured();
  }

  /* ------------------------------------------------------------------
     6. Shared-element dossier transition (card image → modal hero)
     ------------------------------------------------------------------ */
  function initDossierTransition() {
    const origOpen = window.openIntelDossier;
    const origClose = window.closeIntelDossier;
    if (typeof origOpen !== 'function') return;
    let sourceImg = null;
    const heroImg = () => $('#dossier-modal-img');

    window.openIntelDossier = function (key) {
      const card = $(`#main-showcase-grid [onclick*="openIntelDossier('${key}')"]`);
      sourceImg = card ? $('.showcase-image img', card) : null;
      if (!canVT || !sourceImg) { origOpen(key); return; }
      const cardEl = sourceImg.closest('.showcase-item');
      const prevCardName = cardEl.style.viewTransitionName;
      cardEl.style.viewTransitionName = 'none';
      sourceImg.style.viewTransitionName = 'ot-dossier-hero';
      document.startViewTransition(() => {
        sourceImg.style.viewTransitionName = '';
        heroImg().style.viewTransitionName = 'ot-dossier-hero';
        origOpen(key);
      }).finished.finally(() => {
        heroImg().style.viewTransitionName = '';
        cardEl.style.viewTransitionName = prevCardName;
      });
    };

    if (typeof origClose === 'function') {
      window.closeIntelDossier = function () {
        const modal = $('#intel-dossier-modal');
        if (!modal || !modal.classList.contains('open')) return;
        if (!canVT || !sourceImg) { origClose(); return; }
        const cardEl = sourceImg.closest('.showcase-item');
        const prevCardName = cardEl.style.viewTransitionName;
        cardEl.style.viewTransitionName = 'none';
        heroImg().style.viewTransitionName = 'ot-dossier-hero';
        document.startViewTransition(() => {
          heroImg().style.viewTransitionName = '';
          sourceImg.style.viewTransitionName = 'ot-dossier-hero';
          origClose();
        }).finished.finally(() => {
          sourceImg.style.viewTransitionName = '';
          cardEl.style.viewTransitionName = prevCardName;
          sourceImg = null;
        });
      };
    }
  }

  /* ------------------------------------------------------------------
     7. Metrics strip with count-up
     ------------------------------------------------------------------ */
  function initMetrics() {
    const tabs = $('#interactive-showcase .news-tabs-bar');
    if (!tabs) return;
    const METRICS = [
      { v: 6, pre: '', suf: '', dec: 0, label: 'Verified Oct ’26 dispatches' },
      { v: 6, pre: '$', suf: 'B', dec: 0, label: 'Genesis Mission compute' },
      { v: 99.9, pre: '', suf: '%', dec: 1, label: 'Silicon qubit fidelity' },
      { v: 475, pre: '+', suf: 'd', dec: 0, label: 'REDMOD early detection' }
    ];
    const strip = document.createElement('div');
    strip.className = 'ot-metrics';
    strip.innerHTML = METRICS.map((m) => `<div class="ot-metric"><span class="ot-stat-num" data-v="${m.v}" data-pre="${m.pre}" data-suf="${m.suf}" data-dec="${m.dec}">${m.pre}${(0).toFixed(m.dec)}${m.suf}</span><span class="ot-stat-label">${m.label}</span></div>`).join('');
    tabs.before(strip);

    const run = (el) => {
      const v = +el.dataset.v, dec = +el.dataset.dec, pre = el.dataset.pre, suf = el.dataset.suf;
      if (reduceMotion) { el.textContent = `${pre}${v.toFixed(dec)}${suf}`; return; }
      const t0 = performance.now(), dur = 1400;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = `${pre}${(v * eased).toFixed(dec)}${suf}`;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.6 });
    $$('.ot-stat-num', strip).forEach((n) => io.observe(n));
  }

  /* ------------------------------------------------------------------
     8. Archive entrance (observer, staggered)
     ------------------------------------------------------------------ */
  function initArchiveReveal() {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    const entries = $$('.archive-entry');
    entries.forEach((el) => {
      if (el.getBoundingClientRect().top > innerHeight) el.classList.add('ot-io-pending');
    });
    const io = new IntersectionObserver((list) => {
      list.forEach((en) => {
        if (!en.isIntersecting) return;
        const sibs = $$('.archive-entry.ot-io-pending', en.target.parentElement);
        en.target.style.setProperty('--ot-delay', `${Math.max(0, sibs.indexOf(en.target)) * 70}ms`);
        en.target.classList.remove('ot-io-pending');
        en.target.classList.add('ot-io-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    entries.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------
     9. Command palette
     ------------------------------------------------------------------ */
  let palette, palInput, palList, palItems = [], palSel = 0;

  function buildCommands() {
    const cmds = [];
    SECTIONS.forEach((s) => cmds.push({ group: 'Navigate', ico: '↳', label: `Go to ${s.label}`, hint: 'section', run: () => s.el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }));
    const dossiers = window.INTEL_DOSSIERS || (typeof INTEL_DOSSIERS !== 'undefined' ? INTEL_DOSSIERS : null);
    if (dossiers) {
      Object.entries(dossiers).forEach(([k, d]) => cmds.push({ group: 'October 2026 Dossiers', ico: '◆', label: d.title, hint: 'dossier', run: () => window.openIntelDossier(k) }));
    }
    $$('section#data-archives .archive-entry').forEach((a) => {
      const t = $('.entry-title', a);
      if (t) cmds.push({ group: 'Archive Logs', ico: '≡', label: t.textContent.trim(), hint: 'log', run: () => a.scrollIntoView({ behavior: 'smooth', block: 'center' }) });
    });
    $$('#main-showcase-grid .showcase-item[data-category~="sim-labs"]').forEach((c) => {
      const t = $('.showcase-title', c);
      const m = (c.getAttribute('onclick') || '').match(/href='([^']+)'/);
      if (t && m) cmds.push({ group: 'Simulation Labs', ico: '▶', label: `Launch ${t.textContent.trim()}`, hint: 'play', run: () => { location.href = m[1]; } });
    });
    $$('#interactive-showcase .news-tab-btn').forEach((b) => {
      const label = $('span', b);
      const cat = b.dataset.showcaseTab;
      if (label && cat) cmds.push({ group: 'Filters', ico: '⧉', label: `Show ${label.textContent.trim()}`, hint: 'filter', run: () => { window.filterShowcaseTabs(cat, b); $('#interactive-showcase').scrollIntoView({ behavior: 'smooth' }); } });
    });
    cmds.push(
      { group: 'Actions', ico: '⤒', label: 'Back to top', hint: 'scroll', run: () => scrollTo({ top: 0, behavior: 'smooth' }) },
      { group: 'Actions', ico: '⌘', label: 'Open Tentacle OS console', hint: 'os', run: () => { $('#tentacle-os')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => $('#os-cli-input')?.focus(), 600); } },
      { group: 'Actions', ico: '🛸', label: 'Summon UFO fleet flyby', hint: 'fx', run: () => window.spawnUFOFleet && window.spawnUFOFleet() },
      { group: 'Actions', ico: '▦', label: 'Toggle matrix overlay', hint: 'fx', run: () => window.toggleMatrixEffect && window.toggleMatrixEffect() },
      { group: 'Actions', ico: '◐', label: 'Toggle Mirrorworld inversion', hint: 'fx', run: () => window.toggleMirrorWorld && window.toggleMirrorWorld() }
    );
    return cmds;
  }

  function fuzzy(q, s) {
    q = q.toLowerCase(); s = s.toLowerCase();
    if (!q) return 1;
    if (s.includes(q)) return 100 - s.indexOf(q);
    let qi = 0, score = 0;
    for (let i = 0; i < s.length && qi < q.length; i++) if (s[i] === q[qi]) { qi++; score++; }
    return qi === q.length ? score : 0;
  }

  function renderPalette() {
    const q = palInput.value.trim();
    const all = buildCommands();
    palItems = all.map((c) => ({ c, s: fuzzy(q, `${c.label} ${c.group}`) })).filter((x) => x.s > 0);
    if (q) palItems.sort((a, b) => b.s - a.s);
    palItems = palItems.slice(0, 40).map((x) => x.c);
    palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
    if (!palItems.length) { palList.innerHTML = `<li class="ot-pal-empty">No matches for “${q.replace(/</g, '&lt;')}”</li>`; return; }
    let html = '', group = '';
    palItems.forEach((c, i) => {
      if (!q && c.group !== group) { group = c.group; html += `<li class="ot-pal-group" role="presentation">${group}</li>`; }
      html += `<li class="ot-pal-item" role="option" id="ot-pal-${i}" data-i="${i}" aria-selected="${i === palSel}"><span class="ot-pal-ico">${c.ico}</span><span>${c.label}</span><span class="ot-pal-hint">${c.hint}</span></li>`;
    });
    palList.innerHTML = html;
    palInput.setAttribute('aria-activedescendant', `ot-pal-${palSel}`);
  }

  function selectPal(i) {
    palSel = (i + palItems.length) % palItems.length;
    $$('.ot-pal-item', palList).forEach((el) => el.setAttribute('aria-selected', +el.dataset.i === palSel));
    const el = $(`#ot-pal-${palSel}`);
    el && el.scrollIntoView({ block: 'nearest' });
    palInput.setAttribute('aria-activedescendant', `ot-pal-${palSel}`);
  }

  function runPal(i) {
    const c = palItems[i];
    if (!c) return;
    palette.close();
    setTimeout(() => c.run(), 60);
  }

  function initPalette() {
    palette = document.createElement('dialog');
    palette.id = 'ot-palette';
    palette.setAttribute('aria-label', 'Command palette');
    palette.innerHTML = `
      <div class="ot-pal-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="ot-pal-input" type="text" placeholder="Search dispatches, sections, simulations…" autocomplete="off" spellcheck="false" role="combobox" aria-controls="ot-pal-list" aria-expanded="true">
        <span class="ot-pal-esc">ESC</span>
      </div>
      <ul id="ot-pal-list" role="listbox"></ul>
      <div class="ot-pal-foot"><span>↑↓ navigate</span><span>↵ open</span><span>esc close</span></div>`;
    document.body.appendChild(palette);
    palInput = $('#ot-pal-input', palette);
    palList = $('#ot-pal-list', palette);

    palInput.addEventListener('input', () => { palSel = 0; renderPalette(); });
    palInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); selectPal(palSel + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selectPal(palSel - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); runPal(palSel); }
    });
    palList.addEventListener('click', (e) => {
      const it = e.target.closest('.ot-pal-item');
      if (it) runPal(+it.dataset.i);
    });
    palList.addEventListener('pointermove', (e) => {
      const it = e.target.closest('.ot-pal-item');
      if (it && +it.dataset.i !== palSel) selectPal(+it.dataset.i);
    });
    palette.addEventListener('click', (e) => { if (e.target === palette) palette.close(); });

    document.addEventListener('keydown', (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.open ? palette.close() : openPalette(); }
      else if (e.key === '/' && !typing && !palette.open) { e.preventDefault(); openPalette(); }
    });
  }

  function openPalette() {
    if (!palette || palette.open) return;
    palInput.value = '';
    palSel = 0;
    renderPalette();
    palette.showModal();
    palInput.focus();
  }

  /* ------------------------------------------------------------------
     10. Image hints
     ------------------------------------------------------------------ */
  function initImageHints() {
    $$('.showcase-image img, .dossier-hero img').forEach((img) => {
      img.decoding = 'async';
      if (!img.complete) img.loading = 'lazy';
    });
    const hero = $('.banner-container .banner-image');
    if (hero) hero.fetchPriority = 'high';
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  const boot = () => {
    const steps = [initProgress, initDock, initTicker, initMetrics, initFilters, initDossierTransition, initSpotlight, initMagnetic, initArchiveReveal, initPalette, initImageHints];
    steps.forEach((fn) => { try { fn(); } catch (err) { console.warn('[OT-2026]', fn.name, err); } });
    document.documentElement.classList.add('ot-2026');
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
