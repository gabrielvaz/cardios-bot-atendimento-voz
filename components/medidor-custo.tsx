"use client";

/**
 * O que a conversa já custou, com a conta aberta.
 *
 * O número só aparece depois do primeiro turno respondido: a Realtime só manda
 * o `usage` no `response.done`. Enquanto isso a tela diz isso, em vez de
 * mostrar zero e parecer de graça.
 */
import { custoPorFaixa, custoUSD, formatarRelogio, formatarUSD, totalTokens, type Uso } from "@/lib/custo";
import { acharModelo } from "@/lib/modelos";

export function MedidorCusto({
  uso, modeloId, segundos, turnos, detalhado = false,
}: {
  uso: Uso; modeloId: string; segundos: number; turnos: number; detalhado?: boolean;
}) {
  const usd = custoUSD(uso, modeloId);
  const modelo = acharModelo(modeloId);

  if (!detalhado) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <span className="font-mono tabular-nums text-muted-foreground">{formatarRelogio(segundos)}</span>
        <span className="h-4 w-px bg-border" />
        {turnos === 0 ? (
          <span className="text-xs text-muted-foreground">a conta abre no primeiro turno</span>
        ) : (
          <span className="font-mono font-medium tabular-nums text-foreground">{formatarUSD(usd)}</span>
        )}
      </div>
    );
  }

  const faixas = custoPorFaixa(uso, modeloId);
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">Custo da conversa</span>
        <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">{formatarUSD(usd)}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {modelo.rotulo} · {formatarRelogio(segundos)} · {turnos} {turnos === 1 ? "turno" : "turnos"} ·{" "}
        {totalTokens(uso).toLocaleString("pt-BR")} tokens
      </p>
      {faixas.length > 0 && (
        <table className="w-full text-xs">
          <tbody>
            {faixas.map((f) => (
              <tr key={f.rotulo} className="border-t border-border">
                <td className="py-1.5 pr-2 text-muted-foreground">{f.rotulo}</td>
                <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-muted-foreground">
                  {f.tokens.toLocaleString("pt-BR")}
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums text-foreground">{formatarUSD(f.usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
