import { useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useFormat } from '../hooks/useFormat';
import { useRules } from '../hooks/queries';
import { Badge, Card, EmptyState, ErrorState, ListSkeleton, PageHeader, SectionTitle, buttonClass } from '../components/ui';
import { localized } from '../lib/localized';
import type { FineRule } from '../types/db';

export function AppliesToBadges({ rule }: { rule: Pick<FineRule, 'applies_to'> }) {
  const { t } = useTranslation();
  if (!rule.applies_to || rule.applies_to.length === 0) return null;
  return (
    <>
      {rule.applies_to.map((type) => (
        <Badge key={type} tone="primary">
          {t('rules:onlyFor', { type: t(`common:memberTypePlural.${type}`) })}
        </Badge>
      ))}
    </>
  );
}

export function groupRulesByCategory(rules: FineRule[], lng: string, uncategorized: string) {
  const groups = new Map<string, FineRule[]>();
  rules.forEach((rule) => {
    const key = localized(rule, 'category', lng) || uncategorized;
    groups.set(key, [...(groups.get(key) ?? []), rule]);
  });
  return [...groups.entries()];
}

export function RulesPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { isAdmin } = useAuth();
  const { data = [], isLoading, error, refetch } = useRules();

  const groups = useMemo(
    () => groupRulesByCategory(data.filter((r) => r.active), fmt.lng, t('rules:uncategorized')),
    [data, fmt.lng, t],
  );

  return (
    <div>
      <PageHeader
        title={t('rules:title')}
        subtitle={t('rules:subtitle')}
        actions={
          isAdmin ? (
            <Link to="/admin/rules" className={buttonClass('secondary', 'sm')}>
              {t('rules:manage')}
            </Link>
          ) : undefined
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <ListSkeleton rows={6} />
      ) : groups.length === 0 ? (
        <EmptyState emoji="📜" title={t('rules:empty')} />
      ) : (
        <div className="space-y-7">
          {groups.map(([category, rules]) => (
          <section key={category}>
            <SectionTitle>{category}</SectionTitle>
            <ul className="space-y-2">
              {rules.map((rule) => {
                const description = localized(rule, 'description');
                return (
                  <li key={rule.id}>
                    <Card className="flex items-start justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{localized(rule, 'title')}</p>
                        {description && <p className="text-sm text-muted-foreground">{description}</p>}
                        <div className="mt-1 flex flex-wrap gap-1">
                          <AppliesToBadges rule={rule} />
                        </div>
                      </div>
                      <span className="tabular shrink-0 text-lg font-extrabold text-link">{fmt.money(rule.amount)}</span>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
          ))}
        </div>
      )}
      <p className="mt-6 text-center text-sm italic text-muted-foreground">{t('rules:footer')}</p>
    </div>
  );
}
