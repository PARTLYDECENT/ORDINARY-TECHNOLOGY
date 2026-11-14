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
    const targets = $$('.showcase-button, .news-tab-btn, .container .button, .launch-btn, .mission-btn, .ot-kbd-btn, .ot-hero-pill');
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
    $$('#neural-hub-2026 .tool-card').forEach((card) => {
      const name = $('.tool-name', card)?.textContent.trim();
      const tag = $('.tool-tag', card)?.textContent.trim() || 'tool';
      const href = card.getAttribute('href');
      if (name && href) cmds.push({ group: 'Neural Hub', ico: '◈', label: name, hint: tag, run: () => window.open(href, '_blank', 'noopener') });
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
     11. Hero command bar (quick telemetry + navigation)
     ------------------------------------------------------------------ */
  function initHeroBar() {
    const heroBanner = $('#css3d-container > .banner-container');
    if (!heroBanner) return;
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
    const bar = document.createElement('div');
    bar.id = 'ot-hero-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Quick node navigation');
    bar.innerHTML = `
      <div class="ot-hero-status">
        <span class="ot-hero-pulse" aria-hidden="true"></span>
        <span>NODE // ORDINARY-TECH · SINGULARITY 2026</span>
      </div>
      <div class="ot-hero-actions">
        <button type="button" class="ot-hero-pill ot-primary" data-hero-go="#interactive-showcase">Breakthroughs ↓</button>
        <button type="button" class="ot-hero-pill" data-hero-sims>Sim Labs</button>
        <button type="button" class="ot-hero-pill" data-hero-go="#neural-hub-2026">Neural Hub</button>
        <button type="button" class="ot-hero-pill" data-hero-pal>Palette (${isMac ? '⌘K' : 'Ctrl K'})</button>
      </div>`;
    heroBanner.after(bar);

    bar.addEventListener('click', (e) => {
      const go = e.target.closest('[data-hero-go]');
      if (go) {
        const target = $(go.dataset.heroGo);
        target?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      if (e.target.closest('[data-hero-sims]')) {
        const simBtn = $('#interactive-showcase [data-showcase-tab="sim-labs"]');
        if (simBtn && window.filterShowcaseTabs) window.filterShowcaseTabs('sim-labs', simBtn);
        $('#interactive-showcase')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      if (e.target.closest('[data-hero-pal]')) openPalette();
    });
  }

  /* ------------------------------------------------------------------
     12. Dossier modal evolution (Prev/Next, copy link, archive log reader)
     ------------------------------------------------------------------ */
  function initDossierEnhancements() {
    const modal = $('#intel-dossier-modal');
    const dialog = modal && $('.dossier-dialog', modal);
    const body = modal && $('.dossier-body', modal);
    if (!modal || !dialog || !body) return;

    const topbar = document.createElement('div');
    topbar.className = 'ot-dossier-topbar';
    topbar.innerHTML = `<span>ARCHIVE TELEMETRY // LOG INSPECTOR</span><button type="button" class="dossier-close-btn">[ ESC // CLOSE ]</button>`;
    topbar.querySelector('.dossier-close-btn').addEventListener('click', () => window.closeIntelDossier && window.closeIntelDossier());
    dialog.prepend(topbar);

    const nav = document.createElement('div');
    nav.className = 'ot-dossier-nav';
    nav.innerHTML = `
      <div class="ot-dossier-nav-group">
        <button type="button" class="ot-dossier-btn" data-d-prev>← Prev</button>
        <span class="ot-dossier-counter" data-d-count></span>
        <button type="button" class="ot-dossier-btn" data-d-next>Next →</button>
      </div>
      <div class="ot-dossier-nav-group">
        <button type="button" class="ot-dossier-btn" data-d-copy>Copy Link</button>
      </div>`;
    body.appendChild(nav);

    const prevBtn = $('[data-d-prev]', nav);
    const nextBtn = $('[data-d-next]', nav);
    const copyBtn = $('[data-d-copy]', nav);
    const countEl = $('[data-d-count]', nav);

    const dossiers = window.INTEL_DOSSIERS || (typeof INTEL_DOSSIERS !== 'undefined' ? INTEL_DOSSIERS : null);
    const dossierKeys = dossiers ? Object.keys(dossiers) : [];
    const archiveEntries = $$('section#data-archives .archive-entry');

    let mode = 'dossier';
    let currentIdx = -1;

    const updateNavUI = (idx, total, showCopy) => {
      currentIdx = idx;
      prevBtn.disabled = total <= 1;
      nextBtn.disabled = total <= 1;
      countEl.textContent = total > 0 ? `${idx + 1} / ${total}` : '';
      copyBtn.style.display = showCopy ? '' : 'none';
      copyBtn.textContent = 'Copy Link';
    };

    const origOpen = window.openIntelDossier;
    const origClose = window.closeIntelDossier;

    if (typeof origOpen === 'function') {
      window.openIntelDossier = function (key) {
        mode = 'dossier';
        modal.classList.remove('ot-no-hero');
        origOpen(key);
        const idx = dossierKeys.indexOf(key);
        updateNavUI(Math.max(0, idx), dossierKeys.length, true);
        if (history.replaceState) history.replaceState(null, '', `#dossier=${encodeURIComponent(key)}`);
      };
    }

    if (typeof origClose === 'function') {
      window.closeIntelDossier = function () {
        origClose();
        if (location.hash.startsWith('#dossier=') && history.replaceState) {
          history.replaceState(null, '', location.pathname + location.search);
        }
      };
    }

    function openArchiveEntry(idx) {
      const entry = archiveEntries[idx];
      if (!entry) return;
      mode = 'archive';
      modal.classList.add('ot-no-hero');
      const stamp = $('.entry-timestamp', entry)?.textContent.trim() || 'ARCHIVE LOG';
      const type = $('.entry-type', entry)?.textContent.trim() || 'DISPATCH';
      const title = $('.entry-title', entry)?.textContent.trim() || 'ARCHIVE ENTRY';
      const dateline = $('.entry-dateline', entry)?.textContent.trim() || '';
      const paras = $$('.entry-content p', entry).map((p) => p.innerHTML);
      const metricsBox = $('.entry-metrics-box', entry)?.innerHTML || '';

      $('#dossier-modal-meta').textContent = `${type} // ${stamp}`;
      $('#dossier-modal-title').textContent = title;
      $('#dossier-modal-text').innerHTML =
        (dateline ? `<p style="color:var(--ot-ember);font-family:var(--font-mono,monospace);font-size:0.78rem;letter-spacing:1.4px;">${dateline}</p>` : '') +
        paras.map((p) => `<p>${p}</p>`).join('') +
        (metricsBox ? `<div class="entry-metrics-box" style="margin-top:1rem;">${metricsBox}</div>` : '');
      $('#dossier-modal-metrics').innerHTML = '';
      modal.classList.add('open');
      updateNavUI(idx, archiveEntries.length, false);
    }

    archiveEntries.forEach((entry, idx) => {
      const link = $('.entry-link', entry);
      if (!link) return;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openArchiveEntry(idx);
      });
    });

    const step = (dir) => {
      if (mode === 'dossier' && dossierKeys.length) {
        const next = (currentIdx + dir + dossierKeys.length) % dossierKeys.length;
        window.openIntelDossier(dossierKeys[next]);
      } else if (mode === 'archive' && archiveEntries.length) {
        const next = (currentIdx + dir + archiveEntries.length) % archiveEntries.length;
        openArchiveEntry(next);
      }
    };

    prevBtn.addEventListener('click', () => step(-1));
    nextBtn.addEventListener('click', () => step(1));
    copyBtn.addEventListener('click', () => {
      const url = location.href;
      navigator.clipboard?.writeText(url).then(() => {
        copyBtn.textContent = 'Copied ✓';
        setTimeout(() => { copyBtn.textContent = 'Copy Link'; }, 1800);
      }).catch(() => {});
    });

    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('open')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });

    if (location.hash.startsWith('#dossier=')) {
      const key = decodeURIComponent(location.hash.slice('#dossier='.length));
      if (dossiers && dossiers[key] && window.openIntelDossier) {
        setTimeout(() => window.openIntelDossier(key), 150);
      }
    }
  }

  /* ------------------------------------------------------------------
     13. Neural Hub 2026 live filter & search
     ------------------------------------------------------------------ */
  function initNeuralHubFilter() {
    const hub = $('#neural-hub-2026');
    const header = hub && $('.hub-header', hub);
    if (!hub || !header) return;

    const cards = $$('.tool-card', hub);
    const categories = $$('.hub-category', hub);
    if (!cards.length) return;

    const controls = document.createElement('div');
    controls.className = 'ot-hub-controls';
    controls.innerHTML = `
      <div class="ot-hub-search-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" class="ot-hub-search" placeholder="Filter ${cards.length} frontier models &amp; AI tools…" aria-label="Filter Neural Hub tools">
      </div>
      <div class="ot-hub-pills" role="group" aria-label="Filter by tier">
        <button type="button" class="ot-hub-pill is-active" data-tier="all">All</button>
        <button type="button" class="ot-hub-pill" data-tier="free">Free</button>
        <button type="button" class="ot-hub-pill" data-tier="premium">Premium</button>
        <button type="button" class="ot-hub-pill" data-tier="enterprise">Enterprise</button>
      </div>
      <span class="ot-hub-count">Showing ${cards.length} / ${cards.length}</span>`;
    header.after(controls);

    const input = $('.ot-hub-search', controls);
    const pills = $$('.ot-hub-pill', controls);
    const countEl = $('.ot-hub-count', controls);
    let tier = 'all';

    const apply = () => {
      const q = input.value.trim().toLowerCase();
      let shown = 0;
      cards.forEach((c) => {
        const text = c.textContent.toLowerCase();
        const tagEl = $('.tool-tag', c);
        const matchesTier = tier === 'all' || (tagEl && (tagEl.classList.contains(`tag-${tier}`) || tagEl.textContent.toLowerCase().includes(tier)));
        const matchesQuery = !q || text.includes(q);
        const visible = matchesTier && matchesQuery;
        c.classList.toggle('ot-tool-hidden', !visible);
        if (visible) shown++;
      });
      categories.forEach((cat) => {
        const hasVisible = $$('.tool-card:not(.ot-tool-hidden)', cat).length > 0;
        cat.classList.toggle('ot-cat-hidden', !hasVisible);
      });
      countEl.textContent = `Showing ${shown} / ${cards.length}`;
    };

    input.addEventListener('input', apply);
    pills.forEach((p) => p.addEventListener('click', () => {
      tier = p.dataset.tier;
      pills.forEach((b) => b.classList.toggle('is-active', b === p));
      apply();
    }));
  }

  /* ------------------------------------------------------------------
     14. Back-to-top circular progress button
     ------------------------------------------------------------------ */
  function initBackToTop() {
    const btn = document.createElement('button');
    btn.id = 'ot-btt';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<span>↑</span>';
    document.body.appendChild(btn);

    btn.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const pct = max > 0 ? Math.min(100, Math.max(0, (scrollY / max) * 100)) : 0;
      btn.style.setProperty('--ot-btt-pct', `${pct.toFixed(1)}%`);
      btn.classList.toggle('is-visible', scrollY > 600);
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  const boot = () => {
    const steps = [initProgress, initDock, initTicker, initHeroBar, initMetrics, initFilters, initDossierEnhancements, initDossierTransition, initNeuralHubFilter, initSpotlight, initMagnetic, initArchiveReveal, initPalette, initBackToTop, initImageHints];
    steps.forEach((fn) => { try { fn(); } catch (err) { console.warn('[OT-2026]', fn.name, err); } });
    document.documentElement.classList.add('ot-2026');
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
