/* TAG TEAM — director's control panel (mobile-first) */
(function () {
  'use strict';
  var TT, P, A, $ = function (id) { return document.getElementById(id); };
  var S = null, hist = [], bank = null, me = '', lastAnswerTap = 0, resetArm = 0, adopted = false, toastT = 0, wake = null;
  var TEAM = ['الأزرق', 'الأصفر'];

  function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms || 12); } catch (e) {} }
  function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, 2200); }
  function off() { return S ? TTSync.offset(S.clk) : 0; }
  function rem(k) { return TT.remaining(S, k, Date.now(), off()); }

  // keep stamps in this device's clock before acting on another device's state
  function own(N) {
    var o = TTSync.offset(N.clk);
    if (o) { N = TT.clone(N); N.stamp += o; }
    return N;
  }

  function act(name) {
    var args = Array.prototype.slice.call(arguments, 1);
    var base = own(S);
    var N = A[name].apply(null, [base, me].concat(args));
    if (!N) { buzz([30, 40, 30]); render(); return false; }
    hist.push(S); if (hist.length > 40) hist.shift();
    S = N; TTSync.publish(S); buzz(); render();
    return true;
  }

  /* ---------- build ---------- */
  function buildFaces() {
    [0, 1].forEach(function (k) {
      var box = $('tag' + k); box.innerHTML = '';
      S.teams[k].forEach(function (i) {
        var b = document.createElement('button'); b.className = 'cp-face'; b.dataset.i = i; b.type = 'button';
        var im = document.createElement('img'); im.src = P[i].face; im.alt = '';
        var sp = document.createElement('span'); sp.textContent = P[i].name;
        b.appendChild(im); b.appendChild(sp);
        b.addEventListener('click', function () {
          if (S.active[k] === i) return;
          if (act('tag', k, i)) toast('دخول ' + P[i].name + ' • خروج ' + P[hist[hist.length - 1].active[k]].name);
        });
        box.appendChild(b);
      });
    });
    var ts = $('teamset');
    if (!ts.children.length) P.forEach(function (p, i) {
      var row = document.createElement('div'); row.className = 'pr'; row.dataset.i = i;
      var im = document.createElement('img'); im.src = p.face; im.alt = '';
      var nm = document.createElement('b'); nm.textContent = p.name;
      var bb = document.createElement('button'); bb.type = 'button'; bb.className = 'tb'; bb.textContent = 'أزرق';
      var by = document.createElement('button'); by.type = 'button'; by.className = 'ty'; by.textContent = 'أصفر';
      var st = document.createElement('button'); st.type = 'button'; st.className = 'st'; st.textContent = '⭐ يبدأ';
      bb.addEventListener('click', function () { if (S.teams[0].indexOf(i) < 0 && !act('setTeam', i, 0)) toast('لا يمكن ترك فريق بلا لاعبين'); });
      by.addEventListener('click', function () { if (S.teams[1].indexOf(i) < 0 && !act('setTeam', i, 1)) toast('لا يمكن ترك فريق بلا لاعبين'); });
      st.addEventListener('click', function () { var k = S.teams[0].indexOf(i) >= 0 ? 0 : 1; if (S.active[k] !== i && act('setActive', k, i)) toast(p.name + ' يبدأ للفريق ' + TEAM[k]); });
      row.appendChild(im); row.appendChild(nm); row.appendChild(bb); row.appendChild(by); row.appendChild(st); ts.appendChild(row);
    });
  }
  var teamsKey = '';

  /* ---------- render ---------- */
  function render() {
    if (!S) return;
    var key = JSON.stringify(S.teams);
    if (key !== teamsKey) { teamsKey = key; buildFaces(); }
    var live = S.phase === 'live', over = S.phase === 'over' || (live && rem(S.turn) <= 0);
    var w = S.phase === 'over' ? S.winner : (over ? 1 - S.turn : null);
    [0, 1].forEach(function (k) {
      var r = rem(k), on = (live || S.phase === 'paused') && S.turn === k && !over;
      $('ct' + k).textContent = TT.fmt(r, on && live);
      $('cc' + k).classList.toggle('on', on); $('cc' + k).classList.toggle('crit', on && r <= 10000);
      $('cn' + k).textContent = P[S.active[k]].name;
      $('ans' + k).disabled = !(live && S.turn === k && !over);
      $('skip' + k).disabled = !(live && S.turn === k && !over);
      $('force' + k).disabled = over || S.teams[k].length < 2;
      $('tag' + k).querySelectorAll('.cp-face').forEach(function (b) {
        var i = +b.dataset.i; b.classList.toggle('on', S.active[k] === i); b.disabled = S.active[k] === i || over;
      });
    });
    var ph = { ready: 'جاهز للبدء', live: 'الدور على ' + TEAM[S.turn], paused: 'متوقف مؤقتًا', over: '' }[S.phase];
    if (over) ph = '🏆 فاز ' + TEAM[w];
    $('cphase').textContent = ph;
    $('bStart').disabled = live && !over;
    $('bStart').textContent = S.phase === 'ready' ? '▶ بدء الراوند' : S.phase === 'paused' ? '▶ استئناف الراوند' : over ? '↻ راوند جديد' : '● جارٍ';
    $('bStart').classList.toggle('pulse', S.phase === 'paused');
    $('bPause').disabled = !(live || S.phase === 'paused') || over;
    $('bPause').textContent = S.phase === 'paused' ? '▶ استئناف' : '⏸ إيقاف مؤقت';
    $('bUndo').disabled = !hist.length;
    var arm = Date.now() < resetArm; $('bReset').classList.toggle('arm', arm); $('bReset').textContent = arm ? 'اضغط للتأكيد' : '⟲ إعادة الراوند';
    var b = bank || [], it = TT.item(b[S.qi]);
    var used = Array.isArray(S.used) ? S.used.length : 1, left = typeof S.left === 'number' ? S.left : Math.max(0, b.length - used);
    $('cqn').textContent = 'السؤال ' + used + ' من ' + b.length + (S.qc ? ' • ' + S.qc : '') + (S.qd ? ' • ' + S.qd : '');
    $('cq').textContent = S.q;
    $('cqA').textContent = it.q === S.q && it.a ? it.a : '—';
    $('cqLeft').textContent = over && left === 0 ? 'انتهت الأسئلة' : left === 0 ? '⚠ هذا آخر سؤال — بعده ينتهي الراوند' : 'متبقي ' + left + ' سؤال بعد هذا';
    $('cqLeft').classList.toggle('warn', left <= 5);
    $('bPrevQ').disabled = used < 2 || over;
    $('bNext').disabled = over;
    var ready = S.phase === 'ready';
    $('st0').classList.toggle('on', S.starter === 0); $('st1').classList.toggle('on', S.starter === 1);
    $('st0').disabled = $('st1').disabled = !ready;
    $('setup').hidden = !ready;
    $('teamset').querySelectorAll('.pr').forEach(function (row) {
      var i = +row.dataset.i, t = S.teams[0].indexOf(i) >= 0 ? 0 : 1;
      row.className = 'pr s' + t;
      row.querySelector('.tb').classList.toggle('on', t === 0); row.querySelector('.ty').classList.toggle('on', t === 1);
      row.querySelector('.st').classList.toggle('on', S.active[t] === i);
    });
    $('teamCount').textContent = '— الأزرق ' + S.teams[0].length + ' • الأصفر ' + S.teams[1].length;
    $('durVal').textContent = TT.fmt(S.dur);
    $('durSeg').querySelectorAll('button').forEach(function (bt) { bt.classList.toggle('on', +bt.dataset.d === S.dur); });
    $('roundSeg').querySelectorAll('button').forEach(function (bt) { bt.classList.toggle('on', +bt.dataset.r === (S.round || 1)); });
    $('auto1').classList.toggle('on', S.auto !== false); $('auto0').classList.toggle('on', S.auto === false);
    $('snd1').classList.toggle('on', !S.mute); $('snd0').classList.toggle('on', !!S.mute);
  }

  function status(st) {
    var c = $('conn'), t, cls;
    if (st.mode === 'claude') {
      cls = st.connected ? 'ok' : (st.dbOk ? 'warn' : 'bad');
      t = (st.connected ? 'متصل' : (st.dbOk ? 'متصل (بطيء)' : 'غير متصل')) + ' • شاشات: ' + (st.screens || 0);
    } else if (st.mode === 'mqtt') {
      cls = st.connected ? 'ok' : 'bad'; t = (st.connected ? 'متصل' : 'جارٍ الاتصال…') + ' • خوادم ' + (st.links || 0) + '/' + (st.linksTotal || 0) + ' • شاشات: ' + (st.screens || 0);
      $('roomRow').hidden = false; $('roomCode').textContent = st.room || '';
      var base = location.href.split('#')[0].split('?')[0], link = base + (st.room && st.room !== 'ziadtagteam' ? '?room=' + st.room : '') + '#screen';
      $('roomLinks').textContent = link;
      $('scrLink').hidden = false; $('scrLinkUrl').textContent = link; $('scrLink').classList.toggle('ok', (st.screens || 0) > 0);
      $('scrLinkState').textContent = (st.screens || 0) > 0 ? '✓ شاشة الجمهور متصلة' : 'افتح هذا الرابط على اللابتوب (شاشة الجمهور):';
    } else { cls = 'warn'; t = 'محلي فقط'; }
    if (st.note) t += ' • ' + st.note;
    c.className = 'cp-conn ' + cls; c.querySelector('span').textContent = t;
  }

  var upgraded = false;
  function onState(N, via) {
    if (!upgraded && !Array.isArray(N.used) && N.phase !== 'live' && N.phase !== 'paused') {
      upgraded = true; S = N; setTimeout(function () { act('reset', bank); }, 0); return;
    }
    if (via === 'cache' || !S) { S = N; adopted = true; render(); return; }
    if (N.clk !== me) hist = []; // another controller acted: our undo history no longer applies
    S = N; render();
  }

  function setBank(list, save) {
    list = list.map(function (x) {
      if (x && typeof x === 'object') return { q: String(x.q || '').trim(), a: String(x.a || '').trim(), c: String(x.c || '').trim(), d: String(x.d || '').trim() };
      var p = String(x).split('|').map(function (t) { return t.trim(); });
      return { q: p[0] || '', a: p[1] || '', c: p[2] || '', d: p[3] || '' };
    }).filter(function (x) { return x.q; }).slice(0, 500);
    if (!list.length) return false;
    bank = list; $('bankText').value = list.map(function (x) { return [x.q, x.a, x.c, x.d].join(' | '); }).join('\n'); $('bankInfo').textContent = list.length + ' سؤال';
    if (save) TTSync.saveBank(list);
    return true;
  }

  function wakeLock() {
    try { if (navigator.wakeLock && (!wake || wake.released)) navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {}); } catch (e) {}
  }

  function tick() {
    if (!S) return;
    if (S.phase === 'live' && rem(S.turn) <= 0) {
      // the round is decided — make it official
      var N = TT.clone(own(S)); var r = TT.settle(N);
      if (r === 'timeout') { N.v += 1; N.at = Date.now(); N.clk = me; N.ev = { n: S.ev.n + 1, t: 'timeout', s: N.turn, a: N.winner, b: null }; hist.push(S); S = N; TTSync.publish(S); buzz([80, 60, 80]); }
    }
    render();
  }

  function start() {
    TT = window.TT; P = TT.PEOPLE; A = TT.actions; me = TTSync.me;
    setBank(TTSync.localBank() || window.TT_DEFAULT_QUESTIONS.slice(), false);
    S = TT.fresh({ bank: bank, clk: me }); S.v = 0;
    buildFaces(); render();

    $('ans0').addEventListener('click', function () { var n = Date.now(); if (n - lastAnswerTap < 350) return; lastAnswerTap = n; act('answer', 0, bank); });
    $('ans1').addEventListener('click', function () { var n = Date.now(); if (n - lastAnswerTap < 350) return; lastAnswerTap = n; act('answer', 1, bank); });
    $('bStart').addEventListener('click', function () {
      wakeLock();
      var over = S.phase === 'over' || (S.phase === 'live' && rem(S.turn) <= 0);
      if (S.phase === 'paused') { act('resume'); return; }
      if (over) { if (act('reset', bank)) toast('راوند جديد — اضغط «بدء الراوند» لما تكون جاهز'); return; }
      if (S.v === 0) S = TT.fresh({ bank: bank, clk: me });
      if (S.mode && S.mode !== 'quiz') act('setMode', 'quiz');
      act('start');
    });
    $('bPause').addEventListener('click', function () { act(S.phase === 'paused' ? 'resume' : 'pause'); });
    $('bNext').addEventListener('click', function () { act('next', bank); });
    $('bPrevQ').addEventListener('click', function () { act('prevQ', bank); });
    [0, 1].forEach(function (k) {
      $('skip' + k).addEventListener('click', function () { var n = Date.now(); if (n - lastAnswerTap < 350) return; lastAnswerTap = n; if (act('skip', k, bank)) toast('سكيب ' + TEAM[k] + ' — خُصمت 10 ثواني'); });
      $('force' + k).addEventListener('click', function () {
        var bench = S.teams[k].filter(function (i) { return i !== S.active[k]; });
        if (!bench.length) return;
        var pick = bench[Math.floor(Math.random() * bench.length)];
        if (act('tag', k, pick, true)) toast('⚠ تبديل إجباري: دخل ' + P[pick].name);
      });
    });
    $('bUndo').addEventListener('click', function () {
      if (!hist.length) return;
      var prev = hist.pop(), N = A.undo(own(S), me, own(prev));
      if (N) { S = N; TTSync.publish(S); buzz(); toast('تم التراجع'); render(); }
    });
    $('bReset').addEventListener('click', function () {
      if (Date.now() < resetArm) { resetArm = 0; if (act('reset', bank)) toast(S.ev.b === 'bankreset' ? 'أعيد الراوند — الأسئلة خلصت فرجعت كلها من جديد' : 'أعيد الراوند بالأسئلة اللي ما انسألت (' + S.left + ')'); }
      else { resetArm = Date.now() + 3000; buzz(25); render(); setTimeout(render, 3100); }
    });
    $('st0').addEventListener('click', function () { act('setStarter', 0); });
    $('st1').addEventListener('click', function () { act('setStarter', 1); });
    $('durSeg').querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { act('setDur', +b.dataset.d); }); });
    $('durMinus').addEventListener('click', function () { act('setDur', S.dur - 30000); });
    $('durPlus').addEventListener('click', function () { act('setDur', S.dur + 30000); });
    $('roundSeg').querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { act('setRound', +b.dataset.r); }); });
    document.querySelectorAll('[data-a]').forEach(function (b) { b.addEventListener('click', function () { var a = b.dataset.a.split(','); if (act('adjust', +a[0], +a[1])) toast('تم تعديل الوقت'); }); });
    $('auto1').addEventListener('click', function () { act('setAuto', true); });
    $('auto0').addEventListener('click', function () { act('setAuto', false); });
    $('snd1').addEventListener('click', function () { act('mute', false); });
    $('snd0').addEventListener('click', function () { act('mute', true); });
    $('bankSave').addEventListener('click', function () { if (setBank($('bankText').value.split('\n'), true)) { act('bank', bank); toast('حُفظ بنك الأسئلة (' + bank.length + ')'); } else toast('البنك فارغ'); });
    $('bankShuffle').addEventListener('click', function () { if (act('clearUsed', bank)) toast('رجعت كل الأسئلة متاحة من جديد'); });
    $('bankDefault').addEventListener('click', function () { setBank(window.TT_DEFAULT_QUESTIONS.slice(), true); act('bank', bank); toast('أعيدت الأسئلة الافتراضية'); });
    
    $('scrLinkCopy').addEventListener('click', function () {
      var u = $('scrLinkUrl').textContent;
      try { navigator.clipboard.writeText(u).then(function () { toast('نُسخ الرابط'); }, function () { toast('انسخه يدويًا'); }); } catch (e) { toast('انسخه يدويًا'); }
    });
    $('wakeBtn').addEventListener('click', function () { wakeLock(); toast(navigator.wakeLock ? 'الشاشة ستبقى مضاءة' : 'المتصفح لا يدعم إبقاء الشاشة — عطّل القفل التلقائي'); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { wakeLock(); TTSync.heartbeat(); } });

    TTSync.init({ role: 'control', onState: onState, onStatus: status, getBank: function () { return bank; },
      onBank: function (list) { if (Array.isArray(list) && list.length && JSON.stringify(list) !== JSON.stringify(bank)) { setBank(list, false); try { localStorage.setItem('tt_bank_v2', JSON.stringify(list)); } catch (e) {} render(); } } });
    setInterval(tick, 100);
    window.TTControl = { state: function () { return S; }, hist: function () { return hist.length; }, bank: function () { return bank; }, act: act, toast: toast };
    if (window.TTControlMovesStart) window.TTControlMovesStart();
  }
  window.TTControlStart = start;
})();
