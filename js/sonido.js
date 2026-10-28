// Efectos de sonido creados en el momento con el navegador (no hacen falta archivos de audio).
// Sonido.tocar("acierto"), Sonido.silenciar(true/false). El silencio se recuerda en este ordenador.
(function () {
  "use strict";
  var ctx = null, maestro = null, ruidoBuf = null;
  var mudo = false;
  try { mudo = localStorage.getItem("ib_mudo") === "1"; } catch (e) { mudo = false; }

  // El navegador solo deja sonar tras una pulsación o un clic: se prepara entonces.
  function preparar() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    maestro = ctx.createGain(); maestro.gain.value = 0.35; maestro.connect(ctx.destination);
    ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = ruidoBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  ["keydown", "pointerdown"].forEach(function (ev) { window.addEventListener(ev, preparar, true); });

  // Una nota: forma de onda, frecuencia inicial y final, momento, duración y volumen.
  function nota(tipo, f0, f1, t, dur, vol) {
    var o = ctx.createOscillator(), gn = ctx.createGain(), t0 = ctx.currentTime + t;
    o.type = tipo; o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.015, dur / 4));
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(gn); gn.connect(maestro);
    o.start(t0); o.stop(t0 + dur + 0.02);
    return o;
  }
  // Ruido filtrado (soplidos, golpes, chispas).
  function ruido(t, dur, vol, f0, f1, tipoFiltro) {
    var s = ctx.createBufferSource(), fil = ctx.createBiquadFilter(), gn = ctx.createGain(), t0 = ctx.currentTime + t;
    s.buffer = ruidoBuf;
    fil.type = tipoFiltro || "bandpass"; fil.Q.value = 1.2;
    fil.frequency.setValueAtTime(f0, t0);
    if (f1) fil.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(fil); fil.connect(gn); gn.connect(maestro);
    s.start(t0); s.stop(t0 + dur + 0.02);
  }
  function vibrato(o, vel, prof, t, dur) {
    var l = ctx.createOscillator(), gl = ctx.createGain(), t0 = ctx.currentTime + t;
    l.frequency.value = vel; gl.gain.value = prof; l.connect(gl); gl.connect(o.frequency);
    l.start(t0); l.stop(t0 + dur);
  }

  var SONIDOS = {
    // pregunta acertada: tres notas que suben
    acierto: function (v) { [523, 659, 784].forEach(function (f, i) { nota("triangle", f, f, i * 0.08, 0.18, 0.5 * v); }); },
    // ejercicio grande acertado: un poco más largo
    premio: function (v) { [523, 659, 784, 1047].forEach(function (f, i) { nota("triangle", f, f, i * 0.09, i === 3 ? 0.4 : 0.18, 0.5 * v); }); nota("sine", 1568, 1568, 0.36, 0.4, 0.15 * v); },
    // fallo: dos notas graves que bajan
    fallo: function (v) { nota("square", 220, 200, 0, 0.16, 0.18 * v); nota("square", 175, 150, 0.17, 0.28, 0.18 * v); },
    ataqueDebil: function (v) { ruido(0, 0.12, 0.5 * v, 2500, 900); nota("square", 700, 300, 0, 0.1, 0.12 * v); },
    ataqueFuerte: function (v) { ruido(0, 0.45, 0.7 * v, 400, 2400); nota("sawtooth", 220, 70, 0.02, 0.45, 0.16 * v); },
    // ataques del fantasma: «¡BU!» y embrujo
    susto: function (v) { var o = nota("sine", 260, 160, 0, 0.35, 0.45 * v); vibrato(o, 9, 25, 0, 0.35); },
    embrujo: function (v) { [880, 1175, 1397, 1760, 2093].forEach(function (f, i) { nota("sine", f, f * 1.02, i * 0.06, 0.25, 0.18 * v); }); ruido(0, 0.5, 0.25 * v, 3000, 6000, "highpass"); },
    // golpe que da en el blanco
    golpe: function (v) { nota("sine", 160, 45, 0, 0.18, 0.8 * v); ruido(0, 0.08, 0.5 * v, 1800, 600); },
    // te han dado a ti
    herido: function (v) { nota("sine", 140, 40, 0, 0.22, 0.9 * v); nota("triangle", 440, 300, 0.05, 0.2, 0.25 * v); ruido(0, 0.1, 0.4 * v, 1200, 400); },
    bloqueado: function (v) { nota("square", 1320, 1320, 0, 0.12, 0.12 * v); nota("sine", 2640, 2500, 0, 0.3, 0.15 * v); },
    pop: function (v) { nota("sine", 380, 950, 0, 0.09, 0.45 * v); },
    objeto: function (v) { [988, 1319, 1976].forEach(function (f, i) { nota("triangle", f, f, i * 0.05, 0.14, 0.3 * v); }); },
    // aviso de ejercicio para toda la clase: campanita doble
    ejercicio: function (v) { [0, 0.28].forEach(function (t) { nota("sine", 880, 880, t, 0.5, 0.45 * v); nota("sine", 1320, 1320, t, 0.4, 0.2 * v); }); },
    eliminado: function (v) { [392, 330, 262, 196].forEach(function (f, i) { nota("triangle", f, f * 0.97, i * 0.18, 0.3, 0.4 * v); }); },
    fantasma: function (v) { var o = nota("sine", 300, 600, 0, 0.9, 0.35 * v); vibrato(o, 6, 30, 0, 0.9); },
    tiempoFin: function (v) { nota("triangle", 660, 440, 0, 0.18, 0.25 * v); },
    // pantalla final: pequeña fanfarria
    fin: function (v) { [[523, 0], [523, 0.12], [523, 0.24], [659, 0.36], [784, 0.6]].forEach(function (n, i) { nota("square", n[0], n[0], n[1], i === 4 ? 0.6 : 0.1, 0.15 * v); nota("triangle", n[0] / 2, n[0] / 2, n[1], i === 4 ? 0.6 : 0.1, 0.25 * v); }); }
  };

  var ultimo = {};
  // vol: 1 normal; menos para lo que hacen los demás
  function tocar(nombre, vol) {
    if (mudo) return;
    preparar();
    if (!ctx || ctx.state !== "running" || !SONIDOS[nombre]) return;
    var ahora = Date.now();
    if (ultimo[nombre] && ahora - ultimo[nombre] < 60) return;   // evita amontonar el mismo sonido
    ultimo[nombre] = ahora;
    try { SONIDOS[nombre](vol === undefined ? 1 : vol); } catch (e) { /* sin sonido */ }
  }
  function silenciar(si) {
    mudo = !!si;
    try { localStorage.setItem("ib_mudo", mudo ? "1" : "0"); } catch (e) { /* sin memoria */ }
  }

  window.Sonido = { tocar: tocar, silenciar: silenciar, mudo: function () { return mudo; }, NOMBRES: Object.keys(SONIDOS) };
})();
