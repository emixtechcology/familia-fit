/* Familia Fit — cálculos, ejercicios animados y plan de comidas. Generado; no editar a mano. */
// ===== FF-COMPARTIDO (mismo código en la app y en Apps Script) =====
/**
 * Calcula la evaluación y el plan de una persona a partir de su cuestionario.
 * q = { sexo:'H'|'M', edad, estatura (cm), peso (kg), cintura, cuello, cadera (cm, opcionales),
 *       grasa (% de báscula, opcional), actividad, objetivo, ritmo (kg/semana), dias, minutos,
 *       nivel, menor, embarazo, condiciones:[], lesiones:[] }
 */
function calcularPlan(q) {
  var n = function (v) { var x = parseFloat(String(v === undefined || v === null ? '' : v).replace(',', '.')); return isNaN(x) ? 0 : x; };
  var r1 = function (x) { return Math.round(x * 10) / 10; };
  var H = String(q.sexo || 'H').toUpperCase() !== 'M';
  var edad = n(q.edad) || 30, est = n(q.estatura) || 165, peso = n(q.peso) || 70;
  var m = est / 100, imc = peso / (m * m);
  var res = { avisos: [], hombre: H, peso: r1(peso), estatura: est, edad: edad };
  var menor = q.menor === true || String(q.menor).toUpperCase() === 'SI' || edad < 18;
  res.menor = menor;

  // --- IMC ---
  res.imc = r1(imc);
  res.imcCat = imc < 18.5 ? 'Bajo peso' : imc < 25 ? 'Saludable' : imc < 30 ? 'Sobrepeso' : imc < 35 ? 'Obesidad I' : imc < 40 ? 'Obesidad II' : 'Obesidad III';
  res.pesoSanoMin = r1(18.5 * m * m);
  res.pesoSanoMax = r1(24.9 * m * m);

  // --- % de grasa ---
  var cin = n(q.cintura), cue = n(q.cuello), cad = n(q.cadera), gB = n(q.grasa), grasa, fuente;
  if (gB > 3 && gB < 70) { grasa = gB; fuente = 'Báscula'; }
  else if (cin && cue && (H ? cin > cue : (cad && cin + cad > cue))) {
    grasa = H ? 495 / (1.0324 - 0.19077 * Math.log10(cin - cue) + 0.15456 * Math.log10(est)) - 450
              : 495 / (1.29579 - 0.35004 * Math.log10(cin + cad - cue) + 0.22100 * Math.log10(est)) - 450;
    fuente = 'Medidas (método Marina EE.UU.)';
  } else { grasa = 1.2 * imc + 0.23 * edad - 10.8 * (H ? 1 : 0) - 5.4; fuente = 'Estimado por IMC'; }
  grasa = Math.max(4, Math.min(60, grasa));
  res.grasa = r1(grasa); res.grasaFuente = fuente;
  var cortes = H ? [6, 14, 18, 25] : [14, 21, 25, 32];
  res.grasaCat = grasa < cortes[0] ? 'Muy baja' : grasa < cortes[1] ? 'Atlética' : grasa < cortes[2] ? 'En forma' : grasa < cortes[3] ? 'Promedio' : 'Alta';
  res.grasaRangoSano = H ? '14–24 %' : '21–31 %';
  res.masaGrasa = r1(peso * grasa / 100);
  res.magra = r1(peso - res.masaGrasa);

  // --- Cintura / estatura ---
  if (cin) {
    res.ice = Math.round(cin / est * 100) / 100;
    res.iceCat = res.ice < 0.5 ? 'Saludable' : res.ice < 0.6 ? 'Riesgo aumentado' : 'Riesgo alto';
  }

  // --- Gasto ---
  var factor = { sedentario: 1.2, ligero: 1.375, moderado: 1.55, alto: 1.725 }[q.actividad] || 1.375;
  res.tmb = Math.round(10 * peso + 6.25 * est - 5 * edad + (H ? 5 : -161));
  res.gasto = Math.round(res.tmb * factor);                 // sin contar el ejercicio planeado
  var pasosBase = { sedentario: 4000, ligero: 6000, moderado: 8000, alto: 10000 }[q.actividad] || 6000;
  res.pasosMeta = menor ? 12000 : Math.max(pasosBase, q.objetivo === 'bajar_grasa' ? 10000 : 8000);
  var dias = n(q.dias) || 3, minutos = n(q.minutos) || 30;
  var kcalSesion = Math.round(5.5 * peso * minutos / 60);  // MET promedio de las rutinas
  res.kcalSesion = kcalSesion;
  res.kcalRutinaDia = Math.round(kcalSesion * dias / 7);
  res.kcalPasosDia = Math.round(Math.max(0, res.pasosMeta - pasosBase) * peso * 0.0005);
  res.ejercicioDia = res.kcalRutinaDia + res.kcalPasosDia;
  res.agua = Math.round(peso * (menor ? 30 : 35) / 250) * 250;
  res.sueno = menor ? '9–11 h' : '7–9 h';

  if (menor) {
    res.avisos.push('En menores de edad no calculamos calorías ni metas de peso: el plan se enfoca en hábitos, juego activo y comida variada.');
    res.ritmoMax = 0; res.ritmo = 0; res.ritmoReal = 0;
    return res;
  }

  // --- Ritmo seguro ---
  var ritmoMax = imc < 18.5 ? 0 : imc < 25 ? 0.5 : imc < 30 ? 1 : 1.5;
  var emb = q.embarazo === true || String(q.embarazo).toUpperCase() === 'SI';
  if (emb) { ritmoMax = 0; res.avisos.push('Durante el embarazo o la lactancia no se recomienda bajar de peso: el plan queda en mantenimiento. Consulta a tu médico.'); }
  if (edad >= 65) ritmoMax = Math.min(ritmoMax, 0.75);
  res.ritmoMax = ritmoMax;
  var objetivo = q.objetivo || 'bajar_grasa';
  if (objetivo === 'bajar_grasa' && ritmoMax === 0) objetivo = 'mantener';
  res.objetivo = objetivo;
  var pedido = objetivo === 'bajar_grasa' ? (n(q.ritmo) || 0.5) : 0;
  res.ritmoPedido = pedido;
  var ritmo = Math.min(pedido, ritmoMax);
  if (pedido > ritmoMax && objetivo === 'bajar_grasa')
    res.avisos.push('Pediste ' + pedido + ' kg/semana, pero con tu IMC (' + res.imc + ') lo seguro es hasta ' + ritmoMax + ' kg/semana para no perder músculo. El plan usa ' + ritmoMax + ' kg.');
  if (ritmo >= 1.5) res.avisos.push('1.5 kg por semana es el ritmo máximo. Revisa tu peso cada semana; si bajas más de eso o te sientes sin energía, baja el ritmo.');
  res.ritmo = ritmo;

  // --- Calorías ---
  var piso = H ? 1500 : 1200;
  res.piso = piso;
  var kcal;
  if (objetivo === 'bajar_grasa') {
    var deficitObjetivo = ritmo * 7700 / 7;
    var deficitComida = Math.max(0, deficitObjetivo - res.ejercicioDia);
    kcal = Math.max(piso, res.gasto - deficitComida, Math.round(res.gasto * 0.6));
  } else if (objetivo === 'ganar_musculo') kcal = res.gasto + res.ejercicioDia + 250;
  else kcal = res.gasto + (emb ? 0 : res.ejercicioDia);
  kcal = Math.round(kcal / 10) * 10;
  res.kcal = kcal;
  res.deficitComida = Math.max(0, res.gasto - kcal);
  res.deficitTotal = res.deficitComida + (objetivo === 'bajar_grasa' ? res.ejercicioDia : 0);
  res.ritmoReal = objetivo === 'bajar_grasa' ? r1(res.deficitTotal * 7 / 7700) : 0;
  if (objetivo === 'bajar_grasa' && res.ritmoReal + 0.05 < ritmo) {
    var falta = Math.round((ritmo - res.ritmoReal) * 1100);
    var minCaminata = Math.round(falta / (3.5 * peso / 60) / 5) * 5;
    res.avisos.push('Tu comida ya está en el mínimo seguro, así que con este plan bajarías ~' + res.ritmoReal + ' kg/semana. Para llegar a ' + ritmo +
      ' kg necesitas ~' + falta + ' kcal más de gasto al día: unos ' + minCaminata + ' min extra de caminata diaria o 1–2 días más de rutina.');
  }

  // --- Macros ---
  var pesoRef = Math.min(peso, res.pesoSanoMax + 2);
  var gProt = objetivo === 'bajar_grasa' ? 2.0 : objetivo === 'ganar_musculo' ? 1.8 : 1.6;
  res.proteina = Math.min(Math.round(pesoRef * gProt), Math.round(kcal * 0.4 / 4));
  res.grasaG = Math.round(kcal * 0.27 / 9);
  res.carbs = Math.max(50, Math.round((kcal - res.proteina * 4 - res.grasaG * 9) / 4));

  // --- Meta y proyección ---
  var meta = n(q.pesoMeta);
  if (!meta || meta >= peso) meta = objetivo === 'bajar_grasa' ? Math.max(res.pesoSanoMax, r1(peso * 0.9)) : peso;
  res.pesoMeta = r1(meta);
  if (objetivo === 'bajar_grasa' && res.ritmoReal > 0) {
    res.semanasMeta = Math.ceil((peso - meta) / res.ritmoReal);
    res.proyeccion = [];
    var w = peso;
    for (var s = 0; s <= Math.min(res.semanasMeta, 52); s++) { res.proyeccion.push(r1(w)); w = Math.max(meta, w - res.ritmoReal * (s < 2 ? 1.25 : 1)); }
  }
  var cond = q.condiciones || [];
  if (cond.length && cond.indexOf('ninguna') < 0)
    res.avisos.push('Por tus condiciones de salud, comenta este plan con tu médico antes de empezar.');
  return res;
}

/** Tipo de sesión según el día de la semana (0 = lunes ... 6 = domingo) y los días de entrenamiento. */
var CALENDARIO_RUTINA = {
  2: ['fuerzaA', 'activo', 'activo', 'fuerzaB', 'activo', 'activo', 'descanso'],
  3: ['fuerzaA', 'activo', 'cardio', 'activo', 'fuerzaB', 'activo', 'descanso'],
  4: ['fuerzaA', 'cardio', 'activo', 'fuerzaB', 'activo', 'core', 'descanso'],
  5: ['fuerzaA', 'cardio', 'fuerzaB', 'core', 'activo', 'cardio', 'descanso'],
  6: ['fuerzaA', 'cardio', 'fuerzaB', 'core', 'fuerzaA', 'cardio', 'descanso']
};
var NOMBRE_SESION = {
  fuerzaA: 'Fuerza A · piernas y empuje', fuerzaB: 'Fuerza B · espalda y brazos', cardio: 'Cardio quema grasa',
  core: 'Core y abdomen', activo: 'Caminata activa', descanso: 'Descanso activo',
  pierna: 'Pierna y glúteo', superior: 'Torso y brazos', maquina: 'Cardio en máquina', libre: 'Mi rutina'
};
var MAQUINAS_CARDIO = ['caminadora', 'bicicleta', 'remadora', 'escaladora', 'eliptica', 'bodycrunch'];
/** Tipo de sesión del día (0 = lunes). Respeta la semana personalizada y usa máquinas en días de cardio si las tiene. */
function tipoSesion(q, diaSemana) {
  if (q && q.semanaPersonal && q.semanaPersonal[diaSemana]) return q.semanaPersonal[diaSemana];
  var d = Math.max(2, Math.min(6, parseInt(q && q.dias, 10) || 3));
  var t = CALENDARIO_RUTINA[d][diaSemana];
  var maqs = ((q && q.equipos) || []).filter(function (x) { return MAQUINAS_CARDIO.indexOf(x) >= 0; });
  if (t === 'cardio' && maqs.length && q.cardioEnMaquina !== false) t = 'maquina';
  return t;
}
// ===== FIN FF-COMPARTIDO =====

/* =========================================================
   FAMILIA FIT — Ejercicios animados y generador de rutinas
   ========================================================= */
(function () {
  const G = 200;                                      // línea del piso
  const LEN = { torso: 50, ua: 28, fa: 26, th: 40, sh: 40, foot: 14 };
  const FAR = [-4, -2];                               // desfase de las extremidades del fondo
  const COL = {
    piel: '#f2c3a0', pielF: '#dea582', camisa: '#6d4aff', camisaF: '#5536e0', short: '#2c2e48', shortF: '#20223a',
    tenis: '#3b3f63', tenisF: '#2c2f4d', suela: '#3a3d5c', pelo: '#2d2219', mat: '#e7e1fb', piso: '#e4e6ee', sombra: 'rgba(30,30,60,.10)',
    pesa: '#3a3d5c', silla: '#c9a27a', sillaF: '#a8835e', maq: '#565a7a', maqO: '#2c2e48', maqC: '#8f94b5', pantalla: '#9fd8ff', pared: '#d9dbe6'
  };
  const rad = d => d * Math.PI / 180;
  const abajo = a => [Math.sin(rad(a)), Math.cos(rad(a))];      // 0° = hacia abajo, + = hacia el frente
  const arriba = t => [Math.sin(rad(t)), -Math.cos(rad(t))];    // 0° = hacia arriba
  const mas = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const angDe = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI;
  const CAMPOS = ['hx', 'hy', 't', 'hd', 'nu', 'nf', 'fu', 'ff', 'nt', 'ns', 'ft', 'fs', 'fN', 'fF', 'air', 'ax', 'ay', 'bx', 'by', 'lx', 'ly', 'mx', 'my'];
  const BASE = { hx: 150, hy: 115, t: 0, hd: 0, nu: 0, nf: 0, fu: 0, ff: 0, nt: 0, ns: 0, ft: 0, fs: 0, fN: null, fF: null, air: 0, ax: null, ay: null, bx: null, by: null, lx: null, ly: null, mx: null, my: null };

  // Cinemática inversa de 2 segmentos
  function ik(raiz, obj, a, b, s) {
    let dx = obj[0] - raiz[0], dy = obj[1] - raiz[1], d = Math.hypot(dx, dy);
    const dmax = a + b - 0.01, dmin = Math.abs(a - b) + 0.01;
    const dd = Math.max(dmin, Math.min(dmax, d));
    const ux = dx / (d || 1), uy = dy / (d || 1);
    const alfa = Math.acos(Math.max(-1, Math.min(1, (a * a + dd * dd - b * b) / (2 * a * dd)))) * s;
    const c = Math.cos(alfa), sn = Math.sin(alfa);
    const j = [raiz[0] + a * (ux * c - uy * sn), raiz[1] + a * (ux * sn + uy * c)];
    const fin = [raiz[0] + ux * dd, raiz[1] + uy * dd];
    return [j, fin];
  }

  function interpolar(spec, fase) {
    const kf = spec._kf;
    let i = 0;
    while (i < kf.length - 2 && fase > kf[i + 1].k) i++;
    const a = kf[i], b = kf[i + 1];
    let u = (fase - a.k) / ((b.k - a.k) || 1);
    u = Math.max(0, Math.min(1, u));
    if (!spec.lineal) u = (1 - Math.cos(Math.PI * u)) / 2;
    const p = {};
    CAMPOS.forEach(c => {
      const va = a[c], vb = b[c];
      if (va === null || vb === null) p[c] = (u < 0.5 ? va : vb);
      else p[c] = va + (vb - va) * u;
    });
    return p;
  }

  function preparar(spec) {
    if (spec._kf) return spec;
    let prev = Object.assign({}, BASE);
    spec._kf = spec.kf.map(k => { prev = Object.assign({}, prev, k); return prev; });
    return spec;
  }

  // ---------- Esqueleto ----------
  function poseLado(spec, p) {
    const J = {};
    J.H = [p.hx, p.hy];
    J.S = mas(J.H, arriba(p.t), LEN.torso);
    J.C = mas(J.S, arriba(p.t + p.hd), 16);
    J.HF = [J.H[0] + FAR[0], J.H[1] + FAR[1]];
    J.SF = [J.S[0] + FAR[0], J.S[1] + FAR[1]];
    const brazo = (raiz, u, f, clave) => {
      let t = spec.ik && spec.ik[clave];
      if (clave === 'nA' && p.ax !== null) t = [p.ax, p.ay, spec.bendA || 1];
      if (clave === 'fA' && p.bx !== null) t = [p.bx, p.by, spec.bendA || 1];
      else if (clave === 'fA' && p.ax !== null) t = [p.ax + FAR[0], p.ay + FAR[1], spec.bendA || 1];
      if (t) { const r = ik(raiz, t, LEN.ua, LEN.fa, t[2]); return r; }
      const e = mas(raiz, abajo(u), LEN.ua); return [e, mas(e, abajo(f), LEN.fa)];
    };
    const pierna = (raiz, th, sh, clave, pieFijo, modo) => {
      let t = spec.ik && spec.ik[clave];
      if (clave === 'nL' && p.lx !== null) t = [p.lx, p.ly, spec.bendL || -1];
      if (clave === 'fL' && p.mx !== null) t = [p.mx, p.my, spec.bendL || -1];
      let k, a;
      if (t) { [k, a] = ik(raiz, [t[0], t[1] + p.air], LEN.th, LEN.sh, t[2]); }
      else { k = mas(raiz, abajo(th), LEN.th); a = mas(k, abajo(sh), LEN.sh); }
      const shin = angDe(k, a);
      const pie = pieFijo !== null && pieFijo !== undefined ? pieFijo : (modo === 'flat' ? 90 : shin + 90);
      return [k, a, mas(a, abajo(pie), LEN.foot)];
    };
    [J.E, J.W] = brazo(J.S, p.nu, p.nf, 'nA');
    [J.EF, J.WF] = brazo(J.SF, p.fu, p.ff, 'fA');
    [J.K, J.A, J.T] = pierna(J.H, p.nt, p.ns, 'nL', p.fN, spec.pieN || spec.pie || 'rel');
    [J.KF, J.AF, J.TF] = pierna(J.HF, p.ft, p.fs, 'fL', p.fF, spec.pieF || spec.pie || 'rel');
    J.adelante = arriba(p.t + p.hd + 90);
    J.subir = arriba(p.t + p.hd);
    return J;
  }

  function poseFrente(spec, p) {
    const J = {};
    J.H = [p.hx, p.hy];
    J.S = [p.hx, p.hy - LEN.torso];
    J.C = [p.hx, p.hy - LEN.torso - 17];
    const lado = (sg, u, f, th, sh) => {
      const s = [p.hx + 15 * sg, J.S[1] + 4], h = [p.hx + 9 * sg, p.hy];
      const e = [s[0] + sg * Math.sin(rad(u)) * LEN.ua, s[1] + Math.cos(rad(u)) * LEN.ua];
      const w = [e[0] + sg * Math.sin(rad(f)) * LEN.fa, e[1] + Math.cos(rad(f)) * LEN.fa];
      const k = [h[0] + sg * Math.sin(rad(th)) * LEN.th, h[1] + Math.cos(rad(th)) * LEN.th];
      const a = [k[0] + sg * Math.sin(rad(sh)) * LEN.sh, k[1] + Math.cos(rad(sh)) * LEN.sh];
      return { s, h, e, w, k, a, t: [a[0] + sg * 8, a[1] + 3] };
    };
    J.R = lado(1, p.nu, p.nf, p.nt, p.ns);
    J.L = lado(-1, p.fu, p.ff, p.ft, p.fs);
    return J;
  }

  // ---------- Dibujo ----------
  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, padre) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (padre) padre.appendChild(e);
    return e;
  }
  const pts = arr => arr.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const setL = (e, a, b) => { e.setAttribute('x1', a[0].toFixed(1)); e.setAttribute('y1', a[1].toFixed(1)); e.setAttribute('x2', b[0].toFixed(1)); e.setAttribute('y2', b[1].toFixed(1)); };
  const setC = (e, c) => { e.setAttribute('cx', c[0].toFixed(1)); e.setAttribute('cy', c[1].toFixed(1)); };
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

  function construir(svg, spec) {
    const P = {};
    const props = spec.props || [];
    el('rect', { x: -300, y: G, width: 900, height: 60, fill: COL.piso }, svg);
    if (props.includes('mat')) el('rect', { x: 22, y: G - 4, width: 256, height: 8, rx: 4, fill: COL.mat }, svg);
    else if (!['caminadora', 'bici', 'remo', 'escaladora', 'eliptica', 'bodycrunch'].some(x => props.includes(x))) P.sombra = el('ellipse', { cx: 150, cy: G, rx: 46, ry: 5, fill: COL.sombra }, svg);
    if (props.includes('silla')) {
      el('rect', { x: 38, y: 86, width: 9, height: 114, rx: 3, fill: COL.sillaF }, svg);
      el('rect', { x: 102, y: 156, width: 7, height: 44, rx: 3, fill: COL.sillaF }, svg);
      el('rect', { x: 36, y: 148, width: 78, height: 10, rx: 4, fill: COL.silla }, svg);
    }
    const L2 = (x1, y1, x2, y2, c, w) => el('line', { x1, y1, x2, y2, stroke: c, 'stroke-width': w, 'stroke-linecap': 'round' }, svg);
    const R2 = (x, y, w, h, c, rx) => el('rect', { x, y, width: w, height: h, rx: rx === undefined ? 3 : rx, fill: c }, svg);
    const C2 = (cx, cy, r, c) => el('circle', { cx, cy, r, fill: c }, svg);
    if (props.includes('pared')) R2(96, 10, 14, 190, COL.pared, 0);
    if (props.includes('caminadora')) {
      R2(58, 185, 184, 13, COL.maqO, 6); R2(62, 182, 176, 5, COL.maq, 2);
      L2(229, 190, 214, 100, COL.maq, 8); R2(194, 84, 44, 18, COL.maq, 6); R2(201, 88, 30, 9, COL.pantalla, 2); L2(214, 124, 176, 126, COL.maqC, 6);
    }
    if (props.includes('bici')) {
      R2(86, 194, 154, 7, COL.maq, 3); L2(134, 128, 146, 196, COL.maq, 7); L2(144, 164, 205, 166, COL.maq, 7);
      C2(205, 166, 24, COL.maqO); C2(205, 166, 8, COL.maqC); L2(208, 162, 198, 98, COL.maq, 7); L2(188, 95, 207, 95, COL.maqO, 7);
      R2(114, 122, 34, 7, COL.maqO, 3); C2(168, 170, 6, COL.maqC);
    }
    if (props.includes('remo')) {
      L2(44, 191, 252, 191, COL.maq, 6); L2(60, 191, 60, 199, COL.maq, 6); L2(240, 191, 240, 199, COL.maq, 6);
      C2(252, 168, 22, COL.maqO); C2(252, 168, 7, COL.maqC); L2(208, 188, 219, 162, COL.maqC, 7);
    }
    if (props.includes('escaladora')) {
      R2(58, 192, 184, 8, COL.maq, 3); R2(108, 184, 84, 9, COL.maqO, 2); R2(128, 172, 74, 9, COL.maq, 2); R2(148, 160, 58, 9, COL.maqC, 2);
      L2(206, 194, 197, 96, COL.maq, 8); R2(182, 82, 32, 15, COL.maq, 5); R2(187, 85, 22, 8, COL.pantalla, 2); L2(198, 106, 168, 108, COL.maqC, 6);
    }
    if (props.includes('eliptica')) {
      R2(58, 194, 184, 7, COL.maq, 3); C2(78, 176, 17, COL.maqO); C2(78, 176, 6, COL.maqC); L2(80, 190, 214, 192, COL.maq, 6); L2(218, 196, 206, 92, COL.maq, 8);
      R2(194, 80, 28, 14, COL.maq, 5);
    }
    if (props.includes('bodycrunch')) {
      R2(88, 194, 126, 7, COL.maq, 3); L2(140, 158, 140, 196, COL.maq, 8); L2(110, 152, 98, 88, COL.maqO, 11); R2(110, 149, 62, 10, COL.maqO, 4);
      L2(196, 186, 216, 186, COL.maqC, 7); L2(206, 196, 206, 186, COL.maq, 6); C2(102, 80, 5, COL.maqC);
    }
    if (spec.manijas) { P.manN = L2(0, 0, 0, 0, COL.maqC, 5); P.manF = L2(0, 0, 0, 0, COL.maq, 5); }
    if (spec.cuerda) P.cuerda = L2(0, 0, 0, 0, '#9aa0bf', 2.5);
    if (spec.asiento) P.asiento = R2(0, 0, spec.asiento.w, 7, COL.maqO, 3);
    const linea = (color, ancho) => el('line', { stroke: color, 'stroke-width': ancho, 'stroke-linecap': 'round' }, svg);
    const poli = (color, ancho) => el('polyline', { fill: 'none', stroke: color, 'stroke-width': ancho, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    const circ = (color, r) => el('circle', { r, fill: color }, svg);
    const pesa = () => { const g = el('g', {}, svg); el('line', { x1: -9, y1: 0, x2: 9, y2: 0, stroke: COL.pesa, 'stroke-width': 3.5, 'stroke-linecap': 'round' }, g); el('rect', { x: -12, y: -5.5, width: 6, height: 11, rx: 2, fill: COL.pesa }, g); el('rect', { x: 6, y: -5.5, width: 6, height: 11, rx: 2, fill: COL.pesa }, g); return g; };
    const conPesas = props.includes('mancuernas');
    if (spec.vista === 'frente') {
      ['L', 'R'].forEach(s => {
        const f = s === 'L';
        P['leg' + s] = poli(f ? COL.pielF : COL.piel, 10);
        P['sho' + s] = linea(f ? COL.tenisF : COL.tenis, 7);
      });
      P.torso = el('path', { fill: COL.camisa, stroke: COL.camisa, 'stroke-width': 8, 'stroke-linejoin': 'round' }, svg);
      P.short = el('path', { fill: COL.short, stroke: COL.short, 'stroke-width': 6, 'stroke-linejoin': 'round' }, svg);
      ['L', 'R'].forEach(s => {
        const f = s === 'L';
        P['th' + s] = linea(f ? COL.shortF : COL.short, 14);
        P['arm' + s] = poli(f ? COL.pielF : COL.piel, 8.5);
        P['slv' + s] = linea(f ? COL.camisaF : COL.camisa, 11);
        P['hand' + s] = circ(f ? COL.pielF : COL.piel, 4.4);
        if (conPesas) P['pesa' + s] = pesa();
      });
      P.pelo = circ(COL.pelo, 12.2); P.cara = circ(COL.piel, 10.6);
    } else {
      P.armF = poli(COL.pielF, 8.5); P.slvF = linea(COL.camisaF, 11); P.handF = circ(COL.pielF, 4.3);
      if (conPesas) P.pesaF = pesa();
      P.legF = poli(COL.pielF, 10); P.thF = linea(COL.shortF, 14.5); P.shoF = linea(COL.tenisF, 7.5);
      P.torso = linea(COL.camisa, 25); P.cintura = linea(COL.short, 25);
      P.pelo = circ(COL.pelo, 11.8); P.cara = circ(COL.piel, 10.3);
      P.leg = poli(COL.piel, 10); P.th = linea(COL.short, 14.5); P.sho = linea(COL.tenis, 7.5);
      P.arm = poli(COL.piel, 8.5); P.slv = linea(COL.camisa, 11); P.hand = circ(COL.piel, 4.3);
      if (conPesas) P.pesa = pesa();
    }
    return P;
  }

  function dibujar(P, spec, J) {
    if (spec.vista === 'frente') {
      ['L', 'R'].forEach(s => {
        const x = J[s];
        P['leg' + s].setAttribute('points', pts([x.h, x.k, x.a]));
        setL(P['th' + s], x.h, lerp(x.h, x.k, 0.55));
        setL(P['sho' + s], x.a, x.t);
        P['arm' + s].setAttribute('points', pts([x.s, x.e, x.w]));
        setL(P['slv' + s], x.s, lerp(x.s, x.e, 0.5));
        setC(P['hand' + s], x.w);
        if (P['pesa' + s]) P['pesa' + s].setAttribute('transform', `translate(${x.w[0].toFixed(1)},${x.w[1].toFixed(1)})`);
      });
      const h = J.H, s = J.S;
      P.torso.setAttribute('d', `M${h[0] - 11},${h[1] - 4} L${s[0] - 16},${s[1] + 4} L${s[0] + 16},${s[1] + 4} L${h[0] + 11},${h[1] - 4} Z`);
      P.short.setAttribute('d', `M${h[0] - 13},${h[1] - 8} L${h[0] + 13},${h[1] - 8} L${h[0] + 14},${h[1] + 10} L${h[0] - 14},${h[1] + 10} Z`);
      setC(P.pelo, [J.C[0], J.C[1] - 1.6]); setC(P.cara, [J.C[0], J.C[1] + 1.4]);
      if (P.sombra) P.sombra.setAttribute('cx', h[0]);
      return;
    }
    P.armF.setAttribute('points', pts([J.SF, J.EF, J.WF])); setL(P.slvF, J.SF, lerp(J.SF, J.EF, 0.5)); setC(P.handF, J.WF);
    P.legF.setAttribute('points', pts([J.HF, J.KF, J.AF])); setL(P.thF, J.HF, lerp(J.HF, J.KF, 0.6)); setL(P.shoF, J.AF, J.TF);
    setL(P.torso, J.H, J.S); setL(P.cintura, J.H, lerp(J.H, J.S, 0.16));
    setC(P.pelo, mas(mas(J.C, J.adelante, -1.9), J.subir, 1.1)); setC(P.cara, mas(mas(J.C, J.adelante, 1.4), J.subir, -0.6));
    P.leg.setAttribute('points', pts([J.H, J.K, J.A])); setL(P.th, J.H, lerp(J.H, J.K, 0.6)); setL(P.sho, J.A, J.T);
    P.arm.setAttribute('points', pts([J.S, J.E, J.W])); setL(P.slv, J.S, lerp(J.S, J.E, 0.5)); setC(P.hand, J.W);
    if (P.pesa) P.pesa.setAttribute('transform', `translate(${J.W[0].toFixed(1)},${J.W[1].toFixed(1)})`);
    if (P.pesaF) P.pesaF.setAttribute('transform', `translate(${J.WF[0].toFixed(1)},${J.WF[1].toFixed(1)})`);
    if (P.sombra) { P.sombra.setAttribute('cx', J.H[0]); }
    if (P.manN) { const m = spec.manijas; setL(P.manN, m, J.W); setL(P.manF, [m[0] - 4, m[1] - 2], J.WF); }
    if (P.cuerda) setL(P.cuerda, spec.cuerda, J.W);
    if (P.asiento) { P.asiento.setAttribute('x', (J.H[0] - spec.asiento.w / 2).toFixed(1)); P.asiento.setAttribute('y', (J.H[1] + spec.asiento.dy).toFixed(1)); }
  }

  function poseEn(spec, fase) {
    preparar(spec);
    const p = interpolar(spec, fase);
    return spec.vista === 'frente' ? poseFrente(spec, p) : poseLado(spec, p);
  }

  // ---------- Registro de animaciones activas ----------
  const activas = [];
  let corriendo = false;
  const obs = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(es => es.forEach(e => { e.target._vis = e.isIntersecting; }), { rootMargin: '80px' }) : null;
  function tick(now) {
    for (let i = activas.length - 1; i >= 0; i--) {
      const a = activas[i];
      if (!a.svg.isConnected) { activas.splice(i, 1); if (obs) obs.unobserve(a.svg); continue; }
      if (a.svg.dataset.pausa === '1' || a.svg._vis === false) continue;
      const fase = (((now - a.t0) / 1000) / a.spec.dur) % 1;
      dibujar(a.P, a.spec, poseEn(a.spec, fase));
    }
    if (activas.length) requestAnimationFrame(tick); else corriendo = false;
  }
  function montar(raiz) {
    (raiz || document).querySelectorAll('svg[data-anim]:not([data-listo])').forEach(svg => {
      const spec = EJ[svg.dataset.anim];
      if (!spec) return;
      svg.setAttribute('data-listo', '1');
      const P = construir(svg, spec);
      dibujar(P, spec, poseEn(spec, 0));
      activas.push({ svg, spec, P, t0: performance.now() - Math.random() * 300 });
      if (obs) obs.observe(svg);
    });
    if (activas.length && !corriendo) { corriendo = true; requestAnimationFrame(tick); }
  }
  const vista = id => { const e = EJ[id] || {}; const pr = e.props || [];
    return e.vb || (pr.includes('silla') ? '22 56 250 154' : pr.includes('mat') ? '18 84 264 132' : '30 10 240 200'); };
  const svgAnim = (id, clase) => `<svg data-anim="${id}" viewBox="${vista(id)}" class="${clase || ''}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${EJ[id] ? EJ[id].nombre : ''}"></svg>`;

  // ---------- Catálogo ----------
  const EJ = {
    sentadilla: {
      nombre: 'Sentadilla', grupo: 'Piernas', musculos: 'Cuádriceps, glúteos, core', met: 5, impacto: 'bajo', nivel: 1, evitar: [],
      tips: ['Pies al ancho de los hombros', 'Lleva la cadera atrás como si te sentaras', 'Rodillas en la misma dirección que las puntas'],
      reps: '12–15', vista: 'lado', dur: 3, pie: 'flat', ik: { nL: [150, 195, -1], fL: [146, 195, -1] },
      kf: [{ k: 0, nu: 5, nf: 5, fu: 5, ff: 5 }, { k: 0.45, hx: 128, hy: 158, t: 38, nu: 92, nf: 92, fu: 92, ff: 92 }, { k: 0.6 }, { k: 1, hx: 150, hy: 115, t: 0, nu: 5, nf: 5, fu: 5, ff: 5 }]
    },
    sentadilla_salto: {
      nombre: 'Sentadilla con salto', grupo: 'Piernas · cardio', musculos: 'Cuádriceps, glúteos, pantorrillas', met: 8, impacto: 'alto', nivel: 2, evitar: ['rodilla'],
      tips: ['Baja controlado a sentadilla', 'Impúlsate fuerte hacia arriba', 'Aterriza suave con las rodillas flexionadas'],
      reps: '10–12', vb: '30 -14 240 224', vista: 'lado', dur: 1.7, pie: 'flat', ik: { nL: [150, 195, -1], fL: [146, 195, -1] },
      kf: [{ k: 0, nu: -10, nf: -5, fu: -10, ff: -5, fN: 90, fF: 90 }, { k: 0.32, hx: 130, hy: 155, t: 35, nu: -45, nf: -30, fu: -45, ff: -30 },
        { k: 0.52, hx: 150, hy: 96, t: 0, nu: 168, nf: 172, fu: 168, ff: 172, air: -19, fN: 35, fF: 35 }, { k: 0.68, hy: 115, air: 0, nu: 30, nf: 40, fu: 30, ff: 40, fN: 90, fF: 90 },
        { k: 0.8, hx: 140, hy: 134, t: 18 }, { k: 1, hx: 150, hy: 115, t: 0, nu: -10, nf: -5, fu: -10, ff: -5 }]
    },
    zancada: {
      nombre: 'Zancada estática', grupo: 'Piernas', musculos: 'Cuádriceps, glúteos', met: 5, impacto: 'bajo', nivel: 1, evitar: ['rodilla'],
      tips: ['Un pie adelante y otro atrás, separados', 'Baja la rodilla de atrás casi al piso', 'Torso derecho; cambia de pierna a la mitad'],
      reps: '10 por pierna', vista: 'lado', dur: 3, pieN: 'flat', pieF: 'rel', ik: { nL: [182, 195, -1], fL: [110, 192, -1] },
      kf: [{ k: 0, hx: 148, hy: 121, t: 4, nu: 10, nf: 18, fu: 10, ff: 18 }, { k: 0.45, hx: 146, hy: 158 }, { k: 0.6 }, { k: 1, hx: 148, hy: 121 }]
    },
    puente: {
      nombre: 'Puente de glúteo', grupo: 'Glúteos', musculos: 'Glúteos, isquiotibiales, core', met: 3.5, impacto: 'bajo', nivel: 1, evitar: [],
      tips: ['Acostado, pies apoyados cerca de la cadera', 'Sube la cadera apretando los glúteos', 'Sostén un segundo arriba y baja lento'],
      reps: '15', vista: 'lado', dur: 3, pie: 'flat', props: ['mat'], ik: { nL: [194, 195, -1], fL: [190, 194, -1] },
      kf: [{ k: 0, hx: 145, hy: 187, t: -90, nu: 90, nf: 90, fu: 90, ff: 90 }, { k: 0.4, hx: 138, hy: 161, t: -121, hd: 31 }, { k: 0.65 }, { k: 1, hx: 145, hy: 187, t: -90, hd: 0 }]
    },
    talones: {
      nombre: 'Elevación de talones', grupo: 'Piernas', musculos: 'Pantorrillas', met: 3, impacto: 'bajo', nivel: 1, evitar: [],
      tips: ['De pie, pies al ancho de la cadera', 'Sube a las puntas lo más alto que puedas', 'Baja lento sin rebotar'],
      reps: '20', vista: 'lado', dur: 2, pie: 'flat', ik: { nL: [150, 195, -1], fL: [146, 195, -1] },
      kf: [{ k: 0, nu: 4, nf: 6, fu: 4, ff: 6, fN: 90, fF: 90 }, { k: 0.45, hy: 107, air: -8, fN: 45, fF: 45 }, { k: 0.6 }, { k: 1, hy: 115, air: 0, fN: 90, fF: 90 }]
    },
    lagartija: {
      nombre: 'Lagartija', grupo: 'Pecho y brazos', musculos: 'Pecho, tríceps, hombros, core', met: 7, impacto: 'bajo', nivel: 2, evitar: ['hombro'],
      tips: ['Manos debajo de los hombros', 'Cuerpo recto de la cabeza a los talones', 'Baja el pecho hasta casi tocar el piso'],
      reps: '8–12', vista: 'lado', dur: 2.6, pie: 'rel', props: ['mat'],
      ik: { nL: [70, 186, 1], fL: [66, 184, 1], nA: [193, 195, 1], fA: [189, 194, 1] },
      kf: [{ k: 0, hx: 145.7, hy: 160.1, t: 71.1 }, { k: 0.45, hx: 149.5, hy: 177.4, t: 83.8 }, { k: 0.55 }, { k: 1, hx: 145.7, hy: 160.1, t: 71.1 }]
    },
    lagartija_rodillas: {
      nombre: 'Lagartija con rodillas', grupo: 'Pecho y brazos', musculos: 'Pecho, tríceps, hombros', met: 4.5, impacto: 'bajo', nivel: 1, evitar: ['hombro'],
      tips: ['Rodillas apoyadas en el piso', 'Cuerpo recto de la cabeza a las rodillas', 'Baja el pecho controlado y empuja'],
      reps: '10–12', vista: 'lado', dur: 2.6, pie: 'rel', props: ['mat'], ik: { nA: [193, 195, 1], fA: [189, 194, 1] },
      kf: [{ k: 0, hx: 148, hy: 172.6, t: 64.2, nt: -64.2, ns: -140, ft: -64.2, fs: -140 }, { k: 0.45, hx: 151.6, hy: 184.4, t: 82, nt: -82, ft: -82 }, { k: 0.55 },
        { k: 1, hx: 148, hy: 172.6, t: 64.2, nt: -64.2, ft: -64.2 }]
    },
    fondos_silla: {
      nombre: 'Fondos en silla', grupo: 'Brazos', musculos: 'Tríceps, hombros, pecho', met: 5, impacto: 'bajo', nivel: 1, evitar: ['hombro'], equipo: 'silla',
      tips: ['Manos en la orilla de una silla firme', 'Baja flexionando los codos hacia atrás', 'Espalda cerca de la silla'],
      reps: '10–12', vista: 'lado', dur: 2.6, pie: 'flat', props: ['silla'],
      ik: { nA: [112, 150, 1], fA: [108, 149, 1], nL: [180, 195, -1], fL: [176, 195, -1] },
      kf: [{ k: 0, hx: 118, hy: 147, t: -5 }, { k: 0.45, hx: 121, hy: 175, t: -8 }, { k: 0.6 }, { k: 1, hx: 118, hy: 147, t: -5 }]
    },
    press_hombro: {
      nombre: 'Press de hombro', grupo: 'Hombros', musculos: 'Hombros, tríceps', met: 4, impacto: 'bajo', nivel: 1, evitar: ['hombro'], equipo: 'mancuernas',
      tips: ['Mancuernas o botellas de agua a la altura de los hombros', 'Empuja hacia arriba sin arquear la espalda', 'Baja lento hasta los hombros'],
      reps: '12', vista: 'frente', dur: 2.6, props: ['mancuernas'],
      kf: [{ k: 0, nu: 95, nf: 178, fu: 95, ff: 178, nt: 4, ns: 4, ft: 4, fs: 4 }, { k: 0.45, nu: 166, nf: 172, fu: 166, ff: 172 }, { k: 0.6 }, { k: 1, nu: 95, nf: 178, fu: 95, ff: 178 }]
    },
    remo: {
      nombre: 'Remo inclinado', grupo: 'Espalda', musculos: 'Dorsales, bíceps, espalda alta', met: 4.5, impacto: 'bajo', nivel: 1, evitar: ['espalda'], equipo: 'mancuernas',
      tips: ['Inclina el torso con la espalda recta', 'Jala las mancuernas hacia la cadera', 'Junta los omóplatos arriba'],
      reps: '12', vista: 'lado', dur: 2.4, pie: 'flat', props: ['mancuernas'], ik: { nL: [150, 195, -1], fL: [146, 195, -1] },
      kf: [{ k: 0, hx: 138, hy: 124, t: 55, nu: 4, nf: 4, fu: 4, ff: 4 }, { k: 0.45, nu: -72, nf: 4, fu: -72, ff: 4 }, { k: 0.6 }, { k: 1, nu: 4, nf: 4, fu: 4, ff: 4 }]
    },
    superman: {
      nombre: 'Superman', grupo: 'Espalda baja', musculos: 'Lumbares, glúteos, hombros', met: 3.5, impacto: 'bajo', nivel: 1, evitar: ['espalda'],
      tips: ['Boca abajo, brazos estirados al frente', 'Levanta brazos, pecho y piernas a la vez', 'Sostén 2 segundos y baja'],
      reps: '12', vista: 'lado', dur: 3, pie: 'rel', props: ['mat'],
      kf: [{ k: 0, hx: 125, hy: 189, t: 90, nu: 90, nf: 90, fu: 90, ff: 90, nt: -88, ns: -88, ft: -88, fs: -88 },
        { k: 0.4, t: 77, hd: -6, nu: 103, nf: 105, fu: 103, ff: 105, nt: -100, ns: -102, ft: -100, fs: -102 }, { k: 0.7 },
        { k: 1, t: 90, hd: 0, nu: 90, nf: 90, fu: 90, ff: 90, nt: -88, ns: -88, ft: -88, fs: -88 }]
    },
    plancha: {
      nombre: 'Plancha', grupo: 'Core', musculos: 'Abdomen, hombros, glúteos', met: 4, impacto: 'bajo', nivel: 1, evitar: [],
      tips: ['Codos debajo de los hombros', 'Aprieta abdomen y glúteos', 'No dejes caer la cadera'],
      reps: 'Sostener', vista: 'lado', dur: 3, pie: 'rel', props: ['mat'], ik: { nL: [70, 186, 1], fL: [66, 184, 1] },
      kf: [{ k: 0, hx: 149, hy: 173.2, t: 80.7, nu: 0, nf: 90, fu: 0, ff: 90 }, { k: 0.5, hy: 171.6 }, { k: 1, hy: 173.2 }]
    },
    crunch: {
      nombre: 'Abdominal corto', grupo: 'Core', musculos: 'Abdomen', met: 3.8, impacto: 'bajo', nivel: 1, evitar: [],
      tips: ['Acostado con rodillas flexionadas', 'Sube los hombros llevando las manos a las rodillas', 'Baja lento sin jalar el cuello'],
      reps: '15–20', vista: 'lado', dur: 2.4, pie: 'flat', props: ['mat'], ik: { nL: [196, 195, -1], fL: [192, 194, -1] },
      kf: [{ k: 0, hx: 150, hy: 187, t: -90, nu: 90, nf: 90, fu: 90, ff: 90 }, { k: 0.45, t: -64, hd: 10, nu: 106, nf: 106, fu: 106, ff: 106 }, { k: 0.6 },
        { k: 1, t: -90, hd: 0, nu: 90, nf: 90, fu: 90, ff: 90 }]
    },
    escaladores: {
      nombre: 'Escaladores', grupo: 'Cardio · core', musculos: 'Core, hombros, piernas', met: 8, impacto: 'bajo', nivel: 1, evitar: ['hombro'],
      tips: ['Posición de lagartija con brazos estirados', 'Lleva una rodilla al pecho y alterna rápido', 'Cadera baja y abdomen firme'],
      reps: '20 por pierna', vista: 'lado', dur: 1, pie: 'rel', props: ['mat'], ik: { nA: [193, 195, 1], fA: [189, 194, 1] },
      kf: [{ k: 0, hx: 145.7, hy: 158, t: 71, nt: 55, ns: -80, ft: -71, fs: -71 }, { k: 0.5, nt: -71, ns: -71, ft: 55, fs: -80 }, { k: 1, nt: 55, ns: -80, ft: -71, fs: -71 }]
    },
    jumping_jacks: {
      nombre: 'Saltos de tijera', grupo: 'Cardio', musculos: 'Cuerpo completo', met: 8, impacto: 'alto', nivel: 1, evitar: ['rodilla'],
      tips: ['Salta abriendo piernas y subiendo brazos', 'Vuelve juntando piernas y bajando brazos', 'Aterriza en las puntas, suave'],
      reps: '30', vista: 'frente', dur: 1.2,
      kf: [{ k: 0, nu: 8, nf: 8, fu: 8, ff: 8, nt: 3, ns: 3, ft: 3, fs: 3 }, { k: 0.25, hy: 106, nu: 88, nf: 92, fu: 88, ff: 92, nt: 12, ns: 12, ft: 12, fs: 12 },
        { k: 0.5, hy: 120, nu: 165, nf: 170, fu: 165, ff: 170, nt: 20, ns: 20, ft: 20, fs: 20 }, { k: 0.75, hy: 106, nu: 88, nf: 92, fu: 88, ff: 92, nt: 12, ns: 12, ft: 12, fs: 12 },
        { k: 1, hy: 115, nu: 8, nf: 8, fu: 8, ff: 8, nt: 3, ns: 3, ft: 3, fs: 3 }]
    },
    step_jacks: {
      nombre: 'Tijeras sin salto', grupo: 'Cardio', musculos: 'Cuerpo completo', met: 4.5, impacto: 'bajo', nivel: 1, evitar: [],
      tips: ['Abre una pierna al lado mientras subes los brazos', 'Regresa al centro y cambia de lado', 'Mantén un ritmo constante'],
      reps: '30', vista: 'frente', dur: 2.2,
      kf: [{ k: 0, nu: 8, nf: 8, fu: 8, ff: 8, nt: 3, ns: 3, ft: 3, fs: 3 }, { k: 0.25, hy: 117, nu: 160, nf: 166, fu: 160, ff: 166, nt: 18, ns: 18 },
        { k: 0.5, hy: 115, nu: 8, nf: 8, fu: 8, ff: 8, nt: 3, ns: 3 }, { k: 0.75, hy: 117, nu: 160, nf: 166, fu: 160, ff: 166, ft: 18, fs: 18 },
        { k: 1, hy: 115, nu: 8, nf: 8, fu: 8, ff: 8, ft: 3, fs: 3 }]
    },
    rodillas_arriba: {
      nombre: 'Rodillas arriba', grupo: 'Cardio', musculos: 'Piernas, core', met: 8, impacto: 'alto', nivel: 1, evitar: ['rodilla'],
      tips: ['Corre en tu lugar subiendo las rodillas', 'Rodillas a la altura de la cadera', 'Mueve los brazos al ritmo'],
      reps: '30', vista: 'lado', dur: 0.8, pie: 'rel',
      kf: [{ k: 0, hy: 115, nt: 86, ns: 4, ft: 0, fs: 0, nu: -42, nf: 25, fu: 48, ff: 115 }, { k: 0.25, hy: 109, nt: 43, ns: 2, ft: 43, fs: 2, nu: 3, nf: 70, fu: 3, ff: 70 },
        { k: 0.5, hy: 115, nt: 0, ns: 0, ft: 86, fs: 4, nu: 48, nf: 115, fu: -42, ff: 25 }, { k: 0.75, hy: 109, nt: 43, ns: 2, ft: 43, fs: 2, nu: 3, nf: 70, fu: 3, ff: 70 },
        { k: 1, hy: 115, nt: 86, ns: 4, ft: 0, fs: 0, nu: -42, nf: 25, fu: 48, ff: 115 }]
    },
    marcha: {
      nombre: 'Marcha en el lugar', grupo: 'Cardio suave', musculos: 'Piernas, cadera', met: 3.5, impacto: 'bajo', nivel: 1, evitar: [],
      tips: ['Marcha subiendo las rodillas', 'Balancea los brazos', 'Respira y mantén la postura'],
      reps: '1 min', vista: 'lado', dur: 1.4, pie: 'rel',
      kf: [{ k: 0, nt: 58, ns: -8, ft: 0, fs: 0, nu: -25, nf: 20, fu: 30, ff: 75 }, { k: 0.5, nt: 0, ns: 0, ft: 58, fs: -8, nu: 30, nf: 75, fu: -25, ff: 20 },
        { k: 1, nt: 58, ns: -8, ft: 0, fs: 0, nu: -25, nf: 20, fu: 30, ff: 75 }]
    },
    circulos_brazos: {
      nombre: 'Círculos de brazos', grupo: 'Movilidad', musculos: 'Hombros', met: 2.5, impacto: 'bajo', nivel: 1, evitar: [],
      tips: ['Brazos estirados', 'Haz círculos grandes y lentos', 'A la mitad cambia de dirección'],
      reps: '30 s', vista: 'frente', dur: 2,
      kf: [{ k: 0, nu: 12, nf: 12, fu: 12, ff: 12, nt: 4, ns: 4, ft: 4, fs: 4 }, { k: 0.5, nu: 172, nf: 176, fu: 172, ff: 176 }, { k: 1, nu: 12, nf: 12, fu: 12, ff: 12 }]
    },
    est_cuadriceps: {
      nombre: 'Estiramiento de cuádriceps', grupo: 'Estiramiento', musculos: 'Cuádriceps', met: 2.3, impacto: 'bajo', nivel: 1, evitar: [],
      tips: ['Toma tu tobillo y llévalo al glúteo', 'Rodillas juntas, cadera al frente', 'Cambia de pierna a la mitad'],
      reps: '30 s por pierna', vista: 'lado', dur: 3.5, pieF: 'flat', pieN: 'rel', ik: { fL: [146, 195, -1] },
      kf: [{ k: 0, nt: -10, ns: -165, nu: -19, nf: -19, fu: 25, ff: 40 }, { k: 0.5, hx: 151, t: 3 }, { k: 1, hx: 150, t: 0 }]
    },
    est_isquios: {
      nombre: 'Estiramiento de isquiotibiales', grupo: 'Estiramiento', musculos: 'Isquiotibiales, espalda baja', met: 2.3, impacto: 'bajo', nivel: 1, evitar: [],
      tips: ['Una pierna al frente con el talón apoyado', 'Inclínate con la espalda recta', 'Cambia de pierna a la mitad'],
      reps: '30 s por pierna', vista: 'lado', dur: 4, pieF: 'flat', ik: { fL: [140, 195, -1] },
      kf: [{ k: 0, hx: 150, hy: 122, t: 5, nt: 28, ns: 28, fN: 150, nu: 5, nf: 5, fu: 5, ff: 5 }, { k: 0.45, hx: 144, hy: 124, t: 56, nu: 16, nf: 16, fu: 16, ff: 16 }, { k: 0.75 },
        { k: 1, hx: 150, hy: 122, t: 5, nu: 5, nf: 5, fu: 5, ff: 5 }]
    },
    caminar: {
      nombre: 'Caminata', grupo: 'Cardio suave', musculos: 'Cuerpo completo', met: 3.8, impacto: 'bajo', nivel: 1, evitar: [],
      tips: ['Paso rápido, como si fueras tarde', 'Brazos en movimiento', 'Puedes hacerlo en la calle, un parque o en casa'],
      reps: '30 min', vista: 'lado', dur: 1.2, pie: 'rel',
      kf: [{ k: 0, hy: 120, nt: 25, ns: 18, ft: -22, fs: -45, nu: -22, nf: -10, fu: 22, ff: 35 }, { k: 0.25, hy: 114, nt: -2, ns: -2, ft: 12, fs: -35, nu: 0, nf: 10, fu: 0, ff: 10 },
        { k: 0.5, hy: 120, nt: -22, ns: -45, ft: 25, fs: 18, nu: 22, nf: 35, fu: -22, ff: -10 }, { k: 0.75, hy: 114, nt: 12, ns: -35, ft: -2, fs: -2, nu: 0, nf: 10, fu: 0, ff: 10 },
        { k: 1, hy: 120, nt: 25, ns: 18, ft: -22, fs: -45, nu: -22, nf: -10, fu: 22, ff: 35 }]
    },

    // ===== MÁQUINAS DE CARDIO =====
    maq_caminadora: {
      nombre: 'Caminadora', grupo: 'Máquina cardio', musculos: 'Piernas, glúteos, corazón', met: 5, impacto: 'bajo', nivel: 1, evitar: [], equipo: 'caminadora',
      tips: ['Sube la inclinación antes que la velocidad', 'No te agarres de los barandales', 'Pasos cortos y rápidos, espalda derecha'],
      reps: 'Por tiempo', vista: 'lado', dur: 1.2, pie: 'rel', props: ['caminadora'],
      kf: [{ k: 0, hy: 109, nt: 25, ns: 18, ft: -22, fs: -45, nu: -22, nf: -10, fu: 22, ff: 35 }, { k: 0.25, hy: 103, nt: -2, ns: -2, ft: 12, fs: -35, nu: 0, nf: 10, fu: 0, ff: 10 },
        { k: 0.5, hy: 109, nt: -22, ns: -45, ft: 25, fs: 18, nu: 22, nf: 35, fu: -22, ff: -10 }, { k: 0.75, hy: 103, nt: 12, ns: -35, ft: -2, fs: -2, nu: 0, nf: 10, fu: 0, ff: 10 },
        { k: 1, hy: 109, nt: 25, ns: 18, ft: -22, fs: -45, nu: -22, nf: -10, fu: 22, ff: 35 }]
    },
    maq_bicicleta: {
      nombre: 'Bicicleta estática', grupo: 'Máquina cardio', musculos: 'Cuádriceps, glúteos, corazón', met: 6.8, impacto: 'bajo', nivel: 1, evitar: [], equipo: 'bicicleta',
      tips: ['Asiento a la altura de la cadera', 'Rodilla casi estirada abajo, sin bloquearla', 'Controla la resistencia, no solo la velocidad'],
      reps: 'Por tiempo', vista: 'lado', dur: 1, pie: 'rel', props: ['bici'], lineal: true, bendA: -1,
      kf: Array.from({ length: 9 }, (_, i) => { const a = i * Math.PI / 4; const k = { k: i / 8, lx: 168 + 16 * Math.cos(a), ly: 170 + 16 * Math.sin(a), mx: 164 + 16 * Math.cos(a + Math.PI), my: 168 + 16 * Math.sin(a + Math.PI) }; if (!i) Object.assign(k, { hx: 132, hy: 117, t: 24, ax: 196, ay: 95 }); return k; })
    },
    maq_remadora: {
      nombre: 'Remadora', grupo: 'Máquina cardio', musculos: 'Espalda, piernas, brazos, core', met: 7, impacto: 'bajo', nivel: 1, evitar: ['espalda'], equipo: 'remadora',
      tips: ['Orden: piernas, luego espalda, luego brazos', 'Al regresar: brazos, espalda y al final rodillas', 'Espalda recta, no jorobada'],
      reps: 'Por tiempo', vista: 'lado', dur: 2.6, pie: 'rel', props: ['remo'], asiento: { w: 30, dy: 6 }, cuerda: [240, 162], bendA: -1,
      ik: { nL: [212, 174, -1], fL: [208, 172, -1] },
      kf: [{ k: 0, hx: 160, hy: 172, t: 24, ax: 218, ay: 165 }, { k: 0.4, hx: 132, t: -24, ax: 150, ay: 145 }, { k: 0.55, hx: 134, t: 8, ax: 200, ay: 156 }, { k: 1, hx: 160, t: 24, ax: 218, ay: 165 }]
    },
    maq_escaladora: {
      nombre: 'Escaladora', grupo: 'Máquina cardio', musculos: 'Glúteos, piernas, corazón', met: 8.8, impacto: 'bajo', nivel: 1, evitar: ['rodilla'], equipo: 'escaladora',
      tips: ['Apoya todo el pie en cada escalón', 'Toca los barandales solo para equilibrio', 'Torso ligeramente inclinado, abdomen firme'],
      reps: 'Por tiempo', vista: 'lado', dur: 1.3, pie: 'flat', props: ['escaladora'], bendA: -1,
      kf: [{ k: 0, hy: 104, t: 10, ax: 178, ay: 106, nt: 0, ns: 0, ft: 58, fs: -14 }, { k: 0.5, nt: 58, ns: -14, ft: 0, fs: 0 }, { k: 1, nt: 0, ns: 0, ft: 58, fs: -14 }]
    },
    maq_eliptica: {
      nombre: 'Elíptica', grupo: 'Máquina cardio', musculos: 'Cuerpo completo, corazón', met: 5, impacto: 'bajo', nivel: 1, evitar: [], equipo: 'eliptica',
      tips: ['Empuja y jala las manijas con los brazos', 'Talones apoyados en los pedales', 'Mantén el torso derecho'],
      reps: 'Por tiempo', vista: 'lado', dur: 1.6, pie: 'flat', props: ['eliptica'], lineal: true, manijas: [204, 132], bendA: -1,
      kf: Array.from({ length: 9 }, (_, i) => { const a = i * Math.PI / 4, c = Math.cos(a), sn = Math.sin(a); const k = { k: i / 8, lx: 150 + 24 * c, ly: 183 + 7 * sn, mx: 146 - 24 * c, my: 181 - 7 * sn, ax: 186 - 12 * c, ay: 112, bx: 182 + 12 * c, by: 111 }; if (!i) Object.assign(k, { hy: 107, t: 6 }); return k; })
    },
    maq_bodycrunch: {
      nombre: 'Body Crunch', grupo: 'Máquina cardio', musculos: 'Abdomen, espalda, brazos, piernas', met: 6, impacto: 'bajo', nivel: 1, evitar: ['espalda'], equipo: 'bodycrunch',
      tips: ['Jala las manijas mientras subes las rodillas', 'Exhala al contraer el abdomen', 'Regresa lento y controlado'],
      reps: 'Por tiempo', vista: 'lado', dur: 2.4, pie: 'rel', props: ['bodycrunch'], manijas: [102, 80],
      kf: [{ k: 0, hx: 140, hy: 142, t: -12, nu: 165, nf: 172, fu: 165, ff: 172, nt: 80, ns: 8, ft: 80, fs: 8 }, { k: 0.45, t: 28, nu: 70, nf: 150, fu: 70, ff: 150, nt: 112, ns: -28, ft: 112, fs: -28 }, { k: 0.6 },
        { k: 1, t: -12, nu: 165, nf: 172, fu: 165, ff: 172, nt: 80, ns: 8, ft: 80, fs: 8 }]
    },

    // ===== CON MANCUERNAS =====
    sentadilla_goblet: {
      nombre: 'Sentadilla con mancuerna', grupo: 'Piernas', musculos: 'Cuádriceps, glúteos, core', met: 6, impacto: 'bajo', nivel: 1, evitar: [], equipo: 'mancuernas',
      tips: ['Sostén la mancuerna pegada al pecho', 'Baja hasta que los muslos queden paralelos', 'Codos por dentro de las rodillas'],
      reps: '12', vista: 'lado', dur: 3, pie: 'flat', props: ['mancuernas'], ik: { nL: [150, 195, -1], fL: [146, 195, -1] },
      kf: [{ k: 0, nu: 22, nf: 168, fu: 22, ff: 168 }, { k: 0.45, hx: 128, hy: 158, t: 36, nu: 58, nf: 200, fu: 58, ff: 200 }, { k: 0.6 }, { k: 1, hx: 150, hy: 115, t: 0, nu: 22, nf: 168, fu: 22, ff: 168 }]
    },
    peso_muerto: {
      nombre: 'Peso muerto rumano', grupo: 'Piernas', musculos: 'Isquiotibiales, glúteos, espalda baja', met: 5, impacto: 'bajo', nivel: 1, evitar: ['espalda'], equipo: 'mancuernas',
      tips: ['Rodillas ligeramente flexionadas', 'Lleva la cadera hacia atrás con la espalda recta', 'Baja las pesas pegadas a las piernas'],
      reps: '12', vista: 'lado', dur: 3, pie: 'flat', props: ['mancuernas'], ik: { nL: [150, 195, -1], fL: [146, 195, -1] },
      kf: [{ k: 0, hx: 150, hy: 116, t: 0, nu: 2, nf: 2, fu: 2, ff: 2 }, { k: 0.45, hx: 132, hy: 122, t: 68, nu: -2, nf: -2, fu: -2, ff: -2 }, { k: 0.6 }, { k: 1, hx: 150, hy: 116, t: 0, nu: 2, nf: 2, fu: 2, ff: 2 }]
    },
    press_pecho: {
      nombre: 'Press de pecho en piso', grupo: 'Pecho y brazos', musculos: 'Pecho, tríceps, hombros', met: 4.5, impacto: 'bajo', nivel: 1, evitar: ['hombro'], equipo: 'mancuernas',
      tips: ['Acostado, rodillas flexionadas', 'Baja hasta que los codos toquen el piso', 'Empuja las pesas hacia arriba sin chocarlas'],
      reps: '12', vista: 'lado', dur: 2.6, pie: 'flat', props: ['mat', 'mancuernas'], ik: { nL: [196, 195, -1], fL: [192, 194, -1] },
      kf: [{ k: 0, hx: 150, hy: 187, t: -90, nu: 92, nf: 180, fu: 92, ff: 180 }, { k: 0.45, nu: 178, nf: 178, fu: 178, ff: 178 }, { k: 0.6 }, { k: 1, nu: 92, nf: 180, fu: 92, ff: 180 }]
    },
    curl_biceps: {
      nombre: 'Curl de bíceps', grupo: 'Brazos', musculos: 'Bíceps, antebrazos', met: 3.5, impacto: 'bajo', nivel: 1, evitar: [], equipo: 'mancuernas',
      tips: ['Codos pegados al cuerpo', 'Sube las pesas sin balancear la espalda', 'Baja lento en 2 segundos'],
      reps: '12', vista: 'lado', dur: 2.4, pie: 'flat', props: ['mancuernas'], ik: { nL: [150, 195, -1], fL: [146, 195, -1] },
      kf: [{ k: 0, nu: 2, nf: 4, fu: 2, ff: 4 }, { k: 0.45, nf: 148, ff: 148 }, { k: 0.6 }, { k: 1, nf: 4, ff: 4 }]
    },
    ext_triceps: {
      nombre: 'Extensión de tríceps', grupo: 'Brazos', musculos: 'Tríceps', met: 3.5, impacto: 'bajo', nivel: 1, evitar: ['hombro'], equipo: 'mancuernas',
      tips: ['Sostén una mancuerna con las dos manos sobre la cabeza', 'Baja detrás de la cabeza doblando solo los codos', 'Codos apuntando al frente'],
      reps: '12', vb: '30 -12 240 222', vista: 'lado', dur: 2.6, pie: 'flat', props: ['mancuernas'], ik: { nL: [150, 195, -1], fL: [146, 195, -1] },
      kf: [{ k: 0, nu: 172, nf: 176, fu: 172, ff: 176 }, { k: 0.45, nf: 330, ff: 330 }, { k: 0.6 }, { k: 1, nf: 176, ff: 176 }]
    },
    laterales: {
      nombre: 'Elevaciones laterales', grupo: 'Hombros', musculos: 'Hombros', met: 3.5, impacto: 'bajo', nivel: 1, evitar: ['hombro'], equipo: 'mancuernas',
      tips: ['Brazos casi estirados', 'Sube hasta la altura de los hombros', 'Baja lento, sin columpiarte'],
      reps: '12', vista: 'frente', dur: 2.4, props: ['mancuernas'],
      kf: [{ k: 0, nu: 8, nf: 12, fu: 8, ff: 12, nt: 4, ns: 4, ft: 4, fs: 4 }, { k: 0.45, nu: 86, nf: 92, fu: 86, ff: 92 }, { k: 0.6 }, { k: 1, nu: 8, nf: 12, fu: 8, ff: 12 }]
    },
    zancada_mancuernas: {
      nombre: 'Zancada con mancuernas', grupo: 'Piernas', musculos: 'Cuádriceps, glúteos', met: 6, impacto: 'bajo', nivel: 1, evitar: ['rodilla'], equipo: 'mancuernas',
      tips: ['Pesas a los lados del cuerpo', 'Baja la rodilla de atrás casi al piso', 'Cambia de pierna a la mitad'],
      reps: '10 por pierna', vista: 'lado', dur: 3, pieN: 'flat', pieF: 'rel', props: ['mancuernas'], ik: { nL: [182, 195, -1], fL: [110, 192, -1] },
      kf: [{ k: 0, hx: 148, hy: 121, t: 4, nu: 2, nf: 2, fu: 2, ff: 2 }, { k: 0.45, hx: 146, hy: 158 }, { k: 0.6 }, { k: 1, hx: 148, hy: 121 }]
    },

    // ===== MÁS PESO CORPORAL =====
    bicicleta_abdominal: {
      nombre: 'Bicicleta abdominal', grupo: 'Core', musculos: 'Abdomen, oblicuos', met: 4, impacto: 'bajo', nivel: 1, evitar: [],
      tips: ['Hombros despegados del piso', 'Lleva una rodilla al pecho y estira la otra', 'Alterna sin prisa, abdomen apretado'],
      reps: '20 por lado', vista: 'lado', dur: 1.6, pie: 'rel', props: ['mat'],
      kf: [{ k: 0, hx: 150, hy: 187, t: -68, hd: 10, nu: 108, nf: 108, fu: 108, ff: 108, nt: 200, ns: 110, ft: 102, fs: 100 }, { k: 0.5, nt: 102, ns: 100, ft: 200, fs: 110 }, { k: 1, nt: 200, ns: 110, ft: 102, fs: 100 }]
    },
    elevacion_piernas: {
      nombre: 'Elevación de piernas', grupo: 'Core', musculos: 'Abdomen bajo', met: 3.8, impacto: 'bajo', nivel: 1, evitar: ['espalda'],
      tips: ['Acostado, manos a los lados', 'Sube las piernas estiradas hasta vertical', 'Baja lento sin arquear la espalda'],
      reps: '12', vista: 'lado', dur: 3, pie: 'rel', props: ['mat'],
      kf: [{ k: 0, hx: 150, hy: 187, t: -90, nu: 90, nf: 90, fu: 90, ff: 90, nt: 94, ns: 94, ft: 94, fs: 94 }, { k: 0.45, nt: 178, ns: 178, ft: 178, fs: 178 }, { k: 0.6 }, { k: 1, nt: 94, ns: 94, ft: 94, fs: 94 }]
    },
    sentadilla_pared: {
      nombre: 'Sentadilla en pared', grupo: 'Piernas', musculos: 'Cuádriceps, glúteos', met: 3.5, impacto: 'bajo', nivel: 1, evitar: ['rodilla'],
      tips: ['Espalda pegada a la pared', 'Muslos paralelos al piso', 'Sostén respirando normal'],
      reps: 'Sostener', vista: 'lado', dur: 3, pie: 'flat', props: ['pared'],
      kf: [{ k: 0, hx: 128, hy: 155, t: 0, nu: 25, nf: 70, fu: 25, ff: 70, nt: 90, ns: 0, ft: 90, fs: 0 }, { k: 0.5, hy: 156 }, { k: 1, hy: 155 }]
    },
    patada_gluteo: {
      nombre: 'Patada de glúteo', grupo: 'Glúteos', musculos: 'Glúteos, isquiotibiales', met: 3.5, impacto: 'bajo', nivel: 1, evitar: [],
      tips: ['En cuatro puntos: manos bajo hombros, rodillas bajo cadera', 'Sube el pie hacia el techo con la rodilla doblada', 'Cambia de pierna a la mitad'],
      reps: '15 por pierna', vista: 'lado', dur: 2.4, pie: 'rel', props: ['mat'], ik: { nA: [180, 196, 1], fA: [176, 195, 1] },
      kf: [{ k: 0, hx: 130, hy: 148, t: 85, nt: 0, ns: -90, ft: 0, fs: -90 }, { k: 0.45, nt: -100, ns: -185 }, { k: 0.6 }, { k: 1, nt: 0, ns: -90 }]
    },
    boxeo: {
      nombre: 'Box de sombra', grupo: 'Cardio', musculos: 'Hombros, brazos, core', met: 7, impacto: 'bajo', nivel: 1, evitar: ['hombro'],
      tips: ['Guardia arriba, rodillas suaves', 'Lanza golpes rectos alternando', 'Gira un poco la cadera en cada golpe'],
      reps: '40 golpes', vista: 'lado', dur: 1.2, pie: 'flat', ik: { nL: [166, 195, -1], fL: [128, 195, -1] },
      kf: [{ k: 0, hx: 148, hy: 117, t: 5, nu: 86, nf: 88, fu: 20, ff: 160 }, { k: 0.25, hy: 114, nu: 20, nf: 160, fu: 20, ff: 160 }, { k: 0.5, hy: 117, nu: 20, nf: 160, fu: 86, ff: 88 },
        { k: 0.75, hy: 114, nu: 20, nf: 160, fu: 20, ff: 160 }, { k: 1, hy: 117, nu: 86, nf: 88, fu: 20, ff: 160 }]
    },
    sentadilla_sumo: {
      nombre: 'Sentadilla sumo', grupo: 'Piernas', musculos: 'Glúteos, aductores, cuádriceps', met: 5, impacto: 'bajo', nivel: 1, evitar: [],
      tips: ['Pies más abiertos que los hombros, puntas afuera', 'Baja con las rodillas hacia afuera', 'Torso derecho'],
      reps: '15', vista: 'frente', dur: 3,
      kf: [{ k: 0, hy: 121, nu: 18, nf: -140, fu: 18, ff: -140, nt: 22, ns: 22, ft: 22, fs: 22 }, { k: 0.45, hy: 137, nt: 62, ns: 12, ft: 62, fs: 12 }, { k: 0.6 }, { k: 1, hy: 121, nt: 22, ns: 22, ft: 22, fs: 22 }]
    }
  };

  // ---------- Generador de rutinas ----------
  const PLANTILLAS = {
    fuerzaA: [['sentadilla_goblet', 'sentadilla'], ['press_pecho', 'lagartija', 'lagartija_rodillas', 'plancha'], ['peso_muerto', 'zancada', 'puente'], ['zancada_mancuernas', 'sentadilla_sumo', 'puente', 'talones'],
      ['press_hombro', 'fondos_silla', 'superman', 'talones'], ['plancha', 'crunch', 'elevacion_piernas']],
    fuerzaB: [['remo', 'superman', 'patada_gluteo'], ['peso_muerto', 'zancada', 'sentadilla'], ['curl_biceps', 'fondos_silla', 'lagartija_rodillas'], ['ext_triceps', 'fondos_silla', 'talones'],
      ['laterales', 'superman', 'puente'], ['bicicleta_abdominal', 'crunch', 'plancha'], ['escaladores', 'marcha']],
    pierna: [['sentadilla_goblet', 'sentadilla'], ['peso_muerto', 'puente'], ['zancada_mancuernas', 'zancada', 'sentadilla_sumo'], ['sentadilla_sumo', 'patada_gluteo'], ['patada_gluteo', 'puente'],
      ['sentadilla_pared', 'talones'], ['talones', 'marcha']],
    superior: [['press_pecho', 'lagartija', 'lagartija_rodillas'], ['remo', 'superman'], ['press_hombro', 'fondos_silla', 'lagartija_rodillas'], ['curl_biceps', 'plancha'], ['ext_triceps', 'fondos_silla'],
      ['laterales', 'boxeo'], ['plancha', 'superman']],
    cardio: [['jumping_jacks', 'step_jacks'], ['boxeo', 'marcha'], ['rodillas_arriba', 'marcha'], ['sentadilla_salto', 'sentadilla_sumo', 'sentadilla'], ['escaladores', 'step_jacks'],
      ['bicicleta_abdominal', 'plancha'], ['jumping_jacks', 'talones']],
    core: [['plancha'], ['bicicleta_abdominal', 'crunch'], ['elevacion_piernas', 'puente'], ['superman', 'patada_gluteo', 'talones'], ['escaladores', 'marcha'], ['sentadilla_pared', 'crunch'], ['crunch', 'plancha']]
  };
  const TIEMPOS = { 1: [30, 30], 2: [40, 20], 3: [45, 15] };
  const MAQUINAS = {
    caminadora: { ej: 'maq_caminadora', nombre: 'Caminadora', emoji: '🏃', met: 5,
      suave: 'Camina 4.5–5 km/h, inclinación 1–2%', mod: ['Camina 5–5.5 km/h, inclinación 5–8%', 'Camina 5.5–6 km/h, inclinación 8–12%', 'Camina 6 km/h, inclinación 12–15%'],
      fuerte: ['Camina 5.5 km/h, inclinación 10–12%', 'Trota 7.5–8.5 km/h, sin inclinación', 'Corre 9–11 km/h'] },
    bicicleta: { ej: 'maq_bicicleta', nombre: 'Bicicleta estática', emoji: '🚴', met: 6.8,
      suave: 'Resistencia baja, 60–70 rpm', mod: ['Resistencia media-baja, 70–80 rpm', 'Resistencia media, 75–85 rpm', 'Resistencia media-alta, 80–90 rpm'],
      fuerte: ['Resistencia media, 85 rpm', 'Resistencia alta, 85–95 rpm', 'Resistencia alta, de pie, 90+ rpm'] },
    remadora: { ej: 'maq_remadora', nombre: 'Remadora', emoji: '🚣', met: 7,
      suave: '18–20 golpes por minuto, suave', mod: ['20–22 golpes/min, técnica limpia', '22–24 golpes/min, empuja con piernas', '24–26 golpes/min'],
      fuerte: ['24 golpes/min con fuerza', '26–30 golpes/min, máxima potencia', '30+ golpes/min, sprint'] },
    escaladora: { ej: 'maq_escaladora', nombre: 'Escaladora', emoji: '🪜', met: 8.8,
      suave: 'Nivel 2–3, ritmo cómodo', mod: ['Nivel 3–4', 'Nivel 5–6', 'Nivel 6–7'], fuerte: ['Nivel 5', 'Nivel 7–8, sin recargarte', 'Nivel 9+, sin recargarte'] },
    eliptica: { ej: 'maq_eliptica', nombre: 'Elíptica', emoji: '🌀', met: 5,
      suave: 'Resistencia 2–3, ritmo cómodo', mod: ['Resistencia 3–4, empuja y jala los brazos', 'Resistencia 4–6', 'Resistencia 6–8'], fuerte: ['Resistencia 5, ritmo rápido', 'Resistencia 7+, ritmo rápido', 'Resistencia 9+, sprint'] },
    bodycrunch: { ej: 'maq_bodycrunch', nombre: 'Body Crunch', emoji: '💥', met: 6, series: true,
      suave: 'Movimiento lento y controlado', mod: ['Ritmo constante, 15–20 repeticiones', 'Ritmo constante, 20–25 repeticiones', '25–30 repeticiones'], fuerte: ['Ritmo constante', 'Ritmo rápido', 'Máxima velocidad con buena técnica'] }
  };

  function permitido(id, cfg, usados) {
    const e = EJ[id];
    if (!e || usados.includes(id)) return false;
    if (e.nivel > cfg.nivel) return false;
    if (cfg.bajoImpacto && e.impacto === 'alto') return false;
    if (e.equipo === 'mancuernas' && !cfg.mancuernas) return false;
    if (e.equipo && MAQUINAS[e.equipo] && !cfg.maquinas.includes(e.equipo)) return false;
    if ((e.evitar || []).some(l => cfg.lesiones.includes(l))) return false;
    return true;
  }

  function equiposDe(q) {
    const eq = ((q && q.equipos) || []).slice();
    if (q && (q.equipo === 'mancuernas' || q.equipo === 'gimnasio') && !eq.includes('mancuernas')) eq.push('mancuernas');
    return eq;
  }
  function config(q) {
    const lesiones = (q && q.lesiones) || [];
    const est = (q && +q.estatura) || 165, peso = (q && +q.peso) || 70;
    const imc = peso / Math.pow(est / 100, 2), eq = equiposDe(q);
    return {
      nivel: { principiante: 1, intermedio: 2, avanzado: 3 }[q && q.nivel] || 1,
      minutos: +((q && q.minutos) || 30), lesiones, equipos: eq,
      mancuernas: eq.includes('mancuernas'),
      maquinas: eq.filter(x => MAQUINAS[x]),
      bajoImpacto: !!(q && q.bajoImpacto) || lesiones.includes('rodilla') || imc >= 35,
      peso
    };
  }

  /** Bloque de cardio en máquina(s). opts = { maquinas:[...], minutos, modo:'una'|'combinar' } */
  function pasosMaquina(add, cfg, opts) {
    let maqs = ((opts && opts.maquinas) || []).filter(m => MAQUINAS[m]);
    if (!maqs.length) maqs = cfg.maquinas.slice(0, 1);
    if (!maqs.length) return false;
    if (opts && opts.modo === 'una') maqs = maqs.slice(0, 1);
    maqs = maqs.slice(0, 4);
    const total = Math.max(10, +((opts && opts.minutos) || cfg.minutos)) * 60;
    const nv = cfg.nivel - 1;
    const calent = Math.min(300, Math.round(total * 0.15 / 60) * 60), enfr = 180;
    const principal = total - calent - enfr - 80;
    const porMaq = Math.max(240, Math.floor(principal / maqs.length / 60) * 60);
    const M0 = MAQUINAS[maqs[0]];
    add(M0.ej, calent, 'Calentamiento', { nota: M0.suave, met: M0.met * 0.7, maquina: maqs[0] });
    maqs.forEach((m, mi) => {
      const M = MAQUINAS[m];
      if (M.series) {
        const rondas = Math.max(3, Math.round(porMaq / 60));
        for (let r = 1; r <= rondas; r++) {
          add(M.ej, 45, M.nombre, { nota: M.mod[nv], met: M.met, ronda: r, rondas, maquina: m });
          add(null, 15, 'Descanso', { ronda: r, rondas });
        }
        return;
      }
      if (cfg.nivel === 1) { add(M.ej, porMaq, M.nombre, { nota: M.mod[nv], met: M.met, maquina: m }); return; }
      // Intervalos: intermedio 2' moderado + 1' fuerte; avanzado 1' fuerte + 1' suave
      const ciclo = cfg.nivel === 2 ? [[120, 'mod'], [60, 'fuerte']] : [[60, 'fuerte'], [60, 'mod']];
      const largo = ciclo[0][0] + ciclo[1][0], rondas = Math.max(2, Math.floor(porMaq / largo));
      const resto = porMaq - rondas * largo;
      if (resto >= 60) add(M.ej, resto, M.nombre, { nota: M.mod[nv], met: M.met, maquina: m });
      for (let r = 1; r <= rondas; r++) ciclo.forEach(([seg, tipo]) => add(M.ej, seg, M.nombre + (tipo === 'fuerte' ? ' · ¡fuerte!' : ' · moderado'),
        { nota: tipo === 'fuerte' ? M.fuerte[nv] : M.mod[nv], met: M.met * (tipo === 'fuerte' ? 1.3 : 1), ronda: r, rondas, maquina: m, intenso: tipo === 'fuerte' }));
    });
    const Mu = MAQUINAS[maqs[maqs.length - 1]];
    add(Mu.ej, enfr, 'Enfriamiento', { nota: Mu.suave, met: Mu.met * 0.6, maquina: maqs[maqs.length - 1] });
    return maqs;
  }

  function armarSesion(tipo, q, opts) {
    const cfg = config(q);
    opts = opts || {};
    if (opts.minutos) cfg.minutos = +opts.minutos;
    const pasos = [];
    const add = (ej, seg, fase, extra) => pasos.push(Object.assign({ ej, seg, fase }, extra || {}));
    let usadas = null;
    if (tipo === 'maquina') {
      usadas = pasosMaquina(add, cfg, { maquinas: opts.maquinas || (q && q.maquinasCardio) || cfg.maquinas, minutos: cfg.minutos, modo: opts.modo || (q && q.cardioModo) || 'combinar' });
      if (!usadas) tipo = 'cardio';
      else { add('est_cuadriceps', 40, 'Enfriamiento'); add('est_isquios', 40, 'Enfriamiento'); }
    }
    if (tipo === 'activo' || tipo === 'descanso') {
      const min = opts.minutos ? +opts.minutos : tipo === 'descanso' ? 20 : Math.max(30, cfg.minutos);
      const enCaminadora = cfg.maquinas.includes('caminadora') && (opts.lugar !== 'calle');
      add(enCaminadora ? 'maq_caminadora' : 'caminar', min * 60, enCaminadora ? 'Caminadora' : 'Caminata',
        enCaminadora ? { nota: MAQUINAS.caminadora.mod[Math.max(0, cfg.nivel - 2)], maquina: 'caminadora' } : { nota: 'Paso rápido, como si fueras tarde' });
      add('est_cuadriceps', 40, 'Enfriamiento'); add('est_isquios', 40, 'Enfriamiento');
    } else if (tipo !== 'maquina') {
      add('marcha', 45, 'Calentamiento'); add('circulos_brazos', 30, 'Calentamiento');
      add(!cfg.bajoImpacto && cfg.nivel >= 2 ? 'jumping_jacks' : 'step_jacks', 30, 'Calentamiento');
      let [w, r] = TIEMPOS[cfg.nivel];
      if (opts.trabajo) w = +opts.trabajo;
      if (opts.descanso !== undefined) r = +opts.descanso;
      const n = cfg.minutos <= 20 ? 4 : cfg.minutos < 45 ? 5 : 6;
      let usados = [];
      if (tipo === 'libre') usados = (opts.ejercicios || []).filter(id => EJ[id]);
      else {
        (PLANTILLAS[tipo] || PLANTILLAS.fuerzaA).forEach(op => {
          if (usados.length >= n) return;
          const id = op.find(x => permitido(x, cfg, usados));
          if (id) usados.push(id);
        });
        ['sentadilla', 'puente', 'plancha', 'talones', 'marcha', 'crunch'].forEach(x => { if (usados.length < n && permitido(x, cfg, usados)) usados.push(x); });
      }
      if (!usados.length) usados = ['sentadilla', 'plancha', 'marcha'];
      const calent = 105, enfr = 80, entreRondas = 60;
      const porRonda = usados.length * (w + r) + entreRondas;
      const rondas = opts.rondas ? +opts.rondas : Math.max(2, Math.min(6, Math.ceil((cfg.minutos * 60 - calent - enfr) / porRonda - 0.3)));
      for (let ro = 1; ro <= rondas; ro++) {
        usados.forEach((id, i) => {
          const e = EJ[id], maq = e.equipo && MAQUINAS[e.equipo];
          add(id, maq ? Math.max(w, 60) : w, 'Circuito', { ronda: ro, rondas, nota: maq ? MAQUINAS[e.equipo].mod[cfg.nivel - 1] : null });
          const ultimo = i === usados.length - 1;
          if (!(ultimo && ro === rondas) && (r > 0 || ultimo)) add(null, ultimo ? entreRondas : r, ultimo ? 'Descanso entre rondas' : 'Descanso', { ronda: ro, rondas });
        });
      }
      add('est_cuadriceps', 40, 'Enfriamiento'); add('est_isquios', 40, 'Enfriamiento');
    }
    const seg = pasos.reduce((s, p) => s + p.seg, 0);
    const kcal = Math.round(pasos.reduce((s, p) => s + (p.met || (p.ej ? EJ[p.ej].met : 2)) * cfg.peso * p.seg / 3600, 0));
    const ejercicios = [...new Set(pasos.filter(p => p.ej && p.fase !== 'Enfriamiento' && (p.fase !== 'Calentamiento' || p.maquina)).map(p => p.ej))];
    const bloques = {};
    pasos.forEach(p => { if (p.maquina) bloques[p.maquina] = (bloques[p.maquina] || 0) + p.seg; });
    const nombre = opts.nombre || (tipo === 'maquina' && usadas ? 'Cardio en ' + usadas.map(m => MAQUINAS[m].nombre.toLowerCase()).join(' + ') : (window.NOMBRE_SESION || {})[tipo] || tipo);
    return { tipo, nombre, pasos, minutos: Math.round(seg / 60), kcal, ejercicios, cfg, bloques };
  }

  window.FF_EJ = EJ;
  window.FFAnim = { montar, svgAnim, vista, poseEn, construir, dibujar, armarSesion, EJ, MAQUINAS, PLANTILLAS, equiposDe };
})();

/* =========================================================
   FAMILIA FIT — Plan alimenticio (platillos mexicanos)
   Valores por porción base: k = kcal, p = proteína, c = carbohidratos, g = grasa (gramos)
   ========================================================= */
(function () {
  const PL = [
    // ---------- DESAYUNOS ----------
    { id: 'huevos_mex', n: 'Huevos a la mexicana con frijoles', e: '🍳', s: 'desayuno', k: 430, p: 23, c: 48, g: 17, t: ['huevo'],
      ing: [[2, 'pza', 'Huevo', 'Proteína'], [0.5, 'pza', 'Jitomate', 'Verduras'], [0.25, 'pza', 'Cebolla', 'Verduras'], [1, 'pza', 'Chile serrano', 'Verduras'], [2, 'pza', 'Tortilla de maíz', 'Cereales y tortillas'], [0.5, 'taza', 'Frijoles de olla', 'Leguminosas'], [1, 'cdita', 'Aceite', 'Despensa']],
      prep: 'Sofríe jitomate, cebolla y chile picados con el aceite, agrega los huevos y revuelve. Sirve con frijoles y tortillas.' },
    { id: 'avena_platano', n: 'Avena con plátano y crema de cacahuate', e: '🥣', s: 'desayuno', k: 390, p: 18, c: 55, g: 11, t: ['lacteo'],
      ing: [[0.5, 'taza', 'Avena', 'Cereales y tortillas'], [1, 'taza', 'Leche descremada', 'Lácteos'], [0.5, 'pza', 'Plátano', 'Frutas'], [1, 'cda', 'Crema de cacahuate', 'Despensa'], [1, 'pizca', 'Canela', 'Despensa']],
      prep: 'Cuece la avena en la leche 5 minutos con canela. Sirve con plátano en rodajas y la crema de cacahuate.' },
    { id: 'omelette_claras', n: 'Omelette de claras con espinaca y panela', e: '🥚', s: 'desayuno', k: 385, p: 31, c: 26, g: 16, t: ['huevo', 'lacteo'],
      ing: [[4, 'pza', 'Clara de huevo', 'Proteína'], [1, 'pza', 'Huevo', 'Proteína'], [1, 'taza', 'Espinaca', 'Verduras'], [40, 'g', 'Queso panela', 'Lácteos'], [2, 'pza', 'Tortilla de maíz', 'Cereales y tortillas'], [1, 'cdita', 'Aceite', 'Despensa']],
      prep: 'Bate claras y huevo, vierte en sartén con aceite, agrega espinaca y panela en cubos, dobla. Acompaña con tortillas.' },
    { id: 'molletes', n: 'Molletes integrales con pico de gallo', e: '🥖', s: 'desayuno', k: 360, p: 20, c: 48, g: 10, t: ['lacteo'],
      ing: [[2, 'reb', 'Pan integral', 'Cereales y tortillas'], [0.5, 'taza', 'Frijoles refritos (sin manteca)', 'Leguminosas'], [30, 'g', 'Queso Oaxaca', 'Lácteos'], [0.5, 'taza', 'Pico de gallo', 'Verduras']],
      prep: 'Unta frijoles en el pan, agrega queso y gratina 5 min. Sirve con pico de gallo.' },
    { id: 'licuado', n: 'Licuado de plátano con yogur griego', e: '🥤', s: 'desayuno', k: 325, p: 27, c: 52, g: 1, t: ['lacteo'],
      ing: [[1, 'taza', 'Leche descremada', 'Lácteos'], [150, 'g', 'Yogur griego natural', 'Lácteos'], [1, 'pza', 'Plátano', 'Frutas'], [2, 'cda', 'Avena', 'Cereales y tortillas']],
      prep: 'Licúa todo con hielo. Ideal si sales de prisa.' },
    { id: 'chilaquiles', n: 'Chilaquiles verdes horneados con pollo', e: '🫑', s: 'desayuno', k: 400, p: 33, c: 42, g: 11, t: ['carne', 'lacteo'],
      ing: [[3, 'pza', 'Tortilla de maíz', 'Cereales y tortillas'], [0.5, 'taza', 'Salsa verde', 'Verduras'], [80, 'g', 'Pechuga de pollo', 'Proteína'], [20, 'g', 'Queso fresco', 'Lácteos'], [1, 'cda', 'Crema ligera', 'Lácteos']],
      prep: 'Corta y hornea las tortillas hasta dorar. Báñalas en salsa caliente y sirve con pollo deshebrado, queso y crema.' },
    { id: 'hotcakes_avena', n: 'Hot cakes de avena y plátano', e: '🥞', s: 'desayuno', k: 350, p: 21, c: 49, g: 8, t: ['huevo', 'lacteo'],
      ing: [[1, 'pza', 'Huevo', 'Proteína'], [0.5, 'taza', 'Avena', 'Cereales y tortillas'], [0.5, 'pza', 'Plátano', 'Frutas'], [100, 'g', 'Yogur griego natural', 'Lácteos'], [1, 'cdita', 'Miel', 'Despensa']],
      prep: 'Licúa huevo, avena y plátano. Cocina en sartén antiadherente. Sirve con yogur y un hilo de miel.' },
    { id: 'yogur_fruta', n: 'Yogur griego con papaya, granola y chía', e: '🍓', s: 'desayuno', k: 330, p: 25, c: 42, g: 7, t: ['lacteo'],
      ing: [[200, 'g', 'Yogur griego natural', 'Lácteos'], [1, 'taza', 'Papaya', 'Frutas'], [3, 'cda', 'Granola', 'Cereales y tortillas'], [1, 'cda', 'Chía', 'Despensa']],
      prep: 'Sirve el yogur con la fruta picada, granola y chía.' },
    { id: 'tacos_huevo_nopal', n: 'Tacos de huevo con nopales', e: '🌮', s: 'desayuno', k: 395, p: 19, c: 43, g: 17, t: ['huevo'],
      ing: [[2, 'pza', 'Huevo', 'Proteína'], [1, 'taza', 'Nopales', 'Verduras'], [3, 'pza', 'Tortilla de maíz', 'Cereales y tortillas'], [2, 'cda', 'Salsa roja', 'Verduras'], [1, 'cdita', 'Aceite', 'Despensa']],
      prep: 'Asa los nopales en tiras, agrega los huevos y revuelve. Arma tus tacos con salsa.' },
    { id: 'sandwich_pavo', n: 'Sándwich integral de pavo y aguacate', e: '🥪', s: 'desayuno', k: 330, p: 23, c: 31, g: 12, t: ['carne', 'lacteo'],
      ing: [[2, 'reb', 'Pan integral', 'Cereales y tortillas'], [60, 'g', 'Pechuga de pavo', 'Proteína'], [30, 'g', 'Queso panela', 'Lácteos'], [0.25, 'pza', 'Aguacate', 'Verduras'], [0.5, 'pza', 'Jitomate', 'Verduras']],
      prep: 'Arma el sándwich con pavo, panela, aguacate, jitomate y lechuga.' },

    // ---------- COLACIONES ----------
    { id: 'manzana_almendras', n: 'Manzana con 10 almendras', e: '🍎', s: 'colacion', k: 165, p: 3, c: 27, g: 6, t: [],
      ing: [[1, 'pza', 'Manzana', 'Frutas'], [10, 'pza', 'Almendras', 'Despensa']], prep: 'Lista para llevar.' },
    { id: 'yogur_fresas', n: 'Yogur griego con fresas', e: '🍓', s: 'colacion', k: 115, p: 15, c: 12, g: 0, t: ['lacteo'],
      ing: [[150, 'g', 'Yogur griego natural', 'Lácteos'], [0.5, 'taza', 'Fresas', 'Frutas']], prep: 'Mezcla y listo.' },
    { id: 'verduras_chile', n: 'Jícama, pepino y zanahoria con limón y chile', e: '🥒', s: 'colacion', k: 90, p: 2, c: 20, g: 0, t: [],
      ing: [[1, 'taza', 'Jícama', 'Verduras'], [0.5, 'pza', 'Pepino', 'Verduras'], [1, 'pza', 'Zanahoria', 'Verduras'], [1, 'pza', 'Limón', 'Frutas']], prep: 'Corta en bastones, agrega limón y chile en polvo.' },
    { id: 'panela_pepino', n: 'Queso panela con pepino', e: '🧀', s: 'colacion', k: 130, p: 11, c: 3, g: 8, t: ['lacteo'],
      ing: [[60, 'g', 'Queso panela', 'Lácteos'], [0.5, 'pza', 'Pepino', 'Verduras']], prep: 'Corta en cubos.' },
    { id: 'huevos_duros', n: '2 huevos duros', e: '🥚', s: 'colacion', k: 140, p: 12, c: 1, g: 10, t: ['huevo'],
      ing: [[2, 'pza', 'Huevo', 'Proteína']], prep: 'Cuécelos 10 minutos; puedes dejar varios listos para la semana.' },
    { id: 'platano_cacahuate', n: 'Plátano con crema de cacahuate', e: '🍌', s: 'colacion', k: 200, p: 5, c: 30, g: 8, t: [],
      ing: [[1, 'pza', 'Plátano', 'Frutas'], [1, 'cda', 'Crema de cacahuate', 'Despensa']], prep: 'Ideal antes de entrenar.' },
    { id: 'atun_galletas', n: 'Atún con galletas habaneras', e: '🐟', s: 'colacion', k: 140, p: 15, c: 12, g: 3, t: ['pescado'],
      ing: [[0.5, 'lata', 'Atún en agua', 'Proteína'], [4, 'pza', 'Galletas habaneras', 'Cereales y tortillas'], [1, 'pza', 'Limón', 'Frutas']], prep: 'Atún con limón, sal y pimienta sobre las galletas.' },
    { id: 'palomitas', n: 'Palomitas naturales', e: '🍿', s: 'colacion', k: 95, p: 3, c: 19, g: 1, t: [],
      ing: [[3, 'taza', 'Palomitas naturales', 'Despensa']], prep: 'De maíz natural, con limón y chile.' },
    { id: 'papaya_chia', n: 'Papaya con chía y limón', e: '🧡', s: 'colacion', k: 110, p: 2, c: 22, g: 2, t: [],
      ing: [[1.5, 'taza', 'Papaya', 'Frutas'], [1, 'cdita', 'Chía', 'Despensa']], prep: 'Pica la papaya y espolvorea chía.' },

    // ---------- COMIDAS ----------
    { id: 'pechuga_arroz', n: 'Pechuga a la plancha con arroz y frijoles', e: '🍗', s: 'comida', k: 515, p: 56, c: 48, g: 11, t: ['carne'],
      ing: [[150, 'g', 'Pechuga de pollo', 'Proteína'], [0.5, 'taza', 'Arroz cocido', 'Cereales y tortillas'], [0.5, 'taza', 'Frijoles de olla', 'Leguminosas'], [2, 'taza', 'Ensalada verde', 'Verduras'], [1, 'cdita', 'Aceite', 'Despensa']],
      prep: 'Sazona la pechuga y ásala 5–6 min por lado. Sirve con arroz, frijoles y ensalada con limón.' },
    { id: 'caldo_pollo', n: 'Caldo de pollo con verduras', e: '🍲', s: 'comida', k: 520, p: 53, c: 60, g: 7, t: ['carne'],
      ing: [[150, 'g', 'Pechuga de pollo', 'Proteína'], [1, 'pza', 'Calabacita', 'Verduras'], [1, 'pza', 'Zanahoria', 'Verduras'], [0.5, 'pza', 'Chayote', 'Verduras'], [1, 'pza', 'Papa chica', 'Verduras'], [0.25, 'taza', 'Arroz cocido', 'Cereales y tortillas'], [2, 'pza', 'Tortilla de maíz', 'Cereales y tortillas']],
      prep: 'Cuece el pollo con ajo y cebolla 20 min, agrega verduras 10 min más. Sirve con arroz, limón y chile.' },
    { id: 'pescado_empapelado', n: 'Pescado empapelado con verduras', e: '🐟', s: 'comida', k: 370, p: 42, c: 34, g: 7, t: ['pescado'],
      ing: [[180, 'g', 'Filete de pescado (robalo o mojarra)', 'Proteína'], [1, 'taza', 'Verduras mixtas', 'Verduras'], [0.5, 'taza', 'Arroz cocido', 'Cereales y tortillas'], [1, 'cdita', 'Aceite', 'Despensa'], [1, 'pza', 'Limón', 'Frutas']],
      prep: 'Envuelve el filete con verduras, limón y especias en papel aluminio. Hornea 20 min a 200 °C.' },
    { id: 'tinga_tostadas', n: 'Tinga de pollo en tostadas horneadas', e: '🌶️', s: 'comida', k: 470, p: 40, c: 41, g: 14, t: ['carne', 'lacteo'],
      ing: [[120, 'g', 'Pechuga de pollo', 'Proteína'], [1, 'pza', 'Jitomate', 'Verduras'], [0.5, 'pza', 'Cebolla', 'Verduras'], [1, 'pza', 'Chile chipotle', 'Despensa'], [3, 'pza', 'Tostada horneada', 'Cereales y tortillas'], [0.25, 'pza', 'Aguacate', 'Verduras'], [1, 'cda', 'Crema ligera', 'Lácteos']],
      prep: 'Licúa jitomate con chipotle, guisa con cebolla y agrega el pollo deshebrado. Sirve sobre tostadas con lechuga y aguacate.' },
    { id: 'bistec_mex', n: 'Bistec a la mexicana con frijoles', e: '🥩', s: 'comida', k: 510, p: 45, c: 50, g: 15, t: ['carne'],
      ing: [[130, 'g', 'Bistec de res magro', 'Proteína'], [1, 'pza', 'Jitomate', 'Verduras'], [0.5, 'pza', 'Cebolla', 'Verduras'], [1, 'pza', 'Chile serrano', 'Verduras'], [0.5, 'taza', 'Frijoles de olla', 'Leguminosas'], [2, 'pza', 'Tortilla de maíz', 'Cereales y tortillas'], [1, 'cdita', 'Aceite', 'Despensa']],
      prep: 'Corta el bistec en tiras, dóralo y agrega jitomate, cebolla y chile. Sirve con frijoles.' },
    { id: 'pozole_pollo', n: 'Pozole rojo de pollo', e: '🥣', s: 'comida', k: 390, p: 42, c: 41, g: 6, t: ['carne'],
      ing: [[120, 'g', 'Pechuga de pollo', 'Proteína'], [1, 'taza', 'Maíz pozolero', 'Cereales y tortillas'], [1, 'pza', 'Chile guajillo', 'Despensa'], [3, 'pza', 'Rábano', 'Verduras'], [1, 'taza', 'Lechuga', 'Verduras'], [1, 'pza', 'Tostada horneada', 'Cereales y tortillas']],
      prep: 'Cuece el pollo con el maíz; licúa los chiles y agrégalos al caldo. Sirve con lechuga, rábano, orégano y limón.' },
    { id: 'tacos_pescado', n: 'Tacos de pescado a la plancha', e: '🌮', s: 'comida', k: 450, p: 37, c: 44, g: 14, t: ['pescado'],
      ing: [[150, 'g', 'Filete de pescado', 'Proteína'], [3, 'pza', 'Tortilla de maíz', 'Cereales y tortillas'], [1, 'taza', 'Repollo', 'Verduras'], [0.5, 'taza', 'Pico de gallo', 'Verduras'], [0.25, 'pza', 'Aguacate', 'Verduras'], [1, 'cdita', 'Aceite', 'Despensa']],
      prep: 'Asa el pescado sazonado con limón y ajo. Arma los tacos con repollo, pico de gallo y aguacate.' },
    { id: 'albondigas', n: 'Albóndigas en caldillo de jitomate', e: '🍝', s: 'comida', k: 415, p: 33, c: 36, g: 15, t: ['carne'],
      ing: [[150, 'g', 'Carne molida de res 90/10', 'Proteína'], [2, 'pza', 'Jitomate', 'Verduras'], [1, 'taza', 'Calabacita y zanahoria', 'Verduras'], [0.5, 'taza', 'Arroz cocido', 'Cereales y tortillas']],
      prep: 'Forma albóndigas con la carne y hierbabuena; cuécelas en caldillo de jitomate con las verduras 20 min.' },
    { id: 'ensalada_atun', n: 'Ensalada grande de atún y garbanzo', e: '🥗', s: 'comida', k: 470, p: 37, c: 45, g: 16, t: ['pescado'],
      ing: [[1, 'lata', 'Atún en agua', 'Proteína'], [2, 'taza', 'Lechuga, pepino y jitomate', 'Verduras'], [0.5, 'taza', 'Garbanzo cocido', 'Leguminosas'], [0.25, 'pza', 'Aguacate', 'Verduras'], [4, 'pza', 'Galletas habaneras', 'Cereales y tortillas'], [1, 'cdita', 'Aceite de oliva', 'Despensa']],
      prep: 'Mezcla todo y adereza con limón, aceite de oliva, sal y pimienta.' },
    { id: 'lentejas', n: 'Lentejas con verduras y huevo', e: '🥘', s: 'comida', k: 515, p: 29, c: 72, g: 13, t: ['huevo'],
      ing: [[1, 'taza', 'Lentejas cocidas', 'Leguminosas'], [1, 'taza', 'Verduras (zanahoria, jitomate, cebolla)', 'Verduras'], [1, 'pza', 'Huevo', 'Proteína'], [2, 'pza', 'Tortilla de maíz', 'Cereales y tortillas'], [1, 'cdita', 'Aceite', 'Despensa']],
      prep: 'Guisa las verduras, agrega las lentejas con su caldo. Sirve con huevo duro picado.' },
    { id: 'enfrijoladas', n: 'Enfrijoladas de pollo', e: '🫘', s: 'comida', k: 500, p: 43, c: 57, g: 11, t: ['carne', 'lacteo'],
      ing: [[3, 'pza', 'Tortilla de maíz', 'Cereales y tortillas'], [0.5, 'taza', 'Frijol molido', 'Leguminosas'], [90, 'g', 'Pechuga de pollo', 'Proteína'], [20, 'g', 'Queso fresco', 'Lácteos'], [1, 'cda', 'Crema ligera', 'Lácteos'], [0.25, 'pza', 'Cebolla', 'Verduras']],
      prep: 'Calienta las tortillas, pásalas por el frijol caliente y rellénalas de pollo. Termina con queso, crema y cebolla.' },
    { id: 'chile_relleno', n: 'Chile relleno de panela (sin capear)', e: '🫑', s: 'comida', k: 370, p: 22, c: 41, g: 13, t: ['lacteo'],
      ing: [[2, 'pza', 'Chile poblano', 'Verduras'], [100, 'g', 'Queso panela', 'Lácteos'], [1, 'pza', 'Jitomate', 'Verduras'], [0.5, 'taza', 'Arroz cocido', 'Cereales y tortillas']],
      prep: 'Asa y pela los chiles, rellénalos de panela y hornea 10 min. Sirve con caldillo de jitomate y arroz.' },
    { id: 'fajitas_res', n: 'Fajitas de res con pimientos', e: '🫑', s: 'comida', k: 485, p: 42, c: 46, g: 15, t: ['carne'],
      ing: [[130, 'g', 'Bistec de res magro', 'Proteína'], [1, 'pza', 'Pimiento', 'Verduras'], [0.5, 'pza', 'Cebolla', 'Verduras'], [3, 'pza', 'Tortilla de maíz', 'Cereales y tortillas'], [1, 'cdita', 'Aceite', 'Despensa']],
      prep: 'Saltea la res en tiras con pimiento y cebolla a fuego alto. Sirve en tortillas con salsa.' },
    { id: 'cochinita', n: 'Tacos de cochinita magra con frijoles', e: '🌮', s: 'comida', k: 525, p: 42, c: 59, g: 14, t: ['carne', 'cerdo'],
      ing: [[120, 'g', 'Cochinita pibil (pierna magra)', 'Proteína'], [3, 'pza', 'Tortilla de maíz', 'Cereales y tortillas'], [0.25, 'pza', 'Cebolla morada', 'Verduras'], [0.5, 'taza', 'Frijoles de olla', 'Leguminosas']],
      prep: 'Sirve la cochinita sin el jugo graso, con cebolla morada en limón y habanero al gusto.' },
    { id: 'pollo_verde', n: 'Pollo en salsa verde con calabacitas', e: '🥬', s: 'comida', k: 430, p: 50, c: 34, g: 10, t: ['carne'],
      ing: [[150, 'g', 'Pechuga de pollo', 'Proteína'], [0.5, 'taza', 'Salsa verde', 'Verduras'], [1, 'pza', 'Calabacita', 'Verduras'], [0.5, 'taza', 'Arroz cocido', 'Cereales y tortillas'], [1, 'cdita', 'Aceite', 'Despensa']],
      prep: 'Dora el pollo en cubos, agrega calabacita y la salsa verde. Cocina 10 min y sirve con arroz.' },
    { id: 'tacos_frijol_nopal', n: 'Tacos de frijol, nopal y queso', e: '🌮', s: 'comida', k: 525, p: 27, c: 81, g: 11, t: ['lacteo'],
      ing: [[1, 'taza', 'Frijoles de olla', 'Leguminosas'], [1, 'taza', 'Nopales', 'Verduras'], [40, 'g', 'Queso fresco', 'Lácteos'], [3, 'pza', 'Tortilla de maíz', 'Cereales y tortillas']],
      prep: 'Asa los nopales, arma los tacos con frijoles, nopal, queso y salsa.' },

    { id: 'bowl_frijol', n: 'Bowl de frijol negro, arroz, elote y aguacate', e: '🥙', s: 'comida', k: 470, p: 19, c: 83, g: 7, t: [],
      ing: [[1, 'taza', 'Frijol negro cocido', 'Leguminosas'], [0.5, 'taza', 'Arroz cocido', 'Cereales y tortillas'], [0.5, 'taza', 'Elote', 'Verduras'], [0.25, 'pza', 'Aguacate', 'Verduras'], [0.5, 'taza', 'Pico de gallo', 'Verduras']],
      prep: 'Sirve en un tazón el arroz, frijol, elote y pico de gallo; corona con aguacate y limón.' },
    { id: 'calabacitas_elote', n: 'Calabacitas con elote, huevo y frijoles', e: '🌽', s: 'comida', k: 525, p: 26, c: 67, g: 18, t: ['huevo'],
      ing: [[2, 'pza', 'Calabacita', 'Verduras'], [0.5, 'taza', 'Elote', 'Verduras'], [2, 'pza', 'Huevo', 'Proteína'], [0.5, 'taza', 'Frijoles de olla', 'Leguminosas'], [2, 'pza', 'Tortilla de maíz', 'Cereales y tortillas'], [1, 'cdita', 'Aceite', 'Despensa']],
      prep: 'Guisa calabacita y elote con jitomate y cebolla; agrega los huevos. Sirve con frijoles.' },

    // ---------- CENAS ----------
    { id: 'tostadas_atun', n: 'Tostadas de atún con aguacate', e: '🐟', s: 'cena', k: 340, p: 29, c: 37, g: 8, t: ['pescado'],
      ing: [[1, 'lata', 'Atún en agua', 'Proteína'], [0.5, 'taza', 'Pico de gallo', 'Verduras'], [3, 'pza', 'Tostada horneada', 'Cereales y tortillas'], [0.25, 'pza', 'Aguacate', 'Verduras']],
      prep: 'Mezcla el atún con pico de gallo y limón; sirve sobre tostadas con aguacate.' },
    { id: 'quesadillas_panela', n: 'Quesadillas de panela con champiñones', e: '🧀', s: 'cena', k: 365, p: 21, c: 43, g: 12, t: ['lacteo'],
      ing: [[3, 'pza', 'Tortilla de maíz', 'Cereales y tortillas'], [80, 'g', 'Queso panela', 'Lácteos'], [1, 'taza', 'Champiñones', 'Verduras']],
      prep: 'Saltea los champiñones y arma quesadillas con panela en comal.' },
    { id: 'crema_calabaza', n: 'Crema de calabaza con pan y pavo', e: '🥣', s: 'cena', k: 270, p: 22, c: 34, g: 5, t: ['carne', 'lacteo'],
      ing: [[2, 'pza', 'Calabacita', 'Verduras'], [0.5, 'taza', 'Leche descremada', 'Lácteos'], [60, 'g', 'Pechuga de pavo', 'Proteína'], [1, 'reb', 'Pan integral', 'Cereales y tortillas']],
      prep: 'Cuece la calabaza, lícuala con leche y sazona. Acompaña con pan tostado y pavo.' },
    { id: 'ensalada_pollo', n: 'Ensalada de pollo con aguacate', e: '🥗', s: 'cena', k: 375, p: 34, c: 21, g: 17, t: ['carne'],
      ing: [[100, 'g', 'Pechuga de pollo', 'Proteína'], [2, 'taza', 'Lechuga y espinaca', 'Verduras'], [0.25, 'pza', 'Aguacate', 'Verduras'], [4, 'pza', 'Galletas habaneras', 'Cereales y tortillas'], [1, 'cdita', 'Aceite de oliva', 'Despensa']],
      prep: 'Pollo asado en tiras sobre las hojas, con aguacate y aderezo de limón.' },
    { id: 'huevos_ejotes', n: 'Huevos revueltos con ejotes', e: '🍳', s: 'cena', k: 340, p: 17, c: 31, g: 17, t: ['huevo'],
      ing: [[2, 'pza', 'Huevo', 'Proteína'], [1, 'taza', 'Ejotes', 'Verduras'], [2, 'pza', 'Tortilla de maíz', 'Cereales y tortillas'], [1, 'cdita', 'Aceite', 'Despensa']],
      prep: 'Cuece los ejotes picados, agrega los huevos y revuelve.' },
    { id: 'tacos_lechuga', n: 'Tacos de lechuga con carne molida', e: '🥬', s: 'cena', k: 355, p: 26, c: 20, g: 18, t: ['carne'],
      ing: [[120, 'g', 'Carne molida de res 90/10', 'Proteína'], [6, 'hoja', 'Lechuga orejona', 'Verduras'], [0.5, 'taza', 'Pico de gallo', 'Verduras'], [0.25, 'pza', 'Aguacate', 'Verduras'], [1, 'pza', 'Tortilla de maíz', 'Cereales y tortillas']],
      prep: 'Guisa la carne con ajo y cebolla. Sirve en hojas de lechuga con pico de gallo y aguacate.' },
    { id: 'pescado_veracruzana', n: 'Pescado a la veracruzana', e: '🐠', s: 'cena', k: 320, p: 35, c: 30, g: 6, t: ['pescado'],
      ing: [[150, 'g', 'Filete de pescado', 'Proteína'], [1, 'pza', 'Jitomate', 'Verduras'], [5, 'pza', 'Aceitunas', 'Despensa'], [0.5, 'taza', 'Arroz cocido', 'Cereales y tortillas']],
      prep: 'Cocina el filete en salsa de jitomate con aceitunas, alcaparras y chile güero 12 min.' },
    { id: 'sincronizadas', n: 'Sincronizadas integrales de pavo', e: '🫓', s: 'cena', k: 345, p: 20, c: 37, g: 13, t: ['carne', 'lacteo'],
      ing: [[2, 'pza', 'Tortilla de harina integral', 'Cereales y tortillas'], [40, 'g', 'Jamón de pavo', 'Proteína'], [30, 'g', 'Queso Oaxaca', 'Lácteos']],
      prep: 'Arma con jamón y queso, dora en comal. Acompaña con salsa.' },
    { id: 'calabacitas_rellenas', n: 'Calabacitas rellenas de pollo gratinadas', e: '🥒', s: 'cena', k: 310, p: 40, c: 11, g: 11, t: ['carne', 'lacteo'],
      ing: [[2, 'pza', 'Calabacita', 'Verduras'], [100, 'g', 'Pechuga de pollo', 'Proteína'], [0.5, 'pza', 'Jitomate', 'Verduras'], [30, 'g', 'Queso Oaxaca', 'Lácteos']],
      prep: 'Ahueca las calabacitas, rellena con pollo guisado con jitomate, cubre con queso y hornea 15 min.' },
    { id: 'frijoles_huevo_cena', n: 'Frijoles con huevo y nopal', e: '🫘', s: 'cena', k: 330, p: 19, c: 36, g: 12, t: ['huevo'],
      ing: [[0.5, 'taza', 'Frijoles de olla', 'Leguminosas'], [1, 'pza', 'Huevo', 'Proteína'], [1, 'taza', 'Nopales', 'Verduras'], [2, 'pza', 'Tortilla de maíz', 'Cereales y tortillas']],
      prep: 'Calienta los frijoles con nopal asado y un huevo estrellado encima.' }
  ];

  const DISTRIB = {
    3: [['desayuno', 'Desayuno', 0.3], ['comida', 'Comida', 0.4], ['cena', 'Cena', 0.3]],
    4: [['desayuno', 'Desayuno', 0.25], ['colacion', 'Colación', 0.1], ['comida', 'Comida', 0.4], ['cena', 'Cena', 0.25]],
    5: [['desayuno', 'Desayuno', 0.25], ['colacion', 'Colación', 0.1], ['comida', 'Comida', 0.35], ['colacion', 'Colación de la tarde', 0.1], ['cena', 'Cena', 0.2]]
  };

  function rng(semilla) {
    let h = 2166136261;
    for (let i = 0; i < semilla.length; i++) { h ^= semilla.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function apto(pl, pref) {
    pref = pref || {};
    const t = pl.t;
    if (pref.vegetariano && (t.includes('carne') || t.includes('pescado'))) return false;
    if (pref.sinCerdo && t.includes('cerdo')) return false;
    if (pref.sinPescado && t.includes('pescado')) return false;
    if (pref.sinLacteos && t.includes('lacteo')) return false;
    if (pref.sinHuevo && t.includes('huevo')) return false;
    return true;
  }
  function opciones(slot, pref) {
    pref = Object.assign({}, pref || {});
    let l = PL.filter(p => p.s === slot && apto(p, pref));
    ['sinLacteos', 'sinHuevo', 'sinPescado', 'sinCerdo'].forEach(k => { if (l.length < 2 && pref[k]) { pref[k] = false; l = PL.filter(p => p.s === slot && apto(p, pref)); } });
    if (!l.length) l = PL.filter(p => p.s === slot);
    return l;
  }
  const multiplo = (obj, k) => obj ? Math.max(0.75, Math.min(2, Math.round(obj / k * 4) / 4)) : 1;

  function porcion(pl, objetivo) {
    const m = multiplo(objetivo, pl.k);
    return { id: pl.id, pl, m, k: Math.round(pl.k * m), p: Math.round(pl.p * m), c: Math.round(pl.c * m), g: Math.round(pl.g * m) };
  }

  /** Plan de 7 días. cfg = { kcal, comidas, pref, semilla, cambios } */
  // ---------- Tiempos de comida y ayuno intermitente ----------
  const PESOS = { desayuno: 0.25, colacion1: 0.1, comida: 0.38, colacion2: 0.1, cena: 0.22 };
  const NOMBRES_T = { desayuno: 'Desayuno', colacion1: 'Colación de la mañana', comida: 'Comida', colacion2: 'Colación de la tarde', cena: 'Cena' };
  const HORAS_T = { desayuno: 8, colacion1: 11, comida: 14.5, colacion2: 17.5, cena: 20 };
  const AYUNOS = { '14:10': 10, '16:8': 8, '18:6': 6, '20:4': 4, 'omad': 1 };
  const hh = h => { const H = Math.floor(h) % 24, m = Math.round((h - Math.floor(h)) * 60); return (H < 10 ? '0' : '') + H + ':' + (m < 10 ? '0' : '') + m; };
  /** cc = { ayuno: null|'14:10'|'16:8'|'18:6'|'20:4'|'omad', inicio: 12, tiempos: ['desayuno','colacion1','comida','colacion2','cena'] } */
  function tiemposDe(cc, comidas) {
    cc = cc || {};
    if (cc.ayuno && AYUNOS[cc.ayuno]) {
      const W = AYUNOS[cc.ayuno], ini = +cc.inicio || 12, fin = ini + W;
      const pool1 = ini < 11 ? 'desayuno' : 'comida';
      if (cc.ayuno === 'omad') return [{ slot: 'comida', nombre: 'Tu comida del día', frac: 1, hora: hh(ini) }];
      if (W >= 10) return [{ slot: pool1, nombre: 'Primera comida', frac: 0.3, hora: hh(ini) }, { slot: 'colacion', nombre: 'Colación', frac: 0.1, hora: hh(ini + 3) },
        { slot: 'comida', nombre: 'Comida', frac: 0.35, hora: hh(ini + 5.5) }, { slot: 'cena', nombre: 'Última comida', frac: 0.25, hora: hh(fin - 0.75) }];
      if (W >= 8) return [{ slot: pool1, nombre: 'Primera comida', frac: 0.4, hora: hh(ini) }, { slot: 'colacion', nombre: 'Colación', frac: 0.15, hora: hh(ini + 3.5) },
        { slot: 'comida', nombre: 'Última comida', frac: 0.45, hora: hh(fin - 1) }];
      if (W >= 6) return [{ slot: pool1, nombre: 'Primera comida', frac: 0.45, hora: hh(ini) }, { slot: 'colacion', nombre: 'Colación', frac: 0.1, hora: hh(ini + 2.5) },
        { slot: 'comida', nombre: 'Última comida', frac: 0.45, hora: hh(fin - 0.75) }];
      return [{ slot: 'comida', nombre: 'Primera comida', frac: 0.5, hora: hh(ini) }, { slot: 'comida', nombre: 'Última comida', frac: 0.5, hora: hh(fin - 0.5) }];
    }
    let sel = (cc.tiempos && cc.tiempos.length) ? cc.tiempos.filter(t => PESOS[t]) : null;
    if (!sel) sel = { 3: ['desayuno', 'comida', 'cena'], 4: ['desayuno', 'colacion1', 'comida', 'cena'], 5: ['desayuno', 'colacion1', 'comida', 'colacion2', 'cena'] }[comidas] || ['desayuno', 'colacion1', 'comida', 'cena'];
    const orden = ['desayuno', 'colacion1', 'comida', 'colacion2', 'cena'];
    sel = orden.filter(t => sel.includes(t));
    const tot = sel.reduce((a, t) => a + PESOS[t], 0);
    return sel.map(t => ({ slot: t.indexOf('colacion') === 0 ? 'colacion' : t, nombre: NOMBRES_T[t], frac: PESOS[t] / tot, hora: hh(HORAS_T[t]) }));
  }
  function ventanaAyuno(cc) {
    if (!cc || !cc.ayuno || !AYUNOS[cc.ayuno]) return null;
    const ini = +cc.inicio || 12, W = cc.ayuno === 'omad' ? 2 : AYUNOS[cc.ayuno];
    return { ini, fin: ini + W, horas: W, ayunoHoras: 24 - W, texto: hh(ini) + '–' + hh(ini + W) };
  }

  function planSemana(cfg) {
    const dist = cfg.tiempos || tiemposDe(cfg.comidasCfg, cfg.comidas);
    const rand = rng(cfg.semilla || 'ff');
    const orden = {};
    ['desayuno', 'colacion', 'comida', 'cena'].forEach(s => {
      const l = opciones(s, cfg.pref).slice();
      for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
      orden[s] = l;
    });
    // Metas altas de proteína: quedarse con los platillos más proteicos de cada tiempo
    if (cfg.proteina && cfg.kcal && cfg.proteina * 4 / cfg.kcal > 0.28) {
      ['desayuno', 'comida', 'cena'].forEach(s => {
        const l = orden[s];
        if (l.length <= 4) return;
        const corte = l.slice().sort((a, b) => b.p / b.k - a.p / a.k)[Math.max(3, Math.ceil(l.length * 0.65) - 1)];
        const lim = corte.p / corte.k;
        orden[s] = l.filter(x => x.p / x.k >= lim);
      });
    }
    const dias = [];
    let col = 0;
    for (let d = 0; d < 7; d++) {
      const tiempos = [];
      const usadosDia = [];
      dist.forEach((tm, i) => {
        const { slot, nombre, frac, hora } = tm;
        const lista = orden[slot];
        let idx = slot === 'colacion' ? (col++) : d + i * 3;
        const clave = d + '_' + i;
        const cambio = cfg.cambios && cfg.cambios[clave];
        let pl = (cambio && PL.find(x => x.id === cambio)) || lista[idx % lista.length];
        for (let k = 0; !cambio && usadosDia.includes(pl.id) && k < lista.length; k++) pl = lista[(++idx) % lista.length];
        usadosDia.push(pl.id);
        const obj = cfg.kcal ? cfg.kcal * frac : 0;
        const t = Object.assign({ slot, nombre, clave, frac, hora, objetivo: Math.round(obj), fijo: !!cambio }, porcion(pl, obj));
        tiempos.push(t);
        // Comidas grandes (ayuno, pocas comidas): agrega un complemento para completar las calorías
        let resta = obj - t.k;
        for (let nc = 0; cfg.kcal && resta > 180 && nc < 3; nc++) {
          const cc = orden.colacion.filter(x => !usadosDia.includes(x.id)).sort((a, b) => b.p / b.k - a.p / a.k);
          const comp = cc[(d + i) % Math.max(1, Math.min(3, cc.length))] || orden.colacion[0];
          usadosDia.push(comp.id);
          const ck = clave + 'c' + (nc || '');
          const tc = Object.assign({ slot: 'colacion', nombre: nombre + ' · complemento', clave: ck, frac: resta / cfg.kcal, hora, objetivo: Math.round(resta), complemento: true, fijo: !!(cfg.cambios && cfg.cambios[ck]) },
            porcion((cfg.cambios && cfg.cambios[ck] && PL.find(x => x.id === cfg.cambios[ck])) || comp, resta));
          tiempos.push(tc); resta -= tc.k;
        }
      });
      // Si falta proteína, cambia las colaciones por opciones más proteicas
      if (cfg.proteina) {
        const prot = () => tiempos.reduce((s, t) => s + t.p, 0);
        tiempos.forEach((t, i) => {
          if (t.slot !== 'colacion' || t.fijo || t.complemento || prot() >= cfg.proteina * 0.85) return;
          const mejor = orden.colacion.filter(x => !tiempos.some(y => y.id === x.id)).sort((a, b) => b.p / b.k - a.p / a.k)[0];
          if (mejor && mejor.p > t.pl.p) tiempos[i] = Object.assign({}, t, porcion(mejor, t.objetivo));
        });
      }
      const tot = k => tiempos.reduce((s, t) => s + t[k], 0);
      dias.push({ tiempos, k: tot('k'), p: tot('p'), c: tot('c'), g: tot('g') });
    }
    return dias;
  }

  function alternativas(slot, pref, actual) {
    return opciones(slot, pref).filter(p => p.id !== actual);
  }

  const fmtCant = (x, u) => {
    let v = Math.round(x * 100) / 100;
    if (['pza', 'reb', 'lata', 'hoja'].includes(u)) v = Math.ceil(v * 2) / 2;
    if (u === 'g') v = Math.round(v / 10) * 10;
    const ent = Math.floor(v), fr = v - ent;
    const frs = { 0.25: '¼', 0.5: '½', 0.75: '¾' }[Math.round(fr * 4) / 4] || (fr ? String(Math.round(fr * 100) / 100).slice(1) : '');
    return (ent ? ent : '') + (frs && ent ? ' ' : '') + (frs || (ent ? '' : '0'));
  };
  const UNID = { pza: 'pza', taza: 'taza', g: 'g', cda: 'cda', cdita: 'cdita', reb: 'reb', lata: 'lata', pizca: 'pizca', hoja: 'hojas' };
  function ingredientes(t) {
    return t.pl.ing.map(([q, u, nombre]) => `${fmtCant(q * t.m, u)} ${UNID[u] || u} ${nombre.toLowerCase()}`);
  }

  function listaSuper(dias) {
    const acc = {};
    dias.forEach(d => d.tiempos.forEach(t => t.pl.ing.forEach(([q, u, nombre, cat]) => {
      if (u === 'pizca') return;
      const key = nombre + '|' + u;
      acc[key] = acc[key] || { nombre, u, cat, q: 0 };
      acc[key].q += q * t.m;
    })));
    const grupos = {};
    Object.values(acc).forEach(x => { (grupos[x.cat] = grupos[x.cat] || []).push({ nombre: x.nombre, cant: fmtCant(x.q, x.u) + ' ' + (UNID[x.u] || x.u) }); });
    Object.values(grupos).forEach(l => l.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return grupos;
  }

  window.FFComida = { PL, DISTRIB, planSemana, alternativas, porcion, ingredientes, listaSuper, apto, tiemposDe, ventanaAyuno, AYUNOS, NOMBRES_T };
})();
