// Motor del juego: mapa, movimiento, preguntas cortas, ejercicios grandes, ataques, objetos, fantasmas y HUD.
// No sabe si juega en red o en práctica: todo lo compartido pasa por «red» (un adaptador)
// y lo que decide el anfitrión (ejercicios, pausa, calendario) llega con Motor.ejercicio/pausa/calendario.
(function () {
  "use strict";
  var T = Mapa.T, VW = 15, VH = 10, ANCHO = VW * T, ALTO = VH * T;
  var PASO_MS = 250, RADIO = 4, VIDA_MAX = 30;
  // tiempos de movimiento (ms): por acierto, por ejercicio grande, para huir tras quitar vida y del objeto reloj
  var TIEMPO = { pregunta: 30000, ejercicio: 90000, huidaDebil: 30000, huidaFuerte: 45000, reloj: 30000 };
  var VENTAJA = { fuego: "planta", planta: "tierra", tierra: "agua", agua: "fuego" };
  var DIRS = { arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0] };
  var TECLAS = { ArrowUp: "arriba", KeyW: "arriba", ArrowDown: "abajo", KeyS: "abajo", ArrowLeft: "izquierda", KeyA: "izquierda", ArrowRight: "derecha", KeyD: "derecha" };

  var HTML =
    '<div id="hudArriba"><canvas id="iconoPj" width="96" height="96"></canvas><div id="nombrePj"></div>' +
    '<div id="barraVida"><div id="barraVidaRelleno"></div><div id="textoVida"></div></div><div id="contador"></div>' +
    '<canvas id="luna" width="112" height="112"></canvas><div id="textoEjercicio">Ejercicio en</div><div id="relojEjercicio">–:––</div>' +
    '<button id="botonSonido"></button></div>' +
    '<canvas id="lienzo"></canvas>' +
    '<div id="panelPregunta" class="oculto"><div class="cabecera"><span id="numPregunta">Pregunta corta</span><button id="botonVerMapa">Ver el mapa</button></div>' +
    '<p id="textoPregunta"></p><div id="opciones"></div><div id="resultado" class="oculto"><div class="txt"><span class="titulo" id="resultadoTitulo"></span>' +
    '<span id="resultadoExplicacion"></span></div><button class="boton" id="botonSeguir"></button></div></div>' +
    '<div id="panelEjercicio" class="oculto"><div class="cabecera"><span id="ejTitulo"></span><button id="botonEjMapa">Ver el mapa</button></div>' +
    '<div id="ejAviso"></div><div id="ejEnunciado"></div><div id="ejFormato"></div><div id="ejCampos"></div>' +
    '<div class="ej-pie"><span id="ejMensaje"></span><span id="ejSaltarTexto"></span><button class="boton gris" id="botonSaltar">Saltar</button>' +
    '<button class="boton verde" id="botonComprobar">Comprobar</button></div></div>' +
    '<div id="cartel" class="oculto"><div class="caja-cartel"><h2 id="cartelTitulo"></h2><p id="cartelTexto"></p></div></div>' +
    '<div id="avisos"></div>' +
    '<div id="hudAbajo"><div id="estado"><span id="estadoTexto"></span><span id="estadoAtaque"></span></div>' +
    '<div class="casilla" id="casEscudo"><canvas id="icoEscudo" width="52" height="52" style="width:26px;height:26px"></canvas>Escudo</div>' +
    '<div class="casilla" id="casPotenciador"><canvas id="icoPotenciador" width="52" height="52" style="width:26px;height:26px"></canvas>Ataque x2</div>' +
    '<button id="botonPregunta" disabled>Pregunta corta</button></div>' +
    '<div id="pruebas" class="oculto"><button id="botonPruebas">Herramientas de prueba</button><div id="pruebasMenu" class="oculto">' +
    '<button data-prueba="debil">Darme 30 s + ataque débil</button><button data-prueba="fuerte">Darme 90 s + ataque fuerte</button>' +
    '<button data-prueba="fuerte2">Darme 90 s + ataque fuerte x2 (premio de cálculo)</button><button data-prueba="ejercicio">Lanzar ya el siguiente ejercicio grande</button>' +
    '<button data-prueba="golpe">Recibir un golpe (−5 de vida)</button><button data-prueba="cero">Quedarme sin vida (probar fantasma)</button>' +
    '<button data-prueba="objetos">Añadir 6 objetos al mapa</button><button data-prueba="menu">Volver a elegir personaje</button>' +
    '<div class="nota">Los muñecos tienen 30 de vida, se mueven un poco y reaparecen a los 5 s de caer.</div></div></div>';

  function $(id) { return document.getElementById(id); }
  function barajar(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function tipoDe(pj) { return Sprites.PERSONAJES[pj].tipo; }
  function mmss(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function esFantasma(o) { return o.estado === "fantasma"; }
  function estaVivo(o) { return o.vida > 0 && !esFantasma(o); }
  function dibujoDe(o) { return esFantasma(o) ? "fantasma" : o.pj; }

  var res = Math.min(2, window.devicePixelRatio || 1), resSuelo = Math.min(res, 1.5);
  var recursos = null, P = null, g = null, red = null, op = null;

  // Prepara la caja del juego y los dibujos fijos (una sola vez).
  function preparar() {
    if (recursos) return;
    var j = document.createElement("div"); j.id = "juego"; j.className = "oculto"; j.innerHTML = HTML;
    document.body.appendChild(j);
    var lienzo = $("lienzo"); lienzo.width = ANCHO * res; lienzo.height = ALTO * res; g = lienzo.getContext("2d");
    pintarMapa();
    ["icoEscudo", "icoPotenciador"].forEach(function (id, i) { var cv = $(id); Sprites.icono(cv.getContext("2d"), i ? "potenciador" : "escudo", 0, 0, cv.width); });
    var lg = $("luna").getContext("2d"), k = $("luna").width / 56; lg.scale(k, k);
    Mapa.elipse(lg, 0, 0, 56, 56, "rgb(250,235,160)"); Mapa.elipse(lg, 16, -6, 66, 48, "#1c203a");
    $("botonSeguir").onclick = seguir;
    $("botonVerMapa").onclick = ocultarPanel;
    $("botonEjMapa").onclick = function () { $("panelEjercicio").classList.add("oculto"); };
    $("botonPregunta").onclick = function () {
      if (!P) return;
      if (P.ejAbierto) $("panelEjercicio").classList.remove("oculto");
      else if (P.fase) mostrarPanel();
      else pedirPregunta();
      this.blur();
    };
    function iconoSonido() {
      var b = $("botonSonido"), mudo = Sonido.mudo();
      b.textContent = mudo ? "🔇" : "🔊"; b.title = mudo ? "Activar el sonido" : "Silenciar";
    }
    $("botonSonido").onclick = function () { Sonido.silenciar(!Sonido.mudo()); iconoSonido(); this.blur(); if (!Sonido.mudo()) Sonido.tocar("pop"); };
    iconoSonido();
    $("botonComprobar").onclick = enviarEjercicio;
    $("botonSaltar").onclick = saltarEjercicio;
    $("botonPruebas").onclick = function () { $("pruebasMenu").classList.toggle("oculto"); };
    $("pruebasMenu").addEventListener("click", herramientaPrueba);
    window.addEventListener("resize", ajustar);
    window.addEventListener("keydown", teclaAbajo);
    window.addEventListener("keyup", teclaArriba);
    window.addEventListener("blur", function () { if (P) P.teclas = []; });
  }

  function pintarMapa() {
    var obst = recursos ? recursos.obst : Mapa.pintarObstaculos(res);
    recursos = { mapa: Mapa.actual(), suelo: Mapa.pintarSuelo(resSuelo), obst: obst, mini: Mapa.pintarMinimapa(res) };
  }

  function pintarCara(cv, pj, fondo) {
    var c = cv.getContext("2d"), w = cv.width;
    c.clearRect(0, 0, w, w); c.save();
    c.beginPath(); c.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2); c.clip(); c.fillStyle = fondo; c.fillRect(0, 0, w, w);
    c.scale(w / 48, w / 48);
    // cabeza (unidad 150,118 del dibujo) en el centro del círculo
    Sprites.personaje(c, pj, "abajo", "paso0", 24, 26 + (272 - 118) * 90 / 300, { escala: 90 / Sprites.TAM });
    c.restore();
  }
  function pintarIcono() {
    var j = P.jugador;
    if (esFantasma(j)) pintarCara($("iconoPj"), "fantasma", "#4a4278");
    else pintarCara($("iconoPj"), j.pj, Sprites.PERSONAJES[j.pj].color);
    $("nombrePj").textContent = "Tú · " + (esFantasma(j) ? "Fantasmín" : Sprites.PERSONAJES[j.pj].nombre);
  }

  function crearPersonaje(id, pj, nombre, x, y) {
    return { id: id, pj: pj, nombre: nombre, x: x, y: y, dir: "abajo", paso: null, pasos: 0, vida: VIDA_MAX, estado: "vivo",
      escudo: false, capaHasta: 0, expr: null, exprHasta: 0, visible: false, popHasta: 0, conectado: true };
  }

  // ---------------------------------------------------------------------
  // op: { id, pj, nombre, banco, propio:{...}, conversion, tiempoJuego(), pausa, pruebas, alSalir, alPrueba }
  function iniciar(opciones, adaptador) {
    preparar();
    if (recursos.mapa !== Mapa.actual()) pintarMapa();
    op = opciones; red = adaptador;
    var pr = op.propio || {};
    var j = crearPersonaje(op.id, op.pj, op.nombre, pr.x, pr.y);
    j.dir = pr.dir || "abajo"; j.estado = pr.estado || "vivo";
    j.tiempoHasta = pr.tiempoHasta || 0; j.ataque = pr.ataque || null; j.potenciador = !!pr.potenciador; j.capaHasta = pr.capaHasta || 0;
    P = { jugador: j, otros: {}, objetos: {}, efectos: [], orden: [], fase: null, pregunta: null, panelVisible: true,
      teclas: [], pulsada: null, cache: {}, guardado: {}, autoSeguir: 0, eliminado: false,
      ej: null, ejAbierto: null, ejCerrado: pr.ejCerrado || null, cal: null, sig: 0, pausa: null };
    $("juego").classList.remove("oculto");
    $("pruebas").classList.toggle("oculto", !op.pruebas);
    $("cartel").classList.add("oculto");
    $("panelEjercicio").classList.add("oculto");
    pintarIcono();
    ajustar();
    red.iniciar(motor);
    if (op.pausa) pausa(true);
    if (j.tiempoHasta <= red.ahora() && !P.pausa) { j.tiempoHasta = 0; j.ataque = null; }
    if (!j.tiempoHasta && !P.eliminado && !P.ejAbierto) siguientePregunta(); else if (j.tiempoHasta) ocultarPanel();
    guardar();
    requestAnimationFrame(bucle);
    vigilar();
  }

  function detener() {
    if (red && red.detener) red.detener();
    P = null; red = null;
    var j = $("juego"); if (j) j.classList.add("oculto");
  }

  function ajustar() {
    var s = Math.min(window.innerWidth / 960, window.innerHeight / 798), j = $("juego");
    j.style.transform = "scale(" + s + ")";
    j.style.left = (window.innerWidth - 960 * s) / 2 + "px";
    j.style.top = (window.innerHeight - 798 * s) / 2 + "px";
  }
  function tiempoJuego() { return op.tiempoJuego ? op.tiempoJuego() : 0; }

  // Guarda en la red los datos propios que hacen falta para volver tras recargar.
  function guardar() {
    var j = P.jugador, d = { tiempoHasta: j.tiempoHasta || 0, ataque: j.ataque || null, potenciador: !!j.potenciador, capaHasta: j.capaHasta || 0, ejCerrado: P.ejCerrado || null },
      cambios = {}, hay = false;
    Object.keys(d).forEach(function (k) { if (P.guardado[k] !== d[k]) { cambios[k] = d[k]; P.guardado[k] = d[k]; hay = true; } });
    if (hay) red.guardarPropio(cambios);
  }

  // ---------- lo que el adaptador de red le cuenta al motor ----------
  var motor = {
    ponerOtro: function (id, d) {
      if (!P || id === P.jugador.id) return;
      var o = P.otros[id], ahora = red.ahora();
      if (!o) { o = P.otros[id] = crearPersonaje(id, d.pj || "chispi", d.nombre || "?", d.x, d.y); }
      if (d.pj) o.pj = d.pj;
      if (d.nombre) o.nombre = d.nombre;
      if (d.dir) o.dir = d.dir;
      if (d.estado) o.estado = d.estado;
      if (d.capaHasta !== undefined) o.capaHasta = d.capaHasta;
      if (d.conectado !== undefined) o.conectado = d.conectado;
      if (typeof d.x === "number" && typeof d.y === "number" && (d.x !== o.x || d.y !== o.y)) {
        var vecino = o.x !== undefined && Math.abs(d.x - o.x) + Math.abs(d.y - o.y) === 1;
        o.paso = vecino ? { x: o.x, y: o.y, t0: ahora, dur: duracionPaso(o, d.x, d.y) } : null;
        if (vecino) o.pasos++;
        o.x = d.x; o.y = d.y;
      }
    },
    // cambios en los datos propios que escribe otro (el profesor): sobre todo, pasar a fantasma
    ponerPropio: function (d) {
      if (!P || !d) return;
      var j = P.jugador;
      if (d.estado === "fantasma" && !esFantasma(j)) hacerseFantasma();
    },
    quitarOtro: function (id) { if (P) delete P.otros[id]; },
    ponerCombate: function (id, c) {
      if (!P || !c) return;
      var o = id === P.jugador.id ? P.jugador : P.otros[id];
      if (!o) { o = P.otros[id] = crearPersonaje(id, "chispi", "?", undefined, undefined); }
      var ahora = red.ahora();
      if (typeof c.vida === "number") {
        if (c.vida < o.vida) { o.expr = "herido"; o.exprHasta = ahora + 600; }
        o.vida = c.vida;
      }
      o.escudo = !!c.escudo;
      if (o === P.jugador) comprobarEliminado();
    },
    ponerObjeto: function (id, d) { if (P && d) P.objetos[id] = { id: id, tipo: d.tipo, x: d.x, y: d.y }; },
    quitarObjeto: function (id) { if (P) delete P.objetos[id]; },
    evento: function (e) { if (P) recibirEvento(e); },
    aviso: aviso,
    cartel: cartel,
    jugador: function () { return P && P.jugador; },
    ocupadas: function () { return ocupadasPor(null); }
  };

  function ocupadasPor(salvo) {
    var lista = [];
    if (!P) return lista;
    [P.jugador].concat(Object.values(P.otros)).forEach(function (o) { if (o !== salvo && estaVivo(o) && o.x !== undefined) lista.push([o.x, o.y]); });
    Object.values(P.objetos).forEach(function (o) { lista.push([o.x, o.y]); });
    return lista;
  }

  function cartel(titulo, texto) {
    if (!titulo) { $("cartel").classList.add("oculto"); return; }
    $("cartelTitulo").textContent = titulo; $("cartelTexto").textContent = texto || "";
    $("cartel").classList.remove("oculto");
  }

  // ---------- quedarse sin vida y volver como fantasma ----------
  function comprobarEliminado() {
    var j = P.jugador;
    if (esFantasma(j) || j.vida > 0 || P.eliminado) return;
    P.eliminado = true;
    j.tiempoHasta = 0; j.ataque = null; j.potenciador = false; j.capaHasta = 0; P.fase = null; P.teclas = []; ocultarPanel(); guardar();
    abrirEjercicio(op.conversion ? Object.assign({ id: "conv", conversion: true }, op.conversion) : null);
    if (!op.conversion) { cartel("Has quedado eliminado", "Te has quedado sin vida."); Sonido.tocar("eliminado"); }
  }
  function hacerseFantasma() {
    var j = P.jugador;
    j.estado = "fantasma"; P.eliminado = false; j.escudo = false; j.potenciador = false;
    if (P.ejAbierto && P.ejAbierto.conversion) cerrarEjercicio();
    cartel(null); pintarIcono();
    aviso("¡Ahora eres Fantasmín! Sigue jugando: asusta a los vivos");
    Sonido.tocar("fantasma");
    // si hay un ejercicio para toda la clase sin hacer, le toca también
    if (P.ej && P.ej.id !== P.ejCerrado) abrirEjercicio(P.ej);
    else if (!P.fase && !(j.tiempoHasta > red.ahora())) siguientePregunta();
  }

  // ---------- objetos ----------
  function recoger(j) {
    if (esFantasma(j)) return;   // los fantasmas no cogen objetos
    var o = Object.values(P.objetos).find(function (o) { return o.x === j.x && o.y === j.y; });
    if (!o || o.pendiente) return;
    if ((o.tipo === "vida" && j.vida >= VIDA_MAX) || (o.tipo === "escudo" && j.escudo) || (o.tipo === "potenciador" && j.potenciador)) return;
    o.pendiente = true;
    red.recoger(o.id).then(function (mio) {
      if (!mio || !P) return;
      var msg;
      if (o.tipo === "vida") { red.combatePropio(function (c) { c.vida = Math.min(VIDA_MAX, c.vida + 5); return c; }); msg = "¡Vida +5!"; }
      else if (o.tipo === "escudo") { red.combatePropio(function (c) { c.escudo = true; return c; }); msg = "¡Escudo puesto! Parará el siguiente ataque"; }
      else if (o.tipo === "potenciador") { j.potenciador = true; msg = "¡Potenciador! Tu siguiente ataque hará x2"; }
      else if (o.tipo === "reloj") { if (j.tiempoHasta > red.ahora()) j.tiempoHasta += TIEMPO.reloj; msg = "¡+" + TIEMPO.reloj / 1000 + " segundos!"; }
      else { j.capaHasta = red.ahora() + 60000; msg = "¡Capa! Eres invisible durante 1 minuto"; }
      guardar();
      aviso(msg);
      Sonido.tocar("objeto");
    });
  }

  // ---------- preguntas cortas ----------
  function siguientePregunta() {
    if (!P || P.eliminado || P.ejAbierto || P.pausa) return;
    if (!P.orden.length) P.orden = barajar(op.banco.cortas.slice());
    var q = P.orden.pop(), ops = barajar(q.opciones.slice());
    P.pregunta = { q: q, ops: ops, correcta: ops.findIndex(function (o) { return o.letra === q.correcta; }) };
    P.fase = "pregunta";
    $("textoPregunta").textContent = q.pregunta;
    $("numPregunta").textContent = "Pregunta corta · responde para moverte";
    var cont = $("opciones"); cont.innerHTML = "";
    ops.forEach(function (o, i) {
      var b = document.createElement("button"); b.className = "opcion";
      var l = document.createElement("b"); l.textContent = "ABCDEF".charAt(i);
      var t = document.createElement("span"); t.textContent = o.texto;
      b.appendChild(l); b.appendChild(t);
      b.onclick = function () { responder(i); };
      cont.appendChild(b);
    });
    $("resultado").classList.add("oculto");
    mostrarPanel();
  }

  // El jugador deja de moverse antes de tiempo y pide ya la siguiente pregunta (botón o tecla N).
  // El tiempo que le quedaba y el ataque sin usar se pierden, igual que cuando se acaba el tiempo.
  function pedirPregunta() {
    var j = P.jugador;
    if (P.fase || P.eliminado || P.ejAbierto || P.pausa || !(j.tiempoHasta > red.ahora())) return;
    j.tiempoHasta = 0; j.ataque = null; P.teclas = []; P.pulsada = null; guardar();
    siguientePregunta();
  }

  function responder(i) {
    if (P.fase !== "pregunta") return;
    var pr = P.pregunta, bien = i === pr.correcta, botones = $("opciones").children;
    for (var k = 0; k < botones.length; k++) {
      botones[k].disabled = true;
      if (k === pr.correcta) botones[k].classList.add("correcta");
      else if (k === i) botones[k].classList.add("fallada");
    }
    P.fase = "resultado"; P.acierto = bien;
    Sonido.tocar(bien ? "acierto" : "fallo");
    $("resultado").className = bien ? "bien" : "mal";
    $("resultadoTitulo").textContent = bien ? "¡Correcto! +" + TIEMPO.pregunta / 1000 + " s" : "Incorrecto. La respuesta era " + "ABCDEF".charAt(pr.correcta);
    // si acierta: verde un momento y a moverse, sin pulsar nada; si falla: explicación y botón para seguir
    $("resultadoExplicacion").textContent = bien ? "" : pr.q.explicacion;
    $("botonSeguir").classList.toggle("oculto", bien);
    P.autoSeguir = red.ahora() + (bien ? 1000 : 12000);
    red.anotarRespuesta(pr.q.n, bien);
    actualizarBotonSeguir(red.ahora());
  }
  function actualizarBotonSeguir(ahora) {
    var s = Math.max(0, Math.ceil((P.autoSeguir - ahora) / 1000));
    var txt = (P.acierto ? "¡A moverme!" : "Siguiente") + " (" + s + ")";
    if ($("botonSeguir").textContent !== txt) $("botonSeguir").textContent = txt;
  }
  function seguir() {
    if (!P || P.fase !== "resultado") return;
    if (P.acierto) darTiempo(TIEMPO.pregunta, "debil"); else siguientePregunta();
  }
  function darTiempo(ms, ataque) {
    var j = P.jugador;
    j.tiempoHasta = red.ahora() + ms;   // los segundos no se acumulan
    j.ataque = ataque;
    P.fase = null; P.pulsada = null; ocultarPanel(); guardar();
  }
  function mostrarPanel() { P.panelVisible = true; $("panelPregunta").classList.remove("oculto"); }
  function ocultarPanel() { if (P) P.panelVisible = false; $("panelPregunta").classList.add("oculto"); }

  // ---------- ejercicios grandes ----------
  // El anfitrión anuncia el ejercicio activo (o null). Si es nuevo, todo se para y aparece para todos.
  function ejercicio(ej) {
    if (!P) return;
    P.ej = ej || null;
    if (!ej || ej.id === P.ejCerrado) return;
    if (P.ejAbierto && P.ejAbierto.id === ej.id) return;
    if (P.eliminado) return;   // primero tiene que hacer el de conversión
    abrirEjercicio(ej);
  }

  function formatear(texto) {
    var html = "", lista = false;
    String(texto || "").split(/\n/).forEach(function (l) {
      var t = l.trim();
      if (/^[-•]\s+/.test(t)) {
        if (!lista) { html += "<ul>"; lista = true; }
        html += "<li>" + Comun.escapar(t.replace(/^[-•]\s+/, "")) + "</li>";
        return;
      }
      if (lista) { html += "</ul>"; lista = false; }
      if (t) html += "<p>" + Comun.escapar(t) + "</p>";
    });
    if (lista) html += "</ul>";
    return html;
  }

  function abrirEjercicio(ej) {
    if (!ej) return;
    var j = P.jugador, nuevo = !P.ejAbierto || P.ejAbierto.id !== ej.id;
    // todo se para: se pierden los segundos y se cierra la pregunta corta
    j.tiempoHasta = 0; j.ataque = null; P.fase = null; P.teclas = []; ocultarPanel(); guardar();
    P.ejAbierto = ej;
    $("ejTitulo").textContent = ej.conversion ? "Ejercicio de conversión en fantasma" : "¡Ejercicio para toda la clase! · " + (ej.titulo || "");
    $("ejAviso").textContent = ej.conversion ? "Has quedado eliminado. Resuelve el ejercicio para volver como fantasma (no se puede saltar)."
      : ej.tipo === "calculo" ? "Haz los cálculos en papel o con calculadora. Premio: " + TIEMPO.ejercicio / 1000 + " s + ataque fuerte x2." : "Premio: " + TIEMPO.ejercicio / 1000 + " s + ataque fuerte.";
    $("ejEnunciado").innerHTML = formatear(ej.enunciado);
    $("ejFormato").innerHTML = ej.tipo === "teorico" && ej.ejemplo ? "Ejemplo de formato (<b>solo es un ejemplo</b>, no la respuesta): <i>" + Comun.escapar(ej.ejemplo) + "</i>" : "";
    var c = $("ejCampos"); c.innerHTML = "";
    function campo(nombre, etiqueta, clase, marca) {
      var l = document.createElement("label"); l.className = "ej-campo " + (clase || "");
      l.appendChild(document.createTextNode(etiqueta));
      var i = document.createElement("input"); i.name = nombre; i.autocomplete = "off"; i.spellcheck = false;
      if (marca) i.placeholder = marca;
      i.addEventListener("keydown", function (e) { if (e.key === "Enter") enviarEjercicio(); });
      l.appendChild(i); c.appendChild(l);
    }
    if (ej.tipo === "teorico") { campo("incoterm", "Incoterm", "corto", "3 letras"); campo("lugar", "Lugar", "largo", "Lugar convenido"); }
    else (ej.pide || []).forEach(function (et, i) { campo("v" + i, et + " (€)", "", "0,00"); });
    $("ejMensaje").textContent = ""; $("ejMensaje").className = "";
    $("botonComprobar").disabled = false;
    $("panelEjercicio").classList.remove("oculto");
    if (nuevo) {
      aviso(ej.conversion ? "Has quedado eliminado. Resuelve el ejercicio para volver como fantasma" : "¡Ejercicio para toda la clase!");
      Sonido.tocar(ej.conversion ? "eliminado" : "ejercicio");
    }
    var primero = c.querySelector("input"); if (primero) setTimeout(function () { primero.focus(); }, 50);
  }
  function cerrarEjercicio() {
    P.ejAbierto = null;
    $("panelEjercicio").classList.add("oculto");
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function enviarEjercicio() {
    var ej = P && P.ejAbierto; if (!ej || $("botonComprobar").disabled) return;
    var valores = {};
    $("ejCampos").querySelectorAll("input").forEach(function (i) { valores[i.name] = i.value.trim(); });
    if (Object.keys(valores).some(function (k) { return !valores[k]; })) { mensajeEj("Rellena todas las casillas.", "mal"); return; }
    $("botonComprobar").disabled = true; mensajeEj("Comprobando…", "");
    red.enviarRespuesta(ej.id, valores).then(function (ok) {
      if (!P || P.ejAbierto !== ej) return;
      $("botonComprobar").disabled = false;
      if (ok === null) { mensajeEj("No llega la corrección. Vuelve a pulsar «Comprobar».", "mal"); return; }
      Sonido.tocar(ok ? "premio" : "fallo");
      if (!ok) { mensajeEj(ej.tipo === "calculo" ? "No es correcto: alguna cantidad no cuadra. Revísalo y vuelve a intentarlo." : "No es correcto. Revisa el Incoterm y el lugar y vuelve a intentarlo.", "mal"); return; }
      if (ej.conversion) { mensajeEj("¡Correcto! Convirtiéndote en fantasma…", "bien"); $("botonComprobar").disabled = true; return; }
      P.ejCerrado = ej.id;
      cerrarEjercicio();
      darTiempo(TIEMPO.ejercicio, ej.tipo === "calculo" ? "fuerte2" : "fuerte");
      aviso("¡Correcto! +" + TIEMPO.ejercicio / 1000 + " s y ataque fuerte" + (ej.tipo === "calculo" ? " x2" : ""));
    });
  }
  function mensajeEj(txt, clase) { $("ejMensaje").textContent = txt; $("ejMensaje").className = clase; }

  function puedeSaltar(ej) { return !ej.conversion && tiempoJuego() - (ej.inicioJuego || 0) >= (ej.minimoSaltar || 0) * 60000; }
  function saltarEjercicio() {
    var ej = P && P.ejAbierto; if (!ej || !puedeSaltar(ej)) return;
    P.ejCerrado = ej.id; guardar();
    red.marcarSaltado(ej.id);
    cerrarEjercicio();
    siguientePregunta();
  }

  // ---------- pausa ----------
  function pausa(si) {
    if (!P) return;
    var ahora = red.ahora(), j = P.jugador;
    if (si && !P.pausa) {
      P.pausa = ahora; P.teclas = [];
      cartel("Partida en pausa", "Espera a que el profesor la reanude.");
    } else if (!si && P.pausa) {
      var d = ahora - P.pausa; P.pausa = null;
      if (j.tiempoHasta) j.tiempoHasta += d;
      if (j.capaHasta > ahora - d) j.capaHasta += d;
      if (P.autoSeguir) P.autoSeguir += d;
      cartel(null); guardar();
      if (!P.fase && !P.ejAbierto && !P.eliminado && !(j.tiempoHasta > ahora)) siguientePregunta();
    }
  }
  function calendario(cal, sig) { if (P) { P.cal = cal || []; P.sig = sig || 0; } }

  // ---------- teclado ----------
  function teclaAbajo(e) {
    if (!P) return;
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (TECLAS[e.code] || e.code === "Space") e.preventDefault();
    if (P.pausa) return;
    if (P.fase && P.panelVisible) {
      if (P.fase === "pregunta") {
        var k = "ABCDEF".indexOf(e.key.toUpperCase()), n = "123456".indexOf(e.key), i = k >= 0 ? k : n;
        if (i >= 0 && i < P.pregunta.ops.length) responder(i);
      } else if ((e.code === "Space" || e.code === "Enter") && !e.repeat) seguir();
      return;
    }
    if (TECLAS[e.code] && P.teclas.indexOf(TECLAS[e.code]) < 0) { P.teclas.push(TECLAS[e.code]); P.pulsada = TECLAS[e.code]; }
    if (e.code === "Space" && !e.repeat) atacar(red.ahora());
    if (e.code === "KeyN" && !e.repeat) pedirPregunta();
  }
  function teclaArriba(e) {
    if (!P || !TECLAS[e.code]) return;
    P.teclas = P.teclas.filter(function (d) { return d !== TECLAS[e.code]; });
  }

  // ---------- movimiento ----------
  function posPx(c, ahora) {
    if (c.paso) {
      var t = Math.min(1, (ahora - c.paso.t0) / (c.paso.dur || PASO_MS));
      return { x: (c.paso.x + (c.x - c.paso.x) * t) * T, y: (c.paso.y + (c.y - c.paso.y) * t) * T };
    }
    return { x: c.x * T, y: c.y * T };
  }
  function darPaso(c, dir, ahora) {
    var giro = c.dir !== dir, fantasma = esFantasma(c);
    c.dir = dir;
    var d = DIRS[dir], nx = c.x + d[0], ny = c.y + d[1];
    // los fantasmas flotan sobre el estanque y atraviesan a los demás; a los vivos no se les puede pisar
    var bloqueado = !Mapa.puedePisar(c.x, c.y, nx, ny, fantasma) ||
      (!fantasma && Object.values(P.otros).concat([P.jugador]).some(function (o) { return o !== c && estaVivo(o) && o.x === nx && o.y === ny; }));
    if (!bloqueado) { c.paso = { x: c.x, y: c.y, t0: ahora, dur: duracionPaso(c, nx, ny) }; c.x = nx; c.y = ny; c.pasos++; }
    if (c === P.jugador && (giro || !bloqueado)) red.publicarPosicion({ x: c.x, y: c.y, dir: c.dir });
    return !bloqueado;
  }
  function duracionPaso(c, x, y) { return !esFantasma(c) && Mapa.esBarro && Mapa.esBarro(x, y) ? PASO_MS * 2 : PASO_MS; }
  // radio de visión: la niebla del pantano lo baja para todos por igual
  function radioVision() { return window.Peligros && Peligros.hay() ? Peligros.radio(tiempoJuego(), RADIO) : RADIO; }
  function puedeMoverse(j, ahora) { return j.tiempoHasta > ahora && !P.eliminado && !P.ejAbierto && !P.pausa; }

  function actualizar(ahora) {
    var j = P.jugador;
    [j].concat(Object.values(P.otros)).forEach(function (c) {
      if (c.paso && ahora - c.paso.t0 >= (c.paso.dur || PASO_MS)) { c.paso = null; if (c === j) recoger(j); }
      if (c.expr && ahora > c.exprHasta) c.expr = null;
    });
    if (!P.pausa) {
      if (puedeMoverse(j, ahora)) {
        // una pulsación corta también cuenta como un paso
        var dir = P.teclas.length ? P.teclas[P.teclas.length - 1] : P.pulsada;
        if (!j.paso && dir) { darPaso(j, dir, ahora); P.pulsada = null; }
      } else if (j.tiempoHasta && j.tiempoHasta <= ahora) {
        j.tiempoHasta = 0; j.ataque = null; guardar();
        if (!P.eliminado && !P.ejAbierto) { aviso("Se acabó el tiempo"); Sonido.tocar("tiempoFin"); siguientePregunta(); }
      }
      if (P.fase === "resultado") {
        actualizarBotonSeguir(ahora);
        if (ahora >= P.autoSeguir) seguir();
      }
    }
    // visibilidad «pop» de los rivales
    Object.values(P.otros).forEach(function (o) {
      var ve = esVisible(o, ahora);
      if (ve && !o.visible) { o.popHasta = ahora + 450; var pp = posPx(o, ahora); efecto({ k: "pop", x: pp.x + 32, y: pp.y - 30, dur: 700 }, ahora); Sonido.tocar("pop", 0.7); }
      o.visible = ve;
    });
    if (!P.pausa && window.Peligros && Peligros.hay()) {
      var nb = Peligros.niebla(tiempoJuego());
      if (nb.aviso && ahora > (P.avisoNiebla || 0)) { P.avisoNiebla = ahora + 10000; aviso("¡Llega la niebla! Durante un rato todos veréis menos"); }
      peligroPropio(ahora);
    }
    P.efectos = P.efectos.filter(function (e) { return ahora < e.t0 + e.dur; });
  }

  // Peligros del mapa (puerto y volcán): solo hacen daño a quien tiene tiempo de movimiento, nunca eliminan,
  // el escudo para un golpe, los fantasmas no reciben daño y tras un golpe hay 2 s sin daño.
  function peligroPropio(ahora) {
    var j = P.jugador;
    if (!estaVivo(j) || j.x === undefined || !puedeMoverse(j, ahora)) return;
    var t = tiempoJuego();
    if (Peligros.avisoEn(j.x, j.y, t) && ahora > (P.avisoPeligro || 0)) { P.avisoPeligro = ahora + 3500; aviso("¡Cuidado! ¡Apártate de ahí!"); Sonido.tocar("tiempoFin", 0.6); }
    if (ahora < (P.inmuneHasta || 0)) return;
    var p = Peligros.dano(j.x, j.y, t); if (!p) return;
    P.inmuneHasta = ahora + 2000;
    var bloqueado = !!j.escudo, real = bloqueado ? 0 : Math.max(0, Math.min(p.dano, j.vida - 1));
    red.combatePropio(function (c) {
      if (c.escudo) c.escudo = false; else c.vida = Math.max(Math.min(c.vida, 1), c.vida - p.dano);
      return c;
    });
    var ev = { tipo: "golpe", de: j.id, a: j.id, dano: bloqueado ? p.dano : real, bloqueado: bloqueado, peligro: p.tipo };
    dibujarGolpe(ev, ahora);
    red.publicarEvento(ev);
    j.expr = "herido"; j.exprHasta = ahora + 600;
    Sonido.tocar(bloqueado ? "bloqueado" : "herido");
    aviso(bloqueado ? "Tu escudo te ha protegido del peligro" : Peligros.TEXTOS[p.tipo] + (real < p.dano ? " (te queda 1 de vida)" : ""));
  }

  function esVisible(o, ahora) {
    var j = P.jugador;
    if (!(estaVivo(o) || esFantasma(o)) || o.x === undefined || o.capaHasta > ahora) return false;
    if (j.x === undefined) return false;
    var r = radioVision(), radio = Mapa.esHierbaAlta(o.x, o.y) ? r / 2 : r;
    return Math.hypot(o.x - j.x, o.y - j.y) <= radio + 0.01;
  }

  // Cuenta atrás hasta el siguiente ejercicio grande (en tiempo de partida, sin contar pausas).
  function siguienteEjercicio() {
    var cal = P.cal || [], sig = P.sig || 0;
    if (sig >= cal.length) return { falta: null };
    return { falta: cal[sig].minuto * 60000 - tiempoJuego() };
  }

  // ---------- ataques ----------
  function atacar(ahora) {
    var j = P.jugador;
    if (!j.ataque || !puedeMoverse(j, ahora)) return;
    var tipo = j.ataque, alcance = tipo === "debil" ? 1 : 4, d = DIRS[j.dir];
    j.ataque = null; j.expr = "ataque"; j.exprHasta = ahora + 500;
    var x = j.x, y = j.y, objetivo = null, largo = 0;
    for (var k = 1; k <= alcance; k++) {
      var nx = x + d[0], ny = y + d[1];
      if (Mapa.frenaAtaque(x, y, nx, ny)) break;
      x = nx; y = ny; largo = k;
      // a los fantasmas no se les puede atacar: el ataque los atraviesa
      objetivo = Object.values(P.otros).find(function (o) { return estaVivo(o) && o.x === x && o.y === y; });
      if (objetivo) break;
    }
    var pp = posPx(j, ahora), cx = pp.x + 32, o;
    if (j.dir === "derecha") o = [cx + 22, pp.y + 14]; else if (j.dir === "izquierda") o = [cx - 22, pp.y + 14];
    else if (j.dir === "abajo") o = [cx, pp.y + 40]; else o = [cx, pp.y - 6];
    var ev = { tipo: "ataque", de: j.id, pj: dibujoDe(j), ataque: tipo === "debil" ? "debil" : "fuerte", dir: j.dir, x: o[0], y: o[1],
      largo: Math.max(0.5, tipo === "debil" ? 1 : largo) * T + (objetivo ? 0 : 20) };
    dibujarAtaque(ev, ahora);
    sonidoAtaque(ev, 1);
    red.publicarEvento(ev);
    if (objetivo) golpear(j, objetivo, tipo, ahora);
    guardar();
  }

  function golpear(at, ob, tipo, ahora) {
    var fantasma = esFantasma(at), dano = tipo === "debil" ? 1 : 5, ventaja = false;
    if (tipo === "fuerte2") dano *= 2;
    if (!fantasma) {   // el fantasma no tiene ventaja de tipo ni objetos
      ventaja = VENTAJA[tipoDe(at.pj)] === tipoDe(ob.pj);
      if (ventaja) dano *= 2;
      if (at.potenciador) { dano *= 2; at.potenciador = false; }
    }
    // un fantasma no puede dar el golpe final: deja al menos 1 de vida
    red.golpear(ob.id, dano, fantasma ? 1 : 0).then(function (r) {
      if (!P || !r) return;
      var ev = { tipo: "golpe", de: at.id, a: ob.id, dano: r.bloqueado ? dano : r.real, ventaja: ventaja, bloqueado: r.bloqueado };
      dibujarGolpe(ev, red.ahora());
      red.publicarEvento(ev);
      Sonido.tocar(r.bloqueado ? "bloqueado" : r.real > 0 ? "golpe" : "tiempoFin");
      if (r.real > 0) {
        var s = {}; s[fantasma ? "vidaQuitadaFantasma" : "vidaQuitada"] = r.real; red.sumar(s);
        if (at.tiempoHasta > red.ahora()) {
          var extra = tipo === "debil" ? TIEMPO.huidaDebil : TIEMPO.huidaFuerte;
          at.tiempoHasta += extra; guardar();
          aviso("¡Le has quitado vida! +" + extra / 1000 + " s para huir");
        }
      } else if (r.bloqueado) aviso("¡Su escudo ha parado tu ataque!");
      else if (fantasma) aviso("Un fantasma no puede dar el golpe final");
      if (r.antes > 0 && r.despues === 0) {
        red.sumar({ bajas: 1 });
        aviso("¡Has dejado a " + ob.nombre + " sin vida!");
      }
    });
  }

  function dibujarAtaque(ev, ahora) {
    efecto({ k: "ataque", pj: ev.pj, tipo: ev.ataque, dir: ev.dir, x: ev.x, y: ev.y, largo: ev.largo, dur: ev.ataque === "debil" ? 650 : 900 }, ahora);
  }
  function dibujarGolpe(ev, ahora) {
    var ob = ev.a === P.jugador.id ? P.jugador : P.otros[ev.a];
    if (!ob || ob.x === undefined) return;
    var cx = ob.x * T + 32, cy = ob.y * T + 10, t = ahora + 120;
    efecto({ k: "golpe", x: cx, y: cy + 10, dur: 450 }, t);
    if (ev.bloqueado) { efecto({ k: "etiqueta", texto: "¡Bloqueado!", estilo: "gris", x: cx, y: cy - 40, dur: 1300 }, t); return; }
    if (!ev.dano) return;
    efecto({ k: "etiqueta", texto: "-" + ev.dano, estilo: "rojo", x: cx + 30, y: cy - 40, dur: 1300 }, t);
    if (ev.ventaja) efecto({ k: "etiqueta", texto: "x2 ventaja", estilo: "amarillo", x: cx + 30, y: cy - 66, dur: 1300 }, t);
  }

  function recibirEvento(ev) {
    var ahora = red.ahora(), j = P.jugador;
    if (ev.de === j.id) return;
    if (ev.tipo === "ataque") {
      var at = P.otros[ev.de];
      if (at) { at.expr = "ataque"; at.exprHasta = ahora + 500; at.dir = ev.dir; }
      if (at && at.visible) { dibujarAtaque(ev, ahora); sonidoAtaque(ev, 0.5); }
    } else if (ev.tipo === "golpe") {
      var ob = ev.a === j.id ? j : P.otros[ev.a];
      if (ob === j || (ob && ob.visible)) dibujarGolpe(ev, ahora);
      if (ob === j) Sonido.tocar(ev.bloqueado ? "bloqueado" : "herido");
      else if (ob && ob.visible && ev.dano) Sonido.tocar("golpe", 0.5);
      if (ob === j) {
        var quien = P.otros[ev.de] ? P.otros[ev.de].nombre : "Alguien";
        if (ev.bloqueado) aviso("Tu escudo ha parado el ataque de " + quien);
        else if (ev.dano) aviso("¡" + quien + " te ha quitado " + ev.dano + " de vida!");
      }
    }
  }

  function sonidoAtaque(ev, vol) {
    var debil = ev.ataque === "debil";
    Sonido.tocar(ev.pj === "fantasma" ? (debil ? "susto" : "embrujo") : (debil ? "ataqueDebil" : "ataqueFuerte"), vol);
  }

  function efecto(e, t0) { e.t0 = t0; P.efectos.push(e); }

  function aviso(txt) {
    var d = document.createElement("div"); d.className = "aviso-flotante"; d.textContent = txt;
    $("avisos").appendChild(d);
    setTimeout(function () { d.remove(); }, 2600);
  }

  // ---------------------------------------------------------------------
  // DIBUJO
  function camara(pp) {
    return {
      x: Math.max(0, Math.min(Mapa.MW * T - ANCHO, pp.x + 32 - ANCHO / 2)),
      y: Math.max(0, Math.min(Mapa.MH * T - ALTO, pp.y + 32 - ALTO / 2))
    };
  }

  function dibujar(ahora) {
    var j = P.jugador;
    if (j.x === undefined) return;
    var pj = posPx(j, ahora), cam = camara(pj);
    g.setTransform(res, 0, 0, res, 0, 0);
    g.drawImage(recursos.suelo, cam.x * resSuelo, cam.y * resSuelo, ANCHO * resSuelo, ALTO * resSuelo, 0, 0, ANCHO, ALTO);
    g.save();
    g.translate(-Math.round(cam.x), -Math.round(cam.y));
    var jx = pj.x + 32, jy = pj.y + 32, rad = T * (radioVision() + 0.3);
    g.fillStyle = "rgba(255,245,205,0.2)"; g.beginPath(); g.arc(jx, jy, rad, 0, Math.PI * 2); g.fill();
    var hayPeligros = window.Peligros && Peligros.hay(), tj = hayPeligros ? tiempoJuego() : 0;
    if (hayPeligros) Peligros.dibujarSuelo(g, tj, T, ahora);

    // todo lo que tiene altura se ordena por filas (lo de abajo tapa a lo de arriba)
    var lista = [], x0 = Math.floor(cam.x / T) - 2, x1 = x0 + VW + 4, y0 = Math.floor(cam.y / T) - 1, y1 = y0 + VH + 4;
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var k = Mapa.celda(x, y), sp = recursos.obst[k];
      if (sp && k !== "g" && x >= 0 && y >= 0 && x < Mapa.MW && y < Mapa.MH) lista.push({ orden: (y + (k === "B" ? 2 : 1)) * T, capa: 1, sp: sp, x: x * T, y: y * T });
    }
    Object.values(P.objetos).forEach(function (o) { lista.push({ orden: (o.y + 1) * T - 1, capa: 0, obj: o }); });
    // los fantasmas flotan: se dibujan encima de lo de su fila
    Object.values(P.otros).forEach(function (o) { if (o.visible) { var op2 = posPx(o, ahora); lista.push({ orden: op2.y + T, capa: esFantasma(o) ? 3 : 2, pj: o, pos: op2 }); } });
    if (estaVivo(j) || esFantasma(j)) lista.push({ orden: pj.y + T, capa: esFantasma(j) ? 3 : 2, pj: j, pos: pj });
    if (hayPeligros) Peligros.carretillas(tj).forEach(function (c) { lista.push({ orden: (c.y + 1) * T + 2, capa: 2, carr: c }); });
    if (hayPeligros) Peligros.plantas().forEach(function (q) {
      // la planta abre la boca si tiene al lado a alguien vivo que se ve
      var cerca = [j].concat(Object.values(P.otros)).some(function (o) { return estaVivo(o) && (o === j || o.visible) && Math.abs(o.x - q.x) + Math.abs(o.y - q.y) === 1; });
      if (cerca) q.estado = "muerde";
      lista.push({ orden: (q.y + 1) * T, capa: 1, planta: q });
    });
    lista.sort(function (a, b) { return a.orden - b.orden || a.capa - b.capa; });
    lista.forEach(function (e) {
      if (e.sp) g.drawImage(e.sp.cv, e.x + e.sp.ox, e.y + e.sp.oy, e.sp.w, e.sp.h);
      else if (e.obj) dibujarObjeto(e.obj, ahora);
      else if (e.carr) Peligros.dibujarCarretilla(g, e.carr, T, ahora);
      else if (e.planta) Peligros.dibujarPlanta(g, e.planta, T, ahora);
      else dibujarPersonaje(e.pj, e.pos, ahora);
    });
    // la niebla tapa el paisaje, pero nunca los avisos de los peligros
    if (hayPeligros) Peligros.dibujarNiebla(g, tj, cam, jx, jy, rad, ANCHO, ALTO, ahora);
    if (hayPeligros) Peligros.dibujarEncima(g, tj, T, ahora);

    g.strokeStyle = "rgb(255,232,150)"; g.lineWidth = 3; g.setLineDash([rad * Math.PI * 2 / 56, rad * Math.PI * 2 / 56]);
    g.beginPath(); g.arc(jx, jy, rad, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);

    lista.forEach(function (e) { if (e.pj) etiquetaNombre(e.pj === j ? "Tú" : e.pj.nombre, e.pos.x + 32, e.pos.y - 48, e.pj.conectado === false, esFantasma(e.pj)); });
    P.efectos.forEach(function (e) { if (ahora >= e.t0) dibujarEfecto(e, ahora); });
    g.restore();
    dibujarMinimapa(cam);
  }

  function dibujarObjeto(o, ahora) {
    var X = o.x * T, Y = o.y * T, bote = Math.sin(ahora / 300 + o.x * 7 + o.y) * 2;
    g.fillStyle = "rgba(20,50,20,0.27)"; g.beginPath(); g.ellipse(X + 32, Y + 54, 18, 5, 0, 0, Math.PI * 2); g.fill();
    Sprites.icono(g, o.tipo, X + 10, Y + 4 + bote, 44);
  }

  function dibujarPersonaje(c, pos, ahora) {
    var fantasma = esFantasma(c);
    var cuadro = c.expr && !(fantasma && c.expr === "herido") ? c.expr : fantasma ? ["paso0", "paso1", "paso0", "paso2"][Math.floor(ahora / 300 + (c.x || 0)) % 4] :
      (c.paso ? (c.pasos % 2 ? "paso1" : "paso2") : "paso0");
    var esc = 1;
    if (c.popHasta && ahora < c.popHasta) { var t = 1 - (c.popHasta - ahora) / 450; esc = 0.5 + 0.5 * (1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2)); }
    var alfa = c.capaHasta > ahora ? 0.45 : (c.conectado === false ? 0.6 : 1);
    Sprites.personaje(g, dibujoDe(c), c.dir, cuadro, pos.x + 32, pos.y + 58, { escala: esc, escudo: c.escudo && !fantasma, alfa: alfa });
    if (!fantasma && Mapa.esHierbaAlta(c.x, c.y) && !c.paso) {
      var sp = recursos.obst.g; g.drawImage(sp.cv, pos.x + sp.ox, pos.y + sp.oy, sp.w, sp.h);
    }
  }

  function pastilla(x, y, w, h, fondo, borde) {
    var r = h / 2, x0 = x - w / 2, y0 = y - r;
    g.beginPath(); g.moveTo(x0 + r, y0); g.lineTo(x0 + w - r, y0); g.arc(x0 + w - r, y, r, -Math.PI / 2, Math.PI / 2);
    g.lineTo(x0 + r, y0 + h); g.arc(x0 + r, y, r, Math.PI / 2, Math.PI * 1.5); g.closePath();
    g.fillStyle = fondo; g.fill();
    if (borde) { g.strokeStyle = borde; g.lineWidth = 2; g.stroke(); }
  }
  function etiquetaNombre(txt, x, y, apagado, fantasma) {
    g.font = "bold 14px 'Segoe UI', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    var w = g.measureText(txt).width + 18;
    pastilla(x, y, w, 22, fantasma ? "#ece6ff" : apagado ? "#d8d8de" : "#fff", fantasma ? "#7a5cc8" : "#3c3432");
    g.fillStyle = fantasma ? "#5a3ca8" : "#3c3432"; g.fillText(txt, x, y + 1);
  }
  function estrella(x, y, r, rel) {
    g.beginPath();
    for (var i = 0; i < 16; i++) { var rr = i % 2 ? r * rel : r, a = Math.PI * 2 * i / 16; g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
    g.closePath();
  }

  function dibujarEfecto(e, ahora) {
    var t = (ahora - e.t0) / e.dur;
    if (e.k === "ataque") Sprites.efecto(g, e.pj, e.tipo, e.dir, e.x, e.y, e.largo, t);
    else if (e.k === "golpe") {
      var r = 14 + 10 * t;
      g.save(); g.globalAlpha = 1 - t;
      g.fillStyle = "rgba(255,220,120,0.5)"; g.beginPath(); g.arc(e.x, e.y, r * 1.4, 0, Math.PI * 2); g.fill();
      estrella(e.x, e.y, r, 0.5); g.fillStyle = "rgb(255,236,120)"; g.fill(); g.strokeStyle = "rgb(230,140,40)"; g.lineWidth = 2; g.stroke();
      g.restore();
    } else if (e.k === "etiqueta") {
      var col = { rojo: ["#e2363f", "#fff"], amarillo: ["#ffd23c", "#5a3c00"], gris: ["#6c738c", "#fff"] }[e.estilo];
      g.save(); g.globalAlpha = t > 0.75 ? (1 - t) / 0.25 : 1;
      var yy = e.y - 24 * Math.min(1, t * 3);
      g.font = "bold 17px 'Segoe UI', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      var w = g.measureText(e.texto).width + 22;
      pastilla(e.x, yy, w, 28, col[0], "#fff");
      g.fillStyle = col[1]; g.fillText(e.texto, e.x, yy + 1);
      g.restore();
    } else if (e.k === "pop") {
      g.save(); g.globalAlpha = t > 0.6 ? (1 - t) / 0.4 : 1;
      var s = 0.6 + 0.6 * Math.min(1, t * 4);
      g.translate(e.x, e.y - 10 * t); g.scale(s, s);
      estrella(0, 0, 26, 0.6); g.fillStyle = "#fff4b0"; g.fill(); g.strokeStyle = "#e6a020"; g.lineWidth = 2; g.stroke();
      g.font = "bold 15px 'Segoe UI', Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#b45a00";
      g.fillText("¡POP!", 0, 1);
      g.restore();
    }
  }

  function dibujarMinimapa(cam) {
    var mm = recursos.mini, w = mm.width / res, h = mm.height / res, x = ANCHO - w - 10, y = ALTO - h - 10, M = Mapa.MS;
    g.drawImage(mm, x, y, w, h);
    g.strokeStyle = "#fff"; g.lineWidth = 1;
    g.strokeRect(x + 6 + cam.x / T * M, y + 6 + cam.y / T * M, VW * M, VH * M);
    var j = P.jugador;
    g.beginPath(); g.arc(x + 6 + j.x * M + M / 2, y + 6 + j.y * M + M / 2, 3, 0, Math.PI * 2);
    g.fillStyle = esFantasma(j) ? "#c8b8ff" : Sprites.PERSONAJES[j.pj].color; g.fill(); g.strokeStyle = "#fff"; g.stroke();
  }

  // ---------- interfaz ----------
  function poner(id, prop, valor) {
    var c = P.cache, k = id + "." + prop;
    if (c[k] === valor) return;
    c[k] = valor;
    var el = $(id);
    if (prop === "text") el.textContent = valor;
    else if (prop === "class") el.className = valor;
    else if (prop === "width") el.style.width = valor;
    else if (prop === "bg") el.style.background = valor;
    else if (prop === "disabled") el.disabled = valor;
    else if (prop === "oculto") el.classList.toggle("oculto", valor);
  }

  function actualizarHud(ahora) {
    var j = P.jugador, pct = Math.max(0, j.vida) / VIDA_MAX, fantasma = esFantasma(j);
    poner("barraVidaRelleno", "width", (fantasma ? 100 : pct * 100) + "%");
    poner("barraVidaRelleno", "bg", fantasma ? "#b8a4f0" : pct > 0.5 ? "#5ac85a" : pct > 0.25 ? "#f0b428" : "#e2363f");
    poner("textoVida", "text", fantasma ? "Fantasma" : Math.max(0, j.vida) + " / " + VIDA_MAX);
    var todos = Object.values(P.otros).concat([j]);
    var vivos = todos.filter(estaVivo).length, fantasmas = todos.filter(esFantasma).length;
    poner("contador", "text", "Vivos " + vivos + " · Fantasmas " + fantasmas);
    var ej = siguienteEjercicio();
    var abierto = P.ejAbierto && !P.ejAbierto.conversion;
    poner("relojEjercicio", "text", abierto ? "¡Ahora!" : ej.falta === null ? "—" : mmss(ej.falta));
    poner("textoEjercicio", "text", abierto ? "Ejercicio" : ej.falta === null ? "Sin más ejercicios" : "Ejercicio en");
    var escondido = !fantasma && (Mapa.esHierbaAlta(j.x, j.y) || j.capaHasta > ahora), mueve = puedeMoverse(j, ahora);
    var txt = P.pausa ? "Partida en pausa" : P.eliminado ? "Eliminado · resuelve el ejercicio" : P.ejAbierto ? "Resolviendo el ejercicio" :
      mueve ? (escondido ? "Escondido · " : fantasma ? "Flotando · " : "Moviéndote · ") + Math.ceil((j.tiempoHasta - ahora) / 1000) + " s"
        : (escondido ? "Escondido" : "Quieto") + " · responde para moverte";
    poner("estadoTexto", "text", txt);
    var nombres = fantasma ? { debil: "Susto", fuerte: "Embrujo", fuerte2: "Embrujo x2" } : { debil: "Ataque débil", fuerte: "Ataque fuerte", fuerte2: "Ataque fuerte x2" };
    var at = mueve && j.ataque ? nombres[j.ataque] + " listo · Espacio" : (mueve ? "Sin ataque" : "");
    poner("estadoAtaque", "text", at);
    poner("estadoAtaque", "class", mueve && j.ataque ? "listo" : "");
    poner("casEscudo", "class", "casilla" + (j.escudo && !fantasma ? " on" : ""));
    poner("casPotenciador", "class", "casilla" + (j.potenciador && !fantasma ? " on" : ""));
    var ejOculto = P.ejAbierto && $("panelEjercicio").classList.contains("oculto");
    var pedir = !P.ejAbierto && !P.fase && !P.eliminado && !P.pausa && mueve;   // puede pedir ya la siguiente pregunta
    poner("botonPregunta", "text", P.ejAbierto ? "Ejercicio" : pedir ? "Siguiente pregunta (N)" : "Pregunta corta");
    poner("botonPregunta", "disabled", !(ejOculto || pedir || (!P.ejAbierto && P.fase && !P.panelVisible)));
    if (P.ejAbierto) {
      var ejA = P.ejAbierto, puede = puedeSaltar(ejA);
      poner("botonSaltar", "oculto", !puede);
      poner("ejSaltarTexto", "text", ejA.conversion ? "" : puede ? "" : "Podrás saltarlo en " + mmss((ejA.minimoSaltar || 0) * 60000 - (tiempoJuego() - (ejA.inicioJuego || 0))));
    }
  }

  var ultimoCuadro = 0, vigilante = null;
  function bucle() {
    if (!P) return;
    paso(true);
    requestAnimationFrame(bucle);
  }
  function paso(pintar) {
    var ahora = red.ahora();
    ultimoCuadro = Date.now();
    actualizar(ahora);
    if (!P) return;
    if (pintar) dibujar(ahora);
    actualizarHud(ahora);
  }
  // Si la pestaña queda en segundo plano el navegador para los cuadros: el juego sigue avanzando igualmente.
  function vigilar() {
    clearInterval(vigilante);
    vigilante = setInterval(function () {
      if (!P) { clearInterval(vigilante); return; }
      if (Date.now() - ultimoCuadro > 300) paso(false);
    }, 250);
  }

  // ---------- herramientas de prueba (solo en práctica) ----------
  function herramientaPrueba(e) {
    var b = e.target.closest("button"); if (!b || !P) return;
    var j = P.jugador, que = b.getAttribute("data-prueba");
    if (que === "debil" || que === "fuerte" || que === "fuerte2") {
      if (P.ejAbierto || P.eliminado) aviso("Primero resuelve el ejercicio");
      else darTiempo(que === "debil" ? TIEMPO.pregunta : TIEMPO.ejercicio, que);
    } else if (que === "golpe" || que === "cero") {
      if (esFantasma(j)) aviso("Los fantasmas no reciben daño");
      else if (que === "golpe" && j.escudo) { aviso("Tu escudo ha parado el golpe"); Sonido.tocar("bloqueado"); }
      else { j.expr = "herido"; j.exprHasta = red.ahora() + 600; if (que === "golpe") Sonido.tocar("herido"); }
      red.combatePropio(function (c) {
        if (que === "cero") c.vida = 0; else if (c.escudo) c.escudo = false; else c.vida = Math.max(0, c.vida - 5);
        return c;
      });
    } else if (que === "menu" && op.alSalir) { var f = op.alSalir; detener(); f(); }
    else if (op.alPrueba) op.alPrueba(que);
    $("pruebasMenu").classList.add("oculto");
    b.blur();
  }

  window.Motor = { estado: function () { return P; }, iniciar: iniciar, detener: detener, preparar: preparar, pintarCara: pintarCara,
    ejercicio: ejercicio, pausa: pausa, calendario: calendario, VIDA_MAX: VIDA_MAX };
})();
