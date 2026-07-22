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
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(open => open.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  // Contact form — the visitor only fills the fields and clicks submit; the inquiry
  // is then delivered automatically to the business email via Web3Forms (free, no
  // server). Running inquiry number starts at 000001.
  //
  // SETUP (one time): go to https://web3forms.com, enter the destination email,
  // and paste the access key you receive below (replace YOUR_ACCESS_KEY).
  const WEB3FORMS_ACCESS_KEY = '1bd41c03-b870-4120-b567-7b2fb0a587ee';
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

  // Footer year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Stats count-up animation
  const statNumbers = document.querySelectorAll('.stat-number');

  // For a stat marked data-weekly="min-max", pick a number in that range that
  // changes automatically once a week. It is derived from the current week index,
  // so it stays the same all week for every visitor and swaps to a new value each
  // week — no server needed.
  const weeklyValue = (min, max) => {
    const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const noise = Math.sin(week * 12.9898) * 43758.5453;
    const frac = noise - Math.floor(noise); // 0..1, deterministic per week
    return min + Math.floor(frac * (max - min + 1));
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

  // Pause/resume the auto-playing hero video so the "reduce motion" control acts
  // as the WCAG 2.2.2 pause mechanism for it too (the class only stops CSS motion).
  const heroVideo = document.querySelector('.hero-media video');
  const syncHeroVideo = (noMotion) => {
    if (!heroVideo) return;
    if (noMotion) { heroVideo.pause(); } else { heroVideo.play().catch(() => {}); }
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
