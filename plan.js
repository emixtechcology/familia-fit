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
  core: 'Core y abdomen', activo: 'Caminata activa', descanso: 'Descanso activo'
};
function tipoSesion(q, diaSemana) {
  var d = Math.max(2, Math.min(6, parseInt(q && q.dias, 10) || 3));
  return CALENDARIO_RUTINA[d][diaSemana];
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
    pesa: '#3a3d5c', silla: '#c9a27a', sillaF: '#a8835e'
  };
  const rad = d => d * Math.PI / 180;
  const abajo = a => [Math.sin(rad(a)), Math.cos(rad(a))];      // 0° = hacia abajo, + = hacia el frente
  const arriba = t => [Math.sin(rad(t)), -Math.cos(rad(t))];    // 0° = hacia arriba
  const mas = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const angDe = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI;
  const CAMPOS = ['hx', 'hy', 't', 'hd', 'nu', 'nf', 'fu', 'ff', 'nt', 'ns', 'ft', 'fs', 'fN', 'fF', 'air'];
  const BASE = { hx: 150, hy: 115, t: 0, hd: 0, nu: 0, nf: 0, fu: 0, ff: 0, nt: 0, ns: 0, ft: 0, fs: 0, fN: null, fF: null, air: 0 };

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
    u = (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, u)))) / 2;
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
      const t = spec.ik && spec.ik[clave];
      if (t) { const r = ik(raiz, t, LEN.ua, LEN.fa, t[2]); return r; }
      const e = mas(raiz, abajo(u), LEN.ua); return [e, mas(e, abajo(f), LEN.fa)];
    };
    const pierna = (raiz, th, sh, clave, pieFijo, modo) => {
      const t = spec.ik && spec.ik[clave];
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
    else P.sombra = el('ellipse', { cx: 150, cy: G, rx: 46, ry: 5, fill: COL.sombra }, svg);
    if (props.includes('silla')) {
      el('rect', { x: 38, y: 86, width: 9, height: 114, rx: 3, fill: COL.sillaF }, svg);
      el('rect', { x: 102, y: 156, width: 7, height: 44, rx: 3, fill: COL.sillaF }, svg);
      el('rect', { x: 36, y: 148, width: 78, height: 10, rx: 4, fill: COL.silla }, svg);
    }
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
  }

  function poseEn(spec, fase) {
    preparar(spec);
    const p = interpolar(spec, fase);
    return spec.vista === 'frente' ? poseFrente(spec, p) : poseLado(spec, p);
  }

  // ---------- Registro de animaciones activas ----------
  const activas = [];
  let corriendo = false;
  function tick(now) {
    for (let i = activas.length - 1; i >= 0; i--) {
      const a = activas[i];
      if (!a.svg.isConnected) { activas.splice(i, 1); continue; }
      if (a.svg.dataset.pausa === '1') continue;
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
    }
  };

  // ---------- Generador de rutinas ----------
  const PLANTILLAS = {
    fuerzaA: [['sentadilla'], ['lagartija', 'lagartija_rodillas', 'plancha'], ['zancada', 'puente'], ['puente', 'talones'], ['press_hombro', 'fondos_silla', 'superman', 'talones'], ['plancha', 'crunch']],
    fuerzaB: [['remo', 'superman', 'puente'], ['zancada', 'sentadilla'], ['fondos_silla', 'lagartija_rodillas', 'talones'], ['crunch', 'plancha'], ['superman', 'puente', 'talones'], ['escaladores', 'marcha']],
    cardio: [['jumping_jacks', 'step_jacks'], ['rodillas_arriba', 'marcha'], ['sentadilla_salto', 'sentadilla'], ['escaladores', 'step_jacks'], ['jumping_jacks', 'marcha', 'talones'], ['plancha', 'crunch']],
    core: [['plancha'], ['crunch'], ['puente'], ['superman', 'talones'], ['escaladores', 'marcha'], ['plancha', 'crunch']]
  };
  const TIEMPOS = { 1: [30, 30], 2: [40, 20], 3: [45, 15] };

  function permitido(id, cfg, usados) {
    const e = EJ[id];
    if (!e || usados.includes(id)) return false;
    if (e.nivel > cfg.nivel) return false;
    if (cfg.bajoImpacto && e.impacto === 'alto') return false;
    if (e.equipo === 'mancuernas' && !cfg.mancuernas) return false;
    if ((e.evitar || []).some(l => cfg.lesiones.includes(l))) return false;
    return true;
  }

  function config(q, perfil) {
    const lesiones = (q && q.lesiones) || [];
    const est = (q && +q.estatura) || 165, peso = (q && +q.peso) || 70;
    const imc = peso / Math.pow(est / 100, 2);
    return {
      nivel: { principiante: 1, intermedio: 2, avanzado: 3 }[q && q.nivel] || 1,
      minutos: +((q && q.minutos) || 30), lesiones,
      mancuernas: !!(q && (q.equipo === 'mancuernas' || q.equipo === 'gimnasio')),
      bajoImpacto: !!(q && q.bajoImpacto) || lesiones.includes('rodilla') || imc >= 35,
      peso
    };
  }

  function armarSesion(tipo, q) {
    const cfg = config(q);
    const pasos = [];
    const add = (ej, seg, fase, extra) => pasos.push(Object.assign({ ej, seg, fase }, extra || {}));
    if (tipo === 'activo' || tipo === 'descanso') {
      const min = tipo === 'descanso' ? 20 : Math.max(30, cfg.minutos);
      add('caminar', min * 60, 'Caminata');
      add('est_cuadriceps', 40, 'Enfriamiento'); add('est_isquios', 40, 'Enfriamiento');
    } else {
      add('marcha', 45, 'Calentamiento'); add('circulos_brazos', 30, 'Calentamiento');
      add(!cfg.bajoImpacto && cfg.nivel >= 2 ? 'jumping_jacks' : 'step_jacks', 30, 'Calentamiento');
      const [w, r] = TIEMPOS[cfg.nivel];
      const n = cfg.minutos <= 20 ? 4 : cfg.minutos < 45 ? 5 : 6;
      const usados = [];
      (PLANTILLAS[tipo] || PLANTILLAS.fuerzaA).forEach(op => {
        if (usados.length >= n) return;
        const id = op.find(x => permitido(x, cfg, usados));
        if (id) usados.push(id);
      });
      ['sentadilla', 'puente', 'plancha', 'talones', 'marcha', 'crunch'].forEach(x => { if (usados.length < n && permitido(x, cfg, usados)) usados.push(x); });
      const calent = 105, enfr = 80, entreRondas = 60;
      const porRonda = usados.length * (w + r) + entreRondas;
      const rondas = Math.max(2, Math.min(6, Math.ceil((cfg.minutos * 60 - calent - enfr) / porRonda - 0.3)));
      for (let ro = 1; ro <= rondas; ro++) {
        usados.forEach((id, i) => {
          add(id, w, 'Circuito', { ronda: ro, rondas });
          const ultimo = i === usados.length - 1;
          if (!(ultimo && ro === rondas)) add(null, ultimo ? entreRondas : r, ultimo ? 'Descanso entre rondas' : 'Descanso', { ronda: ro, rondas });
        });
      }
      add('est_cuadriceps', 40, 'Enfriamiento'); add('est_isquios', 40, 'Enfriamiento');
    }
    const seg = pasos.reduce((s, p) => s + p.seg, 0);
    const kcal = Math.round(pasos.reduce((s, p) => s + (p.ej ? EJ[p.ej].met : 2) * cfg.peso * p.seg / 3600, 0));
    const ejercicios = [...new Set(pasos.filter(p => p.ej && p.fase !== 'Calentamiento' && p.fase !== 'Enfriamiento').map(p => p.ej))];
    return { tipo, nombre: (window.NOMBRE_SESION || {})[tipo] || tipo, pasos, minutos: Math.round(seg / 60), kcal, ejercicios, cfg };
  }

  window.FF_EJ = EJ;
  window.FFAnim = { montar, svgAnim, vista, poseEn, construir, dibujar, armarSesion, EJ };
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
  function planSemana(cfg) {
    const dist = DISTRIB[cfg.comidas] || DISTRIB[4];
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
      const tiempos = dist.map(([slot, nombre, frac], i) => {
        const lista = orden[slot];
        const idx = slot === 'colacion' ? (col++) : d;
        const clave = d + '_' + i;
        const cambio = cfg.cambios && cfg.cambios[clave];
        const pl = (cambio && PL.find(x => x.id === cambio)) || lista[idx % lista.length];
        const obj = cfg.kcal ? cfg.kcal * frac : 0;
        return Object.assign({ slot, nombre, clave, frac, objetivo: Math.round(obj), fijo: !!cambio }, porcion(pl, obj));
      });
      // Si falta proteína, cambia las colaciones por opciones más proteicas
      if (cfg.proteina) {
        const prot = () => tiempos.reduce((s, t) => s + t.p, 0);
        tiempos.forEach((t, i) => {
          if (t.slot !== 'colacion' || t.fijo || prot() >= cfg.proteina * 0.85) return;
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

  window.FFComida = { PL, DISTRIB, planSemana, alternativas, porcion, ingredientes, listaSuper, apto };
})();
