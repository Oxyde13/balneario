import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from './ui';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextId.current++;
    setItems((current) => [...current.slice(-2), { id, message, tone }]);
    setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm font-semibold shadow-lg',
              item.tone === 'success' && 'bg-success text-white dark:text-slate-950',
              item.tone === 'error' && 'bg-danger text-white dark:text-slate-950',
              item.tone === 'info' && 'bg-foreground text-background',
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
