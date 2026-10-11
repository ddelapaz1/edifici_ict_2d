// Copia les dades de la versió 3D (fitxes EL, TRAMS, TECHS…) a js/dades.js i js/dades-cases.js.
// Ús: node tools/extreu_dades.js [ruta a la carpeta edifici_ict]
const fs = require('fs'), path = require('path');
const src = process.argv[2] || path.join(__dirname, '..', '..', 'edifici_ict');
const cap = f => `/* Fitxer generat amb tools/extreu_dades.js a partir de la versió 3D (edifici_ict/js/${f}).\n   No l'editis a mà: canvia les fitxes al 3D i torna a executar l'eina. */\n`;
const doc = model => ({documentElement: {dataset: {model}}});
const llegeix = f => fs.readFileSync(path.join(src, 'js', f), 'utf8');
const dades = llegeix('dades.js'), cases = llegeix('dades-cases.js');
// comprova que s'executen sense més DOM que l'atribut data-model
new Function('document', dades + ';return EL;')(doc('edifici'));
new Function('document', dades + '\n' + cases + ';return EL;')(doc('cases'));
for (const [f, txt] of [['dades.js', dades], ['dades-cases.js', cases]]) {
  fs.writeFileSync(path.join(__dirname, '..', 'js', f), cap(f) + txt.trim() + '\n');
  console.log(`js/${f} actualitzat (${Math.round(txt.length / 1024)} KB)`);
}
