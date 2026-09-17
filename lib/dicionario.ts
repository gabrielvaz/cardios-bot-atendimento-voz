/**
 * Dicionário de correção da fala transcrita.
 *
 * Portado de `live-translation/lib/glossary.ts`, que foi escrito contra erro
 * real de transcrição, não contra suposição. O que mudou aqui: os termos são os
 * equipamentos da Cardios, e o dicionário ganhou um segundo emprego.
 *
 * Ele age em dois lugares, e os dois importam:
 *
 *   1. **Antes**, como `prompt` da transcrição. A Realtime aceita
 *      `audio.input.transcription.prompt`, e uma lista de nomes próprios ali
 *      enviesa o reconhecimento na origem. É a correção que vale mais: o
 *      modelo passa a ouvir "CardioLight" em vez de precisar ser consertado.
 *   2. **Depois**, sobre o texto que chega, para o que passou mesmo assim.
 *
 * O que isto corrige e o que não corrige:
 *
 *   - **Corrige** forma de superfície: "cardio online" e "Cardius" viram
 *     "Cardioline" e "Cardios".
 *   - **Não corrige** sentido. Se o modelo entendeu outra coisa, trocar
 *     palavra não conserta a frase.
 *
 * A correção roda sobre o texto **acumulado**, nunca sobre o delta isolado:
 * "CardioLight" costuma chegar partido em vários fragmentos, e casar em cima de
 * um fragmento solto nunca funcionaria.
 */

const CHAVE = "cardios-atendimento-voz:dicionario";
/** Termos padrão que o usuário apagou. Não voltam sozinhos. */
const CHAVE_REMOVIDOS = "cardios-atendimento-voz:dicionario-removidos";

export interface Termo {
  id: string;
  /** A forma correta, que vai para a tela. */
  termo: string;
  /** O que costuma sair errado. */
  variantes: string[];
}

/**
 * Dicionário de partida.
 *
 * Ao escolher variantes, o critério é: **a variante não pode ser uma palavra
 * legítima do português**. "voltar" como variante de Holter destruiria o verbo;
 * "eletro" como variante de ECG destruiria palavra corrente.
 *
 * Quando a variante colide com uma palavra comum, escreva-a **com maiúscula**:
 * variante maiúscula só casa maiúscula. O modelo capitaliza o que entende como
 * nome próprio, então "Alterna" corrige o nome mal ouvido e deixa o verbo
 * "alterna" em paz.
 */
export const DICIONARIO_PADRAO: Termo[] = [
  // Empresa e grupo
  {
    id: "d_cardios",
    termo: "Cardios",
    variantes: ["cardius", "cárdios", "cardio's", "cardiós", "cárdius", "cardioz"],
  },
  {
    id: "d_cardioline",
    termo: "Cardioline",
    variantes: [
      "cardio line", "cárdio line", "cardio lane", "cardio online", "card online",
      "card on line", "carta online", "cardio linha", "cardio lina",
      "cardioonline", "cardiolaine", "cardioláine", "cardialine", "cardiolinea",
      "cardiolínea", "cardiolimne", "cardiolini", "cardiolina", "cardiolinia",
      "cardiolyne", "cardiolain", "cardiolane", "cardiolin", "cardiolinha",
      "cardiolene", "cardiolines",
    ],
  },

  // Gravadores Holter
  {
    id: "d_cardiolight",
    termo: "CardioLight",
    variantes: ["cardio light", "cardiolaite", "cardio lait", "cárdio light", "cardio laite", "cardioleite", "cardio leite"],
  },
  {
    id: "d_cardiolight_plus",
    termo: "CardioLight+",
    variantes: ["cardio light mais", "cardiolight mais", "cardio light plus", "cardiolight plus"],
  },
  {
    id: "d_cardioloop",
    termo: "CardioLoop",
    variantes: ["cardio loop", "cardio lupi", "cardiolupe", "cardio lup", "cárdio loop", "cardio loopi"],
  },

  // Software e portal
  {
    id: "d_cardionet",
    termo: "CardioNet",
    variantes: ["cardio net", "cardio nete", "cardionete", "cárdio net", "cardio neti", "cardio network"],
  },
  {
    id: "d_cardiosmart",
    termo: "CardioSmart",
    variantes: ["cardio smart", "cardio esmart", "cardioesmart", "cardio smarte", "cárdio smart"],
  },
  { id: "d_cardiomapa", termo: "CardioMAPA", variantes: ["cardio mapa", "cárdio mapa", "cardiomapas"] },
  { id: "d_touchecg", termo: "touchECG", variantes: ["touch ecg", "tach ecg", "tuch ecg", "touch e c g", "tótch ecg"] },

  // MAPA e pressão
  {
    id: "d_dynamapa",
    termo: "Dyna-MAPA",
    variantes: ["dina mapa", "dinamapa", "dyna mapa", "daina mapa", "dina-mapa", "dínamapa", "dinâmapa"],
  },
  {
    id: "d_arteris",
    termo: "Arteris AOP",
    variantes: ["arteris a o p", "artéris aop", "arteres aop", "arteris aope", "artéris", "arteriz"],
  },
  { id: "d_aop", termo: "AOP", variantes: ["a o p", "á ô pê", "a. o. p."] },
  { id: "d_mapa", termo: "MAPA", variantes: ["m a p a", "eme a pê a"] },

  // ECG de repouso e esforço
  { id: "d_dynamis", termo: "Dynamis", variantes: ["dinamis", "dínamis", "dinamys", "daynamis", "dinâmis"] },
  { id: "d_cubestress", termo: "CubeStress", variantes: ["cube stress", "kiub stress", "cubi stress", "cub stress", "quiubi stress"] },
  { id: "d_ergo", termo: "Esteira MDX", variantes: ["esteira eme dê xis", "esteira m d x", "esteira emedeéxis"] },
  { id: "d_ecg100l", termo: "ECG100L", variantes: ["ecg 100 l", "e c g 100 l", "ecg cem l", "ecg cem ele"] },
  { id: "d_ecg200l", termo: "ECG200L", variantes: ["ecg 200 l", "e c g 200 l", "ecg duzentos l", "ecg duzentos ele"] },

  // Outros produtos
  { id: "d_cardioseven", termo: "CardioSeven", variantes: ["cardio seven", "cardio seve", "cardio sete", "cárdio seven"] },
  { id: "d_handymet", termo: "HandyMET", variantes: ["handy met", "rendi met", "rendimete", "handimete", "handy mete"] },
  { id: "d_hicardi", termo: "HiCardi", variantes: ["hi cardi", "rai cardi", "ri cardi", "high cardi", "rai cárdi"] },
  { id: "d_walkfree", termo: "Walk Free", variantes: ["uok free", "uauk free", "walk fri", "uok fri", "walkfree"] },
  { id: "d_tangom2", termo: "Tango M2", variantes: ["tango eme dois", "tango m 2", "tango eme 2"] },

  // Termos clínicos.
  // Holter é o caso difícil: o modelo o troca por uma palavra real diferente a
  // cada vez. As que são palavras legítimas entram **capitalizadas**, e por
  // isso só casam capitalizadas: "o roteador da sala" fica intacto.
  {
    id: "d_holter",
    termo: "Holter",
    variantes: [
      "rolter", "olter", "holte", "rólter", "ólter", "hólter", "houlter",
      "Holder", "Router", "Hotter", "Rooter", "Roteador", "Alterna", "Alter",
      "Ater", "Oter", "Oterno", "Euter", "Alten", "Halter", "Volter",
    ],
  },
  { id: "d_ecg", termo: "ECG", variantes: ["e c g", "e.c.g.", "e-c-g", "acg", "a c g", "ace ge", "ecgê"] },
  { id: "d_eletrodo", termo: "eletrodo", variantes: ["elétrodo", "eletródo"] },
  { id: "d_tricotomia", termo: "tricotomia", variantes: ["tricotamia", "trico tomia"] },
  { id: "d_manguito", termo: "manguito", variantes: ["mangito", "manguíto", "man guito"] },
  { id: "d_artefato", termo: "artefato", variantes: ["arte fato", "artefacto"] },

  // Técnico
  { id: "d_cartao_sd", termo: "cartão SD", variantes: ["cartão esse dê", "cartão s d", "cartão ese de"] },
  { id: "d_rs232", termo: "RS232", variantes: ["r s 232", "erre esse 232", "rs 232", "erre s duzentos e trinta e dois"] },
  { id: "d_usb", termo: "USB", variantes: ["u s b", "u esse bê", "usbê"] },
  { id: "d_bluetooth", termo: "Bluetooth", variantes: ["blue tooth", "blutuf", "blutúfi", "blutúth", "blu tuti"] },
  { id: "d_dicom", termo: "DICOM", variantes: ["d i c o m", "daicom", "dáicom", "dicon"] },
  { id: "d_worklist", termo: "Worklist", variantes: ["work list", "uorc list", "uórquilist", "work liste"] },
  { id: "d_anvisa", termo: "Anvisa", variantes: ["an visa", "anvisá", "anevisa"] },
];

/* ------------------------------------------------------------------ */
/* Armazenamento                                                      */
/* ------------------------------------------------------------------ */

function lerRemovidos(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const bruto = window.localStorage.getItem(CHAVE_REMOVIDOS);
    const lista = bruto ? (JSON.parse(bruto) as string[]) : [];
    return new Set(Array.isArray(lista) ? lista.map((t) => t.toLowerCase()) : []);
  } catch {
    return new Set();
  }
}

/**
 * Lê o dicionário do usuário e completa com os termos padrão que ele ainda não
 * tem, exceto os que apagou de propósito.
 *
 * Resolve dois problemas de uma vez: quem já usa recebe os termos novos de uma
 * versão futura sem fazer nada, e quem apagou "Holter" não o vê ressuscitar
 * toda vez que a lista padrão cresce.
 */
export function lerDicionario(): Termo[] {
  if (typeof window === "undefined") return DICIONARIO_PADRAO;

  let salvo: Termo[] | null = null;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    salvo = bruto === null ? null : (JSON.parse(bruto) as Termo[]);
  } catch {
    salvo = null;
  }
  if (!salvo || !Array.isArray(salvo)) return DICIONARIO_PADRAO;

  const removidos = lerRemovidos();
  const presentes = new Set(salvo.map((t) => t.termo.trim().toLowerCase()));
  const faltando = DICIONARIO_PADRAO.filter((t) => {
    const chave = t.termo.toLowerCase();
    return !presentes.has(chave) && !removidos.has(chave);
  });

  return faltando.length ? [...salvo, ...faltando] : salvo;
}

/** Grava no `localStorage` e registra quais padrões sumiram, para não voltarem. */
export function gravarDicionario(termos: Termo[]): void {
  if (typeof window === "undefined") return;

  const presentes = new Set(termos.map((t) => t.termo.trim().toLowerCase()));
  const removidos = DICIONARIO_PADRAO
    .map((t) => t.termo.toLowerCase())
    .filter((termo) => !presentes.has(termo));

  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(termos));
    window.localStorage.setItem(CHAVE_REMOVIDOS, JSON.stringify(removidos));
  } catch {
    // Cota cheia: o dicionário é o que menos importa perder.
  }
}

export function novoId(): string {
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function separarVariantes(entrada: string): string[] {
  return entrada.split(/[,\n;]/).map((v) => v.trim()).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* O viés na origem                                                   */
/* ------------------------------------------------------------------ */

/**
 * A lista de nomes próprios que vai no `prompt` da transcrição.
 *
 * Só as formas corretas: o campo serve para dizer ao modelo que palavras
 * esperar, não para ensinar o erro. Vai truncado porque o campo tem limite
 * prático e os primeiros termos são os que mais aparecem no suporte.
 */
export function promptDeTranscricao(termos: readonly Termo[], limite = 900): string {
  const cabeca = "Conversa de suporte técnico da Cardios sobre equipamentos de cardiologia. Nomes próprios que aparecem: ";
  const nomes: string[] = [];
  let tamanho = cabeca.length;
  for (const t of termos) {
    const nome = t.termo.trim();
    if (!nome) continue;
    if (tamanho + nome.length + 2 > limite) break;
    nomes.push(nome);
    tamanho += nome.length + 2;
  }
  return `${cabeca}${nomes.join(", ")}.`;
}

/* ------------------------------------------------------------------ */
/* Compilação                                                         */
/* ------------------------------------------------------------------ */

const ACENTOS: Record<string, string> = {
  a: "aáàâãä", e: "eéèêë", i: "iíìîï", o: "oóòôõö",
  u: "uúùûü", c: "cç", n: "nñ",
};

function escapar(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dobrar(letra: string, sensivel = false): string {
  const minuscula = letra.toLowerCase();
  const grupo = ACENTOS[minuscula];
  if (!grupo) return escapar(letra);
  if (sensivel) {
    return letra === minuscula ? `[${grupo}]` : `[${grupo.toUpperCase()}]`;
  }
  return `[${grupo}${grupo.toUpperCase()}]`;
}

/**
 * Uma variante vira padrão tolerante a acento e a espaçamento: "e c g" também
 * casa "e  c  g", e "cardio line" casa "cardio-line".
 */
function variantePadrao(variante: string, sensivel = false): string {
  return variante
    .trim()
    .split(/\s+/)
    .map((palavra) => [...palavra].map((l) => dobrar(l, sensivel)).join(""))
    .join("[\\s\\-]+");
}

export interface DicionarioCompilado {
  regras: Array<{ padrao: RegExp; troca: string }>;
  tamanho: number;
}

export function compilarDicionario(termos: readonly Termo[]): DicionarioCompilado {
  const regras: DicionarioCompilado["regras"] = [];

  for (const entrada of termos) {
    const termo = entrada.termo.trim();
    if (!termo) continue;

    // O próprio termo vira regra, para normalizar a caixa: "cardioline" e
    // "CardioLine" viram "Cardioline" sem listar cada variação. Exceto quando a
    // forma correta é toda minúscula, senão "Eletrodo" no começo de frase
    // perderia a maiúscula.
    if (termo !== termo.toLowerCase()) {
      regras.push(...comFronteira(variantePadrao(termo), termo, false));
    }

    // Variantes mais longas primeiro: senão "ecg" consome o começo de "ecg 100 l".
    const variantes = [...(entrada.variantes ?? [])]
      .map((v) => v.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    for (const variante of variantes) {
      if (variante.toLowerCase() === termo.toLowerCase()) continue;
      // Variante com maiúscula casa respeitando a caixa. É o que torna seguro
      // corrigir um erro que também é palavra comum.
      const sensivel = variante !== variante.toLowerCase();
      regras.push(...comFronteira(variantePadrao(variante, sensivel), termo, sensivel));
    }
  }

  return { regras, tamanho: regras.length };
}

/**
 * `\b` não serve de fronteira aqui porque a variante pode começar ou terminar
 * em pontuação, então a fronteira é feita por lookaround de caractere de palavra.
 */
function comFronteira(padrao: string, troca: string, sensivel: boolean) {
  const flags = sensivel ? "gu" : "giu";
  return [
    {
      padrao: new RegExp(`(?<![\\p{L}\\p{N}])${padrao}(?![\\p{L}\\p{N}])`, flags),
      troca,
    },
  ];
}

export function aplicarDicionario(texto: string, compilado: DicionarioCompilado): string {
  if (!texto || compilado.tamanho === 0) return texto;
  let resultado = texto;
  for (const regra of compilado.regras) {
    resultado = resultado.replace(regra.padrao, regra.troca);
  }
  return resultado;
}
