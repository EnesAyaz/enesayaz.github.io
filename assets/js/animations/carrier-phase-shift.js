/* Carrier phase shift in a two-level three-phase inverter with sine PWM.
 *
 * Carrier of phase x is shifted by its own angle. Everything is computed over one fundamental period:
 *   common-mode voltage  vcm = (Sa + Sb + Sc) / 3 - 1/2        (in units of Vdc, to the dc midpoint)
 *   dc-link current      idc = Sa ia + Sb ib + Sc ic, sinusoidal phase currents with 30 deg lag
 *   capacitor current    ic = idc - mean(idc), rms relative to the phase current rms
 *   line voltage         Sa - Sb and the other two, harmonic amplitudes relative to Vdc, rms over the three lines
 */
(function () {
  'use strict';
  var A = window.PEAnim, TAU = A.TAU, PI = TAU / 2, PH = A.PHASES, N = 6300, LAG = TAU / 12;
  function tri(x) { x = x - Math.floor(x); return x < 0.5 ? 4 * x - 1 : 3 - 4 * x; }

  function Model() { this.M = 0.8; this.b = 0; this.c = 0; this.ratio = 9; this.x = 0.2; this.solve(); }
  Model.prototype.ref = function (k, t) { return this.M * Math.cos(TAU * t - k * TAU / 3); };
  Model.prototype.car = function (k, t) { return tri(this.ratio * t + [0, this.b, this.c][k] / 360); };
  Model.prototype.solve = function () {
    var i, k, S = [new Int8Array(N), new Int8Array(N), new Int8Array(N)], cm = new Float32Array(N), dc = new Float32Array(N), mean = 0;
    for (i = 0; i < N; i++) {
      var t = (i + 0.5) / N, s = 0, d = 0;
      for (k = 0; k < 3; k++) { var on = this.ref(k, t) > this.car(k, t) ? 1 : 0; S[k][i] = on; s += on; d += on * Math.cos(TAU * t - k * TAU / 3 - LAG); }
      cm[i] = s / 3 - 0.5; dc[i] = d; mean += d;
    }
    mean /= N;
    var cr = 0, pk = 0, ir = 0;
    for (i = 0; i < N; i++) { cr += cm[i] * cm[i]; pk = Math.max(pk, Math.abs(cm[i])); dc[i] -= mean; ir += dc[i] * dc[i]; }
    this.S = S; this.cm = cm; this.ic = dc; this.cmRms = Math.sqrt(cr / N); this.cmPk = pk; this.icRms = Math.sqrt(ir / N) / Math.SQRT1_2;
    // line voltage spectrum up to just above twice the carrier frequency
    // (exact Fourier coefficients of a piecewise constant waveform, from its edges)
    // rms over the three lines; exact Fourier coefficients of a piecewise constant waveform, from its edges
    var H = 2 * this.ratio + 8, amp = [0], w2 = 0, h, e, l, lines = [];
    for (l = 0; l < 3; l++) {
      var p = S[l], q = S[(l + 1) % 3], te = [], dv = [], prev = p[N - 1] - q[N - 1];
      for (i = 0; i < N; i++) { var v = p[i] - q[i]; if (v !== prev) { te.push(TAU * i / N); dv.push(v - prev); prev = v; } }
      lines.push([te, dv]);
    }
    for (h = 1; h <= H; h++) {
      var sum = 0;
      for (l = 0; l < 3; l++) {
        var re = 0, im = 0, T = lines[l][0], D = lines[l][1];
        for (e = 0; e < T.length; e++) { re += D[e] * Math.cos(h * T[e]); im += D[e] * Math.sin(h * T[e]); }
        sum += re * re + im * im;
      }
      amp.push(Math.sqrt(sum / 3) / (PI * h));
      if (h > 1) w2 += Math.pow(amp[h] / h, 2);
    }
    this.amp = amp; this.wthd = amp[1] > 1e-3 ? Math.sqrt(w2) / amp[1] : 0;
  };
  Model.prototype.step = function (dt) { this.x = (this.x + dt / 16) % 1; };

  function frame(p, title, lo, hi, ticks, right, below) {
    var f = { x0: 46, x1: p.W - 12, y0: 32, y1: p.H - 12 - (below || 0) };
    f.X = function (t) { return f.x0 + t * (f.x1 - f.x0); }; f.Y = function (v) { return f.y1 - (v - lo) / (hi - lo) * (f.y1 - f.y0); };
    p.text(title, f.x0, 14, { align: 'left', bold: true, size: 13.5, col: p.ink });
    if (right) p.text(right, f.x1, 14, { align: 'right', size: 13, col: p.ink });
    ticks.forEach(function (v) { p.line([[f.x0, f.Y(v[0])], [f.x1, f.Y(v[0])]], p.soft, 1, v[0] === 0 ? 0.6 : 0.25); p.text(v[1], f.x0 - 8, f.Y(v[0]), { align: 'right', size: 11.5 }); });
    return f;
  }
  function steps(p, f, arr, col, w, map) {
    var pts = [[f.X(0), f.Y(map(arr[0]))]], last = arr[0];
    for (var i = 1; i < N; i++) if (arr[i] !== last) { pts.push([f.X(i / N), f.Y(map(last))], [f.X(i / N), f.Y(map(arr[i]))]); last = arr[i]; }
    pts.push([f.X(1), f.Y(map(last))]); p.line(pts, col, w);
  }
  function cursor(p, f, M) { p.line([[f.X(M.x), f.y0], [f.X(M.x), f.y1]], A.ORANGE, 2, 0.9); }

  function drawCarriers(p, M) {
    if (!p.begin()) return;
    var f = frame(p, 'References and carriers', -1.1, 1.1, [[-1, '-1'], [0, '0'], [1, '1']]), k, i;
    for (k = 0; k < 3; k++) {
      var c = [], r = [], sh = [0, M.b, M.c][k] / 360, j0 = Math.ceil(2 * sh), ts = [0];
      // corner points of the triangle
      for (i = j0; i <= 2 * (M.ratio + sh); i++) { var t = (i / 2 - sh) / M.ratio; if (t > 0 && t < 1) ts.push(t); } ts.push(1);
      ts.forEach(function (t) { c.push([f.X(t), f.Y(M.car(k, t))]); }); p.line(c, PH[k], 1.2, 0.55);
      for (i = 0; i <= 160; i++) r.push([f.X(i / 160), f.Y(M.ref(k, i / 160))]); p.line(r, PH[k], 2.6);
    }
    cursor(p, f, M);
    for (k = 0; k < 3; k++) p.dot(f.X(M.x), f.Y(A.clamp(M.car(k, M.x), -1.1, 1.1)), 4.5, PH[k]);
  }
  function drawLegs(p, M) {
    if (!p.begin()) return;
    var f = frame(p, 'Leg states', 0, 3.3, []), k;
    for (k = 0; k < 3; k++) { (function (o) { p.text('S' + 'abc'[k], f.x0 - 8, f.Y(o + 0.35), { align: 'right', bold: true, size: 13, col: PH[k] }); steps(p, f, M.S[k], PH[k], 1.8, function (v) { return o + v * 0.75; }); })(2.3 - k * 1.1); }
    cursor(p, f, M);
  }
  function drawCm(p, M) {
    if (!p.begin()) return;
    var f = frame(p, 'Common-mode voltage / Vdc', -0.6, 0.6, [[-0.5, '-1/2'], [-1 / 6, '-1/6'], [1 / 6, '1/6'], [0.5, '1/2']], 'rms ' + M.cmRms.toFixed(3));
    steps(p, f, M.cm, A.BLUE, 1.8, function (v) { return v; }); cursor(p, f, M);
  }
  function drawIc(p, M) {
    if (!p.begin()) return;
    var f = frame(p, 'DC-link capacitor current / phase peak', -1.6, 1.6, [[-1, '-1'], [0, '0'], [1, '1']], 'rms ' + M.icRms.toFixed(3) + ' × Iph,rms'), pts = [];
    for (var i = 0; i < N; i += 2) pts.push([f.X(i / N), f.Y(A.clamp(M.ic[i], -1.6, 1.6))]); p.line(pts, A.ORANGE, 1.4); cursor(p, f, M);
  }
  function drawSpec(p, M) {
    if (!p.begin()) return;
    var H = M.amp.length - 1, f = frame(p, 'Line voltage spectrum / Vdc', 0, 1.1, [[0, '0'], [0.5, '0.5'], [1, '1']], 'weighted THD ' + (100 * M.wthd).toFixed(2) + '%', 16);
    for (var h = 1; h <= H; h++) if (M.amp[h] > 0.004) { p.g.fillStyle = h === 1 ? A.ORANGE : A.BLUE; var bw = Math.min(7, 190 / H); p.g.fillRect(f.X(h / (H + 1)) - bw / 2, f.Y(M.amp[h]), bw, f.Y(0) - f.Y(M.amp[h])); }
    [[1, 'f0'], [M.ratio, 'fsw'], [2 * M.ratio, '2fsw']].forEach(function (l) { p.text(l[1], f.X(l[0] / (H + 1)), f.y1 + 12, { size: 12 }); });
  }
  function drawThumb(p, M) {
    if (!p.begin()) return;
    var k, i, X = function (t) { return 12 + t * (p.W - 24); };
    for (k = 0; k < 3; k++) {
      var c = []; for (i = 0; i <= 180; i++) { var t = i / 180; c.push([X(t), 92 - 62 * tri(3 * t + M.x * 3 + k * M.thumbShift / 360)]); } p.line(c, PH[k], 2.2);
    }
    var f = { X: X, Y: function (v) { return 248 - v * 120; } }; steps(p, f, M.cm, A.BLUE, 2.4, function (v) { return v; });
    p.text('common-mode voltage', p.W / 2, 322, { size: 15 });
  }

  A.register('carrier-phase-shift', function (a) {
    var M = new Model();
    if (a.only) { M.b = 120; M.c = 240; M.ratio = 9; M.thumbShift = 120; M.solve(); a.add(a.root, 350, 330, 'Three phase-shifted carriers and the common-mode voltage', drawThumb, M); return M; }
    var top = a.box('anim-stack');
    a.add(a.panel(top), 760, 230, 'References and carriers of the three phases', drawCarriers, M);
    a.add(a.panel(top), 760, 170, 'Switching states of the three legs', drawLegs, M);
    a.add(a.panel(top), 760, 170, 'Common-mode voltage', drawCm, M);
    var c = a.box('anim-controls anim-controls-row'), set = function (key) { return function (v) { M[key] = v; M.solve(); }; };
    var presets = { 'In phase': [0, 0], 'One carrier by 180°': [0, 180], '120° apart': [120, 240] };
    a.choice(c, 'Carriers', Object.keys(presets), function () { for (var n in presets) if (presets[n][0] === M.b && presets[n][1] === M.c) return n; return ''; },
      function (n) { M.b = presets[n][0]; M.c = presets[n][1]; M.solve(); });
    a.slider(c, 'Carrier shift, phase b', 0, 360, 5, function () { return M.b; }, set('b'), function () { return M.b + '°'; });
    a.slider(c, 'Carrier shift, phase c', 0, 360, 5, function () { return M.c; }, set('c'), function () { return M.c + '°'; });
    a.slider(c, 'Modulation index', 0, 1, 0.01, function () { return M.M; }, set('M'), function () { return M.M.toFixed(2); });
    a.slider(c, 'Carrier ratio', 9, 33, 6, function () { return M.ratio; }, set('ratio'), function () { return M.ratio; });
    a.play(c);
    a.reset(c, function () { M.M = 0.8; M.b = 0; M.c = 0; M.ratio = 9; M.x = 0.2; M.solve(); });
    var pl = a.box('anim-plots');
    a.add(a.panel(pl), 400, 220, 'DC-link capacitor current', drawIc, M);
    a.add(a.panel(pl), 400, 220, 'Line voltage spectrum', drawSpec, M);
    return M;
  });
})();
