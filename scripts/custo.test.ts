/**
 * O cálculo de custo é a única parte testável sem microfone, e é a que mais
 * dói se estiver errada: um erro aqui faz o teste interno parecer barato.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { custoPorMinuto, custoUSD, lerUso, somarUso, totalTokens, USO_ZERO, formatarUSD } from "../lib/custo";
import { montarPrompt, estimarTokens, BASE_PADRAO } from "../lib/prompt";
import { conhecimento } from "../lib/conhecimento";

/** Um `response.done` real: prompt grande em cache, pergunta em áudio, resposta em voz. */
const TURNO = {
  total_tokens: 14_820,
  input_tokens: 13_900,
  output_tokens: 920,
  input_token_details: {
    cached_tokens: 12_800,
    text_tokens: 13_000,
    audio_tokens: 900,
    cached_tokens_details: { text_tokens: 12_800, audio_tokens: 0 },
  },
  output_token_details: { text_tokens: 120, audio_tokens: 800 },
};

test("separa a entrada nas faixas de preço, descontando o cache", () => {
  const uso = lerUso(TURNO);
  assert.equal(uso.textoEntrada, 200);
  assert.equal(uso.textoEntradaCache, 12_800);
  assert.equal(uso.audioEntrada, 900);
  assert.equal(uso.audioEntradaCache, 0);
  assert.equal(uso.textoSaida, 120);
  assert.equal(uso.audioSaida, 800);
  assert.equal(totalTokens(uso), 14_820);
});

test("cobra cada faixa pelo seu preço", () => {
  const esperado =
    (200 * 4 + 12_800 * 0.4 + 900 * 32 + 120 * 16 + 800 * 64) / 1e6;
  assert.ok(Math.abs(custoUSD(lerUso(TURNO), "gpt-realtime") - esperado) < 1e-12);
});

test("o cache é o que segura o preço do prompt grande", () => {
  // Se os mesmos tokens de entrada fossem cobrados como texto novo, sem cache.
  const semCache = custoUSD(
    { ...lerUso(TURNO), textoEntrada: 13_000, textoEntradaCache: 0 },
    "gpt-realtime",
  );
  assert.ok(semCache > custoUSD(lerUso(TURNO), "gpt-realtime") * 1.5);
});

test("a mini sai bem mais barata que a grande no mesmo turno", () => {
  const uso = lerUso(TURNO);
  assert.ok(custoUSD(uso, "gpt-realtime-mini") < custoUSD(uso, "gpt-realtime") / 2);
});

test("usage ausente não quebra e não cobra", () => {
  assert.deepEqual(lerUso(undefined), USO_ZERO);
  assert.equal(custoUSD(lerUso(null), "gpt-realtime"), 0);
});

test("cache sem detalhe por modalidade cai primeiro no texto", () => {
  const uso = lerUso({
    input_token_details: { cached_tokens: 1_000, text_tokens: 900, audio_tokens: 300 },
  });
  assert.equal(uso.textoEntradaCache, 900);
  assert.equal(uso.audioEntradaCache, 100);
  assert.equal(uso.textoEntrada, 0);
  assert.equal(uso.audioEntrada, 200);
});

test("cache incoerente com o total não vira token negativo", () => {
  const uso = lerUso({
    input_token_details: {
      text_tokens: 100, audio_tokens: 0,
      cached_tokens_details: { text_tokens: 999 },
    },
  });
  assert.equal(uso.textoEntrada, 0);
  assert.equal(uso.textoEntradaCache, 100);
});

test("somar turnos acumula faixa a faixa", () => {
  const um = lerUso(TURNO);
  const dois = somarUso(um, um);
  assert.equal(dois.audioSaida, 1_600);
  assert.ok(Math.abs(custoUSD(dois, "gpt-realtime") - custoUSD(um, "gpt-realtime") * 2) < 1e-12);
});

test("centavo de conversa não vira US$ 0,00 na tela", () => {
  assert.equal(formatarUSD(0.0034), "US$ 0,0034");
  assert.notEqual(formatarUSD(0.0001), "US$ 0,00");
});

test("o prompt montado carrega a base inteira e cabe no contexto", () => {
  const prompt = montarPrompt("Você é a Cora.", BASE_PADRAO);
  assert.ok(prompt.includes("3883-3010"), "precisa do telefone do suporte");
  assert.ok(prompt.includes("BASE DE CONHECIMENTO"));
  for (const artigo of conhecimento.faq) {
    assert.ok(prompt.includes(artigo.titulo), `faltou o artigo ${artigo.id}`);
  }
  for (const produto of conhecimento.produtos) {
    assert.ok(prompt.includes(produto.nome), `faltou o produto ${produto.nome}`);
  }
  assert.ok(estimarTokens(prompt) < 30_000, "o prompt não pode encher o contexto sozinho");
});

test("a previsão por minuto usa as taxas da documentação", () => {
  // 30 s de fala do cliente a 10 tokens/s e 30 s da Cora a 20 tokens/s,
  // mais 4 turnos relendo um prompt de 12 mil tokens vindo do cache.
  const esperado = (300 * 32 + 600 * 64 + 4 * 12_000 * 0.4) / 1e6;
  assert.ok(Math.abs(custoPorMinuto("gpt-realtime", 12_000) - esperado) < 1e-12);
});

test("a previsão por minuto acompanha o tamanho do prompt", () => {
  assert.ok(custoPorMinuto("gpt-realtime", 24_000) > custoPorMinuto("gpt-realtime", 12_000));
});

test("a mini prevista fica bem abaixo da grande no mesmo minuto", () => {
  assert.ok(custoPorMinuto("gpt-realtime-mini", 12_000) < custoPorMinuto("gpt-realtime", 12_000) / 2);
});

test("um minuto de conversa fica na casa de centavos, não de dólares", () => {
  const usd = custoPorMinuto("gpt-realtime", 12_000);
  assert.ok(usd > 0.01 && usd < 0.5, `esperado centavos, veio ${usd}`);
});
