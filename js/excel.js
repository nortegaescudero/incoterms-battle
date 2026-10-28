// Lectura del banco de preguntas (Excel) en el navegador con SheetJS.
(function () {
  "use strict";

  function normalizar(s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/\s+/g, " ").trim();
  }

  // Números con decimales "rotos" al crear el Excel (0,8999999999999999 → 0,9).
  function limpiarNumeros(texto) {
    return String(texto == null ? "" : texto).replace(/\d+([.,])\d{7,}/g, function (m, sep) {
      var n = Math.round(parseFloat(m.replace(",", ".")) * 1e6) / 1e6;
      return String(n).replace(".", sep);
    });
  }

  function hoja(libro, ...claves) {
    var nombre = libro.SheetNames.find(function (n) {
      var k = normalizar(n);
      return claves.some(function (c) { return k.indexOf(c) >= 0; });
    });
    return nombre ? XLSX.utils.sheet_to_json(libro.Sheets[nombre], { defval: "", raw: true }) : null;
  }

  // Busca una columna por el principio de su encabezado (sin tildes ni mayúsculas).
  function col(fila, ...inicios) {
    var claves = Object.keys(fila);
    for (var i = 0; i < inicios.length; i++) {
      var k = claves.find(function (c) { return normalizar(c).indexOf(inicios[i]) === 0; });
      if (k !== undefined) return fila[k];
    }
    return "";
  }

  function texto(v) { return limpiarNumeros(String(v == null ? "" : v).trim()); }
  function numero(v) {
    if (typeof v === "number") return Math.round(v * 100) / 100;
    var s = String(v).trim().replace(/€|\s/g, "");
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    var n = parseFloat(s.replace(/,/g, ""));
    return isNaN(n) ? null : Math.round(n * 100) / 100;
  }
  function minutos(v) {
    var m = String(v).match(/\d+(?:[.,]\d+)?/);
    return m ? parseFloat(m[0].replace(",", ".")) : null;
  }

  function leerCalendario(filas, avisos) {
    if (!filas) { avisos.push("No hay hoja «Calendario»: se usará el calendario por defecto."); return []; }
    return filas.map(function (f) {
      var minuto = col(f, "minuto"), que = texto(col(f, "que sale"));
      var nq = normalizar(que), skip = normalizar(col(f, "tiempo minimo"));
      var tipo = nq.indexOf("conversion") >= 0 || normalizar(minuto).indexOf("0 de vida") >= 0 ? "conversion"
        : nq.indexOf("teorico") >= 0 ? "teorico" : nq.indexOf("calculo") >= 0 ? "calculo" : "cortas";
      var num = (que.replace(/\(.*?\)/g, "").match(/\d+/) || [null])[0];
      return {
        minuto: typeof minuto === "number" ? minuto : (/^\s*\d/.test(minuto) ? minutos(minuto) : null),
        minutoTexto: String(minuto), que: que, tipo: tipo, numero: num ? parseInt(num, 10) : null,
        minimoSaltar: skip.indexOf("no se puede") >= 0 ? null : (minutos(skip) || 0),
        premio: texto(col(f, "premio"))
      };
    }).filter(function (c) { return c.que; });
  }

  function leerCortas(filas, avisos) {
    if (!filas) { avisos.push("ERROR: falta la hoja «Preguntas cortas»."); return []; }
    var lista = [];
    filas.forEach(function (f, i) {
      var preg = texto(col(f, "pregunta"));
      if (!preg) return;
      var opciones = [];
      "ABCDEF".split("").forEach(function (L) {
        var t = texto(f[L] !== undefined ? f[L] : col(f, L.toLowerCase()));
        if (t) opciones.push({ letra: L, texto: t });
      });
      var correcta = normalizar(col(f, "correcta")).toUpperCase().charAt(0);
      if (opciones.length < 2 || !opciones.some(function (o) { return o.letra === correcta; })) {
        avisos.push("Pregunta corta de la fila " + (i + 2) + " ignorada: le faltan opciones o la letra correcta.");
        return;
      }
      lista.push({ n: col(f, "n") || i + 1, pregunta: preg, opciones: opciones, correcta: correcta, explicacion: texto(col(f, "explicacion")) });
    });
    return lista;
  }

  function leerTeoricos(filas, avisos) {
    if (!filas) { avisos.push("No hay hoja «Teórico-prácticos»."); return []; }
    return filas.filter(function (f) { return texto(col(f, "enunciado")); }).map(function (f, i) {
      return {
        n: col(f, "n") || i + 1, cuando: texto(col(f, "cuando")), enunciado: texto(col(f, "enunciado")),
        ejemplo: texto(col(f, "ejemplo")), incoterm: texto(col(f, "incoterm")).toUpperCase(),
        lugarModelo: texto(col(f, "lugar")),
        claves: texto(col(f, "palabras clave")).split("/").map(function (s) { return s.trim(); }).filter(Boolean),
        explicacion: texto(col(f, "explicacion"))
      };
    });
  }

  function leerCalculos(filas, avisos) {
    if (!filas) { avisos.push("No hay hoja «Ejercicios de cálculo»."); return []; }
    return filas.filter(function (f) { return texto(col(f, "enunciado")); }).map(function (f, i) {
      var pide = [];
      [1, 2, 3].forEach(function (k) {
        var et = texto(col(f, "se pide " + k)), sol = numero(col(f, "solucion " + k));
        if (et) pide.push({ etiqueta: et, solucion: sol });
        if (et && sol === null) avisos.push("Ejercicio de cálculo " + (i + 1) + ": falta la solución " + k + ".");
      });
      return { n: col(f, "n") || i + 1, cuando: texto(col(f, "cuando")), enunciado: texto(col(f, "enunciado")), pide: pide, resolucion: texto(col(f, "resolucion")) };
    });
  }

  function leerBanco(datos, nombreArchivo) {
    var libro = XLSX.read(datos, { type: "array" });
    var avisos = [];
    var banco = {
      archivo: nombreArchivo || "",
      calendario: leerCalendario(hoja(libro, "calendario"), avisos),
      cortas: leerCortas(hoja(libro, "preguntas cortas", "cortas"), avisos),
      teoricos: leerTeoricos(hoja(libro, "teorico"), avisos),
      calculos: leerCalculos(hoja(libro, "calculo"), avisos)
    };
    banco.avisos = avisos;
    return banco;
  }

  window.Excel = { leerBanco: leerBanco, normalizar: normalizar, limpiarNumeros: limpiarNumeros };
})();
