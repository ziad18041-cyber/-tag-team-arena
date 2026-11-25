/* TAG TEAM — two-device sync.
   Inside claude.ai (artifact): room (instant) + db (persistent, late joiners).
   Anywhere else (e.g. GitHub Pages): MQTT over secure WebSocket on two public brokers, keyed by a room code.
   Always: BroadcastChannel + localStorage for windows on the same device. */
(function () {
  'use strict';
  var KEY = 'tt_state_v1', BANK_KEY = 'tt_bank_v1';
  var me = (function () {
    try { var d = sessionStorage.getItem('tt_dev'); if (!d) { d = Math.random().toString(36).slice(2, 10); sessionStorage.setItem('tt_dev', d); } return d; }
    catch (e) { return Math.random().toString(36).slice(2, 10); }
  })();

  var cfg = null, cur = null, samples = {}, status = { mode: 'local', connected: false, screens: 0, controls: 0, note: '' };
  var bc = null, room = null, db = null, docRef = null, bankRef = null, mq = [];
  var writing = false, pendingDoc = null, bankWriting = false, pendingBank = null;

  function setStatus(p) { for (var k in p) status[k] = p[k]; if (cfg && cfg.onStatus) cfg.onStatus(status); }

  function sample(clk, sent) {
    if (!clk || clk === me || typeof sent !== 'number') return;
    var d = Date.now() - sent, a = samples[clk] || (samples[clk] = []);
    a.push(d); if (a.length > 20) a.shift();
  }
  function offset(clk) {
    if (!clk || clk === me) return 0;
    var a = samples[clk]; if (!a || !a.length) return 0;
    var m = Math.min.apply(null, a);
    return Math.abs(m) > 1500 ? m : 0; // device clocks are normally NTP-synced; only correct real skew
  }

  function newer(S) {
    if (!cur) return true;
    if (S.v !== cur.v) return S.v > cur.v;
    return (S.at || 0) > (cur.at || 0);
  }
  function receive(env, via) {
    if (!env || typeof env !== 'object') return;
    var S = env.s;
    if (!window.TT.valid(S)) return;
    if (via !== 'db' || env.fresh) sample(env.clk || S.clk, env.sent);
    if (newer(S)) { cur = S; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} cfg.onState(S, via); }
    else if (cfg.role === 'control' && cur && S.v < cur.v && via !== 'local') {
      // someone holds an older picture (e.g. a screen that reconnected) — nudge with ours
      heartbeat();
    }
  }
  function env(S) { return { s: S, sent: Date.now(), clk: me }; }

  /* ---------- MQTT 3.1.1 over WebSocket (QoS 0, retained) ---------- */
  function utf8(s) { return new TextEncoder().encode(s); }
  function str(s) { var b = utf8(s); var o = new Uint8Array(2 + b.length); o[0] = b.length >> 8; o[1] = b.length & 255; o.set(b, 2); return o; }
  function remLen(n) { var o = []; do { var d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; o.push(d); } while (n > 0); return o; }
  function packet(type, parts) {
    var len = parts.reduce(function (a, p) { return a + p.length; }, 0), h = [type].concat(remLen(len));
    var o = new Uint8Array(h.length + len); o.set(h, 0); var i = h.length;
    parts.forEach(function (p) { o.set(p, i); i += p.length; }); return o;
  }
  function Mqtt(url, topicBase, onMsg, onConn) {
    this.url = url; this.base = topicBase; this.onMsg = onMsg; this.onConn = onConn; this.ok = false; this.buf = new Uint8Array(0); this.backoff = 1000; this.open();
  }
  Mqtt.prototype.open = function () {
    var self = this, ws;
    try { ws = new WebSocket(this.url, 'mqtt'); } catch (e) { return this.retry(); }
    ws.binaryType = 'arraybuffer'; this.ws = ws;
    ws.onopen = function () {
      var id = 'tt-' + me + '-' + Math.random().toString(36).slice(2, 6);
      ws.send(packet(0x10, [str('MQTT'), new Uint8Array([4, 2, 0, 30]), str(id)]));
    };
    ws.onmessage = function (e) { self.feed(new Uint8Array(e.data)); };
    ws.onclose = function () { self.ok = false; clearInterval(self.ping); self.onConn(); self.retry(); };
    ws.onerror = function () { try { ws.close(); } catch (e) {} };
  };
  Mqtt.prototype.retry = function () { var s = this; clearTimeout(this.rt); this.rt = setTimeout(function () { s.open(); }, this.backoff); this.backoff = Math.min(15000, this.backoff * 2); };
  Mqtt.prototype.feed = function (chunk) {
    var b = new Uint8Array(this.buf.length + chunk.length); b.set(this.buf); b.set(chunk, this.buf.length); this.buf = b;
    while (this.buf.length >= 2) {
      var mult = 1, len = 0, i = 1, d;
      do { if (i >= this.buf.length) return; d = this.buf[i++]; len += (d & 127) * mult; mult *= 128; } while (d & 128);
      if (this.buf.length < i + len) return;
      var type = this.buf[0], body = this.buf.slice(i, i + len); this.buf = this.buf.slice(i + len);
      this.handle(type, body);
    }
  };
  Mqtt.prototype.handle = function (type, body) {
    var self = this, k = type >> 4;
    if (k === 2) { // CONNACK
      if (body[1] !== 0) return;
      this.ok = true; this.backoff = 1000;
      this.ws.send(packet(0x82, [new Uint8Array([0, 1]), str(this.base + '/#'), new Uint8Array([0])]));
      this.ping = setInterval(function () { try { self.ws.send(new Uint8Array([0xC0, 0])); } catch (e) {} }, 20000);
      this.onConn();
    } else if (k === 3) { // PUBLISH
      var tl = (body[0] << 8) | body[1], topic = new TextDecoder().decode(body.slice(2, 2 + tl)), p = 2 + tl;
      if ((type >> 1) & 3) p += 2;
      try { this.onMsg(topic.slice(this.base.length + 1), JSON.parse(new TextDecoder().decode(body.slice(p)))); } catch (e) {}
    }
  };
  Mqtt.prototype.pub = function (sub, obj, retain) {
    if (!this.ok) return;
    try { this.ws.send(packet(retain ? 0x31 : 0x30, [str(this.base + '/' + sub), utf8(JSON.stringify(obj))])); } catch (e) {}
  };

  function roomCode() {
    var h = new URLSearchParams((location.hash.split('?')[1] || location.hash.split('&').slice(1).join('&')) || '');
    var q = new URLSearchParams(location.search);
    var c = q.get('room') || h.get('room');
    try { if (!c) c = localStorage.getItem('tt_room'); } catch (e) {}
    if (!c && cfg.role === 'control') c = Math.random().toString(36).slice(2, 8);
    if (c) { c = c.replace(/[^a-z0-9]/gi, '').slice(0, 16).toLowerCase(); try { localStorage.setItem('tt_room', c); } catch (e) {} }
    return c;
  }

  function startMqtt() {
    var code = roomCode();
    status.room = code;
    if (!code) { setStatus({ mode: 'mqtt', connected: false, note: 'أدخل رمز الغرفة' }); return; }
    var base = 'tagteam-arena/v1/' + code;
    var qb = new URLSearchParams(location.search).get('broker');
    var urls = qb && /^wss?:\/\//.test(qb) ? [qb] : (cfg.brokers || ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt']);
    function onConn() { setStatus({ mode: 'mqtt', connected: mq.some(function (m) { return m.ok; }) }); if (cfg.role === 'control') { heartbeat(); if (cfg.getBank) pubBank(cfg.getBank()); } }
    function onMsg(sub, obj) {
      if (sub === 'state') receive(obj, 'mqtt');
      else if (sub === 'bank' && cfg.onBank && obj && Array.isArray(obj.list)) cfg.onBank(obj.list);
      else if (sub === 'hello' && cfg.role === 'control') heartbeat();
    }
    mq = urls.map(function (u) { return new Mqtt(u, base, onMsg, onConn); });
    setStatus({ mode: 'mqtt' });
    if (cfg.role === 'screen') setTimeout(function () { mq.forEach(function (m) { m.pub('hello', { t: Date.now() }, false); }); }, 2500);
  }
  function pubBank(list) { mq.forEach(function (m) { m.pub('bank', { list: list }, true); }); }

  /* ---------- claude.ai artifact: room + db ---------- */
  function startClaude() {
    setStatus({ mode: 'claude', note: 'جارٍ الاتصال…' });
    var gotSnap = false;
    var t = setTimeout(function () { if (!gotSnap) setStatus({ note: 'لم تصل البيانات المحفوظة بعد' }); }, 10000);
    window.claude.use('db').then(function (d) {
      if (!d) { setStatus({ note: 'قاعدة البيانات غير متاحة (سجّل الدخول)' }); return; }
      db = d; docRef = db.doc('live/state'); bankRef = db.doc('live/bank');
      docRef.onSnapshot(function (snap) {
        gotSnap = true; clearTimeout(t);
        if (!snap.metadata.fromCache) setStatus({ dbOk: true, note: '' });
        if (snap.exists) { var x = snap.data(); receive({ s: x.s, sent: x.sent, clk: x.clk, fresh: false }, 'db'); }
        else if (cfg.role === 'control' && !snap.metadata.fromCache && cur) writeDoc(cur);
      }, function (e) { setStatus({ dbOk: false, note: 'تعذر الوصول للبيانات: ' + (e && e.code) }); });
      if (cfg.role === 'control' && cfg.onBank) {
        bankRef.get().then(function (s) { if (s.exists && Array.isArray(s.data().list)) cfg.onBank(s.data().list); }).catch(function () {});
      }
    }).catch(function () {});
    window.claude.use('room').then(function (r) {
      if (!r) { setStatus({ note: 'البث الفوري غير متاح — المزامنة عبر قاعدة البيانات' }); return; }
      room = r;
      r.on('state', function (m) { if (!m.sameTab) receive(m.data, 'room'); }, function () {});
      r.on('hello', function (m) { if (!m.sameTab && cfg.role === 'control') heartbeat(); }, function () {});
      r.presence({ role: cfg.role }).catch(function () {});
      r.onConnection(function (c) { setStatus({ connected: c }); if (c && cfg.role === 'control') heartbeat(); }, function () { setStatus({ connected: false }); });
      r.onPeers(function (ch) {
        var s = 0, c = 0;
        ch.peers.forEach(function (p) { if (p.sameTab) return; if (p.presence && p.presence.role === 'screen') s++; else if (p.presence && p.presence.role === 'control') c++; });
        setStatus({ screens: s, controls: c });
        if (ch.joined.length && cfg.role === 'control') heartbeat();
      }, function () {});
      if (cfg.role === 'screen') setTimeout(function () { r.emit('hello', { t: Date.now() }).catch(function () {}); }, 1500);
    }).catch(function () {});
  }

  function writeDoc(S) {
    if (!docRef) return;
    if (writing) { pendingDoc = S; return; }
    writing = true;
    docRef.set({ s: S, sent: Date.now(), clk: me }).then(done, function (e) {
      setStatus({ note: 'تعذر الحفظ: ' + (e && e.code) });
      if (e && e.code === 'unavailable') setTimeout(function () { pendingDoc = pendingDoc || S; done(); }, 600 + Math.random() * 600); else done();
    });
    function done() { writing = false; if (pendingDoc) { var p = pendingDoc; pendingDoc = null; writeDoc(p); } }
  }
  function writeBank(list) {
    if (!bankRef) return;
    if (bankWriting) { pendingBank = list; return; }
    bankWriting = true;
    bankRef.set({ list: list }).catch(function () {}).then(function () { bankWriting = false; if (pendingBank) { var p = pendingBank; pendingBank = null; writeBank(p); } });
  }

  /* ---------- public API ---------- */
  function publish(S) {
    cur = S;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    var e = env(S);
    if (bc) try { bc.postMessage(e); } catch (x) {}
    if (room) room.emit('state', e).catch(function () {});
    mq.forEach(function (m) { m.pub('state', e, true); });
    writeDoc(S);
  }
  function heartbeat() {
    if (!cur || cfg.role !== 'control') return;
    var e = env(cur);
    if (bc) try { bc.postMessage(e); } catch (x) {}
    if (room && room.connected()) room.emit('state', e).catch(function () {});
    mq.forEach(function (m) { m.pub('state', e, true); });
  }
  function saveBank(list) {
    try { localStorage.setItem(BANK_KEY, JSON.stringify(list)); } catch (e) {}
    writeBank(list); pubBank(list);
  }
  function localBank() { try { var b = JSON.parse(localStorage.getItem(BANK_KEY)); if (Array.isArray(b) && b.length) return b; } catch (e) {} return null; }
  function localState() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (window.TT.valid(s)) return s; } catch (e) {} return null; }

  function init(c) {
    cfg = c;
    try { bc = new BroadcastChannel('tagteam-arena-v1'); bc.onmessage = function (e) { receive(e.data, 'local'); }; } catch (e) {}
    window.addEventListener('storage', function (e) { if (e.key === KEY && e.newValue) try { receive({ s: JSON.parse(e.newValue) }, 'local'); } catch (x) {} });
    var ls = localState(); if (ls) { cur = ls; cfg.onState(ls, 'cache'); }
    if (cfg.force === 'mqtt' || !(window.claude && typeof window.claude.use === 'function')) startMqtt();
    else startClaude();
    if (cfg.role === 'control') setInterval(function () { if (cur && cur.phase === 'live') heartbeat(); }, 1000);
    if (cfg.role === 'control') setInterval(function () { if (cur && cur.phase !== 'live') heartbeat(); }, 5000);
  }

  window.TTSync = { init: init, publish: publish, heartbeat: heartbeat, offset: offset, saveBank: saveBank, localBank: localBank,
    status: function () { return status; }, me: me, current: function () { return cur; } };
})();
