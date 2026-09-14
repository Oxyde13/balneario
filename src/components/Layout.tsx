import { useState, type ComponentType, type SVGProps } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Sheet } from './Sheet';
import { Badge, cn } from './ui';
import {
  BookIcon,
  CakeIcon,
  CogIcon,
  CoinIcon,
  DinnerIcon,
  HomeIcon,
  LogoutIcon,
  MenuIcon,
  TrophyIcon,
  UsersIcon,
} from './icons';

interface NavItem {
  to: string;
  labelKey: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  adminOnly?: boolean;
  end?: boolean;
}

const MAIN_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'common:nav.home', icon: HomeIcon, end: true },
  { to: '/birthdays', labelKey: 'common:nav.birthdays', icon: CakeIcon },
  { to: '/fines', labelKey: 'common:nav.fines', icon: CoinIcon },
  { to: '/rankings', labelKey: 'common:nav.rankings', icon: TrophyIcon },
];

const MORE_ITEMS: NavItem[] = [
  { to: '/rules', labelKey: 'common:nav.rules', icon: BookIcon },
  { to: '/team', labelKey: 'common:nav.team', icon: UsersIcon },
  { to: '/dinners', labelKey: 'common:nav.dinners', icon: DinnerIcon },
  { to: '/admin', labelKey: 'common:nav.admin', icon: CogIcon, adminOnly: true },
];

export function Logo({ className }: { className?: string }) {
  return <img src="/logo.png" alt="" className={cn('h-9 w-9', className)} width={36} height={36} />;
}

export function Layout() {
  const { t } = useTranslation();
  const { isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreItems = MORE_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const moreActive = moreItems.some((item) => location.pathname.startsWith(item.to));

  return (
    <div className="min-h-dvh md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-card focus:p-2">
        {t('common:skipToContent')}
      </a>

      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <Link to="/" className="flex items-center gap-3 px-5 py-5">
          <Logo className="h-11 w-11" />
          <span>
            <span className="block text-lg font-extrabold leading-tight">{t('common:appName')}</span>
            <span className="block text-xs text-muted-foreground">{t('common:clubTagline')}</span>
          </span>
        </Link>
        <nav aria-label={t('common:nav.label')} className="flex-1 space-y-1 overflow-y-auto px-3">
          {[...MAIN_ITEMS, ...moreItems].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-touch items-center gap-3 rounded-xl px-3 font-semibold transition',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <item.icon />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-3 border-t border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <Badge tone={isAdmin ? 'gold' : 'neutral'}>{isAdmin ? t('auth:profile.admin') : t('auth:profile.team')}</Badge>
            <LanguageSwitcher />
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex min-h-touch w-full items-center gap-3 rounded-xl px-3 font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogoutIcon />
            {t('common:nav.logout')}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="pt-safe sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
            <Link to="/" className="flex min-w-0 items-center gap-2 md:hidden" aria-label={t('common:nav.home')}>
              <Logo className="h-8 w-8" />
              <span className="hidden truncate font-extrabold min-[400px]:inline">{t('common:appShortName')}</span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <LanguageSwitcher className="md:hidden" />
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-4 md:pb-10">
          <Outlet />
          <p className="mt-10 text-center text-xs text-muted-foreground">{t('common:clubTagline')}</p>
        </main>

        {/* Bottom navigation (phones) */}
        <nav
          aria-label={t('common:nav.label')}
          className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden"
        >
          <ul className="grid grid-cols-5">
            {MAIN_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold',
                      isActive ? 'text-link' : 'text-muted-foreground',
                    )
                  }
                >
                  <item.icon className="h-6 w-6" />
                  {t(item.labelKey)}
                </NavLink>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-haspopup="dialog"
                className={cn(
                  'flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold',
                  moreActive ? 'text-link' : 'text-muted-foreground',
                )}
              >
                <MenuIcon className="h-6 w-6" />
                {t('common:nav.more')}
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t('common:nav.more')}>
        <nav aria-label={t('common:nav.more')} className="space-y-1">
          {moreItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[52px] items-center gap-3 rounded-xl px-3 text-lg font-semibold',
                  isActive ? 'bg-primary-soft text-link' : 'hover:bg-muted',
                )
              }
            >
              <item.icon className="h-6 w-6" />
              {t(item.labelKey)}
            </NavLink>
          ))}
          <div className="my-2 border-t border-border" />
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-muted-foreground">
              {t('auth:signedInAs')}{' '}
              <Badge tone={isAdmin ? 'gold' : 'neutral'}>{isAdmin ? t('auth:profile.admin') : t('auth:profile.team')}</Badge>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              void signOut();
            }}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 text-lg font-semibold text-danger hover:bg-danger/10"
          >
            <LogoutIcon className="h-6 w-6" />
            {t('common:nav.logout')}
          </button>
        </nav>
      </Sheet>
    </div>
  );
}
