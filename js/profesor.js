// Página del profesor: crea la partida, gestiona la sala y hace de «anfitrión»:
// lleva el reloj, lanza los ejercicios del calendario, los corrige, reparte objetos y cierra la partida.
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function mostrar(id) { ["pCrear", "pSala", "pPanel", "pFin"].forEach(function (p) { $(p).classList.toggle("oculto", p !== id); }); }
  function mmss(ms) { var s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  var LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", MAX_OBJETOS = 18;

  var banco = Comun.bancoGuardado(), con = null, base = null, codigo = null;
  var partida = {}, jugadores = {}, combate = {}, objetos = {}, escuchas = [], reloj = null, limpieza = null, terminando = false;
  var spritesListos = new Promise(function (ok) { Sprites.cargar(ok); });

  // =====================================================================
  // CREAR: Excel, ajustes y calendario
  // =====================================================================
  function comprobar() { $("botonCrear").disabled = !(banco && banco.cortas.length); }
  function cargarBanco(b) {
    banco = b;
    $("resumenExcel").innerHTML = Comun.resumenBanco(banco);
    pintarCalendario(Comun.calendarioDefecto(banco));
    var sel = $("selConversion"); sel.innerHTML = "";
    banco.calculos.forEach(function (c) { var o = document.createElement("option"); o.value = c.n; o.textContent = "Cálculo " + c.n + (c.cuando ? " (" + c.cuando + ")" : ""); sel.appendChild(o); });
    var n = Comun.numeroConversion(banco); if (n !== null) sel.value = n;
    comprobar();
  }
  if (banco) { cargarBanco(banco); $("botonExcel").textContent = "Cambiar Excel…"; }
  comprobar();
  Comun.botonExcel($("botonExcel"), $("archivo"), function (b, err) {
    if (err) { $("resumenExcel").innerHTML = "<div class='error'>" + Comun.escapar(err) + "</div>"; return; }
    cargarBanco(b);
  });
  $("enlaceAlumnos").textContent = location.href.replace(/profesor\.html.*$/, "");

  function opcionesEjercicio() {
    var ops = [];
    banco.teoricos.forEach(function (t) { ops.push({ v: "teorico|" + t.n, t: Comun.nombreEjercicio("teorico", t.n) }); });
    banco.calculos.forEach(function (c) { ops.push({ v: "calculo|" + c.n, t: Comun.nombreEjercicio("calculo", c.n) }); });
    return ops;
  }
  function filaCalendario(c) {
    var tr = document.createElement("tr");
    tr.innerHTML = "<td><input type='number' min='0' max='180' class='cal-min'></td><td><select class='cal-ej'></select></td>" +
      "<td><input type='number' min='0' max='60' class='cal-skip'></td><td><button class='quitar' title='Quitar'>✕</button></td>";
    var sel = tr.querySelector("select");
    opcionesEjercicio().forEach(function (o) { var op = document.createElement("option"); op.value = o.v; op.textContent = o.t; sel.appendChild(op); });
    tr.querySelector(".cal-min").value = c.minuto;
    sel.value = c.tipo + "|" + c.numero;
    tr.querySelector(".cal-skip").value = c.minimoSaltar;
    tr.querySelector(".quitar").onclick = function () { tr.remove(); };
    $("tablaCalendario").appendChild(tr);
  }
  function pintarCalendario(cal) { $("tablaCalendario").innerHTML = ""; cal.forEach(filaCalendario); }
  function leerCalendario() {
    return Array.prototype.map.call($("tablaCalendario").children, function (tr) {
      var v = tr.querySelector(".cal-ej").value.split("|");
      return { minuto: Math.max(0, +tr.querySelector(".cal-min").value || 0), tipo: v[0], numero: isNaN(+v[1]) ? v[1] : +v[1], minimoSaltar: Math.max(0, +tr.querySelector(".cal-skip").value || 0) };
    }).sort(function (a, b) { return a.minuto - b.minuto; });
  }
  $("botonAnadirEj").onclick = function () {
    if (!banco) return;
    var cal = leerCalendario(), ult = cal.length ? cal[cal.length - 1].minuto + 3 : 2, o = opcionesEjercicio()[0];
    if (o) filaCalendario({ minuto: ult, tipo: o.v.split("|")[0], numero: o.v.split("|")[1], minimoSaltar: 2 });
  };
  $("botonRestaurarCal").onclick = function () { if (banco) pintarCalendario(Comun.calendarioDefecto(banco)); };

  function errorCrear(txt) { $("errorCrear").textContent = txt; $("botonCrear").disabled = false; }

  $("botonCrear").onclick = function () {
    $("botonCrear").disabled = true; $("errorCrear").textContent = "Creando…";
    var cal = leerCalendario(), nConv = $("selConversion").value, conv = nConv ? Comun.buscarEjercicio(banco, "calculo", nConv) : null;
    Comun.conectar().then(function (c) {
      con = c;
      return nuevoCodigo(0);
    }).then(function (cod) {
      codigo = cod;
      // A los alumnos solo les llega lo que necesitan: nunca las soluciones de los ejercicios grandes.
      return con.db.ref("partidas/" + codigo).set({
        creador: con.uid, estado: "espera", creada: Comun.TS(),
        config: { duracionMax: +$("duracion").value || 50, objetosIniciales: Math.min(MAX_OBJETOS, +$("objetosIniciales").value || 0), conversion: nConv || null },
        banco: { cortas: banco.cortas }, calendario: cal, siguienteEj: 0,
        conversion: conv ? Comun.ejercicioSinSolucion("calculo", conv) : null
      });
    }).then(function () {
      localStorage.setItem("ib_profesor", JSON.stringify({ codigo: codigo }));
      $("errorCrear").textContent = "";
      abrir();
    }).catch(function (e) {
      errorCrear(e && e.message === "sin-config" ? "Falta la configuración de Firebase (ver GUIA_FIREBASE.md)." : "No se ha podido crear la partida: " + (e && e.message || e));
    });
  };
  function nuevoCodigo(intento) {
    var cod = ""; for (var i = 0; i < 6; i++) cod += LETRAS.charAt(Math.floor(Math.random() * LETRAS.length));
    return con.db.ref("partidas/" + cod + "/estado").once("value").then(function (s) {
      if (s.exists() && intento < 10) return nuevoCodigo(intento + 1);
      return cod;
    }, function () { return cod; });
  }

  // =====================================================================
  // ESCUCHAR LA PARTIDA
  // =====================================================================
  function escuchar(ref, ev, fn) { ref.on(ev, fn); escuchas.push([ref, ev, fn]); }
  function abrir() {
    base = con.db.ref("partidas/" + codigo);
    $("codigoGrande").textContent = codigo; $("codigoPanel").textContent = codigo;
    base.child("config").once("value").then(function (s) {
      partida.config = s.val() || {};
      escuchar(base.child("jugadores"), "value", function (s2) { jugadores = s2.val() || {}; pintar(); });
      escuchar(base.child("combate"), "value", function (s2) { combate = s2.val() || {}; pintar(); });
      escuchar(base.child("objetos"), "value", function (s2) { objetos = s2.val() || {}; });
      escuchar(base.child("reloj"), "value", function (s2) { partida.reloj = s2.val() || null; });
      escuchar(base.child("calendario"), "value", function (s2) { partida.calendario = s2.val() || []; });
      escuchar(base.child("siguienteEj"), "value", function (s2) { partida.siguienteEj = s2.val() || 0; });
      escuchar(base.child("ejercicio"), "value", function (s2) { partida.ejercicio = s2.val(); pintarEjercicio(); });
      escuchar(base.child("respuestas"), "child_added", corregirRespuesta);
      escuchar(base.child("estado"), "value", function (s2) { partida.estado = s2.val(); cambiarEstado(); });
    });
  }
  function cerrar() { escuchas.forEach(function (e) { e[0].off(e[1], e[2]); }); escuchas = []; clearInterval(reloj); clearInterval(limpieza); }

  function cambiarEstado() {
    var e = partida.estado;
    if (e === "espera") mostrar("pSala");
    else if (e === "jugando" || e === "pausa") {
      mostrar("pPanel");
      $("botonPausa").textContent = e === "pausa" ? "Reanudar" : "Pausar";
      $("botonPausa").className = "boton" + (e === "pausa" ? " verde" : "");
      clearInterval(reloj); reloj = setInterval(tic, 500); tic();
      clearInterval(limpieza); limpieza = setInterval(limpiarEventos, 30000);
    } else if (e === "fin") { cerrar(); localStorage.removeItem("ib_profesor"); pantallaFinal(); }
    else { cerrar(); localStorage.removeItem("ib_profesor"); mostrar("pCrear"); comprobar(); }
  }

  function enSala() { return Object.keys(jugadores).filter(function (k) { return jugadores[k].nombre && jugadores[k].pj; }); }
  function enJuego() { return enSala().filter(function (k) { return combate[k]; }); }
  function esVivo(k) { return combate[k] && combate[k].vida > 0 && jugadores[k].estado !== "fantasma"; }

  function pintar() {
    spritesListos.then(function () {
      if (partida.estado === "espera") pintarSala(); else if (partida.estado === "jugando" || partida.estado === "pausa") pintarPanel();
    });
  }

  // =====================================================================
  // SALA DE ESPERA
  // =====================================================================
  function pintarSala() {
    var ids = enSala(), lista = $("salaLista");
    $("salaCuantos").textContent = ids.length;
    $("botonComenzar").disabled = !ids.length;
    lista.innerHTML = "";
    ids.forEach(function (k) {
      var j = jugadores[k], d = document.createElement("div");
      d.className = "en-sala" + (j.conectado === false ? " apagado" : "");
      var cv = document.createElement("canvas"); cv.width = cv.height = 96; Comun.retrato(cv, j.pj);
      d.appendChild(cv); d.appendChild(document.createTextNode(j.nombre));
      var b = document.createElement("button"); b.className = "expulsar"; b.textContent = "Expulsar"; b.title = "Sacar de la partida";
      b.onclick = function () { if (confirm("¿Sacar a «" + j.nombre + "» de la partida?")) expulsar(k); };
      d.appendChild(b);
      lista.appendChild(d);
    });
  }
  function expulsar(k) {
    var u = {}; u["expulsados/" + k] = true; u["jugadores/" + k] = null; u["combate/" + k] = null;
    base.update(u);
  }

  // Comenzar: reparte a cada alumno en un punto de salida y pone los objetos.
  $("botonComenzar").onclick = function () {
    $("botonComenzar").disabled = true;
    var u = {}, ocupadas = [];
    enSala().forEach(function (k) {
      var s = Mapa.salidaLibre(ocupadas); ocupadas.push(s);
      u["jugadores/" + k + "/x"] = s[0]; u["jugadores/" + k + "/y"] = s[1]; u["jugadores/" + k + "/dir"] = "abajo"; u["jugadores/" + k + "/estado"] = "vivo";
      u["combate/" + k] = { vida: 30, escudo: false };
    });
    var n = partida.config.objetosIniciales === undefined ? 12 : partida.config.objetosIniciales;
    ponerObjetos(u, n, ocupadas);
    u.estado = "jugando"; u.reloj = { inicio: Comun.TS(), pausadoMs: 0, pausaDesde: null };
    base.update(u);
  };
  function ponerObjetos(u, n, ocupadas) {
    var hay = Object.keys(objetos).length;
    for (var i = 0; i < n && hay + i < MAX_OBJETOS; i++) {
      var c = Mapa.casillaLibre(ocupadas); if (!c) break; ocupadas.push(c);
      u["objetos/" + base.child("objetos").push().key] = { tipo: Sprites.OBJETOS[Math.floor(Math.random() * 5)], x: c[0], y: c[1] };
    }
  }
  $("botonCancelar").onclick = function () {
    if (!confirm("¿Borrar esta partida? Los alumnos que hayan entrado tendrán que entrar en otra.")) return;
    cerrar(); base.remove(); localStorage.removeItem("ib_profesor"); mostrar("pCrear"); comprobar();
  };

  // =====================================================================
  // ANFITRIÓN: reloj, calendario, eliminados y fin
  // =====================================================================
  function tiempoJuego() {
    var r = partida.reloj; if (!r || !r.inicio) return 0;
    var ahora = con.ahora();
    return ahora - r.inicio - (r.pausadoMs || 0) - (r.pausaDesde ? ahora - r.pausaDesde : 0);
  }

  function tic() {
    if (!partida.reloj || terminando) return;
    var t = tiempoJuego(), cal = partida.calendario || [], sig = partida.siguienteEj || 0;
    $("relojPartida").textContent = mmss(t);
    if (sig < cal.length) {
      $("proximoTitulo").textContent = "Próximo: " + Comun.nombreEjercicio(cal[sig].tipo, cal[sig].numero);
      $("proximoEj").textContent = "en " + mmss(cal[sig].minuto * 60000 - t);
    } else { $("proximoTitulo").textContent = "Próximo ejercicio"; $("proximoEj").textContent = "No quedan"; }
    $("botonLanzar").disabled = sig >= cal.length;
    if (partida.estado !== "jugando") return;
    if (sig < cal.length && t >= cal[sig].minuto * 60000) lanzar(sig);
    // quien llega a 0 de vida queda eliminado (se apunta cuándo, para los desempates)
    var u = {};
    enJuego().forEach(function (k) {
      var j = jugadores[k];
      if (combate[k].vida <= 0 && (!j.estado || j.estado === "vivo")) { u["jugadores/" + k + "/estado"] = "eliminado"; u["jugadores/" + k + "/horaEliminado"] = t; }
    });
    if (Object.keys(u).length) base.update(u);
    if (partida.config.duracionMax && t >= partida.config.duracionMax * 60000) terminar("tiempo");
    else if (enJuego().length >= 2 && enJuego().filter(esVivo).length <= 1) terminar("ultimo");
  }

  // Lanza el ejercicio i del calendario para toda la clase (y aparecen objetos nuevos).
  function lanzar(i) {
    var cal = partida.calendario || [], c = cal[i];
    if (!c) return;
    base.child("siguienteEj").transaction(function (cur) { return (cur || 0) === i ? i + 1 : undefined; }).then(function (r) {
      if (!r.committed) return;
      var ex = Comun.buscarEjercicio(banco, c.tipo, c.numero);
      if (!ex) return;
      var u = {};
      u.ejercicio = Object.assign({ id: "e" + i, titulo: Comun.nombreEjercicio(c.tipo, c.numero), minimoSaltar: c.minimoSaltar || 0, inicioJuego: tiempoJuego() },
        Comun.ejercicioSinSolucion(c.tipo, ex));
      ponerObjetos(u, 6, ocupadasMapa());
      base.update(u);
    });
  }
  function ocupadasMapa() {
    var l = [];
    enJuego().forEach(function (k) { if (typeof jugadores[k].x === "number") l.push([jugadores[k].x, jugadores[k].y]); });
    Object.keys(objetos).forEach(function (k) { l.push([objetos[k].x, objetos[k].y]); });
    return l;
  }
  $("botonLanzar").onclick = function () { lanzar(partida.siguienteEj || 0); };

  $("botonPausa").onclick = function () {
    var r = partida.reloj || {}, ahora = con.ahora();
    if (partida.estado === "jugando") base.update({ estado: "pausa", "reloj/pausaDesde": ahora });
    else if (partida.estado === "pausa") base.update({ estado: "jugando", "reloj/pausaDesde": null, "reloj/pausadoMs": (r.pausadoMs || 0) + (r.pausaDesde ? ahora - r.pausaDesde : 0) });
  };

  // ---------- corrección de los ejercicios grandes (solo aquí están las soluciones) ----------
  function ejercicioDe(id) {
    if (id === "conv") { var n = partida.config.conversion; return n ? { tipo: "calculo", ex: Comun.buscarEjercicio(banco, "calculo", n) } : null; }
    var c = (partida.calendario || [])[+String(id).replace("e", "")];
    return c ? { tipo: c.tipo, ex: Comun.buscarEjercicio(banco, c.tipo, c.numero), nombre: Comun.nombreEjercicio(c.tipo, c.numero) } : null;
  }
  function corregirRespuesta(s) {
    var r = s.val(); if (!r || r.ok !== undefined || !banco) return;
    if (!partida.calendario) { setTimeout(function () { corregirRespuesta(s); }, 500); return; }
    var e = ejercicioDe(r.ej), ok = !!(e && e.ex && Correccion.corregir(e.tipo, e.ex, r.valores));
    var u = {};
    u["respuestas/" + s.key + "/ok"] = ok;
    u["jugadores/" + r.de + "/ejercicios/" + r.ej + "/intentos"] = Comun.mas(1);
    if (ok) u["jugadores/" + r.de + "/ejercicios/" + r.ej + "/ok"] = true;
    if (ok && r.ej === "conv") u["jugadores/" + r.de + "/estado"] = "fantasma";
    base.update(u);
  }

  // borra los efectos viejos para que la base de datos no crezca
  function limpiarEventos() {
    base.child("eventos").orderByChild("t").endAt(con.ahora() - 60000).once("value", function (s) {
      var u = {}; s.forEach(function (e) { u[e.key] = null; });
      if (Object.keys(u).length) base.child("eventos").update(u);
    });
  }

  // =====================================================================
  // PANEL DURANTE LA PARTIDA (pensado para proyectar: no muestra posiciones ni soluciones)
  // =====================================================================
  function estadoTexto(k) {
    var j = jugadores[k], c = combate[k] || {};
    if (j.estado === "fantasma") return ["Fantasma", "fantasma"];
    if (c.vida <= 0) return ["Eliminado", "eliminado"];
    if (j.conectado === false) return ["Desconectado", "desconectado"];
    return ["Vivo", "vivo"];
  }
  function textoEjercicio(k) {
    var ej = partida.ejercicio, j = jugadores[k];
    var conv = j.ejercicios && j.ejercicios.conv;
    if (j.estado !== "fantasma" && combate[k] && combate[k].vida <= 0) return "Conversión" + (conv ? " (" + conv.intentos + " int.)" : "");
    if (!ej) return "—";
    var e = j.ejercicios && j.ejercicios[ej.id];
    if (e && e.ok) return "Resuelto";
    if (e && e.saltado) return "Saltado";
    if (j.ejCerrado === ej.id) return "Resuelto";
    return "Resolviendo" + (e && e.intentos ? " (" + e.intentos + " int.)" : "");
  }
  function pintarPanel() {
    var ids = enJuego();
    ids.sort(function (a, b) { return (combate[b].vida - combate[a].vida) || (jugadores[a].nombre > jugadores[b].nombre ? 1 : -1); });
    var cuerpo = $("tablaAlumnos"); cuerpo.innerHTML = "";
    ids.forEach(function (k) {
      var j = jugadores[k], c = combate[k], tr = document.createElement("tr"), est = estadoTexto(k);
      var td0 = document.createElement("td"), cv = document.createElement("canvas"); cv.width = cv.height = 64;
      Comun.retrato(cv, j.estado === "fantasma" ? "fantasma" : j.pj); td0.appendChild(cv); tr.appendChild(td0);
      [j.nombre, null, est[0], j.bajas || 0, j.aciertos || 0, j.fallos || 0, textoEjercicio(k)].forEach(function (v, i) {
        var td = document.createElement("td");
        if (i === 1) td.innerHTML = "<div class='mini-vida'><div style='width:" + (Math.max(0, c.vida) / 30 * 100) + "%'></div><span>" + Math.max(0, c.vida) + "</span></div>";
        else td.textContent = v;
        if (i === 2) td.className = est[1];
        tr.appendChild(td);
      });
      cuerpo.appendChild(tr);
    });
    $("vivosPanel").textContent = ids.filter(esVivo).length;
    $("fantasmasPanel").textContent = ids.filter(function (k) { return jugadores[k].estado === "fantasma"; }).length;
    function ranking(ol, valor) {
      ol.innerHTML = "";
      ids.slice().sort(function (a, b) { return valor(b) - valor(a); }).slice(0, 8).forEach(function (k) {
        var li = document.createElement("li"); li.textContent = jugadores[k].nombre; var b = document.createElement("b"); b.textContent = valor(k); li.appendChild(b); ol.appendChild(li);
      });
    }
    ranking($("rankCombate"), function (k) { return jugadores[k].bajas || 0; });
    ranking($("rankFantasma"), function (k) { return jugadores[k].vidaQuitadaFantasma || 0; });
    pintarEjercicio();
  }

  function pintarEjercicio() {
    var ej = partida.ejercicio;
    $("cajaEjercicio").classList.toggle("oculto", !ej);
    if (!ej) return;
    var ids = enJuego(), hechos = ids.filter(function (k) { var e = jugadores[k].ejercicios && jugadores[k].ejercicios[ej.id]; return e && e.ok; }).length;
    $("ejActualNombre").textContent = "Ejercicio en curso: " + ej.titulo;
    $("ejActualResueltos").textContent = "lo han resuelto " + hechos + " de " + ids.length;
    var e = ejercicioDe(ej.id), sol = $("solucion");
    if (!e || !e.ex) { sol.textContent = "No encuentro este ejercicio en el Excel cargado."; return; }
    if (e.tipo === "teorico") sol.innerHTML = "<b>" + Comun.escapar(e.ex.lugarModelo || e.ex.incoterm) + "</b><br>Palabras clave del lugar: " + Comun.escapar(e.ex.claves.join(" / ")) + "<br>" + Comun.escapar(e.ex.explicacion);
    else sol.innerHTML = "<b>" + e.ex.pide.map(function (p) { return Comun.escapar(p.etiqueta) + " = " + Comun.escapar(String(p.solucion).replace(".", ",")) + " €"; }).join(" · ") + "</b><pre>" + Comun.escapar(e.ex.resolucion) + "</pre>";
  }
  $("botonSolucion").onclick = function () {
    var oculta = $("solucion").classList.toggle("oculto");
    $("botonSolucion").textContent = oculta ? "Ver solución (no lo proyectes)" : "Ocultar solución";
  };

  // =====================================================================
  // FIN Y RESULTADOS
  // =====================================================================
  function terminar(motivo) {
    if (terminando) return;
    terminando = true;
    Promise.all([base.child("jugadores").once("value"), base.child("combate").once("value")]).then(function (r) {
      var res = Final.calcular(r[0].val() || {}, r[1].val() || {}, motivo);
      delete res.filas;
      return base.update({ estado: "fin", fin: Comun.TS(), resultados: res, ejercicio: null, eventos: null });
    }).catch(function () { terminando = false; });
  }
  $("botonTerminar").onclick = function () { if (confirm("¿Terminar la partida para todos?")) terminar("profesor"); };
  $("botonNueva").onclick = function () { terminando = false; mostrar("pCrear"); comprobar(); };

  function pantallaFinal() {
    spritesListos.then(function () { return base.child("resultados").once("value"); }).then(function (s) {
      if (s.val()) { Final.pintar($("finalCont"), s.val(), null); Sonido.tocar("fin"); }
      else $("finalCont").innerHTML = "<h1 class='final-titulo'>Partida terminada</h1>";
      mostrar("pFin");
    });
  }

  // Excel con lo útil para el profesor: clasificación, aciertos por alumno y por pregunta, ejercicios grandes.
  $("botonDescargar").onclick = function () {
    $("botonDescargar").disabled = true;
    Promise.all([Comun.cargarXLSX(), base.once("value")]).then(function (r) {
      var p = r[1].val() || {}, js = p.jugadores || {}, cb = p.combate || {}, cal = p.calendario || [], res = p.resultados || Final.calcular(js, cb, "profesor");
      var ids = Object.keys(js).filter(function (k) { return js[k].nombre && cb[k]; });
      var reyPos = {}; (res.fantasma || []).forEach(function (f, i) { reyPos[f.id] = i + 1; });
      var hojaClas = [["Posición", "Alumno", "Personaje", "Puntos de combate", "Bajas", "Extra por sobrevivir", "Vida quitada (vivo)", "Vida quitada (fantasma)", "Puesto Rey fantasma", "Estado final"]];
      (res.combate || []).forEach(function (f, i) {
        var j = js[f.id] || {};
        hojaClas.push([i + 1, f.nombre, (Sprites.PERSONAJES[f.pj] || {}).nombre || f.pj, f.puntos, f.bajas, f.extra, j.vidaQuitada || 0, j.vidaQuitadaFantasma || 0, reyPos[f.id] || "",
          j.estado === "fantasma" ? "Fantasma" : (cb[f.id] && cb[f.id].vida > 0 ? "En pie" : "Eliminado")]);
      });
      var cab = ["Alumno", "Aciertos", "Fallos", "% acierto"];
      cal.forEach(function (c, i) { cab.push("Min " + c.minuto + ": " + Comun.nombreEjercicio(c.tipo, c.numero)); });
      cab.push("Conversión en fantasma");
      var hojaAl = [cab];
      function estadoEj(e) { if (!e) return "Sin hacer"; if (e.ok) return "Bien (" + (e.intentos || 1) + " int.)"; if (e.saltado) return "Saltado (" + (e.intentos || 0) + " int.)"; return "Sin acertar (" + (e.intentos || 0) + " int.)"; }
      ids.forEach(function (k) {
        var j = js[k], a = j.aciertos || 0, f = j.fallos || 0, fila = [j.nombre, a, f, a + f ? Math.round(a / (a + f) * 100) + " %" : "—"];
        cal.forEach(function (c, i) { fila.push(i < (p.siguienteEj || 0) ? estadoEj(j.ejercicios && j.ejercicios["e" + i]) : "No salió"); });
        fila.push(j.ejercicios && j.ejercicios.conv ? estadoEj(j.ejercicios.conv) : "—");
        hojaAl.push(fila);
      });
      var hojaPr = [["Nº", "Pregunta", "Respuesta correcta", "Aciertos", "Fallos", "% acierto"].concat(ids.map(function (k) { return js[k].nombre; }))];
      banco.cortas.forEach(function (q) {
        var a = 0, f = 0, porAlumno = ids.map(function (k) {
          var pp = js[k].porPregunta && js[k].porPregunta[q.n]; if (!pp) return "";
          a += pp.a || 0; f += pp.f || 0;
          return (pp.a ? "✔" + pp.a : "") + (pp.a && pp.f ? " " : "") + (pp.f ? "✘" + pp.f : "");
        });
        var correcta = (q.opciones.find(function (o) { return o.letra === q.correcta; }) || {}).texto || q.correcta;
        hojaPr.push([q.n, q.pregunta, correcta, a, f, a + f ? Math.round(a / (a + f) * 100) + " %" : "—"].concat(porAlumno));
      });
      var hojaEj = [["Minuto", "Ejercicio", "Enunciado", "Solución", "Resolución / explicación"]];
      cal.forEach(function (c) {
        var ex = Comun.buscarEjercicio(banco, c.tipo, c.numero); if (!ex) return;
        hojaEj.push([c.minuto, Comun.nombreEjercicio(c.tipo, c.numero), ex.enunciado,
          c.tipo === "teorico" ? ex.lugarModelo || ex.incoterm : ex.pide.map(function (q) { return q.etiqueta + " = " + q.solucion + " €"; }).join("\n"),
          c.tipo === "teorico" ? ex.explicacion : ex.resolucion]);
      });
      var libro = XLSX.utils.book_new();
      [["Clasificación", hojaClas], ["Alumnos", hojaAl], ["Preguntas cortas", hojaPr], ["Ejercicios grandes", hojaEj]].forEach(function (h) {
        var ws = XLSX.utils.aoa_to_sheet(h[1]);
        ws["!cols"] = h[1][0].map(function (t, i) { return { wch: i === 1 && h[0] !== "Alumnos" ? 50 : Math.max(10, String(t).length + 2) }; });
        XLSX.utils.book_append_sheet(libro, ws, h[0]);
      });
      var d = new Date(), fecha = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      XLSX.writeFile(libro, "Resultados_" + codigo + "_" + fecha + ".xlsx");
    }).catch(function (e) { alert("No se ha podido preparar el Excel: " + (e && e.message || e)); })
      .then(function () { $("botonDescargar").disabled = false; });
  };

  // al recargar la página, vuelve a la partida que estaba abierta
  var guardada = null;
  try { guardada = JSON.parse(localStorage.getItem("ib_profesor")); } catch (e) { guardada = null; }
  if (guardada && guardada.codigo) {
    Comun.conectar().then(function (c) {
      con = c;
      return con.db.ref("partidas/" + guardada.codigo + "/creador").once("value");
    }).then(function (s) {
      if (s.val() === con.uid) { codigo = guardada.codigo; abrir(); }
      else localStorage.removeItem("ib_profesor");
    }).catch(function () { localStorage.removeItem("ib_profesor"); });
  }
})();
