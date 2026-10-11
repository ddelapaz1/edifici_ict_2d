/* =====================================================================
   ADAPTACIÓ DE LES FITXES (js/dades.js, copiades del 3D) A L'EDIFICI 2D
   - Dos habitatges per planta (A a l'esquerra i B a la dreta): fora C i D.
   - Derivadors de RTV de 2 sortides.
   - Canalització secundària directa del registre secundari al RTR (sense registre de pas).
   - Vocabulari: «escomesa» en lloc d'«acometida».
   ===================================================================== */
'use strict';
(function () {
  const TXT = ['name', 'what', 'purpose', 'where', 'connects', 'example', 'confusion'];
  const fix = t => t
    .replace(/(\d[a-z]{1,2}) A, \1 B, \1 C i \1 D/g, '$1 A i $1 B')
    .replace(/\(A, B, C i D\)/g, '(A i B)')
    .replace(/quatre habitatges/g, 'dos habitatges')
    .replace(/\bAcometid(a|es)\b/g, (m, s) => s === 'a' ? 'Escomesa' : 'Escomeses')
    .replace(/\bacometid(a|es)\b/g, (m, s) => s === 'a' ? 'escomesa' : 'escomeses');
  const ord = f => ORD[f], FN = f => FLOORNAME(f).toLowerCase();

  // 1. només els habitatges A i B
  for (let i = UNITS.length - 1; i >= 0; i--) if (!'AB'.includes(UNITS[i].s)) UNITS.splice(i, 1);
  for (const id of Object.keys(EL)) {
    const e = EL[id];
    if ((e.unit && !UNIT(e.unit)) || /^(rps|csc)_/.test(id)) delete EL[id];
  }
  for (const e of Object.values(EL)) for (const k of ['links', 'children', 'nets', 'canals']) if (Array.isArray(e[k])) e[k] = e[k].filter(x => EL[x]);

  // 2. textos generals
  for (const e of Object.values(EL)) {
    for (const k of TXT) if (typeof e[k] === 'string') e[k] = fix(e[k]);
    if (Array.isArray(e.more)) e.more = e.more.map(fix);
    if (e.vt) for (const v of Object.values(e.vt)) for (const k of TXT) if (typeof v[k] === 'string') v[k] = fix(v[k]);
  }
  EL.xal_pt.example = EL.xal_pt.example.replace('3r C', '3r B');
  EL.ritu.where = 'No es representa a l\'esquema: aquest edifici té quatre plantes sobre la planta baixa (més de tres), per això té RITI i RITS.';

  for (const f of [1, 2, 3, 4]) {
    const A = `${ord(f)} A`, B = `${ord(f)} B`, t = TAPF[f];
    // 3. derivadors de 2 sortides
    Object.assign(EL[`deriv_${f}`], {
      name: `Derivadors de RTV de ${t.db} dB (punt de distribució) — ${FLOORNAME(f)}`,
      what: `Són dispositius passius, un per cada cable de distribució, que treuen una part del senyal cap als habitatges de la planta i deixen passar la resta cap avall. A l'esquema: derivadors de 2 sortides de la sèrie F, amb ${t.db} dB de pèrdua de derivació.`,
      connects: `Entrada i sortida de pas: cable de distribució. Sortides de derivació (dues): un cable cap al ${A} i un cap al ${B} per cada derivador; cada habitatge rep així dos coaxials, un de cada derivador.` +
        (f === 1 ? ' Com que és la darrera planta del recorregut, la sortida de pas s\'acaba amb una càrrega de 75 Ω.' : ` La sortida de pas continua cap a la ${FN(f - 1)}.`)
    });
    // 4. regleta de 10 parells: dos habitatges
    Object.assign(EL[`bucle_${f}`], {
      what: `És una regleta Krone de 10 parells on acaben els 10 parells extrets de la mànega de distribució (sangrat), que hi entren per sota. Per dalt en surten les escomeses de 2 parells del ${A} i del ${B}; els parells 5 a 10 queden lliures, de reserva.`,
      connects: 'Parells del sangrat de la mànega de 50 parells → regleta → cables d\'escomesa de 2 parells cap al PAU de cada habitatge (parells 1-2: A; 3-4: B; 5-10: reserva).'
    });
    // 5. canalització secundària directa fins al RTR (4 × Ø25, un tub per servei)
    for (const s of ['A', 'B']) {
      const U = `${f}${s}`, N = UNIT(U).name, side = s === 'A' ? 'esquerra' : 'dreta';
      Object.assign(EL[`cs_${U}`], {
        name: `Canalització secundària del ${N}`,
        what: 'Són quatre tubs de Ø25 mm, un per a cada servei (RTV, fibra òptica, parells o parells trenats i coaxial de TBA), que van des del registre secundari fins al registre de terminació de xarxa de l\'habitatge. Donen suport a la xarxa de dispersió.',
        purpose: 'Porten protegits els cables de dispersió des de la zona comuna fins a l\'entrada de l\'habitatge.',
        where: `${FLOORNAME(f)}: pel sostre del distribuïdor comú, des del registre secundari cap a la ${side}, travessen la paret i arriben al rebedor del ${N}.`,
        connects: 'Registre secundari → registre de terminació de xarxa. Pel tub de RTV hi passen els dos coaxials de dispersió; pel de fibra, l\'escomesa òptica; pel de parells, l\'escomesa de 2 parells; el de TBA queda de reserva amb fil guia.',
        example: `Si cal canviar l'escomesa de fibra del ${N}, s'estira pel seu tub des del registre secundari sense tocar els cables de l'altre habitatge.`,
        confusion: 'La canalització és el conducte que protegeix i allotja els cables; la xarxa són els cables i els elements de connexió. Com que cada costat del registre secundari només atén un habitatge, no cal cap registre de pas en aquest tram.'
      });
    }
  }
  // xarxes de dispersió: la seva canalització secundària és el tram directe
  for (const e of Object.values(EL)) if (/^xs_/.test(e.id) && e.unit) e.canals = [...new Set([...(e.canals || []).filter(x => EL[x]), `cs_${e.unit}`])];
})();
