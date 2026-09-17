/**
 * O dicionário é regex sobre a fala de outra pessoa: errar aqui não dá erro,
 * dá texto estragado em silêncio. Os testes que importam são os de falso
 * positivo, não os de acerto.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DICIONARIO_PADRAO, aplicarDicionario, compilarDicionario,
  promptDeTranscricao, separarVariantes, type Termo,
} from "../lib/dicionario";

const padrao = compilarDicionario(DICIONARIO_PADRAO);
const corrigir = (texto: string) => aplicarDicionario(texto, padrao);

test("corrige os erros que o usuário relatou", () => {
  assert.equal(corrigir("o sistema cardioonline"), "o sistema Cardioline");
  assert.equal(corrigir("liguei para a Cardius"), "liguei para a Cardios");
});

test("corrige nome de equipamento partido pelo reconhecimento", () => {
  assert.equal(corrigir("meu cardio light apita"), "meu CardioLight apita");
  assert.equal(corrigir("instalei o cardio net"), "instalei o CardioNet");
  assert.equal(corrigir("uso o cardio smart 550"), "uso o CardioSmart 550");
  assert.equal(corrigir("o dina mapa não conecta"), "o Dyna-MAPA não conecta");
});

test("tolera hífen e espaço a mais, como o reconhecimento produz", () => {
  assert.equal(corrigir("cardio-light"), "CardioLight");
  assert.equal(corrigir("e  c  g"), "ECG");
});

test("normaliza a caixa sem precisar listar cada variação", () => {
  assert.equal(corrigir("CARDIOLINE e cardioline"), "Cardioline e Cardioline");
});

test("variante minúscula casa em qualquer caixa", () => {
  assert.equal(corrigir("Cardio Online"), "Cardioline");
});

/* Os que importam: o que NÃO pode ser tocado. */

test("não destrói palavra legítima do português", () => {
  const frases = [
    "o roteador da sala caiu",
    "o sistema alterna entre os canais",
    "vou voltar amanhã",
    "fiz um eletro de repouso",
    "a bateria alterna a carga",
  ];
  for (const frase of frases) assert.equal(corrigir(frase), frase);
});

test("variante capitalizada só casa capitalizada", () => {
  // "Router" foi o modelo ouvindo Holter; "roteador" minúsculo é o aparelho.
  assert.equal(corrigir("o Router do paciente"), "o Holter do paciente");
  assert.equal(corrigir("o roteador da recepção"), "o roteador da recepção");
});

test("não casa no meio de outra palavra", () => {
  assert.equal(corrigir("cardiologista"), "cardiologista");
  assert.equal(corrigir("eletrocardiograma"), "eletrocardiograma");
});

test("a variante mais longa vence a mais curta", () => {
  // "ecg" não pode comer o começo de "ecg 100 l".
  assert.equal(corrigir("o ecg 100 l chegou"), "o ECG100L chegou");
});

test("termo em minúscula não perde a maiúscula de início de frase", () => {
  assert.equal(corrigir("Eletrodo mal colado."), "Eletrodo mal colado.");
});

test("texto vazio e dicionário vazio não quebram", () => {
  assert.equal(corrigir(""), "");
  assert.equal(aplicarDicionario("qualquer coisa", compilarDicionario([])), "qualquer coisa");
});

test("termo sem variantes ainda normaliza a própria caixa", () => {
  const um: Termo[] = [{ id: "x", termo: "HiCardi", variantes: [] }];
  assert.equal(aplicarDicionario("hicardi", compilarDicionario(um)), "HiCardi");
});

test("separarVariantes aceita vírgula, ponto e vírgula e quebra de linha", () => {
  assert.deepEqual(separarVariantes("a, b; c\nd ,, "), ["a", "b", "c", "d"]);
});

test("o prompt de transcrição leva só a forma correta, nunca o erro", () => {
  const prompt = promptDeTranscricao(DICIONARIO_PADRAO);
  assert.ok(prompt.includes("CardioLight"));
  assert.ok(prompt.includes("Cardioline"));
  assert.ok(!prompt.includes("cardioonline"), "o erro não pode ser ensinado ao modelo");
  assert.ok(!prompt.includes("Cardius"));
});

test("o prompt de transcrição respeita o limite sem cortar um nome ao meio", () => {
  const prompt = promptDeTranscricao(DICIONARIO_PADRAO, 200);
  assert.ok(prompt.length <= 201, `veio com ${prompt.length}`);
  for (const nome of prompt.split(": ")[1].replace(/\.$/, "").split(", ")) {
    assert.ok(
      DICIONARIO_PADRAO.some((t) => t.termo === nome),
      `"${nome}" não é um termo inteiro`,
    );
  }
});

test("todo termo padrão tem id único", () => {
  const ids = DICIONARIO_PADRAO.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("nenhuma variante padrão é igual a outro termo correto", () => {
  // Uma variante que já é o nome certo de outro produto viraria troca cruzada.
  const corretos = new Set(DICIONARIO_PADRAO.map((t) => t.termo.toLowerCase()));
  for (const t of DICIONARIO_PADRAO) {
    for (const v of t.variantes) {
      if (v.toLowerCase() === t.termo.toLowerCase()) continue;
      assert.ok(!corretos.has(v.toLowerCase()), `"${v}" em ${t.termo} é o nome certo de outro termo`);
    }
  }
});

test("nenhum termo padrão repete uma variante", () => {
  for (const t of DICIONARIO_PADRAO) {
    const vistas = t.variantes.map((v) => v.toLowerCase());
    assert.equal(new Set(vistas).size, vistas.length, `${t.termo} tem variante repetida`);
  }
});
