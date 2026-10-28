// Puntuación y pantalla final: «Clasificación de combate» y «Rey fantasma».
(function () {
  "use strict";
  var EXTRAS = [3, 2, 1];
  function plural(n, s, p) { return n + " " + (n === 1 ? s : p); }
  function ordinal(i) { return (i + 1) + ".º"; }

  // jugadores y combate: tal como están en la base de datos. motivo: "ultimo" | "tiempo" | "profesor".
  function calcular(jugadores, combate, motivo) {
    var filas = Object.keys(jugadores || {}).filter(function (k) { return jugadores[k].nombre && jugadores[k].pj && combate && combate[k]; }).map(function (k) {
      var j = jugadores[k], c = combate[k], fantasma = j.estado === "fantasma";
      return { id: k, nombre: j.nombre, pj: j.pj, bajas: j.bajas || 0, vq: j.vidaQuitada || 0, vqf: j.vidaQuitadaFantasma || 0,
        fantasma: fantasma, vivo: !fantasma && c.vida > 0, vida: Math.max(0, c.vida || 0), cayo: j.horaEliminado || 0 };
    });
    filas.forEach(function (f) { f.total = f.vq + f.vqf; });
    // orden de supervivencia: primero los que siguen en pie (más vida, y si empatan, más vida quitada);
    // después los eliminados, del último en caer al primero
    var vivos = filas.filter(function (f) { return f.vivo; }).sort(function (a, b) { return b.vida - a.vida || b.total - a.total; });
    var caidos = filas.filter(function (f) { return !f.vivo; }).sort(function (a, b) { return b.cayo - a.cayo; });
    vivos.concat(caidos).forEach(function (f, i) { f.sup = i; f.extra = EXTRAS[i] || 0; f.puntos = f.bajas + f.extra; });

    var combateLista = filas.slice().sort(function (a, b) { return b.puntos - a.puntos || b.total - a.total || a.sup - b.sup; }).map(function (f) {
      return { id: f.id, nombre: f.nombre, pj: f.pj, puntos: f.puntos, bajas: f.bajas, extra: f.extra,
        texto: plural(f.bajas, "baja", "bajas") + (f.extra ? " + " + f.extra + " extra" : "") + (f.vivo ? " · en pie" : " · eliminado"),
        corto: plural(f.bajas, "baja", "bajas") + " + " + f.extra + " extra" };
    });
    var fantasmaLista = filas.slice().sort(function (a, b) { return b.vqf - a.vqf || b.total - a.total || a.sup - b.sup; }).map(function (f) {
      return { id: f.id, nombre: f.nombre, pj: f.pj, puntos: f.vqf, fantasma: f.fantasma,
        texto: f.fantasma ? "fantasma" : f.vivo ? "superviviente · no fue fantasma" : "eliminado · no llegó a fantasma" };
    });
    var sub = plural(filas.length, "jugador", "jugadores") + " · ";
    if (vivos.length === 1) sub += vivos[0].nombre + " ha aguantado hasta el final";
    else if (motivo === "tiempo") sub += "se acabó el tiempo con " + vivos.length + " en pie";
    else sub += "partida terminada con " + vivos.length + " en pie";
    return { subtitulo: sub, combate: combateLista, fantasma: fantasmaLista, filas: filas };
  }

  function retrato(pj, tam) {
    var cv = document.createElement("canvas"); cv.width = cv.height = tam * 2; cv.style.width = cv.style.height = tam + "px";
    Comun.retrato(cv, pj); return cv;
  }
  function el(tag, clase, texto) { var e = document.createElement(tag); if (clase) e.className = clase; if (texto !== undefined) e.textContent = texto; return e; }

  function panel(titulo, sub, lista, miId, fantasma, pie) {
    var p = el("div", "final-panel" + (fantasma ? " oscuro" : ""));
    var h = el("h2", null, titulo); p.appendChild(h);
    p.appendChild(el("p", "final-sub", sub));
    var podio = el("div", "podio");
    [1, 0, 2].forEach(function (i) {
      var f = lista[i]; if (!f) { podio.appendChild(el("div", "podio-hueco")); return; }
      var c = el("div", "podio-col p" + (i + 1) + (f.id === miId ? " yo" : ""));
      c.appendChild(retrato(fantasma ? "fantasma" : f.pj, i === 0 ? 110 : 90));
      var b = el("div", "podio-bloque");
      b.appendChild(el("div", "podio-nombre", f.nombre));
      b.appendChild(el("div", "podio-puntos", "★ " + f.puntos));
      b.appendChild(el("div", "podio-detalle", fantasma ? "de vida quitada" : f.corto));
      c.appendChild(b); c.appendChild(el("div", "podio-pos", ordinal(i)));
      podio.appendChild(c);
    });
    p.appendChild(podio);
    var ul = el("div", "final-lista");
    lista.slice(3).forEach(function (f, k) {
      var fila = el("div", "final-fila" + (f.id === miId ? " yo" : ""));
      fila.appendChild(el("span", "pos", String(k + 4)));
      fila.appendChild(retrato(fantasma ? "fantasma" : f.pj, 34));
      var n = el("span", "nom"); n.appendChild(el("b", null, (f.id === miId ? "Tú · " : "") + f.nombre)); n.appendChild(el("small", null, f.texto));
      fila.appendChild(n);
      fila.appendChild(el("span", "pts", (fantasma ? "" : "★ ") + f.puntos));
      ul.appendChild(fila);
    });
    p.appendChild(ul);
    p.appendChild(el("p", "final-pie", pie));
    return p;
  }

  function pintar(cont, r, miId) {
    cont.innerHTML = "";
    cont.appendChild(el("h1", "final-titulo", "¡Fin de la partida!"));
    cont.appendChild(el("p", "final-subtitulo", r.subtitulo));
    var dos = el("div", "final-dos");
    dos.appendChild(panel("Clasificación de combate", "Bajas + extras por sobrevivir (3 · 2 · 1)", r.combate, miId, false, "Empate: gana quien más vida haya quitado en total"));
    dos.appendChild(panel("Rey fantasma", "Vida quitada a los vivos siendo fantasma", r.fantasma, miId, true, "Solo cuenta la vida quitada a jugadores vivos · un fantasma no puede dar el golpe final"));
    cont.appendChild(dos);
    var firma = el("div", "firma"), logo = el("img"); logo.src = "img/logo_nico.png?v=13"; logo.alt = "Logo de Nico";
    firma.appendChild(logo); firma.appendChild(document.createTextNode("Nico Battle · un juego de Nico Games")); cont.appendChild(firma);
  }

  window.Final = { calcular: calcular, pintar: pintar };
})();
