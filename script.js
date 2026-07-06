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

  // Contact form
  const form = document.getElementById('contact-form');
  const note = document.getElementById('form-note');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    note.textContent = 'תודה! קיבלנו את הפרטים ונחזור אליכם בהקדם.';
    form.reset();
  });

  // Footer year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Stats count-up animation
  const statNumbers = document.querySelectorAll('.stat-number');
  const animateCount = (el) => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1200;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const value = Math.floor(progress * target);
      el.textContent = value.toLocaleString('he-IL');
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target.toLocaleString('he-IL');
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
  const a11yInc = document.getElementById('a11y-inc');
  const a11yDec = document.getElementById('a11y-dec');
  const a11yResetSize = document.getElementById('a11y-reset-size');
  const a11yContrast = document.getElementById('a11y-contrast');
  const a11yReset = document.getElementById('a11y-reset');
  let fontStep = parseInt(localStorage.getItem('a11yFontStep') || '0', 10);
  let contrastOn = localStorage.getItem('a11yContrast') === '1';

  const applyFontStep = () => {
    document.documentElement.style.fontSize = (100 + fontStep * 10) + '%';
    localStorage.setItem('a11yFontStep', fontStep);
  };
  const applyContrast = () => {
    document.documentElement.classList.toggle('a11y-contrast', contrastOn);
    a11yContrast.textContent = contrastOn ? 'כיבוי' : 'הפעלה';
    localStorage.setItem('a11yContrast', contrastOn ? '1' : '0');
  };
  applyFontStep();
  applyContrast();

  a11yToggle.addEventListener('click', () => a11yPanel.classList.toggle('open'));
  a11yInc.addEventListener('click', () => { fontStep = Math.min(fontStep + 1, 4); applyFontStep(); });
  a11yDec.addEventListener('click', () => { fontStep = Math.max(fontStep - 1, -2); applyFontStep(); });
  a11yResetSize.addEventListener('click', () => { fontStep = 0; applyFontStep(); });
  a11yContrast.addEventListener('click', () => { contrastOn = !contrastOn; applyContrast(); });
  a11yReset.addEventListener('click', () => {
    fontStep = 0;
    contrastOn = false;
    applyFontStep();
    applyContrast();
  });
  document.addEventListener('click', (e) => {
    if (!a11yPanel.contains(e.target) && !a11yToggle.contains(e.target)) {
      a11yPanel.classList.remove('open');
    }
  });

  // Interactive apartment locations map
  // Edit this array to update the pins shown on the map.
  // x / y are percentages (0-100) positioned over the map area.
  const mapLocations = [
    { name: 'חיפה', x: 16, y: 30 },
    { name: 'חדרה', x: 24, y: 34 },
    { name: 'נתניה', x: 30, y: 35 },
    { name: 'פתח תקווה', x: 33, y: 38 },
    { name: 'תל אביב', x: 35, y: 41 },
    { name: 'חולון', x: 36, y: 43 },
    { name: 'בת ים', x: 37, y: 44 },
    { name: 'ראשון לציון', x: 38, y: 45 },
    { name: 'לוד', x: 39, y: 40 },
    { name: 'רמלה', x: 40, y: 42 },
    { name: 'רחובות', x: 40, y: 46 },
    { name: 'יבנה', x: 42, y: 47 },
    { name: 'אשדוד', x: 41, y: 49 },
    { name: 'אשקלון', x: 43, y: 52 },
    { name: 'ירושלים', x: 47, y: 44 },
    { name: 'קריית גת', x: 48, y: 51 },
    { name: 'נתיבות', x: 52, y: 53 },
    { name: 'באר שבע', x: 60, y: 50 }
  ];

  const mapWrap = document.getElementById('map-wrap');
  const pinsLayer = document.getElementById('map-pins-layer');
  const tooltip = document.getElementById('map-tooltip');

  if (mapWrap && pinsLayer && tooltip) {
    let activePin = null;

    const hideTooltip = () => {
      tooltip.classList.remove('visible');
      if (activePin) activePin.classList.remove('active');
      activePin = null;
    };

    const showTooltip = (pinEl, name) => {
      activePin = pinEl;
      pinEl.classList.add('active');
      tooltip.textContent = name;
      const pinBox = pinEl.getBoundingClientRect();
      const wrapBox = mapWrap.getBoundingClientRect();
      const left = pinBox.left - wrapBox.left + pinBox.width / 2;
      const top = pinBox.top - wrapBox.top;
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
      tooltip.classList.add('visible');
    };

    mapLocations.forEach((loc) => {
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'map-pin-v2';
      pin.style.left = loc.x + '%';
      pin.style.top = loc.y + '%';
      pin.setAttribute('aria-label', loc.name);
      pin.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s7-6.2 7-11.5A7 7 0 105 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.3" fill="currentColor" stroke="none"/></svg>';

      pin.addEventListener('mouseenter', () => showTooltip(pin, loc.name));
      pin.addEventListener('mouseleave', hideTooltip);
      pin.addEventListener('focus', () => showTooltip(pin, loc.name));
      pin.addEventListener('blur', hideTooltip);
      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        showTooltip(pin, loc.name);
      });

      pinsLayer.appendChild(pin);
    });

    document.addEventListener('click', (e) => {
      if (activePin && !pinsLayer.contains(e.target)) hideTooltip();
    });
    window.addEventListener('scroll', hideTooltip, { passive: true });
  }
});
