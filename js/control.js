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
    var ts = $('teamset'); ts.innerHTML = '';
    P.forEach(function (p, i) {
      var b = document.createElement('button'); b.type = 'button'; b.dataset.i = i; b.textContent = p.name;
      b.addEventListener('click', function () { var side = S.teams[0].indexOf(i) >= 0 ? 1 : 0; if (!act('setTeam', i, side)) toast('لا يمكن ترك فريق بلا لاعبين، أو الراوند بدأ'); });
      ts.appendChild(b);
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
      $('tag' + k).querySelectorAll('.cp-face').forEach(function (b) {
        var i = +b.dataset.i; b.classList.toggle('on', S.active[k] === i); b.disabled = S.active[k] === i || over;
      });
    });
    var ph = { ready: 'جاهز للبدء', live: 'الدور على ' + TEAM[S.turn], paused: 'متوقف مؤقتًا', over: '' }[S.phase];
    if (over) ph = '🏆 فاز ' + TEAM[w];
    $('cphase').textContent = ph;
    $('bStart').disabled = S.phase !== 'ready';
    $('bStart').textContent = S.phase === 'ready' ? '▶ بدء الراوند' : '● جارٍ';
    $('bPause').disabled = !(live || S.phase === 'paused') || over;
    $('bPause').textContent = S.phase === 'paused' ? '▶ استئناف' : '⏸ إيقاف مؤقت';
    $('bUndo').disabled = !hist.length;
    var arm = Date.now() < resetArm; $('bReset').classList.toggle('arm', arm); $('bReset').textContent = arm ? 'اضغط للتأكيد' : '⟲ إعادة الراوند';
    var b = bank || [];
    $('cqn').textContent = 'السؤال ' + (S.qi + 1) + ' من ' + S.qn;
    $('cq').textContent = S.q;
    $('cqNext').textContent = b.length ? b[(S.qi + 1) % b.length] : '';
    $('bPrevQ').disabled = S.qi <= 0;
    var ready = S.phase === 'ready';
    $('st0').classList.toggle('on', S.starter === 0); $('st1').classList.toggle('on', S.starter === 1);
    $('st0').disabled = $('st1').disabled = !ready;
    $('teamset').querySelectorAll('button').forEach(function (bt) { var i = +bt.dataset.i, t = S.teams[0].indexOf(i) >= 0 ? 0 : 1; bt.className = 't' + t; bt.disabled = !ready; bt.title = TEAM[t]; });
    $('durSeg').querySelectorAll('button').forEach(function (bt) { bt.classList.toggle('on', +bt.dataset.d === S.dur); bt.disabled = !ready; });
    $('snd1').classList.toggle('on', !S.mute); $('snd0').classList.toggle('on', !!S.mute);
  }

  function status(st) {
    var c = $('conn'), t, cls;
    if (st.mode === 'claude') {
      cls = st.connected ? 'ok' : (st.dbOk ? 'warn' : 'bad');
      t = (st.connected ? 'متصل' : (st.dbOk ? 'متصل (بطيء)' : 'غير متصل')) + ' • شاشات: ' + (st.screens || 0);
    } else if (st.mode === 'mqtt') {
      cls = st.connected ? 'ok' : 'bad'; t = (st.connected ? 'متصل' : 'جارٍ الاتصال…') + ' • غرفة ' + (st.room || '-');
      $('roomRow').hidden = false; $('roomCode').textContent = st.room || '';
      var base = location.href.split('#')[0].split('?')[0];
      $('roomLinks').textContent = 'الجمهور: ' + base + '?room=' + st.room + '#screen';
    } else { cls = 'warn'; t = 'محلي فقط'; }
    if (st.note) t += ' • ' + st.note;
    c.className = 'cp-conn ' + cls; c.querySelector('span').textContent = t;
  }

  function onState(N, via) {
    if (via === 'cache' || !S) { S = N; adopted = true; render(); return; }
    if (N.clk !== me) hist = []; // another controller acted: our undo history no longer applies
    S = N; render();
  }

  function setBank(list, save) {
    list = list.map(function (s) { return String(s).trim(); }).filter(Boolean).slice(0, 500);
    if (!list.length) return false;
    bank = list; $('bankText').value = list.join('\n'); $('bankInfo').textContent = list.length + ' سؤال';
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

    $('ans0').addEventListener('click', function () { var n = Date.now(); if (n - lastAnswerTap < 350) return; lastAnswerTap = n; act('answer', 0); });
    $('ans1').addEventListener('click', function () { var n = Date.now(); if (n - lastAnswerTap < 350) return; lastAnswerTap = n; act('answer', 1); });
    $('bStart').addEventListener('click', function () { wakeLock(); if (S.v === 0) S = TT.fresh({ bank: bank, clk: me }); act('start'); });
    $('bPause').addEventListener('click', function () { act(S.phase === 'paused' ? 'resume' : 'pause'); });
    $('bNext').addEventListener('click', function () { act('next', bank); });
    $('bPrevQ').addEventListener('click', function () { act('setQuestion', bank, S.qi - 1); });
    $('bUndo').addEventListener('click', function () {
      if (!hist.length) return;
      var prev = hist.pop(), N = A.undo(own(S), me, own(prev));
      if (N) { S = N; TTSync.publish(S); buzz(); toast('تم التراجع'); render(); }
    });
    $('bReset').addEventListener('click', function () {
      if (Date.now() < resetArm) { resetArm = 0; act('reset', bank); toast('أعيد الراوند'); }
      else { resetArm = Date.now() + 3000; buzz(25); render(); setTimeout(render, 3100); }
    });
    $('st0').addEventListener('click', function () { act('setStarter', 0); });
    $('st1').addEventListener('click', function () { act('setStarter', 1); });
    $('durSeg').querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { act('setDur', +b.dataset.d); }); });
    document.querySelectorAll('[data-a]').forEach(function (b) { b.addEventListener('click', function () { var a = b.dataset.a.split(','); if (act('adjust', +a[0], +a[1])) toast('تم تعديل الوقت'); }); });
    $('snd1').addEventListener('click', function () { act('mute', false); });
    $('snd0').addEventListener('click', function () { act('mute', true); });
    $('bankSave').addEventListener('click', function () { if (setBank($('bankText').value.split('\n'), true)) { act('bank', bank); toast('حُفظ بنك الأسئلة (' + bank.length + ')'); } else toast('البنك فارغ'); });
    $('bankShuffle').addEventListener('click', function () {
      var cur = S.q, b = bank.slice(); for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t; }
      var ci = b.indexOf(cur); if (ci > 0) { b.splice(ci, 1); b.unshift(cur); }
      setBank(b, true); S = TT.clone(S); S.qi = 0; act('bank', bank); toast('تم خلط الترتيب — السؤال الحالي أولًا');
    });
    $('bankDefault').addEventListener('click', function () { setBank(window.TT_DEFAULT_QUESTIONS.slice(), true); act('bank', bank); toast('أعيدت الأسئلة الافتراضية'); });
    $('switchRole').addEventListener('click', function () { try { localStorage.removeItem('tt_role'); } catch (e) {} try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} location.reload(); });
    $('wakeBtn').addEventListener('click', function () { wakeLock(); toast(navigator.wakeLock ? 'الشاشة ستبقى مضاءة' : 'المتصفح لا يدعم إبقاء الشاشة — عطّل القفل التلقائي'); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { wakeLock(); TTSync.heartbeat(); } });

    TTSync.init({ role: 'control', onState: onState, onStatus: status, getBank: function () { return bank; },
      onBank: function (list) { if (Array.isArray(list) && list.length && JSON.stringify(list) !== JSON.stringify(bank)) { setBank(list, false); try { localStorage.setItem('tt_bank_v1', JSON.stringify(list)); } catch (e) {} render(); } } });
    setInterval(tick, 100);
    window.TTControl = { state: function () { return S; }, hist: function () { return hist.length; }, bank: function () { return bank; } };
  }
  window.TTControlStart = start;
})();
