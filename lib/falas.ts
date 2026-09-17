/**
 * A lista da conversa, como função pura.
 *
 * Vive fora do hook por um motivo: a ordem das falas já apareceu errada uma vez
 * e é invisível em teste de tipo. A transcrição do que o cliente falou chega
 * **depois** que a Clara já começou a responder, porque transcrever a entrada é
 * um trabalho paralelo ao de gerar a resposta. Se a entrada só fosse criada
 * quando o texto chega, a pergunta apareceria embaixo da resposta.
 *
 * A solução é reservar o lugar do cliente em `input_audio_buffer.committed`,
 * que é o evento que fecha o turno dele e sempre precede a resposta.
 */
export type Quem = "clara" | "cliente";

export type Fala = {
  id: string;
  quem: Quem;
  texto: string;
  /** Ainda chegando; a tela mostra em tom mais claro. */
  parcial: boolean;
  em: number;
};

/** Cria a entrada vazia se ela ainda não existe, preservando a posição. */
export function reservar(falas: Fala[], quem: Quem, id: string, agora = Date.now()): Fala[] {
  if (falas.some((f) => f.id === id)) return falas;
  return [...falas, { id, quem, texto: "", parcial: true, em: agora }];
}

/**
 * Acrescenta ou completa a fala de `id`.
 *
 * `somar` distingue o fragmento que chega em pedaços (delta) do texto final,
 * que substitui o acumulado.
 */
export function escrever(
  falas: Fala[],
  quem: Quem,
  id: string,
  texto: string,
  parcial: boolean,
  somar: boolean,
  agora = Date.now(),
): Fala[] {
  const i = falas.findIndex((f) => f.id === id);
  if (i === -1) return [...falas, { id, quem, texto, parcial, em: agora }];
  const copia = [...falas];
  copia[i] = { ...copia[i], texto: somar ? copia[i].texto + texto : texto, parcial };
  return copia;
}

/** Ao encerrar, o que ficou pela metade para de piscar como se ainda chegasse. */
export function congelar(falas: Fala[]): Fala[] {
  return falas.map((f) => (f.parcial ? { ...f, parcial: false } : f));
}

/** A conversa em texto, para copiar. */
export function paraTexto(falas: Fala[], nomeDaAtendente: string): string {
  return falas
    .filter((f) => f.texto.trim())
    .map((f) => `${f.quem === "clara" ? nomeDaAtendente : "Cliente"}: ${f.texto}`)
    .join("\n\n");
}
