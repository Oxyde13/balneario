import { useTranslation } from 'react-i18next';
import { Badge } from './ui';
import { CAKE_STATUS_EMOJI, type CakeStatus } from '../lib/birthdays';

const tones: Record<CakeStatus, 'success' | 'gold' | 'neutral' | 'danger' | 'primary'> = {
  brought: 'success',
  today: 'gold',
  thisWeek: 'gold',
  pending: 'neutral',
  overdue: 'danger',
  noDate: 'primary',
};

export function CakeStatusBadge({ status }: { status: CakeStatus }) {
  const { t } = useTranslation();
  return (
    <Badge tone={tones[status]}>
      <span aria-hidden="true">{CAKE_STATUS_EMOJI[status]}</span>
      {t(`birthdays:status.${status}`)}
    </Badge>
  );
}
