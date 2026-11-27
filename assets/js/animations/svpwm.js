/* Space vector PWM of a two-level three-phase inverter. Drag the reference vector.
 *
 * Voltages are in units of Vdc/2. Reference: u_x = M cos(theta - x 120 deg) + zero sequence z.
 *   Sine PWM  z = 0
 *   SVPWM     z = -(max + min) / 2          equal time for V0 and V7
 *   DPWM1     clamps the phase with the largest magnitude, one leg does not switch
 * Centre-aligned carrier: leg x is high for |tau - 1/2| < d_x / 2 with d_x = (1 + u_x) / 2.
 */
(function () {
  'use strict';
  var A = window.PEAnim, TAU = A.TAU, PH = A.PHASES, R = 4 / 3;      // active vectors have length 4/3
  var NAMES = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7'];
  // state as bits a,b,c -> vector number and angle
  var VEC = { '100': 1, '110': 2, '010': 3, '011': 4, '001': 5, '101': 6, '000': 0, '111': 7 };

  function Model() { this.M = 0.9; this.th = 0.6; this.tau = 0; this.method = 'SVPWM'; this.speed = 1; }
  Model.prototype.zero = function (u) {
    var mx = Math.max.apply(0, u), mn = Math.min.apply(0, u);
    if (this.method === 'SVPWM') return -(mx + mn) / 2;
    if (this.method === 'DPWM1') return mx > -mn ? 1 - mx : -1 - mn;
    return 0;
  };
  Model.prototype.duties = function (th) {
    var s = this, u = [0, 1, 2].map(function (k) { return s.M * Math.cos(th - k * TAU / 3); }), z = s.zero(u);
    return u.map(function (x) { return A.clamp((1 + x + z) / 2, 0, 1); });
  };
  Model.prototype.limit = function () { return this.method === 'Sine PWM' ? 1 : 2 / Math.sqrt(3); };
  Model.prototype.state = function (d, tau) { return d.map(function (x) { return Math.abs(tau - 0.5) < x / 2 - 1e-9 ? 1 : 0; }); };
  Model.prototype.step = function (dt) {
    this.th = (this.th + dt * TAU / 14 * this.speed) % TAU;
    this.tau = (this.tau + dt / 3.2) % 1;
  };

  /* hexagon */
  function geo(p) { return { cx: p.W / 2, cy: p.H / 2, s: 128 / R }; }
  function drawHex(p, M) {
    if (!p.begin()) return;
    var g = p.g, G = geo(p), i, d = M.duties(M.th), st = M.state(d, M.tau), now = VEC[st.join('')];
    function P(m, a) { return [G.cx + G.s * m * Math.cos(a), G.cy - G.s * m * Math.sin(a)]; }
    var sect = Math.floor(M.th / (TAU / 6)) % 6;
    // active sector
    g.globalAlpha = 0.16; g.fillStyle = A.ORANGE; g.beginPath(); g.moveTo(G.cx, G.cy);
    [sect, sect + 1].forEach(function (k) { var q = P(R, k * TAU / 6); g.lineTo(q[0], q[1]); }); g.closePath(); g.fill(); g.globalAlpha = 1;
    var hex = []; for (i = 0; i <= 6; i++) hex.push(P(R, i * TAU / 6)); p.line(hex, p.soft, 1.5);
    // linear limit
    g.setLineDash([5, 5]); g.strokeStyle = p.soft; g.lineWidth = 1.3; g.beginPath(); g.arc(G.cx, G.cy, G.s * M.limit(), 0, TAU); g.stroke(); g.setLineDash([]);
    g.strokeStyle = A.ORANGE; g.globalAlpha = 0.5; g.beginPath(); g.arc(G.cx, G.cy, G.s * M.M, 0, TAU); g.stroke(); g.globalAlpha = 1;
    for (i = 0; i < 6; i++) {
      var on = now === i + 1, q = P(R, i * TAU / 6), l = P(R + 0.2, i * TAU / 6);
      p.arrow(G.cx, G.cy, q[0], q[1], on ? A.BLUE : p.soft, on ? 3.4 : 1.4);
      p.text(NAMES[i + 1], l[0], l[1], { bold: on, size: 14, col: on ? A.BLUE : p.ink });
    }
    var z = now === 0 || now === 7;
    p.dot(G.cx, G.cy, z ? 7 : 4, z ? A.BLUE : p.soft); if (z) p.text(NAMES[now], G.cx - 20, G.cy + 14, { bold: true, size: 14, col: A.BLUE });
    // how the two active vectors add up to the reference
    var o = d.slice().sort(function (a, b) { return b - a; }), seg = M.segments(d);
    var v1 = seg.first, v2 = seg.second, m1 = P(R * seg.t1, (v1 - 1) * TAU / 6);
    if (seg.t1 > 0.004) p.arrow(G.cx, G.cy, m1[0], m1[1], PH[1], 3);
    var e = [m1[0] + G.s * R * seg.t2 * Math.cos((v2 - 1) * TAU / 6), m1[1] - G.s * R * seg.t2 * Math.sin((v2 - 1) * TAU / 6)];
    if (seg.t2 > 0.004) p.arrow(m1[0], m1[1], e[0], e[1], PH[2], 3);
    var r = P(M.M, M.th); p.arrow(G.cx, G.cy, r[0], r[1], A.ORANGE, 4); p.dot(r[0], r[1], 7, A.ORANGE);
    if (M.M > M.limit() + 1e-6) p.text('overmodulation', G.cx, p.H - 12, { col: PH[0], bold: true, size: 13 });
  }
  /* order of the active vectors in the first half period (leg with the largest duty switches first) */
  Model.prototype.segments = function (d) {
    var idx = [0, 1, 2].sort(function (a, b) { return d[b] - d[a]; }), s1 = [0, 0, 0], s2 = [0, 0, 0];
    s1[idx[0]] = 1; s2[idx[0]] = 1; s2[idx[1]] = 1;
    return { first: VEC[s1.join('')], second: VEC[s2.join('')], t0: 1 - d[idx[0]], t1: d[idx[0]] - d[idx[1]], t2: d[idx[1]] - d[idx[2]], t7: d[idx[2]] };
  };

  /* one switching period */
  function drawPeriod(p, M) {
    if (!p.begin()) return;
    var g = p.g, d = M.duties(M.th), s = M.segments(d), x0 = 40, x1 = p.W - 14, X = function (t) { return x0 + t * (x1 - x0); }, k;
    p.text('One switching period', x0, 16, { align: 'left', bold: true, size: 13.5, col: p.ink });
    var e = [0, s.t0 / 2, (s.t0 + s.t1) / 2, (s.t0 + s.t1 + s.t2) / 2], cuts = e.concat([1 - e[3], 1 - e[2], 1 - e[1], 1]);
    var lab = [0, s.first, s.second, 7, s.second, s.first, 0], cols = [null, PH[1], PH[2], null, PH[2], PH[1], null];
    for (k = 0; k < 7; k++) {
      var a = X(cuts[k]), b = X(cuts[k + 1]);
      if (b - a < 1) continue;
      g.globalAlpha = cols[k] ? 0.14 : 0.06; g.fillStyle = cols[k] || p.ink; g.fillRect(a, 34, b - a, p.H - 74); g.globalAlpha = 1;
      if (b - a > 20) p.text(NAMES[lab[k]], (a + b) / 2, 46, { bold: true, size: 13, col: cols[k] || p.ink });
    }
    for (k = 0; k < 3; k++) {
      var y = 96 + k * 56, on = [X(0.5 - d[k] / 2), X(0.5 + d[k] / 2)];
      p.text('S' + 'abc'[k], x0 - 10, y - 14, { align: 'right', bold: true, size: 14, col: PH[k] });
      p.line([[x0, y], [on[0], y], [on[0], y - 30], [on[1], y - 30], [on[1], y], [x1, y]], PH[k], 2.6);
    }
    var c = X(M.tau); p.line([[c, 34], [c, p.H - 40]], A.ORANGE, 2);
    p.text('V0 ' + pc(s.t0) + '   ' + NAMES[s.first] + ' ' + pc(s.t1) + '   ' + NAMES[s.second] + ' ' + pc(s.t2) + '   V7 ' + pc(s.t7), (x0 + x1) / 2, p.H - 16, { size: 13, col: p.ink });
  }
  function pc(v) { return Math.round(v * 100) + '%'; }

  /* one fundamental period */
  function drawCycle(p, M, kind) {
    if (!p.begin()) return;
    var x0 = 40, x1 = p.W - 14, y0 = 34, y1 = p.H - 26, i, k, n = 240;
    var hi = kind === 'duty' ? 1 : 1, lo = kind === 'duty' ? 0 : -1;
    function X(t) { return x0 + t / TAU * (x1 - x0); } function Y(v) { return y1 - (v - lo) / (hi - lo) * (y1 - y0); }
    p.text(kind === 'duty' ? 'Duty ratios' : 'Switched line voltage vab / Vdc, with average', x0, 14, { align: 'left', bold: true, size: 13, col: p.ink });
    (kind === 'duty' ? [0, 0.5, 1] : [-1, 0, 1]).forEach(function (v) { p.line([[x0, Y(v)], [x1, Y(v)]], p.soft, 1, 0.3); p.text(String(v), x0 - 8, Y(v), { align: 'right', size: 11.5 }); });
    if (kind === 'duty') {
      for (k = 0; k < 3; k++) { var pts = []; for (i = 0; i <= n; i++) pts.push([X(TAU * i / n), Y(M.duties(TAU * i / n)[k])]); p.line(pts, PH[k], 2.2); }
    } else {
      var N = 24, w = [], av = [], last = 0, v, t; w.push([X(0), Y(0)]);
      for (i = 0; i < N * 60; i++) { t = (i + 0.5) / 60; var d = M.duties(TAU * (Math.floor(t) + 0.5) / N), st = M.state(d, t % 1); v = st[0] - st[1]; if (v !== last) { w.push([X(TAU * t / N), Y(last)], [X(TAU * t / N), Y(v)]); last = v; } }
      w.push([x1, Y(last)]); p.line(w, A.BLUE, 1.3);
      for (i = 0; i <= n; i++) { var e = M.duties(TAU * i / n); av.push([X(TAU * i / n), Y(e[0] - e[1])]); } p.line(av, A.ORANGE, 2.6);
    }
    p.line([[X(M.th), y0], [X(M.th), y1]], p.ink, 1.4, 0.6);
    p.text('one fundamental period', x1, p.H - 10, { align: 'right', size: 11.5 });
  }

  A.register('svpwm', function (a) {
    var M = new Model();
    if (a.only) { a.add(a.root, 350, 330, 'Space vector hexagon with reference vector', drawHex, M); return M; }
    var row = a.box('anim-row'), left = a.panel(row), right = a.panel(row);
    var hex = a.add(left, 400, 360, 'Space vector hexagon with reference vector. Drag to move the vector.', drawHex, M);
    a.add(right, 400, 300, 'Switching signals in one switching period', drawPeriod, M);
    // drag
    var cv = hex.cv, drag = false; cv.style.cursor = 'grab'; cv.style.touchAction = 'none';
    function move(e) {
      var b = cv.getBoundingClientRect(), k = hex.W / b.width, G = geo(hex), x = (e.clientX - b.left) * k - G.cx, y = G.cy - (e.clientY - b.top) * k;
      M.M = A.clamp(Math.hypot(x, y) / G.s, 0, 1.3); M.th = (Math.atan2(y, x) + TAU) % TAU; a.paint();
    }
    cv.addEventListener('pointerdown', function (e) { drag = true; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; move(e); });
    cv.addEventListener('pointermove', function (e) { if (drag) move(e); });
    ['pointerup', 'pointercancel'].forEach(function (n) { cv.addEventListener(n, function () { drag = false; cv.style.cursor = 'grab'; }); });
    var c = a.box('anim-controls anim-controls-row');
    a.choice(c, 'Method', ['Sine PWM', 'SVPWM', 'DPWM1'], function () { return M.method; }, function (v) { M.method = v; });
    a.slider(c, 'Reference amplitude', 0, 1.3, 0.01, function () { return M.M; }, function (v) { M.M = v; }, function () { return M.M.toFixed(2) + ' × Vdc/2'; });
    a.slider(c, 'Reference angle', 0, 359, 1, function () { return M.th * 360 / TAU; }, function (v) { M.th = v * TAU / 360; }, function () { return Math.round(M.th * 360 / TAU) + '°'; });
    a.slider(c, 'Rotation speed', 0, 3, 0.1, function () { return M.speed; }, function (v) { M.speed = v; }, function () { return M.speed.toFixed(1) + '×'; });
    a.play(c);
    a.reset(c, function () { M.M = 0.9; M.th = 0.6; M.tau = 0; M.method = 'SVPWM'; M.speed = 1; });
    var pl = a.box('anim-plots');
    a.add(a.panel(pl), 400, 210, 'Duty ratios over one fundamental period', drawCycle, M, 'duty');
    a.add(a.panel(pl), 400, 210, 'Switched line voltage over one fundamental period', drawCycle, M, 'line');
    return M;
  });
})();
