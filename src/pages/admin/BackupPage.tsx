import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { selectAll } from '../../hooks/queries';
import { useToast } from '../../components/Toast';
import { Button, Card, PageHeader } from '../../components/ui';
import { DownloadIcon } from '../../components/icons';
import { todayISO } from '../../lib/dates';
import { downloadJSON } from '../../lib/download';
import { errorMessage } from '../../lib/errors';
import { BACKUP_TABLES, buildBackup, buildCakesExport, buildDinnersExport, buildFinesExport, type BackupTable } from '../../lib/exports';
import { supabase } from '../../lib/supabase';
import { toAmount } from '../../lib/money';
import type { Cake, CakeAward, Dinner, Fine, FineRule, Member } from '../../types/db';

function readTable<T>(table: BackupTable) {
  return selectAll<T>((from, to) =>
    // Stable order so pages never overlap.
    supabase.from(table).select('*').order('id', { ascending: true }).range(from, to),
  );
}

export default function BackupPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const today = todayISO();

  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    try {
      await task();
      toast(t('admin:backup.done'));
    } catch (e) {
      toast(errorMessage(e, t), 'error');
    } finally {
      setBusy(null);
    }
  };

  const fullBackup = () =>
    run('backup', async () => {
      const entries = await Promise.all(BACKUP_TABLES.map(async (table) => [table, await readTable<unknown>(table)] as const));
      const tables = Object.fromEntries(entries) as Record<BackupTable, unknown[]>;
      downloadJSON(`backup-balneario-${today}.json`, buildBackup(tables, new Date().toISOString()));
    });

  const exportFines = () =>
    run('fines', async () => {
      const [fines, members, rules] = await Promise.all([
        readTable<Fine>('fines'),
        readTable<Member>('members'),
        readTable<FineRule>('fine_rules'),
      ]);
      downloadJSON(
        `multas-${today}.json`,
        buildFinesExport(
          fines.map((f) => ({ ...f, amount: toAmount(f.amount) })),
          new Map(members.map((m) => [m.id, m])),
          new Map(rules.map((r) => [r.id, r])),
          today,
        ),
      );
    });

  const exportCakes = () =>
    run('cakes', async () => {
      const [cakes, awards, members] = await Promise.all([
        readTable<Cake>('cakes'),
        readTable<CakeAward>('cake_awards'),
        readTable<Member>('members'),
      ]);
      downloadJSON(`bolos-${today}.json`, buildCakesExport(cakes, awards, new Map(members.map((m) => [m.id, m])), today));
    });

  const exportDinners = () =>
    run('dinners', async () => {
      const dinners = await readTable<Dinner>('dinners');
      downloadJSON(`jantares-${today}.json`, buildDinnersExport(dinners, today));
    });

  return (
    <div>
      <PageHeader title={t('admin:backup.title')} subtitle={t('admin:backup.subtitle')} />
      <div className="space-y-4">
        <Card className="space-y-3">
          <h2 className="text-lg font-extrabold">🛟 {t('admin:backup.fullTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('admin:backup.fullText')}</p>
          <Button onClick={fullBackup} loading={busy === 'backup'} disabled={Boolean(busy)}>
            <DownloadIcon className="h-4 w-4" />
            {t('admin:backup.fullButton')}
          </Button>
        </Card>
        <Card className="space-y-3">
          <h2 className="text-lg font-extrabold">📤 {t('admin:backup.exportTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('admin:backup.exportText')}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportFines} loading={busy === 'fines'} disabled={Boolean(busy)}>
              <DownloadIcon className="h-4 w-4" />
              {t('admin:backup.exportFines', { file: `multas-${today}.json` })}
            </Button>
            <Button variant="secondary" onClick={exportCakes} loading={busy === 'cakes'} disabled={Boolean(busy)}>
              <DownloadIcon className="h-4 w-4" />
              {t('admin:backup.exportCakes', { file: `bolos-${today}.json` })}
            </Button>
            <Button variant="secondary" onClick={exportDinners} loading={busy === 'dinners'} disabled={Boolean(busy)}>
              <DownloadIcon className="h-4 w-4" />
              {t('admin:backup.exportDinners', { file: `jantares-${today}.json` })}
            </Button>
          </div>
        </Card>
        <p className="text-sm text-muted-foreground">{t('admin:backup.restoreHint')}</p>
      </div>
    </div>
  );
}
