/**
 * Os modelos Realtime e o que cada um custa.
 *
 * Preços em dólar por 1 milhão de tokens, conferidos em
 * https://developers.openai.com/api/docs/pricing em 2026-09-17.
 * A Realtime cobra por token e separa áudio de texto: áudio custa oito vezes
 * mais que texto na entrada, e o cache derruba a entrada para centavos. É por
 * isso que o prompt grande da Clara sai barato depois do primeiro turno.
 *
 * A lista está do mais novo para o mais antigo. `gpt-realtime` e
 * `gpt-realtime-mini` são apelidos que a OpenAI aponta para a versão estável,
 * e ficam no fim porque acompanham a 1.5 no preço.
 */
export type Preco = {
  textoEntrada: number;
  textoEntradaCache: number;
  textoSaida: number;
  audioEntrada: number;
  audioEntradaCache: number;
  audioSaida: number;
};

export type Modelo = {
  id: string;
  rotulo: string;
  nota: string;
  preco: Preco;
};

const GRANDE: Preco = {
  textoEntrada: 4, textoEntradaCache: 0.4, textoSaida: 16,
  audioEntrada: 32, audioEntradaCache: 0.4, audioSaida: 64,
};
const GRANDE_V2: Preco = { ...GRANDE, textoSaida: 24 };
const MINI: Preco = {
  textoEntrada: 0.6, textoEntradaCache: 0.06, textoSaida: 2.4,
  audioEntrada: 10, audioEntradaCache: 0.3, audioSaida: 20,
};

export const MODELOS: Modelo[] = [
  { id: "gpt-realtime-2.1", rotulo: "gpt-realtime-2.1", nota: "A geração mais nova. Melhor compreensão de termo técnico.", preco: GRANDE_V2 },
  { id: "gpt-realtime-2.1-mini", rotulo: "gpt-realtime-2.1-mini", nota: "A mini da geração mais nova. Três vezes mais barata.", preco: MINI },
  { id: "gpt-realtime-2", rotulo: "gpt-realtime-2", nota: "Geração anterior à 2.1.", preco: GRANDE_V2 },
  { id: "gpt-realtime-1.5", rotulo: "gpt-realtime-1.5", nota: "Geração anterior à 2. Saída de texto mais barata.", preco: GRANDE },
  { id: "gpt-realtime", rotulo: "gpt-realtime", nota: "Apelido da versão estável. É o padrão desta aplicação.", preco: GRANDE },
  { id: "gpt-realtime-mini", rotulo: "gpt-realtime-mini", nota: "Apelido da mini estável.", preco: MINI },
];

export const MODELO_PADRAO = "gpt-realtime";

export function acharModelo(id: string): Modelo {
  return MODELOS.find((m) => m.id === id) ?? MODELOS[0];
}
