import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}) {
  return (
    <button
      className={cx("btn", `btn--${variant}`, `btn--${size}`, className)}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}

export type Tone = "active" | "settled" | "attention" | "disputed" | "expired" | "funded" | "draft" | "neutral";

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx("badge", `badge--${tone}`)}>{children}</span>;
}

export function SectionLabel({ children, index }: { children: ReactNode; index?: string }) {
  return (
    <div className="section-label">
      {index ? <span className="section-label__index">{index}</span> : null}
      <span>{children}</span>
    </div>
  );
}

export function Meter({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label?: string;
}) {
  const safeMax = Math.max(max, 1);
  const percent = Math.min(100, Math.round((value / safeMax) * 100));
  return (
    <div className="meter" aria-label={label ?? `${value} of ${max}`}>
      <div className="meter__track">
        <span className="meter__fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="meter__text">
        {value}<span>/{max}</span>
      </span>
    </div>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("notice", `notice--${tone}`)}>
      <span className="notice__mark" aria-hidden="true" />
      <div>
        {title ? <strong>{title}</strong> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  wide,
}: {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={cx("field", wide && "field--wide", error && "field--error")}>
      <span className="field__label">{label}</span>
      {children}
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const handle = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(handle);
  }, [copied]);
  return (
    <button
      type="button"
      className="copy-button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
      title={`Copy ${value}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export function AddressChip({ address, href, label }: { address: string; href?: string | undefined; label?: string | undefined }) {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const content = (
    <>
      <span className="address-chip__dot" aria-hidden="true" />
      <span>{label ?? short}</span>
    </>
  );
  return href ? (
    <a className="address-chip" href={href} target="_blank" rel="noreferrer" title={address}>
      {content}
    </a>
  ) : (
    <span className="address-chip" title={address}>{content}</span>
  );
}

export function Stat({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={cx("stat", accent && "stat--accent")}>
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
      {detail ? <span className="stat__detail">{detail}</span> : null}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span className="loading-inline" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </span>
  );
}
