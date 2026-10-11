# Guia per a agents · ICT esquema 2D

Web estàtica sense dependències ni *build*: scripts clàssics que comparteixen l'àmbit global.

- **Dos models**: `index.html` (edifici) i `cases.html` (cases adossades amb RITU, `data-model="cases"`).
- **Fitxes**: `js/dades.js` i `js/dades-cases.js` són còpies generades de `../edifici_ict/js/`. No les editis:
  canvia el 3D i executa `node tools/extreu_dades.js`. No canviïs els `id` de `EL`. `js/dades2d.js` només és de l'edifici.
- **Dibuix** (`js/esquema.js`): cada peça es crea amb `G(parent, id)`, `R()`, `cable()`, `tubes()`… que la registren a
  `REG[id]` amb `data-id` i `data-svc`. Els grups niats (RS → derivadors, RTR → PAU) defineixen què se selecciona
  segons el zoom. Capes: `bg`, `arch`, `canal`, `box`, `cab`, `lbl`, `ovl`.
- **Coordenades**: planta *f* amb el forjat a `FT(f)` i l'interior des de `TOP(f)` (424 d'alçada). Habitatge A amb x
  reals; B reflectit amb `MX(x) = 2400 − x`. Canalització principal a x 1170–1230 (`RISER`).
- **Cables**: camins ortogonals; l'ordre dels carrils de `buildUnit()` evita encreuaments a la xarxa interior.
- **Etiquetes**: `lab(x, y, text, lod)` amb `lod0 big` (vista general, s'amaga en apropar-se) i `lod1`–`lod3` (apareixen
  en apropar-se; llindars a `setView()` d'`app.js`).
- **Zones** (`VIEW2D.zones`): RITS, RITI, `rs_f`, `rtr_U`; el primer clic des de lluny selecciona la zona i s'hi apropa.
  `VIEW2D` (al final d'`esquema.js`) també té els límits, la barra d'ubicació, els botons de zona i el text d'inici.
- **Cases** (`js/esquema-cases.js`): redefineix `buildSchema()` i amplia `VIEW2D`. Reutilitza les peces de l'edifici
  amb `withShift(dx, dy, fn)` (capes desplaçades): `buildUnitArch`/`buildUnit` (habitatge A de la planta baixa,
  reflectit amb `mirror`), `buildRoof` + `buildRITS({x2, name:'RITU'})` i `buildMainRegs` (registres del RITI dins
  del RITU). `HOUSES`, `RSX` i `KH` en fixen la disposició. `bboxOf()` té en compte les transformacions.
- Textos de la interfície i comentaris en català. Comprova-ho amb `?debug` i la consola sense errors.
