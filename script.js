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
  // x / y use the same coordinate space as the SVG viewBox (0 0 500 200).
  const apartmentLocations = [
    { name: 'חיפה', x: 80, y: 60 },
    { name: 'חדרה', x: 130, y: 68 },
    { name: 'נתניה', x: 165, y: 78 },
    { name: 'תל אביב', x: 192, y: 82 },
    { name: 'ראשון לציון', x: 210, y: 76 },
    { name: 'רחובות', x: 240, y: 74 },
    { name: 'אשדוד', x: 228, y: 70 },
    { name: 'אשקלון', x: 265, y: 62 },
    { name: 'ירושלים', x: 205, y: 108 },
    { name: 'באר שבע', x: 330, y: 88 }
  ];

  const mapWrap = document.getElementById('map-wrap');
  const pinsLayer = document.getElementById('map-pins-layer');
  const tooltip = document.getElementById('map-tooltip');

  if (mapWrap && pinsLayer && tooltip) {
    const svgNS = 'http://www.w3.org/2000/svg';
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

    apartmentLocations.forEach((loc) => {
      const pin = document.createElementNS(svgNS, 'g');
      pin.setAttribute('class', 'map-pin');
      pin.setAttribute('tabindex', '0');
      pin.setAttribute('role', 'button');
      pin.setAttribute('aria-label', loc.name);

      const halo = document.createElementNS(svgNS, 'circle');
      halo.setAttribute('class', 'pin-halo');
      halo.setAttribute('cx', loc.x);
      halo.setAttribute('cy', loc.y);
      halo.setAttribute('r', '12');
      pin.appendChild(halo);

      const dot = document.createElementNS(svgNS, 'circle');
      dot.setAttribute('class', 'pin-dot');
      dot.setAttribute('cx', loc.x);
      dot.setAttribute('cy', loc.y);
      dot.setAttribute('r', '4');
      pin.appendChild(dot);

      const title = document.createElementNS(svgNS, 'title');
      title.textContent = loc.name;
      pin.appendChild(title);

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
