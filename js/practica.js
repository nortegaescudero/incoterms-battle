// Modo práctica: un jugador en su ordenador contra muñecos de prueba (sin internet).
// Este navegador hace también de «profesor»: lanza los ejercicios del calendario y los corrige.
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var VIDA_MAX = Motor.VIDA_MAX;
  var DIRS = { arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0] };

  // ---------- adaptador local: hace de «red» guardándolo todo en memoria ----------
  function AdaptadorLocal(corregir, sitios) {
    var m = null, munecos = [], combate = {}, objetos = {}, idObj = 0, temporizador = null, yo = "yo";
    var self = this;
    this.ahora = function () { return Date.now(); };
    this.iniciar = function (motor) {
      m = motor;
      combate[yo] = { vida: VIDA_MAX, escudo: false };
      m.ponerCombate(yo, combate[yo]);
      var pjs = Object.keys(Sprites.PERSONAJES);
      sitios.forEach(function (s, i) {
        var mu = { id: "m" + i, pj: pjs[i % 4], nombre: "Muñeco " + (i + 1), x: s[0], y: s[1], casa: s, dir: "abajo", proximo: Date.now() + 1000 + Math.random() * 3000, muertoHasta: 0 };
        munecos.push(mu);
        combate[mu.id] = { vida: VIDA_MAX, escudo: i === 1 };
        m.ponerOtro(mu.id, mu);
        m.ponerCombate(mu.id, combate[mu.id]);
      });
      self.anadirObjetos(8);
      temporizador = setInterval(pasear, 200);
    };
    this.detener = function () { clearInterval(temporizador); };
    function ocupada(x, y) {
      return munecos.some(function (o) { return combate[o.id].vida > 0 && o.x === x && o.y === y; }) ||
        (m.jugador().x === x && m.jugador().y === y);
    }
    function pasear() {
      var ahora = Date.now();
      munecos.forEach(function (mu) {
        var c = combate[mu.id];
        if (c.vida <= 0) {
          if (ahora >= mu.muertoHasta) { mu.x = mu.casa[0]; mu.y = mu.casa[1]; c.vida = VIDA_MAX; m.ponerOtro(mu.id, mu); m.ponerCombate(mu.id, c); }
          return;
        }
        if (ahora < mu.proximo) return;
        mu.proximo = ahora + 1500 + Math.random() * 2500;
        var dirs = Object.keys(DIRS).sort(function () { return Math.random() - 0.5; });
        for (var i = 0; i < dirs.length; i++) {
          var d = DIRS[dirs[i]], nx = mu.x + d[0], ny = mu.y + d[1];
          if (Math.abs(nx - mu.casa[0]) + Math.abs(ny - mu.casa[1]) <= 3 && Mapa.puedePisar(mu.x, mu.y, nx, ny, false) && !ocupada(nx, ny)) {
            mu.x = nx; mu.y = ny; mu.dir = dirs[i]; m.ponerOtro(mu.id, mu); break;
          }
        }
      });
    }
    this.anadirObjetos = function (n) {
      var tipos = Sprites.OBJETOS;
      for (var i = 0; i < n && Object.keys(objetos).length < 12; i++) {
        var c = Mapa.casillaLibre(m.ocupadas()); if (!c) break;
        var id = "o" + (++idObj);
        objetos[id] = { tipo: Sprites.objetoAlAzar(), x: c[0], y: c[1] };
        m.ponerObjeto(id, objetos[id]);
      }
    };
    this.publicarPosicion = function () {};
    this.guardarPropio = function () {};
    this.publicarEvento = function () {};
    this.sumar = function () {};
    this.anotarRespuesta = function () {};
    this.marcarSaltado = function () {};
    this.enviarRespuesta = function (ej, valores) {
      var ok = corregir(ej, valores);
      if (ok && ej === "conv") setTimeout(function () { m.ponerPropio({ estado: "fantasma" }); }, 600);
      return new Promise(function (r) { setTimeout(function () { r(ok); }, 300); });
    };
    this.recoger = function (id) {
      var ok = !!objetos[id];
      delete objetos[id]; m.quitarObjeto(id);
      return Promise.resolve(ok);
    };
    this.combatePropio = function (fn) {
      combate[yo] = fn(Object.assign({}, combate[yo]));
      m.ponerCombate(yo, combate[yo]);
      return Promise.resolve();
    };
    this.golpear = function (id, dano, minimo) {
      var c = combate[id], antes = c.vida, r;
      if (c.vida <= 0) return Promise.resolve(null);
      if (c.escudo) { c.escudo = false; r = { real: 0, bloqueado: true, antes: antes, despues: antes }; }
      else { c.vida = Math.max(minimo || 0, Math.min(antes, antes - dano)); r = { real: antes - c.vida, bloqueado: false, antes: antes, despues: c.vida }; }
      var mu = munecos.find(function (x) { return x.id === id; });
      if (c.vida <= 0 && mu) mu.muertoHasta = Date.now() + 5000;
      m.ponerCombate(id, c);
      return Promise.resolve(r);
    };
  }

  // ---------- menú ----------
  var banco = null, pjElegido = null, listo = false;
  function mostrarResumen() {
    if (!banco) { $("resumenExcel").innerHTML = ""; return; }
    $("resumenExcel").innerHTML = Comun.resumenBanco(banco);
    comprobar();
  }
  function comprobar() { $("botonJugar").disabled = !(banco && banco.cortas.length && pjElegido && listo); }

  Comun.botonExcel($("botonExcel"), $("archivo"), function (b, error) {
    if (error) { $("resumenExcel").innerHTML = "<div class='error'>" + Comun.escapar(error) + "</div>"; return; }
    banco = b; mostrarResumen();
  });
  banco = Comun.bancoGuardado();
  if (banco) { mostrarResumen(); $("botonExcel").textContent = "Cambiar Excel…"; }

  Mapa.LISTA.forEach(function (m) { var o = document.createElement("option"); o.value = m.id; o.textContent = m.nombre; $("selMapa").appendChild(o); });

  // Dónde empieza el jugador y dónde se ponen los muñecos (algunos cerca, para practicar enseguida).
  function posiciones() {
    if (Mapa.actual() === "campo") return { yo: [16, 15], munecos: [[13, 18], [19, 12], [22, 15], [10, 14], [24, 9], [35, 16], [26, 24]] };
    var yo = Mapa.SALIDAS[3], ocup = [yo], munecos = [];
    for (var i = 0; i < 4000 && munecos.length < 7; i++) {
      var c = Mapa.casillaLibre(ocup); if (!c) break;
      var d = Math.abs(c[0] - yo[0]) + Math.abs(c[1] - yo[1]);
      if (d >= 3 && d <= (munecos.length < 4 ? 7 : 20)) { munecos.push(c); ocup.push(c); }
    }
    return { yo: yo, munecos: munecos };
  }

  Sprites.cargar(function () {
    Comun.tarjetasPersonaje($("personajes"), function (pj) { pjElegido = pj; comprobar(); });
    Motor.preparar();
    listo = true; comprobar();
  });

  // ---------- partida de práctica: este navegador hace de anfitrión ----------
  var reloj = null;
  $("botonJugar").onclick = function () {
    $("menu").classList.add("oculto");
    Mapa.usar($("selMapa").value);
    var pos = posiciones();
    var inicio = Date.now(), cal = Comun.calendarioDefecto(banco), sig = 0, lanzados = {};
    var nConv = Comun.numeroConversion(banco), conv = nConv !== null ? Comun.buscarEjercicio(banco, "calculo", nConv) : null;
    function tiempo() { return Date.now() - inicio; }
    function corregir(id, valores) {
      if (id === "conv") return !!conv && Correccion.corregir("calculo", conv, valores);
      var l = lanzados[id]; return !!l && Correccion.corregir(l.tipo, l.ex, valores);
    }
    var red = new AdaptadorLocal(corregir, pos.munecos);
    function lanzar() {
      while (sig < cal.length) {
        var c = cal[sig], ex = Comun.buscarEjercicio(banco, c.tipo, c.numero), id = "e" + sig;
        sig++;
        if (!ex) continue;
        lanzados[id] = { tipo: c.tipo, ex: ex };
        Motor.ejercicio(Object.assign({ id: id, titulo: Comun.nombreEjercicio(c.tipo, c.numero), minimoSaltar: c.minimoSaltar, inicioJuego: tiempo() }, Comun.ejercicioSinSolucion(c.tipo, ex)));
        red.anadirObjetos(4);
        break;
      }
      Motor.calendario(cal, sig);
    }
    Motor.iniciar({
      id: "yo", pj: pjElegido, nombre: "Tú", banco: banco, pruebas: true, propio: { x: pos.yo[0], y: pos.yo[1] },
      conversion: conv ? Comun.ejercicioSinSolucion("calculo", conv) : null,
      tiempoJuego: tiempo,
      alPrueba: function (que) { if (que === "ejercicio") lanzar(); else if (que === "objetos") red.anadirObjetos(4); },
      alSalir: function () { clearInterval(reloj); $("menu").classList.remove("oculto"); }
    }, red);
    Motor.calendario(cal, sig);
    clearInterval(reloj);
    reloj = setInterval(function () { if (sig < cal.length && tiempo() >= cal[sig].minuto * 60000) lanzar(); }, 1000);
  };
})();
