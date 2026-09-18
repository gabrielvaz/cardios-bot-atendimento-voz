/**
 * O nome da atendente e a abertura dela.
 *
 * A migração é o que mais importa aqui: a persona vive no navegador de quem
 * usa, e sem ela a atendente continuaria se apresentando como Clara para todo
 * mundo que abriu a aplicação antes da troca.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { NOME_ATENDENTE, PERSONAS_ANTERIORES, PERSONA_PADRAO, montarPrompt } from "../lib/prompt";
import { CONFIG_PADRAO, migrar } from "../lib/config";

test("a atendente se chama Cora", () => {
  assert.equal(NOME_ATENDENTE, "Cora");
  assert.ok(PERSONA_PADRAO.startsWith("Você é a Cora,"));
});

test("a abertura pergunta como ajudar, não qual equipamento", () => {
  const passo = PERSONA_PADRAO.split("\n").find((l) => l.startsWith("1. "));
  assert.ok(passo, "o primeiro passo do atendimento sumiu");
  assert.ok(/como pode ajudar/i.test(passo), `veio: ${passo}`);
  assert.ok(!/pergunte (com|sobre) qual equipamento/i.test(passo));
});

test("os limites duros continuam na persona", () => {
  for (const trecho of ["3883-3010", "conduta clínica", "Nunca invente"]) {
    assert.ok(PERSONA_PADRAO.includes(trecho), `faltou "${trecho}"`);
  }
});

test("as personas antigas guardam o nome literal, não o de hoje", () => {
  // Se elas interpolassem NOME_ATENDENTE, diriam "Cora" e a comparação com o
  // texto salvo no navegador, que diz "Clara", nunca casaria.
  assert.equal(PERSONAS_ANTERIORES.length, 2);
  for (const antiga of PERSONAS_ANTERIORES) {
    assert.ok(antiga.startsWith("Você é a Clara,"), "a antiga tem que dizer Clara");
    assert.ok(!antiga.includes("Cora"));
  }
});

test("as duas aberturas antigas são as que existiram de verdade", () => {
  assert.ok(PERSONAS_ANTERIORES[0].includes("pergunte com qual equipamento o cliente está"));
  assert.ok(PERSONAS_ANTERIORES[1].includes("pergunte sobre qual equipamento a pessoa quer falar"));
});

test("persona antiga e intocada vira a nova", () => {
  for (const antiga of PERSONAS_ANTERIORES) {
    const migrada = migrar({ ...CONFIG_PADRAO, persona: antiga });
    assert.equal(migrada.persona, PERSONA_PADRAO);
  }
});

test("espaço em volta não impede a migração", () => {
  const migrada = migrar({ ...CONFIG_PADRAO, persona: `\n  ${PERSONAS_ANTERIORES[0]}  \n` });
  assert.equal(migrada.persona, PERSONA_PADRAO);
});

test("persona editada à mão nunca é tocada", () => {
  const minha = `${PERSONAS_ANTERIORES[0]}\n- Fale mais devagar com idosos.`;
  assert.equal(migrar({ ...CONFIG_PADRAO, persona: minha }).persona, minha);
});

test("a persona de hoje não é migrada de novo", () => {
  assert.equal(migrar({ ...CONFIG_PADRAO }).persona, PERSONA_PADRAO);
});

test("migrar não mexe no resto da configuração", () => {
  const antes = { ...CONFIG_PADRAO, chave: "sk-teste", voz: "coral", persona: PERSONAS_ANTERIORES[0] };
  const depois = migrar(antes);
  assert.equal(depois.chave, "sk-teste");
  assert.equal(depois.voz, "coral");
  assert.equal(depois.base, antes.base);
});

test("o prompt montado leva o nome novo", () => {
  const prompt = montarPrompt(PERSONA_PADRAO, "# Base\nnada");
  assert.ok(prompt.includes("Cora"));
  assert.ok(!prompt.includes("Clara"));
});
