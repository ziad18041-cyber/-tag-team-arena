/* TAG TEAM — synthesized arena sound effects (no audio files needed) */
(function () {
  'use strict';
  var ctx = null, master = null, noiseBuf = null, enabled = false, muted = false, crowdNode = null, crowdGain = null;

  function init() {
    if (ctx) { ctx.resume(); return true; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.8;
    var comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // ambient crowd bed
    crowdNode = ctx.createBufferSource(); crowdNode.buffer = noiseBuf; crowdNode.loop = true;
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 0.6;
    crowdGain = ctx.createGain(); crowdGain.gain.value = 0.0;
    crowdNode.connect(bp); bp.connect(crowdGain); crowdGain.connect(master); crowdNode.start();
    enabled = true; return true;
  }
  function on() { return enabled && !muted && ctx; }
  function t0() { return ctx.currentTime + 0.01; }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function noise(t, dur, type, f, q, peak, sweepTo) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q || 1;
    if (sweepTo) fl.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    var g = ctx.createGain(); env(g, t, Math.min(0.05, dur / 4), peak, dur);
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.1);
  }
  function tone(t, f, dur, type, peak, f2) {
    var o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    var g = ctx.createGain(); env(g, t, 0.005, peak, dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  var S = {
    whoosh: function () { if (!on()) return; noise(t0(), 0.5, 'bandpass', 300, 2, 0.5, 4000); },
    impact: function () { if (!on()) return; var t = t0(); tone(t, 120, 0.5, 'sine', 0.9, 40); noise(t, 0.35, 'lowpass', 1200, 0.7, 0.6, 200); },
    bell: function () { if (!on()) return; var t = t0(); [1, 2.76, 5.4].forEach(function (m, i) { tone(t, 620 * m, 1.6 - i * 0.4, 'sine', 0.35 / (i + 1)); }); },
    cheer: function (len) { if (!on()) return; var t = t0(); len = len || 2.2; noise(t, len, 'bandpass', 900, 0.5, 0.55); noise(t + 0.1, len * 0.8, 'highpass', 2500, 0.4, 0.18); },
    correct: function () { if (!on()) return; var t = t0(); tone(t, 660, 0.18, 'triangle', 0.4); tone(t + 0.1, 990, 0.35, 'triangle', 0.4); S.cheer(1.4); },
    buzzer: function () { if (!on()) return; var t = t0(); tone(t, 110, 1.1, 'square', 0.35); tone(t, 116, 1.1, 'sawtooth', 0.2); },
    tick: function (hi) { if (!on()) return; tone(t0(), hi ? 1500 : 1100, 0.05, 'square', 0.12); },
    heart: function () { if (!on()) return; var t = t0(); tone(t, 70, 0.18, 'sine', 0.8, 45); tone(t + 0.22, 62, 0.2, 'sine', 0.6, 40); },
    thunder: function () { if (!on()) return; var t = t0(); noise(t, 1.6, 'lowpass', 400, 0.5, 0.9, 80); tone(t, 50, 1.2, 'sine', 0.6, 30); },
    gong: function () { if (!on()) return; var t = t0(); [1, 1.5, 2.2, 3.1].forEach(function (m, i) { tone(t, 98 * m, 3 - i * 0.5, 'sine', 0.4 / (i + 1)); }); },
    whistle: function () { if (!on()) return; var t = t0(); tone(t, 2600, 0.25, 'sine', 0.3); tone(t + 0.3, 2600, 0.5, 'sine', 0.3, 2500); },
    glitch: function () { if (!on()) return; var t = t0(); for (var i = 0; i < 6; i++) tone(t + i * 0.05, 200 + Math.random() * 1600, 0.04, 'square', 0.15); },
    fanfare: function () { if (!on()) return; var t = t0(); [523, 659, 784, 1046].forEach(function (f, i) { tone(t + i * 0.12, f, 0.5, 'sawtooth', 0.16); }); S.cheer(3); },
    rewind: function () { if (!on()) return; tone(t0(), 900, 0.6, 'sawtooth', 0.15, 120); },
    crowd: function (level) { if (!ctx || !crowdGain) return; crowdGain.gain.setTargetAtTime(muted ? 0 : level, ctx.currentTime, 0.4); }
  };
  window.SFX = { init: init, play: function (n, a) { try { if (S[n]) S[n](a); } catch (e) {} }, setMuted: function (m) { muted = !!m; if (m) S.crowd(0); }, enabled: function () { return enabled; } };
})();
