/* Pip warp: clicking a nav link sends Pip gliding at the screen in a burst of starlight; while the screen is filled with violet nebula the page switches
   (scrolls to the section / opens the world / goes to the other page), then the nebula opens up like an iris to reveal it.
   Load in <head> so a page reached through a warp can start covered (no flash). Respects prefers-reduced-motion. */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, KEY = 'pip-warp-in', root = document.documentElement;
  let incoming = false; try { incoming = sessionStorage.getItem(KEY) === '1'; sessionStorage.removeItem(KEY); } catch (e) {}
  if (incoming && !reduce) root.classList.add('pipwarp-pre');

  let cv, cx, W, H, dpr, parts = [], busy = false, passing = false;
  /* each destination tints the nebula with its planet colour (default: the site's violet) */
  const TINTS = { about: [201, 160, 255], stack: [34, 211, 238], research: [122, 162, 255], 'under-review': [122, 162, 255], projects: [240, 160, 128], 'in-progress': [240, 160, 128], journey: [255, 143, 192], contact: [142, 240, 196] }, VIOLET = [122, 69, 220];
  let tint = VIOLET, pal = null, streaks = [];
  const hex = c => '#' + c.map(v => (v | 0).toString(16).padStart(2, '0')).join(''), mix = (c, k) => c.map(v => v * k);
  const STARS = ['#ffffff', '#e7d6ff', '#d1a3ff', '#9fe6ff', '#22d3ee', '#ff9fd0', '#c9a0ff'];   // starlight palette taken from the universe: lavender, cyan, pink, white
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease3 = t => t * t * t, eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, out3 = t => 1 - Math.pow(1 - t, 3), smooth = (a, b, t) => { t = clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function size() { dpr = Math.min(devicePixelRatio || 1, 1.5); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function ensure() { if (cv) return; cv = document.createElement('canvas'); cv.id = 'pipwarp'; cv.setAttribute('aria-hidden', 'true'); document.body.appendChild(cv); cx = cv.getContext('2d'); size(); addEventListener('resize', size); }

  function emit(x, y, vx, vy, n, spread, big) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, s = Math.random() * spread;
      parts.push({ x, y, vx: vx + Math.cos(a) * s, vy: vy + Math.sin(a) * s, age: 0, max: .7 + Math.random() * .7, size: (big ? 1.6 : .8) + Math.random() * (big ? 3.4 : 2.2), c: (pal || STARS)[Math.random() * (pal || STARS).length | 0], star: Math.random() < .16 });
    }
    if (parts.length > 700) parts.splice(0, parts.length - 700);
  }
  function drawParts(dt) {
    cx.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.age += dt; if (p.age >= p.max) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 14 * dt; p.vx *= .98;
      const a = 1 - p.age / p.max; cx.globalAlpha = a * a; cx.fillStyle = p.c; cx.beginPath();
      if (p.star) { const r = p.size * 2.6 * (.6 + a * .6); cx.moveTo(p.x, p.y - r); cx.lineTo(p.x + r * .22, p.y - r * .22); cx.lineTo(p.x + r, p.y); cx.lineTo(p.x + r * .22, p.y + r * .22); cx.lineTo(p.x, p.y + r); cx.lineTo(p.x - r * .22, p.y + r * .22); cx.lineTo(p.x - r, p.y); cx.lineTo(p.x - r * .22, p.y - r * .22); cx.closePath(); }
      else cx.arc(p.x, p.y, p.size, 0, 6.283);
      cx.fill();
    }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
  }
  function drawPip(x, y, s, t) {
    const g = cx.createRadialGradient(x, y, 0, x, y, s * 1.5); g.addColorStop(0, 'rgba(245,240,255,1)'); g.addColorStop(.25, 'rgba(185,140,255,.85)'); g.addColorStop(1, 'rgba(90,60,230,0)');
    cx.globalCompositeOperation = 'lighter'; cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, s * 1.5, 0, 6.283); cx.fill();
    const flap = .55 + .35 * Math.sin(t * 38);
    for (const d of [-1, 1]) { cx.save(); cx.translate(x, y); cx.rotate(d * (.35 + flap)); cx.fillStyle = d < 0 ? 'rgba(110,225,255,.55)' : 'rgba(255,150,215,.55)'; cx.beginPath(); cx.ellipse(d * s * .75, -s * .25, s * .75, s * .38, 0, 0, 6.283); cx.fill(); cx.restore(); }
    cx.fillStyle = '#f6f1ff'; cx.beginPath(); cx.arc(x, y, s * .26, 0, 6.283); cx.fill(); cx.globalCompositeOperation = 'source-over';
  }
  function coverLayer(alpha) {
    const hy = Math.hypot(W, H) / 2, g = cx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, hy);
    g.addColorStop(0, hex(mix(tint, .95))); g.addColorStop(.4, hex(mix(tint, .36))); g.addColorStop(1, '#070213');
    cx.globalAlpha = alpha; cx.fillStyle = g; cx.fillRect(0, 0, W, H); cx.globalAlpha = 1;
  }

  /* hyperspace streaks: stars stretch into lines that rush outward from the middle, like a jump */
  function makeStreaks() { streaks = Array.from({ length: innerWidth < 700 ? 70 : 130 }, () => ({ a: Math.random() * 6.283, b: .08 + Math.random() * .9, w: .6 + Math.random() * 1.4, c: Math.random() < .25 ? hex(mix(tint, 1.15)) : '#e9ddff' })); }
  function drawStreaks(p, fade) {
    const hy = Math.hypot(W, H) / 2, e = p * p; cx.globalCompositeOperation = 'lighter'; cx.lineCap = 'round';
    for (const s of streaks) {
      const r1 = s.b * hy * (.12 + 1.15 * e), len = 14 + 360 * e * (.4 + s.b), r0 = Math.max(0, r1 - len), ca = Math.cos(s.a), sa = Math.sin(s.a);
      cx.globalAlpha = clamp(smooth(.05, .45, p) * fade, 0, 1) * .75; cx.strokeStyle = s.c; cx.lineWidth = s.w;
      cx.beginPath(); cx.moveTo(W / 2 + ca * r0, H / 2 + sa * r0); cx.lineTo(W / 2 + ca * r1, H / 2 + sa * r1); cx.stroke();
    }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
  }
  /* phase 1: Pip swoops in and the screen fills with violet nebula */
  function fill(sx, sy, done) {
    const T = 950, t0 = performance.now(), hy = Math.hypot(W, H), cxp = W / 2, cyp = H / 2, ctlx = (sx + cxp) / 2, ctly = Math.min(sy, cyp) - H * .3;
    let last = t0, px = sx, py = sy;
    (function f(now) {
      const dt = Math.min((now - last) / 1000, .05); last = now; const p = clamp((now - t0) / T, 0, 1), e = ease3(p);
      const u = eio(p), x = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * ctlx + u * u * cxp, y = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * ctly + u * u * cyp;
      const vx = (x - px) / Math.max(dt, .001), vy = (y - py) / Math.max(dt, .001); px = x; py = y;
      const s = 18 + hy * .55 * Math.pow(smooth(.1, 1, p), 2.4);
      cx.clearRect(0, 0, W, H);
      coverLayer(smooth(.45, .92, p)); drawStreaks(p, 1);
      emit(x, y, -vx * .12, -vy * .12, Math.ceil(dt * (320 + 380 * p)), 60 + 160 * p, p > .5);
      if (p > .5) emit(Math.random() * W, Math.random() * H, 0, -18, Math.ceil(dt * 220 * p), 24, false);
      drawParts(dt);
      if (p < .96) drawPip(x, y, s, (now - t0) / 1000);
      if (p < 1) requestAnimationFrame(f); else done();
    })(t0);
  }
  /* phase 2: the nebula opens like an iris from the middle */
  function reveal(done) {
    const T = 1000, t0 = performance.now(), hy = Math.hypot(W, H) * .62; let last = t0;
    (function f(now) {
      const dt = Math.min((now - last) / 1000, .05); last = now; const q = clamp((now - t0) / T, 0, 1), r = eio(q) * hy;
      cx.clearRect(0, 0, W, H); coverLayer(1); if (streaks.length && q < .35) drawStreaks(1, 1 - q / .35);
      cx.globalCompositeOperation = 'destination-out';
      const g = cx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(r, 1)); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.72, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = g; cx.fillRect(0, 0, W, H); cx.globalCompositeOperation = 'source-over';
      if (q < .9) { const a = Math.random() * 6.283, rr = r * (.7 + Math.random() * .3); emit(W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr, Math.cos(a) * 70, Math.sin(a) * 70, Math.ceil(dt * 420), 36, false); }
      drawParts(dt);
      if (q < 1) requestAnimationFrame(f); else done();
    })(t0);
  }
  const hideCanvas = () => { if (cv) { cx.clearRect(0, 0, W, H); cv.style.display = 'none'; } };
  const showPip = on => { const p = document.getElementById('pip'); if (p) p.style.visibility = on ? '' : 'hidden'; };

  function startPoint() { const f = document.querySelector('#pip .pf'); if (f) { const r = f.getBoundingClientRect(); if (r.width) return [r.left + r.width / 2, r.top + r.height / 2]; } return [70, innerHeight - 110]; }

  function warp(act, t) {                       // act(): does the page change; returns 'hold' when a real page navigation started
    if (busy) return; busy = true; ensure(); size(); cv.style.display = 'block'; parts = [];
    tint = t || VIOLET; pal = STARS.concat([hex(tint)]); makeStreaks(); try { sessionStorage.setItem('pip-warp-tint', JSON.stringify(tint)); } catch (e) {}
    if (window.PipSound) window.PipSound.whoosh();
    const [sx, sy] = startPoint(); showPip(false);
    fill(sx, sy, () => {
      const r = act();
      const finish = () => reveal(() => { hideCanvas(); showPip(true); busy = false; });
      if (r === 'hold') setTimeout(finish, 4000); else setTimeout(finish, 120);   // 4s safety net if the browser never left the page
    });
  }

  document.addEventListener('click', ev => {
    if (passing || busy || reduce || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const el = ev.target.closest && ev.target.closest('nav a, nav .nav-explore'); if (!el) return;
    let u = null, href = '';
    if (el.matches('a')) {
      href = el.getAttribute('href') || '';
      if (el.target === '_blank' || el.hasAttribute('download') || /^(mailto|tel):/i.test(href) || /\.pdf($|\?)/i.test(href)) return;
      u = new URL(el.href, location.href); if (u.origin !== location.origin) return;
    }
    ev.preventDefault(); ev.stopImmediatePropagation();
    const tid = u && u.hash ? u.hash.slice(1) : '', tt = TINTS[tid] || null;
    const samePage = u && u.pathname === location.pathname && (u.hash.length > 1 || href === '#'), tgt = samePage && u.hash.length > 1 ? document.querySelector(u.hash) : null;
    if (samePage && (tgt || href === '#')) {
      warp(() => {
        const nl = document.querySelector('.nav-links'), mb = document.querySelector('.menu-btn'); if (nl) nl.classList.remove('active'); if (mb) mb.innerHTML = '<i class="fas fa-bars"></i>';
        root.style.scrollBehavior = 'auto'; window.scrollTo(0, tgt ? tgt.getBoundingClientRect().top + scrollY - 80 : 0); root.style.scrollBehavior = '';
        try { history.replaceState(null, '', href === '#' ? location.pathname : u.hash); } catch (e) {}
      }, tt);
    } else {
      warp(() => {                           // let the page's own handler (open a world, open the map, or follow the link) run
        passing = true; try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
        const ok = el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); passing = false;
        if (!ok) { try { sessionStorage.removeItem(KEY); } catch (e) {} return; }
        return 'hold';
      }, tt);
    }
  }, true);

  addEventListener('pageshow', e => { if (e.persisted) { busy = false; root.classList.remove('pipwarp-pre'); hideCanvas(); showPip(true); } });

  window.PipWarp = { run: (act, id) => { if (reduce || busy) { act(); return; } warp(act, TINTS[id] || null); } };

  /* arriving through a warp: start covered in nebula, then open up */
  if (incoming && !reduce) {
    try { const t = JSON.parse(sessionStorage.getItem('pip-warp-tint') || 'null'); if (t && t.length === 3) tint = t; } catch (e) {}
    const go = () => { ensure(); size(); cv.style.display = 'block'; busy = true; cx.clearRect(0, 0, W, H); coverLayer(1); root.classList.remove('pipwarp-pre'); showPip(false);
      const start = () => reveal(() => { hideCanvas(); showPip(true); busy = false; });
      if (document.readyState === 'complete') setTimeout(start, 150); else { addEventListener('load', () => setTimeout(start, 150), { once: true }); setTimeout(() => { if (busy && cv.style.display === 'block') start(); }, 2500); } };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  }
})();
