/**
 * Quanto som está saindo de cada lado da ligação, agora.
 *
 * O orbe precisa de um número por quadro, sessenta vezes por segundo. Isso não
 * pode passar por estado do React: seria um re-render a cada 16 ms e a página
 * inteira reconciliada à toa. Por isso o medidor é um objeto comum, lido por
 * quem desenha, e o React nunca fica sabendo.
 *
 * São duas fontes e dois analisadores. O microfone é a voz de quem liga; a
 * trilha remota que chega pelo WebRTC é a voz da Cora. Medir as duas separadas
 * é o que permite o orbe mudar de cor conforme quem tem a palavra.
 */

/** Raiz do valor quadrático médio de um quadro de onda, em 0..1. */
export function rms(dados: Uint8Array<ArrayBufferLike>): number {
  if (dados.length === 0) return 0;
  let soma = 0;
  for (let i = 0; i < dados.length; i++) {
    const v = (dados[i] - 128) / 128;
    soma += v * v;
  }
  return Math.sqrt(soma / dados.length);
}

/**
 * Fala normal fica perto de 0,05 de RMS, o que desenhado cru não mexe um
 * pixel. O ganho põe isso numa faixa visível, e o teto impede que um grito
 * estoure a forma.
 */
export function normalizar(valor: number, ganho = 4.5): number {
  return Math.min(1, valor * ganho);
}

/**
 * Ataque rápido, queda lenta, como qualquer medidor de áudio.
 *
 * Sem isso o orbe tremeria: a fala tem microssilêncios entre sílabas, e seguir
 * o sinal cru faria a esfera piscar. A queda lenta preenche esses buracos.
 */
export function suavizar(atual: number, alvo: number, dt: number): number {
  const k = alvo > atual ? 14 : 5;
  return atual + (alvo - atual) * Math.min(1, dt * k);
}

export type Niveis = { cora: number; cliente: number };

export class Medidor {
  #contexto: AudioContext | null = null;
  #analisadores = new Map<keyof Niveis, AnalyserNode>();
  #buffers = new Map<keyof Niveis, Uint8Array<ArrayBuffer>>();
  #suave: Niveis = { cora: 0, cliente: 0 };

  /** Só cria o AudioContext quando há o que medir. */
  #garantirContexto(): AudioContext | null {
    if (this.#contexto) return this.#contexto;
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.#contexto = new Ctor();
    return this.#contexto;
  }

  /**
   * Prende um analisador a uma trilha.
   *
   * O analisador não é conectado a saída nenhuma de propósito: ele só observa.
   * Conectar ao destino faria o áudio tocar duas vezes.
   */
  ligar(quem: keyof Niveis, trilha: MediaStream): void {
    const ctx = this.#garantirContexto();
    if (!ctx) return;
    // Uma aba que abriu antes do clique começa suspensa; o clique já
    // aconteceu quando isto roda.
    if (ctx.state === "suspended") void ctx.resume();

    const analisador = ctx.createAnalyser();
    analisador.fftSize = 1024;
    analisador.smoothingTimeConstant = 0.6;
    try {
      ctx.createMediaStreamSource(trilha).connect(analisador);
    } catch {
      // Trilha sem áudio, ou navegador que recusa a fonte: o orbe cai na
      // respiração parada e a ligação segue.
      return;
    }
    this.#analisadores.set(quem, analisador);
    this.#buffers.set(quem, new Uint8Array(analisador.fftSize));
  }

  /** Lê e suaviza. Chamado uma vez por quadro por quem desenha. */
  ler(dt: number): Niveis {
    for (const quem of ["cora", "cliente"] as const) {
      const analisador = this.#analisadores.get(quem);
      const buffer = this.#buffers.get(quem);
      const alvo = analisador && buffer
        ? (analisador.getByteTimeDomainData(buffer), normalizar(rms(buffer)))
        : 0;
      this.#suave[quem] = suavizar(this.#suave[quem], alvo, dt);
    }
    return this.#suave;
  }

  encerrar(): void {
    this.#analisadores.clear();
    this.#buffers.clear();
    this.#suave = { cora: 0, cliente: 0 };
    void this.#contexto?.close().catch(() => {});
    this.#contexto = null;
  }
}
