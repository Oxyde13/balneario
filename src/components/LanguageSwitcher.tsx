import { useTranslation } from 'react-i18next';
import { chooseLanguage } from '../lib/i18n';
import type { Language } from '../lib/language';
import { cn } from './ui';

const OPTIONS: Array<{ value: Language; label: string; flag: string }> = [
  { value: 'pt-PT', label: 'PT', flag: '🇵🇹' },
  { value: 'en-GB', label: 'EN', flag: '🇬🇧' },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  return (
    <div role="group" aria-label={t('common:language.label')} className={cn('flex rounded-xl bg-muted p-1', className)}>
      {OPTIONS.map((option) => {
        const active = i18n.language === option.value;
        return (
          <button
            key={option.value}
            type="button"
            lang={option.value}
            aria-pressed={active}
            aria-label={t(`common:language.${option.value === 'pt-PT' ? 'pt' : 'en'}`)}
            onClick={() => chooseLanguage(option.value)}
            className={cn(
              'flex min-h-[36px] min-w-[48px] items-center justify-center gap-1 rounded-lg px-2 text-sm font-bold transition',
              active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span aria-hidden="true" className="text-xs">
              {option.flag}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
