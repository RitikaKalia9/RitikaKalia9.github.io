/* Pip extras (all additive): follows the cursor, star trail, quick-reply chips, "best 3 projects" tour, recruiter quick view,
   black-hole awareness on space.html, and a mobile menu for space.html. Needs js/guide.js or js/pip-home.js (window.PipAPI). */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, fine = matchMedia('(pointer:fine)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const COLS = ['#ffffff', '#e7d6ff', '#d1a3ff', '#9fe6ff', '#22d3ee', '#ff9fd0'];
  const isSpace = /space\.html/.test(location.pathname), embed = /[?&]embed=1/.test(location.search);

  /* ---------- 1. Pip follows the cursor (desktop only) ---------- */
  const F = window.PipFollow = { on: false, x: 0, y: 0 }; let idle = 0;
  if (fine && !reduce && !embed) addEventListener('pointermove', e => {
    if (window.PipAPI && window.PipAPI.isOpen()) return;                       // she stays put while she is talking
    F.x = clamp(e.clientX + 64, 40, innerWidth - 40); F.y = clamp(e.clientY + 46, 90, innerHeight - 40); F.on = true;
    clearTimeout(idle); idle = setTimeout(() => { F.on = false; }, 3200);      // then she drifts back to her spot
  }, { passive: true });

  /* ---------- 2. tiny star trail behind the cursor ---------- */
  if (fine && !reduce) {
    const cv = document.createElement('canvas'); cv.id = 'pipstars'; const ctx = cv.getContext('2d'), P = []; let W = 0, H = 0, run = false, lastE = 0, dpr = 1;
    const size = () => { dpr = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const add = () => { document.body.appendChild(cv); size(); }; document.body ? add() : document.addEventListener('DOMContentLoaded', add); addEventListener('resize', () => cv.isConnected && size());
    addEventListener('pointermove', e => {
      const n = performance.now(); if (n - lastE < 28) return; lastE = n;
      P.push({ x: e.clientX + (Math.random() - .5) * 6, y: e.clientY + (Math.random() - .5) * 6, vx: (Math.random() - .5) * 26, vy: 10 + Math.random() * 26, a: 0, m: .6 + Math.random() * .5, s: .7 + Math.random() * 1.6, c: COLS[Math.random() * COLS.length | 0] });
      if (P.length > 90) P.shift(); if (!run) { run = true; last = performance.now(); requestAnimationFrame(tick); }
    }, { passive: true });
    let last = 0;
    function tick(now) {
      const dt = Math.min((now - last) / 1000, .05); last = now; ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
      for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.a += dt; if (p.a >= p.m) { P.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; const k = 1 - p.a / p.m; ctx.globalAlpha = k * .85; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (.5 + k), 0, 6.283); ctx.fill(); }
      ctx.globalAlpha = 1; if (P.length) requestAnimationFrame(tick); else { run = false; ctx.clearRect(0, 0, W, H); }
    }
  }

  /* ---------- data helpers ---------- */
  const loadData = cb => { if (window.CARDS) return cb(); const s = document.createElement('script'); s.src = 'js/cards-data.js'; s.onload = cb; document.head.appendChild(s); };
  const cardBy = t => (window.CARDS || []).find(c => c.title === t);
  const links = c => (c && c.links || []).map(l => '<a class="pipm-b" href="' + esc(l.h) + '"' + (/^https?:/.test(l.h) ? ' target="_blank" rel="noopener"' : '') + (/\.pdf$/i.test(l.h) ? ' download' : '') + '>' + esc(l.t) + '</a>').join('');
  const contact = () => (window.CARDS || []).find(c => c.sec === 'contact');

  /* ---------- modal shell (tour + quick view share it) ---------- */
  function modal(id, cls) {
    const m = document.createElement('div'); m.className = 'pipm ' + (cls || ''); m.id = id; m.hidden = true;
    m.innerHTML = '<div class="pipm-card" role="dialog" aria-modal="true" tabindex="-1"><button class="pipm-x" type="button" aria-label="Close">✕</button><div class="pipm-body"></div></div>';
    const add = () => document.body.appendChild(m); document.body ? add() : document.addEventListener('DOMContentLoaded', add);
    const body = m.querySelector('.pipm-body'), card = m.querySelector('.pipm-card'); let prevFocus = null;
    const api = { m, body, open(render) { prevFocus = document.activeElement; render(body); m.hidden = false; requestAnimationFrame(() => { m.classList.add('on'); card.focus(); }); document.documentElement.classList.add('pipm-lock'); },
      close() { m.classList.remove('on'); document.documentElement.classList.remove('pipm-lock'); setTimeout(() => { m.hidden = true; }, 260); if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) {} }, isOpen: () => !m.hidden && m.classList.contains('on') };
    m.querySelector('.pipm-x').addEventListener('click', api.close); m.addEventListener('click', e => { if (e.target === m) api.close(); });
    return api;
  }
  const warpTo = (fn, id) => { if (window.PipWarp) window.PipWarp.run(fn, id); else fn(); };

  /* ---------- 3. "best 3 projects" tour ---------- */
  const BEST = [['StellerCart — Full-Stack E-Commerce', 'A full-stack build: Django, a real cart and payments.'], ['Deep CNN Architectures for Garbage Classification', 'Deep learning: five CNNs compared on real data.'], ['CPU Scheduling Simulator', 'Systems thinking: scheduling algorithms made visible.']];
  const tour = modal('pipTour', 'pipm-tour'); let step = 0;
  function tourRender() {
    const total = BEST.length + 1, b = tour.body;
    let h = '<div class="pipm-eye">Pip’s quick tour · ' + (step + 1) + ' / ' + total + '</div>';
    if (step < BEST.length) {
      const c = cardBy(BEST[step][0]) || { title: BEST[step][0], tags: [], links: [] };
      h += '<div class="pipm-say"><span class="pipm-dot"></span>' + esc(BEST[step][1]) + '</div><div class="pipm-kick">' + esc(c.kicker || c.sub || '') + '</div><h3>' + esc(c.title) + '</h3>' +
        (c.desc ? '<p>' + esc(c.desc) + '</p>' : '') + (c.tags && c.tags.length ? '<div class="pipm-tags">' + c.tags.map(t => '<i>' + esc(t) + '</i>').join('') + '</div>' : '') + '<div class="pipm-row">' + links(c) + '</div>';
    } else {
      const k = contact(), ls = (k && k.links || []).filter(l => /resume|github|linkedin|@/i.test(l.t + l.h));
      h += '<div class="pipm-say"><span class="pipm-dot"></span>That’s the highlights! Want more?</div><h3>Let’s talk.</h3><p>Grab the resume, say hello, or keep exploring.</p><div class="pipm-row">' +
        ls.map(l => '<a class="pipm-b' + (/resume/i.test(l.t) ? ' pri' : '') + '" href="' + (/@/.test(l.t) && !/^mailto:/.test(l.h) ? 'mailto:' + esc(l.t) : esc(l.h)) + '"' + (/^https?:/.test(l.h) ? ' target="_blank" rel="noopener"' : '') + (/\.pdf$/i.test(l.h) ? ' download' : '') + '>' + esc(l.t) + '</a>').join('') +
        (isSpace ? '' : '<button type="button" class="pipm-b" data-act="fly">✦ Fly through the universe</button>') + '<button type="button" class="pipm-b" data-act="quick">Quick view</button></div>';
    }
    h += '<div class="pipm-nav"><button type="button" class="pipm-b" data-act="prev"' + (step ? '' : ' disabled') + '>← Back</button><span class="pipm-dots">' + Array.from({ length: total }, (_, i) => '<i class="' + (i === step ? 'on' : '') + '"></i>').join('') + '</span>' +
      (step < total - 1 ? '<button type="button" class="pipm-b pri" data-act="next">Next →</button>' : '<button type="button" class="pipm-b pri" data-act="close">Done</button>') + '</div>';
    b.innerHTML = h; b.classList.remove('pipm-in'); void b.offsetWidth; b.classList.add('pipm-in');
  }
  tour.body.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a) return; const act = a.dataset.act;
    if (act === 'next') { step++; tourRender(); } else if (act === 'prev') { step--; tourRender(); } else if (act === 'close') tour.close();
    else if (act === 'quick') { tour.close(); setTimeout(openQuick, 280); } else if (act === 'fly') { tour.close(); const f = document.querySelector('.nav-links a[href="space.html"]'); if (f) setTimeout(() => f.click(), 280); }
  });
  function openTour() { loadData(() => { step = 0; warpTo(() => tour.open(() => tourRender()), 'projects'); }); }

  /* ---------- 4. recruiter quick view ---------- */
  const quick = modal('pipQuick', 'pipm-quick');
  function quickRender() {
    const C = window.CARDS || [], G = window.GROUPS || {}, own = {}; Object.keys(G).forEach(w => G[w].forEach(g => own[g.id] = w));
    const real = C.filter(c => !c.cat), of = w => real.filter(c => (own[c.sec] || c.sec) === w);
    const li = c => '<li><b>' + esc(c.title) + '</b>' + (c.kicker ? ' <span>' + esc(c.kicker) + '</span>' : '') + ((c.links || []).length ? ' · ' + c.links.slice(0, 2).map(l => '<a href="' + esc(l.h) + '"' + (/^https?:/.test(l.h) ? ' target="_blank" rel="noopener"' : '') + '>' + esc(l.t) + '</a>').join(' · ') : '') + '</li>';
    const about = of('about').filter(c => c.desc).slice(0, 2), k = contact();
    let h = '<div class="pipm-eye">Quick view · the 60-second version</div><h3>Ritika Kalia</h3><p class="pipm-lead">AI/ML Engineer · Researcher · Full-Stack Developer · Chandigarh, India</p><div class="pipm-row">' + (k ? links(k) : '') + '</div><div class="pipm-cols">';
    if (about.length) h += '<section><h4>About</h4>' + about.map(c => '<p>' + esc(c.desc) + '</p>').join('') + '</section>';
    h += '<section><h4>Skills</h4><ul>' + of('stack').map(c => '<li><b>' + esc(c.title) + '</b> <span>' + esc((c.tags || []).join(', ')) + '</span></li>').join('') + '</ul></section>';
    h += '<section><h4>Research</h4><ul>' + of('research').map(li).join('') + '</ul></section>';
    Object.keys(G).filter(w => w === 'projects').forEach(w => G[w].forEach(g => { const items = real.filter(c => c.sec === g.id); if (items.length) h += '<section><h4>' + esc(g.title) + '</h4><ul>' + items.map(li).join('') + '</ul></section>'; }));
    h += '<section><h4>Journey</h4><ul>' + of('journey').map(c => '<li><b>' + esc(c.title) + '</b>' + (c.kicker ? ' <span>' + esc(c.kicker) + '</span>' : '') + '</li>').join('') + '</ul></section></div>';
    quick.body.innerHTML = h;
  }
  function openQuick() { loadData(() => warpTo(() => quick.open(() => quickRender()), 'about')); }
  if (location.hash === '#quick') addEventListener('load', () => setTimeout(openQuick, 600));

  addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (tour.isOpen()) tour.close(); else if (quick.isOpen()) quick.close(); }
    else if (tour.isOpen() && e.key === 'ArrowRight' && step < BEST.length) { step++; tourRender(); } else if (tour.isOpen() && e.key === 'ArrowLeft' && step > 0) { step--; tourRender(); }
  });

  window.PipExtras = { tour: openTour, quick: openQuick };

  /* ---------- wait for Pip, then add chips, sound hook and black-hole reactions ---------- */
  let tries = 0; const wait = setInterval(() => { if (window.PipAPI) { clearInterval(wait); withPip(window.PipAPI); } else if (++tries > 80) clearInterval(wait); }, 200);
  function withPip(A) {
    const root = A.root, bub = root.querySelector('.bub'), msg = root.querySelector('.msg');
    /* 3. quick-reply chips on Pip's greeting / when she is clicked */
    const chips = [['Best 3 projects', 'tour'], ['Research', 'go:research'], ['Work', 'go:projects'], isSpace ? ['Back to portfolio', 'home'] : ['✦ Fly the universe', 'fly'], ['Quick view', 'quick']];
    new MutationObserver(() => {
      if (msg.querySelector('.chips') || !/Hi, I.m Pip|Psst/.test(msg.textContent)) return;
      const d = document.createElement('div'); d.className = 'chips'; d.innerHTML = chips.map(c => '<button type="button" data-act="' + c[1] + '">' + c[0] + '</button>').join(''); msg.appendChild(d); A.release(15000);
    }).observe(msg, { childList: true });
    msg.addEventListener('click', e => {
      const b = e.target.closest('.chips button'); if (!b) return; const act = b.dataset.act; A.shut();
      const click = sel => { const el = document.querySelector(sel); if (el) el.click(); };
      if (act === 'tour') openTour(); else if (act === 'quick') openQuick();
      else if (act === 'fly') click('.nav-links a[href="space.html"]'); else if (act === 'home') click('nav a.nav-home');
      else if (act.indexOf('go:') === 0) { const id = act.slice(3); click(isSpace ? 'nav a[href="index.html#' + id + '"]' : 'nav a[href="#' + id + '"]'); }
    });
    const freeze = () => { window.PipFreeze = bub.classList.contains('on') && (!!msg.querySelector('.chips') || bub.matches(':hover')); };
    bub.addEventListener('mouseenter', () => { A.hold(); freeze(); }); bub.addEventListener('mouseleave', () => { A.release(3500); freeze(); });
    new MutationObserver(freeze).observe(bub, { attributes: true, attributeFilter: ['class'] }); new MutationObserver(freeze).observe(msg, { childList: true });
    /* sound: a soft chime whenever she speaks (only if the visitor turned sound on) */
    let wasOn = false; new MutationObserver(() => { const on = bub.classList.contains('on'); if (on && !wasOn && window.PipSound) window.PipSound.chime(); wasOn = on; }).observe(bub, { attributes: true, attributeFilter: ['class'] });
    /* 1. near the black hole she gets nervous (space.html only) */
    if (isSpace) { let warned = false; setInterval(() => {
      const c = window.__pipCam; if (!c) return; const hot = c.d < 1500 && c.mode === 'free';
      root.classList.toggle('hot', hot);
      if (c.d < 1000 && c.mode === 'free' && !warned) { warned = true; A.say('Careful! That’s the <b>event horizon</b> — nothing comes back from in there. Let’s not get any closer.', { ms: 6500 }); }
      else if (c.d > 1900) warned = false;
    }, 300); }
  }

  /* ---------- 9. phone: a menu on space.html (the index page already has one) ---------- */
  if (isSpace && !embed) {
    const mk = () => {
      const nav = document.querySelector('nav .nav-links'); if (!nav || document.querySelector('.menu-btn')) return;
      const btn = document.createElement('button'); btn.id = 'pipMenu'; btn.type = 'button'; btn.setAttribute('aria-label', 'Open menu'); btn.innerHTML = '<i class="fas fa-bars"></i>';
      const sheet = document.createElement('div'); sheet.id = 'pipSheet'; sheet.hidden = true;
      sheet.innerHTML = [...nav.querySelectorAll('a')].map((a, i) => '<button type="button" data-i="' + i + '">' + a.textContent.trim() + '</button>').join('');
      document.body.append(btn, sheet); const orig = [...nav.querySelectorAll('a')];
      const toggle = v => { sheet.hidden = !v; btn.innerHTML = '<i class="fas ' + (v ? 'fa-xmark' : 'fa-bars') + '"></i>'; };
      btn.addEventListener('click', () => toggle(sheet.hidden));
      sheet.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; toggle(false); orig[+b.dataset.i].click(); });
    }; document.body ? mk() : document.addEventListener('DOMContentLoaded', mk);
  }
})();
