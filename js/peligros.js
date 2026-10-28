// Peligros de los mapas difíciles: carretillas y grúas (puerto), géiseres de lava (volcán), plantas carnívoras y niebla (pantano).
// Todo depende solo del tiempo de partida, así que todos los ordenadores ven lo mismo sin enviarse nada.
// Reglas: avisan 3 s antes, solo hacen daño a quien tiene tiempo de movimiento, nunca bajan de 1 de vida,
// el escudo para un golpe y los fantasmas no reciben daño (eso lo aplica el motor).
(function () {
  "use strict";
  var AVISO = 3000;
  var GEISER = { periodo: 12000, erupcion: 1500, dano: 3 };
  var GRUA = { periodo: 21000, caida: 500, suelo: 1500, subida: 1200, dano: 5 };
  var CARRETILLA = { dano: 3, radio: 0.7 };
  var PLANTA = { dano: 2 };

  var cache = { mapa: null, defs: null };
  function defs() {
    var id = Mapa.actual();
    if (cache.mapa !== id) { cache.mapa = id; cache.defs = Mapa.peligros ? Mapa.peligros() : null; prepararRutas(cache.defs); }
    return cache.defs;
  }
  function hay() { var d = defs(); return !!(d && (d.carretillas.length || d.gruas.length || d.geiseres.length || d.plantas.length || d.niebla)); }
  function fase(periodo, t, f) { return (((t + (f || 0)) % periodo) + periodo) % periodo; }

  // ---------- géiseres ----------
  function geiseres(t) {
    var d = defs(); if (!d) return [];
    return d.geiseres.map(function (g) {
      var ph = fase(GEISER.periodo, t, g.fase), e = "quieto", prog = 0, falta = 0;
      if (ph < AVISO) { e = "aviso"; prog = ph / AVISO; falta = AVISO - ph; }
      else if (ph < AVISO + GEISER.erupcion) { e = "erupcion"; prog = (ph - AVISO) / GEISER.erupcion; }
      return { x: g.x, y: g.y, estado: e, prog: prog, falta: falta };
    });
  }

  // ---------- plantas carnívoras: muerden sin avisar a quien pasa por una de sus 4 casillas de alrededor ----------
  function plantas() {
    var d = defs(); if (!d) return [];
    return d.plantas.map(function (q) { return { x: q.x, y: q.y, estado: "quieta", prog: 0 }; });
  }
  function junto(q, x, y) { return Math.abs(q.x - x) + Math.abs(q.y - y) === 1; }

  // ---------- niebla: baja la visión de todos a la vez ----------
  // devuelve cuánta niebla hay (0 nada, 1 del todo) y si está a punto de llegar
  function niebla(t) {
    var d = defs(), n = d && d.niebla; if (!n) return { nivel: 0, aviso: false, falta: 0 };
    var ph = fase(n.periodo, t, n.fase), entra = 1000;
    if (ph < AVISO) return { nivel: 0, aviso: true, falta: AVISO - ph };
    ph -= AVISO;
    if (ph < entra) return { nivel: ph / entra, aviso: false, falta: 0 };
    if (ph < n.dura - entra) return { nivel: 1, aviso: false, falta: 0 };
    if (ph < n.dura) return { nivel: (n.dura - ph) / entra, aviso: false, falta: 0 };
    return { nivel: 0, aviso: false, falta: 0 };
  }
  // radio de visión (en casillas) según la niebla
  function radio(t, normal) { return normal - (normal - 2) * niebla(t).nivel; }

  // ---------- grúas ----------
  function gruas(t) {
    var d = defs(); if (!d) return [];
    return d.gruas.map(function (g) {
      var ph = fase(GRUA.periodo, t, g.fase), e = "arriba", altura = 1, falta = 0, t1 = AVISO, t2 = t1 + GRUA.caida, t3 = t2 + GRUA.suelo, t4 = t3 + GRUA.subida;
      if (ph < t1) { e = "aviso"; altura = 1 - 0.45 * (ph / t1); falta = t1 - ph; }
      else if (ph < t2) { e = "cae"; altura = 0.55 * (1 - (ph - t1) / GRUA.caida); }
      else if (ph < t3) { e = "suelo"; altura = 0; }
      else if (ph < t4) { e = "sube"; altura = (ph - t3) / GRUA.subida; }
      return { x: g.x, y: g.y, w: g.w, h: g.h, estado: e, altura: altura, falta: falta, golpe: ph >= t2 - 80 && ph < t2 + 450 };
    });
  }

  // ---------- carretillas (dan vueltas por su ruta a velocidad constante) ----------
  function prepararRutas(d) {
    if (!d) return;
    d.carretillas.forEach(function (c) {
      var pts = c.ruta.concat([c.ruta[0]]), largo = 0;
      c.tramos = [];
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1], l = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
        c.tramos.push({ a: a, b: b, ini: largo, l: l }); largo += l;
      }
      c.largo = largo;
    });
  }
  function carretillas(t) {
    var d = defs(); if (!d) return [];
    return d.carretillas.map(function (c) {
      var s = ((t / 1000 * c.vel + c.fase * c.largo) % c.largo + c.largo) % c.largo;
      var tr = c.tramos.find(function (q) { return s >= q.ini && s < q.ini + q.l; }) || c.tramos[0];
      var f = tr.l ? (s - tr.ini) / tr.l : 0, dx = Math.sign(tr.b[0] - tr.a[0]), dy = Math.sign(tr.b[1] - tr.a[1]);
      return { x: tr.a[0] + (tr.b[0] - tr.a[0]) * f, y: tr.a[1] + (tr.b[1] - tr.a[1]) * f, dir: dx > 0 ? "derecha" : dx < 0 ? "izquierda" : dy > 0 ? "abajo" : "arriba" };
    });
  }

  // ¿Qué peligro hay ahora mismo en la casilla (x, y)?
  function dano(x, y, t) {
    if (!defs()) return null;
    var g = geiseres(t).find(function (q) { return q.estado === "erupcion" && q.x === x && q.y === y; });
    if (g) return { dano: GEISER.dano, tipo: "geiser" };
    var gr = gruas(t).find(function (q) { return q.golpe && x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h; });
    if (gr) return { dano: GRUA.dano, tipo: "grua" };
    var c = carretillas(t).find(function (q) { return Math.hypot(q.x - x, q.y - y) < CARRETILLA.radio; });
    if (c) return { dano: CARRETILLA.dano, tipo: "carretilla" };
    if (plantas().some(function (q) { return junto(q, x, y); })) return { dano: PLANTA.dano, tipo: "planta" };
    return null;
  }

  // ¿Está avisando algún peligro en la casilla (x, y)? (géiser o grúa a punto de soltar el contenedor)
  function avisoEn(x, y, t) {
    if (!defs()) return false;
    return geiseres(t).some(function (q) { return q.estado === "aviso" && q.x === x && q.y === y; }) ||
      gruas(t).some(function (q) { return q.estado === "aviso" && x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h; }) ||
      carretillaCerca(x, y, t);
  }
  // ¿Llegará una carretilla a la casilla (x, y) en los próximos 3 s?
  function carretillaCerca(x, y, t) {
    for (var s = 250; s <= AVISO; s += 250)
      if (carretillas(t + s).some(function (q) { return Math.hypot(q.x - x, q.y - y) < CARRETILLA.radio; })) return true;
    return false;
  }

  var TEXTOS = { geiser: "¡Un géiser de lava te ha quemado!", grua: "¡Te ha caído un contenedor encima!", carretilla: "¡Te ha atropellado una carretilla!", planta: "¡Te ha mordido una planta carnívora!" };

  // ---------- dibujo ----------
  function cuentaAtras(g, x, y, ms) {
    var n = Math.max(1, Math.ceil(ms / 1000));
    g.save(); g.font = "bold 30px 'Segoe UI', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = 6; g.strokeStyle = "rgba(60,0,0,0.85)"; g.strokeText(String(n), x, y); g.fillStyle = "rgb(255,236,90)"; g.fillText(String(n), x, y);
    g.restore();
  }
  // lo que va en el suelo (antes que personajes y obstáculos)
  function dibujarSuelo(g, t, T, ahora) {
    // camino que recorrerá cada carretilla en los próximos 3 s (flechas naranjas parpadeando)
    var luz = 0.35 + 0.25 * Math.sin(ahora / 150);
    for (var s = 500; s <= AVISO; s += 500) {
      carretillas(t + s).forEach(function (q) {
        var cx = q.x * T + 32, cy = q.y * T + 32, ang = { derecha: 0, abajo: Math.PI / 2, izquierda: Math.PI, arriba: -Math.PI / 2 }[q.dir];
        g.save(); g.translate(cx, cy); g.rotate(ang);
        g.fillStyle = "rgba(255,120,20," + (luz * (1.2 - s / AVISO)).toFixed(2) + ")";
        g.beginPath(); g.moveTo(-10, -12); g.lineTo(6, 0); g.lineTo(-10, 12); g.lineTo(-4, 0); g.closePath(); g.fill();
        g.restore();
      });
    }
    geiseres(t).forEach(function (q) {
      var cx = q.x * T + 32, cy = q.y * T + 32;
      if (q.estado === "aviso") {
        var pulso = 0.5 + 0.5 * Math.sin(ahora / 120);
        g.fillStyle = "rgba(255," + Math.round(120 + 80 * pulso) + ",40," + (0.25 + 0.45 * q.prog) + ")";
        g.beginPath(); g.ellipse(cx, cy, 20 + 14 * q.prog, 14 + 8 * q.prog, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "rgba(255,80,40," + (0.5 + 0.5 * pulso) + ")"; g.lineWidth = 3; g.strokeRect(q.x * T + 3, q.y * T + 3, T - 6, T - 6);
      }
    });
    gruas(t).forEach(function (q) {
      if (q.estado === "arriba") return;
      var X = q.x * T, Y = q.y * T, w = q.w * T, h = q.h * T;
      g.fillStyle = "rgba(0,0,0," + (0.15 + 0.35 * (1 - q.altura)) + ")";
      g.beginPath(); g.ellipse(X + w / 2, Y + h / 2 + 6, w / 2 * (1 - q.altura * 0.4), h / 2 * (1 - q.altura * 0.4), 0, 0, Math.PI * 2); g.fill();
      if (q.estado === "aviso" && Math.floor(ahora / 250) % 2 === 0) { g.strokeStyle = "rgb(240,50,50)"; g.lineWidth = 5; g.strokeRect(X + 3, Y + 3, w - 6, h - 6); }
    });
  }
  // lo que va por encima de todo (contenedor colgando, chorros de lava, cuentas atrás)
  function dibujarEncima(g, t, T, ahora) {
    gruas(t).forEach(function (q) {
      var X = q.x * T, Y = q.y * T, w = q.w * T, h = q.h * T, sube = q.altura * 150;
      var cy = Y - sube;
      // sin peligro la grúa no se ve; el contenedor aparece al avisar y desaparece al volver a subir
      if (q.estado === "arriba") return;
      g.save();
      g.globalAlpha = q.estado === "aviso" ? Math.min(1, (AVISO - q.falta) / 500) : q.estado === "sube" ? 1 - q.altura : 1;
      g.strokeStyle = "rgb(50,50,56)"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(X + w / 2 - 20, cy - 400); g.lineTo(X + w / 2 - 20, cy + 6); g.moveTo(X + w / 2 + 20, cy - 400); g.lineTo(X + w / 2 + 20, cy + 6); g.stroke();
      var esc = 1 + q.altura * 0.12, cw = (w - 16) * esc, ch = (h - 18) * esc, cx = X + w / 2 - cw / 2;
      g.fillStyle = "rgb(214,70,52)"; g.fillRect(cx, cy + 6, cw, ch);
      g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 2;
      for (var r = cx + 8; r < cx + cw - 4; r += 9) { g.beginPath(); g.moveTo(r, cy + 10); g.lineTo(r, cy + ch + 2); g.stroke(); }
      g.strokeStyle = "rgb(110,30,24)"; g.lineWidth = 3; g.strokeRect(cx, cy + 6, cw, ch);
      g.restore();
      if (q.estado === "aviso") cuentaAtras(g, X + w / 2, Y + h / 2, q.falta);
      if (q.estado === "suelo") {
        g.fillStyle = "rgba(210,200,180," + (0.6 * (1 - Math.min(1, (ahora % 1500) / 1500))) + ")";
        for (var k = 0; k < 6; k++) { g.beginPath(); g.arc(X + (k + 0.5) * w / 6, Y + h, 14, 0, Math.PI * 2); g.fill(); }
      }
    });
    geiseres(t).forEach(function (q) {
      var cx = q.x * T + 32, cy = q.y * T + 32;
      if (q.estado === "aviso") cuentaAtras(g, cx, cy - 34, q.falta);
      if (q.estado === "erupcion") {
        var alto = 110 * Math.sin(Math.min(1, q.prog * 1.4) * Math.PI / 2) * (q.prog > 0.75 ? (1 - q.prog) / 0.25 : 1);
        var grd = g.createLinearGradient(cx, cy, cx, cy - alto);
        grd.addColorStop(0, "rgba(255,90,20,0.95)"); grd.addColorStop(0.6, "rgba(255,170,40,0.9)"); grd.addColorStop(1, "rgba(255,240,140,0.6)");
        g.fillStyle = grd; g.beginPath(); g.moveTo(cx - 14, cy); g.quadraticCurveTo(cx - 22, cy - alto * 0.6, cx, cy - alto); g.quadraticCurveTo(cx + 22, cy - alto * 0.6, cx + 14, cy); g.closePath(); g.fill();
        for (var k = 0; k < 7; k++) {
          var a = k * 0.9 + ahora / 200, rr = 18 + (k % 3) * 12;
          g.fillStyle = k % 2 ? "rgb(255,200,60)" : "rgb(255,110,30)";
          g.beginPath(); g.arc(cx + Math.cos(a) * rr, cy - alto * 0.7 + Math.sin(a * 1.3) * 16, 4 + (k % 3), 0, Math.PI * 2); g.fill();
        }
      }
    });
  }
  // planta carnívora (se dibuja ordenada con los personajes): se hincha al avisar y abre la boca al morder
  function dibujarPlanta(g, q, T, ahora) {
    if (q.estado === "muerde") q.prog = (ahora % 600) / 600;   // abre y cierra la boca mientras hay alguien al lado
    var cx = q.x * T + 32, base = q.y * T + 58, mueve = q.estado === "aviso" ? Math.sin(ahora / 70) * 3 * q.prog : 0;
    var esc = q.estado === "aviso" ? 1 + 0.15 * q.prog : q.estado === "muerde" ? 1.25 : 1;
    var abre = q.estado === "muerde" ? Math.sin(Math.min(1, q.prog * 2) * Math.PI / 2) * 0.9 : q.estado === "aviso" ? 0.15 + 0.25 * q.prog : 0.12;
    g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(cx, base, 22, 7, 0, 0, Math.PI * 2); g.fill();
    // hojas
    g.fillStyle = "rgb(56,120,58)";
    [[-1, 0.5], [1, -0.5]].forEach(function (h) { g.beginPath(); g.ellipse(cx + h[0] * 16, base - 6, 16, 6, h[1], 0, Math.PI * 2); g.fill(); });
    g.strokeStyle = "rgb(70,130,60)"; g.lineWidth = 6; g.lineCap = "round";
    g.beginPath(); g.moveTo(cx, base - 4); g.quadraticCurveTo(cx - 8, base - 22, cx + mueve, base - 30); g.stroke();
    g.save(); g.translate(cx + mueve, base - 38); g.scale(esc, esc);
    // cabeza: dos mandíbulas con dientes
    var a = abre * 0.9;
    [-1, 1].forEach(function (lado) {
      g.save(); g.rotate(lado * a);
      g.fillStyle = "rgb(200,40,70)"; g.beginPath(); g.ellipse(0, lado * 9, 20, 11, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgb(236,90,110)";
      for (var k = -2; k <= 2; k++) { g.beginPath(); g.arc(k * 7, lado * 13, 2, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "rgb(250,245,230)";
      for (var d = -3; d <= 3; d++) { g.beginPath(); g.moveTo(d * 5 - 2.5, lado * 1); g.lineTo(d * 5 + 2.5, lado * 1); g.lineTo(d * 5, lado * -5); g.closePath(); g.fill(); }
      g.restore();
    });
    g.restore();
  }
  // niebla: velo blanquecino por fuera del círculo de visión
  function dibujarNiebla(g, t, cam, jx, jy, rad, ancho, alto, ahora) {
    var n = niebla(t);
    if (n.nivel <= 0) return;
    g.save();
    var grd = g.createRadialGradient(jx, jy, rad * 0.75, jx, jy, rad * 1.25);
    grd.addColorStop(0, "rgba(214,224,214,0)"); grd.addColorStop(1, "rgba(214,224,214," + (0.68 * n.nivel).toFixed(2) + ")");
    g.fillStyle = grd; g.fillRect(cam.x, cam.y, ancho, alto);
    // jirones que se mueven
    g.fillStyle = "rgba(235,240,235," + (0.18 * n.nivel).toFixed(2) + ")";
    for (var k = 0; k < 6; k++) {
      var x = cam.x + ((k * 230 + ahora / 40) % (ancho + 300)) - 150, y = cam.y + 60 + k * 90;
      g.beginPath(); g.ellipse(x, y, 140, 30, 0, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  // carretilla vista desde arriba (se dibuja ordenada con los personajes)
  function dibujarCarretilla(g, c, T, ahora) {
    var cx = c.x * T + 32, cy = c.y * T + 36, ang = { derecha: 0, abajo: Math.PI / 2, izquierda: Math.PI, arriba: -Math.PI / 2 }[c.dir];
    g.fillStyle = "rgba(0,0,0,0.28)"; g.beginPath(); g.ellipse(cx + 2, cy + 14, 30, 10, 0, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.fillStyle = "rgb(150,150,156)"; g.fillRect(14, -14, 22, 5); g.fillRect(14, 9, 22, 5);
    g.fillStyle = "rgb(60,60,66)"; g.fillRect(10, -18, 6, 36);
    g.fillStyle = "rgb(30,30,34)"; [[-20, -19], [4, -19], [-20, 13], [4, 13]].forEach(function (r) { g.fillRect(r[0], r[1], 12, 6); });
    g.fillStyle = "rgb(245,190,30)"; g.beginPath(); g.moveTo(-26, -16); g.lineTo(10, -16); g.lineTo(10, 16); g.lineTo(-26, 16); g.closePath(); g.fill();
    g.strokeStyle = "rgb(150,100,10)"; g.lineWidth = 2; g.stroke();
    g.fillStyle = "rgb(40,40,46)"; g.fillRect(-16, -11, 18, 22);
    g.fillStyle = Math.floor(ahora / 300) % 2 ? "rgb(255,140,20)" : "rgb(255,220,80)"; g.beginPath(); g.arc(-8, 0, 5, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  window.Peligros = { hay: hay, dano: dano, avisoEn: avisoEn, plantas: plantas, niebla: niebla, radio: radio,
    dibujarPlanta: dibujarPlanta, dibujarNiebla: dibujarNiebla, carretillas: carretillas, gruas: gruas, geiseres: geiseres, TEXTOS: TEXTOS,
    dibujarSuelo: dibujarSuelo, dibujarEncima: dibujarEncima, dibujarCarretilla: dibujarCarretilla };
})();
