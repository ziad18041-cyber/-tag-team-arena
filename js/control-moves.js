/* TAG TEAM — control panel: mode tabs + MOVE IMITATION remote */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var CLIPS = (window.TT_MOVES || []).filter(function (m) { return !m.isExample; });

  function cur() { return window.TTControl && TTControl.state(); }
  function run(name, args) { return window.TTControl && TTControl.act.apply(null, [name].concat(args || [])); }

  function render() {
    var S = cur(); if (!S) return;
    var m = S.mode || 'quiz';
    $('modeTabs').querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.mode === m); });
    $('cpQuiz').hidden = m !== 'quiz';
    $('cpMoves').hidden = m !== 'moves';
    $('cpMenu').hidden = m !== 'menu';
    $('settings').hidden = m !== 'quiz';
    if (m !== 'moves') return;
    var mv = S.mv || { i: 0, started: false, play: false, order: [], t: {} };
    var c = mv.started ? CLIPS[mv.order[mv.i]] : null;
    $('cpmCount').textContent = mv.started ? String(mv.i + 1).padStart(2, '0') + ' / ' + String(CLIPS.length).padStart(2, '0') : 'مقطع المثال';
    $('cpmName').textContent = c ? c.wrestler : 'الغلاف + مقطع المثال';
    $('cpmMove').textContent = c ? c.moveName + (c.moveNameAr ? ' — ' + c.moveNameAr : '') : '';
    $('cpmStart').hidden = !!mv.started;
    $('cpmBr').textContent = Math.round((mv.br || 1.3) * 100) + '%';
    $('cpmFs').textContent = mv.fs ? '✕ إلغاء ملء الشاشة' : '⛶ ملء الشاشة على اللابتوب';
    $('cpmFs').classList.toggle('on', !!mv.fs);
    $('cpmToggle').textContent = mv.play ? '⏸ إيقاف' : '▶ تشغيل';
    document.querySelectorAll('#cpMoves [data-mv="prev"]').forEach(function (b) { b.disabled = !mv.started || mv.i <= 0; });
    document.querySelectorAll('#cpMoves [data-mv="next"],#cpMoves [data-mv="skip"]').forEach(function (b) { b.disabled = !mv.started || mv.i >= CLIPS.length - 1; });
    var t = c && mv.t && mv.t[c.id];
    $('cpmTimes').textContent = c ? (t ? 'البداية ' + t[0] + 'ث' + (t[1] ? ' • النهاية ' + t[1] + 'ث' : '') : 'يبدأ من أول المقطع') : 'ابدأ التحدي أولًا';
    var list = $('cpmList');
    if (!list.children.length) {
      CLIPS.forEach(function (cl, k) { var b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.textContent = cl.wrestler + ' — ' + cl.moveName; b.addEventListener('click', function () { var S2 = cur(); var pos = S2.mv ? S2.mv.order.indexOf(k) : k; if (!S2.mv || !S2.mv.started) run('moves', ['start']); run('moves', ['go', pos]); }); list.appendChild(b); });
    }
    list.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', !!c && +b.dataset.k === mv.order[mv.i]); });
  }

  function start() {
    if (!window.TTControl) return setTimeout(start, 50);
    $('modeTabs').querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { run('setMode', [b.dataset.mode]); render(); }); });
    document.querySelectorAll('#cpMoves [data-mv]').forEach(function (b) { b.addEventListener('click', function () { run('moves', [b.dataset.mv]); render(); }); });
    document.querySelectorAll('#cpMoves [data-br]').forEach(function (b) { b.addEventListener('click', function () { run('moves', ['bright', +b.dataset.br]); render(); }); });
    document.querySelectorAll('#cpMenu [data-go]').forEach(function (b) { b.addEventListener('click', function () { run('setMode', [b.dataset.go]); render(); }); });
    $('cpmStart').addEventListener('click', function () { run('moves', ['start']); render(); });
    document.querySelectorAll('#cpMoves [data-mark]').forEach(function (b) { b.addEventListener('click', function () { if (run('moves', ['mark', b.dataset.mark])) TTControl.toast(b.dataset.mark === 'start' ? 'تم تحديد البداية' : 'تم تحديد النهاية'); }); });
    $('cpmClear').addEventListener('click', function () { var S = cur(); var mv = S.mv; if (!mv || !mv.started) return; run('moves', ['cleartimes', CLIPS[mv.order[mv.i]].id]); render(); });
    setInterval(render, 300);
    render();
  }
  window.TTControlMovesStart = start;
})();
