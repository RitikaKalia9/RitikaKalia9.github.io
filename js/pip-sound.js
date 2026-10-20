/* Pip sound: tiny synthesised chime / whoosh / space hum (Web Audio, no files). OFF by default; a visitor opts in with the speaker button. */
(function () {
  const KEY = 'pip-sound'; let on = false, ctx = null, master = null, hum = null;
  try { on = localStorage.getItem(KEY) === '1'; } catch (e) {}
  const isSpace = () => /space\.html/.test(location.pathname);
  function ac() {
    if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); master = ctx.createGain(); master.gain.value = .5; master.connect(ctx.destination); }
    if (ctx.state === 'suspended') ctx.resume(); return ctx;
  }
  function note(f, t, d, g) {
    const o = ctx.createOscillator(), v = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
    v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + .015); v.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(v); v.connect(master); o.start(t); o.stop(t + d + .05);
  }
  function chime() { if (!on) return; const c = ac(); if (!c) return; const t = c.currentTime; note(988, t, .5, .09); note(1480, t + .09, .6, .07); note(1976, t + .2, .7, .04); }
  function whoosh() {
    if (!on) return; const c = ac(); if (!c) return; const t = c.currentTime, len = c.sampleRate * 1.6, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = .9;
    f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(3200, t + .8); f.frequency.exponentialRampToValueAtTime(380, t + 1.6);
    const v = c.createGain(); v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(.16, t + .7); v.gain.exponentialRampToValueAtTime(.0001, t + 1.6);
    src.connect(f); f.connect(v); v.connect(master); src.start(t); src.stop(t + 1.7);
  }
  function startHum() {
    if (!on || hum || !isSpace()) return; const c = ac(); if (!c) return;
    const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(.05, c.currentTime + 3);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .07; lg.gain.value = 60; lfo.connect(lg); lg.connect(lp.frequency);
    const oscs = [55, 82.5, 110.4].map(f => { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(lp); o.start(); return o; });
    lp.connect(g); g.connect(master); lfo.start(); hum = { g, oscs, lfo };
  }
  function stopHum() { if (!hum || !ctx) return; const h = hum; hum = null; h.g.gain.cancelScheduledValues(ctx.currentTime); h.g.gain.linearRampToValueAtTime(0, ctx.currentTime + .6); setTimeout(() => { h.oscs.forEach(o => o.stop()); h.lfo.stop(); }, 700); }

  const b = document.createElement('button'); b.id = 'pipSound'; b.type = 'button';
  function paint() { b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('aria-label', on ? 'Sound on. Click to mute' : 'Sound off. Click to turn on'); b.title = on ? 'Sound on' : 'Sound off'; b.innerHTML = '<i class="fas ' + (on ? 'fa-volume-high' : 'fa-volume-xmark') + '"></i>'; }
  function set(v) { on = v; try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} paint(); if (on) { ac(); chime(); startHum(); } else stopHum(); }
  b.addEventListener('click', () => set(!on)); paint();
  const add = () => document.body.appendChild(b); document.body ? add() : document.addEventListener('DOMContentLoaded', add);
  if (on) addEventListener('pointerdown', () => { ac(); startHum(); }, { once: true });
  window.PipSound = { chime, whoosh, set, get on() { return on; } };
})();
