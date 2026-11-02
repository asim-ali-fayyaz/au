/* ==========================================================================
   Air University – animations.js
   All animation / transition behaviour lives here. CSS holds the visual
   states (.reveal, .is-visible, .is-scrolled); this file only toggles them.

   Modules:
   1. Scroll reveal
   2. Count-up stats
   3. Navbar shrink + active link
   4. Scroll progress + back-to-top
   5. Hero video: play/pause control + fallback
   6. VC section parallax
   7. Mega menu (hover-intent on desktop)
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Enables the hidden initial state in CSS only when JS is running,
  // so content is never invisible for users without JS.
  root.classList.add('js');

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

    // Stagger siblings inside a [data-reveal-group] container
    $$('[data-reveal-group]').forEach(group => {
      $$('.reveal', group).forEach((el, i) => {
        el.style.setProperty('--reveal-delay', `${i * 90}ms`);
      });
    });

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    items.forEach(el => io.observe(el));
  }

  /* 2. COUNT-UP STATS ------------------------------------------------------
     Markup: <span data-count="100" data-prefix="Rs." data-suffix="B">0</span> */
  function formatCount(el, value) {
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const decimals = Number(el.dataset.decimals || 0);
    el.textContent = `${prefix}${value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}${suffix}`;
  }

  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const duration = 1800;
    const start = performance.now();

    const tick = now => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);     // easeOutCubic
      formatCount(el, target * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function initCounters() {
    const counters = $$('[data-count]');
    if (!counters.length) return;

    if (prefersReduced || !('IntersectionObserver' in window)) {
      counters.forEach(el => formatCount(el, parseFloat(el.dataset.count)));
      return;
    }

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.6 });

    counters.forEach(el => io.observe(el));
  }

  /* 3. NAVBAR SHRINK + ACTIVE LINK ---------------------------------------- */
  function initNavbar() {
    const nav = $('.navbar-au');
    if (!nav) return;

    const links = $$('.navbar-au .nav-link[href^="#"]').filter(a => a.getAttribute('href').length > 1);
    const sections = links
      .map(a => $(a.getAttribute('href')))
      .filter(Boolean);

    const onScroll = () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 40);

      // Active link = last section whose top has passed the nav
      const offset = nav.offsetHeight + 80;
      let current = null;
      sections.forEach(sec => {
        if (sec.getBoundingClientRect().top - offset <= 0) current = sec.id;
      });
      links.forEach(a => {
        const active = a.getAttribute('href') === `#${current}`;
        a.classList.toggle('active', active);
        if (active) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };

    onScroll();
    return onScroll;
  }

  /* 4. SCROLL PROGRESS + BACK-TO-TOP -------------------------------------- */
  function initProgress() {
    const bar = $('.scroll-progress');
    const topBtn = $('.to-top');

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      if (bar) bar.style.transform = `scaleX(${ratio})`;
      if (topBtn) topBtn.classList.toggle('is-shown', window.scrollY > 600);
    };

    if (topBtn) {
      topBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
      });
    }
    update();
    return update;
  }

  /* 5. HERO VIDEO ---------------------------------------------------------
     - Respects reduced motion (starts paused)
     - Pause/play button (WCAG 2.2.2: moving content > 5s needs a control)
     - Pauses when the hero is off-screen to save battery/data */
  function initHeroVideo() {
    const video = $('.hero-video video');
    const btn = $('.video-toggle');
    if (!video) return;

    const setIcon = playing => {
      if (!btn) return;
      btn.innerHTML = `<i class="fas ${playing ? 'fa-pause' : 'fa-play'}" aria-hidden="true"></i>`;
      btn.setAttribute('aria-label', playing ? 'Pause background video' : 'Play background video');
      btn.setAttribute('aria-pressed', String(!playing));
    };

    let userPaused = prefersReduced;
    if (prefersReduced) { video.removeAttribute('autoplay'); video.pause(); }
    setIcon(!userPaused);

    if (btn) {
      btn.addEventListener('click', () => {
        if (video.paused) { userPaused = false; video.play().catch(() => {}); }
        else { userPaused = true; video.pause(); }
        setIcon(!video.paused);
      });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        if (userPaused) return;
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      }, { threshold: 0.1 }).observe($('.hero-video'));
    }

    // If the file is missing/unsupported, the navy background + overlay remain.
    video.addEventListener('error', () => { if (btn) btn.hidden = true; }, true);
  }

  /* 6. VC SECTION PARALLAX ------------------------------------------------ */
  function initParallax() {
    const section = $('.vc-section');
    if (!section || prefersReduced) return;

    return () => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height); // 0..1
      section.style.setProperty('--vc-shift', `${(progress - 0.5) * 80}px`);
    };
  }

  /* 7. MEGA MENU ----------------------------------------------------------
     - Mouse devices (desktop): opens on hover with a short close delay so the
       pointer can travel from the link down into the panel without it closing.
       Clicking the top-level link then scrolls to its section.
     - Touch / small screens: Bootstrap's normal click-to-toggle is untouched. */
  function initMegaMenu() {
    const items = $$('.navbar-au .has-mega');
    if (!items.length || !window.bootstrap) return;

    const hoverMode = window.matchMedia('(hover: hover) and (min-width: 992px)');
    const instance = item => bootstrap.Dropdown.getOrCreateInstance($('[data-bs-toggle="dropdown"]', item));

    items.forEach(item => {
      const toggle = $('[data-bs-toggle="dropdown"]', item);
      let closeTimer;

      item.addEventListener('mouseenter', () => {
        if (!hoverMode.matches) return;
        clearTimeout(closeTimer);
        items.forEach(other => { if (other !== item) instance(other).hide(); });
        instance(item).show();
      });

      item.addEventListener('mouseleave', () => {
        if (!hoverMode.matches) return;
        closeTimer = setTimeout(() => instance(item).hide(), 180);
      });

      // With hover-open, a click should navigate rather than toggle the panel shut
      toggle.addEventListener('click', e => {
        if (!hoverMode.matches) return;
        e.stopPropagation();
        e.preventDefault();
        const target = $(toggle.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
        instance(item).hide();
      });
    });

    // Close the panel (and the mobile menu) after choosing an in-page link
    $$('.mega-menu a[href^="#"]').forEach(link => {
      link.addEventListener('click', () => {
        items.forEach(item => instance(item).hide());
        const collapse = $('#navbarNav');
        if (collapse && collapse.classList.contains('show')) {
          bootstrap.Collapse.getOrCreateInstance(collapse).hide();
        }
      });
    });
  }

  /* BOOT ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    initCounters();
    initHeroVideo();
    initMegaMenu();

    const handlers = [initNavbar(), initProgress(), initParallax()].filter(Boolean);

    // One rAF-throttled scroll listener for everything
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        handlers.forEach(fn => fn());
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  });
})();