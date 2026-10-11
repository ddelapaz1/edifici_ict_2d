# Guia per a agents · ICT esquema 2D

Web estàtica sense dependències ni *build*: scripts clàssics que comparteixen l'àmbit global.

- **Fitxes**: `js/dades.js` és una còpia generada del primer `<script>` de `../edifici_ict/index.html`. No l'editis:
  canvia el 3D i executa `node tools/extreu_dades.js`. No canviïs els `id` de `EL`.
- **Dibuix** (`js/esquema.js`): cada peça es crea amb `G(parent, id)`, `R()`, `cable()`, `tubes()`… que la registren a
  `REG[id]` amb `data-id` i `data-svc`. Els grups niats (RS → derivadors, RTR → PAU) defineixen què se selecciona
  segons el zoom. Capes: `bg`, `arch`, `canal`, `box`, `cab`, `lbl`, `ovl`.
- **Coordenades**: planta *f* amb el forjat a `FT(f)` i l'interior des de `TOP(f)` (424 d'alçada). Habitatge A amb x
  reals; B reflectit amb `MX(x) = 2400 − x`. Canalització principal a x 1170–1230 (`RISER`).
- **Cables**: camins ortogonals; l'ordre dels carrils de `buildUnit()` evita encreuaments a la xarxa interior.
- **Etiquetes**: `lab(x, y, text, lod)` amb `lod0 big` (vista general, s'amaga en apropar-se) i `lod1`–`lod3` (apareixen
  en apropar-se; llindars a `setView()` d'`app.js`).
- **Zones** (`ZONES` a `app.js`): RITS, RITI, `rs_f`, `rtr_U`; el primer clic des de lluny selecciona la zona i s'hi apropa.
- Textos de la interfície i comentaris en català. Comprova-ho amb `?debug` i la consola sense errors.
