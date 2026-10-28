// Carga y dibujo de las imágenes generadas por sprites/exportar_sprites.py.
(function () {
  "use strict";
  var D = window.SPRITES_DATOS;
  var PERSONAJES = {
    chispi: { nombre: "Chispi", tipo: "fuego", color: "#eb5a28" },
    ajolin: { nombre: "Ajolín", tipo: "agua", color: "#5aa0e6" },
    pinchito: { nombre: "Pinchito", tipo: "planta", color: "#5aa85a" },
    topito: { nombre: "Topito", tipo: "tierra", color: "#7a5a4c" }
  };
  var OBJETOS = ["vida", "escudo", "potenciador", "reloj", "capa"];
  var img = {};

  function cargar(listo) {
    var nombres = [];
    Object.keys(PERSONAJES).concat(["fantasma"]).forEach(function (p) {
      nombres.push("pj_" + p, "ef_" + p + "_debil", "ef_" + p + "_fuerte");
    });
    nombres.push("objetos", "escudo_puesto");
    var faltan = nombres.length;
    nombres.forEach(function (n) {
      var im = new Image();
      im.onload = im.onerror = function () { if (--faltan === 0) listo(); };
      im.src = "img/" + n + ".png";
      img[n] = im;
    });
  }

  var VISTA = { abajo: 0, arriba: 1, derecha: 2, izquierda: 2 };
  var COL = { paso0: 0, paso1: 1, paso2: 2, ataque: 3, herido: 4 };
  var TAM = 128; // tamaño en pantalla del marco del personaje (300 unidades)

  // Dibuja un personaje con los pies en (x, y).
  function personaje(g, pj, dir, cuadro, x, y, opc) {
    opc = opc || {};
    var s = D.celda, esc = opc.escala || 1, tam = TAM * esc;
    var sx = COL[cuadro] * s, sy = VISTA[dir] * s;
    g.save();
    if (opc.alfa !== undefined) g.globalAlpha = opc.alfa;
    g.translate(x, y);
    if (dir === "izquierda") g.scale(-1, 1);
    var dx = -D.pie[0] * tam, dy = -D.pie[1] * tam;
    g.drawImage(img["pj_" + pj], sx, sy, s, s, dx, dy, tam, tam);
    if (opc.escudo) g.drawImage(img.escudo_puesto, dx, dy, tam, tam);
    g.restore();
  }

  function icono(g, tipo, x, y, tam) {
    var i = OBJETOS.indexOf(tipo), s = D.icono;
    g.drawImage(img.objetos, i * s, 0, s, s, x, y, tam, tam);
  }

  // Efecto de ataque: (x, y) es el punto de salida; avanza "largo" px en dirección dir.
  // prog va de 0 a 1 (aparece, se mantiene y se desvanece).
  function efecto(g, pj, tipo, dir, x, y, largo, prog) {
    var clave = pj + "_" + tipo, d = D.efectos[clave], im = img["ef_" + clave];
    if (!d || !im.complete) return;
    var k = 64 / D.pxPorCasillaEfecto; // px de imagen -> px de pantalla
    var visible = Math.min(1, prog / 0.3) * largo;
    g.save();
    g.globalAlpha = prog > 0.7 ? Math.max(0, (1 - prog) / 0.3) : 1;
    g.translate(x, y);
    if (dir === "izquierda") g.scale(-1, 1);
    else if (dir === "abajo") g.rotate(Math.PI / 2);
    else if (dir === "arriba") g.rotate(-Math.PI / 2);
    g.beginPath(); g.rect(-d.ox * k, -d.oy * k, d.ox * k + visible, d.h * k); g.clip();
    g.drawImage(im, -d.ox * k, -d.oy * k, d.w * k, d.h * k);
    g.restore();
  }

  window.Sprites = { cargar: cargar, personaje: personaje, icono: icono, efecto: efecto, img: img, PERSONAJES: PERSONAJES, OBJETOS: OBJETOS, TAM: TAM };
})();
