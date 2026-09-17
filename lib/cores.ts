/**
 * As cores do Beat chegam ao canvas.
 *
 * Os tokens são triplas HSL sem função em volta (`--primary: 22 100% 47%`),
 * porque o CSS as compõe com `hsl(var(--primary))`. O canvas precisa de uma
 * cor pronta, e precisa dela com alfa variável por ponto, então a conversão
 * acontece aqui em vez de a cor ser repetida à mão no componente.
 */
export type RGB = { r: number; g: number; b: number };

export function hslParaRgb(h: number, s: number, l: number): RGB {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/** Lê um token como `--primary` e devolve RGB. Volta ao padrão se não existir. */
export function lerToken(nome: string, reserva: RGB): RGB {
  if (typeof window === "undefined") return reserva;
  const bruto = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  const partes = bruto.replace(/%/g, "").split(/\s+/).map(Number);
  if (partes.length < 3 || partes.some(Number.isNaN)) return reserva;
  return hslParaRgb(partes[0], partes[1], partes[2]);
}

export function rgba({ r, g, b }: RGB, alfa: number): string {
  return `rgba(${r},${g},${b},${alfa.toFixed(3)})`;
}

/** Interpola duas cores. Usado para o ponto que passa do fundo para a frente. */
export function entre(a: RGB, b: RGB, t: number): RGB {
  const k = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * k),
    g: Math.round(a.g + (b.g - a.g) * k),
    b: Math.round(a.b + (b.b - a.b) * k),
  };
}
