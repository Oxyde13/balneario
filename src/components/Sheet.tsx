import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button, IconButton, cn } from './ui';
import { CloseIcon } from './icons';

/**
 * Bottom sheet on phones, centred dialog on larger screens.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-card text-card-foreground shadow-2xl outline-none sm:rounded-2xl',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
          <h2 id={titleId} className="min-w-0 truncate text-lg font-bold">
            {title}
          </h2>
          <IconButton label={t('common:actions.close')} onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {/* The safe-area inset adds to the padding instead of replacing it:
            `pb-safe` would set padding-bottom to 0 wherever there is no notch. */}
        {footer && (
          <div className="border-t border-border px-4 pt-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmSheet({
  open,
  onClose,
  title,
  message,
  confirmLabel,
  onConfirm,
  danger,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  message: ReactNode;
  confirmLabel: ReactNode;
  onConfirm: () => Promise<unknown> | void;
  danger?: boolean;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" block onClick={onClose} disabled={busy}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} block onClick={confirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p>{message}</p>
        {children}
      </div>
    </Sheet>
  );
}
