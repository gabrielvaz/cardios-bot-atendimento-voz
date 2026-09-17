/**
 * A matemática do orbe. Testável sem microfone e sem canvas, que é
 * exatamente o motivo de ela viver fora do componente.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizar, rms, suavizar } from "../lib/amplitude";
import { entre, hslParaRgb, lerToken, rgba } from "../lib/cores";

/** Um quadro de onda PCM de 8 bits, centrado em 128 como o WebAudio entrega. */
function onda(amplitude: number, n = 512): Uint8Array {
  const d = new Uint8Array(n);
  for (let i = 0; i < n; i++) d[i] = 128 + Math.round(Math.sin((i / n) * Math.PI * 8) * 127 * amplitude);
  return d;
}

test("silêncio é zero", () => {
  assert.equal(rms(new Uint8Array(512).fill(128)), 0);
});

test("quadro vazio não quebra", () => {
  assert.equal(rms(new Uint8Array(0)), 0);
});

test("o RMS de uma senoide cheia fica perto de 0,707", () => {
  const v = rms(onda(1));
  assert.ok(Math.abs(v - 0.707) < 0.02, `veio ${v}`);
});

test("mais volume, mais RMS", () => {
  assert.ok(rms(onda(0.9)) > rms(onda(0.4)));
  assert.ok(rms(onda(0.4)) > rms(onda(0.05)));
});

test("fala normal sai da faixa invisível depois do ganho", () => {
  // RMS de fala conversada fica perto de 0,05, que cru não move um pixel.
  const cru = rms(onda(0.07));
  assert.ok(cru < 0.06, `esperava sinal fraco, veio ${cru}`);
  assert.ok(normalizar(cru) > 0.15, "o ganho precisa tornar a fala visível");
});

test("grito satura em 1 e não estoura a forma", () => {
  assert.equal(normalizar(rms(onda(1))), 1);
  assert.equal(normalizar(5), 1);
});

test("a suavização sobe rápido e desce devagar", () => {
  const subiu = suavizar(0, 1, 1 / 60);
  const desceu = 1 - suavizar(1, 0, 1 / 60);
  assert.ok(subiu > desceu, "ataque tem que ser mais rápido que a queda");
});

test("a suavização converge e não passa do alvo", () => {
  let v = 0;
  for (let i = 0; i < 200; i++) v = suavizar(v, 0.8, 1 / 60);
  assert.ok(Math.abs(v - 0.8) < 0.001, `parou em ${v}`);
  assert.ok(v <= 0.8 + 1e-9, "não pode ultrapassar o alvo");
});

test("um quadro muito longo não faz a suavização saltar além do alvo", () => {
  // Aba que volta do segundo plano entrega um dt enorme.
  assert.equal(suavizar(0, 1, 10), 1);
});

test("o laranja do Beat sai certo do token HSL", () => {
  // --primary: 22 100% 47% é o #ee5b00.
  assert.deepEqual(hslParaRgb(22, 100, 47), { r: 240, g: 88, b: 0 });
});

test("cinza e branco não ganham cor", () => {
  assert.deepEqual(hslParaRgb(0, 0, 100), { r: 255, g: 255, b: 255 });
  assert.deepEqual(hslParaRgb(210, 0, 50), { r: 128, g: 128, b: 128 });
});

test("token ausente cai na cor de reserva", () => {
  const reserva = { r: 238, g: 91, b: 0 };
  assert.deepEqual(lerToken("--nao-existe", reserva), reserva);
});

test("interpolar cores respeita as pontas e o meio", () => {
  const a = { r: 0, g: 0, b: 0 }, b = { r: 100, g: 200, b: 50 };
  assert.deepEqual(entre(a, b, 0), a);
  assert.deepEqual(entre(a, b, 1), b);
  assert.deepEqual(entre(a, b, 0.5), { r: 50, g: 100, b: 25 });
});

test("interpolar fora da faixa não extrapola", () => {
  const a = { r: 0, g: 0, b: 0 }, b = { r: 100, g: 100, b: 100 };
  assert.deepEqual(entre(a, b, 2), b);
  assert.deepEqual(entre(a, b, -1), a);
});

test("rgba monta a cor que o canvas aceita", () => {
  assert.equal(rgba({ r: 238, g: 91, b: 0 }, 0.5), "rgba(238,91,0,0.500)");
});
