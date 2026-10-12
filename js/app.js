/* =====================================================================
   INTERACCIÓ: vista (zoom i desplaçament), selecció, fitxa, cerca i filtres
   ===================================================================== */
'use strict';
const $ = s => document.querySelector(s);
const svg = $('#esq'), stage = $('#stage');
const BOUNDS = VIEW2D.bounds;
const ZONES = new Set(VIEW2D.zones);
const S = {view: null, selected: null, related: false, svc: 'all', hist: [], anim: 0};
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const drawn = id => !!REG[id];

/* ---------- geometria ---------- */
const BB = {};
function bboxOf(id) {                              // caixa a coordenades del món (inclou els grups desplaçats)
  if (BB[id]) return BB[id];
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  const W0 = document.getElementById('world').getCTM().inverse();
  for (const n of REG[id] || []) {
    const b = n.getBBox();
    if (!b.width && !b.height) continue;
    const M = W0.multiply(n.getCTM());
    for (const [x, y] of [[b.x, b.y], [b.x + b.width, b.y + b.height]]) {
      const px = M.a * x + M.c * y + M.e, py = M.b * x + M.d * y + M.f;
      x1 = Math.min(x1, px); y1 = Math.min(y1, py); x2 = Math.max(x2, px); y2 = Math.max(y2, py);
    }
  }
  return BB[id] = isFinite(x1) ? {x: x1, y: y1, w: x2 - x1, h: y2 - y1} : null;
}
const aspect = () => stage.clientWidth / Math.max(1, stage.clientHeight);
const scale = () => stage.clientWidth / S.view.w;                   // píxels per unitat
function fit(b, pad = 0.06) {                                        // caixa → vista amb l'aspecte del visor
  const a = aspect(); let w = b.w * (1 + 2 * pad), h = b.h * (1 + 2 * pad);
  if (w / h > a) h = w / a; else w = h * a;
  return {x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h};
}
function clampView(v) {
  const a = aspect(), maxW = Math.max(BOUNDS.w, BOUNDS.h * a) * 1.25;
  const w = Math.min(Math.max(v.w, 70), maxW), h = w / a;
  const cx = Math.min(Math.max(v.x + v.w / 2, BOUNDS.x), BOUNDS.x + BOUNDS.w);
  const cy = Math.min(Math.max(v.y + v.h / 2, BOUNDS.y), BOUNDS.y + BOUNDS.h);
  return {x: cx - w / 2, y: cy - h / 2, w, h};
}
function setView(v) {
  if (!stage.clientWidth || !stage.clientHeight) { S.view = S.view || v; return; }   // visor ocult
  S.view = clampView(v);
  svg.setAttribute('viewBox', `${S.view.x} ${S.view.y} ${S.view.w} ${S.view.h}`);
  const k = scale();
  svg.classList.toggle('k1', k >= 0.55); svg.classList.toggle('k2', k >= 1.25);
  svg.classList.toggle('k3', k >= 2.6); svg.classList.toggle('kbig', k >= 0.6);
  updateCrumb();
}
function animateTo(v, dur = 650) {
  const a = S.view, b = clampView(v), t0 = performance.now(), id = ++S.anim;
  const ca = [a.x + a.w / 2, a.y + a.h / 2], cb = [b.x + b.w / 2, b.y + b.h / 2];
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) dur = 0;
  const step = now => {
    if (id !== S.anim) return;
    const t = dur ? Math.min(1, (now - t0) / dur) : 1, e = ease(t);
    const w = Math.exp(Math.log(a.w) + (Math.log(b.w) - Math.log(a.w)) * e);
    // el centre segueix el zoom perquè l'objectiu no surti de la vista
    const f = Math.abs(b.w - a.w) < 1 ? e : (a.w - w) / (a.w - b.w);
    const cx = ca[0] + (cb[0] - ca[0]) * f, cy = ca[1] + (cb[1] - ca[1]) * f;
    setView({x: cx - w / 2, y: cy - w / aspect() / 2, w, h: w / aspect()});
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function pushHist() { S.hist.push({...S.view}); if (S.hist.length > 30) S.hist.shift(); $('#zback').disabled = false; }
function goBack() { const v = S.hist.pop(); if (v) animateTo(v); $('#zback').disabled = !S.hist.length; }
function zoomBy(f, cx, cy) {
  const v = S.view; if (cx == null) { cx = v.x + v.w / 2; cy = v.y + v.h / 2; }
  setView({x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f, w: v.w * f, h: v.h * f});
}
const overview = () => fit(BOUNDS, 0.01);

/* zona on cau el centre de la vista (per a la barra d'ubicació) */
function updateCrumb() {
  const v = S.view, cx = v.x + v.w / 2, cy = v.y + v.h / 2, k = scale();
  $('#crumb').innerHTML = k < 0.45 ? '<b>Vista general</b> · clica un recinte o un registre per apropar-t\'hi' : VIEW2D.crumb(cx, cy);
  document.querySelectorAll('.zones button').forEach(b => b.classList.toggle('on', b.dataset.zone === 'general' && k < 0.45));
}

/* ---------- selecció ---------- */
/* Cadena d'elements sota el punter (de dins cap a fora). Si la vista encara no s'ha apropat a la zona
   (RITS, RITI, RS, RTR), el primer clic selecciona la zona; després, l'element més interior visible. */
function chainAt(target) {
  const chain = []; let n = target && target.closest && target.closest('[data-id]');
  while (n) { if (!chain.includes(n.dataset.id)) chain.push(n.dataset.id); n = n.parentElement && n.parentElement.closest('[data-id]'); }
  return chain;
}
function pick(target) {
  const chain = chainAt(target); if (!chain.length) return null;
  const k = scale(), cw = stage.clientWidth;
  for (let i = chain.length - 1; i >= 0; i--) {
    const id = chain[i], b = bboxOf(id);
    if (ZONES.has(id) && b && b.w * k < cw * 0.42 && i > 0) return id;
  }
  for (const id of chain) { const b = bboxOf(id); if (b && Math.max(b.w, b.h) * k >= 22) return id; }
  return chain[chain.length - 1];
}
function relatedOf(id) {
  const e = EL[id], s = new Set();
  for (const k of ['nets', 'canals', 'links', 'children']) for (const x of (e[k] || [])) if (EL[x]) s.add(x);
  if (e.parent) s.add(e.parent);
  for (const o of Object.values(EL)) if ((o.nets || []).includes(id) || (o.canals || []).includes(id) || (o.links || []).includes(id)) s.add(o.id);
  s.delete(id);
  for (const x of [...s]) if (EL[x].variant && EL[x].variant !== 'B') s.delete(x);
  return s;
}
function zoomTarget(id) {
  const b = bboxOf(id); if (!b) return null;
  const zone = ZONES.has(id), min = zone ? (id.startsWith('rtr') ? 380 : 0) : 230;
  const g = {x: b.x, y: b.y, w: Math.max(b.w, min), h: Math.max(b.h, min * 0.6)};
  g.x -= (g.w - b.w) / 2; g.y -= (g.h - b.h) / 2;
  return fit(g, zone ? 0.1 : 0.18);
}
function select(id, o = {}) {
  S.selected = id;
  if (id && o.zoom !== false && drawn(id)) {
    // no s'allunya si l'element ja es veu sencer a la vista actual (p. ex. un equip dins del registre)
    const v = zoomTarget(id), b = bboxOf(id), c = S.view;
    const inside = b.x >= c.x && b.y >= c.y && b.x + b.w <= c.x + c.w && b.y + b.h <= c.y + c.h;
    if (v && !(inside && v.w >= c.w * 0.85)) { pushHist(); animateTo(v); }
  }
  drawHighlights(true);
  renderInfo();
  try { history.replaceState(null, '', id ? '#' + id : location.pathname + location.search); } catch (e) {}
}
function hlRect(id, cls) {
  const b = bboxOf(id); if (!b) return;
  const p = Math.max(2, Math.min(8, Math.max(b.w, b.h) * 0.04));
  mk('rect', {x: b.x - p, y: b.y - p, width: b.w + 2 * p, height: b.h + 2 * p, rx: 3, class: 'hl ' + cls}, LY.ovl);
}
const isCable = id => (REG[id] || []).some(n => n.classList.contains('cable'));
function drawHighlights(pulse) {
  LY.ovl.replaceChildren();
  document.querySelectorAll('.cable.sel,.cable.rel').forEach(n => n.classList.remove('sel', 'rel'));
  const id = S.selected; if (!id || !drawn(id)) return;
  if (S.related) for (const r of relatedOf(id)) if (drawn(r)) {
    if (isCable(r)) REG[r].forEach(n => n.classList.contains('cable') && n.classList.add('rel'));
    else hlRect(r, 'rel');
  }
  if (isCable(id)) REG[id].forEach(n => n.classList.contains('cable') && n.classList.add('sel'));
  if (!isCable(id) || REG[id].some(n => !n.classList.contains('cable'))) hlRect(id, 'sel' + (pulse ? ' pulse' : ''));
}

/* ---------- fitxa ---------- */
const FAM_ICON = {xarxa: '〰', canal: '◯', recinte: '▣', punt: '●'};
function elData(id) { const e = EL[id]; return Object.assign({}, e, (e.vt || {}).B || {}); }
function chip(id) {
  const e = EL[id]; if (!e) return '';
  let t = e.name.split(' — ')[0]; if (e.sigla && !t.includes('(' + e.sigla)) t += ` (${e.sigla})`;
  if (e.unit && !e.parent) t += ` · ${unitTitle(UNIT(e.unit))}`;
  const nd = !drawn(id);
  return `<button class="chip${nd ? ' nd' : ''}" data-goto="${id}" title="${nd ? 'No es dibuixa a l\'esquema 2D' : 'Selecciona i apropa'}">${FAM_ICON[e.fam] || ''} ${esc(t)}</button>`;
}
function renderInfo() {
  const box = $('#info'), id = S.selected;
  if (!id) { box.innerHTML = VIEW2D.intro; return; }
  const e = elData(id), fam = FAMILIES[e.fam] || {name: ''};
  const loc = (e.unit ? `${unitTitle(UNIT(e.unit))} · ` : '') + (e.floor == null ? 'Diverses plantes (tram vertical)' : FLOORNAME(e.floor));
  const chainUp = []; let p = e.parent; while (p && EL[p]) { chainUp.push(p); p = EL[p].parent; }
  const rel = relatedOf(id), contains = (e.children || []).filter(x => EL[x] && !(EL[x].variant && EL[x].variant !== 'B'));
  const nets = [...rel].filter(x => EL[x].fam === 'xarxa'), cans = [...rel].filter(x => EL[x].fam === 'canal');
  const others = [...rel].filter(x => !['xarxa', 'canal'].includes(EL[x].fam) && !contains.includes(x) && !chainUp.includes(x));
  box.innerHTML = `<div class="card" aria-label="Fitxa de l'element seleccionat">
   <h2>${FAM_ICON[e.fam] || ''} ${esc(e.name)}${e.sigla ? ` <span class="muted">(${esc(e.sigla)})</span>` : ''}</h2>
   <span class="fambadge">${esc(fam.name)}</span><span class="fambadge zone">Zona ${esc(e.zone || '—')}</span>${drawn(id) ? '' : '<span class="fambadge no2d">No dibuixat a l\'esquema 2D</span>'}
   <p><b>Què és?</b> ${esc(e.what)}</p>
   <p><b>Per a què serveix?</b> ${esc(e.purpose)}</p>
   <p><b>On es troba?</b> ${esc(e.where)} <span class="muted small">(${esc(loc)})</span></p>
   ${chainUp.length ? `<div class="small"><b>Allotjat a:</b><div class="chips">${chainUp.map(chip).join('')}</div></div>` : ''}
   ${contains.length ? `<div class="small" style="margin-top:6px"><b>Allotja:</b><div class="chips">${contains.map(chip).join('')}</div></div>` : ''}
   <div class="actions">
    ${drawn(id) ? '<button data-act="zoom">Apropa</button>' : ''}
    <button data-act="rel" aria-pressed="${S.related}">${S.related ? 'Amaga' : 'Mostra'} les connexions</button>
    ${chainUp.length && drawn(chainUp[0]) ? `<button data-act="up">↑ ${esc(EL[chainUp[0]].sigla || EL[chainUp[0]].name.split(' (')[0].split(' — ')[0])}</button>` : ''}
    <button data-act="desel">Tanca</button>
   </div>
   <details class="more"><summary>Amplia la informació</summary>
    <dl><dt>Què connecta o què allotja</dt><dd>${esc(e.connects)}</dd>
    ${nets.length ? `<dt>Xarxes relacionades</dt><dd class="chips">${nets.map(chip).join('')}</dd>` : ''}
    ${cans.length ? `<dt>Canalitzacions relacionades</dt><dd class="chips">${cans.map(chip).join('')}</dd>` : ''}
    ${others.length ? `<dt>Altres elements relacionats</dt><dd class="chips">${others.map(chip).join('')}</dd>` : ''}
    </dl>
    ${e.example ? `<div class="ex"><b>Exemple pràctic:</b> ${esc(e.example)}</div>` : ''}
    ${e.confusion ? `<div class="cf"><b>Confusió habitual:</b> ${esc(e.confusion)}</div>` : ''}
    ${e.more ? `<div class="ex"><b>${esc(e.more[0])}:</b> ${esc(e.more[1])}</div>` : ''}
   </details></div>`;
  $('#panel').scrollTop = 0;
}
$('#panel').addEventListener('click', ev => {
  const g = ev.target.closest('[data-goto]'); if (g) { select(g.dataset.goto); return; }
  const a = ev.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act, id = S.selected;
  if (act === 'zoom') { const v = zoomTarget(id); if (v) { pushHist(); animateTo(v); } }
  else if (act === 'rel') { S.related = !S.related; drawHighlights(); renderInfo(); }
  else if (act === 'up') select(EL[id].parent);
  else if (act === 'desel') select(null);
});

/* ---------- punter: arrossegar, clicar, roda, pessic ---------- */
const ptrs = new Map(); let drag = null, hovId = null;
const toSvg = (cx, cy) => { const r = svg.getBoundingClientRect(), k = scale(); return [S.view.x + (cx - r.left) / k, S.view.y + (cy - r.top) / k]; };
svg.addEventListener('pointerdown', ev => {
  svg.setPointerCapture(ev.pointerId); ptrs.set(ev.pointerId, [ev.clientX, ev.clientY]);
  if (ptrs.size === 1) drag = {x: ev.clientX, y: ev.clientY, v: {...S.view}, moved: false, target: ev.target};
  else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; drag = {pinch: Math.hypot(a[0] - b[0], a[1] - b[1]), v: {...S.view}, mid: toSvg((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), moved: true}; }
  S.anim++;
});
svg.addEventListener('pointermove', ev => {
  if (!ptrs.has(ev.pointerId)) { hover(ev); return; }
  ptrs.set(ev.pointerId, [ev.clientX, ev.clientY]);
  if (!drag) return;
  if (drag.pinch && ptrs.size === 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), f = drag.pinch / d, v = drag.v, [mx, my] = drag.mid;
    setView({x: mx - (mx - v.x) * f, y: my - (my - v.y) * f, w: v.w * f, h: v.h * f});
    return;
  }
  const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; pushHist(); svg.classList.add('drag'); $('#tip').style.display = 'none'; }
  if (drag.moved) { const k = stage.clientWidth / drag.v.w; setView({...drag.v, x: drag.v.x - dx / k, y: drag.v.y - dy / k}); }
});
function endPtr(ev) {
  if (!ptrs.has(ev.pointerId)) return;
  ptrs.delete(ev.pointerId); svg.classList.remove('drag');
  if (drag && !drag.moved && !drag.pinch && ev.type === 'pointerup') { const id = pick(drag.target); if (id) select(id); }
  if (!ptrs.size) drag = null;
}
svg.addEventListener('pointerup', endPtr); svg.addEventListener('pointercancel', endPtr);
svg.addEventListener('pointerleave', () => { setHover(null); $('#tip').style.display = 'none'; });
// roda suau: el zoom s'acumula (en logaritme) i s'aplica a trossos a cada fotograma, al voltant del cursor
// molla amb esmorteïment crític (WZ.v, velocitat del zoom): arrenca i frena de manera progressiva
const WZ = {l: 0, v: 0, x: 0, y: 0, id: 0, t: 0, run: false}, WZW = 6, WZV = 1.2;   // rigidesa i velocitat màxima (log/s)
function wheelStep(now) {
  if (WZ.id !== S.anim) { WZ.l = WZ.v = 0; WZ.run = false; return; }   // una altra acció l'ha interromput
  const dt = Math.min((now - WZ.t) / 1000, 0.1); WZ.t = now;
  let p = 0;
  for (let i = 0, n = Math.ceil(dt / 0.004), h = dt / n; i < n; i++) {
    WZ.v += (WZW * WZW * WZ.l - 2 * WZW * WZ.v) * h; WZ.v = Math.max(-WZV, Math.min(WZV, WZ.v)); const q = WZ.v * h; WZ.l -= q; p += q;
  }
  if (Math.abs(WZ.l) < 2e-4 && Math.abs(WZ.v) < 2e-3) { p += WZ.l; WZ.l = WZ.v = 0; }
  const [cx, cy] = toSvg(WZ.x, WZ.y); zoomBy(Math.exp(p), cx, cy);
  if (WZ.l || WZ.v) requestAnimationFrame(wheelStep); else WZ.run = false;
}
svg.addEventListener('wheel', ev => {
  ev.preventDefault();
  const d = ev.deltaMode ? ev.deltaY * 30 : ev.deltaY, l = Math.max(-1, Math.min(1, d * (ev.ctrlKey ? 0.01 : 0.0022)));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { S.anim++; const [cx, cy] = toSvg(ev.clientX, ev.clientY); zoomBy(Math.exp(l), cx, cy); return; }
  if (WZ.id !== S.anim) WZ.l = WZ.v = 0; else if (Math.sign(l) !== Math.sign(WZ.l)) WZ.l = 0;
  WZ.id = ++S.anim; WZ.l = Math.max(-3, Math.min(3, WZ.l + l)); WZ.x = ev.clientX; WZ.y = ev.clientY;
  if (!WZ.run) { WZ.run = true; WZ.t = performance.now(); requestAnimationFrame(wheelStep); }
}, {passive: false});
svg.addEventListener('dblclick', ev => { ev.preventDefault(); const [cx, cy] = toSvg(ev.clientX, ev.clientY); pushHist(); const v = S.view, f = 0.5; animateTo({x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f, w: v.w * f, h: v.h * f}, 350); });
function setHover(id) {
  if (id === hovId) return;
  LY.ovl.querySelectorAll('.hl.hov').forEach(n => n.remove());
  document.querySelectorAll('.cable.hov').forEach(n => n.classList.remove('hov'));
  hovId = id; if (!id || id === S.selected) return;
  if (isCable(id)) REG[id].forEach(n => n.classList.add('hov')); else hlRect(id, 'hov');
}
function hover(ev) {
  if (matchMedia('(pointer: coarse)').matches) return;
  const id = pick(ev.target), tip = $('#tip');
  setHover(id);
  if (!id) { tip.style.display = 'none'; return; }
  const e = EL[id], r = stage.getBoundingClientRect();
  const zone = ZONES.has(id) && bboxOf(id).w * scale() < stage.clientWidth * 0.42;
  tip.innerHTML = `${esc(e.name)}${e.sigla && !e.name.includes('(' + e.sigla) ? ' (' + esc(e.sigla) + ')' : ''}<small>${zone ? 'Clica per apropar-t\'hi' : 'Clica per veure la fitxa'}</small>`;
  tip.style.display = 'block';
  const x = Math.min(ev.clientX - r.left + 14, r.width - tip.offsetWidth - 8), y = ev.clientY - r.top + 16;
  tip.style.left = x + 'px'; tip.style.top = (y + tip.offsetHeight > r.height ? y - tip.offsetHeight - 24 : y) + 'px';
}

/* ---------- botons, teclat, filtres i cerca ---------- */
$('#zin').onclick = () => { pushHist(); const v = S.view; animateTo({x: v.x + v.w * .2, y: v.y + v.h * .2, w: v.w * .6, h: v.h * .6}, 300); };
$('#zout').onclick = () => { pushHist(); const v = S.view; animateTo({x: v.x - v.w / 3, y: v.y - v.h / 3, w: v.w * 5 / 3, h: v.h * 5 / 3}, 300); };
$('#zfit').onclick = () => { pushHist(); animateTo(overview()); };
$('#zback').onclick = goBack;
document.querySelector('.zones').addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  const z = b.dataset.zone; pushHist();
  animateTo(z === 'general' ? overview() : fit(VIEW2D.zone(z), 0.02));
});
function applyFilter() {
  svg.querySelectorAll('.dim').forEach(n => n.classList.remove('dim'));
  document.querySelectorAll('#filter button').forEach(b => b.setAttribute('aria-pressed', b.dataset.svc === S.svc));
  if (S.svc === 'all') return;
  svg.querySelectorAll('[data-svc]').forEach(n => {
    const v = n.dataset.svc; if (v === 'all' || v === S.svc) return;
    if (n.parentElement.closest('.dim')) return;
    n.classList.add('dim');
  });
}
$('#filter').addEventListener('click', ev => { const b = ev.target.closest('button'); if (b) { S.svc = b.dataset.svc; applyFilter(); } });
document.addEventListener('keydown', ev => {
  if (ev.target.closest('input')) return;
  if (ev.key === 'Escape') { if (S.selected) select(null); else goBack(); }
  else if (ev.key === '0') $('#zfit').click();
  else if (ev.key === '+' || ev.key === '=') $('#zin').click();
  else if (ev.key === '-') $('#zout').click();
  else if (ev.key === 'Backspace') goBack();
});
// cerca
const norm = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const SEARCH = Object.values(EL).filter(e => drawn(e.id)).map(e => ({id: e.id, t: norm(e.name + ' ' + (e.sigla || '') + ' ' + e.id)}));
const q = $('#q'), qres = $('#qres'); let qsel = 0, qlist = [];
function showResults() {
  const words = norm(q.value.trim()).split(/\s+/).filter(Boolean);
  if (!words.length) { qres.hidden = true; return; }
  qlist = SEARCH.filter(s => words.every(w => s.t.includes(w))).slice(0, 30); qsel = 0;
  qres.innerHTML = qlist.length ? qlist.map((s, i) => { const e = EL[s.id]; return `<li role="option" data-i="${i}" aria-selected="${i === qsel}">${esc(e.name)}<small>${esc(e.unit ? unitTitle(UNIT(e.unit)) : e.floor == null ? 'Vertical' : FLOORNAME(e.floor))}</small></li>`; }).join('') : '<li class="muted">Cap resultat a l\'esquema 2D</li>';
  qres.hidden = false;
}
q.addEventListener('input', showResults);
q.addEventListener('keydown', ev => {
  if (qres.hidden) return;
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); qsel = (qsel + (ev.key === 'ArrowDown' ? 1 : -1) + qlist.length) % qlist.length; qres.querySelectorAll('li').forEach((l, i) => l.setAttribute('aria-selected', i === qsel)); }
  else if (ev.key === 'Enter' && qlist[qsel]) { select(qlist[qsel].id); qres.hidden = true; q.blur(); }
  else if (ev.key === 'Escape') { qres.hidden = true; }
});
qres.addEventListener('mousedown', ev => { const li = ev.target.closest('li[data-i]'); if (li) { ev.preventDefault(); select(qlist[+li.dataset.i].id); qres.hidden = true; q.blur(); } });
q.addEventListener('blur', () => setTimeout(() => qres.hidden = true, 150));

/* ---------- arrencada ---------- */
buildSchema(svg);
S.view = overview(); setView(S.view);
new ResizeObserver(() => { const c = S.view; setView({...c, h: c.w / aspect()}); }).observe(stage);
renderInfo();
const h = decodeURIComponent(location.hash.slice(1));
if (h && EL[h]) setTimeout(() => select(h), 50);
if (new URLSearchParams(location.search).has('debug')) window.__ICT2D = {REG, EL, S, select, bboxOf, setView, pick};
