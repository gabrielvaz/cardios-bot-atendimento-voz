"use client";

/**
 * A tela inteira. Três momentos: antes de ligar, durante a conversa e o resumo
 * depois de desligar.
 *
 * No desktop a configuração é uma coluna à direita; no celular ela cobre a tela,
 * porque 440 px de painel ao lado de 390 px de viewport não existe.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, Mic, PhoneOff, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/beat";
import { PainelConfig } from "@/components/painel-config";
import { Transcricao } from "@/components/transcricao";
import { MedidorCusto } from "@/components/medidor-custo";
import { useAtendimento } from "@/lib/useAtendimento";
import { paraTexto } from "@/lib/falas";
import { CONFIG_PADRAO, gravarConfig, lerConfig, pareceChave, type Config } from "@/lib/config";
import { NOME_ATENDENTE, montarPrompt } from "@/lib/prompt";
import {
  compilarDicionario, gravarDicionario, lerDicionario, promptDeTranscricao,
  DICIONARIO_PADRAO, type Termo,
} from "@/lib/dicionario";
import { cn } from "@/lib/utils";

export function Atendimento() {
  const [config, setConfig] = useState<Config>(CONFIG_PADRAO);
  const [dicionario, setDicionario] = useState<Termo[]>(DICIONARIO_PADRAO);
  const [painelAberto, setPainelAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  // O localStorage só existe no browser; ler depois da montagem evita
  // divergência entre o HTML gerado no build e o do cliente.
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    const salvo = lerConfig();
    setConfig(salvo);
    setDicionario(lerDicionario());
    setMontado(true);
    if (!salvo.chave) setPainelAberto(true);
  }, []);

  const mudarConfig = useCallback((parcial: Partial<Config>) => {
    setConfig((atual) => {
      const novo = { ...atual, ...parcial };
      gravarConfig(novo);
      return novo;
    });
  }, []);

  const mudarDicionario = useCallback((termos: Termo[]) => {
    setDicionario(termos);
    gravarDicionario(termos);
  }, []);

  // Compilar dezenas de expressões regulares a cada tecla digitada no
  // dicionário seria desperdício; isto só refaz quando a lista muda.
  const compilado = useMemo(() => compilarDicionario(dicionario), [dicionario]);
  const promptTranscricao = useMemo(() => promptDeTranscricao(dicionario), [dicionario]);

  const configAtiva = useMemo(
    () => ({
      ...config,
      promptMontado: montarPrompt(config.persona, config.base),
      promptTranscricao,
      dicionario: compilado,
    }),
    [config, compilado, promptTranscricao],
  );

  const { estado, falas, uso, turnos, segundos, falando, erro, iniciar, encerrar, limparErro } =
    useAtendimento(configAtiva);

  const emLigacao = estado === "conectando" || estado === "ativo";
  const podeIniciar = montado && pareceChave(config.chave);

  const copiarTranscricao = async () => {
    await navigator.clipboard.writeText(paraTexto(falas, NOME_ATENDENTE));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {NOME_ATENDENTE[0]}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-sm leading-tight font-semibold text-foreground">
                {NOME_ATENDENTE} · Suporte Cardios
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                Teste interno, não é atendimento oficial
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {emLigacao && (
              <div className="hidden sm:block">
                <MedidorCusto uso={uso} modeloId={config.modelo} segundos={segundos} turnos={turnos} />
              </div>
            )}
            <Button
              variant={painelAberto ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPainelAberto((v) => !v)}
            >
              <Settings2 />
              <span className="hidden sm:inline">Configuração</span>
            </Button>
          </div>
        </header>

        {/* No celular o medidor não cabe no cabeçalho, então ganha a própria faixa. */}
        {emLigacao && (
          <div className="flex justify-center border-b border-border bg-card px-4 py-2 sm:hidden">
            <MedidorCusto uso={uso} modeloId={config.modelo} segundos={segundos} turnos={turnos} />
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className={cn(
            "mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8",
            estado === "parado" && falas.length === 0 && "justify-center",
          )}>
            {erro && (
              <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{erro.titulo}</p>
                    {erro.comoResolver && (
                      <p className="mt-1 text-sm text-muted-foreground">{erro.comoResolver}</p>
                    )}
                    {erro.detalhe && (
                      <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-muted p-2 font-mono text-[11px] whitespace-pre-wrap text-muted-foreground">
                        {erro.detalhe}
                      </pre>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={limparErro}>fechar</Button>
                </div>
              </div>
            )}

            {estado === "parado" && falas.length === 0 && (
              <div className="flex flex-col items-center text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Fale com a {NOME_ATENDENTE}
                </h2>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-balance text-muted-foreground">
                  Ela atende o suporte técnico da Cardios. Conte o problema em voz alta,
                  como faria no telefone, e ela responde na hora.
                </p>
                <Button size="xl" className="mt-8" onClick={iniciar} disabled={!podeIniciar}>
                  <Mic /> Iniciar atendimento
                </Button>
                {montado && !podeIniciar && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Falta a chave da OpenAI.{" "}
                    <button onClick={() => setPainelAberto(true)} className="text-primary underline underline-offset-4">
                      Abrir configuração
                    </button>
                  </p>
                )}
                {podeIniciar && (
                  <p className="mt-4 max-w-xs text-xs leading-relaxed text-balance text-muted-foreground">
                    O navegador vai pedir o microfone. Use fone de ouvido: sem ele a
                    Clara escuta a própria voz.
                  </p>
                )}
              </div>
            )}

            {emLigacao && (
              <>
                <Disco estado={estado} falando={falando} />
                <div className="mt-8">
                  <Transcricao falas={falas} />
                </div>
              </>
            )}

            {estado === "encerrado" && (
              <>
                <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-card">
                  <MedidorCusto
                    detalhado uso={uso} modeloId={config.modelo}
                    segundos={segundos} turnos={turnos}
                  />
                </div>
                <div className="mb-8 flex justify-center">
                  <Button size="lg" onClick={iniciar} disabled={!podeIniciar}>
                    <Mic /> Ligar de novo
                  </Button>
                </div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">A conversa</h2>
                  <Button variant="ghost" size="sm" onClick={copiarTranscricao}>
                    {copiado ? <Check /> : <Copy />}
                    {copiado ? "copiado" : "copiar"}
                  </Button>
                </div>
                <Transcricao falas={falas} />
              </>
            )}
          </div>
        </div>

        {emLigacao && (
          <footer className="border-t border-border bg-card px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            <div className="mx-auto flex w-full max-w-2xl justify-center">
              <Button variant="outline" size="lg" onClick={encerrar}>
                <PhoneOff /> Encerrar
              </Button>
            </div>
          </footer>
        )}
      </main>

      {painelAberto && (
        <PainelConfig
          config={config} aoMudar={mudarConfig}
          dicionario={dicionario} aoMudarDicionario={mudarDicionario}
          aoFechar={() => setPainelAberto(false)} travado={emLigacao}
        />
      )}
    </div>
  );
}

/** O disco que diz de quem é a vez. */
function Disco({ estado, falando }: { estado: string; falando: "clara" | "cliente" | null }) {
  const legenda =
    estado === "conectando" ? "chamando…"
      : falando === "clara" ? `${NOME_ATENDENTE} está falando`
      : falando === "cliente" ? "ouvindo você"
      : "pode falar";

  return (
    <div className="flex flex-col items-center py-2">
      <div className="relative grid size-20 place-items-center sm:size-24">
        {falando && (
          <span
            className={cn(
              "pulso absolute inset-0 rounded-full",
              falando === "clara" ? "bg-primary/30" : "bg-accent/20",
            )}
          />
        )}
        <span
          className={cn(
            "relative grid size-20 place-items-center rounded-full text-2xl font-semibold transition-colors sm:size-24",
            falando === "clara"
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-foreground",
            estado === "conectando" && "animate-pulse",
          )}
        >
          {falando === "cliente" ? (
            <span className="barra flex items-end gap-1 text-muted-foreground">
              <span /><span /><span />
            </span>
          ) : (
            NOME_ATENDENTE[0]
          )}
        </span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{legenda}</p>
    </div>
  );
}
