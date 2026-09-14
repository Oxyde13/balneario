#!/usr/bin/env node
// Turns a full backup (Administração → Backup completo) into SQL that restores
// the database. Usage:
//   node scripts/backup-to-sql.mjs backup-balneario-2026-09-11.json > restore.sql
// Then paste restore.sql into the Supabase SQL editor (it runs in one transaction).
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Uso: node scripts/backup-to-sql.mjs <ficheiro-de-backup.json>');
  process.exit(1);
}

const backup = JSON.parse(readFileSync(file, 'utf8'));
if (backup.app !== 'balneario-1-de-maio' || !backup.tables) {
  console.error('Isto não parece um backup da app (falta "app": "balneario-1-de-maio").');
  process.exit(1);
}

// Insert order respects the foreign keys.
const TABLES = [
  { name: 'members', columns: ['id', 'type', 'staff_role', 'name', 'nickname', 'shirt_number', 'position', 'birth_date', 'photo_path', 'active', 'created_at'], casts: { type: 'member_type' } },
  { name: 'fine_rules', columns: ['id', 'title', 'title_en', 'description', 'description_en', 'category', 'category_en', 'amount', 'applies_to', 'active', 'sort_order', 'created_at'], casts: { applies_to: 'member_type[]' } },
  { name: 'fines', columns: ['id', 'member_id', 'rule_id', 'description', 'description_en', 'amount', 'occurred_on', 'notes', 'paid_at', 'created_at'] },
  { name: 'cakes', columns: ['id', 'member_id', 'due_date', 'is_alternative_date', 'brought_on', 'notes'] },
  { name: 'cake_awards', columns: ['id', 'cake_id', 'kind', 'position', 'comment', 'created_at'], casts: { kind: 'cake_award_kind' } },
  { name: 'member_awards', columns: ['id', 'member_id', 'kind', 'period_start', 'period_end', 'comment', 'created_at'], casts: { kind: 'member_award_kind' } },
  { name: 'dinners', columns: ['id', 'held_on', 'place', 'notes', 'fund_amount', 'created_at'] },
  { name: 'activity_log', columns: ['table_name', 'record_id', 'action', 'old_data', 'new_data', 'created_at'], casts: { old_data: 'jsonb', new_data: 'jsonb' } },
];

const quote = (text) => `'${String(text).replace(/'/g, "''")}'`;

function literal(value, cast) {
  if (value === null || value === undefined) return 'null';
  if (cast === 'jsonb') return `${quote(JSON.stringify(value))}::jsonb`;
  if (Array.isArray(value)) return `${quote(`{${value.join(',')}}`)}${cast ? `::${cast}` : ''}`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return `${quote(value)}${cast ? `::${cast}` : ''}`;
}

const out = [];
out.push('-- Reposição a partir de um backup da app Balneário 1º de Maio');
out.push(`-- Backup de ${backup.exported_at}`);
out.push('-- ATENÇÃO: apaga todos os dados atuais e substitui-os pelos do backup.');
out.push('begin;');
out.push("-- Desliga triggers (histórico e bloqueios do jantar) durante a reposição.");
out.push('set session_replication_role = replica;');
out.push('truncate table public.cake_awards, public.member_awards, public.cakes, public.fines, public.fine_rules, public.members, public.dinners, public.activity_log restart identity cascade;');
out.push('');

for (const { name, columns, casts = {} } of TABLES) {
  const rows = backup.tables[name] ?? [];
  out.push(`-- ${name}: ${rows.length} registo(s)`);
  for (const row of rows) {
    const values = columns.map((column) => literal(row[column], casts[column])).join(', ');
    out.push(`insert into public.${name} (${columns.join(', ')}) values (${values});`);
  }
  out.push('');
}

out.push('set session_replication_role = default;');
out.push('commit;');
console.log(out.join('\n'));
