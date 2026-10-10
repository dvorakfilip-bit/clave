"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/admin/guard";

/**
 * Spustí serverovou akci, zobrazí chybu, u varování se zeptá na potvrzení
 * a po úspěchu obnoví data stránky.
 */
export function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run<T>(
    action: (confirmed: boolean) => Promise<ActionResult<T>>,
    onSuccess?: (data: T | undefined) => void,
  ) {
    setError(null);
    startTransition(async () => {
      let result = await action(false);
      if (result.ok && result.warning) {
        if (!window.confirm(result.warning)) return;
        result = await action(true);
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess?.(result.data);
      router.refresh();
    });
  }

  return { run, pending, error, setError };
}

export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-lg bg-accent-soft px-3 py-2 text-sm">
      {error}
    </p>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-page disabled:text-muted disabled:opacity-70";

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-brand text-on-brand font-semibold",
    secondary: "border border-line bg-surface",
    danger: "border border-line text-highlight",
    ghost: "text-muted",
  }[variant];
  return <button className={`rounded-lg px-3 py-2 text-sm disabled:opacity-50 ${styles} ${className}`} {...props} />;
}

export function Card({ title, children, actions }: { title?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Jednoduché modální okno (formuláře lekcí, párty…). */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-page p-4 sm:max-w-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="px-2 text-xl text-muted" aria-label="Zavřít">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const LEVELS = [0, 0.5, 1, 1.5, 2, 2.5, 3];
