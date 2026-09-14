import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { PHOTO_BUCKET, supabase, unwrap } from '../lib/supabase';
import { toAmount } from '../lib/money';
import type {
  ActivityLogEntry,
  Cake,
  CakeAward,
  CakeAwardKind,
  Dinner,
  DinnerFund,
  Fine,
  FineRule,
  FineStat,
  Member,
  MemberAward,
  MemberAwardKind,
} from '../types/db';

export const PAGE_SIZE = 1000;
const DAY = 24 * 60 * 60 * 1000;

export const qk = {
  members: ['members'] as const,
  rules: ['rules'] as const,
  fines: ['fines'] as const,
  memberFines: (memberId: string | undefined) => ['fines', 'member', memberId] as const,
  cakes: ['cakes'] as const,
  fineStats: ['fine_stats'] as const,
  dinners: ['dinners'] as const,
  dinnerFund: ['dinner_fund'] as const,
  awards: ['awards'] as const,
  memberAwards: ['member_awards'] as const,
  activity: (filters: ActivityFilters) => ['activity', filters] as const,
  photoUrl: (path: string | null) => ['photo-url', path] as const,
};

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string; code?: string } | null }>;

/** Reads every row, 1000 at a time (PostgREST's default max rows). */
export async function selectAll<T>(page: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const chunk = unwrap(await page(from, from + PAGE_SIZE - 1)) ?? [];
    rows.push(...chunk);
    if (chunk.length < PAGE_SIZE) return rows;
  }
}

const normalizeFine = (f: Fine): Fine => ({ ...f, amount: toAmount(f.amount) });
const normalizeRule = (r: FineRule): FineRule => ({ ...r, amount: toAmount(r.amount) });

// Queries --------------------------------------------------------------------------

export function useMembers() {
  return useQuery({
    queryKey: qk.members,
    queryFn: async () => unwrap(await supabase.from('members').select('*').order('name')) as Member[],
  });
}

export function useRules() {
  return useQuery({
    queryKey: qk.rules,
    queryFn: async () =>
      (unwrap(await supabase.from('fine_rules').select('*').order('sort_order').order('created_at')) as FineRule[]).map(
        normalizeRule,
      ),
  });
}

export function useFines() {
  return useQuery({
    queryKey: qk.fines,
    queryFn: async () =>
      (
        await selectAll<Fine>((from, to) =>
          supabase
            .from('fines')
            .select('*')
            .order('occurred_on', { ascending: false })
            .order('created_at', { ascending: false })
            .range(from, to),
        )
      ).map(normalizeFine),
  });
}

export function useMemberFines(memberId: string | undefined) {
  return useQuery({
    queryKey: qk.memberFines(memberId),
    enabled: Boolean(memberId),
    queryFn: async () =>
      (
        await selectAll<Fine>((from, to) =>
          supabase
            .from('fines')
            .select('*')
            .eq('member_id', memberId!)
            .order('occurred_on', { ascending: false })
            .range(from, to),
        )
      ).map(normalizeFine),
  });
}

export function useCakes() {
  return useQuery({
    queryKey: qk.cakes,
    queryFn: async () => unwrap(await supabase.from('cakes').select('*')) as Cake[],
  });
}

export function useFineStats() {
  return useQuery({
    queryKey: qk.fineStats,
    queryFn: async () =>
      (unwrap(await supabase.from('fine_stats').select('*')) as FineStat[]).map((s) => ({
        ...s,
        total_amount: toAmount(s.total_amount),
        paid_amount: toAmount(s.paid_amount),
        unpaid_amount: toAmount(s.unpaid_amount),
      })),
  });
}

export function useDinners() {
  return useQuery({
    queryKey: qk.dinners,
    queryFn: async () =>
      (unwrap(await supabase.from('dinners').select('*').order('held_on', { ascending: false })) as Dinner[]).map(
        (d) => ({ ...d, fund_amount: toAmount(d.fund_amount) }),
      ),
  });
}

export function useDinnerFund() {
  return useQuery({
    queryKey: qk.dinnerFund,
    queryFn: async () => {
      const row = unwrap(await supabase.from('dinner_fund').select('*').single()) as DinnerFund;
      return {
        ...row,
        collected: toAmount(row.collected),
        pending: toAmount(row.pending),
        potential: toAmount(row.potential),
      };
    },
  });
}

export function useAwards() {
  return useQuery({
    queryKey: qk.awards,
    queryFn: async () => unwrap(await supabase.from('cake_awards').select('*')) as CakeAward[],
  });
}

export function useMemberAwards() {
  return useQuery({
    queryKey: qk.memberAwards,
    queryFn: async () =>
      unwrap(await supabase.from('member_awards').select('*').order('period_start', { ascending: false })) as MemberAward[],
  });
}

export interface ActivityFilters {
  table: string;
  from: string;
  to: string;
}

const ACTIVITY_PAGE = 50;

export function useActivityLog(filters: ActivityFilters) {
  return useInfiniteQuery({
    queryKey: qk.activity(filters),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ActivityLogEntry[], pages) =>
      lastPage.length === ACTIVITY_PAGE ? pages.length : undefined,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(pageParam * ACTIVITY_PAGE, pageParam * ACTIVITY_PAGE + ACTIVITY_PAGE - 1);
      if (filters.table) query = query.eq('table_name', filters.table);
      if (filters.from) query = query.gte('created_at', new Date(`${filters.from}T00:00:00`).toISOString());
      if (filters.to) query = query.lt('created_at', new Date(new Date(`${filters.to}T00:00:00`).getTime() + DAY).toISOString());
      return unwrap(await query) as ActivityLogEntry[];
    },
  });
}

/**
 * Signed URL valid for 7 days, cached (and persisted) for 6 days so the
 * browser keeps reusing the same URL — and its HTTP cache — instead of
 * downloading the photo again.
 */
export function usePhotoUrl(path: string | null) {
  return useQuery({
    queryKey: qk.photoUrl(path),
    enabled: Boolean(path),
    staleTime: 6 * DAY,
    gcTime: 7 * DAY,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path!, 7 * 24 * 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

// Mutations ------------------------------------------------------------------------

export function invalidateFineData(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['fines'] }),
    queryClient.invalidateQueries({ queryKey: qk.fineStats }),
    queryClient.invalidateQueries({ queryKey: qk.dinnerFund }),
    queryClient.invalidateQueries({ queryKey: ['activity'] }),
  ]);
}

function invalidate(queryClient: QueryClient, ...keys: ReadonlyArray<readonly unknown[]>) {
  return Promise.all([
    ...keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    queryClient.invalidateQueries({ queryKey: ['activity'] }),
  ]);
}

/** RLS turns forbidden updates into "0 rows"; surface that as an error. */
function expectRows<T>(rows: T[] | null): T[] {
  if (!rows || rows.length === 0) throw { message: 'row-level security: no rows affected', code: '42501' };
  return rows;
}

export type NewFine = Omit<Fine, 'id' | 'created_at' | 'paid_at'> & { paid_at?: string | null };

export function useCreateFines() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: NewFine[]) => unwrap(await supabase.from('fines').insert(rows).select()) as Fine[],
    onSettled: () => invalidateFineData(queryClient),
  });
}

export function useUpdateFines() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: Partial<Fine> }) =>
      expectRows(unwrap(await supabase.from('fines').update(patch).in('id', ids).select()) as Fine[]),
    onSettled: () => invalidateFineData(queryClient),
  });
}

export function useDeleteFine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      expectRows(unwrap(await supabase.from('fines').delete().eq('id', id).select()) as Fine[]),
    onSettled: () => invalidateFineData(queryClient),
  });
}

export type MemberInput = Omit<Member, 'id' | 'created_at'>;

export function useSaveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Partial<MemberInput> }) => {
      const result = id
        ? await supabase.from('members').update(values).eq('id', id).select()
        : await supabase.from('members').insert(values).select();
      return expectRows(unwrap(result) as Member[])[0];
    },
    onSettled: () => invalidate(queryClient, qk.members, qk.cakes, qk.fineStats),
  });
}

export type RuleInput = Omit<FineRule, 'id' | 'created_at'>;

export function useSaveRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Partial<RuleInput> }) => {
      const result = id
        ? await supabase.from('fine_rules').update(values).eq('id', id).select()
        : await supabase.from('fine_rules').insert(values).select();
      return expectRows(unwrap(result) as FineRule[])[0];
    },
    onSettled: () => invalidate(queryClient, qk.rules),
  });
}

/** Saves a new order: rules are renumbered 10, 20, 30… and only changed rows are written. */
export function useReorderRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ordered: FineRule[]) => {
      const changes = ordered
        .map((rule, index) => ({ rule, sort_order: (index + 1) * 10 }))
        .filter(({ rule, sort_order }) => rule.sort_order !== sort_order);
      for (const { rule, sort_order } of changes) {
        expectRows(unwrap(await supabase.from('fine_rules').update({ sort_order }).eq('id', rule.id).select()));
      }
    },
    onSettled: () => invalidate(queryClient, qk.rules),
  });
}

export function useGenerateCakeCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('generate_cake_calendar')) as number,
    onSettled: () => invalidate(queryClient, qk.cakes),
  });
}

export function useUpdateCake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Cake> }) =>
      expectRows(unwrap(await supabase.from('cakes').update(patch).eq('id', id).select()) as Cake[])[0],
    onSettled: () => invalidate(queryClient, qk.cakes),
  });
}

/** Creates the cake row of a member that has none yet (e.g. calendar not generated). */
export function useCreateCake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<Cake, 'id'>) =>
      expectRows(unwrap(await supabase.from('cakes').insert(values).select()) as Cake[])[0],
    onSettled: () => invalidate(queryClient, qk.cakes),
  });
}

export function useSetAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { kind: CakeAwardKind; position: number; cakeId: string; comment: string | null }) =>
      unwrap(
        await supabase.rpc('set_cake_award', {
          p_kind: args.kind,
          p_position: args.position,
          p_cake_id: args.cakeId,
          p_comment: args.comment,
        }),
      ),
    onSettled: () => invalidate(queryClient, qk.awards),
  });
}

export function useUpdateAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string | null }) =>
      expectRows(unwrap(await supabase.from('cake_awards').update({ comment }).eq('id', id).select())),
    onSettled: () => invalidate(queryClient, qk.awards),
  });
}

export function useClearAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      expectRows(unwrap(await supabase.from('cake_awards').delete().eq('id', id).select())),
    onSettled: () => invalidate(queryClient, qk.awards),
  });
}

export interface MemberAwardInput {
  kind: MemberAwardKind;
  memberId: string;
  periodStart: string;
  periodEnd: string;
  comment: string | null;
}

/** Names the winner of a period that has none yet. */
export function useSetMemberAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MemberAwardInput) =>
      expectRows(
        unwrap(
          await supabase
            .from('member_awards')
            .insert({
              kind: input.kind,
              member_id: input.memberId,
              period_start: input.periodStart,
              period_end: input.periodEnd,
              comment: input.comment,
            })
            .select(),
        ) as MemberAward[],
      )[0],
    onSettled: () => invalidate(queryClient, qk.memberAwards),
  });
}

/** Changes the winner or the comment of a period that already has one. */
export function useUpdateMemberAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, memberId, comment }: { id: string; memberId: string; comment: string | null }) =>
      expectRows(unwrap(await supabase.from('member_awards').update({ member_id: memberId, comment }).eq('id', id).select())),
    onSettled: () => invalidate(queryClient, qk.memberAwards),
  });
}

export function useClearMemberAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => expectRows(unwrap(await supabase.from('member_awards').delete().eq('id', id).select())),
    onSettled: () => invalidate(queryClient, qk.memberAwards),
  });
}

/** Registers a dinner. The fund snapshot is computed by the database. */
export function useCreateDinner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: Pick<Dinner, 'held_on'> & Partial<Pick<Dinner, 'place' | 'notes'>>) =>
      expectRows(unwrap(await supabase.from('dinners').insert(values).select()) as Dinner[])[0],
    onSettled: () => invalidate(queryClient, qk.dinners, qk.dinnerFund, ['fines']),
  });
}

/** Place and notes stay editable; date and amount are immutable (enforced by trigger). */
export function useUpdateDinner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Dinner, 'place' | 'notes'>> }) =>
      expectRows(unwrap(await supabase.from('dinners').update(patch).eq('id', id).select()) as Dinner[])[0],
    onSettled: () => invalidate(queryClient, qk.dinners),
  });
}

/** Undo: only the latest dinner can be deleted (enforced by trigger). */
export function useDeleteDinner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      expectRows(unwrap(await supabase.from('dinners').delete().eq('id', id).select()) as Dinner[]),
    onSettled: () => invalidate(queryClient, qk.dinners, qk.dinnerFund, ['fines']),
  });
}
