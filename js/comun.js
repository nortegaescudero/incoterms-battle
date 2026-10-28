// Piezas compartidas por las páginas del alumno, del profesor y de práctica.
(function () {
  "use strict";

  function escapar(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; }

  // Botón «Elegir Excel…»: lee el archivo, lo guarda en el navegador y avisa con cb(banco, error).
  // La librería del Excel pesa casi 1 MB: solo se descarga cuando hace falta.
  var xlsx = null;
  function cargarXLSX() {
    if (window.XLSX) return Promise.resolve();
    if (!xlsx) xlsx = new Promise(function (ok, mal) {
      var s = document.createElement("script"); s.src = "lib/xlsx.full.min.js"; s.onload = ok;
      s.onerror = function () { xlsx = null; mal(new Error("No se ha podido cargar el lector de Excel.")); };
      document.head.appendChild(s);
    });
    return xlsx;
  }

  function botonExcel(boton, input, cb) {
    boton.onclick = function () { cargarXLSX().catch(function () {}); input.click(); };
    input.onchange = function () {
      var f = input.files[0]; if (!f) return;
      var lector = new FileReader();
      lector.onload = function () {
        cargarXLSX().then(function () { leido(lector.result); }, function (e) { cb(null, e.message); });
      };
      function leido(datos) {
        var banco;
        try { banco = Excel.leerBanco(new Uint8Array(datos), f.name); }
        catch (e) { cb(null, "No se ha podido leer el archivo. ¿Es el Excel del banco de preguntas?"); return; }
        try { localStorage.setItem("ib_banco", JSON.stringify(banco)); } catch (e) { /* sin memoria del navegador */ }
        boton.textContent = "Cambiar Excel…";
        cb(banco);
      }
      lector.readAsArrayBuffer(f);
      input.value = "";
    };
  }
  function bancoGuardado() {
    try { var b = JSON.parse(localStorage.getItem("ib_banco")); if (b) b.avisos = b.avisos || []; return b; } catch (e) { return null; }
  }
  function resumenBanco(banco) {
    var html = "<div class='ok'>✔ " + escapar(banco.archivo) + "</div>" + banco.cortas.length + " preguntas cortas · " +
      banco.teoricos.length + " teórico-prácticos · " + banco.calculos.length + " ejercicios de cálculo · calendario con " + banco.calendario.length + " filas";
    (banco.avisos || []).forEach(function (a) { html += "<div class='" + (a.indexOf("ERROR") === 0 ? "error" : "aviso") + "'>⚠ " + escapar(a) + "</div>"; });
    return html;
  }

  // Dibuja un personaje de frente en un lienzo cuadrado.
  function retrato(cv, pj) {
    var g = cv.getContext("2d"), w = cv.width;
    g.clearRect(0, 0, w, w);
    Sprites.personaje(g, pj, "abajo", "paso0", w / 2, 0.9 * w, { escala: w / Sprites.TAM });
  }

  function tarjetasPersonaje(cont, alElegir, elegido) {
    cont.innerHTML = "";
    Object.keys(Sprites.PERSONAJES).forEach(function (pj) {
      var b = document.createElement("button");
      b.className = "tarjeta-pj pj-" + pj + (pj === elegido ? " sel" : "");
      var cv = document.createElement("canvas"); cv.width = cv.height = 256; retrato(cv, pj);
      b.appendChild(cv);
      b.appendChild(document.createTextNode(Sprites.PERSONAJES[pj].nombre));
      b.onclick = function () {
        cont.querySelectorAll(".tarjeta-pj").forEach(function (x) { x.classList.toggle("sel", x === b); });
        alElegir(pj);
      };
      cont.appendChild(b);
    });
  }

  // Conexión con Firebase (entrada anónima) y reloj común del servidor.
  var conexion = null;
  function conectar() {
    if (conexion) return conexion;
    conexion = new Promise(function (ok, mal) {
      if (!window.FIREBASE_CONFIG || !window.firebase) { mal(new Error("sin-config")); return; }
      if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
      var db = firebase.database(), auth = firebase.auth(), desfase = 0;
      db.ref(".info/serverTimeOffset").on("value", function (s) { desfase = s.val() || 0; });
      var hecho = false;
      auth.onAuthStateChanged(function (u) {
        if (u && !hecho) { hecho = true; ok({ db: db, uid: u.uid, ahora: function () { return Date.now() + desfase; } }); }
      });
      auth.signInAnonymously().catch(function (e) {
        conexion = null;
        if (e && e.code === "auth/admin-restricted-operation") e = new Error("Falta activar la entrada «Anónimo» en Firebase (paso 2 de GUIA_FIREBASE.md).");
        mal(e);
      });
    });
    return conexion;
  }
  var TS = function () { return firebase.database.ServerValue.TIMESTAMP; };
  var mas = function (n) { return firebase.database.ServerValue.increment(n); };

  // ---------- ejercicios grandes ----------
  function buscarEjercicio(banco, tipo, numero) {
    var lista = tipo === "teorico" ? banco.teoricos : banco.calculos;
    return lista.find(function (e) { return String(e.n) === String(numero); }) || lista[(numero || 1) - 1] || null;
  }
  // Calendario por defecto: el de la hoja «Calendario» del Excel.
  function calendarioDefecto(banco) {
    return banco.calendario.filter(function (c) { return (c.tipo === "teorico" || c.tipo === "calculo") && c.minuto !== null; })
      .map(function (c) { return { minuto: c.minuto, tipo: c.tipo, numero: c.numero || 1, minimoSaltar: c.minimoSaltar || 0 }; })
      .sort(function (a, b) { return a.minuto - b.minuto; });
  }
  function numeroConversion(banco) {
    var fila = banco.calendario.find(function (c) { return c.tipo === "conversion"; });
    if (fila && fila.numero) return fila.numero;
    var e = banco.calculos.find(function (c) { return Excel.normalizar(c.cuando).indexOf("conversion") >= 0; });
    return e ? e.n : (banco.calculos.length ? banco.calculos[banco.calculos.length - 1].n : null);
  }
  function nombreEjercicio(tipo, numero) { return (tipo === "teorico" ? "Teórico-práctico " : "Cálculo ") + numero; }
  // Lo que ve el alumno: el enunciado, nunca la solución.
  function ejercicioSinSolucion(tipo, e) {
    if (tipo === "teorico") return { tipo: tipo, enunciado: e.enunciado, ejemplo: e.ejemplo || "" };
    return { tipo: tipo, enunciado: e.enunciado, pide: e.pide.map(function (p) { return p.etiqueta; }) };
  }

  window.Comun = { escapar: escapar, cargarXLSX: cargarXLSX, buscarEjercicio: buscarEjercicio, calendarioDefecto: calendarioDefecto,
    numeroConversion: numeroConversion, nombreEjercicio: nombreEjercicio, ejercicioSinSolucion: ejercicioSinSolucion, botonExcel: botonExcel, bancoGuardado: bancoGuardado, resumenBanco: resumenBanco,
    retrato: retrato, tarjetasPersonaje: tarjetasPersonaje, conectar: conectar, TS: TS, mas: mas };
})();
