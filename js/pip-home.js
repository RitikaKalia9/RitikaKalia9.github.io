/* Pip on the scrolling portfolio: greets visitors, invites them to fly through the universe (space.html), and comments on each section as it scrolls into view. Shares css/guide.css with space.html. */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, small = () => matchMedia('(max-width:899px)').matches;
  const store = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: k => { try { sessionStorage.setItem(k, '1'); } catch (e) {} } };
  const root = document.createElement('div'); root.id = 'pip'; root.setAttribute('aria-live', 'polite');
  root.innerHTML = '<button class="pf" type="button" aria-label="Pip, your guide: show a tip"><svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">' +
    '<g class="wing"><path d="M22 24C12 8 3 11 5 20c1 6 9 8 17 4z" fill="rgba(110,225,255,.5)" stroke="rgba(255,255,255,.8)" stroke-width=".8"/></g>' +
    '<g class="wing r"><path d="M22 24C32 8 41 11 39 20c-1 6-9 8-17 4z" fill="rgba(255,150,215,.5)" stroke="rgba(255,255,255,.8)" stroke-width=".8"/></g>' +
    '<circle class="glow" cx="22" cy="24" r="8" fill="rgba(185,140,255,.5)"/><circle cx="22" cy="24" r="4.2" fill="#f4eeff"/></svg></button>' +
    '<div class="bub" role="status"><span class="who">Pip · your guide</span><div class="msg"></div><div class="row"><button type="button" class="hide">Hide for now</button><a class="go" href="space.html">Fly there →</a></div></div>';
  document.body.appendChild(root);
  const bub = root.querySelector('.bub'), msg = root.querySelector('.msg'), fairy = root.querySelector('.pf'), goLink = root.querySelector('.go');
  if (store.get('pip-off') === '1') root.classList.add('off');

  let W = innerWidth, H = innerHeight, x = W - 70, y = H * .5, anchor = null, hideT = 0, t0 = 0, lastTip = 0;
  addEventListener('resize', () => { W = innerWidth; H = innerHeight; });
  const home = () => { const f = window.PipFollow; if (f && f.on) return [f.x, f.y]; return small() ? [W - 44, H - 120] : [W - 70, H * .62]; };

  function place() {
    const w = Math.min(260, W - 32); bub.style.width = w + 'px';
    const left = x > W / 2; bub.style.left = (left ? -w - 22 : 28) + 'px';
    bub.style.top = (y > H * .6 ? -bub.offsetHeight - 6 : -22) + 'px';
    const r = bub.getBoundingClientRect(); if (r.left < 12) bub.style.left = (parseFloat(bub.style.left) + 12 - r.left) + 'px';
    if (r.right > W - 12) bub.style.left = (parseFloat(bub.style.left) - (r.right - W + 12)) + 'px';
  }
  function say(html, o) {
    if (root.classList.contains('off')) return; o = o || {};
    clearTimeout(hideT); msg.innerHTML = html; goLink.style.display = o.go ? '' : 'none'; bub.classList.add('on'); anchor = o.to || null; lastTip = performance.now(); place();
    hideT = setTimeout(shut, o.ms || 7500);
  }
  function shut() { clearTimeout(hideT); bub.classList.remove('on'); anchor = null; }
  root.querySelector('.hide').addEventListener('click', () => { shut(); store.set('pip-off'); root.classList.add('off'); });
  bub.addEventListener('mouseenter', () => clearTimeout(hideT)); bub.addEventListener('mouseleave', () => { hideT = setTimeout(shut, 3500); });

  let last = performance.now();
  (function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .05); last = now; t0 += dt;
    let [hx, hy] = home(); if (anchor) { const r = anchor(); if (r) { hx = r[0]; hy = r[1]; } }
    const still = reduce || window.PipFreeze, tx = still ? hx : hx + Math.sin(t0 * .7) * 14, ty = still ? hy : hy + Math.cos(t0 * .9) * 12, k = 1 - Math.exp(-dt * (anchor ? 2.4 : 1.4));
    x += (tx - x) * k; y += (ty - y) * k; root.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    if (bub.classList.contains('on')) place();
  })(last);

  /* the "Fly" button in the nav (added by planets.js): Pip points at it and "Fly there" presses it (opens the 3D universe overlay) */
  const flyBtn = () => document.querySelector('.nav-links a[href="space.html"]');
  const uni = { getBoundingClientRect: () => (flyBtn() || document.body).getBoundingClientRect() };
  goLink.addEventListener('click', e => { const f = flyBtn(); if (f) { e.preventDefault(); shut(); f.click(); } });
  const uniPos = () => { if (!flyBtn()) return null; const r = uni.getBoundingClientRect(); return r.width ? [r.left + r.width / 2 + 6, r.bottom + 46] : null; };

  const LINES = {
    about: 'That’s Ritika! Scroll on — every section is a chapter of her work.',
    stack: 'The tools she reaches for: Python, PyTorch, Django and more.',
    research: 'A published paper, peer-reviewed. Open the links to read it.',
    'under-review': 'These papers are submitted and waiting on reviewers. Fingers crossed!',
    projects: 'Real projects — web apps, deep learning, and systems work. Peek at the code links.',
    'in-progress': 'Still cooking. Things here change often.',
    journey: 'Leadership, education and experience — the path so far.',
    contact: 'Like what you see? Say hi! Or… want to see it differently?'
  };
  const seen = {}; let cur = null, tmr = 0;
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cur = e.target.id; clearTimeout(tmr);
    tmr = setTimeout(function again() {                       // speak for the section the visitor settled on, not ones they scrolled past
      if (!cur || seen[cur] || !LINES[cur]) return;
      if (seen.greet === 'live') { tmr = setTimeout(again, 1500); return; }
      seen[cur] = 1; say(LINES[cur], cur === 'contact' ? { go: true, ms: 9000 } : { ms: 6500 });
    }, 900);
  }), { rootMargin: '-40% 0px -40% 0px', threshold: 0 });   // a section counts when it crosses the middle of the screen (some sections are taller than the screen)
  document.querySelectorAll('section[id]').forEach(s => io.observe(s));

  /* greeting: invite them to fly through the universe */
  if (!sessionStorage.getItem('pip-home-greeted')) setTimeout(() => {
    try { sessionStorage.setItem('pip-home-greeted', '1'); } catch (e) {}
    seen.greet = 'live';
    say('<b>Hi, I’m Pip!</b> This portfolio has a secret: you can <b>fly through it</b> — six worlds orbiting a black hole, one for each chapter. Want to try?', { go: true, ms: 9500, to: uniPos });
    setTimeout(() => { seen.greet = 'done'; }, 10000);
  }, 2200);
  fairy.addEventListener('click', () => say('Psst — you can <b>fly through this portfolio</b> as a little universe. Come take a look!', { go: true, ms: 9000, to: uniPos }));
  window.PipAPI = { page: 'home', root, say, shut, hold: () => clearTimeout(hideT), release: ms => { clearTimeout(hideT); hideT = setTimeout(shut, ms || 3500); }, isOpen: () => bub.classList.contains('on') };
})();
