import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet } from './Sheet';
import { Button, IconButton, Segmented, cn } from './ui';
import { CheckIcon, CopyIcon, WhatsAppIcon } from './icons';
import { currentLanguage } from '../lib/i18n';
import type { Language } from '../lib/language';
import { APP_URL } from '../lib/supabase';
import {
  composeShareText,
  copyText,
  readShareLanguage,
  shareText,
  storeShareLanguage,
  type ShareLanguageChoice,
} from '../lib/share';

/**
 * Prepares a WhatsApp message and hands it to the phone's share sheet (or
 * wa.me on desktop). Nothing is ever sent automatically and no external API
 * is called: the person picks the group and taps send.
 */
export function ShareButton({
  build,
  label,
  iconOnly,
  variant = 'whatsapp',
  size = 'sm',
  block,
  className,
}: {
  build: (lng: Language) => string;
  label?: string;
  iconOnly?: boolean;
  variant?: 'whatsapp' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  block?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const text = label ?? t('share:button');

  return (
    <>
      {iconOnly ? (
        <IconButton label={text} onClick={() => setOpen(true)} className={cn('text-[#1a8d4a] dark:text-[#4ade80]', className)}>
          <WhatsAppIcon />
        </IconButton>
      ) : (
        <Button variant={variant} size={size} block={block} className={className} onClick={() => setOpen(true)}>
          <WhatsAppIcon className="h-4 w-4" />
          {text}
        </Button>
      )}
      {open && <ShareSheet build={build} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareSheet({ build, onClose }: { build: (lng: Language) => string; onClose: () => void }) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState<ShareLanguageChoice>(() => readShareLanguage(currentLanguage()));
  const [copied, setCopied] = useState(false);
  const message = useMemo(() => composeShareText(build, choice, APP_URL), [build, choice]);

  const changeChoice = (value: ShareLanguageChoice) => {
    setChoice(value);
    storeShareLanguage(value);
    setCopied(false);
  };

  const share = async () => {
    const outcome = await shareText(message);
    if (outcome !== 'cancelled') onClose();
  };

  const copy = async () => {
    setCopied(await copyText(message));
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={t('share:sheetTitle')}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={copy} className="shrink-0" aria-live="polite">
            {copied ? <CheckIcon className="h-4 w-4 text-success" /> : <CopyIcon className="h-4 w-4" />}
            {copied ? t('share:copied') : t('share:copy')}
          </Button>
          <Button variant="whatsapp" block onClick={share}>
            <WhatsAppIcon className="h-5 w-5" />
            {t('share:shareNow')}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <Segmented
          label={t('share:languageLabel')}
          value={choice}
          onChange={changeChoice}
          options={[
            { value: 'pt-PT', label: 'PT' },
            { value: 'en-GB', label: 'EN' },
            { value: 'both', label: 'PT + EN' },
          ]}
        />
        <p className="text-xs font-semibold text-muted-foreground">{t('share:preview')}</p>
        <div className="rounded-2xl bg-[#e7f7dc] p-3 text-slate-900 shadow-inner dark:bg-[#1f3b2c] dark:text-slate-100">
          <WhatsAppPreview text={message} />
        </div>
        <p className="text-xs text-muted-foreground">{t('share:hint')}</p>
      </div>
    </Sheet>
  );
}

/** Renders WhatsApp's *bold* and _italic_ markers for the preview. */
function WhatsAppPreview({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*|_[^_\n]+_)/g);
  return (
    <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">
      {parts.map((part, i) => {
        if (/^\*[^*\n]+\*$/.test(part)) return <strong key={i}>{part.slice(1, -1)}</strong>;
        if (/^_[^_\n]+_$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}
