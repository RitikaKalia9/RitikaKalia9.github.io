/* ============================================================
   CARD ANIMATION ENGINE — tilt, spotlight, counters
   ============================================================ */
(function () {
  const isTouch = 'ontouchstart' in window;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document
    .querySelectorAll('.bento-grid, .stack-grid, .pub-grid, .projects-list, .contact-socials')
    .forEach(grid => {
      Array.from(grid.children).forEach((child, i) => {
        child.style.setProperty('--i', i);
      });
    });

  function addSpotlight(card) {
    if (card.querySelector(':scope > .card-spotlight')) return;
    const sp = document.createElement('div');
    sp.className = 'card-spotlight';
    sp.setAttribute('aria-hidden', 'true');
    card.insertBefore(sp, card.firstChild);
  }

  if (!isTouch && !reduced) {
    const TILT_SELECTOR = '.bento-item, .stack-card, .pub-card, .quote-strip, .terminal';

    document.querySelectorAll(TILT_SELECTOR).forEach(card => {
      if (getComputedStyle(card).position === 'static') {
        card.style.position = 'relative';
      }
      card.classList.add('card-fx');
      addSpotlight(card);

      const isLarge = card.classList.contains('quote-strip') ||
        card.classList.contains('terminal');
      const TILT = isLarge ? 2.2 : 5.5;

      let raf = 0;
      let targetRX = 0, targetRY = 0, currRX = 0, currRY = 0;
      let targetMX = 50, targetMY = 50, currMX = 50, currMY = 50;
      let hovering = false;

      function loop() {
        currRX += (targetRX - currRX) * 0.18;
        currRY += (targetRY - currRY) * 0.18;
        currMX += (targetMX - currMX) * 0.22;
        currMY += (targetMY - currMY) * 0.22;

        card.style.setProperty('--rx', currRX.toFixed(3) + 'deg');
        card.style.setProperty('--ry', currRY.toFixed(3) + 'deg');
        card.style.setProperty('--mx', currMX.toFixed(2) + '%');
        card.style.setProperty('--my', currMY.toFixed(2) + '%');

        const settled =
          Math.abs(targetRX - currRX) < 0.02 &&
          Math.abs(targetRY - currRY) < 0.02 &&
          Math.abs(targetMX - currMX) < 0.05 &&
          Math.abs(targetMY - currMY) < 0.05;

        raf = (hovering || !settled) ? requestAnimationFrame(loop) : 0;
      }

      card.addEventListener('mouseenter', () => {
        hovering = true;
        card.classList.add('card-active');
        if (!raf) raf = requestAnimationFrame(loop);
      });

      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        targetRY = (px - 0.5) * 2 * TILT;
        targetRX = (0.5 - py) * 2 * TILT;
        targetMX = px * 100;
        targetMY = py * 100;
        if (!raf) raf = requestAnimationFrame(loop);
      }, { passive: true });

      card.addEventListener('mouseleave', () => {
        hovering = false;
        card.classList.remove('card-active');
        targetRX = targetRY = 0;
        targetMX = targetMY = 50;
        if (!raf) raf = requestAnimationFrame(loop);
      });
    });

    document.querySelectorAll('.project-item').forEach(card => {
      addSpotlight(card);
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(2) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(2) + '%');
      }, { passive: true });
    });
  }

  function animateNumber(el) {
    const target = parseFloat(el.dataset.target);
    const decimals = parseInt(el.dataset.decimals, 10);
    const duration = 1500;
    const start = performance.now();

    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 4);
      const v = target * e;
      el.textContent = v.toFixed(decimals);

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target.toFixed(decimals);
        el.classList.add('popped');
        setTimeout(() => el.classList.remove('popped'), 600);
      }
    }
    requestAnimationFrame(step);
  }

  const numObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateNumber(e.target);
        numObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.55 });

  document.querySelectorAll('.bento-number').forEach(el => {
    const raw = el.textContent.trim();
    const target = parseFloat(raw);
    if (isNaN(target)) return;
    const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
    el.dataset.target = target;
    el.dataset.decimals = decimals;
    el.textContent = (0).toFixed(decimals);
    numObserver.observe(el);
  });

  const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('in-view');
      else e.target.classList.remove('in-view');
    });
  }, { threshold: 0.35, rootMargin: '-10% 0px -10% 0px' });

  document.querySelectorAll('.project-item').forEach(el => activeObserver.observe(el));
})();
