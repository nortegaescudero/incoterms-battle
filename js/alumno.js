// Página del alumno: entrar con código, elegir personaje, esperar y jugar en red.
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function leer(alm) { try { return JSON.parse(alm.getItem("ib_alumno")); } catch (e) { return null; } }
  function mostrar(id) {
    ["pEntrar", "pPersonaje", "pEspera", "pMensaje", "pFinal"].forEach(function (p) { $(p).classList.toggle("oculto", p !== id); });
  }
  function mensaje(titulo, texto) { Motor.detener(); jugando = false; $("mensajeTitulo").textContent = titulo; $("mensajeTexto").textContent = texto; mostrar("pMensaje"); }

  var con = null, base = null, yo = null, codigo = "", nombre = "", id = "", pj = null, jugando = false, estado = null, escuchas = [];
  var recursosListos = new Promise(function (ok) { Sprites.cargar(function () { Motor.preparar(); ok(); }); });

  // reconexión: la sesión de esta pestaña (recargar) y lo último usado en este ordenador
  var sesion = leer(sessionStorage), ultimo = leer(localStorage);
  var previo = sesion || ultimo;
  if (previo) { $("codigo").value = previo.codigo || ""; $("nombre").value = previo.nombre || ""; }

  $("codigo").addEventListener("input", function () { this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); });
  $("botonEntrar").onclick = function () { entrar($("codigo").value.trim(), $("nombre").value.trim()); };
  [$("codigo"), $("nombre")].forEach(function (el) { el.addEventListener("keydown", function (e) { if (e.key === "Enter") $("botonEntrar").click(); }); });
  $("botonVolver").onclick = function () { location.reload(); };

  function error(txt) { $("errorEntrar").textContent = txt; $("botonEntrar").disabled = false; }

  function entrar(cod, nom) {
    if (cod.length !== 6) return error("El código tiene 6 letras o números.");
    if (!nom) return error("Escribe tu nombre.");
    $("botonEntrar").disabled = true; $("errorEntrar").textContent = "Conectando…";
    Comun.conectar().then(function (c) {
      con = c; codigo = cod; nombre = nom;
      base = con.db.ref("partidas/" + codigo);
      return Promise.all([base.child("estado").once("value"), base.child("jugadores").once("value")]);
    }).then(function (r) {
      var est = r[0].val(), jugadores = r[1].val() || {};
      if (!est) return error("No hay ninguna partida con ese código. Revísalo.");
      if (est === "fin") return error("Esa partida ya ha terminado.");
      // ¿es una vuelta a la partida? (misma pestaña, o mismo nombre y desconectado)
      if (sesion && sesion.codigo === codigo && jugadores[sesion.id]) id = sesion.id;
      else if (ultimo && ultimo.codigo === codigo && jugadores[ultimo.id] && jugadores[ultimo.id].nombre === nombre && jugadores[ultimo.id].conectado === false) id = ultimo.id;
      else id = base.child("jugadores").push().key;
      var datos = { codigo: codigo, nombre: nombre, id: id };
      sessionStorage.setItem("ib_alumno", JSON.stringify(datos));
      localStorage.setItem("ib_alumno", JSON.stringify(datos));
      yo = base.child("jugadores/" + id);
      $("errorEntrar").textContent = "";
      return recursosListos.then(function () {
        if (jugadores[id]) { pj = jugadores[id].pj; nombre = jugadores[id].nombre; dentro(); }
        else elegirPersonaje();
      });
    }).catch(function (e) {
      error(e && e.message === "sin-config" ? "El juego aún no está conectado a Firebase (falta la configuración)." :
        e && /Anónimo/.test(e.message) ? e.message : "No se ha podido conectar. Revisa internet y vuelve a intentarlo.");
    });
  }

  function elegirPersonaje() {
    mostrar("pPersonaje");
    $("botonListo").disabled = !pj;
    Comun.tarjetasPersonaje($("personajes"), function (p) { pj = p; $("botonListo").disabled = false; }, pj);
  }
  $("botonCambiarPj").onclick = elegirPersonaje;
  $("botonListo").onclick = function () {
    $("botonListo").disabled = true;
    var nuevo = !escuchas.length;
    yo.update({ nombre: nombre, pj: pj, conectado: true, unido: Comun.TS() }).then(function () {
      mostrar("pEspera");
      if (nuevo) dentro();
    });
  };

  function escuchar(ref, ev, fn) { ref.on(ev, fn); escuchas.push([ref, ev, fn]); }

  // Ya tiene ficha en la partida: presencia, expulsión y cambios de estado.
  function dentro() {
    escuchar(con.db.ref(".info/connected"), "value", function (s) {
      if (!s.val()) return;
      yo.child("conectado").onDisconnect().set(false);
      yo.child("conectado").set(true);
    });
    escuchar(base.child("expulsados/" + id), "value", function (s) {
      if (!s.val()) return;
      sessionStorage.removeItem("ib_alumno"); localStorage.removeItem("ib_alumno");
      yo.child("conectado").onDisconnect().cancel();
      parar();
      mensaje("Has salido de la partida", "El profesor te ha sacado de la partida. Si ha sido un error, vuelve a entrar con otro nombre.");
    });
    escuchar(base.child("jugadores"), "value", pintarSala);
    escuchar(base.child("estado"), "value", function (s) { estado = s.val(); cambiarEstado(); });
  }
  function parar() { escuchas.forEach(function (e) { e[0].off(e[1], e[2]); }); escuchas = []; }

  function pintarSala(s) {
    if (jugando) return;
    var js = s.val() || {}, lista = $("esperaLista"), ids = Object.keys(js).filter(function (k) { return js[k].nombre && js[k].pj; });
    $("esperaNombre").textContent = nombre;
    $("esperaCuantos").textContent = ids.length;
    lista.innerHTML = "";
    ids.forEach(function (k) {
      var d = document.createElement("div"); d.className = "en-sala" + (k === id ? " yo" : "") + (js[k].conectado === false ? " apagado" : "");
      var cv = document.createElement("canvas"); cv.width = cv.height = 96; Comun.retrato(cv, js[k].pj);
      d.appendChild(cv); d.appendChild(document.createTextNode(js[k].nombre + (k === id ? " (tú)" : "")));
      lista.appendChild(d);
    });
  }

  function cambiarEstado() {
    if (estado === "espera") { if ($("pPersonaje").classList.contains("oculto")) mostrar("pEspera"); }
    else if (estado === "jugando" || estado === "pausa") { if (!jugando) empezar(); else Motor.pausa(estado === "pausa"); }
    else if (estado === "fin") { parar(); Motor.detener(); jugando = false; pantallaFinal(); }
    else if (estado === null) { parar(); mensaje("La partida ya no existe", "El profesor ha borrado la partida."); }
  }

  function pantallaFinal() {
    base.child("resultados").once("value").then(function (s) {
      if (!s.val()) { mensaje("¡Fin de la partida!", "El profesor ha terminado la partida."); return; }
      Final.pintar($("finalCont"), s.val(), id);
      mostrar("pFinal");
      Sonido.tocar("fin");
    });
  }

  // reloj de la partida: cuenta solo el tiempo jugado (sin las pausas)
  var reloj = {};
  function tiempoJuego() {
    if (!reloj.inicio) return 0;
    var ahora = con.ahora();
    return ahora - reloj.inicio - (reloj.pausadoMs || 0) - (reloj.pausaDesde ? ahora - reloj.pausaDesde : 0);
  }
  var cal = [], sig = 0;
  function escucharPartida() {
    escuchar(base.child("reloj"), "value", function (s) { reloj = s.val() || {}; });
    escuchar(base.child("calendario"), "value", function (s) { cal = s.val() || []; Motor.calendario(cal, sig); });
    escuchar(base.child("siguienteEj"), "value", function (s) { sig = s.val() || 0; Motor.calendario(cal, sig); });
    escuchar(base.child("ejercicio"), "value", function (s) { Motor.ejercicio(s.val()); });
  }

  function empezar() {
    jugando = true;
    // el profesor coloca a todos al pulsar «Comenzar»: se espera un momento a que llegue la posición
    var conPosicion = new Promise(function (ok) {
      var fin = setTimeout(listo, 3000);
      function mirar(s) { if (typeof s.val() === "number") listo(); }
      function listo() { clearTimeout(fin); yo.child("x").off("value", mirar); ok(); }
      yo.child("x").on("value", mirar);
    });
    conPosicion.then(function () {
      return Promise.all([base.child("banco").once("value"), base.child("conversion").once("value"), yo.once("value"), base.child("jugadores").once("value"), base.child("combate/" + id).once("value")]);
    }).then(function (r) {
      var banco = r[0].val(), conversion = r[1].val(), propio = r[2].val() || {};
      var tareas = [];
      // si ha entrado con la partida ya empezada, se coloca él mismo
      if (typeof propio.x !== "number") {
        var js = r[3].val() || {}, ocup = [];
        Object.keys(js).forEach(function (k) { if (typeof js[k].x === "number") ocup.push([js[k].x, js[k].y]); });
        var s = Mapa.salidaLibre(ocup);
        propio.x = s[0]; propio.y = s[1]; propio.dir = "abajo";
        tareas.push(yo.update({ x: s[0], y: s[1], dir: "abajo" }));
      }
      if (!r[4].val()) tareas.push(base.child("combate/" + id).set({ vida: Motor.VIDA_MAX, escudo: false }));
      return Promise.all(tareas).then(function () {
        mostrar(null);
        Motor.iniciar({ id: id, pj: pj, nombre: nombre, banco: banco, propio: propio, conversion: conversion ? Object.assign({ tipo: "calculo" }, conversion) : null,
          tiempoJuego: tiempoJuego, pausa: estado === "pausa" },
          new AdaptadorRed(con, codigo, id));
        escucharPartida();
      });
    });
  }

  // recargar la pestaña: vuelve directamente a su partida
  if (sesion && sesion.codigo && sesion.nombre) entrar(sesion.codigo, sesion.nombre);
})();
