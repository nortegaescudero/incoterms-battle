// Dibujo de los elementos de los mapas de ciudad (mapa de Arnedo). Lo usa Mapa.pintarSuelo.
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

  function pintar(g, m) {
    var hay = false;
    for (var y = 0; y < m.MH && !hay; y++) for (var x = 0; x < m.MW; x++) if ("AzaqkfEIOGZKXpF".indexOf(m.c(x, y)) >= 0) { hay = true; break; }
    if (!hay) return;
    for (y = 0; y < m.MH; y++) for (x = 0; x < m.MW; x++) suelo(g, m, x, y);
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
