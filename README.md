# ICT · Esquema 2D de l'edifici

Versió 2D de [ICT · Explora l'edifici](../edifici_ict/) (simulador 3D). Mostra la ICT (RD 346/2011) com una secció
vertical de l'edifici:

- **Coberta**: torreta de gelosia de 175 mm i antenes (TDT, DAB, FM, parabòlica), canalització d'enllaç superior i **RITS** amb la capçalera de
  monocanals T12, el mesclador i les instal·lacions del recinte.
- **Plantes 4a → 1a**: **registre secundari** al distribuïdor comú (derivadors de RTV, caixa de segregació de fibra i
  regleta de 10 parells) i, a cada costat, un tram de **canalització secundària** (4 × Ø25) fins al
  **registre de terminació de xarxa** (RTR) de l'habitatge A (esquerra) i B (dreta): dos habitatges per planta, amb la xarxa interior fins a les preses.
- **Planta baixa**: arqueta, PEG, canalització d'enllaç inferior i **RITI** (punts d'interconnexió òptic i de parells).

## Com es fa servir

- Clica un recinte o un registre (RITS, RS, RTR, RITI): la vista s'hi apropa. Un cop a dins, clica'n els equips, els
  cables o els tubs per veure'n la fitxa.
- Roda del ratolí o pessic per fer zoom; arrossega per desplaçar-te. `+` `−` `0` (vista general), `Esc`, `⌫` (vista anterior).
- Botons de zona (RITS, 4a… 1a, RITI), filtre per servei i cerca d'elements.
- Enllaç directe a un element: `index.html#id` (p. ex. `#rs_3`, `#rtr_2B`, `#capcalera`).
- Les etiquetes apareixen segons el nivell de zoom (més detall com més a prop).

## Executar

Obre `index.html` o serveix la carpeta: `python3 -m http.server 8766` → <http://localhost:8766>.
Amb `?debug` hi ha `window.__ICT2D` (`select(id)`, `setView({x,y,w,h})`, `REG`, `EL`).

## Estructura

| Fitxer | Contingut |
|---|---|
| `index.html` | Interfície |
| `css/estils.css` | Estils de la interfície i de l'SVG |
| `js/dades.js` | Fitxes dels elements (`EL`, `UNITS`, `TAPF`…). **Generat** des del 3D |
| `js/dades2d.js` | Adapta les fitxes a l'edifici 2D: dos habitatges per planta, derivadors de 2 sortides, canalització secundària directa al RTR i «escomesa» |
| `js/esquema.js` | Dibuix de l'esquema (SVG generat per codi) |
| `js/app.js` | Zoom, selecció, fitxa, cerca i filtres |
| `tools/extreu_dades.js` | Copia el bloc de dades de `../edifici_ict/index.html` a `js/dades.js` |

Per actualitzar les fitxes després de canviar-les al 3D: `node tools/extreu_dades.js`.
