(function () {
  'use strict';
  function role() {
    var h = (location.hash || '').replace('#', '').split(/[?&]/)[0];
    if (h === 'screen' || h === 'control') return h;
    var q = new URLSearchParams(location.search).get('mode');
    if (q === 'screen' || q === 'control') return q;
    try { var r = localStorage.getItem('tt_role'); if (r === 'screen' || r === 'control') return r; } catch (e) {}
    return null;
  }
  function go(r) {
    try { localStorage.setItem('tt_role', r); } catch (e) {}
    document.getElementById('chooser').hidden = true;
    document.getElementById(r).hidden = false;
    if (location.hash.replace('#', '').split(/[?&]/)[0] !== r) { try { history.replaceState(null, '', location.pathname + location.search + '#' + r); } catch (e) {} }
    if (r === 'screen') window.TTScreenStart(); else window.TTControlStart();
  }
  function reset() { try { localStorage.removeItem('tt_role'); } catch (e) {} try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} location.reload(); }
  document.querySelectorAll('[data-switch]').forEach(function (b) { b.addEventListener('click', reset); });
  var r = role();
  if (r) go(r);
  else {
    document.getElementById('goScreen').onclick = function () { go('screen'); };
    document.getElementById('goControl').onclick = function () { go('control'); };
  }
})();
