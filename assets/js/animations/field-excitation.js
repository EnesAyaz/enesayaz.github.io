/* Contactless field excitation of a synchronous machine through wireless power transfer.
 *
 * Averaged (fundamental-harmonic) model, lossless link:
 *   inverter switching harmonic between two legs   V1 = 2 (2 Vdc/pi) J0(pi m/2) sin(beta/2)
 *   series-series link tuned at fsw                I2 = V1 / (w M),  I1 = V2 / (w M),  V2 = 4/pi v
 *   rectifier                                      idc = 2/pi I2
 *   output filter and field winding                Cf dv/dt = idc - i,  Lf di/dt = v - Rf i
 *
 * <div data-animation="field-excitation"></div>                       full version with controls
 * <div data-animation="field-excitation" data-view="machine"></div>   machine only, no controls
 */
(function () {
  'use strict';
  var PI = Math.PI, TAU = 2 * PI;
  var C = { Vdc: 100, fs: 60e3, L: 120e-6, Rf: 8, Lf: 0.08, Cf: 4.7e-3, Lmd: 0.1 };
  var SLOW = 0.1;            // machine and field current run 10 times slower than real time
  var SPAN = 0.5;            // seconds of simulated time shown in the plots
  var HF = '#2f7fd8', FIELD = '#e07b1a', PH = ['#d1495b', '#2a9d8f', '#8067d9'], NORTH = '#d1495b', SOUTH = '#2f7fd8';

  function J0(x) { var s = 0, t = 1, k; for (k = 1; k < 16; k++) { s += t; t *= -(x * x / 4) / (k * k); } return s; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  /* ---------- model ---------- */
  function Model() {
    this.m = 0.5; this.set = 4; this.k = 0.22; this.rpm = 600; this.auto = true; this.beta = PI / 2;
    this.v = 0; this.i = 0; this.t = 0; this.th = 0; this.hf = 0; this.hist = [];
    this.link();
  }
  Model.prototype.link = function () {
    this.wM = TAU * C.fs * this.k * C.L;
    var vmax = 2 * (2 * C.Vdc / PI) * J0(PI * this.m / 2), need = this.set * PI / 2 * this.wM;
    this.limited = this.auto && need > vmax;
    if (this.auto) this.beta = 2 * Math.asin(Math.min(1, need / vmax));
    this.V1 = vmax * Math.sin(this.beta / 2);
    this.I2 = this.V1 / this.wM;
    this.I1 = 4 / PI * this.v / this.wM;
    this.idc = 2 / PI * this.I2;
  };
  Model.prototype.emf = function (p) {
    return C.Lmd * this.i * TAU * this.rpm / 60 * Math.cos(this.th - p * TAU / 3);
  };
  Model.prototype.step = function (wall) {
    this.link();
    var T = wall * SLOW, n = Math.max(1, Math.ceil(T / 2e-4)), h = T / n;
    for (var j = 0; j < n; j++) {
      this.v = Math.max(0, this.v + h / C.Cf * (this.idc - this.i));
      this.i = Math.max(0, this.i + h / C.Lf * (this.v - C.Rf * this.i));
    }
    this.t += T;
    this.th = (this.th + TAU * this.rpm / 60 * T) % TAU;
    this.hf = (this.hf + wall * 0.55) % 1;               // displayed high-frequency phase, in cycles
    this.hist.push([this.t, this.i, this.emf(0), this.emf(1), this.emf(2)]);
    while (this.hist.length && this.hist[0][0] < this.t - SPAN) this.hist.shift();
  };

  var Pen = window.PEAnim.Pen;

  /* ---------- WPT circuit ---------- */
  function drawCircuit(p, M) {
    if (!p.begin()) return;
    var g = p.g, ph = M.hf, b = M.beta / TAU, i;
    var aOn = (((ph + b / 2) % 1) + 1) % 1 < 0.5, bOn = (((ph - b / 2) % 1) + 1) % 1 < 0.5, cOn = ph < 0.5;
    // i1 is in phase with the voltage between the legs, i2 is 90 degrees apart in a tuned series-series link
    var i1 = Math.cos(TAU * ph), i2 = Math.sin(TAU * ph);
    var a1 = clamp(M.I1 / 6, 0, 1), a2 = clamp(M.I2 / 8, 0, 1), af = clamp(M.i / 5, 0, 1);

    // inverter
    p.line([[34, 62], [200, 62]]); p.line([[34, 262], [200, 262]]); p.line([[34, 62], [34, 262]]);
    p.cap(34, 162, false); p.text('Vdc', 34, 36);
    [[84, aOn, 1], [136, bOn, 1], [188, cOn, 0.35]].forEach(function (l) {
      g.globalAlpha = l[2]; p.line([[l[0], 62], [l[0], 262]], null, 1.6, l[2]);
      p.sw(l[0], 110, l[1] && l[2] === 1); p.sw(l[0], 214, !l[1] && l[2] === 1);
    });
    p.text('Motor inverter', 136, 36, { bold: true, size: 14, col: p.ink });
    p.text('also drives the stator', 136, 284);
    // primary loop
    var up = [[84, 148], [236, 148], [236, 84], [312, 84], [312, 112]], dn = [[312, 212], [312, 240], [236, 240], [236, 176], [136, 176]];
    p.line(up, p.ink, 1.8); p.line(dn, p.ink, 1.8); p.dot(84, 148, 3.4, p.ink); p.dot(136, 176, 3.4, p.ink);
    p.cap(274, 84, true); p.text('C1', 274, 62);
    p.flow(up, 14 * Math.sin(TAU * ph), HF, a1); p.flow(dn, 14 * Math.sin(TAU * ph), HF, a1);

    // coils and flux
    var gap = 26 + (0.32 - M.k) * 190, xR = 312 + gap + 34, mid = (312 + xR) / 2;
    for (i = 0; i < 3; i++) {
      var flux = a1 * i1 + a2 * i2, rx = (xR - 312) / 2 + 8 + i * 13, ry = 24 + i * 22;
      g.globalAlpha = clamp(0.12 + 0.75 * Math.abs(flux), 0, 0.9); g.strokeStyle = HF; g.lineWidth = 1.8;
      g.setLineDash([9, 7]); g.lineDashOffset = -M.hf * 64 * (flux < 0 ? -1 : 1);
      g.beginPath(); g.ellipse(mid, 162, rx, ry, 0, 0, TAU); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    }
    g.setLineDash([4, 5]); p.line([[mid, 34], [mid, 288]], p.soft, 1.3); g.setLineDash([]);
    p.text('stationary', mid - 9, 24, { align: 'right' }); p.text('rotating', mid + 9, 24, { align: 'left' });
    p.coil(312, 112, 212, 5, 1, HF, 3); p.coil(xR, 112, 212, 5, -1, FIELD, 3);

    // secondary, rectifier, field winding
    var xb = 498, xc = 548, xs = xR;
    var su = [[xs, 112], [xs, 84], [458, 84], [458, 148], [xb, 148]], sd = [[xs, 212], [xs, 240], [458, 240], [458, 176], [xc, 176]];
    p.line(su, p.ink, 1.8); p.line(sd, p.ink, 1.8); p.cap((xs + 458) / 2, 84, true); p.text('C2', (xs + 458) / 2, 62);
    p.flow(su, -14 * Math.cos(TAU * ph), FIELD, a2); p.flow(sd, 14 * Math.cos(TAU * ph), FIELD, a2);
    p.line([[xb, 62], [xb, 262]]); p.line([[xc, 62], [xc, 262]]); p.line([[xb, 62], [700, 62]]); p.line([[xb, 262], [700, 262]]);
    p.dot(xb, 148, 3.4, p.ink); p.dot(xc, 176, 3.4, p.ink);
    var pos = i2 > 0 && a2 > 0.03, neg = i2 < 0 && a2 > 0.03;
    p.diode(xb, 106, pos); p.diode(xb, 220, neg); p.diode(xc, 106, neg); p.diode(xc, 220, pos);
    p.line([[604, 62], [604, 262]]); p.cap(604, 162, false); p.text('Cf', 580, 162);
    p.line([[700, 62], [700, 106]], p.ink, 1.8); p.line([[700, 218], [700, 262]], p.ink, 1.8); p.coil(700, 106, 218, 6, 1, FIELD, 3);
    p.flow([[604, 62], [700, 62], [700, 106]], M.t * 900 * af, FIELD, af); p.flow([[700, 218], [700, 262], [604, 262]], M.t * 900 * af, FIELD, af);
    p.text('Rectifier', 523, 36, { bold: true, size: 14, col: p.ink });
    p.text('Field winding', 690, 284); p.text(M.i.toFixed(2) + ' A', 690, 162, { bold: true, size: 15, col: FIELD, align: 'right' });
  }

  /* ---------- machine cross-section ---------- */
  function drawMachine(p, M) {
    if (!p.begin()) return;
    var g = p.g, cx = p.W / 2, cy = p.H / 2, Ro = 158, Ri = 108, af = clamp(M.i / 5, 0, 1.1), th = M.th, i, s;
    function ring(r0, r1, col) { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r1, 0, TAU); g.arc(cx, cy, r0, 0, TAU, true); g.fill('evenodd'); }
    ring(Ri, Ro, p.face); g.strokeStyle = p.soft; g.lineWidth = 1.4;
    [Ro, Ri].forEach(function (r) { g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); });

    // flux lines, fixed to the rotor
    g.save(); g.translate(cx, cy); g.rotate(-th);
    for (s = -1; s <= 1; s += 2) for (i = 0; i < 3; i++) {
      var d = 0.14 + i * 0.22, ry = Ro - 9 - i * 11, y0 = 8 + i * 9;
      g.globalAlpha = clamp(0.95 * af, 0, 0.95); g.strokeStyle = FIELD; g.lineWidth = 2; g.setLineDash([10, 8]); g.lineDashOffset = -M.t * 260;
      g.beginPath(); g.moveTo(-72, s * y0); g.lineTo(72, s * y0); g.lineTo(98 * Math.cos(d), s * 98 * Math.sin(d));
      g.lineTo((ry - 8) * Math.cos(d), s * (ry - 8) * Math.sin(d));
      g.arc(0, 0, ry, s * (d + 0.09), s * (PI - d - 0.09), s < 0);
      g.lineTo(-(ry - 8) * Math.cos(d), s * (ry - 8) * Math.sin(d)); g.lineTo(-98 * Math.cos(d), s * 98 * Math.sin(d)); g.lineTo(-72, s * y0); g.stroke();
    }
    g.setLineDash([]); g.globalAlpha = 1; g.restore();

    // stator slots: a, -c, b, -a, c, -b, two slots each
    var seq = [[0, 1], [0, 1], [2, -1], [2, -1], [1, 1], [1, 1], [0, -1], [0, -1], [2, 1], [2, 1], [1, -1], [1, -1]];
    for (i = 0; i < 12; i++) {
      // the conductor sits where its own flux-density extreme gives the phase voltage
      var al = (i + 0.5) * TAU / 12 - TAU / 12, x = cx + 121 * Math.cos(al), y = cy - 121 * Math.sin(al);
      var e = M.i * Math.cos(th - al) / 5 * (M.rpm / 600), col = PH[seq[i][0]];
      g.fillStyle = p.bg; g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 10.5, 0, TAU); g.fill();
      g.globalAlpha = clamp(Math.abs(e) * 0.75, 0, 0.75); g.fillStyle = col; g.fill(); g.globalAlpha = 1; g.stroke();
      var q = clamp(Math.abs(e), 0, 1);
      if (q > 0.05) { if (e > 0) p.dot(x, y, 1.5 + 2.6 * q, p.ink); else { var c = 2 + 4 * q; p.line([[x - c, y - c], [x + c, y + c]], p.ink, 1.8); p.line([[x - c, y + c], [x + c, y - c]], p.ink, 1.8); } }
    }

    // salient-pole rotor
    g.save(); g.translate(cx, cy); g.rotate(-th);
    g.fillStyle = p.face; g.strokeStyle = p.soft; g.lineWidth = 1.4;
    for (s = -1; s <= 1; s += 2) {
      g.beginPath(); g.arc(0, 0, 99, s > 0 ? -0.78 : PI - 0.78, s > 0 ? 0.78 : PI + 0.78);
      g.lineTo(s * 62, s * 30); g.lineTo(0, s * 30); g.lineTo(0, -s * 30); g.lineTo(s * 62, -s * 30); g.closePath(); g.fill(); g.stroke();
      g.globalAlpha = 0.62 * clamp(af, 0, 1); g.fillStyle = s > 0 ? NORTH : SOUTH;
      g.beginPath(); g.arc(0, 0, 99, s > 0 ? -0.78 : PI - 0.78, s > 0 ? 0.78 : PI + 0.78); g.lineTo(s * 62, s * 30); g.lineTo(s * 62, -s * 30); g.closePath(); g.fill();
      g.globalAlpha = 1; g.fillStyle = p.face;
    }
    // flux inside the rotor, drawn over the iron
    for (i = -2; i <= 2; i++) {
      g.globalAlpha = clamp(0.9 * af, 0, 0.9); g.strokeStyle = FIELD; g.lineWidth = 1.8; g.setLineDash([10, 8]); g.lineDashOffset = -M.t * 260;
      g.beginPath(); g.moveTo(-84, i * 10); g.lineTo(84, i * 10); g.stroke();
    }
    g.setLineDash([]); g.globalAlpha = 1;
    // field conductors on both sides of each pole
    for (s = -1; s <= 1; s += 2) for (i = -1; i <= 1; i += 2) for (var k = 0; k < 2; k++) {
      var fx = s * (28 + k * 19), fy = i * 41;
      g.fillStyle = p.bg; g.strokeStyle = FIELD; g.lineWidth = 2; g.beginPath(); g.arc(fx, fy, 8.2, 0, TAU); g.fill();
      g.globalAlpha = 0.65 * clamp(af, 0, 1); g.fillStyle = FIELD; g.fill(); g.globalAlpha = 1; g.stroke();
      if (af > 0.04) { if (i < 0) p.dot(fx, fy, 1.4 + 2 * clamp(af, 0, 1), p.ink); else { p.line([[fx - 3.6, fy - 3.6], [fx + 3.6, fy + 3.6]], p.ink, 1.6); p.line([[fx - 3.6, fy + 3.6], [fx + 3.6, fy - 3.6]], p.ink, 1.6); } }
    }
    g.fillStyle = p.soft; g.beginPath(); g.arc(0, 0, 15, 0, TAU); g.fill();
    [['N', 80], ['S', -80]].forEach(function (l) { g.save(); g.translate(l[1], 0); g.rotate(th); p.text(l[0], 0, 0, { bold: true, size: 18, col: p.ink }); g.restore(); });
    g.restore();
  }

  /* ---------- plots ---------- */
  function drawPlot(p, M, kind) {
    if (!p.begin()) return;
    var x0 = 44, x1 = p.W - 12, y0 = 34, y1 = p.H - 26, g = p.g, i;
    function axis(lo, hi, step, unit) {
      var Y = function (v) { return y1 - (v - lo) / (hi - lo) * (y1 - y0); };
      for (var v = lo; v <= hi + 1e-9; v += step) { p.line([[x0, Y(v)], [x1, Y(v)]], p.soft, 1, v === 0 ? 0.7 : 0.22); p.text(String(v), x0 - 8, Y(v), { align: 'right', size: 11.5 }); }
      return Y;
    }
    function title(s) { p.text(s, x0, 14, { align: 'left', bold: true, size: 13, col: p.ink }); }
    if (kind === 'hf') {
      title('Link voltage and currents');
      var Y = axis(-100, 100, 50), n = 240, v = [], a = [], b = [], sh = M.beta / TAU / 2;
      var sq = function (u) { return ((u % 1) + 1) % 1 < 0.5 ? 1 : 0; };
      for (i = 0; i <= n; i++) {
        var ph = M.hf + 2 * i / n - 2, x = x0 + (x1 - x0) * i / n;
        v.push([x, Y(C.Vdc * (sq(ph + sh) - sq(ph - sh)))]);
        a.push([x, Y(10 * M.I1 * Math.cos(TAU * ph))]); b.push([x, Y(10 * M.I2 * Math.sin(TAU * ph))]);
      }
      p.line(v, p.soft, 1.5); p.line(a, HF, 2.2); p.line(b, FIELD, 2.2);
      p.text('two cycles at 60 kHz', x1, p.H - 10, { align: 'right', size: 11.5 });
      p.text('v1 (V)', x0, p.H - 10, { align: 'left', size: 11.5 }); p.text('10·i1', x0 + 40, p.H - 10, { align: 'left', size: 11.5, col: HF }); p.text('10·i2 (A)', x0 + 76, p.H - 10, { align: 'left', size: 11.5, col: FIELD });
      return;
    }
    var T = M.t, X = function (t) { return x1 - (T - t) / SPAN * (x1 - x0); };
    if (kind === 'field') {
      title('Field current (A)'); Y = axis(0, 8, 2);
      g.setLineDash([5, 5]); p.line([[x0, Y(M.set)], [x1, Y(M.set)]], p.ink, 1.3, 0.6); g.setLineDash([]);
      p.line(M.hist.map(function (h) { return [X(h[0]), Y(clamp(h[1], 0, 8))]; }), FIELD, 2.6);
      if (M.limited) p.text('phase-shift limit reached', x1, 14, { align: 'right', size: 12, col: NORTH });
    } else {
      title('No-load stator voltages (V)'); Y = axis(-80, 80, 40);
      for (i = 0; i < 3; i++) p.line(M.hist.map(function (h) { return [X(h[0]), Y(clamp(h[2 + i], -80, 80))]; }), PH[i], 2);
    }
    p.text('last ' + SPAN * 1000 + ' ms', x1, p.H - 10, { align: 'right', size: 11.5 });
  }

  /* ---------- mounting ---------- */
  function el(tag, cls, parent, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }
  function canvas(parent, W, H, label) { var c = el('canvas', '', parent); c.setAttribute('role', 'img'); c.setAttribute('aria-label', label); return new Pen(c, W, H); }

  function mount(root) {
    if (root.dataset.ready) return; root.dataset.ready = '1'; root.classList.add('anim');
    var M = new Model(), draws = [], only = root.dataset.view === 'machine', playing = !matchMedia('(prefers-reduced-motion: reduce)').matches, visible = true, last = 0;
    if (only || !playing) for (var w = 0; w < 400; w++) M.step(0.02);
    function add(box, W, H, label, fn, arg) { var p = canvas(box, W, H, label); draws.push(function () { fn(p, M, arg); }); }
    var machineLabel = 'Cross-section of a two-pole synchronous machine with a rotating field winding and three-phase stator';
    if (only) { add(root, 350, 330, machineLabel, drawMachine); }
    else {
      var scene = el('div', 'anim-scene', root);
      add(el('div', 'anim-panel', scene), 745, 300, 'Circuit: motor inverter, wireless link across the air gap, rectifier and field winding', drawCircuit);
      var row = el('div', 'anim-row', root);
      add(el('div', 'anim-panel', row), 350, 330, machineLabel, drawMachine);
      var ctl = el('div', 'anim-controls', row);
      var out = {};
      var slider = function (key, label, min, max, st, fmt) {
        var l = el('label', '', ctl), top = el('span', 'anim-label', l, label); out[key] = el('output', '', top);
        var r = el('input', '', l); r.type = 'range'; r.min = min; r.max = max; r.step = st; r.value = key === 'beta' ? M.beta * 180 / PI : M[key];
        r.setAttribute('aria-label', label);
        r.addEventListener('input', function () { M[key] = key === 'beta' ? r.value * PI / 180 : +r.value; M.link(); paint(); });
        out[key].update = function () { out[key].textContent = fmt(); if (key === 'beta') { r.value = M.beta * 180 / PI; r.disabled = M.auto; } };
      };
      slider('set', 'Field current reference', 0, 6, 0.1, function () { return M.set.toFixed(1) + ' A'; });
      slider('m', 'Motor modulation index', 0, 1, 0.01, function () { return M.m.toFixed(2); });
      slider('k', 'Coil coupling', 0.14, 0.32, 0.01, function () { return M.k.toFixed(2); });
      slider('rpm', 'Rotor speed', 0, 1200, 10, function () { return M.rpm + ' rpm'; });
      var tog = el('label', 'anim-check', ctl), box = el('input', '', tog); box.type = 'checkbox'; box.checked = M.auto; el('span', '', tog, 'Adapt the carrier phase shift automatically');
      box.addEventListener('change', function () { M.auto = box.checked; M.link(); paint(); });
      slider('beta', 'Carrier phase shift', 0, 180, 1, function () { return Math.round(M.beta * 180 / PI) + '°'; });
      var btn = el('button', 'anim-play', ctl); btn.type = 'button';
      btn.addEventListener('click', function () { playing = !playing; sync(); if (playing) kick(); });
      var plots = el('div', 'anim-plots', root);
      add(el('div', 'anim-panel', plots), 330, 200, 'Plot of link voltage and currents', drawPlot, 'hf');
      add(el('div', 'anim-panel', plots), 330, 200, 'Plot of field current over time', drawPlot, 'field');
      add(el('div', 'anim-panel', plots), 330, 200, 'Plot of no-load stator voltages over time', drawPlot, 'emf');
      draws.push(function () { for (var k in out) out[k].update(); });
      var sync = function () { btn.textContent = playing ? 'Pause' : 'Play'; }; sync();
    }
    function paint() { for (var i = 0; i < draws.length; i++) draws[i](); }
    function frame(now) {
      if (!playing || !visible) { last = 0; return; }
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
      M.step(dt); paint(); requestAnimationFrame(frame);
    }
    function kick() { last = 0; requestAnimationFrame(frame); }
    new IntersectionObserver(function (es) { var v = es[0].isIntersecting; if (v && !visible) { visible = true; kick(); } else visible = v; }).observe(root);
    new ResizeObserver(paint).observe(root);
    new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
    paint(); if (playing) kick();
    root.model = M;
  }
  function init() { document.querySelectorAll('[data-animation="field-excitation"]').forEach(mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
