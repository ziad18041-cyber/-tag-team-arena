/* TAG TEAM — audience screen: cinematic director driven by shared state */
(function () {
  'use strict';
  var TT, P, $ = function (id) { return document.getElementById(id); };
  var S = null, lastEvN = null, figs = [], overShown = false, lastCritSec = null, started = false;
  var shotTimer = 0, lastShot = '', sceneBusy = 0, timers = [], loops = [];
  var COLORS = ['#2f8dff', '#ffc928'], TEAM = ['الأزرق', 'الأصفر'];
  var parts = [], pctx, crowdCtx, crowdLayers = [], cheer = 0.2;

  /* ---------------- layout ---------------- */
  var SLOTS = [
    { active: 340, bench: [110, 590] },
    { active: 1580, bench: [1810, 1330] }
  ];
  function fit() {
    var st = $('stage'), s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    st.style.transform = 'scale(' + s + ') translate(-960px,-540px)';
  }

  function buildFigs() {
    var box = $('figs');
    P.forEach(function (p, i) {
      var f = document.createElement('div'); f.className = 'fig p-idle';
      var b = document.createElement('div'); b.className = 'body';
      var im = document.createElement('img'); im.src = p.img; im.alt = p.name; im.decoding = 'async';
      var pl = document.createElement('div'); pl.className = 'plate'; pl.textContent = p.name;
      b.appendChild(im); f.appendChild(b); f.appendChild(pl); box.appendChild(f); figs[i] = f;
    });
    [0, 1].forEach(function (k) {
      var wrap = $('roster' + k).querySelector('.r-faces');
      P.forEach(function (p, i) {
        var d = document.createElement('div'); d.className = 'r-face'; d.dataset.i = i;
        var im = document.createElement('img'); im.src = p.face; im.alt = '';
        var b = document.createElement('b'); b.textContent = p.name;
        d.appendChild(im); d.appendChild(b); wrap.appendChild(d);
      });
    });
  }

  function off() { return S ? TTSync.offset(S.clk) : 0; }
  function rnd() { return String((S && S.round) || 1).padStart(2, '0'); }
  function rem(k) { return S ? TT.remaining(S, k, Date.now(), off()) : TT.DUR; }
  function isOver() { return S && (S.phase === 'over' || (S.phase === 'live' && rem(S.turn) <= 0)); }
  function winner() { if (!S) return null; if (S.phase === 'over') return S.winner; if (S.phase === 'live' && rem(S.turn) <= 0) return 1 - S.turn; return null; }

  function layout() {
    if (!S) return;
    var w = winner(), live = S.phase === 'live' || S.phase === 'paused';
    [0, 1].forEach(function (k) {
      var team = S.teams[k], act = S.active[k], bench = team.filter(function (i) { return i !== act; });
      var dom = live && S.turn !== k, under = live && S.turn === k;
      var place = function (i, x, size, z, isAct) {
        var f = figs[i];
        f.classList.toggle('side0', k === 0); f.classList.toggle('side1', k === 1);
        f.classList.toggle('active', isAct); f.classList.toggle('bench', !isAct);
        f.classList.toggle('dom', isAct && dom && w == null); f.classList.toggle('under', isAct && under && w == null);
        f.classList.toggle('lost', w != null && w !== k);
        f.style.setProperty('--x', x + 'px'); f.style.setProperty('--w', size + 'px'); f.style.setProperty('--h', size + 'px');
        f.style.setProperty('--z', z); f.style.display = '';
        var sc = 1; if (isAct && dom && w == null) sc = 1.08; if (isAct && under && w == null) sc = 0.95;
        f.style.setProperty('--s', sc);
      };
      if (w === k) {
        // winners take the centre
        var xs = k === 0 ? [600, 960, 1320] : [600, 960, 1320];
        var order = [bench[0], act, bench[1]].filter(function (x) { return x != null; });
        order.forEach(function (i, j) { place(i, order.length === 3 ? xs[j] : (order.length === 2 ? [760, 1160][j] : 960), i === act ? 700 : 600, i === act ? 8 : 7, true); figs[i].classList.add('dom'); });
      } else if (w != null) {
        var ex = k === 0 ? [140, 330, 520] : [1780, 1590, 1400];
        team.forEach(function (i, j) { place(i, ex[j], 420, 3, false); });
      } else {
        var dx = (dom ? (k === 0 ? 40 : -40) : 0);
        place(act, SLOTS[k].active + dx, 660, 6, true);
        bench.forEach(function (i, j) { place(i, SLOTS[k].bench[j % 2], 500, 4, false); });
      }
      P.forEach(function (_, i) { if (S.teams[0].indexOf(i) < 0 && S.teams[1].indexOf(i) < 0) figs[i].style.display = 'none'; });
    });
    $('vs').style.opacity = w != null ? '0' : '1';
    // team light dominance
    var g0 = $('stage').querySelector('.g0'), g1 = $('stage').querySelector('.g1');
    var o0 = .25, o1 = .25;
    if (w != null) { o0 = w === 0 ? .75 : .02; o1 = w === 1 ? .75 : .02; }
    else if (S.phase === 'live' || S.phase === 'paused') { o0 = S.turn === 1 ? .6 : .06; o1 = S.turn === 0 ? .6 : .06; }
    g0.style.opacity = o0; g1.style.opacity = o1;
  }

  function renderStatic() {
    if (!S) return;
    var st = $('stage');
    st.classList.remove('phase-ready', 'phase-live', 'phase-paused', 'phase-over');
    st.classList.add('phase-' + (isOver() ? 'over' : S.phase));
    var q = S.q || '';
    $('qtext').textContent = q; $('qtext').classList.toggle('long', q.length > 42);
    $('roundTag').textContent = 'ROUND ' + rnd();
    var used = Array.isArray(S.used) ? S.used.length : S.qi + 1;
    $('qnum').textContent = 'السؤال ' + String(used).padStart(2, '0') + ' من ' + S.qn;
    var qc = $('qcat'); qc.textContent = S.qc ? S.qc + (S.qd ? ' • ' + S.qd : '') : ''; qc.className = 'qcat' + (S.qd ? ' d-' + S.qd : '');
    [0, 1].forEach(function (k) {
      var faces = $('roster' + k).querySelectorAll('.r-face');
      faces.forEach(function (d) { var i = +d.dataset.i; d.style.display = S.teams[k].indexOf(i) >= 0 ? '' : 'none'; d.classList.toggle('on', S.active[k] === i); });
    });
    layout();
    chip();
    if (window.SFX) SFX.setMuted(!!S.mute);
    if (window.TTMoves) TTMoves.apply(S);
  }

  function chip() {
    var c = $('chip'), w = winner(); c.classList.remove('c0', 'c1');
    if (!S) return;
    if (w != null) { c.textContent = '🏆 الفوز للفريق ' + TEAM[w]; c.classList.add('c' + w); }
    else if (S.phase === 'over') c.textContent = 'تعادل — انتهت الأسئلة';
    else if (S.phase === 'ready') c.textContent = 'استعداد — يبدأ الفريق ' + TEAM[S.starter];
    else if (S.phase === 'paused') c.textContent = 'إيقاف مؤقت';
    else { c.textContent = 'الدور على ' + TEAM[S.turn] + ' • ' + TEAM[1 - S.turn] + ' يسيطر'; c.classList.add('c' + S.turn); }
  }

  /* ---------------- poses & camera ---------------- */
  var POSES = ['p-idle', 'p-flex', 'p-taunt0', 'p-taunt1', 'p-hype', 'p-pump', 'p-sway', 'p-shiver', 'p-sweat', 'p-enter', 'p-cele'];
  function pose(i, p) { var f = figs[i]; POSES.forEach(function (c) { f.classList.remove(c); }); void f.offsetWidth; f.classList.add(p); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function cyclePoses() {
    if (!S) return;
    var w = winner();
    [0, 1].forEach(function (k) {
      var act = S.active[k];
      S.teams[k].forEach(function (i) {
        if (w != null) { pose(i, w === k ? pick(['p-cele', 'p-hype', 'p-pump']) : 'p-idle'); return; }
        if (S.phase !== 'live' && S.phase !== 'paused') { pose(i, pick(['p-idle', 'p-sway', 'p-idle'])); return; }
        var dom = S.turn !== k;
        if (i === act) pose(i, dom ? pick(['p-flex', 'p-taunt' + k, 'p-hype', 'p-pump', 'p-flex']) : (rem(k) < 30000 ? 'p-shiver' : pick(['p-sweat', 'p-idle', 'p-sweat'])));
        else pose(i, dom ? pick(['p-pump', 'p-sway', 'p-flex']) : pick(['p-idle', 'p-sway']));
      });
    });
  }
  function camTo(px, py, s, rot) {
    var cx = 960, cy = 470, tx = cx - s * px, ty = cy - s * py;
    tx = Math.min(0, Math.max(1920 - s * 1920, tx)); ty = Math.min(0, Math.max(1080 - s * 1080, ty));
    $('cam').style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')' + (rot ? ' rotate(' + rot + 'deg)' : '');
  }
  function figX(i) { return parseFloat(figs[i].style.getPropertyValue('--x')) || 960; }
  function shot(name) {
    lastShot = name;
    var a0 = S ? S.active[0] : 0, a1 = S ? S.active[1] : 3, dom = S ? 1 - S.turn : 0, und = S ? S.turn : 1;
    var tk = S ? S.turn : 0, tAct = S ? S.active[tk] : 0;
    var tBench = S ? S.teams[tk].filter(function (i) { return i !== tAct; }) : [];
    var half = tk === 0 ? 480 : 1440;
    switch (name) {
      case 'wide': camTo(960, 470, 1); break;
      case 'two': camTo(960, 300, 1.12); break;
      case 'push': camTo(960, 470, 1.06); break;
      case 'turnClose': camTo(figX(tAct), 150, 1.32); break;
      case 'turnTight': camTo(figX(tAct), 150, 1.45, tk === 0 ? 1.2 : -1.2); break;
      case 'turnHalf': camTo(half, 150, 1.14); break;
      case 'turnDutch': camTo(figX(tAct) * .7 + half * .3, 150, 1.22, tk === 0 ? -2.5 : 2.5); break;
      case 'turnBench': camTo(tBench.length ? (figX(tBench[0]) + figX(tAct)) / 2 : figX(tAct), 150, 1.24); break;
      case 'turnPush': camTo(half * .6 + 960 * .4, 300, 1.08); break;
      case 'blueClose': camTo(figX(a0), 150, 1.3); break;
      case 'yellowClose': camTo(figX(a1), 150, 1.3); break;
      case 'win': camTo(960, 150, 1.06); break;
    }
  }
  function nextShot() {
    if (!S) return;
    var list;
    if (winner() != null) list = ['win', 'two', 'push'];
    else if (S.phase === 'ready') list = ['wide', 'two', 'blueClose', 'yellowClose', 'wide'];
    else if (S.phase === 'paused') return;
    else if (rem(S.turn) <= 10000) list = ['turnTight', 'turnClose', 'turnDutch', 'turnTight'];
    else list = ['turnClose', 'turnHalf', 'turnBench', 'turnDutch', 'turnPush', 'turnTight', 'turnClose'];
    var n = pick(list), guard = 0; while (n === lastShot && guard++ < 5) n = pick(list);
    shot(n);
  }

  /* ---------------- particles ---------------- */
  function emit(n, f) { for (var i = 0; i < n; i++) parts.push(f(i)); }
  function confetti(n, colors) {
    emit(n, function () { return { t: 'conf', x: Math.random() * 1920, y: -20 - Math.random() * 300, vx: (Math.random() - .5) * 4, vy: 3 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - .5) * .3, s: 10 + Math.random() * 10, c: pick(colors), life: 0, max: 260 }; });
  }
  function sparks(x, y, n, colors, spread) {
    emit(n, function () { var a = -Math.PI / 2 + (Math.random() - .5) * (spread || .8), v = 12 + Math.random() * 16; return { t: 'spark', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: pick(colors), life: 0, max: 50 + Math.random() * 30 }; });
  }
  function smoke(n, color, y0) {
    emit(n, function () { return { t: 'smoke', x: Math.random() * 1920, y: (y0 || 1100) + Math.random() * 100, vx: (Math.random() - .5) * 1.2, vy: -1 - Math.random() * 2.2, s: 80 + Math.random() * 120, c: color, life: 0, max: 140 + Math.random() * 80 }; });
  }
  function dust(x, n) {
    emit(n, function () { var a = Math.PI + Math.random() * Math.PI, v = 4 + Math.random() * 10; return { t: 'smoke', x: x + (Math.random() - .5) * 300, y: 760, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .4, s: 40 + Math.random() * 60, c: '180,150,110', life: 0, max: 70 }; });
  }
  function streaks(n, color) {
    emit(n, function () { var dir = Math.random() < .5 ? 1 : -1; return { t: 'streak', x: dir > 0 ? -300 : 2220, y: 150 + Math.random() * 800, vx: dir * (40 + Math.random() * 40), vy: 0, len: 200 + Math.random() * 400, c: color, life: 0, max: 70 }; });
  }
  function bolt(x, color) {
    var pts = [[x, -10]], y = -10, cx = x;
    while (y < 760) { y += 40 + Math.random() * 60; cx += (Math.random() - .5) * 120; pts.push([cx, y]); }
    parts.push({ t: 'bolt', pts: pts, c: color, life: 0, max: 14 });
  }
  function sweat(x, y) { parts.push({ t: 'drop', x: x + (Math.random() - .5) * 120, y: y, vx: (Math.random() - .5) * 2, vy: 1, life: 0, max: 60 }); }
  function drawParts() {
    var c = pctx; if (!c) return;
    c.clearRect(0, 0, 1920, 1080);
    if (!parts.length) return;
    var keep = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]; p.life++;
      if (p.life > p.max) continue; keep.push(p);
      var k = 1 - p.life / p.max;
      if (p.t === 'conf') { p.vy += .05; p.x += p.vx + Math.sin(p.life / 10) * 1.5; p.y += p.vy; p.r += p.vr; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.globalAlpha = Math.min(1, k * 3); c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); }
      else if (p.t === 'spark') { p.vy += .6; p.x += p.vx; p.y += p.vy; c.globalCompositeOperation = 'lighter'; c.strokeStyle = p.c; c.globalAlpha = k; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5); c.stroke(); c.globalCompositeOperation = 'source-over'; }
      else if (p.t === 'smoke') { p.x += p.vx; p.y += p.vy; p.s += .8; var g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s); g.addColorStop(0, 'rgba(' + p.c + ',' + (.35 * k) + ')'); g.addColorStop(1, 'rgba(' + p.c + ',0)'); c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.s, 0, 7); c.fill(); }
      else if (p.t === 'streak') { p.x += p.vx; c.globalCompositeOperation = 'lighter'; var gg = c.createLinearGradient(p.x, 0, p.x - Math.sign(p.vx) * p.len, 0); gg.addColorStop(0, p.c); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.strokeStyle = gg; c.globalAlpha = k; c.lineWidth = 5; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - Math.sign(p.vx) * p.len, p.y); c.stroke(); c.globalCompositeOperation = 'source-over'; }
      else if (p.t === 'bolt') { c.globalCompositeOperation = 'lighter'; c.strokeStyle = p.c; c.globalAlpha = p.life % 4 < 2 ? 1 : .3; c.lineWidth = 6; c.shadowColor = p.c; c.shadowBlur = 30; c.beginPath(); p.pts.forEach(function (q, j) { if (j) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); c.stroke(); c.shadowBlur = 0; c.globalCompositeOperation = 'source-over'; }
      else if (p.t === 'drop') { p.vy += .35; p.x += p.vx; p.y += p.vy; c.globalAlpha = k; c.fillStyle = '#cfe8ff'; c.beginPath(); c.ellipse(p.x, p.y, 4, 7, 0, 0, 7); c.fill(); }
    }
    c.globalAlpha = 1;
    parts = keep.length > 1500 ? keep.slice(-1500) : keep;
  }

  /* ---------------- crowd ---------------- */
  function buildCrowd() {
    var W = 960, H = 420;
    for (var L = 0; L < 3; L++) {
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var c = cv.getContext('2d');
      var rowY = [150, 230, 310][L], size = [9, 12, 16][L], shade = [40, 30, 18][L];
      for (var r = 0; r < 2; r++) {
        for (var x = -10; x < W + 10; x += size * 1.7 + Math.random() * 5) {
          var y = rowY + r * size * 2.2 + Math.random() * 6;
          c.fillStyle = 'rgb(' + (shade) + ',' + (shade + 10) + ',' + (shade + 35) + ')';
          c.beginPath(); c.arc(x, y, size * .62, 0, 7); c.fill();
          c.beginPath(); c.ellipse(x, y + size * 1.5, size * 1.05, size * 1.1, 0, Math.PI, 0); c.fill();
          c.fillRect(x - size * 1.05, y + size * 1.5, size * 2.1, H);
          if (Math.random() < .25) { c.fillStyle = 'rgba(140,170,230,.25)'; c.beginPath(); c.arc(x - size * .2, y - size * .2, size * .5, 0, 7); c.fill(); }
        }
      }
      crowdLayers.push(cv);
    }
  }
  var crowdFrame = 0;
  function drawCrowd(t) {
    if (!crowdCtx || (crowdFrame++ % 2)) return;
    var c = crowdCtx; c.clearRect(0, 0, 960, 420);
    var amp = 2 + cheer * 10;
    crowdLayers.forEach(function (L, i) { c.drawImage(L, 0, Math.sin(t / (260 - i * 40) + i) * amp * (i + 1) / 2); });
    // phone lights in team colours + camera flashes
    for (var i = 0; i < 26; i++) {
      var x = (i * 97 + 13) % 960, y = 170 + ((i * 53) % 200) + Math.sin(t / 400 + i) * 6;
      c.fillStyle = i % 2 ? 'rgba(80,160,255,.8)' : 'rgba(255,210,60,.8)'; c.beginPath(); c.arc(x, y, 1.8, 0, 7); c.fill();
    }
    var flashes = 1 + Math.floor(cheer * 6);
    for (var f = 0; f < flashes; f++) if (Math.random() < .25) {
      var fx = Math.random() * 960, fy = 150 + Math.random() * 230, g = c.createRadialGradient(fx, fy, 0, fx, fy, 14);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(fx, fy, 14, 0, 7); c.fill();
    }
  }

  /* ---------------- fx helpers ---------------- */
  function later(ms, f) { timers.push(setTimeout(f, ms)); }
  function stopLoops() { loops.forEach(clearInterval); loops = []; }
  function cancel() {
    timers.forEach(clearTimeout); timers = []; stopLoops();
    var st = $('stage'); st.classList.remove('letterbox', 'dark', 'shake', 'glitch');
    $('dim').style.opacity = 0; $('hero').className = 'hero'; $('big').className = 'big'; $('stripes').className = 'stripes';
  }
  function flash(color) { var f = $('flash'); f.style.setProperty('--fc', color || '#fff'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  function big(main, sub, color, latin) {
    var b = $('big'); $('bigMain').textContent = main; $('bigSub').textContent = sub || '';
    b.style.setProperty('--bc', color || '#2f8dff'); b.className = 'big' + (latin ? ' latin' : ''); void b.offsetWidth; b.classList.add('show');
  }
  function bigHide() { var b = $('big'); if (b.classList.contains('show')) { b.classList.remove('show'); b.classList.add('hide'); } }
  function cls(c, on) { $('stage').classList.toggle(c, on); }
  function pulse(c, ms) { cls(c, false); void $('stage').offsetWidth; cls(c, true); later(ms || 1000, function () { cls(c, false); }); }
  function dim(o) { $('dim').style.opacity = o; }
  function sfx(n, a) { if (window.SFX) SFX.play(n, a); }
  function setCheer(v, ms) { cheer = v; if (window.SFX) SFX.play('crowd', v * .25); if (ms) later(ms, function () { cheer = .25; if (window.SFX) SFX.play('crowd', S && S.phase === 'live' ? .05 : .03); }); }

  /* ---------------- scenes ---------------- */
  var THEMES = {
    taker: { col: '#9b6bff', inCls: 'in-rise' },
    ref: { col: '#ffffff', inCls: null },
    neon: { col: '#38ff8a', inCls: 'in-glitch' },
    pyro: { col: '#ff8a1c', inCls: 'in-zoom' },
    quake: { col: '#c9d6ff', inCls: 'in-drop' },
    skull: { col: '#d9dde6', inCls: 'in-zoom' }
  };
  var SC = {};
  SC.intro = function () {
    cls('letterbox', true); cls('dark', true); dim(.85); sfx('gong'); setCheer(.1);
    shot('wide');
    later(100, function () { big('TAG TEAM', '', '#7cc4ff', true); sfx('impact'); });
    later(900, function () { big('الاستنزاف', '', '#ffc928'); sfx('impact'); });
    later(1700, function () { big('ROUND ' + rnd(), 'يبدأ الفريق ' + TEAM[S.turn], COLORS[S.turn], true); sfx('impact'); sfx('bell'); });
    later(2600, function () {
      flash('#fff'); dim(0); cls('dark', false); bigHide(); setCheer(1, 2500); sfx('cheer', 2.5);
      sparks(200, 760, 60, ['#5aa6ff', '#fff'], 1); sparks(1720, 760, 60, ['#ffc928', '#fff'], 1);
      [0, 1].forEach(function (k) { S.teams[k].forEach(function (i, j) { later(j * 140, function () { pose(i, 'p-enter'); }); }); });
    });
    later(3500, function () { cls('letterbox', false); cyclePoses(); shot('turnClose'); });
    return 3600;
  };
  SC.tag = function (ev) {
    if (ev.f && !ev._pre) {
      cls('letterbox', true); flash('#ff2b2b'); sfx('buzzer'); dim(.6);
      big('⚠ تبديل إجباري', 'الفريق ' + TEAM[ev.s], '#ff3b3b');
      $('vig').style.opacity = .7;
      later(1300, function () { bigHide(); $('vig').style.opacity = 0; var e2 = {}; for (var x in ev) e2[x] = ev[x]; e2._pre = 1; SC.tag(e2); });
      return 1300 + 3700;
    }
    var k = ev.s, inI = ev.a, outI = ev.b, p = P[inI], th = THEMES[p.theme] || THEMES.ref, col = COLORS[k];
    var hero = $('hero');
    hero.className = 'hero s' + k; hero.style.setProperty('--c', p.theme === 'ref' ? col : th.col);
    $('heroImg').src = p.img; $('heroName').textContent = p.name;
    $('heroPlate').innerHTML = ''; $('heroPlate').appendChild(document.createTextNode(p.name));
    var sm = document.createElement('small'); sm.textContent = 'دخول — الفريق ' + TEAM[k]; $('heroPlate').appendChild(sm);
    $('heroOut').textContent = outI != null ? '↩ خروج ' + P[outI].name : '';
    $('heroOut').style.display = outI != null ? '' : 'none';
    cls('letterbox', true); dim(.72); setCheer(.6, 3000);
    var inCls = th.inCls || (k === 0 ? 'in-left' : 'in-right');
    function show() { void hero.offsetWidth; hero.classList.add('on', inCls); }
    switch (p.theme) {
      case 'taker':
        dim(.94); cls('dark', true); sfx('gong'); smoke(40, '120,90,200');
        later(250, function () { bolt(420 + Math.random() * 300, '#c9b3ff'); flash('#8a5cff'); sfx('thunder'); });
        later(700, show);
        later(1100, function () { bolt(1300 + Math.random() * 300, '#fff'); flash('#ffffff'); });
        later(1700, function () { bolt(900, '#b38cff'); flash('#6a3cff'); smoke(20, '120,90,200'); });
        break;
      case 'ref':
        $('stripes').className = 'stripes'; void $('stripes').offsetWidth; $('stripes').classList.add('go'); sfx('whistle');
        later(350, show); later(900, function () { flash('#fff'); });
        break;
      case 'neon':
        streaks(30, '#38ff8a'); sfx('glitch'); pulse('glitch', 1000); later(150, show);
        later(600, function () { streaks(25, '#7dffb4'); sfx('glitch'); flash('#38ff8a'); });
        break;
      case 'pyro':
        later(80, function () { flash('#ff8a1c'); sfx('impact'); });
        var spl = setInterval(function () { sparks(260, 1000, 14, ['#ffcf3d', '#ff5a1f', '#fff'], .5); sparks(1660, 1000, 14, ['#ffcf3d', '#ff5a1f', '#fff'], .5); }, 70);
        loops.push(spl); later(1700, function () { clearInterval(spl); });
        later(200, show);
        break;
      case 'quake':
        dim(.8); show();
        later(520, function () { sfx('impact'); pulse('shake', 1000); dust(960, 60); flash('#c9d6ff'); });
        later(1100, function () { sfx('impact'); dust(960, 30); });
        break;
      case 'skull':
        smoke(30, '200,205,220'); sfx('glitch'); pulse('glitch', 1000);
        later(200, function () { show(); sfx('impact'); });
        var fl = 0, fi = setInterval(function () { dim(fl++ % 2 ? .78 : .55); }, 120); loops.push(fi); later(1200, function () { clearInterval(fi); dim(.72); });
        break;
    }
    later(900, function () { sfx('cheer', 1.8); });
    later(2700, function () { hero.classList.remove('on'); dim(0); cls('dark', false); cls('letterbox', false); pose(inI, 'p-enter'); flash(col); });
    later(3700, function () { cyclePoses(); });
    shot(k === 0 ? 'blueClose' : 'yellowClose');
    return 3700;
  };
  SC.answer = function (ev) {
    var k = ev.s, col = COLORS[k], nk = 1 - k;
    flash(col); sfx('correct'); setCheer(.9, 1800);
    if (ev.b === 'q') SC.next();
    big('✓ إجابة صحيحة', P[S.active[k]].name, col);
    pose(S.active[k], 'p-hype');
    shot(k === 0 ? 'blueClose' : 'yellowClose');
    sparks(k === 0 ? 340 : 1580, 760, 50, [col, '#fff'], 1.2);
    later(1000, function () {
      bigHide(); var w = $('stripes'); w.className = 'stripes'; w.style.setProperty('--wc', col); void w.offsetWidth; w.classList.add('wipe'); if (k === 1) w.classList.add('rtl');
      sfx('whoosh');
    });
    later(1350, function () { big('الدور على ' + TEAM[nk], '', COLORS[nk]); shot('turnClose'); });
    later(2300, function () { bigHide(); cyclePoses(); });
    return 2400;
  };
  SC.pause = function () { sfx('whistle'); setCheer(.05); return 0; };
  SC.resume = function () { flash('#fff'); big('استئناف', '', '#fff'); sfx('bell'); later(800, bigHide); later(900, cyclePoses); return 900; };
  SC.next = function () {
    var q = $('qpanel'); q.classList.remove('flip'); void q.offsetWidth; q.classList.add('flip'); sfx('whoosh');
    later(1000, function () { q.classList.remove('flip'); });
    return 0;
  };
  SC.undo = function () { big('↶ تصحيح', '', '#ffffff'); sfx('rewind'); later(800, bigHide); later(900, cyclePoses); return 900; };
  SC.reset = function () {
    var w = $('stripes'); w.className = 'stripes'; w.style.setProperty('--wc', '#ffffff'); void w.offsetWidth; w.classList.add('wipe', 'rtl');
    sfx('rewind'); big('إعادة الراوند', '', '#7cc4ff'); later(900, bigHide); later(950, function () { cyclePoses(); shot('wide'); }); overShown = false; return 1000;
  };
  SC.skip = function (ev) {
    var k = ev.s, col = COLORS[k];
    SC.next(); sfx('whoosh'); flash('#ff3b3b');
    big('⏭ سكيب', '−10 ثواني من الفريق ' + TEAM[k], col);
    pulse('shake', 600); shot('turnClose');
    var c = $('clock' + k); c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit');
    later(1100, bigHide); later(1200, cyclePoses);
    return 1200;
  };
  SC.bankout = function (ev) { return SC.finish(ev.a, 'انتهت الأسئلة!', 'الفوز للفريق صاحب الوقت الأكثر'); };
  SC.roster = function (ev) { flash(COLORS[ev.s]); later(50, cyclePoses); return 0; };
  SC.timeout = function (loser, why) {
    return SC.finish(1 - loser, 'انتهى الوقت!', why === 'skip' ? 'السكيب أنهى وقت الفريق ' + TEAM[loser] : 'نفد وقت الفريق ' + TEAM[loser]);
  };
  SC.finish = function (w, title, sub) {
    if (overShown) return 0;
    overShown = true;
    flash('#ff2b2b'); sfx('buzzer'); cls('letterbox', true);
    big(title, sub, '#ff3b3b');
    if (w == null) {
      later(1900, function () { bigHide(); $('vig').style.opacity = 0; big('تعادل!', 'نفس الوقت المتبقي للفريقين', '#ffffff'); sfx('bell'); setCheer(.8, 3000); });
      later(5500, function () { bigHide(); cls('letterbox', false); });
      return 5500;
    }
    var col = COLORS[w];
    $('vig').classList.remove('beat'); $('vig').style.opacity = .8;
    shot('wide');
    later(1900, function () {
      bigHide(); $('vig').style.opacity = 0; flash(col); layout(); shot('win');
      sfx('fanfare'); setCheer(1, 6000);
      big('🏆 الفريق ' + TEAM[w] + ' يفوز!', S.teams[w].map(function (i) { return P[i].name; }).join('  •  '), col);
      confetti(260, w === 0 ? ['#2f8dff', '#7cc4ff', '#ffffff', '#1d5fd0'] : ['#ffc928', '#ffe58a', '#ffffff', '#ff9d00']);
      S.teams[w].forEach(function (i, j) { later(j * 120, function () { pose(i, 'p-cele'); }); });
      var cl = setInterval(function () { confetti(40, w === 0 ? ['#2f8dff', '#7cc4ff', '#ffffff'] : ['#ffc928', '#ffe58a', '#ffffff']); sparks(Math.random() < .5 ? 250 : 1670, 760, 20, [col, '#fff'], .7); }, 900);
      loops.push(cl);
    });
    later(6500, function () { bigHide(); cls('letterbox', false); });
    return 6500;
  };

  function play(ev) {
    if (!ev || !ev.t) return;
    if (S && S.mode && S.mode !== 'quiz') return;
    if (ev.t === 'timeout') { if (!overShown) { cancel(); sceneBusy = Date.now() + SC.timeout(ev.s, ev.b); } return; }
    if (ev.t === 'bankout') { if (!overShown) { cancel(); sceneBusy = Date.now() + SC.bankout(ev); } return; }
    if (ev.t === 'next') { SC.next(); return; } // overlay-free, doesn't interrupt others
    if (ev.t === 'pause') { SC.pause(); return; }
    var f = SC[ev.t]; if (!f) return;
    cancel();
    sceneBusy = Date.now() + (f(ev) || 0);
  }

  /* ---------------- state in ---------------- */
  function onState(N, via) {
    var first = !S;
    var prev = S; S = N;
    if (S.phase !== 'over' && !(S.phase === 'live' && rem(S.turn) <= 0)) { if (overShown) { overShown = false; cancel(); } }
    renderStatic();
    var fresh = Math.abs(Date.now() - ((S.at || 0) + off())) < 6000;
    if (first || lastEvN == null || via === 'boot' || via === 'cache') { lastEvN = S.ev ? S.ev.n : 0; cyclePoses(); nextShot(); overShown = isOver(); return; }
    if (S.ev && S.ev.n !== lastEvN) {
      lastEvN = S.ev.n;
      if (fresh) play(S.ev); else { cancel(); cyclePoses(); overShown = isOver(); }
    }
    if (prev && prev.phase !== S.phase && S.phase !== 'paused') cyclePoses();
  }

  /* ---------------- frame loop ---------------- */
  var lastPoseAt = 0, lastSweat = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    drawCrowd(t); drawParts();
    if (!S) return;
    var now = Date.now();
    var w = winner();
    [0, 1].forEach(function (k) {
      var r = rem(k), on = S.phase === 'live' && S.turn === k && w == null;
      $('t' + k).textContent = TT.fmt(r, on);
      $('bar' + k).style.transform = 'scaleX(' + Math.max(0, r / S.dur) + ')';
      var c = $('clock' + k); c.classList.toggle('on', on || (S.phase === 'paused' && S.turn === k)); c.classList.toggle('crit', on && r <= 10000);
      var p = Math.min(1, Math.max(0, 1 - r / S.dur));
      $('pgs' + k).setAttribute('offset', p); $('pge' + k).setAttribute('offset', p);
      var col = 'rgb(' + Math.round(255) + ',' + Math.round(170 - 140 * p) + ',' + Math.round(60 - 40 * p) + ')';
      $('pgs' + k).setAttribute('stop-color', col); $('pgs' + k).previousElementSibling.setAttribute('stop-color', col);
      $('pge' + k).setAttribute('stop-color', 'rgb(' + Math.round(123 + 60 * p) + ',' + Math.round(132 - 40 * p) + ',' + Math.round(153 - 60 * p) + ')');
      $('pv' + k).textContent = Math.round(p * 100) + '%';
      $('press' + k).classList.toggle('hot', p > .6 && p <= .85); $('press' + k).classList.toggle('max', p > .85);
      figs[S.active[k]].style.setProperty('--p', p.toFixed(3));
    });
    // timeout detected locally (works even if the phone went to sleep)
    if (S.phase === 'live' && rem(S.turn) <= 0 && !overShown) { cancel(); renderStatic(); sceneBusy = now + SC.timeout(S.turn); }
    // critical countdown
    var vig = $('vig'), cd = $('count');
    if (S.phase === 'live' && w == null) {
      var r2 = rem(S.turn), sec = Math.ceil(r2 / 1000);
      cls('crit', r2 <= 10000);
      if (r2 <= 10000) {
        vig.classList.add('beat');
        if (sec !== lastCritSec) { lastCritSec = sec; cd.textContent = sec; cd.classList.remove('on'); void cd.offsetWidth; cd.classList.add('on'); sfx('tick', sec <= 3); sfx('heart'); }
      } else { vig.classList.remove('beat'); vig.style.opacity = r2 <= 30000 ? .3 : 0; cd.classList.remove('on'); lastCritSec = null; }
      if (now - lastSweat > (r2 < 30000 ? 160 : 600) && r2 < 60000) { lastSweat = now; var fx = figX(S.active[S.turn]); sweat(fx, 330); }
    } else if (w == null) { cls('crit', false); vig.classList.remove('beat'); vig.style.opacity = 0; cd.classList.remove('on'); lastCritSec = null; }
    else { cls('crit', false); cd.classList.remove('on'); vig.classList.remove('beat'); }
    // camera & poses rhythm (pause during scenes)
    if (now > sceneBusy) {
      var critical = S.phase === 'live' && rem(S.turn) <= 10000;
      var every = S.phase === 'ready' ? 6000 : (critical ? 2300 : 3800);
      if (now - shotTimer > every) { shotTimer = now; nextShot(); }
      if (now - lastPoseAt > (critical ? 2300 : 4200)) { lastPoseAt = now; if (S.phase !== 'paused') cyclePoses(); }
    } else { shotTimer = now; }
    chip();
  }

  function status(st) {
    var t = st.mode === 'claude' ? (st.connected ? 'متصل' : 'بانتظار الاتصال') : st.mode === 'mqtt' ? ((st.connected ? 'متصل' : 'جارٍ الاتصال') + ' • خوادم ' + (st.links || 0) + '/' + (st.linksTotal || 0) + (st.room ? ' • الغرفة ' + st.room : '')) : 'محلي';
    if (st.note) t += ' • ' + st.note;
    t += ' • نسخة ' + (window.TT_BUILD || '?');
    $('scrStatus').textContent = t; $('soStatus').textContent = t;
  }

  function start() {
    TT = window.TT; P = TT.PEOPLE;
    buildFigs(); buildCrowd();
    pctx = $('particles').getContext('2d'); crowdCtx = $('crowd').getContext('2d');
    fit(); window.addEventListener('resize', fit);
    // something to look at before any state arrives: question + names visible
    onState(TT.fresh({}), 'boot');
    S.v = 0; // lowest possible: any real state wins
    $('startShow').onclick = function () {
      if (window.SFX) { SFX.init(); SFX.setMuted(!!(S && S.mute)); SFX.play('crowd', .05); SFX.play('bell'); }
      var el = document.documentElement; try { (el.requestFullscreen || el.webkitRequestFullscreen).call(el); } catch (e) {}
      try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(function () {}); } catch (e) {}
      $('startOverlay').hidden = true;
    };
    $('roomGo').onclick = function () { var v = $('roomInput').value.trim(); if (v) { location.href = location.pathname + '?room=' + encodeURIComponent(v.toLowerCase()) + '#screen'; } };
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(function () {}); } catch (e) {} } });
    window.TTScreenOnState = onState;
    if (window.TTMoves) TTMoves.build();
    TTSync.init({ role: 'screen', onState: onState, onStatus: status });
    requestAnimationFrame(frame);
    window.TTScreen = { state: function () { return S; }, shot: function () { return lastShot; }, overShown: function () { return overShown; }, rem: rem };
  }
  window.TTScreenStart = start;
})();
