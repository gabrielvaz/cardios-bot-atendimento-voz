"use client";

/**
 * O painel de configuração do teste interno: chave, modelo, voz, detecção de
 * turno e o system prompt, aberto e editável.
 *
 * Nada aqui é escondido de propósito. A ideia é poder mudar o jeito da Cora,
 * trocar de modelo e ver o preço mudar sem sair da tela.
 */
import { useState } from "react";
import { Eye, EyeOff, RotateCcw, X } from "lucide-react";
import { Button, Dialog, Input, Label, OptionCard, Textarea } from "@/components/ui/beat";
import { MODELOS } from "@/lib/modelos";
import { VOZES } from "@/lib/vozes";
import { BASE_PADRAO, PERSONA_PADRAO, estimarTokens, montarPrompt } from "@/lib/prompt";
import { PREMISSAS_MINUTO, custoPorMinuto, formatarUSD } from "@/lib/custo";
import { mascararChave, pareceChave, type Config } from "@/lib/config";
import { PainelDicionario } from "@/components/painel-dicionario";
import type { Termo } from "@/lib/dicionario";
import { cn } from "@/lib/utils";

type Aba = "acesso" | "voz" | "dicionario" | "prompt";

export function PainelConfig({
  config, aoMudar, dicionario, aoMudarDicionario, aoFechar, travado,
}: {
  config: Config;
  aoMudar: (parcial: Partial<Config>) => void;
  dicionario: Termo[];
  aoMudarDicionario: (termos: Termo[]) => void;
  aoFechar: () => void;
  /** Durante a ligação a sessão já está aberta: mudar aqui só vale na próxima. */
  travado: boolean;
}) {
  const [aba, setAba] = useState<Aba>(config.chave ? "voz" : "acesso");
  const [verChave, setVerChave] = useState(!config.chave);
  const [baseAberta, setBaseAberta] = useState(false);

  const prompt = montarPrompt(config.persona, config.base);
  const tokens = estimarTokens(prompt);

  return (
    <aside className="fixed inset-0 z-40 flex min-w-0 flex-col bg-card md:static md:z-auto md:w-[440px] md:shrink-0 md:border-l md:border-border">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Configuração</h2>
          <p className="text-xs text-muted-foreground">
            {travado ? "A ligação está aberta. Mudanças valem na próxima." : "Vale na próxima ligação."}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={aoFechar} aria-label="Fechar configuração">
          <X />
        </Button>
      </header>

      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-3 py-2">
        {([["acesso", "Acesso"], ["voz", "Modelo e voz"], ["dicionario", "Dicionário"], ["prompt", "Prompt"]] as const).map(([id, rotulo]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              aba === id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {rotulo}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-5">
        {aba === "acesso" && (
          <div>
            <Label hint="Fica no localStorage deste navegador e vai direto para a api.openai.com quando você liga. Não passa por servidor nenhum.">
              Chave da OpenAI
            </Label>
            <div className="flex gap-2">
              <Input
                type={verChave ? "text" : "password"}
                value={verChave ? config.chave : config.chave ? mascararChave(config.chave) : ""}
                onChange={(e) => aoMudar({ chave: e.target.value })}
                placeholder="sk-..."
                spellCheck={false}
                autoComplete="off"
                className="font-mono"
              />
              <Button
                variant="outline" size="icon"
                onClick={() => setVerChave((v) => !v)}
                aria-label={verChave ? "Esconder a chave" : "Mostrar a chave"}
              >
                {verChave ? <EyeOff /> : <Eye />}
              </Button>
            </div>
            {config.chave && !pareceChave(config.chave) && (
              <p className="mt-2 text-xs text-destructive">
                Isso não tem cara de chave da OpenAI. Elas começam com <code>sk-</code>.
              </p>
            )}
          </div>
        )}

        {aba === "voz" && (
          <>
            <div>
              <Label hint={`Preço por 1 milhão de tokens de áudio, entrada e saída. A previsão por minuto supõe meio minuto de fala de cada lado, ${PREMISSAS_MINUTO.turnosPorMinuto} turnos por minuto e o prompt de ~${tokens.toLocaleString("pt-BR")} tokens relido do cache a cada turno.`}>
                Modelo
              </Label>
              <div className="space-y-1.5">
                {MODELOS.map((m) => (
                  <OptionCard
                    key={m.id}
                    selected={config.modelo === m.id}
                    title={m.rotulo}
                    note={m.nota}
                    right={
                      <span className="block space-y-0.5">
                        <span className="block font-mono">
                          ${m.preco.audioEntrada} / ${m.preco.audioSaida}
                        </span>
                        <span className="block text-[10px] opacity-70">por 1M de tokens</span>
                        <span className="block pt-1 font-mono font-medium text-foreground">
                          ~{formatarUSD(custoPorMinuto(m.id, tokens))}
                        </span>
                        <span className="block text-[10px] opacity-70">por minuto</span>
                      </span>
                    }
                    onClick={() => aoMudar({ modelo: m.id })}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label hint="A descrição é impressão de escuta. Vale testar duas ou três.">Voz</Label>
              <div className="space-y-1.5">
                {VOZES.map((v) => (
                  <OptionCard
                    key={v.id}
                    selected={config.voz === v.id}
                    title={v.id}
                    note={v.nota}
                    onClick={() => aoMudar({ voz: v.id })}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label hint={`${config.velocidade.toFixed(2)}×. Abaixo de 1 a Cora fala mais devagar.`}>
                Velocidade da fala
              </Label>
              <input
                type="range" min={0.5} max={1.5} step={0.05}
                value={config.velocidade}
                onChange={(e) => aoMudar({ velocidade: Number(e.target.value) })}
                className="w-full accent-[hsl(var(--primary))]"
              />
            </div>

            <div>
              <Label hint="Semântico espera você terminar o raciocínio; VAD corta no silêncio e responde mais rápido.">
                Detecção de turno
              </Label>
              <div className="space-y-1.5">
                <OptionCard
                  selected={config.deteccao === "semantic_vad"} title="semantic_vad"
                  note="Entende que você ainda vai completar a frase. Menos atropelo."
                  onClick={() => aoMudar({ deteccao: "semantic_vad" })}
                />
                <OptionCard
                  selected={config.deteccao === "server_vad"} title="server_vad"
                  note="Responde assim que detecta silêncio. Mais rápido, interrompe mais."
                  onClick={() => aoMudar({ deteccao: "server_vad" })}
                />
              </div>
            </div>
          </>
        )}

        {aba === "dicionario" && (
          <PainelDicionario termos={dicionario} aoMudar={aoMudarDicionario} />
        )}

        {aba === "prompt" && (
          <>
            <p className="text-xs text-muted-foreground">
              Prompt montado: <strong className="text-foreground">~{tokens.toLocaleString("pt-BR")} tokens</strong>
              {tokens > 20000 && <span className="text-destructive"> · grande para um contexto de 32 mil</span>}
            </p>

            <div>
              <div className="flex items-start justify-between gap-2">
                <Label hint="Quem a Cora é e como ela atende. Esta parte é para mexer.">Persona</Label>
                <Button variant="ghost" size="sm" onClick={() => aoMudar({ persona: PERSONA_PADRAO })}>
                  <RotateCcw /> original
                </Button>
              </div>
              <Textarea
                className="h-[45vh] resize-none"
                value={config.persona}
                onChange={(e) => aoMudar({ persona: e.target.value })}
                spellCheck={false}
              />
            </div>

            <div>
              <Label hint="Gerada do FAQ publicado, do catálogo e dos dados de contato. Rode npm run conhecimento para atualizar.">
                Base de conhecimento
              </Label>
              <Button variant="outline" className="w-full" onClick={() => setBaseAberta(true)}>
                Abrir os {config.base.length.toLocaleString("pt-BR")} caracteres
              </Button>
            </div>
          </>
        )}
      </div>

      <Dialog
        wide
        open={baseAberta}
        onOpenChange={setBaseAberta}
        title="Base de conhecimento"
        description="Gerada do FAQ publicado, do catálogo do cardios-site e dos dados de contato. Editar aqui vale só neste navegador; para mudar a fonte, rode npm run conhecimento."
      >
        <Textarea
          className="h-[50vh] resize-none"
          value={config.base}
          onChange={(e) => aoMudar({ base: e.target.value })}
          spellCheck={false}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {config.base.length.toLocaleString("pt-BR")} caracteres
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => aoMudar({ base: BASE_PADRAO })}>
              <RotateCcw /> voltar ao original
            </Button>
            <Button size="sm" onClick={() => setBaseAberta(false)}>Fechar</Button>
          </div>
        </div>
      </Dialog>
    </aside>
  );
}
