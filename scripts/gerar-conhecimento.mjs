/**
 * Gera lib/conhecimento/dados.json a partir das fontes reais.
 *
 * Três fontes, nenhuma digitada à mão aqui:
 *   1. A Central de Ajuda publicada em https://v9q.github.io/faqcardios/. Os
 *      artigos vivem num <script id="faq-data"> na própria página.
 *   2. cardios-site/content/products.json, o catálogo condensado: a Cora
 *      precisa saber o que é cada produto, não o texto de marketing inteiro.
 *   3. scripts/contato.json, com telefones, endereço e políticas, extraídos do
 *      cardios-site e mantidos aqui porque lá vivem em TypeScript.
 *
 * Rode de novo sempre que o FAQ mudar: `npm run conhecimento`.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const FAQ_URL = "https://v9q.github.io/faqcardios/";
const CATALOGO = join(raiz, "..", "cardios-site", "content", "products.json");

async function lerFaq() {
  const local = process.env.FAQ_HTML;
  const html = local
    ? await readFile(local, "utf8")
    : await fetch(FAQ_URL).then((r) => {
        if (!r.ok) throw new Error(`FAQ respondeu ${r.status}`);
        return r.text();
      });
  const bloco = html.match(
    /<script[^>]*id=["']faq-data["'][^>]*>([\s\S]*?)<\/script>/,
  );
  if (!bloco) throw new Error("não achei o <script id=\"faq-data\"> na página");
  const categorias = JSON.parse(bloco[1]);
  return categorias.flatMap((c) =>
    c.artigos
      .filter((a) => !a.is_skeleton && a.body)
      .map((a) => ({
        id: a.id,
        categoria: a.categoria,
        produtos: a.produtos ?? [],
        titulo: a.titulo,
        volume: a.volume_suri ?? null,
        video: a.video ?? null,
        corpo: a.body.trim(),
      })),
  );
}

/** Uma linha por produto: o que é, para que serve e as specs que o suporte usa. */
function condensarProdutos(bruto) {
  const RELEVANTE = /garantia|anvisa|conectividade|compatibilidade|canais|capacidade|autonomia|alimenta|memória|bateria|software/i;
  return bruto.map((p) => ({
    nome: p.name,
    slug: p.slug,
    resumo: (p.tagline ?? "").replace(/\s+/g, " ").trim().slice(0, 240),
    tags: p.tags ?? [],
    specs: (p.specs ?? [])
      .filter((s) => RELEVANTE.test(s.k))
      .map((s) => `${s.k}: ${s.v}`),
  }));
}

const [faq, catalogoBruto, contato] = await Promise.all([
  lerFaq(),
  readFile(CATALOGO, "utf8").then(JSON.parse),
  readFile(join(raiz, "scripts", "contato.json"), "utf8").then(JSON.parse),
]);

const dados = {
  geradoEm: new Date().toISOString().slice(0, 10),
  fontes: [FAQ_URL, "cardios-site/content/products.json", "scripts/contato.json"],
  contato,
  produtos: condensarProdutos(catalogoBruto),
  faq,
};

const destino = join(raiz, "lib", "conhecimento", "dados.json");
await mkdir(dirname(destino), { recursive: true });
await writeFile(destino, JSON.stringify(dados, null, 1), "utf8");

const chars = JSON.stringify(dados).length;
console.log(
  `dados.json gravado: ${faq.length} artigos, ${dados.produtos.length} produtos, ` +
    `${chars.toLocaleString("pt-BR")} caracteres (~${Math.round(chars / 3.5).toLocaleString("pt-BR")} tokens)`,
);
