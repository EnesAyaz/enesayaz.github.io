/* Rotating stator field of a two-pole, three-phase winding.
 *
 * Phase axes a, b, c at 0, 120, 240 degrees. Phase current i_k = I_k cos(theta - phi_k), with phi = 0, 120, 240 deg
 * for sequence abc and 0, 240, 120 deg for acb. Stator MMF space vector F = sum i_k e^(j axis_k), in units of the
 * peak MMF of one phase. Splitting the cosines gives F = P e^(j theta) + N e^(-j theta):
 *   P = 1/2 sum I_k e^(j(axis_k - phi_k))   forward field
 *   N = 1/2 sum I_k e^(j(axis_k + phi_k))   backward field
 * Balanced currents give |P| = 1.5, |N| = 0. The tip of F traces an ellipse with half-axes |P| + |N| and ||P| - |N||.
 */
(function () {
  'use strict';
  var A = window.PEAnim, TAU = A.TAU, PH = A.PHASES, AX = [0, TAU / 3, 2 * TAU / 3];

  function Model() { this.reset(); }
  Model.prototype.reset = function () { this.I = [1, 1, 1]; this.seq = 'abc'; this.th = 0.35; this.showPhases = true; };
  Model.prototype.phi = function (k) { return (this.seq === 'abc' ? [0, 1, 2] : [0, 2, 1])[k] * TAU / 3; };
  Model.prototype.i = function (k, th) { return this.I[k] * Math.cos((th === undefined ? this.th : th) - this.phi(k)); };
  Model.prototype.F = function (th) {
    var x = 0, y = 0;
    for (var k = 0; k < 3; k++) { var v = this.i(k, th); x += v * Math.cos(AX[k]); y += v * Math.sin(AX[k]); }
    return [x, y];
  };
  Model.prototype.parts = function () {
    var px = 0, py = 0, nx = 0, ny = 0;
    for (var k = 0; k < 3; k++) {
      var a = AX[k] - this.phi(k), b = AX[k] + this.phi(k);
      px += this.I[k] / 2 * Math.cos(a); py += this.I[k] / 2 * Math.sin(a);
      nx += this.I[k] / 2 * Math.cos(b); ny += this.I[k] / 2 * Math.sin(b);
    }
    return { P: Math.hypot(px, py), N: Math.hypot(nx, ny) };
  };
  Model.prototype.step = function (dt) { this.th = (this.th + dt * TAU / 6) % TAU; };   // one electrical period in 6 s

  function drawMachine(p, M) {
    if (!p.begin()) return;
    var g = p.g, cx = p.W / 2, cy = p.H / 2 + 12, Ro = 146, Ri = 110, s = 46, k, i;
    if (!M.thumb) p.text('Stator field', 12, 14, { align: 'left', bold: true, size: 13.5, col: p.ink });
    function P(r, a) { return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; }
    g.fillStyle = p.face; g.beginPath(); g.arc(cx, cy, Ro, 0, TAU); g.arc(cx, cy, Ri, 0, TAU, true); g.fill('evenodd');
    g.strokeStyle = p.soft; g.lineWidth = 1.2; [Ro, Ri].forEach(function (r) { g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); });
    var F = M.F(), mag = Math.hypot(F[0], F[1]), ang = Math.atan2(F[1], F[0]);
    // radial air-gap field, fundamental
    for (i = 0; i < 36; i++) {
      var gam = i * TAU / 36, b = mag * Math.cos(gam - ang) / 1.5;
      if (Math.abs(b) < 0.06) continue;
      var r0 = Ri - 12, r1 = r0 + 18 * b, q0 = P(r0, gam), q1 = P(r1, gam);
      p.arrow(q0[0], q0[1], q1[0], q1[1], p.soft, 1.3);
    }
    // conductors: positive side 90 degrees counterclockwise from the axis (right-hand rule), return side opposite
    for (k = 0; k < 3; k++) for (var side = 1; side >= -1; side -= 2) {
      var pos = P(128, AX[k] + side * TAU / 4), cur = side * M.i(k), x = pos[0], y = pos[1], c = PH[k];
      g.fillStyle = p.bg; g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fill(); g.stroke();
      var q = A.clamp(Math.abs(cur) / 1.2, 0, 1);
      if (q > 0.03) {
        if (cur > 0) p.dot(x, y, 1.6 + 2.8 * q, c);
        else { var d = 2.2 + 4 * q; p.line([[x - d, y - d], [x + d, y + d]], c, 2); p.line([[x - d, y + d], [x + d, y - d]], c, 2); }
      }
      if (side === 1) { var l = P(128, AX[k] + TAU / 4 + 0.22); p.text('abc'[k], l[0], l[1], { size: 15, bold: true, col: c }); }
    }
    // locus of the field vector
    var loc = []; for (i = 0; i <= 120; i++) { var f = M.F(i * TAU / 120); loc.push([cx + s * f[0], cy - s * f[1]]); }
    g.setLineDash([4, 4]); p.line(loc, A.BLUE, 1.3, 0.8); g.setLineDash([]);
    // phase contributions along their own axes
    if (M.showPhases) for (k = 0; k < 3; k++) {
      var v = M.i(k); if (Math.abs(v) < 0.02) continue;
      var e = [cx + s * v * Math.cos(AX[k]), cy - s * v * Math.sin(AX[k])]; p.arrow(cx, cy, e[0], e[1], PH[k], 2.2);
    }
    if (mag > 0.02) p.arrow(cx, cy, cx + s * F[0], cy - s * F[1], A.BLUE, 3.6);
    p.dot(cx, cy, 3, p.ink);
  }

  function drawCurrents(p, M) {
    if (!p.begin()) return;
    var x0 = 40, x1 = p.W - 12, y0 = 34, y1 = p.H - 28, k, i;
    function X(t) { return x0 + t / TAU * (x1 - x0); } function Y(v) { return (y0 + y1) / 2 - v / 1.3 * (y1 - y0) / 2; }
    p.text('Phase currents (pu)', x0, 14, { align: 'left', bold: true, size: 13.5, col: p.ink });
    [-1, 0, 1].forEach(function (v) { p.line([[x0, Y(v)], [x1, Y(v)]], p.soft, 1, v ? 0.25 : 0.6); p.text(String(v), x0 - 8, Y(v), { align: 'right', size: 11.5 }); });
    for (k = 0; k < 3; k++) {
      var pts = []; for (i = 0; i <= 160; i++) { var t = i * TAU / 160; pts.push([X(t), Y(M.i(k, t))]); }
      p.line(pts, PH[k], 2.2); p.dot(X(M.th), Y(M.i(k)), 4.5, PH[k]);
    }
    p.line([[X(M.th), y0], [X(M.th), y1]], p.ink, 1.2, 0.5);
    p.text('one electrical period', x1, p.H - 10, { align: 'right', size: 11.5 });
  }

  function drawSplit(p, M) {
    if (!p.begin()) return;
    var s = M.parts(), x0 = 40, x1 = p.W - 12, y = [44, 82], max = 2;
    p.text('Forward and backward field (pu)', x0, 14, { align: 'left', bold: true, size: 13.5, col: p.ink });
    [['Forward', s.P, A.BLUE], ['Backward', s.N, A.ORANGE]].forEach(function (r, j) {
      p.text(r[0], x0, y[j], { align: 'left', size: 13, col: p.ink });
      var a = x0 + 76, w = (x1 - a - 44) * Math.min(r[1], max) / max;
      p.g.fillStyle = r[2]; p.g.fillRect(a, y[j] - 7, w, 14);
      p.text(r[1].toFixed(2), a + w + 8, y[j], { align: 'left', size: 13, col: p.ink });
    });
    p.text(s.N < 0.005 ? 'Circular field: constant size, rotates ' + (M.seq === 'abc' ? 'counterclockwise' : 'clockwise') :
      s.P < 0.005 ? 'Pure backward field' : 'Elliptical field: the size changes as it rotates', x0, p.H - 14, { align: 'left', size: 12.5 });
  }

  A.register('rotating-field', function (a) {
    var M = new Model();
    if (a.only) { M.showPhases = false; M.thumb = true; a.add(a.root, 350, 330, 'Stator of a three-phase machine with its rotating field vector', drawMachine, M); return M; }
    var row = a.box('anim-row');
    a.add(a.panel(row), 360, 360, 'Stator with phase conductors, air-gap field and the field vector', drawMachine, M);
    var c = a.box('anim-controls');
    c.remove(); row.appendChild(c);
    ['a', 'b', 'c'].forEach(function (n, k) {
      a.slider(c, 'Phase ' + n + ' current amplitude', 0, 1.2, 0.01, function () { return M.I[k]; }, function (v) { M.I[k] = v; }, function () { return M.I[k].toFixed(2) + ' pu'; });
    });
    a.choice(c, 'Phase sequence', ['abc', 'acb'], function () { return M.seq; }, function (v) { M.seq = v; });
    var b = a.box('anim-buttons'); b.remove(); c.appendChild(b);
    a.play(b); a.reset(b, function () { M.reset(); });
    var pl = a.box('anim-plots');
    a.add(a.panel(pl), 400, 200, 'Phase currents over one electrical period', drawCurrents, M);
    a.add(a.panel(pl), 400, 130, 'Size of the forward and backward rotating fields', drawSplit, M);
    return M;
  });
})();
