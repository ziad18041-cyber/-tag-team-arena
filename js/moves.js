/* TAG TEAM — audience side of the main menu + MOVE IMITATION challenge (YouTube IFrame Player API) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var MOVES = window.TT_MOVES || [], EX = null, CLIPS = [];
  var S = null, player = null, ytReady = false, ytLoading = false, loadedKey = '', lastMk = null, errT = 0, ytTimeout = 0, mode = '';

  function split() { EX = MOVES.filter(function (m) { return m.isExample; })[0] || null; CLIPS = MOVES.filter(function (m) { return !m.isExample; }); }
  split();
  // the JSON file is the editable source; the bundled copy is the fallback
  try {
    fetch('TAG_TEAM_MOVES.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (Array.isArray(j) && j.length) { MOVES = j; split(); loadedKey = ''; if (S) apply(S); }
    }).catch(function () {});
  } catch (e) {}

  function act(op, arg) {
    if (!S) return;
    var N = window.TT.actions.moves(S, window.TTSync.me, op, arg);
    if (!N) return;
    window.TTSync.publish(N); if (window.TTScreenOnState) window.TTScreenOnState(N, 'self');
  }
  function setMode(m) {
    if (!S) return;
    var N = window.TT.actions.setMode(S, window.TTSync.me, m);
    if (!N) return;
    window.TTSync.publish(N); if (window.TTScreenOnState) window.TTScreenOnState(N, 'self');
  }

  function clip() {
    var mv = S && S.mv; if (!mv) return EX;
    if (!mv.started) return EX;
    var idx = mv.order[mv.i]; return CLIPS[idx] || null;
  }
  function times(c) {
    var t = S.mv && S.mv.t && S.mv.t[c.id];
    var s = t ? t[0] : (c.startSeconds || 0), e = t ? t[1] : c.endSeconds;
    return { s: s || 0, e: e && e > (s || 0) ? e : null };
  }

  /* ---------- YouTube ---------- */
  function loadYT() {
    if (ytReady || ytLoading) return;
    ytLoading = true;
    window.onYouTubeIframeAPIReady = function () {
      ytReady = true; clearTimeout(ytTimeout);
      player = new YT.Player('ytPlayer', {
        width: '100%', height: '100%',
        playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1, playsinline: 1, fs: 0, iv_load_policy: 3 },
        events: { onReady: function () { loadedKey = ''; if (S) apply(S); }, onStateChange: onYTState, onError: onYTError }
      });
    };
    var sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; sc.async = true;
    sc.onerror = noYT; document.head.appendChild(sc);
    ytTimeout = setTimeout(function () { if (!ytReady) noYT(); }, 9000);
  }
  function noYT() {
    msg('تعذّر تحميل مشغل يوتيوب هنا. هذا التحدي يعمل من رابط GitHub Pages للمشروع.');
  }
  function msg(t) { var m = $('mvMsg'); m.textContent = t || ''; m.hidden = !t; }
  function onYTState(e) {
    if (e.data === 1) msg('');
    if (e.data === 0 && S && S.mode === 'moves' && S.mv && S.mv.play) {
      // loop the segment so the participant can keep imitating it
      var c = clip(); if (!c) return; var t = times(c);
      try { player.seekTo(t.s, true); player.playVideo(); } catch (x) {}
    }
  }
  function onYTError(e) {
    var c = clip();
    msg('تعذّر تشغيل هذا المقطع' + (c ? ' (' + c.wrestler + ')' : '') + ' — التخطي تلقائيًا…');
    clearTimeout(errT);
    if (S && S.mv && S.mv.started) errT = setTimeout(function () { msg(''); act('skip'); }, 2500);
  }
  function stopVideo() { try { if (player && player.stopVideo) player.stopVideo(); } catch (e) {} loadedKey = ''; }

  /* ---------- render ---------- */
  function apply(N) {
    S = N;
    var m = S.mode || 'quiz';
    $('menuView').hidden = m !== 'menu';
    $('movesView').hidden = m !== 'moves';
    $('stageWrap').style.visibility = m === 'quiz' ? 'visible' : 'hidden';
    if (m !== mode) {
      if (mode === 'moves') stopVideo();
      if (m === 'menu') { var mv0 = $('menuView'); mv0.classList.remove('intro'); void mv0.offsetWidth; mv0.classList.add('intro'); }
      mode = m;
    }
    if (m !== 'moves') return;
    loadYT();
    var mv = S.mv || { i: 0, started: false, play: false, order: [] };
    var c = clip();
    $('mvCoverSide').hidden = !!mv.started;
    $('movesView').classList.toggle('started', !!mv.started);
    $('mvBadge').textContent = mv.started ? 'حركة ' + String(mv.i + 1).padStart(2, '0') : 'مقطع المثال';
    $('mvCount').textContent = mv.started ? String(mv.i + 1).padStart(2, '0') + ' / ' + String(CLIPS.length).padStart(2, '0') : 'مثال';
    $('mvWrestler').textContent = c ? c.wrestler : '';
    $('mvMove').textContent = c ? c.moveName + (c.moveNameAr ? ' — ' + c.moveNameAr : '') : '';
    $('mvToggle').textContent = mv.play ? '⏸ إيقاف مؤقت' : '▶ تشغيل';
    if (!player || !player.loadVideoById || !c) return;
    var t = times(c), key = c.videoId + ':' + (mv.started ? mv.i : 'ex') + ':' + mv.rs + ':' + t.s + ':' + t.e;
    if (key !== loadedKey) {
      loadedKey = key; msg(''); clearTimeout(errT);
      var o = { videoId: c.videoId, startSeconds: t.s }; if (t.e) o.endSeconds = t.e;
      try { if (mv.play) player.loadVideoById(o); else player.cueVideoById(o); } catch (e) {}
    } else {
      try { var st = player.getPlayerState(); if (mv.play && st !== 1 && st !== 3) player.playVideo(); if (!mv.play && st === 1) player.pauseVideo(); } catch (e) {}
    }
    // a "mark" request from the control panel: stamp the current time of this clip
    if (lastMk === null) lastMk = mv.mk || 0;
    if ((mv.mk || 0) !== lastMk) {
      lastMk = mv.mk || 0;
      if (mv.started && c) {
        var now = 0; try { now = Math.round(player.getCurrentTime() * 10) / 10; } catch (e) {}
        var cur = times(c), s = cur.s, e = cur.e;
        if (mv.mkw === 'start') { s = now; if (e && e <= s) e = null; } else { e = now > s ? now : null; }
        loadedKey = key; // don't reload just because we wrote times
        act('times', { id: c.id, s: s, e: e });
      }
    }
  }

  function build() {
    // menu decorations
    var f = $('mnFaces'); window.TT.PEOPLE.forEach(function (p) { var im = document.createElement('img'); im.src = p.face; im.alt = ''; f.appendChild(im); });
    var th = $('mnThumbs'); CLIPS.slice(0, 6).forEach(function (c) { var im = document.createElement('img'); im.src = c.thumbnail; im.alt = ''; im.loading = 'lazy'; im.onerror = function () { im.remove(); }; th.appendChild(im); });
    document.querySelectorAll('#screen [data-mode]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode); }); });
    document.querySelectorAll('#movesView [data-mv]').forEach(function (b) { b.addEventListener('click', function () { act(b.dataset.mv); }); });
    $('mvFull').addEventListener('click', function () {
      var el = $('mvPlayerWrap');
      try { if (document.fullscreenElement) document.exitFullscreen(); else (el.requestFullscreen || el.webkitRequestFullscreen).call(el); } catch (e) {}
    });
  }
  window.TTMoves = { apply: apply, build: build, clips: function () { return CLIPS; }, example: function () { return EX; }, key: function () { return loadedKey; } };
})();
