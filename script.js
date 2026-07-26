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

  // Footer year
  document.getElementById('year').textContent = new Date().getFullYear();

  // ===== Nationwide coverage map: interactive home/building markers =====
  // Positions are hand-placed percentages (--x/--y) tuned against the actual
  // israel-map.png artwork (a tilted isometric illustration, not a flat geo
  // projection), so they sit visually on the coastline/inland areas they name.
  (function buildCoverageIcons() {
    const wrap = document.getElementById('coverage-wrap');
    const layer = document.getElementById('map-icons-layer');
    const tip = document.getElementById('map-tooltip');
    if (!wrap || !layer || !tip) return;

    // [city, type, x%, y%] — 40 markers total.
    const mapLocations = [
      ['תל אביב', 'building', 28.2, 33.0], ['תל אביב', 'house', 32.4, 33.0],
      ['תל אביב', 'building', 36.9, 33.0], ['תל אביב', 'house', 28.8, 37.0],
      ['תל אביב', 'building', 33.0, 37.0], ['תל אביב', 'house', 37.2, 37.0],
      ['תל אביב', 'building', 28.2, 41.0], ['תל אביב', 'house', 32.4, 41.0],
      ['תל אביב', 'building', 36.9, 41.0],

      ['רמת גן', 'building', 38.8, 28.8], ['רמת גן', 'house', 43.0, 28.8],
      ['רמת גן', 'building', 47.2, 28.8], ['רמת גן', 'house', 40.9, 33.2],
      ['רמת גן', 'building', 45.1, 33.2], ['רמת גן', 'house', 49.3, 33.2],

      ['הרצליה', 'building', 24.0, 22.0], ['הרצליה', 'house', 20.0, 19.5],
      ['הרצליה', 'building', 28.5, 19.8], ['הרצליה', 'house', 20.5, 25.5],
      ['הרצליה', 'building', 28.8, 25.8],

      ['פתח תקווה', 'building', 47.0, 29.0], ['פתח תקווה', 'house', 43.3, 26.8],
      ['פתח תקווה', 'building', 50.7, 26.8], ['פתח תקווה', 'house', 43.8, 31.8],
      ['פתח תקווה', 'building', 50.2, 31.8],

      ['בת ים', 'building', 31.0, 45.5], ['בת ים', 'house', 36.0, 45.8],
      ['בת ים', 'building', 31.3, 49.5], ['בת ים', 'house', 38.5, 49.0],

      ['בית שמש', 'building', 50.5, 47.0], ['בית שמש', 'house', 57.0, 47.3],
      ['בית שמש', 'building', 51.0, 51.3], ['בית שמש', 'house', 57.5, 51.6],

      ['אשקלון', 'building', 39.0, 61.5], ['אשקלון', 'house', 46.0, 59.7],
      ['אשקלון', 'building', 40.0, 65.5], ['אשקלון', 'house', 46.5, 64.6],

      ['אשדוד', 'building', 35.5, 52.5], ['אשדוד', 'house', 42.5, 52.3],
      ['אשדוד', 'building', 39.0, 57.0],

      ['חולון', 'house', 40.0, 42.0], ['חולון', 'building', 43.0, 44.0],
      ['ראשון לציון', 'building', 35.5, 49.5], ['ראשון לציון', 'house', 38.5, 51.5],
      ['רחובות', 'house', 47.5, 53.0], ['רחובות', 'building', 51.0, 55.5]
    ];

    // Five hand-drawn variants (2 house tones + 3 building heights) in the
    // warm terracotta/cream palette from the reference art, cycled per marker
    // so the cluster reads as a varied streetscape rather than one repeated icon.
    const house1SVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M2.5 12 12 4 21.5 12 18 12 18 10.6 12 6 6 10.6 6 12Z" fill="#b5652f"/>' +
      '<rect x="6" y="12" width="12" height="8.3" fill="#f2e4cf" stroke="#c9ab7e" stroke-width="0.6"/>' +
      '<rect x="10.2" y="16.3" width="3.6" height="4" fill="#6b4a30"/>' +
      '<rect x="7.6" y="14.2" width="2.2" height="2.2" fill="#fff8ef"/>' +
      '<rect x="14.2" y="14.2" width="2.2" height="2.2" fill="#fff8ef"/></svg>';
    const house2SVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M4 12.5 11.5 5.5 19 12.5 16 12.5 16 11.2 11.5 7.3 7 11.2 7 12.5Z" fill="#8a4326"/>' +
      '<rect x="7" y="12.5" width="9" height="7.8" fill="#e8d3b3" stroke="#c2a479" stroke-width="0.6"/>' +
      '<rect x="10.4" y="16.6" width="2.8" height="3.7" fill="#5c3d26"/>' +
      '<rect x="8.2" y="14.6" width="1.8" height="1.8" fill="#fff8ef"/>' +
      '<rect x="13.6" y="14.6" width="1.8" height="1.8" fill="#fff8ef"/>' +
      '<circle cx="19.6" cy="17.2" r="2.2" fill="#5b7a52"/>' +
      '<rect x="19.1" y="19" width="1" height="1.3" fill="#6b4a30"/></svg>';
    const buildingLowSVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="6" y="7.4" width="12" height="13.4" fill="#d9c3a3" stroke="#b89968" stroke-width="0.6"/>' +
      '<rect x="6" y="6" width="12" height="1.6" fill="#a9895c"/>' +
      '<rect x="8.2" y="9.4" width="2.2" height="2.2" fill="#fdf6ea"/><rect x="13.6" y="9.4" width="2.2" height="2.2" fill="#fdf6ea"/>' +
      '<rect x="8.2" y="12.6" width="2.2" height="2.2" fill="#fdf6ea"/><rect x="13.6" y="12.6" width="2.2" height="2.2" fill="#fdf6ea"/>' +
      '<rect x="8.2" y="15.8" width="2.2" height="2.2" fill="#fdf6ea"/><rect x="13.6" y="15.8" width="2.2" height="2.2" fill="#fdf6ea"/></svg>';
    const buildingMidSVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="6.5" y="4.6" width="11" height="16.2" fill="#e3d0b0" stroke="#c2a479" stroke-width="0.6"/>' +
      '<rect x="6.5" y="3.3" width="11" height="1.4" fill="#a9895c"/>' +
      '<rect x="8.4" y="6.6" width="2" height="2" fill="#fdf6ea"/><rect x="13.1" y="6.6" width="2" height="2" fill="#fdf6ea"/>' +
      '<rect x="8.4" y="9.6" width="2" height="2" fill="#fdf6ea"/><rect x="13.1" y="9.6" width="2" height="2" fill="#fdf6ea"/>' +
      '<rect x="8.4" y="12.6" width="2" height="2" fill="#fdf6ea"/><rect x="13.1" y="12.6" width="2" height="2" fill="#fdf6ea"/>' +
      '<rect x="8.4" y="15.6" width="2" height="2" fill="#fdf6ea"/><rect x="13.1" y="15.6" width="2" height="2" fill="#fdf6ea"/></svg>';
    const buildingTallSVG = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="9.5" y="1.6" width="3.4" height="2" fill="#8a6a45"/>' +
      '<rect x="7" y="2.6" width="10" height="18.2" fill="#cdb693" stroke="#a9895c" stroke-width="0.6"/>' +
      '<rect x="8.7" y="4.8" width="1.9" height="1.9" fill="#fdf6ea"/><rect x="13.1" y="4.8" width="1.9" height="1.9" fill="#fdf6ea"/>' +
      '<rect x="8.7" y="7.4" width="1.9" height="1.9" fill="#fdf6ea"/><rect x="13.1" y="7.4" width="1.9" height="1.9" fill="#fdf6ea"/>' +
      '<rect x="8.7" y="10.0" width="1.9" height="1.9" fill="#fdf6ea"/><rect x="13.1" y="10.0" width="1.9" height="1.9" fill="#fdf6ea"/>' +
      '<rect x="8.7" y="12.6" width="1.9" height="1.9" fill="#fdf6ea"/><rect x="13.1" y="12.6" width="1.9" height="1.9" fill="#fdf6ea"/>' +
      '<rect x="8.7" y="15.2" width="1.9" height="1.9" fill="#fdf6ea"/><rect x="13.1" y="15.2" width="1.9" height="1.9" fill="#fdf6ea"/></svg>';
    const houseVariants = [house1SVG, house2SVG];
    const buildingVariants = [buildingLowSVG, buildingMidSVG, buildingTallSVG];

    let activeMarker = null;
    const hideTip = () => {
      tip.classList.remove('show');
      if (activeMarker) activeMarker.classList.remove('is-active');
      activeMarker = null;
    };
    const showTip = (city, marker) => {
      const wrapRect = wrap.getBoundingClientRect();
      const markerRect = marker.getBoundingClientRect();
      tip.textContent = city;
      tip.style.left = (markerRect.left - wrapRect.left + markerRect.width / 2) + 'px';
      tip.style.top = (markerRect.top - wrapRect.top) + 'px';
      tip.classList.add('show');
      if (activeMarker && activeMarker !== marker) activeMarker.classList.remove('is-active');
      marker.classList.add('is-active');
      activeMarker = marker;
    };

    mapLocations.forEach(([city, type, x, y], i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'map-home-marker';
      btn.dataset.city = city;
      btn.setAttribute('aria-label', city);
      btn.style.setProperty('--x', x + '%');
      btn.style.setProperty('--y', y + '%');
      btn.innerHTML = type === 'building' ? buildingVariants[i % buildingVariants.length] : houseVariants[i % houseVariants.length];
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
