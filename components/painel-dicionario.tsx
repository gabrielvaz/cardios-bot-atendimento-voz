"use client";

/**
 * A administração do dicionário de fala.
 *
 * Cada linha é um nome próprio e as formas erradas que o reconhecimento produz
 * para ele. O termo certo vai para o `prompt` da transcrição, que enviesa o
 * reconhecimento na origem; as variantes corrigem o que passou.
 *
 * A busca existe porque a lista padrão já nasce com quase quarenta termos e
 * quem vem aqui está atrás de um nome específico que saiu errado na ligação.
 */
import { useMemo, useState } from "react";
import { Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { Button, Input, Label, Textarea } from "@/components/ui/beat";
import {
  DICIONARIO_PADRAO, novoId, separarVariantes, type Termo,
} from "@/lib/dicionario";

export function PainelDicionario({
  termos, aoMudar,
}: {
  termos: Termo[];
  aoMudar: (termos: Termo[]) => void;
}) {
  const [busca, setBusca] = useState("");
  const [novoTermo, setNovoTermo] = useState("");
  const [novasVariantes, setNovasVariantes] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return termos;
    return termos.filter(
      (t) =>
        t.termo.toLowerCase().includes(q) ||
        t.variantes.some((v) => v.toLowerCase().includes(q)),
    );
  }, [termos, busca]);

  const totalVariantes = termos.reduce((n, t) => n + t.variantes.length, 0);

  const acrescentar = () => {
    const termo = novoTermo.trim();
    if (!termo) return;
    aoMudar([
      { id: novoId(), termo, variantes: separarVariantes(novasVariantes) },
      ...termos,
    ]);
    setNovoTermo("");
    setNovasVariantes("");
  };

  const editar = (id: string, parcial: Partial<Termo>) =>
    aoMudar(termos.map((t) => (t.id === id ? { ...t, ...parcial } : t)));

  const remover = (id: string) => aoMudar(termos.filter((t) => t.id !== id));

  return (
    <>
      <div>
        <Label hint="A forma certa vai para o prompt da transcrição e enviesa o reconhecimento. As variantes corrigem o que passou mesmo assim.">
          Novo termo
        </Label>
        <div className="space-y-2">
          <Input
            value={novoTermo}
            onChange={(e) => setNovoTermo(e.target.value)}
            placeholder="CardioLight"
            onKeyDown={(e) => e.key === "Enter" && acrescentar()}
          />
          <Textarea
            className="h-16 resize-none"
            value={novasVariantes}
            onChange={(e) => setNovasVariantes(e.target.value)}
            placeholder="cardio light, cardiolaite, cardio leite"
          />
          <Button className="w-full" onClick={acrescentar} disabled={!novoTermo.trim()}>
            <Plus /> Acrescentar
          </Button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Uma variante não pode ser palavra legítima do português: &ldquo;voltar&rdquo; como
          variante de Holter destruiria o verbo. Quando a forma errada também é palavra
          comum, escreva-a com maiúscula. Assim ela só casa capitalizada, que é como o
          modelo escreve o que entende como nome próprio.
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">
            {termos.length} termos, {totalVariantes} variantes
          </span>
          <Button
            variant="ghost" size="sm"
            onClick={() => aoMudar(DICIONARIO_PADRAO)}
            title="Descarta suas edições e volta à lista que vem com a aplicação"
          >
            <RotateCcw /> original
          </Button>
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar termo ou variante"
            className="pl-9"
          />
        </div>

        {filtrados.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum termo com &ldquo;{busca}&rdquo;.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtrados.map((t) => (
              <li key={t.id} className="rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={t.termo}
                    onChange={(e) => editar(t.id, { termo: e.target.value })}
                    className="h-8 font-medium"
                    aria-label="Forma correta"
                  />
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => remover(t.id)}
                    aria-label={`Remover ${t.termo}`}
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </div>
                <Textarea
                  className="mt-2 h-14 resize-none"
                  value={t.variantes.join(", ")}
                  onChange={(e) => editar(t.id, { variantes: separarVariantes(e.target.value) })}
                  placeholder="formas erradas, separadas por vírgula"
                  aria-label={`Variantes de ${t.termo}`}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
