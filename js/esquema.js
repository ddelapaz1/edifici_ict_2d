/* =====================================================================
   ESQUEMA 2D DE LA ICT  (secció vertical de l'edifici)
   Unitats de l'SVG ≈ píxels a escala 1. Cada peça es registra amb l'id
   d'un element de EL (js/dades.js): selecció, ressaltat i fitxa.
   Planta f: forjat superior a FT(f), interior de TOP(f) a TOP(f)+424.
   Habitatge A a l'esquerra (x real) i B a la dreta (simètric, MX).
   ===================================================================== */
'use strict';
const NS = 'http://www.w3.org/2000/svg';
const W = 2480, H = 3080, MX = x => 2400 - x;
const FT = f => 700 + (4 - f) * 440, TOP = f => FT(f) + 16, GROUND = 2900;
const TC = {fo: '#0AA5C2', coax: '#C2185B', pt: '#8D6E1F', usr: '#7A7A7A', dc: '#E07B24', terra: '#3C8D2F'};
const REG = {};                                   // id → nodes dibuixats
const LY = {};                                    // capes

function mk(tag, a, p) {
  const n = document.createElementNS(NS, tag);
  for (const k in a) if (a[k] != null && a[k] !== false) n.setAttribute(k, a[k]);
  if (p) p.appendChild(n);
  return n;
}
function reg(id, n) {
  if (!id) return n;
  if (!EL[id]) console.warn('id desconegut', id);
  n.dataset.id = id;
  if (EL[id]) n.dataset.svc = EL[id].svc || 'all';
  (REG[id] || (REG[id] = [])).push(n);
  return n;
}
const G = (p, id, cls) => reg(id, mk('g', {class: cls}, p));
/* rectangle per arestes (accepta x1 > x2, útil en el costat reflectit) */
function R(p, x1, y1, x2, y2, cls, o = {}) {
  return mk('rect', {x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1),
    rx: o.rx, class: cls, fill: o.fill, stroke: o.stroke, 'stroke-width': o.sw, 'stroke-dasharray': o.dash}, p);
}
function C(p, cx, cy, r, cls, o = {}) { return mk('circle', {cx, cy, r, class: cls, fill: o.fill, stroke: o.stroke}, p); }
function T(p, x, y, s, cls, o = {}) {
  const t = mk('text', {x, y, class: cls, 'text-anchor': o.a || 'middle', 'font-size': o.fs, fill: o.fill,
    'font-weight': o.fw, transform: o.rot ? `rotate(${o.rot} ${x} ${y})` : null}, p);
  const lines = String(s).split('\n');
  if (lines.length === 1) t.textContent = s;
  else lines.forEach((l, i) => mk('tspan', {x, dy: i ? '1.15em' : 0}, t).textContent = l);
  return t;
}
/* camí ortogonal amb cantonades arrodonides */
function pathD(pts, r = 3) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const l1 = Math.hypot(x1 - x0, y1 - y0), l2 = Math.hypot(x2 - x1, y2 - y1);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    if (rr < 0.2) { d += `L${x1},${y1}`; continue; }
    const ax = x1 - (x1 - x0) / l1 * rr, ay = y1 - (y1 - y0) / l1 * rr;
    const bx = x1 + (x2 - x1) / l2 * rr, by = y1 + (y2 - y1) / l2 * rr;
    d += `L${ax},${ay}Q${x1},${y1} ${bx},${by}`;
  }
  const z = pts[pts.length - 1];
  return d + `L${z[0]},${z[1]}`;
}
/* cable: un o diversos trams; halo blanc per llegir els encreuaments i traç ample invisible per clicar-hi */
function cable(id, segs, tech, o = {}) {
  if (typeof segs[0][0] === 'number') segs = [segs];
  const g = G(o.p || LY.cab, id, 'cable t-' + tech + (o.cls ? ' ' + o.cls : ''));
  const w = o.w || 1.4;
  for (const s of segs) {
    const d = pathD(s, o.r == null ? 3 : o.r);
    mk('path', {d, class: 'halo', 'stroke-width': w + 1.6}, g);
    mk('path', {d, class: 'core', stroke: o.color || TC[tech], 'stroke-width': w, 'stroke-dasharray': o.dash}, g);
    mk('path', {d, class: 'hit'}, g);
  }
  return g;
}
/* feix de tubs (canalització): rectangle dividit en n tubs */
function tubes(p, id, x1, y1, x2, y2, n, o = {}) {
  const g = G(p, id, 'tubs' + (o.cls ? ' ' + o.cls : ''));
  const xa = Math.min(x1, x2), xb = Math.max(x1, x2), ya = Math.min(y1, y2), yb = Math.max(y1, y2);
  const hor = o.vert ? false : (xb - xa) >= (yb - ya);
  R(g, xa, ya, xb, yb, 'tub');
  for (let i = 1; i < n; i++) {
    if (hor) { const y = ya + (yb - ya) * i / n; mk('line', {x1: xa, y1: y, x2: xb, y2: y, class: 'tubsep'}, g); }
    else { const x = xa + (xb - xa) * i / n; mk('line', {x1: x, y1: ya, x2: x, y2: yb, class: 'tubsep'}, g); }
  }
  return g;
}
const port = (p, x, y, r = 1.7) => C(p, x, y, r, 'port');
function load(p, x, y, dir = 'down') {           // càrrega de 75 Ω (petit tap negre)
  const g = mk('g', {class: 'load'}, p);
  if (dir === 'down') { mk('line', {x1: x, y1: y, x2: x, y2: y + 5, class: 'loadstem'}, g); R(g, x - 2.6, y + 5, x + 2.6, y + 11, 'loadcap', {rx: 1}); }
  else if (dir === 'up') { mk('line', {x1: x, y1: y, x2: x, y2: y - 5, class: 'loadstem'}, g); R(g, x - 2.6, y - 11, x + 2.6, y - 5, 'loadcap', {rx: 1}); }
  else { const s = dir === 'right' ? 1 : -1; mk('line', {x1: x, y1: y, x2: x + 5 * s, y2: y, class: 'loadstem'}, g); R(g, x + 5 * s, y - 2.6, x + 11 * s, y + 2.6, 'loadcap', {rx: 1}); }
  return g;
}
/* etiquetes: lod0 = vista general (s'esvaeix en apropar-se), lod1/lod2/lod3 = apareixen en apropar-se */
const lab = (x, y, s, lod, o = {}) => T(LY.lbl, x, y, s, 'lbl ' + lod + (o.cls ? ' ' + o.cls : ''), o);

/* ------------------------------------------------------------------ */
function buildSchema(svg) {
  const world = mk('g', {id: 'world'}, svg);
  for (const k of ['bg', 'arch', 'canal', 'box', 'cab', 'lbl', 'ovl']) LY[k] = mk('g', {id: 'ly-' + k}, world);
  buildBackground();
  for (const f of [4, 3, 2, 1]) buildFloorArch(f);
  buildGroundArch();
  buildRoof();
  buildRITS();
  buildRiser();
  for (const f of [4, 3, 2, 1]) { buildRS(f); buildUnit(f, 'A'); buildUnit(f, 'B'); }
  buildRITI();
}

/* ---------- fons, façana i forjats ---------- */
function buildBackground() {
  const d = mk('defs', {}, LY.bg);
  const sky = mk('linearGradient', {id: 'gSky', x1: 0, y1: 0, x2: 0, y2: 1}, d);
  mk('stop', {offset: 0, 'stop-color': '#DCEAF6'}, sky); mk('stop', {offset: 1, 'stop-color': '#F4F7FA'}, sky);
  const hatch = mk('pattern', {id: 'pEarth', width: 14, height: 14, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)'}, d);
  mk('rect', {width: 14, height: 14, fill: '#E9E1D3'}, hatch); mk('line', {x1: 0, y1: 0, x2: 0, y2: 14, stroke: '#D3C7B2', 'stroke-width': 3}, hatch);
  const conc = mk('pattern', {id: 'pSlab', width: 10, height: 10, patternUnits: 'userSpaceOnUse'}, d);
  mk('rect', {width: 10, height: 10, fill: '#C9C6C0'}, conc); mk('circle', {cx: 3, cy: 4, r: .9, fill: '#B3AFA8'}, conc); mk('circle', {cx: 8, cy: 8, r: .7, fill: '#B3AFA8'}, conc);
  R(LY.bg, -400, -400, W + 400, GROUND, null, {fill: 'url(#gSky)'});
  R(LY.bg, -400, GROUND, W + 400, H + 400, null, {fill: 'url(#pEarth)'});
  R(LY.bg, -400, GROUND - 4, 150, GROUND + 2, 'pavement');            // vorera
  T(LY.lbl, 70, GROUND - 14, 'Carrer', 'lbl lod1 muted', {fs: 14});
  // façana i forjats
  R(LY.arch, 150, 700, 164, GROUND, 'wall'); R(LY.arch, 2236, 700, 2250, GROUND, 'wall');
  for (const f of [4, 3, 2, 1, 0]) R(LY.arch, 140, FT(f), 2260, FT(f) + 16, 'slab');
  R(LY.arch, 140, GROUND, 2260, GROUND + 18, 'slab');
  for (const f of [4, 3, 2, 1, 0]) {
    const yc = TOP(f) + 212;
    T(LY.lbl, 2270, yc - 6, FLOORNAME(f), 'lbl lod0 floorname', {a: 'start', fs: 30, fw: 700});
    T(LY.lbl, 2270, yc + 22, f === 0 ? 'RITI · enllaç inferior' : `RS + habitatges ${ORD[f]} A i ${ORD[f]} B`, 'lbl lod0 muted', {a: 'start', fs: 15});
  }
  T(LY.lbl, 2270, 560, 'Coberta', 'lbl lod0 floorname', {a: 'start', fs: 30, fw: 700});
  T(LY.lbl, 2270, 588, 'RITS · antenes', 'lbl lod0 muted', {a: 'start', fs: 15});
}

function buildFloorArch(f) {
  const t = TOP(f), b = t + 424;
  // zona comuna (distribuïdor)
  R(LY.arch, 814, t, 1586, b, 'common');
  lab(1090, b - 12, 'Zona comuna', 'lod1', {cls: 'muted', fs: 13});
  // escala i ascensor (decoratius)
  const st = mk('g', {class: 'deco'}, LY.arch);
  for (let i = 0; i < 9; i++) mk('line', {x1: 1420 + i * 16, y1: b - 8 - i * 12, x2: 1436 + i * 16, y2: b - 8 - i * 12}, st);
  for (let i = 0; i < 9; i++) mk('line', {x1: 1436 + i * 16, y1: b - 8 - i * 12, x2: 1436 + i * 16, y2: b - 20 - i * 12}, st);
  R(st, 880, b - 120, 990, b, null); mk('line', {x1: 880, y1: b - 120, x2: 990, y2: b}, st); mk('line', {x1: 990, y1: b - 120, x2: 880, y2: b}, st);
  lab(935, b - 126, 'Ascensor', 'lod1', {cls: 'muted', fs: 11});
  lab(1500, b - 120, 'Escala', 'lod1', {cls: 'muted', fs: 11});
  for (const s of ['A', 'B']) {
    const X = s === 'B' ? MX : (x => x);
    R(LY.arch, X(164), t, X(800), b, 'private');
    R(LY.arch, X(800), t, X(814), b, 'wall');                              // mitgera amb el distribuïdor
    // envans interiors
    for (const [x1, y1, x2, y2] of [[420, 0, 426, 424], [640, 0, 646, 424], [426, 210, 640, 216], [646, 280, 800, 286]])
      R(LY.arch, X(x1), t + y1, X(x2), t + y2, 'partition');
    // portes (buit + fulla)
    R(LY.arch, X(800), t + 236, X(814), t + 276, 'doorgap');               // entrada des del distribuïdor
    mk('path', {d: `M${X(800)},${t + 236} A40,40 0 0 ${s === 'A' ? 0 : 1} ${X(760)},${t + 276} L${X(800)},${t + 276}`, class: 'doorleaf'}, LY.arch);
    R(LY.arch, X(640), t + 150, X(646), t + 196, 'doorgap');
    R(LY.arch, X(420), t + 60, X(426), t + 106, 'doorgap');
    R(LY.arch, X(420), t + 290, X(426), t + 336, 'doorgap');
    R(LY.arch, X(700), t + 280, X(746), t + 286, 'doorgap');
    // finestres a la façana
    for (const y of [70, 290]) R(LY.arch, X(150), t + y, X(164), t + y + 70, 'window');
    const U = `${f}${s}`;
    const rooms = [['Sala d\'estar', 292, 26], ['Dormitori 1', 533, 190], ['Dormitori 2', 533, 238], ['Rebedor', 715, 26], ['Cuina', 723, 306]];
    for (const [n, x, y] of rooms) lab(X(x), t + y, n, 'lod1', {cls: 'room', fs: 12});
    lab(X(292), t + 210, `Habitatge\n${UNIT(U).name}`, 'lod0 big', {fs: 44, fw: 700});
  }
}

function buildGroundArch() {
  const t = TOP(0), b = GROUND;
  R(LY.arch, 164, t, 2236, b, 'common');
  lab(600, t + 60, 'Vestíbul (planta baixa)', 'lod1', {cls: 'muted', fs: 14});
  R(LY.arch, 2236, b - 150, 2250, b - 20, 'doorgap');
  lab(2150, b - 160, 'Entrada', 'lod1', {cls: 'muted', fs: 12});
  const st = mk('g', {class: 'deco'}, LY.arch);
  for (let i = 0; i < 9; i++) mk('line', {x1: 1560 + i * 16, y1: b - 8 - i * 12, x2: 1576 + i * 16, y2: b - 8 - i * 12}, st);
  for (let i = 0; i < 9; i++) mk('line', {x1: 1576 + i * 16, y1: b - 8 - i * 12, x2: 1576 + i * 16, y2: b - 20 - i * 12}, st);
}

/* ---------- coberta: torre, antenes i enllaç superior ---------- */
function buildRoof() {
  const roof = 700;
  R(LY.arch, 140, roof - 30, 150, roof, 'wall'); R(LY.arch, 2250, roof - 30, 2260, roof, 'wall');   // ampits
  // torreta de gelosia triangular de 175 mm de costat (tram de base de 2,5 m + tram superior d'1,5 m amb punta)
  const L = 447, Rr = 473, cx = 460, tip = 172;
  const tw = G(LY.box, 'torre', 'metal');
  R(tw, 428, roof - 6, 492, roof, 'plate2');
  mk('line', {x1: cx, y1: roof - 6, x2: cx, y2: tip + 20, class: 'backleg'}, tw);           // pota posterior
  const rungs = []; for (let y = roof - 10; y > tip + 30; y -= 61) rungs.push(y);
  rungs.forEach((y, i) => {
    mk('line', {x1: L, y1: y, x2: Rr, y2: y, class: 'rung'}, tw);
    const y2 = rungs[i + 1] || tip + 22;
    mk('line', {x1: L, y1: y - 3, x2: Rr, y2: y2 + 3, class: 'rung'}, tw);
    mk('line', {x1: cx, y1: y - 3, x2: Rr, y2: (y + y2) / 2, class: 'rung back'}, tw);
  });
  mk('path', {d: `M${L},${roof - 6} V${tip} Q${L},${tip - 30} ${cx - 3},${tip - 48}`, class: 'leg'}, tw);
  mk('path', {d: `M${Rr},${roof - 6} V${tip} Q${Rr},${tip - 30} ${cx + 3},${tip - 48}`, class: 'leg'}, tw);
  mk('path', {d: `M${L},${tip + 4} L${cx},${tip - 30} L${Rr},${tip + 4}`, class: 'rung'}, tw);    // tirants interiors de la punta
  for (const y of [roof - 367, roof - 367 - 70]) R(tw, L - 10, y - 2, Rr + 10, y + 2, 'collar', {rx: 1});   // unió de trams i collarí de tirants
  R(tw, cx - 3.6, tip - 82, cx + 3.6, tip - 40, 'tsocket', {rx: 1});                          // punta: tub de suport del pal
  for (const y of [tip - 74, tip - 60]) C(tw, cx, y, 1.4, 'hole');
  lab(L - 12, 540, 'Torreta\n(trams de 175 mm)', 'lod1', {a: 'end', fs: 12});
  const ms = G(LY.box, 'mastil', 'metal'); R(ms, 457.5, -206, 462.5, tip - 60, 'mast');
  lab(452, 40, 'Pal', 'lod2', {a: 'end', fs: 9});
  const tir = G(LY.box, 'tirants'); for (const x of [290, 640]) mk('line', {x1: cx, y1: roof - 437, x2: x, y2: roof, class: 'guy'}, tir);
  lab(580, 560, 'Tirant', 'lod2', {a: 'start', fs: 9});
  // antena TDT (UHF) amb reflector de panell corbat i directors en feix
  const Y0 = -190, ya = G(LY.box, 'antena', 'metal');
  mk('path', {d: `M436,${Y0 - 88} Q392,${Y0} 436,${Y0 + 88}`, class: 'rail'}, ya);
  mk('path', {d: `M450,${Y0 - 80} Q412,${Y0} 450,${Y0 + 80}`, class: 'rail'}, ya);
  for (let i = -6; i <= 6; i++) {
    const y = Y0 + i * 13, to = (y - Y0 + 88) / 176, ti = (y - Y0 + 80) / 160;
    const xo = 436 - 88 * to * (1 - to), xi = 450 - 76 * ti * (1 - ti);
    mk('line', {x1: xo - 6, y1: y, x2: xi + 3, y2: y, class: 'rod'}, ya);
  }
  for (const d of [-1, 1]) mk('line', {x1: 430, y1: Y0 + d * 52, x2: 457, y2: Y0 + d * 6, class: 'rod'}, ya);   // suports del panell
  R(ya, 452, Y0 - 1.6, 640, Y0 + 1.6, 'boomA');
  for (const [x2, y2] of [[630, Y0 - 40], [624, Y0 + 34]]) mk('line', {x1: 486, y1: Y0, x2, y2, class: 'arm'}, ya);
  for (let i = 0; i < 5; i++) {                                           // directors: elements en V a cada braç
    const x = 512 + i * 26;
    mk('path', {d: `M${x - 5},${Y0 - 9} L${x},${Y0} L${x - 5},${Y0 + 9}`, class: 'rod'}, ya);
    const yu = Y0 - (x - 486) * 40 / 144, yl = Y0 + (x - 486) * 34 / 138;
    mk('path', {d: `M${x - 6},${yu - 7} L${x},${yu} L${x - 2},${yu + 8}`, class: 'rod'}, ya);
    mk('path', {d: `M${x - 6},${yl + 7} L${x},${yl} L${x - 2},${yl - 8}`, class: 'rod'}, ya);
  }
  R(ya, 452, Y0 - 7, 468, Y0 + 7, 'clamp', {rx: 1.5});
  R(ya, 464, Y0 - 11, 486, Y0 + 11, 'abox orange', {rx: 6});             // amplificador / caixa de connexió
  lab(520, Y0 - 104, 'Antena TDT (UHF)', 'lod1', {fs: 14, fw: 600});
  // antena DAB: Yagi de 3 elements en polarització vertical (reflector, dipol plegat, director)
  const Yd = -40, da = G(LY.box, 'antena_dab', 'metal');
  R(da, 466, Yd - 3, 652, Yd + 3, 'boomA'); R(da, 648, Yd - 3, 654, Yd + 3, null, {fill: '#F28C28'});
  R(da, 488.8, Yd - 96, 491.2, Yd + 96, 'elem2');
  R(da, 556, Yd - 80, 568, Yd + 80, 'loop', {rx: 6});
  R(da, 628.8, Yd - 84, 631.2, Yd + 84, 'elem2');
  R(da, 451, Yd - 7, 472, Yd + 7, 'clamp', {rx: 1.5});
  R(da, 551, Yd - 11, 573, Yd + 12, 'abox orange', {rx: 6});
  lab(664, Yd + 4, 'Antena DAB', 'lod1', {a: 'start', fs: 13, fw: 600});
  // antena FM: dipol circular (doble llaç horitzontal) amb suport lateral al pal
  const Yf = 74, fm = G(LY.box, 'antena_fm', 'metal');
  mk('ellipse', {cx: 384, cy: Yf - 12, rx: 64, ry: 15, class: 'ring'}, fm);
  mk('ellipse', {cx: 376, cy: Yf + 12, rx: 64, ry: 15, class: 'ring'}, fm);
  for (const [x, y1, y2] of [[396, Yf + 2, Yf - 26], [338, Yf + 26, Yf + 2]]) R(fm, x - 1.6, Math.min(y1, y2), x + 1.6, Math.max(y1, y2), 'spacer');
  R(fm, 432, Yf - 14, 446, Yf + 10, 'insul', {rx: 1.5});                   // caixa del dipol
  R(fm, 440, Yf + 4, 470, Yf + 10, 'clamp');                                 // escaire i brida al pal
  R(fm, 452, Yf - 2, 468, Yf + 16, 'clamp', {rx: 1.5});
  lab(306, Yf + 4, 'Antena FM', 'lod1', {a: 'end', fs: 13, fw: 600});
  // parabòlica + LNB
  const pb = G(LY.box, 'parabola', 'metal');
  mk('path', {d: 'M205,500 Q250,560 214,640', class: 'dish'}, pb);
  R(pb, 236, 600, 241, roof, 'mast'); R(pb, 222, roof - 6, 256, roof, 'mast');
  mk('line', {x1: 222, y1: 610, x2: 285, y2: 570, class: 'arm'}, pb);
  lab(214, 486, 'Parabòlica', 'lod1', {fs: 13, fw: 600});
  const lnb = G(LY.box, 'lnb'); R(lnb, 280, 560, 300, 576, 'abox', {rx: 3}); lab(310, 556, 'LNB', 'lod2', {a: 'start', fs: 9});
  // canalització d'enllaç superior (2 × Ø40) fins al RITS
  tubes(LY.canal, 'canal_enllac_sup', 476, 628, 744, 672, 2);
  lab(616, 622, 'Canalització d\'enllaç superior (2 × Ø40)', 'lod2', {fs: 8});
  // cables exteriors (PE negre): baixen pel màstil i la torre
  // pugen pel costat del pal i baixen per la pota dreta de la torreta
  const ext = {color: '#2B2B2B', w: 1.5};
  cable('cab_capt', [[475, Y0 + 11], [475, tip - 46], [472, tip - 40], [472, tip + 12], [482, tip + 18], [482, 640], [764, 640]], 'coax', ext);
  cable('cab_dab', [[551, Yd + 6], [478, Yd + 6], [478, tip - 50], [476, tip - 44], [476, tip + 4], [486, tip + 10], [486, 634], [764, 634]], 'coax', ext);
  cable('cab_fm', [[446, Yf + 2], [468, Yf - 6], [468, tip + 20], [478, tip + 26], [478, 646], [764, 646]], 'coax', ext);
  cable('cab_sat', [[296, 576], [296, 590], [250, 618], [250, 656], [764, 656]], 'coax', {color: '#2B2B2B', w: 1.5});
  cable('cab_sat2', [[290, 576], [290, 588], [246, 614], [246, 664], [764, 664]], 'coax', {color: '#2B2B2B', w: 1.5});
  lab(560, 690, 'Cables coaxials exteriors', 'lod2', {fs: 7, cls: 'muted'});
}

/* ---------- RITS: recinte i capçalera (variant de monocanals T12) ---------- */
const MOD = [];                                  // mòduls T12 de la capçalera: {id, x, label, ch, kind}
function buildRITS() {
  const x1 = 740, x2 = 1660, y1 = 400, y2 = 700;
  const rits = G(LY.box, 'rits', 'zone');
  R(rits, x1, y1, x2, y2, 'room-rits');
  R(rits, x1, y1, x2, y1 + 12, 'wall'); R(rits, x1, y1, x1 + 12, y2, 'wall'); R(rits, x2 - 12, y1, x2, y2, 'wall');
  lab(1200, 386, 'RITS · Recinte d\'instal·lacions de telecomunicació superior', 'lod1', {fs: 15, fw: 700});
  lab(1200, 560, 'RITS', 'lod0 big', {fs: 70, fw: 800});
  // porta, placa, ventilació
  const pt = G(rits, 'rits_porta'); R(pt, x2 - 12, 590, x2, 700, 'doorgap'); mk('path', {d: `M${x2},590 A110,110 0 0 1 ${x2 - 110},700`, class: 'doorleaf'}, pt);
  R(pt, x2 - 12, 590, x2 - 4, 700, 'doormetal');
  const pl = G(rits, 'rits_placa'); R(pl, x2 + 4, 610, x2 + 40, 632, 'sign', {rx: 2}); T(pl, x2 + 22, 624, 'RITS', 'tiny', {fs: 7});
  const vt = G(rits, 'rits_vent');
  for (const [vx, vy] of [[x1, 430], [x2 - 12, 440]]) { R(vt, vx, vy, vx + 12, vy + 40, 'vent'); for (let i = 1; i < 6; i++) mk('line', {x1: vx + 2, y1: vy + i * 6.6, x2: vx + 10, y2: vy + i * 6.6, class: 'ventl'}, vt); }
  // safata perimetral
  const sf = G(rits, 'rits_safata'); R(sf, x1 + 14, 414, x2 - 14, 424, 'tray');
  lab(1000, 411, 'Safata perimetral', 'lod2', {fs: 7});
  // instal·lació elèctrica
  const te = G(rits, 'rits_tub_elec');
  for (const d of [`M1620,440 V428 H1200 V430`, `M1200,428 H776 V494`, `M1625,530 V560`]) mk('path', {d, class: 'elec'}, te);
  const ll = G(rits, 'rits_llum'); R(ll, 1170, 430, 1230, 438, 'lamp', {rx: 3}); lab(1200, 448, 'Lluminària', 'lod2', {fs: 7});
  const em = G(rits, 'rits_emerg'); R(em, 1560, 428, 1590, 438, 'emerg', {rx: 2}); lab(1575, 448, 'Emergència', 'lod2', {fs: 7});
  const qd = G(rits, 'rits_quadre'); R(qd, 1598, 440, 1644, 530, 'panel', {rx: 2});
  for (let i = 0; i < 4; i++) R(qd, 1604 + i * 9.5, 470, 1611 + i * 9.5, 490, 'breaker');
  T(qd, 1621, 458, 'Quadre', 'tiny', {fs: 7}); lab(1621, 545, 'Quadre de protecció', 'lod2', {fs: 7});
  const bs = G(rits, 'rits_bases_srv'); for (const y of [562, 584]) { R(bs, 1612, y, 1640, y + 18, 'socket', {rx: 2}); C(bs, 1622, y + 9, 1.4, 'sockh'); C(bs, 1630, y + 9, 1.4, 'sockh'); }
  lab(1590, 606, 'Bases de servei', 'lod2', {a: 'end', fs: 7});
  const bc = G(rits, 'rits_bases_cap'); for (const y of [494, 516]) { R(bc, 756, y, 784, y + 18, 'socket', {rx: 2}); C(bc, 766, y + 9, 1.4, 'sockh'); C(bc, 774, y + 9, 1.4, 'sockh'); }
  lab(770, 546, 'Bases capçalera', 'lod2', {fs: 7});
  const tr = G(rits, 'rits_terra'); R(tr, 790, 682, 880, 690, 'earthbar', {rx: 1});
  R(tr, x1 + 16, y1 + 16, x2 - 16, y2 - 4, 'earthring');
  lab(835, 678, 'Barra de terra', 'lod2', {fs: 7});
  // registre d'enllaç (passamurs) i unions F-F
  const re = G(rits, 'reg_enllac_sup'); R(re, x1 + 4, 620, 796, 680, 'regbox', {rx: 2});
  lab(770, 696, 'Registre d\'enllaç', 'lod2', {fs: 7});
  const ff = G(re, 'rits_ff');
  const ffY = [634, 640, 646, 656, 664];
  for (const y of ffY) R(ff, 764, y - 2, 776, y + 2, 'ffunion', {rx: 1});
  lab(770, 616, 'Unions F‑F', 'lod3', {fs: 5});
  // tub corrugat d'entrada a la capçalera
  tubes(rits, 'rits_corr_in', 800, 450, 830, 676, 1, {cls: 'corr', vert: true});
  // placa de muntatge i capçalera
  const sp = G(rits, 'rits_suport'); R(sp, 836, 456, 1580, 650, 'plate', {rx: 3});
  lab(1208, 646, 'Placa de muntatge', 'lod2', {fs: 7, cls: 'muted'});
  const cap = G(rits, 'capcalera');
  R(cap, 838, 462, 1530, 610, 'capzone', {rx: 4});
  lab(1180, 474, 'Equip de capçalera (amplificadors monocanal T12)', 'lod1', {fs: 11, fw: 600});
  const rail = G(cap, 'cap_rail'); R(rail, 846, 588, 1392, 596, 'rail');
  // font
  const fo = G(cap, 'cap_font'); R(fo, 848, 486, 900, 588, 'mod', {rx: 2}); R(fo, 848, 486, 900, 496, null, {fill: '#FFA000', rx: 2});
  T(fo, 874, 530, '24 V', 'modtxt', {fs: 8, fw: 700}); T(fo, 874, 542, 'Font', 'modtxt', {fs: 6});
  // mòduls: TDT 10 → 1, DAB, FM, FI 1, FI 2
  const ch = [45, 40, 38, 36, 34, 32, 29, 27, 26, 23];
  for (let i = 0; i < 10; i++) MOD.push({id: `cap_t12_${10 - i}`, label: `TDT ${10 - i}`, ch: `C${ch[i]}`, kind: 'ter'});
  MOD.push({id: 'cap_t12_dab', label: 'DAB', ch: 'B III', kind: 'ter'}, {id: 'cap_t12_fm', label: 'FM', ch: '88‑108', kind: 'ter'},
    {id: 'cap_fi_1', label: 'FI 1', ch: 'SAT A', kind: 'fi'}, {id: 'cap_fi_2', label: 'FI 2', ch: 'SAT B', kind: 'fi'});
  const IU = 506, IL = 516, OU = 560, OL = 570;          // ports: entrada superior/inferior, sortida superior/inferior
  MOD.forEach((m, i) => {
    m.x = 926 + i * 34; m.cx = m.x + 15;
    const g = G(cap, m.id); R(g, m.x, 486, m.x + 30, 588, 'mod', {rx: 2});
    R(g, m.x, 486, m.x + 30, 494, null, {fill: m.kind === 'fi' ? '#1565C0' : '#C62828', rx: 2});
    T(g, m.cx, 538, m.label, 'modtxt', {fs: 6.2, fw: 700}); T(g, m.cx, 546, m.ch, 'modtxt', {fs: 4.2});
    for (const y of [IU, IL, OU, OL]) port(g, m.cx, y, 2.2);
  });
  lab(1100, 610, 'TDT 10 → TDT 1', 'lod2', {fs: 8});
  // alimentació 24 V c.c.
  const dc = G(cap, 'cap_dc');
  mk('path', {d: `M874,486 V478 H${MOD[MOD.length - 1].cx}`, class: 'dcline'}, dc);
  for (const m of MOD) mk('line', {x1: m.cx, y1: 478, x2: m.cx, y2: 486, class: 'dcline'}, dc);
  lab(1240, 476, '24 V c.c.', 'lod3', {fs: 5, cls: 'dclbl'});
  cable('rits_cordo', [[784, 503], [848, 503]], 'usr', {color: '#333', w: 1.3});
  // ponts F en Z: entrades (només entre TDT) i sortides (TDT 10 → FM)
  const pz = G(cap, 'cap_ponts');
  for (let i = 0; i < MOD.length - 1; i++) {
    const a = MOD[i], b = MOD[i + 1];
    if (i < 9) mk('path', {d: `M${a.cx},${IU} H${a.cx + 17} V${IL} H${b.cx}`, class: 'bridge'}, pz);
    if (i < 11) mk('path', {d: `M${a.cx},${OU} H${a.cx + 17} V${OL} H${b.cx}`, class: 'bridge'}, pz);
  }
  // càrregues de 75 Ω als ports lliures
  const cr = G(cap, 'cap_carregues');
  load(cr, MOD[0].cx - 2.2, IL, 'left'); load(cr, MOD[0].cx - 2.2, OL, 'left');
  for (const m of MOD.slice(10)) load(cr, m.cx + 2.2, IL, 'right');
  for (const m of MOD.slice(12)) load(cr, m.cx + 2.2, OL, 'right');
  // filtre LTE a l'entrada de TDT 1
  const t1 = MOD[9];
  const fl = G(cap, 'cap_filtre'); R(fl, t1.cx - 7, 488 - 26, t1.cx + 7, 488 - 10, 'filter', {rx: 2}); T(fl, t1.cx, 488 - 15, 'LTE', 'modtxt', {fs: 4});
  // mesclador TER + 2 SAT
  const mx = G(cap, 'cap_mix'); R(mx, 1430, 515, 1520, 590, 'mixer', {rx: 3});
  T(mx, 1475, 545, 'Mesclador', 'modtxt', {fs: 8, fw: 700}); T(mx, 1475, 556, 'TER + 2 SAT', 'modtxt', {fs: 6});
  for (const y of [530, 545, 560]) port(mx, 1430, y, 2.2);
  for (const x of [1455, 1495]) port(mx, x, 590, 2.2);
  T(mx, 1424, 532, 'SAT 2', 'modtxt', {fs: 4, a: 'end'}); T(mx, 1424, 547, 'SAT 1', 'modtxt', {fs: 4, a: 'end'}); T(mx, 1424, 562, 'TER', 'modtxt', {fs: 4, a: 'end'});
  // cables interiors (PVC blanc) des de les unions F-F fins a la capçalera
  const cin = [['cab_capt_int', t1.cx, 452, 640, 821, true], ['cab_dab_int', MOD[10].cx, 448, 634, 817], ['cab_fm_int', MOD[11].cx, 444, 646, 813],
    ['cab_sat_int', MOD[12].cx, 440, 656, 809], ['cab_sat2_int', MOD[13].cx, 436, 664, 805]];
  for (const [id, tx, lane, y, rx, filt] of cin) {
    const pts = [[776, y], [rx, y], [rx, lane], [tx, lane], [tx, IU]];
    if (filt) cable(id, [[[776, y], [rx, y], [rx, lane], [tx, lane], [tx, 462]], [[tx, 478], [tx, IU]]], 'coax', {color: '#9C9C9C', w: 1.5});
    else cable(id, pts, 'coax', {color: '#9C9C9C', w: 1.5});
  }
  // latiguillos de la capçalera cap al mesclador
  const fm = MOD[11], f1 = MOD[12], f2 = MOD[13];
  cable('cap_jump', [[[f2.cx, OU], [f2.cx, 600], [1400, 600], [1400, 530], [1430, 530]],
    [[f1.cx, OU], [f1.cx, 610], [1410, 610], [1410, 545], [1430, 545]],
    [[fm.cx, OU], [fm.cx, 620], [1420, 620], [1420, 560], [1430, 560]]], 'coax', {w: 1.3});
  // tub corrugat de sortida cap a la canalització principal
  tubes(rits, 'rits_corr_out', 1166, 640, 1186, 700, 1, {cls: 'corr', vert: true});
}

/* ---------- canalització principal (6 × Ø50) i xarxes de distribució ---------- */
const RISER = {x1: 1170, x2: 1230, c1: 1173, c2: 1177, fo: 1215, pt: 1225};
const RS_Y1 = 24, RS_Y2 = 284;                    // registre secundari (relatiu a TOP)
function buildRiser() {
  const segs = [[700, TOP(4) + RS_Y1]];
  for (const f of [4, 3, 2]) segs.push([TOP(f) + RS_Y2, TOP(f - 1) + RS_Y1]);
  segs.push([TOP(1) + RS_Y2, TOP(0) + 120]);
  for (const [a, b] of segs) tubes(LY.canal, 'canal_principal', RISER.x1, a, RISER.x2, b, 6, {vert: true});
  lab(1250, TOP(1) + 360, 'Canalització principal\n6 × Ø50 mm', 'lod1', {a: 'start', fs: 11});
  lab(1250, TOP(3) + 360, 'RTV · TBA · TBA · reserva · fibra · parells', 'lod2', {a: 'start', fs: 7, cls: 'muted'});
  // distribució de RTV: dos coaxials des del mesclador; cada tram entre derivadors
  const c1 = [[[1455, 590], [1455, 662], [RISER.c1, 662], [RISER.c1, TOP(4) + 34], [1080, TOP(4) + 34], [1080, TOP(4) + 50]]];
  const c2 = [[[1495, 590], [1495, 670], [RISER.c2, 670], [RISER.c2, TOP(4) + 42], [1140, TOP(4) + 42], [1140, TOP(4) + 50]]];
  for (const f of [4, 3, 2]) {
    const t = TOP(f), n = TOP(f - 1);
    c1.push([[1080, t + 100], [1080, t + 262], [RISER.c1, t + 262], [RISER.c1, n + 34], [1080, n + 34], [1080, n + 50]]);
    c2.push([[1140, t + 100], [1140, t + 254], [RISER.c2, t + 254], [RISER.c2, n + 42], [1140, n + 42], [1140, n + 50]]);
  }
  cable('xd_rtv', c1.concat(c2), 'coax', {w: 1.6});
  // distribució de fibra: del RITI cap amunt; a cada planta passa per la caixa de segregació
  const fo = [[[1118, TOP(0) + 168], [1118, TOP(0) + 140], [RISER.fo, TOP(0) + 140], [RISER.fo, TOP(1) + 104]]];
  for (const f of [1, 2, 3]) fo.push([[RISER.fo, TOP(f) + 46], [RISER.fo, TOP(f + 1) + 104]]);
  cable('xd_fo', fo, 'fo', {w: 2});
  // mànega de 50 parells: del RITI cap amunt, amb un desviament dins de cada registre secundari
  const pt = [[1358, TOP(0) + 168], [1358, TOP(0) + 134], [RISER.pt, TOP(0) + 134]];
  for (const f of [1, 2, 3, 4]) {
    const t = TOP(f);
    pt.push([RISER.pt, t + 272], [1340, t + 272]);
    if (f < 4) pt.push([1340, t + 30], [RISER.pt, t + 30]); else pt.push([1340, t + 62]);
  }
  cable('xd_pt', pt, 'pt', {w: 3.2, r: 5});
  const res = G(LY.cab, 'xd_pt'); mk('ellipse', {cx: 1340, cy: TOP(4) + 58, rx: 9, ry: 5, class: 'coil'}, res);
  lab(1352, TOP(4) + 52, 'parells 41–50 de reserva', 'lod3', {a: 'start', fs: 4.5, cls: 'muted'});
}

/* ---------- registre secundari de cada planta ---------- */
function buildRS(f) {
  const t = TOP(f), y = d => t + d, rs = G(LY.box, `rs_${f}`, 'zone');
  R(rs, 1030, y(RS_Y1), 1370, y(RS_Y2), 'regsec', {rx: 4});
  lab(1036, y(RS_Y1) - 6, `Registre secundari · ${FLOORNAME(f)}`, 'lod1', {a: 'start', fs: 11, fw: 700});
  lab(1200, y(RS_Y1) + 150, 'RS', 'lod0 big', {fs: 64, fw: 800});
  const tap = TAPF[f];
  // derivadors (un per cable de distribució)
  const der = G(rs, `deriv_${f}`);
  for (const [cx, n] of [[1080, 1], [1140, 2]]) {
    R(der, cx - 26, y(50), cx + 26, y(100), 'deriv', {rx: 2});
    T(der, cx, y(68), `Derivador ${n}`, 'modtxt', {fs: 6, fw: 700});
    T(der, cx, y(78), `${tap.db} dB · 2 sortides`, 'modtxt', {fs: 5});
    port(der, cx, y(50)); T(der, cx + 6, y(56), 'E', 'modtxt', {fs: 3.6});
    for (const [dx, l] of [[-20, 'A'], [0, 'pas'], [20, 'B']]) { port(der, cx + dx, y(100)); T(der, cx + dx, y(96), l, 'modtxt', {fs: 3.6}); }
    if (f === 1) load(der, cx, y(100));
  }
  // caixa de segregació de fibra
  const cs = G(rs, `cseg_${f}`); R(cs, 1190, y(46), 1240, y(104), 'cseg', {rx: 3});
  mk('ellipse', {cx: 1215, cy: y(64), rx: 16, ry: 7, class: 'fibrecoil'}, cs);
  for (let i = 0; i < 3; i++) R(cs, 1196, y(78 + i * 7), 1234, y(82 + i * 7), 'tray2');
  lab(1215, y(41), 'Caixa de segregació', 'lod2', {fs: 6.5});
  // punt de distribució de parells (regleta de 10 parells)
  const bl = G(rs, `bucle_${f}`); R(bl, 1280, y(46), 1320, y(118), 'regleta', {rx: 2});
  for (let i = 0; i < 10; i++) { R(bl, 1286, y(52 + i * 6.3), 1314, y(55.5 + i * 6.3), 'krone'); T(bl, 1300, y(55 + i * 6.3), i + 1, 'modtxt', {fs: 3}); }
  mk('path', {d: `M1340,${y(84)} H1320`, class: 'sangrat'}, bl);
  lab(1300, y(128), 'Regleta 10 parells', 'lod2', {fs: 6.5});
  lab(1345, y(96), 'sangrat', 'lod3', {a: 'start', fs: 4.5, cls: 'muted'});
}

/* ---------- base d'accés terminal (BAT): placa frontal segons el tipus de presa ----------
   Coordenades absolutes (sense transform, perquè getBBox() del grup inclogui el dibuix).
   No es reflecteix al costat B: el TV queda sempre a l'esquerra del SAT. */
function rj45(p, cx, cy, w) {                      // connector RJ45 vist de cara (w = amplada)
  const k = w / 150, x0 = cx - 75 * k, y0 = cy - 72 * k, q = (x, y) => `${x0 + x * k},${y0 + y * k}`;
  R(p, x0, y0, x0 + 150 * k, y0 + 144 * k, 'batjack', {rx: 20 * k});
  mk('path', {d: 'M' + [[13, 14], [137, 14], [137, 88], [123, 88], [123, 110], [103, 110], [103, 123], [47, 123],
    [47, 110], [27, 110], [27, 88], [13, 88]].map(([x, y]) => q(x, y)).join('L') + 'Z', class: 'batjin'}, p);
  R(p, x0 + 25 * k, y0 + 24 * k, x0 + 125 * k, y0 + 46 * k, 'batpins');
  for (let i = 1; i < 8; i++) mk('line', {x1: x0 + (25 + i * 12.5) * k, y1: y0 + 26 * k, x2: x0 + (25 + i * 12.5) * k, y2: y0 + 44 * k, class: 'batpin'}, p);
}
function coaxF(p, cx, cy, r, male) {                // presa coaxial: TV (pin, mascle) o SAT (forat, femella)
  C(p, cx, cy, r, 'batjack');
  if (male) C(p, cx, cy, r * 0.3, 'batpinf'); else C(p, cx, cy, r * 0.36, 'batjin');
}
function drawBAT(g, cx, yy, ty, dbl) {
  R(g, cx - 9.5, yy + 1.5, cx + 9.5, yy + 16, 'bat', {rx: 2.6});
  const cy = yy + 8.75;
  if (ty === 'dat') {
    if (dbl) { rj45(g, cx - 4.3, cy, 7.6); rj45(g, cx + 4.3, cy, 7.6); }
    else rj45(g, cx, cy, 7.6);
  } else if (ty === 'rtv') {
    T(g, cx - 4.4, yy + 6.6, 'TV', 'battxt', {fs: 2.6}); T(g, cx + 4.4, yy + 6.6, 'SAT', 'battxt', {fs: 2.6});
    coaxF(g, cx - 4.4, yy + 10.8, 2.7, true); coaxF(g, cx + 4.4, yy + 10.8, 2.7, false);
  } else if (ty === 'tba') {
    coaxF(g, cx - 4.4, cy, 2.7, true); coaxF(g, cx + 4.4, cy, 2.7, false);
  } else if (ty === 'fo') {                         // adaptador SC/APC
    R(g, cx - 3.4, cy - 3.6, cx + 3.4, cy + 3.6, 'batjack', {rx: 0.6});
    mk('path', {d: `M${cx - 2.6},${cy - 2.5}H${cx - 0.9}V${cy - 3.2}H${cx + 0.9}V${cy - 2.5}H${cx + 2.6}V${cy + 2.8}H${cx - 2.6}Z`, class: 'batjin'}, g);
    C(g, cx, cy + 0.2, 1.35, 'batjin'); C(g, cx, cy + 0.2, 0.6, 'batjin');
  }
}

/* ---------- habitatge: accés, RTR i xarxa interior ---------- */
const PRESES2D = {   // posició dels registres de presa: x (costat A) i passadís (b = per terra, t = per sostre)
  rtv_cuina: [728, 'b'], dat_cuina: [766, 'b'], rtv_d2: [480, 'b'], dat_d2: [560, 'b'],
  dat2_sala: [200, 'b'], tba_sala: [246, 'b'], rtv_sala: [292, 'b'], dat_sala: [342, 'b'], fo_sala: [388, 'b'],
  rtv_d1: [462, 't'], dat_d1: [512, 't'], dat2_d1: [562, 't'], tba_d1: [606, 't']
};
function buildUnit(f, s) {
  const U = `${f}${s}`, t = TOP(f), m = s === 'B';
  const X = m ? MX : (x => x), P = ([x, d]) => [X(x), t + d];
  const side = m ? 'd' : 'e';
  // canalització secundària (4 × Ø25: RTV, fibra, parells, TBA) del registre secundari al RTR
  tubes(LY.canal, `cs_${U}`, X(790), t + 128, X(1030), t + 192, 4);
  mk('line', {x1: X(790), y1: t + 184, x2: X(1030), y2: t + 184, class: 'guide'}, LY.canal);
  lab(X(910), t + 122, 'Canalització secundària (4 × Ø25)', 'lod2', {fs: 6.5});
  lab(X(910), t + 202, 'RTV · fibra · parells · TBA (fil guia)', 'lod3', {fs: 4.2, cls: 'muted'});
  // RTR
  const rtr = G(LY.box, `rtr_${U}`, 'zone');
  R(rtr, X(690), t + 100, X(790), t + 232, 'rtr', {rx: 4});
  lab(X(740), t + 94, 'Registre de terminació de xarxa (RTR)', 'lod2', {fs: 6.5, fw: 700});
  lab(X(740), t + 175, 'RTR', 'lod0 big', {fs: 40, fw: 800});
  const a = m ? 'end' : 'start';
  // PAU de RTV (2 entrades, una carregada; 4 sortides)
  const pr = G(rtr, `pau_rtv_${U}`); R(pr, X(706), t + 106, X(770), t + 127, 'pau', {rx: 2});
  T(pr, X(732), t + 115, 'PAU RTV', 'modtxt', {fs: 5.5, fw: 700}); T(pr, X(732), t + 121.5, '2E · 4S', 'modtxt', {fs: 3.8});
  for (const d of [109, 113, 117, 121]) port(pr, X(706), t + d, 1.3);
  port(pr, X(752), t + 127, 1.3); port(pr, X(762), t + 127, 1.3);
  T(pr, X(762), t + 125, 'E', 'modtxt', {fs: 3}); T(pr, X(752), t + 125, 'EC', 'modtxt', {fs: 3});
  // PAU de fibra
  const pf = G(rtr, `pau_fo_${U}`); R(pf, X(720), t + 140, X(770), t + 162, 'pau', {rx: 2});
  T(pf, X(745), t + 150, 'PAU fibra', 'modtxt', {fs: 5.5, fw: 700}); T(pf, X(745), t + 157, '2 × SC/APC', 'modtxt', {fs: 3.8});
  port(pf, X(720), t + 151, 1.3);
  // PAU de parells: rosetes RJ45 + multiplexor
  const pp = G(rtr, `pau_pt_${U}`); R(pp, X(712), t + 166, X(770), t + 204, 'pau', {rx: 2});
  T(pp, X(741), t + 180, 'PAU parells', 'modtxt', {fs: 5.5, fw: 700}); T(pp, X(741), t + 187, 'roseta + multiplexor', 'modtxt', {fs: 3.6});
  for (let i = 0; i < 8; i++) port(pp, X(712), t + 169 + i * 4.4, 1.1);
  // PAU + repartidor de TBA (entrada lliure amb càrrega)
  const pb = G(rtr, `div_tba_${U}`); R(pb, X(724), t + 208, X(770), t + 226, 'pau', {rx: 2});
  T(pb, X(747), t + 219, 'PAU TBA', 'modtxt', {fs: 5, fw: 700});
  port(pb, X(724), t + 212, 1.2); port(pb, X(724), t + 222, 1.2);
  load(pb, X(770), t + 217, m ? 'left' : 'right');
  // registre de presa configurable (tub buit des del RTR)
  const rc = G(LY.box, `rconf_${U}`); R(rc, X(748), t + 42, X(782), t + 70, 'rp', {rx: 2});
  T(rc, X(765), t + 59, 'conf.', 'modtxt', {fs: 5});
  lab(X(765), t + 36, 'Registre configurable', 'lod3', {fs: 4.5});
  // xarxa de dispersió: des del registre secundari fins als PAU
  const tapX = (der, k) => (der === 1 ? 1080 : 1140) + (k === 'A' ? -20 : 20);
  if (!m) {
    cable(`xs_rtv_${U}`, [[[tapX(1, 'A'), t + 100], [tapX(1, 'A'), t + 131], [762, t + 131], [762, t + 127]]], 'coax');
    cable(`xs_rtv_${U}`, [[[tapX(2, 'A'), t + 100], [tapX(2, 'A'), t + 139], [752, t + 139], [752, t + 127]]], 'coax', {dash: '4 2', cls: 'reserva'});
    cable(`xs_fo_${U}`, [[1198, t + 104], [1198, t + 150], [720 + 50, t + 150]], 'fo', {w: 1.5});
    cable(`xs_pt_${U}`, [[1288, t + 118], [1288, t + 166], [776, t + 166], [776, t + 185], [770, t + 185]], 'pt', {w: 1.6});
  } else {
    cable(`xs_rtv_${U}`, [[[tapX(2, 'B'), t + 100], [tapX(2, 'B'), t + 135], [1534, t + 135], [1540, t + 131], [MX(762), t + 131], [MX(762), t + 127]]], 'coax');
    cable(`xs_rtv_${U}`, [[[tapX(1, 'B'), t + 100], [tapX(1, 'B'), t + 142], [1530, t + 142], [1536, t + 139], [MX(752), t + 139], [MX(752), t + 127]]], 'coax', {dash: '4 2', cls: 'reserva'});
    cable(`xs_fo_${U}`, [[1232, t + 104], [1232, t + 154], [1528, t + 154], [1534, t + 150], [MX(770), t + 150]], 'fo', {w: 1.5});
    cable(`xs_pt_${U}`, [[1312, t + 118], [1312, t + 170], [MX(776), t + 170], [MX(776), t + 185], [MX(770), t + 185]], 'pt', {w: 1.6});
  }
  // canalització interior (tubs en estrella, per terra i per sostre)
  const ci = `ci_${U}`;
  tubes(LY.canal, ci, X(180), t + 388, X(690), t + 422, 1, {cls: 'ci'});
  tubes(LY.canal, ci, X(646), t + 104, X(690), t + 422, 1, {cls: 'ci', vert: true});
  tubes(LY.canal, ci, X(450), t + 4, X(690), t + 28, 1, {cls: 'ci'});
  tubes(LY.canal, ci, X(646), t + 4, X(690), t + 104, 1, {cls: 'ci', vert: true});
  tubes(LY.canal, ci, X(762), t + 70, X(770), t + 100, 1, {cls: 'ci', vert: true});
  lab(X(300), t + 384, 'Canalització interior d\'usuari (tubs Ø20 en estrella)', 'lod2', {fs: 6.5, cls: 'muted'});
  // registre de pas de la canalització interior (paret sala / dormitori 2)
  const rpas = G(LY.box, `rpas_${U}`); R(rpas, X(410), t + 384, X(436), t + 424, 'regpas', {rx: 2});
  lab(X(423), t + 378, 'Registre de pas', 'lod3', {fs: 4.5});
  // registres de presa i BAT
  const rpY = {b: 344, t: 40};
  const ptype = k => k.split('_')[0].replace('2', '');
  for (const [k, [x, c]] of Object.entries(PRESES2D)) {
    const rp = G(LY.box, `rp_${k}_${U}`);
    const yy = t + rpY[c], ty = ptype(k);
    R(rp, X(x - 12), yy, X(x + 12), yy + 24, 'rp rp-' + ty, {rx: 2});
    drawBAT(G(rp, `bat_${k}_${U}`), X(x), yy, ty, k === 'dat_sala' || k === 'dat_d1');
    T(rp, X(x), yy + 21, {rtv: 'RTV', dat: 'RJ45', tba: 'TBA', fo: 'FO'}[ty], 'modtxt', {fs: 4.4, fw: 700});
  }
  // cables interiors: [xarxa, tecnologia, port del PAU, registre]
  const IC = [
    ['xi_rtv', 'coax', [706, 109], 'rtv_cuina'], ['xi_rtv', 'coax', [706, 113], 'rtv_sala'], ['xi_rtv', 'coax', [706, 117], 'rtv_d2'], ['xi_rtv', 'coax', [706, 121], 'rtv_d1'],
    ['xi_fo', 'fo', [720, 151], 'fo_sala'],
    ['xi_dat', 'pt', [712, 169], 'dat_sala', -4], ['xi_dat', 'pt', [712, 173.4], 'dat_sala', 4], ['xi_dat', 'pt', [712, 177.8], 'dat2_sala'],
    ['xi_dat', 'pt', [712, 182.2], 'dat_d1', -4], ['xi_dat', 'pt', [712, 186.6], 'dat_d1', 4], ['xi_dat', 'pt', [712, 191], 'dat2_d1'],
    ['xi_dat', 'pt', [712, 195.4], 'dat_cuina'], ['xi_dat', 'pt', [712, 199.8], 'dat_d2'],
    ['xi_tba', 'coax', [724, 212], 'tba_sala'], ['xi_tba', 'coax', [724, 222], 'tba_d1']
  ].map(([net, tech, p, rp, off]) => ({net, tech, p, rp, bx: PRESES2D[rp][0] + (off || 0) * 0.9, c: PRESES2D[rp][1]}));
  // per terra: primer la cuina (cap a la dreta); la resta, de la més propera a la més llunyana
  const bot = IC.filter(c => c.c === 'b'), top = IC.filter(c => c.c === 't');
  const cu = bot.filter(c => c.bx > 690).sort((a, b) => a.bx - b.bx), lf = bot.filter(c => c.bx < 690).sort((a, b) => b.bx - a.bx);
  // regles per evitar encreuaments: els carrils més fondos baixen més a la dreta; els cables de la cuina van cap a la dreta
  lf.forEach((c, i) => { c.lane = 393 + (cu.length + i) * 2.9; c.vx = 649 + i * 2.5; });
  cu.sort((a, b) => b.bx - a.bx).forEach((c, i) => { c.lane = 393 + (cu.length - 1 - i) * 2.9; c.vx = 670 + i * 2.5; });
  top.sort((a, b) => a.bx - b.bx).forEach((c, i) => { c.lane = 8 + i * 3.4; c.vx = 677 + (top.length - 1 - i) * 2.5; });
  for (const c of IC) {
    const yb = c.c === 'b' ? rpY.b + 24 : rpY.t;
    cable(`${c.net}_${U}`, [c.p, [c.vx, c.p[1]], [c.vx, c.lane], [c.bx, c.lane], [c.bx, yb]].map(P), c.tech, {w: 1.1, r: 2});
  }
  // equips d'usuari i cordons
  const eq = (id, x, y, w, h, txt) => { const g = G(LY.box, id, 'equip'); R(g, X(x - w / 2), t + y, X(x + w / 2), t + y + h, 'device', {rx: 3}); T(g, X(x), t + y + h / 2 + 3, txt, 'modtxt', {fs: 6, fw: 700}); return g; };
  const tv = eq(`tv_${U}`, 292, 250, 74, 44, 'TV'); R(tv, X(286), t + 294, X(298), t + 300, 'device');
  eq(`ont_${U}`, 388, 280, 30, 18, 'ONT'); eq(`router_${U}`, 342, 280, 34, 18, 'Router'); eq(`pc_${U}`, 512, 110, 46, 30, 'PC');
  const cord = (id, pts) => cable(id, pts.map(P), 'usr', {w: 0.9, cls: 'cord'});
  cord(`tv_${U}`, [[292, 300], [292, 344]]); cord(`ont_${U}`, [[388, 298], [388, 344]]); cord(`router_${U}`, [[337, 298], [337, 344]]);
  cord(`router_${U}`, [[359, 289], [373, 289]]); cord(`pc_${U}`, [[508, 110], [508, 64]]);
}

/* ---------- planta baixa: RITI, enllaç inferior, PEG i arqueta ---------- */
function buildRITI() {
  const t = TOP(0), x1 = 980, x2 = 1420, y1 = t + 120, y2 = GROUND;
  const riti = G(LY.box, 'riti', 'zone');
  R(riti, x1, y1, x2, y2, 'room-riti');
  R(riti, x1, y1, x2, y1 + 10, 'wall'); R(riti, x1, y1, x1 + 10, y2, 'wall'); R(riti, x2 - 10, y1, x2, y2, 'wall');
  lab(1200, y1 - 10, 'RITI · Recinte d\'instal·lacions de telecomunicació inferior', 'lod1', {fs: 15, fw: 700});
  lab(1200, y1 + 200, 'RITI', 'lod0 big', {fs: 70, fw: 800});
  // registre principal òptic
  const rf = G(riti, 'rp_fo'); R(rf, 1000, t + 168, 1160, t + 370, 'cabinet', {rx: 3});
  lab(1080, t + 162, 'Registre principal òptic', 'lod2', {fs: 8, fw: 700});
  const pf = G(rf, 'pi_fo');
  R(pf, 1012, t + 210, 1072, t + 352, 'odf', {rx: 2}); R(pf, 1088, t + 210, 1148, t + 352, 'odf', {rx: 2});
  for (let i = 0; i < 12; i++) { R(pf, 1018, t + 218 + i * 11, 1066, t + 224 + i * 11, 'adapt'); R(pf, 1094, t + 218 + i * 11, 1142, t + 224 + i * 11, 'adapt'); }
  for (let i = 0; i < 4; i++) mk('path', {d: `M1066,${t + 232 + i * 22} C1080,${t + 232 + i * 22} 1080,${t + 243 + i * 33} 1094,${t + 243 + i * 33}`, class: 'patch'}, pf);
  T(pf, 1042, t + 206, 'Repartidor entrada', 'modtxt', {fs: 5.5}); T(pf, 1118, t + 206, 'Panell sortida', 'modtxt', {fs: 5.5});
  lab(1080, t + 186, 'Punt d\'interconnexió òptic', 'lod3', {fs: 5.5});
  // registre principal de parells
  const rpt = G(riti, 'rp_pt'); R(rpt, 1240, t + 168, 1400, t + 370, 'cabinet', {rx: 3});
  lab(1320, t + 162, 'Registre principal de parells', 'lod2', {fs: 8, fw: 700});
  const pp = G(rpt, 'pi_pt');
  for (const [cx, n] of [[1282, 6], [1358, 5]]) for (let i = 0; i < n; i++) {
    R(pp, cx - 24, t + 214 + i * 24, cx + 24, t + 230 + i * 24, 'kroneblk', {rx: 1});
    for (let j = 0; j < 10; j++) mk('line', {x1: cx - 21 + j * 4.7, y1: t + 216 + i * 24, x2: cx - 21 + j * 4.7, y2: t + 228 + i * 24, class: 'kpin'}, pp);
  }
  for (let i = 0; i < 5; i++) mk('path', {d: `M1306,${t + 222 + i * 24} C1320,${t + 222 + i * 24 + 6} 1320,${t + 222 + i * 24 + 10} 1334,${t + 222 + i * 24}`, class: 'jumper'}, pp);
  T(pp, 1282, t + 206, 'Regletes entrada', 'modtxt', {fs: 5.5}); T(pp, 1358, t + 206, 'Regletes sortida', 'modtxt', {fs: 5.5});
  for (let i = 0; i < 5; i++) T(pp, 1388, t + 225 + i * 24, i < 4 ? `${ORD[i + 1]}` : 'res.', 'modtxt', {fs: 4, a: 'start'});
  lab(1320, t + 186, 'Punt d\'interconnexió de parells', 'lod3', {fs: 5.5});
  // canalització externa, PEG, enllaç inferior
  const ark = G(LY.box, 'arqueta'); R(ark, 30, GROUND + 26, 120, GROUND + 96, 'arqueta', {rx: 2}); R(ark, 26, GROUND - 2, 124, GROUND + 6, 'lid');
  lab(75, GROUND + 112, 'Arqueta d\'entrada', 'lod1', {fs: 12});
  tubes(LY.canal, 'canal_ext', 120, GROUND + 44, 150, GROUND + 76, 4);
  lab(110, GROUND + 140, 'Canalització externa (4 × Ø63)', 'lod2', {fs: 7, a: 'start'});
  const peg = G(LY.box, 'peg'); R(peg, 148, GROUND + 38, 166, GROUND + 82, 'peg', {rx: 2});
  lab(157, GROUND + 30, 'PEG', 'lod1', {fs: 12, fw: 700});
  tubes(LY.canal, 'canal_enllac_inf', 166, GROUND + 44, 600, GROUND + 76, 4);
  const rei = G(LY.box, 'reg_enllac_inf'); R(rei, 600, GROUND + 30, 660, GROUND + 90, 'regbox', {rx: 2});
  lab(630, GROUND + 106, 'Registre d\'enllaç inferior', 'lod2', {fs: 8});
  tubes(LY.canal, 'canal_enllac_inf', 660, GROUND + 44, 1046, GROUND + 76, 4);
  tubes(LY.canal, 'canal_enllac_inf', 1010, GROUND + 18, 1046, GROUND + 44, 4, {vert: true});
  lab(820, GROUND + 92, 'Canalització d\'enllaç inferior (4 × Ø63)', 'lod2', {fs: 8});
  // xarxes d'alimentació dels operadors
  cable('xal_fo', [[-60, GROUND + 52], [1018, GROUND + 52], [1018, t + 384], [1042, t + 384], [1042, t + 352]], 'fo', {w: 2});
  cable('xal_pt', [[-60, GROUND + 64], [1030, GROUND + 64], [1030, t + 400], [1282, t + 400], [1282, t + 352]], 'pt', {w: 3});
  lab(-50, GROUND + 46, 'Operadors →', 'lod1', {a: 'start', fs: 11});
  // sortides cap a la canalització principal
  cable('xd_fo', [[1118, t + 210], [1118, t + 168]], 'fo', {w: 2});
  cable('xd_pt', [[1358, t + 214], [1358, t + 168]], 'pt', {w: 3.2});
}
