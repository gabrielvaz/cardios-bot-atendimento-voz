"use client";

/**
 * Os componentes do Beat Design System, portados para React.
 *
 * O Beat é Vue desde a 1.0 (cardioline/beat-design-system, packages/ui), então
 * o pacote não entra num app React. O que veio para cá foi a definição, não uma
 * aproximação:
 *
 *   - `buttonVariants` é cópia literal de packages/ui/src/components/button/variants.ts,
 *     que já é cva puro e não depende de framework. Raio 8px, não pílula.
 *   - As classes do Dialog são as de DialogContent.vue e DialogOverlay.vue.
 *   - Reka UI, que o Beat usa, é a porta Vue do Radix. Aqui usamos o Radix.
 *
 * Quando o Beat ganhar de volta uma versão React, isto aqui sai.
 */
import { Dialog as RadixDialog } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90 active:scale-[0.98]",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent/10 hover:text-primary hover:border-primary/50",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent/10 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        xl: "h-14 rounded-lg px-10 text-base font-semibold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button {...props} className={cn(buttonVariants({ variant, size }), className)} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed shadow-sm transition-colors",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    />
  );
}

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <span className="text-sm leading-none font-medium text-foreground">{children}</span>
      {hint && <p className="mt-1 text-xs leading-snug text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Um cartão selecionável. Usado para modelo, voz e detecção de turno. */
export function OptionCard({
  selected, title, note, right, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean; title: string; note: string; right?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex w-full items-start justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition-all",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-input bg-background hover:border-primary/50",
      )}
    >
      <span className="min-w-0">
        <span className="block font-mono text-[13px] font-medium text-foreground">{title}</span>
        <span className="block text-xs leading-snug text-muted-foreground">{note}</span>
      </span>
      {right && <span className="shrink-0 text-right text-[11px] text-muted-foreground">{right}</span>}
    </button>
  );
}

/** O Dialog do Beat: mesmas classes de DialogOverlay.vue e DialogContent.vue. */
export function Dialog({
  open, onOpenChange, title, description, children, wide = false,
}: {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[1px] duration-200 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <RadixDialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xl duration-200 ease-in-out",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none",
            wide ? "max-w-3xl" : "max-w-lg",
          )}
        >
          <div className="flex flex-col gap-y-1.5">
            <RadixDialog.Title className="text-lg leading-none font-semibold tracking-tight">
              {title}
            </RadixDialog.Title>
            {description && (
              <RadixDialog.Description className="text-sm text-muted-foreground">
                {description}
              </RadixDialog.Description>
            )}
          </div>
          {children}
          <RadixDialog.Close className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground opacity-70 transition-opacity hover:text-foreground hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
