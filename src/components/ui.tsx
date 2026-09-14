import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '../lib/errors';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

// Buttons ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'whatsapp';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
  secondary: 'bg-card text-foreground border border-border hover:bg-muted',
  ghost: 'text-foreground hover:bg-muted',
  danger: 'bg-danger text-white hover:bg-danger/90 dark:text-slate-950',
  success: 'bg-success text-white hover:bg-success/90 dark:text-slate-950',
  whatsapp: 'bg-[#1a8d4a] text-white hover:bg-[#157a3f]',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'min-h-touch px-3 text-sm',
  md: 'min-h-touch px-4 text-base',
  lg: 'min-h-[52px] px-5 text-lg',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', block?: boolean) {
  return cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50',
    buttonVariants[variant],
    buttonSizes[size],
    block && 'w-full',
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', block, loading, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(buttonClass(variant, size, block), className)}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

// Layout pieces ---------------------------------------------------------------------

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm', className)} {...props}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between gap-2 first:mt-0">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{children}</h2>
      {action}
    </div>
  );
}

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'gold';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary-soft text-link',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  gold: 'bg-gold/15 text-gold',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// Feedback states ---------------------------------------------------------------------

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-muted', className)} aria-hidden="true" />;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2" role="status" aria-label={t('common:states.loading')}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}

export function EmptyState({ emoji, title, text, action }: { emoji: string; title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-8 text-center">
      <span className="text-4xl" aria-hidden="true">
        {emoji}
      </span>
      <p className="mt-2 font-bold">{title}</p>
      {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-center">
      <p className="font-bold text-danger">{t('common:states.error')}</p>
      <p className="mt-1 text-sm text-muted-foreground">{errorMessage(error, t)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          {t('common:actions.retry')}
        </Button>
      )}
    </div>
  );
}

// Forms ---------------------------------------------------------------------------------

const controlClass =
  'block w-full min-h-touch rounded-xl border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(controlClass, className)} {...props} />;
});

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClass, 'appearance-auto pr-8', className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClass, 'min-h-[88px]', className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  optional,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
  optional?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-sm font-semibold">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-muted-foreground">{t('common:optional')}</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="text-xs font-semibold text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex min-h-touch cursor-pointer items-center gap-3 rounded-xl px-1">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 rounded border-border accent-[rgb(var(--primary))]"
      />
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {description && <span className="block text-sm text-muted-foreground">{description}</span>}
      </span>
    </label>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = 'md',
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  label: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex gap-1 rounded-xl bg-muted p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex-1 whitespace-nowrap rounded-lg px-3 font-semibold transition',
            size === 'sm' ? 'min-h-[36px] text-sm' : 'min-h-[40px] text-sm',
            value === option.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  tabs: SegmentedOption<T>[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'min-h-touch shrink-0 rounded-full px-4 text-sm font-bold transition',
            value === tab.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'border border-border bg-card text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: 'success' | 'danger' | 'primary' }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/60 px-3 py-2">
      <p className="truncate text-xs font-semibold text-muted-foreground">{label}</p>
      <p
        className={cn(
          'tabular truncate text-base font-extrabold sm:text-lg',
          tone === 'success' && 'text-success',
          tone === 'danger' && 'text-danger',
          tone === 'primary' && 'text-link',
        )}
      >
        {value}
      </p>
    </div>
  );
}
