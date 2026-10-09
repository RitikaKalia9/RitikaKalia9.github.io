/* ============================================================
   UI BEHAVIOUR — cursor, nav, reveal, typing, command palette
   ============================================================ */
(function () {
  const cursor = document.querySelector('.cursor');
  const cursorDot = document.querySelector('.cursor-dot');
  const isTouch = 'ontouchstart' in window;

  if (!isTouch && cursor && cursorDot) {
    let mx = 0, my = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      cursorDot.style.left = (mx - 2) + 'px';
      cursorDot.style.top = (my - 2) + 'px';
    });
    (function loop() {
      cx += (mx - cx) * 0.15;
      cy += (my - cy) * 0.15;
      cursor.style.left = (cx - 11) + 'px';
      cursor.style.top = (cy - 11) + 'px';
      requestAnimationFrame(loop);
    })();

    const hoverables = 'a, button, .bento-item, .project-item, .stack-card, .pub-card, .timeline-item, .cmdk-list li';
    document.querySelectorAll(hoverables).forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
  }

  const nav = document.querySelector('nav');
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 40), { passive: true });

  const menuBtn = document.querySelector('.menu-btn');
  const navLinks = document.querySelector('.nav-links');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      menuBtn.innerHTML = navLinks.classList.contains('active')
        ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
    });
    document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => {
      navLinks.classList.remove('active');
      menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    }));
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('active'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  const phrases = [
    'whoami',
    'cat focus.txt',
    'echo "Building intelligent solutions"',
    'git push origin future'
  ];
  let pi = 0, ci = 0, del = false;
  const typed = document.getElementById('typed');
  function type() {
    if (!typed) return;
    const p = phrases[pi];
    typed.textContent = del ? p.substring(0, ci - 1) : p.substring(0, ci + 1);
    ci = del ? ci - 1 : ci + 1;
    let speed = del ? 35 : 75;
    if (!del && ci === p.length) { speed = 1800; del = true; }
    else if (del && ci === 0) { del = false; pi = (pi + 1) % phrases.length; speed = 500; }
    setTimeout(type, speed);
  }
  type();

  const cmdkData = [
    { icon: '◆', label: 'About', href: '#about' },
    { icon: '◆', label: 'Tech Stack', href: '#stack' },
    { icon: '◆', label: 'Projects', href: '#projects' },
    { icon: '◆', label: 'Web Development', href: '#cat-web' },
    { icon: '◆', label: 'CS & Systems', href: '#cat-systems' },
    { icon: '◆', label: 'AI & Deep Learning', href: '#cat-ai' },
    { icon: '◆', label: 'Research', href: '#research' },
    { icon: '◆', label: 'Under Review', href: '#under-review' },
    { icon: '◆', label: 'In Progress', href: '#in-progress' },
    { icon: '◆', label: 'Journey', href: '#journey' },
    { icon: '◆', label: 'Contact', href: '#contact' },
    { icon: '⌘', label: 'GitHub — RitikaKalia9', href: 'https://github.com/RitikaKalia9', ext: true },
    { icon: '⌘', label: 'LinkedIn', href: 'https://www.linkedin.com/in/ritika-kalia-809984330/', ext: true },
    { icon: '◆', label: 'LeetCode — RitikaKalia9', href: 'https://leetcode.com/u/RitikaKalia9/', ext: true },
    { icon: '↧', label: 'Download Resume', href: 'resume.pdf', ext: true },
    { icon: '✉', label: 'Email — ritikakalia19@gmail.com', href: 'mailto:ritikakalia19@gmail.com', ext: true }
  ];

  const cmdk = document.getElementById('cmdk');
  const cmdkInput = document.getElementById('cmdkInput');
  const cmdkList = document.getElementById('cmdkList');
  let sel = 0;

  function openCmdk() {
    cmdk.classList.add('open');
    cmdkInput.value = '';
    sel = 0;
    renderCmdk('');
    cmdkInput.focus();
  }
  function closeCmdk() { cmdk.classList.remove('open'); }

  function renderCmdk(q) {
    const f = cmdkData.filter(i => i.label.toLowerCase().includes(q.toLowerCase()));
    cmdkList.innerHTML = f.map((i, idx) =>
      `<li data-idx="${idx}" data-href="${i.href}" data-ext="${i.ext ? '1' : ''}" class="${idx === sel ? 'selected' : ''}">
        <span style="color:var(--accent)">${i.icon}</span> ${i.label}
      </li>`
    ).join('');
  }

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdk(); }
    if (e.key === 'Escape') closeCmdk();
    if (!cmdk.classList.contains('open')) return;

    const items = cmdkList.querySelectorAll('li');
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); renderCmdk(cmdkInput.value); }
    if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); renderCmdk(cmdkInput.value); }
    if (e.key === 'Enter') { items[sel] && items[sel].click(); closeCmdk(); }
  });

  cmdkInput.addEventListener('input', e => { sel = 0; renderCmdk(e.target.value); });
  cmdk.addEventListener('click', e => { if (e.target === cmdk) closeCmdk(); });

  cmdkList.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    if (li.dataset.ext) window.open(li.dataset.href, '_blank', 'noopener');
    else {
      const target = document.querySelector(li.dataset.href);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
    closeCmdk();
  });

  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
  }));
})();
