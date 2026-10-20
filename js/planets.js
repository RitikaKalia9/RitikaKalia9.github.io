/* Interactive planet map: each planet = one portfolio section, opens in a glass window */
(function () {
  const W = [
    { ids: ['about'],                  name: 'About',    c: '#d1a3ff', k: .42, a: 20,  t: 80  },
    { ids: ['stack'],                  name: 'Stack',    c: '#22d3ee', k: .42, a: 200, t: 80  },
    { ids: ['research', 'under-review'], name: 'Research', c: '#7aa2ff', k: .70, a: 80,  t: 120 },
    { ids: ['projects', 'in-progress'], name: 'Work',     c: '#f0a080', k: .70, a: 260, t: 120 },
    { ids: ['journey'],                name: 'Journey',  c: '#ff8fc0', k: .98, a: 150, t: 170 },
    { ids: ['contact'],                name: 'Contact',  c: '#8ef0c4', k: .98, a: 330, t: 170 }
  ];

  // entry curtain (one continuous experience, like simone-dev.com)
  const curtain = document.createElement('div');
  curtain.className = 'curtain';
  curtain.innerHTML = '<span>Entering the universe…</span>';
  document.body.appendChild(curtain);
  const lift = () => curtain.classList.add('gone');
  addEventListener('load', () => setTimeout(lift, 500));
  setTimeout(lift, 4500);

  // glow arcs behind the hero
  const arcs = document.createElement('div');
  arcs.className = 'glow-arcs';
  arcs.innerHTML = '<i></i><i></i><i></i>';
  document.body.prepend(arcs);

  // overlay
  const map = document.createElement('div');
  map.className = 'pmap';
  map.innerHTML =
    '<button class="pmap-x" aria-label="Close">×</button>' +
    '<button class="pmap-home" type="button" aria-label="Back to home page">← Back to home</button>' +
    '<div class="pmap-head"><span class="pill">✦ Interactive map</span><h2 class="metal">Pick a planet</h2><p>Each world is a part of my story. Hover to pause, click to land.</p></div>' +
    '<div class="pstage"><div class="bh"></div>' +
    W.map(w => '<div class="orbit" style="--k:' + w.k + ';--a:' + w.a + 'deg;--t:' + w.t + 's"><button class="pl" data-n="' + w.name + '" style="--c:' + w.c + ';--a:' + w.a + 'deg;--t:' + w.t + 's">' +
      '<span class="pl-in" style="--a:' + w.a + 'deg;--t:' + w.t + 's"><span class="pl-ball"></span><span class="pl-name">' + w.name + '</span></span></button></div>').join('') +
    '</div><a class="pmap-fly" href="space.html">Fly through in 3D →</a>' +
    '<div class="gpanel" role="dialog"><div class="gbar"><i></i><i></i><i></i><b></b><button aria-label="Close panel">×</button></div><div class="gbody"></div></div>';
  document.body.appendChild(map);

  // flight mode lives in a layer on THIS page: no reload, the portfolio stays where you left it
  const fly = document.createElement('div');
  fly.className = 'flyx';
  fly.innerHTML = '<iframe title="Fly through the universe" allow="fullscreen"></iframe>';
  document.body.appendChild(fly);
  const frame = fly.querySelector('iframe');
  const openFly = () => {
    if (!frame.getAttribute('src')) frame.src = 'space.html?embed=1';
    fly.classList.add('open'); document.body.style.overflow = 'hidden';
    setTimeout(() => frame.focus(), 100);
  };
  const closeFly = () => { fly.classList.remove('open'); if (!map.classList.contains('open')) document.body.style.overflow = ''; };
  addEventListener('message', e => {
    if (e.source !== frame.contentWindow || !e.data) return;
    if (e.data.type === 'portfolio-close') closeFly();
    if (e.data.type === 'portfolio-goto') {
      closeFly(); closeMap();
      const t = document.getElementById(e.data.id);
      if (t) setTimeout(() => t.scrollIntoView({ behavior: 'smooth' }), 350);
    }
  });
  map.querySelector('.pmap-fly').addEventListener('click', e => { e.preventDefault(); openFly(); });

  const panel = map.querySelector('.gpanel'), body = panel.querySelector('.gbody'), title = panel.querySelector('.gbar b');
  const openMap = () => { map.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const closePanel = () => panel.classList.remove('open');
  const closeMap = () => { closePanel(); map.classList.remove('open'); document.body.style.overflow = ''; };

  map.querySelectorAll('.pl').forEach((el, i) => el.addEventListener('click', () => {
    const w = W[i];
    body.innerHTML = '';
    w.ids.forEach(id => {
      const src = document.getElementById(id);
      if (!src) return;
      const c = src.cloneNode(true);
      c.removeAttribute('id');
      c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      body.appendChild(c);
    });
    title.textContent = w.name.toLowerCase() + '.app';
    body.scrollTop = 0;
    panel.classList.add('open');
  }));

  map.querySelector('.pmap-x').onclick = closeMap;
  map.querySelector('.pmap-home').onclick = () => { closeMap(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  panel.querySelector('.gbar button').onclick = closePanel;
  map.addEventListener('click', e => { if (e.target === map) closeMap(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && fly.classList.contains('open')) closeFly();
    else if (e.key === 'Escape' && map.classList.contains('open')) (panel.classList.contains('open') ? closePanel : closeMap)();
  });

  // nav entries
  const list = document.querySelector('.nav-links');
  if (list) {
    const cta = list.lastElementChild;
    const a = document.createElement('li'), b = document.createElement('li');
    a.innerHTML = '<button class="nav-explore" type="button">Explore ✦</button>';
    b.innerHTML = '<a href="space.html">Fly</a>';
    list.insertBefore(a, cta); list.insertBefore(b, cta);
    a.firstChild.onclick = openMap;
    b.firstChild.addEventListener('click', e => { e.preventDefault(); openFly(); });
  }
})();
