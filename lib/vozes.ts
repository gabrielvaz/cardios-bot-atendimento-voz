/**
 * As dez vozes aceitas pela Realtime, na ordem em que vale a pena testar para
 * uma atendente brasileira. A descrição é impressão de escuta, não spec da
 * OpenAI. Serve para você escolher sem precisar ouvir as dez.
 */
export type Voz = { id: string; nota: string };

export const VOZES: Voz[] = [
  { id: "marin", nota: "Feminina, cora e calma. A mais natural em português." },
  { id: "cedar", nota: "Masculina, grave e pausada." },
  { id: "coral", nota: "Feminina, quente e próxima." },
  { id: "sage", nota: "Feminina, sóbria e baixa." },
  { id: "shimmer", nota: "Feminina, mais aguda e animada." },
  { id: "alloy", nota: "Neutra, seca. A voz padrão da API." },
  { id: "ash", nota: "Masculina, firme." },
  { id: "ballad", nota: "Masculina, melódica." },
  { id: "echo", nota: "Masculina, neutra." },
  { id: "verse", nota: "Masculina, expressiva." },
];

export const VOZ_PADRAO = "marin";
