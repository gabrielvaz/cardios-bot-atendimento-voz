"use client";

/** A conversa em texto, rolando sozinha enquanto acontece. */
import { useEffect, useRef } from "react";
import type { Fala } from "@/lib/useAtendimento";
import { NOME_ATENDENTE } from "@/lib/prompt";
import { cn } from "@/lib/utils";

export function Transcricao({ falas }: { falas: Fala[] }) {
  const fim = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [falas]);

  if (falas.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        A conversa aparece aqui conforme vocês falam.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {falas.map((f) => (
        <div key={f.id} className={cn("flex flex-col", f.quem === "cliente" && "items-end")}>
          <span className="mb-1 text-xs font-medium text-muted-foreground">
            {f.quem === "clara" ? NOME_ATENDENTE : "Você"}
          </span>
          <p
            className={cn(
              "max-w-[85%] rounded-lg px-4 py-2.5 text-[15px] leading-relaxed",
              f.quem === "clara"
                ? "bg-primary/5 text-foreground"
                : "border border-border bg-card text-foreground",
              f.parcial && "opacity-60",
            )}
          >
            {f.texto || "…"}
          </p>
        </div>
      ))}
      <div ref={fim} />
    </div>
  );
}
