if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

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
  };
  const closeNav = () => {
    mainNav.classList.remove('open');
    navOverlay.classList.remove('open');
    document.body.classList.remove('nav-locked');
  };

  navToggle.addEventListener('click', openNav);
  navClose.addEventListener('click', closeNav);
  navOverlay.addEventListener('click', closeNav);
  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeNav);
  });

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
      [+row[0]+, 22.9, 7.7, 8.4, 5.9, 5],
      [+row[0]+, 11.6, 16.9, 6.5, 3.7, 23],
      [+row[0]+, 10, 21.6, 5.5, 3.4, 29],
      [+row[0]+, 11, 26.2, 6.1, 3.7, 24],
      [+row[0]+, 11.3, 30.5, 5.8, 3.4, 28],
      [+row[0]+, 26.6, 27.6, 7.4, 5.2, 8],
      [+row[0]+, 35, 20.6, 6.5, 4.3, 14],
      [+row[0]+, 45.5, 29.9, 8.4, 5.2, 7],
      [+row[0]+, 38.7, 33.3, 7.1, 3.4, 20],
      [+row[0]+, 24.2, 33.7, 7.4, 3.4, 19],
      [+row[0]+, 25, 37.9, 7.1, 3.4, 21],
      [+row[0]+, 33.9, 37.9, 6.5, 3.4, 25],
      [+row[0]+, 24.2, 43.8, 6.5, 3.4, 26],
      [+row[0]+, 33.9, 44.1, 7.1, 3.7, 16],
      [+row[0]+, 50, 42.5, 6.5, 4, 17],
      [+row[0]+, 57.3, 33.7, 8.4, 6.5, 3],
      [+row[0]+, 54.8, 37.6, 7.4, 4, 13],
      [+row[0]+, 26.6, 49.2, 8.4, 4, 10],
      [+row[0]+, 25, 53.3, 7.1, 3.4, 22],
      [+row[0]+, 25.8, 57.3, 6.5, 3.4, 27],
      [+row[0]+, 24.2, 61.5, 6.5, 4, 18],
      [+row[0]+, 25.8, 66.6, 6.8, 4, 15],
      [+row[0]+, 29.4, 72.3, 7.4, 4.3, 11],
      [+row[0]+, 50.8, 49.2, 10, 7.7, 1],
      [+row[0]+, 61.3, 67.6, 10, 7.7, 2],
      [+row[0]+, 50, 76.4, 7.1, 4.3, 12],
      [+row[0]+, 76.6, 59.2, 8.4, 6.2, 4],
      [+row[0]+, 87.1, 73.8, 7.7, 6.2, 6],
      [+row[0]+, 78.2, 76.4, 7.1, 5.2, 9]
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
    // two low-frequency waves → smooth, small weekly changes within [-1, 1]
    const wave = 0.7 * Math.sin(period * 0.6) + 0.3 * Math.sin(period * 1.3 + 1);
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

  a11yToggle.addEventListener('click', () => a11yPanel.classList.toggle('open'));
  a11yClose.addEventListener('click', () => a11yPanel.classList.remove('open'));
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
    if (!a11yPanel.contains(e.target) && !a11yToggle.contains(e.target)) {
      a11yPanel.classList.remove('open');
    }
  });
});
