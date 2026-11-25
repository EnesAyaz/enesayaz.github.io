/* Shared drawing and control code for the animations. Load before the animation scripts. */
(function () {
  'use strict';
  var PI = Math.PI, TAU = 2 * PI, HF = '#2f7fd8', FIELD = '#e07b1a';
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  function Pen(canvas, W, H) {
    this.cv = canvas; this.W = W; this.H = H; this.g = canvas.getContext('2d');
    canvas.style.aspectRatio = W + ' / ' + H;
  }
  Pen.prototype.begin = function () {
    var r = window.devicePixelRatio || 1, w = this.cv.clientWidth;
    if (!w) return false;
    var pw = Math.round(w * r), ph = Math.round(w * this.H / this.W * r);
    if (this.cv.width !== pw || this.cv.height !== ph) { this.cv.width = pw; this.cv.height = ph; }
    var s = pw / this.W, g = this.g;
    g.setTransform(s, 0, 0, s, 0, 0); g.clearRect(0, 0, this.W, this.H);
    g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = 1; g.setLineDash([]);
    var cs = getComputedStyle(this.cv);
    this.ink = cs.color; this.soft = cs.getPropertyValue('--anim-soft').trim() || '#8a949c';
    this.face = cs.getPropertyValue('--anim-face').trim() || '#e9edf0'; this.bg = cs.getPropertyValue('--anim-bg').trim() || '#fff';
    this.font = cs.fontFamily;
    return true;
  };
  Pen.prototype.line = function (pts, col, w, a) {
    var g = this.g; g.globalAlpha = a === undefined ? 1 : a; g.strokeStyle = col || this.soft; g.lineWidth = w || 1.6; g.beginPath();
    for (var i = 0; i < pts.length; i++) g[i ? 'lineTo' : 'moveTo'](pts[i][0], pts[i][1]);
    g.stroke(); g.globalAlpha = 1;
  };
  Pen.prototype.text = function (s, x, y, o) {
    o = o || {}; var g = this.g; g.globalAlpha = 1; g.fillStyle = o.col || this.soft;
    g.font = (o.bold ? '600 ' : '') + (o.size || 12.5) + 'px ' + this.font; g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y);
  };
  Pen.prototype.dot = function (x, y, r, col, a) {
    var g = this.g; g.globalAlpha = a === undefined ? 1 : a; g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.globalAlpha = 1;
  };
  /* charges moving along a path; shift is in path units */
  Pen.prototype.flow = function (pts, shift, col, a) {
    if (a < 0.03) return;
    var seg = [], L = 0, i, d, gap = 22;
    for (i = 1; i < pts.length; i++) { d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push([L, d]); L += d; }
    for (var s = ((shift % gap) + gap) % gap; s < L; s += gap) {
      for (i = 0; i < seg.length - 1 && s > seg[i][0] + seg[i][1]; i++);
      var f = (s - seg[i][0]) / seg[i][1];
      this.dot(pts[i][0] + f * (pts[i + 1][0] - pts[i][0]), pts[i][1] + f * (pts[i + 1][1] - pts[i][1]), 2.7, col, a);
    }
  };
  Pen.prototype.coil = function (x, y0, y1, n, side, col, w) {
    var g = this.g, r = (y1 - y0) / n / 2; g.strokeStyle = col; g.lineWidth = w || 2.4; g.beginPath(); g.moveTo(x, y0);
    for (var i = 0; i < n; i++) g.arc(x, y0 + r * (2 * i + 1), r, -PI / 2, PI / 2, side < 0);
    g.stroke();
  };
  Pen.prototype.cap = function (x, y, horizontalWire) {
    var b = this; this.g.fillStyle = this.bg;
    if (horizontalWire) { this.g.fillRect(x - 4, y - 12, 8, 24); b.line([[x - 4, y - 11], [x - 4, y + 11]], this.ink, 2); b.line([[x + 4, y - 11], [x + 4, y + 11]], this.ink, 2); }
    else { this.g.fillRect(x - 13, y - 4, 26, 8); b.line([[x - 12, y - 4], [x + 12, y - 4]], this.ink, 2); b.line([[x - 12, y + 4], [x + 12, y + 4]], this.ink, 2); }
  };
  Pen.prototype.sw = function (x, y, on) {
    var g = this.g; g.fillStyle = on ? HF : this.bg; g.strokeStyle = on ? HF : this.soft; g.lineWidth = 1.6;
    g.beginPath(); g.rect(x - 11, y - 14, 22, 28); g.fill(); g.stroke();
    var c = on ? '#fff' : this.soft;
    if (on) this.line([[x, y - 8], [x, y + 8]], c, 2.2); else this.line([[x, y + 8], [x - 6, y - 6]], c, 1.8);
  };
  Pen.prototype.diode = function (x, y, on) {
    var g = this.g; g.fillStyle = on ? FIELD : this.bg; g.strokeStyle = on ? FIELD : this.soft; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(x - 8, y + 7); g.lineTo(x + 8, y + 7); g.lineTo(x, y - 7); g.closePath(); g.fill(); g.stroke();
    this.line([[x - 8, y - 7], [x + 8, y - 7]], on ? FIELD : this.soft, 2);
  };

  Pen.prototype.arrow = function (x0, y0, x1, y1, col, w) {
    var a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0), h = Math.min(6 + 2 * w, L * 0.6), g = this.g;
    this.line([[x0, y0], [x1 - h * 0.7 * Math.cos(a), y1 - h * 0.7 * Math.sin(a)]], col, w);
    g.fillStyle = col; g.beginPath(); g.moveTo(x1, y1);
    g.lineTo(x1 - h * Math.cos(a - 0.4), y1 - h * Math.sin(a - 0.4)); g.lineTo(x1 - h * Math.cos(a + 0.4), y1 - h * Math.sin(a + 0.4)); g.closePath(); g.fill();
  };

  function el(tag, cls, parent, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }

  /* An animation registers a builder; the builder adds canvases and controls through "a" and returns its model. */
  function App(root, build) {
    var a = this, draws = [], syncs = [], playing = !matchMedia('(prefers-reduced-motion: reduce)').matches, visible = true, last = 0, M;
    root.classList.add('anim'); a.root = root; a.only = !!root.dataset.view;
    a.box = function (cls) { return el('div', cls, root); };
    a.panel = function (parent) { return el('div', 'anim-panel', parent); };
    a.add = function (parent, W, H, label, fn, model, arg) {
      var c = el('canvas', '', parent); c.setAttribute('role', 'img'); c.setAttribute('aria-label', label);
      var p = new Pen(c, W, H); draws.push(function () { fn(p, model, arg); }); return p;
    };
    a.paint = function () { var i; for (i = 0; i < draws.length; i++) draws[i](); for (i = 0; i < syncs.length; i++) syncs[i](); };
    a.slider = function (parent, label, min, max, step, get, set, fmt) {
      var l = el('label', '', parent), top = el('span', 'anim-label', l, label), o = el('output', '', top), r = el('input', '', l);
      r.type = 'range'; r.min = min; r.max = max; r.step = step; r.setAttribute('aria-label', label);
      r.addEventListener('input', function () { set(+r.value); a.paint(); });
      syncs.push(function () { var t = String(fmt()); if (o.textContent !== t) o.textContent = t; if (Math.abs(+r.value - get()) > step / 2) r.value = get(); });
    };
    a.choice = function (parent, label, names, get, set) {
      var f = el('div', 'anim-choice', parent); f.setAttribute('role', 'group'); f.setAttribute('aria-label', label);
      names.forEach(function (n) {
        var b = el('button', '', f, n); b.type = 'button'; b.addEventListener('click', function () { set(n); a.paint(); });
        syncs.push(function () { var on = String(get() === n); if (b.getAttribute('aria-pressed') !== on) b.setAttribute('aria-pressed', on); });
      });
    };
    a.play = function (parent) {
      var b = el('button', 'anim-play', parent), sync = function () { b.textContent = playing ? 'Pause' : 'Play'; }; b.type = 'button'; sync();
      b.addEventListener('click', function () { playing = !playing; sync(); if (playing) kick(); });
    };
    function frame(now) {
      if (!playing || !visible) return;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
      M.step(dt); a.paint(); requestAnimationFrame(frame);
    }
    function kick() { last = 0; requestAnimationFrame(frame); }
    M = build(a); root.model = M;
    new IntersectionObserver(function (es) { var v = es[0].isIntersecting; if (v && !visible) { visible = true; kick(); } else visible = v; }).observe(root);
    new ResizeObserver(a.paint).observe(root);
    new MutationObserver(a.paint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
    a.paint(); if (playing) kick();
  }
  function register(name, build) {
    function init() { document.querySelectorAll('[data-animation="' + name + '"]').forEach(function (r) { if (!r.dataset.ready) { r.dataset.ready = '1'; new App(r, build); } }); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  }
  window.PEAnim = { Pen: Pen, register: register, clamp: clamp, TAU: TAU, BLUE: HF, ORANGE: FIELD, PHASES: ['#d1495b', '#2a9d8f', '#8067d9'] };
})();
