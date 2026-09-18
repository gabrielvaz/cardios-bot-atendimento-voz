"use client";

/**
 * A ligação com a Cora.
 *
 * O caminho é o WebRTC do browser, não WebSocket: o áudio sobe e desce pela
 * própria conexão de mídia, com o jitter buffer e o cancelamento de eco que o
 * navegador já faz. Só os eventos JSON passam pelo canal de dados `oai-events`.
 *
 *   1. o browser troca a chave do usuário por um segredo efêmero (`ek_...`)
 *   2. cria a RTCPeerConnection, prende o microfone e o <audio> de saída
 *   3. manda a oferta SDP para api.openai.com/v1/realtime/calls
 *   4. aplica a resposta SDP e a conversa começa
 *
 * Os dois passos que falam com a OpenAI saem do próprio navegador: a API
 * devolve `access-control-allow-origin: *` e aceita o header `authorization`,
 * verificado em 2026-09-17. Não há servidor nenhum no caminho, e é por isso que
 * esta aplicação roda como página estática no GitHub Pages.
 *
 * A configuração da sessão (prompt, voz, detecção de turno) vai embutida no
 * segredo efêmero, então não há `session.update` na abertura.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Config } from "./config";
import { lerUso, somarUso, USO_ZERO, type Uso } from "./custo";
import { aplicarDicionario, type DicionarioCompilado } from "./dicionario";
import { congelar, escrever as escreverFala, reservar as reservarFala, type Fala, type Quem } from "./falas";
import { Medidor, type Niveis } from "./amplitude";

export type Estado = "parado" | "conectando" | "ativo" | "encerrado";
export type { Fala, Quem } from "./falas";

export type Erro = { titulo: string; detalhe?: string; comoResolver?: string };

/** A config salva mais o que é derivado dela e vai para a API. */
export type ConfigAtiva = Config & {
  promptMontado: string;
  /** Vai no `prompt` da transcrição: enviesa o reconhecimento na origem. */
  promptTranscricao: string;
  /** Corrige o que passou mesmo assim, sobre o texto acumulado. */
  dicionario: DicionarioCompilado;
};

export type Atendimento = {
  estado: Estado;
  falas: Fala[];
  uso: Uso;
  /** Turnos respondidos pela Cora. Zero significa que nada foi cobrado ainda. */
  turnos: number;
  segundos: number;
  falando: Quem | null;
  erro: Erro | null;
  /**
   * A amplitude dos dois lados, agora. Não é estado de propósito: quem desenha
   * o orbe chama isto sessenta vezes por segundo, e um `useState` aqui
   * reconciliaria a página inteira a cada quadro.
   */
  lerNiveis: (dt: number) => Niveis;
  iniciar: () => Promise<void>;
  encerrar: () => void;
  limparErro: () => void;
};

export function useAtendimento(config: ConfigAtiva): Atendimento {
  const [estado, setEstado] = useState<Estado>("parado");
  const [falas, setFalas] = useState<Fala[]>([]);
  const [uso, setUso] = useState<Uso>({ ...USO_ZERO });
  const [turnos, setTurnos] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [falando, setFalando] = useState<Quem | null>(null);
  const [erro, setErro] = useState<Erro | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const medidorRef = useRef<Medidor | null>(null);
  const inicioRef = useRef<number>(0);
  // A config vive numa ref para o handler de evento não capturar valor velho.
  const configRef = useRef(config);
  configRef.current = config;

  const encerrar = useCallback(() => {
    medidorRef.current?.encerrar();
    medidorRef.current = null;
    dcRef.current?.close();
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    micRef.current?.getTracks().forEach((t) => t.stop());
    dcRef.current = null;
    pcRef.current = null;
    micRef.current = null;
    setFalando(null);
    setEstado((atual) => (atual === "parado" ? "parado" : "encerrado"));
    // A fala que ficou pela metade quando a linha caiu continua na tela, mas
    // deixa de piscar como se ainda estivesse chegando.
    setFalas(congelar);
  }, []);

  useEffect(() => () => encerrar(), [encerrar]);

  useEffect(() => {
    if (estado !== "ativo") return;
    const id = setInterval(() => {
      setSegundos(Math.floor((Date.now() - inicioRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [estado]);

  // Casca fina sobre lib/falas.ts, que é onde a ordem da conversa é decidida
  // e testada.
  const escrever = useCallback(
    (quem: Quem, id: string, texto: string, parcial: boolean, somar: boolean) => {
      setFalas((atuais) => escreverFala(atuais, quem, id, texto, parcial, somar));
    },
    [],
  );

  const reservar = useCallback((quem: Quem, id: string) => {
    setFalas((atuais) => reservarFala(atuais, quem, id));
  }, []);

  const tratarEvento = useCallback(
    (evento: Record<string, unknown>) => {
      const tipo = String(evento.type ?? "");
      const dic = configRef.current.dicionario;
      /** Corrige o texto acumulado, nunca o fragmento solto. */
      const corrigir = (texto: string) => aplicarDicionario(texto, dic);

      // --- a Cora falando -------------------------------------------------
      if (tipo === "response.output_audio_transcript.delta" || tipo === "response.audio_transcript.delta") {
        escrever("cora", `cora:${evento.item_id}`, String(evento.delta ?? ""), true, true);
        return;
      }
      if (tipo === "response.output_audio_transcript.done" || tipo === "response.audio_transcript.done") {
        escrever("cora", `cora:${evento.item_id}`, corrigir(String(evento.transcript ?? "")), false, false);
        return;
      }

      // --- o cliente falando -----------------------------------------------
      if (tipo === "conversation.item.input_audio_transcription.delta") {
        escrever("cliente", `cliente:${evento.item_id}`, String(evento.delta ?? ""), true, true);
        return;
      }
      if (tipo === "conversation.item.input_audio_transcription.completed") {
        escrever("cliente", `cliente:${evento.item_id}`, corrigir(String(evento.transcript ?? "").trim()), false, false);
        return;
      }
      if (tipo === "conversation.item.input_audio_transcription.failed") {
        escrever("cliente", `cliente:${evento.item_id}`, "(não consegui entender o áudio)", false, false);
        return;
      }

      // --- a ordem da conversa ---------------------------------------------
      // O turno do cliente fecha aqui, antes de a Cora começar a responder.
      // É o momento certo de reservar o lugar dele na lista.
      if (tipo === "input_audio_buffer.committed" && evento.item_id) {
        reservar("cliente", `cliente:${evento.item_id}`);
        return;
      }
      if (tipo === "conversation.item.added" || tipo === "conversation.item.created") {
        const item = evento.item as { id?: string; role?: string } | undefined;
        if (item?.id && item.role === "user") reservar("cliente", `cliente:${item.id}`);
        return;
      }

      // --- quem tem a palavra ----------------------------------------------
      if (tipo === "input_audio_buffer.speech_started") return setFalando("cliente");
      if (tipo === "input_audio_buffer.speech_stopped") return setFalando(null);
      if (tipo === "output_audio_buffer.started" || tipo === "response.created") return setFalando("cora");
      if (tipo === "output_audio_buffer.stopped" || tipo === "output_audio_buffer.cleared") return setFalando(null);

      // --- a conta ----------------------------------------------------------
      if (tipo === "response.done") {
        const resposta = evento.response as { usage?: unknown; status?: string; status_details?: unknown } | undefined;
        if (resposta?.usage) {
          setUso((atual) => somarUso(atual, lerUso(resposta.usage as never)));
          setTurnos((n) => n + 1);
        }
        if (resposta?.status === "failed") {
          setErro({
            titulo: "A Cora não conseguiu responder.",
            detalhe: JSON.stringify(resposta.status_details),
          });
        }
        setFalando(null);
        return;
      }

      if (tipo === "error") {
        const e = evento.error as { message?: string; code?: string } | undefined;
        setErro({ titulo: "A OpenAI devolveu um erro.", detalhe: e?.message ?? JSON.stringify(evento) });
      }
    },
    [escrever, reservar],
  );

  const iniciar = useCallback(async () => {
    const cfg = configRef.current;
    setErro(null);
    setFalas([]);
    setUso({ ...USO_ZERO });
    setTurnos(0);
    setSegundos(0);
    setEstado("conectando");

    try {
      // 1. microfone antes de tudo: sem ele não vale gastar uma chamada à API.
      let mic: MediaStream;
      try {
        mic = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch {
        setEstado("parado");
        setErro({
          titulo: "O navegador não liberou o microfone.",
          comoResolver:
            "Clique no cadeado ao lado do endereço e permita o microfone para este site. No Chrome, isso só funciona em localhost ou em HTTPS.",
        });
        return;
      }
      micRef.current = mic;

      // O medidor sobe junto com o microfone: a voz de quem liga já pode ser
      // medida antes mesmo de a Cora atender.
      const medidor = new Medidor();
      medidor.ligar("cliente", mic);
      medidorRef.current = medidor;

      // 2. segredo efêmero, direto na OpenAI
      const resposta = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.chave.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expires_after: { anchor: "created_at", seconds: 600 },
          session: {
            type: "realtime",
            model: cfg.modelo,
            instructions: cfg.promptMontado,
            output_modalities: ["audio"],
            audio: {
              input: {
                // Transcrever a fala do cliente é o que permite mostrar a
                // conversa na tela. Fixar o idioma reduz erro em nome de produto.
                transcription: {
                  model: "whisper-1",
                  language: "pt",
                  // Enviesa o reconhecimento na origem com os nomes próprios
                  // do dicionário. É a correção que vale mais: melhor o modelo
                  // ouvir "CardioLight" do que ser consertado depois.
                  prompt: cfg.promptTranscricao,
                },
                turn_detection: { type: cfg.deteccao },
                noise_reduction: { type: "near_field" },
              },
              output: { voice: cfg.voz, speed: cfg.velocidade },
            },
          },
        }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        mic.getTracks().forEach((t) => t.stop());
        medidor.encerrar();
        medidorRef.current = null;
        setEstado("parado");
        setErro({
          titulo:
            resposta.status === 401
              ? "A OpenAI recusou a chave."
              : resposta.status === 429
                ? "Sem crédito ou limite de uso atingido na OpenAI."
                : `A OpenAI respondeu ${resposta.status}.`,
          detalhe: JSON.stringify(dados, null, 2),
          comoResolver:
            resposta.status === 401
              ? "Confira a chave no painel de configuração."
              : resposta.status === 429
                ? "Confira o saldo da conta na OpenAI."
                : undefined,
        });
        return;
      }

      // 3. conexão de mídia
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audio = audioRef.current ?? new Audio();
      audio.autoplay = true;
      audioRef.current = audio;
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0];
        // A trilha remota é a voz da Cora. Medi-la em separado é o que
        // permite o orbe trocar de cor conforme quem tem a palavra.
        medidor.ligar("cora", e.streams[0]);
      };
      pc.addTrack(mic.getAudioTracks()[0], mic);

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = (e) => {
        try {
          tratarEvento(JSON.parse(e.data));
        } catch {
          // Evento que não é JSON não deve derrubar a conversa.
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setErro({
            titulo: "A conexão de áudio caiu.",
            comoResolver: "Inicie de novo. O custo até aqui continua na tela.",
          });
          encerrar();
        }
      };

      // 4. SDP direto para a OpenAI, com o segredo efêmero
      const oferta = await pc.createOffer();
      await pc.setLocalDescription(oferta);

      const sdp = await fetch(
        `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(cfg.modelo)}`,
        {
          method: "POST",
          body: oferta.sdp,
          headers: { Authorization: `Bearer ${dados.value}`, "Content-Type": "application/sdp" },
        },
      );
      if (!sdp.ok) {
        const texto = await sdp.text();
        mic.getTracks().forEach((t) => t.stop());
        medidor.encerrar();
        medidorRef.current = null;
        pc.close();
        pcRef.current = null;
        setEstado("parado");
        setErro({ titulo: `A OpenAI recusou a conexão de áudio (${sdp.status}).`, detalhe: texto });
        return;
      }
      await pc.setRemoteDescription({ type: "answer", sdp: await sdp.text() });

      inicioRef.current = Date.now();
      setEstado("ativo");
    } catch (e) {
      encerrar();
      setEstado("parado");
      setErro({ titulo: "Não consegui iniciar o atendimento.", detalhe: String(e) });
    }
  }, [encerrar, tratarEvento]);

  const lerNiveis = useCallback(
    (dt: number) => medidorRef.current?.ler(dt) ?? { cora: 0, cliente: 0 },
    [],
  );

  return {
    estado, falas, uso, turnos, segundos, falando, erro,
    lerNiveis, iniciar, encerrar,
    limparErro: () => setErro(null),
  };
}
