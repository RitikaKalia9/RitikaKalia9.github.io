/* Per-world card tornado. Clicking a planet opens only that world's cards, spiralling over the same space scene. */
(function () {
  if (!window.CARDS || !window.__space) return;
  const $ = id => document.getElementById(id), D = window.CARDS, S = window.__space;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // same order and ids as WORLDS in space.html
  const WORLDS = [
    { id: 'about', name: 'About', col: '#c9a0ff', txt: 'Building intelligent solutions for a smarter tomorrow.' },
    { id: 'stack', name: 'Stack', col: '#22d3ee', txt: 'Tools that turn ideas into shipped products.' },
    { id: 'research', name: 'Research', col: '#7aa2ff', txt: 'Published research and work under peer review.' },
    { id: 'projects', name: 'Work', col: '#f0a080', txt: 'Things I\u2019ve built, grouped by what they taught me.' },
    { id: 'journey', name: 'Journey', col: '#ff8fc0', txt: 'Leadership, education, and experience.' },
    { id: 'contact', name: 'Contact', col: '#8ef0c4', txt: 'Let\u2019s build something together.' }
  ];
  const NW = WORLDS.length, deckOf = w => D.map((c, i) => i).filter(i => D[i].sec === WORLDS[w].id);
  const GROUP = {}; Object.keys(window.GROUPS || {}).forEach(w => window.GROUPS[w].forEach(g => GROUP[g.id] = g));
  const catDeck = id => D.map((c, i) => i).filter(i => D[i].sec === id);   // cards of one category
  const HASH = {}; WORLDS.forEach((w, i) => HASH[w.id] = [i, 0]);
  HASH['under-review'] = [2, 0, 'review'];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const root = document.createElement('div'); root.id = 'torn';
  root.innerHTML = '<canvas id="dustB"></canvas><div class="tstage"><div class="trig"></div></div><canvas id="dustF"></canvas>' +
    '<button class="tback" type="button"><b>\u2715</b> Back to space <kbd>Esc</kbd></button>' +
    '<button class="tcatback" type="button" hidden>\u2190 All categories</button>' +
    '<div class="thead"><div class="tname"></div><div class="ttxt"></div></div><div class="tindex" role="navigation" aria-label="Cards in this world"></div>' +
    '<div class="tbar"><button class="tprev" type="button"></button><span class="tcount"></span><button class="tnextw" type="button"></button></div>';
  document.body.appendChild(root);
  const rig = root.querySelector('.trig'), idxBox = root.querySelector('.tindex'), cnt = root.querySelector('.tcount');
  const catBack = root.querySelector('.tcatback'), nameEl = root.querySelector('.tname'), txtEl = root.querySelector('.ttxt'), prevB = root.querySelector('.tprev'), nextB = root.querySelector('.tnextw');
  const cvB = $('dustB'), cvF = $('dustF'), cB = cvB.getContext('2d'), cF = cvF.getContext('2d');

  let wi = 0, cat = null, deck = [], N = 1, idxBtns = [], lastCur = -1;
  const wrap = x => ((x + N / 2) % N + N) % N - N / 2;
  const els = D.map((c, i) => {
    const e = document.createElement('article'); e.className = 'tc'; e._k = 0;
    e.innerHTML = (c.img ? '<img src="' + esc(c.img) + '" alt="" loading="lazy" onerror="this.remove()">' : '') +
      '<div class="tk">' + esc(c.kicker || c.sub) + '</div><h3>' + esc(c.title) + '</h3>' +
      (c.stats ? '<div class="ts">' + c.stats.map(s => '<div><b>' + esc(s.n) + '</b><span>' + esc(s.l) + '</span></div>').join('') + '</div>' : '') +
      (c.desc ? '<p>' + esc(c.desc) + '</p>' : '') +
      (c.tags.length ? '<div class="tt">' + c.tags.map(t => '<i>' + esc(t) + '</i>').join('') + '</div>' : '') +
      (c.locked ? '<div class="tl">Available after publication</div>' : '') +
      (c.links.length ? '<div class="tn">' + c.links.map(l => '<a href="' + esc(l.h) + '"' + (/^https?/.test(l.h) ? ' target="_blank" rel="noopener"' : '') + (/\.pdf$/.test(l.h) ? ' download' : '') + '>' + esc(l.t) + '</a>').join('') + '</div>' : '') +
      (c.cat ? '<div class="tn"><a href="#" class="tcat">Open ' + c.n + ' ' + esc(c.noun) + ' \u2192</a></div>' : '');
    // a card that is not in front only brings itself to the front; its links work once it is there
    e.addEventListener('click', ev => { if (Math.abs(wrap(e._k - target)) > .45) { ev.preventDefault(); ev.stopPropagation(); go(e._k); } }, true);
    if (c.cat) e.addEventListener('click', ev => { ev.preventDefault(); if (Math.abs(wrap(e._k - target)) <= .45) enterCat(c.cat); });   // the front category card opens its deck
    rig.appendChild(e); return e;
  });

  /* geometry: funnel radius grows with height; each card sits one step further round the helix.
     Small decks close into a ring; big ones wind up as a spiral. Scrolling wraps, so it never dead-ends. */
  const P = 1400, DY = 58, WIN = 7.5, AX = -7 * Math.PI / 180, CY = .52, cosX = Math.cos(AX), sinX = Math.sin(AX);
  let W, H, R, ZOFF, A = .72, dpr = 1;
  const rad = s => R * (.42 + .58 * Math.pow(clamp((s + 3.5) / 11, 0, 1), .8));
  function size() {
    W = innerWidth; H = innerHeight; R = clamp(W * .4, 300, 560); ZOFF = rad(0); dpr = Math.min(devicePixelRatio || 1, 2);
    A = N < 9 ? 2 * Math.PI / N : (W < 700 ? 1 : .72);
    [cvB, cvF].forEach(c => { c.width = W * dpr; c.height = H * dpr; c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); });
  }
  addEventListener('resize', size);

  let active = false, leaving = false, introT = 0, pos = 0, target = 0, T = 0, last = 0, lastIn = 0, touchY = null, sp = 0;
  const go = k => { target = Math.round(target) + wrap(k - Math.round(target)); lastIn = performance.now(); };
  const PN = reduce ? 0 : (innerWidth < 700 ? 220 : 480), rnd = Math.random;
  const dust = Array.from({ length: PN }, () => ({ s: -4 + rnd() * 14.5, a: rnd() * 6.283, j: .8 + rnd() * .7, z: .5 + rnd() * 1.6, w: .5 + rnd() }));

  function setDeck(w, k, cid) {
    wi = w; cat = cid || null; deck = cat ? catDeck(cat) : deckOf(w); N = deck.length; size();
    els.forEach(e => { e.style.display = 'none'; e._v = 0; }); deck.forEach((d, j) => { els[d]._k = j; els[d].style.setProperty('--c', WORLDS[w].col); });
    pos = target = clamp(k || 0, 0, N - 1); introT = reduce ? 1 : .001; lastCur = -1;
    root.style.setProperty('--sc', WORLDS[w].col); nameEl.textContent = cat ? WORLDS[w].name + ' \u00b7 ' + GROUP[cat].title : WORLDS[w].name; txtEl.textContent = cat ? GROUP[cat].desc : WORLDS[w].txt; catBack.hidden = !cat;
    const subs = false; let h = '', prev = '';
    deck.forEach((d, j) => { const c = D[d]; if (subs && c.sub !== prev) { h += '<h4>' + esc(c.sub) + '</h4>'; prev = c.sub; } h += '<button type="button" data-k="' + j + '">' + esc(c.title) + '</button>'; });
    idxBox.innerHTML = h; idxBtns = [...idxBox.querySelectorAll('button')]; idxBtns.forEach(b => b.onclick = () => go(+b.dataset.k)); idxBox.scrollTop = 0;
    prevB.textContent = '\u2190 ' + WORLDS[(w + NW - 1) % NW].name; nextB.textContent = WORLDS[(w + 1) % NW].name + ' \u2192';
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!active) return;
    const dt = Math.min((now - last) / 1000, .05); last = now; T += dt;
    introT = clamp(introT + (leaving ? -dt / 1.1 : dt / 2.6), 0, 1);
    if (leaving && introT <= 0) { active = false; leaving = false; root.classList.remove('on'); return; }
    const e = reduce ? introT : 1 - Math.pow(1 - introT, 3), lift = (1 - e) * H * .26;

    if (now - lastIn > 170 && touchY === null) target += (Math.round(target) - target) * (1 - Math.exp(-dt * 7));
    const np = pos + (target - pos) * (1 - Math.exp(-dt * 5.5)); sp = Math.min(Math.abs(np - pos) / Math.max(dt, .001), 6); pos = np;

    for (let k = 0; k < N; k++) {
      const el = els[deck[k]], s = wrap(k - pos);
      if (Math.abs(s) > WIN) { if (el._v) { el.style.display = 'none'; el._v = 0; } continue; }
      const a = s * A + (1 - e) * 5.5, r = rad(s) * e, f = Math.cos(a);
      const x = Math.sin(a) * r, y = -s * DY + lift, z = f * r - ZOFF;
      const face = clamp((f + .35) / 1.35, 0, 1), vis = 1 - clamp((Math.abs(s) - 4.5) / 2, 0, 1);
      const blur = (1 - face) * 3 + Math.min(sp * .55, 2.4);
      if (!el._v) { el.style.display = 'block'; el._v = 1; }
      el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px) rotateY(' + a.toFixed(4) + 'rad) translate(-50%,-50%)';
      el.style.opacity = ((.1 + .9 * face * face) * vis * e).toFixed(3);
      el.style.filter = blur > .35 ? 'blur(' + blur.toFixed(2) + 'px)' : 'none';
      el.style.pointerEvents = (f > .25 && Math.abs(s) < 3.4 && e > .9) ? 'auto' : 'none';
      el.classList.toggle('on', Math.abs(s) < .45);
    }

    // swirling debris + wind bands, same funnel and projection as the cards
    cB.clearRect(0, 0, W, H); cF.clearRect(0, 0, W, H); cB.globalCompositeOperation = cF.globalCompositeOperation = 'lighter';
    const col = WORLDS[wi].col, cr = parseInt(col.slice(1, 3), 16), cg = parseInt(col.slice(3, 5), 16), cb = parseInt(col.slice(5, 7), 16);
    for (const p of dust) {
      p.s += dt * .28 * p.w; if (p.s > 10.5) { p.s = -4; p.a = rnd() * 6.283; }
      p.a += dt * (.9 + sp * .5) * p.w;
      const r = rad(p.s) * p.j * e * 1.08, c = Math.cos(p.a), x = Math.sin(p.a) * r, z0 = c * r - ZOFF;
      const y0 = -p.s * DY + Math.sin(T * 1.3 + p.a * 3) * 10 + lift;
      const y1 = y0 * cosX - z0 * sinX, z1 = y0 * sinX + z0 * cosX, k = P / (P - z1);
      const t = clamp((p.s + 4) / 14, 0, 1), front = c > 0;
      const al = (front ? .1 + .3 * c : .1 + .35 * (1 + c) / 2) * e * (1 - clamp((p.s - 8) / 2.5, 0, 1));
      const g = front ? cF : cB;
      g.fillStyle = 'rgba(' + (255 + (cr - 255) * t | 0) + ',' + (200 + (cg - 200) * t | 0) + ',' + (150 + (cb - 150) * t | 0) + ',' + al.toFixed(3) + ')';
      g.beginPath(); g.arc(W / 2 + x * k, H * CY + y1 * k, Math.max(.4, p.z * k * (front ? .9 : 1.1)), 0, 6.283); g.fill();
    }
    const pt = (a, s, r) => { const x = Math.sin(a) * r, z0 = Math.cos(a) * r - ZOFF, y0 = -s * DY + lift, y1 = y0 * cosX - z0 * sinX, k = P / (P - (y0 * sinX + z0 * cosX)); return [W / 2 + x * k, H * CY + y1 * k]; };
    if (!reduce) for (let j = 0; j < 12; j++) {
      const sb = -3.5 + j * 1.05 + (T * .28) % 1.05, a0 = T * (.5 + .04 * j) + j * 1.7;
      cB.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + ((.04 + .09 * (1 - clamp(Math.abs(sb - 3) / 8, 0, 1))) * e).toFixed(3) + ')'; cB.lineWidth = 1.2; cB.beginPath();
      for (let q = 0; q <= 12; q++) { const [px, py] = pt(a0 + q * .11, sb, rad(sb) * 1.12 * e); q ? cB.lineTo(px, py) : cB.moveTo(px, py); }
      cB.stroke();
    }

    const cur = ((Math.round(pos) % N) + N) % N;
    if (cur !== lastCur) {
      lastCur = cur; idxBtns.forEach((b, j) => b.classList.toggle('on', j === cur));
      const b = idxBtns[cur]; if (b) idxBox.scrollTop = b.offsetTop - idxBox.clientHeight / 2 + b.offsetHeight / 2;
      cnt.textContent = String(cur + 1).padStart(2, '0') + ' / ' + N;
    }
  }
  requestAnimationFrame(frame);

  function openWorld(w, k) {
    if (!active || leaving) { active = true; leaving = false; last = performance.now(); root.classList.add('on'); document.body.classList.add('torn'); }
    setDeck(w, k); S.enter(w);
  }
  function enterCat(id) { if (!active || leaving) return; setDeck(wi, 0, id); }
  function backCat() { if (!cat) return; const id = cat; setDeck(wi, Math.max(0, deckOf(wi).findIndex(i => D[i].cat === id))); }
  function leave() { if (!active || leaving) return; leaving = true; document.body.classList.remove('torn'); S.exit(); }
  S.onLand = id => openWorld(Math.max(0, WORLDS.findIndex(w => w.id === id)));   // landing on a planet opens its cards

  /* input */
  addEventListener('wheel', ev => { if (!active) return; ev.preventDefault(); target += clamp(ev.deltaY, -140, 140) * .0042; lastIn = performance.now(); }, { passive: false });
  addEventListener('keydown', ev => {
    if (!active || leaving) return;
    const k = ev.key, m = { ArrowDown: 1, ArrowRight: 1, PageDown: 1, ' ': 1, ArrowUp: -1, ArrowLeft: -1, PageUp: -1 };
    if (k in m) { ev.preventDefault(); target = Math.round(target) + m[k]; lastIn = performance.now(); }
    else if (k === 'Escape') { if (cat) backCat(); else leave(); }
  });
  root.addEventListener('touchstart', ev => { touchY = ev.touches[0].clientY; }, { passive: true });
  root.addEventListener('touchmove', ev => { if (touchY === null) return; const y = ev.touches[0].clientY; target += (touchY - y) * .011; lastIn = performance.now(); touchY = y; ev.preventDefault(); }, { passive: false });
  root.addEventListener('touchend', () => { touchY = null; lastIn = performance.now(); });
  root.querySelector('.tback').addEventListener('click', leave); catBack.addEventListener('click', backCat);
  prevB.addEventListener('click', () => openWorld((wi + NW - 1) % NW)); nextB.addEventListener('click', () => openWorld((wi + 1) % NW));

  const ex = $('explore'); ex.addEventListener('click', () => openWorld(0)); setTimeout(() => ex.classList.add('on'), 400);
  document.querySelectorAll('nav a[href*="index.html"]').forEach(a => a.addEventListener('click', ev => {
    const id = a.getAttribute('href').split('#')[1];
    if (id === undefined && !active) return;                       // plain "index.html" link (logo / Portfolio) really goes home
    ev.preventDefault();
    if (id in HASH) { const h = HASH[id]; openWorld(h[0], h[1]); if (h[2]) enterCat(h[2]); } else leave();
  }));
})();
