"use client";

/**
 * Bancada do orbe.
 *
 * Existe porque o orbe só aparece durante uma ligação de verdade, e ajustar
 * amplitude, cor e velocidade abrindo uma ligação a cada tentativa custa
 * dinheiro e paciência. Aqui ele é o mesmo componente, com a amplitude vindo
 * de um sinal simulado ou do microfone.
 *
 * Não é parte do produto. Fica fora da navegação de propósito.
 */
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/beat";
import { Orbe } from "@/components/orbe";
import { Medidor, normalizar, rms, suavizar, type Niveis } from "@/lib/amplitude";

type Fonte = "parado" | "cora" | "cliente" | "microfone";

export default function Bancada() {
  const [fonte, setFonte] = useState<Fonte>("cora");
  const simulado = useRef({ t: 0, v: 0 });
  const medidorRef = useRef<Medidor | null>(null);

  const lerNiveis = useCallback(
    (dt: number): Niveis => {
      if (fonte === "microfone") {
        const n = medidorRef.current?.ler(dt) ?? { cora: 0, cliente: 0 };
        return { cora: 0, cliente: n.cliente };
      }
      const s = simulado.current;
      s.t += dt;
      // Fala tem sílaba: duas senoides incomensuráveis dão um envelope
      // irregular o bastante para parecer voz.
      const alvo =
        fonte === "parado"
          ? 0
          : Math.max(
              0.08,
              (0.5 + 0.5 * Math.sin(s.t * 7.3)) * (0.5 + 0.5 * Math.sin(s.t * 2.9 + 1.7)) * 1.5,
            );
      s.v = suavizar(s.v, Math.min(1, alvo), dt);
      return fonte === "cliente" ? { cora: 0, cliente: s.v } : { cora: s.v, cliente: 0 };
    },
    [fonte],
  );

  const ligarMicrofone = async () => {
    try {
      const trilha = await navigator.mediaDevices.getUserMedia({ audio: true });
      const medidor = new Medidor();
      medidor.ligar("cliente", trilha);
      medidorRef.current = medidor;
      setFonte("microfone");
    } catch {
      setFonte("parado");
    }
  };

  const falando = fonte === "cliente" || fonte === "microfone" ? "cliente" : fonte === "cora" ? "cora" : null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
      <Orbe tamanho={220} lerNiveis={lerNiveis} falando={falando} />
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant={fonte === "parado" ? "default" : "outline"} onClick={() => setFonte("parado")}>Parado</Button>
        <Button variant={fonte === "cora" ? "default" : "outline"} onClick={() => setFonte("cora")}>Cora falando</Button>
        <Button variant={fonte === "cliente" ? "default" : "outline"} onClick={() => setFonte("cliente")}>Você falando</Button>
        <Button variant={fonte === "microfone" ? "default" : "outline"} onClick={ligarMicrofone}>Usar meu microfone</Button>
      </div>
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Bancada de ajuste do orbe. O componente é o mesmo que roda na ligação; só a
        amplitude muda de origem. Verificação de RMS e suavização em{" "}
        <code>scripts/amplitude.test.ts</code>.
      </p>
    </main>
  );
}
