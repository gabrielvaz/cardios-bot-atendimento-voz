/**
 * A configuração do teste, inteira no `localStorage` do navegador.
 *
 * Inclusive a chave da OpenAI. Isso é uma decisão consciente para um teste
 * interno: qualquer script que rode nesta página consegue ler a chave, e a
 * tela diz isso em voz alta no painel. Não use numa instância pública.
 *
 * A chave sai do navegador uma vez por sessão, para o Route Handler da mesma
 * origem, que a usa só para criar o segredo efêmero e não guarda nada.
 */
import { MODELO_PADRAO } from "./modelos";
import { VOZ_PADRAO } from "./vozes";
import { BASE_PADRAO, PERSONA_PADRAO } from "./prompt";

export type DeteccaoDeTurno = "server_vad" | "semantic_vad";

export type Config = {
  chave: string;
  modelo: string;
  voz: string;
  velocidade: number;
  deteccao: DeteccaoDeTurno;
  persona: string;
  base: string;
};

export const CONFIG_PADRAO: Config = {
  chave: "",
  modelo: MODELO_PADRAO,
  voz: VOZ_PADRAO,
  velocidade: 1,
  deteccao: "semantic_vad",
  persona: PERSONA_PADRAO,
  base: BASE_PADRAO,
};

const STORAGE = "cardios-atendimento-voz:config";

export function lerConfig(): Config {
  if (typeof window === "undefined") return { ...CONFIG_PADRAO };
  try {
    const bruto = window.localStorage.getItem(STORAGE);
    if (!bruto) return { ...CONFIG_PADRAO };
    const salvo = JSON.parse(bruto) as Partial<Config>;
    return { ...CONFIG_PADRAO, ...salvo };
  } catch {
    return { ...CONFIG_PADRAO };
  }
}

export function gravarConfig(config: Config): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE, JSON.stringify(config));
  } catch {
    // Cota estourada ou modo privativo: a sessão atual continua funcionando.
  }
}

export function limparConfig(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE);
}

/** Mostra só o suficiente para reconhecer qual chave está salva. */
export function mascararChave(valor: string): string {
  const v = valor.trim();
  if (v.length <= 12) return "•".repeat(v.length);
  return `${v.slice(0, 7)}…${v.slice(-4)}`;
}

/** Checagem de forma, para pegar colagem errada antes de gastar uma ida à API. */
export function pareceChave(valor: string): boolean {
  return /^sk-[A-Za-z0-9_-]{20,}$/.test(valor.trim());
}
