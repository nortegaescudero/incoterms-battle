// Corrección de los ejercicios grandes. Solo la usan el profesor (y el modo práctica):
// las soluciones nunca se envían a los alumnos.
(function () {
  "use strict";

  function normalizarTexto(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/incoterms?\s*®?\s*(2020)?/g, " ").replace(/[^a-z0-9ñ]+/g, " ").replace(/\s+/g, " ").trim();
  }

  // Acepta «62.060», «62060», «68.124,43», «68124,43», «68124.43» y «62 060 €».
  function leerNumero(s) {
    var t = String(s == null ? "" : s).replace(/[€\s]/g, "");
    if (!t) return null;
    if (t.indexOf(",") >= 0) t = t.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
    if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
    return parseFloat(t);
  }

  // ej: el ejercicio con soluciones (de la hoja del Excel); v: lo que ha escrito el alumno.
  function corregir(tipo, ej, v) {
    v = v || {};
    if (tipo === "teorico") {
      var inco = String(v.incoterm || "").toUpperCase().replace(/[^A-Z]/g, "");
      var lugar = " " + normalizarTexto(v.lugar) + " ";
      var okLugar = ej.claves.some(function (k) { var n = normalizarTexto(k); return n && lugar.indexOf(n) >= 0; });
      return inco === ej.incoterm && okLugar;
    }
    return ej.pide.every(function (p, i) {
      var n = leerNumero(v["v" + i]);
      return n !== null && p.solucion !== null && Math.abs(n - p.solucion) <= 0.01 + 1e-9;
    });
  }

  window.Correccion = { corregir: corregir, leerNumero: leerNumero };
})();
