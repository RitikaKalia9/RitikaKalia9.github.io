/* Pip: a small guide fairy for space.html (also inside the Fly overlay on index.html). Purely additive - it only watches the page (clicks, keys, body/#land classes), it never touches the 3D scene. */
(function () {
  const $ = id => document.getElementById(id), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = () => matchMedia('(pointer:coarse), (max-width:899px)').matches;
  const store = { get: k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} } };

  /* 1. the bottom hint says what actually works on this device */
  const hint = $('hint');
  function fixHint() {
    if (!hint) return;
    hint.innerHTML = small()
      ? '<i class="fas fa-hand-pointer" style="opacity:.5;margin-right:6px"></i>Drag to look · use the <b>▲ ▼</b> arrows to fly · tap a planet'
      : '<i class="fas fa-hand-pointer" style="opacity:.5;margin-right:6px"></i>Drag to look · <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> fly · <kbd>Shift</kbd> boost · click a planet to open its cards';
  }
  fixHint(); addEventListener('resize', fixHint);

  /* 2. the fairy */
  const root = document.createElement('div'); root.id = 'pip'; root.setAttribute('aria-live', 'polite');
  root.innerHTML = '<button class="pf" type="button" aria-label="Guide: show a tip"><svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">' +
    '<g class="wing"><path d="M22 24C12 8 3 11 5 20c1 6 9 8 17 4z" fill="rgba(110,225,255,.5)" stroke="rgba(255,255,255,.8)" stroke-width=".8"/></g>' +
    '<g class="wing r"><path d="M22 24C32 8 41 11 39 20c-1 6-9 8-17 4z" fill="rgba(255,150,215,.5)" stroke="rgba(255,255,255,.8)" stroke-width=".8"/></g>' +
    '<circle class="glow" cx="22" cy="24" r="8" fill="rgba(185,140,255,.5)"/><circle cx="22" cy="24" r="4.2" fill="#f4eeff"/></svg></button>' +
    '<div class="bub" role="status"><span class="who">Pip · your guide</span><div class="msg"></div><div class="row"><button type="button" class="hide">Hide for now</button><button type="button" class="ok">Got it</button></div></div>';
  document.body.appendChild(root);
  const bub = root.querySelector('.bub'), msg = root.querySelector('.msg'), fairy = root.querySelector('.pf');
  if (store.get('pip-off') === '1') root.classList.add('off');

  let W = innerWidth, H = innerHeight, x = W - 90, y = H * .55, tx = x, ty = y, anchor = null, hideT = 0, t0 = 0, quiet = false;
  addEventListener('resize', () => { W = innerWidth; H = innerHeight; });
  const home = () => { const f = window.PipFollow; if (f && f.on) return [f.x, f.y]; return small() ? [W - 56, H - 190] : [150, H * .8]; };

  function place() {                                   // keep the bubble on screen, on whichever side has room
    const w = Math.min(250, W - 32), left = x > W / 2;
    bub.style.width = w + 'px';
    bub.style.left = (left ? -w - 24 : 28) + 'px';
    bub.style.top = (y > H * .6 ? -bub.offsetHeight - 6 : -18) + 'px';
    const r = bub.getBoundingClientRect(); // clamp inside the viewport
    if (r.left < 12) bub.style.left = (parseFloat(bub.style.left) + 12 - r.left) + 'px';
    if (r.right > W - 12) bub.style.left = (parseFloat(bub.style.left) - (r.right - W + 12)) + 'px';
  }
  function say(html, opts) {
    if (root.classList.contains('off')) return;
    opts = opts || {}; clearTimeout(hideT); msg.innerHTML = html; bub.classList.add('on'); place();
    if (opts.to) anchor = opts.to; else anchor = null;
    hideT = setTimeout(() => { bub.classList.remove('on'); anchor = null; }, opts.ms || 9000);
  }
  const shut = () => { clearTimeout(hideT); bub.classList.remove('on'); anchor = null; };
  root.querySelector('.ok').addEventListener('click', shut);
  root.querySelector('.hide').addEventListener('click', () => { shut(); store.set('pip-off', '1'); root.classList.add('off'); });
  fairy.addEventListener('click', () => tipFor(state(), true));
  window.PipAPI = { page: 'space', root, say, shut, hold: () => clearTimeout(hideT), release: ms => { clearTimeout(hideT); hideT = setTimeout(shut, ms || 3500); }, isOpen: () => bub.classList.contains('on') };

  /* wandering */
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .05); last = now; t0 += dt;
    let [hx, hy] = home();
    if (anchor) { const r = anchor(); if (r) { hx = r[0]; hy = r[1]; } }
    if (reduce || window.PipFreeze) { tx = hx; ty = hy; } else { tx = hx + Math.sin(t0 * .7) * 26; ty = hy + Math.cos(t0 * .9) * 18; }
    const k = 1 - Math.exp(-dt * (anchor ? 2.2 : 1.1));
    x += (tx - x) * k; y += (ty - y) * k;
    root.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    if (bub.classList.contains('on')) place();
  }
  requestAnimationFrame(frame);

  /* 3. what the visitor is doing right now -> which tip fits */
  const body = document.body, land = $('land');
  const state = () => body.classList.contains('torn') ? 'torn' : (land && land.classList.contains('on') ? 'land' : 'space');
  const tagPos = () => {                               // fly next to a planet label so the tip points at something real
    const tags = [...document.querySelectorAll('.tag')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.top > 140 && r.bottom < H - 90 && r.left > 40 && r.right < W - 40; });
    if (!tags.length) return null; const r = tags[0].getBoundingClientRect(); return [r.right + 46, r.top + r.height / 2 - 8];
  };
  let moved = false, said = {};
  function tipFor(s, force) {
    if (s === 'space') {
      if (!moved || force) say(small() ? '<b>Hi, I’m Pip!</b> Drag to look around, use the ▲ ▼ buttons to fly forward and back, and tap a planet to land.' : '<b>Hi, I’m Pip!</b> Drag to look around and fly with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>. Each planet is a chapter — click one to land.', { ms: 11000 });
      else say('Nice flying! <b>Click a planet</b> to land and open its cards.', { to: tagPos, ms: 8000 });
    } else if (s === 'land') {
      const n = land.querySelector('h3'); say('Landed on <b>' + (n ? n.textContent : 'a world') + '</b>. Press <b>Open section</b> for its cards, or <b>Take off</b> to keep exploring.', { ms: 9000 });
    } else {
      say(small() ? 'Swipe up or down to browse the cards. Tap a card to bring it forward.' : 'Scroll, or use <kbd>↑</kbd><kbd>↓</kbd>, to browse. Click a card to bring it forward. <kbd>Esc</kbd> flies you back to space.', { ms: 10000 });
    }
  }
  const nudge = () => { if (moved) return; moved = true; setTimeout(() => { if (state() === 'space') tipFor('space'); }, 900); };
  const cv = $('webgl'); let down = null;
  cv.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  addEventListener('pointermove', e => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 14) { down = null; nudge(); } });
  addEventListener('pointerup', () => { down = null; });
  addEventListener('keydown', e => { if (/^(w|a|s|d|arrowup|arrowdown|arrowleft|arrowright)$/i.test(e.key) && state() === 'space') nudge(); });
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#pad button')) nudge(); });

  let prev = state();
  new MutationObserver(() => {                        // react to landing / tornado / returning
    const s = state(); if (s === prev) return; const from = prev; prev = s;
    if (s === 'torn') { if (!said.torn) { said.torn = 1; setTimeout(() => state() === 'torn' && tipFor('torn'), 2600); } else shut(); }
    else if (s === 'land') { if (!said.land) { said.land = 1; setTimeout(() => state() === 'land' && tipFor('land'), 1200); } else shut(); }
    else { shut(); if (from === 'torn' && !said.back) { said.back = 1; setTimeout(() => state() === 'space' && say('Welcome back! Fly anywhere, or pick another planet.', { to: tagPos, ms: 6000 }), 2500); } }
  }).observe(body, { attributes: true, attributeFilter: ['class'] });
  if (land) new MutationObserver(() => { const s = state(); if (s !== prev) { const from = prev; prev = s; if (s === 'land' && !said.land) { said.land = 1; setTimeout(() => state() === 'land' && tipFor('land'), 1200); } else if (s === 'space') shut(); } }).observe(land, { attributes: true, attributeFilter: ['class'] });

  /* first greeting: after the intro, if the visitor has not already started flying */
  setTimeout(() => { if (state() === 'space' && !moved && !store.get('pip-seen')) { tipFor('space'); store.set('pip-seen', '1'); } }, 3800);
})();
