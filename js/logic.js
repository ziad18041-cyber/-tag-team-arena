/* TAG TEAM — round logic (pure state functions, shared by screen + control) */
(function () {
  'use strict';

  var PEOPLE = [
    { id: '3AdeIL',   name: '3AdeIL',   img: 'img/3AdeIL.webp',   face: 'img/3AdeIL_face.webp',   theme: 'taker' },
    { id: 'LLE',      name: 'LLE',      img: 'img/LLE.webp',      face: 'img/LLE_face.webp',      theme: 'ref' },
    { id: 'xSMA333',  name: 'xSMA333',  img: 'img/xSMA333.webp',  face: 'img/xSMA333_face.webp',  theme: 'neon' },
    { id: 'RAED',     name: 'RAED',     img: 'img/RAED.webp',     face: 'img/RAED_face.webp',     theme: 'pyro' },
    { id: 'BIG_SHOW', name: 'BIG SHOW', img: 'img/BIG_SHOW.webp', face: 'img/BIG_SHOW_face.webp', theme: 'quake' },
    { id: 'MEZO',     name: 'MEZO',     img: 'img/MEZO.webp',     face: 'img/MEZO_face.webp',     theme: 'skull' }
  ];
  var TEAM_NAMES = ['الأزرق', 'الأصفر'];
  var DUR = 120000;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function fresh(opts) {
    opts = opts || {};
    var teams = opts.teams || [[0, 1, 2], [3, 4, 5]];
    var dur = opts.dur || DUR;
    var bank = opts.bank || window.TT_DEFAULT_QUESTIONS || [];
    var S = {
      app: 'tagteam', ver: 1,
      v: (opts.v || 0) + 1, at: Date.now(), clk: opts.clk || '',
      rid: Math.random().toString(36).slice(2, 8),
      phase: 'ready',            // ready | live | paused | over
      turn: opts.starter || 0,   // team whose clock is running
      starter: opts.starter || 0,
      dur: dur,
      times: [dur, dur],
      stamp: Date.now(),
      teams: teams,
      active: [teams[0][0], teams[1][0]],
      winner: null,
      qi: 0, qn: bank.length, q: '', qc: '', qd: '', left: bank.length,
      used: [],                  // bank indices already shown (last = current)
      mute: !!opts.mute,
      round: opts.round || 1,
      auto: opts.auto !== false,
      mode: opts.mode || 'menu', mvN: 30,
      ev: { n: (opts.evn || 0) + 1, t: 'reset', s: null, a: null, b: null }
    };
    if (opts.used) S.used = opts.used.slice();
    if (!nextQ(S, bank)) { S.used = []; nextQ(S, bank); }
    return S;
  }

  function item(x) { return typeof x === 'string' ? { q: x, a: '', c: '', d: '' } : (x || { q: '', a: '', c: '', d: '' }); }
  function showQ(S, bank, i) {
    var it = item(bank[i]);
    S.qi = i; S.q = it.q; S.qc = it.c || ''; S.qd = it.d || ''; S.qn = bank.length;
    S.left = Math.max(0, bank.length - S.used.length);
  }
  // pick a random question that hasn't been asked yet; false when the bank is used up
  function nextQ(S, bank) {
    if (!bank || !bank.length) return false;
    if (!Array.isArray(S.used)) S.used = [];
    var seen = {}; S.used.forEach(function (i) { seen[i] = 1; });
    var free = []; for (var i = 0; i < bank.length; i++) if (!seen[i]) free.push(i);
    if (!free.length) { S.left = 0; return false; }
    var pick = free[Math.floor(Math.random() * free.length)];
    S.used.push(pick); showQ(S, bank, pick);
    return true;
  }
  // bank ran out: the round ends, the team with more time left wins (equal = draw)
  function bankOut(S, clk) {
    S.phase = 'over';
    S.winner = S.times[0] > S.times[1] ? 0 : S.times[1] > S.times[0] ? 1 : null;
    S.left = 0;
    return bump(S, clk, { t: 'bankout', s: null, a: S.winner, b: null });
  }

  // remaining ms for a side, given a local time and the sender clock offset
  function remaining(S, side, t, off) {
    if (S.phase === 'live' && S.turn === side) {
      return Math.max(0, S.times[side] - ((t == null ? Date.now() : t) - (off || 0) - S.stamp));
    }
    return S.times[side];
  }

  function bump(S, clk, ev) {
    S.v += 1; S.at = Date.now(); S.clk = clk;
    if (ev) { ev.n = (S.ev ? S.ev.n : 0) + 1; S.ev = ev; }
    return S;
  }

  // freeze running clock at time t (controller clock); detects timeout
  function settle(S, t) {
    t = t == null ? Date.now() : t;
    if (S.phase === 'live') {
      var r = remaining(S, S.turn, t, 0);
      S.times[S.turn] = r;
      S.stamp = t;
      if (r <= 0) {
        S.phase = 'over';
        S.winner = 1 - S.turn;
        return 'timeout';
      }
    } else {
      S.stamp = t;
    }
    return null;
  }

  function timeoutEvent(S) { return { t: 'timeout', s: S.turn, a: S.winner, b: null }; }

  var A = {};
  A.start = function (S, clk) {
    if (S.phase !== 'ready') return null;
    S = clone(S);
    S.phase = 'live'; S.turn = S.starter; S.stamp = Date.now();
    S.times = [S.dur, S.dur];
    return bump(S, clk, { t: 'intro', s: S.turn, a: null, b: null });
  };
  A.answer = function (S, clk, side, bank) {
    if (S.phase !== 'live' || S.turn !== side) return null;
    S = clone(S);
    if (settle(S) === 'timeout') return bump(S, clk, timeoutEvent(S));
    S.turn = 1 - side;
    var moved = null;
    if (S.auto !== false && bank && bank.length) { if (!nextQ(S, bank)) return bankOut(S, clk); moved = 'q'; }
    return bump(S, clk, { t: 'answer', s: side, a: S.active[side], b: moved });
  };
  A.skip = function (S, clk, side, bank) {
    if (S.phase !== 'live' || S.turn !== side) return null;
    S = clone(S);
    if (settle(S) === 'timeout') return bump(S, clk, timeoutEvent(S));
    S.times[side] = Math.max(0, S.times[side] - 10000);
    if (S.times[side] <= 0) { S.phase = 'over'; S.winner = 1 - side; return bump(S, clk, { t: 'timeout', s: side, a: S.winner, b: 'skip' }); }
    if (!nextQ(S, bank)) return bankOut(S, clk);
    return bump(S, clk, { t: 'skip', s: side, a: S.active[side], b: null });
  };
  A.pause = function (S, clk) {
    if (S.phase !== 'live') return null;
    S = clone(S);
    if (settle(S) === 'timeout') return bump(S, clk, timeoutEvent(S));
    S.phase = 'paused';
    return bump(S, clk, { t: 'pause', s: S.turn, a: null, b: null });
  };
  A.resume = function (S, clk) {
    if (S.phase !== 'paused') return null;
    S = clone(S);
    S.phase = 'live'; S.stamp = Date.now();
    return bump(S, clk, { t: 'resume', s: S.turn, a: null, b: null });
  };
  A.next = function (S, clk, bank) {
    if (!bank || !bank.length) return null;
    S = clone(S);
    if (settle(S) === 'timeout') return bump(S, clk, timeoutEvent(S));
    if (S.phase === 'over') return null;
    if (!nextQ(S, bank)) return S.phase === 'ready' ? null : bankOut(S, clk);
    return bump(S, clk, { t: 'next', s: null, a: S.qi, b: null });
  };
  A.prevQ = function (S, clk, bank) {
    if (!bank || !Array.isArray(S.used) || S.used.length < 2) return null;
    S = clone(S);
    if (settle(S) === 'timeout') return bump(S, clk, timeoutEvent(S));
    S.used.pop(); showQ(S, bank, S.used[S.used.length - 1]);
    return bump(S, clk, { t: 'next', s: null, a: S.qi, b: null });
  };
  A.clearUsed = function (S, clk, bank) {
    if (!bank || !bank.length) return null;
    S = clone(S); S.used = []; nextQ(S, bank);
    return bump(S, clk, { t: 'next', s: null, a: S.qi, b: null });
  };
  A.tag = function (S, clk, side, id, forced) {
    if (S.phase === 'over') return null;
    if (S.teams[side].indexOf(id) < 0 || S.active[side] === id) return null;
    S = clone(S);
    if (settle(S) === 'timeout') return bump(S, clk, timeoutEvent(S));
    var out = S.active[side];
    S.active[side] = id;
    return bump(S, clk, { t: 'tag', s: side, a: id, b: out, f: forced ? 1 : 0 });
  };
  A.reset = function (S, clk, bank) {
    var N = fresh({ teams: S.teams, dur: S.dur, starter: S.starter, bank: [], v: S.v, evn: S.ev ? S.ev.n : 0, clk: clk, mute: S.mute, round: S.round, auto: S.auto, mode: S.mode || 'quiz' });
    if (S.mv) N.mv = clone(S.mv);
    N.active = S.active.slice();
    // continue with the questions that haven't been asked yet
    if (bank && bank.length) {
      N.used = Array.isArray(S.used) ? S.used.slice() : [];
      if (!nextQ(N, bank)) { N.used = []; nextQ(N, bank); N.ev.b = 'bankreset'; }
    }
    return N;
  };
  A.setStarter = function (S, clk, side) {
    if (S.phase !== 'ready') return null;
    S = clone(S); S.starter = side; S.turn = side;
    return bump(S, clk, null);
  };
  A.setTeam = function (S, clk, id, side) {
    if (S.phase !== 'ready') return null;
    var other = 1 - side;
    if (S.teams[side].indexOf(id) >= 0) return null;
    if (S.teams[other].length <= 1) return null; // a team can't be empty
    S = clone(S);
    S.teams[other] = S.teams[other].filter(function (x) { return x !== id; });
    S.teams[side].push(id);
    S.teams[side].sort(function (a, b) { return a - b; });
    if (S.active[other] === id) S.active[other] = S.teams[other][0];
    if (S.teams[side].indexOf(S.active[side]) < 0) S.active[side] = S.teams[side][0];
    return bump(S, clk, { t: 'roster', s: side, a: id, b: null });
  };
  A.setDur = function (S, clk, ms) {
    if (S.phase !== 'ready') return null;
    ms = Math.max(30000, Math.min(600000, Math.round(ms / 1000) * 1000));
    if (ms === S.dur) return null;
    S = clone(S); S.dur = ms; S.times = [ms, ms];
    return bump(S, clk, null);
  };
  A.adjust = function (S, clk, side, delta) {
    if (S.phase === 'over') return null;
    S = clone(S);
    if (settle(S) === 'timeout') return bump(S, clk, timeoutEvent(S));
    S.times[side] = Math.max(1000, Math.min(600000, S.times[side] + delta));
    return bump(S, clk, null);
  };
  A.setActive = function (S, clk, side, id) {
    if (S.phase !== 'ready' || S.teams[side].indexOf(id) < 0 || S.active[side] === id) return null;
    S = clone(S); S.active[side] = id;
    return bump(S, clk, { t: 'roster', s: side, a: id, b: null });
  };
  A.setRound = function (S, clk, n) {
    if (S.phase !== 'ready' || n < 1 || n > 9 || n === S.round) return null;
    S = clone(S); S.round = n;
    return bump(S, clk, { t: 'roster', s: null, a: null, b: null });
  };
  A.setAuto = function (S, clk, on) { if ((S.auto !== false) === !!on) return null; S = clone(S); S.auto = !!on; return bump(S, clk, null); };
  // ---- top-level mode: menu | quiz | moves ----
  A.setMode = function (S, clk, mode) {
    if (['menu', 'quiz', 'moves'].indexOf(mode) < 0 || (S.mode || 'quiz') === mode) return null;
    S = clone(S);
    if (S.phase === 'live' && mode !== 'quiz') { settle(S); S.phase = 'paused'; }
    S.mode = mode;
    if (mode === 'moves') { S.mv = mvInit(S.mv, S.mvN || 30); if (S.mv) S.mv.play = false; }
    return bump(S, clk, { t: 'mode', s: null, a: mode, b: null });
  };
  function mvInit(mv, n) {
    if (mv && mv.set === 'fin1' && Array.isArray(mv.order) && mv.order.length === n) return mv;
    var o = []; for (var i = 0; i < n; i++) o.push(i);
    return { set: 'fin1', i: 0, order: o, play: false, started: false, rs: 0, t: {}, mk: 0 };
  }
  // ---- imitation challenge ----
  A.moves = function (S, clk, op, arg) {
    S = clone(S);
    var n = S.mvN || 30;
    S.mv = mvInit(S.mv, n);
    var mv = S.mv;
    switch (op) {
      case 'start': mv.started = true; mv.i = 0; mv.play = true; mv.rs++; break;
      case 'cover': mv.started = false; mv.play = true; mv.rs++; break;
      case 'next': case 'skip': if (mv.i >= n - 1) return null; mv.i++; mv.play = true; break;
      case 'prev': if (mv.i <= 0) return null; mv.i--; mv.play = true; break;
      case 'go': if (arg < 0 || arg >= n) return null; mv.i = arg; mv.play = true; break;
      case 'play': mv.play = true; break;
      case 'pause': mv.play = false; break;
      case 'toggle': mv.play = !mv.play; break;
      case 'replay': mv.rs++; mv.play = true; break;
      case 'shuffle':
        for (var i = mv.order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = mv.order[i]; mv.order[i] = mv.order[j]; mv.order[j] = x; }
        mv.i = 0; mv.play = true; mv.rs++; break;
      case 'unshuffle': mv.order = mv.order.slice().sort(function (a, b) { return a - b; }); mv.i = 0; mv.rs++; break;
      case 'mark': mv.mk = (mv.mk || 0) + 1; mv.mkw = arg; break;            // ask the screen to stamp start/end at its current time
      case 'times': mv.t[arg.id] = [arg.s, arg.e]; break;                   // screen writes the stamped times
      case 'cleartimes': delete mv.t[arg]; break;
      default: return null;
    }
    return bump(S, clk, { t: 'mv', s: null, a: op, b: null });
  };
  A.mute = function (S, clk, m) { S = clone(S); S.mute = !!m; return bump(S, clk, null); };
  A.bank = function (S, clk, bank) {
    if (!bank || !bank.length) return null;
    S = clone(S); S.used = []; nextQ(S, bank);
    return bump(S, clk, { t: 'next', s: null, a: S.qi, b: null });
  };
  // Undo: restore an earlier snapshot, but keep the clock honest:
  // the time that passed since then is charged to whoever was on the clock then.
  A.undo = function (cur, clk, prev) {
    if (!prev) return null;
    var S = clone(prev);
    var t = Date.now();
    if (S.phase === 'live') {
      var r = Math.max(0, S.times[S.turn] - (t - S.stamp));
      S.times[S.turn] = r; S.stamp = t;
      if (r <= 0) { S.phase = 'over'; S.winner = 1 - S.turn; }
    } else { S.stamp = t; }
    S.v = cur.v; S.ev = cur.ev;
    return bump(S, clk, { t: 'undo', s: S.turn, a: null, b: null });
  };

  function fmt(ms, tenths) {
    if (tenths && ms < 10000) {
      var d = Math.ceil(ms / 100) / 10; // 9.4
      if (ms <= 0) return '00.0';
      return (d < 10 ? '0' : '') + d.toFixed(1);
    }
    var n = Math.ceil(ms / 1000);
    return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  }

  function valid(S) {
    return S && typeof S === 'object' && S.app === 'tagteam' && Array.isArray(S.times) && S.times.length === 2 &&
      Array.isArray(S.teams) && Array.isArray(S.active) && typeof S.v === 'number' &&
      ['ready', 'live', 'paused', 'over'].indexOf(S.phase) >= 0 &&
      S.active.every(function (i) { return i >= 0 && i < PEOPLE.length; });
  }

  window.TT = {
    PEOPLE: PEOPLE, TEAM_NAMES: TEAM_NAMES, DUR: DUR,
    fresh: fresh, item: item, remaining: remaining, settle: settle, actions: A, fmt: fmt, valid: valid, clone: clone
  };
})();
