if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// A RELOAD of the home page must open at the top — the browser would otherwise
// re-jump to a leftover section anchor in the URL (e.g. #apartments, left by the
// "חזרה לדף הבית" link). A genuine click to #apartments still scrolls there.
(function () {
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  const isReload = nav ? nav.type === 'reload'
    : (performance.navigation && performance.navigation.type === 1);
  if (document.body && document.body.classList.contains('page-home') && isReload && location.hash) {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    const toTop = () => window.scrollTo(0, 0);
    toTop();
    window.addEventListener('load', toTop);
    setTimeout(toTop, 0);
    setTimeout(toTop, 80);
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const navToggle = document.getElementById('nav-toggle');
  const navClose = document.getElementById('nav-close');
  const mainNav = document.getElementById('main-nav');
  const navOverlay = document.getElementById('nav-overlay');

  const openNav = () => {
    mainNav.classList.add('open');
    navOverlay.classList.add('open');
    document.body.classList.add('nav-locked');
    navToggle.setAttribute('aria-expanded', 'true');
    mainNav.removeAttribute('inert');
    mainNav.removeAttribute('aria-hidden');
    navClose.focus();
  };
  const closeNav = (returnFocus) => {
    mainNav.classList.remove('open');
    navOverlay.classList.remove('open');
    document.body.classList.remove('nav-locked');
    navToggle.setAttribute('aria-expanded', 'false');
    mainNav.setAttribute('inert', '');           // keep the off-screen drawer out of the tab order
    mainNav.setAttribute('aria-hidden', 'true');  // and out of the screen-reader tree
    if (returnFocus) navToggle.focus();
  };

  // Wire up ARIA + initial closed state (drawer is off-screen by default)
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-controls', 'main-nav');
  mainNav.setAttribute('inert', '');
  mainNav.setAttribute('aria-hidden', 'true');

  navToggle.addEventListener('click', openNav);
  navClose.addEventListener('click', () => closeNav(true));
  navOverlay.addEventListener('click', () => closeNav(true));
  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => closeNav(false));
  });
  // Escape closes the open drawer and returns focus to the toggle
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mainNav.classList.contains('open')) closeNav(true);
  });

  // Home hero: the header overlays the video transparently, then turns solid
  // once the visitor scrolls past the top (keeps the logo/menu always legible).
  if (document.body.classList.contains('page-home')) {
    const header = document.querySelector('.site-header');
    if (header) {
      const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    question.setAttribute('aria-expanded', 'false'); // screen-reader open/closed state
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(open => {
        open.classList.remove('open');
        open.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        question.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Contact form — the visitor only fills the fields and clicks submit; the inquiry
  // is then delivered automatically to the business email via Web3Forms (free, no
  // server). Running inquiry number starts at 000001.
  //
  // SETUP (one time): go to https://web3forms.com, enter the destination email,
  // and paste the access key you receive below (replace YOUR_ACCESS_KEY).
  const WEB3FORMS_ACCESS_KEY = '814331f3-0808-4d4f-8a5f-e7d37b854b98';
  const sectorLabels = { hr: 'חברת כוח אדם', construction: 'חברת בנייה', other: 'אחר' };
  const form = document.getElementById('contact-form');
  const note = document.getElementById('form-note');

  // Running inquiry number, formatted 000001, 000002, ... (committed only on success)
  const peekNextRef = () => (parseInt(localStorage.getItem('asiron-ref-counter') || '0', 10) || 0) + 1;
  const commitRef = (n) => localStorage.setItem('asiron-ref-counter', String(n));

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      note.className = 'form-note';
      note.textContent = 'שולח...';

      const n = peekNextRef();
      const ref = String(n).padStart(6, '0');
      const data = new FormData(form);
      const get = (k) => (data.get(k) || '').toString().trim();
      const sector = get('sector');

      // JSON body keeps Hebrew field labels correctly encoded (UTF-8).
      const payload = {
        access_key: WEB3FORMS_ACCESS_KEY,
        from_name: 'טופס אתר אסירון',
        subject: 'פנייה חדשה מהאתר — מספר פנייה ' + ref,
        'מספר פנייה': ref,
        'שם': get('name'),
        'טלפון': get('phone'),
        'שם החברה': get('company') || '—',
        'תחום פעילות': sector ? (sectorLabels[sector] || sector) : '—',
        'מספר עובדים משוער': get('employees') || '—',
        'אזור בארץ': get('location') || '—',
        'פרטים נוספים': get('message') || '—'
      };

      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success) {
          commitRef(n);
          note.className = 'form-note form-note-success';
          note.textContent = 'הפנייה נשלחה בהצלחה!';
          form.reset();
        } else {
          note.textContent = 'אירעה שגיאה בשליחה. נסו שוב או צרו קשר בטלפון.';
        }
      } catch (err) {
        note.textContent = 'אירעה שגיאה בשליחה. נסו שוב או צרו קשר בטלפון.';
      }
    });
  }

  // ---- Apartment video tiles: play/pause, one-at-a-time playback, and an
  //      "enlarge" modal that opens the clip bigger (not full-screen), keeping
  //      its proportions, with a close button to shrink back. ----
  const tileVideos = Array.from(document.querySelectorAll('.video-slot video'));

  // Shared enlarge modal (built lazily on first use).
  let modal = null;
  let modalVideo = null;
  let modalReturnFocus = null;
  const closeModal = () => {
    if (!modal || modal.hidden) return;
    modalVideo.pause();
    modalVideo.removeAttribute('src');
    modalVideo.load();
    modal.hidden = true;
    document.body.style.overflow = '';
    if (modalReturnFocus) { modalReturnFocus.focus(); }
  };
  const buildModal = () => {
    modal = document.createElement('div');
    modal.className = 'vid-modal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="vid-modal__backdrop" data-close="1"></div>' +
      '<div class="vid-modal__box" role="dialog" aria-modal="true" aria-label="תצוגה מוגדלת של סרטון הדירה">' +
      '<button type="button" class="vid-modal__close" aria-label="סגירת התצוגה המוגדלת">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>' +
      '</button>' +
      '<video class="vid-modal__video" playsinline muted controls></video>' +
      '</div>';
    document.body.appendChild(modal);
    modalVideo = modal.querySelector('.vid-modal__video');
    modal.querySelector('.vid-modal__close').addEventListener('click', closeModal);
    modal.querySelector('[data-close]').addEventListener('click', closeModal);
    // Simple focus trap between the close button and the video controls.
    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusables = [modal.querySelector('.vid-modal__close'), modalVideo];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  tileVideos.forEach((v) => {
    // Play / pause toggle button (keyboard-operable, labelled).
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vid-toggle';
    btn.innerHTML =
      '<svg class="ic-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
      '<svg class="ic-pause" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';
    const sync = () => {
      btn.classList.toggle('is-paused', v.paused);
      btn.setAttribute('aria-label', v.paused ? 'הפעלת הסרטון' : 'עצירת הסרטון');
    };
    const toggle = () => { if (v.paused) { v.play().catch(() => {}); } else { v.pause(); } };
    btn.addEventListener('click', toggle);
    v.addEventListener('click', toggle);
    v.addEventListener('play', () => {
      // Only one tile plays at a time — pause every other tile.
      tileVideos.forEach((o) => { if (o !== v && !o.paused) { o.pause(); } });
      sync();
    });
    v.addEventListener('pause', sync);
    // Play once (no loop): when the clip finishes, rewind to the start and show the
    // big play button again so it can be replayed on demand.
    v.addEventListener('ended', () => {
      v.currentTime = 0;
      btn.classList.add('is-paused');
      btn.setAttribute('aria-label', 'הפעלת הסרטון');
    });
    v.parentElement.appendChild(btn);
    sync();

    // Enlarge button — opens a bigger, proportional modal (not full-screen).
    const fs = document.createElement('button');
    fs.type = 'button';
    fs.className = 'vid-fs';
    fs.setAttribute('aria-label', 'הגדלת הסרטון');
    fs.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM4 15h2v3h3v2H4v-5zm14 3v-3h2v5h-5v-2h3z"/></svg>';
    fs.addEventListener('click', () => {
      if (!modal) { buildModal(); }
      v.pause(); // stop the small tile so only the enlarged copy plays
      modalReturnFocus = fs;
      modalVideo.poster = v.getAttribute('poster') || '';
      modalVideo.src = v.currentSrc || v.src;
      modalVideo.setAttribute('aria-label', v.getAttribute('aria-label') || 'סרטון דירה');
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      modalVideo.play().catch(() => {});
      modal.querySelector('.vid-modal__close').focus();
    });
    v.parentElement.appendChild(fs);
  });

  // ---- Video carousel: prev/next arrows scroll the row. Position is judged
  //      from real screen coordinates (not scrollLeft, whose sign flips
  //      between browsers in RTL), so it stays correct after a manual swipe. ----
  (function buildVideoCarousel() {
    const track = document.getElementById('video-track');
    const prevBtn = document.querySelector('.vid-nav--prev');
    const nextBtn = document.querySelector('.vid-nav--next');
    if (!track || !prevBtn || !nextBtn) return;
    const slots = Array.from(track.children);

    const currentIndex = () => {
      const trackMid = track.getBoundingClientRect().left + track.clientWidth / 2;
      let best = 0, bestDist = Infinity;
      slots.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const dist = Math.abs(r.left + r.width / 2 - trackMid);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      return best;
    };
    // Edge state is judged by whether the first/last card's own box is fully
    // inside the track's box — robust regardless of which scrollLeft sign
    // convention the browser uses for RTL overflow.
    const updateNavState = () => {
      const trackRect = track.getBoundingClientRect();
      const firstRect = slots[0].getBoundingClientRect();
      const lastRect = slots[slots.length - 1].getBoundingClientRect();
      prevBtn.disabled = firstRect.right <= trackRect.right + 1 && firstRect.left >= trackRect.left - 1;
      nextBtn.disabled = lastRect.left >= trackRect.left - 1 && lastRect.right <= trackRect.right + 1;
    };
    const goTo = (i) => {
      const clamped = Math.max(0, Math.min(slots.length - 1, i));
      slots[clamped].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    };
    prevBtn.addEventListener('click', () => goTo(currentIndex() - 1));
    nextBtn.addEventListener('click', () => goTo(currentIndex() + 1));
    let scrollTimer;
    track.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(updateNavState, 120);
    });
    // Reset the carousel to its first card WITHOUT scrolling the page: using
    // scrollIntoView() here would pull the whole page down to the carousel on
    // load, so the apartments page would open in the middle instead of at its
    // "הדירות שלנו" title. Scroll only the track's own horizontal position.
    track.scrollTo({ left: 0 });
    updateNavState();
  })();

  // Footer year
  document.getElementById('year').textContent = new Date().getFullYear();

  // ===== Nationwide coverage map: hover-by-region =====
  // Each city is a whole area of the map (an ellipse), not a single icon —
  // hovering anywhere inside it shows the city name. Ellipses were measured
  // directly off a hand-annotated reference (circles drawn over israel-map.png).
  (function buildCoverageIcons() {
    const wrap = document.getElementById('coverage-wrap');
    const layer = document.getElementById('map-icons-layer');
    const tip = document.getElementById('map-tooltip');
    if (!wrap || !layer || !tip) return;

    // [city, cx%, cy%, rx%, ry%, zIndex] — where regions overlap, the smaller
    // one needs the higher zIndex or it gets swallowed by its bigger neighbour.
    const mapRegions = [
      ['קריית שמונה', 23.2, 8.3, 9.4, 8, 6],
      ['נהריה', 13.9, 16.9, 7.4, 4.6, 26],
      ['עכו', 13.2, 21.6, 7.1, 4.3, 29],
      ['חיפה', 13.9, 26.2, 7.4, 4.6, 27],
      ['נתניה', 14.5, 30.5, 7.4, 4.3, 28],
      ['חריש', 26.1, 25.3, 10.3, 8.9, 4],
      ['בית שאן', 36.3, 21.9, 8.4, 5.5, 14],
      ['ראש העין', 46.8, 30.8, 8.7, 5.5, 12],
      ['פתח תקווה', 38.7, 33.9, 8.7, 4.6, 20],
      ['הרצליה', 25.8, 33.9, 9, 4.6, 19],
      ['רמת גן', 33.9, 37.9, 8.7, 4.6, 21],
      ['תל אביב', 25.8, 37.9, 8.7, 4.6, 22],
      ['בת ים', 25, 43.8, 8.4, 4.6, 23],
      ['חולון', 34.7, 44.1, 8.7, 4.9, 17],
      ['רמלה', 50.8, 43.1, 8.7, 5.5, 13],
      ['ירושלים', 54.8, 34.8, 9, 6.5, 10],
      ['מודיעין', 51.6, 38.8, 8.4, 5.2, 16],
      ['ראשון לציון', 27.7, 49.2, 9, 4.9, 15],
      ['רחובות', 26.5, 53.3, 8.4, 4.6, 24],
      ['יבנה', 27.1, 57.3, 8.1, 4.6, 25],
      ['אשדוד', 25.8, 61.5, 8.1, 5.2, 18],
      ['אשקלון', 29, 66.6, 9, 5.5, 11],
      ['שדרות', 33.9, 73, 10.3, 6.5, 8],
      ['בית שמש', 51.6, 49.6, 11.9, 9.2, 3],
      ['באר שבע', 61.3, 67.6, 14.5, 11.1, 1],
      ['אופקים', 52.4, 76.9, 10.6, 7.1, 5],
      ['ערד', 75.8, 59.9, 12.6, 8.9, 2],
      ['דימונה', 87.4, 73.8, 9.7, 7.4, 7],
      ['ירוחם', 78.7, 76.4, 9, 6.8, 9]
    ];

    let activeZone = null;
    const hideTip = () => {
      tip.classList.remove('show');
      if (activeZone) activeZone.classList.remove('is-active');
      activeZone = null;
    };
    const showTip = (city, zone) => {
      const wrapRect = wrap.getBoundingClientRect();
      const zoneRect = zone.getBoundingClientRect();
      tip.textContent = city;
      tip.style.left = (zoneRect.left - wrapRect.left + zoneRect.width / 2) + 'px';
      tip.style.top = (zoneRect.top - wrapRect.top + zoneRect.height / 2) + 'px';
      tip.classList.add('show');
      if (activeZone && activeZone !== zone) activeZone.classList.remove('is-active');
      zone.classList.add('is-active');
      activeZone = zone;
    };

    mapRegions.forEach(([city, cx, cy, rx, ry, z]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'map-region-zone';
      btn.dataset.city = city;
      btn.setAttribute('aria-label', city);
      btn.style.left = cx + '%';
      btn.style.top = cy + '%';
      btn.style.width = (rx * 2) + '%';
      btn.style.height = (ry * 2) + '%';
      btn.style.zIndex = String(z);
      btn.addEventListener('mouseenter', () => showTip(city, btn));
      btn.addEventListener('mouseleave', hideTip);
      btn.addEventListener('focus', () => showTip(city, btn));
      btn.addEventListener('blur', hideTip);
      btn.addEventListener('click', () => showTip(city, btn));
      layer.appendChild(btn);
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) hideTip();
    });
  })();

  // Stats count-up animation
  const statNumbers = document.querySelectorAll('.stat-number');

  // For a stat marked data-weekly="min-max", pick a number in that range that
  // reshuffles every Sunday at 12:00 (local time) and stays fixed the rest of the
  // week. The value drifts in small steps week-to-week (not wild jumps) and always
  // stays inside the range. Deterministic from the calendar, so every visitor sees
  // the same number that week — no server needed.
  const weeklyValue = (min, max) => {
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    // Find the Sunday-12:00 (local time) that opened the current week's period.
    const sundayNoon = new Date();
    sundayNoon.setHours(12, 0, 0, 0);
    sundayNoon.setDate(sundayNoon.getDate() - sundayNoon.getDay()); // back to Sunday
    if (Date.now() < sundayNoon.getTime()) sundayNoon.setDate(sundayNoon.getDate() - 7);
    // Period index vs a fixed Sunday-noon anchor. Math.round keeps it a whole number
    // even across daylight-saving shifts, so the change always lands on Sunday 12:00.
    const anchor = new Date(2024, 0, 7, 12, 0, 0).getTime();
    const period = Math.round((sundayNoon.getTime() - anchor) / WEEK);
    const half = (max - min) / 2;
    const mid = min + half;
    // Phase offset so the current week starts on the requested value (18 for 10–25).
    const PHASE = 14;
    const ph = period + PHASE;
    // two low-frequency waves → smooth, small weekly changes within [-1, 1]
    const wave = 0.7 * Math.sin(ph * 0.6) + 0.3 * Math.sin(ph * 1.3 + 1);
    const v = Math.round(mid + half * wave);
    return Math.max(min, Math.min(max, v));
  };

  const statTarget = (el) => {
    if (el.dataset.weekly) {
      const [min, max] = el.dataset.weekly.split('-').map((n) => parseInt(n, 10));
      return weeklyValue(min, max);
    }
    return parseInt(el.dataset.target, 10);
  };

  const formatStat = (el, value) => {
    const num = value.toLocaleString('he-IL');
    if (el.dataset.inlinePrefix) return el.dataset.inlinePrefix + num; // e.g. כ־17
    if (el.dataset.prefix) {
      return '<span class="stat-prefix">' + el.dataset.prefix + '</span>' + num;
    }
    return num;
  };

  const animateCount = (el) => {
    const target = statTarget(el);
    // WCAG 2.2.2 / 2.3.3 — no counting animation when the user asked for reduced
    // motion (OS preference or the a11y-panel "stop animations" toggle).
    const noMotion = document.documentElement.classList.contains('a11y-no-motion') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (noMotion) {
      el.innerHTML = formatStat(el, target);
      return;
    }
    const duration = 1200; // fixed duration → every counter finishes together
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const value = Math.floor(progress * target);
      el.innerHTML = formatStat(el, value);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.innerHTML = formatStat(el, target);
      }
    };
    requestAnimationFrame(step);
  };

  if (statNumbers.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    statNumbers.forEach(el => observer.observe(el));
  }

  // Accessibility widget
  const a11yToggle = document.getElementById('a11y-toggle');
  const a11yPanel = document.getElementById('a11y-panel');
  const a11yClose = document.getElementById('a11y-close');
  const a11yReset = document.getElementById('a11y-reset');
  const a11yTiles = document.querySelectorAll('.a11y-tile');

  const a11yClassMap = {
    dark: 'a11y-dark',
    contrast: 'a11y-contrast',
    bigtext: 'a11y-bigtext',
    links: 'a11y-links',
    spacing: 'a11y-spacing',
    images: 'a11y-hide-images',
    motion: 'a11y-no-motion',
    readable: 'a11y-readable',
    lineheight: 'a11y-lineheight',
    cursor: 'a11y-big-cursor',
    align: 'a11y-align'
  };

  // Pause/resume every auto-playing video (hero + apartment tiles) so the "reduce
  // motion" control acts as the WCAG 2.2.2 pause mechanism for them too (the class
  // only stops CSS motion).
  const autoVideos = document.querySelectorAll('video[autoplay]');
  const syncHeroVideo = (noMotion) => {
    autoVideos.forEach((v) => {
      if (noMotion) { v.pause(); } else { v.play().catch(() => {}); }
    });
  };

  const applyState = (key, on) => {
    document.documentElement.classList.toggle(a11yClassMap[key], on);
    localStorage.setItem('a11y-' + key, on ? '1' : '0');
    const tile = document.querySelector(`.a11y-tile[data-a11y="${key}"]`);
    if (tile) {
      tile.classList.toggle('active', on);
      tile.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (key === 'motion') syncHeroVideo(on);
  };

  // Honour the OS "reduce motion" preference on load, even before any toggle.
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  Object.keys(a11yClassMap).forEach((key) => {
    const saved = localStorage.getItem('a11y-' + key) === '1';
    applyState(key, key === 'motion' ? (saved || prefersReduced) : saved);
  });

  // ARIA state for the accessibility panel (the panel itself is display:none when
  // closed, so it stays out of the tab order & SR tree automatically).
  a11yToggle.setAttribute('aria-expanded', 'false');
  a11yToggle.setAttribute('aria-controls', 'a11y-panel');
  const openA11y = () => {
    a11yPanel.classList.add('open');
    a11yToggle.setAttribute('aria-expanded', 'true');
    a11yClose.focus();
  };
  const closeA11y = (returnFocus) => {
    a11yPanel.classList.remove('open');
    a11yToggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) a11yToggle.focus();
  };
  a11yToggle.addEventListener('click', () => {
    a11yPanel.classList.contains('open') ? closeA11y(true) : openA11y();
  });
  a11yClose.addEventListener('click', () => closeA11y(true));
  a11yTiles.forEach((tile) => {
    tile.addEventListener('click', () => {
      const key = tile.dataset.a11y;
      const isOn = document.documentElement.classList.contains(a11yClassMap[key]);
      applyState(key, !isOn);
    });
  });
  a11yReset.addEventListener('click', () => {
    Object.keys(a11yClassMap).forEach((key) => applyState(key, false));
  });
  document.addEventListener('click', (e) => {
    if (a11yPanel.classList.contains('open') && !a11yPanel.contains(e.target) && !a11yToggle.contains(e.target)) {
      closeA11y(false);
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && a11yPanel.classList.contains('open')) closeA11y(true);
  });
});

// YouTube hero embed — פעיל רק כאשר data-youtube-id מולא ב-index.html.
// כל עוד הוא ריק, קובץ הווידאו המקומי ממשיך לפעול כרגיל.
(() => {
  const media = document.querySelector('.hero-media[data-youtube-id]');
  if (!media) return;
  const id = (media.dataset.youtubeId || '').trim();
  if (!id) return; // placeholder — no video ID configured yet
  const nativeVideo = media.querySelector('video');
  const iframe = document.createElement('iframe');
  // youtube-nocookie: privacy-enhanced official embed. Autoplay muted loop,
  // no controls — behaves like the decorative background video it replaces.
  // No quality-limiting parameters: the player serves the best quality it
  // decides for the device/connection, up to the source resolution.
  iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
    '?autoplay=1&mute=1&controls=0&loop=1&playlist=' + encodeURIComponent(id) +
    '&playsinline=1&rel=0&modestbranding=1&enablejsapi=1';
  iframe.title = 'סרטון תדמית של אסירון';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('tabindex', '-1');
  iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
  iframe.setAttribute('loading', 'lazy');
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  if (nativeVideo) { nativeVideo.pause(); nativeVideo.remove(); }
  media.appendChild(iframe);
  // "עצירת אנימציות" עוצרת גם את נגן היוטיוב (WCAG 2.2.2)
  const ytCommand = (func) => {
    try {
      iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: '' }), '*');
    } catch (e) {}
  };
  const syncYt = () => {
    const noMotion = document.documentElement.classList.contains('a11y-no-motion');
    ytCommand(noMotion ? 'pauseVideo' : 'playVideo');
  };
  new MutationObserver(syncYt).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  iframe.addEventListener('load', () => setTimeout(syncYt, 1200));
})();

// Owner popup — מוצג 5 שניות אחרי הכניסה, חוזר בכל רענון
(() => {
  const popup = document.getElementById('owner-popup');
  if (!popup) return;
  const closeBtn = document.getElementById('owner-popup-close');
  const ctaBtn = document.getElementById('owner-popup-cta');
  const hide = () => {
    const hadFocus = popup.contains(document.activeElement);
    popup.hidden = true;
    if (hadFocus) {
      const main = document.getElementById('main');
      if (main) main.focus();
    }
  };
  setTimeout(() => { popup.hidden = false; }, 5000);
  closeBtn.addEventListener('click', hide);
  ctaBtn.addEventListener('click', () => { popup.hidden = true; });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !popup.hidden) hide();
  });
})();
