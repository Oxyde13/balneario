import type { ComponentType, SVGProps } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/ui';
import {
  BookIcon,
  CakeIcon,
  CalendarIcon,
  ChevronRightIcon,
  CoinIcon,
  DinnerIcon,
  DownloadIcon,
  HistoryIcon,
  ShirtIcon,
  UsersIcon,
} from '../../components/icons';

const ITEMS: Array<{ to: string; key: string; icon: ComponentType<SVGProps<SVGSVGElement>> }> = [
  { to: '/fines/new', key: 'assignFine', icon: CoinIcon },
  { to: '/admin/members', key: 'members', icon: UsersIcon },
  { to: '/admin/rules', key: 'rules', icon: BookIcon },
  { to: '/birthdays', key: 'cakeCalendar', icon: CalendarIcon },
  { to: '/admin/awards', key: 'awards', icon: CakeIcon },
  { to: '/admin/stylish', key: 'stylish', icon: ShirtIcon },
  { to: '/admin/dinner', key: 'dinner', icon: DinnerIcon },
  { to: '/admin/history', key: 'history', icon: HistoryIcon },
  { to: '/admin/backup', key: 'backup', icon: DownloadIcon },
];

export default function AdminPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader title={t('admin:title')} subtitle={t('admin:subtitle')} />
      <ul className="grid gap-2 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-link">
                <item.icon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{t(`admin:menu.${item.key}.title`)}</span>
                <span className="block text-sm text-muted-foreground">{t(`admin:menu.${item.key}.text`)}</span>
              </span>
              <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
