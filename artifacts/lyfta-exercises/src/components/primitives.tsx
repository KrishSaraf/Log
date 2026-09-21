import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "surface";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all duration-[var(--kw-duration)] ease-[var(--kw-ease)] tap-target disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
        variant === "primary" &&
          "bg-accent text-accent-ink shadow-[var(--kw-glow)] hover:bg-accent-hover",
        variant === "ghost" &&
          "bg-transparent text-muted hover:text-foreground hover:bg-white/5",
        variant === "surface" &&
          "bg-surface text-foreground border border-border hover:bg-surface-hover",
        className,
      )}
      {...props}
    />
  );
}

export function Chip({
  active,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-semibold capitalize transition-colors duration-[var(--kw-duration)] border",
        active
          ? "bg-accent text-accent-ink border-accent"
          : "bg-surface text-muted border-border hover:text-foreground hover:bg-surface-hover",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-muted">{label}</span>
      {children}
      {error ? <span className="block text-sm text-danger">{error}</span> : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-border bg-elevated px-4 py-3 text-foreground placeholder:text-faint outline-none transition-colors duration-[var(--kw-duration)] focus:border-accent",
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-surface border border-border",
        className,
      )}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-xl border border-border bg-elevated/60 rise-in">
      <div className="w-14 h-14 rounded-full bg-accent-muted flex items-center justify-center mb-5 text-accent text-2xl font-display font-bold">
        ∅
      </div>
      <h3 className="text-xl font-display font-bold mb-2">{title}</h3>
      <p className="text-muted max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
