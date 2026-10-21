/* Performance level: 0 = full quality (laptops, good phones: identical to before), 1 = lite, 2 = minimal.
   The start level comes from cheap device hints; universe.js then watches the real frame rate and
   only ever steps DOWN (never up) if the device can't keep up. Level >= 1 also adds the `lowfx`
   class on <html>, which turns off the expensive backdrop-filter blurs (see css/extras.css).
   Test overrides: ?perf=0|1|2 in the URL forces a level. */
(function () {
  var root = document.documentElement, level = 0, forced = null;
  try {
    var m = /[?&]perf=([012])\b/.exec(location.search);
    if (m) forced = +m[1];
  } catch (e) {}
  try {
    var nav = navigator, mobile = matchMedia('(max-width: 768px)').matches;
    var mem = nav.deviceMemory;                      // Chrome/Android only (GB, capped at 8)
    var cores = nav.hardwareConcurrency;
    var saveData = !!(nav.connection && nav.connection.saveData);
    if (mem && mem <= 1) level = 2;
    else if ((mem && mem <= 2) || (mobile && cores && cores <= 4) || saveData) level = 1;
  } catch (e) {}
  if (forced !== null) level = forced;

  var P = window.__perf = {
    level: level,
    start: level,
    forced: forced !== null,
    listeners: [],
    set: function (l) {
      if (l <= P.level) return;
      P.level = l;
      root.classList.toggle('lowfx', l >= 1);
      P.listeners.forEach(function (f) { try { f(l); } catch (e) {} });
    },
    onChange: function (f) { P.listeners.push(f); }
  };
  root.classList.toggle('lowfx', level >= 1);
})();
