/* Load step of a synchronous motor on an infinite bus, classical model.
 *
 * Normalized swing equation:  M delta'' + D delta' = P_load - P_max sin(delta),  P_max = 3 V E / X_s = 1 pu.
 * delta = angle(V) - angle(E), positive when motoring. delta' > 0 means the rotor is slower than synchronous.
 * Integrated with RK4. Time is normalized; 1 second on screen is 2 time units.
 */
(function () {
  'use strict';
  var A = window.PEAnim, TAU = A.TAU, PI = Math.PI, SPAN = 30;

  function Model() { this.reset(); }
  Model.prototype.reset = function () {
    this.M = 1; this.D = 0.25; this.P = 0.3; this.d = Math.asin(0.3); this.w = 0; this.t = 0; this.hist = []; this.d0 = this.d; this.slip = false; this.peak = this.d;
  };
  Model.prototype.load = function (v) { this.d0 = this.d; this.peak = this.d; this.P = v; this.slip = false; };
  Model.prototype.f = function (d, w) { return [w, (this.P - Math.sin(d) - this.D * w) / this.M]; };
  Model.prototype.step = function (dt) {
    var T = dt * 2, n = Math.ceil(T / 0.01), h = T / n;
    for (var i = 0; i < n; i++) {
      var s = this, d = this.d, w = this.w, k1 = s.f(d, w), k2 = s.f(d + h * k1[0] / 2, w + h * k1[1] / 2), k3 = s.f(d + h * k2[0] / 2, w + h * k2[1] / 2), k4 = s.f(d + h * k3[0], w + h * k3[1]);
      this.d += h * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) / 6; this.w += h * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) / 6; this.t += h;
      if (this.d > PI - Math.asin(Math.min(1, this.P)) + 0.05 && this.w > 0) this.slip = true;
      if (this.d > 6 * PI) { this.d -= TAU * 2; this.d0 -= TAU * 2; }
      this.peak = Math.max(this.peak, this.d);
      if (i % 5 === 0) this.hist.push([this.t, this.d, this.w]);
    }
    while (this.hist.length && this.hist[0][0] < this.t - SPAN) this.hist.shift();
  };
  /* largest load step from rest at the present angle that keeps synchronism, for D = 0 (equal-area criterion) */
  Model.prototype.critical = function () {
    var d0 = this.d, lo = Math.sin(d0), hi = 1;
    for (var i = 0; i < 50; i++) {
      var P = (lo + hi) / 2, dm = PI - Math.asin(P), acc = P * (dm - d0) - (Math.cos(d0) - Math.cos(dm));
      if (acc < 0) lo = P; else hi = P;
    }
    return lo;
  };

  function drawPhasors(p, M) {
    if (!p.begin()) return;
    var cx = p.W / 2 - 40, cy = p.H / 2 + 6, r = 112, g = p.g, vA = PI / 3, eA = vA - M.d;
    if (!M.thumb) p.text('Voltage phasors, synchronous frame', 12, 14, { align: 'left', bold: true, size: 13.5, col: p.ink });
    g.strokeStyle = p.soft; g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
    var V = [cx + r * Math.cos(vA), cy - r * Math.sin(vA)], E = [cx + 0.88 * r * Math.cos(eA), cy - 0.88 * r * Math.sin(eA)];
    g.strokeStyle = A.ORANGE; g.globalAlpha = 0.25; g.fillStyle = A.ORANGE; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 46, -vA, -eA, M.d < 0); g.closePath(); g.fill(); g.globalAlpha = 1;
    p.arrow(cx, cy, V[0], V[1], A.BLUE, 3.2); p.arrow(cx, cy, E[0], E[1], A.ORANGE, 3.2);
    p.text('V', V[0] + 12 * Math.cos(vA), V[1] - 14 * Math.sin(vA), { bold: true, size: 15, col: A.BLUE });
    p.text('E', E[0] + 14 * Math.cos(eA), E[1] - 14 * Math.sin(eA), { bold: true, size: 15, col: A.ORANGE });
    var mid = vA - M.d / 2; p.text('δ', cx + 60 * Math.cos(mid), cy - 60 * Math.sin(mid), { bold: true, size: 15, col: p.ink });
    var dd = ((M.d * 180 / PI) % 360 + 360) % 360;
    if (M.thumb) return;
    p.text('δ = ' + (M.slip ? '—' : Math.round(dd) + '°'), p.W - 12, p.H - 34, { align: 'right', size: 14, col: p.ink });
    p.text('speed ' + (M.w > 0.005 ? 'below' : M.w < -0.005 ? 'above' : 'at') + ' synchronous', p.W - 12, p.H - 14, { align: 'right', size: 13 });
  }

  function drawPd(p, M) {
    if (!p.begin()) return;
    var x0 = 44, x1 = p.W - 14, y0 = 46, y1 = p.H - 30, i, g = p.g;
    function X(d) { return x0 + d / PI * (x1 - x0); } function Y(v) { return y1 - v / 1.12 * (y1 - y0); }
    p.text('Power against angle (pu)', x0, 14, { align: 'left', bold: true, size: 13.5, col: p.ink });
    [0, 0.5, 1].forEach(function (v) { p.line([[x0, Y(v)], [x1, Y(v)]], p.soft, 1, v ? 0.25 : 0.6); p.text(String(v), x0 - 8, Y(v), { align: 'right', size: 11.5 }); });
    [0, 90, 180].forEach(function (d) { p.text(d + '°', X(d * PI / 180), p.H - 14, { size: 11.5 }); });
    // equal areas for the last step: accelerating where load > Pe, decelerating where Pe > load
    var a0 = Math.max(0, Math.min(M.d0, PI)), a1 = Math.max(0, Math.min(M.slip ? PI : M.peak, PI)), cross = Math.asin(Math.min(1, M.P));
    function area(from, to, col) {
      if (to - from < 0.003) return; g.fillStyle = col; g.globalAlpha = 0.22; g.beginPath(); g.moveTo(X(from), Y(M.P));
      for (var j = 0; j <= 40; j++) { var d = from + (to - from) * j / 40; g.lineTo(X(d), Y(Math.sin(d))); }
      g.lineTo(X(to), Y(M.P)); g.closePath(); g.fill(); g.globalAlpha = 1;
    }
    if (a1 > a0) { area(a0, Math.min(a1, Math.max(a0, cross)), A.ORANGE); area(Math.max(a0, Math.min(a1, cross)), a1, A.BLUE); }
    var c = []; for (i = 0; i <= 180; i++) c.push([X(i * PI / 180), Y(Math.sin(i * PI / 180))]); p.line(c, A.BLUE, 2.4);
    p.line([[x0, Y(M.P)], [x1, Y(M.P)]], A.ORANGE, 2);
    p.sub('P', 'e', X(PI / 2), Y(0.86), { col: A.BLUE, size: 13 }); p.text('load ' + M.P.toFixed(2), x0 + 6, Y(M.P) - 11, { align: 'left', size: 12.5, col: A.ORANGE });
    if (!M.slip && M.d >= 0 && M.d <= PI) p.dot(X(M.d), Y(Math.sin(M.d)), 6.5, p.ink);
    if (M.slip) p.text('Pole slip: the machine has lost synchronism. Press Reset.', x0, 32, { align: 'left', size: 13, bold: true, col: '#d1495b' });
    else if (Math.abs(M.w) < 0.004) p.text('Largest stable step from here, without damping: ' + M.critical().toFixed(2) + ' pu', x0, 32, { align: 'left', size: 12.5 });
  }

  function drawTime(p, M) {
    if (!p.begin()) return;
    var x0 = 44, x1 = p.W - 14, y0 = 34, y1 = p.H - 26, T = M.t, i;
    function X(t) { return x1 - (T - t) / SPAN * (x1 - x0); } function Y(v) { return y1 - v / 180 * (y1 - y0); }
    p.text('Angle δ (degrees) against normalized time', x0, 14, { align: 'left', bold: true, size: 13.5, col: p.ink });
    [0, 90, 180].forEach(function (v) { p.line([[x0, Y(v)], [x1, Y(v)]], p.soft, 1, v ? 0.25 : 0.6); p.text(String(v), x0 - 8, Y(v), { align: 'right', size: 11.5 }); });
    var pts = []; for (i = 0; i < M.hist.length; i++) { var h = M.hist[i], v = h[1] * 180 / PI; if (v > 200) break; pts.push([X(h[0]), Y(v)]); }
    p.line(pts, A.ORANGE, 2.4);
    p.text('last ' + SPAN + ' time units', x1, p.H - 10, { align: 'right', size: 11.5 });
  }

  A.register('load-step', function (a) {
    var M = new Model();
    if (a.only) { M.thumb = true; M.load(0.65); a.add(a.root, 350, 330, 'Voltage phasors of a synchronous motor during a load step', drawPhasors, M); return M; }
    var row = a.box('anim-row');
    a.add(a.panel(row), 340, 330, 'Terminal voltage V and internal voltage E with the power angle', drawPhasors, M);
    a.add(a.panel(row), 420, 300, 'Electrical power against power angle, with the load line and equal areas', drawPd, M);
    var c = a.box('anim-controls anim-controls-row');
    a.slider(c, 'Load (step it)', 0, 1, 0.01, function () { return M.P; }, function (v) { M.load(v); }, function () { return M.P.toFixed(2) + ' pu'; });
    a.slider(c, 'Damping D', 0, 1, 0.05, function () { return M.D; }, function (v) { M.D = v; }, function () { return M.D.toFixed(2); });
    a.slider(c, 'Inertia M', 0.3, 3, 0.1, function () { return M.M; }, function (v) { M.M = v; }, function () { return M.M.toFixed(1); });
    var b = a.box('anim-buttons'); b.remove(); c.appendChild(b); a.play(b); a.reset(b, function () { M.reset(); });
    var pl = a.box('anim-plots');
    a.add(a.panel(pl), 760, 190, 'Power angle against time', drawTime, M);
    return M;
  });
})();
