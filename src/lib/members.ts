import { STAFF_ROLES, type Member, type MemberType, type MemberSummary } from '../types/db';

type MemberLike = Pick<Member, 'type'> | Pick<MemberSummary, 'type'>;

export function isStaffMember(member: MemberLike): boolean {
  return member.type !== 'player';
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

/** Name as used in messages: nickname when there is one, else the first + last name. */
export function shortName(member: Pick<Member, 'name' | 'nickname'>): string {
  if (member.nickname?.trim()) return member.nickname.trim();
  const parts = member.name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : member.name;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Search by name, nickname or shirt number (accent-insensitive). */
export function matchesSearch(member: Pick<Member, 'name' | 'nickname' | 'shirt_number'>, query: string): boolean {
  const q = normalize(query.replace(/^#/, ''));
  if (!q) return true;
  if (member.shirt_number != null && String(member.shirt_number) === q) return true;
  return normalize(member.name).includes(q) || (member.nickname ? normalize(member.nickname).includes(q) : false);
}

export function compareByShirtNumber(a: Member, b: Member): number {
  const na = a.shirt_number ?? Number.MAX_SAFE_INTEGER;
  const nb = b.shirt_number ?? Number.MAX_SAFE_INTEGER;
  return na - nb || a.name.localeCompare(b.name);
}

export function compareByStaffRole(a: Member, b: Member): number {
  const typeOrder: Record<MemberType, number> = { player: 0, coach: 1, staff: 2 };
  const ra = a.staff_role ? STAFF_ROLES.indexOf(a.staff_role) : STAFF_ROLES.length;
  const rb = b.staff_role ? STAFF_ROLES.indexOf(b.staff_role) : STAFF_ROLES.length;
  return typeOrder[a.type] - typeOrder[b.type] || ra - rb || a.name.localeCompare(b.name);
}

/** Players first (by number), then coaching staff (by role). */
export function splitSquad(members: Member[]): { players: Member[]; staff: Member[] } {
  return {
    players: members.filter((m) => m.type === 'player').sort(compareByShirtNumber),
    staff: members.filter((m) => m.type !== 'player').sort(compareByStaffRole),
  };
}
