/* Rotor (dq) frame of a synchronous machine and the torque of a current vector. Drag the current vector.
 *
 * Normalized: psi_f = 1, p = 1, Lq = 1 pu, Ld = Lq + (Ld - Lq). Current vector of size I at angle beta from the d axis:
 *   i_d = I cos(beta), i_q = I sin(beta)
 *   T_e = 1.5 p [psi_f i_q + (L_d - L_q) i_d i_q]
 * In the stator: i_k = I cos(theta_r + beta - axis_k) (amplitude-invariant Park transform).
 */
(function () {
  'use strict';
  var A = window.PEAnim, TAU = A.TAU, PH = A.PHASES, AX = [0, TAU / 3, 2 * TAU / 3], TEAL = PH[1];

  function Model() { this.reset(); }
  Model.prototype.reset = function () { this.I = 1; this.beta = 110 * TAU / 360; this.sal = -0.4; this.th = 0.4; };
  Model.prototype.T = function (b, I) { I = I === undefined ? this.I : I; var d = I * Math.cos(b), q = I * Math.sin(b); return 1.5 * (q + this.sal * d * q); };
  Model.prototype.mtpa = function () {
    var best = 0, bb = 0; for (var i = 0; i <= 1800; i++) { var b = i * Math.PI / 1800, t = this.T(b); if (t > best) { best = t; bb = b; } } return { b: bb, T: best };
  };
  Model.prototype.step = function (dt) { this.th = (this.th + dt * TAU / 7) % TAU; };

  function drawMachine(p, M) {
    if (!p.begin()) return;
    var g = p.g, cx = p.W / 2, cy = p.H / 2 + 12, Ro = 146, Ri = 112, th = M.th, k;
    if (!M.thumb) p.text('Machine, stator frame', 12, 14, { align: 'left', bold: true, size: 13.5, col: p.ink });
    function P(r, a) { return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; }
    g.fillStyle = p.face; g.beginPath(); g.arc(cx, cy, Ro, 0, TAU); g.arc(cx, cy, Ri, 0, TAU, true); g.fill('evenodd');
    g.strokeStyle = p.soft; g.lineWidth = 1.2; [Ro, Ri].forEach(function (r) { g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); });
    // stator conductors carry the phase currents
    for (k = 0; k < 3; k++) for (var side = 1; side >= -1; side -= 2) {
      var pos = P(129, AX[k] + side * TAU / 4), cur = side * M.I * Math.cos(th + M.beta - AX[k]), x = pos[0], y = pos[1], c = PH[k];
      g.fillStyle = p.bg; g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fill(); g.stroke();
      var q = A.clamp(Math.abs(cur) / 1.5, 0, 1);
      if (q > 0.03) { if (cur > 0) p.dot(x, y, 1.6 + 3 * q, c); else { var d = 2.2 + 4 * q; p.line([[x - d, y - d], [x + d, y + d]], c, 2); p.line([[x - d, y + d], [x + d, y - d]], c, 2); } }
    }
    // rotor: salient on d when Ld > Lq, salient on q when Ld < Lq
    g.save(); g.translate(cx, cy); g.rotate(-th);
    var rd = 100 - (M.sal < 0 ? 22 * -M.sal : 0), rq = 100 - (M.sal > 0 ? 22 * M.sal : 0);
    g.fillStyle = p.face; g.strokeStyle = p.soft; g.lineWidth = 1.2; g.beginPath();
    for (var i = 0; i <= 120; i++) { var a = i * TAU / 120, r = Math.sqrt(Math.pow(rd * Math.cos(a), 2) + Math.pow(rq * Math.sin(a), 2)); g.lineTo(r * Math.cos(a), -r * Math.sin(a)); }
    g.closePath(); g.fill(); g.stroke();
    g.globalAlpha = 0.55; g.fillStyle = A.ORANGE; g.fillRect(-rd * 0.78, -9, rd * 1.56, 18); g.globalAlpha = 1;
    g.restore();
    var n = P(rd * 0.55, th), s = P(-rd * 0.55, th);
    p.text('N', n[0], n[1], { bold: true, size: 15, col: p.ink }); p.text('S', s[0], s[1], { bold: true, size: 15, col: p.ink });
    // axes
    var dE = P(90, th), qE = P(90, th + TAU / 4);
    p.arrow(cx, cy, dE[0], dE[1], A.ORANGE, 2); p.arrow(cx, cy, qE[0], qE[1], TEAL, 2);
    var dl = P(104, th - 0.12), ql = P(104, th + TAU / 4 + 0.12);
    p.text('d', dl[0], dl[1], { bold: true, size: 15, col: A.ORANGE }); p.text('q', ql[0], ql[1], { bold: true, size: 15, col: TEAL });
    var iE = P(62 * M.I, th + M.beta); p.arrow(cx, cy, iE[0], iE[1], A.BLUE, 3.6);
    var il = P(62 * M.I + 16, th + M.beta); p.sub('i', 's', il[0], il[1], { bold: true, col: A.BLUE, size: 15 });
  }

  function geo(p) { return { cx: p.W / 2, cy: p.H / 2 + 34, s: 78 }; }
  function drawDq(p, M) {
    if (!p.begin()) return;
    var G = geo(p), g = p.g, d = M.I * Math.cos(M.beta), q = M.I * Math.sin(M.beta);
    p.text('Rotor frame: drag the current vector', 12, 14, { align: 'left', bold: true, size: 13.5, col: p.ink });
    p.arrow(G.cx - 1.6 * G.s, G.cy, G.cx + 1.75 * G.s, G.cy, A.ORANGE, 1.6); p.arrow(G.cx, G.cy + 0.45 * G.s, G.cx, G.cy - 1.62 * G.s, TEAL, 1.6);
    p.text('d', G.cx + 1.75 * G.s + 10, G.cy, { bold: true, size: 15, col: A.ORANGE }); p.text('q', G.cx + 14, G.cy - 1.55 * G.s, { bold: true, size: 15, col: TEAL });
    g.setLineDash([4, 4]); g.strokeStyle = p.soft; g.lineWidth = 1.2; g.beginPath(); g.arc(G.cx, G.cy, G.s * M.I, -Math.PI, 0); g.stroke();
    var e = [G.cx + G.s * d, G.cy - G.s * q];
    p.line([[e[0], e[1]], [e[0], G.cy]], p.soft, 1.2); p.line([[e[0], e[1]], [G.cx, e[1]]], p.soft, 1.2); g.setLineDash([]);
    var m = M.mtpa(), mp = [G.cx + G.s * M.I * Math.cos(m.b), G.cy - G.s * M.I * Math.sin(m.b)];
    g.strokeStyle = p.ink; g.lineWidth = 1.4; g.beginPath(); g.arc(mp[0], mp[1], 6, 0, TAU); g.stroke();
    p.text('MTPA', mp[0] + (m.b > Math.PI / 2 ? -10 : 10), mp[1] - 12, { size: 12, align: m.b > Math.PI / 2 ? 'right' : 'left' });
    p.arrow(G.cx, G.cy, e[0], e[1], A.BLUE, 3.6); p.dot(e[0], e[1], 7, A.BLUE);
    var y = p.H - 16;
    var w = p.sub('i', 'd', 12, y, { align: 'left' }); p.text(' = ' + d.toFixed(2) + ' pu', 12 + w, y, { align: 'left', size: 13, col: p.ink });
    w = p.sub('i', 'q', 130, y, { align: 'left' }); p.text(' = ' + q.toFixed(2) + ' pu', 130 + w, y, { align: 'left', size: 13, col: p.ink });
    p.text('β = ' + Math.round(M.beta * 360 / TAU) + '°', p.W - 12, y, { align: 'right', size: 13, col: p.ink });
  }

  function drawTorque(p, M) {
    if (!p.begin()) return;
    var x0 = 44, x1 = p.W - 12, y0 = 34, y1 = p.H - 28, i, hi = 2.6, lo = -0.6;
    function X(b) { return x0 + b / Math.PI * (x1 - x0); } function Y(v) { return y1 - (v - lo) / (hi - lo) * (y1 - y0); }
    var tw = p.sub('T', 'e', x0, 14, { align: 'left', bold: true, size: 13.5 }); p.text(' (pu) against current angle β, at this current', x0 + tw, 14, { align: 'left', bold: true, size: 13.5, col: p.ink });
    [0, 1, 2].forEach(function (v) { p.line([[x0, Y(v)], [x1, Y(v)]], p.soft, 1, v ? 0.25 : 0.6); p.text(String(v), x0 - 8, Y(v), { align: 'right', size: 11.5 }); });
    [0, 90, 180].forEach(function (d) { p.text(d + '°', X(d * Math.PI / 180), p.H - 12, { size: 11.5 }); });
    var c = [], r = [], s = []; for (i = 0; i <= 180; i++) { var b = i * Math.PI / 180, d = M.I * Math.cos(b), q = M.I * Math.sin(b); c.push([X(b), Y(M.T(b))]); r.push([X(b), Y(1.5 * q)]); s.push([X(b), Y(1.5 * M.sal * d * q)]); }
    p.line(r, TEAL, 1.6, 0.8); p.line(s, A.ORANGE, 1.6, 0.8); p.line(c, A.BLUE, 2.6);
    p.text('field', X(Math.PI / 2), Y(1.5 * M.I) - 10, { size: 12, col: TEAL });
    if (Math.abs(M.sal) > 0.05) p.text('reluctance', X(M.sal > 0 ? Math.PI / 4 : 3 * Math.PI / 4), Y(0.75 * M.sal * M.I * M.I) + (M.sal > 0 ? -12 : 14), { size: 12, col: A.ORANGE });
    var m = M.mtpa(); p.line([[X(m.b), y0], [X(m.b), y1]], p.ink, 1.2, 0.4);
    p.dot(X(M.beta), Y(M.T(M.beta)), 6, A.BLUE);
    p.text(M.T(M.beta).toFixed(2) + ' pu', x1, 34, { align: 'right', size: 13, col: p.ink });
  }

  A.register('rotor-dq', function (a) {
    var M = new Model();
    if (a.only) { M.thumb = true; a.add(a.root, 350, 330, 'Synchronous machine with rotor d and q axes and the stator current vector', drawMachine, M); return M; }
    var row = a.box('anim-row');
    a.add(a.panel(row), 360, 360, 'Machine cross-section with rotating d and q axes and the current vector', drawMachine, M);
    var dq = a.add(a.panel(row), 380, 300, 'Current vector in the rotor frame. Drag to change it.', drawDq, M);
    var cv = dq.cv, drag = false; cv.style.cursor = 'grab'; cv.style.touchAction = 'none';
    function move(e) {
      var b = cv.getBoundingClientRect(), k = dq.W / b.width, G = geo(dq), x = (e.clientX - b.left) * k - G.cx, y = G.cy - (e.clientY - b.top) * k;
      M.I = A.clamp(Math.hypot(x, y) / G.s, 0, 1.5); M.beta = A.clamp(Math.atan2(Math.max(y, 0), x), 0, Math.PI); a.paint();
    }
    cv.addEventListener('pointerdown', function (e) { drag = true; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; move(e); });
    cv.addEventListener('pointermove', function (e) { if (drag) move(e); });
    ['pointerup', 'pointercancel'].forEach(function (n) { cv.addEventListener(n, function () { drag = false; cv.style.cursor = 'grab'; }); });
    var c = a.box('anim-controls anim-controls-row');
    a.slider(c, 'Current', 0, 1.5, 0.01, function () { return M.I; }, function (v) { M.I = v; }, function () { return M.I.toFixed(2) + ' pu'; });
    a.slider(c, 'Current angle β from d', 0, 180, 1, function () { return M.beta * 180 / Math.PI; }, function (v) { M.beta = v * Math.PI / 180; }, function () { return Math.round(M.beta * 180 / Math.PI) + '°'; });
    a.slider(c, 'Saliency Ld − Lq', -0.6, 0.6, 0.05, function () { return M.sal; }, function (v) { M.sal = Math.round(v * 100) / 100; }, function () { return (M.sal > 0 ? '+' : '') + M.sal.toFixed(2) + ' pu'; });
    var b = a.box('anim-buttons'); b.remove(); c.appendChild(b); a.play(b); a.reset(b, function () { M.reset(); });
    var pl = a.box('anim-plots');
    a.add(a.panel(pl), 760, 230, 'Torque against current angle, with field and reluctance parts', drawTorque, M);
    return M;
  });
})();
