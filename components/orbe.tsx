"use client";

/**
 * O orbe da Clara: uma esfera de pontos que gira e reage à voz.
 *
 * Os pontos vêm de uma esfera de Fibonacci, que é a distribuição mais uniforme
 * que se consegue sem iterar, e cada um tem o raio empurrado por uma onda que
 * corre pela superfície. A voz não move o ponto direto: ela escala a amplitude
 * dessa onda. É o que faz a esfera respirar em vez de pulsar, e é o que o
 * "levemente" do pedido exige.
 *
 * Nada aqui passa por estado do React. O laço lê a amplitude do medidor, que é
 * um objeto comum, e desenha. Um `useState` por quadro reconciliaria a página
 * inteira sessenta vezes por segundo para mudar pixel de canvas.
 */
import { useEffect, useRef } from "react";
import { entre, lerToken, rgba, type RGB } from "@/lib/cores";
import type { Niveis } from "@/lib/amplitude";

/** Fallback caso o token não seja legível: o laranja e o navy do Beat. */
const LARANJA: RGB = { r: 238, g: 91, b: 0 };
const NAVY: RGB = { r: 7, g: 16, b: 70 };

const PONTOS = 700;
const GIRO = 0.42;
const INCLINACAO = 0.42;

type Ponto = { x: number; y: number; z: number };

function esferaDeFibonacci(n: number): Ponto[] {
  const pts: Ponto[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = phi * i;
    pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r });
  }
  return pts;
}

export function Orbe({
  tamanho = 152,
  lerNiveis,
  falando,
  conectando = false,
}: {
  tamanho?: number;
  /** Devolve a amplitude dos dois lados. Chamado uma vez por quadro. */
  lerNiveis: (dt: number) => Niveis;
  falando: "clara" | "cliente" | null;
  conectando?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // O que muda a cada render vive em ref para o laço não precisar reiniciar.
  const vivo = useRef({ falando, conectando, lerNiveis });
  vivo.current = { falando, conectando, lerNiveis };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = tamanho * dpr;
    canvas.height = tamanho * dpr;
    ctx.scale(dpr, dpr);

    const pontos = esferaDeFibonacci(PONTOS);
    const meio = tamanho / 2;
    const escala = tamanho / 260;

    let primario = lerToken("--primary", LARANJA);
    let acento = lerToken("--accent", NAVY);
    // O tema pode mudar depois da montagem; reler de vez em quando é mais
    // barato que um observer, e um quadro com a cor velha ninguém vê.
    let desdeCor = 0;

    const parado = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let quadro = 0;
    let t = 0;
    let anterior = performance.now();

    const desenhar = (agora: number) => {
      quadro = requestAnimationFrame(desenhar);
      const dt = Math.min(0.05, (agora - anterior) / 1000);
      anterior = agora;

      const niveis = vivo.current.lerNiveis(dt);
      const quem = vivo.current.falando;
      // Quem tem a palavra dita a cor; a amplitude vem de quem está falando.
      // Sem ninguém falando, o orbe respira: uma senoide lenta, para não
      // ficar morto na tela enquanto a linha está aberta.
      const amp = quem === "clara" ? niveis.clara
        : quem === "cliente" ? niveis.cliente
        : Math.max(niveis.clara, niveis.cliente);

      if (!parado) t += dt;
      const respiro = 0.05 + 0.03 * (0.5 + 0.5 * Math.sin(t * 1.1));
      const forca = Math.max(respiro, amp);

      desdeCor += dt;
      if (desdeCor > 1) {
        desdeCor = 0;
        primario = lerToken("--primary", LARANJA);
        acento = lerToken("--accent", NAVY);
      }

      const frente = quem === "cliente" ? acento : primario;
      // O fundo da esfera é o mesmo tom clareado, não uma segunda cor: duas
      // cores fariam o orbe parecer dois objetos sobrepostos.
      const fundo = entre(frente, { r: 255, g: 255, b: 255 }, 0.3);

      ctx.clearRect(0, 0, tamanho, tamanho);
      if (vivo.current.conectando) ctx.globalAlpha = 0.45;

      const giro = t * GIRO;
      const cg = Math.cos(giro), sg = Math.sin(giro);
      const ci = Math.cos(INCLINACAO), si = Math.sin(INCLINACAO);

      for (const p of pontos) {
        // A onda corre pela superfície. Duas frequências incomensuráveis
        // evitam que o padrão se repita e vire cara de engrenagem.
        const onda = Math.sin(p.y * 5 + t * 4.5) * Math.cos(p.x * 4 - t * 3.1);
        // 0,18 é o "levemente": o ponto sai no máximo 18% do raio, e só no
        // pico da fala. Acima disso a esfera vira explosão.
        const r = (0.72 + forca * 0.18 * onda + forca * 0.06) * meio;

        let x = p.x * cg - p.z * sg;
        let z = p.x * sg + p.z * cg;
        const y = p.y * ci - z * si;
        z = p.y * si + z * ci;

        const perto = 1.9 / (1.9 + z);
        const prof = (z + 1) / 2;

        ctx.globalAlpha = (vivo.current.conectando ? 0.45 : 1) * (0.22 + (1 - prof) * 0.72);
        ctx.fillStyle = rgba(prof > 0.55 ? frente : fundo, 1);
        ctx.beginPath();
        ctx.arc(meio + x * r * perto, meio + y * r * perto, (0.9 + (1 - prof) * 1.5) * perto * escala, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    quadro = requestAnimationFrame(desenhar);

    // Aba escondida não desenha. Numa ligação de dez minutos em segundo plano
    // isso é a diferença entre esquentar o notebook e não esquentar.
    const visibilidade = () => {
      cancelAnimationFrame(quadro);
      if (document.visibilityState === "visible") {
        anterior = performance.now();
        quadro = requestAnimationFrame(desenhar);
      }
    };
    document.addEventListener("visibilitychange", visibilidade);

    return () => {
      cancelAnimationFrame(quadro);
      document.removeEventListener("visibilitychange", visibilidade);
    };
  }, [tamanho]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: tamanho, height: tamanho }}
      aria-hidden="true"
    />
  );
}

/**
 * O orbe em dois tamanhos, trocados pelo breakpoint.
 *
 * Existe porque o canvas é desenhado em pixel, não escalado: reduzir por CSS
 * borraria os pontos. São duas instâncias, e só uma está no fluxo por vez.
 */
export function OrbeResponsivo({
  pequeno, grande, ...resto
}: Omit<Parameters<typeof Orbe>[0], "tamanho"> & { pequeno: number; grande: number }) {
  return (
    <>
      <span className="sm:hidden">
        <Orbe tamanho={pequeno} {...resto} />
      </span>
      <span className="hidden sm:block">
        <Orbe tamanho={grande} {...resto} />
      </span>
    </>
  );
}
