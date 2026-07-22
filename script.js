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

  // ===== Apartments coverage map =====
  // Draws a tilted map of Israel with one pin per managed apartment. Geography is
  // stored as a simple lat/long-style grid, then rotated + foreshortened so the
  // long country lies diagonally (north/centre in the upper-left, empty Negev to
  // the lower-right). Icons stay upright; hovering/focusing a pin shows its city.
  (function buildCoverageMap() {
    const svg = document.getElementById('coverage-map');
    if (!svg) return;
    const NS = 'http://www.w3.org/2000/svg';

    // Country outline (base grid: x≈east, y≈south), clockwise from the north tip.
    const border = [
      [117.7, 2], [77.6, 21], [75.9, 29], [64, 47], [58.9, 86], [55.4, 97],
      [46.9, 122], [37.5, 150], [31.6, 164], [8.5, 195], [18.8, 242],
      [64, 375], [76.8, 280], [99, 230], [108.3, 180], [110.9, 143],
      [110.9, 80], [122, 45], [132.2, 20]
    ];
    // Two faint interior lines for a "map" feel (west-coast → Jordan valley).
    const regionLines = [
      [[55.4, 97], [110.9, 143]],
      [[46.9, 122], [108.3, 180]]
    ];

    // [city, x, y, howManyApartments]. Sum of counts = 42.
    const cities = [
      ['תל אביב', 46.9, 122, 4], ['רמת גן', 52, 122, 4], ['בת ים', 46.9, 128, 3],
      ['הרצליה', 54.6, 114, 3], ['פתח תקווה', 58.9, 121, 4], ['גבעתיים', 52, 123, 1],
      ['בני ברק', 53.7, 122, 1], ['חולון', 49.5, 129, 2], ['ראשון לציון', 50.3, 134, 2],
      ['רעננה', 57.2, 112, 2], ['כפר סבא', 60.6, 112, 1], ['רחובות', 52, 141, 1],
      ['קרית אונו', 56.3, 124, 1], ['אור יהודה', 55.4, 127, 1], ['רמלה', 57.2, 135, 1],
      ['נתניה', 55.4, 97, 2], ['חדרה', 61.4, 86, 1], ['חיפה', 64, 47, 2],
      ['קריות', 75.1, 47, 2], ['אשדוד', 38.4, 150, 2], ['אשקלון', 31.6, 164, 2]
    ];

    // rotate (−50°) around a centre, then squash vertically for a 3D-ish tilt.
    const A = -50 * Math.PI / 180, cosA = Math.cos(A), sinA = Math.sin(A);
    const cx = 70, cy = 160, sy = 0.72;
    const tf = (x, y) => {
      const rx = cx + (x - cx) * cosA - (y - cy) * sinA;
      let ry = cy + (x - cx) * sinA + (y - cy) * cosA;
      ry = cy + (ry - cy) * sy;
      return [rx, ry];
    };

    // deterministic jitter so multiple apartments in one city fan out a little
    const rnd = (s) => { const v = Math.sin(s * 127.1) * 43758.5; return v - Math.floor(v); };
    const pins = []; let seed = 1;
    cities.forEach(([name, bx, by, n]) => {
      for (let i = 0; i < n; i++) {
        let ox = 0, oy = 0;
        if (n > 1) {
          const ang = rnd(seed++) * 6.283, r = 5 + rnd(seed++) * 9;
          ox = Math.cos(ang) * r; oy = Math.sin(ang) * r;
        }
        const [px, py] = tf(bx + ox, by + oy);
        pins.push({ name, px, py, building: rnd(seed++) > 0.5 });
      }
    });

    // viewBox from the transformed extent (+ padding for icon size & shadow)
    const pts = border.map(([x, y]) => tf(x, y)).concat(pins.map((p) => [p.px, p.py]));
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    pts.forEach(([x, y]) => {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    });
    const pad = 20;
    svg.setAttribute('viewBox',
      `${(minX - pad).toFixed(1)} ${(minY - pad).toFixed(1)} ${(maxX - minX + 2 * pad).toFixed(1)} ${(maxY - minY + 2 * pad).toFixed(1)}`);

    const el = (name, attrs, html) => {
      const n = document.createElementNS(NS, name);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      if (html != null) n.innerHTML = html;
      return n;
    };

    // landmass
    const dLand = border.map((p, i) => {
      const [x, y] = tf(p[0], p[1]);
      return (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ') + ' Z';
    svg.appendChild(el('path', { d: dLand, class: 'map-land' }));

    regionLines.forEach(([a, b]) => {
      const [ax, ay] = tf(a[0], a[1]), [bx, by] = tf(b[0], b[1]);
      svg.appendChild(el('line', { x1: ax.toFixed(1), y1: ay.toFixed(1), x2: bx.toFixed(1), y2: by.toFixed(1), class: 'map-region' }));
    });

    const houseSVG =
      '<path class="pin-hit" d="M-8,-1 L0,-8 L8,-1 Z" fill="#f4f1ec" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
      '<path d="M-6,-1 L-6,8 L6,8 L6,-1 Z" fill="#f4f1ec" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
      '<path d="M-2,8 L-2,2 L2,2 L2,8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>';
    const buildingSVG = (() => {
      let s = '<path class="pin-hit" d="M-6,-9 L6,-9 L6,8 L-6,8 Z" fill="#f4f1ec" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>';
      [-6.5, -2.5, 1.5].forEach((wy) => {
        [-3.8, 1.2].forEach((wx) => {
          s += `<rect x="${wx}" y="${wy}" width="2.6" height="2.6" fill="none" stroke="currentColor" stroke-width="1.1" vector-effect="non-scaling-stroke"/>`;
        });
      });
      s += '<rect x="-1.4" y="4.5" width="2.8" height="3.5" fill="none" stroke="currentColor" stroke-width="1.1" vector-effect="non-scaling-stroke"/>';
      return s;
    })();

    const wrap = svg.closest('.coverage-wrap');
    const tip = document.getElementById('map-tooltip');
    const showTip = (name, node) => {
      tip.textContent = name;
      const wr = wrap.getBoundingClientRect(), r = node.getBoundingClientRect();
      tip.style.left = (r.left - wr.left + r.width / 2) + 'px';
      tip.style.top = (r.top - wr.top) + 'px';
      tip.classList.add('show');
    };
    const hideTip = () => tip.classList.remove('show');

    const k = 0.58; // icon scale
    pins.forEach((p) => {
      const g = el('g', {
        class: 'map-pin',
        transform: `translate(${p.px.toFixed(1)} ${p.py.toFixed(1)}) scale(${k})`,
        tabindex: '0', role: 'img', 'aria-label': 'דירה ב' + p.name
      }, `<title>${p.name}</title><g class="pin-inner">${p.building ? buildingSVG : houseSVG}</g>`);
      g.addEventListener('mouseenter', () => showTip(p.name, g));
      g.addEventListener('mouseleave', hideTip);
      g.addEventListener('focus', () => showTip(p.name, g));
      g.addEventListener('blur', hideTip);
      svg.appendChild(g);
    });
  })();

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
