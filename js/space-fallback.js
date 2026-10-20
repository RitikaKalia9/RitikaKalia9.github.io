/* Space fallback: when WebGL (or three.js) is not available, paint a living 2D night sky instead of a black screen:
   nebula clouds, twinkling parallax stars, shooting stars, and a little black hole with the six worlds orbiting it.
   Load in <head>. Pages call PipBG.enable() themselves on failure; it also checks on window load. */
(function () {
  const root = document.documentElement, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSpacePage = /space\.html/.test(location.pathname), embed = /[?&]embed=1/.test(location.search);
  let on = false, cv, cx, W, H, dpr = 1, neb, stars = [], shoots = [], mx = 0, my = 0, t0 = 0, raf = 0, last = 0;
  const WORLDS = [['#c9a0ff', 1, .5, .55, 3.2], ['#22d3ee', 1.35, .5, -.4, 2.6], ['#7aa2ff', 1.75, .52, .9, 4.4], ['#f0a080', 2.2, .5, -.7, 5.2], ['#ff8fc0', 2.7, .48, .3, 3.4], ['#8ef0c4', 3.2, .5, -.2, 3]];   // colour, orbit, flatten, speed, size

  function webglOK() {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; }
  }
  function size() {
    dpr = Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1 : 1.5); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // nebula is painted once into an offscreen canvas (big soft gradients are expensive to redraw every frame)
    neb = document.createElement('canvas'); neb.width = W * dpr * 1.2; neb.height = H * dpr * 1.2; const n = neb.getContext('2d'); n.scale(dpr * 1.2, dpr * 1.2);
    const blob = (x, y, r, c, a) => { const g = n.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c.replace('A', a)); g.addColorStop(1, c.replace('A', 0)); n.fillStyle = g; n.fillRect(0, 0, W, H); };
    const s = Math.max(W, H);
    blob(W * .22, H * .28, s * .55, 'rgba(124,58,237,A)', .34); blob(W * .8, H * .2, s * .45, 'rgba(255,143,192,A)', .16); blob(W * .55, H * .85, s * .5, 'rgba(34,211,238,A)', .13);
    blob(W * .1, H * .9, s * .4, 'rgba(79,70,229,A)', .22); blob(W * .9, H * .75, s * .35, 'rgba(240,160,128,A)', .10);
    const count = Math.round(Math.min(320, W * H / 5200)); stars = Array.from({ length: count }, () => { const z = Math.random(); return { x: Math.random() * W, y: Math.random() * H, z, r: .3 + z * 1.3, tw: Math.random() * 6.283, sp: .6 + Math.random() * 1.8, c: ['#ffffff', '#e7d6ff', '#cfe8ff', '#ffe3f1'][Math.random() * 4 | 0] }; });
  }
  function bhPos() { return isSpacePage ? [W * .5, H * (W < 700 ? .4 : .45)] : [W * (W < 900 ? .5 : .78), H * (W < 900 ? .72 : .6)]; }
  function blackHole(t, strength) {
    const [x, y] = bhPos(), R = Math.min(W, H) * (isSpacePage ? .085 : .06) * (W < 700 ? 1.1 : 1);
    cx.save(); cx.globalAlpha = strength; cx.globalCompositeOperation = 'lighter';
    let g = cx.createRadialGradient(x, y, R * .9, x, y, R * 4.6); g.addColorStop(0, 'rgba(255,170,90,.55)'); g.addColorStop(.25, 'rgba(190,90,255,.22)'); g.addColorStop(1, 'rgba(60,20,140,0)'); cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, R * 4.6, 0, 6.283); cx.fill();
    // accretion disk: tilted ellipse made of a few glowing strokes, brighter on one side (doppler look)
    for (let i = 0; i < 5; i++) {
      const k = 1.5 + i * .28, a = .5 - i * .08; cx.save(); cx.translate(x, y); cx.rotate(-.28); cx.scale(1, .26);
      const lg = cx.createLinearGradient(-R * k, 0, R * k, 0); lg.addColorStop(0, 'rgba(255,200,130,' + a + ')'); lg.addColorStop(.5, 'rgba(255,120,60,' + a * .35 + ')'); lg.addColorStop(1, 'rgba(160,100,255,' + a * .5 + ')');
      cx.strokeStyle = lg; cx.lineWidth = R * (.22 - i * .025); cx.beginPath(); cx.arc(0, 0, R * k, 0, 6.283); cx.stroke(); cx.restore();
    }
    cx.restore(); cx.save(); cx.globalAlpha = strength; cx.fillStyle = '#020006'; cx.beginPath(); cx.arc(x, y, R, 0, 6.283); cx.fill();
    cx.strokeStyle = 'rgba(255,220,170,.8)'; cx.lineWidth = 1.5; cx.shadowColor = 'rgba(255,170,90,.9)'; cx.shadowBlur = R * .35; cx.beginPath(); cx.arc(x, y, R * 1.02, 0, 6.283); cx.stroke(); cx.restore();
    // the six worlds
    const u = Math.min(W, H) * (isSpacePage ? .5 : .36) / 3.4; cx.save(); cx.globalAlpha = strength;
    WORLDS.forEach(([c, orb, fl, sp, sz], i) => {
      const rx = u * (orb + .5) * (W < 700 ? .55 : 1) + R, ry = rx * fl * .55;
      cx.strokeStyle = 'rgba(255,255,255,.06)'; cx.lineWidth = 1; cx.beginPath(); cx.ellipse(x, y, rx, ry, -.28, 0, 6.283); cx.stroke();
      const a = (reduce ? i * 1.1 : t * .12 * sp / (orb * .8)) + i * 1.05, px = Math.cos(a) * rx, py = Math.sin(a) * ry, ca = Math.cos(-.28), sa = Math.sin(-.28), X = x + px * ca - py * sa, Y = y + px * sa + py * ca, r = sz * (W < 700 ? .8 : 1.15) * (1 + Math.sin(a) * .12);
      const gg = cx.createRadialGradient(X, Y, 0, X, Y, r * 4); gg.addColorStop(0, c); gg.addColorStop(.3, c + '66'); gg.addColorStop(1, c + '00'); cx.fillStyle = gg; cx.globalCompositeOperation = 'lighter'; cx.beginPath(); cx.arc(X, Y, r * 4, 0, 6.283); cx.fill(); cx.globalCompositeOperation = 'source-over'; cx.fillStyle = c; cx.beginPath(); cx.arc(X, Y, r, 0, 6.283); cx.fill();
    });
    cx.restore();
  }
  function draw(now) {
    raf = requestAnimationFrame(draw); if (innerWidth < 700 && now - last < 33) return; last = now; const t = (now - t0) / 1000;
    const bg = cx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#05030f'); bg.addColorStop(.6, '#0a0620'); bg.addColorStop(1, '#0d0726'); cx.fillStyle = bg; cx.fillRect(0, 0, W, H);
    const ox = reduce ? 0 : Math.sin(t * .03) * 40 - mx * 14, oy = reduce ? 0 : Math.cos(t * .025) * 26 - my * 10; cx.drawImage(neb, -W * .1 + ox, -H * .1 + oy, W * 1.2, H * 1.2);
    for (const s of stars) { const a = reduce ? .8 : .45 + .55 * Math.sin(t * s.sp + s.tw); const x = ((s.x + (reduce ? 0 : t * 2.5 * s.z) - mx * 22 * s.z) % W + W) % W, y = s.y - my * 16 * s.z; cx.globalAlpha = Math.max(.08, a) * (.4 + s.z * .6); cx.fillStyle = s.c; cx.beginPath(); cx.arc(x, y, s.r, 0, 6.283); cx.fill(); }
    cx.globalAlpha = 1;
    blackHole(t, isSpacePage ? 1 : .55);
    if (!reduce) {
      if (Math.random() < .004 && shoots.length < 2) shoots.push({ x: Math.random() * W * .8, y: Math.random() * H * .4, vx: 520 + Math.random() * 260, vy: 190 + Math.random() * 140, a: 0, m: .9 });
      cx.globalCompositeOperation = 'lighter';
      for (let i = shoots.length - 1; i >= 0; i--) { const s = shoots[i]; s.a += 1 / 60; if (s.a > s.m) { shoots.splice(i, 1); continue; } s.x += s.vx / 60; s.y += s.vy / 60; const k = 1 - s.a / s.m, L = 90; const g = cx.createLinearGradient(s.x, s.y, s.x - s.vx / 600 * L, s.y - s.vy / 600 * L); g.addColorStop(0, 'rgba(255,255,255,' + k + ')'); g.addColorStop(1, 'rgba(160,140,255,0)'); cx.strokeStyle = g; cx.lineWidth = 1.6; cx.beginPath(); cx.moveTo(s.x, s.y); cx.lineTo(s.x - s.vx / 600 * L, s.y - s.vy / 600 * L); cx.stroke(); }
      cx.globalCompositeOperation = 'source-over';
    }
    if (reduce) { cancelAnimationFrame(raf); raf = 0; }
  }

  function card() {
    if (!isSpacePage || document.getElementById('noglCard')) return;
    const c = document.createElement('div'); c.id = 'noglCard'; c.setAttribute('role', 'status');
    c.innerHTML = '<div class="nogl-eye">3D universe unavailable</div><h2>Your browser can’t draw the 3D version.</h2><p>It needs WebGL, which looks switched off or unsupported here. Everything is still available — pick how you’d like to explore:</p>' +
      '<div class="nogl-row">' + (embed ? '<button type="button" class="nogl-b pri" data-a="close">← Back to portfolio</button>' : '<a class="nogl-b pri" href="classic.html">Open the portfolio</a>') +
      '<button type="button" class="nogl-b" data-a="tour">Best 3 projects</button><button type="button" class="nogl-b" data-a="quick">Quick view</button></div>' +
      '<p class="nogl-tip">Tip: in Chrome, turn on “Use hardware acceleration when available” in Settings → System, then reload.</p>';
    document.body.appendChild(c);
    c.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
      if (a === 'close') parent.postMessage({ type: 'portfolio-close' }, '*'); else if (a === 'tour') window.PipExtras && window.PipExtras.tour(); else if (a === 'quick') window.PipExtras && window.PipExtras.quick(); });
  }
  function enable() {
    if (on) return; on = true; root.classList.add('nogl'); if (embed) root.classList.add('embed');
    const start = () => {
      cv = document.createElement('canvas'); cv.id = 'pipbg'; cv.setAttribute('aria-hidden', 'true'); document.body.insertBefore(cv, document.body.firstChild); cx = cv.getContext('2d'); size(); addEventListener('resize', size);
      if (!reduce) addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
      t0 = performance.now(); raf = requestAnimationFrame(draw); card();
      if (reduce) setTimeout(() => requestAnimationFrame(draw), 50);
      const b = document.getElementById('boot'); if (b) b.remove();
    };
    document.body ? start() : document.addEventListener('DOMContentLoaded', start);
  }
  window.PipBG = { enable, get on() { return on; }, webglOK };
  /* automatic checks: no WebGL at all, or three.js never arrived from the CDN */
  if (!webglOK()) enable(); else addEventListener('load', () => { if (typeof THREE === 'undefined' && document.getElementById('webgl')) enable(); });
})();
