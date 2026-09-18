/**
 * Conta o que a conversa custou.
 *
 * A Realtime manda um evento `response.done` a cada resposta da Cora, com o
 * `usage` daquele turno. O que interessa ali é que o mesmo campo `input_tokens`
 * mistura três preços diferentes: texto novo, áudio novo e o que veio do cache.
 * Somar tudo pelo preço de áudio erra por quase cem vezes depois do segundo
 * turno, porque o prompt inteiro da Cora entra em cache. Daí a subtração
 * explícita abaixo.
 *
 * Tudo aqui é função pura, sem relógio e sem rede, de propósito: é a parte que
 * dá para testar sem microfone e a que mais dói se estiver errada.
 */
import { acharModelo, type Preco } from "./modelos";

/** O formato do `usage` da Realtime. Campos ausentes contam como zero. */
export type UsoBruto = {
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  input_token_details?: {
    cached_tokens?: number;
    text_tokens?: number;
    audio_tokens?: number;
    cached_tokens_details?: { text_tokens?: number; audio_tokens?: number };
  };
  output_token_details?: { text_tokens?: number; audio_tokens?: number };
};

/** Tokens já separados por preço. É isto que a tela mostra e o que se soma. */
export type Uso = {
  textoEntrada: number;
  textoEntradaCache: number;
  audioEntrada: number;
  audioEntradaCache: number;
  textoSaida: number;
  audioSaida: number;
};

export const USO_ZERO: Uso = {
  textoEntrada: 0, textoEntradaCache: 0, audioEntrada: 0,
  audioEntradaCache: 0, textoSaida: 0, audioSaida: 0,
};

const n = (v: number | undefined) => (typeof v === "number" && v > 0 ? v : 0);

/** Separa o `usage` de um turno nas seis faixas de preço. */
export function lerUso(bruto: UsoBruto | undefined | null): Uso {
  if (!bruto) return { ...USO_ZERO };
  const entrada = bruto.input_token_details ?? {};
  const cache = entrada.cached_tokens_details ?? {};

  const textoTotal = n(entrada.text_tokens);
  const audioTotal = n(entrada.audio_tokens);
  let textoCache = n(cache.text_tokens);
  let audioCache = n(cache.audio_tokens);

  // Modelos antigos mandam só `cached_tokens`, sem abrir por modalidade.
  // Nesse caso o cache é atribuído primeiro ao texto, que é o prompt fixo.
  if (!textoCache && !audioCache && n(entrada.cached_tokens)) {
    textoCache = Math.min(n(entrada.cached_tokens), textoTotal);
    audioCache = Math.min(n(entrada.cached_tokens) - textoCache, audioTotal);
  }

  // Um cache maior que o total seria dado inconsistente; o clamp evita
  // que isso vire token negativo e custo negativo na tela.
  textoCache = Math.min(textoCache, textoTotal);
  audioCache = Math.min(audioCache, audioTotal);

  return {
    textoEntrada: textoTotal - textoCache,
    textoEntradaCache: textoCache,
    audioEntrada: audioTotal - audioCache,
    audioEntradaCache: audioCache,
    textoSaida: n(bruto.output_token_details?.text_tokens),
    audioSaida: n(bruto.output_token_details?.audio_tokens),
  };
}

export function somarUso(a: Uso, b: Uso): Uso {
  return {
    textoEntrada: a.textoEntrada + b.textoEntrada,
    textoEntradaCache: a.textoEntradaCache + b.textoEntradaCache,
    audioEntrada: a.audioEntrada + b.audioEntrada,
    audioEntradaCache: a.audioEntradaCache + b.audioEntradaCache,
    textoSaida: a.textoSaida + b.textoSaida,
    audioSaida: a.audioSaida + b.audioSaida,
  };
}

export function totalTokens(u: Uso): number {
  return u.textoEntrada + u.textoEntradaCache + u.audioEntrada +
    u.audioEntradaCache + u.textoSaida + u.audioSaida;
}

/** Custo em dólares. Os preços da tabela são por milhão de tokens. */
export function custoUSD(uso: Uso, modeloId: string): number {
  const p: Preco = acharModelo(modeloId).preco;
  return (
    uso.textoEntrada * p.textoEntrada +
    uso.textoEntradaCache * p.textoEntradaCache +
    uso.audioEntrada * p.audioEntrada +
    uso.audioEntradaCache * p.audioEntradaCache +
    uso.textoSaida * p.textoSaida +
    uso.audioSaida * p.audioSaida
  ) / 1_000_000;
}

/** Quanto custa cada faixa, para a tela mostrar onde o dinheiro foi. */
export function custoPorFaixa(uso: Uso, modeloId: string) {
  const p = acharModelo(modeloId).preco;
  return [
    { rotulo: "Áudio de saída (a voz da Cora)", tokens: uso.audioSaida, usd: (uso.audioSaida * p.audioSaida) / 1e6 },
    { rotulo: "Áudio de entrada (a sua voz)", tokens: uso.audioEntrada, usd: (uso.audioEntrada * p.audioEntrada) / 1e6 },
    { rotulo: "Texto de entrada", tokens: uso.textoEntrada, usd: (uso.textoEntrada * p.textoEntrada) / 1e6 },
    { rotulo: "Entrada em cache (o prompt repetido)", tokens: uso.textoEntradaCache + uso.audioEntradaCache, usd: (uso.textoEntradaCache * p.textoEntradaCache + uso.audioEntradaCache * p.audioEntradaCache) / 1e6 },
    { rotulo: "Texto de saída", tokens: uso.textoSaida, usd: (uso.textoSaida * p.textoSaida) / 1e6 },
  ].filter((f) => f.tokens > 0);
}

/**
 * Quanto custa um minuto de conversa, por alto.
 *
 * A Realtime cobra por token, não por minuto, então isto é uma projeção com
 * premissas explícitas. As duas taxas de conversão são da documentação oficial
 * (developers.openai.com/api/docs/guides/voice-latency-cost, 2026-09-17):
 * a fala do cliente vale 1 token por 100 ms, a da Cora vale 1 token por 50 ms.
 *
 * O resto são premissas de atendimento de suporte, e é onde a estimativa pode
 * errar: meio minuto para cada lado e quatro turnos por minuto. O prompt da
 * Cora é relido a cada turno, mas vindo do cache, e esse termo pesa mais do
 * que parece num prompt de 12 mil tokens.
 */
export const PREMISSAS_MINUTO = {
  tokensAudioPorSegundoEntrada: 10,
  tokensAudioPorSegundoSaida: 20,
  segundosFalandoCliente: 30,
  segundosFalandoCora: 30,
  turnosPorMinuto: 4,
} as const;

export function custoPorMinuto(modeloId: string, tokensDoPrompt: number): number {
  const p = acharModelo(modeloId).preco;
  const q = PREMISSAS_MINUTO;
  const audioEntrada = q.segundosFalandoCliente * q.tokensAudioPorSegundoEntrada;
  const audioSaida = q.segundosFalandoCora * q.tokensAudioPorSegundoSaida;
  const promptEmCache = q.turnosPorMinuto * tokensDoPrompt;
  return (
    audioEntrada * p.audioEntrada +
    audioSaida * p.audioSaida +
    promptEmCache * p.textoEntradaCache
  ) / 1_000_000;
}

/** Dólar com casas suficientes para uma conversa de centavos não virar "$0,00". */
export function formatarUSD(valor: number): string {
  const casas = valor > 0 && valor < 0.01 ? 4 : valor < 1 ? 3 : 2;
  return `US$ ${valor.toFixed(casas).replace(".", ",")}`;
}

export function formatarRelogio(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
