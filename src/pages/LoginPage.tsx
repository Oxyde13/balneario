import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth, type SignInError } from '../hooks/useAuth';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Logo } from '../components/Layout';
import { Segmented, Spinner, cn } from '../components/ui';
import { isConfigured } from '../lib/supabase';
import type { Role } from '../types/db';

const PIN_LENGTH = 6;

export function LoginPage() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const pinId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Role>('team');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SignInError | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [profile]);

  const submit = async (value: string) => {
    if (value.length !== PIN_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    const result = await signIn(profile, value);
    setBusy(false);
    if (result) {
      setError(result);
      setPin('');
      inputRef.current?.focus();
    }
  };

  const onChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setPin(digits);
    if (error) setError(null);
    // Auto-submit on the 6th digit.
    if (digits.length === PIN_LENGTH) void submit(digits);
  };

  return (
    <div className="pt-safe flex min-h-dvh flex-col bg-gradient-to-b from-primary to-primary/80 dark:from-background dark:to-background">
      <div className="flex justify-end p-4">
        <LanguageSwitcher className="bg-white/15 dark:bg-muted" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-10">
        <div className="w-full max-w-sm rounded-2xl bg-card p-6 text-card-foreground shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <Logo className="h-20 w-20" />
            <h1 className="mt-3 text-2xl font-extrabold">{t('common:appName')}</h1>
            <p className="text-sm text-muted-foreground">{t('auth:subtitle')}</p>
          </div>

          {!isConfigured && (
            <p role="alert" className="mt-4 rounded-xl bg-warning/10 p-3 text-sm font-semibold text-warning">
              {t('auth:errors.notConfigured')}
            </p>
          )}

          <form
            className="mt-6 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(pin);
            }}
          >
            <Segmented
              label={t('auth:profile.label')}
              value={profile}
              onChange={(value) => {
                setProfile(value);
                setPin('');
                setError(null);
              }}
              options={[
                { value: 'team', label: t('auth:profile.team') },
                { value: 'admin', label: t('auth:profile.admin') },
              ]}
            />

            <div>
              <label htmlFor={pinId} className="mb-2 block text-center text-sm font-semibold">
                {t('auth:pinLabel')}
              </label>
              <div className="relative" onClick={() => inputRef.current?.focus()}>
                <input
                  ref={inputRef}
                  id={pinId}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="current-password"
                  maxLength={PIN_LENGTH}
                  value={pin}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={busy}
                  aria-invalid={error === 'wrongPin'}
                  aria-describedby={`${pinId}-hint`}
                  className="absolute inset-0 h-full w-full cursor-text opacity-0"
                />
                <div className={cn('flex justify-center gap-2', error === 'wrongPin' && 'animate-[shake_.3s]')} aria-hidden="true">
                  {Array.from({ length: PIN_LENGTH }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        'flex h-12 w-10 items-center justify-center rounded-xl border-2 text-2xl font-bold transition',
                        i < pin.length ? 'border-primary bg-primary-soft' : 'border-border',
                        i === pin.length && !busy && 'border-link',
                      )}
                    >
                      {i < pin.length ? '•' : ''}
                    </span>
                  ))}
                </div>
              </div>
              <p id={`${pinId}-hint`} className="mt-2 text-center text-xs text-muted-foreground">
                {t('auth:pinHint')}
              </p>
            </div>

            <div className="min-h-[3rem]" aria-live="assertive">
              {busy && (
                <p className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Spinner className="h-4 w-4" />
                  {t('auth:signingIn')}
                </p>
              )}
              {error && (
                <p role="alert" className="rounded-xl bg-danger/10 p-3 text-center text-sm font-semibold text-danger">
                  {t(`auth:errors.${error}`)}
                </p>
              )}
            </div>
          </form>
        </div>
        <p className="mt-6 text-xs font-semibold text-white/85 dark:text-muted-foreground">{t('common:clubTagline')}</p>
      </div>
    </div>
  );
}
