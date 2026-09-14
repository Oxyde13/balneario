import { useMemo } from 'react';
import { useCakes, useMembers } from './queries';
import { birthdayInWindow, cakeStatus, cakeWindow, virtualCake, type CakeStatus, type CakeWindow } from '../lib/birthdays';
import { todayISO } from '../lib/dates';
import type { Cake, ISODate, Member } from '../types/db';

export interface CakeRow {
  member: Member;
  /** Row in `cakes`, or null when the calendar was not generated for this member yet. */
  cake: Cake | null;
  /** Birthday inside the cake window (null = outside it, needs an alternative date). */
  birthday: ISODate | null;
  dueDate: ISODate | null;
  isAlternative: boolean;
  broughtOn: ISODate | null;
  status: CakeStatus;
}

/**
 * One row per active member for the cake calendar, with a "virtual" row for
 * members the calendar has not been generated for yet.
 */
export function useCakeRows(): {
  rows: CakeRow[];
  window: CakeWindow;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  missingRows: number;
} {
  const members = useMembers();
  const cakes = useCakes();
  const today = todayISO();
  const window = useMemo(() => cakeWindow(today), [today]);

  const rows = useMemo<CakeRow[]>(() => {
    if (!members.data || !cakes.data) return [];
    const byMember = new Map(cakes.data.map((c) => [c.member_id, c]));
    return members.data
      .filter((m) => m.active)
      .map((member) => {
        const cake = byMember.get(member.id) ?? null;
        const source = cake ?? virtualCake(member, window);
        return {
          member,
          cake,
          birthday: birthdayInWindow(member.birth_date, window),
          dueDate: source.due_date,
          isAlternative: source.is_alternative_date,
          broughtOn: source.brought_on,
          status: cakeStatus(source, today),
        };
      });
  }, [members.data, cakes.data, window, today]);

  return {
    rows,
    window,
    isLoading: members.isLoading || cakes.isLoading,
    error: members.error ?? cakes.error,
    refetch: () => {
      void members.refetch();
      void cakes.refetch();
    },
    missingRows: rows.filter((r) => !r.cake).length,
  };
}
