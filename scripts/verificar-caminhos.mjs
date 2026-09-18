/**
 * Procura, no HTML já construído, caminho absoluto que não leva o `basePath`.
 *
 * Existe por causa de um bug que aconteceu de verdade: o logo era referenciado
 * como `src="/marca/logo-cardios.png"` e o Next emitia isso cru. Local o site
 * mora na raiz e funcionava; no GitHub Pages ele mora em
 * /cardios-bot-atendimento-voz e o logo virava um 404. É o pior tipo de bug,
 * o que só aparece em produção, e nenhum teste unitário o pegaria.
 *
 * Roda no workflow, depois do build. Uso:
 *   node scripts/verificar-caminhos.mjs out /cardios-bot-atendimento-voz
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const [, , pasta = "out", base = process.env.BASE_PATH ?? ""] = process.argv;

if (!base) {
  console.log("sem BASE_PATH, nada a verificar");
  process.exit(0);
}

async function htmls(dir) {
  const achados = [];
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) achados.push(...(await htmls(caminho)));
    else if (entrada.name.endsWith(".html")) achados.push(caminho);
  }
  return achados;
}

const arquivos = await htmls(pasta);
const problemas = [];

for (const arquivo of arquivos) {
  const html = await readFile(arquivo, "utf8");
  for (const [, atributo, valor] of html.matchAll(/(src|href)="(\/[^"]*)"/g)) {
    // `//` é protocolo relativo, e não é caminho deste site.
    if (valor.startsWith("//")) continue;
    if (valor.startsWith(`${base}/`) || valor === base) continue;
    problemas.push(`${arquivo}: ${atributo}="${valor}"`);
  }
}

if (problemas.length) {
  console.error(`Caminho absoluto sem o basePath "${base}". Em produção isto é 404:`);
  for (const p of problemas) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`${arquivos.length} páginas verificadas, todo caminho absoluto leva ${base}`);
