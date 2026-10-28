// Mapas de 40 x 30 casillas y su dibujo (mismo estilo que sprites/mapa3f.py).
// Hay varios mapas («campo», «arnedo»); Mapa.usar(id) elige con cuál se juega.
(function () {
  "use strict";
  var T = 64, MW = 40, MH = 30;

  // T árbol · P pino · R roca · B/b roca grande (2x2) · U arbusto · W estanque
  // H meseta · S escalera · : camino · g hierba alta · . césped
  // (los del mapa de ciudad están en js/ciudad.js)
  var CAMPO = [
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    "TTTTTT.TT.T...TTTTP.TTTTTTT.TTTTT..TTTTT",
    "TTTTT.........TTTT....T..U.....T...TTTTT",
    "TTT...HHHHHH..WWW...:..............TTTTT",
    "TTT..HHHHHHH..WW....:::::::::::......TTT",
    "TT...HHHHHHH....Bb..:............P....TT",
    "TT...HHHHHH.TT..bb..:....ggggggg...R.TTT",
    "TT.P....S.R..T...T..:...gggggggg.....TTT",
    "TTT.....:...........:..Pgggggggg....TTTT",
    "TT......:::::::::::::...gggggggg....TTTT",
    "TTTT..R....U..P.....:.R.gggggg......TTTT",
    "TTTT.....T......R.T.:....T.......T..TTTT",
    "TTTT...P...T.....U..:U..T......R..T...TT",
    "TT...........U......:......R.......U..TT",
    "TT.::::::::::::::::::::::::::::::::::TTT",
    "TTTU................:..U...U.:.......TTT",
    "TTT..WWWW.U.gggg....:..gggg..:..HHHH..TT",
    "TT..WWWWWW..gggg..R.:.ggggP..:..HHHHH.TT",
    "TTT.WWWWWW..gggg....:.ggBbg..:..HHHHH.TT",
    "TT.T.WWWW..........T:.ggbbg.T:..HHHHH.TT",
    "TT......U...R...T...:.ggggg..:..P.S...TT",
    "TTT.ggggggg......T.U:....R...:U...:...TT",
    "TT..gggggggg..R.....:::::::::::::::.T.TT",
    "TT..ggggggggT.......:.................TT",
    "TT...ggggggg....P...:...WWWW..ggggTTTTTT",
    "TTTTTT.......TTTT...:.TWWWWW..ggggTTTTTT",
    "TTTTTTTTT..T.TTTT.TT.TTWWWW....TT.TTTTTT",
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT"
  ];
  // Puntos de aparición, repartidos y separados entre sí.
  // Arnedo (La Rioja): zona del IES Celso Díaz, girada para que el Paseo de la Constitución
  // y la carretera Soria-Tafalla (avenida de los Reyes Católicos) queden horizontales.
  var ARNEDO = [
    "XXXXXXEEEEEEEAEEEEEEEEAEEEEEAEEEEEEAEEEE",
    "XXXXXXEEEEEEEAEEEEEEEEAEEEEEAEEEEEEAEEEE",
    "XXXXXaEEEEEEEAEEEEEEEEAEEEEEAEEEEEEAEEEE",
    "XXXXXaaaaaaaaAaaaaaaaaAaaaaaAaaaaaaAaaaa",
    "AAAAAAAAAzAAAzAAAAzAAAzAAAAAAAzAAAAzAAAA",
    "AAAAAAAAAzAAAzAAAAzAAAzAAAAAAAzAAAAzAAAA",
    "aaaaaaaaaAaaaaaaaaAaaaaaaaaaaaAaaaaAaaaa",
    "....T....AIIIIIIIIATqqqqTfffffAEEEEAEEEE",
    ".CCC.ppU.AIIIIIIIIAqqFqqqfffffAEEEEAEEEE",
    ".CCC.....AIIIIIIIIAqqqqqqfffffAqqqqAEEEE",
    "........TAkkkkkqqqAEEEEEUfffffAEEEEAqqqq",
    ".CCC.CCC.AkkkkkqqqAEEEEEqEEEEEAEEEEAEEEE",
    ".CCCUCCC.AkkkkkqqqAEEEEEqEEEEEAEEEEAEEEE",
    "T.g......AAAAAAAAAAAAAAAAAAAAAAAAAAA....",
    "..gg.....ACCC.CCC.AGGGGEEEEEE.AEEEEAEEEE",
    ".CCC.pp.TACCC.CCCTAGGGGEEEEEE.AEEEEAEEEE",
    ".CCC.....A........AkkkkEEEEEE.AEEEEAEEEE",
    ".....CCC.ACCCC.T..Akkkk..gg...AEEEEAEEEE",
    ".T.U.CCC.ACCCC..U.A...U.TggT..A..K.A.K..",
    "aaaaaaaaaAaaaaaaaaAaaaaaaaaaaaAaaaaAaaaa",
    "AAAAAAAAAzAAAAAAAAzAAAAAzAAAAAAAAAAzAAAA",
    "AAAAAAAAAzAAAAAAAAzAAAAAzAAAAAAAAAAzAAAA",
    "aaaaaaaaa:aaaaaaaaaaaaaaAaaaaaaaaaaAaaaa",
    "CCCTCCCC.:.OOOOOOO.aKaKaAZZZZZ.....Aqqqq",
    "CCC.CCCC.:TOOOOOOO.aaaaaAZZZZZ.T...Aqppp",
    ".gggggggT:.kkkkkkk.aKaaaAZZZZZ...T.Aqppp",
    ".ggggggg.:.kkkkkkk.TaaaaAZZZZZU....Aqqqq",
    ":::::gg:::::::::::::::::::::gg::::::::::",
    "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
  ];
  // Puerto de mercancías: m muelle · M mar · J contenedores · Y buque · N almacén · r zona de grúa · V palés
  var PUERTO = [
    "NNNNNNNNNVNNNNNNNNNVNNNNNNNNNVNNNNNNNNNN",
    "NNNNNNNNNmNNNNNNNNNmNNNNNNNNNmNNNNNNNNNN",
    "NNNNNNNNNmNNNNNNNNNmNNNNNNNNNmNNNNNNNNNN",
    "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm",
    "AAAzAAAAAAAAzAAAAAAAAAAAAAzAAAAAAAAAzAAA",
    "AAAzAAAAAAAAzAAAAAAAAAAAAAzAAAAAAAAAzAAA",
    "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm",
    "..mmmJJJJJJmmmJJJJJmJJJJJmmmJJJJJJJmmEEE",
    "T.mmmJJJJJJmmmJJJJJmJJJJJmmmJJJJJJJmmEEE",
    "..mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmEEE",
    "ggmmmmmmVmmmmmmmmmmmmmmmmmmmmmmmmmmmmEEE",
    "ggmmmJJJJJJmmmJJJJmVmJJJJmmmJJJJJJJmmEEE",
    "ggmmmJJJJJJmmmJJJJmmmJJJJmmmJJJJJJJmmmmm",
    "ggmmmJJJJJJmmmJJJJmmVJJJJmmmJJJJJJJmmaaa",
    ".TmmmmmmmmmmmmmmVmmmmmmmmmmmmmmmmmmmmaKa",
    "..mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmaaa",
    "ggmmmmmmmmmmmmmmmmmmmmmmmmmmmmmVmmmmmaKa",
    "ggmmmJJJJJJmmmJJJJJmJJJJJmmmJJJJJJJmmaaa",
    "ggmmmJJJJJJmmmJJJJJmJJJJJmmmJJJJJJJmmaKa",
    "ggmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmaaa",
    ".UmmmrrrmmmmmmmmmrrrmmmmmmmmmrrrmmmmmaKa",
    "T.mmmrrrmmmmmmmmmrrrmmmmmmmmmrrrmmmmmaaa",
    "mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm",
    "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
    "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
    "MMMMMMMYYYYYYYYYYYYYYYYYYYYYYYYYMMMMMMMM",
    "MMMMMMMYYYYYYYYYYYYYYYYYYYYYYYYYMMMMMMMM",
    "MMMMMMMYYYYYYYYYYYYYYYYYYYYYYYYYMMMMMMMM",
    "MMMMMMMYYYYYYYYYYYYYYYYYYYYYYYYYMMMMMMMM",
    "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM"
  ];
  // Isla Volcán: n ceniza · e arena · L lava · D basalto · v volcán · x géiser · Q palmera
  var VOLCAN = [
    "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    "WWWWWWWWWWWWWWWWWeeeWWeeWWWWWWWWWWWWWWWW",
    "WWWWWWWWWWWWeeeeee..eee.eeeeeWWWWWWWWWWW",
    "WWWWWWWWWWWWennvvvvvvvvvvnneeWWWWWWWWWWW",
    "WWWWWWWWeeeeennvvvvvvvvvvnneeeWWWWWWWWWW",
    "WWWWWWWe.....nnvvvvvvvvvvnn...eeeeWWWWWW",
    "WWWWeeeQ.....nnvvvvvvvvvvDn....Q.eeWWWWW",
    "WWWWeWee...T.nDvvvvvvvvvvnn.T.eeeeWWWWWW",
    "WWWeeQe......nnvvvvvvvvvvnn.......eWWWWW",
    "WWee.....Q...nnvvvvvvvvvvnn.....x..eeeeW",
    "WWWe..U......nnnnnnLLnnnnnn.......QeeeeW",
    "WWWeee..T...xnnnnnnLLnnnnnnx..ggggeeeeWW",
    "WWe.Q........nnnnnnLLnnnnnn...gggg.eeeeW",
    "eee..gggg...U.....xnn.x......U........eW",
    "WWe..gggg..........LL............T.eeeeW",
    "WWWeD.....x........LL.....ggg......eeeeW",
    "WWe...LLLLnLLLLnLLLLL.....ggg...D...eeeW",
    "WWe...LLLLnLLLLnLLLLL.....ggg.......e.eW",
    "WWWe.U.........x...LLL...x.........QeeWW",
    "WWWeeee..T...........LLLLnLLLLnLLLeeeeWW",
    "WWee.................LLLLnLLLLnLLL.eeeeW",
    "WWWeeeQ......T................x...eDeeWW",
    "WWWWeWWex........x............eeeeWWWWWW",
    "WWWWWWWe....gggg....D....U.T..eeeeWWWWWW",
    "WWWWWWWD....gggg..U.....x.....eeeeWWWWWW",
    "WWWWWWWWeeeQe............ee..QWWeWWWWWWW",
    "WWWWWWWWWWWWeeeeQe.eeeQeeeWeeWWWWWWWWWWW",
    "WWWWWWWWWWWWeeeeee.eeeeeeWWeeWWWWWWWWWWW",
    "WWWWWWWWWWWWWeeWWeeeeWeeeWWWWWWWWWWWWWWW",
    "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW"
  ];
  // Pantano: s suelo · o barro (más lento) · w agua · d pasarela · t árbol seco · c planta carnívora · g juncos
  var PANTANO = [
    "TttTttTttTttTttTttTttTttTttTttTttTttTttt",
    "tTssTtssTtssTtssTtssTtssTtssTtssTtssTttT",
    "tTssssssssssssssssssssstssssssstsssssstT",
    "Tsssstsssssssstsoooooosssssdssssggggtsst",
    "tsssssssoooossssoooooosssssdssssggggsssT",
    "tTgggsssoooossssoooooosscswdwsssggggsstT",
    "TTgggssssssssssssssssssswwwdwwRssssssstt",
    "tsgggssRscwwwwwssUsssssswwwdwwwssssscssT",
    "tsgggssswwwwwwwwwsssssswwwwdwwwwsssssssT",
    "TTsscsswwwwwwwwwwwsstsswwwwdwwwwsssgggtt",
    "tTsssdddddddddddddddsssswwwdwUwssssgggtT",
    "tsstssswwwwwwwwwwwsssscstswdssssstsgggsT",
    "Tssssssswwwwwwwwwssssssssssdssscssssssst",
    "tTssssUssstwwwwcssRsssooooodssoooooosstT",
    "tTsoooooosssssggggssssooooosssoooooosstT",
    "Tssoooooosssssggggscssooooosssoooooostst",
    "tssoooooossstsssssssdsooooosggggsssssssT",
    "tTsssssggggsssssssssdsssssssggggssscsstT",
    "TTssscsggggsssUssswwdwwssstsssssssRssstt",
    "tssssssssssssswwtwwwdwwwwwsssssswwsssssT",
    "tssstsssssssswwwwwwwdwwwwwwwssswwwwwsssT",
    "TTssswwssssdddddddddddddddddddwwwwwwwstt",
    "tTsswwwwwsssswwwwwwwdwwwwwwwssswwwwwsstT",
    "tssswwwwwsssscswwwwwdwwwwwwscssUwwwssssT",
    "TssswwwwwsssssssUswwdwwssRssssssssssssst",
    "tTsssswwsssoooooosssdssssssssooooooststT",
    "tTsRsssssscoooooosssdssggggssoooooossstT",
    "Tssssssstssoooooosstsssggggssooocoosssst",
    "tssssssssssssssssssssssssssssssssssssssT",
    "tTTtTTtTTtTTtTTtTTtTTtTTtTTtTTtTTtTTtTtT"
  ];
  var MAPAS = {
    campo: { nombre: "Campo y bosque", filas: CAMPO,
      salidas: [[7, 5], [18, 4], [28, 4], [34, 8], [4, 10], [14, 13], [27, 12], [35, 16], [3, 18], [15, 21], [26, 24], [34, 19], [9, 26], [29, 27]] },
    arnedo: { nombre: "Arnedo · IES Celso Díaz", filas: ARNEDO,
      salidas: [[2, 7], [7, 10], [12, 11], [16, 11], [22, 8], [27, 9], [33, 9], [37, 13], [2, 17], [15, 16], [21, 18], [32, 25], [37, 23], [14, 27]],
      carteles: [
        { t: "IES CELSO DÍAZ", x: 14, y: 9.62, tipo: "fachada" },
        { t: "COLEGIO SAGRADO CORAZÓN", x: 14.5, y: 24.62, tipo: "fachada" },
        { t: "GUARDERÍA", x: 21, y: 15.62, tipo: "fachada" },
        { t: "Paseo de la Constitución", x: 17.5, y: 2.55, tipo: "calle" },
        { t: "Av. Reyes Católicos", x: 26, y: 16.55, tipo: "calle" },
        { t: "C/ Ángel Beriáin", x: 16.5, y: 12.6, tipo: "calle" },
        { t: "C/ Ciudad de Elba", x: 4.5, y: 13.5, tipo: "calle" },
        { t: "Plaza Orenzana", x: 22, y: 9.55, tipo: "suelo" },
        { t: "PLAZA DE TOROS", x: 27.5, y: 26.7, tipo: "fachada" },
        { t: "PISCINAS", x: 38, y: 23.45, tipo: "suelo" },
        { t: "Vía Verde del Cidacos", x: 16, y: 27.5, tipo: "suelo" },
        { t: "Río Cidacos", x: 30, y: 28.9, tipo: "agua" },
        { t: "Cerro de arcilla", x: 2.5, y: 2.3, tipo: "suelo" }
      ] },
    puerto: { nombre: "Puerto de mercancías (con peligros)", filas: PUERTO,
      salidas: [[2, 7], [11, 10], [19, 7], [25, 10], [35, 7], [2, 22], [13, 14], [27, 14], [35, 13], [9, 20], [21, 22], [33, 22], [19, 16], [6, 6]],
      carteles: [
        { t: "ALMACÉN 1", x: 4, y: 2.62, tipo: "fachada" }, { t: "ALMACÉN 2", x: 14, y: 2.62, tipo: "fachada" },
        { t: "ALMACÉN 3", x: 24, y: 2.62, tipo: "fachada" }, { t: "ALMACÉN 4", x: 34.5, y: 2.62, tipo: "fachada" },
        { t: "OFICINAS", x: 38, y: 11.62, tipo: "fachada" },
        { t: "GRÚA", x: 6, y: 21.5, tipo: "suelo" }, { t: "GRÚA", x: 18, y: 21.5, tipo: "suelo" }, { t: "GRÚA", x: 30, y: 21.5, tipo: "suelo" }
      ],
      // carretillas (recorren estas rutas sin parar) y grúas (dejan caer un contenedor cada cierto tiempo)
      peligros: { carretillas: [{ ruta: [[3, 9], [36, 9], [36, 15], [3, 15]], vel: 2, fase: 0 }, { ruta: [[3, 9], [36, 9], [36, 15], [3, 15]], vel: 2, fase: 0.5 },
                               { ruta: [[12, 6], [26, 6], [26, 19], [12, 19]], vel: 2, fase: 0.2 }, { ruta: [[2, 19], [36, 19], [36, 22], [2, 22]], vel: 2, fase: 0.6 }],
                  gruas: [{ x: 5, y: 20, w: 3, h: 2, fase: 0 }, { x: 17, y: 20, w: 3, h: 2, fase: 7000 }, { x: 29, y: 20, w: 3, h: 2, fase: 14000 }] } },
    volcan: { nombre: "Isla Volcán (con peligros)", filas: VOLCAN, oculto: true,   // preparado, pero aún no sale en el menú
      salidas: [[8, 4], [28, 6], [5, 10], [34, 8], [3, 14], [36, 14], [6, 19], [11, 19], [17, 21], [23, 22], [28, 26], [12, 27], [33, 22], [22, 15]],
      carteles: [],
      peligros: { geiseres: "x" } },
    pantano: { nombre: "Pantano encantado (con peligros)", filas: PANTANO,
      salidas: [[3, 3], [11, 2], [20, 7], [34, 2], [5, 12], [18, 11], [33, 8], [3, 17], [23, 17], [37, 13], [6, 26], [9, 20], [27, 28], [37, 27]],
      carteles: [],
      // plantas carnívoras que muerden a su alrededor y niebla que baja la visión de todos
      peligros: { plantas: "c", niebla: { periodo: 60000, dura: 15000, fase: 20000 } } }
  };
  var actual = "campo", FILAS = CAMPO, SALIDAS = MAPAS.campo.salidas;
  function usar(id) {
    if (!MAPAS[id]) id = "campo";
    actual = id; FILAS = MAPAS[id].filas; SALIDAS = MAPAS[id].salidas;
    if (window.Mapa) window.Mapa.SALIDAS = SALIDAS;
    return id;
  }

  function c(x, y) { return (x < 0 || y < 0 || x >= MW || y >= MH) ? "T" : FILAS[y].charAt(x); }
  function peligros() {
    var d = MAPAS[actual].peligros; if (!d) return null;
    var out = { carretillas: d.carretillas || [], gruas: d.gruas || [], geiseres: [], plantas: [], niebla: d.niebla || null };
    for (var y = 0; y < MH; y++) for (var x = 0; x < MW; x++) {
      if (d.geiseres && c(x, y) === d.geiseres) out.geiseres.push({ x: x, y: y, fase: (x * 7919 + y * 104729) % 12000 });
      if (d.plantas && c(x, y) === d.plantas) out.plantas.push({ x: x, y: y, fase: (x * 7919 + y * 104729) % 8000 });
    }
    return out;
  }
  function esSolido(x, y) { return "TPRUBbECIOGZKXFJYNVDvQtc".indexOf(c(x, y)) >= 0; }
  function esAgua(x, y) { var k = c(x, y); return k === "W" || k === "p" || k === "M" || k === "L" || k === "w"; }   // agua y lava: solo las cruzan los fantasmas
  function esRio(x, y) { return c(x, y) === "W"; }
  function esMeseta(x, y) { return c(x, y) === "H"; }
  function esHierbaAlta(x, y) { return c(x, y) === "g"; }
  function esBarro(x, y) { return c(x, y) === "o"; }   // en el barro los pasos tardan el doble
  function esCamino(x, y) { var k = c(x, y); return k === ":" || k === "S"; }

  // ¿Pasar de a a b cruza el borde de una meseta sin usar la escalera?
  function cruzaBancal(ax, ay, bx, by) {
    var pa = esMeseta(ax, ay), pb = esMeseta(bx, by);
    if (pa === pb) return false;
    if (c(ax, ay) === "S" && pb && bx === ax && by === ay - 1) return false;
    if (c(bx, by) === "S" && pa && ax === bx && ay === by - 1) return false;
    return true;
  }
  function puedePisar(ax, ay, bx, by, fantasma) {
    return !esSolido(bx, by) && (fantasma || !esAgua(bx, by)) && !cruzaBancal(ax, ay, bx, by);
  }
  function frenaAtaque(ax, ay, bx, by) { return esSolido(bx, by) || cruzaBancal(ax, ay, bx, by); }

  // ---------- utilidades de dibujo ----------
  function azar(semilla) {
    return function () {
      semilla |= 0; semilla = semilla + 0x6D2B79F5 | 0;
      var t = Math.imul(semilla ^ semilla >>> 15, 1 | semilla);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function rgb(a) { return "rgb(" + a[0] + "," + a[1] + "," + a[2] + ")"; }
  function elipse(g, x0, y0, x1, y1, col) {
    g.fillStyle = col; g.beginPath();
    g.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, 0, 0, Math.PI * 2); g.fill();
  }
  function poli(g, pts, col, borde) {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath(); g.fillStyle = col; g.fill();
    if (borde) { g.strokeStyle = borde; g.lineWidth = 1; g.stroke(); }
  }
  function linea(g, x0, y0, x1, y1, col, w) {
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  function lienzo(w, h, res) {
    var cv = document.createElement("canvas");
    cv.width = Math.ceil(w * res); cv.height = Math.ceil(h * res);
    var g = cv.getContext("2d"); g.scale(res, res);
    return { cv: cv, g: g };
  }
  // Rectángulo de casilla con las esquinas exteriores redondeadas (estanques).
  function casillaRedonda(g, X, Y, m, r, vecino) {
    var n = vecino(0, -1), s = vecino(0, 1), o = vecino(-1, 0), e = vecino(1, 0);
    var x0 = X + (o ? 0 : m), x1 = X + T - (e ? 0 : m), y0 = Y + (n ? 0 : m), y1 = Y + T - (s ? 0 : m);
    var rNO = (!n && !o) ? r : 0, rNE = (!n && !e) ? r : 0, rSE = (!s && !e) ? r : 0, rSO = (!s && !o) ? r : 0;
    g.beginPath();
    g.moveTo(x0 + rNO, y0); g.lineTo(x1 - rNE, y0); g.arcTo(x1, y0, x1, y0 + rNE, rNE);
    g.lineTo(x1, y1 - rSE); g.arcTo(x1, y1, x1 - rSE, y1, rSE);
    g.lineTo(x0 + rSO, y1); g.arcTo(x0, y1, x0, y1 - rSO, rSO);
    g.lineTo(x0, y0 + rNO); g.arcTo(x0, y0, x0 + rNO, y0, rNO);
    g.closePath(); g.fill();
  }

  // ---------- suelo (se dibuja una vez) ----------
  function pintarSuelo(res) {
    var L = lienzo(MW * T, MH * T, res), g = L.g, rnd = azar(3), x, y, X, Y;
    for (y = 0; y < MH; y++) for (x = 0; x < MW; x++) {
      X = x * T; Y = y * T;
      var base = esMeseta(x, y) ? ((x + y) % 2 ? [143, 203, 106] : [150, 210, 112]) : ((x + y) % 2 ? [117, 185, 92] : [124, 192, 98]);
      g.fillStyle = rgb(base); g.fillRect(X, Y, T + 0.5, T + 0.5);
      if (esCamino(x, y)) {
        var l = esCamino(x - 1, y) ? 0 : 6, r = esCamino(x + 1, y) ? 0 : 6, t = esCamino(x, y - 1) ? 0 : 6, b = esCamino(x, y + 1) ? 0 : 6;
        g.fillStyle = "rgb(222,196,140)"; g.fillRect(X + l, Y + t, T - l - r, T - t - b);
        for (var i = 0; i < 5; i++) { var px = X + 8 + rnd() * 48, py = Y + 8 + rnd() * 48; elipse(g, px, py, px + 4, py + 3, "rgb(196,168,112)"); }
      } else if (esHierbaAlta(x, y)) {
        for (var k = 0; k < 7; k++) {
          var gx = X + 6 + (k % 4) * 15 + (rnd() * 4 - 2), gy = Y + 24 + Math.floor(k / 4) * 26;
          [-6, 0, 6].forEach(function (dx) { poli(g, [[gx - 3, gy + 12], [gx + 3, gy + 12], [gx + dx, gy - 6]], "rgb(64,140,62)"); });
        }
      } else if (!esSolido(x, y) && !esAgua(x, y)) {
        var q = rnd();
        if (q < 0.25) {
          [[18, 40], [40, 26]].forEach(function (p) {
            linea(g, X + p[0], Y + p[1], X + p[0] - 3, Y + p[1] - 7, "rgb(88,150,72)", 2);
            linea(g, X + p[0], Y + p[1], X + p[0] + 3, Y + p[1] - 7, "rgb(88,150,72)", 2);
          });
        } else if (q < 0.33) {
          var fx = X + 14 + rnd() * 32, fy = Y + 14 + rnd() * 32, col = [[255, 255, 255], [250, 210, 70], [240, 120, 150]][Math.floor(rnd() * 3)];
          for (var a = 0; a < 5; a++) { var an = a * 2 * Math.PI / 5; elipse(g, fx + 4 * Math.cos(an) - 3, fy + 4 * Math.sin(an) - 3, fx + 4 * Math.cos(an) + 3, fy + 4 * Math.sin(an) + 3, rgb(col)); }
          elipse(g, fx - 2, fy - 2, fx + 2, fy + 2, "rgb(250,180,40)");
        }
      }
    }
    // estanques: borde de arena, agua y agua profunda
    function agua(x, y) { return function (dx, dy) { return esRio(x + dx, y + dy); }; }
    [["rgb(214,190,130)", 0, 6, 22], ["rgb(84,156,226)", 0, 0, 22], ["rgb(66,136,210)", 12, 0, 16]].forEach(function (capa) {
      g.fillStyle = capa[0];
      for (y = 0; y < MH; y++) for (x = 0; x < MW; x++) if (esRio(x, y)) {
        g.save(); g.translate(0, capa[2]); casillaRedonda(g, x * T, y * T, capa[1], capa[3], agua(x, y)); g.restore();
      }
    });
    for (y = 0; y < MH; y++) for (x = 0; x < MW; x++) if (esRio(x, y)) {
      var q2 = rnd(); X = x * T; Y = y * T;
      if (q2 < 0.45) { g.strokeStyle = "rgb(180,220,250)"; g.lineWidth = 3; g.beginPath(); g.ellipse(X + 20 + rnd() * 24, Y + 20 + rnd() * 24, 14, 6, 0, Math.PI * 1.11, Math.PI * 1.89); g.stroke(); }
      else if (q2 < 0.6) { elipse(g, X + 16, Y + 26, X + 48, Y + 42, "rgb(70,160,80)"); poli(g, [[X + 32, Y + 34], [X + 48, Y + 30], [X + 48, Y + 38]], "rgb(66,136,210)"); }
    }
    // calles, edificios, piscinas… (solo en los mapas de ciudad)
    if (window.Ciudad) Ciudad.pintar(g, { c: c, T: T, MW: MW, MH: MH, rnd: rnd, carteles: MAPAS[actual].carteles || [], peligros: peligros() });
    // mesetas: cara del bancal, escalera y bordes
    for (y = 0; y < MH; y++) for (x = 0; x < MW; x++) if (esMeseta(x, y)) {
      X = x * T; Y = y * T;
      var abajo = !esMeseta(x, y + 1);
      if (abajo) {
        if (c(x, y + 1) === "S") {
          for (var s = 0; s < 4; s++) { g.fillStyle = s % 2 ? "rgb(150,112,76)" : "rgb(170,130,90)"; g.fillRect(X + 10, Y + T + s * 8, T - 20, 8); }
          linea(g, X + 8, Y + T, X + 8, Y + T + 32, "rgb(110,80,52)", 3); linea(g, X + T - 8, Y + T, X + T - 8, Y + T + 32, "rgb(110,80,52)", 3);
        } else {
          g.fillStyle = "rgb(156,112,72)"; g.fillRect(X, Y + T, T, 30);
          g.fillStyle = "rgb(120,84,54)"; g.fillRect(X, Y + T + 22, T, 8);
          for (var j = 0; j < 3; j++) { var lx = X + 10 + j * 20 + (x * 7 % 6); linea(g, lx, Y + T + 4, lx - 3, Y + T + 18, "rgb(128,90,58)", 2); }
        }
        linea(g, X, Y + T, X + T, Y + T, "rgb(96,160,72)", 4);
      }
      g.fillStyle = "rgb(120,84,54)";
      if (!esMeseta(x - 1, y)) g.fillRect(X - 4, Y, 6, T + (abajo ? 30 : 0));
      if (!esMeseta(x + 1, y)) g.fillRect(X + T - 2, Y, 6, T + (abajo ? 30 : 0));
    }
    // sombras de los obstáculos
    g.fillStyle = "rgba(20,50,20,0.27)";
    for (y = 0; y < MH; y++) for (x = 0; x < MW; x++) {
      var k2 = c(x, y), X2 = x * T, Y2 = y * T, sh = null;
      if (k2 === "T" || k2 === "Q" || k2 === "t") sh = [X2 + 34, Y2 + 56, 30, 9]; else if (k2 === "P") sh = [X2 + 34, Y2 + 58, 26, 8];
      else if (k2 === "R") sh = [X2 + 36, Y2 + 56, 28, 8]; else if (k2 === "U") sh = [X2 + 32, Y2 + 54, 28, 7];
      else if (k2 === "B") sh = [X2 + 70, Y2 + 118, 62, 12];
      if (sh) { g.beginPath(); g.ellipse(sh[0], sh[1], sh[2], sh[3], 0, 0, Math.PI * 2); g.fill(); }
    }
    return L.cv;
  }

  // ---------- obstáculos (sprites que se ordenan con los personajes) ----------
  function pintarObstaculos(res) {
    var sp = {};
    // cada sprite: lienzo + desplazamiento respecto a la esquina de su casilla
    function nuevo(nombre, w, h, ox, oy, fn) { var L = lienzo(w, h, res); L.g.translate(-ox, -oy); fn(L.g, 0, 0); sp[nombre] = { cv: L.cv, ox: ox, oy: oy, w: w, h: h }; }
    nuevo("T", 84, 100, -10, -36, function (g, X, Y) {
      var cx = X + 32;
      g.fillStyle = "rgb(120,80,45)"; g.fillRect(cx - 7, Y + 30, 14, 28);
      elipse(g, cx - 34, Y - 22, cx + 34, Y + 42, "rgb(40,110,55)");
      elipse(g, cx - 30, Y - 26, cx + 26, Y + 30, "rgb(58,140,66)");
      elipse(g, cx - 22, Y - 22, cx + 6, Y + 4, "rgb(92,170,84)");
      elipse(g, cx - 16, Y - 16, cx - 4, Y - 6, "rgb(130,200,110)");
    });
    nuevo("P", 80, 100, -8, -36, function (g, X, Y) {
      var cx = X + 32;
      g.fillStyle = "rgb(110,72,40)"; g.fillRect(cx - 6, Y + 44, 12, 16);
      [[30, 10], [25, -8], [19, -26]].forEach(function (p, i) {
        poli(g, [[cx - p[0], Y + p[1] + 40], [cx + p[0], Y + p[1] + 40], [cx, Y + p[1]]], i % 2 ? "rgb(46,120,78)" : "rgb(34,100,66)");
        poli(g, [[cx - p[0] + 6, Y + p[1] + 36], [cx - 2, Y + p[1] + 36], [cx - 2, Y + p[1] + 8]], "rgb(70,150,96)");
      });
    });
    nuevo("R", 64, 64, 0, 0, function (g, X, Y) {
      poli(g, [[X + 8, Y + 50], [X + 6, Y + 30], [X + 18, Y + 12], [X + 38, Y + 8], [X + 56, Y + 22], [X + 58, Y + 48], [X + 44, Y + 58], [X + 20, Y + 58]], "rgb(112,116,128)");
      poli(g, [[X + 6, Y + 30], [X + 18, Y + 12], [X + 38, Y + 8], [X + 56, Y + 22], [X + 46, Y + 34], [X + 22, Y + 36]], "rgb(168,172,182)");
      poli(g, [[X + 18, Y + 18], [X + 32, Y + 13], [X + 26, Y + 24]], "rgb(205,208,215)");
      linea(g, X + 34, Y + 38, X + 40, Y + 50, "rgb(90,94,104)", 2);
    });
    nuevo("B", 130, 130, 0, 0, function (g, X, Y) {
      poli(g, [[X + 8, Y + 110], [X + 4, Y + 60], [X + 26, Y + 18], [X + 70, Y + 6], [X + 112, Y + 30], [X + 124, Y + 82], [X + 104, Y + 120], [X + 40, Y + 124]], "rgb(104,108,120)");
      poli(g, [[X + 4, Y + 60], [X + 26, Y + 18], [X + 70, Y + 6], [X + 112, Y + 30], [X + 96, Y + 66], [X + 40, Y + 72]], "rgb(160,164,176)");
      poli(g, [[X + 30, Y + 28], [X + 66, Y + 14], [X + 52, Y + 40]], "rgb(200,203,212)");
      linea(g, X + 70, Y + 76, X + 80, Y + 108, "rgb(82,86,96)", 3); linea(g, X + 80, Y + 92, X + 96, Y + 98, "rgb(82,86,96)", 2);
      elipse(g, X + 14, Y + 96, X + 40, Y + 112, "rgb(90,150,70)");
    });
    nuevo("U", 64, 64, 0, 0, function (g, X, Y) {
      [[16, 38, 16, "rgb(52,128,60)"], [46, 38, 16, "rgb(52,128,60)"], [31, 28, 20, "rgb(66,150,70)"], [22, 30, 10, "rgb(96,176,90)"], [40, 26, 8, "rgb(96,176,90)"]].forEach(function (b) {
        elipse(g, X + b[0] - b[2], Y + b[1] - b[2], X + b[0] + b[2], Y + b[1] + b[2], b[3]);
      });
      [[24, 40], [40, 34], [32, 20]].forEach(function (b) { elipse(g, X + b[0] - 3, Y + b[1] - 3, X + b[0] + 3, Y + b[1] + 3, "rgb(220,60,70)"); });
    });
    nuevo("Q", 96, 110, -16, -46, function (g, X, Y) {
      var cx = X + 32;
      g.strokeStyle = "rgb(140,100,60)"; g.lineWidth = 10; g.lineCap = "round";
      g.beginPath(); g.moveTo(cx - 4, Y + 58); g.quadraticCurveTo(cx + 12, Y + 20, cx + 4, Y - 14); g.stroke();
      g.strokeStyle = "rgb(110,78,46)"; g.lineWidth = 2;
      for (var k = 0; k < 6; k++) { var yy = Y + 52 - k * 11; g.beginPath(); g.moveTo(cx - 6 + k, yy); g.lineTo(cx + 6 + k, yy - 2); g.stroke(); }
      [[-40, -30], [40, -26], [-30, -6], [32, -2], [0, -46], [-14, -40], [16, -42]].forEach(function (h, i) {
        g.fillStyle = i % 2 ? "rgb(60,150,70)" : "rgb(46,124,58)";
        g.beginPath(); g.ellipse(cx + 4 + h[0] / 2, Y - 14 + h[1] / 2 + 8, 26, 9, Math.atan2(h[1], h[0]), 0, Math.PI * 2); g.fill();
      });
      elipse(g, cx - 2, Y - 14, cx + 8, Y - 4, "rgb(120,80,40)"); elipse(g, cx + 6, Y - 12, cx + 16, Y - 2, "rgb(120,80,40)");
    });
    // árbol seco y retorcido del pantano
    nuevo("t", 90, 104, -13, -40, function (g, X, Y) {
      var cx = X + 32;
      g.strokeStyle = "rgb(84,66,58)"; g.lineCap = "round";
      g.lineWidth = 13; g.beginPath(); g.moveTo(cx - 2, Y + 58); g.quadraticCurveTo(cx - 10, Y + 26, cx + 2, Y - 2); g.stroke();
      g.lineWidth = 6;
      [[cx + 2, Y - 2, cx - 22, Y - 22, cx - 34, Y - 12], [cx + 2, Y - 2, cx + 18, Y - 28, cx + 36, Y - 26], [cx - 4, Y + 22, cx + 16, Y + 10, cx + 30, Y + 16], [cx - 6, Y + 14, cx - 20, Y + 4, cx - 30, Y + 10]].forEach(function (r) {
        g.beginPath(); g.moveTo(r[0], r[1]); g.quadraticCurveTo(r[2], r[3], r[4], r[5]); g.stroke();
      });
      g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 22, Y - 22); g.lineTo(cx - 20, Y - 38); g.moveTo(cx + 18, Y - 28); g.lineTo(cx + 26, Y - 42); g.stroke();
      g.strokeStyle = "rgb(110,90,78)"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 6, Y + 52); g.quadraticCurveTo(cx - 10, Y + 28, cx - 2, Y + 6); g.stroke();
      // musgo colgando
      g.strokeStyle = "rgba(120,150,96,0.85)"; g.lineWidth = 3;
      [[cx - 26, Y - 16, 18], [cx + 28, Y - 26, 22], [cx + 22, Y + 12, 14], [cx - 24, Y + 8, 16]].forEach(function (m) {
        g.beginPath(); g.moveTo(m[0], m[1]); g.lineTo(m[0] + 2, m[1] + m[2]); g.stroke();
      });
    });
    // hierba alta por delante de los pies de quien está dentro
    nuevo("g", 64, 30, 0, 38, function (g, X, Y) {
      for (var k = 0; k < 5; k++) {
        var gx = X + 4 + k * 14, gy = Y + 52;
        [-6, 0, 6].forEach(function (dx, i) { poli(g, [[gx - 3, gy + 12], [gx + 3, gy + 12], [gx + dx, gy - 10]], i === 1 ? "rgb(84,160,72)" : "rgb(64,140,62)"); });
      }
    });
    return sp;
  }

  // ---------- minimapa: solo terreno ----------
  var MS = 3;
  function pintarMinimapa(res) {
    var w = MW * MS + 12, h = MH * MS + 12, L = lienzo(w, h, res), g = L.g;
    g.fillStyle = "rgba(24,28,50,0.9)"; g.fillRect(0, 0, w, h);
    var col = { "T": "rgb(40,110,55)", "P": "rgb(40,110,55)", "R": "rgb(140,144,156)", "B": "rgb(140,144,156)", "b": "rgb(140,144,156)", "U": "rgb(52,128,60)",
      "W": "rgb(84,156,226)", "H": "rgb(160,215,120)", "A": "rgb(90,94,104)", "z": "rgb(90,94,104)", "a": "rgb(200,196,188)", "q": "rgb(226,208,170)",
      "k": "rgb(78,128,190)", "f": "rgb(90,170,80)", "E": "rgb(176,92,70)", "C": "rgb(205,90,66)", "I": "rgb(176,96,70)", "O": "rgb(236,214,150)", "G": "rgb(232,130,110)",
      "Z": "rgb(210,170,120)", "K": "rgb(200,196,188)", "F": "rgb(226,208,170)", "X": "rgb(196,104,64)", "p": "rgb(90,190,235)", "m": "rgb(176,178,182)", "M": "rgb(36,86,140)", "J": "rgb(200,90,60)", "Y": "rgb(150,40,40)", "N": "rgb(140,150,165)",
      "r": "rgb(230,190,40)", "V": "rgb(190,150,90)", "n": "rgb(96,84,80)", "e": "rgb(230,210,160)", "L": "rgb(240,100,30)", "D": "rgb(60,58,64)", "v": "rgb(110,80,70)",
      "x": "rgb(200,80,40)", "Q": "rgb(60,140,60)", "s": "rgb(92,120,80)", "o": "rgb(110,84,56)", "w": "rgb(62,96,84)", "d": "rgb(160,120,76)", "t": "rgb(84,66,58)", "c": "rgb(200,60,90)", "S": "rgb(222,196,140)", ":": "rgb(222,196,140)", "g": "rgb(80,150,70)", ".": "rgb(120,188,95)" };
    for (var y = 0; y < MH; y++) for (var x = 0; x < MW; x++) { g.fillStyle = col[c(x, y)]; g.fillRect(6 + x * MS, 6 + y * MS, MS, MS); }
    return L.cv;
  }

  // Casilla al azar donde se puede dejar un objeto o un jugador (no repite las ocupadas).
  function casillaLibre(ocupadas) {
    var usadas = {};
    (ocupadas || []).forEach(function (o) { usadas[o[0] + "," + o[1]] = true; });
    for (var i = 0; i < 3000; i++) {
      var x = Math.floor(Math.random() * MW), y = Math.floor(Math.random() * MH), k = c(x, y);
      if (k === "S" || k === "x" || k === "r" || esSolido(x, y) || esAgua(x, y) || usadas[x + "," + y]) continue;   // ni en escaleras ni encima de un peligro
      return [x, y];
    }
    return null;
  }
  // Punto de aparición lo más lejos posible de los que ya están ocupados.
  function salidaLibre(ocupadas) {
    var mejor = null, dist = -1;
    if (!ocupadas.length) return barajarSalidas()[0].slice();
    barajarSalidas().forEach(function (s) {
      var d = Math.min.apply(null, (ocupadas.length ? ocupadas : [[-99, -99]]).map(function (o) { return Math.abs(o[0] - s[0]) + Math.abs(o[1] - s[1]); }));
      if (d > dist) { dist = d; mejor = s; }
    });
    if (dist === 0) return casillaLibre(ocupadas);
    return mejor.slice();
  }
  function barajarSalidas() {
    var a = SALIDAS.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  window.Mapa = {
    casillaLibre: casillaLibre, salidaLibre: salidaLibre, usar: usar, actual: function () { return actual; }, peligros: peligros,
    LISTA: Object.keys(MAPAS).filter(function (k) { return !MAPAS[k].oculto; }).map(function (k) { return { id: k, nombre: MAPAS[k].nombre }; }),
    T: T, MW: MW, MH: MH, MS: MS, SALIDAS: SALIDAS, celda: c,
    esSolido: esSolido, esAgua: esAgua, esBarro: esBarro, esMeseta: esMeseta, esHierbaAlta: esHierbaAlta,
    puedePisar: puedePisar, frenaAtaque: frenaAtaque,
    pintarSuelo: pintarSuelo, pintarObstaculos: pintarObstaculos, pintarMinimapa: pintarMinimapa,
    azar: azar, elipse: elipse, poli: poli, linea: linea
  };
})();
