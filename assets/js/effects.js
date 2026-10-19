/* Эффекты: раскрывающиеся этапы (≥1024px) и живая сетка в первом экране. Без библиотек. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. Expanded cards: hover, click, focus — одна открытая панель */
  var xc = document.getElementById('xc');
  if (xc) {
    var items = [].slice.call(xc.querySelectorAll('.xc__item'));
    var wide = matchMedia('(min-width: 1024px)');
    var open = function (it) {
      items.forEach(function (o) {
        var on = o === it;
        o.classList.toggle('is-open', on);
        o.querySelector('.xc__head').setAttribute('aria-expanded', on ? 'true' : 'false');
      });
    };
    items.forEach(function (it) {
      var b = it.querySelector('.xc__head');
      b.addEventListener('click', function () { open(it); });
      b.addEventListener('focus', function () { if (wide.matches) open(it); });
      it.addEventListener('mouseenter', function () { if (wide.matches && matchMedia('(hover: hover)').matches) open(it); });
    });
  }

  /* 2. Живая сетка: тянется к курсору и пружинит обратно */
  var cv = document.getElementById('grid');
  if (!cv || !cv.getContext) return;
  var hero = cv.closest('.hero') || document.body;
  var ctx = cv.getContext('2d');
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var live = fine && !reduce;
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var STEP = 46, W = 0, H = 0, cols = 0, rows = 0, P = null, V = null, O = null;
  var mx = -1e4, my = -1e4, raf = 0, visible = true, idle = 0;

  function build() {
    var r = cv.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cols = Math.ceil(W / STEP) + 1; rows = Math.ceil(H / STEP) + 1;
    var n = cols * rows; P = new Float32Array(n * 2); V = new Float32Array(n * 2); O = new Float32Array(n * 2);
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) { var i = (y * cols + x) * 2; O[i] = P[i] = x * STEP; O[i + 1] = P[i + 1] = y * STEP; }
    draw();
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#5a74ff'); g.addColorStop(1, '#cdb6f6');
    ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath();
    var x, y, i;
    for (y = 0; y < rows; y++) { for (x = 0; x < cols; x++) { i = (y * cols + x) * 2; x ? ctx.lineTo(P[i], P[i + 1]) : ctx.moveTo(P[i], P[i + 1]); } }
    for (x = 0; x < cols; x++) { for (y = 0; y < rows; y++) { i = (y * cols + x) * 2; y ? ctx.lineTo(P[i], P[i + 1]) : ctx.moveTo(P[i], P[i + 1]); } }
    ctx.stroke();
    ctx.fillStyle = '#cdb6f6'; ctx.beginPath();
    for (i = 0; i < P.length; i += 2) { ctx.moveTo(P[i] + 1.4, P[i + 1]); ctx.arc(P[i], P[i + 1], 1.4, 0, 6.283); }
    ctx.fill();
  }
  function step() {
    var R = 170, R2 = R * R, moving = 0;
    for (var i = 0; i < P.length; i += 2) {
      var ox = O[i], oy = O[i + 1], dx = mx - ox, dy = my - oy, d2 = dx * dx + dy * dy;
      var tx = ox, ty = oy;
      if (d2 < R2 * 4) { var f = Math.exp(-d2 / R2) * 0.22; tx += dx * f; ty += dy * f; }
      var ax = (tx - P[i]) * 0.09, ay = (ty - P[i + 1]) * 0.09;
      V[i] = (V[i] + ax) * 0.8; V[i + 1] = (V[i + 1] + ay) * 0.8;
      P[i] += V[i]; P[i + 1] += V[i + 1];
      if (Math.abs(V[i]) + Math.abs(V[i + 1]) > 0.02) moving = 1;
    }
    return moving;
  }
  function loop() {
    raf = 0;
    var m = step(); draw();
    if (m || idle < 2) { idle = m ? 0 : idle + 1; play(); }
  }
  function play() { if (live && visible && !document.hidden && !raf) raf = requestAnimationFrame(loop); }

  build();
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 150); }, { passive: true });
  if (!live) return; // касание или «меньше движения» — статичная сетка
  hero.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; idle = 0; play(); }, { passive: true });
  hero.addEventListener('pointerleave', function () { mx = my = -1e4; idle = 0; play(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) play(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) play(); else { cancelAnimationFrame(raf); raf = 0; } }).observe(cv);
})();
