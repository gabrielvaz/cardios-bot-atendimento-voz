import dados from "./dados.json";

export type Conhecimento = typeof dados;
export const conhecimento: Conhecimento = dados;

/**
 * A base vira o texto que a Cora lê. Markdown enxuto de propósito: cabeçalho
 * curto, sem tabela, sem link solto. O modelo lê isto uma vez por sessão e
 * depois vem do cache.
 */
export function montarBase(c: Conhecimento = conhecimento): string {
  const { contato: k } = c;
  const partes: string[] = [];

  partes.push(
    `# A Cardios\n\n${k.empresa.nomeCompleto}, fundada em ${k.empresa.fundacao}, do grupo ${k.empresa.grupo}. ` +
      `${k.empresa.descricao} Tem cerca de ${k.empresa.equipamentosNoMercado.toLocaleString("pt-BR")} equipamentos instalados no Brasil.`,
  );

  partes.push(
    `# Canais de atendimento\n\n` +
      `Horário: ${k.horario}.\n` +
      k.telefones.map((t) => `- ${t.area}: ${t.numero}`).join("\n") +
      `\n- WhatsApp: ${k.whatsapp}\n` +
      `- E-mail de assistência técnica: ${k.emails.assistencia}\n` +
      `- E-mail de vendas: ${k.emails.vendas}\n` +
      `- Endereço para envio de equipamento: ${k.enderecoAssistencia}\n` +
      `- Manuais e downloads: ${k.manuais}\n` +
      `- Loja de acessórios: ${k.lojaAcessorios}`,
  );

  partes.push(`# Políticas\n\n${k.politicas.map((p) => `- ${p}`).join("\n")}`);

  partes.push(
    `# Catálogo de produtos\n\n` +
      c.produtos
        .map((p) => {
          const specs = p.specs.length ? `\n  ${p.specs.join(" | ")}` : "";
          const tags = p.tags.length ? ` [${p.tags.join(", ")}]` : "";
          return `- **${p.nome}**${tags}: ${p.resumo}${specs}`;
        })
        .join("\n"),
  );

  partes.push(
    `# Base de artigos do suporte\n\n` +
      `Estes são os problemas que mais chegam ao suporte da Cardios, com a ` +
      `resposta oficial. O volume é o número real de chamados entre junho e ` +
      `setembro de 2026.\n\n` +
      c.faq
        .map((a) => {
          const cab = [
            `## ${a.titulo}`,
            `Categoria: ${a.categoria}. Produtos: ${a.produtos.join(", ") || "nenhum"}.` +
              (a.volume ? ` Volume: ${a.volume}.` : ""),
            a.video ? `Vídeo oficial: ${a.video}` : null,
          ]
            .filter(Boolean)
            .join("\n");
          return `${cab}\n\n${a.corpo}`;
        })
        .join("\n\n---\n\n"),
  );

  return partes.join("\n\n---\n\n");
}
