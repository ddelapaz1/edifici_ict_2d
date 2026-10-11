// Copia el bloc de dades (fitxes EL, TRAMS, TECHS…) de la versió 3D a js/dades.js.
// Ús: node tools/extreu_dades.js [ruta a edifici_ict/index.html]
const fs = require('fs'), path = require('path');
const src = process.argv[2] || path.join(__dirname, '..', '..', 'edifici_ict', 'index.html');
const html = fs.readFileSync(src, 'utf8');
const blocs = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (!blocs.length) throw new Error('No hi ha cap <script> de dades a ' + src);
const dades = blocs[0][1].trim();
new Function(dades + ';return EL;')();            // comprova que s'executa sense DOM
const cap = `/* Fitxer generat amb tools/extreu_dades.js a partir de la versió 3D (edifici_ict/index.html).\n   No l'editis a mà: canvia les fitxes al 3D i torna a executar l'eina. */\n`;
fs.writeFileSync(path.join(__dirname, '..', 'js', 'dades.js'), cap + dades + '\n');
console.log('js/dades.js actualitzat (' + Math.round(dades.length / 1024) + ' KB)');
