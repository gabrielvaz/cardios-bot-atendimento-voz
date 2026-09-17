/**
 * O bug que estes testes prendem: a pergunta do cliente aparecia embaixo da
 * resposta da Clara, porque a transcrição da entrada chega depois que a
 * resposta já começou.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { congelar, escrever, paraTexto, reservar, type Fala } from "../lib/falas";

/** A sequência real de eventos de um turno, na ordem em que a API os manda. */
function turnoCompleto(): Fala[] {
  let falas: Fala[] = [];
  // 1. o cliente termina de falar: o turno dele fecha aqui
  falas = reservar(falas, "cliente", "cliente:item_1", 1000);
  // 2. a Clara já começa a responder, antes de a transcrição da entrada existir
  falas = escrever(falas, "clara", "clara:item_2", "Oi, ", true, true, 1100);
  falas = escrever(falas, "clara", "clara:item_2", "aqui é a Clara.", true, true, 1200);
  // 3. só agora chega o que o cliente tinha falado
  falas = escrever(falas, "cliente", "cliente:item_1", "meu Holter está apitando", false, false, 1300);
  falas = escrever(falas, "clara", "clara:item_2", "Oi, aqui é a Clara.", false, false, 1400);
  return falas;
}

test("a pergunta do cliente fica antes da resposta, mesmo chegando depois", () => {
  const falas = turnoCompleto();
  assert.deepEqual(falas.map((f) => f.quem), ["cliente", "clara"]);
  assert.equal(falas[0].texto, "meu Holter está apitando");
  assert.equal(falas[1].texto, "Oi, aqui é a Clara.");
});

test("sem a reserva, a ordem inverte: é exatamente o bug", () => {
  let falas: Fala[] = [];
  falas = escrever(falas, "clara", "clara:item_2", "Oi.", false, false, 1100);
  falas = escrever(falas, "cliente", "cliente:item_1", "meu Holter apita", false, false, 1300);
  assert.deepEqual(falas.map((f) => f.quem), ["clara", "cliente"]);
});

test("reservar duas vezes o mesmo turno não duplica nem apaga o texto", () => {
  let falas = reservar([], "cliente", "cliente:item_1", 1000);
  falas = escrever(falas, "cliente", "cliente:item_1", "já tem texto", false, false, 1100);
  falas = reservar(falas, "cliente", "cliente:item_1", 1200);
  assert.equal(falas.length, 1);
  assert.equal(falas[0].texto, "já tem texto");
});

test("delta soma e texto final substitui", () => {
  let falas = escrever([], "clara", "a", "Card", true, true, 1);
  falas = escrever(falas, "clara", "a", "ioLight", true, true, 2);
  assert.equal(falas[0].texto, "CardioLight");
  falas = escrever(falas, "clara", "a", "CardioLight.", false, false, 3);
  assert.equal(falas[0].texto, "CardioLight.");
  assert.equal(falas[0].parcial, false);
});

test("vários turnos mantêm a ordem alternada", () => {
  let falas: Fala[] = [];
  for (let n = 1; n <= 3; n++) {
    falas = reservar(falas, "cliente", `cliente:${n}`, n * 100);
    falas = escrever(falas, "clara", `clara:${n}`, `resposta ${n}`, false, false, n * 100 + 10);
    falas = escrever(falas, "cliente", `cliente:${n}`, `pergunta ${n}`, false, false, n * 100 + 20);
  }
  assert.deepEqual(
    falas.map((f) => f.texto),
    ["pergunta 1", "resposta 1", "pergunta 2", "resposta 2", "pergunta 3", "resposta 3"],
  );
});

test("congelar tira o parcial de quem ficou pela metade", () => {
  const falas = congelar(turnoCompleto().map((f) => ({ ...f, parcial: true })));
  assert.ok(falas.every((f) => !f.parcial));
});

test("o texto para copiar omite o turno que nunca foi transcrito", () => {
  let falas = turnoCompleto();
  falas = reservar(falas, "cliente", "cliente:item_9", 9000);
  assert.equal(
    paraTexto(falas, "Clara"),
    "Cliente: meu Holter está apitando\n\nClara: Oi, aqui é a Clara.",
  );
});
