export type MemberType = 'player' | 'coach' | 'staff';
export type StaffRole =
  | 'head_coach'
  | 'assistant_coach'
  | 'goalkeeper_coach'
  | 'fitness_coach'
  | 'physio'
  | 'team_manager'
  | 'other';
export type Position = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
export type CakeAwardKind = 'best' | 'worst';
export type MemberAwardKind = 'stylish';
export type Role = 'admin' | 'team';

export const STAFF_ROLES: StaffRole[] = [
  'head_coach',
  'assistant_coach',
  'goalkeeper_coach',
  'fitness_coach',
  'physio',
  'team_manager',
  'other',
];
export const POSITIONS: Position[] = ['goalkeeper', 'defender', 'midfielder', 'forward'];
export const MEMBER_TYPES: MemberType[] = ['player', 'coach', 'staff'];

/** ISO date string, `yyyy-MM-dd`. */
export type ISODate = string;

export interface Member {
  id: string;
  type: MemberType;
  staff_role: StaffRole | null;
  name: string;
  nickname: string | null;
  shirt_number: number | null;
  position: Position | null;
  birth_date: ISODate;
  photo_path: string | null;
  active: boolean;
  created_at: string;
}

export interface FineRule {
  id: string;
  title: string;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  category: string | null;
  category_en: string | null;
  amount: number;
  applies_to: MemberType[] | null;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Fine {
  id: string;
  member_id: string;
  rule_id: string | null;
  description: string;
  description_en: string | null;
  amount: number;
  occurred_on: ISODate;
  notes: string | null;
  paid_at: ISODate | null;
  created_at: string;
}

/** One row per member: the day they bring the cake. */
export interface Cake {
  id: string;
  member_id: string;
  due_date: ISODate | null;
  is_alternative_date: boolean;
  brought_on: ISODate | null;
  notes: string | null;
}

export interface CakeAward {
  id: string;
  cake_id: string;
  kind: CakeAwardKind;
  position: 1 | 2 | 3;
  comment: string | null;
  created_at: string;
}

/**
 * A periodic award given to a member (currently only "the most stylish").
 * The period is a closed range, so a weekly award needs no schema change.
 */
export interface MemberAward {
  id: string;
  member_id: string;
  kind: MemberAwardKind;
  period_start: ISODate;
  period_end: ISODate;
  comment: string | null;
  created_at: string;
}

/** A team dinner: it closes the fund collected since the previous one. */
export interface Dinner {
  id: string;
  held_on: ISODate;
  place: string | null;
  notes: string | null;
  fund_amount: number;
  created_at: string;
}

export interface ActivityLogEntry {
  id: number;
  table_name: 'members' | 'fine_rules' | 'fines' | 'cakes' | 'cake_awards' | 'member_awards' | 'dinners';
  record_id: string | null;
  action: 'insert' | 'update' | 'delete';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

/** Member columns repeated in the stats view. */
export interface MemberSummary {
  member_id: string;
  type: MemberType;
  name: string;
  nickname: string | null;
  staff_role: StaffRole | null;
  shirt_number: number | null;
  photo_path: string | null;
  active: boolean;
}

/** public.fine_stats — totals per member (members without fines are absent). */
export interface FineStat extends MemberSummary {
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  fine_count: number;
  unpaid_count: number;
}

export interface DinnerFund {
  last_dinner_date: ISODate | null;
  collected: number;
  pending: number;
  potential: number;
}
