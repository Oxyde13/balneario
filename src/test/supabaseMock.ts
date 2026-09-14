import { vi } from 'vitest';
import type { Cake, CakeAward, Dinner, DinnerFund, Fine, FineRule, FineStat, Member, MemberAward } from '../types/db';

// Fixtures shaped like supabase/seed.sql, so the smoke tests exercise the same
// situations as the real data: carried-over debt, a registered dinner, a
// birthday out of season, a cake without a date and partial cake awards.

export const dinners: Dinner[] = [
  {
    id: 'd1',
    held_on: '2026-05-30',
    place: 'Restaurante O Pátio',
    notes: 'Espetada para todos.',
    fund_amount: 33,
    created_at: '2026-05-30T20:00:00Z',
  },
];

const member = (over: Partial<Member> & Pick<Member, 'id' | 'name' | 'birth_date'>): Member => ({
  type: 'player',
  staff_role: null,
  nickname: null,
  shirt_number: null,
  position: null,
  photo_path: null,
  active: true,
  created_at: '2026-09-01T09:00:00Z',
  ...over,
});

export const members: Member[] = [
  member({ id: 'm1', name: 'Rúben Teixeira', nickname: 'Rubinho', shirt_number: 1, position: 'goalkeeper', birth_date: '1995-09-08', photo_path: 'm1-1.webp' }),
  member({ id: 'm2', name: 'Chinedu Okafor', nickname: 'Chi', shirt_number: 4, position: 'defender', birth_date: '1998-07-15' }),
  member({ id: 'm3', name: 'Diogo Freitas', shirt_number: 8, position: 'midfielder', birth_date: '2000-02-29' }),
  member({ id: 'm4', name: 'Tiago Gouveia', shirt_number: 10, position: 'midfielder', birth_date: '1996-09-10' }),
  member({ id: 'm5', name: 'Carlos Nóbrega', nickname: 'Mister', type: 'coach', staff_role: 'head_coach', birth_date: '1978-08-22' }),
  member({ id: 'm6', name: 'Hélder Andrade', type: 'coach', staff_role: 'assistant_coach', birth_date: '1985-11-14' }),
  member({ id: 'm7', name: 'Zé Antigo', birth_date: '1990-03-03', active: false }),
];

export const rules: FineRule[] = [
  { id: 'r1', title: 'Atraso ao treino', title_en: 'Late for training', description: 'Chegar depois da hora.', description_en: 'Arriving late.', category: 'Treinos', category_en: 'Training', amount: 2, applies_to: null, active: true, sort_order: 10, created_at: '2026-09-01T09:00:00Z' },
  { id: 'r2', title: 'Esquecer caneleiras', title_en: 'Forgot shin pads', description: null, description_en: null, category: 'Treinos', category_en: 'Training', amount: 3, applies_to: ['player'], active: true, sort_order: 20, created_at: '2026-09-01T09:00:00Z' },
  { id: 'r3', title: 'Pôr música pimba no balneário', title_en: null, description: null, description_en: null, category: 'Balneário', category_en: null, amount: 1, applies_to: null, active: true, sort_order: 30, created_at: '2026-09-01T09:00:00Z' },
  { id: 'r4', title: 'Regra desativada', title_en: null, description: null, description_en: null, category: 'Balneário', category_en: 'Dressing room', amount: 5, applies_to: null, active: false, sort_order: 40, created_at: '2026-09-01T09:00:00Z' },
];

const fine = (over: Partial<Fine> & Pick<Fine, 'id' | 'member_id' | 'amount' | 'occurred_on'>): Fine => ({
  rule_id: 'r1',
  description: 'Atraso ao treino',
  description_en: 'Late for training',
  notes: null,
  paid_at: null,
  created_at: '2026-09-08T09:00:00Z',
  ...over,
});

export const fines: Fine[] = [
  fine({ id: 'f1', member_id: 'm2', amount: 2, occurred_on: '2026-09-08' }),
  fine({ id: 'f2', member_id: 'm5', amount: 5, occurred_on: '2026-09-09' }),
  fine({ id: 'f3', member_id: 'm1', amount: 3, occurred_on: '2026-09-08', rule_id: 'r2', description: 'Esquecer caneleiras', description_en: 'Forgot shin pads', paid_at: '2026-09-09' }),
  fine({ id: 'f4', member_id: 'm4', amount: 2, occurred_on: '2026-09-08', paid_at: '2026-09-10' }),
  fine({ id: 'f5', member_id: 'm6', amount: 1, occurred_on: '2026-09-10', rule_id: 'r3', description: 'Pôr música pimba no balneário', description_en: null, paid_at: '2026-09-10' }),
  // Old and still unpaid.
  fine({ id: 'f6', member_id: 'm2', amount: 10, occurred_on: '2026-04-12', description: 'Falta ao treino sem aviso', description_en: 'Missed training without notice' }),
  // Paid before the dinner: locked.
  fine({ id: 'f7', member_id: 'm1', amount: 2, occurred_on: '2025-10-02', paid_at: '2025-10-10' }),
];

export const cakes: Cake[] = [
  { id: 'c1', member_id: 'm1', due_date: '2026-09-08', is_alternative_date: false, brought_on: '2026-09-08', notes: null },
  { id: 'c2', member_id: 'm2', due_date: null, is_alternative_date: true, brought_on: null, notes: null },
  { id: 'c3', member_id: 'm3', due_date: '2027-02-28', is_alternative_date: false, brought_on: null, notes: null },
  { id: 'c4', member_id: 'm4', due_date: '2026-09-10', is_alternative_date: false, brought_on: '2026-09-10', notes: null },
  { id: 'c5', member_id: 'm5', due_date: '2026-09-09', is_alternative_date: true, brought_on: '2026-09-09', notes: null },
  { id: 'c6', member_id: 'm6', due_date: '2026-11-14', is_alternative_date: false, brought_on: null, notes: null },
];

export const awards: CakeAward[] = [
  { id: 'a1', cake_id: 'c4', kind: 'best', position: 1, comment: 'Bolo de mel da avó.', created_at: '2026-09-10T09:00:00Z' },
  { id: 'a2', cake_id: 'c5', kind: 'best', position: 2, comment: null, created_at: '2026-09-10T09:00:00Z' },
  { id: 'a3', cake_id: 'c1', kind: 'worst', position: 1, comment: 'Seco.', created_at: '2026-09-10T09:00:00Z' },
];

export const memberAwards: MemberAward[] = [
  { id: 'ma1', member_id: 'm4', kind: 'stylish', period_start: '2026-09-01', period_end: '2026-09-30', comment: 'Fato completo para um treino de terça.', created_at: '2026-09-11T09:00:00Z' },
  { id: 'ma2', member_id: 'm1', kind: 'stylish', period_start: '2026-08-01', period_end: '2026-08-31', comment: null, created_at: '2026-08-31T09:00:00Z' },
];

export const fineStats: FineStat[] = members
  .map((m) => {
    const own = fines.filter((f) => f.member_id === m.id);
    const unpaid = own.filter((f) => !f.paid_at);
    return {
      member_id: m.id,
      type: m.type,
      name: m.name,
      nickname: m.nickname,
      staff_role: m.staff_role,
      shirt_number: m.shirt_number,
      photo_path: m.photo_path,
      active: m.active,
      total_amount: own.reduce((t, f) => t + f.amount, 0),
      paid_amount: own.filter((f) => f.paid_at).reduce((t, f) => t + f.amount, 0),
      unpaid_amount: unpaid.reduce((t, f) => t + f.amount, 0),
      fine_count: own.length,
      unpaid_count: unpaid.length,
    };
  })
  .filter((s) => s.fine_count > 0);

export const dinnerFund: DinnerFund = {
  last_dinner_date: '2026-05-30',
  collected: fines.filter((f) => f.paid_at && f.paid_at > '2026-05-30').reduce((t, f) => t + f.amount, 0),
  pending: fines.filter((f) => !f.paid_at).reduce((t, f) => t + f.amount, 0),
  potential: 0,
};
dinnerFund.potential = dinnerFund.collected + dinnerFund.pending;

export const activityLog = [
  { id: 2, table_name: 'fines', record_id: 'f4', action: 'update', old_data: { member_id: 'm4', amount: 2, paid_at: null, description: 'Atraso ao treino' }, new_data: { member_id: 'm4', amount: 2, paid_at: '2026-09-10', description: 'Atraso ao treino' }, created_at: '2026-09-10T10:00:00Z' },
  { id: 1, table_name: 'members', record_id: 'm1', action: 'insert', old_data: null, new_data: { name: 'Rúben Teixeira' }, created_at: '2026-09-01T09:00:00Z' },
  { id: 0, table_name: 'dinners', record_id: 'd1', action: 'insert', old_data: null, new_data: { held_on: '2026-05-30', fund_amount: 33 }, created_at: '2026-05-30T20:00:00Z' },
];

const TABLES: Record<string, unknown[]> = {
  members,
  fine_rules: rules,
  fines,
  cakes,
  cake_awards: awards,
  member_awards: memberAwards,
  dinners,
  fine_stats: fineStats,
  dinner_fund: [dinnerFund],
  activity_log: activityLog,
  keep_alive: [{ id: 1, note: 'ping' }],
};

type Row = Record<string, unknown>;

/** Thenable stand-in for PostgrestFilterBuilder (enough for what the app calls). */
class QueryMock implements PromiseLike<{ data: unknown; error: null }> {
  private rows: Row[];
  private one = false;

  constructor(table: string) {
    this.rows = [...((TABLES[table] ?? []) as Row[])];
  }

  select() {
    return this;
  }
  eq(column: string, value: unknown) {
    this.rows = this.rows.filter((row) => row[column] === value);
    return this;
  }
  neq(column: string, value: unknown) {
    this.rows = this.rows.filter((row) => row[column] !== value);
    return this;
  }
  is(column: string, value: unknown) {
    this.rows = this.rows.filter((row) => row[column] === value);
    return this;
  }
  in(column: string, values: unknown[]) {
    this.rows = this.rows.filter((row) => values.includes(row[column]));
    return this;
  }
  gte(column: string, value: string) {
    this.rows = this.rows.filter((row) => String(row[column]) >= value);
    return this;
  }
  lt(column: string, value: string) {
    this.rows = this.rows.filter((row) => String(row[column]) < value);
    return this;
  }
  order() {
    return this;
  }
  range(from: number, to: number) {
    this.rows = this.rows.slice(from, to + 1);
    return this;
  }
  limit(count: number) {
    this.rows = this.rows.slice(0, count);
    return this;
  }
  single() {
    this.one = true;
    return this;
  }
  maybeSingle() {
    this.one = true;
    return this;
  }
  insert(values: Row | Row[]) {
    this.rows = (Array.isArray(values) ? values : [values]).map((row, i) => ({ id: `new-${i}`, ...row }));
    return this;
  }
  update(patch: Row) {
    this.rows = this.rows.map((row) => ({ ...row, ...patch }));
    return this;
  }
  delete() {
    return this;
  }
  then<R1 = { data: unknown; error: null }, R2 = never>(
    resolve?: ((value: { data: unknown; error: null }) => R1 | PromiseLike<R1>) | null,
    reject?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    const data = this.one ? this.rows[0] ?? null : this.rows;
    return Promise.resolve({ data, error: null }).then(resolve, reject);
  }
}

export const ADMIN_SESSION = {
  user: { id: 'admin-user', email: 'admin@balneario.app', app_metadata: { role: 'admin' } },
  access_token: 'token',
};

export const TEAM_SESSION = {
  user: { id: 'team-user', email: 'equipa@balneario.app', app_metadata: { role: 'team' } },
  access_token: 'token',
};

/** Installs the mock for src/lib/supabase.ts. Call inside vi.mock(). */
export function createSupabaseMock(session: unknown) {
  return {
    isConfigured: true,
    PHOTO_BUCKET: 'member-photos',
    APP_URL: 'https://balneario.example',
    PROFILE_EMAILS: { admin: 'admin@balneario.app', team: 'equipa@balneario.app' },
    unwrap: (result: { data: unknown; error: unknown }) => {
      if (result.error) throw result.error;
      return result.data;
    },
    supabase: {
      from: (table: string) => new QueryMock(table),
      rpc: vi.fn(async () => ({ data: 0, error: null })),
      auth: {
        getSession: vi.fn(async () => ({ data: { session }, error: null })),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
        signInWithPassword: vi.fn(async () => ({ data: { session }, error: null })),
        signOut: vi.fn(async () => ({ error: null })),
      },
      storage: {
        from: () => ({
          createSignedUrl: vi.fn(async (path: string) => ({ data: { signedUrl: `https://example.test/${path}` }, error: null })),
          upload: vi.fn(async () => ({ data: { path: 'x.webp' }, error: null })),
          remove: vi.fn(async () => ({ data: [], error: null })),
        }),
      },
    },
  };
}
