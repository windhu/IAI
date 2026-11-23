import type { ReactNode } from 'react';
import { href } from './router';

export function Page({ title, back, children }: { title: string; back?: string; children: ReactNode }) {
  return (
    <section className="page">
      <header className="page-header">
        {back !== undefined && (
          <a className="back-link" href={href(back)} aria-label="返回">
            ‹ 返回
          </a>
        )}
        <h1>{title}</h1>
      </header>
      {children}
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
      {error && (
        <div className="field-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export function Notice({ kind, children }: { kind: 'error' | 'warning' | 'success' | 'info'; children: ReactNode }) {
  return (
    <div className={`notice notice-${kind}`} role={kind === 'error' || kind === 'warning' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
