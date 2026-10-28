// Adaptador de red: conecta el motor del juego con Firebase Realtime Database.
//   partidas/{codigo}/jugadores/{id}  posición, personaje y datos propios (cada alumno escribe el suyo)
//   partidas/{codigo}/combate/{id}    vida y escudo (se cambian con transacciones: los ataques no chocan)
//   partidas/{codigo}/objetos/{id}    objetos del mapa (el primero que lo coge lo borra)
//   partidas/{codigo}/eventos/{id}    ataques y golpes, para dibujar los efectos en todos
(function () {
  "use strict";

  function AdaptadorRed(con, codigo, id) {
    var base = con.db.ref("partidas/" + codigo), yo = base.child("jugadores/" + id), refs = [];
    function escuchar(ref, evento, fn) { ref.on(evento, fn); refs.push([ref, evento, fn]); }

    this.ahora = con.ahora;
    this.iniciar = function (m) {
      var jug = base.child("jugadores"), com = base.child("combate"), obj = base.child("objetos");
      function jugador(s) { if (s.key === id) m.ponerPropio(s.val()); else m.ponerOtro(s.key, s.val()); }
      escuchar(jug, "child_added", jugador);
      escuchar(jug, "child_changed", jugador);
      escuchar(jug, "child_removed", function (s) { m.quitarOtro(s.key); });
      escuchar(com, "child_added", function (s) { m.ponerCombate(s.key, s.val()); });
      escuchar(com, "child_changed", function (s) { m.ponerCombate(s.key, s.val()); });
      escuchar(obj, "child_added", function (s) { m.ponerObjeto(s.key, s.val()); });
      escuchar(obj, "child_changed", function (s) { m.ponerObjeto(s.key, s.val()); });
      escuchar(obj, "child_removed", function (s) { m.quitarObjeto(s.key); });
      escuchar(base.child("eventos").orderByChild("t").startAt(con.ahora() - 3000), "child_added", function (s) { m.evento(s.val()); });
    };
    this.detener = function () { refs.forEach(function (r) { r[0].off(r[1], r[2]); }); refs = []; };

    this.publicarPosicion = function (p) { yo.update({ x: p.x, y: p.y, dir: p.dir }); };
    this.guardarPropio = function (c) { yo.update(c); };
    this.publicarEvento = function (ev) { ev.t = Comun.TS(); base.child("eventos").push(ev); };
    this.sumar = function (c) {
      var u = {};
      Object.keys(c).forEach(function (k) { u[k] = Comun.mas(c[k]); });
      yo.update(u);
    };
    this.anotarRespuesta = function (n, bien) {
      var u = {};
      u[bien ? "aciertos" : "fallos"] = Comun.mas(1);
      u["porPregunta/" + n + "/" + (bien ? "a" : "f")] = Comun.mas(1);
      yo.update(u);
    };
    this.recoger = function (idObj) {
      var mio = false;
      return base.child("objetos/" + idObj).transaction(function (cur) {
        if (cur === null) { mio = false; return; }
        mio = true; return null;
      }).then(function (r) { return r.committed && mio; }, function () { return false; });
    };
    this.combatePropio = function (fn) {
      return base.child("combate/" + id).transaction(function (cur) { return cur ? fn(cur) : cur; });
    };
    this.enviarRespuesta = function (ej, valores) {
      // la corrige el navegador del profesor, que es el único que tiene las soluciones
      var ref = base.child("respuestas").push({ de: id, ej: ej, valores: valores, t: Comun.TS() });
      return new Promise(function (ok) {
        var fin = setTimeout(function () { ref.child("ok").off("value", mirar); ok(null); }, 20000);
        function mirar(s) { if (s.val() === null) return; clearTimeout(fin); ref.child("ok").off("value", mirar); ok(s.val()); }
        ref.child("ok").on("value", mirar);
      });
    };
    this.marcarSaltado = function (ej) { yo.child("ejercicios/" + ej + "/saltado").set(true); };
    // minimo: la vida que se deja como poco (1 si ataca un fantasma: no puede dar el golpe final)
    this.golpear = function (idObjetivo, dano, minimo) {
      var r = null;
      return base.child("combate/" + idObjetivo).transaction(function (cur) {
        if (!cur || !(cur.vida > 0)) { r = null; return; }
        var antes = cur.vida;
        if (cur.escudo) { r = { real: 0, bloqueado: true, antes: antes, despues: antes }; return { vida: antes, escudo: false }; }
        var despues = Math.max(minimo || 0, antes - dano);
        if (despues >= antes) { r = { real: 0, bloqueado: false, antes: antes, despues: antes }; return; }
        r = { real: antes - despues, bloqueado: false, antes: antes, despues: despues };
        return { vida: despues, escudo: false };
      }).then(function (res) { return res.committed || (r && r.real === 0) ? r : null; }, function () { return null; });
    };
  }

  window.AdaptadorRed = AdaptadorRed;
})();
