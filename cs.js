/* ==========================================================================
   Computer Science & AI page – cs.js
   Standalone (no Bootstrap JS needed).
   Modules:
   1. Scroll reveal           5. Scroll progress + back-to-top
   2. Count-up numbers        6. Hero parallax
   3. Header shrink           7. Partner logo fallbacks     8. Chair message modal
   4. Sub-nav scroll-spy
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');   // CSS only hides .reveal items when JS is running

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* 1. SCROLL REVEAL ------------------------------------------------------ */
  function initReveal() {
    const items = $$('.reveal');
    if (!items.length) return;
    if (prefersReduced || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-visible'));
      return;
    }
    // Stagger the children of any [data-reveal-group]
    $$('[data-reveal-group]').forEach(group => {
      $$('.reveal', group).forEach((el, i) => el.style.setProperty('--reveal-delay', `${(i % 8) * 80}ms`));
    });
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(el => io.observe(el));
  }

  /* 2. COUNT-UP ------------------------------------------------------------
     <span data-count="73" data-decimals="1" data-prefix="Rs. " data-suffix="M">  */
  function formatCount(el, value) {
    const d = Number(el.dataset.decimals || 0);
    el.textContent = (el.dataset.prefix || '') +
      value.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) +
      (el.dataset.suffix || '');
  }
  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length) return;
    const run = el => {
      const target = parseFloat(el.dataset.count);
      const start = performance.now();
      const tick = now => {
        const p = Math.min((now - start) / 1600, 1);
        formatCount(el, target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (prefersReduced || !('IntersectionObserver' in window)) {
      els.forEach(el => formatCount(el, parseFloat(el.dataset.count)));
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => { if (e.isIntersecting) { run(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.6 });
    els.forEach(el => io.observe(el));
  }

  /* 3 + 4 + 5 + 6. SCROLL-DRIVEN UI (one rAF-throttled listener) ------------ */
  function initScrollUI() {
    const header = $('.cs-header');
    const subnav = $('.cs-subnav');
    const bar = $('.scroll-progress');
    const topBtn = $('.to-top');
    const heroImg = $('.cs-hero__img');
    const hero = $('.cs-hero');

    // sub-nav: only in-page links take part in scroll-spy
    const links = $$('.cs-subnav a[href^="#"]').filter(a => a.getAttribute('href').length > 1);
    const targets = links.map(a => ({ link: a, sec: $(a.getAttribute('href')) })).filter(t => t.sec);
    let currentId = null;

    const setActive = id => {
      if (id === currentId) return;
      currentId = id;
      links.forEach(a => {
        const on = a.getAttribute('href') === `#${id}`;
        a.classList.toggle('active', on);
        if (on) {
          a.setAttribute('aria-current', 'true');
          // keep the active pill visible inside the horizontally scrolling bar (never moves the page)
          const list = a.closest('ul');
          if (list && list.scrollWidth > list.clientWidth) {
            list.scrollTo({ left: a.offsetLeft - list.clientWidth / 2 + a.offsetWidth / 2, behavior: prefersReduced ? 'auto' : 'smooth' });
          }
        } else a.removeAttribute('aria-current');
      });
    };

    const update = () => {
      const y = window.scrollY;
      if (header) header.classList.toggle('is-scrolled', y > 40);

      // progress + back-to-top
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      if (topBtn) topBtn.classList.toggle('is-shown', y > 700);

      // scroll-spy: the nearest section whose top has passed the sticky header
      const offset = (header ? header.offsetHeight : 0) + 40;
      let id = null, best = -Infinity;
      targets.forEach(({ sec }) => {
        const gap = sec.getBoundingClientRect().top - offset;
        if (gap <= 0 && gap > best) { best = gap; id = sec.id; }
      });
      setActive(id);

      // gentle hero parallax (skipped for reduced motion / when off-screen)
      if (heroImg && hero && !prefersReduced) {
        const r = hero.getBoundingClientRect();
        if (r.bottom > 0) heroImg.style.setProperty('--hero-shift', `${Math.min(y, r.height) * 0.12}px`);
      }
    };

    if (topBtn) topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' }));

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* 7. PARTNER LOGO FALLBACKS ----------------------------------------------
     Each <img class="board-logo"> has its first source in src and more in
     data-fallback="url|url". If every source fails (or only a tiny 16px favicon
     comes back) the logo is replaced by a gold monogram from data-initials.   */
  function initLogos() {
    const monogram = img => {
      const box = img.closest('.board-logo-box');
      if (!box) return;
      const m = document.createElement('span');
      m.className = 'board-mono';
      m.setAttribute('aria-hidden', 'true');
      m.textContent = img.dataset.initials || '•';
      box.replaceChildren(m);
    };
    $$('img.board-logo').forEach(img => {
      const queue = (img.dataset.fallback || '').split('|').filter(Boolean);
      const next = () => {
        if (queue.length) img.src = queue.shift();
        else monogram(img);
      };
      img.addEventListener('error', next);
      img.addEventListener('load', () => {
        // a 16px favicon looks blurry in a 72px slot: try the next source, keep it only if none is left
        if (img.naturalWidth && img.naturalWidth < 32 && queue.length) next();
      });
      if (img.complete && img.naturalWidth === 0) next();   // failed before the script ran
    });
  }

  /* 8. CHAIR MESSAGE MODAL --------------------------------------------------
     "Read more" opens the native <dialog id="chairModal">; closes on the X button,
     Esc, or a click on the backdrop. Page scroll is locked while it is open.      */
  function initChairModal() {
    const dlg = $('#chairModal');
    if (!dlg) return;
    let opener = null;
    const open = btn => {
      opener = btn;
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      root.classList.add('modal-open');
      const body = $('.chair-modal__body', dlg);
      if (body) body.scrollTop = 0;
    };
    const close = () => { if (dlg.open) dlg.close(); };
    $$('[data-chair-open]').forEach(b => b.addEventListener('click', () => open(b)));
    $$('[data-chair-close]', dlg).forEach(b => b.addEventListener('click', close));
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });       // backdrop click
    dlg.addEventListener('close', () => { root.classList.remove('modal-open'); if (opener) opener.focus(); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    initCounters();
    initScrollUI();
    initLogos();
    initChairModal();
  });
})();