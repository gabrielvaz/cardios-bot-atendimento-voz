# Clara, atendimento de suporte da Cardios por voz

Teste interno. Uma página: você clica em iniciar, fala, e a Clara responde em
voz, em tempo real, sabendo o que o suporte da Cardios sabe. O custo da
conversa aparece na tela enquanto ela acontece.

Não é atendimento oficial e não deve ser publicado com a chave de uma conta de
produção. A chave da OpenAI vive no `localStorage` do navegador, de propósito.

**No ar:** https://gabrielvaz.github.io/cardios-bot-atendimento-voz/

```bash
npm install
npm run dev     # http://localhost:3210
```

Abra a configuração, cole a chave da OpenAI e ligue. O navegador vai pedir o
microfone: isso só funciona em `localhost` ou em HTTPS. **Use fone de ouvido.**
Sem ele a Clara escuta a própria voz e se interrompe.

## O que ela sabe

| Fonte | O que entra |
| --- | --- |
| [Central de Ajuda](https://v9q.github.io/faqcardios/) | 12 artigos, com o volume real de chamados do Suri entre junho e setembro de 2026 |
| `../cardios-site/content/products.json` | 25 produtos do catálogo, condensados |
| `scripts/contato.json` | telefones por área, endereço de assistência, horário, garantia, loja |

Tudo isso vira um texto único e entra no system prompt. São cerca de 12 mil
tokens de um contexto de 32 mil. Cabe, e depois do primeiro turno vem do cache,
que custa oitenta vezes menos.

Quando o FAQ mudar:

```bash
npm run conhecimento    # rebaixa lib/conhecimento/dados.json das fontes
```

A escolha foi prompt inteiro, não busca com tool. São 37 documentos, não 370.
Se o contexto apertar, a tool entra depois sem reescrever nada: `montarBase()`
já está isolada em `lib/conhecimento/index.ts`.

## O dicionário de fala

O reconhecimento de voz erra nome próprio o tempo todo: "cardio online" por
Cardioline, "Cardius" por Cardios, "Router" por Holter. O dicionário
(`lib/dicionario.ts`) age em dois lugares, e os dois importam:

1. **Antes.** As formas corretas vão no `prompt` da transcrição, que enviesa o
   reconhecimento na origem. É a correção que vale mais: melhor o modelo ouvir
   "CardioLight" do que ser consertado depois.
2. **Depois.** As variantes corrigem, por expressão regular, o que passou mesmo
   assim, sempre sobre o texto acumulado e nunca sobre o fragmento solto.

Vem com 36 termos e 193 variantes, e a aba **Dicionário** na configuração deixa
acrescentar, editar e remover. O que você apagar não volta quando a lista padrão
crescer numa versão futura.

A regra ao escrever uma variante: **ela não pode ser palavra legítima do
português**. "voltar" como variante de Holter destruiria o verbo. Quando a forma
errada também é palavra comum, escreva-a com maiúscula: variante capitalizada só
casa capitalizada, e o modelo capitaliza o que entende como nome próprio. É
assim que "Router" vira Holter sem que "o roteador da sala" seja tocado.

Portado de `live-translation/lib/glossary.ts`, que foi escrito contra erro real
de transcrição, não contra suposição.

## O que dá para mexer na tela

Tudo fica no `localStorage` e vale na ligação seguinte.

- **Chave da OpenAI** e cotação do dólar
- **Modelo**, entre os seis Realtime, com o preço de cada um ao lado
- **Voz**, entre as dez, e a velocidade da fala
- **Detecção de turno**: `semantic_vad` espera você terminar o raciocínio,
  `server_vad` corta no silêncio e responde mais rápido
- **O dicionário de fala**, com busca, edição e volta ao original
- **O system prompt inteiro**, em duas partes: a persona da Clara, curta e feita
  para editar, e a base gerada. Com a contagem de tokens ao vivo.

## Como funciona por dentro

Não existe servidor. A aplicação é HTML e JS estáticos, e os dois passos que
falam com a OpenAI saem do próprio navegador:

```
browser ──POST api.openai.com/v1/realtime/client_secrets──▶ ek_... (10 min)
        │        (chave, modelo, voz, prompt)
        └──POST api.openai.com/v1/realtime/calls (SDP)────▶ áudio por WebRTC
                                                            eventos por `oai-events`
```

Isso só é possível porque a API devolve `access-control-allow-origin: *` e
aceita o header `authorization` nos dois endpoints, verificado em 2026-09-17.
Uma versão anterior tinha um Route Handler no meio; ele saiu quando a aplicação
passou a ser publicada no GitHub Pages, e não fazia falta: a chave já vivia no
navegador de qualquer jeito.

A configuração da sessão vai embutida no segredo efêmero, então não há
`session.update` na abertura da chamada.

O microfone exige contexto seguro. Funciona em `localhost` e no Pages, que é
HTTPS; não funciona se você abrir o `out/index.html` pelo `file://`.

## O custo

A Realtime cobra por token e separa áudio de texto. O mesmo campo `input_tokens`
mistura três preços: texto novo, áudio novo e o que veio do cache. Somar tudo
pelo preço de áudio erra por quase cem vezes a partir do segundo turno, porque o
prompt da Clara inteiro entra em cache.

`lib/custo.ts` faz essa separação e é função pura de ponta a ponta, sem relógio
e sem rede. É a única parte testável sem microfone e a que mais dói se estiver
errada.

```bash
npm test
```

Preços conferidos em [developers.openai.com/api/docs/pricing](https://developers.openai.com/api/docs/pricing)
em 2026-09-17. Estão em `lib/modelos.ts`; quando a OpenAI mudar, é o único
arquivo a tocar.

## Onde está o quê

```
lib/useAtendimento.ts               a ligação: segredo efêmero, WebRTC, estado
lib/custo.ts                        a conta (puro, testado)
lib/falas.ts                        a lista da conversa e a ordem dela (puro, testado)
lib/dicionario.ts                   a correção da fala (puro, testado)
lib/modelos.ts  lib/vozes.ts        as tabelas de preço e de voz
lib/prompt.ts                       a persona da Clara e a montagem
lib/conhecimento/                   a base gerada e o markdown que o modelo lê
components/atendimento.tsx          a tela inteira
components/painel-config.tsx        o painel de configuração
components/painel-dicionario.tsx    a administração do dicionário
components/ui/beat.tsx              o Beat Design System portado para React
.github/workflows/pages.yml         o deploy
scripts/gerar-conhecimento.mjs      extrai das fontes
scripts/*.test.ts                   os testes
```

## Sobre o Beat

O Beat Design System vive em `cardioline/beat-design-system` e é Vue desde a
1.0, então o pacote `beat-ds` não entra num app React. O que veio para cá foi a
definição, em `components/ui/beat.tsx` e nos tokens de `app/globals.css`: os
mesmos `buttonVariants` (que já são cva puro), as mesmas classes de Dialog e as
mesmas variáveis de cor e raio. Reka UI, que o Beat usa, é a porta Vue do Radix;
aqui usamos o Radix. Quando o Beat ganhar de volta uma versão React, esse
arquivo sai.

## O que ainda não foi testado

A conversa de verdade. O que está verificado: o build estático passa, os 39
testes passam, a página responde em celular e desktop sem estouro de largura, e
a OpenAI aceita chamada do navegador nos dois endpoints. Falta ligar com uma
chave real e ouvir a Clara.

Uma nota sobre a ordem da conversa: a transcrição do que o cliente falou chega
**depois** que a Clara já começou a responder, porque transcrever a entrada é um
trabalho paralelo ao de gerar a resposta. O lugar do cliente é reservado em
`input_audio_buffer.committed`, que fecha o turno dele. `lib/falas.ts` existe
fora do hook só para essa regra poder ser testada, e um dos testes é o bug
antigo, para ele não voltar em silêncio.
