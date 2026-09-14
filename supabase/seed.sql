-- Balneário 1º de Maio — example data (fictional members, editable values)
-- Run after the migrations (Supabase SQL editor, or `supabase db reset`).
--
-- Covers: a registered dinner with its fund snapshot, payments locked by that
-- dinner, a fine paid after it (counts for the current fund), an old unpaid
-- fine, birthdays outside the cake window (July, August), 29 February, a
-- player-only rule, a rule without English translation, fines for coaches and
-- partial cake awards.

begin;

-- Fine rules --------------------------------------------------------------------
insert into public.fine_rules
  (id, category, category_en, title, title_en, description, description_en, amount, applies_to, sort_order) values
  ('00000000-0000-4000-8000-000000000201', 'Treinos', 'Training', 'Atraso ao treino', 'Late for training',
   'Chegar depois da hora marcada.', 'Arriving after the scheduled time.', 2.00, null, 10),
  ('00000000-0000-4000-8000-000000000202', 'Treinos', 'Training', 'Falta ao treino sem aviso', 'Missed training without notice',
   'Faltar sem avisar o treinador.', 'Not showing up without telling the coach.', 10.00, null, 20),
  ('00000000-0000-4000-8000-000000000203', 'Treinos', 'Training', 'Esquecer material', 'Forgot kit',
   null, null, 2.00, null, 30),
  ('00000000-0000-4000-8000-000000000204', 'Treinos', 'Training', 'Esquecer caneleiras', 'Forgot shin pads',
   'Só se aplica a jogadores.', 'Players only.', 3.00, '{player}', 40),
  ('00000000-0000-4000-8000-000000000205', 'Jogos', 'Matches', 'Atraso à concentração', 'Late for pre-match meeting',
   null, null, 5.00, null, 50),
  ('00000000-0000-4000-8000-000000000206', 'Jogos', 'Matches', 'Cartão amarelo por protesto', 'Yellow card for dissent',
   'O árbitro nunca muda de ideias.', 'The referee never changes his mind.', 5.00, null, 60),
  ('00000000-0000-4000-8000-000000000207', 'Jogos', 'Matches', 'Cartão vermelho direto', 'Straight red card',
   null, null, 15.00, null, 70),
  ('00000000-0000-4000-8000-000000000208', 'Balneário', 'Dressing room', 'Telemóvel na palestra', 'Phone during team talk',
   null, null, 2.00, null, 80),
  ('00000000-0000-4000-8000-000000000209', 'Balneário', 'Dressing room', 'Deixar o balneário desarrumado', 'Leaving the dressing room messy',
   null, null, 1.00, null, 90),
  ('00000000-0000-4000-8000-000000000210', 'Balneário', 'Dressing room', 'Pôr música pimba no balneário', 'Playing pimba music in the dressing room',
   'Só quando ninguém pediu.', 'Only when nobody asked for it.', 1.00, null, 100),
  ('00000000-0000-4000-8000-000000000211', 'Bolo', 'Cake', 'Não trazer bolo na data combinada', 'No cake on the agreed date',
   null, null, 5.00, null, 110);

-- Members (the insert trigger creates their cake rows) -----------------------------
insert into public.members (id, type, staff_role, name, nickname, shirt_number, position, birth_date) values
  ('00000000-0000-4000-8000-000000000101', 'player', null, 'Rúben Teixeira', 'Rubinho', 1, 'goalkeeper', '1995-09-08'),
  ('00000000-0000-4000-8000-000000000102', 'player', null, 'Chinedu Okafor', 'Chi', 4, 'defender', '1998-07-15'),
  ('00000000-0000-4000-8000-000000000103', 'player', null, 'Diogo Freitas', 'Freitinhas', 8, 'midfielder', '2000-02-29'),
  ('00000000-0000-4000-8000-000000000104', 'player', null, 'Emeka Adeyemi', null, 9, 'forward', '1997-12-03'),
  ('00000000-0000-4000-8000-000000000105', 'player', null, 'Tiago Gouveia', 'Gouveia', 10, 'midfielder', '1996-09-10'),
  ('00000000-0000-4000-8000-000000000106', 'player', null, 'Samuel Nwosu', 'Sammy', 23, 'defender', '2001-04-19'),
  ('00000000-0000-4000-8000-000000000107', 'coach', 'head_coach', 'Carlos Nóbrega', 'Mister', null, null, '1978-08-22'),
  ('00000000-0000-4000-8000-000000000108', 'coach', 'assistant_coach', 'Hélder Andrade', null, null, null, '1985-11-14');

-- Fines paid before the dinner (they become locked once it is registered) -----------
insert into public.fines (member_id, rule_id, description, description_en, amount, occurred_on, paid_at, notes) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201',
   'Atraso ao treino', 'Late for training', 2.00, '2025-10-02', '2025-10-10', null),
  ('00000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000201',
   'Atraso ao treino', 'Late for training', 2.00, '2025-10-28', '2025-11-01', null),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000207',
   'Cartão vermelho direto', 'Straight red card', 15.00, '2025-11-15', '2025-12-01', 'Jogo com o Marítimo B'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000203',
   'Esquecer material', 'Forgot kit', 2.00, '2026-01-08', '2026-01-10', null),
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000208',
   'Telemóvel na palestra', 'Phone during team talk', 2.00, '2026-01-20', '2026-02-01', 'O próprio treinador!'),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000202',
   'Falta ao treino sem aviso', 'Missed training without notice', 10.00, '2026-03-05', '2026-03-20', null),
  -- Old and still unpaid.
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000202',
   'Falta ao treino sem aviso', 'Missed training without notice', 10.00, '2026-04-12', null, null);

-- The dinner: the fund snapshot (33,00 €) is computed by the trigger ----------------
insert into public.dinners (id, held_on, place, notes) values
  ('00000000-0000-4000-8000-000000000301', '2026-05-30', 'Restaurante O Pátio (fictício)', 'Espetada para todos.');

-- Fines after the dinner (the current fund) ---------------------------------------
insert into public.fines (member_id, rule_id, description, description_en, amount, occurred_on, paid_at, notes) values
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000206',
   'Cartão amarelo por protesto', 'Yellow card for dissent', 5.00, '2026-05-10', '2026-06-15', 'Paga depois do jantar'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000201',
   'Atraso ao treino', 'Late for training', 2.00, '2026-09-08', null, null),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000208',
   'Telemóvel na palestra', 'Phone during team talk', 2.00, '2026-09-09', null, null),
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000204',
   'Esquecer caneleiras', 'Forgot shin pads', 3.00, '2026-09-08', '2026-09-09', null),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000201',
   'Atraso ao treino', 'Late for training', 2.00, '2026-09-08', '2026-09-10', null),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000206',
   'Cartão amarelo por protesto', 'Yellow card for dissent', 5.00, '2026-09-09', '2026-09-10', 'Particular com o Porto da Cruz'),
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000205',
   'Atraso à concentração', 'Late for pre-match meeting', 5.00, '2026-09-09', null, null),
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000208',
   'Telemóvel na palestra', 'Phone during team talk', 2.00, '2026-09-10', null, 'Outra vez, Mister?'),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000209',
   'Deixar o balneário desarrumado', 'Leaving the dressing room messy', 1.00, '2026-09-10', null, null),
  ('00000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000210',
   'Pôr música pimba no balneário', 'Playing pimba music in the dressing room', 1.00, '2026-09-10', '2026-09-10', null),
  -- Ad-hoc fine (no rule).
  ('00000000-0000-4000-8000-000000000106', null,
   'Chegar ao treino de chinelos', 'Turned up to training in flip-flops', 3.00, '2026-09-10', null, null);

-- Cakes (overrides what the member trigger created) --------------------------------
insert into public.cakes (id, member_id, due_date, is_alternative_date, brought_on) values
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000101', '2026-09-08', false, '2026-09-08'),
  -- Born 15 July: outside the cake window, waiting for an alternative date.
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000102', null, true, null),
  ('00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000103', '2027-02-28', false, null),
  ('00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000104', '2026-12-03', false, null),
  ('00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000105', '2026-09-10', false, '2026-09-10'),
  ('00000000-0000-4000-8000-000000000506', '00000000-0000-4000-8000-000000000106', '2027-04-19', false, null),
  -- Born 22 August: alternative date already agreed.
  ('00000000-0000-4000-8000-000000000507', '00000000-0000-4000-8000-000000000107', '2026-09-09', true, '2026-09-09'),
  ('00000000-0000-4000-8000-000000000508', '00000000-0000-4000-8000-000000000108', '2026-11-14', false, null)
on conflict (member_id) do update
  set id = excluded.id,
      due_date = excluded.due_date,
      is_alternative_date = excluded.is_alternative_date,
      brought_on = excluded.brought_on;

-- Partial cake awards: 2 best, 1 worst.
insert into public.cake_awards (cake_id, kind, position, comment) values
  ('00000000-0000-4000-8000-000000000505', 'best', 1, 'Bolo de mel da avó. Divinal.'),
  ('00000000-0000-4000-8000-000000000507', 'best', 2, null),
  ('00000000-0000-4000-8000-000000000501', 'worst', 1, 'Seco como a Ponta de São Lourenço em agosto.');

-- Monthly "most stylish": September decided, August too, July still open.
insert into public.member_awards (member_id, kind, period_start, period_end, comment) values
  ('00000000-0000-4000-8000-000000000105', 'stylish', '2026-09-01', '2026-09-30', 'Fato completo para um treino de terça-feira.'),
  ('00000000-0000-4000-8000-000000000101', 'stylish', '2026-08-01', '2026-08-31', null);

commit;
