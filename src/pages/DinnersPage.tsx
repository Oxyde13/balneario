import { useTranslation } from 'react-i18next';
import { useFormat } from '../hooks/useFormat';
import { useDinners } from '../hooks/queries';
import { Card, EmptyState, ErrorState, ListSkeleton, PageHeader, SectionTitle } from '../components/ui';
import { DinnerFundCard } from './HomePage';

export function DinnerHistory() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { data: dinners = [], isLoading, error, refetch } = useDinners();

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading) return <ListSkeleton rows={2} />;
  if (dinners.length === 0) return <EmptyState emoji="🍽️" title={t('dinner:history.empty')} />;

  return (
    <ul className="space-y-2">
      {dinners.map((dinner) => (
        <li key={dinner.id}>
          <Card className="p-3">
            <p className="font-bold">
              {[fmt.date(dinner.held_on), dinner.place, fmt.money(dinner.fund_amount)].filter(Boolean).join(' · ')}
            </p>
            {dinner.notes && <p className="mt-1 text-sm text-muted-foreground">{dinner.notes}</p>}
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function DinnersPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader title={t('dinner:title')} subtitle={t('dinner:subtitle')} />
      <DinnerFundCard />
      <p className="mt-3 text-sm text-muted-foreground">{t('dinner:explainer')}</p>
      <SectionTitle>{t('dinner:history.title')}</SectionTitle>
      <DinnerHistory />
    </div>
  );
}
