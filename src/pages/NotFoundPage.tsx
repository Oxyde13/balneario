import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, buttonClass } from '../components/ui';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <EmptyState
      emoji="🥅"
      title={t('common:notFound.title')}
      text={t('common:notFound.text')}
      action={
        <Link to="/" className={buttonClass('primary')}>
          {t('common:nav.home')}
        </Link>
      }
    />
  );
}
