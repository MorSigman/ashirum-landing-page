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

  // Contact form — sends leads via Formspree (https://formspree.io).
  // After signing up and creating a form there, replace the ID below with your real form ID.
  const FORM_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID';
  const form = document.getElementById('contact-form');
  const note = document.getElementById('form-note');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    note.textContent = 'שולח...';
    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (response.ok) {
        note.textContent = 'תודה! קיבלנו את הפרטים ונחזור אליכם בהקדם.';
        form.reset();
      } else {
        note.textContent = 'אירעה שגיאה בשליחה. אפשר לנסות שוב או ליצור קשר בטלפון/וואטסאפ.';
      }
    } catch (err) {
      note.textContent = 'אירעה שגיאה בשליחה. אפשר לנסות שוב או ליצור קשר בטלפון/וואטסאפ.';
    }
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

  const applyState = (key, on) => {
    document.documentElement.classList.toggle(a11yClassMap[key], on);
    localStorage.setItem('a11y-' + key, on ? '1' : '0');
    const tile = document.querySelector(`.a11y-tile[data-a11y="${key}"]`);
    if (tile) {
      tile.classList.toggle('active', on);
      tile.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  };

  Object.keys(a11yClassMap).forEach((key) => {
    applyState(key, localStorage.getItem('a11y-' + key) === '1');
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

  // Isometric coverage map — edit this array to update the pins.
  // x / y are percentages (0-100) positioned over the tilted map plane.
  const geoLocations = [
    { name: 'נהריה', x: 12, y: 46 },
    { name: 'חיפה', x: 18, y: 42 },
    { name: 'תל אביב', x: 45, y: 34 },
    { name: 'חולון', x: 48, y: 36 },
    { name: 'גן יבנה', x: 53, y: 36 },
    { name: 'ירושלים', x: 52, y: 54 },
    { name: 'באר שבע', x: 78, y: 45 }
  ];

  const pinsLayer = document.getElementById('map-pins-layer');
  if (pinsLayer) {
    geoLocations.forEach((loc) => {
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'geo-pin';
      pin.style.left = loc.x + '%';
      pin.style.top = loc.y + '%';
      pin.setAttribute('aria-label', loc.name);
      pin.innerHTML =
        '<span class="pin-shadow"></span>' +
        '<span class="pin-body"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' +
        '<path d="M12 21s7-6.2 7-11.5A7 7 0 105 9.5C5 14.8 12 21 12 21z"/>' +
        '<circle cx="12" cy="9.5" r="2.3" fill="#fff" stroke="none"/></svg></span>' +
        '<span class="pin-tooltip">' + loc.name + '</span>';
      pinsLayer.appendChild(pin);
    });
  }
});
