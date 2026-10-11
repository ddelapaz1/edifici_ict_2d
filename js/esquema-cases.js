/* =====================================================================
   ESQUEMA 2D DEL CONJUNT DE CASES ADOSSADES (cases.html)
   Secció longitudinal: cases 1 → 4 d'esquerra a dreta, soterrani comunitari a sota i, a l'extrem dret, el RITU amb
   la torre d'antenes. S'executa després de js/esquema.js i en substitueix buildSchema() i VIEW2D.
   Reutilitza les peces de l'edifici amb withShift(): l'habitatge (buildUnitArch/buildUnit, coordenades de la planta
   baixa de l'edifici), el RITS ampliat (buildRITS) i els registres principals del RITI (buildMainRegs).
   ===================================================================== */
'use strict';
const KH = {
  t: 576, gy: 1000,                                // interior de la planta baixa: de t a gy (= t + 424)
  golf: 330, roof: 300,                            // golfes (interior des de golf) i coberta
  base: 1416,                                      // terra del soterrani
  rx: 2650, ry: 300,                               // desplaçament del RITU (coordenades del RITS de l'edifici)
  rs: 1030,                                        // part de dalt dels registres secundaris
  cut: 4880                                        // mur del soterrani al tall del terreny
};
/* cases: lletra de l'habitatge de l'edifici, reflectida (RTR a l'esquerra), desplaçament i registre secundari */
const HOUSES = [
  {U: '0A', s: 'A', m: false, dx: 0, rs: 1, x1: 164, x2: 800},
  {U: '0D', s: 'D', m: true, dx: -786, rs: 1, x1: 814, x2: 1450},
  {U: '0C', s: 'C', m: false, dx: 1300, rs: 2, x1: 1464, x2: 2100},
  {U: '0B', s: 'B', m: true, dx: 514, rs: 2, x1: 2114, x2: 2750}
];
const RSX = {1: 807, 2: 2107};                     // eix de la mitgera de cada parella (centre del registre secundari)
const HX = h => x => h.m ? h.dx + 2400 - x : h.dx + x;   // x de l'habitatge A de l'edifici → x de l'esquema

function buildSchema(svg) {
  const world = mk('g', {id: 'world'}, svg);
  for (const k of ['bg', 'arch', 'canal', 'box', 'cab', 'lbl', 'ovl']) LY[k] = mk('g', {id: 'ly-' + k}, world);
  buildSiteC();
  for (const h of HOUSES) withShift(h.dx, KH.t - TOP(0), () => {
    buildUnitArch(0, h.s, {mirror: h.m, door: false, win: h.U === '0A' || h.U === '0B'});
    buildUnit(0, h.s, h.m);
  });
  buildRITU();
  buildMainC();
  for (const i of [2, 1]) buildRSC(i);
  for (const h of HOUSES) buildAccessC(h);
  buildEntryC();
}

/* ---------- terreny, soterrani, golfes i cobertes ---------- */
function buildSiteC() {
  const d = mk('defs', {}, LY.bg), gy = KH.gy;
  const sky = mk('linearGradient', {id: 'gSky', x1: 0, y1: 0, x2: 0, y2: 1}, d);
  mk('stop', {offset: 0, 'stop-color': '#DCEAF6'}, sky); mk('stop', {offset: 1, 'stop-color': '#F4F7FA'}, sky);
  const hatch = mk('pattern', {id: 'pEarth', width: 14, height: 14, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)'}, d);
  mk('rect', {width: 14, height: 14, fill: '#E9E1D3'}, hatch); mk('line', {x1: 0, y1: 0, x2: 0, y2: 14, stroke: '#D3C7B2', 'stroke-width': 3}, hatch);
  const conc = mk('pattern', {id: 'pSlab', width: 10, height: 10, patternUnits: 'userSpaceOnUse'}, d);
  mk('rect', {width: 10, height: 10, fill: '#C9C6C0'}, conc); mk('circle', {cx: 3, cy: 4, r: .9, fill: '#B3AFA8'}, conc); mk('circle', {cx: 8, cy: 8, r: .7, fill: '#B3AFA8'}, conc);
  const tile = mk('pattern', {id: 'pTile', width: 16, height: 10, patternUnits: 'userSpaceOnUse'}, d);
  mk('rect', {width: 16, height: 10, fill: '#B9583F'}, tile); mk('path', {d: 'M0,10 Q8,2 16,10', fill: 'none', stroke: '#93412D', 'stroke-width': 1.2}, tile);
  R(LY.bg, -1200, -1200, 6400, gy, null, {fill: 'url(#gSky)'});
  R(LY.bg, -1200, gy, 6400, 2600, null, {fill: 'url(#pEarth)'});
  // soterrani (aparcament) i rampa d'accés
  R(LY.arch, 140, gy + 16, KH.cut, KH.base, 'common');
  mk('polygon', {points: `-440,${gy} 140,${gy} 140,${KH.base}`, fill: '#F4F7FA'}, LY.arch);
  mk('polygon', {points: `-440,${gy} -440,${gy + 18} 140,${KH.base + 18} 140,${KH.base}`, class: 'slab'}, LY.arch);
  R(LY.arch, 140, KH.base, KH.cut + 20, KH.base + 18, 'slab');
  R(LY.arch, KH.cut, gy + 16, KH.cut + 20, KH.base, 'wall');
  lab(-150, gy + 150, 'Rampa d\'accés', 'lod1', {cls: 'muted', fs: 14, rot: 35});
  lab(1450, KH.base - 18, 'Aparcament comunitari (soterrani)', 'lod1', {cls: 'muted', fs: 16});
  const car = (x, y) => {                           // cotxes (decoratius)
    const g = mk('g', {class: 'deco'}, LY.arch);
    mk('path', {d: `M${x},${y} v-34 q4,-8 14,-10 l30,-4 q14,-24 46,-26 h70 q28,2 44,28 l26,4 q10,2 10,12 v30 z`}, g);
    for (const c of [x + 46, x + 196]) mk('circle', {cx: c, cy: y, r: 17}, g);
  };
  for (const x of [320, 1060, 1640, 2420, 3150]) car(x, KH.base - 18);
  // forjat de la planta baixa (sostre del soterrani), voreres i zona comuna del RITU
  R(LY.arch, 140, gy, KH.cut + 20, gy + 16, 'slab');
  R(LY.arch, -440, gy - 4, -380, gy + 2, 'pavement');
  R(LY.arch, 2764, gy - 3, KH.cut + 20, gy + 1, 'grass');
  R(LY.arch, KH.cut + 20, gy - 4, 5300, gy + 2, 'pavement');
  T(LY.lbl, 5200, gy - 14, 'Carrer', 'lbl lod1 muted', {fs: 14});
  lab(3060, gy - 16, 'Zona comuna del RITU', 'lod1', {cls: 'muted', fs: 13});
  // golfes, cobertes i parets de les cases
  for (const h of HOUSES) {
    R(LY.arch, h.x1, KH.golf, h.x2, KH.t - 16, 'private');
    lab((h.x1 + h.x2) / 2, KH.golf + 40, 'Golfes (traster)', 'lod1', {cls: 'room', fs: 13});
    for (const x of [h.x1 + 40, h.x2 - 150]) { const g = mk('g', {class: 'deco'}, LY.arch); R(g, x, KH.t - 76, x + 70, KH.t - 16, null); R(g, x + 20, KH.t - 110, x + 60, KH.t - 76, null); }
  }
  R(LY.arch, 140, KH.t - 16, 2774, KH.t, 'slab');
  mk('polygon', {points: `110,${KH.golf} 2804,${KH.golf} 2774,${KH.roof} 140,${KH.roof}`, fill: 'url(#pTile)', stroke: '#7E3A28', 'stroke-width': 1}, LY.arch);
  for (const [x1, x2] of [[150, 164], [800, 814], [1450, 1464], [2100, 2114], [2750, 2764]]) R(LY.arch, x1, KH.golf, x2, gy, 'wall');
  T(LY.lbl, -60, 470, 'Conjunt de\ncases adossades', 'lbl lod0 floorname', {a: 'middle', fs: 30, fw: 700});
  T(LY.lbl, -60, 548, 'golfes · planta baixa\nsoterrani comunitari', 'lbl lod0 muted', {a: 'middle', fs: 15});
}

/* ---------- RITU: RITS de l'edifici ampliat amb els registres principals i el d'enllaç inferior ---------- */
function buildRITU() {
  withShift(KH.rx, KH.ry, () => {
    buildRoof({parapet: false});
    buildRITS({x2: 2200, name: 'RITU', doorOut: true});
    const rits = REG.rits[0];
    const sub = mk('g', {transform: 'translate(660 0)'}, rits);
    withShift(660, 0, () => buildMainRegs(sub, 262));
    // registre d'enllaç inferior, a terra, al costat del registre principal de parells
    const rei = G(rits, 'reg_enllac_inf'); R(rei, 2066, 640, 2126, 696, 'regbox', {rx: 2});
    lab(2096, 708, 'Registre d\'enllaç inferior', 'lod2', {fs: 7});
    // xarxes d'alimentació: del registre d'enllaç a les regletes i al repartidor d'entrada
    cable('xal_pt', [[2110, 696], [2110, 635], [1942, 635], [1942, 614]], 'pt', {w: 3});
    cable('xal_fo', [[2080, 696], [2080, 638], [1702, 638], [1702, 614]], 'fo', {w: 2});
    // distribució: dels panells de sortida a la safata, paret avall i arran de terra fins a la canalització principal
    cable('xd_pt', [[2018, 476], [2018, 417], [1610, 417], [1610, 690], [1208, 690], [1208, 700]], 'pt', {w: 2.6, r: 5});
    cable('xd_fo', [[1778, 472], [1778, 421], [1622, 421], [1622, 694], [1220, 694], [1220, 700]], 'fo', {w: 2});
    cable('xd_rtv', [[[1455, 590], [1455, 662], [1170, 662], [1170, 700]], [[1495, 590], [1495, 670], [1174, 670], [1174, 700]]], 'coax', {w: 1.6});
    lab(1420, 686, 'fibra i parells per la safata i arran de terra', 'lod3', {fs: 5, cls: 'muted'});
  });
}

/* ---------- canalització principal (5 × Ø50) pel soterrani ---------- */
function buildMainC() {
  const y1 = KH.rs + 150, y2 = KH.rs + 200, xv = KH.rx + 1166;      // banda horitzontal i baixada del RITU
  tubes(LY.canal, 'canal_principal', xv, KH.gy, xv + 60, y2, 5, {vert: true});
  tubes(LY.canal, 'canal_principal', RSX[2] + 120, y1, xv + 60, y2, 5);
  tubes(LY.canal, 'canal_principal', RSX[1] + 120, y1, RSX[2] - 120, y2, 5);
  lab(3000, y1 - 10, 'Canalització principal (5 × Ø50 mm)', 'lod1', {fs: 13});
  lab(3000, y2 + 14, 'RTV · reserva · TBA · parells · fibra', 'lod2', {fs: 8, cls: 'muted'});
  lab(1457, y1 - 10, 'Canalització principal', 'lod1', {fs: 12});
  // cables de distribució entre el RITU i els registres secundaris (dins dels registres, a buildRSC)
  const xr = KH.rx, yr = KH.ry, a = RSX[2] + 120, b = RSX[1] + 120, c = RSX[2] - 120;
  cable('xd_rtv', [[[xr + 1170, yr + 700], [xr + 1170, KH.rs + 153], [a, KH.rs + 153]], [[xr + 1174, yr + 700], [xr + 1174, KH.rs + 157], [a, KH.rs + 157]],
    [[c, KH.rs + 153], [b, KH.rs + 153]], [[c, KH.rs + 157], [b, KH.rs + 157]]], 'coax', {w: 1.6});
  cable('xd_pt', [[[xr + 1208, yr + 700], [xr + 1208, KH.rs + 185], [a, KH.rs + 185]], [[c, KH.rs + 185], [b, KH.rs + 185]]], 'pt', {w: 2.6, r: 5});
  cable('xd_fo', [[[xr + 1220, yr + 700], [xr + 1220, KH.rs + 195], [a, KH.rs + 195]], [[c, KH.rs + 195], [b, KH.rs + 195]]], 'fo', {w: 2});
}

/* ---------- registre secundari (soterrani, sota la mitgera de cada parella de cases) ----------
   Equips apilats: derivador 1 (cable 1), derivador 2 (cable 2), caixa de segregació i regleta. Les sortides de cada
   equip van als costats i pugen als tubs de les dues cases sense creuar-se; les entrades arriben pel costat dret. */
function buildRSC(i) {
  const cx = RSX[i], y1 = KH.rs, P = (x, y) => [cx + x, y1 + y], last = i === 1;
  const rs = G(LY.box, `rs_${i}`, 'zone');
  R(rs, cx - 120, y1, cx + 120, y1 + 300, 'regsec', {rx: 4});
  lab(cx, y1 + 316, `Registre secundari ${i} · cases ${RSCASES[i]}`, 'lod1', {fs: 11, fw: 700});
  lab(cx, y1 + 190, `RS ${i}`, 'lod0 big', {fs: 60, fw: 800});
  // derivadors F 4D: E a la dreta, S a l'esquerra, derivacions 1 i 2 a dalt, 3 i 4 a baix amb càrrega
  const der = G(rs, `deriv_${i}`), db = TAPCASES[i].db;
  for (const [n, w, y, tx] of [[1, 32, 40, 19], [2, 52, 90, 45]]) {
    R(der, cx - w, y1 + y, cx + w, y1 + y + 24, 'deriv', {rx: 2});
    T(der, cx, y1 + y + 11, `Derivador ${n}`, 'modtxt', {fs: 6, fw: 700}); T(der, cx, y1 + y + 19, `${db} dB · 4D`, 'modtxt', {fs: 4.6});
    for (const s of [-1, 1]) {
      port(der, cx + s * tx, y1 + y); T(der, cx + s * tx, y1 + y + 5.5, s < 0 ? '1' : '2', 'modtxt', {fs: 3.6});
      port(der, cx + s * 8, y1 + y + 24); load(der, cx + s * 8, y1 + y + 24, 'down');
      port(der, cx + s * w, y1 + y + 12); T(der, cx + s * (w - 5), y1 + y + 14, s < 0 ? 'S' : 'E', 'modtxt', {fs: 3.6});
    }
    if (last) load(der, cx - w, y1 + y + 12, 'left');
  }
  // caixa de segregació de fibra
  const cs = G(rs, `cseg_${i}`); R(cs, cx - 30, y1 + 140, cx + 30, y1 + 190, 'cseg', {rx: 3});
  mk('ellipse', {cx, cy: y1 + 156, rx: 18, ry: 7, class: 'fibrecoil'}, cs);
  for (let k = 0; k < 3; k++) R(cs, cx - 22, y1 + 167 + k * 6, cx + 22, y1 + 171 + k * 6, 'tray2');
  lab(cx, y1 + 136, 'Caixa de segregació', 'lod2', {fs: 6});
  // punt de distribució de parells: regleta de 10 parells
  const bl = G(rs, `bucle_${i}`); R(bl, cx - 20, y1 + 214, cx + 20, y1 + 292, 'regleta', {rx: 2});
  for (let k = 0; k < 10; k++) { R(bl, cx - 15, y1 + 219 + k * 6.3, cx + 15, y1 + 222.5 + k * 6.3, 'krone'); T(bl, cx, y1 + 222 + k * 6.3, k + 1, 'modtxt', {fs: 3}); }
  lab(cx, y1 + 210, 'Regleta 10 parells', 'lod2', {fs: 6});
  // distribució: entra pel costat dret i, al registre 2, continua cap al registre 1 pel costat esquerre
  const segs = (list) => list.map(s => s.map(([x, y]) => P(x, y)));
  cable('xd_rtv', segs([[[120, 153], [110, 153], [110, 52], [32, 52]], [[120, 157], [100, 157], [100, 102], [52, 102]]]
    .concat(last ? [] : [[[-32, 52], [-110, 52], [-110, 153], [-120, 153]], [[-52, 102], [-100, 102], [-100, 157], [-120, 157]]])), 'coax', {w: 1.6});
  cable('xd_fo', segs([[[120, 195], [84, 195], [84, 180], [30, 180]]].concat(last ? [] : [[[-30, 180], [-84, 180], [-84, 195], [-120, 195]]])), 'fo', {w: 2});
  cable('xd_pt', segs([[[120, 185], [92, 185], [92, 286], [last ? 20 : -92, 286]].concat(last ? [] : [[-92, 185], [-120, 185]])]), 'pt', {w: 2.6, r: 5});
  if (last) { const cap = G(LY.cab, 'xd_pt'); R(cap, cx + 20, y1 + 283, cx + 26, y1 + 289, 'loadcap', {rx: 1}); }
  lab(cx + 60, y1 + 298, 'sangrat', 'lod3', {fs: 4.5, cls: 'muted'});
}

/* ---------- canalització secundària (3 × Ø25) i dispersió fins al RTR de cada casa ---------- */
function buildAccessC(h) {
  const U = h.U, X = HX(h), t = KH.t, cx = RSX[h.rs], s = h.m ? 1 : -1, y1 = KH.rs;
  // tubs: del registre secundari, pel sostre del soterrani i per dins de la mitgera, fins al RTR
  tubes(LY.canal, `cs_${U}`, X(779), t + 232, X(797), y1, 3, {vert: true});
  mk('line', {x1: X(794), y1: t + 232, x2: X(794), y2: y1, class: 'guide'}, LY.canal);
  if (!h.m) lab(cx + 2, t + 312, 'Canalització secundària (3 × Ø25 per casa)', 'lod2', {fs: 6, rot: -90});
  lab(X(788), t + 246, 'fibra i parells · RTV · TBA', 'lod3', {fs: 3.2, cls: 'muted'});
  // cables: [xarxa, tecnologia, camí dins del registre (x del costat esquerre), x al tub (A), alçada del gir, port del PAU]
  const sx = x => cx + (s < 0 ? x : -x);
  const C = [
    ['xs_rtv', 'coax', [[-19, 40]], 788, 131, [[762, 131], [762, 127]], {}],
    ['xs_rtv', 'coax', [[-45, 90], [-45, 28], [-21, 28]], 786, 139, [[752, 139], [752, 127]], {dash: '4 2', cls: 'reserva'}],
    ['xs_fo', 'fo', [[-30, 150], [-55, 150], [-55, 20], [-23, 20]], 784, 150, [[770, 150]], {w: 1.5}],
    ['xs_pt', 'pt', [[-20, 232], [-65, 232], [-65, 12], [-25, 12]], 782, 185, [[770, 185]], {w: 1.6}]
  ];
  for (const [net, tech, rsPath, xb, turn, end, o] of C) {
    const pts = rsPath.map(([x, y]) => [sx(x), y1 + y]);
    pts.push([X(xb), y1], [X(xb), t + turn], ...end.map(([x, y]) => [X(x), t + y]));
    cable(`${net}_${U}`, pts, tech, o);
  }
}

/* ---------- entrada dels operadors: arqueta, canalització externa, PEG i enllaç inferior ---------- */
function buildEntryC() {
  const gy = KH.gy, xr = KH.rx, x0 = KH.cut;
  const ark = G(LY.box, 'arqueta'); R(ark, x0 + 110, gy + 26, x0 + 200, gy + 96, 'arqueta', {rx: 2}); R(ark, x0 + 106, gy - 2, x0 + 204, gy + 6, 'lid');
  lab(x0 + 155, gy + 112, 'Arqueta d\'entrada', 'lod1', {fs: 12});
  tubes(LY.canal, 'canal_ext', x0 + 20, gy + 44, x0 + 110, gy + 76, 4);
  lab(x0 + 66, gy + 140, 'Canalització externa (4 × Ø63)', 'lod2', {fs: 7});
  const peg = G(LY.box, 'peg'); R(peg, x0 + 1, gy + 38, x0 + 19, gy + 82, 'peg', {rx: 2});
  lab(x0 + 10, gy + 30, 'PEG', 'lod1', {fs: 12, fw: 700});
  tubes(LY.canal, 'canal_enllac_inf', xr + 2066, gy + 44, x0, gy + 76, 4);
  tubes(LY.canal, 'canal_enllac_inf', xr + 2066, KH.ry + 696, xr + 2126, gy + 44, 4, {vert: true});
  lab(xr + 2140, gy + 96, 'Canalització d\'enllaç inferior (4 × Ø63)', 'lod2', {fs: 7, a: 'start'});
  cable('xal_pt', [[5300, gy + 56], [xr + 2110, gy + 56], [xr + 2110, KH.ry + 696]], 'pt', {w: 3});
  cable('xal_fo', [[5300, gy + 66], [xr + 2080, gy + 66], [xr + 2080, KH.ry + 696]], 'fo', {w: 2});
  lab(5290, gy + 46, '← Operadors', 'lod1', {a: 'end', fs: 11});
}

/* ---------- paràmetres de la vista ---------- */
Object.assign(VIEW2D, {
  bounds: {x: -460, y: -20, w: 5780, h: 1500},
  zones: ['rits', 'rs_1', 'rs_2', ...UNITS.map(u => 'rtr_' + u.id)],
  crumb(cx, cy) {
    if (cy > KH.gy + 8) {
      const r = [1, 2].find(i => Math.abs(cx - RSX[i]) < 160);
      return `<b>Soterrani</b> · ${r ? `registre secundari ${r} (cases ${RSCASES[r]})` : 'aparcament i canalització principal'}`;
    }
    if (cx > 2780) return '<b>Zona del RITU</b> · RITU, torre i antenes';
    const h = HOUSES.find(h => cx < h.x2 + 7) || HOUSES[3];
    return `<b>${unitTitle(UNIT(h.U))}</b> · ${cy < KH.t ? 'golfes' : 'planta baixa'} (zona privada)`;
  },
  zone(z) {
    if (z === 'ritu') return {x: 2800, y: -20, w: 2500, h: 1100};
    if (z === 'soterrani') return {x: -460, y: 990, w: 5780, h: 450};
    const h = HOUSES.find(h => h.U === z);
    return {x: h.x1 - 30, y: KH.golf - 10, w: h.x2 - h.x1 + 60, h: KH.gy - KH.golf + 330};
  },
  intro: `<div class="card"><h2>Esquema 2D de la ICT · cases adossades</h2>
   <p class="small">Secció longitudinal d'un conjunt de <b>quatre cases adossades</b> amb aparcament soterrani comunitari. A la dreta, el <b>RITU</b> (recinte únic: fa de RITI i de RITS alhora) amb la torre d'antenes, la capçalera de RTV i els registres principals dels operadors. La <b>canalització principal</b> baixa al soterrani i arriba als dos <b>registres secundaris</b>, un sota la mitgera de cada parella de cases; d'allà, la canalització secundària puja fins al <b>registre de terminació de xarxa</b> (RTR) de cada casa.</p>
   <p class="small"><b>Clica</b> un recinte o un registre per apropar-t'hi; un cop a dins, clica'n els equips, els cables o els tubs per veure'n la fitxa. També pots fer servir la roda del ratolí (o pessigar), arrossegar, <kbd>+</kbd> <kbd>−</kbd>, <kbd>0</kbd> (vista general) i <kbd>Esc</kbd>.</p>
   <div class="zonebtns">
    <button data-goto="rits">▣ RITU</button><button data-goto="rs_2">▣ Registre secundari</button>
    <button data-goto="rtr_0C">▣ RTR d'una casa</button><button data-goto="capcalera">● Capçalera de RTV</button>
    <button data-goto="canal_principal">◯ Canalització principal</button><button data-goto="torre">● Torre d'antenes</button>
   </div></div>
   <div class="card small"><b>Recorregut del senyal</b>
    <p style="margin:4px 0 0">Antenes → RITU (capçalera) → <span style="color:#C2185B">distribució coaxial</span> pel soterrani → derivadors del registre secundari → <span style="color:#C2185B">dispersió</span> → PAU del RTR → xarxa interior → presa (BAT).</p>
    <p style="margin:4px 0 0">Operadors → arqueta → PEG → enllaç inferior → RITU (punts d'interconnexió) → <span style="color:#0AA5C2">fibra</span> i <span style="color:#8D6E1F">parells</span> pel soterrani → registre secundari → RTR.</p></div>`
});
