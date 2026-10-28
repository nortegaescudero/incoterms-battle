// Dibujo de los elementos de los mapas de ciudad (Arnedo), del puerto y de la isla volcán. Lo usa Mapa.pintarSuelo.
//   Puerto: m muelle · M mar · J contenedores · Y buque · N almacén · r zona de grúa · V palés
//   Volcán: n ceniza · e arena · L lava · D basalto · v volcán · x géiser
//   A calzada · z paso de cebra · a acera · q plaza o patio · k pista deportiva · f campo de fútbol · F fuente
//   E edificio · C chalé · I instituto · O colegio · G guardería · Z plaza de toros · K coche · X cerro de arcilla · p piscina
(function () {
  "use strict";
  function rgb(a, al) { return al === undefined ? "rgb(" + a[0] + "," + a[1] + "," + a[2] + ")" : "rgba(" + a[0] + "," + a[1] + "," + a[2] + "," + al + ")"; }
  function rect(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  function rr(g, x, y, w, h, r, col, borde, gb) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    if (col) { g.fillStyle = col; g.fill(); }
    if (borde) { g.strokeStyle = borde; g.lineWidth = gb || 2; g.stroke(); }
  }

  // Grupos de casillas iguales que se tocan (cada edificio, pista, piscina…) con su rectángulo.
  function grupos(m, letra) {
    var visto = {}, lista = [];
    for (var y = 0; y < m.MH; y++) for (var x = 0; x < m.MW; x++) {
      if (m.c(x, y) !== letra || visto[x + "," + y]) continue;
      var pila = [[x, y]], g = { x0: x, y0: y, x1: x, y1: y };
      visto[x + "," + y] = true;
      while (pila.length) {
        var p = pila.pop();
        g.x0 = Math.min(g.x0, p[0]); g.x1 = Math.max(g.x1, p[0]); g.y0 = Math.min(g.y0, p[1]); g.y1 = Math.max(g.y1, p[1]);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var q = [p[0] + d[0], p[1] + d[1]], k = q[0] + "," + q[1];
          if (!visto[k] && m.c(q[0], q[1]) === letra) { visto[k] = true; pila.push(q); }
        });
      }
      lista.push(g);
    }
    return lista;
  }

  var ACERA = [204, 198, 188], ASFALTO = [88, 92, 102], PLAZA = [226, 208, 170];
  function esCalzada(k) { return k === "A" || k === "z"; }

  function suelo(g, m, x, y) {
    var T = m.T, X = x * T, Y = y * T, k = m.c(x, y), rnd = m.rnd;
    if (k === "A" || k === "z") {
      rect(g, X, Y, T + 0.5, T + 0.5, rgb(ASFALTO));
      for (var i = 0; i < 6; i++) rect(g, X + rnd() * 60, Y + rnd() * 60, 2, 2, "rgba(255,255,255,0.08)");
      if (k === "z") {   // paso de cebra: bandas blancas
        for (var b = 0; b < 4; b++) rect(g, X + 6, Y + 5 + b * 15, T - 12, 8, "rgb(236,236,232)");
      } else if (esCalzada(m.c(x, y - 1)) && !esCalzada(m.c(x, y + 1)) && !esCalzada(m.c(x, y - 2)) && esCalzada(m.c(x - 1, y)) && esCalzada(m.c(x + 1, y))) {
        rect(g, X + 10, Y - 2, 28, 4, "rgb(240,220,120)");   // línea discontinua del centro
      }
    } else if (k === "a" || k === "K") {
      rect(g, X, Y, T + 0.5, T + 0.5, rgb(ACERA));
      g.strokeStyle = "rgb(186,180,170)"; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(X + 32, Y); g.lineTo(X + 32, Y + T); g.moveTo(X, Y + 32); g.lineTo(X + T, Y + 32); g.stroke();
      // bordillo junto a la calzada
      if (esCalzada(m.c(x, y - 1))) rect(g, X, Y, T, 5, "rgb(150,146,140)");
      if (esCalzada(m.c(x, y + 1))) rect(g, X, Y + T - 5, T, 5, "rgb(150,146,140)");
      if (esCalzada(m.c(x - 1, y))) rect(g, X, Y, 5, T, "rgb(150,146,140)");
      if (esCalzada(m.c(x + 1, y))) rect(g, X + T - 5, Y, 5, T, "rgb(150,146,140)");
      if (k === "K") coche(g, X, Y, rnd);
    } else if (k === "q" || k === "F") {
      rect(g, X, Y, T + 0.5, T + 0.5, rgb(PLAZA));
      g.strokeStyle = "rgb(206,186,148)"; g.lineWidth = 1.5; g.beginPath();
      for (var f = 0; f < 4; f++) { g.moveTo(X, Y + f * 16); g.lineTo(X + T, Y + f * 16); var off = f % 2 ? 16 : 0; for (var c2 = 0; c2 < 3; c2++) { g.moveTo(X + off + c2 * 32, Y + f * 16); g.lineTo(X + off + c2 * 32, Y + f * 16 + 16); } }
      g.stroke();
      if (k === "F") fuente(g, X, Y);
    } else if (k === "X") {
      rect(g, X, Y, T + 0.5, T + 0.5, "rgb(196,104,64)");
      g.strokeStyle = "rgb(172,86,52)"; g.lineWidth = 3;
      for (var s = 0; s < 3; s++) { g.beginPath(); var yy = Y + 14 + s * 18 + (x % 2) * 4; g.moveTo(X, yy); g.quadraticCurveTo(X + 32, yy - 6, X + T, yy + 2); g.stroke(); }
      if (m.c(x, y + 1) !== "X") {   // cara del cerro con cuevas
        rect(g, X, Y + T - 22, T, 22, "rgb(150,70,42)");
        if ((x * 7 + y) % 3 === 0) { g.fillStyle = "rgb(60,30,24)"; g.beginPath(); g.ellipse(X + 32, Y + T - 2, 12, 16, 0, Math.PI, 0); g.fill(); }
      } else if (m.c(x, y - 1) !== "X") { // hierba en lo alto
        for (var h = 0; h < 4; h++) rect(g, X + 6 + h * 15, Y + 2, 6, 5, "rgb(110,150,70)");
      }
    }
  }

  function coche(g, X, Y, rnd) {
    var cols = [[214, 60, 60], [60, 110, 200], [240, 240, 236], [60, 60, 70], [230, 180, 50], [90, 160, 110]], col = cols[Math.floor(rnd() * cols.length)];
    g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(X + 33, Y + 50, 26, 8, 0, 0, Math.PI * 2); g.fill();
    rr(g, X + 6, Y + 16, 52, 32, 9, rgb(col), "rgb(40,40,48)", 2);
    rr(g, X + 18, Y + 20, 24, 24, 5, "rgb(150,190,220)", "rgb(40,40,48)", 1.5);
    rect(g, X + 22, Y + 20, 16, 24, rgb(col));
    rect(g, X + 8, Y + 14, 9, 4, "rgb(30,30,34)"); rect(g, X + 47, Y + 14, 9, 4, "rgb(30,30,34)");
    rect(g, X + 8, Y + 46, 9, 4, "rgb(30,30,34)"); rect(g, X + 47, Y + 46, 9, 4, "rgb(30,30,34)");
  }

  function fuente(g, X, Y) {
    g.fillStyle = "rgba(0,0,0,0.2)"; g.beginPath(); g.ellipse(X + 33, Y + 40, 28, 14, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgb(176,166,154)"; g.beginPath(); g.ellipse(X + 32, Y + 34, 28, 22, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgb(90,170,230)"; g.beginPath(); g.ellipse(X + 32, Y + 33, 21, 15, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgb(150,140,130)"; g.fillRect(X + 28, Y + 14, 8, 20);
    g.fillStyle = "rgb(200,235,255)"; g.beginPath(); g.ellipse(X + 32, Y + 12, 7, 5, 0, 0, Math.PI * 2); g.fill();
  }

  // ---------- zonas grandes: pistas, campo, piscinas ----------
  function pista(g, m, z, campo) {
    var T = m.T, X = z.x0 * T, Y = z.y0 * T, w = (z.x1 - z.x0 + 1) * T, h = (z.y1 - z.y0 + 1) * T;
    if (campo) for (var i = 0; i * 32 < w; i++) rect(g, X + i * 32, Y, 32, h, i % 2 ? "rgb(84,160,74)" : "rgb(96,176,84)");
    else rect(g, X, Y, w, h, "rgb(78,128,190)");
    g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 3;
    g.strokeRect(X + 8, Y + 8, w - 16, h - 16);
    g.beginPath(); g.moveTo(X + w / 2, Y + 8); g.lineTo(X + w / 2, Y + h - 8); g.stroke();
    g.beginPath(); g.arc(X + w / 2, Y + h / 2, Math.min(w, h) / 6, 0, Math.PI * 2); g.stroke();
    // porterías o canastas en los extremos
    [X + 8, X + w - 8].forEach(function (px, i) {
      g.strokeRect(i ? px - 22 : px, Y + h / 2 - 26, 22, 52);
      if (!campo) { g.fillStyle = "rgb(240,120,40)"; g.beginPath(); g.arc(i ? px - 10 : px + 10, Y + h / 2, 6, 0, Math.PI * 2); g.fill(); }
    });
  }
  function piscina(g, m, z) {
    var T = m.T, X = z.x0 * T, Y = z.y0 * T, w = (z.x1 - z.x0 + 1) * T, h = (z.y1 - z.y0 + 1) * T;
    rr(g, X + 4, Y + 4, w - 8, h - 8, 6, "rgb(250,250,246)");
    rr(g, X + 10, Y + 10, w - 20, h - 20, 4, "rgb(90,190,235)");
    g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 1;
    for (var i = 1; i * 12 < w - 20; i++) { g.beginPath(); g.moveTo(X + 10 + i * 12, Y + 10); g.lineTo(X + 10 + i * 12, Y + h - 10); g.stroke(); }
    for (var j = 1; j * 12 < h - 20; j++) { g.beginPath(); g.moveTo(X + 10, Y + 10 + j * 12); g.lineTo(X + w - 10, Y + 10 + j * 12); g.stroke(); }
    if (h > T) for (var c = 1; c < 3; c++) {   // corcheras
      var cy = Y + 10 + (h - 20) * c / 3; g.setLineDash([6, 4]); g.strokeStyle = "rgb(230,70,70)"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(X + 12, cy); g.lineTo(X + w - 12, cy); g.stroke(); g.setLineDash([]);
    }
    g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 2;
    g.beginPath(); g.ellipse(X + w * 0.35, Y + h * 0.4, 14, 5, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  }

  // ---------- edificios con tejado y fachada (pseudo 3D) ----------
  var ESTILOS = {
    E: { tejados: [[176, 84, 62], [160, 96, 74], [188, 108, 78]], fachadas: [[230, 214, 180], [214, 180, 142], [236, 224, 200], [222, 196, 160]], ventana: [92, 112, 140] },
    C: { tejados: [[204, 88, 64]], fachadas: [[246, 242, 234]], ventana: [92, 112, 140], contraventana: [70, 140, 90] },
    I: { tejados: [[150, 154, 162]], fachadas: [[178, 98, 72]], ventana: [150, 200, 230], plano: true },
    O: { tejados: [[156, 158, 164]], fachadas: [[236, 214, 150]], ventana: [120, 160, 200], plano: true },
    G: { tejados: [[226, 120, 100]], fachadas: [[250, 228, 196]], ventana: [120, 170, 210] }
  };
  function edificio(g, m, z, letra, n) {
    var T = m.T, est = ESTILOS[letra], X = z.x0 * T, Y = z.y0 * T, w = (z.x1 - z.x0 + 1) * T, h = (z.y1 - z.y0 + 1) * T;
    var tej = est.tejados[n % est.tejados.length], fac = est.fachadas[n % est.fachadas.length];
    var F = Math.min(52, h * 0.5);         // alto de la fachada
    var yF = Y + h - F;
    // sombra en el suelo de debajo
    g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(X + 4, Y + h, w, 10);
    // tejado
    if (est.plano) {
      rect(g, X, Y - 6, w, yF - Y + 6, rgb(tej));
      g.strokeStyle = "rgb(200,202,208)"; g.lineWidth = 4; g.strokeRect(X + 2, Y - 4, w - 4, yF - Y + 4);
      for (var a = 0; a < Math.floor(w / 96); a++) { rect(g, X + 26 + a * 96, Y + 8, 22, 16, "rgb(120,124,132)"); rect(g, X + 28 + a * 96, Y + 10, 18, 12, "rgb(176,180,186)"); }
    } else {
      var cima = Y - 6 + (yF - Y + 6) * 0.45;
      rect(g, X, Y - 6, w, cima - Y + 6, rgb([Math.min(255, tej[0] + 22), Math.min(255, tej[1] + 18), Math.min(255, tej[2] + 14)]));
      rect(g, X, cima, w, yF - cima, rgb(tej));
      g.strokeStyle = "rgba(90,40,30,0.35)"; g.lineWidth = 1.5;
      for (var t = 0; t * 10 < w; t++) { g.beginPath(); g.moveTo(X + t * 10, Y - 6); g.lineTo(X + t * 10, yF); g.stroke(); }
      rect(g, X, cima - 2, w, 4, "rgb(120,60,44)");
    }
    g.strokeStyle = "rgba(60,30,20,0.6)"; g.lineWidth = 2; g.strokeRect(X + 1, Y - 5, w - 2, yF - Y + 4);
    // fachada con ventanas y puerta
    rect(g, X, yF, w, F, rgb(fac));
    rect(g, X, yF, w, 4, "rgba(0,0,0,0.18)");
    var vw = letra === "I" || letra === "O" ? 22 : 12, paso = letra === "I" || letra === "O" ? 30 : 20;
    var puerta = X + w / 2;
    for (var vx = X + 10; vx + vw < X + w - 6; vx += paso) {
      if (Math.abs(vx + vw / 2 - puerta) < 16) continue;
      rect(g, vx, yF + 12, vw, 14, rgb(est.ventana));
      rect(g, vx, yF + 12, vw, 3, "rgba(255,255,255,0.5)");
      if (est.contraventana) { rect(g, vx - 3, yF + 12, 3, 14, rgb(est.contraventana)); rect(g, vx + vw, yF + 12, 3, 14, rgb(est.contraventana)); }
    }
    rect(g, puerta - 10, yF + F - 26, 20, 26, letra === "I" || letra === "O" ? "rgb(150,200,230)" : "rgb(110,72,44)");
    g.strokeStyle = "rgba(0,0,0,0.4)"; g.lineWidth = 1.5; g.strokeRect(puerta - 10, yF + F - 26, 20, 26);
    g.strokeStyle = "rgba(60,30,20,0.6)"; g.lineWidth = 2; g.strokeRect(X + 1, yF, w - 2, F - 1);
  }

  function plazaToros(g, m, z) {
    var T = m.T, X = z.x0 * T, Y = z.y0 * T, w = (z.x1 - z.x0 + 1) * T, h = (z.y1 - z.y0 + 1) * T, cx = X + w / 2, cy = Y + h / 2;
    g.fillStyle = "rgba(0,0,0,0.22)"; g.beginPath(); g.ellipse(cx + 6, cy + 10, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgb(214,176,128)"; g.beginPath(); g.ellipse(cx, cy, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgb(150,100,60)"; g.lineWidth = 3; g.stroke();
    // arcos alrededor
    for (var i = 0; i < 28; i++) {
      var a = i * Math.PI * 2 / 28, ax = cx + Math.cos(a) * (w / 2 - 14), ay = cy + Math.sin(a) * (h / 2 - 14);
      g.fillStyle = "rgb(150,96,58)"; g.beginPath(); g.ellipse(ax, ay, 5, 7, a, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "rgb(190,150,104)"; g.beginPath(); g.ellipse(cx, cy, w / 2 - 28, h / 2 - 28, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgb(170,40,40)"; g.beginPath(); g.ellipse(cx, cy, w / 2 - 44, h / 2 - 44, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgb(236,206,150)"; g.beginPath(); g.ellipse(cx, cy, w / 2 - 50, h / 2 - 50, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, w / 6, h / 6, 0, 0, Math.PI * 2); g.stroke();
  }

  // ---------- carteles ----------
  function cartel(g, m, ct) {
    var T = m.T, x = ct.x * T + T / 2, y = ct.y * T;
    g.font = "bold " + (ct.tipo === "fachada" ? 15 : 13) + "px 'Segoe UI', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    var w = g.measureText(ct.t).width + 18, h = ct.tipo === "fachada" ? 22 : 20;
    if (ct.tipo === "agua") { g.fillStyle = "rgba(255,255,255,0.85)"; g.fillText(ct.t, x, y); return; }
    var fondo = ct.tipo === "fachada" ? "rgb(36,78,60)" : ct.tipo === "calle" ? "rgb(36,70,150)" : "rgba(60,48,40,0.75)";
    rr(g, x - w / 2, y - h / 2, w, h, 5, fondo, "rgb(250,250,250)", 2);
    g.fillStyle = "rgb(255,255,255)"; g.fillText(ct.t, x, y + 1);
  }

  // ---------- pantano: suelo musgoso, barro, agua turbia y pasarelas ----------
  function suelo3(g, m, x, y) {
    var T = m.T, X = x * T, Y = y * T, k = m.c(x, y), rnd = m.rnd;
    function agua(a, b) { var q = m.c(a, b); return q === "w" || q === "d"; }
    if ("sctTRU".indexOf(k) >= 0) {
      rect(g, X, Y, T + 0.5, T + 0.5, (x + y) % 2 ? "rgb(86,116,76)" : "rgb(92,122,80)");
      for (var i = 0; i < 4; i++) { g.fillStyle = "rgba(60,90,56,0.5)"; g.beginPath(); g.ellipse(X + 6 + rnd() * 52, Y + 6 + rnd() * 52, 4 + rnd() * 5, 2 + rnd() * 3, 0, 0, Math.PI * 2); g.fill(); }
      var q = rnd();
      if (k === "s" && q < 0.08) {   // setas
        rect(g, X + 30, Y + 34, 4, 8, "rgb(230,220,200)");
        g.fillStyle = "rgb(180,60,60)"; g.beginPath(); g.ellipse(X + 32, Y + 34, 9, 6, 0, Math.PI, 0); g.fill();
        g.fillStyle = "rgb(250,240,230)"; g.beginPath(); g.arc(X + 29, Y + 31, 1.6, 0, Math.PI * 2); g.arc(X + 35, Y + 32, 1.6, 0, Math.PI * 2); g.fill();
      } else if (k === "s" && q < 0.3) {
        g.strokeStyle = "rgb(70,100,62)"; g.lineWidth = 2;
        [[16, 42], [42, 24]].forEach(function (p) { g.beginPath(); g.moveTo(X + p[0], Y + p[1]); g.lineTo(X + p[0] - 3, Y + p[1] - 8); g.moveTo(X + p[0], Y + p[1]); g.lineTo(X + p[0] + 3, Y + p[1] - 8); g.stroke(); });
      }
    } else if (k === "g") {   // juncos: hierba alta del pantano
      rect(g, X, Y, T + 0.5, T + 0.5, (x + y) % 2 ? "rgb(80,108,70)" : "rgb(86,114,74)");
      g.lineCap = "round";
      for (var n = 0; n < 7; n++) {
        var jx = X + 5 + (n % 4) * 15 + rnd() * 5, jy = Y + 30 + Math.floor(n / 4) * 26;
        g.strokeStyle = "rgb(120,140,70)"; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(jx, jy + 10); g.lineTo(jx - 2, jy - 14); g.moveTo(jx + 3, jy + 10); g.lineTo(jx + 6, jy - 8); g.stroke();
        if (n % 2 === 0) { g.strokeStyle = "rgb(120,78,44)"; g.lineWidth = 5; g.beginPath(); g.moveTo(jx - 2, jy - 12); g.lineTo(jx - 2, jy - 20); g.stroke(); }
      }
    } else if (k === "o") {
      rect(g, X, Y, T + 0.5, T + 0.5, "rgb(112,86,58)");
      for (var j = 0; j < 3; j++) { g.fillStyle = "rgba(76,56,36,0.6)"; g.beginPath(); g.ellipse(X + 10 + rnd() * 44, Y + 10 + rnd() * 44, 9 + rnd() * 8, 5 + rnd() * 4, 0, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = "rgba(150,120,86,0.8)"; g.lineWidth = 2;
      for (var b = 0; b < 2; b++) { g.beginPath(); g.arc(X + 12 + rnd() * 40, Y + 12 + rnd() * 40, 3 + rnd() * 3, 0, Math.PI * 2); g.stroke(); }
      if (rnd() < 0.3) { g.strokeStyle = "rgba(70,50,32,0.7)"; g.lineWidth = 3; g.beginPath(); g.moveTo(X + 14, Y + 40); g.quadraticCurveTo(X + 30, Y + 30, X + 48, Y + 42); g.stroke(); }
    } else if (k === "w" || k === "d") {
      rect(g, X, Y, T + 0.5, T + 0.5, "rgb(58,92,82)");
      g.fillStyle = "rgb(48,78,70)";
      if (!agua(x, y - 1)) { rect(g, X, Y, T, 10, "rgb(70,58,44)"); rect(g, X, Y + 10, T, 4, "rgb(46,74,66)"); }
      if (!agua(x - 1, y)) rect(g, X, Y, 6, T, "rgb(70,58,44)");
      if (!agua(x + 1, y)) rect(g, X + T - 6, Y, 6, T, "rgb(70,58,44)");
      if (!agua(x, y + 1)) rect(g, X, Y + T - 5, T, 5, "rgb(70,58,44)");
      if (k === "w") {
        var r = rnd();
        if (r < 0.3) {   // nenúfar
          var lx = X + 16 + rnd() * 32, ly = Y + 18 + rnd() * 28;
          g.fillStyle = "rgb(78,146,74)"; g.beginPath(); g.moveTo(lx, ly); g.arc(lx, ly, 10, 0.4, Math.PI * 2 - 0.1); g.closePath(); g.fill();
          if (rnd() < 0.4) { g.fillStyle = "rgb(240,170,200)"; g.beginPath(); g.arc(lx - 2, ly - 1, 3.5, 0, Math.PI * 2); g.fill(); }
        } else if (r < 0.55) { g.strokeStyle = "rgba(150,190,170,0.6)"; g.lineWidth = 2; g.beginPath(); g.ellipse(X + 20 + rnd() * 24, Y + 24 + rnd() * 20, 10, 4, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      } else {   // pasarela de tablones
        var horiz = m.c(x - 1, y) === "d" || m.c(x + 1, y) === "d" || (!agua(x, y - 1) && !agua(x, y + 1));
        g.fillStyle = "rgba(0,0,0,0.25)";
        if (horiz) g.fillRect(X, Y + 18, T, 34); else g.fillRect(X + 16, Y, 36, T);
        for (var s = 0; s < 4; s++) {
          var col = s % 2 ? "rgb(150,110,70)" : "rgb(166,124,80)";
          if (horiz) rect(g, X + s * 16 + 1, Y + 12, 14, 36, col); else rect(g, X + 12, Y + s * 16 + 1, 36, 14, col);
        }
        g.fillStyle = "rgb(96,70,44)";
        if (horiz) { g.fillRect(X, Y + 12, T, 3); g.fillRect(X, Y + 45, T, 3); } else { g.fillRect(X + 12, Y, 3, T); g.fillRect(X + 45, Y, 3, T); }
      }
    }
  }

  // ---------- puerto e isla volcán: suelos ----------
  function suelo2(g, m, x, y) {
    var T = m.T, X = x * T, Y = y * T, k = m.c(x, y), rnd = m.rnd;
    if (k === "m" || k === "r" || k === "V") {
      rect(g, X, Y, T + 0.5, T + 0.5, "rgb(176,178,182)");
      g.strokeStyle = "rgb(160,162,168)"; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(X + 32, Y); g.lineTo(X + 32, Y + T); g.moveTo(X, Y + 32); g.lineTo(X + T, Y + 32); g.stroke();
      if (rnd() < 0.15) { g.fillStyle = "rgba(60,60,70,0.12)"; g.beginPath(); g.ellipse(X + 10 + rnd() * 44, Y + 10 + rnd() * 44, 10, 6, 0, 0, Math.PI * 2); g.fill(); }
      if (m.c(x, y + 1) === "M") { rect(g, X, Y + T - 10, T, 10, "rgb(120,122,128)"); rect(g, X, Y + T - 16, T, 4, "rgb(240,200,40)"); }
      if (k === "V") {   // palés con cajas
        g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(X + 8, Y + 48, 52, 8);
        for (var s = 0; s < 3; s++) rect(g, X + 6, Y + 40 + s * 5, 52, 3, "rgb(170,130,80)");
        rr(g, X + 8, Y + 12, 24, 26, 2, "rgb(206,166,112)", "rgb(140,100,60)", 1.5); rr(g, X + 32, Y + 16, 24, 22, 2, "rgb(196,156,104)", "rgb(140,100,60)", 1.5);
        rr(g, X + 18, Y + 2, 26, 14, 2, "rgb(214,176,124)", "rgb(140,100,60)", 1.5);
      }
    } else if (k === "M" || k === "Y") {
      rect(g, X, Y, T + 0.5, T + 0.5, "rgb(36,86,140)");
      if (k === "M") {
        g.strokeStyle = "rgba(140,190,235,0.6)"; g.lineWidth = 2;
        if (rnd() < 0.5) { g.beginPath(); g.ellipse(X + 16 + rnd() * 32, Y + 16 + rnd() * 32, 12, 4, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
        if (m.c(x, y - 1) === "m") rect(g, X, Y, T, 8, "rgba(0,0,0,0.25)");
      }
    } else if (k === "n" || k === "x" || k === "D" || k === "v") {
      rect(g, X, Y, T + 0.5, T + 0.5, "rgb(96,84,80)");
      for (var i = 0; i < 7; i++) rect(g, X + rnd() * 60, Y + rnd() * 60, 3, 3, rnd() < 0.5 ? "rgb(74,64,62)" : "rgb(118,104,98)");
      if (k === "x") {   // grietas del géiser
        g.strokeStyle = "rgb(40,30,28)"; g.lineWidth = 4;
        g.beginPath(); g.moveTo(X + 8, Y + 30); g.lineTo(X + 24, Y + 26); g.lineTo(X + 32, Y + 34); g.lineTo(X + 44, Y + 22); g.lineTo(X + 58, Y + 30);
        g.moveTo(X + 32, Y + 34); g.lineTo(X + 28, Y + 52); g.moveTo(X + 24, Y + 26); g.lineTo(X + 20, Y + 10); g.stroke();
        g.strokeStyle = "rgb(240,120,40)"; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = "rgb(40,24,20)"; g.beginPath(); g.ellipse(X + 32, Y + 32, 9, 6, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "rgb(250,140,50)"; g.beginPath(); g.ellipse(X + 32, Y + 32, 4, 2.5, 0, 0, Math.PI * 2); g.fill();
      }
      if (k === "D") {   // roca de basalto
        g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(X + 34, Y + 54, 26, 7, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "rgb(56,54,62)"; g.beginPath(); g.moveTo(X + 8, Y + 52); g.lineTo(X + 10, Y + 24); g.lineTo(X + 26, Y + 8); g.lineTo(X + 46, Y + 10); g.lineTo(X + 58, Y + 30); g.lineTo(X + 54, Y + 54); g.closePath(); g.fill();
        g.fillStyle = "rgb(92,90,100)"; g.beginPath(); g.moveTo(X + 10, Y + 24); g.lineTo(X + 26, Y + 8); g.lineTo(X + 46, Y + 10); g.lineTo(X + 36, Y + 26); g.closePath(); g.fill();
      }
    } else if (k === "e") {
      rect(g, X, Y, T + 0.5, T + 0.5, "rgb(232,212,160)");
      for (var j = 0; j < 6; j++) rect(g, X + rnd() * 60, Y + rnd() * 60, 2, 2, "rgb(206,184,130)");
    } else if (k === "L") {
      rect(g, X, Y, T + 0.5, T + 0.5, "rgb(226,86,28)");
      for (var b = 0; b < 4; b++) { g.fillStyle = "rgb(255,170,60)"; g.beginPath(); g.ellipse(X + 8 + rnd() * 48, Y + 8 + rnd() * 48, 8 + rnd() * 6, 4 + rnd() * 3, rnd() * 3, 0, Math.PI * 2); g.fill(); }
      for (var d = 0; d < 2; d++) { g.fillStyle = "rgb(120,40,22)"; g.beginPath(); g.ellipse(X + 8 + rnd() * 48, Y + 8 + rnd() * 48, 7, 4, rnd() * 3, 0, Math.PI * 2); g.fill(); }
      var borde = "rgb(70,26,18)";
      if (m.c(x, y - 1) !== "L") rect(g, X, Y, T, 5, borde);
      if (m.c(x, y + 1) !== "L") rect(g, X, Y + T - 5, T, 5, borde);
      if (m.c(x - 1, y) !== "L") rect(g, X, Y, 5, T, borde);
      if (m.c(x + 1, y) !== "L") rect(g, X + T - 5, Y, 5, T, borde);
    }
  }

  var COLORES_CONT = [[200, 62, 50], [40, 110, 190], [60, 150, 80], [232, 140, 40], [120, 122, 134], [150, 72, 150]];
  function contenedores(g, m, z, n) {
    var T = m.T, X = z.x0 * T, Y = z.y0 * T, w = (z.x1 - z.x0 + 1) * T, h = (z.y1 - z.y0 + 1) * T;
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(X + 6, Y + h, w, 10);
    // varios contenedores en fila, cada uno de un color
    var cuantos = Math.max(1, Math.round(w / 128)), lw = w / cuantos, cara = 26;
    for (var i = 0; i < cuantos; i++) {
      var col = COLORES_CONT[(n * 3 + i) % COLORES_CONT.length], cx = X + i * lw;
      rect(g, cx + 2, Y - 4, lw - 4, h - cara + 4, rgb([Math.min(255, col[0] + 25), Math.min(255, col[1] + 25), Math.min(255, col[2] + 25)]));
      rect(g, cx + 2, Y + h - cara, lw - 4, cara, rgb(col));
      g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 2;
      for (var r2 = cx + 10; r2 < cx + lw - 6; r2 += 8) { g.beginPath(); g.moveTo(r2, Y + h - cara + 3); g.lineTo(r2, Y + h - 3); g.stroke(); }
      for (var r3 = Y + 6; r3 < Y + h - cara - 4; r3 += 16) { g.beginPath(); g.moveTo(cx + 8, r3); g.lineTo(cx + lw - 8, r3); g.stroke(); }
      g.strokeStyle = "rgba(40,20,20,0.6)"; g.lineWidth = 2; g.strokeRect(cx + 2, Y - 4, lw - 4, h + 4);
      if ((n + i) % 5 === 2) { g.font = "bold 16px 'Segoe UI', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "rgba(255,255,255,0.85)"; g.fillText("NICO LINES", cx + lw / 2, Y + h - cara / 2); }
    }
  }
  function buque(g, m, z) {
    var T = m.T, X0 = z.x0 * T, Y0 = z.y0 * T, X1 = (z.x1 + 1) * T, Y1 = (z.y1 + 1) * T, ym = (Y0 + Y1) / 2;
    g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse((X0 + X1) / 2 + 10, ym + 12, (X1 - X0) / 2, (Y1 - Y0) / 2 - 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgb(150,40,40)"; g.beginPath(); g.moveTo(X0 + 40, Y0 + 8); g.lineTo(X1 - 140, Y0 + 8); g.lineTo(X1 - 6, ym); g.lineTo(X1 - 140, Y1 - 8); g.lineTo(X0 + 40, Y1 - 8);
    g.quadraticCurveTo(X0 + 4, Y1 - 8, X0 + 4, ym); g.quadraticCurveTo(X0 + 4, Y0 + 8, X0 + 40, Y0 + 8); g.fill();
    g.fillStyle = "rgb(96,100,110)"; g.beginPath(); g.moveTo(X0 + 46, Y0 + 22); g.lineTo(X1 - 150, Y0 + 22); g.lineTo(X1 - 40, ym); g.lineTo(X1 - 150, Y1 - 22); g.lineTo(X0 + 46, Y1 - 22);
    g.quadraticCurveTo(X0 + 20, Y1 - 22, X0 + 20, ym); g.quadraticCurveTo(X0 + 20, Y0 + 22, X0 + 46, Y0 + 22); g.fill();
    // puente de mando y contenedores en cubierta
    rr(g, X0 + 50, Y0 + 34, 120, Y1 - Y0 - 68, 8, "rgb(240,240,236)", "rgb(90,90,100)", 2);
    for (var v = 0; v < 4; v++) rect(g, X0 + 64 + v * 26, Y0 + 50, 16, 12, "rgb(120,170,210)");
    rect(g, X0 + 100, Y0 + 90, 26, 40, "rgb(220,80,60)");
    var alto = (Y1 - Y0 - 72) / 3;
    for (var cx = X0 + 190, i = 0; cx < X1 - 190; cx += 70, i++)
      for (var fila = 0; fila < 3; fila++) rr(g, cx, Y0 + 36 + fila * alto, 64, alto - 4, 3, rgb(COLORES_CONT[(i + fila) % COLORES_CONT.length]), "rgba(0,0,0,0.35)", 1.5);
    g.font = "bold 22px 'Segoe UI', Arial, sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = "rgb(255,255,255)";
    g.fillText("NICO EXPRESS", X0 + 190, Y1 - 15);
  }
  function almacen(g, m, z) {
    var T = m.T, X = z.x0 * T, Y = z.y0 * T, w = (z.x1 - z.x0 + 1) * T, h = (z.y1 - z.y0 + 1) * T, F = 46;
    g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(X + 4, Y + h, w, 10);
    for (var i = 0; i * 12 < w; i++) rect(g, X + i * 12, Y - 4, 12, h - F + 4, i % 2 ? "rgb(150,160,176)" : "rgb(136,146,162)");
    rect(g, X, Y + h - F, w, F, "rgb(196,200,208)");
    for (var p = X + 24; p + 64 < X + w; p += 150) {
      rect(g, p, Y + h - F + 10, 64, F - 10, "rgb(90,96,108)");
      g.strokeStyle = "rgba(255,255,255,0.25)"; g.lineWidth = 1.5;
      for (var l = Y + h - F + 16; l < Y + h; l += 6) { g.beginPath(); g.moveTo(p, l); g.lineTo(p + 64, l); g.stroke(); }
    }
    g.strokeStyle = "rgba(40,40,50,0.6)"; g.lineWidth = 2; g.strokeRect(X + 1, Y - 3, w - 2, h + 2);
  }
  function zonaGrua(g, m, z) {
    var T = m.T, X = z.x0 * T, Y = z.y0 * T, w = (z.x1 - z.x0 + 1) * T, h = (z.y1 - z.y0 + 1) * T;
    g.save(); g.beginPath(); g.rect(X, Y, w, h); g.rect(X + 12, Y + 12, w - 24, h - 24); g.clip("evenodd");
    for (var i = -h, n = 0; i < w + h; i += 20, n++) { g.fillStyle = n % 2 ? "rgb(30,30,30)" : "rgb(245,200,30)"; g.beginPath(); g.moveTo(X + i, Y); g.lineTo(X + i + 20, Y); g.lineTo(X + i + 20 - h, Y + h); g.lineTo(X + i - h, Y + h); g.closePath(); g.fill(); }
    g.restore();
    rect(g, X + 12, Y + 12, w - 24, h - 24, "rgba(245,200,30,0.18)");
  }
  function volcan(g, m, z) {
    var T = m.T, X = z.x0 * T, Y = z.y0 * T, w = (z.x1 - z.x0 + 1) * T, h = (z.y1 - z.y0 + 1) * T, cx = X + w / 2, cy = Y + h / 2;
    g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(cx + 10, cy + 16, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill();
    [[1, "rgb(104,76,66)"], [0.82, "rgb(122,90,76)"], [0.62, "rgb(140,104,86)"], [0.42, "rgb(118,86,72)"]].forEach(function (a) {
      g.fillStyle = a[1]; g.beginPath(); g.ellipse(cx, cy + (1 - a[0]) * h * 0.12, w / 2 * a[0], h / 2 * a[0], 0, 0, Math.PI * 2); g.fill();
    });
    g.strokeStyle = "rgb(240,110,30)"; g.lineWidth = 8; g.lineCap = "round";
    [[-0.2, 0.9], [0.1, 1], [0.3, 0.85], [-0.35, 0.7]].forEach(function (r) {
      g.beginPath(); g.moveTo(cx + r[0] * 40, cy - h * 0.08); g.quadraticCurveTo(cx + r[0] * w * 0.4, cy + h * 0.2, cx + r[0] * w * 0.5, cy + h / 2 * r[1]); g.stroke();
    });
    g.fillStyle = "rgb(60,30,24)"; g.beginPath(); g.ellipse(cx, cy - h * 0.06, w * 0.16, h * 0.12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgb(250,120,40)"; g.beginPath(); g.ellipse(cx, cy - h * 0.06, w * 0.11, h * 0.08, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgb(255,210,90)"; g.beginPath(); g.ellipse(cx - 6, cy - h * 0.08, w * 0.05, h * 0.035, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(90,90,96,0.55)";
    [[0, -0.3, 34], [20, -0.42, 26], [-16, -0.5, 22]].forEach(function (s) { g.beginPath(); g.arc(cx + s[0], cy + h * s[1], s[2], 0, Math.PI * 2); g.fill(); });
  }
  // carriles de las carretillas pintados en el suelo (avisan de por dónde pasan)
  function carriles(g, m) {
    var T = m.T;
    ((m.peligros && m.peligros.carretillas) || []).forEach(function (car) {
      var pts = car.ruta.concat([car.ruta[0]]);
      g.strokeStyle = "rgba(245,200,30,0.75)"; g.lineWidth = 4; g.setLineDash([14, 12]);
      g.beginPath();
      pts.forEach(function (p, i) { var px = p[0] * T + 32, py = p[1] * T + 32; if (i) g.lineTo(px, py); else g.moveTo(px, py); });
      g.stroke(); g.setLineDash([]);
    });
  }

  function pintar(g, m) {
    var hay = false;
    for (var y = 0; y < m.MH && !hay; y++) for (var x = 0; x < m.MW; x++) if ("AzaqkfEIOGZKXpFmMJYNrVneLDvxwod".indexOf(m.c(x, y)) >= 0) { hay = true; break; }
    if (!hay) return;
    var pantano = false;
    for (y = 0; y < m.MH && !pantano; y++) for (x = 0; x < m.MW; x++) if (m.c(x, y) === "w") { pantano = true; break; }
    for (y = 0; y < m.MH; y++) for (x = 0; x < m.MW; x++) { suelo(g, m, x, y); suelo2(g, m, x, y); if (pantano) suelo3(g, m, x, y); }
    carriles(g, m);
    grupos(m, "r").forEach(function (z) { zonaGrua(g, m, z); });
    grupos(m, "Y").forEach(function (z) { buque(g, m, z); });
    grupos(m, "v").forEach(function (z) { volcan(g, m, z); });
    var pilas = [];
    grupos(m, "J").forEach(function (z, i) { pilas.push({ z: z, f: contenedores, n: i }); });
    grupos(m, "N").forEach(function (z, i) { pilas.push({ z: z, f: almacen, n: i }); });
    pilas.sort(function (a, b) { return a.z.y1 - b.z.y1; }).forEach(function (e) { e.f(g, m, e.z, e.n); });
    grupos(m, "k").forEach(function (z) { pista(g, m, z, false); });
    grupos(m, "f").forEach(function (z) { pista(g, m, z, true); });
    grupos(m, "p").forEach(function (z) { piscina(g, m, z); });
    // de arriba abajo, para que cada fachada tape lo de detrás
    var todos = [];
    "ECIOG".split("").forEach(function (L) { grupos(m, L).forEach(function (z, i) { todos.push({ z: z, L: L, n: i }); }); });
    todos.sort(function (a, b) { return a.z.y1 - b.z.y1; });
    todos.forEach(function (e) { edificio(g, m, e.z, e.L, e.n); });
    grupos(m, "Z").forEach(function (z) { plazaToros(g, m, z); });
    (m.carteles || []).forEach(function (ct) { cartel(g, m, ct); });
  }

  window.Ciudad = { pintar: pintar };
})();
